// End-to-end: real Chrome + the unpacked extension + the local app build + the
// live Fashionistas API. Shop sell pages are mocks (tests/crosslister-mocks.mjs)
// because the real ones need a logged-in seller account.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { MOCKS } from "./crosslister-mocks.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXT = path.join(ROOT, "extensions/crosslister");
const APP = path.join(ROOT, "apps/fashionistas");
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "xl-"));
const ctx = await chromium.launchPersistentContext(profile, {
  channel: "chromium", headless: true, viewport: { width: 1280, height: 900 },
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
});
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("PASS", m); } else { fail++; console.log("FAIL", m); } };

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

// Content scripts are only registered once the extension's worker is up.
if (!ctx.serviceWorkers().length) await ctx.waitForEvent("serviceworker", { timeout: 15000 });
const page = await ctx.newPage();
const errs = []; page.on("pageerror", (e) => errs.push(e.message));
await page.goto("https://fashionistas.ai/", { waitUntil: "networkidle" });
ok(await page.evaluate(() => !!document.documentElement.dataset.fashCrosslister), "app sees the extension installed");
await page.getByRole("button", { name: "Log in as demo seller" }).click();
await page.waitForTimeout(2500);
await page.evaluate(() => window.go("xl")); await page.waitForTimeout(2500);
await page.locator("#screen .xl-item").filter({ hasText: "Pre-Loved" }).first().click(); await page.waitForTimeout(2000);
for (const n of ["DEPOP", "EBAY", "POSHMARK", "MERCARI", "VINTED", "GRAILED"]) {
  await page.locator("#xl-pick label").filter({ hasText: new RegExp("^\\s*" + n, "i") }).first().locator("input").check().catch(() => {});
}
const picked = await page.evaluate(() => [...document.querySelectorAll("#xl-pick input:checked")].map((c) => c.value));
ok(picked.length === 6, "6 shops ticked: " + picked.join(","));
await page.getByText("Get ready to post").first().click(); await page.waitForTimeout(1500);
const fillBtn = page.getByRole("button", { name: /Fill it for me on 6 shops/ });
ok(await fillBtn.count() === 1, "sheet shows 'Fill it for me on 6 shops'");

if (process.env.XL_SHOTS) await page.screenshot({ path: process.env.XL_SHOTS + "/xl-sheet.png" });
const opened = [];
ctx.on("page", (p) => { opened.push(p); if (process.env.XL_DEBUG) p.on("console", (m) => console.log("CONSOLE", m.type(), m.text().slice(0, 200))); });
await fillBtn.click();
await page.waitForFunction(() => /Opened in new tabs/.test(document.getElementById("xl-fill-msg")?.textContent || ""), null, { timeout: 30000 });
ok(true, "app got the extension's ack");
const deadline = Date.now() + 20000;
while (opened.length < 6 && Date.now() < deadline) await page.waitForTimeout(300);
ok(opened.length === 6, "6 shop tabs opened (" + opened.length + ")");

const byHost = {};
// Tabs opened by the extension itself bypass Playwright's routing, so the
// first load hits the real shop. Re-open each one through Playwright (the
// queued job is still waiting in the extension) so it gets the mock form.
const SELL = Object.keys(MOCKS).filter((u) => !u.includes("rte-frame"));
for (const p of opened) {
  const host = new URL(p.url()).hostname.replace(/^www\./, "");
  const u = SELL.find((m) => new URL(m).hostname.replace(/^www\./, "") === host);
  if (!u) { console.log("no mock for", p.url()); continue; }
  await p.goto(u, { waitUntil: "load" }).catch((e) => console.log("goto", u, e.message));
  byHost[new URL(u).hostname] = p;
}
await page.waitForTimeout(5000); // let the filler run on the reloaded forms
await page.waitForTimeout(6000); // the filler waits for SPA forms
if (process.env.XL_DEBUG) for (const [h, p] of Object.entries(byHost)) console.log("DBG", h, p.url(), JSON.stringify(await p.evaluate(() => [document.title, document.body && document.body.innerText.slice(0, 80), document.querySelectorAll("input,textarea").length])));

async function vals(p) {
  return p.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const all = [...document.querySelectorAll("input:not([type=file]):not([type=search]), textarea")].map((e) => [[e.id, e.name, e.placeholder, e.dataset.testid, e.getAttribute("data-vv-name")].filter(Boolean).join("|"), e.value]);
    const file = [...document.querySelectorAll("input[type=file]")].map((i) => i.files.length);
    return { all, file, submitted: !!window.__submitted, state: window.__state || null };
  });
}
const get = (v, key) => (v.all.find(([k]) => String(k).toLowerCase().includes(key.toLowerCase())) || [])[1] || "";

// Depop
let v = await vals(byHost["www.depop.com"]);
ok(get(v, "description").length > 20, "Depop description filled");
ok(/^\d+(\.\d+)?$/.test(get(v, "price")), "Depop price filled: " + get(v, "price"));
ok(v.file[0] >= 1, "Depop photo attached: " + v.file[0]);
// Poshmark
v = await vals(byHost["poshmark.com"]);
ok(get(v, "What are you selling").length > 5, "Poshmark title filled");
ok(get(v, "Original Price") === "", "Poshmark Original Price left empty");
ok(/^\d/.test(get(v, "Listing Price")), "Poshmark Listing Price filled: " + get(v, "Listing Price"));
ok(get(v, "Search Poshmark") === "", "Poshmark search box untouched");
ok(v.file[0] >= 1, "Poshmark photo attached");
// Mercari (React) — value must survive re-renders
await byHost["www.mercari.com"].waitForTimeout(1200);
v = await vals(byHost["www.mercari.com"]);
ok(v.state && v.state.t.length > 5 && v.state.p.length > 0 && v.state.d.length > 10, "Mercari React state holds title/price/description: " + JSON.stringify(v.state && { t: v.state.t.slice(0, 30), p: v.state.p }));
ok(v.file[0] >= 1, "Mercari photo attached");
// eBay — title + price + description inside iframe
v = await vals(byHost["www.ebay.com"]);
ok(get(v, "title").length > 5 && get(v, "title").length <= 80, "eBay title filled (<=80): " + get(v, "title"));
ok(/^\d/.test(get(v, "price")), "eBay price filled");
const rte = byHost["www.ebay.com"].frames().find((f) => f.url().includes("rte-frame"));
const rteText = rte ? await rte.evaluate(() => document.body.textContent) : "";
ok(rteText.length > 20, "eBay description filled inside the editor frame");
// Vinted
v = await vals(byHost["www.vinted.com"]);
ok(get(v, "title").length > 5 && get(v, "description").length > 10 && /^\d/.test(get(v, "price")), "Vinted title/description/price filled");
// Grailed
v = await vals(byHost["www.grailed.com"]);
ok(get(v, "title").length > 5 && get(v, "description").length > 10 && /^\d/.test(get(v, "price")), "Grailed item name/description/price filled");

// Never posts
for (const [h, p] of Object.entries(byHost)) ok(!(await p.evaluate(() => !!window.__submitted)), h + " was NOT submitted");
// Panel shown
const panel = await byHost["poshmark.com"].evaluate(() => { const h = [...document.documentElement.children].find((c) => c.shadowRoot); return h ? h.shadowRoot.textContent : ""; });
ok(/Fashionistas filled this in/.test(panel) && /Filled \d+ field/.test(panel), "Poshmark shows the panel: " + (panel.match(/Filled[^.]*\./) || [""])[0]);
if (process.env.XL_SHOTS) { await byHost["poshmark.com"].bringToFront(); await byHost["poshmark.com"].screenshot({ path: process.env.XL_SHOTS + "/xl-poshmark.png" }); }
ok(errs.length === 0, "no app page errors " + JSON.stringify(errs));

console.log(`\n${pass} passed, ${fail} failed`);
await ctx.close();
process.exit(fail ? 1 : 0);
