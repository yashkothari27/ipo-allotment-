import bundled from '../data/ipos.json';

// Raw URL of feed/ipos.json in your GitHub repo (built every 3 h by .github/workflows/ipo-feed.yml). Empty = bundled file.
// e.g. https://raw.githubusercontent.com/<you>/ipo-allotment/main/feed/ipos.json
export const IPO_FEED_URL = 'https://raw.githubusercontent.com/yashkothari27/ipo-allotment-/main/feed/ipos.json';

export async function loadIpos() {
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
export const minInvestment = (ipo) => (ipo.priceBand && ipo.lotSize ? ipo.priceBand[1] * ipo.lotSize : null);
