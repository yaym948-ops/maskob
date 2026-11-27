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
  assert.equal(w.eval('S.role'), 'dash', 'starts on the dashboard');
  const pick = async (v) => { d.setVal(v.startsWith('branch:') ? 'ownerBranch' : 'ownerView', v); await sleep(200); };
  for (const v of ['warehouse', 'hr', 'admin', 'branch:القطيف', 'manager', 'dash']) {
    await pick(v);
    const want = v.startsWith('branch:') ? 'branch' : v;
    assert.equal(w.eval('S.role'), want, 'view ' + v);
    assert.equal(w.eval('S.realRole'), 'owner', 'still the general manager after ' + v);
    assert.ok(w.document.querySelectorAll('#tabsIn .tab').length > 0, 'menu shown for ' + v);
  }
  await pick('branch:القطيف');
  assert.equal(w.eval('S.branch'), 'القطيف');
  // departments and branches are two separate pickers; branches have no forecast page
  assert.ok(w.document.getElementById('ownerBranch'), 'branches picker');
  assert.equal(w.document.getElementById('ownerBranch').value, 'branch:القطيف');
  assert.ok(![...w.document.getElementById('ownerView').options].some((o) => o.value.startsWith('branch:')), 'no branches in the departments picker');
  assert.ok(![...w.document.querySelectorAll('#tabsIn [data-act="tab"]')].some((b) => b.dataset.k === 'fc'), 'no forecast page in a branch');
  // the forecast is still there: after 7 approved orders, on the usual ordering day an empty cart is filled once
  {
    const S = w.eval('S'), ids = w.eval('ITEMS').slice(0, 3).map((x) => x.id), day = 864e5, now = Date.now();
    const saved = S.orders;
    w.eval('A.clearDraft()'); w.eval('LS').set('mk.fcAuto.القطيف', null);
    S.orders = Array.from({ length: 7 }, (_, i) => ({ id: 'FC' + i, branch: 'القطيف', kind: 'supply', status: 'received',
      createdAt: new Date(now - (7 - i) * 3 * day).toISOString(), lines: ids.map((id) => ({ id, qty: 4, received: 4 })) }));
    d.click('[data-act="tab"][data-k="new"]'); w.eval('render()');
    assert.ok(w.document.querySelector('.fc-sug'), 'suggested order shown');
    assert.equal(JSON.stringify(ids.map((id) => S.draft.lines[id])), '[4,4,4]', 'cart filled with the forecast');
    d.click('.fc-sug [data-act="clearDraft"]'); w.eval('render()');
    assert.equal(Object.values(S.draft.lines).filter((q) => q > 0).length, 0, 'emptied by the branch stays empty');
    assert.ok(!w.document.querySelector('.fc-sug'));
    S.orders = saved; w.eval('A.clearDraft()');
  }
  // the same line icons in the menu and on buttons
  assert.ok(w.document.querySelector('#tabsIn .tab-ico svg.ic'), 'menu icons');
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

test('warehouse stock: receive, ship to a branch, count; dashboard; WPS file', async () => {
  const d = driver(w);
  // warehouse code (shared) for the test
  await d.signIn('2468');
  d.setVal('pin-warehouse', '5757'); w.document.getElementById('pin-warehouse').parentElement.querySelector('[data-act="savePin"]').click(); await sleep(500);
  d.setVal('pin-br-0', '3333'); w.document.getElementById('pin-br-0').parentElement.querySelector('[data-act="savePin"]').click(); await sleep(500);
  await d.signIn('5757');
  assert.equal(w.eval('S.role'), 'warehouse');
  d.click('[data-act="tab"][data-k="stock"]');
  // receive two items from a supplier
  d.click('[data-act="stRecv"]'); await sleep(20);
  d.setVal('hr-supplier', 'مورد الشاي'); d.setVal('stl-item-0', 'tea-1'); d.setVal('stl-qty-0', '40');
  d.click('[data-act="stLineAdd"]'); await sleep(20);
  d.setVal('stl-item-1', 'dairy-2'); d.setVal('stl-qty-1', '12');
  d.click('[data-act="stRecvSave"]'); await sleep(300);
  assert.equal(w.eval('stockQty("tea-1")'), 40);
  assert.equal(w.eval('stockQty("dairy-2")'), 12);
  // minimum level and low-stock alert
  d.click('[data-act="stOpen"][data-id="dairy-2"]'); await sleep(20);
  d.setVal('hr-min', '15'); d.click('[data-act="stSave"]'); await sleep(300);
  assert.equal(w.eval('stockState("dairy-2")'), 'low');
  assert.ok(w.eval('stockLow().length') >= 1);
  // a count corrects the balance and is recorded as a movement
  d.click('[data-act="stOpen"][data-id="tea-1"]'); await sleep(20);
  d.setVal('hr-counted', '38'); d.click('[data-act="stSave"]'); await sleep(300);
  assert.equal(w.eval('stockQty("tea-1")'), 38);
  assert.ok(w.eval('S.stockMoves').some((m) => m.item === 'tea-1' && m.type === 'adjust' && m.delta === -2));
  // shipping an order takes the sent quantity out
  await w.eval('Store').save({ id: 'ST-O1', num: 'ST-O1', kind: 'supply', branch: 'القطيف', status: 'approved', createdAt: new Date().toISOString(), lines: [{ id: 'tea-1', qty: 5, approved: 5 }] });
  d.click('[data-act="tab"][data-k="prep"]'); await sleep(20);
  d.click('.oc[data-id="ST-O1"]'); await sleep(20);
  for (const b of w.document.querySelectorAll('[data-act="check"]')) b.click();
  d.click('[data-act="ship"]'); await sleep(400);
  assert.equal(w.eval('stockQty("tea-1")'), 33, 'shipping 5 leaves 33');

  // WPS: only approved payroll, rows need IBAN + ID
  const P = { mk: '2026-11', doc: { status: 'approved' }, rows: [
    { id: 'W1', name: 'أ', no: '1', basic: 3000, allow: 750, reward: 0, ot: 0, add: 0, formDed: 0, unpaid: 0, adv: 0, gosi: 0, ded: 0, net: 3750, iban: 'SA0380000000608010167519' },
    { id: 'W2', name: 'ب', no: '2', basic: 2000, allow: 0, net: 2000 } ] };
  w.eval('S').emps.push({ id: 'W1', name: 'أ', idNo: '2345678901', iban: 'SA0380000000608010167519', bank: 'الراجحي', salary: 3000, alHousing: 750 }, { id: 'W2', name: 'ب', salary: 2000 });
  const res = w.eval('wpsRows')(P);
  assert.equal(res.ok.length, 1);
  assert.deepEqual(Array.from(res.ok[0]).slice(3, 12), ['2345678901', 'SA0380000000608010167519', '80', 'الراجحي', 3000, 750, 0, 0, 3750]);
  assert.equal(res.skipped.length, 1);

  // dashboard opens for a general manager
  await d.signIn('9191');
  d.setVal('ownerView', 'dash'); await sleep(200);
  assert.ok(w.document.querySelectorAll('.dash-card').length >= 8, 'dashboard cards shown');
});

test('finance department: expenses, supplier invoice paid by voucher, monthly summary', async () => {
  const d = driver(w);
  await d.signIn('2468');
  d.setVal('pin-finance', '6060'); w.document.getElementById('pin-finance').parentElement.querySelector('[data-act="savePin"]').click(); await sleep(500);
  await d.signIn('6060');
  assert.equal(w.eval('S.role'), 'finance');
  const tabs = [...w.document.querySelectorAll('#tabsIn [data-act="tab"]')].map((b) => b.dataset.k);
  assert.deepEqual(tabs, ['fsum', 'salesLog', 'supinv', 'payroll', 'pnl', 'be', 'supst', 'expenses', 'suppliers', 'apps', 'vouchers', 'advances', 'costs', 'assets', 'archive', 'mail']);
  // the reports sit in one group of the side menu, closed until opened
  const grp = w.document.querySelector('#tabsIn [data-act="navGrp"]');
  assert.ok(grp, 'reports group shown');
  assert.deepEqual([...w.document.querySelectorAll('#tabsIn .tab-sub [data-act="tab"]')].map((b) => b.dataset.k), ['salesLog', 'supinv', 'payroll', 'pnl', 'be', 'supst']);
  assert.ok(w.document.querySelector('#tabsIn .tab-sub').hidden, 'group closed');
  d.click('[data-act="navGrp"]'); assert.ok(!w.document.querySelector('#tabsIn .tab-sub').hidden, 'group opens');
  d.click('[data-act="navGrp"]');
  const mk = w.eval('monthKey(Date.now())');
  // an expense: VAT included by default, worked out as the amount is typed
  d.click('[data-act="tab"][data-k="expenses"]');
  d.click('[data-act="exNew"]'); await sleep(20);
  d.setVal('hr-cat', 'rent'); d.setVal('hr-place', 'القطيف'); d.setVal('hr-amount', '11500');
  assert.equal(w.document.getElementById('hr-vat').value, '1500');
  d.click('[data-act="exSave"]'); await sleep(300);
  assert.equal(w.eval('S.expenses').length, 1);
  // a supplier invoice, part-paid: the payment becomes a voucher
  d.click('[data-act="tab"][data-k="supinv"]');
  d.click('[data-act="siNew"]'); await sleep(20);
  d.setVal('hr-supplier', 'شركة الألبان'); d.setVal('hr-number', 'INV-77'); d.setVal('hr-amount', '2300');
  d.click('[data-act="siSave"]'); await sleep(300);
  d.click('[data-act="siOpen"]'); await sleep(20);
  d.setVal('si-payAmt', '1000'); d.click('[data-act="siPay"]'); await sleep(400);
  const inv = w.eval('S.supInv')[0];
  assert.equal(w.eval('supRemain')(inv), 1300);
  assert.ok(w.eval('S.vouchers').some((v) => v.payee === 'شركة الألبان' && v.amount === 1000 && v.cat === 'supplier'), 'voucher created');
  d.click('[data-act="close"]');
  // summary
  const F = w.eval('financeCalc')(mk);
  assert.equal(F.exp, 11500);
  assert.equal(F.purchases, 2300);
  assert.equal(F.paidSup, 1000);
  assert.equal(F.owed, 1300);
  assert.equal(F.byPlace['القطيف'].exp, 11500);
  d.click('[data-act="tab"][data-k="fsum"]');
  assert.ok(w.document.querySelectorAll('.dash-card').length >= 6, 'summary cards shown');
  // payroll and vouchers pages open for finance
  d.click('[data-act="tab"][data-k="payroll"]'); assert.ok(w.document.querySelector('.pr-tbl') || w.document.querySelector('.empty'));
  d.click('[data-act="tab"][data-k="vouchers"]'); assert.ok(w.document.querySelector('[data-act="vcNew"]'));
});

test('suppliers, credit terms and VAT: supplier card fills the invoice, cash invoice paid, credit expense, statement', async () => {
  const d = driver(w), S = w.eval('S');
  await d.signIn('6060');
  for (const c of ['suppliers', 'supInvoices', 'expenses', 'vouchers']) w.eval('MEMSET')(c, []);
  w.eval('xLoadDemo()'); w.eval('render()');
  const today = w.eval('dayKey(Date.now())'), addDays = w.eval('addDays');
  // a supplier card with a usual 45-day term
  d.click('[data-act="tab"][data-k="suppliers"]');
  d.click('[data-act="supNew"]'); await sleep(20);
  d.setVal('hr-name', 'مؤسسة الحليب الطازج'); d.setVal('hr-vatNo', '310000111200003'); d.setVal('hr-termDays', '45');
  d.click('[data-act="supSave"]'); await sleep(300);
  const sup = w.eval('S.suppliers')[0];
  assert.equal(sup.termDays, 45);
  // picking it in a new invoice brings its VAT number and term; amount typed before VAT
  d.click('[data-act="tab"][data-k="supinv"]');
  d.click('[data-act="siNew"]'); await sleep(20);
  d.setVal('hr-supplier', 'مؤسسة الحليب الطازج');
  assert.equal(w.document.getElementById('hr-vatNo').value, '310000111200003');
  assert.equal(w.document.getElementById('hr-due').value, addDays(today, 45));
  d.click('#hr-incVat'); await sleep(10);
  assert.equal(S.hrDraft.incVat, false);
  d.setVal('hr-number', 'F-1'); d.setVal('hr-amount', '1000');
  assert.equal(w.document.getElementById('hr-vat').value, '150');
  d.click('[data-act="siSave"]'); await sleep(300);
  const inv = w.eval('S.supInv').find((i) => i.number === 'F-1');
  assert.equal(inv.amount, 1150); assert.equal(inv.vat, 150); assert.equal(inv.incVat, false);
  assert.equal(inv.terms, 'credit'); assert.equal(inv.termDays, 45); assert.equal(inv.due, addDays(today, 45)); assert.equal(inv.supplierId, sup.id);
  // opened again, the amount shows as typed (before VAT)
  w.eval('A.siOpen')({ dataset: { id: inv.id } }); assert.equal(S.hrDraft.amount, '1000'); d.click('[data-act="close"]');
  // a cash invoice is paid when saved, with its voucher
  d.click('[data-act="siNew"]'); await sleep(20);
  d.setVal('hr-supplier', 'مخبز الحي'); d.setVal('hr-number', 'C-9'); d.setVal('hr-amount', '230');
  d.click('[data-act="tmSet"][data-k="cash"]'); d.setVal('hr-method', 'cash');
  d.click('[data-act="siSave"]'); await sleep(300);
  const cash = w.eval('S.supInv').find((i) => i.number === 'C-9');
  assert.equal(cash.terms, 'cash'); assert.equal(cash.status, 'paid'); assert.equal(w.eval('supRemain')(cash), 0);
  assert.ok(w.eval('S.vouchers').some((v) => v.amount === 230 && v.payee === 'مخبز الحي' && v.method === 'cash'), 'voucher for the cash invoice');
  // a credit expense stays owed until its payment is recorded
  d.click('[data-act="tab"][data-k="expenses"]');
  d.click('[data-act="exNew"]'); await sleep(20);
  d.click('[data-act="tmSet"][data-k="credit"]'); d.setVal('hr-amount', '575');
  d.click('[data-act="exSave"]'); await sleep(300);
  const ex = w.eval('S.expenses')[0];
  assert.equal(ex.terms, 'credit'); assert.equal(ex.paid, false); assert.equal(ex.vat, 75); assert.equal(ex.due, addDays(today, 30));
  w.eval('A.exOpen')({ dataset: { id: ex.id } }); w.eval('render()');
  d.click('[data-act="exPaid"]'); await sleep(300);
  assert.equal(w.eval('S.expenses')[0].paid, true);
  // the supplier statement: invoice, then a part payment
  d.click('[data-act="tab"][data-k="supinv"]');
  w.eval('A.siOpen')({ dataset: { id: inv.id } }); w.eval('render()');
  d.setVal('si-payAmt', '400'); d.click('[data-act="siPay"]'); await sleep(400);
  const st = w.eval('supStatement')(w.eval('S.suppliers')[0], '', '');
  assert.equal(st.rows.length, 2); assert.equal(st.inv, 1150); assert.equal(st.paid, 400); assert.equal(st.close, 750);
  assert.equal(w.eval('supBalance')(w.eval('S.suppliers')[0]), 750);
  d.click('[data-act="tab"][data-k="supst"]');
  assert.ok(w.document.querySelector('.ss-tbl'), 'statement table shown');
  assert.ok(!w.document.querySelector('#tabsIn .tab-sub').hidden, 'reports group open while a report is shown');
  // a supplier with invoices cannot be deleted
  w.eval('A.supOpen')({ dataset: { id: sup.id } }); w.eval('render()');
  d.click('[data-act="supDel"]'); await sleep(50);
  assert.equal(w.eval('S.suppliers').length, 1);
  d.click('[data-act="close"]');
});

test('P&L per branch and company: every line against hand-worked numbers', async () => {
  const S = w.eval('S'), mk = '2026-11', B = 'القطيف';
  S.costs = { 'tea-1': 50 };
  S.finCfg = { salesVat: true };
  S.sales = [{ branch: B, date: mk + '-05', sales: 115000, invoices: 900 }];           // 100,000 without VAT
  S.orders = [
    { id: 'P1', kind: 'supply', branch: B, status: 'received', shippedAt: mk + '-03T08:00:00Z', lines: [{ id: 'tea-1', sent: 10 }] },   // 500 at cost
    { id: 'P2', kind: 'return', branch: B, status: 'received', receivedAt: mk + '-20T08:00:00Z', lines: [{ id: 'tea-1', received: 2 }] } ]; // −100
  S.expenses = [
    { kind: 'expense', cat: 'rent', place: B, date: '2026-01-05', amount: 120000, vat: 0, periodFrom: '2026-01', periodTo: '2026-12' },  // 10,000 a month
    { kind: 'expense', cat: 'utilities', place: B, date: mk + '-09', amount: 2300, vat: 300 },        // 2,000
    { kind: 'expense', cat: 'purchases', place: B, date: mk + '-11', amount: 1150, vat: 150 },        // 1,000 cash purchases
    { kind: 'income', cat: 'catering', place: B, date: mk + '-15', amount: 5750, vat: 750 },          // 5,000 other income
    { kind: 'expense', cat: 'rent', place: '@office', date: mk + '-01', amount: 3000, vat: 0 } ];    // head office
  S.assets = [{ id: 'AS1', name: 'مكينة', place: B, cost: 60000, date: '2026-01-01', life: 5 }];       // 1,000 a month
  S.emps = [{ id: 'PE1', name: 'م', branch: B, salary: 3000, alHousing: 750, hire: '2024-01-01', status: 'active' }]; // not GOSI → employer 2%
  S.forms = []; S.leaves = []; S.advances = []; S.payroll = [];
  const R = w.eval('pnlCalc')(mk, mk), x = R.P[B];
  const near = (a, b, m) => assert.ok(Math.abs(a - b) < 0.01, m + ': ' + a + ' ≠ ' + b);
  near(x.sales, 100000, 'net sales'); near(x.otherInc, 5000, 'other income'); near(x.rev, 105000, 'revenue');
  near(x.cogsGoods, 400, 'goods at cost less returns'); near(x.cogsCash, 1000, 'cash purchases'); near(x.gross, 103600, 'gross profit');
  near(x.pay, 3750, 'pay'); near(x.gosi, 75, 'employer insurance 2%'); near(x.eos, 156.25, 'end-of-service provision');
  near(x.exp.rent, 10000, 'annual rent spread'); near(x.exp.utilities, 2000, 'utilities without VAT'); near(x.dep, 1000, 'depreciation');
  near(x.net, 105000 - 1400 - (3750 + 75 + 156.25 + 10000 + 2000 + 1000), 'net operating profit');
  near(R.C.exp.rent, 13000, 'company rent includes head office');
  // spreading head-office costs: the only branch takes all of it, company total unchanged
  const A = w.eval('pnlAllocate')(R);
  near(A.P[B].exp.rent, 13000, 'allocated rent'); near(A.P[B].net + 0, R.C.net, 'branch = company after allocation');
  // the page renders with the statement
  await driver(w).signIn('6060'); driver(w).click('[data-act="tab"][data-k="pnl"]');
  assert.ok(w.document.querySelector('.pl-tbl'), 'statement shown');
});

test('expense categories from the cost study: every item belongs to one category and has a name', () => {
  const groups = w.eval('EXP_GROUPS'), cats = w.eval('EXP_CATS');
  assert.equal(new Set(cats).size, cats.length, 'no item in two categories');
  const names = JSON.parse(w.eval('JSON.stringify(EXP_CATS.map(c=>t("ec_"+c)).concat(EXP_GROUPS.map(g=>t("eg_"+g[0]))))'));
  assert.ok(names.every((n) => n && !n.startsWith('ec_') && !n.startsWith('eg_')), 'all named');
  for (const k of ['foodCost', 'packaging', 'staffHousing', 'gas', 'pos', 'qiwa', 'mudad', 'zakat', 'pest', 'tickets'])
    assert.ok(cats.includes(k), k + ' present');
  // a cost-of-sales item goes to cost of sales, an item of another category to its category
  const S = w.eval('S');
  S.sales = []; S.orders = []; S.assets = []; S.emps = []; S.costs = {};
  S.expenses = [{ kind: 'expense', cat: 'packaging', place: 'القطيف', date: '2026-11-02', amount: 1150, vat: 150 },
                { kind: 'expense', cat: 'gas', place: 'القطيف', date: '2026-11-02', amount: 500, vat: 0 }];
  const R = w.eval('pnlCalc')('2026-11', '2026-11');
  assert.equal(R.P['القطيف'].cogs, 1000);
  assert.equal(R.P['القطيف'].exp.gas, 500);
  const labels = w.eval('pnlLines')(R).map((l) => l[0]);
  assert.ok(labels.includes(w.eval('t("eg_energy")')), 'energy category line');
  assert.ok(labels.includes(w.eval('t("ec_packaging")')), 'packaging line under cost of sales');
});

test('break-even per branch: contribution margin, daily point, invoices needed, safety margin', async () => {
  const S = w.eval('S'), mk = '2026-11', B = 'القطيف';
  S.costs = {}; S.orders = []; S.assets = []; S.emps = []; S.forms = []; S.leaves = []; S.advances = []; S.payroll = [];
  S.finCfg = { salesVat: true };
  // 20 recorded days, 115,000 incl. VAT (100,000 net), 2,000 invoices
  S.sales = Array.from({ length: 20 }, (_, i) => ({ branch: B, date: mk + '-' + String(i + 1).padStart(2, '0'), sales: 5750, invoices: 100 }));
  S.expenses = [
    { kind: 'expense', cat: 'foodCost', place: B, date: mk + '-02', amount: 40000, vat: 0 },        // variable (cost of sales)
    { kind: 'expense', cat: 'delivery', place: B, date: mk + '-02', amount: 5750, vat: 750 },        // variable (5,000)
    { kind: 'expense', cat: 'electricity', place: B, date: mk + '-02', amount: 30000, vat: 0 } ];    // fixed
  const X = w.eval('beCalc')(mk, mk, false), r = X.rows.find((x) => x.name === B);
  const near = (a, b, m) => assert.ok(Math.abs(a - b) < 0.01, m + ': ' + a + ' ≠ ' + b);
  near(r.sales, 100000, 'net sales'); near(r.variable, 45000, 'variable'); near(r.fixed, 30000, 'fixed');
  near(r.cm, 0.55, 'contribution margin'); near(r.be, 30000 / 0.55, 'break-even');
  near(r.beDaily, 30000 / 0.55 / 30, 'daily break-even'); near(r.beDailyVat, 30000 / 0.55 / 30 * 1.15, 'daily incl. VAT');
  near(r.ticket, 50, 'average invoice'); near(r.beInvDaily, 30000 / 0.55 / 30 / 50, 'invoices needed a day');
  near(r.actualDaily, 5000, 'actual daily'); near(r.safety, (100000 - 30000 / 0.55) / 100000, 'margin of safety');
  assert.equal(r.status, 'above');
  await driver(w).signIn('6060'); driver(w).click('[data-act="tab"][data-k="be"]');
  assert.ok(w.document.querySelectorAll('.be-card').length >= 2, 'branch and company cards');
});

test('invoice reading: ZATCA QR, invoice text, prefilled form saved with its photo, duplicate warning', async () => {
  // a ZATCA QR: tag-length-value, base64
  const tlv = (tag, v) => { const b = Buffer.from(v, 'utf8'); return Buffer.concat([Buffer.from([tag, b.length]), b]); };
  const qr = Buffer.concat([tlv(1, 'شركة الألبان المتحدة'), tlv(2, '310122393500003'), tlv(3, '2026-11-20T10:15:00Z'), tlv(4, '2300.00'), tlv(5, '300.00')]).toString('base64');
  const Q = w.eval('parseZatcaQR')(qr);
  assert.equal(Q.supplier, 'شركة الألبان المتحدة'); assert.equal(Q.vatNo, '310122393500003');
  assert.equal(Q.date, '2026-11-20'); assert.equal(Q.amount, 2300); assert.equal(Q.vat, 300);
  assert.equal(w.eval('parseZatcaQR')('not a qr'), null);
  // text from a photographed invoice (Arabic digits, mixed labels)
  const txt = 'مؤسسة التموين الحديثة\nفاتورة ضريبية\nرقم الفاتورة: INV-٢٠٤٥\nالتاريخ ٢٠٢٦/١١/١٨\nالرقم الضريبي 300112233400003\nالمجموع قبل الضريبة 1,000.00\nضريبة القيمة المضافة 15% 150.00\nالإجمالي شامل الضريبة 1,150.00';
  const P = w.eval('parseInvoiceText')(txt);
  assert.equal(P.number, 'INV-2045'); assert.equal(P.vatNo, '300112233400003'); assert.equal(P.date, '2026-11-18');
  assert.equal(P.amount, 1150); assert.equal(P.vat, 150); assert.equal(P.supplier, 'مؤسسة التموين الحديثة');
  // what a phone photo really gives: direction marks, a split VAT number, the value on the next line
  const P2 = w.eval('parseInvoiceText')('فاتورة ضريبية مبسطة\nشركة الألبان المتحدة\nرقم الفاتورة:\n‎INV-2045‏\nالرقم الضريبي: 3101 2239 3500 003\nالتاريخ: 20-11-2026\nالإجمالي\n2,300.00 ر.س');
  assert.equal(P2.number, 'INV-2045'); assert.equal(P2.vatNo, '310122393500003'); assert.equal(P2.date, '2026-11-20');
  assert.equal(P2.amount, 2300); assert.equal(P2.supplier, 'شركة الألبان المتحدة');
  const P3 = w.eval('parseInvoiceText')('ALMARAI COMPANY\nTax Invoice\nInvoice No. 88-1043\nVAT No 300555666700003\nDate 2026/11/02\nSubtotal 400.00\nVAT 15% 60.00\nTotal Amount 460.00 SAR');
  // a real supplier invoice (dot-matrix on pink paper) as the text reader returns it: badly read labels,
  // the customer's VAT number next to the supplier's, "Total Vat" line, total without VAT
  const P4 = w.eval('parseInvoiceText')('‎TAM Nakheel Company LTD. 7 ‏نسدد« ص‎ —\nVAT: 310000111200003 712345678901234 : لرظهم الضريبي\nTax Invoice فاتورة ضريبة Page 1 1\n© No. فاتورة ضربية 7700112233 Jal) Credit Moble جوال 0500000001\n[Date 06/05/2026 11:23:57 | Customer VAT ز قم الضريبي العميل 310999888700003\n973.91 Tot Amount{exciusive vat) الإجمالي غير الغريبة\n146.09 TotalVat 15% ا | مجموم ضريية القمة المضافة\n1,120.00 Total المستحق');
  assert.equal(P4.number, '7700112233'); assert.equal(P4.vatNo, '310000111200003'); assert.equal(P4.date, '2026-05-06');
  assert.equal(P4.amount, 1120); assert.equal(P4.vat, 146.09); assert.match(P4.supplier, /Nakheel Company LTD\./);
  // a thermal receipt as read after turning the sideways photo: number before its label, total without a decimal part
  const P5 = w.eval('parseInvoiceText')('شركة مخازن النور التجارية\nالرقم الضريبيللفرع 310555444300003\nقاتورةضريبية\nرقم العميل 5000001\n900100200301 رقم الغانورة\n17/04/2025\n3100000009 الرقم الضريبي\n0500000002 تلفون المندوب\n3,782.6100 اجمالي القيمة\n567.3910 الضريبة\n4,350 الاجمالي');
  assert.equal(P5.number, '900100200301'); assert.equal(P5.vatNo, '310555444300003'); assert.equal(P5.date, '2025-04-17');
  assert.equal(P5.amount, 4350); assert.equal(P5.vat, 567.39); assert.match(P5.supplier, /^شركة مخازن النور/);
  // the same receipt when its labels column is not read: the invoice number is the long number standing alone
  const P6 = w.eval('parseInvoiceText')('الفاكس وكير :8000001\nالرقم الضريبي وبع:310555444300003\nفاتورةضريبية\nels |5000001\nوه900100200301\nyuk: 58 3100000009\nSst |4000000001\nvera 88 0500000002\nالرقم بنك الراجحي 1111222233334444\n567.31 الضريبة\n4,350 الاجمالي', { loose: true });
  assert.equal(P6.number, '900100200301'); assert.equal(P6.vat, 567.39, 'one misread digit in the VAT: worked out from the total');
  // a misread VAT number in the header is not taken for the invoice number
  assert.equal(w.eval('parseInvoiceText')('Nakheel Company LTD.\nVAT: 310000111200003 712345678901234 : لرظهم الضريبي\n1,120.00 Total').number, undefined);
  assert.equal(P3.number, '88-1043'); assert.equal(P3.amount, 460); assert.equal(P3.vat, 60); assert.equal(P3.supplier, 'ALMARAI COMPANY');
  // the prefilled form saves the invoice together with its photo
  const d = driver(w), S = w.eval('S');
  await d.signIn('6060'); d.click('[data-act="tab"][data-k="supinv"]');
  assert.ok(w.document.querySelector('.scan-in'), 'upload button shown');
  S.supInv = []; w.eval('MEMSET')('supInvoices', []);
  S.docImg = 'data:image/jpeg;base64,/9j/AAAA'; S.scanInfo = { qr: ['supplier', 'vatNo', 'date', 'amount', 'vat'], text: ['number'] };
  S.openSi = 'new'; S.hrDraft = { supplier: Q.supplier, vatNo: Q.vatNo, number: 'A-77', date: Q.date, due: '', amount: '2300', vat: '300', note: '' };
  w.eval('render()');
  assert.ok(w.document.querySelector('.scan-note'), 'shows what was read'); assert.ok(w.document.querySelector('.scan-thumb'), 'shows the photo');
  d.click('[data-act="siSave"]'); await sleep(300);
  const inv = w.eval('S.supInv')[0];
  assert.equal(inv.vatNo, '310122393500003'); assert.equal(inv.hasFile, true);
  assert.equal(await w.eval('DOC_FILES').get('supInvoices', inv.id), 'data:image/jpeg;base64,/9j/AAAA');
  // the same invoice again is flagged before it is saved twice
  S.openSi = 'new'; S.hrDraft = { supplier: Q.supplier, vatNo: Q.vatNo, number: 'A-77', date: Q.date, amount: '2300', vat: '300' }; w.eval('render()');
  d.click('[data-act="siSave"]'); await sleep(100);
  assert.equal(w.eval('S.supInv').length, 1, 'duplicate held back');
  d.click('[data-act="close"]');
});

test('attached photos: kept with an expense, removed again, required with the daily sales', async () => {
  const d = driver(w), S = w.eval('S'), img = 'data:image/jpeg;base64,/9j/PHOTO';
  const addPhoto = (key) => { const p = S.phs[key]; assert.ok(p, 'photo strip for ' + key); p.list.push({ pid: 'p' + p.list.length, data: img, saved: false }); w.eval('render()'); };
  // finance: an expense with two photos
  await d.signIn('6060');
  w.eval('MEMSET')('expenses', []); w.eval('xLoadDemo()');
  d.click('[data-act="tab"][data-k="expenses"]'); d.click('[data-act="exNew"]'); await sleep(20);
  assert.ok(w.document.querySelector('.ph-block .ph-add input[type="file"][accept="image/*"][multiple]'), 'add-photo button (camera or gallery)');
  addPhoto('expenses/new'); addPhoto('expenses/new');
  assert.equal(w.document.querySelectorAll('.ph-th').length, 2);
  d.setVal('hr-amount', '115'); d.click('[data-act="exSave"]'); await sleep(300);
  const ex = w.eval('S.expenses')[0];
  assert.equal(ex.photos, 2);
  assert.equal((await w.eval('PH_STORE').list('expenses', ex.id)).length, 2, 'photos stored with the record');
  // opened again: the photos load; one is removed on save
  w.eval('A.exOpen')({ dataset: { id: ex.id } }); w.eval('render()'); await sleep(50);
  assert.equal(w.document.querySelectorAll('.ph-th').length, 2, 'photos shown again');
  d.click('.ph-x'); d.click('[data-act="exSave"]'); await sleep(300);
  assert.equal(w.eval('S.expenses')[0].photos, 1);
  assert.equal((await w.eval('PH_STORE').list('expenses', ex.id)).length, 1);
  // the large view opens and closes
  w.eval('A.exOpen')({ dataset: { id: ex.id } }); w.eval('render()'); await sleep(50);
  d.click('[data-act="phView"]'); assert.ok(w.document.getElementById('phBox'), 'large view');
  d.click('#phBox [data-act="phClose"]'); assert.ok(!w.document.getElementById('phBox'));
  d.click('[data-act="close"]');
  // a branch cannot save the day's sales without the closing report photo
  await d.signIn('9191'); d.setVal('ownerBranch', 'branch:القطيف'); await sleep(200);
  d.click('[data-act="tab"][data-k="sales"]');
  const day = w.eval('dayKey(Date.now())'), sid = 'القطيف_' + day;
  w.eval('MEMSET')('sales', []); w.eval('xLoadDemo()'); S.dsr = null; w.eval('render()'); await sleep(50);
  d.setVal('dsr-a-cash_pm', '5000'); d.setVal('dsr-f-cash_pm', '5000');
  assert.ok(w.document.querySelector('.ph-block.need'), 'photo asked for');
  d.click('[data-act="dsrSave"]'); await sleep(200);
  assert.equal(w.eval('S.sales').filter((r) => r.id === sid).length, 0, 'not saved without a photo');
  addPhoto('sales/' + sid); addPhoto('sales/' + sid + '__bal');
  d.click('[data-act="dsrSave"]'); await sleep(300);
  const row = w.eval('S.sales').find((r) => r.id === sid);
  assert.ok(row, 'saved with the photo'); assert.equal(row.photos, 1);
  d.setVal('ownerView', 'dash'); await sleep(200);
});

test('daily sales log: operations and finance see each day with its photo and mark it checked', async () => {
  const d = driver(w), S = w.eval('S'), day = w.eval('dayKey(Date.now())');
  const rows = [{ id: 'القطيف_' + day, branch: 'القطيف', date: day, sales: 5000, invoices: 120, photos: 1 },
    { id: 'الخبر_' + day, branch: 'الخبر', date: day, sales: 3000, invoices: 80 }];
  w.eval('MEMSET')('sales', rows); S._demoPh = {}; S.phs = {}; w.eval('PH_STORE').put('sales', rows[0].id, 'p1', 'data:image/jpeg;base64,/9j/Z', 'القطيف');
  // finance
  await d.signIn('6060'); w.eval('xLoadDemo()'); w.eval('render()');
  d.click('[data-act="tab"][data-k="salesLog"]');
  assert.equal(w.document.querySelectorAll('[data-act="slLogOpen"]').length, 2, 'both branches listed');
  assert.ok(w.document.querySelector('.sl-nophoto'), 'a day without a photo is flagged');
  d.click(`[data-act="slLogOpen"][data-id="${rows[0].id}"]`); await sleep(50);
  assert.equal(w.document.querySelectorAll('.ph-th').length, 1, 'closing report photo shown');
  assert.ok(!w.document.querySelector('.ph-x'), 'read-only: no remove button');
  d.click('[data-act="slRev"][data-k="diff"]'); await sleep(100);
  assert.ok(!w.eval('S.sales').find((r) => r.id === rows[0].id).review, 'a difference needs a note');
  d.setVal('slRevNote', 'الصورة تبين 4,950'); d.click('[data-act="slRev"][data-k="diff"]'); await sleep(300);
  const rv = w.eval('S.sales').find((r) => r.id === rows[0].id).review;
  assert.equal(rv.st, 'diff'); assert.equal(rv.note, 'الصورة تبين 4,950');
  // filters: waiting for review
  d.click('[data-act="slLogSt"][data-k="wait"]');
  assert.equal(w.document.querySelectorAll('[data-act="slLogOpen"]').length, 1);
  d.click('[data-act="slLogSt"][data-k=""]');
  // operations sees the same log
  await d.signIn('9191'); d.setVal('ownerView', 'manager'); await sleep(200);
  assert.ok(w.document.querySelector('#tabsIn [data-act="tab"][data-k="salesLog"]'), 'operations menu entry');
  d.click('[data-act="tab"][data-k="salesLog"]');
  d.click(`[data-act="slLogOpen"][data-id="${rows[1].id}"]`); d.click('[data-act="slRev"][data-k="ok"]'); await sleep(300);
  assert.equal(w.eval('S.sales').find((r) => r.id === rows[1].id).review.st, 'ok');
  d.setVal('ownerView', 'dash'); await sleep(200);
});

test('daily closing (DSR): Foodics reports read from photos, differences need a reason, sent to finance', async () => {
  const d = driver(w), S = w.eval('S'), parse = w.eval('parseFoodicsReport');
  // the till report as the text reader returns it (the riyal sign read as "#" or as a stuck "4")
  const till = parse('Till\nBusiness Date: 2026/10/09\nPrinted at: 2026/10/10 01:47:14 AM\nUser: محمد حسني\nOpened At: 2026/10/09 02:23 PM\nClosed At: 2026/10/10 01:47 AM\nPayments\nCash: #136.00\nMada: 41,653.00\nHungerstation: #88.00\nTotal Payments: #1,877.00\nTotal Returns: #0.00\nNet Payments: #1,877.00\nDrawer Operations\nTotal Pay In: #0.00\nTotal Pay Out: #0.00\nTotal Cash Drops: #0.00\nTotal Payment Operations: #136.00\nOpening Amount: #0.00\nClosing Amount: #131.00\nEstimated Cash In Register: #136.00\nCash Shortage: #5.00\nEnd Of Report');
  assert.equal(till.kind, 'till'); assert.equal(till.date, '2026-10-09'); assert.equal(till.openHour, 14);
  assert.equal(till.pay.cash, 136); assert.equal(till.pay.mada, 1653, 'stuck digit removed: methods add up to the total'); assert.equal(till.pay.hunger, 88);
  assert.equal(till.closing, 131); assert.equal(till.short, 5); assert.equal(till.totalPay, 1877);
  // misread heading, comma decimals, dotted thousands, labels with stray marks
  const rough = parse('Paymerts\n| Cash: & 136,00\nMada: ~1.653,00\nHungerstation: #88.00\nTotal Payments: #1,877.00\nCl0sing Amount: 131.00\nCash Shortaqe: 5.00');
  assert.equal(rough.pay.cash, 136); assert.equal(rough.pay.mada, 1653); assert.equal(rough.pay.hunger, 88); assert.equal(rough.closing, 131); assert.equal(rough.short, 5);
  const noHead = parse('Cash: 136.00\nMada: 1,653.00\nHungerstation: 88.00\nTotal Payments: 1,877.00\nTotal Pay In: 0.00\nTotal Cash Drops: 0.00\nCash Shortage: 5.00');
  assert.equal(JSON.stringify(noHead.pay), JSON.stringify({ cash: 136, mada: 1653, hunger: 88 }), 'methods found above Total Payments without the heading');
  // the orders summary: number of orders, net sales, taxes; "Net Payments by Type" is not counted twice
  const ord = parse('Orders Summary\nBusiness Date: 2026/10/09\nGeneral\nName Quantity Amount\nGross Sales 77 #1,877.00\nGross Sales Without Tax 77 #1,632.17\nTotal Discounts 0 #0.00\nTotal Taxes - #244.83\nNet Sales 77 #1,632.17\nGuest Count 77 -\nTotal Void 0 #0.00\nPayments\nName Quantity Amount\nCash 4 #136.00\nMada 72 #1,653.00\nHungerstation 2 #88.00\nTotal Payments - #1,877.00\nTotal Return 0 #0.00\nNet Payments - #1,877.00\nNet Payments by Type\nCash - #136.00\nCard - #1,741.00');
  assert.equal(ord.kind, 'orders'); assert.equal(ord.orders, 77); assert.equal(ord.net, 1632.17); assert.equal(ord.tax, 244.83);
  assert.equal(JSON.stringify(ord.pay), JSON.stringify({ cash: 136, mada: 1653, hunger: 88 }));
  // the branch: both reports for the evening shift fill the form
  w.eval('MEMSET')('sales', []); S._demoPh = {}; S.phs = {}; w.eval('xLoadDemo()');
  await d.signIn('9191'); d.setVal('ownerBranch', 'branch:القطيف'); await sleep(200);
  d.click('[data-act="tab"][data-k="sales"]'); S.dsr = null; w.eval('render()'); await sleep(50);
  const day = w.eval('dayKey(Date.now())'), id = 'القطيف_' + day;
  const D = w.eval('dsrState')(day, null); w.eval('dsrApply')(D, till, 'pm'); w.eval('dsrApply')(D, ord, 'pm'); w.eval('render()');
  assert.equal(w.document.getElementById('dsr-f-cash_pm').value, '136'); assert.equal(w.document.getElementById('dsr-a-cash_pm').value, '131', 'counted cash');
  assert.equal(w.document.getElementById('dsr-f-mada_pm').value, '1653'); assert.equal(w.document.getElementById('dsr-f-hunger').value, '88');
  assert.equal(w.document.getElementById('dsr-inv').value, '77'); assert.equal(D.cashier.pm, 'محمد حسني');
  // actual Mada and HungerStation typed (from the terminal settlement and app receipts)
  d.setVal('dsr-a-mada_pm', '1653'); d.setVal('dsr-a-hunger', '88');
  assert.equal(w.document.getElementById('dsr-d-cash_pm').textContent.replace(/[‎‏\s]/g, ''), '-5');
  S.phs['sales/' + id].list.push({ pid: 'p0', data: 'data:image/jpeg;base64,/9j/Q', saved: false });
  assert.ok(!w.document.querySelector('.dsr-why'), 'no reason column');
  d.click('[data-act="dsrSave"]'); await sleep(200);
  assert.ok(!w.eval('S.sales').find((r) => r.id === id), 'held back: no reconciliation photo');
  S.phs['sales/' + id + '__bal'].list.push({ pid: 'b0', data: 'data:image/jpeg;base64,/9j/B', saved: false });
  d.click('[data-act="dsrSave"]'); await sleep(300);
  const row = w.eval('S.sales').find((r) => r.id === id);
  assert.ok(row, 'sent'); assert.equal(row.sales, 1877, 'Foodics total goes to sales'); assert.equal(row.invoices, 77);
  assert.equal(row.dsrA, 1872); assert.equal(row.dsrDiff, -5); assert.equal(row.balPhotos, 1);
  assert.equal((await w.eval('PH_STORE').list('sales', id + '__bal')).length, 1, 'reconciliation photo kept with the day'); assert.equal(row.dsr.till.pm.short, 5);
  // finance sees the DSR, the shortage and the month by payment method
  await d.signIn('6060'); w.eval('xLoadDemo()'); d.click('[data-act="tab"][data-k="salesLog"]');
  assert.ok(w.document.querySelector('.fn-tbl'), 'month by payment method');
  d.click('[data-act="slLogOpen"][data-id="' + id + '"]'); await sleep(50);
  assert.ok(w.document.querySelector('.dsr-tbl'), 'DSR table in the day');
  assert.ok(!w.document.querySelector('.dsr-tbl input'), 'read-only for finance');
  d.click('[data-act="close"]');
});

test('delivery apps in finance: sales per app, commission, transfers and balance, commission in P&L', async () => {
  const d = driver(w), S = w.eval('S'), mk = w.eval('monthKey(Date.now())'), day = mk + '-05';
  const dsr = (h, j) => ({ a: { hunger: h, jahez: j }, f: { hunger: h, jahez: j } });
  w.eval('MEMSET')('sales', [{ id: 'القطيف_' + day, branch: 'القطيف', date: day, sales: 2300, dsr: dsr(1000, 300) }, { id: 'الخبر_' + day, branch: 'الخبر', date: day, sales: 1150, dsr: dsr(500, 0) }]);
  w.eval('MEMSET')('appPays', []);
  await d.signIn('6060'); w.eval('xLoadDemo()'); d.click('[data-act="tab"][data-k="apps"]');
  d.setVal('apRate-hunger', '20'); await sleep(100);
  const M = w.eval('appStats')(w.eval('S.sales'));
  assert.equal(M.hunger.sales, 1500); assert.equal(M.hunger.fee, 300); assert.equal(M.hunger.net, 1200); assert.equal(M.jahez.fee, 0);
  // a transfer from HungerStation leaves 400 owed
  d.click('[data-act="apNew"]'); await sleep(20);
  d.setVal('hr-app', 'hunger'); d.setVal('hr-amount', '800'); d.click('[data-act="apSave"]'); await sleep(300);
  assert.equal(w.eval('appPaid')('hunger'), 800);
  assert.ok(w.document.body.textContent.includes('400'), 'remaining balance shown');
  // P&L: the commission is a delivery-app commission expense of the branch
  const P = w.eval('pnlCalc')(mk, mk);
  assert.equal(Math.round(P.P['القطيف'].exp.delivery), 200); assert.equal(Math.round(P.C.exp.delivery), 300);
});

test('daily closing: a real blurred till photo as the reader gave it, noise dropped, an unread app chosen by the branch', async () => {
  const S = w.eval('S'), parse = w.eval('parseFoodicsReport');
  const txt = "Cash      Nn 13.\nMada   A 3 873.00\n\n4\n\n' yUngerstation       & 35.00\n\n<\n\n3       A 94.00\nKoinz Pay       A 47 00\na!       A 82.50\nTotal Payments:    ® 4.154 50\nTotal Returns:         * 0.00\n\nSO  Net Payments:    HA 154 -30\nDrawer Operations        a\n\nTotal Pay In:         * 0.00\n\nTotal Pay Out:        % 0.00\n\nTotal Cash Drops:         % 0.00\n\nTotal Payment Operations:      % 23.00\nTotal Return Operations:       # 0.00\nCount of Open Drawers: lod alls  0\na          Opening Amount:         % 0.00\nClosing Amount:       * 23.00\nEstimated Cash In Register:       % 23.00\nCash Shortage: # 0.00\n";
  const r = parse(txt);
  assert.equal(r.kind, 'till'); assert.equal(r.totalPay, 4154.5);
  assert.equal(r.pay.cash, 23, 'cash from Total Payment Operations'); assert.equal(r.pay.mada, 3873, '"3 873.00" read whole');
  assert.equal(r.pay.hunger, 35); assert.equal(r.pay.koinz, 47, '"47 00" read as 47.00');
  assert.equal(JSON.stringify(r.unknown), JSON.stringify([94, 82.5]), 'the stray "4" dropped: the rest adds up to the total');
  // the Arabic reader names one of them; the other is chosen by the branch
  const ar = parse('Payments\n‏زهإنينجا‎ 82.50\nTotal Payments: 4,154.50');
  assert.equal(ar.pay.ninja, 82.5);
  const D = w.eval('dsrBlank')(); D.key = 'x'; S.dsr = D;
  r.pay.ninja = 82.5; r.unknown = [94]; r.pay.other = 94;
  w.eval('dsrApply')(D, r, 'pm');
  assert.equal(D.f.ninja, '82.5'); assert.equal(D.f.other, '94');
  assert.ok(w.eval('dsrUnkBox')(D).includes('94'), 'the branch is asked which app');
  const sel = w.document.createElement('select'); sel.dataset.in = 'dsrUnk'; sel.dataset.s = 'pm'; sel.dataset.i = '0';
  const opt = w.document.createElement('option'); opt.value = 'keeta'; sel.appendChild(opt); sel.value = 'keeta'; w.document.body.appendChild(sel);
  sel.dispatchEvent(new w.Event('change', { bubbles: true })); sel.remove();
  assert.equal(D.f.keeta, '94'); assert.ok(D.f.other == null, 'moved out of "other"');
  S.dsr = null;
});

test('daily closing: the actual column is filled from the report; a figure the branch typed is kept on a new photo', () => {
  const S = w.eval('S'), apply = w.eval('dsrApply');
  const D = w.eval('dsrBlank')(); D.key = 'y'; S.dsr = D;
  const rep = { pay: { cash: 23, mada: 3873, hunger: 35 }, closing: 23, opening: 0, unknown: [] };
  apply(D, rep, 'pm');
  assert.equal(D.a.cash_pm, '23', 'cash: counted'); assert.equal(D.a.mada_pm, '3873'); assert.equal(D.a.hunger, '35');
  assert.ok(D.auto.mada_pm && D.auto.hunger, 'copied figures marked');
  // the branch corrects Mada from the terminal settlement, then photographs again with a different HungerStation figure
  D.a.mada_pm = '3870'; delete D.auto.mada_pm;
  apply(D, { pay: { cash: 23, mada: 3873, hunger: 40 }, closing: 23, opening: 0, unknown: [] }, 'pm');
  assert.equal(D.a.mada_pm, '3870', 'typed figure kept'); assert.equal(D.a.hunger, '40', 'copied figure follows the new photo');
  S.dsr = null;
});

test('daily closing: the AI answer becomes the same figures (Arabic app names, cash from payment operations)', () => {
  const r = w.eval('aiToReport')({ kind: 'till', businessDate: '2026-11-26', openedAt: '15:54', user: 'كاشير',
    payments: [{ name: 'Cash', amount: 23 }, { name: 'Mada', amount: 3873 }, { name: 'Hungerstation', amount: 35 }, { name: 'كيتا', amount: 94 }, { name: 'Koinz Pay', amount: 47 }, { name: 'نينجا', amount: 82.5 }],
    totalPayments: 4154.5, totalReturns: 0, netPayments: 4154.5, totalPaymentOperations: 23, openingAmount: 0, closingAmount: 23, estimatedCashInRegister: 23, cashShortage: 0 });
  assert.equal(JSON.stringify(r.pay), JSON.stringify({ cash: 23, mada: 3873, hunger: 35, keeta: 94, koinz: 47, ninja: 82.5 }));
  assert.equal(r.unknown.length, 0); assert.equal(r.closing, 23); assert.equal(r.totalPay, 4154.5); assert.equal(r.date, '2026-11-26'); assert.equal(r.openHour, 15);
  // the demo has no Firebase project: the AI step stands aside and the phone reads
  return w.eval('readReportAI')({ width: 10, height: 10 }).then((x) => assert.equal(x, null));
});

test('archive: each department keeps its own documents in sections, with branch, expiry warning and search', async () => {
  const d = driver(w), S = w.eval('S');
  w.eval('MEMSET')('archive', []); w.eval('MEMSET')('archiveSecs', {});
  await d.signIn('6060'); w.eval('xLoadDemo()'); w.eval('render()');
  d.click('[data-act="tab"][data-k="archive"]');
  assert.ok(w.document.querySelectorAll('.arc-sec').length >= 7, 'ready-made finance sections');
  // add a document (as a PDF) in a section, linked to a branch, expiring in 10 days
  const ARC = w.eval('ARC'), soon = w.eval('dayKey(Date.now()+10*864e5)');
  await ARC.add({ dept: 'fin', sec: 'cr', title: 'السجل التجاري', ref: 'CR-1010', branch: 'القطيف', expiry: soon, note: 'نسخة 2026', name: 'cr.pdf', type: 'application/pdf', size: 1000 }, 'data:application/pdf;base64,JVBERi0=');
  await ARC.add({ dept: 'fin', sec: 'bank', title: 'كشف بنك أكتوبر', ref: '', branch: '', expiry: '', note: '', name: 'b.jpg', type: 'image/jpeg', size: 500 }, 'data:image/jpeg;base64,/9j/A');
  w.eval('render()');
  assert.equal(w.eval('S.archive').length, 2);
  assert.equal(w.eval('arcAlerts()').length, 1, 'expiring within 30 days');
  assert.ok(w.document.querySelector('#tabsIn [data-k="archive"] .badge'), 'menu badge for the expiring document');
  // search and section filter
  S.arcQ = 'CR-1010'; w.eval('render()');
  assert.equal(w.document.querySelectorAll('.arc-row').length, 1);
  S.arcQ = ''; S.arcSec = 'bank'; w.eval('render()');
  assert.equal(w.document.querySelectorAll('.arc-row').length, 1);
  S.arcSec = '';
  // the file comes back whole
  assert.equal(await ARC.get(w.eval('S.archive').find((x) => x.ref === 'CR-1010')), 'data:application/pdf;base64,JVBERi0=');
  // an own section, saved for the department
  d.click('[data-act="arcSecs"]'); await sleep(20);
  d.setVal('arcNewSec', 'عقود التأمين'); d.click('[data-act="arcSecAdd"]'); d.click('[data-act="arcSecsSave"]'); await sleep(200);
  assert.ok(w.eval('arcSecs')('fin').some((s) => s.name === 'عقود التأمين'), 'own section kept');
  // HR does not see the finance archive
  await d.signIn('9191'); d.setVal('ownerView', 'hr'); await sleep(200);
  assert.equal(w.eval('S.archive').length, 0, 'HR has its own (empty) archive');
  d.setVal('ownerView', 'dash'); await sleep(200);
});

test('correspondence: finance writes to operations and a branch with an attachment; read receipt, reply, badge; HR cannot see it', async () => {
  const d = driver(w), S = w.eval('S');
  w.eval('MEMSET')('mail', []); S._demoMsgs = {}; S._demoMail = {};
  // finance writes
  await d.signIn('6060'); w.eval('xLoadDemo()'); w.eval('render()');
  d.click('[data-act="tab"][data-k="mail"]');
  d.click('[data-act="mlNew"]'); await sleep(20);
  d.click('[data-act="mlTo"][data-k="ops"]'); d.click('[data-act="mlTo"][data-k="br:القطيف"]');
  d.setVal('ml-subject', 'تعميم أسعار الموردين'); d.setVal('ml-body', 'نرفق لكم قائمة الأسعار الجديدة');
  S.mlDraft.files.push({ name: 'prices.pdf', type: 'application/pdf', size: 900, data: 'data:application/pdf;base64,JVBERi0=' });
  d.click('[data-act="mlSend"]'); await sleep(300);
  const m = w.eval('S.mail')[0];
  assert.equal(m.subject, 'تعميم أسعار الموردين'); assert.equal(JSON.stringify(m.parties), JSON.stringify(['fin', 'ops', 'br:القطيف']));
  // operations: unread badge, opens it (read receipt), replies
  await d.signIn('9191'); d.setVal('ownerView', 'manager'); await sleep(200);
  assert.equal(w.eval('mailUnreadN()'), 1, 'unread for operations');
  assert.ok(w.document.querySelector('#tabsIn [data-k="mail"] .badge'), 'menu badge');
  d.click('[data-act="tab"][data-k="mail"]');
  d.click(`[data-act="mlOpen"][data-id="${m.id}"]`); await sleep(100);
  assert.ok(w.document.querySelector('.ml-file'), 'attachment shown');
  assert.equal(await w.eval('MAILS').file(m.id, w.eval('S.mlMsgs').list[0].att[0]), 'data:application/pdf;base64,JVBERi0=');
  assert.ok(w.eval('S.mail')[0].readBy.ops, 'read receipt stored');
  d.setVal('ml-body', 'تم الاستلام، شكراً'); d.click('[data-act="mlReply"]'); await sleep(300);
  assert.equal(w.eval('S.mail')[0].n, 1); assert.equal(w.eval('S.mail')[0].lastFrom, 'ops');
  d.click('[data-act="close"]');
  // HR is not a party
  d.setVal('ownerView', 'hr'); await sleep(200);
  assert.equal(w.eval('S.mail').length, 0, 'HR does not see it');
  // finance sees the reply as unread
  d.setVal('ownerView', 'finance'); await sleep(200);
  assert.equal(w.eval('mailUnreadN()'), 1, 'reply unread for finance');
  d.setVal('ownerView', 'dash'); await sleep(200);
});
