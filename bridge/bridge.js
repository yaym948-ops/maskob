#!/usr/bin/env node
/* Maskob print bridge — runs on an always-on phone (Termux), Raspberry Pi or computer in the branch.
   It signs in with the branch code, watches the branch's print queue (printJobs) and sends each job to its printer
   on the local network (raw TCP, port 9100). The app draws the receipt as an ESC/POS image, so nothing is rendered here.
   Usage:  node bridge.js            run (asks for branch and code the first time)
           node bridge.js --reset    forget the saved branch and code
           node bridge.js --install-boot   start automatically after a reboot (Termux:Boot) */
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import net from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const FIREBASE = { projectId: 'fllow-maskob', appId: '1:489074385747:web:e3a4c23245fe51729877a6', apiKey: 'AIzaSyDO8Kbyp9JzPW0T1Nge73uVWvUE5cUHURs', authDomain: 'fllow-maskob.firebaseapp.com', storageBucket: 'fllow-maskob.firebasestorage.app', messagingSenderId: '489074385747' };
const DIR = path.dirname(fileURLToPath(import.meta.url));
const CFG_FILE = path.join(DIR, 'config.json');
const log = (...a) => console.log(new Date().toLocaleTimeString('en-GB'), ...a);
const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');   // same as the app: sha256("maskob:<key>:<code>")

if (process.argv.includes('--reset')) { try { fs.unlinkSync(CFG_FILE); } catch (e) {} console.log('تم حذف الإعدادات. شغّل البرنامج مرة أخرى.'); process.exit(0); }
if (process.argv.includes('--install-boot')) {
  const bootDir = path.join(os.homedir(), '.termux', 'boot');
  fs.mkdirSync(bootDir, { recursive: true });
  const f = path.join(bootDir, 'maskob-bridge.sh');
  fs.writeFileSync(f, `#!/data/data/com.termux/files/usr/bin/sh\ntermux-wake-lock\ncd "${DIR}"\nwhile true; do node bridge.js >> bridge.log 2>&1; sleep 10; done\n`);
  fs.chmodSync(f, 0o755);
  console.log('تم. ثبّت تطبيق Termux:Boot وافتحه مرة واحدة، وسيعمل البرنامج تلقائياً بعد إعادة تشغيل الجوال.');
  process.exit(0);
}

async function ask(q) { const rl = readline.createInterface({ input: process.stdin, output: process.stdout }); const a = await new Promise((r) => rl.question(q, r)); rl.close(); return a.trim(); }
async function loadConfig() {
  try { return JSON.parse(fs.readFileSync(CFG_FILE, 'utf8')); } catch (e) {}
  console.log('— إعداد الجهاز الوسيط لطباعة مسكوب —');
  const branch = await ask('اسم الفرع كما هو في التطبيق: ');
  const code = await ask('رمز دخول الفرع: ');
  const cfg = { branch, code };
  fs.writeFileSync(CFG_FILE, JSON.stringify(cfg), { mode: 0o600 });
  return cfg;
}

const cfg = await loadConfig();
const app = initializeApp(FIREBASE);
const auth = getAuth(app);
const db = getFirestore(app);
const cred = await signInAnonymously(auth);
const uid = cred.user.uid;

/* open a session like the app does: a personal account of the branch, or the branch's shared code */
async function openSession() {
  const at = new Date().toISOString();
  const hu = sha('maskob:u:' + cfg.code);
  const su = await getDoc(doc(db, 'codes', hu)).catch(() => null);
  if (su && su.exists() && su.data().user) {
    const c = su.data();
    if (c.role !== 'branch' || c.branch !== cfg.branch) throw new Error('هذا الرمز ليس رمز الفرع «' + cfg.branch + '»');
    await setDoc(doc(db, 'sessions', uid), { role: 'branch', branch: cfg.branch, h: hu, user: c.user, name: c.name || '', at });
    return;
  }
  const hb = sha('maskob:branch:' + cfg.branch + ':' + cfg.code);
  const sb = await getDoc(doc(db, 'codes', hb)).catch(() => null);
  if (!(sb && sb.exists())) throw new Error('اسم الفرع أو الرمز غير صحيح');
  await setDoc(doc(db, 'sessions', uid), { role: 'branch', branch: cfg.branch, h: hb, at });
}
try { await openSession(); } catch (e) { console.error('تعذّر الدخول:', e.message, '\nلتغيير الفرع أو الرمز: node bridge.js --reset'); process.exit(1); }
log('متصل بفرع', cfg.branch);

let printers = [];
onSnapshot(doc(db, 'bprinters', cfg.branch), (s) => { printers = (s.exists() && s.data().printers) || []; log('الطابعات:', printers.map((p) => `${p.name} (${p.ip})`).join('، ') || 'لا توجد'); }, fatal);

/* heartbeat: the app shows the bridge as online */
async function beat() { try { await setDoc(doc(db, 'bprinters', cfg.branch), { bridgeAt: new Date().toISOString(), bridgeName: os.hostname() }, { merge: true }); } catch (e) { log('تعذّر تحديث الحالة:', e.code || e.message); } }
beat(); setInterval(beat, 60000);

/* send bytes to a printer on port 9100 */
function send(p, buf) {
  return new Promise((resolve, reject) => {
    let done = false; const end = (e) => { if (done) return; done = true; clearTimeout(to); e ? reject(e) : resolve(); };
    const s = net.connect({ host: p.ip, port: +p.port || 9100 });
    const to = setTimeout(() => { s.destroy(); end(new Error('لا ترد الطابعة (انتهت المهلة)')); }, 10000);
    s.on('connect', () => s.write(buf, () => s.end()));
    s.on('close', () => end());
    s.on('error', (e) => end(new Error(e.code === 'ECONNREFUSED' ? 'رفضت الطابعة الاتصال' : e.code === 'EHOSTUNREACH' || e.code === 'ENETUNREACH' ? 'الطابعة غير موجودة على الشبكة' : e.message)));
  });
}
const busy = new Set();
const queue = [];
let running = false;
async function work() {
  if (running) return; running = true;
  while (queue.length) {
    const j = queue.shift();
    const p = printers.find((x) => x.id === j.printer);
    if (!p) { await updateDoc(doc(db, 'printJobs', j.id), { status: 'error', err: 'الطابعة غير موجودة في الإعدادات' }).catch(() => {}); busy.delete(j.id); continue; }
    let err = null;
    for (let i = 0; i < 3; i++) {
      try { await send(p, Buffer.from(j.data, 'base64')); err = null; break; } catch (e) { err = e; await new Promise((r) => setTimeout(r, 3000)); }
    }
    if (err) { log('✗', p.name, err.message); await updateDoc(doc(db, 'printJobs', j.id), { status: 'error', err: err.message, tries: (j.tries || 0) + 3 }).catch(() => {}); }
    else { log('✓', p.name, j.kind === 'kitchen' ? 'تذكرة' : 'فاتورة', j.no ? '#' + j.no : ''); await updateDoc(doc(db, 'printJobs', j.id), { status: 'done', doneAt: new Date().toISOString(), err: '' }).catch(() => {}); }
    busy.delete(j.id);
  }
  running = false;
}
onSnapshot(query(collection(db, 'printJobs'), where('branch', '==', cfg.branch), where('status', '==', 'new')), (s) => {
  s.docs.forEach((d) => { if (busy.has(d.id)) return; busy.add(d.id); queue.push(Object.assign({ id: d.id }, d.data())); });
  queue.sort((a, b) => String(a.at).localeCompare(String(b.at)));
  work();
}, fatal);

/* tidy up: printed jobs older than a day */
async function tidy() {
  try {
    const s = await getDocs(query(collection(db, 'printJobs'), where('branch', '==', cfg.branch), where('status', '==', 'done')));
    const old = Date.now() - 864e5;
    for (const d of s.docs) if (new Date(d.data().doneAt || d.data().at) < old) await deleteDoc(d.ref).catch(() => {});
  } catch (e) {}
}
tidy(); setInterval(tidy, 3600e3);

function fatal(e) {
  if (e && e.code === 'permission-denied') { console.error('انتهت صلاحية الدخول (تغيّر رمز الفرع؟). شغّل: node bridge.js --reset'); process.exit(1); }
  log('خطأ في الاتصال:', e && (e.code || e.message), '— سيعيد المحاولة تلقائياً');
}
