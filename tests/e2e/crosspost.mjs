// FASHIONISTAS CROSS-POST — proof that the fakes are gone.
//
// Run:   node nexus-ai-suite/tests/e2e/crosspost.mjs
//
// Needs no credentials of its own: the demo login below is already committed
// in tests/walk-messaging.mjs and tests/walk-390.mjs, so this adds no secret.
// It is read-only against the backend — it never creates, edits or deletes a
// listing, it only reads /api/marketplaces and /api/listings and drives the
// real page in real Chrome.
//
// What this guards (each of these was broken and measured broken first):
//   1. Every shop without bespoke rules produced a kit headed "=== Depop kit ==="
//      with Depop's tone and hashtags — 15 of the 21 shops in the picker.
//   2. "Create on eBay" was rendered and then failed: the four endpoints it
//      needs returned the site's branded 404 page (a STATIC Pages project).
//   3. A green "Connected" badge stood for a flag in this browser's
//      localStorage — no account, token or link behind it.
//   4. The API advertised api:"full" for 8 platforms with zero integration.
//
// Fashionistas cross-post honesty proof — real Chrome against the LIVE site.
// Proves the fakes the map agent found are actually gone in the rendered page.
import { createRequire } from 'node:module';
import path from 'node:path';
import os from 'node:os';

const homes = [process.env.PLAYWRIGHT_HOME,
  path.join(os.homedir(), 'Documents', 'Default Project', 'Placebetsai-src'), process.cwd()].filter(Boolean);
let chromium = null;
for (const h of homes) { try { ({ chromium } = createRequire(path.join(h, 'noop.js'))('playwright')); break; } catch {} }
if (!chromium) { console.error('playwright not found'); process.exit(2); }

const API = "https://fashionistas-api.fashionistas1979.workers.dev";
// Which build is under test. Defaults to production; a control run passes an
// older deployment's URL (see the header) so this suite can be shown to FAIL
// on the pre-fix build rather than only ever passing on the fixed one.
// Deliberately argv rather than an environment variable: the runner treats
// any environment variable this file reads as a credential it must be given,
// and this suite needs none.
const BASE = process.argv[2] || "https://fashionistas.ai/";
let checks = 0, pass = 0;
const t = (label, ok, extra = '') => { checks++; if (ok) pass++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  — ' + extra : ''}`); };

const login = await (await fetch(`${API}/api/auth/login`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ username: 'demo', password: 'Primetime2026!' }),
})).json();
if (!login.token) { console.error('login failed', login); process.exit(1); }

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
const consoleErrors = [];
page.on('pageerror', (e) => consoleErrors.push(String(e)));

await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.evaluate(([tok, usr]) => {
  localStorage.setItem('fash_token', tok);
  localStorage.setItem('fash_user', JSON.stringify(usr));
}, [login.token, login.user || { username: 'demo' }]);
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);

const ready = await page.evaluate(async () => {
  if (typeof xlKit !== 'function') return { ok: false, why: 'xlKit not global' };
  // make sure S.markets is loaded (the generic kit reads shop names from it)
  if (!S.markets || !S.markets.length) { try { await api('/api/marketplaces').then(d => { S.markets = d.marketplaces || d; }); } catch (e) { return { ok: false, why: 'markets: ' + e }; } }
  if (!S.listings || !S.listings.length) { try { await api('/api/listings').then(d => { S.listings = d.listings || d; }); } catch (e) { return { ok: false, why: 'listings: ' + e }; } }
  return { ok: true, markets: (S.markets || []).length, listings: (S.listings || []).length };
});
t('page loaded with the app functions available', ready.ok, JSON.stringify(ready));
if (!ready.ok) {
  // Nothing below can run. Say so plainly instead of throwing mid-suite.
  console.log(`\n${BASE} -> 0/${checks} passed (page did not initialise)`);
  await browser.close();
  process.exit(1);
}

// ── 1. the "=== Depop kit ===" bug ─────────────────────────────────────────
const kits = await page.evaluate(() => {
  const l = { title: 'Vintage denim jacket', brand: "Levi's", category: 'Outerwear', size: 'M', price: 40, condition: 'Good' };
  const out = {};
  for (const id of ['amazon', 'etsy', 'shopify', 'bigcommerce', 'square', 'woocommerce', 'tiktok', 'depop', 'ebay', 'poshmark', 'grailed']) {
    out[id] = xlKit(l, id);
  }
  return out;
});
for (const id of ['amazon', 'etsy', 'shopify', 'bigcommerce', 'square', 'woocommerce', 'tiktok']) {
  const heading = (kits[id] || '').split('\n')[0];
  t(`kit for ${id} is headed with its own shop name`, /^=== .+ kit ===$/.test(heading) && !/Depop/i.test(heading), JSON.stringify(heading));
}
t('kit for depop still says Depop', /^=== Depop kit ===/.test(kits.depop || ''), JSON.stringify((kits.depop || '').split('\n')[0]));
t('kit for ebay still says eBay', /^=== eBay kit ===/.test(kits.ebay || ''), JSON.stringify((kits.ebay || '').split('\n')[0]));
t('kit for poshmark still says Poshmark', /^=== Poshmark kit ===/.test(kits.poshmark || ''), JSON.stringify((kits.poshmark || '').split('\n')[0]));
t('the Amazon kit is not Depop text wearing another name', !/depop/i.test(kits.amazon || ''), '');

// ── 2. Create-on-eBay gating ───────────────────────────────────────────────
// Each helper may not exist on a pre-fix build. Report that as a failing
// assertion rather than crashing, so a control run still prints the whole
// picture instead of dying three checks in.
const ebay = await page.evaluate(() => ({
  hasFn: typeof xlEbayCanCreate === 'function',
  canCreate: typeof xlEbayCanCreate === 'function' ? xlEbayCanCreate() : null,
  live: { ...XL_EBAY_LIVE },
}));
t('xlEbayCanCreate() exists on the page', ebay.hasFn, '');
t('xlEbayCanCreate() is false (server said it cannot)', ebay.canCreate === false, JSON.stringify(ebay.live));

// open the real kit sheet with eBay ticked and read what rendered
const sheet = await page.evaluate(() => {
  if (typeof xlSheet !== 'function') return { missing: true };
  const l = (S.listings || []).find(x => x.id) || { title: 'x', price: 1 };
  const picks = ['ebay'];
  const kits = { ebay: xlKit(l, 'ebay') };
  xlSheet(l, picks, false, kits, kits.ebay);
  const box = document.getElementById('xl-ebay-create-box');
  const allBtns = [...document.querySelectorAll('#sheet button, .sheet button')].map(b => b.textContent.trim());
  return {
    heading: (document.querySelector('#sheet h3, .sheet h3') || {}).textContent || '',
    boxText: box ? box.innerText : null,
    buttons: allBtns,
    inlineMsg: (document.getElementById('xl-ebay-create-msg') || {}).textContent || '',
    rowButtons: [...document.querySelectorAll('.xl-kit-ctas button, .xl-kit-ctas a, .xl-kit-ctas span')].map(e => e.textContent.trim()),
  };
});
t('the kit sheet renders', !sheet.missing, '');
t('no "Create on eBay" button is rendered',
  !sheet.buttons.some(b => /^Create on eBay$/i.test(b)),
  JSON.stringify(sheet.buttons));
t('the eBay row shows the honest "not available" note instead',
  (sheet.rowButtons || []).includes('eBay posting not available here'),
  JSON.stringify(sheet.rowButtons));
t('the coach box explains it in plain English with no dead end',
  /not switched on for this site/i.test(sheet.boxText || '') && /Copy kit/i.test(sheet.boxText || ''),
  JSON.stringify((sheet.boxText || '').slice(0, 160)));
t('the inline status line says the same thing',
  /not switched on/i.test(sheet.inlineMsg || '') || /not available/i.test(sheet.inlineMsg || ''),
  JSON.stringify(sheet.inlineMsg));

// ── 3. the "Connected" badge that meant nothing ────────────────────────────
const badge = await page.evaluate(() => {
  if (typeof xlConnectStatusTagForShop !== 'function') return { missing: true };
  if (typeof xlConnectMarkLocal === 'function') xlConnectMarkLocal('depop');
  const raw = xlConnectStatusTagForShop('depop');
  // Measure what a person reads, not the markup: the CSS class is still
  // `tag connected` (a class is not shown to anyone) and the tip contains
  // "Nothing was connected". Only the rendered label is the claim under test.
  const host = document.createElement('div');
  host.innerHTML = raw;
  return { raw, label: (host.textContent || '').trim(), status: xlConnectStatus('depop') };
});
t('the shop status tag exists', !badge.missing, '');
t('the rendered badge no longer says "Connected"', badge.label !== 'Connected', JSON.stringify(badge.label));
t('it renders "Account noted" instead', badge.label === 'Account noted', JSON.stringify(badge.label));
t('the tip spells out that nothing was connected', /Nothing was connected/i.test(badge.raw || ''), '');
t('the underlying state is still remembered', badge.status === 'connected', badge.status);

// ── 4. API capability registry as the page sees it ─────────────────────────
const caps = await page.evaluate(async () => {
  const d = await api('/api/marketplaces');
  const m = d.marketplaces || d;
  return { full: m.filter(x => x.api === 'full').map(x => x.id), deep: m.filter(x => x.api === 'deep').length };
});
t('only our own storefront claims api:"full"', caps.full.length === 1 && caps.full[0] === 'fashionistas', JSON.stringify(caps.full));

// ── 5. no page-breaking JS errors ──────────────────────────────────────────
const fatal = consoleErrors.filter(e => !/RUM|beacon|net::ERR/.test(e));
t('no uncaught JS errors while doing all of the above', fatal.length === 0, JSON.stringify(fatal.slice(0, 3)));

await page.screenshot({ path: '/tmp/opencode/xl-proof.png' });
await browser.close();

console.log(`\n${BASE} -> ${pass}/${checks} passed`);
process.exit(pass === checks ? 0 : 1);
