import { chromium } from "../../Placebetsai-src/node_modules/playwright/index.mjs";

async function run() {
  console.log("=== FASHIONISTAS TWO-ACCOUNT MESSAGING WALK ===");
  console.log("Starting Chromium browser...");
  const browser = await chromium.launch({ headless: true });

  const ctxA = await browser.newContext({ viewport: { width: 420, height: 900 } });
  const ctxB = await browser.newContext({ viewport: { width: 420, height: 900 } });

  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  const URL = "https://fashionistas.ai/app";
  const uniqueA = "Message from demo " + Date.now();
  const uniqueB = "Reply from testbuyer " + Date.now();

  try {
    // 1. Account A: Login demo
    console.log("\n[Account A: Demo Seller]");
    console.log("Navigating to", URL);
    await pageA.goto(URL, { waitUntil: "networkidle" });

    // Login via UI form
    await pageA.evaluate(async () => {
      const res = await fetch("https://fashionistas-api.fashionistas1979.workers.dev/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "demo", password: "Primetime2026!" })
      });
      const d = await res.json();
      if (!d.token) throw new Error("Login failed: " + JSON.stringify(d));
      afterAuth(d);
    });
    console.log("Logged in as Demo (User ID 50)");

    // Go to messages
    await pageA.evaluate(async () => {
      await messagesScreen();
    });
    await pageA.waitForSelector("#dm-list");
    const contactsA = await pageA.evaluate(() => S.dmContacts);
    console.log("Demo contacts loaded:", contactsA.length, "contacts found");

    // Open thread with testbuyer2026 (User ID 66)
    console.log("Opening threadScreen with testbuyer2026 (ID 66)...");
    await pageA.evaluate(async () => {
      await threadScreen(66);
    });
    await pageA.waitForSelector("#dm-thread");
    await pageA.waitForSelector("#dm-input");

    // Send message from Demo to Buyer
    console.log("Demo sending:", uniqueA);
    await pageA.fill("#dm-input", uniqueA);
    await pageA.click("button[onclick='dmSend()']");
    await pageA.waitForTimeout(1000);

    const bubblesA1 = await pageA.$$eval("#dm-thread .dm-msg", els => els.map(e => e.textContent));
    console.log("Demo thread bubbles count:", bubblesA1.length);
    const sentOk = bubblesA1.some(b => b.includes(uniqueA));
    console.log("Sent message visible in Demo thread:", sentOk);
    if (!sentOk) throw new Error("Demo sent message not visible in thread!");

    // 2. Account B: Login testbuyer2026
    console.log("\n[Account B: Test Buyer]");
    console.log("Navigating to", URL);
    await pageB.goto(URL, { waitUntil: "networkidle" });

    await pageB.evaluate(async () => {
      const res = await fetch("https://fashionistas-api.fashionistas1979.workers.dev/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "testbuyer2026", password: "QApower2026!" })
      });
      const d = await res.json();
      if (!d.token) throw new Error("Buyer login failed: " + JSON.stringify(d));
      afterAuth(d);
    });
    console.log("Logged in as testbuyer2026 (User ID 66)");

    // Open messages screen
    await pageB.evaluate(async () => {
      await messagesScreen();
    });
    await pageB.waitForSelector("#dm-list");
    const contactsB = await pageB.evaluate(() => S.dmContacts);
    console.log("Buyer contacts count:", contactsB.length);
    const demoContact = contactsB.find(c => c.id === 50);
    console.log("Demo contact seen by Buyer:", demoContact ? { id: demoContact.id, name: demoContact.name, last: demoContact.last, unread: demoContact.unread } : "NOT FOUND");

    // Open thread with Demo (ID 50)
    console.log("Opening threadScreen with Demo (ID 50)...");
    await pageB.evaluate(async () => {
      await threadScreen(50);
    });
    await pageB.waitForSelector("#dm-thread");
    await pageB.waitForSelector("#dm-input");

    const bubblesB1 = await pageB.$$eval("#dm-thread .dm-msg", els => els.map(e => e.textContent));
    console.log("Buyer sees thread bubbles count:", bubblesB1.length);
    const receivedInB = bubblesB1.some(b => b.includes(uniqueA));
    console.log("Buyer received Demo's message:", receivedInB);
    if (!receivedInB) throw new Error("Buyer did not receive Demo's message!");

    // Buyer replies
    console.log("Buyer sending reply:", uniqueB);
    await pageB.fill("#dm-input", uniqueB);
    await pageB.click("button[onclick='dmSend()']");
    await pageB.waitForTimeout(1000);

    const bubblesB2 = await pageB.$$eval("#dm-thread .dm-msg", els => els.map(e => e.textContent));
    const replySentOk = bubblesB2.some(b => b.includes(uniqueB));
    console.log("Reply visible in Buyer thread:", replySentOk);

    // 3. Back in Account A: Wait for polling to pick up reply
    console.log("\n[Account A: Demo Seller - Checking for reply]");
    console.log("Waiting 5s for auto-poll dmLoad(false)...");
    await pageA.waitForTimeout(5000);

    const bubblesA2 = await pageA.$$eval("#dm-thread .dm-msg", els => els.map(e => e.textContent));
    console.log("Demo updated bubbles count:", bubblesA2.length);
    const receivedInA = bubblesA2.some(b => b.includes(uniqueB));
    console.log("Demo received Buyer's reply via live polling:", receivedInA);
    if (!receivedInA) throw new Error("Demo did not receive Buyer's reply!");

    console.log("\n✅ TWO-ACCOUNT MESSAGING WALK: PASS");
    console.log("Demo -> Buyer message verified.");
    console.log("Buyer -> Demo reply verified via real-time polling.");
    console.log("Both threads verified in live browser DOM.");

  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error("FAIL:", err);
  process.exit(1);
});
