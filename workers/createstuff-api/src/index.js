// createstuff-api — the app-builder backend, on the account we actually control.
//
// Why this exists: production forge-api runs on a third Cloudflare account that
// has no API token on this machine, so it cannot be redeployed from here. This
// worker binds the same createstuff-db D1 and implements the contract that
// apps/createstuff-marketing/app.js already calls.
//
// Contract (verified against app.js before writing):
//   POST /api/auth/register {email,name,password} -> {token,user}
//   POST /api/auth/login    {email,password}      -> {token,user}
//   GET/POST/DELETE /api/projects
//   GET  /api/projects/:id/files            -> {files:[{path,file_path,size}]}
//   GET  /api/projects/:id/files/:path      -> {file_path,content}
//   POST /api/projects/:id/files {file_path,content}
//   POST /api/ai/generate {projectId,plan}  -> {files:[{path,content}],model,notes}
//   POST /api/ai/modify   {projectId,message}
//   POST /api/ai/publish  {projectId}       -> {publishUrl,checkpointId,state}
//   GET  /published/:id/:path               -> file bytes
//
// Every generate/modify/build first runs the request classifier (stage 0). A
// request this worker cannot carry out (log into an account, connect GitHub,
// deploy to a host we hold no credentials for) is answered with one plain
// paragraph and NO generated site; see the @classifier block below.
//
// NOTE app.js reads f.path in one place and f.file_path in another, so every
// file object carries BOTH keys. Only one file list route exists in app.js but
// it is used by two callers with different field names.

// SECRET: env.SESSION_SECRET when it is set; otherwise a per-isolate random key.
// This is NOT a solved problem, and the tradeoffs are real:
//   (a) with no binding, every deploy / restart / scale-to-zero mints a new key,
//       which invalidates EVERY outstanding token at once — builder tokens
//       (/api/auth/*) and app tokens (/app/:id/api/auth/*) alike. Re-login with
//       the same password always works, because password hashes are independent
//       of this value.
//   (b) with no binding, separate isolates hold separate keys, so a token minted
//       in one isolate can fail verification in another until the client logs in
//       again. That shows up as intermittent {user:null} / 401 on edge PoPs.
// Setting SESSION_SECRET in wrangler.toml [vars] or the dashboard removes both.
// Left unset on purpose here so a missing var cannot silently downgrade to a
// guessable constant.
// Where a published site's address is handed back to the user.
//
// `${url.origin}/published/<id>/...` works but reads like infrastructure:
//   https://createstuff-api.fashionistas1979.workers.dev/published/179/index.html
// — 76 characters, an account name in the middle, and it is the one string the
// user pastes to other people. The bytes still come from this worker at
// /published/:id/:path (every old link keeps working); the branded host is a
// separate Pages project, createstuff-sites, which proxies those same bytes.
// It has to be a SEPARATE origin: a published site is user-generated HTML and
// must never run on an origin that can read the builder's cs_token.
//
// sites.createstuff.ai is attached to that project and is the host we publish.
// The one CNAME it needed landed in the createstuff.ai zone on 2026-09-27
//   sites  CNAME  createstuff-sites.pages.dev  (proxied)   id d1de453269b1685ca98f174e8eee0316
// written with the user-issued DNS token `raspy-credit-99f5` (see .secrets/cf.env
// -> CF_DNS_TOKEN_CREATESTUFF); the three older tokens in that file still have no
// Zone.DNS:Edit and keep returning error 10000, so that one is the only writer.
// The Pages custom domain went active the same night. Both hosts serve the same
// files forever: the old pages.dev links keep working, this is the pretty one.
// Parsed by acorn (bundled with this worker) rather than by compiling a string:
// the Workers runtime refuses `new Function`, measured 2026-09-30 —
// `{"compiles":false}` from /api/syntax-probe — so there is no built-in way to
// ask "does this parse?" and a broken script would otherwise ship silently.
import { parse as acornParse } from "acorn";

const PUBLISH_HOST = "https://sites.createstuff.ai";

const enc = new TextEncoder();
let SECRET = null;
async function getSecret(env) {
  if (SECRET) return SECRET;
  if (env.SESSION_SECRET) {
    SECRET = new TextEncoder().encode(env.SESSION_SECRET);
  } else {
    const buf = new Uint8Array(32);
    crypto.getRandomValues(buf);
    SECRET = new TextEncoder().encode(b64s(buf));
  }
  return SECRET;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  // PATCH was missing here until 2026-09-29. Measured before: an OPTIONS
  // preflight from https://sites.createstuff.ai for `Access-Control-Request-Method: PATCH`
  // answered 200 with `allow-methods: GET, POST, PUT, DELETE, OPTIONS` — so the
  // browser blocked every update a published app tried to make, even though the
  // route below accepts PATCH. The list is what the browser checks, not the route.
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
const json = (d, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const err = (m, s = 400) => json({ error: m }, s);

// An expected, well-defined client condition must carry its own status instead
// of falling through to the catch-all 500: an oversized body is 413, a URL the
// client cannot express is 400, a repo that does not exist is 404. A 500 means
// *we* broke, so throwers below set `.status` and the top-level catch maps it.
// Genuine server faults keep throwing plain Errors and still return 500.
class HttpError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// ── passwords ────────────────────────────────────────────────────────────
// Existing rows in createstuff.db are `pbkdf2$100000$<salt-b64>$<key-b64>`,
// so this must match exactly or previously registered users cannot log in.
// Existing rows are `pbkdf2$100000$<salt-b64>$<key-b64>` in STANDARD base64
// (they contain +, / and == padding), so password material must not use the
// base64url alphabet or previously registered users cannot log in.
// b64s must accept BOTH raw bytes and text: new Uint8Array("...") silently
// returns an empty array, which is how the token body ended up blank.
const b64s = (buf) =>
  btoa(typeof buf === "string" ? buf : String.fromCharCode(...new Uint8Array(buf)));
const unb64s = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const b64u = (buf) => b64s(buf).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

async function pbkdf2(password, saltB64, iters = 100000) {
  const salt = saltB64 ? unb64s(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: iters },
    key,
    256
  );
  const saltOut = saltB64 || b64s(salt);
  return `pbkdf2$${iters}$${saltOut}$${b64s(bits)}`;
}

async function verifyPassword(password, stored) {
  try {
    const parts = String(stored || "").split("$");
    if (parts[0] !== "pbkdf2") return false;
    const iters = parseInt(parts[1], 10);
    const check = await pbkdf2(password, parts[2], iters);
    // constant-time compare
    if (check.length !== stored.length) return false;
    let diff = 0;
    for (let i = 0; i < check.length; i++) diff |= check.charCodeAt(i) ^ stored.charCodeAt(i);
    return diff === 0;
  } catch {
    return false;
  }
}

// ── sessions ─────────────────────────────────────────────────────────────
async function hmac(env, data) {
  const secret = await getSecret(env);
  const k = await crypto.subtle.importKey("raw", secret, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64u(await crypto.subtle.sign("HMAC", k, enc.encode(data)));
}
async function signToken(env, payload) {
  const body = b64u(JSON.stringify(payload));
  return `${body}.${await hmac(env, body)}`;
}
async function verifyToken(env, token) {
  try {
    const [body, sig] = String(token).split(".");
    const expect = await hmac(env, body);
    if (sig.length !== expect.length) return null;
    let diff = 0;
    for (let i = 0; i < expect.length; i++) diff |= sig.charCodeAt(i) ^ expect.charCodeAt(i);
    if (diff) return null;
    const p = JSON.parse(new TextDecoder().decode(unb64u(body)));
    return p.exp && p.exp > Date.now() ? p : null;
  } catch {
    return null;
  }
}
async function requireUser(request, env) {
  const t = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  return t ? await verifyToken(env, t) : null;
}

async function rateLimit(env, request, bucket, limit = 20, windowSec = 60) {
  try {
    const ip = request.headers.get("CF-Connecting-IP") || "x";
    const w = Math.floor(Date.now() / 1000 / windowSec);
    const k = `rl:${bucket}:${w}:${ip}`;
    const c = parseInt(await env.KV.get(k), 10) || 0;
    if (c >= limit) return false;
    await env.KV.put(k, String(c + 1), { expirationTtl: windowSec * 2 });
    return true;
  } catch { return true; }
}

// ── code generation ──────────────────────────────────────────────────────
// Three sources, tried in order:
//
//   1. The Hive relay — an OpenAI-compatible endpoint in front of OpenCode's
//      free model roster. Measured 2026-09-25: calling opencode.ai/zen/v1 from
//      inside a Cloudflare Worker returns HTTP 429 "FreeUsageLimitError" on
//      6/6 attempts (Zen rate-limits Cloudflare's egress ranges; four different
//      User-Agents all 429, so it is the IP, not the headers), while the same
//      call from a non-Cloudflare host returns HTTP 200 on 6/6. The relay sits
//      on an unblocked IP and itself fans out across all 8 free models with
//      failover, so one request here covers the whole roster.
//   2. Direct Zen — kept as a safety net if the relay is down.
//   3. Workers AI — last resort. Cloudflare's free tier caps it at 10,000
//      neurons/day; measured 2026-09-25 it returned
//      "4006: you have used up your daily free allocation" and every build died.
//
// HIVE_URL / HIVE_TOKEN are Worker secrets (wrangler secret put), so the relay
// hostname and token can rotate without a code deploy.
const ZEN_URL = "https://opencode.ai/zen/v1/chat/completions";
const CODE_MODELS = [
  "@cf/qwen/qwen2.5-coder-32b-instruct",
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "@cf/meta/llama-3.1-8b-instruct",
  "@cf/meta/llama-3.2-3b-instruct",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Every model call reports the tool it actually ran: name, endpoint, HTTP
// status, milliseconds. Errors carry the same object so a stage can say which
// endpoint answered badly instead of printing a canned sentence.
function withTool(msg, tool) {
  const e = new Error(msg);
  e.tool = tool;
  return e;
}

// One line of stage evidence: tool, endpoint, HTTP status, elapsed ms.
// A call that never reached HTTP (rules, a Worker binding) reports HTTP n/a.
function toolLine(t) {
  if (!t) return "tool=none endpoint=none HTTP n/a 0ms";
  const http = t.http === null || t.http === undefined ? "n/a" : String(t.http);
  const polls = t.polls === null || t.polls === undefined ? "" : ` polls=${t.polls}`;
  return `tool=${t.name || "unknown"} endpoint=${t.endpoint || "none"} HTTP ${http} ${Math.round(t.ms || 0)}ms${polls}`;
}

// Cloudflare's free plan refuses the 51st subrequest in one invocation —
// measured 2026-09-30, when build 136's missing-asset repair died on "Too many
// subrequests by single Worker invocation" and the whole build failed instead
// of repairing itself. HTTP fetches are the dominant cost (the relay is polled
// once per generation) and they are the only ones a Worker can see from
// JavaScript: D1, KV and R2 count against the same 50 but are not fetches, so
// `fetch=N` in the build note is a FLOOR on what the build spent, not the
// total. If the wrap itself is refused, the note says n/a rather than 0.
let FETCH_N = 0;
let FETCH_WRAPPED = false;
try {
  const realFetch = globalThis.fetch;
  if (typeof realFetch === "function") {
    globalThis.fetch = function (input, init) {
      FETCH_N++;
      return realFetch.call(this, input, init);
    };
    FETCH_WRAPPED = true;
  }
} catch (e) {
  FETCH_WRAPPED = false;
}

// One OpenAI-compatible call. `viaRelay` picks the Hive relay when configured.
//
// The relay is called ASYNCHRONOUSLY (start, then poll) rather than as one
// long POST, because there are two hard ceilings stacked in front of us:
//   · the quick tunnel answers HTTP 524 at ~126s   (measured 3/3)
//   · Cloudflare kills this Worker request at ~180s (measured HTTP 000 @180.87s)
// while a single generation takes 40-200s. A long-held connection cannot
// survive either, so every hop stays short and we poll instead.
async function openAiGen(env, model, system, user, maxTok, viaRelay) {
  const t0 = Date.now();
  const headers = { "Content-Type": "application/json" };
  if (viaRelay && env.HIVE_TOKEN) headers.Authorization = "Bearer " + env.HIVE_TOKEN;
  const messages = [{ role: "system", content: system }, { role: "user", content: user }];

  if (viaRelay) {
    if (!env.HIVE_URL) throw new Error("hive relay not configured");
    const relay = { name: "hive-relay", endpoint: env.HIVE_URL, http: null, ms: 0 };
    const start = await fetch(env.HIVE_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model, messages, max_tokens: maxTok, async: true,
        // Budget by size: the planner (<=1500 tokens) must return quickly so
        // the writer still has room. The writer asks for 16,000 tokens and a
        // three-file answer takes longer than the 110 s this used to allow —
        // build 142 was cut off by the relay at 100 s mid-answer and fell back
        // to a 10,534-char build where the relay one was 26,656. 130 s is still
        // short enough that the repair steps below (gated at 140-150 s from
        // start) remain reachable, and the worst case it opens — 6 s plan +
        // 130 s write + 90 s repair = ~226 s — sits under a build we have
        // already seen finish (142: 223,981 ms). The "180s Worker cap" this
        // comment used to claim was never reproduced; no such timeout exists.
        deadline_ms: maxTok <= 1500 ? 45000 : maxTok >= 16000 ? 130000 : 110000,
      }),
      signal: AbortSignal.timeout(20000),
    }).catch((e) => {
      relay.ms = Date.now() - t0;
      throw withTool("hive unreachable: " + String((e && e.message) || e), relay);
    });
    relay.http = start.status;
    relay.ms = Date.now() - t0;
    if (!start.ok) throw withTool("hive HTTP " + start.status + " on start", relay);
    const s = await start.json();
    if (!s.job_id) throw withTool("hive returned no job_id: " + JSON.stringify(s).slice(0, 120), relay);
    const jobUrl = String(env.HIVE_URL).replace(/\/v1\/chat\/completions\/?$/, "") + "/v1/jobs/" + s.job_id;
    relay.endpoint = jobUrl;

    const budget = Date.now() + (maxTok <= 1500 ? 60000 : maxTok >= 16000 ? 145000 : 125000);
    let last = "no poll yet";
    let polls = 0;
    // Backoff instead of a flat 3 s: the free plan allows 50 subrequests in
    // one invocation, a build makes 3-5 relay calls, and a flat 3 s poll on a
    // 70 s generation spends ~23 of them on that single call — which is what
    // pushed build 136's repair step over the cap. 2 s is sooner than the old
    // first poll, so short calls come back faster, and 15 s caps how long a
    // long one can make us wait.
    let wait = 2000;
    while (Date.now() < budget) {
      await sleep(wait);
      wait = Math.min(15000, Math.round(wait * 1.6));
      polls++;
      let j;
      try {
        const g = await fetch(jobUrl, { headers, signal: AbortSignal.timeout(15000) });
        relay.http = g.status;
        relay.ms = Date.now() - t0;
        if (!g.ok) { last = "poll HTTP " + g.status; continue; }
        j = await g.json();
      } catch (e) { last = "poll failed: " + String((e && e.message) || e); continue; }

      if (j.status === "done") {
        const text = String(j.content || "").trim();
        if (!text) { relay.polls = polls; throw withTool("hive job finished with empty content", relay); }
        relay.polls = polls;
        return { text, parsed: null, model: "hive/" + (j.model || model), backend: j.backend || "relay", tool: relay };
      }
      if (j.status === "failed") {
        relay.polls = polls;
        throw withTool("hive job failed: " + String(j.error || "").slice(0, 220), relay);
      }
      last = "running for " + Math.round((Date.now() - (j.started || Date.now())) / 1000) + "s";
    }
    relay.ms = Date.now() - t0;
    relay.polls = polls;
    throw withTool("hive job timed out after 150s (" + last + ")", relay);
  }

  // Direct Zen — a safety net for when the relay is down. It must fail fast:
  // at 10 minutes it hung this Worker all the way into the 180s cap.
  const direct = { name: "zen", endpoint: ZEN_URL, http: null, ms: 0 };
  const r = await fetch(ZEN_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ model, messages, max_tokens: maxTok, stream: false }),
    signal: AbortSignal.timeout(15000),
  }).catch((e) => {
    direct.ms = Date.now() - t0;
    throw withTool("zen unreachable: " + String((e && e.message) || e), direct);
  });
  direct.http = r.status;
  direct.ms = Date.now() - t0;
  if (!r.ok) throw withTool("zen HTTP " + r.status, direct);
  const j = await r.json().catch((e) => { throw withTool("zen body unreadable: " + String((e && e.message) || e), direct); });
  if (j && j.error) throw withTool("zen: " + String(j.error.message || "").slice(0, 120), direct);
  const text = String((j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || "").trim();
  if (!text) throw withTool("zen returned an empty response", direct);
  return { text, parsed: null, model: "zen/" + (j.model || model), backend: "direct", tool: direct };
}

// A promise that must not be allowed to hang its caller. Every remote model
// call in this file already carries an AbortSignal except env.AI.run, which has
// no timeout of its own — so the ONE backend with no deadline is the one at the
// end of the failover chain, where a hang is least recoverable: the relay has
// already burned 150s and Zen has already 429'd by the time we get there. Build
// 104 sat in that gap, 'running' for 453s having written 0 bytes, because a
// stalled last resort looks identical to a slow one.
function withTimeout(p, ms, label) {
  let t;
  const guard = new Promise((_, rej) => {
    t = setTimeout(() => rej(new Error(label + " timed out after " + Math.round(ms / 1000) + "s")), ms);
  });
  // If the guard wins, the abandoned call must not surface later as an
  // unhandled rejection that would take down the Worker instead of the build.
  Promise.resolve(p).catch(() => {});
  return Promise.race([p, guard]).finally(() => clearTimeout(t));
}

// Groq, called straight from this Worker: a cloud provider, so a build no longer
// depends on the laptop relay (quick tunnel -> hive-relay.js on the owner's
// machine), which dies whenever that machine sleeps and changes URL on restart.
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
async function groqGen(env, system, user, maxTok) {
  let last = null;
  for (const m of [
    { model: "llama-3.3-70b-versatile", max_tokens: Math.min(maxTok, 30000) },
    { model: "openai/gpt-oss-120b", max_tokens: Math.min(maxTok + 2000, 30000), reasoning_effort: "low" },
  ]) {
    const t0 = Date.now();
    const tool = { name: "groq", endpoint: GROQ_URL + "#" + m.model, http: null, ms: 0 };
    try {
      const call = () => fetch(GROQ_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + env.GROQ_API_KEY },
        body: JSON.stringify({ ...m, temperature: 0.3, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
        signal: AbortSignal.timeout(110000),
      });
      // The free tier caps tokens per minute; a build's classify/plan/write/repair
      // steps can trip it. Wait the few seconds Groq asks for instead of failing over.
      let r = await call();
      for (let i = 0; i < 2 && r.status === 429; i++) {
        const wait = Math.min(20, Math.max(2, Number(r.headers.get("retry-after")) || 8));
        await sleep(wait * 1000);
        r = await call();
      }
      tool.http = r.status; tool.ms = Date.now() - t0;
      const j = await r.json().catch(() => null);
      if (!r.ok) { last = withTool("groq " + m.model + " HTTP " + r.status + ": " + String(j?.error?.message || "").slice(0, 120), tool); continue; }
      const text = String(j?.choices?.[0]?.message?.content || "").trim();
      if (!text) { last = withTool("groq " + m.model + " returned an empty response", tool); continue; }
      return { text, parsed: null, model: "groq/" + m.model, backend: "groq", tool };
    } catch (e) {
      tool.ms = Date.now() - t0;
      last = withTool("groq " + m.model + ": " + String((e && e.message) || e), tool);
    }
  }
  throw last;
}

const gen = async (env, system, user, maxTok = 8000) => {
  let last = null;
  // 0. Cloud first (CLOUD_FIRST=1): Groq from this Worker, no laptop involved.
  if (env.GROQ_API_KEY && env.CLOUD_FIRST === "1") {
    try { return await groqGen(env, system, user, maxTok); }
    catch (e) { last = e; }
  }
  // 1. the Hive relay (one call — it already fails over across all 8 free models)
  if (env.HIVE_URL && env.RELAY_OFF !== "1") {
    try { return await openAiGen(env, "space-bunny-free", system, user, maxTok, true); }
    catch (e) { last = e; }
  }
  // 1b. Groq as a fallback when the cloud-first switch is off.
  if (env.GROQ_API_KEY && env.CLOUD_FIRST !== "1") {
    try { return await groqGen(env, system, user, maxTok); }
    catch (e) { last = e; }
  }
  // 2. direct Zen, in case the relay is down
  for (const model of ["space-bunny-free", "mimo-v2.6-flash-free", "nemotron-3.5-lightning-free"]) {
    try { return await openAiGen(env, model, system, user, maxTok, false); }
    catch (e) { last = e; }
  }
  // 3. Workers AI
  for (const model of CODE_MODELS) {
    const t0 = Date.now();
    const tool = { name: "workers-ai", endpoint: "cf://ai/" + model, http: null, ms: 0 };
    try {
      const r = await withTimeout(env.AI.run(model, {
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        // The free Workers AI models cap far below the 16k the writer now
        // asks of the relay; passing it through would reject the call, and
        // this is the last fallback in the chain.
        max_tokens: Math.min(maxTok, 8000),
      }), 90000, "workers-ai");
      tool.ms = Date.now() - t0;
      const resp = r ? r.response : null;
      if (Array.isArray(resp)) return { text: JSON.stringify(resp), parsed: resp, model, tool };
      const text = String(resp == null ? "" : resp).trim();
      if (!text) { last = withTool(model + " returned an empty response", tool); continue; }
      return { text, parsed: null, model, tool };
    } catch (e) {
      tool.ms = Date.now() - t0;
      last = (e && e.tool) ? e : withTool(String((e && e.message) || e), tool);
    }
  }
  throw last || new Error("no model available");
};

function normalizeFiles(arr) {
  const out = [];
  for (const f of Array.isArray(arr) ? arr : []) {
    if (!f || typeof f !== "object") continue;
    const path = String(f.path || f.file_path || "").trim().replace(/^\/+/, "");
    const content = typeof f.content === "string" ? f.content : "";
    if (!path || !content) continue;
    out.push({ path, content });
  }
  return out;
}

// Real output is routinely a JSON array whose closing "]" was cut off, or is
// wrapped in markdown fences. Salvage every object that parses.
function salvageArray(text) {
  const files = [];
  const at = text.indexOf("[");
  if (at < 0) return files;
  let depth = 0, objStart = -1, inStr = false, esc = false;
  for (let i = at + 1; i < text.length; i++) {
    const c = text[i];
    if (esc) { esc = false; continue; }
    if (inStr) {
      if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === "{") { if (depth === 0) objStart = i; depth++; continue; }
    if (c === "}") {
      if (depth > 0) depth--;
      if (depth === 0 && objStart >= 0) {
        try { files.push(...normalizeFiles([JSON.parse(text.slice(objStart, i + 1))])); } catch { /* torn */ }
        objStart = -1;
      }
      continue;
    }
    if (c === "]" && depth === 0) break;
  }
  return files;
}

function extractFiles(g) {
  if (!g) return [];
  if (Array.isArray(g.parsed)) {
    const f = normalizeFiles(g.parsed);
    if (f.length) return f;
  }
  let text = String(g.text || "").trim();
  if (!text) return [];
  text = text.replace(/^```[a-zA-Z]*\s*/, "").replace(/\s*```\s*$/, "").trim();
  const at = text.indexOf("[");
  if (at < 0) return [];
  const seg = text.slice(at);
  const attempts = [seg, seg.replace(/,\s*$/, "") + "]", seg.replace(/[\}\s]*$/, "") + "]"];
  for (const a of attempts) {
    try { const f = normalizeFiles(JSON.parse(a)); if (f.length) return f; } catch { /* next */ }
  }
  return salvageArray(text);
}

function finalizeFiles(files) {
  const clean = files.filter((f) => f && typeof f.content === "string" && f.content.trim()).slice(0, 12);
  if (!clean.length) return [];
  if (!clean.some((f) => /(^|\/)index\.html?$/i.test(f.path))) {
    const html = clean.find((f) => /\.html?$/i.test(f.path));
    if (html) html.path = "index.html";
  }
  return clean;
}

// A build is only real if it produced a substantial index.html. Anything else
// is reported as a failure rather than shipped as a success.
// Turns the rows the version query returns (oldest first) into exactly what the
// builder's panel renders: listed newest-first, numbered oldest-first, with the
// version you are on flagged so it cannot be "gone back to". Exported so this
// numbering is testable without a Worker runtime — an off-by-one here would
// put the wrong row behind "Go back to this".
export function versionsPayload(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const latestId = list.length ? list[list.length - 1].id : null;
  return list.slice().reverse().map((b, i) => {
    let codeLen = 0;
    try {
      codeLen = (JSON.parse(b.generated_code) || [])
        .reduce((n, f) => n + String((f && f.content) || "").length, 0);
    } catch { codeLen = String(b.generated_code || "").length; }
    return {
      id: b.id,
      version: list.length - i, // ascending number even though we list descending
      current: b.id === latestId,
      note: String(b.prompt || "").replace(/\s+/g, " ").trim().slice(0, 90),
      code_len: codeLen,
      created_at: b.completed_at || b.started_at,
    };
  });
}

function siteOk(files) {
  const idx = files.find((f) => /(^|\/)index\.html?$/i.test(f.path));
  return !!idx && idx.content.length >= 400 && /<html[\s>]/i.test(idx.content);
}

// Output-quality gate. The model is told not to emit boilerplate; this catches
// the cases where it does anyway so the defect is visible in `notes` instead of
// silently shipping a workout tracker with a contact form in it.
// Files an HTML document links that were never written. CODE_SYS demands
// index.html + styles.css + script.js, but a long answer can come back cut
// short and extractFiles salvages whatever survived — which can be index.html
// on its own. Publishing that ships a page whose stylesheet and script both
// 404: it renders unstyled with no behaviour, and is reported to the user as a
// success. Only real assets are counted, never links to other pages, so a nav
// anchor or a section link can never fail a build.
const ASSET_EXT = /\.(css|mjs|js|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf|eot|mp4|webm|mp3|json|xml|txt|pdf)$/i;
function missingAssets(files) {
  const list = Array.isArray(files) ? files : [];
  const idx = list.find((f) => /(^|\/)index\.html?$/i.test(f.path));
  if (!idx) return [];
  const have = new Set(list.map((f) => String(f.path).replace(/^\.?\//, "")));
  const out = [];
  const re = /(?:href|src)\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(String(idx.content || "")))) {
    let r = String(m[1] || "").trim();
    if (!r || /^(https?:|\/\/|data:|mailto:|tel:|javascript:|about:|blob:|#)/i.test(r)) continue;
    r = r.split("#")[0].split("?")[0].replace(/^\.?\//, "");
    if (!r || !ASSET_EXT.test(r)) continue;
    if (!have.has(r) && !out.includes(r)) out.push(r);
  }
  return out;
}

// Only high-confidence, low-false-positive checks are included.
function qualityFlags(files, plan) {
  const idx = files.find((f) => /(^|\/)index\.html?$/i.test(f.path));
  if (!idx) return [];
  const html = idx.content;
  const js = files.filter((f) => /\.js$/i.test(f.path)).map((f) => f.content).join("\n");
  const brief = String(plan || "").toLowerCase();
  const flags = [];

  // A contact form on a brief that never mentioned getting in touch.
  const asksForContact = /\b(contact|email us|get in touch|reach out|enquiry|inquiry|booking|book now|message us)\b/.test(brief);
  // Only a real <form> counts. A bare id="contact" is normally a nav anchor or
  // a "where to find us" section — the live bakery build was flagged for
  // exactly that with zero <form> tags in the document, and the false flag
  // both lied in `notes` and spent a repair pass fixing nothing.
  const hasContactForm = /<form[\s>]/i.test(html) &&
    (/<form[^>]*(?:contact|message)[^>]*>/i.test(html) || /id="contact"/i.test(html) || /action="mailto:/i.test(html));
  if (hasContactForm && !asksForContact) flags.push("irrelevant-contact-form");

  // Marketing sections a tool brief never asked for.
  const asksForSocialProof = /\b(testimonial|review|pricing|price plan|newsletter|blog|faq)\b/.test(brief);
  const hasSocialProof = /<h[1-4][^>]*>\s*(?:Testimonials|What our customers say|Pricing|Pricing plans|Frequently Asked Questions|FAQs|Subscribe|Newsletter)\s*<\//i.test(html);
  if (hasSocialProof && !asksForSocialProof) flags.push("irrelevant-marketing-section");

  // Hardcoded past copyright year (template residue).
  const year = new Date().getUTCFullYear();
  const hardcodedYear = /©|&copy;/i.test(html) && new RegExp(`(?:©|&copy;)\\s*(20\\d{2})`, "i").exec(html);
  if (hardcodedYear && Number(hardcodedYear[1]) < year && !/getFullYear\(\)/.test(js)) {
    flags.push(`stale-copyright-${hardcodedYear[1]}`);
  }

  // Duplicate id="..." values. getElementById() returns the FIRST match, so a
  // document carrying <input id="email"> in both a sign-in form and a register
  // form submits the wrong one: measured on a live build (project 245,
  // 2026-09-29) the register handler read the sign-in form's empty email field,
  // so every first-time visitor's sign-up sent an empty address. This is a
  // broken feature wearing valid-looking markup, which is why it is a flag.
  const idSeen = Object.create(null);
  for (const m of html.matchAll(/\sid="([^"]+)"/gi)) idSeen[m[1]] = (idSeen[m[1]] || 0) + 1;
  const dupIds = Object.keys(idSeen).filter((k) => idSeen[k] > 1);
  if (dupIds.length) flags.push(`duplicate-id:${dupIds.slice(0, 4).join(",")}`);

  if (/lorem ipsum|your text here|\[\s*(?:heading|title|text|copy)\s*\]/i.test(html)) flags.push("placeholder-text");

  // Generic template hero.
  if (/<h1[^>]*>\s*Welcome to /i.test(html)) flags.push("generic-welcome-hero");
  if (/All rights reserved/i.test(html)) flags.push("all-rights-reserved-boilerplate");

  // A list that renders rows but tells the user nothing when it is empty.
  const rendersList = /\b(render|innerHTML)\s*=|\.map\(/.test(js);
  const hasEmptyState = /no\s+\w+\s+(?:yet|found|items)|add your (?:first|new)|nothing (?:yet|here)|get started by|is empty|empty-state|placeholder-empty/i.test(html + js);
  if (rendersList && !hasEmptyState) flags.push("missing-empty-state");

  return flags;
}

// Does this script parse? The rule verifier reads markup; it is blind to the
// fact that the generated JavaScript does not compile, and one bad line kills
// every handler in the file at once. Measured: project 247 (2026-09-30) shipped
// `const dark=try{...}catch(e){false}` — a build reported "quality=clean",
// published, and opened with appInit undefined, no sign-up handler and no list
// load, i.e. a page where nothing worked at all.
//
// Parsed, never executed. sourceType "script" is what a browser uses for the
// plain <script src> these builds emit, so a top-level await or return is
// flagged exactly as the browser would flag it. Files that begin a line with
// import/export are skipped: they need a module context and are not what this
// pipeline writes.
function jsSyntaxError(src) {
  if (typeof src !== "string" || !src.trim()) return null;
  if (/^\s*(?:import|export)\s/m.test(src)) return null;
  try {
    acornParse(src, { ecmaVersion: 2022, sourceType: "script" });
    return null;
  } catch (e) {
    return e instanceof SyntaxError ? String((e && e.message) || e).slice(0, 200) : null;
  }
}

// ── form handlers that let the browser reload the page ─────────────────────
// Without preventDefault the browser does what it always does with a form:
// submit it as a GET to itself, navigating away and killing the request the
// handler had just started. Measured on project 248 (2026-09-30): the sign-up
// handler read the fields, began the register call, and the page reloaded
// before it could answer — no account, no message, no error.
// Resolution is heuristic (inline body, e=>callee(), or a bare handler name,
// plus one level of delegation), so an unresolvable binding is silently
// skipped and the verdict is advisory, never fatal.
function sliceBraces(src, at) {
  let depth = 0;
  for (let i = at; i < src.length; i++) {
    const c = src[i];
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) return src.slice(at, i + 1); }
  }
  return null;
}
function fnBody(src, name) {
  const esc = String(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pats = [
    new RegExp("(?:^|[^\\w$.])function\\s+" + esc + "\\s*\\([^)]*\\)\\s*\\{"),
    new RegExp("(?:^|[^\\w$.])" + esc + "\\s*=\\s*(?:async\\s+)?function\\s*\\([^)]*\\)\\s*\\{"),
    new RegExp("(?:^|[^\\w$.])" + esc + "\\s*=\\s*(?:async\\s*)?\\([^)]*\\)\\s*=>\\s*\\{"),
    new RegExp("(?:^|[^\\w$.])" + esc + "\\s*=\\s*(?:async\\s+)?[A-Za-z_$][\\w$]*\\s*=>\\s*\\{"),
  ];
  for (const p of pats) {
    const m = p.exec(src);
    if (!m) continue;
    const at = src.indexOf("{", m.index);
    if (at < 0) continue;
    const b = sliceBraces(src, at);
    if (b) return b;
  }
  return null;
}
function calleesPrevent(js, body) {
  const ids = new Set();
  for (const mm of body.matchAll(/(?:^|[^\w$.])([A-Za-z_$][\w$]*)\s*\(/g)) ids.add(mm[1]);
  for (const n of ids) {
    const b = fnBody(js, n);
    if (b && /preventDefault/.test(b)) return true;
  }
  return false;
}
function submitNoPreventDefault(js) {
  if (!/addEventListener\(\s*['"]submit['"]/.test(js)) return [];
  const out = [];
  const seen = new Set();
  const add = (label) => { if (!seen.has(label)) { seen.add(label); out.push(label); } };
  const re = /addEventListener\(\s*['"]submit['"]\s*,\s*/g;
  let m;
  while ((m = re.exec(js))) {
    const rest = js.slice(m.index + m[0].length);
    const t = rest.trimStart();
    if (/^(?:async\s+)?(?:function\b|\()/.test(t)) {
      const at = rest.indexOf("{");
      const body = at >= 0 ? sliceBraces(rest, at) : null;
      if (body && !/preventDefault/.test(body) && !calleesPrevent(js, body)) add("inline-handler");
      continue;
    }
    const arrow = /^([A-Za-z_$][\w$]*)\s*=>\s*([A-Za-z_$][\w$]*)\s*\(/.exec(t);
    const named = /^([A-Za-z_$][\w$]*)/.exec(t);
    const target = arrow ? arrow[2] : named ? named[1] : null;
    if (!target) continue;
    const body = fnBody(js, target);
    if (body && !/preventDefault/.test(body) && !calleesPrevent(js, body)) add(target);
  }
  return out;
}

// The helper and its call sites must agree. If const $ = id => document.getElementById(id)
// then $('.menu-button') is always null — getElementById does not understand class
// selectors — and `.addEventListener` on null throws on the FIRST such line, so every
// handler defined after it in the same function never attaches (project 248,
// 2026-09-30: book-form, login-form, register-form, logout and theme all died behind
// one `$('.menu-button')`, and the surrounding try/catch hid it from the console).
// The mirror case — a querySelector helper handed a bare 'id' — looks for a tag and
// misses the element for the same reason.
function helperStyle(js) {
  const m = /(?:const|let|var)\s+\$\s*=\s*\(?\s*[A-Za-z_$][\w$]*\s*\)?\s*=>\s*document\.(getElementById|querySelector)\b/.exec(js);
  return m ? m[1] : null;
}
function selectorMismatches(js) {
  const style = helperStyle(js);
  if (!style) return [];
  const out = new Set();
  const re = /\$\(\s*['"]([^'"]+)['"]\s*\)/g;
  let m;
  while ((m = re.exec(js))) {
    const arg = m[1];
    const plainId = /^[\w-]+$/.test(arg);
    if (style === "getElementById" && plainId) continue;
    if (style === "querySelector" && !plainId) continue;
    out.add("$('" + arg + "') via " + style);
  }
  return [...out];
}

// The submit listener hands the EVENT to a helper whose first parameter is named
// `form`, and that helper then calls form-only methods on it. Measured on
// project 249 (2026-09-30): e=>authHandler(e,'login') reached
// `async function authHandler(form,type){ form.querySelector(…) }`, threw
// "TypeError: form.querySelector is not a function" on every submit, and
// sign-in plus sign-up did nothing at all — while the build reported
// "quality=clean". Events have no querySelector/reportValidity/reset; only the
// bare event identifier counts as a giveaway (e.currentTarget means the handler
// already knows what it is doing), and an inline handler is skipped because it
// sees the event directly.
function eventAsForm(js) {
  if (!/addEventListener\(\s*['"]submit['"]/.test(js)) return [];
  const out = [];
  const seen = new Set();
  const re = /addEventListener\(\s*['"]submit['"]\s*,\s*/g;
  let m;
  while ((m = re.exec(js))) {
    const rest = js.slice(m.index + m[0].length);
    const t = rest.trimStart();
    let target = null;
    let passesEvent = false;
    const arrow = /^([A-Za-z_$][\w$]*)\s*=>\s*([A-Za-z_$][\w$]*)\s*\(/.exec(t);
    if (arrow) {
      target = arrow[2];
      const open = t.indexOf("(");
      const firstArg = /^\s*([A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*)/.exec(t.slice(open + 1));
      passesEvent = !!firstArg && /^(?:e|evt|event|ev)$/.test(firstArg[1].replace(/\s/g, ""));
    } else if (/^(?:async\s+)?(?:function\b|\()/.test(t)) {
      continue; // inline handler: it is written against the event it receives
    } else {
      const bare = /^([A-Za-z_$][\w$]*)\s*[,)]/.exec(t);
      if (!bare) continue;
      target = bare[1];
      passesEvent = true; // addEventListener('submit', fn) hands fn the event
    }
    if (!target || !passesEvent || seen.has(target)) continue;
    seen.add(target);
    const body = fnBody(js, target);
    if (!body) continue;
    const esc = target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Both alternatives must name the function: an unanchored one matches the
    // first "name=(" anywhere in the file (measured: it found "search=($" and
    // read the parameter list as "$", so the check silently never fired).
    const pm = new RegExp(
      "(?:function\\s+" + esc + "\\s*\\(\\s*|" + esc + "\\s*=\\s*(?:async\\s+)?(?:function\\s*)?\\(\\s*)([A-Za-z_$][\\w$]*)"
    ).exec(js);
    const param = pm && pm[1];
    if (!param) continue;
    // Deriving the form from the event is the correct fix — leave it alone.
    if (new RegExp("\\b" + param + "\\.(?:currentTarget|target)\\b").test(body)) continue;
    const pesc = param.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (
      new RegExp(
        "\\b" + pesc + "\\.(?:querySelector|querySelectorAll|reportValidity|checkValidity|reset|elements)\\s*\\("
      ).test(body)
    ) {
      out.push(target);
    }
  }
  return out;
}

// A mode the code branches on but no caller ever passes. Measured on project
// 250 (2026-09-30): the Create-account tab called showAuth('signup'), which
// un-hid the name field and renamed the button, while the form stayed bound to
// authHandler(e,'login') — so "Create account" POSTed /auth/login, the server
// answered "unknown email", and no account was ever created even though
// every line of signup code was present and correct. The branch on
// type==='signup' was unreachable from the visitor's side of the screen.
// Only functions that a real event listener reaches are considered, and only
// after at least one call site with a literal has been found, so an uncalled
// helper cannot produce a flag.
function unreachableMode(js) {
  if (!/addEventListener\(\s*['"](?:submit|click|change|input)['"]/.test(js)) return [];
  const out = [];
  const seenFn = new Set();

  // Listener-reachable functions, plus one level down: the mode may be carried
  // by a helper the listener's handler calls rather than by the handler itself.
  const roots = new Set();
  const re = /addEventListener\(\s*['"](?:submit|click|change|input)['"]\s*,\s*/g;
  let m;
  const addFrom = (t) => {
    const arrow = /^([A-Za-z_$][\w$]*)\s*=>\s*([A-Za-z_$][\w$]*)\s*\(/.exec(t);
    if (arrow) { roots.add(arrow[2]); return; }
    const bare = /^([A-Za-z_$][\w$]*)\s*[,)]/.exec(t);
    if (bare) { roots.add(bare[1]); return; }
    const at = t.indexOf("{");
    if (at < 0) return;
    const body = sliceBraces(t, at);
    if (!body) return;
    for (const c of body.matchAll(/(?:^|[^\w$.])([A-Za-z_$][\w$]*)\s*\(/g)) roots.add(c[1]);
  };
  while ((m = re.exec(js))) addFrom(js.slice(m.index + m[0].length).trimStart());
  const depth1 = new Set();
  for (const r of roots) {
    const b = fnBody(js, r);
    if (!b) continue;
    for (const c of b.matchAll(/(?:^|[^\w$.])([A-Za-z_$][\w$]*)\s*\(/g)) depth1.add(c[1]);
  }
  const reach = new Set([...roots, ...depth1]);

  // Every call site of a reachable function, arguments split POSITIONALLY by a
  // small quote-aware scanner so a ")" or a "," inside a string cannot cut them
  // short. The declaration is skipped: `function f(a,b)` is not a call, and its
  // own parameter names would read back as unknown arguments.
  const callsOf = (name) => {
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp("(?:^|[^\\w$.])" + esc + "\\s*\\(", "g");
    const all = [];
    let c;
    while ((c = re.exec(js))) {
      const nameStart = c.index + c[0].length - 1 - name.length;
      const pre = js.slice(Math.max(0, nameStart - 16), nameStart);
      if (/(?:function\s+|=\s*(?:async\s+)?|:\s*(?:async\s+)?)$/.test(pre)) continue;
      const start = js.indexOf("(", nameStart + name.length);
      if (start < 0) continue;
      let depth = 0, quote = null, arg = "";
      const args = [];
      for (let i = start; i < js.length; i++) {
        const ch = js[i];
        if (quote) {
          if (ch === "\\" && i + 1 < js.length) { arg += ch + js[i + 1]; i++; continue; }
          if (ch === quote) quote = null;
          arg += ch;
          continue;
        }
        if (ch === "'" || ch === '"' || ch === "`") { quote = ch; arg += ch; continue; }
        if (ch === "(") { depth++; if (depth > 1) arg += ch; continue; }
        if (ch === ")") {
          depth--;
          if (depth === 0) { args.push(arg); break; }
          if (depth > 0) arg += ch;
          continue;
        }
        if (depth === 1 && ch === ",") { args.push(arg); arg = ""; continue; }
        if (depth >= 1) arg += ch;
      }
      all.push(args);
    }
    return all;
  };

  // Reachable only means worth reading. What makes a branch provably dead is
  // the VALUE at that parameter position: if every caller passes a literal and
  // none of them passes the one the branch wants, the branch cannot run. The
  // moment any caller hands over a variable the check stands down, because a
  // variable can hold anything — measured both ways: project 250's
  // authHandler(e,'login') passed a literal and the 'signup' branch was dead,
  // while project 252's statusLabel(book.status || 'reading') reaches
  // 'finished' through the data and must NOT be flagged (it was, before this
  // position-aware rewrite).
  for (const name of reach) {
    if (seenFn.has(name)) continue;
    seenFn.add(name);
    const decl = new RegExp("(?:function\\s+" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\()([^)]*)\\)").exec(js);
    if (!decl) continue;
    const params = decl[1].split(",").map((s) => s.trim()).filter((s) => /^[A-Za-z_$][\w$]*$/.test(s));
    if (!params.length) continue;
    const body = fnBody(js, name);
    if (!body) continue;
    const calls = callsOf(name).filter((a) => a.length);
    if (!calls.length) continue;
    for (let i = 0; i < params.length; i++) {
      const p = params[i];
      const compared = new Set();
      const pesc = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const fwd = new RegExp("\\b" + pesc + "\\s*([!=])==?\\s*['\"]([^'\"]+)['\"]", "g");
      const rev = new RegExp("['\"]([^'\"]+)['\"]\\s*([!=])==?\\s*\\b" + pesc + "\\b", "g");
      let mm;
      while ((mm = fwd.exec(body))) compared.add(mm[2]);
      while ((mm = rev.exec(body))) compared.add(mm[1]);
      if (!compared.size) continue;
      const lits = new Set();
      let unknown = false;
      let counted = 0;
      for (const args of calls) {
        const raw = i < args.length ? String(args[i]).trim() : "";
        if (!raw) continue; // argument omitted: passes undefined, not a value
        counted++;
        const lit = /^['"]([^'"]*)['"]$/.exec(raw);
        if (lit) lits.add(lit[1]);
        else unknown = true;
      }
      if (!counted || !lits.size || unknown) continue;
      for (const lit of compared) if (!lits.has(lit)) out.push(`${name}:${lit}`);
    }
  }
  return [...new Set(out)];
}

// A handler-attachment function that nothing calls is invisible to every other
// check: the file parses, the markup is right, and yet no submit handler ever
// attaches. Project 248's wire() is invoked but throws mid-way for a different
// reason (see selectorMismatches above); this is the sibling case where nothing
// invokes it at all. Only a small set of conventional wiring names is
// considered, and the verdict is advisory: a name heuristic must never be able
// to refuse a build that actually works.
const WIRING_NAMES = new Set([
  "wire", "wireUp", "wireup", "wireEvents", "bindEvents", "bindHandlers",
  "attachEvents", "setup", "initHandlers", "bindAll",
]);
function unwiredHandlers(src) {
  if (typeof src !== "string") return [];
  const out = [];
  const decl = /(?:^|[^\w$])function\s+([A-Za-z_$][\w$]*)\s*\(/g;
  const seen = new Set();
  let m;
  while ((m = decl.exec(src))) {
    const name = m[1];
    if (seen.has(name)) continue;
    seen.add(name);
    if (!WIRING_NAMES.has(name)) continue;
    // Every occurrence followed by "(" — the declaration itself counts as one,
    // so zero call sites means exactly one match.
    const calls = (src.match(new RegExp("(?:^|[^\\w$.])" + name + "\\s*\\(", "g")) || []).length;
    if (calls <= 1) out.push(name);
  }
  return out;
}

// Models reach for via.placeholder.com / picsum / placehold.co even when told
// not to. Those requests fail (or flash a grey box) and make the site look
// broken, so every external image reference is replaced with CSS art that
// always renders. Google Fonts and inline/data URIs are left alone.
const GRADIENTS = [
  "linear-gradient(135deg,#ff8a3d 0%,#ff4e3a 50%,#c05cff 100%)",
  "linear-gradient(135deg,#0f2027 0%,#203a43 50%,#2c5364 100%)",
  "linear-gradient(135deg,#f7971e 0%,#ffd200 100%)",
  "linear-gradient(135deg,#43cea2 0%,#185a9d 100%)",
  "linear-gradient(135deg,#654ea3 0%,#eaafc8 100%)",
];
function hashIdx(s, mod) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % mod;
}
function isExternalImg(u) {
  return /^(https?:)?\/\//i.test(u) && !/(fonts\.googleapis|fonts\.gstatic)/i.test(u);
}
function sanitizeAssets(files) {
  let replaced = 0;
  for (const f of files) {
    let c = f.content;
    if (f.path.endsWith(".html")) {
      // <img src="https://..."> → a gradient panel with the alt text
      c = c.replace(/<img([^>]*?)src\s*=\s*["']([^"']+)["']([^>]*)>/gi, (m, pre, src, post) => {
        if (!isExternalImg(src)) return m;
        replaced++;
        const alt = (m.match(/alt\s*=\s*["']([^"']*)["']/i) || [])[1] || "";
        const g = GRADIENTS[hashIdx(src + alt, GRADIENTS.length)];
        return `<div role="img" aria-label="${alt.replace(/"/g, "")}" style="background:${g};min-height:220px;width:100%;display:block"></div>`;
      });
      // background-image:url(https://...) inside inline styles / <style>
      c = c.replace(/background(-image)?\s*:\s*url\(\s*['"]?(\/\/[^'")]+|https?:\/\/[^'")]+)['"]?\s*\)/gi, (m, _p, u) => {
        replaced++;
        return `background-image:none;background-color:transparent;background:${GRADIENTS[hashIdx(u, GRADIENTS.length)]}`;
      });
    } else if (f.path.endsWith(".css")) {
      c = c.replace(/background(-image)?\s*:\s*url\(\s*['"]?(\/\/[^'")]+|https?:\/\/[^'")]+)['"]?\s*\)/gi, (m, _p, u) => {
        replaced++;
        return `background-image:none;background:${GRADIENTS[hashIdx(u, GRADIENTS.length)]}`;
      });
      // absolutely-positioned decorative <img> stand-ins via content:""
      c = c.replace(/content\s*:\s*url\(\s*['"]?(https?:\/\/[^'")]+|\/\/[^'")]+)['"]?\s*\)/gi, (m, u) => {
        replaced++;
        return `content:"";background:${GRADIENTS[hashIdx(u, GRADIENTS.length)]}`;
      });
    } else if (f.path.endsWith(".js")) {
      // external image URLs assigned at runtime
      c = c.replace(/(["'])(https?:\/\/[^"']+\.(?:png|jpe?g|webp|gif|svg)[^"']*)\1/gi, (m, q, u) => {
        replaced++;
        return `${q}data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='500'%3E%3Crect width='800' height='500' fill='%23${["ff8a3d", "203a43", "ffd200", "185a9d", "eaafc8"][hashIdx(u, 5)]}'/%3E%3C/svg%3E${q}`;
      });
    }
    if (c !== f.content) f.content = c;
  }
  return replaced;
}

const CODE_SYS = `You are a senior front-end engineer. Build ONE complete, polished website per request in plain HTML + CSS + vanilla JS. No frameworks, no build step, no CDN beyond Google Fonts.

OUTPUT EXACTLY 3 FILES
"index.html" — a full document: <!DOCTYPE html>, <head> with <link rel="stylesheet" href="styles.css">, <body>, <script src="script.js"></script> at the end of body.
"styles.css" — every visual rule.
"script.js" — every interaction. It must run without throwing.

YOUR APP COMES WITH A DATABASE AND REAL USER ACCOUNTS.
The page is handed its own backend when it is served: window.__APP. Use it exactly as written below — that helper builds the URL, carries the sign-in token and reads the response for you.

  const API = window.__APP;                          // never type a host, never type a project id

  const who = await API.me();                       // signed-in user object, or null when signed out
  await API.register("sam@example.com", "hunter22"); // a first-time visitor creates an account
  await API.login("sam@example.com", "hunter22");
  await API.logout();

  await API.create("reading-list", { title: "Dune", author: "Herbert" })  // saved as theirs, automatically
  const { items } = await API.list("reading-list", true)                  // true = only mine
  const { items: everyone } = await API.list("reading-list")              // omitted = all rows, for a guestbook

  // list(col, true) with nobody signed in answers the PUBLIC rows instead of throwing,
  // so a page always renders something on first open — never code around a 401 here.
  await API.update("reading-list", id, { done: true })                    // needs a signed-in user
  await API.remove("reading-list", id)                                    // needs a signed-in user

list() answers {items:[…]}, create()/update() answer {item:{…,id:n}}, register()/login() resolve to {user:{id,email,name}, token}. Read the name as the nested user's, e.g. const d = await API.register(e,p,n); show d.user.name. Every call returns the server's JSON or THROWS an Error carrying the server's own message — await it inside try/catch and show that message to the visitor.

Do not write your own fetch() for any of this. The helper is the contract: it is what carries the token, and a request you hand-build will silently save a row that belongs to nobody.

If window.__APP is missing (a file opened from disk), fall back to localStorage rather than throwing.

RULES THAT HAVE FAILED IN A REAL BUILD — DO NOT REPEAT THEM:
- NO SIGN-IN WITHOUT SIGN-UP. If the app signs anyone in, the same screen offers "Create account" (API.register) as a real form — inputs plus a submit button — never a button that opens prompt() dialogs. A sign-in form with no way to create an account locks out every first-time visitor.
- Save through API.create, never a bare fetch. A row saved without the token does not show up in list(x, true) after a refresh — which is the entire feature.
- Anything that must still be there tomorrow goes in the database. localStorage is for UI preferences only (theme, current tab, "don't show this again").
- Never claim a save succeeded before the call resolves.
- Name your startup function EXACTLY appInit: function appInit(){ ...fetch and render saved rows... }. It is called for you when the page is ready — DEFINE it, do not call it yourself (calling it too runs your startup twice). Decide signed-in state by the value of const who = await API.me() — a user object, or null when signed out. A list that only loads after a click is empty for everyone who reloads.
- NO window.prompt() FOR INPUT AND NO alert() FOR MESSAGES. Both are blocked in the preview frame and in automated browsers: measured 2026-09-30, a build that opened three stacked prompt() dialogs for sign-up threw the error "prompt() is not supported" and NO ACCOUNT WAS EVER CREATED — a first-time visitor could not sign up at all. Sign-up is a real form on the page (email + password + name inputs, a submit button, the error text rendered beside it). Show every server message in a visible element, never in a dialog.
- EVERY SUBMIT HANDLER CALLS e.preventDefault() AS ITS FIRST LINE. Without it the browser does what it always does with a form — reloads the page as a GET — which kills the request the handler just started: measured on project 248 (2026-09-30) a sign-up handler read the fields, began the register call, and the page reloaded before it could answer, so no account was created and no message was ever shown. async function auth(form,type){ form.preventDefault(); … }
- THE HELPER AND ITS CALLS MUST MATCH. If you define const $ = id => document.getElementById(id), then every call is $('element-id') — NEVER $('.class'): getElementById does not understand class selectors, so it returns null, and .addEventListener on null throws, and the first throw aborts the rest of that function. Measured on project 248 (2026-09-30): a single $('.menu-button') line left sign-up, sign-in, add-book, log-out and the theme toggle with no handlers at all — and the try/catch around the wiring kept the error off the console, so nothing was visible anywhere. Use document.querySelector for classes, and do NOT wrap your wiring in try/catch.
- THE MODE YOU SHOW MUST BE THE MODE YOU SEND. Toggling a tab or renaming a button changes only what the visitor SEES — the form is still bound to whatever mode it was wired with, so the label ends up lying about the action. Measured on project 250 (2026-09-30): $('authForm').addEventListener('submit', e=>authHandler(e,'login')) while the Create-account tab only called showAuth('signup'), so Create account posted /auth/login, the server answered that the email was unknown, and NO ACCOUNT WAS EVER CREATED even though the entire signup branch was sitting right there in the file. Hold the mode in one variable (let authMode='login'), set it in the tab handler, pass that variable to the submit handler, and make sure every mode the handler branches on is one some caller actually passes.
- THE LISTENER HANDS YOU AN EVENT, NOT THE FORM. A submit listener's argument is the event object. If you pass it into a helper — e=>authHandler(e,'login') — then inside that helper it is STILL the event: get the form with e.currentTarget, or pass e.currentTarget to the helper instead. Naming the parameter form and calling form.querySelector / form.reportValidity / form.reset on it throws "form.querySelector is not a function" on the first click, so sign-in and sign-up do nothing at all while the page looks perfect: measured on project 249 (2026-09-30), async function authHandler(form,type){ form.preventDefault(); const submit=form.querySelector('button[type=submit]'); … } received the event from e=>authHandler(e,'login'), threw, and no account was ever created. form.preventDefault() works on the event by accident — do not read that as proof the argument is the form.
- appInit IS HOW THE PAGE STARTS: read state, attach handlers, load data — everything a visitor can do must be reachable from it or from a function it calls as its last line. A wiring function that nothing calls is dead code no checker can see, and it produces the same symptom as a thrown one: buttons that do nothing.
- If the brief has nothing to save and nobody to sign in, build none of this — a brochure page gets no login form and no database calls.

COVER THE WHOLE PAGE, not just a hero — but ONLY with sections this brief actually calls for.

RELEVANCE IS A HARD RULE. Build a checklist from the brief and emit exactly one section per item on it. Do NOT emit generic marketing sections the brief never mentioned:
- A personal tool (tracker, planner, calculator, dashboard, notes app) gets NO "Contact Us", NO contact form, NO testimonials, NO pricing table, NO newsletter signup, NO FAQ, NO blog, NO gallery. Those are for businesses selling something.
- A landing page for a business gets the sections that business needs — and still no section it doesn't.
- Never add a section "for completeness". A shorter page that does exactly what was asked beats a longer page full of filler.

IF THE BRIEF DOES NOT ASK FOR A CONTACT FORM, DO NOT BUILD ONE. This rule overrides any general instruction about including a contact form.

REAL CONTENT ONLY. Write actual headings, copy, prices, addresses and labels for this specific business. Never "Lorem ipsum", never "Your text here", never placeholder brackets.

DESIGN BAR (2026, not 2018):
- Type scale: a real modular scale (e.g. clamp() fluid headings), clear hierarchy between h1/h2/body/meta. Never render every heading the same size.
- Layout: use CSS Grid/Flex for a composed layout — forms in a sensible column width (max ~40ch for inputs), cards in a responsive grid, sections with deliberate vertical rhythm (--space tokens). Do NOT stack full-width white boxes down a grey page.
- Colour: define a palette as CSS custom properties on :root (--bg, --surface, --text, --muted, --accent, --border). Include a dark-mode-capable palette via prefers-color-scheme.
- Motion: staggered entrance for cards/sections, hover lift on interactive cards, animated gradient or mesh behind the hero. ALL motion must be wrapped so that @media (prefers-reduced-motion: reduce) disables it, and nothing may depend on animation to become visible.
- No emoji as icons or decoration. Inline SVG icons only.
- Keep the hero honest: headline + one concrete line about what the tool does. No "Welcome to" and no invented taglines like "Your personal X assistant" — say what it does.

GUIDANCE (this is what makes it feel like a product, not a page):
- EVERY empty list gets an empty state that tells the user exactly what to do next ("Add your first set above →"). Never render a bare heading over blank space.
- Every multi-step flow gets a visible next-action or hint. First-time users must be able to tell what to do without being told.
- Show real inline feedback for actions: pending, success, error. Never a success message before the server confirms.

FILLER IS A DEFECT:
- Copyright year must be rendered as the current year via JS (new Date().getFullYear()) — never a hardcoded past year.
- Never output "© <year> <Name>. All rights reserved." unless the brief asked for it.
- Never output "Lorem ipsum", "Your text here", placeholder brackets, or a fake "Send Message" form with nowhere to send it.
- The word count minimum below is a floor against empty output, NOT a target. Do not pad to reach it.

script.js must wire every interactive element: mobile nav, TABS AND EVERY in-page nav link (a link that only changes the hash is a broken link — its target section must actually become visible), tabs or filters, form validation that shows a visible success state, and scroll animations. Wrap in try/catch so nothing can throw on load.

EVERY form you output must be reachable by clicking something a user can see. If you hide a section with class="hidden", there must be a visible control that reveals it. No orphans.

OUTPUT FORMAT — output ONLY this array, no prose before or after, no markdown fences, at least 4500 characters of code in total, and you MUST close the array with "]":
[{"path":"index.html","content":"<full html, every newline escaped as \\n, every quote escaped as \\""},{"path":"styles.css","content":"..."},{"path":"script.js","content":"..."}]

ORDER MATTERS. index.html is the FIRST object in that array, always. The build reads your answer the moment it arrives and an answer that reaches styles.css before index.html has produced no page at all — measured on 2026-09-30, where a build returned styles.css alone and failed outright. Write index.html first, styles.css second, script.js last.`;

// ── STAGE 1/3 · MANAGER ────────────────────────────────────────────────────
// The three-agent shape Replit publishes (manager / editor / verifier), built
// only from components that cost nothing: this planner runs on the same free
// Workers AI roster as the writer, and the verifier in stage 3 is a rules
// function that never calls a model at all.
//
// The planner is PURELY ADDITIVE. planAgent() reports spec=null on any
// failure, and the writer then receives exactly the prompt it received before
// multi-agent existed — so a broken planner can only ever put us back on the
// old path, it cannot make an output worse.
// DISCUSSION MODE — talk about an idea without spending a build.
// Base44 offers this explicitly and we did not: every message used to create a
// project row and start a generation, so asking "is this a good idea" cost the
// user a full build and a new app in their list. This route writes no code,
// creates no project, touches no table. It is a plain conversation.
//
// Deliberately not a chat generalist: it is asked to be useful about one idea
// and to say plainly when something is untested or unknowable, because the
// whole point of the product is that nothing is claimed without being checked.
const DISCUSS_SYS = `You are the builder's design partner on createstuff.ai. The person in front of you is describing an app idea and wants to think it through BEFORE paying for a build with a message.

Answer them in plain English, the way a helpful developer friend would. Do not write code and do not produce a spec - nothing is being built yet.

Cover, in this order, skipping any part that does not apply:
1. What the idea actually is, in one sentence, in their own words.
2. The one screen to build first, and what has to be on it.
3. What could go wrong or be harder than it looks, honestly. Say "I don't know" or "this depends" when it genuinely does rather than guessing.
4. What to decide before building: the audience, what it stores, and whether anyone pays.

Rules:
- Maximum 150 words. Short and concrete beats long and impressive.
- Never promise a result, a deadline, a ranking, or a number you have not been given. Do not use words like revolutionary, game-changing, perfect, guaranteed, or best-in-class.
- If they ask whether something was tested or works, say you have no evidence of it rather than implying it does.
- Use their vocabulary, not product jargon. Never mention agents, models, tokens or pipelines.
- Plain text only: no JSON, no markdown headings, no code fences, no bullet characters. Short paragraphs are fine.`;

const PLAN_SYS = `You are the planner in a three-agent build pipeline: planner, writer, verifier. You write NO code. You turn one person's plain-English brief into a tight build spec that the writer must satisfy.

Return plain text only - no JSON, no markdown fences, no preamble - in exactly this shape, under 130 words:

WHAT: one sentence: what this is and who it is for.
SECTIONS: 4 to 6 section names for the page, in order, separated by slashes.
DOES: 3 to 6 things the user can concretely do in it, separated by semicolons.
STORES: what the user creates that must survive a refresh, or the single word NONE.
LOOK: two or three words of visual direction, using the brief's own words if it gave any.
NEVER: at most two things that must not appear. Use this only when the brief is plainly a personal tool or business site, and say so there - for example a personal tracker gets NEVER: contact form, pricing table.

Rules: mirror the brief's own vocabulary. Never invent a feature the brief did not ask for. Never add marketing sections to a personal tool. Never mention that you are an agent or that a spec exists.`;

// Injected into the user turn so the model wires real fetch() calls instead of
// faking data with static markup.
const API_BRIEF = `REAL BACKEND — this app is served from a host that exposes a live JSON API. Use it whenever the brief involves data a user creates or an account to sign into. Never fake that with hardcoded markup or localStorage-only state.

The builder previews your code inside a sandboxed iframe on a DIFFERENT domain, so relative paths like /app/1/api will silently return the wrong site. Always use the ABSOLUTE origin below.

Base path: __ORIGIN__/app/__ID__/api
  GET    __ORIGIN__/app/__ID__/api/<collection>                 -> {"items":[{...}]}
  POST   __ORIGIN__/app/__ID__/api/<collection>  {json}         -> {"item":{...}}   persisted
  GET    __ORIGIN__/app/__ID__/api/<collection>/<id>            -> {"item":{...}}
  PATCH  __ORIGIN__/app/__ID__/api/<collection>/<id> {json}     -> {"item":{...}}
  DELETE __ORIGIN__/app/__ID__/api/<collection>/<id>            -> {"ok":true}
  POST   __ORIGIN__/app/__ID__/api/auth/register {email,password,name} -> {"token","user"}
  POST   __ORIGIN__/app/__ID__/api/auth/login    {email,password}      -> {"token","user"}
  GET    __ORIGIN__/app/__ID__/api/auth/me   header Authorization: Bearer <token> -> {"user"} or {"user":null}
  POST   __ORIGIN__/app/__ID__/api/auth/logout  header Authorization: Bearer <token>

FILE STORAGE — for anything a user attaches (avatar, photo, receipt, PDF, resume):
  POST   __ORIGIN__/app/__ID__/api/storage   multipart/form-data with the file in a field called "file"
                                             OR JSON {name, content} where content is base64 or a data: URL
                                             -> {"ok":true,"key","url","size","type"}
  GET    __ORIGIN__/app/__ID__/api/storage/<key>        -> the file bytes (works in an <img src>)
  DELETE __ORIGIN__/app/__ID__/api/storage/<key>  Authorization: Bearer <token>  -> {"ok":true}
  Limit 10 MB per file. If the brief involves a file input, USE THIS — never
  pretend to store the file and never keep it only in localStorage.
  After a successful upload, save the returned "url" in your own collection (the
  same POST as any other field) so the file survives a refresh:
    <img id="avatar" alt="">   ->   const r = await fetch(API_BASE + "/storage", {method:"POST", body: formData});
    const { url } = await r.json(); document.getElementById("avatar").src = url;
    await fetch(API_BASE + "/profile", {method:"POST", headers: jsonHeaders(), body: JSON.stringify({avatar: url})});
  Render stored files straight into <img src> / <a href> — the url is absolute.

The page is handed its own backend address at runtime — read it, never type it:
  const API_BASE = window.__APP.api;
and build every request from it. Never write a host or a project id into the file:
the same file is previewed and published, and a written-in address is wrong the
moment either one moves. The same object also carries ready-made calls that attach
the sign-in token for you, which is why they beat a hand-built fetch:
  window.__APP.list(col, mine)  window.__APP.create(col, obj)  window.__APP.update(col, id, obj)
  // list(col, true) asks for that user's own rows; with nobody signed in it answers
  // the public rows rather than failing, so a fresh visitor never sees an error.
  window.__APP.remove(col, id)  window.__APP.get(col, id)
  window.__APP.register(email, pw)  window.__APP.login(email, pw)  window.__APP.logout()
  window.__APP.me()  ->  the signed-in user object, or null (never a truthy empty object)
Use those for rows and accounts. Use fetch only where there is no helper (file uploads below).

RULES
- Send JSON with Content-Type: application/json. Send the token as Authorization: Bearer <token>. Store the token in localStorage under "app_token", but read/write localStorage ONLY inside try/catch (the preview runs in a sandboxed iframe where it can throw SecurityError) and fall back to a plain in-memory variable.
- Use await fetch(...) inside try/catch. On a non-ok response show a VISIBLE error message to the user. Never show success before the server confirms.
- Never window.prompt() for input and never alert() for a message: both are blocked where this app runs (measured 2026-09-30 — a sign-up built from prompt() dialogs threw "prompt() is not supported" and no account was created). Collect input from inputs on the page; render errors into a visible element.
- Every handler you attach must be attached from code that RUNS on load — appInit, or a function appInit calls. A wiring function defined and never invoked leaves every form dead while the file still parses, so nothing else can see it.
- A form that claims to save MUST POST and MUST render the item the server returned (use its real id). Every submit handler starts with e.preventDefault() (or form.preventDefault()) — otherwise the browser reloads the page and cancels the request the handler just started, which is why a sign-up can appear to do nothing at all.
- After ANY successful POST, PATCH or DELETE, RE-FETCH the collection with GET and render what the server returns. Do NOT hand-edit your local array (arr.filter(t => t.id !== id) silently fails because ids from the DOM are strings while ids from JSON are numbers). The server is the only source of truth for what is on screen.
- Compare ids as strings: String(a) === String(b), never ===.
- On load, GET the collection and render what comes back — not invented rows. Put that startup work in a function named EXACTLY appInit (function appInit(){ ... }): it is called for you when the page is ready. Work you only do after a click never happens for someone who just opens the page — measured 2026-09-29: an app that loaded its list only after sign-in showed an empty list on every reload while its row sat in the database.
- Any list the user would lose on refresh (tasks, notes, bookings, messages, entries, orders) must live in the API.
- Keep API paths absolute, built from API_BASE (which is read from window.__APP.api). Never a relative path, never another host.

If the brief is purely presentational (a landing page with no user data and no accounts), you may skip the API entirely.`;

// Browsers ask for a favicon on EVERY page served from this origin — and since
// every generated app lives here, that is every page a user ever opens. It has
// to be answered before the session gate, or the request 401s and prints a red
// console error for a file nobody asked for. Same mark createstuff.ai ships.
const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="a" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#a78bfa"/>
      <stop offset="0.55" stop-color="#7c3aed"/>
      <stop offset="1" stop-color="#3b82f6"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14.72" fill="url(#a)"/>
  <path d="M23 22 14 32l9 10" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
  <path d="M41 22l9 10-9 10" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
  <path d="M36 17 28 47" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
</svg>`;

// One icon handler, used by both the origin root and each app's own path.
function faviconResponse() {
  return new Response(FAVICON_SVG, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
    },
  });
}

// ── short-TTL list cache ─────────────────────────────────────────────────
// The collection LIST routes are the read hot path and every one of them costs
// a D1 round trip, which is ~90% of measured read latency. Each cached value is
// keyed by exactly what the query filtered on:
//   lst:app:<projectId>:<collection>  public per-app list (GET list ignores the
//                                     session — identical for every caller, see
//                                     the POLICY comment in handleAppRequest)
//   lst:projects:<userId>             per-user rows, key includes the user id
//                                     so a list is never shared across users
//   lst:files:<projectId> / lst:builds:<projectId>
// Auth responses (/api/auth/*, /app/:id/api/auth/*) are NEVER cached.
//
// STALENESS BOUND: LIST_TTL_MS (4000ms) from the instant the rows were read —
// strictly under the 5s read-your-write budget. KV's expirationTtl floor is 60s,
// so the expiry travels INSIDE the value and is enforced on read; KV's 60s TTL
// is only a garbage-collection backstop for abandoned keys.
//
// INVALIDATION: every successful write calls cacheDrop() for that exact key
// AFTER the D1 write lands and BEFORE the response is sent, so the next read
// re-queries D1. Both layers are dropped (memory in this isolate + the shared
// KV copy). A KV delete that has not yet propagated to another PoP cannot leak
// stale data past LIST_TTL_MS, because freshness is judged by entry.t.
//
// FAILURE ISOLATION: every memory/KV call is wrapped — a cache read/write that
// throws degrades to a plain D1 read, never to a failed request.
const LIST_TTL_MS = 4000;
const LIST_MEM_MAX = 128;
const LIST_KV_TTL_S = 60; // KV minimum TTL; freshness is enforced by entry.t
const listMem = new Map(); // key -> { t: writtenAtMs, d: data }

const appListKey = (projectId, col) => `lst:app:${projectId}:${col}`;
const projectsListKey = (userId) => `lst:projects:${userId}`;
const filesListKey = (projectId) => `lst:files:${projectId}`;
const buildsListKey = (projectId) => `lst:builds:${projectId}`;

function listFresh(entry, now) {
  return !!entry && typeof entry.t === "number" && now - entry.t <= LIST_TTL_MS;
}
function memSet(key, entry) {
  listMem.set(key, entry);
  if (listMem.size > LIST_MEM_MAX) listMem.delete(listMem.keys().next().value);
}

// Returns the cached array, or null for a miss / any failure.
async function cacheGet(env, key) {
  const now = Date.now();
  try {
    const mem = listMem.get(key);
    if (listFresh(mem, now)) return mem.d;
    if (mem) listMem.delete(key);
  } catch { /* memory is best-effort */ }
  try {
    const raw = await env.KV.get(key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!listFresh(entry, now)) return null;
    memSet(key, entry);
    return entry.d;
  } catch {
    return null; // KV outage => fall through to D1
  }
}

async function cachePut(env, key, data) {
  const entry = { t: Date.now(), d: data };
  try { memSet(key, entry); } catch { /* best-effort */ }
  try {
    await env.KV.put(key, JSON.stringify(entry), { expirationTtl: LIST_KV_TTL_S });
  } catch { /* best-effort: a failed write just means a D1 read next time */ }
}

async function cacheDrop(env, key) {
  try { listMem.delete(key); } catch { /* best-effort */ }
  try { await env.KV.delete(key); } catch { /* best-effort */ }
}

// ── persistence ──────────────────────────────────────────────────────────

// Replit's checkpoints exist because the live working copy is overwritten on
// every save. Ours had the same hole: project_files held only the newest build,
// so once a build finished the previous one was gone for good. This table keeps
// a copy of exactly what each build produced, which is what makes rollback
// possible at all.
let buildFilesPending = null;
function ensureBuildFiles(env) {
  if (!buildFilesPending) {
    buildFilesPending = env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS build_files (
         build_id   INTEGER NOT NULL,
         project_id INTEGER NOT NULL,
         path       TEXT    NOT NULL,
         content    TEXT    NOT NULL,
         created_at TEXT    NOT NULL,
         PRIMARY KEY (build_id, path)
       )`
    ).run().catch((e) => { buildFilesPending = null; throw e; });
  }
  return buildFilesPending;
}

// Best-effort by design: a build that cannot be snapshotted still succeeded, so
// this must never turn a completed build into a failed one.
async function snapshotBuildFiles(env, projectId, buildId, files) {
  if (!buildId || !files || !files.length) return;
  try {
    await ensureBuildFiles(env);
    const now = new Date().toISOString();
    for (const f of files) {
      await env.DB.prepare(
        "INSERT OR REPLACE INTO build_files (build_id, project_id, path, content, created_at) VALUES (?,?,?,?,?)"
      ).bind(buildId, projectId, f.path, String(f.content || ""), now).run();
    }
  } catch (e) {
    console.error("[snapshot] " + String((e && e.message) || e));
  }
}

// ── per-app request log ─────────────────────────────────────────────────
// Nothing was recorded about what a generated app actually did. If a form
// stopped saving, the owner had no record of the failing call — no status, no
// timing, no message — and neither did we. This is the same reason Replit and
// Base44 put logs beside every deployment: it is the difference between "it
// broke" and "POST /api/players came back 422 in 90ms".
let appLogsPending = null;
function ensureAppLogs(env) {
  if (!appLogsPending) {
    appLogsPending = env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS app_logs (
         id          INTEGER PRIMARY KEY AUTOINCREMENT,
         project_id  INTEGER NOT NULL,
         method      TEXT,
         path        TEXT,
         status      INTEGER,
         duration_ms INTEGER,
         detail      TEXT,
         created_at  TEXT NOT NULL
       )`
    ).run().then(() => env.DB.prepare(
      "CREATE INDEX IF NOT EXISTS idx_app_logs_project ON app_logs (project_id, id DESC)"
    ).run()).catch((e) => { appLogsPending = null; throw e; });
  }
  return appLogsPending;
}

const APP_LOG_KEEP = 500; // rows retained per project

// Never throws: a broken log must not break the request it is describing.
async function logAppRequest(env, projectId, request, status, ms, detail) {
  try {
    await ensureAppLogs(env);
    const u = new URL(request.url);
    await env.DB.prepare(
      "INSERT INTO app_logs (project_id, method, path, status, duration_ms, detail, created_at) VALUES (?,?,?,?,?,?,?)"
    ).bind(
      projectId,
      request.method,
      (u.pathname.replace(`/app/${projectId}`, "") || "/").slice(0, 300),
      typeof status === "number" ? status : 0,
      Math.max(0, Math.round(ms || 0)),
      detail ? String(detail).slice(0, 500) : null,
      new Date().toISOString()
    ).run();
    // Retention on a probabilistic tick: roughly one prune per 15 inserts keeps
    // the table bounded without paying a DELETE on every single request.
    if (Math.random() < 0.066) {
      await env.DB.prepare(
        "DELETE FROM app_logs WHERE project_id=? AND id NOT IN " +
        "(SELECT id FROM app_logs WHERE project_id=? ORDER BY id DESC LIMIT ?)"
      ).bind(projectId, projectId, APP_LOG_KEEP).run();
    }
  } catch { /* best-effort */ }
}

// ── outbound automations: webhooks + scheduled jobs ─────────────────────
// Two things a small app needs to stop being a dead end: somewhere to POST when
// a record arrives, and a clock that hits a URL on its own. Neither is
// simulated — the requests really leave this worker.
//
// SSRF: wrangler.toml sets compatibility_flags = ["global_fetch_strictly_public"],
// which makes fetch() REFUSE loopback, private and link-local targets outright,
// so http://169.254.169.254/ or http://localhost/ cannot be reached even though
// an owner can paste any address they like. On top of that we require an
// http(s) scheme here, and every call carries a hard timeout.
const OUTBOUND_TIMEOUT_MS = 10000;
const HOOK_EVENTS = ["create", "update", "delete"];
const AUTOMATIONS_MAX = 10;      // hooks and jobs, each, per project
const HOOKS_FIRE_CAP = 10;       // never fan out further than this per event

function safeOutboundUrl(raw) {
  let u;
  try { u = new URL(String(raw || "").trim()); } catch { return null; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (!u.hostname) return null;
  return u;
}

// Returns the HTTP status, or 0 meaning "never got an answer" (timeout, DNS
// failure, or blocked by the public-only flag). 0 is a real result for a
// last_status column — it distinguishes "declined" from "unreachable".
async function postJSON(url, body, headers) {
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: Object.assign({ "Content-Type": "application/json", "User-Agent": "createstuff-automation" }, headers || {}),
      body,
      redirect: "follow",
      signal: AbortSignal.timeout(OUTBOUND_TIMEOUT_MS),
    });
    return r.status;
  } catch { return 0; }
}

// Real signatures are what make a webhook safe to accept on the other end:
// without one, any stranger who learns the URL can forge an event.
async function deliverHook(hook, msg) {
  const u = safeOutboundUrl(hook.url);
  if (!u) return 0;
  const body = JSON.stringify(msg);
  const headers = {
    "X-CreateStuff-Event": String(msg.event || ""),
    "X-CreateStuff-Delivery": crypto.randomUUID(),
  };
  if (hook.secret) {
    try {
      const key = await crypto.subtle.importKey(
        "raw", new TextEncoder().encode(hook.secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
      headers["X-CreateStuff-Signature"] = "sha256=" +
        [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch { /* a signature we cannot compute must not stop the delivery */ }
  }
  return postJSON(u, body, headers);
}

let autoPending = null;
function ensureAutomation(env) {
  if (!autoPending) {
    autoPending = (async () => {
      await env.DB.prepare(
        `CREATE TABLE IF NOT EXISTS project_hooks (
           id INTEGER PRIMARY KEY AUTOINCREMENT,
           project_id INTEGER NOT NULL,
           event TEXT NOT NULL,
           url TEXT NOT NULL,
           secret TEXT,
           enabled INTEGER NOT NULL DEFAULT 1,
           last_status INTEGER,
           last_run_at TEXT,
           created_at TEXT NOT NULL
         )`
      ).run();
      await env.DB.prepare(
        `CREATE TABLE IF NOT EXISTS project_jobs (
           id INTEGER PRIMARY KEY AUTOINCREMENT,
           project_id INTEGER NOT NULL,
           name TEXT,
           url TEXT NOT NULL,
           every_minutes INTEGER NOT NULL DEFAULT 30,
           enabled INTEGER NOT NULL DEFAULT 1,
           last_status INTEGER,
           last_run_at TEXT,
           created_at TEXT NOT NULL
         )`
      ).run();
    })().catch((e) => { autoPending = null; throw e; });
  }
  return autoPending;
}

// Called from the app's own mutation paths via ctx.waitUntil, so a slow or dead
// receiver can never hold up — or fail — the request that triggered it.
// Never throws: a broken webhook must not break the row it is announcing.
async function fireHooks(env, projectId, event, data) {
  try {
    await ensureAutomation(env);
    const r = await env.DB.prepare(
      "SELECT id, url, secret FROM project_hooks WHERE project_id=? AND event=? AND enabled=1 LIMIT ?"
    ).bind(projectId, event, HOOKS_FIRE_CAP).all();
    const hooks = r.results || [];
    if (!hooks.length) return;
    const msg = { event, project_id: projectId, at: new Date().toISOString(), data };
    await Promise.all(hooks.map(async (h) => {
      const status = await deliverHook(h, msg);
      try {
        await env.DB.prepare("UPDATE project_hooks SET last_status=?, last_run_at=? WHERE id=?")
          .bind(status, new Date().toISOString(), h.id).run();
      } catch { /* recording the outcome is best-effort */ }
    }));
  } catch { /* never propagate */ }
}

// The cron tick for owner-scheduled jobs. Marks last_run_at EVEN WHEN the call
// fails, so a dead endpoint is retried on the next interval instead of firing
// hundreds of times a day forever.
//
// The join to projects is not decoration: a scheduled job fires with no request
// around it, so unlike a webhook it would happily keep calling an endpoint on
// behalf of an app that no longer exists. Orphans are removed first, then only
// jobs belonging to a live project are considered.
async function runDueJobs(env) {
  try {
    await ensureAutomation(env);
    await env.DB.prepare(
      "DELETE FROM project_jobs WHERE project_id NOT IN (SELECT id FROM projects)"
    ).run().catch(() => {});
    const r = await env.DB.prepare(
      `SELECT j.id, j.project_id, j.name, j.url, j.every_minutes
         FROM project_jobs j JOIN projects p ON p.id = j.project_id
        WHERE j.enabled=1 LIMIT 200`
    ).all();
    const jobs = r.results || [];
    if (!jobs.length) return;
    const now = Date.now();
    for (const j of jobs) {
      const every = Math.max(5, Math.min(1440, Number(j.every_minutes) || 30));
      const last = j.last_run_at ? Date.parse(j.last_run_at) : NaN;
      if (Number.isFinite(last) && now - last < every * 60000) continue;
      const u = safeOutboundUrl(j.url);
      const status = u ? await postJSON(u, JSON.stringify({
        job: j.name || u.hostname, project_id: j.project_id, at: new Date().toISOString(),
      }), { "X-CreateStuff-Job": String(j.id) }) : 0;
      try {
        await env.DB.prepare("UPDATE project_jobs SET last_run_at=?, last_status=? WHERE id=?")
          .bind(new Date().toISOString(), status, j.id).run();
      } catch { /* best-effort */ }
    }
  } catch { /* never propagate */ }
}

// Published pages are served through sites.createstuff.ai, whose edge caches
// .js/.css for seven days while it never caches .html. Measured 2026-09-30 on
// project 252: index.html came back cf-cache-status: DYNAMIC carrying the new
// build's bytes, script.js came back cf-cache-status: HIT with age 4688 still
// holding the PREVIOUS build — a fresh page wired to a stale script, which is
// the pairing that killed it (appInit threw on script.js:244). The origin was
// right the whole time: createstuff-api answered cache-control: no-cache with
// the new bytes, so the staleness is purely what the edge chose to keep.
//
// The edge keys on the query string — measured with the same URL: script.js
// with ?v= returned the new 7,234 bytes while the bare path returned the old
// 10,300 — so stamping the page's OWN asset references with the publish time
// makes every publish a cache miss for exactly the files that changed, with no
// purge rights needed (the Pages project lives on an account this session has
// no token for, so a purge was never an option).
function stampAssetRefs(html, stamp) {
  return String(html).replace(
    /\b(src|href)=(["'])([^"']+?\.(?:m?js|css))(?:\?[^"']*)?\2/g,
    (m, attr, q, url) =>
      /^(?:https?:)?\/\//i.test(url) || url.startsWith("data:") ? m : `${attr}=${q}${url}?v=${stamp}${q}`
  );
}

async function saveFiles(env, projectId, files, buildId) {
  const now = new Date().toISOString();
  for (const f of files) {
    // project_files has no unique index on (project_id, path) — ON CONFLICT
    // would throw SQLITE_ERROR, so delete-then-insert.
    await env.DB.prepare(
      "DELETE FROM project_files WHERE project_id=? AND (path=? OR file_path=?)"
    ).bind(projectId, f.path, f.path).run();
    await env.DB.prepare(
      "INSERT INTO project_files (project_id, build_id, path, file_path, content, updated_at) VALUES (?,?,?,?,?,?)"
    ).bind(projectId, buildId || null, f.path, f.path, f.content, now).run();
  }
  // Single invalidation point for the file LIST: this covers both the
  // POST /api/projects/:id/files route and the AI generate/modify writers, so a
  // cached file list can never outlive a successful write to project_files.
  await cacheDrop(env, filesListKey(projectId));
  // And keep a copy of what this version looked like — the live rows above have
  // just been overwritten, so this is the only record of them.
  await snapshotBuildFiles(env, projectId, buildId, files);
}

async function loadFiles(env, projectId) {
  const r = await env.DB.prepare(
    "SELECT path, file_path, content, updated_at FROM project_files WHERE project_id=? ORDER BY path"
  ).bind(projectId).all();
  return (r.results || []).map((row) => ({
    path: row.path || row.file_path,
    file_path: row.file_path || row.path,
    content: row.content || "",
    size: (row.content || "").length,
    updated_at: row.updated_at,
  }));
}

// The model writes nav links as plain `href="#section"` anchors but frequently
// forgets the click handler that reveals a hidden section, which leaves forms
// (login/register/add) unreachable — measured on app 125: the Register link
// changed the hash and no section switched. This appends a deterministic
// section router to script.js so every in-page link reveals its target.
const NAV_ROUTER = `
/*createstuff-nav-router*/
(function () {
  function reveal(hash) {
    if (!hash || hash === "#") return false;
    var el;
    try { el = document.querySelector(hash); } catch (e) { return false; }
    if (!el) return false;
    var n = el;
    while (n && n.nodeType === 1) {
      if (n.classList) n.classList.remove("hidden");
      n = n.parentElement;
    }
    return true;
  }
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;
    var h = a.getAttribute("href");
    if (!h || h === "#") return;
    if (reveal(h)) {
      e.preventDefault();
      if (location.hash !== h) location.hash = h;
      var t = document.querySelector(h);
      if (t && t.scrollIntoView) t.scrollIntoView({ block: "start" });
    }
  }, true);
  function onReady() { reveal(location.hash); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", onReady);
  else onReady();
})();
`;

function injectNavRouter(files) {
  const js = files.find((f) => /\.js$/i.test(f.path));
  if (!js) return 0;
  if (js.content.includes("createstuff-nav-router")) return 0;
  js.content = `${js.content}\n${NAV_ROUTER}`;
  return 1;
}

// The builder previews generated code in <iframe sandbox="allow-scripts">,
// which is an opaque origin: touching window.localStorage throws
// SecurityError and kills the entire script, so the app looks dead in the
// preview while working fine when published. Prepend a memory-backed
// fallback so storage access never throws.
const STORAGE_SHIM = `/*createstuff-safe-storage*/
(function () {
  var ok = false;
  try { window.localStorage.setItem("__p", "1"); window.localStorage.removeItem("__p"); ok = true; } catch (e) { ok = false; }
  if (ok) return;
  var mem = {};
  var fake = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
    setItem: function (k, v) { mem[k] = String(v); },
    removeItem: function (k) { delete mem[k]; },
    clear: function () { mem = {}; },
    key: function (i) { return Object.keys(mem)[i] || null; }
  };
  Object.defineProperty(fake, "length", { get: function () { return Object.keys(mem).length; } });
  try { Object.defineProperty(window, "localStorage", { configurable: true, get: function () { return fake; } }); } catch (e) {}
})();
`;

function injectStorageShim(files) {
  const js = files.find((f) => /\.js$/i.test(f.path));
  if (!js || js.content.includes("createstuff-safe-storage")) return 0;
  js.content = `${STORAGE_SHIM}\n${js.content}`;
  return 1;
}

// Returns {spec, model, tool, ms} always; `spec` is null when there is no
// usable plan. Never throws — a planner that fails, rambles, or emits the
// wrong shape is reported as "no plan" together with the tool that produced
// it, so the stage message can name the endpoint and the HTTP status instead
// of printing a canned sentence.
async function planAgent(env, plan) {
  const t0 = Date.now();
  try {
    const r = await gen(env, PLAN_SYS, String(plan || "").slice(0, 4000), 700);
    const spec = String((r && r.text) || "").trim();
    const tool = (r && r.tool) || null;
    const ms = (tool && tool.ms) || Date.now() - t0;
    // Reject junk rather than feed it to the writer: too short, too long (the
    // model ignored its word cap), or a file array instead of a spec.
    if (spec.length < 60 || spec.length > 2600)
      return { spec: null, model: r.model, tool, ms, why: `plan was ${spec.length} characters, not 60-2600` };
    if (/^\s*[\[{]/.test(spec)) return { spec: null, model: r.model, tool, ms, why: "plan looked like data, not a spec" };
    if (!/WHAT:/i.test(spec)) return { spec: null, model: r.model, tool, ms, why: "plan had no WHAT line" };
    return { spec, model: r.model, tool, ms };
  } catch (e) {
    console.warn("plan-agent failed: " + (e && e.message));
    return {
      spec: null, model: null, tool: (e && e.tool) || null, ms: Date.now() - t0,
      why: String((e && e.message) || e).slice(0, 160),
    };
  }
}

// ── STAGE 3/3 · VERIFIER + REPAIR ───────────────────────────────────────────
// The verifier is qualityFlags() below: pure rules, zero tokens, nothing to
// time out. This is the repair agent it hands work to, and it runs ONLY when
// the verifier actually objected to something.
const REPAIR_SYS = `You are the verification-and-repair agent in a three-agent build pipeline: planner, writer, verifier. You are handed one generated web page and a short list of SPECIFIC defects that a rule-based verifier found in it.

Fix exactly those defects. Fix nothing else.

Two hard constraints:
1. Every id, class, element and script already in the document must survive unless removing it is the literal fix for a listed defect. styles.css and script.js are NOT being given to you and are not being regenerated - they still reference the original markup, so renaming or deleting existing hooks breaks the site.
2. Do not add sections, features, copy or navigation that no listed defect requires.

Output the entire corrected document starting with <!DOCTYPE html>. Output HTML only: no prose, no explanation, no markdown fences, no code block markers.`;

// Returns {files, fixed, left, model, tool} or null. Never throws. Any refusal,
// truncated output, or non-improving result returns null and leaves the build
// byte-for-byte as the writer produced it.
async function repairAgent(env, files, flags, plan) {
  const idx = files.find((f) => /(^|\/)index\.html?$/i.test(f.path));
  if (!idx) return null;
  try {
    const g = await gen(
      env,
      REPAIR_SYS,
      `DEFECTS THE VERIFIER FOUND:\n- ${flags.join("\n- ")}\n\nTHE USER'S ORIGINAL BRIEF:\n${String(plan || "").slice(0, 2500)}\n\nTHE DOCUMENT TO CORRECT:\n${idx.content}`,
      8000
    );
    let html = String((g && g.text) || "").trim();
    // Strip fences if the model added them anyway.
    html = html.replace(/^```[a-zA-Z]*\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
    const at = html.search(/<!doctype html/i);
    if (at > 0) html = html.slice(at);
    if (!/^<!doctype html/i.test(html)) return null;

    // STRUCTURAL GUARD. The acceptance test below counts remaining verifier
    // flags, so a reply that is flag-free wins by default — including a
    // gutted document with no content in it, which scores zero flags purely
    // because there is nothing left to flag. Require the reply to still be a
    // complete site (siteOk's own bar, plus a closing tag) and to retain most
    // of the original's bulk, or the "fix" would ship an empty page.
    if (html.length < 400 || !/<html[\s>]/i.test(html) || !/<\/html>/i.test(html)) return null;
    if (html.length < Math.floor(idx.content.length * 0.4)) return null;

    const fixed = flags.length;
    const copy = files.map((f) => (f === idx ? { path: f.path, content: html } : { path: f.path, content: f.content }));
    const after = qualityFlags(copy, plan);
    // The repair must actually clear defects. If it cleared none, the original
    // writer output was better — keep it.
    if (after.length >= fixed) return null;
    return { files: copy, fixed: fixed - after.length, left: after, model: g.model, tool: g.tool };
  } catch (e) {
    console.warn("repair-agent failed: " + (e && e.message));
    return null;
  }
}

// Shared failure writer: sets status='failed' and records the reason so the
// polling UI shows why instead of spinning forever on 'running'.
async function failBuild(env, id, e) {
  try {
    // APPEND, do not replace. A build row now collects its log as each stage
    // lands, so overwriting it with a single entry would throw away the only
    // record of how far the run got before it died — which is exactly what
    // someone debugging a failed build needs to see.
    const row = await env.DB.prepare("SELECT agent_log FROM builds WHERE id=?").bind(id).first();
    let log = [];
    try { const p = row && row.agent_log ? JSON.parse(row.agent_log) : []; if (Array.isArray(p)) log = p; } catch { log = []; }
    log.push({ agent: "System", message: "Build failed: " + String((e && e.message) || e), at: new Date().toISOString() });
    await env.DB.prepare("UPDATE builds SET status='failed', completed_at=?, agent_log=? WHERE id=?").bind(
      new Date().toISOString(),
      JSON.stringify(log),
      id
    ).run();
  } catch {}
}

// ── STAGE 0/3 · REQUEST CLASSIFIER ──────────────────────────────────────
// The Hive used to answer every sentence with a generated site, including
// sentences this worker cannot carry out: "connect my github account",
// "log into my stripe account", "deploy this to vercel". The label "Planner"
// over a canned line was theatre — no tool ran before the writer.
//
// This gate runs BEFORE planAgent() and decides {"kind":"build"} or
// {"kind":"not_build"}. For not_build it supplies the reply verbatim: one
// plain paragraph that says what it cannot do, what it can do instead, and
// asks one short question. It never returns a website.
//
// Two paths, in this order:
//   1. keyword — deterministic, no model, no network, ~0ms. This is the path
//      that must keep working on its own: if the model path is unavailable,
//      slow, or returns junk, the keyword result IS the answer.
//   2. model — consulted ONLY when the keyword path is not confident (no
//      signal either way). See classifyWithModel() below the block.
//
// The block between the markers is extracted verbatim by the regression
// harness (/tmp/opencode/csagent/test.mjs) and imported as its own module, so
// the test always exercises the shipped code instead of a copy. Everything
// inside must stay self-contained: no calls to gen(), fetch, env or any
// helper declared outside the markers.
// @classifier:start
const REPLY_MAX = 320;

// The explicit capability list. It is the contract the not_build replies are
// written against and the facts the model path is told to repeat.
const CAPABILITIES = {
  can: [
    "plan a site",
    "write the files",
    "preview it",
    "publish it to a web address",
    "read a project's files back",
    "explain what I did",
    "hand over a download ZIP",
  ],
  cannot: [
    "log into GitHub or any other account",
    "connect an external account",
    "deploy to third parties I hold no credentials for",
  ],
};

// Fallback reply: built from the capability list itself, so the list cannot
// drift from what the user is told. 299 characters as written, 21 under the
// 320 cap.
const GENERIC_REPLY =
  `I cannot ${CAPABILITIES.cannot.join(", ")}. ` +
  `I can ${CAPABILITIES.can.join(", ")}. ` +
  "Want a site instead?";

const REPLY_GIT =
  "I cannot log into {svc} from here or push code to your repo. " +
  "I can build the site, give you a download ZIP and a live web address, " +
  "and you paste it into {svc} yourself. Want that?";
const REPLY_ACCOUNT =
  "I cannot log into {svc} from here or handle your password - I hold no credentials for it. " +
  "I can build the page that uses {svc} and hand you a download ZIP plus a live address " +
  "to finish the setup. Want that?";
const REPLY_CONNECT =
  "I cannot connect an outside account from here - I hold no credentials for it. " +
  "I can build the site, give you a download ZIP and a live address, " +
  "and you make the connection yourself. Want that?";
const REPLY_DEPLOY =
  "I cannot deploy to Vercel, Netlify or any other host I hold no credentials for. " +
  "I can publish the site at a live address here and give you a download ZIP, " +
  "and you deploy it from there. Want me to build it?";
const REPLY_REPO =
  "I cannot push, clone or merge anything in your repository from here. " +
  "I can build the site, give you a download ZIP and a live address, " +
  "and you commit it yourself. Want that?";
const REPLY_CREDENTIALS =
  "I cannot read, store or send your API keys, passwords or tokens. " +
  "I can build the site that uses them and hand you a download ZIP and a live address. " +
  "Want that?";

const GIT_HOSTS = new Set(["github", "gitlab", "bitbucket"]);
const SERVICE_DISPLAY = {
  github: "GitHub", gitlab: "GitLab", bitbucket: "Bitbucket", stripe: "Stripe",
  paypal: "PayPal", gmail: "Gmail", google: "Google", shopify: "Shopify",
  discord: "Discord", slack: "Slack", twitter: "Twitter", instagram: "Instagram",
  linkedin: "LinkedIn", facebook: "Facebook", aws: "AWS", azure: "Azure",
  firebase: "Firebase", supabase: "Supabase", twitch: "Twitch", notion: "Notion",
  dropbox: "Dropbox", amazon: "Amazon", salesforce: "Salesforce", figma: "Figma",
};
const SERVICES = Object.keys(SERVICE_DISPLAY);

// Emoji, pictographs, flags and zero-width characters. The replies must read
// the same in a terminal, a phone and a screen reader.
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}\u{FE0E}\u{FE0F}\u{200B}-\u{200D}\u{FEFF}]/gu;

// Normalises any reply (keyword or model) to one plain paragraph of at most
// REPLY_MAX characters with no markup and no emoji.
function cleanReply(s) {
  let out = s == null ? "" : String(s);
  out = out.replace(/<[^>]*>/g, " ");
  out = out.replace(EMOJI, "");
  out = out.replace(/\s+/g, " ").trim();
  if (out.length > REPLY_MAX) {
    out = out.slice(0, REPLY_MAX - 1);
    const cut = out.lastIndexOf(" ");
    if (cut > 80) out = out.slice(0, cut);
    out = out.replace(/[,;:\s]+$/, "");
    if (!/[.!?]$/.test(out)) out += ".";
  }
  return out;
}

// A sentence that asks for a site/app outright wins: the user asked for a
// build even if the sentence also mentions an account.
const BUILD_REQUEST =
  /\b(?:build|make|create|design|generate|produce|ship|launch|start|write|redesign|put\s+together|spin\s+up|build\s+out)\b[^.?!]{0,70}\b(?:website|web\s?site|web\s?page|webpage|landing\s?page|site|page|app|application|project|dashboard|tool|portfolio|shop|store|storefront|blog|platform|system|game|forum|marketplace)\b/;

// A site word with no request verb ("i need a website") is still a build, but
// only after the not_build rules have had their say.
const BUILD_NOUN =
  /\b(?:website|web\s?site|landing\s?page|webpage|web\s?page|online\s+shop|online\s+store)\b/;

// Rule 1 — connecting or linking something outside this worker.
const CONNECT_ACCOUNT =
  /\b(?:connect|link|hook\s*up|sync|attach|integrate|authori[sz]e|authenticate|pair\s*up)\b[^.?!]{0,60}\b(?:github|gitlab|bitbucket|stripe|paypal|gmail|google|shopify|discord|slack|twitter|instagram|linkedin|facebook|aws|azure|firebase|supabase|oauth|account|repo|repository|credentials?)\b/;

// Rule 2 — signing in somewhere. The verb alone is not enough: "a log in
// button for my bakery site" is a build, so a second pattern must place an
// account, a credential or a named service next to it.
const LOGIN_VERB =
  /\b(?:log\s*in(?:to|on\s+to)?|login|sign\s*in(?:to|on\s+to)?|sign\s+into|log\s+on\s+to)\b/;
const LOGIN_TARGET =
  /\b(?:my|your|our|the|an?)\s+(?:[\w-]+\s+){0,2}(?:account|credentials?|password|dashboard|portal|admin|panel|bank)\b|\b(?:github|gitlab|bitbucket|stripe|paypal|gmail|shopify|aws|salesforce|quickbooks)\b/;

// Rule 3 — deploying to a host we hold no credentials for.
const DEPLOY_THIRD_PARTY =
  /\b(?:deploy|push|ship|publish|host|mirror|release)\b[^.?!]{0,40}\b(?:to|onto|into|on)\b[^.?!]{0,40}\b(?:vercel|netlify|heroku|render|aws|azure|gcp|google\s+cloud|cloudflare\s+pages|github\s+pages|digitalocean|firebase|surge|neocities|my\s+own\s+server|vps)\b/;

// Rule 4 — git operations on a repository.
const REPO_VERB = /\b(?:push|commit|merge|clone|fork|rebase|cherry-?pick|pull\s+request|open\s+a\s+pr|stash)\b/;
const REPO_TARGET =
  /\b(?:repo|repository|branch|main|master|github|gitlab|bitbucket|pr|upstream)\b|\b(?:push|commit)\s+(?:this|it|my\s+code|everything)\b/;

// Rule 5 — asking for secrets. Needs both halves so "a password manager" and
// "a log in button" stay builds.
const SECRET_WORD = /\b(?:api[ -]?key|access\s+token|client\s+secret|credentials?|password|secret\s+key|private\s+key|two-factor|2fa)\b/;
const SECRET_CONTEXT = /\b(?:my|your|our|the|give|find|show|read|retrieve|share|enter|check|store|save|send)\b/;

const NOT_BUILD_RULES = [
  { id: "connect-account", re: CONNECT_ACCOUNT },
  { id: "login-account", all: [LOGIN_VERB, LOGIN_TARGET] },
  { id: "deploy-third-party", re: DEPLOY_THIRD_PARTY },
  { id: "repo-operation", all: [REPO_VERB, REPO_TARGET] },
  { id: "credentials", all: [SECRET_WORD, SECRET_CONTEXT] },
];

// Rule 0 — the person wants to work ON THEIR OWN code: "connect my github",
// "first connectt to my github lets vibe code". Two failures came from missing
// this, both measured 2026-09-30: (a) CONNECT_ACCOUNT needs "connect" spelled
// correctly inside 60 characters, so the real person's "connectt" did not
// match, the keyword path said build, and the run produced build 152 — a page
// called "GitHub Vibe" whose Connect GitHub buttons do nothing; (b) when a
// rule DID match, the answer was one paragraph of prose with nowhere to go,
// while the feature it described (list repos, pull one in, edit, send back)
// already existed behind #github. The verb list is deliberately typo-tolerant
// and it never fires on an explicit build request, so "build me a github stars
// page" still builds.
const REPO_INTENT_HOST = /\b(?:github|gitlab|bitbucket|repo|repository|my\s+code)\b/;
const REPO_INTENT_VERB =
  /\b(?:connectt?|link|hook\s*up|sync|pair\s*up|authori[sz]e|authenticate|vibe\s*cod(?:e|ing)|vibecode|lets?\s+vibe|import|clone|push|commit|my\s+github|our\s+github|my\s+repo)\b/;

// A refusal that has somewhere to send the person carries the route with it.
// Only GitHub has a panel behind it, so only GitHub gets an action.
const REPO_INTENT_REPLY =
  "GitHub is already wired in here: I can list your repositories, pull one into " +
  "the builder, work on it with you and send the changes back. Press Open my " +
  "GitHub tools to start. Want that?";

function ruleFires(rule, low) {
  return rule.all ? rule.all.every((re) => re.test(low)) : rule.re.test(low);
}

// Earliest named service in the text, so "log into my stripe account" can
// name Stripe instead of saying "that account".
function findService(low) {
  let earliest = null;
  let at = Infinity;
  for (const s of SERVICES) {
    const m = new RegExp("\\b" + s + "\\b").exec(low);
    if (m && m.index < at) { at = m.index; earliest = s; }
  }
  return earliest;
}

function replyFor(ruleId, low) {
  if (ruleId === "deploy-third-party") return cleanReply(REPLY_DEPLOY);
  if (ruleId === "credentials") return cleanReply(REPLY_CREDENTIALS);
  if (ruleId === "repo-operation") return cleanReply(REPLY_REPO);
  if (ruleId === "repo-intent") return cleanReply(REPO_INTENT_REPLY);
  const svc = findService(low);
  if (svc && GIT_HOSTS.has(svc)) return cleanReply(REPLY_GIT.replace(/\{svc\}/g, SERVICE_DISPLAY[svc]));
  if (svc) return cleanReply(REPLY_ACCOUNT.replace(/\{svc\}/g, SERVICE_DISPLAY[svc]));
  if (ruleId === "connect-account") return cleanReply(REPLY_CONNECT);
  return GENERIC_REPLY;
}

// The keyword path. Returns {kind, confident, reply, rule}:
//   kind        "build" | "not_build"
//   confident   true when a rule matched and no model call is needed
//   reply       the exact paragraph to send back ("" for kind "build")
//   rule        which rule decided, for the stage log
// An empty message is a build: never block someone who sent nothing.
function classifyRequest(raw) {
  const text = raw == null ? "" : String(raw);
  const t = text.trim();
  if (!t) return { kind: "build", confident: true, reply: "", rule: "empty" };

  const low = t.toLowerCase();

  // Rule 0 first: someone wants to work with their own repository. It wins
  // over an explicit build request ONLY when no build was asked for, so
  // "build me a github stars page" is untouched, and it answers with a route
  // (#github) rather than prose or a decorative page.
  if (REPO_INTENT_HOST.test(low) && REPO_INTENT_VERB.test(low) &&
      !BUILD_REQUEST.test(low) && !BUILD_NOUN.test(low)) {
    const named = findService(low);
    // Named host that is not GitHub (GitLab/Bitbucket have no panel here) and
    // unnamed "my repo" both keep today's behaviour; only GitHub — or an
    // unnamed repo, whose repos this account keeps on GitHub — carries an
    // action, because an action must lead somewhere real.
    const isGithub = named === "github" || (!named && /\b(?:repo|repository|my\s+code)\b/.test(low));
    if (isGithub) {
      return {
        kind: "not_build", confident: true, reply: replyFor("repo-intent", low),
        rule: "repo-intent", action: { label: "Open my GitHub tools", href: "#github" },
      };
    }
  }

  if (BUILD_REQUEST.test(low)) return { kind: "build", confident: true, reply: "", rule: "build-request" };

  for (const rule of NOT_BUILD_RULES) {
    if (ruleFires(rule, low)) {
      return { kind: "not_build", confident: true, reply: replyFor(rule.id, low), rule: rule.id };
    }
  }

  if (BUILD_NOUN.test(low)) return { kind: "build", confident: true, reply: "", rule: "build-noun" };
  // No signal either way: the answer stays "build" (an empty build request is
  // never blocked) but it is NOT confident, so classifyWithModel() may ask a
  // model to confirm before the planner runs.
  return { kind: "build", confident: false, reply: "", rule: "no-signal" };
}

export { CAPABILITIES, GENERIC_REPLY, REPLY_MAX, classifyRequest, cleanReply };
// @classifier:end

// ── model path for the classifier ────────────────────────────────────────
// Consulted only when the keyword path reports confident=false. It returns a
// strict JSON object; anything else — a refusal, a timeout, a relay that is
// down — falls back to the keyword result. A not_build decided by the
// keyword path is never overridden by a model timeout, so a timeout can never
// turn a capability answer into a generated site.
const CLASSIFIER_TIMEOUT_MS = 9000;
const CLASSIFIER_SYS =
  `You are a request gate in front of a website builder. Decide whether one user message asks for a site/app to be built with the tools listed, or for something else.

Tools, and only these:
CAN: ${CAPABILITIES.can.join("; ")}.
CANNOT: ${CAPABILITIES.cannot.join("; ")}.

Answer with compact JSON and nothing else:
{"kind":"build"}  when the message asks for a site or app to be built. An empty message is "build".
{"kind":"not_build","reply":"..."}  when it asks for something CANNOT says is impossible. "reply" is one plain-English paragraph of at most 300 characters: what you cannot do, what you can do instead, then one short question. No emoji, no markdown, no HTML, no website.`;

function parseClassifierJson(text) {
  let s = String(text || "").trim();
  s = s.replace(/^```[a-zA-Z]*\s*/, "").replace(/\s*```\s*$/, "");
  const at = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (at < 0 || end <= at) return null;
  try {
    const o = JSON.parse(s.slice(at, end + 1));
    return o && typeof o === "object" && !Array.isArray(o) ? o : null;
  } catch {
    return null;
  }
}

// Returns the same shape as classifyRequest() plus {source, model, tool, ms}.
// On any failure — timeout, relay down, unparsable reply — it returns the
// keyword result unchanged.
async function classifyWithModel(env, raw) {
  const text = raw == null ? "" : String(raw);
  const t0 = Date.now();
  const kw = classifyRequest(text);
  if (kw.confident) return { ...kw, source: "keyword", model: null, tool: null, ms: Date.now() - t0 };

  let model = null;
  try {
    const job = gen(env, CLASSIFIER_SYS, text.slice(0, 1500), 220);
    job.catch(() => {}); // if the timer wins the race, the late rejection is ours to ignore
    const r = await Promise.race([
      job,
      sleep(CLASSIFIER_TIMEOUT_MS).then(() => {
        throw new Error(`classifier timed out after ${CLASSIFIER_TIMEOUT_MS}ms`);
      }),
    ]);
    model = (r && r.model) || null;
    const tool = (r && r.tool) || null;
    const parsed = parseClassifierJson(r && r.text);
    if (parsed && parsed.kind === "build") {
      return { kind: "build", confident: true, reply: "", rule: "model", source: "model", model, tool, ms: Date.now() - t0 };
    }
    if (parsed && parsed.kind === "not_build") {
      const reply = cleanReply(parsed.reply) || GENERIC_REPLY;
      // The model path is only ever consulted when the keyword path already
      // said "build" without confidence. Letting a model guess then turn that
      // into a refusal is how a person pressing Build ended up at
      // "No site was built - the answer is above." with nothing to click —
      // measured 2026-09-30 with "first connectt to my github lets vibe code":
      // the typo kept the deterministic connect-account rule from matching,
      // the model guessed not_build, and the build never happened. So the
      // keyword path keeps the last word: it said build, we build. The model's
      // objection is recorded in the stage line instead of being shown as a
      // wall. Capability questions the product really cannot do are still
      // answered — those are caught deterministically, before any model runs.
      return {
        kind: "build",
        confident: false,
        reply: "",
        rule: "model-not-build-overridden",
        source: "model",
        model,
        tool,
        ms: Date.now() - t0,
        why: `model suggested not_build; keyword said build, so building (model said: ${reply.slice(0, 120)})`,
      };
    }
    return { ...kw, source: "keyword", model, tool, ms: Date.now() - t0, why: "model returned no usable JSON" };
  } catch (e) {
    // Falls back to the keyword result. A keyword "not_build" stays not_build:
    // a timeout can never turn it into a generated site.
    return { ...kw, source: "keyword", model, tool: (e && e.tool) || null, ms: Date.now() - t0, why: String((e && e.message) || e) };
  }
}

  // ── missing-element ────────────────────────────────────────────────────────
// The check that should have caught the page this session published as
// build 143 (2026-09-30): the HTML declared authForm, bookForm, logoutButton
// while script.js wired #auth-form, #book-form, #logout-button, so every one
// of the 23 lookups returned null, appInit threw "Cannot read properties of
// null" on the first wiring line, no button on the page did anything — and
// the verifier reported 0 flags, because no existing check ever compared the
// script against the page it ships with.
//
// An id cannot appear out of thin air: if it is not declared in the HTML and
// its string never occurs in the script (where templates and createElement
// calls would carry it), nothing creates it and the lookup is guaranteed to
// return null. Takes the whole file set, so it is passed `files` alongside the
// script's own content. One aggregated flag, not one per id: the repair only
// needs to be told the naming convention that drifted.
function missingElements(content, allFiles) {
  const files = allFiles || [];
  const html = files.filter((f) => /\.html?$/i.test(f.path)).map((f) => f.content).join("\n");
  missingElements.diag = { htmlBytes: html.length, idsHave: 0, lookups: 0, missing: 0, idHelper: false, why: "" };
  if (!html || !content) { missingElements.diag.why = "no html or no content"; return []; }
  const have = new Set([...html.matchAll(/\bid\s*=\s*["']([^"']+)["']/g)].map((m) => m[1]));
  missingElements.diag.idsHave = have.size;
  if (!have.size) { missingElements.diag.why = "html has no id= attributes"; return []; }
  // Ids the script CREATES itself — inside a template it injects, or an
  // assignment to el.id — which is the only way an id can exist without being
  // in the page. Deliberately NOT "any string literal in the script": the
  // first draft of this used that and suppressed every lookup, because
  // $('auth-form') obviously contains the literal "auth-form" (measured: that
  // version reported 1 missing id where the page really had 23).
  const made = new Set();
  for (const m of content.matchAll(/\bid\s*=\s*["']([^"']+)["']/g)) made.add(m[1]);
  for (const m of content.matchAll(/\.id\s*=\s*["']([^"']+)["']/g)) made.add(m[1]);
  for (const m of content.matchAll(/setAttribute\(\s*["']id["']\s*,\s*["']([^"']+)["']\s*\)/g)) made.add(m[1]);
  // Only treat $(x) as an id lookup when it is one: this script reaches for
  // elements with getElementById (directly or through its $ wrapper), or the
  // call names an explicit '#id'. $('.row') is a class selector and belongs to
  // the selector-mismatch check, not here.
  const idHelper = /\bgetElementById\b/.test(content);
  missingElements.diag.idHelper = idHelper;
  const seen = new Set();
  const missing = [];
  const near = (id) => {
    const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
    const n = norm(id);
    for (const h of have) if (norm(h) === n && h !== id) return h;
    return null;
  };
  const take = (id) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    if (have.has(id) || made.has(id)) return;
    const h = near(id);
    missing.push(h ? id + "->" + h : id);
  };
  // Only unguarded lookups are claimed, because only those can throw. A null
  // the code defends — const x = $('x'), $('x') || fallback, $('x')?.go,
  // if ($('x')) — fails quietly, and a heuristic that reports those as "the
  // page dies here" would be saying something this session has not measured.
  // Measured both ways: build 143's unguarded $('auth-form') threw and took
  // appInit with it, while 251's const n = $('mainNav') || $('.main-nav')
  // falls through and its page works. (Guarded-but-wrong ids — a control the
  // script quietly skips — remain an untested gap, recorded as such.)
  const guarded = (start, end) => {
    const before = content.slice(Math.max(0, start - 12), start).replace(/\s+$/, "");
    const after = content.slice(end, end + 6);
    return /[=(]$/.test(before) || /^\s*(\|\||\?\.)/.test(after);
  };
  const ref = (id, start, end) => { if (!guarded(start, end)) take(id); };
  if (idHelper) {
    for (const m of content.matchAll(/\$\(\s*["'`]#?([^"'`)\s]+)["'`]\s*\)/g)) {
      if (/^[.[\]]/.test(m[1])) continue; // .class or [attr] selector
      ref(m[1], m.index, m.index + m[0].length);
    }
  }
  for (const m of content.matchAll(/getElementById\(\s*["'`]([^"'`]+)["'`]\s*\)/g)) ref(m[1], m.index, m.index + m[0].length);
  for (const m of content.matchAll(/querySelector(?:All)?\(\s*["'`]#([^"'`]+)["'`]\s*\)/g)) ref(m[1], m.index, m.index + m[0].length);
  missingElements.diag.lookups = seen.size;
  missingElements.diag.missing = missing.length;
  if (!missing.length) { missingElements.diag.why = "every lookup resolved"; return []; }
  const shown = missing.slice(0, 4).join(", ");
  return [`${missing.length} id(s), first: ${shown}`];
}


async function runGenerate(env, user, projectId, plan, mode, origin, buildId = null) {
  const started = Date.now();
  // The UI polls GET /api/builds/:id and appends every NEW entry it has not
  // seen yet. Writing the log after each stage is what makes the chat move
  // instead of sitting on one frozen bubble for two minutes.
  const log = [];
  const push = async (agent, message, extra) => {
    log.push({ agent, message, at: new Date().toISOString(), ...(extra || {}) });
    if (buildId) {
      try {
        await env.DB.prepare("UPDATE builds SET agent_log=? WHERE id=?")
          .bind(JSON.stringify(log), buildId).run();
      } catch {}
    }
  };
  const finish = async (status, files, preview, note) => {
    if (buildId) {
      await env.DB.prepare(
        "UPDATE builds SET status=?, generated_code=?, preview_html=?, completed_at=? WHERE id=?"
      ).bind(status, JSON.stringify(files), preview, new Date().toISOString(), buildId).run();
      await cacheDrop(env, buildsListKey(projectId));
      return buildId;
    }
    return null;
  };
  const apiOrigin = /^https?:\/\//.test(String(origin || "")) ? String(origin) : "https://createstuff-api.fashionistas1979.workers.dev";
  const brief = API_BRIEF.replace(/__ID__/g, String(projectId)).replace(/__ORIGIN__/g, apiOrigin);

  // ── STAGE 0/3 · CLASSIFIER (runs before the planner) ───────────────────
  const cls = await classifyWithModel(env, plan);
  const clsTool = cls.tool || {
    name: cls.source === "model" ? "model-classifier" : "keyword-classifier",
    endpoint: "inline",
    http: null,
    ms: cls.ms,
  };
  const clsLine = `Classifier tool: ${toolLine(clsTool)} -> ${cls.kind} (rule ${cls.rule}, ${cls.source}${cls.why ? `; ${cls.why}` : ""})`;

  if (cls.kind === "not_build") {
    // The answer IS the reply: one plain paragraph, no site, no preview. It is
    // pushed first so it is the first thing the chat renders. `answer` marks it
    // so the client does not ask the model the same question a second time, and
    // `action` carries the route to the tool that can actually do the job — a
    // paragraph with nowhere to go is how "connect my github" used to end.
    await push("Planner", cls.reply, { answer: true, action: cls.action || null });
    await push("Planner", `${clsLine}. No site generated.`);
    const agents = {
      classifier: { kind: cls.kind, rule: cls.rule, source: cls.source, model: cls.model || null, ms: cls.ms },
      planner: null,
      writer: null,
      verifier: "not-run",
      repair: "not-run",
      flagsBefore: 0,
      flagsAfter: 0,
      elapsedMs: Date.now() - started,
    };
    let outBuildId = buildId || null;
    if (buildId) {
      // The row exists (POST /api/builds created it) — close it out with an
      // empty preview so the polling UI stops and renders NO website.
      await env.DB.prepare(
        "UPDATE builds SET status='answered', generated_code='', preview_html='', completed_at=?, agent_log=? WHERE id=?"
      ).bind(new Date().toISOString(), JSON.stringify(log), buildId).run();
      await cacheDrop(env, buildsListKey(projectId));
    }
    // `notes` carries the reply itself: every client that has nothing to
    // render shows this string, and it must be the paragraph, not a summary.
    return json({
      ok: false,
      notBuild: true,
      kind: cls.kind,
      reply: cls.reply,
      action: cls.action || null,
      files: [],
      notes: cls.reply,
      model: cls.model || null,
      source: cls.source,
      buildId: outBuildId,
      agents,
    });
  }

  // ── STAGE 1/3 · MANAGER ─────────────────────────────────────────────────
  const manager = await planAgent(env, plan);
  const hasPlan = !!(manager && manager.spec);
  await push(
    "Planner",
    hasPlan
      ? `${clsLine}. Planner tool: ${toolLine(manager.tool)} -> plan ready (${manager.model}): ${String(manager.spec).replace(/\s+/g, " ").slice(0, 220)}`
      : `${clsLine}. Planner tool: ${toolLine(manager.tool)} -> no plan (${manager.why}). Building straight from your sentence.`
  );
  const specBlock = hasPlan
    ? `\n\nBUILD SPEC FROM THE PLANNER (derived from the brief — satisfy it, and add nothing it does not call for):\n${manager.spec}`
    : "";

  // The plan is the first thing the cockpit shows: the reader on the other
  // end gets to see WHAT is about to be built before any code exists, and the
  // card keeps a live stage line while the writer, tester and repair agents
  // run. It is only ever additive — when the planner returns nothing, no Plan
  // entry is written and the old path is untouched.
  if (hasPlan) await push("Plan", String(manager.spec || "").trim());

  // ── STAGE 2/3 · EDITOR ──────────────────────────────────────────────────
  // The writer gets 16,000 tokens, not 8,000: a full three-file answer runs
  // past 8k and a torn JSON array salvages to whatever objects closed first,
  // which is how build 140 came back with styles.css and no page. The relay
  // deadline is unchanged (110 s) because it is keyed on maxTok <= 1500.
  const g = await gen(env, CODE_SYS, `${brief}${specBlock}\n\nBRIEF FROM THE USER:\n${String(plan || "").slice(0, 6000)}`, 16000);
  let files = finalizeFiles(extractFiles(g));

  // ── INDEX-HTML GATE ─────────────────────────────────────────────────────
  // The writer can run out of room before it reaches the index.html object —
  // build 140 (2026-09-30) came back with styles.css alone after a 94 s write
  // — and with no index.html there is nothing to publish, nothing for the
  // missing-asset gate to read and no page for the visitor. Ask for that ONE
  // file by name: it is the smallest of the three and the only load-bearing
  // one, and the missing-asset gate below then asks for whatever it links.
  // This runs BEFORE the router/shim/sanitizer passes so a repaired file set
  // is treated exactly like one that arrived whole.
  if (!files.some((f) => /(^|\/)index\.html?$/i.test(f.path)) && Date.now() - started < 150000) {
    const had = files.map((f) => f.path).join(", ") || "nothing parseable";
    await push("Fix", `Fix tool: -> the editor returned ${had} and no index.html, so there is no page at all. Asking the editor for that file alone.`);
    try {
      const gIdx = await gen(
        env,
        CODE_SYS,
        `You were asked to build a site. Your answer contained ${had} but no index.html, so there is nothing to open and nothing to publish.\n\n` +
          `Return ONLY index.html as a JSON array of one {"path","content"} object, complete and ready to use. ` +
          `No prose, no markdown fences, no truncation. index.html FIRST: it is the file the whole build depends on.\n\n` +
          `BRIEF:\n${String(plan || "").slice(0, 3000)}`,
        16000
      );
      const idx = finalizeFiles(extractFiles(gIdx)).find((f) => /(^|\/)index\.html?$/i.test(f.path));
      if (idx && siteOk([idx])) {
        files = files.concat([idx]);
        await push("Fix", `Fix tool: ${toolLine(gIdx.tool)} -> index.html written (${idx.content.length.toLocaleString("en-US")} chars).`);
      } else {
        await push(
          "Fix",
          `Fix tool: the editor did not return an index.html (came back with [${finalizeFiles(extractFiles(gIdx)).map((f) => f.path).join(", ") || "nothing parseable"}]).`
        );
      }
    } catch (e) {
      await push("Fix", `Fix tool: could not ask for index.html (${String((e && e.message) || e).slice(0, 120)}).`);
    }
  }

  let replaced = sanitizeAssets(files);
  let routed = injectNavRouter(files);
  let shimmed = injectStorageShim(files);
  let ok = siteOk(files);
  const verifyStart = Date.now();
  let qFlags = qualityFlags(files, plan);
  const verifyMs = Date.now() - verifyStart;
  await push(
    "Frontend",
    `Frontend tool: ${toolLine(g.tool)} -> ${g.model} wrote ${files.length} file(s): ${files.map((f) => f.path).join(", ")} — ${files.reduce((n, f) => n + f.content.length, 0).toLocaleString("en-US")} chars`
  );

  // ── STAGE 3/3 · VERIFIER (rules) → REPAIR (model, only if flagged) ──────
  let repairState = "verifier-passed";
  const flagsBefore = qFlags.length;
  await push(
    "Test",
    `Test tool: ${toolLine({ name: "qualityFlags", endpoint: "inline", http: null, ms: verifyMs })} -> ` +
    (ok
      ? qFlags.length
        ? `found ${qFlags.length} problem(s): ${qFlags.join(", ")}. Sending them to the repair agent.`
        : "found nothing to fix."
      : "the model did not return a usable index.html.")
  );
  // The Worker is killed at ~180s, so a third model call must be dropped rather
  // than allowed to run the whole build into the cap.
  if (ok && qFlags.length && Date.now() - started < 140000) {
    const attempt = await repairAgent(env, files, qFlags, plan);
    if (attempt) {
      files = attempt.files;
      // Each transform checks its own marker first, so re-applying them to
      // whatever the repair agent returned cannot double-inject.
      replaced = sanitizeAssets(files);
      routed = injectNavRouter(files);
      shimmed = injectStorageShim(files);
      qFlags = qualityFlags(files, plan);
      repairState = `fixed-${attempt.fixed}`;
      await push("Fix", `Fix tool: ${toolLine(attempt.tool)} -> repair agent cleared ${attempt.fixed} of ${flagsBefore} problem(s).`);
    } else {
      repairState = "kept-original";
      await push("Fix", "Fix tool: repair agent returned nothing usable — keeping the writer's code.");
    }
  }

  // ── MISSING-ASSET GATE ──────────────────────────────────────────────────
  // The repair agent can only rewrite index.html, so it cannot author a
  // stylesheet or a script that nobody wrote. Ask the editor for the missing
  // files BY NAME — a small, focused answer that fits easily inside the token
  // budget — and fail honestly if they still do not arrive.
  let missing = ok ? missingAssets(files) : [];
  let missingNote = "";
  if (missing.length && Date.now() - started < 150000) {
    const idxRetry = (files.find((f) => /(^|\/)index\.html?$/i.test(f.path)) || { content: "" }).content;
    await push("Fix", `Fix tool: -> the page links ${missing.join(", ")} but they were never written. Asking the editor for those files only.`);
    try {
      const g2 = await gen(
        env,
        CODE_SYS,
        `You wrote index.html but left out the file(s) it links: ${missing.join(", ")}. ` +
          `That makes the page render unstyled and with no behaviour, so it is broken.\n\n` +
          `Return ONLY the missing file(s) as a JSON array of {"path","content"} objects, complete and ready to use. ` +
          `Do NOT return index.html, do NOT use markdown fences, and do NOT truncate.\n\n` +
          `MISSING FILES: ${missing.join(", ")}\n\n` +
          `--- index.html (for context only — do not return it) ---\n${idxRetry.slice(0, 6000)}`,
        // 16,000, not 8,000: a complete stylesheet for a whole app runs past
        // 8k tokens, and a truncated JSON array parses to nothing at all —
        // build 139 lost the build to exactly this ("the editor did not return
        // styles.css") after the ask itself succeeded.
        16000
      );
      const extra = finalizeFiles(extractFiles(g2));
      const added = extra.filter(
        (f) => missing.includes(String(f.path).replace(/^\.?\//, "")) && !files.some((x) => x.path === f.path)
      );
      if (added.length) {
        files = files.concat(added);
        qFlags = qualityFlags(files, plan);
        await push("Fix", `Fix tool: ${toolLine(g2.tool)} -> wrote ${added.map((f) => f.path).join(", ")}`);
      } else {
        // Say what came back instead of only what did not: the next failure of
        // this kind has to be diagnosable from the log alone.
        const back = extra.map((f) => f.path).join(", ") || "nothing parseable";
        const peek = String(g2.text || "").replace(/\s+/g, " ").slice(0, 140);
        await push(
          "Fix",
          `Fix tool: the editor did not return ${missing.join(", ")} — it came back with [${back}] (${peek ? `start: ${peek}` : "empty"}).`
        );
      }
    } catch (e) {
      await push("Fix", `Fix tool: could not ask for the missing files (${String((e && e.message) || e).slice(0, 120)}).`);
    }
    missing = missingAssets(files);
  }
  if (missing.length) {
    ok = false;
    missingNote = `This build left out ${missing.join(", ")} — the page links them, so it would open broken. Build it again.`;
    await push("Test", `Test tool: -> still missing ${missing.join(", ")} after repair. Refusing to save a broken file set.`);
  }

  // ── SCRIPT-HEALTH GATE ────────────────────────────────────────────────
  // Same principle as the missing-asset gate: a file the browser cannot run, or
  // a handler nobody will ever reach, is a broken build — and saying so beats
  // shipping a page where every button is dead. The repair agent only rewrites
  // index.html, so a defective script gets re-asked FOR BY NAME — the same
  // focused single-file retry the missing-asset gate already uses — with the
  // defects spelled out in plain words. A file that still does not parse after
  // that retry fails the build honestly instead of publishing a corpse; rule
  // warnings that survive are recorded as quality flags, because a name
  // heuristic must never be able to refuse a build that actually works.
const JS_CHECKS = [
    [
      "unwired-handlers",
      unwiredHandlers,
      (n) =>
        `${n}() is defined but nothing ever calls it, so every handler inside it stays unattached — the buttons on the page do nothing.`
    ],
    [
      "submit-no-preventdefault",
      submitNoPreventDefault,
      (n) =>
        `the submit handler ${n}() never calls preventDefault(), so the browser reloads the page and cancels the request it just started.`
    ],
    [
      "selector-mismatch",
      selectorMismatches,
      (n) =>
        `${n} is a class selector handed to an id-lookup helper. It returns null, the .addEventListener on null throws, and every handler wired after that line in the same function never attaches.`
    ],
    [
      "event-passed-as-form",
      eventAsForm,
      (n) =>
        `${n}(form, ...) is being handed the event but treats its first argument as the form (form.querySelector, form.reportValidity). An event has no such methods, so it throws on the first submit and nothing happens.`
    ],
    [
      "missing-element",
      missingElements,
      (n) =>
        `${n} — ids the script looks up unguarded and the page never declares. Each of those returns null, the first .addEventListener on null throws, and everything after it in appInit never runs: the page loads, looks finished, and no button works. Use the ids the HTML actually declares — the arrow shows the name that exists (measured on build 143, where 20 of them missed and the verifier still said 0 flags).`
    ],
    [
      "unreachable-mode",
      unreachableMode,
      (n) => {
        const [fn, lit] = [n.slice(0, n.lastIndexOf(":")), n.slice(n.lastIndexOf(":") + 1)];
        return `${fn}() branches on ${lit} but no caller ever passes it, so the control that offers that choice (a tab, a toggle) only changes the label while the handler keeps sending the other mode — measured on project 250, where Create account still posted /auth/login and no account was ever created.`;
      }
    ]
  ];
  const jsList = () => files.filter((f) => /\.m?js$/i.test(f.path));
  const scanScript = (f) => {
    const parse = jsSyntaxError(f.content);
    const warn = [];
    for (const [flag, fn, say] of JS_CHECKS) {
      // Second argument is the whole file set: some checks (missing-element)
      // can only be judged by comparing the script with the page it ships
      // alongside, which a single file's text cannot tell you.
      for (const n of fn(f.content, files)) warn.push({ flag: `${flag}:${n}`, say: say(n) });
    }
    return { f, parse, warn };
  };
  const scanAll = () => jsList().map(scanScript).filter((s) => s.parse || s.warn.length);
  const defectScore = (s) => (s.parse ? 1000 : 0) + s.warn.length;
  const parseT0 = Date.now();
  let problems = scanAll();
  // Emitted even when clean. Silence is indistinguishable from "never ran",
  // and that is exactly how build 144 shipped a page whose appInit threw
  // while this gate reported 0 flags — the offline control flagged 15 ids on
  // those same published files, so the line has to say what it actually saw.
  const md = missingElements.diag || {};
  await push(
    "Test",
    `Test tool: ${toolLine({ name: "script-health", endpoint: "inline", http: null, ms: Date.now() - parseT0 })} -> ` +
      `${jsList().length} script(s) scanned | missing-element: html=${md.htmlBytes || 0}b ids=${md.idsHave || 0} lookups=${md.lookups || 0} missing=${md.missing || 0} idHelper=${md.idHelper ? 1 : 0}${md.why ? ` [${md.why}]` : ""} | ` +
      (problems.length
        ? `${problems.length} file(s) with defects: ${problems
            .map((p) => `${p.f.path}=${p.parse ? "parse-broken" : p.warn.map((w) => w.flag).join(",")}`)
            .join(" ; ")}`
        : "0 defects")
  );

  if (problems.length && Date.now() - started < 150000) {
    for (const p of problems.slice(0, 2)) {
      const bullets = (p.parse ? [`it does not parse: ${p.parse}`] : []).concat(p.warn.map((w) => w.say));
      await push(
        "Fix",
        `Fix tool: -> ${p.f.path} has ${bullets.length} defect${bullets.length === 1 ? "" : "s"} that would leave the page unusable. Asking the editor for that file again.`
      );
      try {
        const g3 = await gen(
          env,
          CODE_SYS,
          `You wrote ${p.f.path}. A visitor cannot use this page because of ${bullets.length === 1 ? "this defect" : "these defects"}:\n` +
            bullets.map((b) => `- ${b}`).join("\n") +
            `\n\nReturn ONLY the complete corrected file as a JSON array of one {"path","content"} object. No prose, no markdown fences, no truncation. Change only what these defects require.\n\n--- ${p.f.path} ---\n${p.f.content}`,
          // 16,000 for the same reason as the missing-asset retry: a torn JSON
          // array salvages to nothing, and a full script is bigger than 8k.
          16000
        );
        const fixed = finalizeFiles(extractFiles(g3)).find(
          (x) => String(x.path).replace(/^\.?\//, "") === String(p.f.path).replace(/^\.?\//, "")
        );
        const after = fixed ? scanScript(fixed) : null;
        if (after && defectScore(after) < defectScore(p)) {
          files = files.map((x) => (x.path === p.f.path ? fixed : x));
          await push(
            "Fix",
            `Fix tool: ${toolLine(g3.tool)} -> ${p.f.path} now ${after.parse ? "still does not parse" : "parses"} with ${after.warn.length} warning(s) left.`
          );
        } else {
          await push(
            "Fix",
            `Fix tool: ${p.f.path} came back no better${fixed ? ` (${after.parse || `${after.warn.length} warning(s)`})` : " — the editor did not return it"}. Keeping what the editor first wrote.`
          );
        }
      } catch (e) {
        await push("Fix", `Fix tool: could not re-ask for ${p.f.path} (${String((e && e.message) || e).slice(0, 120)}).`);
      }
    }
    problems = scanAll();
  }

  const stillBroken = problems.filter((p) => p.parse);
  if (stillBroken.length) {
    ok = false;
    const detail = stillBroken.map((b) => `${b.f.path} (${b.parse})`).join(", ");
    missingNote += `${missingNote ? " " : ""}${detail} — this script does not parse, so the page would open with every button dead. Build it again.`;
    await push("Test", `Test tool: -> ${detail} still does not parse. Refusing to save a broken file set.`);
  }
  // Logged even when clean: a gate nobody can see cannot be told apart from a
  // gate that is not there.
  if (jsList().length) {
    const parseMs = Date.now() - parseT0;
    await push(
      "Test",
      `Test tool: ${toolLine({ name: "acorn", endpoint: "inline", http: null, ms: parseMs })} -> ` +
        (stillBroken.length ? `${stillBroken.length} script(s) still do not parse` : `${jsList().length} script(s) parse cleanly`)
    );
  }

  // The four advisory checks: they parse, so they are not fatal — they are
  // recorded so the next build of the same brief starts from the record.
  const warned = problems.filter((p) => p.warn.length);
  if (warned.length) {
    const detail = warned.map((p) => `${p.f.path}: ${p.warn.map((w) => w.flag).join(", ")}`).join("; ");
    await push("Test", `Test tool: -> ${detail} — recorded as quality flags, not fatal.`);
    qFlags = qFlags.concat(warned.flatMap((p) => p.warn.map((w) => w.flag)));
  }

  const code = files.map((f) => f.content).join("\n");
  const apiCalls = (code.match(/\bfetch\s*\(/g) || []).length;
  const usesAuth = /auth\/(login|register)/.test(code);
  const agentNote = `agents: classifier=${cls.source}/${cls.rule}, planner=${hasPlan ? manager.model : "off"}, writer=${g.model}, verifier=rules(${flagsBefore} flag${flagsBefore === 1 ? "" : "s"}), repair=${repairState}, http-fetches=${FETCH_WRAPPED ? FETCH_N : "n/a"} of 50-subrequest cap (D1/KV not countable from here)`;

  const note = ok
    ? `${files.length} files, ${files.reduce((n, f) => n + f.content.length, 0)} chars${replaced ? `, ${replaced} external image(s) swapped for CSS art` : ""}${routed ? ", nav-router=1" : ""}${shimmed ? ", storage-shim=1" : ""}; fetch()=${apiCalls}${usesAuth ? ", auth=yes" : ""}${qFlags.length ? `; QUALITY: ${qFlags.join(", ")}` : "; quality=clean"}; ${agentNote}`
    : (missingNote || "model output did not contain a usable index.html");

  const preview = ok ? files.find((f) => /index\.html?$/i.test(f.path)).content : "";
  await push("Online", ok ? `Build finished in ${Date.now() - started}ms. Press Put online to get a web address.` : `Build failed after ${Date.now() - started}ms — try describing it again.`);

  let outBuildId = buildId;
  if (buildId) {
    // The row was created by POST /api/builds before the work started, so it
    // gets filled in rather than a second row being inserted.
    await finish(ok ? "completed" : "failed", files, preview, note);
  } else {
    const ins = await env.DB.prepare(
      "INSERT INTO builds (project_id, status, prompt, generated_code, preview_html, agent_log, started_at, completed_at) VALUES (?,?,?,?,?,?,?,?)"
    ).bind(
      projectId,
      ok ? "completed" : "failed",
      String(plan || "").slice(0, 4000),
      JSON.stringify(files),
      preview,
      JSON.stringify([{ mode, model: g.model, note, at: new Date().toISOString(), planner: hasPlan ? manager.model : null, verifier: "rules", flags: qFlags, repair: repairState }]),
      new Date(started).toISOString(),
      new Date().toISOString()
    ).run();
    outBuildId = ins.meta.last_row_id;
    await cacheDrop(env, buildsListKey(projectId));
  }
  const buildIdOut = outBuildId;

  if (ok) await saveFiles(env, projectId, files, buildIdOut);

  await env.DB.prepare("UPDATE projects SET status=?, updated_at=? WHERE id=?")
    .bind(ok ? "built" : "failed", new Date().toISOString(), projectId).run();
  // The projects LIST is ordered by updated_at, so a status flip is a write to
  // that collection too — drop the caller's cached list.
  await cacheDrop(env, projectsListKey(user.sub));

  const agents = {
    classifier: { kind: cls.kind, rule: cls.rule, source: cls.source, model: cls.model || null, ms: cls.ms },
    planner: hasPlan ? manager.model : null,
    writer: g.model,
    verifier: "rules",
    repair: repairState,
    flagsBefore,
    flagsAfter: qFlags.length,
    elapsedMs: Date.now() - started,
  };
  if (!ok) {
    return json({ ok: false, files: [], model: g.model, notes: note, agents, plan: hasPlan ? String(manager.spec || "").trim() : null, error: missingNote || "The model did not return a usable site. Try again." }, 422);
  }
  return json({ ok: true, files, model: g.model, notes: note, buildId: buildIdOut, checkpointId: `cp-${buildIdOut}`, agents, plan: hasPlan ? String(manager.spec || "").trim() : null });
}

// ── PER-PROJECT APP BACKEND ──────────────────────────────────────────────
// Every generated app gets a real API and real end-user login on the same
// origin it is served from, so fetch() works in preview and when published.
// DDL at runtime was verified against createstuff-db: {"ddl":"ok","write_read":1}.
const APP_JSON_LIMIT = 64 * 1024;

let appTablesReady = false;
let appTablesPending = null;

async function ensureAppTables(env) {
  // CREATE TABLE IF NOT EXISTS never alters an existing table, so re-running
  // all three on every request bought nothing and cost three D1 round trips on
  // the read hot path (they were 3 of the 4 queries behind a collection LIST).
  // Run once per isolate; only mark ready after success so a transient D1
  // failure retries on the next request instead of being cached as "done".
  if (appTablesReady) return;
  const p = appTablesPending || (appTablesPending = (async () => {
    await env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS app_data (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         project_id INTEGER NOT NULL,
         collection TEXT NOT NULL,
         payload TEXT,
         owner_id INTEGER,
         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
       )`
    ).run();
    await env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS app_users (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         project_id INTEGER NOT NULL,
         email TEXT NOT NULL,
         password_hash TEXT NOT NULL,
         display_name TEXT,
         created_at DATETIME DEFAULT CURRENT_TIMESTAMP
       )`
    ).run();
    await env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS app_sessions (
         token TEXT PRIMARY KEY,
         project_id INTEGER NOT NULL,
         user_id INTEGER NOT NULL,
         expires_at INTEGER NOT NULL
       )`
    ).run();
    appTablesReady = true;
  })());
  try {
    await p;
  } finally {
    if (appTablesPending === p) appTablesPending = null;
  }
}

// ── ENVIRONMENT VARIABLES FOR A GENERATED APP ──────────────────────────────
// plan.md P0: "Secrets / environment UI for the generated app, not just
// ours." Until now the builder only had OUR keys (an AI key and a GitHub PAT,
// both browser-local), so an app that needed a base URL or a public key had no
// place to get one.
//
// Same lazy-DDL pattern as ensureAppTables: CREATE TABLE IF NOT EXISTS is a
// no-op on an existing table, and the D1 REST API is not reachable from this
// machine, so the binding is the only thing that can create it.
let envTableReady = false;
let envTablePending = null;
async function ensureEnvTable(env) {
  if (envTableReady) return;
  const p = envTablePending || (envTablePending = (async () => {
    await env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS project_env (
         project_id INTEGER NOT NULL,
         key TEXT NOT NULL,
         value TEXT,
         user_id INTEGER NOT NULL,
         updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         PRIMARY KEY (project_id, key)
       )`
    ).run();
    envTableReady = true;
  })());
  try {
    await p;
  } finally {
    if (envTablePending === p) envTablePending = null;
  }
}

// Variable names look like the ones a build tool would accept: a letter or
// underscore first, then letters, digits or underscores, up to 64 characters.
// Anything else is a typo waiting to happen in the app's own code.
const ENV_KEY_RE = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/;
const ENV_VALUE_MAX = 4096;
const ENV_MAX_PER_PROJECT = 50;

// One published file, as a Response — the single place that reads a project's
// bytes and decides what it is. Two callers need exactly this and no more:
// /published/<id>/<path> (the branded short address) and /api/hosts/serve
// (the same site under its own <name>.createstuff.ai address). Keeping it in
// one function means the two addresses can never drift apart — a fix to the
// content type or the environment injection lands on both at once.
//
// Returns null when there is no such file, so a caller can answer 404 itself
// with whatever wording suits its own route.
async function projectFileResponse(env, projectId, filePath) {
  const row = await env.DB.prepare(
    "SELECT content FROM project_files WHERE project_id=? AND (path=? OR file_path=?)"
  ).bind(projectId, filePath, filePath).first();
  if (!row) return null;
  const type = /\.css$/i.test(filePath) ? "text/css; charset=utf-8"
    : /\.js$/i.test(filePath) ? "application/javascript; charset=utf-8"
    : /\.json$/i.test(filePath) ? "application/json"
      : "text/html; charset=utf-8";
  // Only HTML carries window.__ENV and window.__APP; a stylesheet or a script
  // gets the exact bytes that were built, because neither has a page to run in.
  const content = type.startsWith("text/html")
    ? injectAppRuntime(projectId, await injectProjectEnv(env, projectId, row.content || ""))
    : (row.content || "");
  return new Response(content, {
    headers: { ...CORS, "Content-Type": type, "Cache-Control": "no-cache" },
  });
}

// Hands the published page its own configuration as `window.__ENV`.
//
// Read at SERVE time, not at publish time, for three reasons: changing a value
// takes effect on the next request instead of waiting for a rebuild; the user's
// source file is never rewritten with values they did not type there; and the
// stored bytes stay byte-for-byte what the builder produced.
//
// A generated app is a static page, so anything injected here is readable by
// anyone who opens devtools. The UI says so in plain words — this is for a
// base URL, a brand name or a domain-restricted public key, not a password.
async function injectProjectEnv(env, projectId, html) {
  let rows;
  try {
    await ensureEnvTable(env);
    rows = await env.DB.prepare("SELECT key, value FROM project_env WHERE project_id=?").bind(projectId).all();
  } catch {
    return html;   // no table yet or a transient D1 blip: serve the page anyway
  }
  const vars = {};
  for (const r of (rows && rows.results) || []) vars[r.key] = r.value == null ? "" : String(r.value);
  if (!Object.keys(vars).length) return html;
  // `\u003c` instead of `<` so a value containing </script> cannot close the
  // tag early and run as code the owner never wrote.
  const js = `<script>window.__ENV=${JSON.stringify(vars).replace(/</g, "\\u003c")};</script>`;
  const at = html.search(/<\/head\s*>/i);
  return at >= 0 ? html.slice(0, at) + js + html.slice(at) : js + html;
}

// ── THE APP'S OWN DATABASE AND SIGN-INS — THE MISSING WIRE ─────────────────
// Everything on the server side has existed for a while: `app_data`,
// `app_users`, `app_sessions` and the `/app/:id/api/*` routes that read and
// write them (list/create/update/delete + register/login/logout/me + storage).
// What never existed was the connection. Measured on live, before this, with a
// real build:
//   * the writer's prompt said nothing about a backend, so it told the app to
//     use localStorage — a control build of "a reading list I can sign in to"
//     produced 7 localStorage calls, 0 references to any API;
//   * the served page carried no address for that API (`window.__APP`, 0
//     occurrences on the published bytes);
//   * and the CORS method list omitted PATCH, so a page that *had* the address
//     still could not update a row it owned.
// Three parts, all built, wired to nothing. This is the fourth part: the page
// is told, at serve time, where its own backend lives.
//
// `api.createstuff.ai` is NOT used as the base: that hostname belongs to a
// worker on a third Cloudflare account that this machine cannot deploy to, so
// it answers with 401 for our routes. The worker's own address is the one that
// is guaranteed to be this code.
const APP_API_ORIGIN = "https://createstuff-api.fashionistas1979.workers.dev";

// The handle plus a helper that does the parts a model reliably gets wrong.
//
// Measured on the first treatment build (2026-09-29, project 242): it reached
// the backend correctly but wrote the host and project id into its own source
// instead of reading them, and its POST carried only Content-Type — no
// Authorization — so `owner_id` came back null and the row would have been
// invisible to the very `?mine=1` query the same app used to load the list. A
// personal list that cannot show the person's own items is worse than no list.
// Both defects are now handled by the platform rather than by remembering.
const APP_SDK = `(function(){
  var K="app_token";
  function tk(){ try{ return localStorage.getItem(K)||""; }catch(e){ return ""; } }
  function hd(o){ var h={"Content-Type":"application/json"}; var t=tk(); if(t) h.Authorization="Bearer "+t; return Object.assign(h,o||{}); }
  async function call(p,o){ o=o||{};
    var r=await fetch(window.__APP.api+p,{method:o.method||"GET",headers:hd(o.headers),body:o.body===undefined?undefined:JSON.stringify(o.body)});
    var d=null; try{ d=await r.json(); }catch(e){}
    if(!r.ok) throw new Error((d&&d.error)||("Request failed ("+r.status+")"));
    return d; }
  function keep(d){ try{ if(d&&d.token) localStorage.setItem(K,d.token); }catch(e){} return d; }
  window.__APP.api=window.__APP.api||"";
  // A personal read with nobody signed in used to answer 401, and the app's own
  // appInit logged "Sign in to read your own rows" as a console error before the
  // page had rendered anything — measured on a cleared-storage first visit to
  // project 246 (2026-09-30): 4 console errors on load. Ask for "mine" only when
  // a session exists, and fall back to the public list if that session has since
  // expired. A guest still gets public rows; they can never get someone else's.
  window.__APP.list=function(c,mine){
    if(!mine || !tk()) return call("/"+c);
    return call("/"+c+"?mine=1").catch(function(){ return call("/"+c); });
  };
  window.__APP.get=function(c,id){ return call("/"+c+"/"+id); };
  window.__APP.create=function(c,body){ return call("/"+c,{method:"POST",body:body}); };
  window.__APP.update=function(c,id,body){ return call("/"+c+"/"+id,{method:"PATCH",body:body}); };
  window.__APP.remove=function(c,id){ return call("/"+c+"/"+id,{method:"DELETE"}); };
  window.__APP.register=function(e,p,n){ var b={email:e,password:p}; if(n) b.name=n; return call("/auth/register",{method:"POST",body:b}).then(keep); };
  window.__APP.login=function(e,p){ return call("/auth/login",{method:"POST",body:{email:e,password:p}}).then(keep); };
  window.__APP.logout=function(){ return call("/auth/logout",{method:"POST"}).then(function(){ try{ localStorage.removeItem(K); }catch(e){} },function(){ try{ localStorage.removeItem(K); }catch(e){} }); };
  window.__APP.me=function(){ return call("/auth/me").then(
    function(d){ return (d && d.user) ? d.user : null; },
    function(){ return null; }); };
  function whenReady(fn){ if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",fn); else fn(); }
  whenReady(function(){
    try { if (typeof window.appInit === "function") window.appInit(); }
    catch (e) { console.error("appInit failed:", e); }
  });
})();`;

function injectAppRuntime(projectId, html) {
  if (typeof html !== "string" || !html) return html;
  if (html.includes("window.__APP=")) return html; // already carrying it
  const js = `<script>window.__APP=${JSON.stringify({
    projectId: Number(projectId),
    api: `${APP_API_ORIGIN}/app/${projectId}/api`,
    files: `${APP_API_ORIGIN}/app/${projectId}`,
  })};${APP_SDK}</script>`;
  const at = html.search(/<\/head\s*>/i);
  return at >= 0 ? html.slice(0, at) + js + html.slice(at) : js + html;
}

const cleanCol = (s) => {
  const c = String(s || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40);
  return c || null;
};

async function readJson(request) {
  const t = await request.text();
  // 413, not 500: the body exceeding APP_JSON_LIMIT is a client mistake, not a
  // server fault. The message is unchanged so the error body stays identical.
  if (t.length > APP_JSON_LIMIT) throw new HttpError("payload too large", 413);
  return t ? JSON.parse(t) : {};
}

// Prototype pollution: request bodies are merged into stored objects, so
// __proto__ / constructor / prototype keys are dropped before any merge or
// re-serialisation. Applies to POST creates, PATCH merges, and to payloads read
// back out of app_data. The walk is recursive: a nested dangerous key must not
// survive just because the merge itself is shallow.
const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);
function safeBody(b) {
  if (b === null || typeof b !== "object") return b;
  if (Array.isArray(b)) return b.map(safeBody);
  const out = {};
  for (const [k, v] of Object.entries(b)) {
    if (DANGEROUS_KEYS.has(k)) continue;
    out[k] = safeBody(v);
  }
  return out;
}

async function appSession(request, env, projectId) {
  const t = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!t) return null;
  try {
    const [body, sig] = t.split(".");
    const expect = await hmac(env, body);
    if (sig.length !== expect.length) return null;
    let d = 0;
    for (let i = 0; i < expect.length; i++) d |= sig.charCodeAt(i) ^ expect.charCodeAt(i);
    if (d) return null;
    const p = JSON.parse(new TextDecoder().decode(unb64u(body)));
    if (p.aid !== projectId || !p.uid || !p.exp || p.exp < Date.now()) return null;
    // Consult app_sessions table: reject if the row is gone (logout) or expired.
    // Number() coercion: a driver that hands back INTEGER columns as strings
    // must not cause a false mismatch, which would lock every user out.
    const row = await env.DB.prepare(
      "SELECT user_id FROM app_sessions WHERE token=? AND project_id=? AND expires_at > ?"
    ).bind(t, projectId, Date.now()).first();
    if (!row || Number(row.user_id) !== Number(p.uid)) return null;
    return p;
  } catch {
    return null;
  }
}

async function appUserResponse(env, projectId, row) {
  const token = await signToken(env, { aid: projectId, uid: row.id, exp: Date.now() + 14 * 86400000 });
  await env.DB.prepare(
    "INSERT OR REPLACE INTO app_sessions (token, project_id, user_id, expires_at) VALUES (?,?,?,?)"
  ).bind(token, projectId, row.id, Date.now() + 14 * 86400000).run();
  return { token, user: { id: row.id, email: row.email, name: row.display_name || row.email } };
}

async function serveAppFile(env, url, projectId, filePath) {
  // Traversal: the request path is percent-decoded here, so ".." can appear
  // (e.g. /app/125/..%2f..%2fother). There is no filesystem — the lookup is an
  // exact string match on project_files — but reject dot segments anyway so a
  // stored row from another project can never be addressed by a crafted path.
  // project_id is in the WHERE clause of every lookup, which is what actually
  // bounds a read to this project.
  const segs = String(filePath || "").replace(/\\/g, "/").split("/");
  if (segs.some((s) => s === "..")) return err("Not found", 404);
  const row = await env.DB.prepare(
    "SELECT content FROM project_files WHERE project_id=? AND (path=? OR file_path=?)"
  ).bind(projectId, filePath, filePath).first();
  if (!row) return err("Not found", 404);
  const type = /\.css$/i.test(filePath) ? "text/css; charset=utf-8"
    : /\.js$/i.test(filePath) ? "application/javascript; charset=utf-8"
    : /\.json$/i.test(filePath) ? "application/json"
    : /\.(png|jpe?g|gif|webp|ico)$/i.test(filePath) ? "application/octet-stream"
      : "text/html; charset=utf-8";
  // Same treatment as projectFileResponse: an HTML page served from this path
  // is told where its own backend is, so a preview and a published copy behave
  // identically rather than one of them silently having no database.
  const body = type.startsWith("text/html")
    ? injectAppRuntime(projectId, row.content || "")
    : (row.content || "");
  return new Response(body, {
    headers: { ...CORS, "Content-Type": type, "Cache-Control": "no-cache" },
  });
}

// Returns a Response when the path belongs to an app, else null so the main
// router keeps handling /api/*.
// `defer` lets a route hand back work that must outlive the response (the
// webhook deliveries). It is optional so the function still stands alone.
async function handleAppRequest(request, env, url, defer) {
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] !== "app") return null;

  // /app/__sdk.js — the helper, served by URL.
  //
  // A published page gets the helper inlined into its own bytes (see
  // injectAppRuntime) so it costs no extra request. The builder's preview
  // cannot: it is assembled in the browser from files it already has, and
  // duplicating the helper in two places is how the two copies drift until the
  // preview passes and the published site throws. One source, fetched by both.
  if (parts[1] === "__sdk.js") {
    return new Response(APP_SDK, {
      headers: {
        ...CORS,
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  const projectId = parseInt(parts[1], 10);
  if (!projectId) return err("unknown app", 404);
  const method = request.method;

  // static: /app/:id/ , /app/:id/index.html , /app/:id/styles.css
  if (parts[2] !== "api") {
    let filePath;
    try {
      filePath = decodeURIComponent(parts.slice(2).join("/"));
    } catch {
      return err("Not found", 404); // malformed percent-encoding, not a file
    }
    // A generated app ships no icon of its own, but the browser asks relative
    // to the document anyway. Answer rather than 404 a file nobody requested.
    if (filePath === "favicon.ico" || filePath === "icon.svg") return faviconResponse();
    return serveAppFile(env, url, projectId, filePath || "index.html");
  }

  // The project must still exist. Without this a deleted app went on accepting
  // writes: rows landed in app_data with nobody left to read them and its auth
  // routes kept minting sessions. One indexed primary-key read, on the API side
  // only — serveAppFile already 404s for a project whose files are gone.
  const stillThere = await env.DB.prepare("SELECT id FROM projects WHERE id=?").bind(projectId).first();
  if (!stillThere) return err("Not found", 404);

  await ensureAppTables(env);
  const seg = parts.slice(3); // api/...
  const sess = await appSession(request, env, projectId);

  // ── end-user auth for the generated app ──
  if (seg[0] === "auth") {
    const action = seg[1];
    if (action === "register" && method === "POST") {
      // Rate limit: 10 requests per minute per IP
      if (!(await rateLimit(env, request, `app:${projectId}:register`, 10, 60))) {
        return err("Too many registration attempts — wait a minute", 429);
      }
      const b = await readJson(request);
      const email = String(b.email || "").trim();
      const password = String(b.password || "");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return err("A valid email is required", 422);
      if (password.length < 6) return err("Password must be at least 6 characters", 422);
      const dupe = await env.DB.prepare(
        "SELECT id FROM app_users WHERE project_id=? AND email=?"
      ).bind(projectId, email).first();
      if (dupe) return err("That email is already registered", 409);
      const hash = await pbkdf2(password);
      const r = await env.DB.prepare(
        "INSERT INTO app_users (project_id, email, password_hash, display_name, created_at) VALUES (?,?,?,?,?)"
      ).bind(projectId, email, hash, String(b.name || "").trim() || email.split("@")[0], new Date().toISOString()).run();
      const row = await env.DB.prepare("SELECT * FROM app_users WHERE id=?").bind(r.meta.last_row_id).first();
      return json(await appUserResponse(env, projectId, row), 201);
    }
    if (action === "login" && method === "POST") {
      // Rate limit: 10 requests per minute per IP
      if (!(await rateLimit(env, request, `app:${projectId}:login`, 10, 60))) {
        return err("Too many login attempts — wait a minute", 429);
      }
      const b = await readJson(request);
      const email = String(b.email || "").trim();
      const row = await env.DB.prepare("SELECT * FROM app_users WHERE project_id=? AND email=?")
        .bind(projectId, email).first();
      if (!row || !(await verifyPassword(String(b.password || ""), row.password_hash))) {
        return err("Wrong email or password", 401);
      }
      return json(await appUserResponse(env, projectId, row));
    }
    if (action === "me" && method === "GET") {
      if (!sess) return json({ user: null });
      const row = await env.DB.prepare("SELECT id, email, display_name FROM app_users WHERE id=? AND project_id=?")
        .bind(sess.uid, projectId).first();
      return json({ user: row ? { id: row.id, email: row.email, name: row.display_name || row.email } : null });
    }
    if (action === "logout" && method === "POST") {
      // project_id predicate: a token minted for one app can never delete a
      // session row belonging to another app, even if tokens ever collided.
      if (sess) await env.DB.prepare("DELETE FROM app_sessions WHERE token=? AND project_id=?")
        .bind(request.headers.get("Authorization").replace(/^Bearer\s+/i, ""), projectId).run();
      return json({ ok: true });
    }
    return err("Unknown auth route", 404);
  }

  // ── file storage: /app/:id/api/storage ──
  // Replit and Base44 both include file storage in every app; ours did not, so
  // anything a user photographed or attached had nowhere to go. Objects live in
  // R2 under an `app/<projectId>/` prefix, so one app can never read or delete
  // another's files even if its keys were guessed.
  if (seg[0] === "storage") {
    if (!env.FILES) return err("File storage is not switched on for this app", 501);
    const STORAGE_MAX_BYTES = 10 * 1024 * 1024;
    const origin = new URL(request.url).origin;
    const owner = sess ? sess.uid : null;
    const nsKey = (k) => `app/${projectId}/${k}`;
    // Keep the object key to a flat, URL-safe token. The stored filename is
    // carried in metadata instead of in the path so no traversal is possible.
    const safeName = (n) => String(n || "file")
      .replace(/[^\w.\-]+/g, "_").replace(/^\.+/, "").slice(0, 80) || "file";
    const EXT_TYPE = {
      png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
      webp: "image/webp", svg: "image/svg+xml", ico: "image/x-icon", bmp: "image/bmp",
      pdf: "application/pdf", txt: "text/plain", csv: "text/csv", json: "application/json",
      md: "text/markdown", mp3: "audio/mpeg", wav: "audio/wav", mp4: "video/mp4",
      webm: "video/webm", zip: "application/zip",
    };

    // POST /api/storage — accept what a browser actually sends: a real
    // <input type="file"> arrives as multipart/form-data, a canvas or a
    // drag-and-drop handler usually sends base64 JSON. Both are supported.
    if (method === "POST" && !seg[1]) {
      if (!(await rateLimit(env, request, `app:${projectId}:upload`, 30, 60))) {
        return err("Too many uploads — wait a minute", 429);
      }
      let bytes, name, type = "";
      const ctype = request.headers.get("content-type") || "";
      if (ctype.includes("multipart/form-data")) {
        let fd;
        try { fd = await request.formData(); } catch { return err("Could not read that upload", 422); }
        const f = fd.get("file");
        if (!f || typeof f.arrayBuffer !== "function") {
          return err('Send the file in a form field called "file"', 422);
        }
        bytes = new Uint8Array(await f.arrayBuffer());
        name = safeName(f.name || fd.get("name") || "file");
        type = String(f.type || "").slice(0, 120);
      } else {
        const b = await readJson(request);
        if (!b || typeof b !== "object" || Array.isArray(b)) return err("Body must be an object", 422);
        const raw = String(b.content || "");
        const m = raw.match(/^data:[^;,]*;base64,([\s\S]*)$/);
        let bin;
        try {
          bin = atob((m ? m[1] : raw).replace(/\s+/g, ""));
        } catch { return err("content must be base64 or a data: URL", 422); }
        bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        name = safeName(b.name);
        type = String(b.type || "").slice(0, 120);
      }
      if (!bytes.length) return err("That file is empty", 422);
      if (bytes.length > STORAGE_MAX_BYTES) {
        return err(`Files are limited to ${STORAGE_MAX_BYTES / 1048576} MB`, 413);
      }
      if (!type) {
        const ext = name.split(".").pop().toLowerCase();
        type = EXT_TYPE[ext] || "application/octet-stream";
      }
      const key = `${owner ?? "anon"}/${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}-${name}`;
      const now = new Date().toISOString();
      await env.FILES.put(nsKey(key), bytes, {
        httpMetadata: { contentType: type, cacheControl: "public, max-age=86400" },
        customMetadata: { owner: String(owner ?? "anon"), size: String(bytes.length), name, uploaded_at: now },
      });
      return json({ ok: true, key, url: `${origin}/app/${projectId}/api/storage/${key}`,
                    size: bytes.length, type, name, uploaded_at: now }, 201);
    }

    // GET /api/storage/<key> — public read, matching the read policy the
    // collection routes already use (a guestbook must work while signed out).
    // Keys carry 12 random hex characters, so they are not enumerable.
    if (method === "GET" && seg[1]) {
      const key = seg.slice(1).join("/");
      let obj;
      try { obj = await env.FILES.get(nsKey(key)); } catch { return err("Storage unavailable", 503); }
      if (!obj) return err("Not found", 404);
      const meta = (obj.httpMetadata || {});
      const name = (obj.customMetadata || {}).name || key.split("/").pop() || "file";
      const type = meta.contentType || "application/octet-stream";
      const headers = {
        "Content-Type": type,
        "X-Content-Type-Options": "nosniff",
        "Content-Length": String(obj.size),
        "Cache-Control": "public, max-age=86400",
        // Served from the API origin, never from the app's own origin, and
        // fenced off anyway: an HTML or SVG payload cannot execute there.
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        "Access-Control-Allow-Origin": "*",
      };
      if (/text\/html|svg|xhtml|xml/i.test(type)) {
        headers["Content-Disposition"] = `attachment; filename="${name.replace(/["\\]/g, "_")}"`;
      }
      return new Response(obj.body, { headers });
    }

    // DELETE /api/storage/<key> — sign-in required; a signed-in user may remove
    // their own file, or any anonymous one (otherwise anonymous uploads could
    // never be cleaned up by anyone).
    if (method === "DELETE" && seg[1]) {
      if (!sess) return err("Sign in to delete files", 401);
      const key = seg.slice(1).join("/");
      let obj;
      try { obj = await env.FILES.get(nsKey(key)); } catch { return err("Storage unavailable", 503); }
      if (!obj) return err("Not found", 404);
      const mine = (obj.customMetadata || {}).owner;
      if (mine && mine !== "anon" && mine !== String(sess.uid)) {
        return err("That file belongs to another user", 403);
      }
      await env.FILES.delete(nsKey(key));
      return json({ ok: true, key });
    }

    return err("Unknown storage route", 404);
  }

  // ── CRUD: /app/:id/api/:collection[/:rowId] ──
  const col = cleanCol(seg[0]);
  if (!col) return err("Unknown collection", 404);
  const rowId = seg[1] ? parseInt(seg[1], 10) : null;
  if (seg[1] && !rowId) return err("Bad id", 422);

  if (method === "GET" && !rowId) {
    // `?mine=1` — a signed-in user's OWN rows.
    //
    // Reads below are deliberately public so a guestbook works while signed
    // out, but a personal list that hands back everybody else's entries is not
    // a list. Opt-in and never the default, so no existing app changes
    // behaviour: without the flag this is byte-for-byte the old query.
    const mine = url.searchParams.get("mine") === "1";
    if (mine && !sess) return err("Sign in to read your own rows", 401);
    const key = mine ? null : appListKey(projectId, col);
    if (key) {
      const hit = await cacheGet(env, key);
      if (hit !== null && hit !== undefined) return json({ items: hit });
    }
    const r = await env.DB.prepare(
      mine
        ? "SELECT id, payload, owner_id, created_at, updated_at FROM app_data WHERE project_id=? AND collection=? AND owner_id=? ORDER BY id DESC LIMIT 500"
        : "SELECT id, payload, owner_id, created_at, updated_at FROM app_data WHERE project_id=? AND collection=? ORDER BY id DESC LIMIT 500"
    ).bind(...(mine ? [projectId, col, sess.uid] : [projectId, col])).all();
    const items = (r.results || []).map((x) => {
      let p = {};
      try { p = safeBody(JSON.parse(x.payload || "{}")); } catch { p = {}; }
      return { id: x.id, ...p, owner_id: x.owner_id, created_at: x.created_at, updated_at: x.updated_at };
    });
    // Never cached: a per-user answer sitting in a shared key would serve one
    // person's rows to the next caller.
    if (key) await cachePut(env, key, items);
    return json({ items });
  }

  if (method === "POST" && !rowId) {
    const raw = await readJson(request);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return err("Body must be a JSON object", 422);
    const b = safeBody(raw);
    delete b.id;
    const r = await env.DB.prepare(
      "INSERT INTO app_data (project_id, collection, payload, owner_id, created_at, updated_at) VALUES (?,?,?,?,?,?)"
    ).bind(projectId, col, JSON.stringify(b), sess ? sess.uid : null, new Date().toISOString(), new Date().toISOString()).run();
    const id = r.meta.last_row_id;
    // Write landed => drop the cached list so the next GET re-queries D1.
    await cacheDrop(env, appListKey(projectId, col));
    if (defer) defer(() => fireHooks(env, projectId, "create", { collection: col, item: { id, ...b } }));
    return json({ item: { id, ...b, owner_id: sess ? sess.uid : null } }, 201);
  }

  const findRow = () => env.DB.prepare(
    "SELECT * FROM app_data WHERE id=? AND project_id=? AND collection=?"
  ).bind(rowId, projectId, col).first();

  if (method === "GET" && rowId) {
    const x = await findRow();
    if (!x) return err("Not found", 404);
    let p = {}; try { p = safeBody(JSON.parse(x.payload || "{}")); } catch { p = {}; }
    return json({ item: { id: x.id, ...p, owner_id: x.owner_id, created_at: x.created_at, updated_at: x.updated_at } });
  }

  // POLICY (one policy, applied to every collection route above and below):
  //   READS STAY PUBLIC so a guestbook still works — GET list and GET by id
  //   need no session, exactly as before.
  //   CREATE (POST) stays public for the same reason: an anonymous guest can
  //   post a row; owner_id is set only when a session exists.
  //   MUTATIONS (PATCH/PUT/DELETE on an existing row) REQUIRE A SESSION, and
  //   when owner_id is set on the row the session user must match the owner.
  //   Rows with owner_id NULL (anonymous creates) may be mutated by any
  //   logged-in user of this app — but never by an anonymous caller.
  // Every mutation below is also scoped by project_id in its WHERE clause, so
  // an id from another project can never be written or deleted.
  if ((method === "PATCH" || method === "PUT") && rowId) {
    if (!sess) return err("Authentication required", 401);
    const x = await findRow();
    if (!x) return err("Not found", 404);
    if (x.owner_id && Number(x.owner_id) !== Number(sess.uid)) return err("Forbidden: not the owner", 403);
    const b = await readJson(request);
    if (!b || typeof b !== "object" || Array.isArray(b)) return err("Body must be a JSON object", 422);
    let cur = {}; try { cur = JSON.parse(x.payload || "{}"); } catch { cur = {}; }
    // Prototype pollution: strip __proto__ / constructor / prototype from both
    // the stored payload and the incoming patch before merging.
    const merged = { ...safeBody(cur), ...safeBody(b) };
    delete merged.id;
    await env.DB.prepare("UPDATE app_data SET payload=?, updated_at=? WHERE id=? AND project_id=?")
      .bind(JSON.stringify(merged), new Date().toISOString(), rowId, projectId).run();
    await cacheDrop(env, appListKey(projectId, col));
    if (defer) defer(() => fireHooks(env, projectId, "update", { collection: col, item: { id: rowId, ...merged } }));
    return json({ item: { id: rowId, ...merged, owner_id: x.owner_id } });
  }

  if (method === "DELETE" && rowId) {
    if (!sess) return err("Authentication required", 401);
    const x = await findRow();
    if (!x) return err("Not found", 404);
    if (x.owner_id && Number(x.owner_id) !== Number(sess.uid)) return err("Forbidden: not the owner", 403);
    await env.DB.prepare("DELETE FROM app_data WHERE id=? AND project_id=?").bind(rowId, projectId).run();
    await cacheDrop(env, appListKey(projectId, col));
    if (defer) defer(() => fireHooks(env, projectId, "delete", { collection: col, id: rowId }));
    return json({ ok: true, id: rowId });
  }

  return err("Method not allowed on this collection", 405);
}

// Maps a non-ok GitHub API status onto the status THIS API returns.
// 404 -> 404 (repo does not exist: a fact about the client's request),
// 400/422 -> 400 (GitHub rejected the URL/owner/repo we were handed),
// 403/429 -> 429 (rate limited: retryable, not a fault on either side),
// 401 -> 502 (our GITHUB_TOKEN was refused: a server-side fault),
// anything else (5xx from GitHub) -> 502.
function ghStatusError(status) {
  if (status === 404) return new HttpError("Repository not found (private repos need GITHUB_TOKEN)", 404);
  if (status === 400 || status === 422) return new HttpError("Not a GitHub repository URL (GitHub rejected owner/repo)", 400);
  if (status === 403 || status === 429) return new HttpError("GitHub rate limit reached — try again in a few minutes", 429);
  if (status === 401) return new HttpError("GitHub rejected the server's credentials (check GITHUB_TOKEN)", 502);
  return new HttpError(`GitHub error ${status}`, 502);
}

// ── D1 READ-BUDGET CIRCUIT BREAKER ──────────────────────────────────────
// Cloudflare's free D1 plan allows 5,000,000 rows read PER DAY across the whole
// account — MarketPicks, Fashionistas and CreateStuff share one pot, not one
// pot each. When the pot empties, EVERY database read on EVERY site on the
// account fails until 00:00 UTC. That is exactly what happened on 2026-09-27:
// 5,133,584 reads = 103%, and all three sites went dark together.
//
// The traffic was ours, not the world's — bots probing random subdomains made
// app-host rescan the projects table 18,214 times in a day (2.48M reads) while
// MarketPicks' cron and page queries added another 2.63M. With no real users on
// any of them. Nothing was watching the pot, so nothing could slow down before
// it ran out.
//
// This is the watch. A scheduled handler queries Cloudflare's OWN analytics API
// — which costs no D1 read, that would defeat the whole point — every 30 minutes
// and writes ONE short-lived KV record. Guards read that record (one KV read,
// free, memoised in memory) and refuse to start an expensive whole-table scan
// when the pot is nearly empty, while continuing to serve everything they
// already have. Local laptop monitor: scripts/d1-budget.py.
const D1_READ_LIMIT = 5_000_000;
const D1_BUDGET_KEY = "d1budget:current";   // what guards read
const D1_BUDGET_LOG = "d1budget:";          // + YYYY-MM-DD, an 8-day history
const BUDGET_WARN_PCT = 70;
const BUDGET_HALT_PCT = 90;
const BUDGET_MEMO_MS = 5 * 60 * 1000;

function budgetStateFor(pct) {
  if (pct >= BUDGET_HALT_PCT) return "halt";
  if (pct >= BUDGET_WARN_PCT) return "warn";
  return "ok";
}

// Read the shared KV record. One KV read (free), memoised per isolate for five
// minutes so this cannot become the next thing that costs money.
let budgetMemo = null;
async function readBudget(env) {
  const now = Date.now();
  if (budgetMemo && now - budgetMemo.at < BUDGET_MEMO_MS) return budgetMemo.snap;
  let snap = null;
  try {
    const raw = await env.KV.get(D1_BUDGET_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") snap = parsed;
    }
  } catch { snap = null; }
  budgetMemo = { at: now, snap };
  return snap;
}

// true => whole-table scans may start. An unknown or unreadable state ALLOWS:
// a broken monitor must never be able to take a working site down.
async function d1BudgetAllowsScan(env) {
  const snap = await readBudget(env);
  return !snap || snap.state !== "halt";
}

// Ask Cloudflare's analytics API what we have spent today. Uses the REST
// GraphQL endpoint with an API token supplied as a Worker secret — never
// committed, never read from a file at runtime.
async function refreshD1Budget(env) {
  const token = env.CF_ANALYTICS_TOKEN;
  const accountId = env.CF_ACCOUNT_ID;
  if (!token || !accountId) return { configured: false, reason: "monitor not configured" };

  const today = new Date().toISOString().slice(0, 10);
  const query = [
    "query($a:String!,$s:Date!){viewer{accounts(filter:{accountTag:$a}){",
    "d1AnalyticsAdaptiveGroups(limit:200,filter:{date_geq:$s},orderBy:[date_DESC]){",
    "dimensions{date databaseId} sum{rowsRead rowsWritten}}}}}",
  ].join("");

  let res;
  try {
    res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { a: accountId, s: today } }),
    });
  } catch (e) {
    return { configured: true, reason: `analytics unreachable: ${(e && e.message) || e}` };
  }
  if (!res.ok) return { configured: true, reason: `analytics HTTP ${res.status}` };

  let body;
  try { body = await res.json(); } catch { return { configured: true, reason: "analytics bad JSON" }; }
  if (body.errors) return { configured: true, reason: body.errors[0].message || "analytics error" };

  const accounts = (body.data && body.data.viewer && body.data.viewer.accounts) || [];
  const groups = (accounts[0] && accounts[0].d1AnalyticsAdaptiveGroups) || [];

  let reads = 0;
  let writes = 0;
  const byDb = {};
  for (const g of groups) {
    if (!g || !g.dimensions || g.dimensions.date !== today) continue;
    const r = (g.sum && g.sum.rowsRead) || 0;
    const w = (g.sum && g.sum.rowsWritten) || 0;
    reads += r;
    writes += w;
    const id = String(g.dimensions.databaseId || "").slice(0, 8);
    byDb[id] = (byDb[id] || 0) + r;
  }

  const pct = Math.round((reads / D1_READ_LIMIT) * 1000) / 10;
  const state = budgetStateFor(pct);
  const snap = {
    date: today,
    reads,
    writes,
    limit: D1_READ_LIMIT,
    pct,
    state,
    by_db: byDb,
    ts: Date.now(),
    configured: true,
  };

  // KV's free tier allows 1,000 WRITES a day, and this worker already spends
  // some of that on response caching — so the write budget here is deliberate:
  // one short key per run (48/day) and a history entry only when the state
  // actually changes (a handful a day), not one per run.
  try {
    const previousRaw = await env.KV.get(D1_BUDGET_KEY);
    let previousState = null;
    try { previousState = previousRaw ? JSON.parse(previousRaw).state : null; } catch { /* first run */ }

    await env.KV.put(D1_BUDGET_KEY, JSON.stringify(snap), { expirationTtl: 3600 });
    if (previousState !== state) {
      await env.KV.put(D1_BUDGET_LOG + today, JSON.stringify(snap), { expirationTtl: 60 * 60 * 24 * 8 });
    }
  } catch { /* a KV blip must not fail the schedule */ }
  budgetMemo = { at: Date.now(), snap };
  return snap;
}

// ── router ───────────────────────────────────────────────────────────────
// Closes builds left 'running' forever. Every model call now carries a deadline,
// but a Worker can still be killed mid-run (deploy, isolate eviction, an unhandled
// throw beneath the route's try) — and then nothing ever closes the row. The
// person at the other end watches a spinner that never stops, no message ever
// explains why, and no retry is possible while the row still reads 'running' and
// the one-open-job guard refuses a second build. This runs on the */30 cron.
//
// It deliberately does NOT use failBuild(): that REPLACES agent_log with a single
// System line, which would throw away the classifier decision, the plan and
// whatever the writer managed to emit — precisely the evidence needed to work out
// why it stopped. The note is appended instead.
async function failStaleBuilds(env) {
  try {
    const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const stale = await env.DB.prepare(
      "SELECT id, agent_log FROM builds WHERE status='running' AND completed_at IS NULL AND started_at < ? LIMIT 50"
    ).bind(cutoff).all();
    const rows = (stale && stale.results) || [];
    const now = new Date().toISOString();
    for (const r of rows) {
      let log;
      try { log = JSON.parse(r.agent_log || "[]"); } catch { log = []; }
      if (!Array.isArray(log)) log = [];
      log.push({
        agent: "System",
        message: "This build stopped without finishing: it was still running 10 minutes after it started, so nothing more will come of it. Press build again to retry.",
        at: now,
      });
      try {
        await env.DB.prepare(
          "UPDATE builds SET status='failed', completed_at=?, agent_log=? WHERE id=? AND status='running'"
        ).bind(now, JSON.stringify(log), r.id).run();
      } catch { /* one bad row must not stop the sweep */ }
    }
    return rows.length;
  } catch { return 0; }
}

export default {
  async scheduled(event, env, _ctx) {
    // Two triggers, one handler: Cloudflare passes the expression that matched
    // in event.cron. Each does only its own work, so the D1 budget watcher and
    // the stale-build watchdog keep their original 30-minute cadence (neither
    // was designed for every five minutes) while owner-scheduled jobs get their
    // own faster tick — and neither set runs twice at minute 30, when both
    // expressions match at once. An unknown/manual trigger does everything
    // rather than silently doing nothing.
    const cron = (event && event.cron) || "";
    if (!cron || cron === "*/30 * * * *") {
      await refreshD1Budget(env);
      await failStaleBuilds(env);
    }
    if (!cron || cron === "*/5 * * * *") {
      await runDueJobs(env);
    }
  },

  async fetch(request, env, ctx) {
    // Per-invocation subrequest bookkeeping: one request, one counter.
    FETCH_N = 0;
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    if (method === "OPTIONS") return new Response(null, { headers: CORS });

    try {
      // health
      if (path === "/api/health") return json({ ok: true, service: "createstuff-api", ts: Date.now() });

      // Where the account-wide D1 read budget stands. Answers from the shared
      // KV snapshot; if that is older than 45 minutes it asks Cloudflare's
      // analytics API directly (a REST call, NOT a D1 read) so the number is
      // truthful between cron runs. Per-worker scan counts live on app-host's
      // own /api/budget-guard (in isolate memory, so counting them here costs
      // no KV writes) — they are deliberately not duplicated into this key.
      if (path === "/api/d1-budget" && method === "GET") {
        let snap = await readBudget(env);
        if (!snap || Date.now() - snap.ts > 45 * 60 * 1000) {
          const fresh = await refreshD1Budget(env);
          if (fresh && fresh.date) snap = fresh;
        }
        return json({
          ok: true,
          limit: D1_READ_LIMIT,
          warn_at_pct: BUDGET_WARN_PCT,
          halt_at_pct: BUDGET_HALT_PCT,
          budget: snap || { configured: false, state: "unknown" },
          scan_counters: "https://app-host.fashionistas1979.workers.dev/api/budget-guard",
        });
      }

      // Hive callback: the relay runs the build for us. It authenticates with
      // HIVE_TOKEN rather than a user session, so this MUST sit above the
      // requireUser gate below — otherwise the relay's call was rejected with
      // 401 before it could reach here (measured 2026-09-25, build 71).
      const runRoute = path.match(/^\/api\/builds\/(\d+)\/run$/);
      if (runRoute && method === "POST") {
        const tok = request.headers.get("authorization") || "";
        if (!env.HIVE_TOKEN || tok !== "Bearer " + env.HIVE_TOKEN) return err("Unauthorized", 401);
        const id = parseInt(runRoute[1], 10);
        const row = await env.DB.prepare(
          "SELECT b.id, b.project_id, b.prompt, b.status, p.user_id FROM builds b JOIN projects p ON p.id=b.project_id WHERE b.id=?"
        ).bind(id).first();
        if (!row) return err("Not found", 404);
        if (row.status !== "running") return json({ id, status: row.status, skipped: "already " + row.status }, 200);
        const owner = { sub: row.user_id };
        // Without this catch an exception escaped as a bare 500 and the row
        // stayed 'running' forever — builds 75/76 were stranded that way while
        // the UI polled a status that would never change.
        try {
          return await runGenerate(env, owner, row.project_id, row.prompt, "generate", url.origin, id);
        } catch (e) {
          await failBuild(env, id, e);
          return err(String((e && e.message) || e).slice(0, 300), 500);
        }
      }

      // Temporary diagnostic: Zen answers 200 from a shell but 429 from a
      // Worker. Is it the User-Agent or the egress IP? Try several UAs.
      if (path === "/api/zen-probe") {
        const uas = {
          default: undefined,
          browser: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
          none: "",
          curl: "curl/8.5.0",
        };
        const out = { uas: {} };
        for (const [k, ua] of Object.entries(uas)) {
          try {
            const h = { "Content-Type": "application/json" };
            if (ua !== undefined) h["User-Agent"] = ua;
            const r = await fetch(ZEN_URL, {
              method: "POST", headers: h,
              body: JSON.stringify({ model: "space-bunny-free", messages: [{ role: "user", content: "reply OK" }], max_tokens: 10 }),
              signal: AbortSignal.timeout(20000),
            });
            const body = await r.text();
            out.uas[k] = { http: r.status, body: body.slice(0, 110) };
          } catch (e) { out.uas[k] = { threw: String((e && e.name) + ": " + (e && e.message)) }; }
        }
        try {
          await env.AI.run("@cf/meta/llama-3.2-3b-instruct", { messages: [{ role: "user", content: "hi" }], max_tokens: 5 });
          out.workersAI = "ok";
        } catch (e) { out.workersAI = String((e && e.message) || e).slice(0, 90); }
        return json(out);
      }

      // Temporary diagnostic: verdict that runGenerate's script-parse gate would
      // reach for the source it is given, from the real parser in the real
      // runtime. (Compiling strings is not an option here — the Workers runtime
      // refuses new Function, measured 2026-09-30.)
      if (path === "/api/syntax-probe" && method === "POST") {
        const b2 = await request.json().catch(() => ({}));
        const code = String(b2.code || "");
        return json({ parser: "acorn", chars: code.length, error: jsSyntaxError(code) });
      }

      // Temporary diagnostic: the shipped missing-element detector's verdict on
      // caller-supplied bytes, from the real code in the real runtime. This
      // exists because build 144's published page died on a kebab/camel id
      // mismatch while production reported 0 flags — the offline control
      // flagged 15 ids on those exact files, and a silence like that cannot
      // tell "clean" apart from "never ran".
      if (path === "/api/script-probe" && method === "POST") {
        const b3 = await request.json().catch(() => ({}));
        const files = [
          { path: "index.html", content: String(b3.html || "").slice(0, 500000) },
          { path: "script.js", content: String(b3.script || "").slice(0, 500000) },
        ];
        const flags = missingElements(files[1].content, files);
        return json({ detector: "missing-element", chars: { html: files[0].content.length, script: files[1].content.length }, diag: missingElements.diag, flags });
      }

      // per-project app backend + static app files (public: the app's own users)
      // Wrapped rather than awaited straight through, so a crash inside an app's
      // own handler is RECORDED instead of only becoming an opaque 500.
      const appT0 = Date.now();
      // Work that must outlive the response — the webhook deliveries — handed
      // back from inside handleAppRequest so that function needs no ctx of its
      // own. Swallowed on purpose: a delivery must never surface to the user.
      const defer = (fn) => {
        if (ctx && typeof ctx.waitUntil === "function") {
          ctx.waitUntil(Promise.resolve().then(fn).catch(() => {}));
        }
      };
      let appResp = null, appThrown = null;
      try { appResp = await handleAppRequest(request, env, url, defer); }
      catch (e) { appThrown = e; }
      if (appResp || appThrown) {
        const am = url.pathname.match(/^\/app\/(\d+)(?:\/|$)/);
        if (am && ctx && typeof ctx.waitUntil === "function") {
          const pid = parseInt(am[1], 10);
          // API calls plus anything that went wrong — a 404 on a static asset is
          // precisely the signal a broken page needs. waitUntil is safe here
          // (unlike for whole builds): this insert takes ~10ms, far inside the
          // ~30s ceiling that made waitUntil unusable for runGenerate.
          if (url.pathname.includes("/api/") || (appResp && appResp.status >= 400) || appThrown) {
            ctx.waitUntil(logAppRequest(
              env, pid, request,
              appResp ? appResp.status : 500,
              Date.now() - appT0,
              appThrown ? String((appThrown && appThrown.message) || appThrown) : null
            ));
          }
        }
        if (appResp) return appResp;
        if (appThrown) throw appThrown;
      }

      // ── published site files ───────────────────────────────────────
      if (path.startsWith("/published/")) {
        const parts = path.split("/").filter(Boolean); // published, :id, ...
        const projectId = parts[1];
        const filePath = decodeURIComponent(parts.slice(2).join("/")) || "index.html";
        if (!projectId) return err("missing project id", 404);
        const res = await projectFileResponse(env, projectId, filePath);
        return res || err("Not found", 404);
      }

      // ── a published site under its OWN web address ─────────────────
      // `Connect it` claims `<name>.createstuff.ai` for a project. That hostname
      // is answered by the sites Pages project, which lives in the OTHER
      // Cloudflare account (a Worker can only have routes in its own account, and
      // a cross-account CNAME is refused with error 1014) — so it cannot read this
      // database. It hands the hostname and the path here and this returns the
      // bytes. Resolution reuses the SAME `app_hosts` row the Connect button
      // writes, so there is one source of truth and never a second copy of
      // anybody's site.
      //
      // Public on purpose: a visitor to somebody's published site has never
      // heard of us, let alone signed in. It only ever reveals files that
      // `Put online` already made public at /published/<id>/… — it adds the
      // hostname, not the visibility.
      if (path === "/api/hosts/serve" && method === "GET") {
        const host = String(url.searchParams.get("host") || "").trim().toLowerCase();
        const want = String(url.searchParams.get("path") || "");
        // A hostname is labels and dots, nothing else. Refusing the shape here
        // means a crafted value can never be turned into a query we did not
        // intend below.
        if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/.test(host)) {
          return err("Not found", 404);
        }
        const filePath = decodeURIComponent((want || "/index.html").replace(/^\/+/, "")) || "index.html";
        // Same traversal rule as the asset layer: a published path is a flat
        // file path, and `..` has no meaning in one.
        if (filePath.includes("\0") || filePath.split("/").some((s) => s === "." || s === "..")) {
          return err("Not found", 404);
        }
        let mapped = null;
        try {
          mapped = await env.DB.prepare(
            "SELECT project_id FROM app_hosts WHERE hostname=? LIMIT 1"
          ).bind(host).first();
        } catch {
          // The table is created lazily by the worker that writes it. Before it
          // exists there is simply nothing claimed, which is a 404 — never a 500
          // telling a visitor that our database is unhappy.
          mapped = null;
        }
        const projectId = mapped && (mapped.project_id || mapped.projectId);
        if (!projectId) return err("Not found", 404);
        const res = await projectFileResponse(env, projectId, filePath);
        return res || err("Not found", 404);
      }

      // ── auth ────────────────────────────────────────────────────────
      if (path === "/api/auth/register" && method === "POST") {
        const b = await request.json().catch(() => ({}));
        const email = String(b.email || "").trim();
        const password = String(b.password || "");
        const name = String(b.name || b.username || "").trim() || (email ? email.split("@")[0] : "");
        if (!email || !password) return err("email and password required");
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return err("That does not look like an email address");
        // Matches the UI promise ("6+ characters") and production forge-api.
        if (password.length < 6) return err("Password must be at least 6 characters");

        const exists = await env.DB.prepare(
          "SELECT id FROM users WHERE email=? OR username=?"
        ).bind(email, name || email).first();
        if (exists) return err("An account with that email already exists. Try logging in.", 409);

        const hash = await pbkdf2(password);
        const username = (name || email.split("@")[0]).toLowerCase().replace(/[^a-z0-9_.-]/g, "").slice(0, 32) || "user";
        // username is UNIQUE in this table — disambiguate collisions.
        let uname = username, n = 1;
        while (await env.DB.prepare("SELECT id FROM users WHERE username=?").bind(uname).first()) {
          uname = `${username}${++n}`.slice(0, 38);
        }
        const r = await env.DB.prepare(
          "INSERT INTO users (username, password_hash, display_name, email, created_at) VALUES (?,?,?,?,?)"
        ).bind(uname, hash, name || uname, email, new Date().toISOString()).run();
        const id = r.meta.last_row_id;
        const user = { id, username: uname, display_name: name || uname, email };
        const token = await signToken(env, { sub: id, u: uname, exp: Date.now() + 30 * 86400000 });
        return json({ token, user }, 201);
      }

      if (path === "/api/auth/login" && method === "POST") {
        const b = await request.json().catch(() => ({}));
        const email = String(b.email || "").trim();
        const password = String(b.password || "");
        if (!email || !password) return err("email and password required");
        const u = await env.DB.prepare("SELECT * FROM users WHERE email=? OR username=?")
          .bind(email, email.toLowerCase()).first();
        if (!u) return err("Invalid email or password", 401);
        if (!(await verifyPassword(password, u.password_hash))) return err("Invalid email or password", 401);
        const user = { id: u.id, username: u.username, display_name: u.display_name || u.username, email: u.email || email };
        const token = await signToken(env, { sub: u.id, u: u.username, exp: Date.now() + 30 * 86400000 });
        return json({ token, user });
      }

      if (path === "/api/auth/me" && method === "GET") {
        const user = await requireUser(request, env);
        if (!user) return err("Unauthorized", 401);
        const u = await env.DB.prepare("SELECT id, username, display_name, email FROM users WHERE id=?").bind(user.sub).first();
        return json({ user: u || null });
      }

      // PROFILE SAVE — the settings page "Save" button PUTs display_name/email
      // here. Before this branch existed the request fell through to the router
      // and came back 404, so the button showed "Save failed" every single time
      // (measured 2026-09-26: PUT /api/auth/me -> 404). Column names are from a
      // fixed whitelist, never from the request body.
      if (path === "/api/auth/me" && method === "PUT") {
        const user = await requireUser(request, env);
        if (!user) return err("Unauthorized", 401);
        const b = await request.json().catch(() => ({}));
        const sets = [], binds = [];
        if (b.display_name !== undefined && b.display_name !== null) {
          const n = String(b.display_name).trim().slice(0, 80);
          if (!n) return err("Display name cannot be empty", 400);
          sets.push("display_name=?"); binds.push(n);
        }
        if (b.email !== undefined && b.email !== null) {
          const e = String(b.email).trim().toLowerCase().slice(0, 254);
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return err("That does not look like an email address", 400);
          const dup = await env.DB.prepare("SELECT id FROM users WHERE email=? AND id<>?").bind(e, user.sub).first();
          if (dup) return err("Another account already uses that email", 409);
          sets.push("email=?"); binds.push(e);
        }
        if (!sets.length) return err("Nothing to update", 400);
        binds.push(user.sub);
        await env.DB.prepare("UPDATE users SET " + sets.join(", ") + " WHERE id=?").bind(...binds).run();
        const u = await env.DB.prepare("SELECT id, username, display_name, email FROM users WHERE id=?").bind(user.sub).first();
        return json({ user: u || null });
      }

      // Favicon / site icon: answered for every app on this origin BEFORE the
      // session gate below. Measured before this existed: GET /favicon.ico ->
      // 401 {"error":"Unauthorized"}, which printed two red console errors on
      // every page a visitor opened, for a file nobody asked for.
      if ((path === "/favicon.ico" || path === "/icon.svg") && (method === "GET" || method === "HEAD")) {
        return faviconResponse();
      }

      // ── everything below requires a session ────────────────────────
      const user = await requireUser(request, env);
      if (!user) {
        // Every route defined below this gate is /api/*. So a path that is not
        // /api/* is simply one we do not have, and a missing page is a 404
        // whether or not you are signed in. Answering 401 here told every
        // anonymous visitor — and every automatic favicon fetch — that they
        // needed an account for a URL that does not exist.
        if (!path.startsWith("/api/")) return err("Not found", 404);
        return err("Unauthorized", 401);
      }

      // GITHUB IMPORT — pull a repo and create a project with its files
      if (path === "/api/github/import" && method === "POST") {
        if (!(await rateLimit(env, request, "gh", 6, 300))) return err("Too many imports — wait 5 minutes", 429);
        const body = await request.json().catch(() => ({}));
        const { url } = body;
        if (!url) return err("url required");
        const m = String(url).match(/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:\/.*)?$/);
        if (!m) return err("Not a GitHub repository URL (expected github.com/owner/repo)");
        const owner = m[1], repo = m[2];

        // PATH 1 — the browser read the repository itself and hands us the
        // files. GitHub counts that call against the person's own IP (and their
        // own token when GitHub is connected), not against this worker's shared
        // egress range: 60 unauthenticated calls an hour for EVERY user at once
        // is what turned ordinary imports into "rate limit reached". This path
        // needs no call to GitHub from here at all.
        let files = [], meta = null, defaultBranch = "main";
        if (Array.isArray(body.files)) {
          meta = (body.meta && typeof body.meta === "object") ? body.meta : {};
          defaultBranch = String(meta.default_branch || body.branch || "main").slice(0, 100);
          files = body.files
            .filter((f) => f && typeof f.path === "string" && f.path.length > 0 && f.path.length <= 300 && f.path.indexOf("\0") === -1 && typeof f.content === "string")
            .slice(0, 20)
            .map((f) => ({ path: f.path, content: f.content.slice(0, 300000) }));
          if (!files.length) return err("No readable files came across from that repository", 422);
        } else {
        // PATH 2 — no files supplied: read them here (kept for callers that
        // cannot read GitHub themselves).
        const ghHeaders = { Accept: "application/vnd.github+json", "User-Agent": "createstuff" };
        // The caller's own token travels with the request when GitHub is
        // connected on their side: authenticated calls get 5,000/hour instead
        // of the 60/hour shared limit of this worker's egress range.
        const callerTok = request.headers.get("X-GitHub-Token");
        if (callerTok) ghHeaders.Authorization = `Bearer ${callerTok}`;
        else if (env.GITHUB_TOKEN) ghHeaders.Authorization = `Bearer ${env.GITHUB_TOKEN}`;

        // A repo that does not exist is a CLIENT condition (404); a URL GitHub
        // refuses is a bad request (400); 502 is reserved for GitHub itself
        // failing (5xx, network error, unreadable body) or rejecting our
        // credentials (401) — that is our fault, not the caller's.
        const ghGet = async (u) => {
          try {
            return await fetch(u, { headers: ghHeaders });
          } catch {
            throw new HttpError("GitHub API unreachable", 502);
          }
        };
        const metaR = await ghGet(`https://api.github.com/repos/${owner}/${repo}`);
        if (!metaR.ok) throw ghStatusError(metaR.status);
        meta = await metaR.json().catch(() => null);
        if (!meta || typeof meta !== "object") throw new HttpError("GitHub returned an unreadable response", 502);
        defaultBranch = String(meta.default_branch || "main");

        const treeR = await ghGet(`https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(meta.default_branch)}?recursive=1`);
        let tree = [];
        if (treeR.ok) {
          const tj = await treeR.json().catch(() => null);
          tree = (tj && tj.tree) || [];
        }
        const SKIP = /\.(png|jpe?g|gif|webp|svg|ico|mp4|mov|zip|bin|pdf|woff2?|ttf|eot)$/i;
        const codeFiles = tree.filter((t) => t.type === "blob" && !SKIP.test(t.path) && t.size < 200000)
          .filter((f) => /(^|\/)(src|app|pages|components|lib|public)?\/?[^/]*\.(js|jsx|ts|tsx|html|css|json|md|py|rb|go|rs|vue|svelte)$/i.test(f.path) || /(^|\/)(package\.json|README\.md|index\.html)$/i.test(f.path))
          .slice(0, 20);

        for (const f of codeFiles) {
          try {
            const c = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${f.path}?ref=${encodeURIComponent(meta.default_branch)}`, { headers: ghHeaders });
            if (!c.ok) continue;
            const j = await c.json();
            if (j.encoding !== "base64" || !j.content) continue;
            files.push({ path: f.path, content: atob(j.content.replace(/\n/g, "")) });
          } catch { /* skip unreadable file */ }
        }
        if (!files.length) return err("Could not read any code files from that repository", 422);
        }

        const now = new Date().toISOString();
        const name = (meta && meta.name) || repo;
        const desc = `Imported from github.com/${owner}/${repo} — ${(meta && meta.description) || name}`;
        const repoUrl = (meta && typeof meta.html_url === "string" && meta.html_url) || `https://github.com/${owner}/${repo}`;
        const r = await env.DB.prepare(
          "INSERT INTO projects (user_id, name, description, repo_url, status, tech_stack, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)"
        ).bind(user.sub, name, desc, repoUrl, "imported", "github", now, now).run();
        const projectId = r.meta.last_row_id;

        await saveFiles(env, projectId, files, null);
        // A successful import creates a project row => drop that user's list.
        await cacheDrop(env, projectsListKey(user.sub));

        // github_links already exists on this D1 with real columns
        // (id,user_id,project_id,repo_full_name,repo_url,last_push_at,created_at,
        //  repo,file_path,branch,commit_sha,message) — verified via PRAGMA through
        // the schema-probe worker. The table predates this route, so a guessed
        // CREATE TABLE IF NOT EXISTS is a no-op and INSERTs must match reality.
        await env.DB.prepare(
          "INSERT INTO github_links (user_id, project_id, repo_full_name, repo_url, branch, created_at) VALUES (?,?,?,?,?,?)"
        ).bind(user.sub, projectId, `${owner}/${repo}`, repoUrl, defaultBranch, now).run();

        return json({ project: { id: projectId, name, description: desc, status: "imported", tech_stack: "github" }, repo: `${owner}/${repo}`, imported: files.length, files: files.map((f) => ({ path: f.path, size: f.content.length })) }, 201);
      }

      // ── GITHUB: LIST / CREATE / PUSH ─────────────────────────────────────
      // The Import-from-GitHub page shipped three buttons — a repo list, "Create
      // it" and "Send it to GitHub" — wired to /api/github/repos,
      // /api/github/create-repo and /api/github/push. None of the three routes
      // existed. They answered 404 to an authenticated caller, so the page
      // loaded, showed real form fields, and every button came back "Push
      // failed" or "Could not create it" from a server with no such route.
      // /api/github/import was the only GitHub route on the worker.
      //
      // All three are implemented here against GitHub's REST API. The token is
      // the caller's own X-GitHub-Token when GitHub is connected on their side,
      // otherwise the worker's GITHUB_TOKEN secret. Never written to this repo.
      if (path.startsWith("/api/github/") && (method === "GET" || method === "POST")) {
        const ghTok = request.headers.get("X-GitHub-Token") || env.GITHUB_TOKEN || "";
        if (!ghTok) return json({ connected: false, message: "GitHub is not connected yet.", repos: [] });
        const ghH = { Accept: "application/vnd.github+json", "User-Agent": "createstuff", Authorization: `Bearer ${ghTok}` };
        const ghFetch = async (u, init) => {
          try { return await fetch(u, { ...init, headers: { ...ghH, ...((init && init.headers) || {}) } }); }
          catch { throw new HttpError("GitHub API unreachable", 502); }
        };

        // GET  /api/github/repos  -> { connected, repos:[{name,html_url,...}] }
        if (path === "/api/github/repos") {
          if (!(await rateLimit(env, request, "gh-list", 30, 60))) return err("Too many GitHub calls — wait a minute", 429);
          const r = await ghFetch("https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member");
          if (r.status === 401) return json({ connected: false, message: "GitHub rejected the connection — reconnect to continue.", repos: [] });
          if (!r.ok) throw ghStatusError(r.status);
          const j = await r.json().catch(() => []);
          return json({ connected: true, repos: (Array.isArray(j) ? j : []).map((x) => ({
            name: x.name, full_name: x.full_name, html_url: x.html_url,
            description: x.description || "", language: x.language || "",
            stargazers_count: x.stargazers_count || 0,
            private: !!x.private, default_branch: x.default_branch || "main",
            updated_at: x.updated_at || null,
          })) });
        }

        // POST /api/github/create-repo {name,description} -> {full_name,html_url}
        if (path === "/api/github/create-repo" && method === "POST") {
          if (!(await rateLimit(env, request, "gh-create", 6, 300))) return err("Too many repositories — wait 5 minutes", 429);
          const b = await request.json().catch(() => ({}));
          const name = String(b.name || "").trim().replace(/\s+/g, "-").slice(0, 100);
          if (!name) return err("Give the repository a name first", 422);
          if (!/^[A-Za-z0-9._-]+$/.test(name)) return err("Repository names may use letters, numbers, dots, dashes and underscores", 422);
          const r = await ghFetch("https://api.github.com/user/repos", {
            method: "POST",
            headers: { ...ghH, "Content-Type": "application/json" },
            body: JSON.stringify({ name, description: String(b.description || "Created from CreateStuff.ai").slice(0, 350), auto_init: true }),
          });
          if (r.status === 422) return err("That repository name is already taken on your account", 422);
          if (!r.ok) throw ghStatusError(r.status);
          const j = await r.json().catch(() => null);
          if (!j || !j.full_name) throw new HttpError("GitHub created it but returned an unreadable response", 502);
          return json({ full_name: j.full_name, name: j.name, html_url: j.html_url, default_branch: j.default_branch || "main" }, 201);
        }

        // POST /api/github/push {repo,path,branch,message,content}
        // -> {html_url, sha, path, branch, created}
        if (path === "/api/github/push" && method === "POST") {
          if (!(await rateLimit(env, request, "gh-push", 20, 300))) return err("Too many pushes — wait 5 minutes", 429);
          const b = await request.json().catch(() => ({}));
          const full = String(b.repo || "").trim();
          const mm = full.match(/^([\w.-]+)\/([\w.-]+)$/);
          if (!mm) return err("Use the owner/name form, for example placebetsai/Placebetsai", 422);
          const owner = mm[1], repo = mm[2];
          const filePath = String(b.path || "index.html").trim().replace(/^\/+/, "").slice(0, 300);
          if (!filePath || filePath.includes("..")) return err("That file path is not valid", 422);
          const branch = String(b.branch || "").trim().slice(0, 250) || "main";
          const message = String(b.message || "").trim().slice(0, 200) || `Update ${filePath} from CreateStuff`;
          const content = String(b.content == null ? "" : b.content);
          if (!content) return err("There is no code to send", 422);

          // UTF-8 safe: btoa only accepts latin1, so walk the bytes.
          const bytes = new TextEncoder().encode(content);
          let bin = "";
          for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
          const encoded = btoa(bin);

          // Updating an existing file REQUIRES its blob sha — GitHub 422s
          // without it. A missing file (404) simply means no sha to send.
          const blobUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(branch)}`;
          const getR = await ghFetch(blobUrl);
          let sha = null;
          if (getR.ok) {
            const gj = await getR.json().catch(() => null);
            sha = (gj && gj.sha) || null;
          } else if (getR.status === 404) {
            sha = null;
          } else if (getR.status === 409) {
            return err("That repository has no branch named " + branch, 409);
          } else {
            throw ghStatusError(getR.status);
          }

          const putR = await ghFetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath.split("/").map(encodeURIComponent).join("/")}`, {
            method: "PUT",
            headers: { ...ghH, "Content-Type": "application/json" },
            body: JSON.stringify({ message, content: encoded, branch, ...(sha ? { sha } : {}) }),
          });
          if (putR.status === 409) return err("That repository has no branch named " + branch, 409);
          if (!putR.ok) throw ghStatusError(putR.status);
          const out = await putR.json().catch(() => null);
          const commitSha = out && out.commit && out.commit.sha;
          const htmlUrl = (out && out.content && out.content.html_url)
            || `https://github.com/${owner}/${repo}/blob/${branch}/${filePath}`;
          return json({ html_url: htmlUrl, sha: commitSha || null, path: filePath, branch, created: !sha, repo: `${owner}/${repo}` });
        }
      }

      // projects
      if (path === "/api/projects" && method === "GET") {
        const key = projectsListKey(user.sub);
        const hit = await cacheGet(env, key);
        if (hit !== null && hit !== undefined) return json({ projects: hit });
        const r = await env.DB.prepare(
          "SELECT id, name, description, icon, status, tech_stack, repo_url, deploy_url, created_at, updated_at FROM projects WHERE user_id=? ORDER BY updated_at DESC"
        ).bind(user.sub).all();
        const projects = r.results || [];
        await cachePut(env, key, projects);
        return json({ projects });
      }
      if (path === "/api/projects" && method === "POST") {
        const b = await request.json().catch(() => ({}));
        const name = String(b.name || "").trim();
        if (!name) return err("name required");
        const now = new Date().toISOString();
        const r = await env.DB.prepare(
          "INSERT INTO projects (user_id, name, description, status, created_at, updated_at) VALUES (?,?,?,?,?,?)"
        ).bind(user.sub, name, String(b.description || ""), "draft", now, now).run();
        const p = await env.DB.prepare("SELECT * FROM projects WHERE id=?").bind(r.meta.last_row_id).first();
        await cacheDrop(env, projectsListKey(user.sub));
        return json({ project: p }, 201);
      }
      // ── ENVIRONMENT VARIABLES FOR THE GENERATED APP (plan.md P0) ────────
      // Deliberately placed BEFORE the generic /api/projects/:id DELETE below:
      // that branch matches on the prefix alone, so an env DELETE reaching it
      // would parse the id and delete the project. Same collision that once
      // let one file deletion destroy a project (C9). Handled here first.
      if (path.startsWith("/api/projects/") && path.endsWith("/env") && (method === "GET" || method === "PUT")) {
        const id = parseInt(path.split("/")[3], 10);
        const p = await env.DB.prepare("SELECT id FROM projects WHERE id=? AND user_id=?").bind(id, user.sub).first();
        if (!p) return err("Not found", 404);
        await ensureEnvTable(env);

        if (method === "GET") {
          const rows = await env.DB.prepare(
            "SELECT key, value, updated_at FROM project_env WHERE project_id=? ORDER BY key"
          ).bind(id).all();
          return json({
            vars: (rows.results || []).map((r) => ({
              key: r.key,
              value: r.value == null ? "" : String(r.value),
              updated_at: r.updated_at,
            })),
          });
        }

        const b = await request.json().catch(() => ({}));
        const key = String(b.key || "").trim();
        const value = typeof b.value === "string" ? b.value : "";
        if (!ENV_KEY_RE.test(key))
          return err("A name starts with a letter or underscore and then uses only letters, digits and underscores — for example MAPS_KEY.", 400);
        if (value.length > ENV_VALUE_MAX)
          return err(`One value can be at most ${ENV_VALUE_MAX} characters.`, 400);

        const existing = await env.DB.prepare(
          "SELECT value FROM project_env WHERE project_id=? AND key=?"
        ).bind(id, key).first();
        if (existing) {
          await env.DB.prepare(
            "UPDATE project_env SET value=?, user_id=?, updated_at=CURRENT_TIMESTAMP WHERE project_id=? AND key=?"
          ).bind(value, user.sub, id, key).run();
        } else {
          const n = await env.DB.prepare(
            "SELECT COUNT(*) AS n FROM project_env WHERE project_id=?"
          ).bind(id).first();
          if (((n && n.n) || 0) >= ENV_MAX_PER_PROJECT)
            return err(`One app can hold ${ENV_MAX_PER_PROJECT} environment variables at most.`, 400);
          await env.DB.prepare(
            "INSERT INTO project_env (project_id, key, value, user_id, updated_at) VALUES (?,?,?,?,CURRENT_TIMESTAMP)"
          ).bind(id, key, value, user.sub).run();
        }
        return json({ ok: true, key, value, created: !existing });
      }
      if (path.startsWith("/api/projects/") && path.includes("/env/") && method === "DELETE") {
        const parts = path.split("/");                 // ["", "api", "projects", "165", "env", "KEY"]
        const id = parseInt(parts[3], 10);
        const p = await env.DB.prepare("SELECT id FROM projects WHERE id=? AND user_id=?").bind(id, user.sub).first();
        if (!p) return err("Not found", 404);
        await ensureEnvTable(env);
        const key = decodeURIComponent(parts.slice(5).join("/"));
        const r = await env.DB.prepare(
          "DELETE FROM project_env WHERE project_id=? AND key=?"
        ).bind(id, key).run();
        return json({ ok: true, key, deleted: (r.meta && r.meta.changes) || 0 });
      }

      if (path.startsWith("/api/projects/") && method === "DELETE") {
        const parts = path.split("/");                 // ["", "api", "projects", "165", ...]
        const id = parseInt(parts[3], 10);
        const p = await env.DB.prepare("SELECT id FROM projects WHERE id=? AND user_id=?").bind(id, user.sub).first();
        if (!p) return err("Not found", 404);

        // /api/projects/:id/files/<path...> removes ONE file. Without this branch
        // the generic prefix match below used to catch it too: the code parsed
        // id=165, deleted every file, every build and the project row itself, and
        // still answered {"ok":true}. Measured 2026-09-26 — a file-level DELETE
        // destroyed a whole project. Deleting the last file must NOT delete the
        // project; only the exact /api/projects/:id form does that.
        if (parts[4] === "files") {
          if (parts.length < 6) return err("A file path is required", 400);
          const filePath = decodeURIComponent(parts.slice(5).join("/"));
          const r = await env.DB.prepare(
            "DELETE FROM project_files WHERE project_id=? AND (path=? OR file_path=?)"
          ).bind(id, filePath, filePath).run();
          await cacheDrop(env, filesListKey(id));
          const left = await env.DB.prepare(
            "SELECT COUNT(*) AS n FROM project_files WHERE project_id=?"
          ).bind(id).first();
          return json({
            ok: true,
            deleted: (r.meta && r.meta.changes) || 0,
            file_path: filePath,
            files_left: left ? left.n : 0,
          });
        }

        // ONLY the bare /api/projects/:id form removes a project. This branch
        // used to key off the prefix alone, so DELETE /api/projects/165/hooks/7
        // — a request to delete ONE webhook — parsed id=165, wiped every file
        // and build, deleted the project row and answered {"ok":true}. Same
        // shape as C9 (a file deletion that destroyed a project), caught
        // 2026-09-28 while proving the webhook routes: deleting a hook quietly
        // deleted the app.
        if (parts.length === 4) {
          // Everything this app owns goes with it. Without these lines a
          // deleted project left its rows behind forever: the next request 404s
          // but the data stays. Worse, project_jobs are driven by cron with no
          // request around them, so a deleted app's scheduled jobs would keep
          // calling outside URLs indefinitely — this cascade is what stops that.
          // Best-effort per table (a table this deployment has never created
          // yet must not be able to abort the deletion). Names are literals,
          // never request input.
          for (const t of [
            "project_files", "builds", "build_files", "app_data", "app_logs",
            "app_sessions", "app_users", "project_env", "project_hooks", "project_jobs",
          ]) {
            await env.DB.prepare(`DELETE FROM ${t} WHERE project_id=?`).bind(id).run()
              .catch(() => {});
          }
          await env.DB.prepare("DELETE FROM projects WHERE id=?").bind(id).run();
          await cacheDrop(env, projectsListKey(user.sub));
          await cacheDrop(env, filesListKey(id));
          await cacheDrop(env, buildsListKey(id));
          return json({ ok: true });
        }

        // A deeper DELETE is somebody else's route. /hooks and /jobs are
        // handled by the automations block further down and must get their
        // turn: returning 404 here would hide those routes entirely, and NOT
        // returning would fall into the cascade above and destroy the project.
        if (parts[4] !== "hooks" && parts[4] !== "jobs") return err("Not found", 404);
      }

      // files — app.js reads f.path in one caller and f.file_path in another
      if (path.startsWith("/api/projects/") && path.endsWith("/files") && method === "GET") {
        const id = parseInt(path.split("/")[3], 10);
        const p = await env.DB.prepare("SELECT id FROM projects WHERE id=? AND user_id=?").bind(id, user.sub).first();
        if (!p) return err("Not found", 404);
        const key = filesListKey(id);
        const hit = await cacheGet(env, key);
        if (hit !== null && hit !== undefined) return json({ files: hit });
        const files = await loadFiles(env, id);
        await cachePut(env, key, files);
        return json({ files });
      }
      if (path.startsWith("/api/projects/") && path.endsWith("/files") && method === "POST") {
        const id = parseInt(path.split("/")[3], 10);
        const p = await env.DB.prepare("SELECT id FROM projects WHERE id=? AND user_id=?").bind(id, user.sub).first();
        if (!p) return err("Not found", 404);
        const b = await request.json().catch(() => ({}));
        const fp = String(b.file_path || b.path || "").trim().replace(/^\/+/, "");
        if (!fp) return err("file_path required");
        if (typeof b.content !== "string") return err("content must be a string");
        await saveFiles(env, id, [{ path: fp, content: b.content }], null);
        return json({ ok: true, file_path: fp, size: b.content.length }, 201);
      }
      if (path.startsWith("/api/projects/") && path.includes("/files/")) {
        const seg = path.split("/");
        const id = parseInt(seg[3], 10);
        const fp = decodeURIComponent(seg.slice(5).join("/"));
        const p = await env.DB.prepare("SELECT id FROM projects WHERE id=? AND user_id=?").bind(id, user.sub).first();
        if (!p) return err("Not found", 404);
        const row = await env.DB.prepare(
          "SELECT path, file_path, content FROM project_files WHERE project_id=? AND (path=? OR file_path=?)"
        ).bind(id, fp, fp).first();
        if (!row) return err("Not found", 404);
        return json({ file_path: row.file_path || row.path, path: row.path || row.file_path, content: row.content || "" });
      }

      // AI generate / modify / publish
      // The planner on its own. It reads the sentence and writes the spec —
      // no code — so the cockpit can put the plan on screen seconds after
      // send instead of holding it hostage until the whole build returns.
      if (path === "/api/ai/plan" && method === "POST") {
        const b = await request.json().catch(() => ({}));
        const plan = String(b.plan || b.prompt || "").trim();
        if (!plan) return err("plan required");
        const m = await planAgent(env, plan);
        const spec = m && m.spec ? String(m.spec).trim() : null;
        return json({ ok: !!spec, plan: spec, why: spec ? null : (m && m.why) || "no plan", model: (m && m.model) || null });
      }
      // DISCUSSION MODE. Talk to the Agent about an idea without spending a
      // build: no project row, no build row, no files, no deploy. The answer
      // is an answer and nothing else — that is the entire feature, and it is
      // what "without spending a build" has to mean literally.
      if (path === "/api/ai/discuss" && method === "POST") {
        const b = await request.json().catch(() => ({}));
        const message = String(b.message || b.plan || b.prompt || "").trim().slice(0, 4000);
        if (!message) return err("message required");
        const t0 = Date.now();
        // When the keyword path is confident the answer is already written and
        // it is the SAME answer the build path gives, so the two never
        // contradict each other — and this one can carry an action (a button
        // that opens the tool that can actually do it). Everything the keyword
        // path is unsure about still goes to the model.
        const kw = classifyRequest(message);
        if (kw.kind === "not_build" && kw.confident) {
          return json({ ok: true, reply: kw.reply, action: kw.action || null, source: "keyword", ms: Date.now() - t0 });
        }
        try {
          const r = await gen(env, DISCUSS_SYS, message, 700);
          const reply = String((r && r.text) || "").trim();
          if (!reply) return err("The Agent did not answer. Ask it again.", 502);
          return json({ ok: true, reply, model: (r && r.model) || null, ms: Date.now() - t0 });
        } catch (e) {
          console.warn("discuss failed: " + (e && e.message));
          return err("The Agent could not answer that just now. Try again in a moment.", 502);
        }
      }
      if (path === "/api/ai/generate" && method === "POST") {
        const b = await request.json().catch(() => ({}));
        const projectId = parseInt(b.projectId, 10);
        if (!projectId) return err("projectId required");
        const p = await env.DB.prepare("SELECT id FROM projects WHERE id=? AND user_id=?").bind(projectId, user.sub).first();
        if (!p) return err("Not found", 404);
        const plan = b.plan || b.prompt || `Build a complete website called ${p.name || "my site"}`;
        // A caller may hand back the build row it created up front, so this
        // run writes its log INTO that row as each stage lands. Without it
        // runGenerate runs with buildId=null: every per-stage line is thrown
        // away and only a single-entry row is inserted at the very end, which
        // is why the builder's chat sat on one bubble for two minutes.
        // Ownership is checked here, not assumed: the row must belong to a
        // project this same user already proved they own above.
        let buildId = parseInt(b.buildId, 10) || null;
        if (buildId) {
          const br = await env.DB.prepare("SELECT id, project_id FROM builds WHERE id=?").bind(buildId).first();
          if (!br || Number(br.project_id) !== projectId) return err("buildId does not belong to this project");
        }
        try {
          return await runGenerate(env, user, projectId, plan, "generate", url.origin, buildId);
        } catch (e) {
          // The caller opened this row before asking us to fill it. Close it
          // as failed: a row left on 'running' would block the project
          // permanently, because POST /api/builds refuses to start a second
          // one while a first is still open.
          if (buildId) await failBuild(env, buildId, e);
          throw e;
        }
      }
      if (path === "/api/ai/modify" && method === "POST") {
        const b = await request.json().catch(() => ({}));
        const projectId = parseInt(b.projectId, 10);
        if (!projectId || !b.message) return err("projectId and message required");
        const p = await env.DB.prepare("SELECT id FROM projects WHERE id=? AND user_id=?").bind(projectId, user.sub).first();
        if (!p) return err("Not found", 404);
        const existing = await loadFiles(env, projectId);
        const context = existing.length
          ? `Current files:\n${existing.map((f) => `--- ${f.path} ---\n${f.content.slice(0, 3000)}`).join("\n")}`
          : "No files yet — build the whole site from scratch.";
        const plan = `User change request: ${b.message}\n\n${context}`;
        return await runGenerate(env, user, projectId, plan, "modify", url.origin);
      }
      if (path === "/api/ai/publish" && method === "POST") {
        const b = await request.json().catch(() => ({}));
        const projectId = parseInt(b.projectId, 10);
        if (!projectId) return err("projectId required");
        const p = await env.DB.prepare("SELECT id FROM projects WHERE id=? AND user_id=?").bind(projectId, user.sub).first();
        if (!p) return err("Not found", 404);
        const files = await loadFiles(env, projectId);
        if (!files.length) return err("Nothing to publish yet — build the site first.", 409);
        // A page whose stylesheet or script is missing opens broken. Refusing
        // here is the last line of defence for file sets saved before this
        // check existed — the user is told exactly what is wrong instead of
        // being handed an address that shows a blank white page.
        const missingNow = missingAssets(files);
        if (missingNow.length) {
          return err(`This project is missing ${missingNow.join(", ")}, so the page would open broken. Build it again.`, 409);
        }
        // Also verify the index.html is substantial (not a minimal/empty shell).
        // This catches file sets saved via GitHub import or manual upload that
        // bypassed the build pipeline's siteOk() gate.
        if (!siteOk(files)) {
          return err("The project's index.html is missing or too small to be a real page. Build the site first.", 409);
        }
        const idx = files.find((f) => /(^|\/)index\.html?$/i.test(f.path));
        // Stamp this page's own js/css references with the publish time. Without
        // it, the edge keeps serving the previous build's script.js (7-day
        // cache) beside freshly published HTML — measured on 252, and it is
        // what made a correctly-built page open dead. Idempotent: an existing
        // ?v= is replaced, never stacked.
        if (idx) {
          const stamped = stampAssetRefs(idx.content, String(Date.now()).slice(-10));
          if (stamped !== idx.content) {
            const bidRow = await env.DB.prepare(
              "SELECT build_id FROM project_files WHERE project_id=? AND build_id IS NOT NULL ORDER BY build_id DESC LIMIT 1"
            ).bind(projectId).first();
            await env.DB.prepare(
              "DELETE FROM project_files WHERE project_id=? AND (path=? OR file_path=?)"
            ).bind(projectId, idx.path, idx.path).run();
            await env.DB.prepare(
              "INSERT INTO project_files (project_id, build_id, path, file_path, content, updated_at) VALUES (?,?,?,?,?,?)"
            ).bind(projectId, (bidRow && bidRow.build_id) || null, idx.path, idx.path, stamped, new Date().toISOString()).run();
            await cacheDrop(env, filesListKey(projectId));
            idx.content = stamped;
          }
        }
        const startFile = (idx ? idx.path : files[0].path).replace(/^\/+/, "");
        const publishUrl = `${PUBLISH_HOST}/${projectId}/${startFile}`;
        await env.DB.prepare(
          "INSERT INTO deployments (project_id, url, status, created_at) VALUES (?,?,?,?)"
        ).bind(projectId, publishUrl, "live", new Date().toISOString()).run();
        await env.DB.prepare("UPDATE projects SET deploy_url=?, status=?, updated_at=? WHERE id=?")
          .bind(publishUrl, "deployed", new Date().toISOString(), projectId).run();
        await cacheDrop(env, projectsListKey(user.sub));
        return json({ ok: true, publishUrl, checkpointId: `cp-${projectId}-${Date.now()}`, state: "completed" });
      }

      // ── BUILD JOBS ──────────────────────────────────────────────────────
      // The Hive chat creates a job and gets an answer in one round trip,
      // then watches GET /api/builds/:id for each stage as it lands. Running
      // generation inside the POST is what used to hold the browser open for
      // two minutes with nothing on screen.
      if (path === "/api/builds" && method === "POST") {
        const b = await readJson(request);
        const projectId = parseInt(b.project_id || b.projectId, 10);
        const prompt = String(b.prompt || b.plan || "").trim();
        if (!projectId) return err("project_id required");
        if (!prompt) return err("prompt required");
        const p = await env.DB.prepare("SELECT id, name FROM projects WHERE id=? AND user_id=?")
          .bind(projectId, user.sub).first();
        if (!p) return err("Not found", 404);
        // One open job per project: a second send while one is running would
        // race the first and overwrite its files.
        //
        // Rows older than 5 minutes are swept first. `prepare` hands the id
        // back before any work happens, so a browser that opened a row and
        // then died (closed tab, lost wifi, generator crashed before it could
        // close it) would otherwise leave the project blocked forever with no
        // way to clear it.
        //
        // 5 minutes is deliberately just past the 3-minute window the browser
        // itself polls for, and 2x the 60–150s a real build takes, so an
        // ordinary run is never swept. If one ever were, this is recoverable
        // rather than corrupting: runGenerate's `finish()` writes status
        // unconditionally by id, so the row flips back to completed/answered
        // when the writer actually lands.
        const staleBefore = new Date(Date.now() - 5 * 60000).toISOString();
        await env.DB.prepare(
          "UPDATE builds SET status='failed', completed_at=? WHERE project_id=? AND status='running' AND completed_at IS NULL AND started_at < ?"
        ).bind(new Date().toISOString(), projectId, staleBefore).run();

        const busy = await env.DB.prepare(
          "SELECT id FROM builds WHERE project_id=? AND status='running' AND completed_at IS NULL ORDER BY id DESC LIMIT 1"
        ).bind(projectId).first();
        if (busy) return json({ id: busy.id, project_id: projectId, status: "running", alreadyRunning: true }, 202);

        const startedAt = new Date().toISOString();
        const firstLog = [{ agent: "Planner", message: "Accepted brief: " + prompt.slice(0, 200), at: startedAt }];
        const ins = await env.DB.prepare(
          "INSERT INTO builds (project_id, status, prompt, generated_code, preview_html, agent_log, started_at) VALUES (?,?,?,?,?,?,?)"
        ).bind(projectId, "running", prompt.slice(0, 4000), "", "", JSON.stringify(firstLog), startedAt).run();
        const id = ins.meta.last_row_id;
        await cacheDrop(env, buildsListKey(projectId));

        // `prepare` makes the row and returns immediately, leaving the caller
        // to run the generation itself with this id and poll
        // GET /api/builds/:id — so the log can be painted as each stage lands
        // instead of arriving in one lump after a minute. Without the flag
        // this route still runs the build inline, which is what a bare curl
        // gets and what the comment above is about.
        if (b.prepare) {
          return json({ id, project_id: projectId, status: "running", started_at: startedAt, prepared: true }, 201);
        }

        // Run the build HERE, in this request, and answer when it is done.
        //
        // Two earlier designs both stranded builds in production:
        //   (a) ctx.waitUntil - Cloudflare tears that context down at ~30s,
        //       which killed build 70's writer 31s in, right after its plan;
        //   (b) handing run_url to the Hive relay to call back into
        //       POST /api/builds/:id/run. The relay's own HTTP client gives up
        //       before a ~75s build finishes, the connection drops, and
        //       Cloudflare cancels this Worker mid-run. The row is then left at
        //       status='running' with nothing written, and the one-open-job
        //       guard refuses every retry after that. Builds 104 and 105 were
        //       stranded exactly this way for 21 and 11 minutes: both had a
        //       correct plan on screen and both died in the writer, which is
        //       precisely the part the relay does not wait for.
        //
        // Running inline has always worked. POST /api/ai/generate does it and
        // finished build 106 - a real 3-file app making 2 live API calls - in
        // 75s. The build row is already written above, so the UI's polling loop
        // is unchanged: it finds a finished build instead of one that never
        // finishes.
        await runGenerate(env, user, projectId, prompt, "generate", url.origin, id).catch(async (e) => {
          await failBuild(env, id, e);
        });
        const fin = await env.DB.prepare(
          "SELECT id, project_id, status, started_at, completed_at FROM builds WHERE id=?"
        ).bind(id).first();
        return json(fin || { id, project_id: projectId, status: "running", started_at: startedAt }, 200);
      }
      // ── ONE LOG ENTRY, APPENDED ────────────────────────────────────────
      // The plan arrives from the fast planner about a second after send,
      // long before the generator's own planner runs. It used to be written
      // into this browser's localStorage while the poll read localStorage, so
      // it looked right — and then it became unreachable the moment the poll
      // reads the server's row instead. Appending it here keeps the plan card
      // at the front of the run, and it now survives closing the tab.
      //
      // Append-only and only while the build is open: entries cannot be
      // edited or added after the fact, so this cannot be used to rewrite
      // what a completed build reported. `close:"failed"` additionally ends
      // the run — that is how the browser closes the row when the generate
      // call itself never came back, which nothing else would ever do.
      const logEntry = path.match(/^\/api\/builds\/(\d+)\/log$/);
      if (logEntry && method === "POST") {
        const id = +logEntry[1];
        const row = await env.DB.prepare(
          "SELECT b.id, b.status, b.agent_log FROM builds b JOIN projects p ON p.id=b.project_id WHERE b.id=? AND p.user_id=?"
        ).bind(id, user.sub).first();
        if (!row) return err("Not found", 404);
        // Open rows take appends, and so do `answered` ones: an answer closes
        // the row in about 600 ms while the plan call takes about 700 ms, so
        // the plan line for the turn always arrived after it was written and
        // got a 409 — a first-party console error on an ordinary question,
        // measured 2026-09-30 (build 154, POST /api/builds/154/log -> 409).
        // The line is a label on the answer that is already there; it changes
        // nothing but the record. Finished builds (`completed`/`failed`) still
        // refuse, because those logs are history and nothing should be added
        // to a build after it produced its page.
        if (row.status !== "running" && row.status !== "answered") return err("This build is no longer open.", 409);
        const body2 = await readJson(request);
        const agent = String(body2.agent || "").trim().slice(0, 40);
        const message = String(body2.message || "").trim().slice(0, 4000);
        if (!agent || !message) return err("agent and message required");
        let log = [];
        try { const p = row.agent_log ? JSON.parse(row.agent_log) : []; if (Array.isArray(p)) log = p; } catch { log = []; }
        log.push({ agent, message, at: new Date().toISOString() });
        const closeFailed = body2.close === "failed";
        await env.DB.prepare(
          closeFailed
            ? "UPDATE builds SET agent_log=?, status='failed', completed_at=? WHERE id=?"
            : "UPDATE builds SET agent_log=? WHERE id=?"
        ).bind(...(closeFailed ? [JSON.stringify(log), new Date().toISOString(), id] : [JSON.stringify(log), id])).run();
        return json({ ok: true, entries: log.length, status: closeFailed ? "failed" : row.status }, 201);
      }

      const buildOne = path.match(/^\/api\/builds\/(\d+)$/);
      if (buildOne && method === "GET") {
        const row = await env.DB.prepare(
          "SELECT id, project_id, status, prompt, generated_code, preview_html, agent_log, started_at, completed_at FROM builds WHERE id=?"
        ).bind(+buildOne[1]).first();
        if (!row) return err("Not found", 404);
        const owner = await env.DB.prepare("SELECT id FROM projects WHERE id=? AND user_id=?")
          .bind(row.project_id, user.sub).first();
        if (!owner) return err("Not found", 404);
        let log = [];
        try { log = row.agent_log ? JSON.parse(row.agent_log) : []; } catch { log = []; }
        let files = [];
        try { files = row.generated_code ? JSON.parse(row.generated_code) : []; } catch { files = []; }
        return json({
          id: row.id, project_id: row.project_id, status: row.status, prompt: row.prompt,
          agent_log: log, generated_code: row.preview_html || "", files,
          started_at: row.started_at, completed_at: row.completed_at,
        });
      }

      // ── VERSION HISTORY / GO BACK ────────────────────────────────────────
      // A build keeps the exact bytes it produced, so a project's versions ARE
      // its completed builds — this needs no extra table and cannot drift from
      // what was actually shipped. The "Version history" button has been in the
      // builder from the start ("Earlier versions of this app, so you can go
      // back to one") and pointed at a route this Worker never had: every press
      // answered 404 and the panel printed "Could not load earlier versions."
      // The button, the list and the way back all exist now.
      // ── AUTOMATIONS: webhooks out, jobs on a clock ──
      // What "integrations" means in practice for a small app: post somewhere
      // when a record arrives, and hit a URL on a timer. Owner-only, and every
      // outbound call is bounded (see postJSON / safeOutboundUrl).
      const autoM = path.match(/^\/api\/projects\/(\d+)\/(hooks|jobs)(?:\/(\d+))?(?:\/(test))?$/);
      if (autoM) {
        const pid = parseInt(autoM[1], 10);
        const kind = autoM[2];
        const itemId = autoM[3] ? parseInt(autoM[3], 10) : null;
        const isTest = autoM[4] === "test";
        const own = await env.DB.prepare("SELECT id FROM projects WHERE id=? AND user_id=?")
          .bind(pid, user.sub).first();
        if (!own) return err("Not found", 404);
        await ensureAutomation(env);
        // Derived from a fixed two-way choice above, never from raw input.
        const table = kind === "hooks" ? "project_hooks" : "project_jobs";

        if (method === "GET" && !itemId) {
          const r = await env.DB.prepare(
            `SELECT * FROM ${table} WHERE project_id=? ORDER BY id DESC LIMIT 50`
          ).bind(pid).all();
          // The signing secret is shown ONCE, when it is created (the POST
          // below returns the row verbatim) and never listed again — it is what
          // makes the other end trust the payload, so it does not sit in a
          // response anyone can re-request.
          const items = (r.results || []).map((x) => {
            const o = Object.assign({}, x);
            delete o.secret;
            return o;
          });
          return json({ items, events: HOOK_EVENTS, max: AUTOMATIONS_MAX });
        }

        if (method === "POST" && !itemId && !isTest) {
          const b = await request.json().catch(() => null);
          if (!b || typeof b !== "object" || Array.isArray(b)) return err("Body must be an object", 422);
          const u = safeOutboundUrl(b.url);
          if (!u) return err("That is not a web address we can call — it needs http:// or https://", 422);
          const cnt = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE project_id=?`)
            .bind(pid).first();
          if (Number(cnt && cnt.n) >= AUTOMATIONS_MAX) {
            return err(`This app already has ${AUTOMATIONS_MAX} ${kind}`, 409);
          }
          const now = new Date().toISOString();
          let ins;
          if (kind === "hooks") {
            const ev = String(b.event || "create");
            if (!HOOK_EVENTS.includes(ev)) return err(`event must be one of: ${HOOK_EVENTS.join(", ")}`, 422);
            const secret = (crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "")).slice(0, 64);
            ins = await env.DB.prepare(
              "INSERT INTO project_hooks (project_id, event, url, secret, enabled, created_at) VALUES (?,?,?,?,1,?)"
            ).bind(pid, ev, u.toString(), secret, now).run();
          } else {
            const every = Math.max(5, Math.min(1440, parseInt(b.every_minutes, 10) || 30));
            ins = await env.DB.prepare(
              "INSERT INTO project_jobs (project_id, name, url, every_minutes, enabled, created_at) VALUES (?,?,?,?,1,?)"
            ).bind(pid, String(b.name || "").slice(0, 80) || u.hostname, u.toString(), every, now).run();
          }
          const row = await env.DB.prepare(`SELECT * FROM ${table} WHERE id=?`).bind(ins.meta.last_row_id).first();
          return json({ item: row }, 201);
        }

        if (method === "DELETE" && itemId) {
          const row = await env.DB.prepare(`SELECT id FROM ${table} WHERE id=? AND project_id=?`)
            .bind(itemId, pid).first();
          if (!row) return err("Not found", 404);
          await env.DB.prepare(`DELETE FROM ${table} WHERE id=? AND project_id=?`).bind(itemId, pid).run();
          return json({ ok: true, id: itemId });
        }

        // Send one right now so the owner can see it arrive before trusting it.
        if (method === "POST" && itemId && isTest) {
          const row = await env.DB.prepare(`SELECT * FROM ${table} WHERE id=? AND project_id=?`)
            .bind(itemId, pid).first();
          if (!row) return err("Not found", 404);
          const u = safeOutboundUrl(row.url);
          if (!u) return err("That address cannot be reached", 422);
          const status = kind === "hooks"
            ? await deliverHook(row, { event: row.event, project_id: pid, at: new Date().toISOString(), data: { test: true } })
            : await postJSON(u, JSON.stringify({
                job: row.name || u.hostname, project_id: pid, at: new Date().toISOString(), test: true,
              }), { "X-CreateStuff-Job": String(row.id) });
          await env.DB.prepare(`UPDATE ${table} SET last_status=?, last_run_at=? WHERE id=?`)
            .bind(status, new Date().toISOString(), itemId).run();
          const ok = status >= 200 && status < 400;
          return json({
            ok,
            status,
            url: u.toString(),
            // Plain language, and deliberately not "reachable": anything other
            // than 0 is an HTTP answer from SOMETHING — Cloudflare's edge
            // refuses private/internal addresses with 403 and reports an
            // unreachable origin as 530 — so calling that reachable would tell
            // the owner their endpoint worked when it never saw the request.
            note: ok
              ? "Delivered."
              : status === 0
                ? "No reply at all — the address did not answer."
                : status === 403
                  ? "Refused. Calls to private or internal addresses are blocked."
                  : (status === 530 || status === 521 || status === 522 || status === 523 || status === 524 || status === 502 || status === 504)
                    ? "Could not reach that address."
                    : `The address replied ${status}.`,
          });
        }

        return err("Not found", 404);
      }

      // ── ACTIVITY / LOGS: GET /api/projects/:id/logs ──
      // The other half of monitoring: not "did my build work" but "what is my
      // app doing right now, and what is failing". Returns the most recent
      // traffic plus a rollup, so the panel can show a health line without
      // shipping every row to the browser.
      const logsOf = path.match(/^\/api\/projects\/(\d+)\/logs$/);
      if (logsOf && method === "GET") {
        const pid = parseInt(logsOf[1], 10);
        const own = await env.DB.prepare("SELECT id FROM projects WHERE id=? AND user_id=?")
          .bind(pid, user.sub).first();
        if (!own) return err("Not found", 404);
        await ensureAppLogs(env).catch(() => {});
        const want = parseInt(url.searchParams.get("limit") || "100", 10);
        const limit = Math.min(500, Math.max(1, Number.isFinite(want) ? want : 100));
        const r = await env.DB.prepare(
          "SELECT id, method, path, status, duration_ms, detail, created_at FROM app_logs " +
          "WHERE project_id=? ORDER BY id DESC LIMIT ?"
        ).bind(pid, limit).all();
        const items = r.results || [];
        const summary = { returned: items.length, ok: 0, client_error: 0, server_error: 0, avg_ms: 0, errors: 0 };
        let sum = 0;
        for (const it of items) {
          const s = Number(it.status) || 0;
          if (s >= 500) { summary.server_error++; summary.errors++; }
          else if (s >= 400) { summary.client_error++; summary.errors++; }
          else summary.ok++;
          sum += Number(it.duration_ms) || 0;
        }
        summary.avg_ms = items.length ? Math.round(sum / items.length) : 0;
        return json({ items, summary, keep: APP_LOG_KEEP });
      }

      const versionsOf = path.match(/^\/api\/builds\/(\d+)\/versions$/);
      if (versionsOf && method === "GET") {
        const row = await env.DB.prepare("SELECT id, project_id FROM builds WHERE id=?").bind(+versionsOf[1]).first();
        if (!row) return err("Not found", 404);
        const owner = await env.DB.prepare("SELECT id FROM projects WHERE id=? AND user_id=?")
          .bind(row.project_id, user.sub).first();
        if (!owner) return err("Not found", 404);
        const r = await env.DB.prepare(
          "SELECT id, prompt, generated_code, completed_at, started_at FROM builds " +
          "WHERE project_id=? AND generated_code<>'' AND status='completed' ORDER BY id ASC LIMIT 100"
        ).bind(row.project_id).all();
        return json(versionsPayload(r.results || []));
      }

      const restoreOne = path.match(/^\/api\/builds\/(\d+)\/restore$/);
      if (restoreOne && method === "POST") {
        const src = await env.DB.prepare(
          "SELECT id, project_id, prompt, generated_code, preview_html FROM builds WHERE id=?"
        ).bind(+restoreOne[1]).first();
        if (!src) return err("Not found", 404);
        const owner = await env.DB.prepare("SELECT id FROM projects WHERE id=? AND user_id=?")
          .bind(src.project_id, user.sub).first();
        if (!owner) return err("Not found", 404);

        let files = [];
        try {
          const parsed = JSON.parse(src.generated_code || "[]");
          // Older builds stored a bare HTML string here, not a file array —
          // that is not a restorable set, and .filter on a string would 500.
          if (Array.isArray(parsed)) files = parsed;
        } catch { files = []; }
        files = files.filter((f) => f && f.path && typeof f.content === "string");
        if (!files.length) return err("That version has no files to go back to.", 409);
        // Going back must not put a broken set in front of the visitor — the
        // same two gates a fresh publish has to pass.
        const missingNow = missingAssets(files);
        if (missingNow.length) {
          return err(`That version is missing ${missingNow.join(", ")}, so it would open broken.`, 409);
        }
        if (!siteOk(files)) {
          return err("That version has no usable index.html, so it would open blank.", 409);
        }

        // Append-only undo: the version you left is still stored, and this
        // restore becomes the newest build. Nothing is ever destroyed by going
        // back, so "back" can itself be undone.
        const now = new Date().toISOString();
        const ins = await env.DB.prepare(
          "INSERT INTO builds (project_id, status, prompt, generated_code, preview_html, agent_log, started_at, completed_at) VALUES (?,?,?,?,?,?,?,?)"
        ).bind(
          src.project_id, "completed", String(src.prompt || "").slice(0, 4000),
          src.generated_code, src.preview_html,
          JSON.stringify([{ agent: "Restore", message: `Went back to the version from build ${src.id}`, at: now }]),
          now, now
        ).run();
        const newId = ins.meta.last_row_id;
        // project_files is what /api/ai/publish reads, so the restored bytes
        // have to land there or the next publish would ship the old version.
        await saveFiles(env, src.project_id, files, newId);
        await cacheDrop(env, buildsListKey(src.project_id));
        // The project's own timestamp moves with it. The app list is ordered by
        // updated_at, so leaving it behind would keep the app you just went
        // back on looking older than ones nobody has touched — and the cached
        // list would keep saying so.
        await env.DB.prepare("UPDATE projects SET updated_at=? WHERE id=?")
          .bind(now, src.project_id).run();
        await cacheDrop(env, projectsListKey(user.sub));
        // previewHtml goes back with the answer so the screen can repaint from
        // what the server just stored, not from anything cached in the tab.
        return json({ ok: true, restoredFrom: src.id, buildId: newId, files: files.length, previewHtml: src.preview_html || "" });
      }

      // build history (app.js shims most of this, but the route is harmless)
      if (path === "/api/builds" && method === "GET") {
        const projectId = parseInt(url.searchParams.get("projectId"), 10);
        if (!projectId) return err("projectId required");
        const key = buildsListKey(projectId);
        const hit = await cacheGet(env, key);
        if (hit !== null && hit !== undefined) return json({ builds: hit });
        const r = await env.DB.prepare(
          "SELECT id, project_id, status, prompt, agent_log, started_at, completed_at FROM builds WHERE project_id=? ORDER BY id DESC LIMIT 20"
        ).bind(projectId).all();
        const builds = r.results || [];
        await cachePut(env, key, builds);
        return json({ builds });
      }

      return err("Not found", 404);
    } catch (e) {
      // Expected client conditions must never be laundered into a 500: an
      // oversized body (413), a malformed URL encoding (400), a repo that does
      // not exist (404). Everything else — D1 failing, a null deref — is still
      // a genuine server fault and stays a 500.
      if (e instanceof HttpError) return err(e.message, e.status);
      const msg = (e && e.message) || "Internal error";
      if (e instanceof URIError) return err("Malformed URL encoding", 400);
      if (e instanceof SyntaxError && /JSON|token|position|Unexpected/i.test(msg)) return err("Malformed request body", 400);
      return err(msg, 500);
    }
  },
};
