// Zones this Worker will claim a hostname in. `createstuff.ai` is in the OTHER
// Cloudflare account (Placebetsai) — that is not a reason to leave it out, it
// is a reason to handle its DNS and its serving differently, which the two
// helpers below do.
const CONTROLLED_ZONES = new Set([
  "fashionistas.ai",
  "createstuff.ai",
  "marketpicks.ai",
  "israeljoffe.com",
  "israeljoffe.org",
  "ketiservice.com",
  "religiousjews.com",
  "wuwonline.com",
  "wuwonline.org",
]);

// The zones that are NOT in this Worker's own account, and what serves them
// there instead. Two measured facts drive this:
//   1. A CNAME from the createstuff.ai zone to a workers.dev hostname in this
//      account is refused by Cloudflare with error 1014 (cross-client) —
//      measured 2026-09-29 — so the old DNS_TARGET cannot be used there.
//   2. A Worker can only have routes in its own account, so this Worker cannot
//      answer `*.createstuff.ai` itself. The `createstuff-sites` Pages project
//      IS in that account, already serves published sites, and accepts a custom
//      domain per claim through the Pages API.
const CROSS_ACCOUNT_ZONES = new Set(["createstuff.ai"]);
const CROSS_ACCOUNT_DNS_TARGET = "createstuff-sites.pages.dev";
const PAGES_ACCOUNT_ID = "2765cb2786006552f33cc3dfe0b680a1";
const PAGES_SERVE_PROJECT = "createstuff-sites";

// First labels that are never claimable. Without this list a user could type
// `app.createstuff.ai` and the attach would overwrite the CNAME that points at
// the product itself — `Connect it` would take the builder offline rather than
// publish anything. Every name a zone already uses for itself is listed here,
// along with the ones that are conventionally somebody else's.
const RESERVED_HOST_LABELS = new Set([
  "app", "api", "sites", "www", "mail", "smtp", "imap", "pop", "ftp", "cdn",
  "static", "assets", "admin", "dashboard", "login", "signin", "signup",
  "auth", "account", "accounts", "status", "support", "help", "docs", "blog",
  "dev", "test", "staging", "preview", "build", "files", "storage", "hooks",
  "jobs", "ns1", "ns2", "vpn", "webmail", "autoconfig", "mta", "laboratory",
]);

const DEFAULT_AUTH_ORIGIN = "https://createstuff-api.fashionistas1979.workers.dev";
const DEFAULT_WORKERS_HOSTS = new Set([
  "fashionistas1979.workers.dev",
  "app-host.fashionistas1979.workers.dev",
]);
const JSON_LIMIT = 16 * 1024;
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};
// This worker answers with X-Content-Type-Options: nosniff, so a file whose
// type is missing here is not sniffed by the browser — it is served as
// application/octet-stream and refused. The list below therefore covers every
// extension createstuff-api treats as a publishable asset (its ASSET_EXT), not
// just the ones that happened to appear first.
const CONTENT_TYPES = new Map([
  [".html", "text/html; charset=utf-8"],
  [".htm", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".mjs", "application/javascript; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".webmanifest", "application/manifest+json"],
  [".wasm", "application/wasm"],
  [".xml", "application/xml; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  [".pdf", "application/pdf"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".gif", "image/gif"],
  [".webp", "image/webp"],
  [".avif", "image/avif"],
  [".svg", "image/svg+xml"],
  [".ico", "image/x-icon"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
  [".ttf", "font/ttf"],
  [".otf", "font/otf"],
  [".eot", "application/vnd.ms-fontobject"],
  [".mp4", "video/mp4"],
  [".webm", "video/webm"],
  [".mp3", "audio/mpeg"],
]);
// The binary members of CONTENT_TYPES: a file stored base64-encoded is decoded
// to real bytes before it is sent, so an image or a font arrives as bytes and
// not as base64 text wearing an image content type.
const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".ico",
  ".woff", ".woff2", ".ttf", ".otf", ".eot",
  ".mp4", ".webm", ".mp3",
]);
const encoder = new TextEncoder();
let schemaReady = false;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function json(data, status = 200, head = false) {
  return new Response(head ? null : JSON.stringify(data), {
    status,
    headers: {
      ...CORS,
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function err(message, status = 400) {
  return json({ error: message }, status);
}

function methodNotAllowed(allow) {
  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: {
      ...CORS,
      Allow: allow,
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function positiveInteger(value) {
  const text = String(value ?? "");
  if (!/^[1-9]\d*$/.test(text)) return null;
  const number = Number(text);
  return Number.isSafeInteger(number) ? number : null;
}

function sameId(left, right) {
  return left !== null && left !== undefined && right !== null && right !== undefined && String(left) === String(right);
}

function requestHostname(value) {
  const hostname = String(value || "").trim().toLowerCase().replace(/\.$/, "");
  return hostname && /^[a-z0-9.-]+$/.test(hostname) ? hostname : "";
}

function normalizeHostname(value) {
  let hostname = String(value ?? "").trim().toLowerCase();
  if (!hostname || hostname.length > 253 || /[\s/?#@\\]/.test(hostname) || hostname.includes(":")) return null;
  hostname = hostname.replace(/\.$/, "");
  if (!hostname || hostname.length > 253 || CONTROLLED_ZONES.has(hostname)) return null;
  const zone = [...CONTROLLED_ZONES].find((candidate) => hostname.endsWith(`.${candidate}`));
  if (!zone) return null;
  const labels = hostname.split(".");
  if (labels.length < 3 || labels.some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) return null;
  return hostname;
}

function normalizeAttachHostname(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (!text.includes("://")) return normalizeHostname(text);
  try {
    const parsed = new URL(text);
    if (!/^https?:$/.test(parsed.protocol) || parsed.username || parsed.password || parsed.port || (parsed.pathname && parsed.pathname !== "/") || parsed.search || parsed.hash) return null;
    return normalizeHostname(parsed.hostname);
  } catch {
    return null;
  }
}

function hostnameFromDeployUrl(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  try {
    const parsed = new URL(text.includes("://") ? text : `https://${text}`);
    if (parsed.port) return null;
    return normalizeHostname(parsed.hostname);
  } catch {
    return null;
  }
}

function projectIdFromConvention(hostname) {
  for (const zone of CONTROLLED_ZONES) {
    const suffix = `.${zone}`;
    if (!hostname.endsWith(suffix)) continue;
    const label = hostname.slice(0, -suffix.length);
    const match = /^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)-([1-9]\d*)$/.exec(label);
    if (match) return positiveInteger(match[2]);
  }
  return null;
}

async function ensureSchema(env) {
  if (schemaReady) return;
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS app_hosts (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       hostname TEXT NOT NULL UNIQUE,
       project_id INTEGER NOT NULL,
       user_id INTEGER,
       created_at TEXT NOT NULL,
       updated_at TEXT NOT NULL
     )`
  ).run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_app_hosts_project_id ON app_hosts(project_id)").run();
  // The published list below used to scan ALL of projects on every refresh:
  // 18,214 scans on 2026-09-27 read 2,445,142 rows and helped push the account
  // past D1's free daily read limit, which took every site offline until UTC
  // midnight. A partial index holds only the rows that query can ever return,
  // so a scan reads ~the number of published apps instead of the whole table
  // (the table/published ratio measured at 7.9 : 1). Wrapped in its own try:
  // if an engine build ever refuses a partial index this must fall back to the
  // plain scan rather than take the worker down.
  try {
    await env.DB.prepare(
      "CREATE INDEX IF NOT EXISTS idx_projects_deployed ON projects(deploy_url) " +
        "WHERE deploy_url IS NOT NULL AND deploy_url != ''"
    ).run();
  } catch { /* plain full scan, exactly as before */ }
  schemaReady = true;
}

// ── account-wide D1 read-budget guard ─────────────────────────────────────
// Cloudflare bills D1 reads per ACCOUNT: MarketPicks, Fashionistas and
// CreateStuff share one 5,000,000-row daily pot. The status is published into
// the shared KV namespace by createstuff-api's scheduled handler (see
// workers/createstuff-api/src/index.js). This worker only READS it: one free
// KV read, memoised for five minutes so the guard itself never costs anything.
// An unreadable or missing record ALLOWS the scan — a broken monitor must not
// be able to take a working site down.
const D1_BUDGET_KEY = "d1budget:current";
const BUDGET_MEMO_MS = 5 * 60 * 1000;
let budgetMemo = null;

async function readBudgetState(env) {
  const now = Date.now();
  if (budgetMemo && now - budgetMemo.at < BUDGET_MEMO_MS) return budgetMemo.state;
  let state = null;
  try {
    const raw = await env.KV.get(D1_BUDGET_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.state === "string") state = parsed.state;
    }
  } catch { state = null; }
  budgetMemo = { at: now, state };
  return state;
}

// Scan counters live in THIS isolate's memory, not in KV: KV's free tier allows
// 1,000 writes a day and a counter that costs a write per scan would spend the
// budget it exists to protect. The debug route below reads them.
const scanStats = { performed: 0, skipped: 0 };

async function projectExists(env, projectId) {
  const row = await env.DB.prepare("SELECT id FROM projects WHERE id=?").bind(projectId).first();
  return row ? positiveInteger(row.id) : null;
}

// hostname -> project id (or null), per isolate. Every request on the fronted
// zones reaches this Worker, and the fallback below scans the projects table:
// 18,214 scans on 2026-09-27 read 2.5M rows and helped push the account over
// D1's free daily read limit, which took the databases offline for every site.
const HOST_CACHE = new Map();
const HOST_TTL_MS = 5 * 60 * 1000;
let DEPLOYED_CACHE = null;

async function resolveHostProject(env, hostname) {
  const hit = HOST_CACHE.get(hostname);
  if (hit && Date.now() - hit.at < HOST_TTL_MS) return hit.id;
  const id = await resolveHostProjectUncached(env, hostname);
  if (HOST_CACHE.size > 5000) HOST_CACHE.clear();
  HOST_CACHE.set(hostname, { id, at: Date.now() });
  return id;
}

async function resolveHostProjectUncached(env, hostname) {
  await ensureSchema(env);
  const mapped = await env.DB.prepare("SELECT project_id FROM app_hosts WHERE hostname=? LIMIT 1").bind(hostname).first();
  if (mapped && mapped.project_id !== null && mapped.project_id !== undefined) {
    const mappedId = positiveInteger(mapped.project_id);
    if (!mappedId) return null;
    return (await projectExists(env, mappedId)) ? mappedId : null;
  }

  // Bots probe random subdomains (mail., cpanel., ...), each a new hostname
  // that misses HOST_CACHE, so the deployed list itself is cached too: one
  // scan per isolate per TTL instead of one per unknown hostname.
  //
  // CIRCUIT BREAKER: refreshing that list is a WHOLE-TABLE read, and this is
  // the exact query whose 18,214 scans read 2,445,142 rows on 2026-09-27 and
  // helped push the account past D1's free daily limit — which took every site
  // on the account dark until 00:00 UTC. When the shared pot is nearly empty,
  // keep serving the list we already have: a slightly stale list of published
  // apps beats a day of total outage. It still scans when nothing is cached,
  // because refusing there would 404 perfectly good apps.
  if (!DEPLOYED_CACHE || Date.now() - DEPLOYED_CACHE.at > HOST_TTL_MS) {
    const budgetState = await readBudgetState(env);
    if (DEPLOYED_CACHE && budgetState === "halt") {
      scanStats.skipped++;
      DEPLOYED_CACHE = { rows: DEPLOYED_CACHE.rows, at: Date.now(), servedStale: true };
    } else {
      const deployed = await env.DB.prepare("SELECT id, deploy_url FROM projects WHERE deploy_url IS NOT NULL AND deploy_url != ''").all();
      DEPLOYED_CACHE = { rows: deployed.results || [], at: Date.now(), servedStale: false };
      scanStats.performed++;
    }
  }
  for (const row of DEPLOYED_CACHE.rows) {
    if (hostnameFromDeployUrl(row.deploy_url) === hostname) {
      const projectId = positiveInteger(row.id);
      if (projectId && (await projectExists(env, projectId))) return projectId;
    }
  }

  const conventionId = projectIdFromConvention(hostname);
  return conventionId && (await projectExists(env, conventionId)) ? conventionId : null;
}

function decodeRequestPath(value) {
  let decoded;
  try {
    decoded = decodeURIComponent(String(value || ""));
  } catch {
    return null;
  }
  const path = decoded.replace(/^\/+/, "");
  if (path.includes("\0")) return null;
  const parts = path.split("/");
  if (parts.some((part) => part === "." || part === "..")) return null;
  if (!path) return ["index.html"];
  if (path.endsWith("/")) return [`${path}index.html`];
  const candidates = [path];
  // The leading slash is already stripped above, so the extension test must
  // accept a filename at the TOP level too. Without the (^|\/) branch every
  // top-level file failed this test, "index.html" was appended as a fallback,
  // and a missing /missing.css came back as 200 text/html instead of 404.
  if (!/(^|\/)[^/]+\.[^/]+$/.test(path)) candidates.push("index.html");
  return [...new Set(candidates)];
}

function fileContentType(filePath) {
  const lowerPath = String(filePath || "").toLowerCase();
  const extension = lowerPath.slice(lowerPath.lastIndexOf("."));
  return CONTENT_TYPES.get(extension) || "application/octet-stream";
}

function cacheControl(filePath) {
  if (/\.html?$/i.test(filePath)) return "public, max-age=0, must-revalidate";
  if (/\.(css|js|mjs|json)$/i.test(filePath)) return "public, max-age=3600";
  return "public, max-age=86400";
}

function responseBody(content, filePath) {
  const text = typeof content === "string" ? content : content == null ? "" : String(content);
  const extension = String(filePath || "").toLowerCase().slice(String(filePath || "").toLowerCase().lastIndexOf("."));
  if (BINARY_EXTENSIONS.has(extension)) {
    const encoded = text.startsWith("data:") ? text.slice(text.indexOf(",") + 1) : text;
    const compact = encoded.replace(/\s+/g, "");
    if (compact.length >= 16 && compact.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(compact)) {
      try {
        return Uint8Array.from(atob(compact), (character) => character.charCodeAt(0));
      } catch {
        return text;
      }
    }
  }
  return text;
}

function byteLength(body) {
  return body instanceof Uint8Array ? body.byteLength : encoder.encode(String(body)).byteLength;
}

// STATIC FILE CACHE
// Before this block every static request ran a D1 SELECT (measured: 55.5 rps,
// p50 423.6ms at c=25, versus 601.4 rps / p50 65.5ms for the same worker's
// compute-only /api/health). project_files now lives in KV for the length of
// STATIC_CACHE_TTL_MS, and a stale or missing entry falls back to D1.
// The TTL is deliberately short: it bounds how long a regenerated project can
// still be served from its previous content.
const STATIC_CACHE_TTL_MS = 5000;
// KV entries self-expire so orphaned versions are collected without a sweeper.
const STATIC_CACHE_KV_TTL_S = 300;

function staticCacheKey(projectId, candidate) {
  return `pf:${projectId}:${candidate}`;
}

async function readStaticCache(env, projectId, candidate) {
  if (!env.KV) return null;
  try {
    const raw = await env.KV.get(staticCacheKey(projectId, candidate));
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry || typeof entry.capturedAt !== "number") return null;
    if (Date.now() - entry.capturedAt > STATIC_CACHE_TTL_MS) return null;
    if (typeof entry.content !== "string") return null;
    // filePath decides the Content-Type and the Cache-Control of the response,
    // so a hit that is missing it would answer 200 with the wrong type for the
    // file the caller asked for.
    if (typeof entry.filePath !== "string" || !entry.filePath) return null;
    return entry;
  } catch {
    // A cache read must never be able to fail a request.
    return null;
  }
}

async function writeStaticCache(env, projectId, candidate, entry) {
  if (!env.KV) return;
  try {
    await env.KV.put(staticCacheKey(projectId, candidate), JSON.stringify(entry), {
      expirationTtl: STATIC_CACHE_KV_TTL_S,
    });
  } catch {
    // A cache write must never be able to fail a request either.
  }
}

function buildFileResponse(request, filePath, content, updatedAt, cacheStatus, serverTiming) {
  const body = responseBody(content, filePath);
  const headers = new Headers({
    ...CORS,
    "Cache-Control": cacheControl(filePath),
    "Content-Length": String(byteLength(body)),
    "Content-Type": fileContentType(filePath),
    "X-Content-Type-Options": "nosniff",
    // Operational signal: proves on live traffic whether the static cache is
    // actually being hit instead of falling through to D1.
    ...(cacheStatus ? { "X-Cache": cacheStatus } : {}),
    ...(serverTiming ? { "Server-Timing": serverTiming } : {}),
  });
  if (updatedAt) headers.set("Last-Modified", new Date(updatedAt).toUTCString());
  return new Response(request.method === "HEAD" ? null : body, { status: 200, headers });
}

async function serveProjectFile(env, request, projectId, rawPath, allowSpaFallback) {
  const candidates = allowSpaFallback ? decodeRequestPath(rawPath) : decodeRequestPath(rawPath);
  if (!candidates) return err("Invalid file path", 400);
  for (const candidate of candidates) {
    const kvStart = Date.now();
    const cached = await readStaticCache(env, projectId, candidate);
    const kvMs = Date.now() - kvStart;
    if (cached) return buildFileResponse(request, cached.filePath, cached.content, cached.updatedAt, "HIT", `kv;dur=${kvMs}`);

    const d1Start = Date.now();
    const row = await env.DB.prepare(
      "SELECT path, file_path, content, updated_at FROM project_files WHERE project_id=? AND (path=? OR file_path=?) LIMIT 1"
    ).bind(projectId, candidate, candidate).first();
    const d1Ms = Date.now() - d1Start;
    if (!row) continue;
    const filePath = row.path || row.file_path || candidate;
    const content = typeof row.content === "string" ? row.content : row.content == null ? "" : String(row.content);
    await writeStaticCache(env, projectId, candidate, {
      filePath,
      content,
      updatedAt: row.updated_at || null,
      capturedAt: Date.now(),
    });
    return buildFileResponse(request, filePath, content, row.updated_at, "MISS", `d1;dur=${d1Ms}`);
  }
  return null;
}

function pathTarget(url) {
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments[0] !== "published" && segments[0] !== "app") return null;
  const projectId = positiveInteger(segments[1]);
  if (!projectId) return { invalid: true };
  return { projectId, filePath: `/${segments.slice(2).join("/")}` };
}

function isWorkersHost(hostname) {
  return DEFAULT_WORKERS_HOSTS.has(hostname) || hostname.endsWith(".workers.dev");
}

function attachRoute(pathname) {
  if (pathname === "/api/hosts/attach") return { projectId: null, invalid: false };
  const match = /^\/api\/projects\/([^/]+)\/host$/.exec(pathname);
  if (!match) return null;
  let decoded;
  try {
    decoded = decodeURIComponent(match[1]);
  } catch {
    return { projectId: null, invalid: true };
  }
  return { projectId: positiveInteger(decoded), invalid: !positiveInteger(decoded) };
}

async function readJson(request) {
  // Refuse on the declared length before reading anything: request.text()
  // buffers the whole body, so a body that is over the limit is paid for in
  // memory before the check below ever runs.
  const declared = Number(request.headers.get("Content-Length"));
  if (Number.isFinite(declared) && declared > JSON_LIMIT) throw new HttpError(413, "Request body is too large");
  const text = await request.text();
  // JSON_LIMIT is a byte budget. text.length counts UTF-16 code units, so a
  // body of multi-byte characters measured well under the cap in characters
  // while carrying several times the limit in bytes.
  if (byteLength(text) > JSON_LIMIT) throw new HttpError(413, "Request body is too large");
  if (!text.trim()) return {};
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("body must be an object");
    return value;
  } catch {
    throw new HttpError(400, "Request body must be a JSON object");
  }
}

function authOrigin(env) {
  const value = String(env.AUTH_ORIGIN || DEFAULT_AUTH_ORIGIN).trim().replace(/\/+$/, "");
  try {
    const parsed = new URL(value);
    if (!/^https?:$/.test(parsed.protocol)) return DEFAULT_AUTH_ORIGIN;
    return value;
  } catch {
    return DEFAULT_AUTH_ORIGIN;
  }
}

async function authenticate(request, env) {
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token || token.length > 4096) return { error: err("Authentication required", 401) };
  let response;
  try {
    response = await fetch(`${authOrigin(env)}/api/auth/me`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    });
  } catch {
    return { error: err("Authentication service unavailable", 502) };
  }
  if (response.status === 401 || response.status === 403) return { error: err("Unauthorized", 401) };
  if (!response.ok) return { error: err(`Authentication service returned HTTP ${response.status}`, 502) };
  let body;
  try {
    body = await response.json();
  } catch {
    return { error: err("Authentication service returned invalid JSON", 502) };
  }
  if (!body || !body.user || body.user.id === null || body.user.id === undefined) return { error: err("Unauthorized", 401) };
  return { user: body.user };
}

// DOMAIN CONNECT — the missing link between "attached" and "actually live".
// attachHost() only wrote a row to app_hosts; DNS was left entirely to the
// user, who has no way to know that. This creates the real CNAME so the
// hostname resolves to this worker. Proven end-to-end earlier with
// CF_DNS_TOKEN: POST -> success=true, then https://e2e-125.fashionistas.ai/
// served the generated app at 200.
const DNS_TARGET = "app-host.fashionistas1979.workers.dev";
const CF_API = "https://api.cloudflare.com/client/v4";

function zoneFor(hostname) {
  for (const zone of CONTROLLED_ZONES) {
    if (hostname.endsWith(`.${zone}`)) return zone;
  }
  return null;
}

async function cfJson(response) {
  let payload = null;
  try { payload = await response.json(); } catch { payload = null; }
  return { ok: response.ok && payload && payload.success !== false, status: response.status, payload };
}

// Creates or updates the proxied CNAME. Returns a status object the UI can
// render honestly — including "unconfigured" when the secret is absent, which
// must never fail the attach itself.
async function ensureDnsRecord(env, hostname) {
  const zone = zoneFor(hostname);
  if (!zone) return { status: "unsupported-zone", detail: `no controlled zone matches ${hostname}` };
  // Which account's DNS token can write this zone: the two accounts are
  // separate, and neither token reaches into the other (measured 2026-09-29).
  const crossAccount = CROSS_ACCOUNT_ZONES.has(zone);
  const token = crossAccount ? env.CF_DNS_TOKEN_CREATESTUFF : env.CF_DNS_TOKEN;
  const target = crossAccount ? CROSS_ACCOUNT_DNS_TARGET : DNS_TARGET;
  if (!token) {
    return {
      status: "unconfigured",
      detail: crossAccount
        ? "CF_DNS_TOKEN_CREATESTUFF is not set on this worker"
        : "CF_DNS_TOKEN is not set on this worker",
    };
  }

  try {
    const zoneRes = await cfJson(await fetch(`${CF_API}/zones?name=${encodeURIComponent(zone)}`, {
      headers: { Authorization: `Bearer ${token}` },
    }));
    const zoneId = zoneRes.payload && zoneRes.payload.result && zoneRes.payload.result[0] && zoneRes.payload.result[0].id;
    if (!zoneId) return { status: "error", detail: `zone lookup failed (HTTP ${zoneRes.status})` };

    const existing = await cfJson(await fetch(`${CF_API}/zones/${zoneId}/dns_records?name=${encodeURIComponent(hostname)}`, {
      headers: { Authorization: `Bearer ${token}` },
    }));
    const found = existing.payload && existing.payload.result && existing.payload.result[0];

    const record = { type: "CNAME", name: hostname, content: target, proxied: true, ttl: 1 };

    if (found) {
      // Never repoint a record that belongs to something else. A name that
      // already resolves to a different target has a service behind it — most
      // dangerously `app.`, `sites.` or `www.` on our own zone — and overwriting
      // it would take that service down in exchange for publishing one site.
      // Pointing at the same target means it is already ours: refresh and go.
      const sameTarget = String(found.content || "").trim().toLowerCase() === target.toLowerCase();
      if (!sameTarget) {
        return {
          status: "error",
          detail: `an address already exists at ${hostname} pointing somewhere else, so it was left untouched`,
        };
      }
      const upd = await cfJson(await fetch(`${CF_API}/zones/${zoneId}/dns_records/${found.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(record),
      }));
      if (!upd.ok) return { status: "error", detail: `update failed (HTTP ${upd.status})` };
      return { status: "updated", zone, target };
    }

    const created = await cfJson(await fetch(`${CF_API}/zones/${zoneId}/dns_records`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(record),
    }));
    if (!created.ok) {
      const msg = created.payload && created.payload.errors && created.payload.errors[0] && created.payload.errors[0].message;
      return { status: "error", detail: msg || `create failed (HTTP ${created.status})` };
    }
    return { status: "created", zone, target };
  } catch (error) {
    return { status: "error", detail: String(error && error.message || error).slice(0, 200) };
  }
}

// Cross-account half of domain connect. For a zone this Worker cannot route to
// (createstuff.ai), making DNS resolve is not enough: Cloudflare Pages refuses
// a hostname it has not been told about — measured as HTTP 522 before this
// ran — so the name must also be attached to the Pages project that will serve
// it. Attaching is idempotent, and the status is reported honestly, including
// "attaching": Cloudflare takes roughly a minute to issue the certificate, and
// the UI must not call that "live" while it is still pending.
async function ensurePagesDomain(env, hostname) {
  const token = env.CS_API_TOKEN;
  if (!token) return { status: "unconfigured", detail: "CS_API_TOKEN is not set on this worker" };
  const base = `${CF_API}/accounts/${PAGES_ACCOUNT_ID}/pages/projects/${PAGES_SERVE_PROJECT}/domains`;
  try {
    const list = await cfJson(await fetch(base, { headers: { Authorization: `Bearer ${token}` } }));
    if (!list.ok) {
      const msg = list.payload && list.payload.errors && list.payload.errors[0] && list.payload.errors[0].message;
      return { status: "error", detail: msg || `domain list failed (HTTP ${list.status})` };
    }
    const found = ((list.payload && list.payload.result) || []).find((d) => d && d.name === hostname);
    if (found) return { status: found.status || "known", project: PAGES_SERVE_PROJECT };

    const created = await cfJson(await fetch(base, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: hostname }),
    }));
    if (!created.ok) {
      const msg = created.payload && created.payload.errors && created.payload.errors[0] && created.payload.errors[0].message;
      return { status: "error", detail: msg || `attach failed (HTTP ${created.status})` };
    }
    const body = created.payload && created.payload.result;
    return { status: (body && body.status) || "attaching", project: PAGES_SERVE_PROJECT };
  } catch (error) {
    return { status: "error", detail: String(error && error.message || error).slice(0, 200) };
  }
}

// Read side of domain connect: which hostnames point at this project, and do
// they actually answer right now. The probe is a real request to the live URL,
// so "live" in the UI means a measured HTTP status and byte count — never a
// row in a table standing in for a site that may not resolve.
async function listHosts(request, env, route) {
  const authenticated = await authenticate(request, env);
  if (authenticated.error) return authenticated.error;
  if (route.invalid || !route.projectId) return err("A valid projectId is required", 422);
  const projectId = route.projectId;
  const project = await env.DB.prepare("SELECT id, user_id FROM projects WHERE id=?").bind(projectId).first();
  if (!project) return err("Project not found", 404);
  if (!sameId(project.user_id, authenticated.user.id)) return err("You do not own this project", 403);

  await ensureSchema(env);
  const rows = await env.DB.prepare(
    "SELECT hostname, created_at FROM app_hosts WHERE project_id=? ORDER BY id DESC LIMIT 20"
  ).bind(projectId).all();

  const hosts = await Promise.all((rows.results || []).map(async (row) => {
    const url = `https://${row.hostname}/`;
    let probe;
    try {
      const response = await fetch(url, {
        headers: { Accept: "text/html,application/xhtml+xml" },
        signal: AbortSignal.timeout(10000),
      });
      const buffer = await response.arrayBuffer();
      probe = {
        status: response.status,
        bytes: buffer.byteLength,
        live: response.status === 200 && buffer.byteLength > 0,
      };
    } catch (error) {
      probe = { status: 0, bytes: 0, live: false, error: String(error && error.message || error).slice(0, 160) };
    }
    return { hostname: row.hostname, url, created_at: row.created_at, probe };
  }));

  return json({ ok: true, project_id: projectId, hosts });
}

async function attachHost(request, env, route) {
  if (request.method === "GET") return listHosts(request, env, route);
  if (request.method !== "POST") return methodNotAllowed("GET, POST, OPTIONS");
  const authenticated = await authenticate(request, env);
  if (authenticated.error) return authenticated.error;
  const body = await readJson(request);
  const bodyProjectId = positiveInteger(body.projectId ?? body.project_id ?? body.id);
  if (route.invalid || !bodyProjectId && !route.projectId) return err("A valid projectId is required", 422);
  if (route.projectId && bodyProjectId && route.projectId !== bodyProjectId) return err("projectId does not match the route", 422);
  const projectId = route.projectId || bodyProjectId;
  const hostname = normalizeAttachHostname(body.hostname ?? body.host ?? body.domain);
  if (!hostname) return err("hostname must be a subdomain of a controlled zone", 422);
  // Refuse before touching DNS or Pages: a reserved first label is a name the
  // platform already uses, and attaching it would repoint the product itself.
  const firstLabel = hostname.split(".")[0];
  if (RESERVED_HOST_LABELS.has(firstLabel)) {
    return err(`"${firstLabel}" is a name the platform keeps for itself — pick a different word`, 422);
  }
  const project = await env.DB.prepare("SELECT id, user_id FROM projects WHERE id=?").bind(projectId).first();
  if (!project) return err("Project not found", 404);
  if (!sameId(project.user_id, authenticated.user.id)) return err("You do not own this project", 403);

  await ensureSchema(env);
  const now = new Date().toISOString();
  // Settle the conflict BEFORE touching DNS. A hostname that already belongs to
  // another project is refused, and a refused attach must not write anything —
  // creating its DNS record first meant a 409 still mutated the zone.
  const existing = await env.DB.prepare("SELECT id, project_id FROM app_hosts WHERE hostname=? LIMIT 1").bind(hostname).first();
  if (existing && !sameId(existing.project_id, projectId)) return err("hostname is already attached to another project", 409);
  // Attach the hostname AND make it resolve. dns is reported either way so the
  // UI can say plainly what happened instead of implying the site is live.
  const dns = await ensureDnsRecord(env, hostname);
  // DNS that resolves is not the same as a hostname the serving project knows
  // about: for a zone in the other account there is no Worker route to fall
  // back on, and Pages answers an unattached name with 522. So the attach is
  // finished here, and its own status travels back to the UI.
  const pages = CROSS_ACCOUNT_ZONES.has(zoneFor(hostname) || "")
    ? await ensurePagesDomain(env, hostname)
    : null;
  if (existing) {
    await env.DB.prepare("UPDATE app_hosts SET user_id=?, updated_at=? WHERE id=?").bind(authenticated.user.id, now, existing.id).run();
    return json({ ok: true, attached: true, hostname, project_id: projectId, url: `https://${hostname}/`, dns, pages });
  }
  try {
    const result = await env.DB.prepare(
      "INSERT INTO app_hosts (hostname, project_id, user_id, created_at, updated_at) VALUES (?,?,?,?,?)"
    ).bind(hostname, projectId, authenticated.user.id, now, now).run();
    return json({ ok: true, attached: true, hostname, project_id: projectId, url: `https://${hostname}/`, dns, pages, id: result?.meta?.last_row_id || null }, 201);
  } catch (error) {
    const raced = await env.DB.prepare("SELECT id, project_id FROM app_hosts WHERE hostname=? LIMIT 1").bind(hostname).first();
    if (raced && sameId(raced.project_id, projectId)) return json({ ok: true, attached: true, hostname, project_id: projectId, url: `https://${hostname}/`, dns, pages });
    throw error;
  }
}

async function dispatch(request, env) {
  const url = new URL(request.url);
  const method = request.method;
  if (method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (url.pathname === "/api/health") {
    if (method !== "GET" && method !== "HEAD") return methodNotAllowed("GET, HEAD, OPTIONS");
    return json({ ok: true, service: "app-host", ts: Date.now() }, 200, method === "HEAD");
  }

  // Diagnostics for the D1 read-budget guard (see readBudgetState above).
  // Reports only this isolate's memory and the shared KV status — it never
  // touches D1 itself, so reading it costs zero rows. Isolate counters reset
  // when Cloudflare recycles the isolate; that is expected.
  if (url.pathname === "/api/budget-guard") {
    if (method !== "GET" && method !== "HEAD") return methodNotAllowed("GET, HEAD, OPTIONS");
    const budgetState = await readBudgetState(env);
    return json({
      ok: true,
      service: "app-host",
      ts: Date.now(),
      budget_state: budgetState || "unknown",
      scans: { performed: scanStats.performed, skipped: scanStats.skipped },
      cache: DEPLOYED_CACHE
        ? {
            rows: DEPLOYED_CACHE.rows.length,
            age_ms: Date.now() - DEPLOYED_CACHE.at,
            ttl_ms: HOST_TTL_MS,
            serving_stale: !!DEPLOYED_CACHE.servedStale,
          }
        : null,
    }, 200, method === "HEAD");
  }

  const attach = attachRoute(url.pathname);
  if (attach) return attachHost(request, env, attach);

  if (method !== "GET" && method !== "HEAD") return err("Not found", 404);
  const hostname = requestHostname(url.hostname);
  if (!hostname) return err("No project matched hostname", 404);

  if (isWorkersHost(hostname)) {
    const target = pathTarget(url);
    if (!target || target.invalid) return err("No project matched hostname", 404);
    const response = await serveProjectFile(env, request, target.projectId, target.filePath, false);
    return response || err("File not found", 404);
  }

  // www.<zone> is never a project: redirect before touching the database.
  const wwwApex = canonicalApex(hostname);
  if (wwwApex) {
    return new Response(null, {
      status: 308,
      headers: { ...CORS, Location: `https://${wwwApex}${url.pathname}${url.search}`, "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" },
    });
  }

  const projectId = await resolveHostProject(env, hostname);
  if (!projectId) {
    // www.<zone> is not an app-host project — it is an alias of the zone's own
    // site (marketpicks.ai, fashionistas.ai, …). Send the visitor there instead
    // of a dead end, preserving path and query so deep links keep working.
    const apex = canonicalApex(hostname);
    if (apex) {
      // Spread CORS like every other response here: a cross-origin reader that
      // follows this hop must be able to read it, and nosniff costs nothing.
      return new Response(null, {
        status: 308,
        headers: {
          ...CORS,
          Location: `https://${apex}${url.pathname}${url.search}`,
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    return err("No project matched hostname", 404);
  }
  const response = await serveProjectFile(env, request, projectId, url.pathname, true);
  return response || err("File not found", 404);
}

/** www.marketpicks.ai -> marketpicks.ai (only for zones this Worker fronts). */
function canonicalApex(hostname) {
  if (!hostname) return null;
  return [...CONTROLLED_ZONES].find((zone) => hostname === `www.${zone}`) || null;
}

export default {
  async fetch(request, env) {
    try {
      return await dispatch(request, env);
    } catch (error) {
      if (error instanceof HttpError) return err(error.message, error.status);
      return err("Internal server error", 500);
    }
  },
};
