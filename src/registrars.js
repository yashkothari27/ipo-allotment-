import CryptoJS from 'crypto-js';
import KFIN_IPOS from './kfintech-ipos.json' with { type: 'json' };

export const PAN_RE = /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g;

// Pulls every PAN out of shared text (WhatsApp message, note, etc.).
export const extractPans = (text = '') => [...new Set(text.toUpperCase().match(PAN_RE) || [])];

const postJson = async (url, body) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(res.status === 429 || res.status === 503 ? 'Rate limited, try again shortly' : `HTTP ${res.status}`);
  return (await res.json()).d;
};

// Flat XML from ASP.NET DataSets: <Table><tag>value</tag>...</Table>
const xmlTables = (xml) =>
  [...xml.matchAll(/<Table>([\s\S]*?)<\/Table>/g)].map(([, row]) =>
    Object.fromEntries([...row.matchAll(/<(\w+)>([^<]*)<\/\1>/g)].map(([, k, v]) => [k, v.trim()])));

const MUFG = 'https://in.mpms.mufg.com/Initial_Offer/IPO.aspx/';
const BIG = 'https://ipo.bigshareonline.com/';

const mufg = {
  name: 'MUFG Intime',
  async companies() {
    return xmlTables(await postJson(MUFG + 'GetDetails', {}))
      .map((t) => ({ id: t.company_id, name: t.companyname }));
  },
  async check(companyId, pan) {
    // Site's own token step: server nonce, AES-encrypted with the key hardcoded in their page.
    const key = CryptoJS.enc.Utf8.parse('8080808080808080');
    const nonce = await postJson(MUFG + 'generateToken', {});
    const token = CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(nonce), key, { iv: key, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }).toString();
    const rows = xmlTables(await postJson(MUFG + 'SearchOnPan', { clientid: companyId, PAN: pan, IFSC: '', CHKVAL: '1', token }))
      .filter((r) => r.SHARES !== undefined);
    if (!rows.length) return { status: 'not_found' };
    const allotted = rows.reduce((n, r) => n + (Number(r.ALLOT) || 0), 0);
    const applied = rows.reduce((n, r) => n + (Number(r.SHARES) || 0), 0);
    const apps = rows.map((r) => ({ no: r.RFNDNO, category: r.PEMNDG, applied: Number(r.SHARES) || 0, allotted: Number(r.ALLOT) || 0 }));
    return { status: allotted > 0 ? 'allotted' : 'not_allotted', allotted, applied, name: rows[0].NAME1, apps };
  },
};

const bigshare = {
  name: 'Bigshare',
  async companies() {
    const html = await (await fetch(BIG + 'IPO_Status.html')).text();
    const select = html.match(/<select id="ddlCompany">([\s\S]*?)<\/select>/)?.[1] || '';
    return [...select.matchAll(/<option value="(\d+)">([^<]+)<\/option>/g)].map(([, id, name]) => ({ id, name: name.trim() }));
  },
  async check(companyId, pan) {
    const d = await postJson(BIG + 'Data.aspx/FetchIpodetails', {
      Applicationno: '', Company: companyId, SelectionType: 'PN', PanNo: pan,
      txtcsdl: '', txtDPID: '', txtClId: '', ddlType: '0', lang: 'en',
    });
    if (d.Status === 'NOTFOUND') return { status: 'not_found' };
    // shortcut: response shape for a found record is inferred from the site's field names, verify on a real allotment.
    const rec = d.Records?.[0] || d;
    const allotted = Number(rec.ALLOTED) || 0;
    return { status: allotted > 0 ? 'allotted' : 'not_allotted', allotted, applied: Number(rec.APPLIED) || 0, name: rec.Name };
  },
};

const kfintech = {
  name: 'KFintech',
  // shortcut: list copied from ipostatus.kfintech.com's page bundle (CDN refuses non-browser fetches); refresh src/kfintech-ipos.json when new IPOs open.
  async companies() {
    return KFIN_IPOS;
  },
  async check(companyId, pan) {
    const res = await fetch('https://0uz601ms56.execute-api.ap-south-1.amazonaws.com/prod/api/query?type=pan', {
      headers: { client_id: companyId, reqparam: pan },
    });
    if (res.status === 404) return { status: 'not_found' };
    if (!res.ok) throw new Error(res.status === 429 ? 'Rate limited, try again shortly' : `HTTP ${res.status}`);
    const rows = (await res.json()).data || [];
    if (!rows.length) return { status: 'not_found' };
    const allotted = rows.reduce((n, r) => n + (Number(r.All_Shares) || 0), 0);
    const applied = rows.reduce((n, r) => n + (Number(r.App_Shares) || 0), 0);
    // One row per application (e.g. shareholder + retail); KFintech sends no category field.
    const apps = rows.map((r) => ({ no: r.Appln_No, applied: Number(r.App_Shares) || 0, allotted: Number(r.All_Shares) || 0 }));
    return { status: allotted > 0 ? 'allotted' : 'not_allotted', allotted, applied, name: rows.find((r) => r.Name)?.Name, apps };
  },
};

export const REGISTRARS = { mufg, bigshare, kfintech };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Sequential with a gap so registrars don't throttle us (Bigshare returns 429).
export async function checkAll(registrarKey, companyId, pans, onResult) {
  for (const pan of pans) {
    let result;
    try { result = await REGISTRARS[registrarKey].check(companyId, pan); }
    catch (e) { result = { status: 'error', message: e.message }; }
    onResult(pan, result);
    await sleep(1200);
  }
}
