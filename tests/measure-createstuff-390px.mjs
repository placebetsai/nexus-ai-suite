import { chromium } from "../../Placebetsai-src/node_modules/playwright/index.mjs";

async function measure() {
  console.log("=== CREATESTUFF 390PX VIEWPORT MEASUREMENT ===");
  const browser = await chromium.launch({ headless: true });

  try {
    // Test 1: Marketing site at 390px
    console.log("\n--- 1. Testing createstuff.ai (marketing) at 390px ---");
    const ctxM = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true
    });
    const pageM = await ctxM.newPage();
    await pageM.goto("https://createstuff.ai", { waitUntil: "networkidle" });

    const mMetrics = await pageM.evaluate(() => {
      const scrollW = document.documentElement.scrollWidth;
      const innerW = window.innerWidth;
      const bodyW = document.body.scrollWidth;
      // find any elements that overflow 390px
      const overflowers = [];
      document.querySelectorAll("*").forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.right > window.innerWidth + 1) {
          overflowers.push({
            tag: el.tagName,
            cls: el.className,
            id: el.id,
            right: Math.round(rect.right),
            width: Math.round(rect.width)
          });
        }
      });
      return { scrollW, innerW, bodyW, overflowersCount: overflowers.length, overflowers: overflowers.slice(0, 5) };
    });

    console.log("Marketing scrollWidth:", mMetrics.scrollW, "vs innerWidth:", mMetrics.innerW);
    console.log("Marketing horizontal overflow:", mMetrics.scrollW > mMetrics.innerW ? "YES (FAIL)" : "NO (PASS)");
    console.log("Overflowing elements count:", mMetrics.overflowersCount);
    if (mMetrics.overflowersCount > 0) {
      console.log("Sample overflowing elements:", JSON.stringify(mMetrics.overflowers));
    }

    // Test 2: App site at 390px (unauthed & authed)
    console.log("\n--- 2. Testing app.createstuff.ai at 390px ---");
    const ctxA = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true
    });
    const pageA = await ctxA.newPage();

    // A6 test: navigate without hash
    await pageA.goto("https://app.createstuff.ai", { waitUntil: "networkidle" });
    const hashAtStart = await pageA.evaluate(() => location.hash);
    console.log("A6 check: initial URL hash on 390px viewport:", hashAtStart);

    // Unauthed overflow check
    const unauthedScrollW = await pageA.evaluate(() => document.documentElement.scrollWidth);
    console.log("Unauthed app scrollWidth:", unauthedScrollW, "vs 390px");

    // Login as loop@createstuff.ai / QApower2026!
    console.log("Logging into app.createstuff.ai...");
    await pageA.evaluate(async () => {
      const res = await fetch("https://createstuff-api.fashionistas1979.workers.dev/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "loop@createstuff.ai", password: "QApower2026!" })
      });
      const d = await res.json();
      if (d.token) {
        localStorage.setItem("cs_token", d.token);
        localStorage.setItem("cs_user", JSON.stringify(d.user));
        localStorage.setItem("cs_auth", "true");
      }
    });

    // Reload with authed session to check router landing (A6)
    await pageA.goto("https://app.createstuff.ai", { waitUntil: "networkidle" });
    await pageA.waitForTimeout(1000);

    const authedHash = await pageA.evaluate(() => location.hash);
    console.log("A6 check: authed landing hash on 390px viewport:", authedHash);
    const a6Pass = authedHash === "#builder";
    console.log("A6 verdict (lands on #builder):", a6Pass ? "PASS" : "FAIL");

    // Check A4: Builder horizontal overflow
    await pageA.evaluate(() => {
      if (window.navigate) window.navigate("builder");
      else location.hash = "#builder";
    });
    await pageA.waitForTimeout(1000);

    const builderMetrics = await pageA.evaluate(() => {
      const scrollW = document.documentElement.scrollWidth;
      const innerW = window.innerWidth;
      const builderEl = document.querySelector(".builder-layout") || document.querySelector("#builder");
      const builderW = builderEl ? builderEl.getBoundingClientRect().width : null;

      // chat input metrics (A5)
      const chatInput = document.querySelector("#chat-input");
      const sendBtn = document.querySelector("#send-btn");
      const voiceBtn = document.querySelector("#voice-btn");

      const inputRect = chatInput ? chatInput.getBoundingClientRect() : null;
      const sendRect = sendBtn ? sendBtn.getBoundingClientRect() : null;
      const voiceRect = voiceBtn ? voiceBtn.getBoundingClientRect() : null;

      // check overflowing elements in builder view
      const overflowers = [];
      document.querySelectorAll("*").forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.right > window.innerWidth + 1) {
          overflowers.push({
            tag: el.tagName,
            cls: el.className,
            id: el.id,
            right: Math.round(rect.right),
            width: Math.round(rect.width)
          });
        }
      });

      return {
        scrollW,
        innerW,
        builderW,
        inputRect: inputRect ? { width: Math.round(inputRect.width), height: Math.round(inputRect.height) } : null,
        sendRect: sendRect ? { width: Math.round(sendRect.width), height: Math.round(sendRect.height) } : null,
        voiceRect: voiceRect ? { width: Math.round(voiceRect.width), height: Math.round(voiceRect.height) } : null,
        overflowersCount: overflowers.length,
        overflowers: overflowers.slice(0, 5)
      };
    });

    console.log("\n--- DEFECT A4: Builder Layout Overflow ---");
    console.log("Builder scrollWidth:", builderMetrics.scrollW, "vs innerWidth:", builderMetrics.innerW);
    console.log("Builder layout width:", builderMetrics.builderW, "px");
    const a4Pass = builderMetrics.scrollW <= 390;
    console.log("A4 verdict (scrollWidth <= 390):", a4Pass ? "PASS" : "FAIL (overflow detected)");
    if (builderMetrics.overflowersCount > 0) {
      console.log("A4 overflowing elements:", JSON.stringify(builderMetrics.overflowers));
    }

    console.log("\n--- DEFECT A5: Chat Input & Controls ---");
    console.log("Chat input bounding box:", builderMetrics.inputRect);
    console.log("Send button bounding box:", builderMetrics.sendRect);
    console.log("Voice button bounding box:", builderMetrics.voiceRect);

    const a5InputWide = builderMetrics.inputRect && builderMetrics.inputRect.width >= 250;
    const a5SendTouch = builderMetrics.sendRect && builderMetrics.sendRect.width >= 40 && builderMetrics.sendRect.height >= 40;
    console.log("A5 chat input is wide (>= 250px, was 245px):", a5InputWide ? `PASS (${builderMetrics.inputRect.width}px)` : "FAIL");
    console.log("A5 send button is touch-friendly (>= 40x40):", a5SendTouch ? `PASS (${builderMetrics.sendRect.width}x${builderMetrics.sendRect.height}px)` : "FAIL");

    console.log("\n=== 390PX MEASUREMENT SUMMARY ===");
    console.log("A4 (horizontal fit <= 390px):", a4Pass ? "PASS" : "FAIL");
    console.log("A5 (wide chat input & touch send btn):", (a5InputWide && a5SendTouch) ? "PASS" : "FAIL");
    console.log("A6 (narrow viewport lands on #builder):", a6Pass ? "PASS" : "FAIL");

  } finally {
    await browser.close();
  }
}

measure().catch(err => {
  console.error("FAIL:", err);
  process.exit(1);
});
