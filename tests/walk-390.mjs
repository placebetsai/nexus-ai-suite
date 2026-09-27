import { chromium } from "../../Placebetsai-src/node_modules/playwright/index.mjs";

/* 390 x 844 — iPhone 14 width. The harness browser has no viewport control, so
   narrow-screen behaviour is proved here instead: every screen is opened at
   phone width and checked for (a) horizontal overflow, which is what makes a
   phone user swipe sideways to read a broken page, (b) uncaught console
   errors, and (c) the element that screen exists for. */

const URL = "https://fashionistas.ai/app";
const OUT = "/tmp/walk390";

const screens = [
  { name: "shop",     setup: `go("shop")`,     expect: "#market-grid", waitFor: "#market-grid .gitem" },
  { name: "item",     setup: `(function(){ var g=document.querySelector("#market-grid .gitem"); if(g) g.click(); })()`, expect: "#screen" },
  { name: "home",     setup: `go("home")`,     expect: "#screen" },
  { name: "sell",     setup: `go("sell")`,     expect: "#screen" },
  { name: "closet",   setup: `go("closet")`,   expect: "#screen" },
  { name: "messages", setup: `messagesScreen()`, expect: ".dm-row, .dm-chips, .empty", waitFor: ".dm-row, .dm-chips, .empty" },
  { name: "thread",   setup: `threadScreen(66)`, expect: "#dm-thread", waitFor: "#dm-thread", checkSendReachable: true },
  { name: "more",     setup: `go("more")`,     expect: "#screen" },
  { name: "xl",       setup: `go("xl")`,       expect: "#screen", mustFitDevice: true },
  { name: "map",      setup: `go("map")`,      expect: "#screen" },
];

async function main() {
  console.log("=== FASHIONISTAS 390px FLOW WALK ===");
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  const page = await ctx.newPage();

  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text().slice(0, 200)); });

  const fail = [];
  const check = (label, ok, detail) => {
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? " — " + detail : ""}`);
    if (!ok) fail.push(label + (detail ? ": " + detail : ""));
  };

  await page.goto(URL, { waitUntil: "networkidle" });

  // sign in as the demo seller (same call the "Log in as demo seller" button makes)
  await page.evaluate(async () => {
    const res = await fetch("https://fashionistas-api.fashionistas1979.workers.dev/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "demo", password: "Primetime2026!" }),
    });
    const d = await res.json();
    if (!d.token) throw new Error("login failed");
    afterAuth(d);
  });
  console.log("logged in as demo (id 50) at 390x844");

  const overflow = () =>
    page.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      win: window.innerWidth,
      widest: (() => {
        let w = 0, tag = "";
        document.querySelectorAll("body *").forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.width > w && r.right > window.innerWidth + 1) { w = r.width; tag = el.tagName + "." + (el.className || "").toString().slice(0, 30); }
        });
        return { w: Math.round(w), tag };
      })(),
    }));

  for (const s of screens) {
    const before = errors.length;
    const t0 = Date.now();
    await page.evaluate(`(function(){ try { ${s.setup}; return "ok"; } catch(e){ return "ERR "+e.message; } })()`);
    if (s.waitFor) {
      try { await page.waitForSelector(s.waitFor, { timeout: 8000 }); } catch (e) { /* reported below */ }
    } else {
      await page.waitForTimeout(1200);
    }
    const ms = Date.now() - t0;
    const has = await page.evaluate(`(function(){ return !!document.querySelector(${JSON.stringify(s.expect)}); })()`);
    const o = await overflow();
    const vw = await page.evaluate(`window.innerWidth`);
    const newErrs = errors.slice(before);
    console.log(`\n[${s.name}]`);
    check("renders", has, has ? `${ms}ms` : `missing ${s.expect} after ${ms}ms`);
    check("no horizontal overflow", o.doc <= o.win + 1, `scrollWidth ${o.doc} vs ${o.win}${o.widest.tag ? " (widest offender: " + o.widest.tag + " " + o.widest.w + "px)" : ""}`);
    if (s.mustFitDevice) check("viewport stays at device width", vw <= 391, `innerWidth=${vw} (a wide child stretched the layout)`);
    if (s.checkSendReachable) {
      const reach = await page.evaluate(`JSON.stringify((function(){
        var send = document.querySelector("button[onclick='dmSend()']");
        if (!send) return { ok:false, detail:"Send button missing" };
        send.scrollIntoView({block:"center"});
        var b = send.getBoundingClientRect();
        var hit = document.elementFromPoint(b.x + b.width/2, b.y + b.height/2);
        var fab = document.getElementById("hc-fab");
        var fb = fab ? fab.getBoundingClientRect() : null;
        var overlapsFab = fb ? !(b.right < fb.left || b.left > fb.right || b.bottom < fb.top || b.top > fb.bottom) : false;
        return {
          ok: !!(hit && (hit === send || send.contains(hit))),
          detail: (hit ? (hit.id ? "#" + hit.id : hit.tagName + "." + String(hit.className || "")) : "null") + (overlapsFab ? " (Send overlaps #hc-fab)" : "")
        };
      })())`);
      const R = JSON.parse(reach);
      check("Send is tappable (floating tour button not covering it)", R.ok, R.ok ? "" : `tap would hit ${R.detail}`);
    }
    check("no console errors", newErrs.length === 0, newErrs.slice(0, 2).join(" | "));
    await page.screenshot({ path: `${OUT}-${s.name}.png` });
  }

  console.log(`\n=== RESULT: ${fail.length === 0 ? "PASS" : "FAIL"} ===`);
  if (fail.length) { console.log("failures:"); fail.forEach((f) => console.log(" - " + f)); }
  if (errors.length) { console.log("all console errors:"); errors.slice(0, 12).forEach((e) => console.log(" - " + e)); }
  await browser.close();
  process.exit(fail.length === 0 ? 0 : 1);
}

main().catch((e) => { console.error("WALK CRASHED:", e); process.exit(2); });
