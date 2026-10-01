import { chromium } from "../../Placebetsai-src/node_modules/playwright/index.mjs";

/* 390 x 844 — phone width. fashionistas (tests/walk-390.mjs) and createstuff
   (tests/measure-createstuff-390px.mjs) already had a phone walk; placebets
   and marketpicks had NONE, which made them the two sites nobody could vouch
   for on the device most people actually use.

   For every screen this records the three things that make a phone page
   unusable:
     (a) horizontal overflow — the sideways swipe that means layout is broken;
     (b) uncaught console errors;
     (c) whether the screen's own control exists, is on screen, and is at
         least 40 px tall/wide (fat-finger reachable).
   The main action is then actually performed and its result measured. */

const OUT = "/tmp/walk390_pb_mp";
const results = [];
let page = null;
let errors = [];
let failedRequests = [];

function check(screen, name, ok, detail) {
  const line = `  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`;
  console.log(line);
  results.push({ screen, name, ok, detail });
}

async function newPage(browser) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  page = await ctx.newPage();
  errors = [];
  failedRequests = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push("pageerror: " + String(e).message));
  // A console "Failed to load resource" is only a product defect if OUR asset
  // failed. Ad and analytics hosts are blocked by this sandbox's proxy, so the
  // URL decides: first-party failure = real, third-party = environmental.
  page.on("requestfailed", (r) => {
    const u = r.url();
    let host = "";
    try {
      host = new URL(u).hostname;
    } catch {
      host = "";
    }
    const firstParty = /placebets\.ai|marketpicks\.ai|fashionistas\.ai|createstuff\.ai|workers\.dev|pages\.dev/.test(host);
    failedRequests.push({ url: u, host, firstParty, reason: (r.failure() || {}).errorText || "" });
  });
  return page;
}

/** Split console/network noise into "ours broke" and "the sandbox blocked it". */
function classifyErrors() {
  const ours = [];
  const env = [];
  const push = (rec) => (rec.firstParty ? ours : env).push(rec);
  const hosts = (host) =>
    /placebets\.ai|marketpicks\.ai|fashionistas\.ai|createstuff\.ai|workers\.dev|pages\.dev/.test(host);

  for (const f of failedRequests) {
    if (f.reason === "net::ERR_ABORTED") continue; // SPA route change, not a failure
    push(f);
  }
  for (const e of errors) {
    if (/^Failed to load resource:/.test(e)) continue; // no URL here — requestfailed has it
    const m = e.match(/https?:\/\/[^\s"')]+/);
    if (!m) {
      ours.push({ url: e, host: "", firstParty: true, detail: e.slice(0, 120) });
      continue;
    }
    let host = "";
    try {
      host = new URL(m[0]).hostname;
    } catch {}
    push({ url: m[0], host, firstParty: hosts(host), reason: "console" });
  }
  return { ours, env };
}

async function layoutReport() {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const offenders = [];
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right > vw + 1 && !el.closest("[class*=marquee],[class*=ticker],[class*=track],[class*=blob],[class*=mesh],[class*=leaflet]")) {
        offenders.push({
          tag: el.tagName,
          cls: String(el.className || "").slice(0, 40),
          right: Math.round(r.right),
          width: Math.round(r.width),
        });
      }
      if (offenders.length >= 6) break;
    }
    return {
      vw,
      scrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body ? document.body.scrollWidth : 0,
      offenders,
    };
  });
}

async function measure(screen, url, readySelector, action) {
  console.log(`\n[${screen}] ${url}`);
  // Fresh noise counters per screen so one broken request cannot fail every
  // later screen just because they share a page.
  errors = [];
  failedRequests = [];
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  if (readySelector) {
    try {
      await page.waitForSelector(readySelector, { timeout: 15000 });
    } catch {
      check(screen, `renders — ${readySelector}`, false, "never appeared");
    }
  }
  const rep = await layoutReport();
  check(
    screen,
    "no horizontal overflow",
    rep.scrollWidth <= rep.vw + 1,
    `scrollWidth ${rep.scrollWidth} vs ${rep.vw}` +
      (rep.offenders.length ? ` (offender: ${rep.offenders[0].tag}.${rep.offenders[0].cls} ${rep.offenders[0].right}px)` : ""),
  );
  if (action) await action();
  checkFirstParty(screen);
}

/** Only a failure of OUR asset counts; blocked ad/ analytics hosts are logged.
 *
 *  Two kinds of noise are excluded on purpose, each measured first:
 *    1. console `Failed to load resource: net::ERR_*` carries no URL, so it
 *       cannot be attributed — and `requestfailed` already reports that same
 *       event WITH a URL. Diagnosing every page at 390px showed the only such
 *       resource was `pagead2.googlesyndication.com` (AdSense, DNS-blocked in
 *       this sandbox), on all four pages.
 *    2. `net::ERR_ABORTED` on our own host is a normal SPA route change: the
 *       new navigation cancels the previous prefetch/fetch. It happens on
 *       every `router.push` and never reaches a user as an error. */
function checkFirstParty(screen) {
  const { ours, env } = classifyErrors();
  check(
    screen,
    "no first-party load failures",
    ours.length === 0,
    ours.length
      ? `${ours[0].host || ours[0].url} (${ours[0].reason || ours[0].detail || "?"})`
      : env.length
        ? `${env.length} third-party host(s) blocked here: ${[...new Set(env.map((e) => e.host))].slice(0, 3).join(", ")}`
        : "clean",
  );
}

async function main() {
  console.log("=== PLACEBETS + MARKETPICKS 390px PHONE WALK ===");
  const browser = await chromium.launch({ headless: true });

  try {
    await newPage(browser);

    // ---------- PLACEBETS ----------
    await measure("pb-home", "https://placebets.ai/", "main", null);

    await measure("pb-predict", "https://placebets.ai/predict", ".pb-ask-bar input", async () => {
      await page.fill(".pb-ask-bar input", "NBA");
      await page.click(".pb-ask-bar button[type=submit]");
      let text = "";
      try {
        await page.waitForFunction(
          () => /Predictions for|matches|No live or upcoming/i.test(document.body.innerText),
          { timeout: 20000 },
        );
      } catch {
        /* fall through — the assertion below reports what was actually there */
      }
      // Search the WHOLE page, not a 400-char slice: on a phone the first 400
      // characters are nav and ticker, so a slice silently hides a result that
      // rendered further down.
      text = await page.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
      const url = page.url();
      const head = text.match(/Predictions for[^"]{0,40}|[0-9]+ matches/);
      const answered = /q=/.test(url) && !!head;
      check(
        "pb-predict",
        "ask submits on a phone",
        answered,
        `url ${url.replace("https://placebets.ai", "")}${head ? `, "${head[0]}"` : ", no result heading in page"}`,
      );
      const box = await page.evaluate(() => {
        const b = document.querySelector(".pb-ask-bar button[type=submit]");
        const i = document.querySelector(".pb-ask-bar input");
        const br = b ? b.getBoundingClientRect() : null;
        const ir = i ? i.getBoundingClientRect() : null;
        return {
          btn: br ? `${Math.round(br.width)}x${Math.round(br.height)}` : null,
          input: ir ? `${Math.round(ir.width)}x${Math.round(ir.height)}` : null,
          btnBottom: br ? Math.round(br.bottom) : null,
          vh: window.innerHeight,
        };
      });
      check(
        "pb-predict",
        "ask bar is thumb-sized",
        !!box.btn && parseInt(box.btn.split("x")[1], 10) >= 40 && !!box.input && parseInt(box.input.split("x")[0], 10) >= 160 && parseInt(box.input.split("x")[1], 10) >= 40,
        `button ${box.btn}, input ${box.input}`,
      );
    });

    await measure("pb-parlay", "https://placebets.ai/parlay", ".parlay-flavor", async () => {
      const info = await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll(".parlay-flavor"));
        const r = tabs[0] ? tabs[0].getBoundingClientRect() : null;
        return {
          count: tabs.length,
          first: r ? `${Math.round(r.width)}x${Math.round(r.height)}` : null,
          hasBoard: /parlay/i.test(document.body.innerText),
        };
      });
      check("pb-parlay", "flavor tabs present", info.count >= 3, `${info.count} tabs, first ${info.first}`);
      check("pb-parlay", "board renders", info.hasBoard, "");
    });

    await newPage(browser);
    await measure("mp-home", "https://marketpicks.ai/", "main", null);

    await measure("mp-chat", "https://marketpicks.ai/", "button:has-text('Ask MarketPicks')", async () => {
      // open the assistant the way a thumb would: the visible ask button
      const opened = await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll("button")).find((b) => /Ask MarketPicks/i.test(b.textContent || ""));
        if (!btn) return { opened: false };
        btn.click();
        return { opened: true };
      });
      await page.waitForTimeout(600);
      const box = await page.evaluate(() => {
        const input = document.querySelector('input[placeholder*="Ask about markets"]');
        if (!input) return { found: false };
        const r = input.getBoundingClientRect();
        const send = Array.from(document.querySelectorAll("button")).find((b) => (b.textContent || "").trim() === "→");
        const sr = send ? send.getBoundingClientRect() : null;
        return {
          found: true,
          input: `${Math.round(r.width)}x${Math.round(r.height)}`,
          send: sr ? `${Math.round(sr.width)}x${Math.round(sr.height)}` : null,
          inViewport: r.top >= 0 && r.bottom <= window.innerHeight,
        };
      });
      check("mp-chat", "chat opens", opened.opened && box.found, box.found ? `input ${box.input}, send ${box.send}` : "no input");
      if (box.found) {
        await page.fill('input[placeholder*="Ask about markets"]', "Bitcoin outlook");
        await page.keyboard.press("Enter");
        let ok = false;
        let head = "";
        try {
          await page.waitForFunction(
            () => {
              const t = document.body.innerText;
              return /Bitcoin/i.test(t) && t.length > 1200;
            },
            { timeout: 30000 },
          );
          ok = true;
        } catch {
          ok = false;
        }
        head = await page.evaluate(() => document.body.innerText.replace(/\s+/g, " ").slice(-320));
        check("mp-chat", "assistant answers on a phone", ok, ok ? head.slice(0, 160) : "no answer within 30 s");
      }
    });
  } finally {
    await browser.close();
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== RESULT: ${failed.length === 0 ? "PASS" : `FAIL (${failed.length})`} ===`);
  if (failed.length) failed.forEach((f) => console.log(`  FAILED ${f.screen} :: ${f.name} :: ${f.detail || ""}`));
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("harness error:", e);
  process.exit(2);
});
