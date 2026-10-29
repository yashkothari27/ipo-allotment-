import bundled from '../data/ipos.json';

// Raw URL of feed/ipos.json in your GitHub repo (updated by GitHub Actions or manual run).
// This feed contains 30+ IPOs with GMP, subscription, and allotment data.
// e.g. https://raw.githubusercontent.com/<you>/ipo-allotment/main/feed/ipos.json
export const IPO_FEED_URL = 'https://raw.githubusercontent.com/yashkothari27/ipo-allotment-/main/feed/ipos.json';

// Apify token – optional. When set, overrides the GitHub feed.
// Set via: IPO_APIFY_TOKEN=apify_token_xxxx npx expo start
// (No Apify token needed for the GitHub feed to work.)
export const IPO_APIFY_TOKEN = undefined;

// --- Fallback: bundled data (included in the app) ---
// Used if neither the GitHub feed nor Apify are available.
// This contains sample IPOs for development/testing.
const BUNDLED_IPO_DATA = bundled;

// ---------------------------------------------------------------------------
// fetchFeed: tries GitHub URL first, then falls back to bundled data.
// ---------------------------------------------------------------------------
export async function fetchGitHubFeed() {
  try {
    const res = await fetch(IPO_FEED_URL, { headers: { 'Cache-Control': 'no-cache' } });
    if (!res.ok) throw new Error(`GitHub ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.ipos)) throw new Error('Feed has no "ipos" array');
    // Filter malformed entries (same logic as original loadIpos)
    const ipos = data.ipos.filter((i) => i && typeof i.id === 'string' && typeof i.name === 'string' && (!i.dates || typeof i.dates === 'object')
      && (!i.priceBand || (Array.isArray(i.priceBand) && i.priceBand.every(Number.isFinite))));
    return { ipos, source: 'github', updatedAt: data.updatedAt };
  } catch (e) {
    console.warn('GitHub feed fetch failed, falling back to bundled data:', e.message);
    return { ipos: [], source: 'github', error: e.message };
  }
}

// ---------------------------------------------------------------------------
// loadIpos: priority order
//   1) GitHub feed (if URL is configured)
//   2) Apify (if token provided – currently disabled; code kept for future)
//   3) Bundled sample data (always available)
// ---------------------------------------------------------------------------
export async function loadIpos() {
  // 1) Try GitHub feed (primary free source)
  const githubData = await fetchGitHubFeed();
  if (githubData.ipos && githubData.ipos.length > 0) {
    return { ...githubData, source: 'github' };
  }

  // 2) Apify (disabled – kept for future integration)
  // if (IPO_APIFY_TOKEN) {
  //   const apifyData = await loadIposFromApify();
  //   if (apifyData && apifyData.ipos && apifyData.ipos.length) return apifyData;
  // }

  // 3) Bundled sample data (development / offline)
  return { ipos: BUNDLED_IPO_DATA.ipos, source: 'bundled', updatedAt: BUNDLED_IPO_DATA.updatedAt };
}

// Helper: map a raw IPO item from the GitHub feed into the shape the app expects.
// This mirrors the transformation logic from feed/build.mjs / data_daemon/india-ipo-tracker.
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

  return {
    id: raw.slug || raw.id,
    name: raw.ipoName || raw.name,
    type: /sme/i.test(raw.category) ? 'sme' : 'mainboard',
    priceBand: band(raw['Price Band'] ?? raw.priceBand ?? raw.issuePrice),
    lotSize: num(raw.lotSize),
    issueSizeCr: num(raw.issueSizeCr),
    dates: {
      open: isoDate(raw.openDate),
      close: isoDate(raw.closeDate),
      allotment: isoDate(raw.allotmentDate),
      listing: isoDate(raw.listingDate),
    },
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
  };
}

// ---------------------------------------------------------------------------
// Exported shape: { ipos, source, updatedAt }
// ---------------------------------------------------------------------------
export async function loadIpos() {
  const githubData = await fetchGitHubFeed();
  if (githubData.ipos && githubData.ipos.length > 0) {
    // Map raw GitHub rows into the app's IPO item shape.
    const mapped = githubData.ipos.map(mapGitHubIpo);
    return {
      ipos: mapped,
      source: githubData.source,
      updatedAt: githubData.updatedAt,
    };
  }

  // Fallback to bundled data
  return {
    ipos: BUNDLED_IPO_DATA.ipos,
    source: 'bundled',
    updatedAt: BUNDLED_IPO_DATA.updatedAt,
  };
}

// Keep the original exported function name for backward compatibility
// (existing screens call loadIpos() so we keep it).
export { loadIpos };