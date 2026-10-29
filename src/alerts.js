// Allotment alerts with no server: a background task (Android WorkManager, ~every 30 min at best)
// checks saved PANs for IPOs whose allotment date has arrived and posts a local notification per result.
import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import * as Notifications from 'expo-notifications';
import { REGISTRARS } from './registrars';
import { loadIpos } from './ipos';
import { maskPan, panName, readStored, writeStored } from './store';

export const ALERT_TASK = 'allotment-alerts';
const DONE_KEY = 'alertedResults'; // "ipoId|PAN" already notified
const LOOKBACK_DAYS = 5;

// "Bombay Coated & Special Steels Ltd. - IPO" and "Bombay Coated and Special Steels" -> "bombay coated special steels"
export const normName = (s = '') => s.toLowerCase()
  .replace(/\(.*?\)/g, ' ').replace(/&/g, ' ')
  .replace(/\b(and|limited|ltd|ipo|sme|india|the)\b/g, ' ')
  .replace(/[^a-z0-9]+/g, ' ').trim();

// Which registrar lists this IPO, and its id there.
export async function findRegistrarCompany(name) {
  const n = normName(name);
  if (!n) return null;
  for (const [reg, r] of Object.entries(REGISTRARS)) {
    try {
      const hit = (await r.companies()).find((c) => {
        const m = normName(c.name);
        return m && (m.startsWith(n) || n.startsWith(m));
      });
      if (hit) return { ...hit, reg };
    } catch {
      // one registrar being down must not stop the others
    }
  }
  return null;
}

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

export async function runAllotmentCheck() {
  if (!(await readStored('allotAlerts', false))) return 0;
  const pans = await readStored('pans', []);
  if (!pans.length) return 0;
  const done = new Set(await readStored(DONE_KEY, []));
  const { ipos } = await loadIpos();
  const due = ipos.filter((i) => i.dates?.allotment && i.dates.allotment <= today() && i.dates.allotment >= daysAgo(LOOKBACK_DAYS));
  let sent = 0;
  for (const ipo of due) {
    const todo = pans.filter((p) => !done.has(`${ipo.id}|${p.pan}`));
    if (!todo.length) continue;
    const company = await findRegistrarCompany(ipo.name);
    if (!company) continue;
    for (const p of todo) {
      let r;
      try { r = await REGISTRARS[company.reg].check(company.id, p.pan); } catch { continue; }
      // not_found can mean "not published yet", so only final answers are notified and remembered.
      if (r.status !== 'allotted' && r.status !== 'not_allotted') continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: r.status === 'allotted' ? `Allotted: ${ipo.name}` : `Not allotted: ${ipo.name}`,
          body: r.status === 'allotted'
            ? `${panName(p)} (${maskPan(p.pan)}) got ${r.allotted} shares.`
            : `${panName(p)} (${maskPan(p.pan)}) did not get shares this time.`,
          data: { url: '/allotment', ipo: ipo.name },
        },
        trigger: null,
      });
      done.add(`${ipo.id}|${p.pan}`);
      sent++;
      await new Promise((res) => setTimeout(res, 1200)); // registrars throttle bursts
    }
  }
  await writeStored(DONE_KEY, [...done].slice(-500));
  return sent;
}

// Must be defined at module scope so Android can run it with the app closed.
TaskManager.defineTask(ALERT_TASK, async () => {
  try {
    await runAllotmentCheck();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

// Returns false when the user refuses notification permission.
export async function enableAlerts() {
  await Notifications.setNotificationChannelAsync('allotments', { name: 'Allotment results', importance: Notifications.AndroidImportance.HIGH });
  const { granted } = await Notifications.requestPermissionsAsync();
  if (!granted) return false;
  await writeStored('allotAlerts', true);
  await BackgroundTask.registerTaskAsync(ALERT_TASK, { minimumInterval: 30 });
  runAllotmentCheck().catch(() => {}); // check once right away
  return true;
}

export async function disableAlerts() {
  await writeStored('allotAlerts', false);
  if (await TaskManager.isTaskRegisteredAsync(ALERT_TASK)) await BackgroundTask.unregisterTaskAsync(ALERT_TASK);
}
