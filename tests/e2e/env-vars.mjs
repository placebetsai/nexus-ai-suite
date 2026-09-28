// ENVIRONMENT VARIABLES — end-to-end proof in a real browser.
//
// Run:
//   CS_E2E_EMAIL=you@example.com CS_E2E_PASS=... \
//     node nexus-ai-suite/tests/e2e/env-vars.mjs
//
// Credentials come from the environment so they never enter this public repo.
import { createRequire } from 'node:module';
import path from 'node:path';
import os from 'node:os';

const homes = [
  process.env.PLAYWRIGHT_HOME,
  path.join(os.homedir(), 'Documents', 'Default Project', 'Placebetsai-src'),
  process.cwd(),
].filter(Boolean);
let chromium = null;
for (const home of homes) {
  try { ({ chromium } = createRequire(path.join(home, 'noop.js'))('playwright')); break; }
  catch { /* next home */ }
}
if (!chromium) {
  console.error('playwright not found. Set PLAYWRIGHT_HOME to a folder that has it.');
  process.exit(2);
}

const HOST = 'https://app.createstuff.ai/';
const EMAIL = process.env.CS_E2E_EMAIL;
const PASS = process.env.CS_E2E_PASS;
const KEY = 'BRAND_NAME';
const VAL = 'Steady Tracker';

const errors = [];
const failed = [];
const badResponses = [];   // every >=400, with its URL, so nothing hides
let checks = 0, pass = 0;
const t = (label, ok, extra = '') => {
  checks++; if (ok) pass++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  — ' + extra : ''}`);
};

const browser = await chromium.launch({
  executablePath: process.env.HOME + '/.local/opt/google-chrome/chrome',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1366, height: 950 } });
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('requestfailed', (r) => failed.push(r.url() + ' :: ' + (r.failure()?.errorText || '?')));
page.on('response', (r) => {
  if (r.status() >= 400) badResponses.push(`${r.status()} ${r.url()}`);
});

await page.goto(HOST, { waitUntil: 'networkidle', timeout: 60000 });
if (await page.locator('#login-screen').isVisible().catch(() => false)) {
  await page.fill('#login-user', EMAIL);
  await page.fill('#login-pass', PASS);
  await page.click('#login-submit');
  await page.waitForSelector('#login-screen', { state: 'hidden', timeout: 45000 }).catch(() => {});
}
await page.waitForTimeout(1200);
t('signed in', !(await page.locator('#login-screen').isVisible().catch(() => false)));

// --- open the Files page -------------------------------------------------
await page.click('[data-page="files"]');
await page.waitForSelector('#page-files', { state: 'visible', timeout: 15000 });
await page.waitForSelector('#env-card', { state: 'visible', timeout: 15000 });
t('Environment card is on the page', true);

// Pick a project that actually has a published index.html, so the injection
// assertion at the end tests a real page instead of a 404.
const pick = await page.evaluate(async () => {
  const sel = document.getElementById('files-project');
  if (!sel) return null;
  const opts = [...sel.options].map((o) => o.value);
  for (const id of opts) {
    const r = await fetch(`https://createstuff-api.fashionistas1979.workers.dev/published/${id}/index.html`);
    if (r.ok) { sel.value = id; sel.dispatchEvent(new Event('change')); return id; }
  }
  return null;
});
t('found an app that has a published page', !!pick, String(pick));
await page.waitForTimeout(2000);

const rows = () => page.locator('#env-list .env-row').count();
const rowFor = (k) => page.locator(`.env-row[data-env-key="${k}"]`);

// start from a known-empty state
const existing = await rows();
for (let i = 0; i < existing; i++) {
  const k = await page.locator('#env-list .env-row').first().getAttribute('data-env-key');
  await page.locator('#env-list .env-row').first().locator('.env-del').click();
  await page.waitForTimeout(900);
}
t('cleared the list to start clean', (await rows()) === 0, `${existing} removed`);
t('empty state explains itself',
  (await page.locator('#env-list').innerText()).toLowerCase().includes('no variables'),
  JSON.stringify((await page.locator('#env-list').innerText()).slice(0, 60)));

t('honest warning is shown',
  (await page.locator('.env-warn').innerText()).toLowerCase().includes('public page'));
t('warning carries a hover tip', !!(await page.getAttribute('.env-warn', 'data-tip')));
t('key field carries a hover tip', !!(await page.getAttribute('#env-key', 'data-tip')));

// --- add a variable ------------------------------------------------------
await page.fill('#env-key', KEY);
await page.fill('#env-value', VAL);
await page.click('#env-add');
await page.waitForSelector(`.env-row[data-env-key="${KEY}"]`, { timeout: 20000 }).catch(() => {});
t('variable appears in the list', (await rowFor(KEY).count()) === 1);

const shown = await rowFor(KEY).locator('.env-v').innerText();
t('value is masked by default', /^•+$/.test(shown.trim()), JSON.stringify(shown));
t('masked text is not the value', !shown.includes(VAL));

// --- reveal --------------------------------------------------------------
await rowFor(KEY).locator('.env-eye').click();
await page.waitForTimeout(250);
const revealed = await rowFor(KEY).locator('.env-v').innerText();
t('eye reveals the value', revealed.trim() === VAL, JSON.stringify(revealed));

// --- re-mask -------------------------------------------------------------
await rowFor(KEY).locator('.env-eye').click();
await page.waitForTimeout(250);
t('eye masks it again', /^•+$/.test((await rowFor(KEY).locator('.env-v').innerText()).trim()));

// --- invalid name refused in the UI -------------------------------------
await page.fill('#env-key', 'BAD KEY');
await page.fill('#env-value', 'x');
await page.click('#env-add');
await page.waitForTimeout(2500);
t('invalid name does not create a row', (await page.locator('.env-row[data-env-key="BAD KEY"]').count()) === 0);
t('user is told why',
  ((await page.locator('#toast').textContent()) || '').includes('letter'),
  JSON.stringify(await page.locator('#toast').textContent().catch(() => '')));

// --- value is masked as password input while typing ----------------------
const inputType = await page.getAttribute('#env-value', 'type');
t('value field is a password field', inputType === 'password', String(inputType));

// --- persists across a reload -------------------------------------------
// Project selection is not part of the app's saved state — on a fresh load it
// opens on the newest app — so re-select the one under test before asserting.
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1800);
await page.click('[data-page="files"]');
await page.waitForSelector('#env-card', { state: 'visible', timeout: 15000 });
await page.evaluate((id) => {
  const sel = document.getElementById('files-project');
  if (!sel) return;
  sel.value = id;
  sel.dispatchEvent(new Event('change'));
}, pick);
await page.waitForSelector(`.env-row[data-env-key="${KEY}"]`, { timeout: 20000 }).catch(() => {});
t('variable survives a reload', (await rowFor(KEY).count()) === 1);
if ((await rowFor(KEY).count()) === 1) {
  t('and is masked again after the reload',
    /^•+$/.test((await rowFor(KEY).locator('.env-v').innerText()).trim()));
} else {
  t('and is masked again after the reload', false, 'row not present');
}

// --- the published page actually receives it ----------------------------
const pub = await page.evaluate(async (val) => {
  const tok = localStorage.getItem('cs_token') || '';
  const pj = await fetch('https://createstuff-api.fashionistas1979.workers.dev/api/projects',
    { headers: { Authorization: 'Bearer ' + tok } }).then((r) => r.json()).catch(() => ({}));
  const list = pj.projects || [];
  const sel = document.getElementById('files-project');
  const id = sel ? sel.value : (list[0] && list[0].id);
  if (!id) return { ok: false };
  const html = await fetch(`https://createstuff-api.fashionistas1979.workers.dev/published/${id}/index.html`)
    .then((r) => (r.ok ? r.text() : '')).catch(() => '');
  return { ok: true, hasEnv: /window\.__ENV=/.test(html), hasVal: html.includes(val), len: html.length };
}, VAL);
t('published page is served with window.__ENV', pub.ok && pub.hasEnv, JSON.stringify(pub));
t('...and it carries the value typed in the UI', pub.ok && pub.hasVal, JSON.stringify(pub));

// --- delete --------------------------------------------------------------
await rowFor(KEY).locator('.env-del').click();
await page.waitForTimeout(2500);
t('bin removes the variable', (await rowFor(KEY).count()) === 0);

await page.screenshot({ path: '/tmp/opencode/env-proof.png', fullPage: false });

const ours = failed.filter((f) => !f.includes('/cdn-cgi/'));
t(`0 failed product requests (${ours.length})`, ours.length === 0);

// Resource-status console lines are not JavaScript errors: a browser logs
// "Failed to load resource: 404" for any non-2xx. Separate the two, then
// account for every >=400 by the step of THIS test that deliberately caused it.
const jsErrors = errors.filter((e) => !/^Failed to load resource/.test(e));
t(`0 JavaScript errors (${jsErrors.length})`, jsErrors.length === 0, JSON.stringify(jsErrors));

const isExpected = (u) => {
  const i = u.indexOf(' ');
  const status = u.slice(0, i);
  const url = u.slice(i + 1);
  if (status === '404' && /\/published\/[^/]+\/index\.html$/.test(url)) return true;  // pick() probing for a real page
  if (status === '400' && /\/api\/projects\/[^/]+\/env$/.test(url)) return true;      // the deliberate BAD KEY
  return false;
};
const unexpected = badResponses.filter((u) => !isExpected(u));
t(`every >=400 was caused by this test (${badResponses.length} total)`,
  unexpected.length === 0, JSON.stringify(unexpected));

console.log(`\n${pass}/${checks} passed`);
if (jsErrors.length) console.log('javascript errors:', jsErrors.slice(0, 6));
if (ours.length) console.log('failed product requests:', ours.slice(0, 6));
if (badResponses.length) console.log('>=400 responses:', badResponses.map((u) => '  ' + u).join('\n'));
await browser.close();
process.exit(pass === checks ? 0 : 1);
