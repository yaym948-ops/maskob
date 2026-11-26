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
  const pick = async (v) => { d.setVal('ownerView', v); await sleep(200); };
  for (const v of ['warehouse', 'hr', 'admin', 'branch:القطيف', 'manager', 'dash']) {
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
  const tabs = [...w.document.querySelectorAll('#tabsIn .tab')].map((b) => b.dataset.k);
  assert.deepEqual(tabs, ['fsum', 'expenses', 'supinv', 'payroll', 'vouchers', 'advances', 'pnl', 'be', 'costs', 'assets']);
  const mk = w.eval('monthKey(Date.now())');
  // an expense
  d.click('[data-act="tab"][data-k="expenses"]');
  d.click('[data-act="exNew"]'); await sleep(20);
  d.setVal('hr-cat', 'rent'); d.setVal('hr-place', 'القطيف'); d.setVal('hr-amount', '11500');
  d.click('[data-act="exVat15"]');
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
