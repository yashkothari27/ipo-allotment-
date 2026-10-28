import bundled from '../data/ipos.json';

// Raw URL of feed/ipos.json in your GitHub repo (built every 3 h by .github/workflows/ipo-feed.yml). Empty = bundled file.
// e.g. https://raw.githubusercontent.com/<you>/ipo-allotment/main/feed/ipos.json
export const IPO_FEED_URL = 'https://raw.githubusercontent.com/yashkothari27/ipo-allotment-/main/feed/ipos.json';

// Apify token – set via IPO_APIFY_TOKEN env var (e.g. npx expo start -- IPO_APIFY_TOKEN=apify_token_xxxx)
// When set, the app will fetch from data_daemon/india-ipo-tracker.
export const IPO_APIFY_TOKEN = undefined;

// Apify endpoint (run-sync-get-dataset-items with format=json&clean=true).
const APIFY_URL = 'https://api.apify.com/v2/acts/data_daemon~india-ipo-tracker/run-sync-get-dataset-items';

export async function loadIposFromApify() {
  const token = IPO_APIFY_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(`${APIFY_URL}?format=json&clean=true`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reports: ['gmp', 'subscription', 'listingPerformance'], category: 'all' }),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Apify ${res.status}: ${txt.slice(0, 300)}`);
    }
    const data = await res.json();
    // data is an array of dataset items; merge them per the feed builder logic.
    const rows = data.dataset || [];
    // Build lookup maps for subscription and listingPerformance by slug.
    const subsMap = Object.fromEntries(
      (rows.filter((r) => r.reportType === 'subscription') || []).map((r) => [r.slug, r])
    );
    const lpsMap = Object.fromEntries(
      (rows.filter((r) => r.reportType === 'listingPerformance') || []).map((r) => [r.slug, r])
    );
    // Keep only GMP rows with an open date, transform each.
    const ipos = (rows.filter((r) => r.reportType === 'gmp' && r.ipoName && r.openDate) || []).map((gmpRow) => {
      const sub = subsMap[gmpRow.slug];
      const lp = lpsMap[gmpRow.slug];
      // ---- transform (identical to feed/build.mjs fromApify) ----
      const num = (v) => (v == null || v === '' || isNaN(Number(v)) ? undefined : Number(v));
      const f = gmpRow.fields || {};
      const s = sub && { qib: num(sub.qibX), nii: num(sub.niiX), retail: num(sub.retailX), total: num(sub.totalX) };
      const isoDate = (v) => { if (!v) return undefined; if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10); const d = new Date(`${v} 12:00 UTC`); return isNaN(d) ? undefined : d.toISOString().slice(0, 10); };
      const band = (v) => { const n = String(v ?? '').replace(/,/g, '').match(/\d+(\.\d+)?/g)?.map(Number) || []; return n.length ? [Math.min(...n), Math.max(...n)] : undefined; };
      const priceBand = band(f['Price Band'] ?? f['Price'] ?? gmpRow.issuePrice);
      return {
        id: gmpRow.slug,
        name: gmpRow.ipoName,
        type: /sme/i.test(gmpRow.category) ? 'sme' : 'mainboard',
        priceBand,
        lotSize: num(String(gmpRow.lotSize ?? '').replace(/,/g, '')),
        issueSizeCr: num(String(gmpRow.issueSizeCr ?? '').replace(/,/g, '')),
        dates: { open: isoDate(gmpRow.openDate), close: isoDate(gmpRow.closeDate), allotment: isoDate(gmpRow.allotmentDate), listing: isoDate(gmpRow.listingDate) },
        subscription: s && Object.values(s).some((v) => v != null) ? s : undefined,
        gmp: num(gmpRow.gmp),
        gmpPercent: num(gmpRow.gmpPercent),
        issuePrice: num(lp?.issuePrice),
        listingPrice: num(lp?.listingOpenPrice ?? gmpRow.listingPrice),
        listingGainPercent: num(lp?.listingOpenGainPercent),
        currentPrice: num(lp?.currentPriceNse ?? lp?.currentPriceBse),
        currentGainPercent: num(lp?.currentGainPercent),
      };
    });
    return { ipos, source: 'apify' };
  } catch (e) {
    console.error('Apify IPO load error:', e);
    return { ipos: [], source: 'apify', error: e.message };
  }
}

export async function loadIpos() {
  // If an Apify token is configured, try that first.
  if (IPO_APIFY_TOKEN) {
    const apifyData = await loadIposFromApify();
    if (apifyData && apifyData.ipos && apifyData.ipos.length) return apifyData;
  }
  if (!IPO_FEED_URL) return { ...bundled, source: 'bundled' };
  try {
    const res = await fetch(IPO_FEED_URL, { headers: { 'Cache-Control': 'no-cache' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.ipos)) throw new Error('Feed has no "ipos" array');
    // Drop malformed entries rather than letting one bad row crash the list.
    const ipos = data.ipos.filter((i) => i && typeof i.id === 'string' && typeof i.name === 'string' && (!i.dates || typeof i.dates === 'object')
      && (!i.priceBand || (Array.isArray(i.priceBand) && i.priceBand.every(Number.isFinite))));
    return { ...data, ipos, source: 'remote' };
  } catch (e) {
    return { ...bundled, source: 'bundled', error: e.message };
  }
}

const day = (s) => (s ? new Date(`${s}T00:00:00`) : null);

// Status from dates only, so the feed never needs a status field updated by hand.
export function ipoStatus(ipo, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const { open, close, listing } = ipo.dates || {};
  if (listing && day(listing) <= today) return 'listed';
  if (close && day(close) < today) return 'closed';
  if (open && day(open) <= today) return 'open';
  return 'upcoming';
}

const ORDER = { open: 0, upcoming: 1, closed: 2, listed: 3 };
export const sortIpos = (list, now) =>
  [...list].sort((a, b) => ORDER[ipoStatus(a, now)] - ORDER[ipoStatus(b, now)] || (a.dates?.open || '').localeCompare(b.dates?.open || ''));

export const fmtDate = (s) => (s ? day(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—');
export const fmtINR = (n) => (n == null ? '—' : `₹${Number(n).toLocaleString('en-IN')}`);
export const priceBand = (p) => (!p ? '—' : p[0] === p[1] ? fmtINR(p[0]) : `₹${p[0]}–${p[1]}`);
// ₹264 (23.6%) — price with its % change, the way GMP and listing gains are quoted.
export const withPct = (n, pct) => (n == null ? '—' : `${fmtINR(n)}${pct != null ? ` (${pct > 0 ? '+' : ''}${pct}%)` : ''}`);
export const minInvestment =(ipo) => (ipo.priceBand && ipo.lotSize ? ipo.priceBand[1] * ipo.lotSize : null);