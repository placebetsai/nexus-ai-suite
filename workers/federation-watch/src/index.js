// federation-watch — checks every site, feed and chatbot on a schedule and
// pushes an alert to the owner's phone (ntfy) when something breaks or recovers.
// Runs on Cloudflare cron, so it works whether or not the laptop is on.
//   every 15 min: pages, data feeds, D1 read budget, blog freshness
//   hourly:       one real question to each chatbot
// GET /           latest results (JSON)
// GET /api/health liveness
// GET /run        run the checks now (same as the cron), returns results

const UA = "federation-watch/1.0 (+owner monitoring)";
const HOUR = 3600e3, DAY = 24 * HOUR;

let ENV = {};
async function get(url, init = {}, timeout = 20000) {
  const t = Date.now();
  const host = new URL(url).hostname;
  const fetcher = host.startsWith("fashionistas-api.") && ENV.FASH_API ? ENV.FASH_API : host.startsWith("createstuff-api.") && ENV.CS_API ? ENV.CS_API : { fetch: (u, o) => fetch(u, o) };
  const r = await fetcher.fetch(url, { ...init, headers: { "User-Agent": UA, ...(init.headers || {}) }, signal: AbortSignal.timeout(timeout) });
  const text = await r.text();
  return { status: r.status, text, ms: Date.now() - t };
}
const json = (s) => { try { return JSON.parse(s); } catch { return null; } };

// MEASURED 2026-10-05 via Cloudflare GraphQL (sum{cpuTimeUs}, corroborated by
// quantiles{cpuTimeP50}): this Worker used 33.6 ms of CPU per invocation,
// P50 33.4 ms, over 157 invocations in 24h. The free plan allows 10 ms per
// invocation — so every single one of those runs was over the limit. The cost
// was decoding whole HTML documents (12 pages + 2 blogs, hundreds of KB each)
// to look at the first few kilobytes. Reading a response body IS CPU: every
// byte gets UTF-8 decoded into a JS string.
//
// Stream it instead and stop the instant the answer is known. The early exit
// is logically sound, so results do not change:
//   * a marker found anywhere stays found — later bytes cannot un-find it;
//   * a date inside the freshness window proves the NEWEST date is inside it,
//     because the newest is >= that one. If nothing recent turns up we keep
//     reading to the end exactly as before, so a real failure costs what it
//     always did. Test slices overlap by OVERLAP bytes so no token (a date is
//     10 chars) can straddle two reads and be missed.
async function getUntil(url, test, timeout = 20000) {
  const t = Date.now();
  const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(timeout) });
  // Non-200 already decides ok/fail for every caller — no body is worth
  // decoding, so drop it instead of paying to read it.
  if (r.status !== 200 || !r.body) {
    try { if (r.body) await r.body.cancel(); } catch { /* closing anyway */ }
    return { status: r.status, text: "", ms: Date.now() - t, match: false };
  }
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  const OVERLAP = 64;
  let text = "", scanned = 0, match = false;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      text += dec.decode(value, { stream: true });
      const from = scanned > OVERLAP ? scanned - OVERLAP : 0;
      if (text.length > from && test(text.slice(from))) { match = true; break; }
      scanned = text.length;
    }
    if (!match) {
      // Flush any bytes held back mid-sequence, then cover them too.
      const tail = dec.decode();
      if (tail) {
        const from = scanned > OVERLAP ? scanned - OVERLAP : 0;
        text += tail;
        if (text.length > from) match = test(text.slice(from));
      }
    }
  } finally {
    try { await reader.cancel(); } catch { /* already closed */ }
  }
  return { status: r.status, text, ms: Date.now() - t, match };
}
const age = (iso) => (iso ? Date.now() - Date.parse(iso) : Infinity);
const hrs = (ms) => (Number.isFinite(ms) ? `${(ms / HOUR).toFixed(1)}h` : "never");

// Each check returns { ok, detail }. Throwing counts as a failure.
const PAGES = [
  ["fashionistas.ai", "fashionistas"], ["createstuff.ai", "CreateStuff"], ["app.createstuff.ai", "CreateStuff"],
  ["placebets.ai", "PlaceBets"], ["marketpicks.ai", "MarketPicks"], ["ihatecollege.com", "IHateCollege"],
  ["spanishtvshows.com", "SpanishTVShows"], ["religiousjews.com", "Religious"], ["israeljoffe.com", "Joffe"],
  ["israeljoffe.org", "Joffe"], ["wuwonline.com", "WUW"], ["ketiservice.com", "Keti"],
];

function pageChecks() {
  return PAGES.map(([host, marker]) => [`page ${host}`, async () => {
    const r = await getUntil(`https://${host}/`, (t) => t.includes(marker));
    const ok = r.status === 200 && r.match;
    return { ok, detail: `${r.status}, ${Math.round(r.text.length / 1024)}KB, ${r.ms}ms${ok ? "" : r.status === 200 ? `, "${marker}" missing` : ""}` };
  }]);
}

const FEEDS = [
  // MEASURED 2026-10-05: /api/odds is 1,489,871 bytes and the whole thing was
  // JSON.parsed every run (12.4 ms in python alone) just to read one timestamp
  // and one count — inside a free plan that allows 10 ms of CPU per
  // invocation. Both facts we need sit in the first 1,151 bytes: updatedAt at
  // byte 20, stats.events just before the events array opens. So read the
  // prefix and regex them out; only if the payload has no stats.events do we
  // fall back to parsing the full body, which keeps the verdict correct if the
  // response shape ever changes (that path is slow on purpose, not broken).
  ["placebets odds", async () => {
    const r = await getUntil("https://placebets.ai/api/odds",
      (t) => /"updatedAt"\s*:/.test(t) && /"stats"\s*:\s*\{[^}]*?"events"\s*:/.test(t));
    const head = r.text.match(/"updatedAt"\s*:\s*"([^"]+)"/);
    const stats = r.text.match(/"stats"\s*:\s*\{[^}]*?"events"\s*:\s*(\d+)/);
    let n, a;
    if (r.match && stats) {
      n = Number(stats[1]);
      a = age(head && head[1]);
    } else {
      const d = json(r.text) || {};
      n = (d.events || []).length;
      a = age(d.updatedAt);
    }
    return { ok: n >= 20 && a < 2 * HOUR, detail: `${n} events, updated ${hrs(a)} ago` };
  }],
  ["marketpicks news", async () => {
    const d = json((await get("https://marketpicks.ai/api/market-news")).text) || {};
    const items = d.items || [];
    const newest = items.map((i) => i.published_at || i.publishedAt).filter(Boolean).sort().pop();
    return { ok: items.length >= 5 && age(newest) < DAY, detail: `${items.length} items, newest ${hrs(age(newest))} old` };
  }],
  ["marketpicks congress", async () => {
    const d = json((await get("https://marketpicks.ai/api/politician-trades?limit=5")).text) || {};
    const newest = (d.trades || []).map((t) => t.disclosure_date || t.transaction_date).filter(Boolean).sort().pop();
    return { ok: d.ok === true && (d.trades || []).length > 0 && age(newest) < 14 * DAY, detail: `newest filing ${newest || "none"}` };
  }],
  ["fashionistas market api", async () => {
    const r = await get("https://fashionistas-api.fashionistas1979.workers.dev/api/market");
    const d = json(r.text);
    return { ok: r.status === 200 && Array.isArray(d?.market), detail: `${r.status}, ${d?.market?.length ?? "?"} listings${d?.error ? `, ${String(d.error).slice(0, 80)}` : ""}` };
  }],
  ["createstuff published site", async () => {
    const r = await get("https://createstuff-api.fashionistas1979.workers.dev/published/173/index.html");
    return { ok: r.status === 200 && r.text.length > 500, detail: `${r.status}, ${r.text.length}B` };
  }],
  ["ihatecollege blog fresh", async () => blogFresh("https://ihatecollege.com/blog")],
  ["spanishtvshows blog fresh", async () => blogFresh("https://spanishtvshows.com/blog")],
];

// A date inside the freshness window settles the check on its own: the newest
// date is >= that one, so the newest is inside the window too. That makes it a
// safe early exit for getUntil(). If no recent date exists we read the whole
// document and reach exactly the verdict we always did.
const DATE_RE = /\b(20\d\d-\d\d-\d\d)\b/g;
function recentDate(t) {
  const now = Date.now();
  for (const m of t.matchAll(DATE_RE)) {
    const at = Date.parse(m[1]);
    if (at <= now + DAY && now - at < 4 * DAY) return true;
  }
  return false;
}

async function blogFresh(url) {
  const r = await getUntil(url, recentDate);
  const dates = [...r.text.matchAll(DATE_RE)].map((m) => m[1]).filter((d) => Date.parse(d) <= Date.now() + DAY).sort();
  const newest = dates.pop();
  return { ok: r.status === 200 && age(newest) < 4 * DAY, detail: `newest post ${newest || "none found"}` };
}

// Shared free D1 budget: 5M rows/day on the Fashionistas1979 account.
function d1Check(env) {
  return ["d1 read budget", async () => {
    if (!env.CF_ANALYTICS_TOKEN || !env.CF_ACCOUNT_ID) return { ok: true, detail: "not configured" };
    const date = new Date().toISOString().slice(0, 10);
    const q = `{viewer{accounts(filter:{accountTag:"${env.CF_ACCOUNT_ID}"}){d1AnalyticsAdaptiveGroups(limit:20,filter:{date:"${date}"}){sum{rowsRead}}}}}`;
    const r = await fetch("https://api.cloudflare.com/client/v4/graphql", { method: "POST", headers: { Authorization: `Bearer ${env.CF_ANALYTICS_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: q }) });
    const d = await r.json();
    const rows = (d?.data?.viewer?.accounts?.[0]?.d1AnalyticsAdaptiveGroups || []).reduce((s, g) => s + g.sum.rowsRead, 0);
    // Scale the day's reads so far to a full-day pace.
    const dayFrac = Math.max(0.05, (Date.now() % DAY) / DAY);
    const pace = rows / dayFrac;
    return { ok: rows < 3.5e6 && pace < 4.5e6, detail: `${(rows / 1e6).toFixed(2)}M read today (${Math.round(rows / 5e4)}% of 5M), pace ${(pace / 1e6).toFixed(1)}M/day` };
  }];
}

const BOTS = [
  ["bot marketpicks", "https://marketpicks.ai/api/chatbot", { query: "What is NVDA trading at today?" }, (d) => d.answer, /\$\d/],
  ["bot placebets", "https://placebets.ai/api/chatbot", { query: "hi" }, (d) => d.response, /[A-Za-z]{3}/],
  ["bot ihatecollege", "https://ihatecollege.com/api/chatbot", { query: "Is a nursing degree worth it?" }, (d) => d.answer, /\d/],
  ["bot spanishtvshows", "https://spanishtvshows.com/api/chatbot", { query: "Recommend a Spanish crime show", lang: "en" }, (d) => d.answer, /[A-Za-z]{3}/],
];
function botChecks() {
  return BOTS.map(([name, url, body, pick, must]) => [name, async () => {
    const r = await get(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }, 60000);
    const a = String(pick(json(r.text) || {}) || "");
    const bad = /engine is thinking|circuits are fried|try again|connection failed|error/i.test(a) && a.length < 120;
    const ok = r.status === 200 && a.length > 30 && must.test(a) && !bad;
    return { ok, detail: `${r.status}, ${r.ms}ms, "${a.slice(0, 90).replace(/\s+/g, " ")}"` };
  }]);
}

async function runAll(env, { bots }) {
  ENV = env;
  const checks = [...pageChecks(), ...FEEDS, d1Check(env), ...(bots ? botChecks() : [])];
  const results = await Promise.all(checks.map(async ([name, fn]) => {
    try { return { name, ...(await fn()) }; } catch (e) { return { name, ok: false, detail: `threw: ${String(e && e.message || e).slice(0, 120)}` }; }
  }));
  return { at: new Date().toISOString(), failing: results.filter((r) => !r.ok).length, results };
}

// State lives in KV so an alert fires once per outage, plus once on recovery.
async function alertOnChanges(env, run) {
  const prev = (await env.STATE.get("status", "json")) || {};
  const next = { ...prev };
  const broke = [], fixed = [];
  for (const r of run.results) {
    const was = prev[r.name];
    const fails = r.ok ? 0 : ((was && was.fails) || 0) + 1;
    next[r.name] = { ok: r.ok, fails, detail: r.detail, at: run.at };
    // Two failures in a row before paging: one flaky fetch shouldn't wake anyone.
    if (!r.ok && fails === 2) broke.push(r);
    if (r.ok && was && was.fails >= 2) fixed.push(r);
  }
  await env.STATE.put("status", JSON.stringify(next));
  await env.STATE.put("last", JSON.stringify(run));
  if (!env.NTFY_TOPIC || (!broke.length && !fixed.length)) return;
  const lines = [...broke.map((r) => `DOWN ${r.name}: ${r.detail}`), ...fixed.map((r) => `FIXED ${r.name}: ${r.detail}`)];
  await fetch(`https://ntfy.sh/${env.NTFY_TOPIC}`, {
    method: "POST",
    headers: { Title: broke.length ? `${broke.length} site check(s) failing` : "Site checks recovered", Priority: broke.length ? "high" : "default", Tags: broke.length ? "rotating_light" : "white_check_mark" },
    body: lines.join("\n").slice(0, 3500),
  });
}

export default {
  async scheduled(event, env, ctx) {
    const bots = new Date(event.scheduledTime).getUTCMinutes() < 15;
    ctx.waitUntil(runAll(env, { bots }).then((run) => alertOnChanges(env, run)));
  },
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    const out = (o, s = 200) => new Response(JSON.stringify(o, null, 2), { status: s, headers: { "Content-Type": "application/json" } });
    if (pathname === "/api/health") return out({ ok: true, service: "federation-watch" });
    // The free plan caps an account at 5 cron triggers, all taken, so
    // site-cron-trigger calls this every 15 minutes instead. Public but
    // throttled: at most one run per 10 minutes, whoever calls it.
    if (pathname === "/tick") {
      const last = Number(await env.STATE.get("tickAt")) || 0;
      if (Date.now() - last < 10 * 60e3) return out({ skipped: "ran recently", at: new Date(last).toISOString() });
      await env.STATE.put("tickAt", String(Date.now()));
      const run = await runAll(env, { bots: new Date().getUTCMinutes() < 15 });
      await alertOnChanges(env, run);
      return out({ ran: run.at, failing: run.failing });
    }
    if (pathname === "/run") {
      if (request.headers.get("X-Run-Token") !== env.RUN_TOKEN || !env.RUN_TOKEN) return out({ error: "not found" }, 404);
      const run = await runAll(env, { bots: true });
      await alertOnChanges(env, run);
      return out(run);
    }
    return out((await env.STATE.get("last", "json")) || { note: "no run yet" });
  },
};
