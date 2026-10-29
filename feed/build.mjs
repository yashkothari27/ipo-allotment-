// Builds feed/ipos.json (the app's IPO_FEED_URL) from IPO Guru's developer API.
// Runs in GitHub Actions; the key lives only in the IPOGURU_KEY repo secret, never in the app.
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
    gmp: num(x.gmp?.price),
    gmpPercent: num(x.gmp?.percentage),
    listingPrice: num(x.listing_price),
    listingGainPercent: num(x.listing_gain_percent),
    currentPrice: num(x.cmp),
    currentGainPercent: num(x.current_gain_percent),
    logo: x.logo || undefined,
  };
}

async function main() {
  const key = process.env.IPOGURU_KEY;
  if (!key) throw new Error('Set the IPOGURU_KEY repo secret');
  const res = await fetch('https://www.ipoguru.in/api/v2/ipos', { headers: { 'X-API-KEY': key } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) throw new Error(`IPO Guru ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
  // Skip IPOs with no dates yet: the app derives Open/Upcoming/Listed from dates.
  const ipos = body.data.filter((x) => !x.dates_tba && x.open_date).map(toFeedItem);
  // Throwing keeps the previous feed/ipos.json in place.
  if (!ipos.length) throw new Error('IPO Guru returned no dated IPOs; keeping the previous feed');
  writeFileSync(new URL('./ipos.json', import.meta.url), JSON.stringify({
    updatedAt: new Date().toISOString().slice(0, 10),
    attribution: 'IPO data by IPO Guru (https://www.ipoguru.in/)',
    ipos,
  }, null, 1));
  console.log(`wrote ${ipos.length} IPOs`);
}

if (process.argv[2] === '--selfcheck') {
  const assert = (await import('node:assert')).strict;
  const f = toFeedItem({ slug: 'a-ipo', name: 'A', type: 'SME', price_min: 140, price_max: 148, lot_size: 101, issue_size: '708.02',
    open_date: '2026-09-22', close_date: '2026-09-24', allotment_date: null, listing_date: null, subscription_total: '0.07',
    gmp: { price: '7.5', percentage: '5.07' }, logo: 'https://www.ipoguru.in/storage/logos/a.webp' });
  assert.deepEqual(f.priceBand, [140, 148]);
  assert.equal(f.type, 'sme');
  assert.equal(f.issueSizeCr, 708.02);
  assert.equal(f.subscription.total, 0.07);
  assert.equal(f.gmp, 7.5);
  assert.equal(f.gmpPercent, 5.07);
  assert.equal(f.dates.allotment, undefined);
  assert.ok(f.logo);
  assert.equal(toFeedItem({ slug: 'b', name: 'B', type: 'Mainboard', subscription_total: null, gmp: null }).subscription, undefined);
  console.log('ok');
} else {
  await main();
}
