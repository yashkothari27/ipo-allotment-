// Builds feed/ipos.json (the app's IPO_FEED_URL).
// Source: Apify actor data_daemon/india-ipo-tracker when APIFY_TOKEN is set, else IPO Guru's API (IPOGURU_KEY).
// Runs in GitHub Actions; tokens live only in repo secrets, never in the app.
import { writeFileSync } from 'node:fs';

const num = (v) => (v == null || v === '' || isNaN(Number(v)) ? undefined : Number(v));

export function toFeedItem(x) {
  const lo = num(x.price_min), hi = num(x.price_max);
  return {
    id: x.slug,
    name: x.display_name || x.name,
    type: /sme/i.test(x.type) ? 'sme' : 'mainboard',
    priceBand: lo != null && hi != null ? [lo, hi] : undefined,
    lotSize: num(x.lot_size),
    issueSizeCr: num(x.issue_size),
    dates: { open: x.open_date || undefined, close: x.close_date || undefined, allotment: x.allotment_date || undefined, listing: x.listing_date || undefined },
    subscription: num(x.subscription_total) != null ? { total: num(x.subscription_total) } : undefined,
    listingPrice: num(x.listing_price),
  };
}

// "Oct 22, 2026" / "22 Oct 2026" / "2026-10-22" -> "2026-10-22"
export function isoDate(v) {
  if (!v) return undefined;
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  const d = new Date(`${v} 12:00 UTC`);
  return isNaN(d) ? undefined : d.toISOString().slice(0, 10);
}
// "₹140 to ₹148" / "140-148" / 148 -> [140, 148]
export function band(v) {
  const n = String(v ?? '').replace(/,/g, '').match(/\d+(\.\d+)?/g)?.map(Number) || [];
  return n.length ? [Math.min(...n), Math.max(...n)] : undefined;
}

// x: a "gmp" row; sub: its "subscription" row; lp: its "listingPerformance" row (field names per the actor's README).
export function fromApify(x, sub, lp) {
  const f = x.fields || {};
  const s = sub && {
    qib: num(sub.qibX), nii: num(sub.niiX), retail: num(sub.retailX), total: num(sub.totalX),
  };
  return {
    id: x.slug,
    name: x.ipoName,
    type: /sme/i.test(x.category) ? 'sme' : 'mainboard',
    // The gmp row's issuePrice is only the upper end, so prefer the full band column.
    priceBand: band(f['Price Band'] ?? f['Price'] ?? x.issuePrice),
    lotSize: num(String(x.lotSize ?? '').replace(/,/g, '')),
    issueSizeCr: num(String(x.issueSizeCr ?? '').replace(/,/g, '')),
    dates: { open: isoDate(x.openDate), close: isoDate(x.closeDate), allotment: isoDate(x.allotmentDate), listing: isoDate(x.listingDate) },
    subscription: s && Object.values(s).some((v) => v != null) ? s : undefined,
    gmp: num(x.gmp),
    gmpPercent: num(x.gmpPercent),
    issuePrice: num(lp?.issuePrice),
    listingPrice: num(lp?.listingOpenPrice ?? x.listingPrice),
    listingGainPercent: num(lp?.listingOpenGainPercent),
    currentPrice: num(lp?.currentPriceNse ?? lp?.currentPriceBse),
    currentGainPercent: num(lp?.currentGainPercent),
  };
}

export function mergeApify(rows) {
  const by = (t) => Object.fromEntries(rows.filter((r) => r.reportType === t).map((r) => [r.slug, r]));
  const subs = by('subscription'), lps = by('listingPerformance');
  return rows.filter((r) => r.reportType === 'gmp' && r.ipoName && r.openDate).map((r) => fromApify(r, subs[r.slug], lps[r.slug]));
}

async function fromApifyRun(token) {
  const res = await fetch(`https://api.apify.com/v2/acts/data_daemon~india-ipo-tracker/run-sync-get-dataset-items?format=json&clean=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ reports: ['gmp', 'subscription', 'listingPerformance'], category: 'all' }),
  });
  if (!res.ok) throw new Error(`Apify ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return mergeApify(await res.json());
}

async function fromIpoGuru(key) {
  const res = await fetch('https://www.ipoguru.in/api/v2/ipos', { headers: { 'X-API-KEY': key } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) throw new Error(`IPO Guru ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
  return body.data.filter((x) => !x.dates_tba && x.open_date).map(toFeedItem);
}

async function main() {
  const { APIFY_TOKEN, IPOGURU_KEY } = process.env;
  if (!APIFY_TOKEN && !IPOGURU_KEY) throw new Error('Set the APIFY_TOKEN (or IPOGURU_KEY) repo secret');
  const ipos = APIFY_TOKEN ? await fromApifyRun(APIFY_TOKEN) : await fromIpoGuru(IPOGURU_KEY);
  // Throwing keeps the previous feed/ipos.json in place.
  if (!ipos.length) throw new Error('Source returned no dated IPOs; keeping the previous feed');
  writeFileSync(new URL('./ipos.json', import.meta.url), JSON.stringify({
    updatedAt: new Date().toISOString().slice(0, 10),
    attribution: APIFY_TOKEN ? undefined : 'IPO data by IPO Guru (https://www.ipoguru.in/)',
    ipos,
  }, null, 1));
  console.log(`wrote ${ipos.length} IPOs`);
}

if (process.argv[2] === '--selfcheck') {
  const assert = (await import('node:assert')).strict;
  const f = toFeedItem({ slug: 'a-ipo', name: 'A', type: 'SME', price_min: 140, price_max: 148, lot_size: 101, issue_size: '708.02', open_date: '2026-09-22', close_date: '2026-09-24', allotment_date: null, listing_date: null, subscription_total: '0.07' });
  assert.deepEqual(f.priceBand, [140, 148]);
  assert.equal(f.type, 'sme');
  assert.equal(f.issueSizeCr, 708.02);
  assert.equal(f.subscription.total, 0.07);
  assert.equal(f.dates.allotment, undefined);
  assert.equal(toFeedItem({ slug: 'b', name: 'B', type: 'Mainboard', subscription_total: null }).subscription, undefined);
  assert.equal(isoDate('Oct 22, 2026'), '2026-10-22');
  assert.equal(isoDate('2026-10-22'), '2026-10-22');
  assert.deepEqual(band('₹1,065 to ₹1,119'), [1065, 1119]);
  const rows = [
    { reportType: 'gmp', slug: 'jio', ipoName: 'Jio', category: 'Mainboard', issuePrice: 1119, fields: { 'Price Band': '₹1,065 to ₹1,119' }, gmp: 264, gmpPercent: 23.6, lotSize: '13', openDate: '2026-10-21', closeDate: '2026-10-23' },
    { reportType: 'subscription', slug: 'jio', ipoName: 'Jio', openDate: '2026-10-21', qibX: 40.1, niiX: 20.5, retailX: 5.2, totalX: 22.19 },
    { reportType: 'listingPerformance', slug: 'jio', ipoName: 'Jio', issuePrice: 1119, listingOpenPrice: 1383, listingOpenGainPercent: 23.6, currentPriceNse: 1400, currentPriceBse: 1399, currentGainPercent: 25.1 },
  ];
  const m = mergeApify(rows);
  assert.equal(m.length, 1); // subscription/listing rows must not become extra IPOs
  const [a] = m;
  assert.deepEqual(a.priceBand, [1065, 1119]);
  assert.equal(a.lotSize, 13);
  assert.equal(a.subscription.total, 22.19);
  assert.equal(a.type, 'mainboard');
  assert.equal(a.gmp, 264);
  assert.equal(a.listingPrice, 1383);
  assert.equal(a.currentPrice, 1400);
  assert.deepEqual(fromApify({ slug: 'x', ipoName: 'X', issuePrice: 693 }).priceBand, [693, 693]);
  console.log('ok');
} else {
  await main();
}
