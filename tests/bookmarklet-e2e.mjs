// The no-install path: "Copy for Fashionistas Fill" in the app, then the
// Fashionistas Fill bookmark on each shop's (mock) sell page. No extension loaded.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MOCKS } from "./crosslister-mocks.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP = path.join(ROOT, "apps/fashionistas");
const BM = decodeURIComponent(fs.readFileSync(path.join(APP, "fashionistas-fill-bookmarklet.txt"), "utf8").slice("javascript:".length));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("PASS", m); } else { fail++; console.log("FAIL", m); } };

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: "https://fashionistas.ai" });
for (const o of ["https://www.depop.com", "https://poshmark.com", "https://www.mercari.com", "https://www.ebay.com", "https://www.vinted.com", "https://www.grailed.com"])
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: o });
await ctx.route(/^https:\/\/fashionistas\.ai\//, async (route) => {
  const u = new URL(route.request().url());
  let f = path.join(APP, decodeURIComponent(u.pathname));
  if (u.pathname === "/") f = path.join(APP, "index.html");
  if (fs.existsSync(f) && fs.statSync(f).isFile()) return route.fulfill({ path: f });
  return route.continue();
});
for (const [url, html] of Object.entries(MOCKS)) await ctx.route(url, (r) => r.fulfill({ contentType: "text/html", body: html }));

const app = await ctx.newPage();
const errs = []; app.on("pageerror", (e) => errs.push(e.message));
await app.goto("https://fashionistas.ai/", { waitUntil: "networkidle" });
await app.getByRole("button", { name: "Log in as demo seller" }).click(); await app.waitForTimeout(2500);
await app.evaluate(() => window.go("xl")); await app.waitForTimeout(2500);
await app.locator("#screen .xl-item").filter({ hasText: "Pre-Loved" }).first().click(); await app.waitForTimeout(2000);
for (const n of ["DEPOP", "EBAY", "POSHMARK", "MERCARI", "VINTED", "GRAILED"])
  await app.locator("#xl-pick label").filter({ hasText: new RegExp("^\\s*" + n, "i") }).first().locator("input").check();
await app.getByText("Get ready to post").first().click(); await app.waitForTimeout(1500);
ok(await app.locator("#xl-bm").count() === 1, "sheet offers the Fashionistas Fill bookmark");
ok(/^javascript:/.test(await app.locator("#xl-bm").getAttribute("href")), "bookmark link carries the javascript: code");
await app.getByRole("button", { name: "Copy for Fashionistas Fill" }).click();
await app.waitForFunction(() => /Copied/.test(document.getElementById("xl-bm-msg")?.textContent || ""), null, { timeout: 20000 });
const clip = await app.evaluate(() => navigator.clipboard.readText());
const payload = JSON.parse(clip);
ok(payload.fashionistas === 1 && Object.keys(payload.shops).length === 6, "clipboard holds the listing for 6 shops");
ok(payload.photos.length === 1 && payload.photos[0].data.startsWith("data:image/jpeg;base64,"), "photo travels inside the clipboard (" + Math.round(payload.photos[0].data.length / 1024) + " KB)");

const vals = (p) => p.evaluate(() => [...document.querySelectorAll("input:not([type=file]):not([type=search]),textarea")].map((e) => [[e.id, e.name, e.placeholder, e.dataset.testid].filter(Boolean).join("|").toLowerCase(), e.value]));
const get = (v, k) => (v.find(([key]) => key.includes(k)) || [])[1] || "";
const files = (p) => p.evaluate(() => Math.max(0, ...[...document.querySelectorAll("input[type=file]")].map((i) => i.files.length)));
const panel = (p) => p.evaluate(() => document.getElementById("fash-fill-host")?.shadowRoot.textContent || "");

for (const [name, url, checks] of [
  ["Depop", "https://www.depop.com/products/create/", (v) => get(v, "description").length > 20 && /^\d/.test(get(v, "price"))],
  ["Poshmark", "https://poshmark.com/create-listing", (v) => get(v, "what are you selling").length > 5 && get(v, "original price") === "" && /^\d/.test(get(v, "listing price"))],
  ["Vinted", "https://www.vinted.com/items/new", (v) => get(v, "title").length > 5 && /^\d/.test(get(v, "price"))],
  ["Grailed", "https://www.grailed.com/sell/new", (v) => get(v, "title").length > 5 && /^\d/.test(get(v, "price"))],
]) {
  const p = await ctx.newPage(); await p.goto(url); await p.waitForTimeout(500);
  await p.evaluate(BM); await p.waitForTimeout(1200);
  const v = await vals(p);
  ok(checks(v), name + " filled by the bookmark");
  ok(await files(p) >= 1, name + " photo attached by the bookmark");
  ok(/Filled \d+ field/.test(await panel(p)), name + " panel: " + ((await panel(p)).match(/Filled[^.]*\./) || [""])[0]);
  ok(!(await p.evaluate(() => !!window.__submitted)), name + " NOT submitted");
}
// Mercari (React) — values must survive re-renders
{
  const p = await ctx.newPage(); await p.goto("https://www.mercari.com/sell/"); await p.waitForTimeout(1500);
  await p.evaluate(BM); await p.waitForTimeout(1500);
  const st = await p.evaluate(() => window.__state);
  ok(st && st.t.length > 5 && /^\d/.test(st.p), "Mercari React state filled by the bookmark");
}
// eBay full form with the iframe editor (reached after step 1)
{
  const p = await ctx.newPage(); await p.goto("https://www.ebay.com/sl/prelist/suggest"); await p.waitForTimeout(500);
  await p.evaluate(BM); await p.waitForTimeout(800);
  ok((await p.evaluate(() => document.getElementById("kw").value)).length > 5, "eBay step 1 filled by the bookmark");
  await p.getByRole("button", { name: "Continue" }).click(); await p.waitForTimeout(1500);
  await p.evaluate(BM); await p.waitForTimeout(1200);
  const v = await vals(p);
  const rte = await p.frames().find((f) => f.url().includes("rte-frame"))?.evaluate(() => document.body.textContent) || "";
  ok(get(v, "title").length > 5 && /^\d/.test(get(v, "price")) && rte.length > 20, "eBay full form + iframe description filled by the bookmark");
}
// Clipboard blocked: the paste box takes over.
{
  const c2 = await b.newContext();
  for (const [url, html] of Object.entries(MOCKS)) await c2.route(url, (r) => r.fulfill({ contentType: "text/html", body: html }));
  const p = await c2.newPage(); await p.goto("https://www.vinted.com/items/new");
  await p.evaluate(BM); await p.waitForTimeout(1500);
  ok(/paste/i.test(await p.evaluate(() => document.getElementById("fash-fill-host").shadowRoot.getElementById("sub").textContent)), "without clipboard permission it asks to paste");
  await p.evaluate((txt) => { const ta = document.getElementById("fash-fill-host").shadowRoot.getElementById("paste"); const dt = new DataTransfer(); dt.setData("text/plain", txt); ta.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true })); }, clip);
  await p.waitForTimeout(800);
  const v = await vals(p);
  ok(get(v, "title").length > 5 && /^\d/.test(get(v, "price")), "pasting into the box fills the form");
  await c2.close();
}
ok(errs.length === 0, "no app errors " + JSON.stringify(errs));
console.log(`\n${pass} passed, ${fail} failed`);
await b.close();
process.exit(fail ? 1 : 0);
