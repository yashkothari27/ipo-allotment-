import AsyncStorage from '@react-native-async-storage/async-storage';
import bundled from '../data/ipos.json';

// feed/ipos.json in the GitHub repo (rebuilt by .github/workflows/ipo-feed.yml).
// jsDelivr serves it in ~0.5 s; raw.githubusercontent.com takes 10 s+ or hangs on some Indian networks, so it is the fallback.
export const IPO_FEED_URLS = [
  'https://cdn.jsdelivr.net/gh/yashkothari27/ipo-allotment-@main/feed/ipos.json',
  'https://raw.githubusercontent.com/yashkothari27/ipo-allotment-/main/feed/ipos.json',
];
const CACHE_KEY = 'ipoFeedCache';

// fetch with a hard deadline: a hanging request must never leave the list loading forever.
async function fetchJson(url, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'Cache-Control': 'no-cache' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

export async function fetchGitHubFeed() {
  let lastError;
  for (const url of IPO_FEED_URLS) {
    try {
      const data = await fetchJson(url, 8000);
      if (!Array.isArray(data.ipos)) throw new Error('Feed has no "ipos" array');
      // Drop malformed entries rather than letting one bad row crash the list.
      const ipos = data.ipos.filter((i) => i && typeof i.id === 'string' && typeof i.name === 'string' && (!i.dates || typeof i.dates === 'object')
        && (!i.priceBand || (Array.isArray(i.priceBand) && i.priceBand.every(Number.isFinite))));
      return { ipos, source: 'github', updatedAt: data.updatedAt, attribution: data.attribution };
    } catch (e) {
      lastError = e.name === 'AbortError' ? 'timed out' : e.message;
    }
  }
  return { ipos: [], source: 'github', error: lastError };
}

// Last good feed saved on the phone, so the list shows instantly on the next launch.
export async function loadCachedIpos() {
  try {
    const v = await AsyncStorage.getItem(CACHE_KEY);
    return v ? { ...JSON.parse(v), source: 'cache' } : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Seven helpers used by screens (kept from original code).
// ---------------------------------------------------------------------------

// Status from dates only, so the feed never needs a status field updated by hand.
export function ipoStatus(ipo, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const { open, close, listing } = ipo.dates || {};
  if (listing && day(listing) <= today) return 'listed';
  if (close && day(close) < today) return 'closed';
  if (open && day(open) <= today) return 'open';
  return 'upcoming';
}

const day = (s) => (s ? new Date(`${s}T00:00:00`) : null);

const ORDER = { open: 0, upcoming: 1, closed: 2, listed: 3 };
export const sortIpos = (list, now) =>
  [...list].sort((a, b) => ORDER[ipoStatus(a, now)] - ORDER[ipoStatus(b, now)] || (a.dates?.open || '').localeCompare(b.dates?.open || ''));

export const fmtDate = (s) => (s ? day(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—');
export const fmtINR = (n) => (n == null ? '—' : `₹${Number(n).toLocaleString('en-IN')}`);
export const priceBand = (p) => (!p ? '—' : p[0] === p[1] ? fmtINR(p[0]) : `₹${p[0]}–${p[1]}`);
// ₹264 (23.6%) — price with its % change, the way GMP and listing gains are quoted.
export const withPct = (n, pct) => (n == null ? '—' : `${fmtINR(n)}${pct != null ? ` (${pct > 0 ? '+' : ''}${pct}%)` : ''}`);
export const minInvestment =(ipo) => (ipo.priceBand && ipo.lotSize ? ipo.priceBand[1] * ipo.lotSize : null);

// Load IPOs: GitHub feed first, bundled sample data when offline. Both screens call this.
export async function loadIpos() {
  const githubData = await fetchGitHubFeed();
  if (githubData.ipos && githubData.ipos.length > 0) {
    const feed = { ipos: githubData.ipos, updatedAt: githubData.updatedAt, attribution: githubData.attribution };
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify(feed)).catch(() => {});
    return { ...feed, source: githubData.source };
  }
  // Offline or blocked: last saved list beats the two sample IPOs.
  const cached = await loadCachedIpos();
  if (cached) return { ...cached, error: githubData.error };
  return { ipos: bundled.ipos, source: 'bundled', updatedAt: bundled.updatedAt, error: githubData.error };
}

// ---------------------------------------------------------------------------
// Map a raw GitHub IPO row into the app's IPO item shape.
// This mirrors the transformation logic from feed/build.mjs / data_daemon/india-ipo-tracker.
// ---------------------------------------------------------------------------
function mapGitHubIpo(raw) {
  const num = (v) => (v == null || v === '' || isNaN(Number(v)) ? undefined : Number(v));

  // Price band: handle "₹1,065 to ₹1,119" / "[1065, 1119]" / [1065, 1119] / single number
  const band = (v) => {
    if (!v) return undefined;
    if (Array.isArray(v)) return [Math.min(...v), Math.max(...v)];
    const s = String(v).replace(/, /g, '').replace(/,/g, '');
    const nums = s.match(/(\d+(?:\.\d+)?)/g)?.map(Number) || [];
    if (nums.length === 0) return undefined;
    if (nums.length === 1) return [nums[0], nums[0]];
    return [Math.min(...nums), Math.max(...nums)];
  };

  // Dates: accept ISO, "DD MMM YYYY", "Oct 22, 2026", etc.
  const isoDate = (v) => {
    if (!v) return undefined;
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
    const d = new Date(`${v} 12:00 UTC`);
    return isNaN(d) ? undefined : d.toISOString().slice(0, 10);
  };

  // GMP: may be number or "0"
  const gmpVal = num(raw.gmp);

  // Logo: URL from raw data or placeholder
  const logo = raw.logo || raw.logoUrl || raw.image || raw.poster
    ? raw.logo || raw.logoUrl || raw.image || raw.poster
    : `https://via.placeholder.com/150/1F2937/FAFAFA?text=${raw.slug?.slice(0,3).toUpperCase() || 'IPO'}`;

  return {
    id: raw.slug || raw.id,
    name: raw.ipoName || raw.name,
    type: /sme/i.test(raw.category) ? 'sme' : 'mainboard',
    priceBand: band(raw['Price Band'] ?? raw.priceBand ?? raw.issuePrice),
    lotSize: num(raw.lotSize),
    issueSizeCr: num(raw.issueSizeCr),
    dates: { open: isoDate(raw.openDate), close: isoDate(raw.closeDate), allotment: isoDate(raw.allotmentDate), listing: isoDate(raw.listingDate) },
    subscription: raw.subscription
      ? { qib: num(raw.qibX), nii: num(raw.niiX), retail: num(raw.retailX), total: num(raw.totalX) }
      : undefined,
    gmp: gmpVal,
    gmpPercent: num(raw.gmpPercent),
    issuePrice: num(raw.issuePrice),
    listingPrice: num(raw.listingPrice),
    listingGainPercent: num(raw.listingOpenGainPercent),
    currentPrice: num(raw.currentPriceNse ?? raw.currentPriceBse),
    currentGainPercent: num(raw.currentGainPercent),
    logo,  // <-- ADDED logo field
  };
}

// ---------------------------------------------------------------------------
// Exported shape: { ipos, source, updatedAt }
// ---------------------------------------------------------------------------

// Keep backward-compatible names so screens importing from '../ipos' still work:
// (the helpers are also named exports from this module, so import * as ipos works.)
