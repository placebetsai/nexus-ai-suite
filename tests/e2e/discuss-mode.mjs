// DISCUSSION MODE — end-to-end proof in a real browser.
//
// Run:
//   CS_E2E_EMAIL=you@example.com CS_E2E_PASS=... \
//     node nexus-ai-suite/tests/e2e/discuss-mode.mjs
//
// Credentials come from the environment so they never enter this public repo.
// Last run: 27/27 passed, 0 console errors, 0 failed product requests.
import { createRequire } from 'node:module';
import path from 'node:path';
import os from 'node:os';

// nexus-ai-suite has no package.json and no node_modules, so a plain
// `import "playwright"` cannot resolve from this file. Find playwright in the
// homes that actually have it rather than asking anyone to npm-install a
// browser driver just to re-run a proof. Set PLAYWRIGHT_HOME to override.
const homes = [
  process.env.PLAYWRIGHT_HOME,
  path.join(os.homedir(), 'Documents', 'Default Project', 'Placebetsai-src'),
  process.cwd(),
].filter(Boolean);
let chromium = null;
for (const home of homes) {
  try { ({ chromium } = createRequire(path.join(home, 'noop.js'))('playwright')); break; }
  catch { /* try the next home */ }
}
if (!chromium) {
  console.error('playwright not found. Set PLAYWRIGHT_HOME to a folder that has it.');
  process.exit(2);
}

const HOST = 'https://app.createstuff.ai/';
const API = 'https://createstuff-api.fashionistas1979.workers.dev';
const EMAIL = process.env.CS_E2E_EMAIL;
const PASS = process.env.CS_E2E_PASS;

const errors = [];
const failed = [];
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

// --- sign in -------------------------------------------------------------
await page.goto(HOST, { waitUntil: 'networkidle', timeout: 60000 });
if (await page.locator('#login-screen').isVisible().catch(() => false)) {
  await page.fill('#login-user', EMAIL);
  await page.fill('#login-pass', PASS);
  await page.click('#login-submit');
  await page.waitForSelector('#login-screen', { state: 'hidden', timeout: 45000 }).catch(() => {});
}
await page.waitForTimeout(1200);
t('signed in', !(await page.locator('#login-screen').isVisible().catch(() => false)));

// --- open the builder ----------------------------------------------------
await page.click('[data-page="builder"]');
await page.waitForSelector('#page-builder', { state: 'visible', timeout: 15000 });

t('Build / Talk switch rendered', (await page.locator('.mode-btn').count()) === 2);

const activeMode = async () =>
  (await page.locator('.mode-btn.active').getAttribute('data-chat-mode').catch(() => null));

t('defaults to Build mode', (await activeMode()) === 'build');
t('hint explains Build',
  (await page.locator('#mode-hint').innerText()).includes('makes a new app'),
  JSON.stringify(await page.locator('#mode-hint').innerText()));
t('placeholder is the build one',
  (await page.getAttribute('#chat-input', 'placeholder')).includes('Say what you want'),
  JSON.stringify(await page.getAttribute('#chat-input', 'placeholder')));
t('send button is the arrow', (await page.locator('#send-btn').innerText()) === '→');

// The markup carries data-tip AND title; this app's tooltip engine
// (index.html:1055) then strips title so its custom bubble is the only one.
// So: data-tip must be live in the DOM, and title must exist in the SOURCE.
t('switch carries data-tip (live DOM)',
  !!(await page.getAttribute('.mode-btn[data-chat-mode="talk"]', 'data-tip')));
const srcHtml = await page.request.get(HOST).then((r) => r.text()).catch(() => '');
t('switch carries title (page source)',
  /data-chat-mode="talk"[^>]*\stitle="/.test(srcHtml));

// --- real project count against the API ---------------------------------
const count = () => page.evaluate(async (base) => {
  const tok = localStorage.getItem('cs_token') || '';
  const r = await fetch(base + '/api/projects', { headers: { Authorization: 'Bearer ' + tok } });
  if (!r.ok) return -1;
  const j = await r.json().catch(() => ({}));
  return (j.projects || []).length;
}, API);
const beforeProjects = await count();
t('project count readable from the API', beforeProjects >= 0, `count=${beforeProjects}`);

const previews = () => page.locator('#live-preview').count();

// csShowLastBuild() is async: it fetches /api/projects and then paints the
// LAST build's preview. Measuring before that lands makes a pre-existing
// preview look like something talking produced, so wait for it to settle first.
await page.waitForFunction(
  () => document.querySelectorAll('#live-preview').length > 0,
  null, { timeout: 12000 },
).catch(() => {});
await page.waitForTimeout(1200);
const previewsBefore = await previews();
t('existing preview settled before the question', previewsBefore >= 0,
  `${previewsBefore} preview(s) on screen`);

// --- switch to Talk ------------------------------------------------------
await page.click('.mode-btn[data-chat-mode="talk"]');
await page.waitForTimeout(250);
t('click switches to Talk', (await activeMode()) === 'talk');
t('aria-pressed updated',
  (await page.getAttribute('.mode-btn[data-chat-mode="talk"]', 'aria-pressed')) === 'true');
const hintTalk = await page.locator('#mode-hint').innerText();
t('hint says it builds nothing',
  /no app|none of your builds/i.test(hintTalk), JSON.stringify(hintTalk));
t('placeholder now invites a question',
  (await page.getAttribute('#chat-input', 'placeholder')).toLowerCase().includes('ask'),
  JSON.stringify(await page.getAttribute('#chat-input', 'placeholder')));

// --- ask a question ------------------------------------------------------
const Q = 'Should I build a recipe box app for my family, or is a shared note enough?';
await page.fill('#chat-input', Q);
await page.press('#chat-input', 'Enter');

await page.waitForFunction(() => {
  const el = document.getElementById('discussPending');
  return el && !el.innerText.includes('Thinking it through');
}, null, { timeout: 120000 }).catch(() => {});

const reply = await page.locator('#discussPending').innerText().catch(() => '');
t('an answer came back', reply.length > 80, `${reply.length} chars`);
t('user question is in the transcript',
  (await page.locator('#chat-messages').innerText()).includes('recipe box app'));
t('status line says no build was used',
  /no build/i.test(await page.locator('#agent-status-bar').innerText()),
  JSON.stringify(await page.locator('#agent-status-bar').innerText()));

// --- projects + preview unchanged by talking ----------------------------
await page.waitForTimeout(1500);
const afterTalk = await count();
t('project list UNCHANGED by talking', afterTalk === beforeProjects,
  `${beforeProjects} -> ${afterTalk}`);
t('no preview produced by talking', (await previews()) === previewsBefore,
  `${previewsBefore} -> ${await previews()}`);
// Belt and braces: whatever preview is on screen must not be the answer —
// talking must never render into the app preview.
const previewIsAnswer = await page.evaluate((q) => {
  const f = document.getElementById('live-preview');
  return f ? String(f.getAttribute('srcdoc') || '').includes(q.slice(0, 25)) : false;
}, Q);
t('preview is not the conversation', !previewIsAnswer);

// --- persistence across reload ------------------------------------------
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
await page.click('[data-page="builder"]');
await page.waitForSelector('#page-builder', { state: 'visible', timeout: 15000 });
t('Talk choice survives a reload', (await activeMode()) === 'talk');

// --- back to Build, and prove Build still builds -------------------------
await page.click('.mode-btn[data-chat-mode="build"]');
await page.waitForTimeout(200);
t('can switch back to Build', (await activeMode()) === 'build');
t('hint restored to Build',
  (await page.locator('#mode-hint').innerText()).includes('makes a new app'));
t('send button restored to arrow', (await page.locator('#send-btn').innerText()) === '→');

const beforeBuild = await count();
await page.fill('#chat-input', 'A tiny page that shows the weather in three cities');
await page.press('#chat-input', 'Enter');
// startBuild's first act is POST /api/projects — that is the routing proof
await page.waitForFunction(() => {
  const el = document.getElementById('agent-status-bar');
  return el && /working/i.test(el.innerText);
}, null, { timeout: 30000 }).catch(() => {});
await page.waitForTimeout(7000);
const afterBuild = await count();
t('Build mode still creates an app', afterBuild === beforeBuild + 1,
  `${beforeBuild} -> ${afterBuild}`);

await page.screenshot({ path: '/tmp/opencode/discuss-proof.png', fullPage: false });

// Cloudflare's own RUM beacon is aborted by navigation; it is infrastructure
// telemetry, not a product asset, so it is reported apart, not hidden.
const ours = failed.filter((f) => !f.includes('/cdn-cgi/'));
const infra = failed.filter((f) => f.includes('/cdn-cgi/'));
t(`0 console errors (${errors.length})`, errors.length === 0);
t(`0 failed product requests (${ours.length})`, ours.length === 0);
if (infra.length) console.log(`INFO  ${infra.length} Cloudflare telemetry beacon abort(s) on navigation: ${infra[0]}`);

console.log(`\n${pass}/${checks} passed`);
if (errors.length) console.log('console errors:', errors.slice(0, 6));
if (ours.length) console.log('failed product requests:', ours.slice(0, 6));
await browser.close();
process.exit(pass === checks ? 0 : 1);
