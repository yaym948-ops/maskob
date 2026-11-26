// Run with:  cd tests && npm test      (deploy.ps1 runs it before every publish)
const test = require('node:test');
const assert = require('node:assert/strict');
const { appScripts, bootApp, driver, sleep } = require('./load');

/* ---------- static checks on the source ---------- */
test('every script parses', () => {
  const vm = require('vm');
  for (const s of appScripts()) assert.doesNotThrow(() => new vm.Script(s.code, { filename: s.name }), s.name);
});

test('no two top-level functions share a name (a later one would silently replace the first)', () => {
  const seen = new Map();
  for (const s of appScripts()) {
    for (const m of s.code.matchAll(/^(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/gm)) {
      assert.ok(!seen.has(m[1]), `function ${m[1]} is declared in ${seen.get(m[1])} and again in ${s.name}`);
      seen.set(m[1], s.name);
    }
  }
});

test('every file the page and its styles point to exists (logo, icons, scripts)', () => {
  const fs = require('fs'), path = require('path'), { ROOT } = require('./load');
  const missing = [];
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  for (const m of html.matchAll(/(?:src|href)="([^"#:]+?)(?:\?[^"]*)?"/g)) if (!fs.existsSync(path.join(ROOT, m[1]))) missing.push('index.html → ' + m[1]);
  for (const f of fs.readdirSync(path.join(ROOT, 'css'))) {
    const css = fs.readFileSync(path.join(ROOT, 'css', f), 'utf8');
    for (const m of css.matchAll(/url\(\s*['"]?([^'")]+?)['"]?\s*\)/g)) {
      if (/^(data:|https?:|#)/.test(m[1])) continue;
      if (!fs.existsSync(path.join(ROOT, 'css', m[1]))) missing.push('css/' + f + ' → ' + m[1]);
    }
  }
  assert.deepEqual(missing, [], 'missing files: ' + missing.join(', '));
});

test('older files keep working if a browser still has the previous page (no hard dependency on newer files)', () => {
  // functions that live in a file added later must be called through a guard in older files
  const fs = require('fs'), path = require('path'), { ROOT } = require('./load');
  const core = fs.readFileSync(path.join(ROOT, 'js/core.js'), 'utf8') + fs.readFileSync(path.join(ROOT, 'js/branch.js'), 'utf8');
  const unguarded = (core.match(/(^|[^.\w&])logAct\(/gm) || []).length;
  assert.equal(unguarded, 0, 'logAct must be called as window.logAct&&logAct(...)');
});

/* ---------- the app starts and its pieces fit together ---------- */
let w;
test.after(() => { if (w) w.close(); });   // stop the app's timers so the run can finish
test('the app starts in demo mode and shows the code pad', async () => {
  w = await bootApp();
  assert.equal(w.eval('S.mode'), 'demo');
  assert.ok(w.document.querySelector('.pin'), 'code pad is shown');
});

test('every translation has the four languages', () => {
  const bad = JSON.parse(w.eval('JSON.stringify(Object.keys(T).filter(k=>!Array.isArray(T[k])||T[k].length<4||T[k].some(x=>x==null||x==="")))'));
  assert.deepEqual(bad, [], 'incomplete translations: ' + bad.join(', '));
});

test('every button action used in the code has a handler', () => {
  const used = new Set();
  for (const s of appScripts()) for (const m of s.code.matchAll(/data-act="([A-Za-z0-9_]+)"/g)) used.add(m[1]);
  const missing = [...used].filter((k) => typeof w.eval('A')[k] !== 'function');
  assert.deepEqual(missing, [], 'buttons without a handler: ' + missing.join(', '));
});

/* ---------- calculations ---------- */
test('amount in Arabic words', () => {
  const tf = w.eval('tafqeet');
  assert.equal(tf(1250), 'فقط ألف ومائتان وخمسون ريال لا غير');
  assert.equal(tf(3500.5), 'فقط ثلاثة آلاف وخمسمائة ريال وخمسون هللة لا غير');
  assert.equal(tf(1000000), 'فقط مليون ريال لا غير');
});

test('IBAN check and format', () => {
  assert.equal(w.eval('ibanOk')('sa03 8000 0000 6080 1016 7519'), true);
  assert.equal(w.eval('ibanOk')('12345'), false);
  assert.equal(w.eval('ibanFmt')('SA0380000000608010167519'), 'SA03 8000 0000 6080 1016 7519');
});

/* ---------- a full working day in demo mode ---------- */
test('codes, HR employee, end of service and payroll', async () => {
  const d = driver(w);
  d.type('1111'); d.click('[data-act="pinGo"]'); d.type('1111'); d.click('[data-act="pinGo"]'); await sleep(300);
  assert.equal(w.eval('S.role'), 'manager', 'operations signed in after setup');
  d.setVal('adminBoot', '2468'); d.click('[data-act="setAdmin"]'); await sleep(600);
  await d.signIn('2468');
  assert.equal(w.eval('S.role'), 'admin');
  d.setVal('pin-hr', '4321'); w.document.getElementById('pin-hr').parentElement.querySelector('[data-act="savePin"]').click(); await sleep(600);
  await d.signIn('4321');
  assert.equal(w.eval('S.role'), 'hr');

  d.click('[data-act="hrNew"]'); await sleep(20);
  for (const [k, v] of Object.entries({ name: 'أحمد', no: '501', branch: 'القطيف', job: 'باريستا', salary: '3000', alHousing: '750', hire: '2019-11-26' })) d.setVal('hr-' + k, v);
  d.click('[data-act="hrSave"]'); await sleep(300);
  const emps = w.eval('S.emps');
  assert.equal(emps.length, 1);
  const id = emps[0].id;

  // end of service: 7 years, resignation = two thirds of the award
  const c = w.eval('eosCalc')(emps[0], { start: '2019-11-26', last: '2026-11-25', reason: 'resign', wage: 4250, leaveDays: 0 });
  assert.equal(c.factor, 2 / 3);
  assert.ok(Math.abs(c.award - 12765.53) < 0.01, 'award ' + c.award);

  // payroll: one full month, an advance instalment and 10 overtime hours
  const mk = '2026-11';
  await w.eval('X').put('advances', 'A1', { emp: id, amount: 1000, monthly: 400, date: '2026-11-01', payments: [], status: 'open' });
  w.eval('S').payroll = [{ id: mk, status: 'draft', adj: { [id]: { otHours: '10' } } }];
  const row = w.eval('payrollCalc')(mk).rows.find((r) => r.id === id);
  assert.equal(row.gross, 3750);
  assert.equal(row.adv, 400);
  assert.equal(row.ot, 218.8);
  assert.equal(row.net, 3750 - 400 + 218.8);

  // attachments: a large file is split into pieces and comes back whole
  const EF = w.eval('EF');
  const big = 'data:application/pdf;base64,' + 'A'.repeat(1500000);
  await EF.add(id, { kind: 'iqama', name: 'iqama.pdf', type: 'application/pdf', size: 1 }, big);
  const files = await EF.list(id);
  assert.equal(files.length, 1);
  assert.equal(files[0].parts, 3);
  assert.equal(await EF.get(id, files[0]), big);
  await EF.del(id, files[0]);
  assert.equal((await EF.list(id)).length, 0);
});

test('social insurance deduction in payroll', async () => {
  const e = { id: 'G1', name: 'سعود', salary: 6000, alHousing: 1500, gosi: true, branch: '@office', status: 'active', hire: '2020-01-01' };
  assert.equal(w.eval('gosiMonthly')(e), 731.25);                                  // 9.75% of 7,500
  assert.equal(w.eval('gosiMonthly')(Object.assign({}, e, { gosiRate: 10 })), 750);
  assert.equal(w.eval('gosiMonthly')(Object.assign({}, e, { salary: 50000 })), 4387.5); // capped at 45,000
  assert.equal(w.eval('gosiMonthly')(Object.assign({}, e, { gosi: false })), 0);
  w.eval('S').emps.push(e);
  const row = w.eval('payrollCalc')('2026-11').rows.find((r) => r.id === 'G1');
  assert.equal(row.gosi, 731.25);
  assert.equal(row.net, 7500 - 731.25);
});

test('personal accounts: sign in with your own code, name shown, switched-off account is refused', async () => {
  const d = driver(w);
  await d.signIn('2468');                                   // system admin (shared code)
  assert.equal(w.eval('S.role'), 'admin');
  d.click('[data-act="tab"][data-k="users"]');
  d.click('[data-act="usNew"]'); await sleep(20);
  d.setVal('hr-name', 'سارة'); d.setVal('hr-role', 'hr'); d.setVal('hr-pin', '7777');
  d.click('[data-act="usSave"]'); await sleep(400);
  const users = w.eval('S.users');
  assert.equal(users.length, 1);
  assert.equal(users[0].role, 'hr');
  // the same code can't be given to a second person
  d.click('[data-act="usNew"]'); await sleep(20);
  d.setVal('hr-name', 'نسخة'); d.setVal('hr-role', 'warehouse'); d.setVal('hr-pin', '7777');
  d.click('[data-act="usSave"]'); await sleep(300);
  assert.equal(w.eval('S.users').length, 1, 'duplicate code refused');
  d.click('[data-act="close"]');

  await d.signIn('7777');
  assert.equal(w.eval('S.role'), 'hr');
  assert.equal(w.eval('S.userName'), 'سارة');
  assert.match(w.document.querySelector('.who').textContent, /سارة/);
  // actions are logged with the person's name
  d.click('[data-act="tab"][data-k="emps"]');
  d.click('[data-act="hrNew"]'); await sleep(20);
  d.setVal('hr-name', 'موظف للسجل'); d.click('[data-act="hrSave"]'); await sleep(300);
  const log = w.eval('MEM("log")');
  assert.ok(log.some((e) => e.name === 'سارة' && e.col === 'employees' && e.op === 'add'), 'action logged with the name');

  // switch the account off: the next check signs her out and her code no longer works
  await d.signIn('2468');
  d.click('[data-act="tab"][data-k="users"]');
  d.click('[data-act="usOpen"]'); await sleep(20);
  d.click('[data-act="usActive"][data-k="off"]'); d.click('[data-act="usSave"]'); await sleep(400);
  await d.signIn('7777');
  assert.notEqual(w.eval('S.role'), 'hr', 'switched-off account cannot sign in');
});

test('general manager (full access) works as any department or branch from one account', async () => {
  const d = driver(w);
  await d.signIn('2468');
  d.click('[data-act="tab"][data-k="users"]');
  d.click('[data-act="usNew"]'); await sleep(20);
  d.setVal('hr-name', 'المدير'); d.setVal('hr-role', 'owner'); d.setVal('hr-pin', '9191');
  d.click('[data-act="usSave"]'); await sleep(400);
  await d.signIn('9191');
  assert.equal(w.eval('S.realRole'), 'owner');
  assert.equal(w.eval('S.role'), 'manager', 'starts in operations');
  const pick = async (v) => { d.setVal('ownerView', v); await sleep(200); };
  for (const v of ['warehouse', 'hr', 'admin', 'branch:القطيف', 'manager']) {
    await pick(v);
    const want = v.startsWith('branch:') ? 'branch' : v;
    assert.equal(w.eval('S.role'), want, 'view ' + v);
    assert.equal(w.eval('S.realRole'), 'owner', 'still the general manager after ' + v);
    assert.ok(w.document.querySelectorAll('#tabsIn .tab').length > 0, 'menu shown for ' + v);
  }
  await pick('branch:القطيف');
  assert.equal(w.eval('S.branch'), 'القطيف');
  await pick('hr');
  d.click('[data-act="tab"][data-k="emps"]');
  d.click('[data-act="hrNew"]'); await sleep(20);
  d.setVal('hr-name', 'أضافه المدير العام'); d.click('[data-act="hrSave"]'); await sleep(300);
  assert.ok(w.eval('S.emps').some((e) => e.name === 'أضافه المدير العام'), 'can work in HR');
  const log = w.eval('MEM("log")');
  assert.ok(log.some((e) => e.name === 'المدير' && e.role === 'owner'), 'logged as the general manager');
  w.eval('checkAuth()');
  assert.equal(w.eval('S.realRole'), 'owner', 'not signed out by the session check');
});
