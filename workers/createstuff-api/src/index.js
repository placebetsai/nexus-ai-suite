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
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
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
  return `tool=${t.name || "unknown"} endpoint=${t.endpoint || "none"} HTTP ${http} ${Math.round(t.ms || 0)}ms`;
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
        // the writer still has room inside the Worker's 180s cap.
        deadline_ms: maxTok <= 1500 ? 45000 : 110000,
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

    const budget = Date.now() + (maxTok <= 1500 ? 60000 : 125000);
    let last = "no poll yet";
    while (Date.now() < budget) {
      await sleep(3000);
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
        if (!text) throw withTool("hive job finished with empty content", relay);
        return { text, parsed: null, model: "hive/" + (j.model || model), backend: j.backend || "relay", tool: relay };
      }
      if (j.status === "failed") throw withTool("hive job failed: " + String(j.error || "").slice(0, 220), relay);
      last = "running for " + Math.round((Date.now() - (j.started || Date.now())) / 1000) + "s";
    }
    relay.ms = Date.now() - t0;
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

const gen = async (env, system, user, maxTok = 8000) => {
  let last = null;
  // 1. the Hive relay (one call — it already fails over across all 8 free models)
  if (env.HIVE_URL) {
    try { return await openAiGen(env, "space-bunny-free", system, user, maxTok, true); }
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
      const r = await env.AI.run(model, {
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        max_tokens: maxTok,
      });
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
[{"path":"index.html","content":"<full html, every newline escaped as \\n, every quote escaped as \\""},{"path":"styles.css","content":"..."},{"path":"script.js","content":"..."}]`;

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

Define it once at the top of script.js as a single constant:
  const API_BASE = "__ORIGIN__/app/__ID__/api";
and build every request from it. Never hardcode any other host.

RULES
- Send JSON with Content-Type: application/json. Send the token as Authorization: Bearer <token>. Store the token in localStorage under "app_token", but read/write localStorage ONLY inside try/catch (the preview runs in a sandboxed iframe where it can throw SecurityError) and fall back to a plain in-memory variable.
- Use await fetch(...) inside try/catch. On a non-ok response show a VISIBLE error message to the user. Never show success before the server confirms.
- A form that claims to save MUST POST and MUST render the item the server returned (use its real id).
- After ANY successful POST, PATCH or DELETE, RE-FETCH the collection with GET and render what the server returns. Do NOT hand-edit your local array (arr.filter(t => t.id !== id) silently fails because ids from the DOM are strings while ids from JSON are numbers). The server is the only source of truth for what is on screen.
- Compare ids as strings: String(a) === String(b), never ===.
- On load, GET the collection and render what comes back — not invented rows.
- Any list the user would lose on refresh (tasks, notes, bookings, messages, entries, orders) must live in the API.
- Keep API paths absolute, built from API_BASE. Never a relative path, never another host.

If the brief is purely presentational (a landing page with no user data and no accounts), you may skip the API entirely.`;

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
    await env.DB.prepare("UPDATE builds SET status='failed', completed_at=?, agent_log=? WHERE id=?").bind(
      new Date().toISOString(),
      JSON.stringify([{ agent: "System", message: "Build failed: " + String((e && e.message) || e), at: new Date().toISOString() }]),
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
      return { kind: "not_build", confident: true, reply, rule: "model", source: "model", model, tool, ms: Date.now() - t0 };
    }
    return { ...kw, source: "keyword", model, tool, ms: Date.now() - t0, why: "model returned no usable JSON" };
  } catch (e) {
    // Falls back to the keyword result. A keyword "not_build" stays not_build:
    // a timeout can never turn it into a generated site.
    return { ...kw, source: "keyword", model, tool: (e && e.tool) || null, ms: Date.now() - t0, why: String((e && e.message) || e) };
  }
}

async function runGenerate(env, user, projectId, plan, mode, origin, buildId = null) {
  const started = Date.now();
  // The UI polls GET /api/builds/:id and appends every NEW entry it has not
  // seen yet. Writing the log after each stage is what makes the chat move
  // instead of sitting on one frozen bubble for two minutes.
  const log = [];
  const push = async (agent, message) => {
    log.push({ agent, message, at: new Date().toISOString() });
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
    // pushed first so it is the first thing the chat renders.
    await push("Planner", cls.reply);
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
        "UPDATE builds SET status='completed', generated_code='', preview_html='', completed_at=?, agent_log=? WHERE id=?"
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

  // ── STAGE 2/3 · EDITOR ──────────────────────────────────────────────────
  const g = await gen(env, CODE_SYS, `${brief}${specBlock}\n\nBRIEF FROM THE USER:\n${String(plan || "").slice(0, 6000)}`, 8000);
  let files = finalizeFiles(extractFiles(g));
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
        8000
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
        await push("Fix", `Fix tool: the editor did not return ${missing.join(", ")}.`);
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

  const code = files.map((f) => f.content).join("\n");
  const apiCalls = (code.match(/\bfetch\s*\(/g) || []).length;
  const usesAuth = /auth\/(login|register)/.test(code);
  const agentNote = `agents: classifier=${cls.source}/${cls.rule}, planner=${hasPlan ? manager.model : "off"}, writer=${g.model}, verifier=rules(${flagsBefore} flag${flagsBefore === 1 ? "" : "s"}), repair=${repairState}`;

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
    return json({ ok: false, files: [], model: g.model, notes: note, agents, error: missingNote || "The model did not return a usable site. Try again." }, 422);
  }
  return json({ ok: true, files, model: g.model, notes: note, buildId: buildIdOut, checkpointId: `cp-${buildIdOut}`, agents });
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
  return new Response(row.content || "", {
    headers: { ...CORS, "Content-Type": type, "Cache-Control": "no-cache" },
  });
}

// Returns a Response when the path belongs to an app, else null so the main
// router keeps handling /api/*.
async function handleAppRequest(request, env, url) {
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] !== "app") return null;
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
    return serveAppFile(env, url, projectId, filePath || "index.html");
  }

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

  // ── CRUD: /app/:id/api/:collection[/:rowId] ──
  const col = cleanCol(seg[0]);
  if (!col) return err("Unknown collection", 404);
  const rowId = seg[1] ? parseInt(seg[1], 10) : null;
  if (seg[1] && !rowId) return err("Bad id", 422);

  if (method === "GET" && !rowId) {
    const key = appListKey(projectId, col);
    const hit = await cacheGet(env, key);
    if (hit !== null && hit !== undefined) return json({ items: hit });
    const r = await env.DB.prepare(
      "SELECT id, payload, owner_id, created_at, updated_at FROM app_data WHERE project_id=? AND collection=? ORDER BY id DESC LIMIT 500"
    ).bind(projectId, col).all();
    const items = (r.results || []).map((x) => {
      let p = {};
      try { p = safeBody(JSON.parse(x.payload || "{}")); } catch { p = {}; }
      return { id: x.id, ...p, owner_id: x.owner_id, created_at: x.created_at, updated_at: x.updated_at };
    });
    await cachePut(env, key, items);
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
    return json({ item: { id: rowId, ...merged, owner_id: x.owner_id } });
  }

  if (method === "DELETE" && rowId) {
    if (!sess) return err("Authentication required", 401);
    const x = await findRow();
    if (!x) return err("Not found", 404);
    if (x.owner_id && Number(x.owner_id) !== Number(sess.uid)) return err("Forbidden: not the owner", 403);
    await env.DB.prepare("DELETE FROM app_data WHERE id=? AND project_id=?").bind(rowId, projectId).run();
    await cacheDrop(env, appListKey(projectId, col));
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

// ── router ───────────────────────────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    if (method === "OPTIONS") return new Response(null, { headers: CORS });

    try {
      // health
      if (path === "/api/health") return json({ ok: true, service: "createstuff-api", ts: Date.now() });

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

      // per-project app backend + static app files (public: the app's own users)
      const appResp = await handleAppRequest(request, env, url);
      if (appResp) return appResp;

      // ── published site files (authenticated: app.js sends the bearer) ──
      if (path.startsWith("/published/")) {
        const parts = path.split("/").filter(Boolean); // published, :id, ...
        const projectId = parts[1];
        const filePath = decodeURIComponent(parts.slice(2).join("/")) || "index.html";
        if (!projectId) return err("missing project id", 404);
        const row = await env.DB.prepare(
          "SELECT content FROM project_files WHERE project_id=? AND (path=? OR file_path=?)"
        ).bind(projectId, filePath, filePath).first();
        if (!row) return err("Not found", 404);
        const type = /\.css$/i.test(filePath) ? "text/css; charset=utf-8"
          : /\.js$/i.test(filePath) ? "application/javascript; charset=utf-8"
          : /\.json$/i.test(filePath) ? "application/json"
            : "text/html; charset=utf-8";
        return new Response(row.content || "", {
          headers: { ...CORS, "Content-Type": type, "Cache-Control": "no-cache" },
        });
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

      // ── everything below requires a session ────────────────────────
      const user = await requireUser(request, env);
      if (!user) return err("Unauthorized", 401);

      // GITHUB IMPORT — pull a repo and create a project with its files
      if (path === "/api/github/import" && method === "POST") {
        if (!(await rateLimit(env, request, "gh", 6, 300))) return err("Too many imports — wait 5 minutes", 429);
        const { url } = await request.json().catch(() => ({}));
        if (!url) return err("url required");
        const m = String(url).match(/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:\/.*)?$/);
        if (!m) return err("Not a GitHub repository URL (expected github.com/owner/repo)");
        const owner = m[1], repo = m[2];

        const ghHeaders = { Accept: "application/vnd.github+json", "User-Agent": "createstuff" };
        if (env.GITHUB_TOKEN) ghHeaders.Authorization = `Bearer ${env.GITHUB_TOKEN}`;

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
        const meta = await metaR.json().catch(() => null);
        if (!meta || typeof meta !== "object") throw new HttpError("GitHub returned an unreadable response", 502);

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

        const files = [];
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

        const now = new Date().toISOString();
        const name = meta.name || repo;
        const desc = `Imported from github.com/${owner}/${repo} — ${meta.description || name}`;
        const r = await env.DB.prepare(
          "INSERT INTO projects (user_id, name, description, repo_url, status, tech_stack, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)"
        ).bind(user.sub, name, desc, meta.html_url, "imported", "github", now, now).run();
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
        ).bind(user.sub, projectId, `${owner}/${repo}`, meta.html_url, meta.default_branch, now).run();

        return json({ project: { id: projectId, name, description: desc, status: "imported", tech_stack: "github" }, repo: `${owner}/${repo}`, imported: files.length, files: files.map((f) => ({ path: f.path, size: f.content.length })) }, 201);
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
      if (path.startsWith("/api/projects/") && method === "DELETE") {
        const id = parseInt(path.split("/")[3], 10);
        const p = await env.DB.prepare("SELECT id FROM projects WHERE id=? AND user_id=?").bind(id, user.sub).first();
        if (!p) return err("Not found", 404);
        await env.DB.prepare("DELETE FROM project_files WHERE project_id=?").bind(id).run();
        await env.DB.prepare("DELETE FROM builds WHERE project_id=?").bind(id).run();
        await env.DB.prepare("DELETE FROM projects WHERE id=?").bind(id).run();
        await cacheDrop(env, projectsListKey(user.sub));
        await cacheDrop(env, filesListKey(id));
        await cacheDrop(env, buildsListKey(id));
        return json({ ok: true });
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
      if (path === "/api/ai/generate" && method === "POST") {
        const b = await request.json().catch(() => ({}));
        const projectId = parseInt(b.projectId, 10);
        if (!projectId) return err("projectId required");
        const p = await env.DB.prepare("SELECT id FROM projects WHERE id=? AND user_id=?").bind(projectId, user.sub).first();
        if (!p) return err("Not found", 404);
        const plan = b.plan || b.prompt || `Build a complete website called ${p.name || "my site"}`;
        return await runGenerate(env, user, projectId, plan, "generate", url.origin);
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
        const idx = files.find((f) => /(^|\/)index\.html?$/i.test(f.path));
        const publishUrl = `${url.origin}/published/${projectId}/${idx ? idx.path : files[0].path}`;
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

        // The work must NOT run in ctx.waitUntil: Cloudflare tears that
        // context down at ~30s (measured 2026-09-25 — build 70's outbound
        // fetch was cancelled at 21:38:09, 31s after start, killing the code
        // writer while the planner had already finished). Instead the Hive
        // relay calls back into POST /api/builds/:id/run, which is an ordinary
        // long-lived request with no such ceiling. The relay answers this kick
        // immediately, so waitUntil has plenty of room for it.
        const kick = (async () => {
          if (env.HIVE_URL && env.HIVE_TOKEN) {
            const runUrl = url.origin + "/api/builds/" + id + "/run";
            const base = String(env.HIVE_URL).replace(/\/v1\/chat\/completions\/?$/, "");
            const r = await fetch(base + "/hive/run", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: "Bearer " + env.HIVE_TOKEN },
              body: JSON.stringify({ run_url: runUrl }),
              signal: AbortSignal.timeout(15000),
            });
            if (r.ok) return; // relay accepted the job
          }
          // No relay configured — run inline as before (dev/test only).
          await runGenerate(env, user, projectId, prompt, "generate", url.origin, id).catch(async (e) => {
            await failBuild(env, id, e);
          });
        })().catch(async (e) => { await failBuild(env, id, e); });
        if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(kick);

        return json({ id, project_id: projectId, status: "running", started_at: startedAt }, 202);
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
