#!/usr/bin/env node
/* Data-layer proof harness for the fixes shipping today (2026-10-01).

   This is a LIVE black-box proof against the deployed endpoints. It asserts the
   TREATMENT expectation for each of the five fixes and prints the documented
   CONTROL baseline beside the measurement, so the lead can compare the runs.

   Run:  node tests/data-layer-proof.mjs             (treatment: assert the fix)
         node tests/data-layer-proof.mjs --control   (control run: also prints the
                                                      documented baseline block)

   Exit codes
     0  every check passed
     1  at least one check FAILED. In control today this is the EXPECTED
        outcome -- that is the entire point of the control run.
     2  the harness could not run: no HTTP status was obtained from any endpoint
        (offline/DNS/blocked), an argument was wrong, or the assertion
        discrimination self-test failed (a harness that cannot detect the
        documented defect is not evidence).
        A non-200, an empty body, a parse failure or a missing field is a FAIL,
        never an exception and never a silent pass -- those do NOT exit 2.

   Rules enforced while measuring
     - <= 4 calls per host, hard budget, enforced by the gate
     - >= 500ms between request starts on the same host
     - every request aborts at 45s
     The two hosts run concurrently; the gate serialises each host.

   Structure
     The decision logic lives in pure judges (judge1..judge5) that take an
     already-parsed payload. The network code only fetches and parses. That
     split lets the run prove its own teeth: the DISCRIMINATION section feeds
     each judge the documented control payload and asserts the judge FAILS on
     it, so a PASS on a live check cannot be a vacuous pass. It costs zero
     network calls.

   Known limitation (documented, not hidden)
     Check 5 sends the two-turn history in ONE request instead of chaining a
     live turn-1 answer, because a live chain needs 5 calls on placebets.ai and
     the budget is 4. The matchup resolution under test is read from the USER
     turn by extractLastMatchupFromHistory(), so the assistant turn is a
     team-free, number-free stub. That stub also prevents a pre-baked answer
     from making the check pass for the wrong reason.
*/

/* ------------------------------- knobs ---------------------------------- */
const TIMEOUT_MS = 45000;      // hard cap per request
const HOST_BUDGET = 4;         // max calls per host
const HOST_GAP_MS = 500;       // min gap between request starts on one host
const P50_BUDGET_MS = 4000;    // marketpicks chatbot median budget
const PCT_TOLERANCE = 2;       // percentage points between prose and probability

const PB = "https://placebets.ai";
const MP = "https://marketpicks.ai";

/* ---------------- documented CONTROL baseline (measured 2026-10-01) --------
   Printed in full under --control, digested in the table in both modes.      */
const CONTROL_BASELINE = [
  "C1 GET  placebets.ai/api/trending   -> 200 {\"ok\":true,\"topics\":[]}  (0 topics; the",
  "                                         trending cron was never called)",
  "C2 POST placebets.ai/api/predict    -> 200 answer refuses (\"can't conjure ... out of",
  "                                         thin air\") while probability = 0.578, a number",
  "                                         scraped out of the refusal prose",
  "C3 GET  placebets.ai/api/kalshi     -> 200 serves markets with closeDate 2026-06-17,",
  "                                         i.e. already past on 2026-10-01",
  "C4 POST marketpicks.ai/api/chatbot  -> 2 of the first 4 calls were HTTP 503; the 12",
  "                                         calls that followed took 6.9s - 15.1s",
  "C5 POST placebets.ai/api/chatbot    -> two-turn follow-up resolved to the Chiefs-Bills",
  "                                         matchup. PASSING today; this check exists to",
  "                                         stop it regressing.",
];

/* ------------------------------ utilities -------------------------------- */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* Display only. Model answers contain emoji and curly quotes; strip everything
   outside printable ASCII so the proof output stays clean. Never scrub before
   judging -- the judges read the raw text (see the apostrophe-insensitive
   REFUSAL pattern, which has to match a curly quote too). */
function scrub(s) {
  return String(s ?? "")
    .replace(/[^\x20-\x7E]/g, "?")
    .replace(/\s+/g, " ")
    .trim();
}
const clip = (s, n) => {
  const t = scrub(s);
  return t.length <= n ? t : t.slice(0, Math.max(0, n - 1)) + "~";
};
const padR = (s, n) => String(s).slice(0, n).padEnd(n, " ");
const pct = (p) => (p === null || p === undefined ? "null" : Number(p).toFixed(3));
const has = (o, k) => o !== null && typeof o === "object" && Object.prototype.hasOwnProperty.call(o, k);

/* ------------------------- per-host call budget -------------------------- */
class HostGate {
  constructor(host) {
    this.host = host;
    this.used = 0;
    this.lastStart = 0;
    this.tail = Promise.resolve();
  }
  run(fn) {
    const job = this.tail.then(async () => {
      if (this.used >= HOST_BUDGET) {
        const e = new Error(`call budget for ${this.host} exhausted (${HOST_BUDGET})`);
        e.code = "BUDGET";
        throw e;
      }
      this.used += 1;
      const wait = this.lastStart + HOST_GAP_MS - Date.now();
      if (wait > 0) await sleep(wait);
      this.lastStart = Date.now();
      return await fn();
    });
    this.tail = job.then(
      () => {},
      () => {}
    );
    return job;
  }
}

const gates = new Map();
const gateFor = (url) => {
  const host = new URL(url).host;
  if (!gates.has(host)) gates.set(host, new HostGate(host));
  return gates.get(host);
};

/* ------------------------------ transport -------------------------------- */
/* Counts every HTTP status actually obtained. If this stays 0 the run is
   impossible (offline/DNS/blocked) and the process exits 2, per the spec. */
let httpStatusesObtained = 0;

/* Never throws. Returns status null + transport message on a network failure. */
async function request(url, { method = "GET", body = null } = {}) {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method,
      headers: body === null ? undefined : { "content-type": "application/json" },
      body: body === null ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: "follow",
    });
    const text = await res.text();
    httpStatusesObtained += 1;
    return { url, status: res.status, ms: Date.now() - started, text, transport: null };
  } catch (err) {
    const name = String(err?.name || "");
    const why =
      name === "TimeoutError" || name === "AbortError"
        ? `no response within ${TIMEOUT_MS}ms`
        : String(err?.message || err);
    return { url, status: null, ms: Date.now() - started, text: "", transport: why };
  }
}

/* Parse guard. A non-200, an empty body or unparseable JSON is a FAIL reason,
   never a thrown exception. */
function guard(res) {
  if (res.transport) return { fail: `transport error: ${res.transport}`, transport: true };
  if (res.status !== 200) return { fail: `HTTP ${res.status}`, transport: false };
  if (res.text.trim() === "") return { fail: "HTTP 200 with an empty body", transport: false };
  try {
    return { json: JSON.parse(res.text), transport: false };
  } catch (e) {
    return { fail: `body is not JSON: ${e.message}`, transport: false };
  }
}
const isFail = (g) => g.fail !== undefined;

/* ============================== JUDGES ===================================
   Pure. Take a parsed payload, return { pass, actual, note, excerpt? }.       */

/* C1: trending must actually carry topics. Empty means the cron never ran. */
function judge1(json) {
  if (!has(json, "topics")) {
    return { pass: false, actual: "no topics field", note: "response has no `topics` key" };
  }
  if (!Array.isArray(json.topics)) {
    return { pass: false, actual: `topics is ${typeof json.topics}`, note: "`topics` must be an array" };
  }
  const n = json.topics.length;
  return {
    pass: n > 0,
    actual: `topics.length=${n} ok=${json.ok === true}`,
    note: n === 0 ? "trending feed is empty; the trending cron has never written" : "",
  };
}

/* C2: probability must never run ahead of the prose.
   Refuses to give a number -> probability must be null.
   Asserts a number        -> probability must match that number in the prose. */
const REFUSAL = new RegExp(
  [
    "can'?t", "cannot", "can not", "unable to", "not able to", "conjure",
    "out of thin air", "no data", "no live line", "don'?t have", "do not have",
    "without (?:the )?(?:data|numbers|number|line|lines|info|information)",
    "not enough (?:info|information|data)", "insufficient",
    "shoot me the", "hand (?:me )?(?:over|the)", "ask you to (?:hand|give|provide)",
    "no odds", "no spread",
  ].join("|"),
  "i",
);
const PERCENT = /(\d{1,3}(?:\.\d+)?)\s*%/g;

/* A percentage that merely EXPLAINS a price is not the answer's own number.
   Control (2026-10-01, live): with Groq rate-limited the fallback model answered
   with odds math — the system prompt's own worked example, "Jets at -110 means
   52.4% implied probability" — and C2 failed 1 run in 3 on
   `answer asserts 52.4% but probability is null` while the shipped
   extractProbability() had correctly returned null: the judge was demanding a
   probability the prose never claimed for the asked question.
   So a percentage only counts as ASSERTED when its local context carries no
   price/maths marker. Anything unmarked stays asserted, which keeps this judge
   at least as strict as the code it checks. */
const ODDS_MATH = new RegExp(
  [
    "[-+]\\d{3}",                 // a moneyline price anywhere near the number
    "\\bmeans?\\b", "\\bequals?\\b", "\\bconvert(?:s|ed|ing)?\\b",
    "\\bbreak[- ]?even\\b", "\\b(?:vig|juice|overround)\\b", "\\bpayouts?\\b",
    "\\bimplied probability\\b", "\\bfor example\\b", "\\bsuppose\\b",
    "\\bprobability of a (?:win|cover)\\b",
  ].join("|"),
  "i",
);
const MATH_WINDOW = 70;

function judge2(json) {
  if (!has(json, "answer") || typeof json.answer !== "string" || json.answer.trim() === "") {
    return { pass: false, actual: "no answer string", note: "response has no usable `answer` string" };
  }
  const answer = json.answer;
  const raw = has(json, "probability") ? json.probability : undefined;
  const isNull = raw === null || raw === undefined;
  const refused = REFUSAL.test(answer);
  const allPct = [...answer.matchAll(PERCENT)].filter((m) => {
    const v = parseFloat(m[1]);
    return v >= 0 && v <= 100;
  });
  const asserted = allPct
    .filter((m) => !ODDS_MATH.test(answer.slice(Math.max(0, (m.index ?? 0) - MATH_WINDOW), m.index ?? 0)))
    .map((m) => parseFloat(m[1]));
  const shown = `prob=${pct(raw)} ${refused ? "refusal" : "no-refusal"} ${asserted.length}asserted/${allPct.length}pct`;

  if (refused) {
    return {
      pass: isNull,
      actual: shown,
      note: isNull
        ? "answer refuses to give a number and probability is null"
        : `answer refuses to give a number but probability=${pct(raw)} was scraped out of the prose`,
    };
  }
  if (asserted.length === 0) {
    return {
      pass: isNull,
      actual: shown,
      note: isNull
        ? "no number asserted and probability is null"
        : `probability=${pct(raw)} is unjustified: the answer asserts no percentage`,
    };
  }
  if (isNull) {
    return { pass: false, actual: shown, note: `answer asserts ${asserted.join("%, ")}% but probability is null` };
  }
  const asPct = Number(raw) * 100;
  if (!Number.isFinite(asPct)) {
    return { pass: false, actual: shown, note: `probability=${pct(raw)} is not a number` };
  }
  const nearest = asserted.reduce((b, v) => (Math.abs(v - asPct) < Math.abs(b - asPct) ? v : b));
  const gap = Math.abs(nearest - asPct);
  return {
    pass: gap <= PCT_TOLERANCE,
    actual: `${pct(raw)} vs prose ${nearest}%`,
    note:
      gap <= PCT_TOLERANCE
        ? `probability matches the asserted ${nearest}%`
        : `probability=${pct(raw)} (${asPct.toFixed(1)}%) contradicts the asserted ${nearest}% by ${gap.toFixed(1)}pp`,
  };
}

/* C3: kalshi must not serve markets whose closeDate has already passed. */
function judge3(json, now = Date.now()) {
  if (!has(json, "markets")) {
    return { pass: false, actual: "no markets field", note: "response has no `markets` array" };
  }
  if (!Array.isArray(json.markets)) {
    return { pass: false, actual: `markets is ${typeof json.markets}`, note: "`markets` must be an array" };
  }
  if (json.markets.length === 0) {
    return { pass: false, actual: "markets=[] (0)", note: "an empty market list is missing data, not a pass" };
  }
  const dated = json.markets.filter((m) => m && typeof m.closeDate === "string");
  const undated = json.markets.length - dated.length;
  const unparseable = dated.filter((m) => !Number.isFinite(Date.parse(m.closeDate))).length;
  const stale = dated
    .map((m) => ({ ticker: m.ticker ?? "?", close: m.closeDate, t: Date.parse(m.closeDate) }))
    .filter((x) => Number.isFinite(x.t) && x.t < now)
    .sort((a, b) => a.t - b.t);
  const head = stale.length ? ` oldest=${stale[0].ticker}@${stale[0].close.slice(0, 10)}` : "";
  const extra = undated || unparseable ? ` (${undated} undated, ${unparseable} unparseable)` : "";
  return {
    pass: stale.length === 0 && undated === 0 && unparseable === 0,
    actual: `stale=${stale.length}/${dated.length}${head}${extra}`,
    note:
      stale.length > 0
        ? `${stale.length} market(s) still served after their closeDate, oldest ${stale[0].ticker} closed ${stale[0].close.slice(0, 10)}`
        : undated > 0 || unparseable > 0
        ? "every served market must carry a parsable closeDate"
        : "",
  };
}

/* C4: 4 calls, all 200, p50 under budget, never an empty body. */
const MP_QUERY = "NVDA outlook next quarter";
function median(sorted) {
  const n = sorted.length;
  if (n === 0) return null;
  const mid = Math.floor(n / 2);
  return n % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/* calls: [{ n, status, ms, bytes, transport }] */
function judge4(calls) {
  const codes = calls.map((c) => (c.transport ? "ERR" : String(c.status))).join(",");
  const lat = calls.map((c) => c.ms);
  const p50 = median([...lat].sort((a, b) => a - b));
  const bad = calls.filter((c) => c.transport || c.status !== 200);
  const empties = calls.filter((c) => !c.transport && c.bytes === 0);
  const over = calls.filter((c) => c.ms >= P50_BUDGET_MS);
  const notes = [];
  if (bad.length) {
    notes.push(`${bad.length}/4 not HTTP 200 (${bad.map((c) => (c.transport ? "transport:" + c.transport : "HTTP " + c.status)).join(", ")})`);
  }
  if (empties.length) notes.push(`${empties.length} call(s) returned an empty body`);
  if (p50 >= P50_BUDGET_MS) notes.push(`p50 ${p50}ms is at or over the ${P50_BUDGET_MS}ms budget`);
  if (over.length) notes.push(`${over.length}/4 exceeded ${P50_BUDGET_MS}ms individually (${over.map((c) => c.ms + "ms").join(", ")})`);
  return {
    pass: bad.length === 0 && empties.length === 0 && p50 < P50_BUDGET_MS,
    actual: `st=${codes} p50=${p50}ms max=${Math.max(...lat)}ms`,
    transport: calls.length > 0 && calls.every((c) => c.transport),
    note: notes.join("; "),
  };
}

/* C5: the follow-up must resolve back to the matchup named one turn earlier. */
function judge5(answer) {
  if (typeof answer !== "string" || answer.trim() === "") {
    return { pass: false, actual: "no answer string", note: "neither `response` nor `answer` carried text" };
  }
  const low = answer.toLowerCase();
  const hasChiefs = /chiefs|kansas city/.test(low);
  const hasBills = /bills|buffalo/.test(low);
  return {
    pass: hasChiefs && hasBills,
    actual: `chiefs=${hasChiefs ? "y" : "n"} bills=${hasBills ? "y" : "n"}`,
    note:
      hasChiefs && hasBills
        ? "follow-up resolved back to the Chiefs-Bills matchup"
        : "the follow-up did not resolve to the matchup named one turn earlier",
    excerpt: answer,
  };
}

/* ============================ LIVE CHECKS ================================
   Network + parse only, then delegate to a judge.                          */
async function live1() {
  const url = `${PB}/api/trending`;
  const res = await gateFor(url).run(() => request(url));
  const g = guard(res);
  if (isFail(g)) return { pass: false, actual: g.fail, transport: g.transport, note: g.fail };
  return judge1(g.json);
}

async function live2() {
  const url = `${PB}/api/predict`;
  const res = await gateFor(url).run(() => request(url, { method: "POST", body: { query: "Chiefs vs Bills" } }));
  const g = guard(res);
  if (isFail(g)) return { pass: false, actual: g.fail, transport: g.transport, note: g.fail };
  return judge2(g.json);
}

async function live3() {
  const url = `${PB}/api/kalshi`;
  const res = await gateFor(url).run(() => request(url));
  const g = guard(res);
  if (isFail(g)) return { pass: false, actual: g.fail, transport: g.transport, note: g.fail };
  return judge3(g.json);
}

async function live4() {
  const url = `${MP}/api/chatbot`;
  const g4 = gateFor(url);
  const calls = [];
  for (let i = 0; i < 4; i += 1) {
    /* eslint-disable no-await-in-loop -- the per-host gap and budget are the point */
    const res = await g4.run(() => request(url, { method: "POST", body: { query: MP_QUERY } }));
    calls.push({
      n: i + 1,
      status: res.status,
      ms: res.ms,
      bytes: Buffer.byteLength(res.text || ""),
      transport: res.transport,
    });
    /* eslint-enable no-await-in-loop */
  }
  return judge4(calls);
}

async function live5() {
  const url = `${PB}/api/chatbot`;
  const history = [
    { role: "user", content: "Chiefs vs Bills, who wins?" },
    /* Team-free, number-free stub: the matchup under test is resolved out of the
       user turn, and a pre-baked assistant answer would let this check pass for
       the wrong reason. See the header note on the 4-call budget. */
    { role: "assistant", content: "Let me check that matchup for you." },
  ];
  const res = await gateFor(url).run(() =>
    request(url, { method: "POST", body: { query: "what is the spread on that one?", history } })
  );
  const g = guard(res);
  if (isFail(g)) return { pass: false, actual: g.fail, transport: g.transport, note: g.fail };
  const json = g.json;
  const answer = has(json, "response") ? json.response : has(json, "answer") ? json.answer : undefined;
  return judge5(answer);
}

/* ==================== ASSERTION DISCRIMINATION (no network) ===============
   Feed each judge the documented CONTROL payload and require it to FAIL. If a
   judge passes a broken payload it cannot detect the defect, and every PASS it
   produces downstream is worthless -- so a failure here exits 2.               */
const DISCRIMINATION = [
  {
    id: "D1",
    claim: "judge1 rejects the documented empty trending feed",
    run: () => judge1({ ok: true, topics: [] }),
  },
  {
    id: "D2",
    claim: "judge2 rejects the documented refusal + probability 0.578",
    run: () =>
      judge2({
        ok: true,
        answer: "I can't conjure that spread out of thin air. If you had 57.8% I could break it down.",
        probability: 0.578,
      }),
  },
  {
    id: "D3",
    claim: "judge3 rejects a market whose closeDate has already passed",
    run: () => judge3({ markets: [{ ticker: "KXWCHOST-2038-AUCP", closeDate: "2026-06-17T18:00:00.000Z" }] }, Date.parse("2026-10-01T00:00:00.000Z")),
  },
  {
    id: "D4",
    claim: "judge4 rejects 2 of 4 calls returning HTTP 503",
    run: () =>
      judge4([
        { n: 1, status: 503, ms: 120, bytes: 40, transport: null },
        { n: 2, status: 200, ms: 6900, bytes: 900, transport: null },
        { n: 3, status: 503, ms: 130, bytes: 40, transport: null },
        { n: 4, status: 200, ms: 15100, bytes: 900, transport: null },
      ]),
  },
  {
    id: "D5",
    claim: "judge5 rejects a follow-up that lost the matchup",
    run: () => judge5("What is the spread on that one? I need the line first."),
  },
  {
    id: "D6",
    claim: "judge2 rejects a number contradicting the asserted prose",
    run: () => judge2({ answer: "Kansas City is favoured at 76.5% implied.", probability: 0.578 }),
  },
  {
    id: "D7",
    claim: "judge2 accepts a refusal with probability null (the treatment shape)",
    run: () => judge2({ answer: "I can't conjure that out of thin air, I have no live line.", probability: null }),
    want: true,
  },
  {
    id: "D8",
    claim: "judge2 accepts a number consistent with the asserted prose",
    run: () => judge2({ answer: "Kansas City is favoured at 76.5% implied.", probability: 0.765 }),
    want: true,
  },
  {
    id: "D9",
    claim: "judge4 accepts 4x HTTP 200 with p50 under budget",
    run: () =>
      judge4([
        { n: 1, status: 200, ms: 900, bytes: 900, transport: null },
        { n: 2, status: 200, ms: 1100, bytes: 900, transport: null },
        { n: 3, status: 200, ms: 1200, bytes: 900, transport: null },
        { n: 4, status: 200, ms: 1300, bytes: 900, transport: null },
      ]),
    want: true,
  },
  {
    id: "D10",
    claim: "judge1 rejects a missing topics field rather than passing it",
    run: () => judge1({ ok: true }),
  },
  {
    id: "D11",
    claim: "judge2 accepts odds-math prose with probability null",
    run: () =>
      judge2({
        answer: "A -110 line means 52.4% implied probability, so the market has it near a coin flip.",
        probability: null,
      }),
    want: true,
  },
  {
    id: "D12",
    claim: "judge2 still rejects the model's OWN number left null",
    run: () => judge2({ answer: "I'd give the Chiefs a 54% chance to win this one.", probability: null }),
  },
  {
    id: "D13",
    claim: "judge2 rejects a number scraped out of pure odds math",
    run: () =>
      judge2({
        answer: "A -110 line means 52.4% implied probability, so the market has it near a coin flip.",
        probability: 0.524,
      }),
  },
];

/* ------------------------------- the table -------------------------------- */
const CHECKS = [
  { id: "C1", label: "trending topics present", control: "topics=[] (0)", expect: "topics.length > 0", fn: live1 },
  { id: "C2", label: "predict prob matches prose", control: "refusal + 0.578", expect: "refusal -> null, number -> match", fn: live2 },
  { id: "C3", label: "kalshi drops settled markets", control: "2026-06-17 served", expect: "0 past-dated markets", fn: live3 },
  { id: "C4", label: "marketpicks chatbot 4x", control: "2/4=503, 6.9-15.1s", expect: "4/4 = 200, p50 < 4000ms", fn: live4 },
  { id: "C5", label: "chatbot 2-turn resolution", control: "resolved (passing)", expect: "names both teams", fn: live5 },
];

const W = { id: 5, check: 29, control: 21, expect: 30, actual: 46 };
const rule = (w, ch = "-") => ch.repeat(w);
const WIDTH = W.id + W.check + W.control + W.expect + W.actual + 9;

function table(rows) {
  console.log(rule(WIDTH, "="));
  console.log(
    padR("CHECK", W.id) + " | " + padR("WHAT", W.check) + " | " + padR("CONTROL", W.control) +
      " | " + padR("TREATMENT EXPECTATION", W.expect) + " | " + padR("ACTUAL", W.actual) + " | RESULT"
  );
  console.log(rule(WIDTH));
  for (const r of rows) {
    console.log(
      padR(r.id, W.id) + " | " + padR(clip(r.label, W.check), W.check) + " | " +
      padR(clip(r.control, W.control), W.control) + " | " + padR(clip(r.expect, W.expect), W.expect) +
      " | " + padR(clip(r.actual, W.actual), W.actual) + " | " + (r.pass ? "PASS" : "FAIL")
    );
  }
  console.log(rule(WIDTH, "="));
}

/* --------------------------------- main ----------------------------------- */
async function main() {
  if (process.argv.includes("--help")) {
    console.log("usage: node tests/data-layer-proof.mjs [--control]");
    console.log("  (no flag)   treatment run: assert the shipped fix");
    console.log("  --control   control run: also print the documented control baseline block");
    return 0;
  }
  const unknown = process.argv.slice(2).filter((a) => a !== "--control");
  if (unknown.length) {
    console.log(`ERROR unknown argument(s): ${unknown.join(" ")}`);
    return 2;
  }

  const control = process.argv.includes("--control");
  console.log("DATA-LAYER PROOF  " + new Date().toISOString());
  console.log(`MODE             ${control ? "control (baseline printed; FAIL is the expected result today)" : "treatment (asserting the shipped fix)"}`);
  console.log(`TARGETS          ${PB} , ${MP}`);
  console.log(`LIMITS           <=${HOST_BUDGET} calls/host, >=${HOST_GAP_MS}ms between starts, ${TIMEOUT_MS}ms timeout`);
  console.log("");

  if (control) {
    console.log("DOCUMENTED CONTROL BASELINE (measured before the fix, 2026-10-01)");
    for (const l of CONTROL_BASELINE) console.log("  " + l);
    console.log("");
  }

  /* 1. the harness must be able to fail before its passes mean anything */
  const disc = DISCRIMINATION.map((d) => {
    let r;
    try {
      r = d.run();
    } catch (e) {
      return { ...d, pass: false, actual: `threw ${e?.constructor?.name}: ${e?.message}` };
    }
    const want = d.want === true;
    return {
      ...d,
      pass: r.pass === want,
      actual: `judge returned ${r.pass ? "PASS" : "FAIL"}, wanted ${want ? "PASS" : "FAIL"}`,
    };
  });
  const discPass = disc.filter((d) => d.pass).length;
  console.log("ASSERTION DISCRIMINATION (offline, no calls: a judge that cannot fail proves nothing)");
  for (const d of disc) console.log(`  ${d.pass ? "ok  " : "BAD "} ${d.id}  ${clip(d.claim, 66)} -> ${d.actual}`);
  console.log(`  ${discPass}/${disc.length} judges discriminate correctly`);
  console.log("");

  /* 2. the live run. Hosts run concurrently; the gate keeps order/gap/budget. */
  let results;
  try {
    results = await Promise.all(
      CHECKS.map(async (c) => {
        try {
          const r = await c.fn();
          return { ...c, pass: !!r.pass, actual: String(r.actual ?? ""), note: r.note ?? "", transport: !!r.transport, excerpt: r.excerpt };
        } catch (err) {
          /* An exception here is a harness defect, not a product defect, but it
             must never read as a pass and never crash the run. */
          const why = err?.code === "BUDGET" ? String(err.message) : `${err?.constructor?.name || "Error"}: ${err?.message || err}`;
          return { ...c, pass: false, actual: clip("HARNESS " + why, W.actual), note: "harness error: " + why, transport: false };
        }
      })
    );
  } catch (err) {
    console.log(`RESULT COULD NOT RUN  ${err?.message || err}`);
    return 2;
  }

  table(results);

  console.log("");
  for (const r of results) {
    if (r.note) console.log(`  ${r.id}  ${scrub(r.note)}`);
    if (r.excerpt) console.log(`      evidence: "${clip(r.excerpt, 150)}"`);
  }
  console.log("");
  console.log("NOTE  ACTUAL is what this run measured. Where it differs from the CONTROL");
  console.log("      column, the documented baseline did not reproduce on this run.");

  const pass = results.filter((r) => r.pass).length;
  console.log("");
  console.log(`CALL BUDGET         ${[...gates.values()].map((g) => `${g.host} ${g.used}/${HOST_BUDGET}`).join(", ")}`);
  console.log(`PROOF ${pass}/${results.length} passed`);
  if (discPass !== disc.length) {
    console.log("RESULT COULD NOT RUN  (assertion discrimination failed: the harness cannot detect the defect)");
    return 2;
  }
  if (httpStatusesObtained === 0) {
    console.log("RESULT COULD NOT RUN  (no HTTP status obtained from any endpoint)");
    return 2;
  }
  console.log(`RESULT ${pass === results.length ? "PASS" : "FAIL"}`);
  return pass === results.length ? 0 : 1;
}

process.exit(await main());
