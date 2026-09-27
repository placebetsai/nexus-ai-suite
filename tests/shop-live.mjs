// Live shop test for the Crosslister: a real browser, the seller's real
// logged-in shop accounts, the real sell forms. It never presses Post.
//
//   node tests/shop-live.mjs login [shop ...]   open a browser, you log in, close nothing
//   node tests/shop-live.mjs status             which shops this browser is logged into
//   node tests/shop-live.mjs fill [shop ...]    fill a test listing into each real sell form
//   node tests/shop-live.mjs stop               close the browser (sessions stay saved)
//
// Sessions live only in PROFILE on this laptop (chmod 700). Nothing is uploaded:
// no cookies, no passwords, no tokens leave this machine.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXT = path.join(ROOT, "extensions/crosslister");
const PHOTO = path.join(ROOT, "apps/fashionistas/sample-jacket.jpg");
const OUT = path.join(ROOT, "tests/out/shop-live");
const PROFILE = path.join(os.homedir(), ".config/fashionistas-shops/profile");
const PORT = 9333;

async function loadPlaywright() {
  try { return await import("playwright"); } catch { /* not installed here */ }
  const alt = path.join(ROOT, "../marketpicks-ai/node_modules/playwright/index.mjs");
  return import(pathToFileURL(alt).href);
}
const { chromium } = await loadPlaywright();

const SHOPS = {
  depop: { name: "Depop", login: "https://www.depop.com/login/", sell: "https://www.depop.com/products/create/" },
  ebay: { name: "eBay", login: "https://signin.ebay.com/", sell: "https://www.ebay.com/sl/prelist/suggest" },
  poshmark: { name: "Poshmark", login: "https://poshmark.com/login", sell: "https://poshmark.com/create-listing" },
  mercari: { name: "Mercari", login: "https://www.mercari.com/login/", sell: "https://www.mercari.com/sell/" },
  vinted: { name: "Vinted", login: "https://www.vinted.com/member/signup/select_type", sell: "https://www.vinted.com/items/new" },
  grailed: { name: "Grailed", login: "https://www.grailed.com/users/sign_up", sell: "https://www.grailed.com/sell/new" },
};

// The listing typed into every form. Obviously a test, in case a seller ever sees it.
const LISTING = {
  title: "TEST Levi's Trucker Denim Jacket Medium Wash",
  description: "TEST LISTING from the Fashionistas Crosslister check. Classic Levi's trucker jacket, medium wash, button front, two chest pockets. Good used condition.",
  price: "38", brand: "Levi's", size: "M", color: "Blue", condition: "Good",
};

const pick = (args) => {
  const bad = args.filter((a) => !SHOPS[a]);
  if (bad.length) { console.error("Unknown shop:", bad.join(", "), "— use", Object.keys(SHOPS).join(" ")); process.exit(2); }
  return args.length ? args : Object.keys(SHOPS);
};

async function running() {
  try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); return r.ok; } catch { return false; }
}

async function launch(urls) {
  fs.mkdirSync(PROFILE, { recursive: true, mode: 0o700 });
  fs.chmodSync(path.dirname(PROFILE), 0o700);
  // Started as a plain browser (no automation flags) so shops see a normal
  // Chrome window while a person logs in; the tests attach over CDP later.
  const child = spawn(chromium.executablePath(), [
    `--user-data-dir=${PROFILE}`, `--remote-debugging-port=${PORT}`, "--remote-debugging-address=127.0.0.1",
    `--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`,
    "--no-first-run", "--no-default-browser-check", ...urls,
  ], { detached: true, stdio: "ignore" });
  child.unref();
  for (let i = 0; i < 40 && !(await running()); i++) await new Promise((r) => setTimeout(r, 250));
  if (!(await running())) throw new Error("browser did not start");
}

async function attach() {
  if (!(await running())) await launch([]);
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`);
  const ctx = browser.contexts()[0];
  return { browser, ctx };
}

async function extWorker(ctx) {
  const find = () => ctx.serviceWorkers().find((w) => w.url().startsWith("chrome-extension://") && w.url().endsWith("/background.js"));
  let w = find();
  if (!w) w = await ctx.waitForEvent("serviceworker", { timeout: 15000 }).catch(() => null);
  return w && w.url().endsWith("/background.js") ? w : find();
}

const isAuth = (u) => /signin\.ebay|\/(login|log-in|signin|sign-in|sign_in|signup|sign-up|sign_up|register|join)\b/i.test(u);

async function loggedIn(ctx, id) {
  const p = await ctx.newPage();
  try {
    await p.goto(SHOPS[id].sell, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(6000);
    const url = p.url();
    const pw = await p.evaluate(() => [...document.querySelectorAll("input[type=password]")].some((i) => i.offsetParent)).catch(() => false);
    const blocked = await p.evaluate(() => /access denied|are you a robot|verify you are human|pardon our interruption|captcha/i.test(document.body?.innerText || "")).catch(() => false);
    return { id, url, loggedIn: !isAuth(url) && !pw && !blocked, blocked };
  } finally { await p.close().catch(() => {}); }
}

async function cmdLogin(ids) {
  if (await running()) {
    const { browser, ctx } = await attach();
    for (const id of ids) await (await ctx.newPage()).goto(SHOPS[id].login).catch(() => {});
    await browser.close(); // detaches; the window stays open
  } else await launch(ids.map((id) => SHOPS[id].login));
  console.log(`A browser window is open with ${ids.map((i) => SHOPS[i].name).join(", ")}.`);
  console.log("Log in to each shop you sell on. Leave the window open when you're done.");
  console.log("Then run:  node tests/shop-live.mjs status");
  console.log(`Sessions are saved only on this laptop in ${PROFILE}`);
}

async function cmdStatus(ids) {
  const { browser, ctx } = await attach();
  const res = [];
  for (const id of ids) { const r = await loggedIn(ctx, id); res.push(r); console.log(`${SHOPS[id].name.padEnd(9)} ${r.loggedIn ? "logged in" : r.blocked ? "BLOCKED by bot check" : "not logged in"}   ${r.url}`); }
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "status.json"), JSON.stringify(res, null, 2));
  await browser.close();
}

async function cmdFill(ids) {
  const { browser, ctx } = await attach();
  const sw = await extWorker(ctx);
  if (!sw) throw new Error("Crosslister extension is not running in this browser");
  fs.mkdirSync(OUT, { recursive: true });
  const photo = "data:image/jpeg;base64," + fs.readFileSync(PHOTO).toString("base64");
  const report = [];
  for (const id of ids) {
    const s = SHOPS[id];
    // Queue exactly what the app would queue, straight into the extension.
    await sw.evaluate(({ id, fields, photo }) => chrome.storage.local.set({ ["job:" + id]: {
      shop: id, listingId: null, createdAt: Date.now(), fields, photos: [{ type: "image/jpeg", data: photo }], filled: false } }),
      { id, fields: { ...LISTING, title: id === "ebay" ? LISTING.title.slice(0, 80) : LISTING.title }, photo });
    const p = await ctx.newPage();
    const writes = [];
    p.on("request", (r) => { if (r.method() !== "GET" && /(listing|product|item|sell|publish|post)/i.test(r.url()) && r.url().includes(id)) writes.push(r.method() + " " + r.url().slice(0, 120)); });
    await p.goto(s.sell, { waitUntil: "domcontentloaded", timeout: 45000 }).catch((e) => console.log(s.name, "load:", e.message));
    let panel = "";
    for (let t = 0; t < 40; t++) {
      await p.waitForTimeout(1000);
      panel = await p.evaluate(() => { const h = [...document.documentElement.children].find((c) => c.shadowRoot); return h ? h.shadowRoot.textContent.replace(/\s+/g, " ") : ""; }).catch(() => "");
      if (/Filled \d+|Couldn't find|Log in to/.test(panel)) break;
    }
    await p.waitForTimeout(2000);
    const fields = await p.evaluate(() => [...document.querySelectorAll("input:not([type=hidden]):not([type=file]):not([type=password]), textarea, [contenteditable=true]")]
      .filter((e) => e.offsetParent && (e.value || e.textContent))
      .map((e) => [[e.getAttribute("aria-label"), e.placeholder, e.name, e.id].filter(Boolean).join("|").slice(0, 50), String(e.value ?? e.textContent).slice(0, 60)])).catch(() => []);
    const photos = await p.evaluate(() => [...document.querySelectorAll("input[type=file]")].reduce((n, i) => n + i.files.length, 0)).catch(() => 0);
    const shot = path.join(OUT, id + ".png");
    await p.screenshot({ path: shot }).catch(() => {});
    const status = /Log in to/.test(panel) ? "NOT LOGGED IN" : (panel.match(/Filled \d+ fields?( and \d+ photos?)?|Couldn't find this shop's form fields/) || ["NO PANEL (form not found)"])[0];
    const row = { shop: s.name, status, url: p.url(), photosAttached: photos, fields, panel: panel.slice(0, 300), writes, screenshot: shot };
    report.push(row);
    console.log(`\n== ${s.name}: ${status}  (photos in file inputs: ${photos})\n   ${row.url}`);
    for (const [k, v] of fields) console.log(`   ${k.padEnd(50)} = ${v}`);
    if (writes.length) console.log("   writes seen (drafts/autosave, nothing was pressed):", writes.slice(0, 5));
    // Clear the queued test listing so the seller's next real visit isn't pre-filled with it.
    await sw.evaluate((id) => chrome.storage.local.remove("job:" + id), id);
  }
  fs.writeFileSync(path.join(OUT, "fill-report.json"), JSON.stringify(report, null, 2));
  console.log(`\nReport: ${path.join(OUT, "fill-report.json")}  Screenshots: ${OUT}/*.png`);
  console.log("Tabs are left open so you can look. Nothing was posted — close them or delete the drafts.");
  await browser.close();
}

async function cmdStop() {
  if (!(await running())) return console.log("Not running.");
  const { browser } = await attach();
  const cdp = await browser.newBrowserCDPSession();
  await cdp.send("Browser.close").catch(() => {});
  console.log("Browser closed. Sessions stay saved.");
}

const [cmd = "status", ...rest] = process.argv.slice(2);
const cmds = { login: cmdLogin, status: cmdStatus, fill: cmdFill, stop: cmdStop };
if (!cmds[cmd]) { console.error("Usage: node tests/shop-live.mjs login|status|fill|stop [shop ...]"); process.exit(2); }
await cmds[cmd](cmd === "stop" ? [] : pick(rest));
process.exit(0);
