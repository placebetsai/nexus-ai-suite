// The Connect panel must PERFORM, not instruct.
//
// Owner's complaint (2026-10-01), verbatim: "Connect Depop ... Ready to guide
// ... I've connected is a local flag only ... figure out an easy way". The
// panel opened on a checklist and a localStorage flag while this same repo
// already had an extension that fills the shop's form. This suite proves the
// panel now does the thing, in BOTH browser states:
//
//   helper installed   -> click -> extension ack -> shop tab opens ->
//                         description + price + PHOTO land in the form
//   helper not present -> click -> the payload (photo included) is copied and
//                         the shop opens, with the no-install bookmark offered
//
// Real Chrome + the unpacked extension + the LOCAL app build + the live API.
// Shop pages are mocks (tests/crosslister-mocks.mjs) because the real ones
// need a logged-in seller account. Nothing is ever submitted.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { MOCKS } from "./crosslister-mocks.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXT = path.join(ROOT, "extensions/crosslister");
const APP = path.join(ROOT, "apps/fashionistas");
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "xl-cg-"));
const ctx = await chromium.launchPersistentContext(profile, {
  channel: "chromium", headless: true, viewport: { width: 1280, height: 900 },
  // Real clipboard: section C reads the bytes back instead of trusting a stub.
  // This is what a person's own browser grants on a click; the automation
  // default is deny (measured: navigator.permissions clipboard-write ===
  // "denied" on the desktop profile, so an ungranted env cannot prove this).
  permissions: ["clipboard-read", "clipboard-write"],
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
});
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? "PASS " : "FAIL ") + m); };

await ctx.route(/^https:\/\/fashionistas\.ai\//, async (route) => {
  const u = new URL(route.request().url());
  let f = path.join(APP, decodeURIComponent(u.pathname));
  if (u.pathname === "/" || u.pathname === "/app") f = path.join(APP, "index.html");
  if (fs.existsSync(f) && fs.statSync(f).isFile()) return route.fulfill({ path: f });
  return route.continue();
});
for (const [url, html] of Object.entries(MOCKS)) {
  await ctx.route(url, (r) => r.fulfill({ contentType: "text/html", body: html }));
}

if (!ctx.serviceWorkers().length) await ctx.waitForEvent("serviceworker", { timeout: 15000 });
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));

await page.goto("https://fashionistas.ai/", { waitUntil: "networkidle" });
ok(await page.evaluate(() => !!document.documentElement.dataset.fashCrosslister), "helper is detected on the real origin");
await page.getByRole("button", { name: "Log in as demo seller" }).click();
await page.waitForTimeout(2500);

// ── setup: reach the Connect panel the way the owner did ───────────────────
// No Multilist, no kit sheet: the panel is opened straight from the shop grid
// and has to find a listing to send on its own.
const setup = await page.evaluate(async () => {
  if (!S.markets || !S.markets.length) { const d = await api("/api/marketplaces"); S.markets = d.marketplaces || d; }
  if (!S.listings || !S.listings.length) { const d = await api("/api/listings"); S.listings = d.listings || d; }
  const withPhoto = (S.listings || []).find((x) => x.photo_url);
  if (withPhoto) S.sel = new Set([withPhoto.id]);
  const resolved = typeof xlFillListing === "function" ? xlFillListing() : null;
  // Now take the tick away: with nothing selected the panel still has to pick
  // something, and it must pick one that carries a photo (live demo account's
  // first row has photo_url empty — measured 2026-10-01).
  S.sel = new Set();
  const bare = typeof xlFillListing === "function" ? xlFillListing() : null;
  return {
    listings: (S.listings || []).length,
    photoListing: withPhoto ? withPhoto.id : null,
    resolved: resolved ? resolved.id : null,
    bare: bare ? bare.id : null,
    barePhoto: bare ? !!bare.photo_url : null,
    firstRow: (S.listings || [])[0] ? (S.listings || [])[0].id : null,
    firstRowPhoto: (S.listings || [])[0] ? !!(S.listings || [])[0].photo_url : null,
    multilistOpened: !!CURRENT.xlFill,
    depopUrl: (xlConnectShopById("depop") || {}).createListing || null,
  };
});
ok(setup.listings > 0, "listings loaded: " + setup.listings);
ok(!!setup.photoListing, "a listing with a photo exists to ship: " + setup.photoListing);
ok(setup.multilistOpened === false, "Multilist was NEVER opened — the path the owner complained about");
ok(setup.resolved === setup.photoListing, "panel resolves the ticked item by itself: " + setup.resolved);
ok(setup.barePhoto === true, "with NOTHING ticked it still picks a photo-bearing item, not rows[0]: " +
  setup.bare + " (rows[0]=" + setup.firstRow + ", rows[0] photo=" + setup.firstRowPhoto + ")");
ok(setup.depopUrl === "https://www.depop.com/products/create/", "Depop deep link points at the real form: " + setup.depopUrl);

// ── A. helper installed: the real action, and no fake button ───────────────
const panel = await page.evaluate(() => {
  xlShopOpenGuide("depop");
  const body = document.getElementById("shop-cg-body");
  const html = body ? body.innerHTML : "";
  const btn = body ? body.querySelector('button[onclick*="xlConnectFill(\'depop\')"]') : null;
  const tagHost = document.createElement("div");
  tagHost.innerHTML = xlConnectStatusTagForShop("depop");
  const foot = body ? body.querySelector(".shop-cg-foot") : null;
  return {
    installed: xlExtInstalled(),
    btnLabel: btn ? btn.textContent.replace(/\s+/g, " ").trim() : null,
    btnCount: body ? body.querySelectorAll('button[onclick*="xlConnectFill"]').length : 0,
    tag: (tagHost.textContent || "").trim(),
    hasMsg: !!document.getElementById("xl-cg-fill-msg"),
    oldFake: /I've connected/.test(html),
    accountNote: /I have an account/.test(html),
    sub: (document.getElementById("shop-cg-sub") || {}).textContent || "",
    foot: foot ? foot.textContent.replace(/\s+/g, " ").trim() : "",
    honest: (body && body.querySelector(".shop-cg-honest") ? body.querySelector(".shop-cg-honest").textContent : ""),
  };
});
ok(panel.installed === true, "helper installed in this browser");
ok(panel.btnCount === 1, "exactly one fill action in the panel: " + panel.btnCount);
ok(panel.btnLabel === "Fill Depop for me", "primary action is the real fill, not a checklist: " + JSON.stringify(panel.btnLabel));
ok(panel.tag === "Auto-fill ready", "status tag reports a measured capability: " + JSON.stringify(panel.tag));
ok(panel.hasMsg, "there is a live status line for the result");
ok(panel.oldFake === false, 'the fake "I\'ve connected" button is gone from the panel');
ok(panel.accountNote === true, 'replaced by the honest "I have an account" note');
ok(/one tap/i.test(panel.sub), "subtitle promises the action: " + JSON.stringify(panel.sub));
ok(/your browser fills Depop for you/i.test(panel.foot), "footer says what actually happens: " + JSON.stringify(panel.foot));
ok(!/local flag/.test(panel.honest) && /one tap puts your photo/i.test(panel.honest),
  "Honest line no longer points at a flag — it points at the action: " + JSON.stringify(panel.honest.slice(0, 120)));
ok(!/Fill Depop for me/.test(panel.honest),
  "Honest line doesn't name a button label that this browser doesn't show: " + JSON.stringify(panel.honest.slice(0, 60)));

// ── B. click it: extension ack -> shop tab -> form filled, photo included ──
const opened = [];
ctx.on("page", (p) => opened.push(p));
await page.evaluate(() => {
  const b = document.querySelector('#shop-cg-body button[onclick*="xlConnectFill(\'depop\')"]');
  b && b.click();
});
const ackText = await page
  .waitForFunction(() => {
    const el = document.getElementById("xl-cg-fill-msg");
    const t = el ? el.textContent : "";
    return /Opened in new tabs|couldn't start|Nothing to send|blocked the copy/.test(t) ? t : null;
  }, null, { timeout: 25000 })
  .then((h) => h.jsonValue())
  .catch(() => null);
ok(!!ackText && /Opened in new tabs/.test(ackText), "the extension answered the panel click: " + JSON.stringify(ackText));

const deadline = Date.now() + 20000;
while (opened.length < 1 && Date.now() < deadline) await page.waitForTimeout(300);
ok(opened.length >= 1, "the shop tab opened: " + opened.length);

if (opened.length) {
  // Tabs the extension opens bypass Playwright's routing, so re-open the same
  // URL through Playwright to get the mock form (the job is still queued).
  const p = opened[opened.length - 1];
  await p.goto("https://www.depop.com/products/create/", { waitUntil: "load" }).catch((e) => console.log("goto", e.message));
  await page.waitForTimeout(6000);
  const v = await p.evaluate(() => ({
    all: [...document.querySelectorAll("input:not([type=file]):not([type=search]), textarea")]
      .map((e) => [[e.id, e.name, e.placeholder].filter(Boolean).join("|"), e.value]),
    file: [...document.querySelectorAll("input[type=file]")].map((i) => i.files.length),
    submitted: !!window.__submitted,
  }));
  const get = (k) => (v.all.find(([kk]) => kk.toLowerCase().includes(k)) || [])[1] || "";
  ok(get("description").length > 20, "Depop description filled by the panel click: " + JSON.stringify(get("description").slice(0, 48)));
  ok(/^\d+(\.\d+)?$/.test(get("price")), "Depop price filled: " + get("price"));
  ok(v.file[0] >= 1, "the PHOTO travelled with it: " + v.file[0] + " file(s) attached");
  ok(v.submitted !== true, "nothing was posted — the seller still presses Post");
}

// ── C. helper switched off: copy the payload (photo included) + open ───────
const noHelper = await page.evaluate(async () => {
  delete document.documentElement.dataset.fashCrosslister;   // helper off
  xlShopOpenGuide("depop");
  const body = document.getElementById("shop-cg-body");
  const btn = body ? body.querySelector('button[onclick*="xlConnectFill(\'depop\')"]') : null;
  const tagHost = document.createElement("div");
  tagHost.innerHTML = xlConnectStatusTagForShop("depop");

  const payload = await xlFillPayload(["depop"]);
  let j = null;
  try { j = JSON.parse(payload); } catch {}
  const shop = j && j.shops && j.shops.depop;

  // Stub ONLY the popup, so no real tab escapes the harness. The clipboard is
  // left REAL: the context was launched with clipboard-read/write granted (the
  // way a person's browser grants it on a click — the automation default is
  // deny, measured: permissions.query(clipboard-write) === "denied"), so the
  // assertions below read the actual bytes back off the system clipboard
  // instead of trusting a stub.
  window.__opened = null;
  try { window.open = (u) => { window.__opened = u; return null; }; } catch (e) { window.__openErr = String(e); }

  xlConnectFill("depop");
  // The copy completes BEFORE the shop opens (focus order — measured live
  // 2026-10-01: opening first switched focus and Chrome refused the write).
  await new Promise((r) => setTimeout(r, 2500));

  let clip = null, clipErr = null, cj = null;
  try { clip = await navigator.clipboard.readText(); cj = JSON.parse(clip); }
  catch (e) { clipErr = String(e).slice(0, 140); }
  const cs = cj && cj.shops && cj.shops.depop;

  return {
    installed: xlExtInstalled(),
    btnLabel: btn ? btn.textContent.replace(/\s+/g, " ").trim() : null,
    bookmark: !!document.getElementById("xl-bm-cg"),
    tag: (tagHost.textContent || "").trim(),
    payloadOk: !!(j && j.fashionistas === 1 && shop && shop.title && shop.description && shop.price !== undefined),
    payloadTitle: shop ? shop.title : null,
    photos: (j && j.photos) || [],
    openedUrl: window.__opened,
    copiedLen: clip ? clip.length : 0,
    clipErr,
    clipJson: cj ? {
      fashionistas: cj.fashionistas, title: cs && cs.title, price: cs && cs.price,
      descLen: cs ? (cs.description || "").length : 0,
      photoCount: (cj.photos || []).length,
      photoPrefix: (cj.photos || [])[0] ? String((cj.photos || [])[0].data).slice(0, 22) : null,
    } : null,
    msg: ((document.getElementById("xl-cg-fill-msg") || {}).textContent || "").trim(),
    openErr: window.__openErr || null,
  };
});
ok(noHelper.installed === false, "helper now reads as OFF (dataset cleared)");
ok(noHelper.btnLabel === "Copy my listing & open Depop", "action changes honestly for this state: " + JSON.stringify(noHelper.btnLabel));
ok(noHelper.bookmark === true, "the no-install bookmark is offered right there in the panel");
ok(noHelper.payloadOk === true, "payload carries title/description/price: " + JSON.stringify(noHelper.payloadTitle));
ok(Array.isArray(noHelper.photos) && noHelper.photos.length >= 1, "the PHOTO rides along in the no-install payload: " + noHelper.photos.length);
ok(String(noHelper.openedUrl || "").includes("depop.com/products/create"), "one tap opens the shop: " + noHelper.openedUrl);
ok(noHelper.copiedLen > 100000, "the REAL clipboard now holds the listing: " + noHelper.copiedLen + " chars" +
  (noHelper.clipErr ? " (clipErr: " + noHelper.clipErr + ")" : ""));
ok(!!noHelper.clipJson && noHelper.clipJson.fashionistas === 1 && !!noHelper.clipJson.title && noHelper.clipJson.price !== undefined,
  "clipboard payload parses and carries title/price: " + JSON.stringify(noHelper.clipJson && {
    title: noHelper.clipJson.title, price: noHelper.clipJson.price, descLen: noHelper.clipJson.descLen }));
ok(!!noHelper.clipJson && noHelper.clipJson.photoCount >= 1 &&
  String(noHelper.clipJson.photoPrefix).startsWith("data:image/jpeg"),
  "the PHOTO bytes are on the clipboard for the bookmark: " + JSON.stringify(noHelper.clipJson && {
    n: noHelper.clipJson.photoCount, prefix: noHelper.clipJson.photoPrefix }));
ok(/^Copied — photo included/.test(noHelper.msg), "status line reports the real outcome: " + JSON.stringify(noHelper.msg));
ok(noHelper.tag !== "Auto-fill ready", "status tag stops claiming auto-fill once the helper is off: " + JSON.stringify(noHelper.tag));
ok(!noHelper.openErr && !noHelper.clipErr, "popup stub held, clipboard read clean: " + JSON.stringify({ openErr: noHelper.openErr, clipErr: noHelper.clipErr }));

const fatal = errs.filter((e) => !/RUM|beacon|net::ERR/.test(e));
ok(fatal.length === 0, "no uncaught JS errors doing any of the above: " + JSON.stringify(fatal.slice(0, 3)));

console.log(`\n${pass} passed, ${fail} failed`);
await ctx.close();
process.exit(fail ? 1 : 0);
