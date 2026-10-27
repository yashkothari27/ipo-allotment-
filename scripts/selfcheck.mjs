// Run: node scripts/selfcheck.mjs  (hits live registrar sites)
import assert from 'node:assert';
import { extractPans, REGISTRARS } from '../src/registrars.js';

assert.deepStrictEqual(extractPans('Mom pan abcde1234f, dad: PQRST5678Z, again ABCDE1234F'), ['ABCDE1234F', 'PQRST5678Z']);
assert.deepStrictEqual(extractPans('no pan here 12345'), []);

for (const [key, r] of Object.entries(REGISTRARS)) {
  const list = await r.companies();
  assert.ok(list.length > 0 && list[0].id && list[0].name, `${key} company list`);
  // ZZZZZ9999Z is a syntactically valid PAN unlikely to exist.
  const res = await r.check(list[0].id, 'ZZZZZ9999Z');
  assert.ok(['not_found', 'not_allotted', 'allotted'].includes(res.status), `${key} check`);
  console.log(`${key}: ${list.length} IPOs, sample check -> ${res.status}`);
}
console.log('ok');
