// Loads the app (index.html + its local scripts, in page order) into a fake browser (jsdom)
// in demo mode: Firebase is never loaded, nothing touches the live database.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');

/** The page's scripts in order: [{name, code}] — inline blocks and local files (not CDN, not firebase-config.js). */
function appScripts() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const out = [];
  const re = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) {
    const attrs = m[1] || '';
    const src = (attrs.match(/src="([^"]+)"/) || [])[1];
    if (src) {
      if (/^https?:/.test(src) || src.startsWith('firebase-config')) continue;
      const file = src.split('?')[0];
      out.push({ name: file, code: fs.readFileSync(path.join(ROOT, file), 'utf8') });
    } else if (m[2].trim()) {
      out.push({ name: 'index.html#inline' + out.length, code: m[2] });
    }
  }
  return out;
}

/** Boot the app; resolves with the jsdom window once demo mode is ready. */
async function bootApp() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
  const dom = new JSDOM(html, { url: 'http://localhost/', pretendToBeVisual: true, runScripts: 'outside-only' });
  const w = dom.window;
  const ctx = dom.getInternalVMContext();
  const errors = [];
  w.addEventListener('error', (e) => errors.push(e.error || e.message));
  w.scrollTo = () => {};
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.open = () => null;
  w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;   // missing in jsdom; used for hashing sign-in codes
  for (const s of appScripts()) {
    try { new vm.Script(s.code, { filename: s.name }).runInContext(ctx); }   // like a real <script>: shared global scope
    catch (e) { throw new Error('Script failed to load: ' + s.name + ' — ' + (e && e.stack || e)); }
  }
  for (let i = 0; i < 50 && w.eval('S.mode') !== 'demo'; i++) await new Promise((r) => setTimeout(r, 20));
  if (errors.length) throw new Error('Errors while starting: ' + errors.map(String).join(' | '));
  return w;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Small helpers that drive the page like a user. */
function driver(w) {
  const $ = (sel) => { const e = w.document.querySelector(sel); if (!e) throw new Error('missing ' + sel); return e; };
  const click = (sel) => $(sel).click();
  const type = (digits) => { for (const c of digits) click(`[data-act="pinKey"][data-k="${c}"]`); };
  const setVal = (id, v) => { const e = $('#' + id); e.value = v; e.dispatchEvent(new w.Event('input', { bubbles: true })); e.dispatchEvent(new w.Event('change', { bubbles: true })); };
  const signIn = async (code) => {
    if (w.eval('S.role')) { click('.logout-btn'); await sleep(50); }
    click('[data-act="pinClear"]');                 // start from an empty pad (like a person after "wrong code")
    type(code); await sleep(400);
  };
  return { $, click, type, setVal, signIn };
}

module.exports = { ROOT, appScripts, bootApp, driver, sleep };
