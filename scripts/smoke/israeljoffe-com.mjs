#!/usr/bin/env node
// Deterministic pre-deploy / post-deploy smoke gate. Zero dependencies (Node >= 18),
// zero AI/LLM grading: every assertion below is a plain string/number/JSON check.
//
//   node scripts/smoke.mjs [baseUrl] [--json out.json] [--skip-bots] [--quiet]
//   npm run smoke -- https://<preview>.pages.dev
//
// Exit 0 = all hard checks passed. Exit 1 = at least one hard check failed.
// "warn" checks are printed but never fail the gate.
// Used by scripts/deploy-safe.sh: preview must pass before production is touched,
// and production is re-checked right after the deploy.
const ARGS = process.argv.slice(2);
const flag = (n) => ARGS.includes(n);
const opt = (n) => { const i = ARGS.indexOf(n); return i >= 0 ? ARGS[i + 1] : undefined; };
const POSITIONAL = ARGS.filter((a, i) => !a.startsWith('--') && !(i > 0 && ['--json'].includes(ARGS[i - 1])));
const UA = { 'user-agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Mobile Safari/537.36 deploy-safe-smoke/1.0', accept: '*/*' };
const SKIP_BOTS = flag('--skip-bots') || process.env.SMOKE_SKIP_BOTS === '1';
const QUIET = flag('--quiet');
const results = [];

// Visible-text strings that mean a page rendered broken data or an error screen.
const BAD_TEXT = [
  /\bundefined\b/, /\bNaN\b/, /\[object Object\]/, /\bnull\s*(?:%|\$)/,
  /Application error: a (?:client|server)-side exception/i, /Internal Server Error/i,
  /Worker threw exception/i, /Error 1101/i, /Error 1102/i, /This page could not be found/i,
  /Unhandled Runtime Error/i, /Traceback \(most recent call last\)/,
];

function visibleText(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<template\b[\s\S]*?<\/template>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/\s+/g, ' ');
}

async function fetchT(url, init = {}, timeoutMs = 20000) {
  const t0 = Date.now();
  const res = await fetch(url, { redirect: 'follow', ...init, headers: { ...UA, ...(init.headers || {}) }, signal: AbortSignal.timeout(timeoutMs) });
  const body = await res.text();
  return { res, body, ms: Date.now() - t0 };
}

// One retry on network error / 5xx / timeout: a single blip should not block a deploy,
// but a real outage fails twice in a row.
async function fetchRetry(url, init, timeoutMs) {
  try {
    const r = await fetchT(url, init, timeoutMs);
    if (r.res.status < 500) return r;
    await new Promise((s) => setTimeout(s, 2500));
    return await fetchT(url, init, timeoutMs);
  } catch (e) {
    await new Promise((s) => setTimeout(s, 2500));
    return await fetchT(url, init, timeoutMs);
  }
}

async function check(name, fn, { warn = false } = {}) {
  const t0 = Date.now();
  let pass = false, detail = '';
  try {
    const out = await fn();
    if (out === true || out === undefined) pass = true;
    else if (typeof out === 'string') { pass = true; detail = out; }
    else if (out && typeof out === 'object') { pass = !!out.pass; detail = out.detail || ''; }
  } catch (e) {
    pass = false; detail = (e && e.message ? e.message : String(e)).slice(0, 300);
  }
  const r = { name, pass, warn, ms: Date.now() - t0, detail };
  results.push(r);
  if (!QUIET || !pass) console.log(`${pass ? 'PASS' : warn ? 'WARN' : 'FAIL'}  ${name}  (${r.ms} ms)${detail ? '  — ' + detail : ''}`);
  return r;
}
const fail = (msg) => { throw new Error(msg); };

// GET a page: status, time budget, required markers, and no broken-data text.
async function page(base, path, { status = 200, markers = [], budgetMs = 5000, bad = BAD_TEXT, allowBad = [] } = {}) {
  const { res, body, ms } = await fetchRetry(base + path, {}, Math.max(budgetMs * 3, 15000));
  if (res.status !== status) fail(`${path} → HTTP ${res.status} (want ${status})`);
  if (ms > budgetMs) fail(`${path} took ${ms} ms (budget ${budgetMs} ms)`);
  if (status === 200) {
    for (const m of markers) {
      const ok = m instanceof RegExp ? m.test(body) : body.includes(m);
      if (!ok) fail(`${path} missing marker ${m}`);
    }
    const text = visibleText(body);
    for (const re of bad) {
      if (allowBad.some((a) => String(a) === String(re))) continue;
      const mm = text.match(re);
      if (mm) {
        const i = mm.index; fail(`${path} shows "${mm[0]}": …${text.slice(Math.max(0, i - 60), i + 60).trim()}…`);
      }
    }
  }
  return { body, ms, res };
}

async function getJson(base, path, { budgetMs = 5000, status = 200, init = {} } = {}) {
  const { res, body, ms } = await fetchRetry(base + path, init, Math.max(budgetMs * 3, 15000));
  if (res.status !== status) fail(`${path} → HTTP ${res.status} (want ${status}) ${clip(body, 100)}`);
  let data;
  try { data = JSON.parse(body); } catch { fail(`${path} is not valid JSON: ${body.slice(0, 120)}`); }
  if (ms > budgetMs) fail(`${path} took ${ms} ms (budget ${budgetMs} ms)`);
  return { data, ms, res };
}

// POST to a bot endpoint. No retries on 4xx; one retry on 5xx/timeout.
async function postJson(base, path, payload, { budgetMs = 15000 } = {}) {
  const { res, body, ms } = await fetchRetry(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }, Math.max(budgetMs * 2, 30000));
  if (res.status !== 200) fail(`${path} → HTTP ${res.status} ${body.slice(0, 160)}`);
  let data; try { data = JSON.parse(body); } catch { fail(`${path} returned non-JSON: ${body.slice(0, 120)}`); }
  if (ms > budgetMs) fail(`${path} answered in ${ms} ms (budget ${budgetMs} ms)`);
  return { data, ms };
}

const hoursAgo = (iso) => (Date.now() - new Date(iso).getTime()) / 3.6e6;
// Calendar date and clock in America/New_York for "today"/"tonight" logic.
const etParts = (d = new Date()) => Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false }).formatToParts(d).map((p) => [p.type, p.value]));
const etDate = (d) => { const p = etParts(new Date(d)); return `${p.year}-${p.month}-${p.day}`; };
const isUsMarketHours = (d = new Date()) => { const p = etParts(d); const m = (+p.hour % 24) * 60 + +p.minute; return !['Sat', 'Sun'].includes(p.weekday) && m >= 9 * 60 + 30 && m <= 16 * 60; };
const clip = (s, n = 160) => String(s || '').replace(/\s+/g, ' ').slice(0, n);

function finish() {
  const hard = results.filter((r) => !r.pass && !r.warn);
  const warns = results.filter((r) => !r.pass && r.warn);
  const out = opt('--json');
  if (out) { import('node:fs').then((fs) => fs.writeFileSync(out, JSON.stringify({ base: BASE, at: new Date().toISOString(), results }, null, 1))); }
  console.log(`\nSMOKE ${hard.length ? 'FAILED' : 'PASSED'} — ${results.length - hard.length - warns.length}/${results.length} passed, ${hard.length} failed, ${warns.length} warnings — ${BASE}`);
  if (hard.length) { console.log('Failed checks:'); for (const r of hard) console.log(`  ✗ ${r.name}: ${r.detail}`); }
  setTimeout(() => process.exit(hard.length ? 1 : 0), 50);
}

// ───────────────────────── israeljoffe.com checks ─────────────────────────
const DEFAULT_BASE = 'https://israeljoffe.com';
const BASE = (POSITIONAL[0] || process.env.SMOKE_BASE || DEFAULT_BASE).replace(/\/+$/, '');
let urls = [];
await check('page /', () => page(BASE, '/', { markers: ['Israel Joffe'], budgetMs: 4000 }).then(() => true));
for (const p of ['/about/', '/publications/', '/contact/']) await check(`page ${p}`, () => page(BASE, p, { markers: ['Israel Joffe'], budgetMs: 4000 }).then(() => true));
await check('sitemap.xml valid, >50 URLs', async () => {
  const { res, body } = await fetchRetry(`${BASE}/sitemap.xml`, {}, 15000);
  if (res.status !== 200 || !body.includes('<urlset')) fail(`HTTP ${res.status}`);
  urls = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (urls.length < 50) fail(`${urls.length} URLs`);
  return `${urls.length} URLs`;
});
await check('sample of sitemap URLs render (deterministic pick)', async () => {
  const pages = urls.filter((u) => !/\.(jpe?g|png|webp|gif)$/i.test(u));
  const step = Math.max(1, Math.floor(pages.length / 6));
  const pick = pages.filter((_, i) => i % step === 0).slice(0, 6);
  for (const u of pick) { const path = new URL(u).pathname; await page(BASE, path, { markers: ['Israel Joffe'], budgetMs: 4000 }); }
  return `${pick.length} pages`;
});
await check('feed.xml', async () => { const { res, body } = await fetchRetry(`${BASE}/feed.xml`, {}, 15000); if (res.status !== 200 || !/<(rss|feed)\b/.test(body)) fail(`HTTP ${res.status}`); });
finish();
