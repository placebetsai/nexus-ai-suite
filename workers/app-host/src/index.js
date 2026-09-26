const CONTROLLED_ZONES = new Set([
  "fashionistas.ai",
  "marketpicks.ai",
  "israeljoffe.com",
  "israeljoffe.org",
  "ketiservice.com",
  "religiousjews.com",
  "wuwonline.com",
  "wuwonline.org",
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
  schemaReady = true;
}

async function projectExists(env, projectId) {
  const row = await env.DB.prepare("SELECT id FROM projects WHERE id=?").bind(projectId).first();
  return row ? positiveInteger(row.id) : null;
}

async function resolveHostProject(env, hostname) {
  await ensureSchema(env);
  const mapped = await env.DB.prepare("SELECT project_id FROM app_hosts WHERE hostname=? LIMIT 1").bind(hostname).first();
  if (mapped && mapped.project_id !== null && mapped.project_id !== undefined) {
    const mappedId = positiveInteger(mapped.project_id);
    if (!mappedId) return null;
    return (await projectExists(env, mappedId)) ? mappedId : null;
  }

  const deployed = await env.DB.prepare("SELECT id, deploy_url FROM projects WHERE deploy_url IS NOT NULL AND deploy_url != ''").all();
  for (const row of deployed.results || []) {
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
  const token = env.CF_DNS_TOKEN;
  if (!token) return { status: "unconfigured", detail: "CF_DNS_TOKEN is not set on this worker" };
  const zone = zoneFor(hostname);
  if (!zone) return { status: "unsupported-zone", detail: `no controlled zone matches ${hostname}` };

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

    const record = { type: "CNAME", name: hostname, content: DNS_TARGET, proxied: true, ttl: 1 };

    if (found) {
      const upd = await cfJson(await fetch(`${CF_API}/zones/${zoneId}/dns_records/${found.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(record),
      }));
      if (!upd.ok) return { status: "error", detail: `update failed (HTTP ${upd.status})` };
      return { status: "updated", zone, target: DNS_TARGET };
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
    return { status: "created", zone, target: DNS_TARGET };
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
  if (existing) {
    await env.DB.prepare("UPDATE app_hosts SET user_id=?, updated_at=? WHERE id=?").bind(authenticated.user.id, now, existing.id).run();
    return json({ ok: true, attached: true, hostname, project_id: projectId, url: `https://${hostname}/`, dns });
  }
  try {
    const result = await env.DB.prepare(
      "INSERT INTO app_hosts (hostname, project_id, user_id, created_at, updated_at) VALUES (?,?,?,?,?)"
    ).bind(hostname, projectId, authenticated.user.id, now, now).run();
    return json({ ok: true, attached: true, hostname, project_id: projectId, url: `https://${hostname}/`, dns, id: result?.meta?.last_row_id || null }, 201);
  } catch (error) {
    const raced = await env.DB.prepare("SELECT id, project_id FROM app_hosts WHERE hostname=? LIMIT 1").bind(hostname).first();
    if (raced && sameId(raced.project_id, projectId)) return json({ ok: true, attached: true, hostname, project_id: projectId, url: `https://${hostname}/`, dns });
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
