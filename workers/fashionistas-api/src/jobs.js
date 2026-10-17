// Cross-listing job pipeline (2026-10-16) — the SERVER half of the
// "connect once, then every item auto-posts" flow. The other half is the
// browser extension; its WIRE CONTRACT comment at the top of
// fashionistas-ai/apps/extension/queue.js is the specification this file
// implements, route for route:
//
//   GET  /api/jobs?status=queued     <- extension pulls jobs (X-Install-Id)
//   POST /api/jobs/{id}/status       <- extension reports posted/failed
//   POST /api/sessions               <- extension heartbeat / web master switch
//   GET  /api/sessions/list          <- web lists unpaired browsers
//   GET  /api/devices/code           <- web shows a 6-char pairing code
//   POST /api/devices/pair           <- web links a browser to the account
//   POST /api/jobs/enqueue           <- web auto-enqueues on every item save
//   POST /api/jobs/feed              <- web "Post all existing items" backfill
//   POST /api/sales, /api/delist, /api/sales/delist-log  <- sales scan events
//
// IDENTITY, and why it is shaped this way: the extension fetches the Worker
// origin directly with credentials:"include" — and a cookie set on
// fashionistas.ai is NOT sent to a workers.dev host, so there is no session
// to authenticate on those routes. Never was; never will be, cross-origin.
// The only durable identity a background extension can carry is a self-
// minted install id (see config/api.js installId()). So:
//   - extension routes resolve the caller by X-Install-Id -> device_pairs;
//     an UNPAIRED device gets 200 + {paired:false, jobs:[]} — an honest
//     empty answer, not a 401 the poll gate would treat as "route missing";
//   - user routes (enqueue/feed/pair/code/sessions-list) authenticate the
//     same way the rest of this Worker already does: the app's Bearer token
//     via the site's same-origin /w proxy, or X-Service-Token for
//     server-to-server callers when env.SERVICE_TOKEN is set.
// Job payloads carry listing text and photo URLs only — no passwords, no
// shop cookies, no tokens, ever, in either direction.
//
// Tables are created from INSIDE the Worker with CREATE TABLE IF NOT
// EXISTS, the same proven pattern as ensureDmTables in index.js (the deploy
// token has no D1 scope, so schema cannot be applied any other way).

const CODE_TTL_MS = 10 * 60 * 1000;        // pairing code life
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L
const RUNNING_LEASE_MS = 30 * 60 * 1000;   // a claimed job requeues after this
const FEED_MAX_LISTINGS = 500;             // backfill ceiling per call
const SHOPS_MAX = 12;                      // shops per enqueue

/* ── schema ─────────────────────────────────────────────────────────────── */

let xTablesReady = false, xTablesPending = null;
async function ensureXTables(env) {
  if (xTablesReady) return;
  const p = xTablesPending || (xTablesPending = (async () => {
    await env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS x_jobs (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         user_id INTEGER NOT NULL,
         item_id INTEGER,
         shop TEXT NOT NULL,
         account TEXT NOT NULL DEFAULT 'default',
         type TEXT NOT NULL DEFAULT 'publish',
         status TEXT NOT NULL DEFAULT 'queued',
         payload TEXT NOT NULL DEFAULT '{}',
         listing_url TEXT,
         error TEXT,
         needs_review INTEGER NOT NULL DEFAULT 0,
         hint TEXT,
         attempts INTEGER NOT NULL DEFAULT 0,
         install_id TEXT,
         source TEXT,
         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
       )`
    ).run();
    await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_jobs_queue ON x_jobs(user_id, status, created_at)").run();
    // One live job per (user, item, shop, type): the upsert in enqueueJobs()
    // uses this to make enqueue + feed idempotent — a re-save or a double
    // tap on "Post all existing items" can never produce a second post.
    await env.DB.prepare(
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_jobs_item_shop
         ON x_jobs(user_id, item_id, shop, type)`
    ).run();
    await env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS x_shop_sessions (
         install_id TEXT NOT NULL,
         shop TEXT NOT NULL,
         connected INTEGER NOT NULL DEFAULT 0,
         source TEXT,
         probed_at TEXT,
         PRIMARY KEY (install_id, shop)
       )`
    ).run();
    await env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS x_device_pairs (
         install_id TEXT PRIMARY KEY,
         user_id INTEGER NOT NULL,
         auto_post INTEGER NOT NULL DEFAULT 1,
         paired_at DATETIME DEFAULT CURRENT_TIMESTAMP
       )`
    ).run();
    await env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS x_device_codes (
         code TEXT PRIMARY KEY,
         user_id INTEGER NOT NULL,
         expires_at INTEGER NOT NULL,
         used INTEGER NOT NULL DEFAULT 0
       )`
    ).run();
    await env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS x_sales_events (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         install_id TEXT,
         shop TEXT,
         event TEXT,
         body TEXT,
         created_at DATETIME DEFAULT CURRENT_TIMESTAMP
       )`
    ).run();
  })());
  try {
    await p;
    xTablesReady = true;
  } catch (e) {
    xTablesPending = null; // next request retries; never cache a failure
    throw e;
  }
}

/* ── small helpers (pure where possible, so the tests can reach them) ───── */

const str = (v) => (typeof v === "string" ? v : null);
const int = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? Math.trunc(n) : d; };

/** 6-char code from an unambiguous alphabet (no look-alikes: 0/O, 1/I/L). */
export function makePairCode(randFn) {
  const rnd = randFn || (() => {
    const b = new Uint8Array(1); crypto.getRandomValues(b); return b[0] / 256;
  });
  let s = "";
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[Math.floor(rnd() * CODE_ALPHABET.length)];
  return s;
}

/** Normalize a session heartbeat body to [[shop, 0|1], ...].
 *  Extension shape: {sessions:{shop:bool}}. Booleans only — a truthy string
 *  or a nested object is NOT a session and is dropped, so the heartbeats
 *  table can never hold anything but 0/1. */
export function sessionPairs(body) {
  const out = [];
  const s = body && body.sessions;
  if (!s || typeof s !== "object" || Array.isArray(s)) return out;
  for (const [shop, v] of Object.entries(s)) {
    if (typeof v === "boolean") out.push([String(shop).slice(0, 40), v ? 1 : 0]);
  }
  return out;
}

/** The job row as the extension receives it — EXACTLY the Job shape in the
 *  WIRE CONTRACT: unknown DB columns are never forwarded, the payload JSON
 *  is parsed, and a job without id is impossible (row id). */
export function wireJob(row) {
  let payload = {};
  try { payload = JSON.parse(row.payload || "{}"); } catch (e) { payload = {}; }
  return {
    id: row.id,
    type: row.type || "publish",
    shop: row.shop,
    account: row.account || "default",
    payload
  };
}

/** The publish payload for one shop, from the enqueue body's listing block
 *  (web save) or from a listings-table row (feed backfill). Field names
 *  match the PublishPayload block of the WIRE CONTRACT. */
export function payloadFromBody(listing_id, l) {
  l = l && typeof l === "object" ? l : {};
  const photos = Array.isArray(l.photos) ? l.photos.filter((p) => typeof p === "string").slice(0, 12)
    : (typeof l.photo_url === "string" && l.photo_url ? [l.photo_url] : []);
  return {
    listing_id: listing_id == null ? undefined : int(listing_id),
    title: str(l.title) || "",
    description: str(l.description) || "",
    price: Number.isFinite(Number(l.price)) ? Number(l.price) : 0,
    brand: str(l.brand) || undefined,
    size: str(l.size) || undefined,
    category: str(l.category) || undefined,
    condition: str(l.condition) || undefined,
    color: str(l.color) || undefined,
    material: str(l.material) || undefined,
    weight_oz: Number.isFinite(Number(l.weight_oz)) ? Number(l.weight_oz) : undefined,
    local_pickup: l.local_pickup === true || l.local_pickup === 1 ? true : undefined,
    ship_city: str(l.ship_city) || undefined,
    ship_postcode: str(l.ship_postcode) || undefined,
    ship_country: str(l.ship_country) || undefined,
    photos
  };
}

/** Shops the user's PAIRED browsers last reported as live sessions.
 *  Unpaired browsers' heartbeats are invisible here on purpose: an
 *  unlinked browser could belong to anyone, and auto-post must only ever
 *  target a shop the account owner's own extension verified. */
async function connectedShops(env, userId) {
  const rows = await env.DB.prepare(
    `SELECT DISTINCT s.shop AS shop FROM x_shop_sessions s
       JOIN x_device_pairs d ON d.install_id = s.install_id
      WHERE d.user_id = ? AND s.connected = 1`
  ).bind(int(userId)).all();
  return (rows && rows.results ? rows.results : []).map((r) => str(r.shop)).filter(Boolean);
}

/** Idempotent enqueue: one row per (user, item, shop, type).
 *  ON CONFLICT semantics (SQLite upsert with a WHERE on the update):
 *    - queued / running / posted -> untouched (returns changes=0: no double post)
 *    - failed / capped / delisted -> requeued (a retry is a real second chance)
 *  item_id null (no listing key) can never hit the unique index — such jobs
 *  are plain inserts; the web always sends a listing_id, so this is only a
 *  belt-and-braces path. Returns the number of jobs actually created. */
async function enqueueJobs(env, { userId, itemId, shop, account, type, payload, source }) {
  const r = await env.DB.prepare(
    `INSERT INTO x_jobs (user_id, item_id, shop, account, type, status, payload, source)
     VALUES (?,?,?,?,?, 'queued', ?, ?)
     ON CONFLICT(user_id, item_id, shop, type) DO UPDATE SET
       status='queued', payload=excluded.payload, updated_at=CURRENT_TIMESTAMP
     WHERE x_jobs.status IN ('failed','capped','delisted')`
  ).bind(
    int(userId), itemId == null ? null : int(itemId), str(shop) || "unknown",
    str(account) || "default", str(type) || "publish",
    JSON.stringify(payload || {}), str(source) || null
  ).run();
  return int(r && r.meta && r.meta.changes, 0);
}

/* ── route handlers ─────────────────────────────────────────────────────── */

/** device id from the request: header first (the wire), body fallback (the
 *  web sends install_id in JSON for the same routes). */
function installIdOf(request, body) {
  return str(request.headers.get("X-Install-Id")) || (body && str(body.install_id));
}

async function deviceUser(env, installId) {
  if (!installId) return null;
  const row = await env.DB.prepare("SELECT user_id FROM x_device_pairs WHERE install_id = ?")
    .bind(installId).first();
  return row ? int(row.user_id) : null;
}

export async function handleJobs(path, method, request, env, h) {
  const { json, err, readJson, requireUser, rateLimit } = h;
  try {
    await ensureXTables(env);
  } catch (e) {
    return json({ ok: false, error: "schema_unavailable" }, 503);
  }

  /* ── GET /api/jobs?status=queued ── extension pull ──────────────────── */
  if (path.startsWith("/api/jobs") && method === "GET") {
    const body = null;
    const installId = installIdOf(request, body);
    const userId = await deviceUser(env, installId);
    if (!userId) {
      // Honest empty, never 401/404: the poll gate treats those as "route
      // missing" and backs off for hours. Unpaired is a normal state.
      return json({ ok: true, paired: false, jobs: [] });
    }
    // Recovery: a browser that died mid-job must not strand the listing —
    // a running job whose claim is older than the lease goes back to queued.
    await env.DB.prepare(
      `UPDATE x_jobs SET status='queued', updated_at=CURRENT_TIMESTAMP
        WHERE user_id = ? AND status = 'running'
          AND updated_at < datetime('now', ?)`
    ).bind(userId, `-${Math.round(RUNNING_LEASE_MS / 60000)} minutes`).run();

    const sel = await env.DB.prepare(
      "SELECT * FROM x_jobs WHERE user_id = ? AND status = 'queued' ORDER BY created_at ASC LIMIT 25"
    ).bind(userId).all();
    const rows = (sel && sel.results ? sel.results : []);
    if (!rows.length) return json({ ok: true, paired: true, jobs: [] });
    const ids = rows.map((r) => int(r.id));
    const marks = ids.map(() => "?").join(",");
    // Claim before answering: the device that reads a job owns it (until the
    // lease expires). Adopt-on-read also keys listing_id chips to the browser
    // that actually ran the post.
    await env.DB.prepare(
      `UPDATE x_jobs SET status='running', install_id=?, updated_at=CURRENT_TIMESTAMP
        WHERE id IN (${marks}) AND status = 'queued'`
    ).bind(installId, ...ids).run();
    return json({ ok: true, paired: true, jobs: rows.map(wireJob) });
  }

  /* ── POST /api/jobs/{id}/status ── extension result report ──────────── */
  if (/^\/api\/jobs\/\d+\/status$/.test(path) && method === "POST") {
    const body = await readJson(request);
    const id = int(path.split("/")[3]);
    const installId = installIdOf(request, body);
    const status = str(body.status);
    const ALLOWED = { posted: 1, failed: 1, delisted: 1, capped: 1, signup_prefilled: 1 };
    if (!id || !ALLOWED[status]) return err("job id + status posted|failed|delisted|capped|signup_prefilled required");
    const job = await env.DB.prepare("SELECT id, user_id, status, install_id FROM x_jobs WHERE id = ?").bind(id).first();
    // 200 even when unknown/foreign: the extension persists a failed report
    // and retries it forever on 5xx. A report we cannot place is logged and
    // dropped, not bounced.
    if (!job) return json({ ok: true, accepted: false, reason: "unknown_job" });
    if (["posted", "failed", "delisted"].includes(job.status))
      return json({ ok: true, accepted: false, reason: "already_" + job.status });
    // The runner claims the job on first report (a job queued before pairing
    // can be run by whichever paired browser picks it up).
    const owner = str(job.install_id) || installId;
    const needsReview = body.needs_review === true && (status === "failed") ? 1 : 0;
    await env.DB.prepare(
      `UPDATE x_jobs SET status=?, listing_url=?, error=?, needs_review=?, hint=?,
         attempts=?, install_id=?, updated_at=CURRENT_TIMESTAMP
       WHERE id = ? AND status IN ('queued','running')`
    ).bind(
      status, str(body.listing_url), str(body.error) ? String(body.error).slice(0, 500) : null,
      needsReview, str(body.hint) ? String(body.hint).slice(0, 300) : null,
      int(body.attempts, 1), owner, id
    ).run();
    return json({ ok: true, accepted: true });
  }

  /* ── POST /api/jobs/enqueue ── web: auto on every save ──────────────── */
  if (path === "/api/jobs/enqueue" && method === "POST") {
    const body = await readJson(request);
    const me = await requireUser(request, env);
    if (!me && env.SERVICE_TOKEN && request.headers.get("X-Service-Token") === env.SERVICE_TOKEN) {
      // server-to-server caller; user id rides in the body
      body.__service = true;
    }
    const userId = me ? int(me.sub) : (body.__service ? int(body.user_id) : 0);
    if (!userId) return err("Sign in to enqueue.", 401);
    const listingId = body.listing_id == null ? null : int(body.listing_id);
    const listing = body.listing && typeof body.listing === "object" ? body.listing : {};
    let shops = Array.isArray(body.shops) ? body.shops.map((s) => str(s)).filter(Boolean).slice(0, SHOPS_MAX) : [];
    if (!shops.length) shops = await connectedShops(env, userId);
    if (!shops.length) return json({ ok: true, queued: 0, shops: [], note: "no_connected_shops" });
    const payload = payloadFromBody(listingId, listing);
    if (!payload.title && !payload.description) return err("listing.title or listing.description required");
    let queued = 0;
    for (const shop of shops) queued += await enqueueJobs(env, {
      userId, itemId: listingId, shop, type: "publish", payload, source: str(body.source) || "web-save"
    });
    return json({ ok: true, queued, shops });
  }

  /* ── POST /api/jobs/feed ── web: "Post all existing items" backfill ─── */
  if (path === "/api/jobs/feed" && method === "POST") {
    const body = await readJson(request);
    const me = await requireUser(request, env);
    if (!me) return err("Sign in.", 401);
    const userId = int(me.sub);
    const shops = await connectedShops(env, userId);
    if (!shops.length) return json({ ok: true, queued: 0, note: "no_connected_shops" });
    let rows;
    if (Array.isArray(body.listing_ids) && body.listing_ids.length) {
      const ids = body.listing_ids.map((i) => int(i)).filter(Boolean).slice(0, FEED_MAX_LISTINGS);
      if (!ids.length) return err("listing_ids must contain positive integers");
      const marks = ids.map(() => "?").join(",");
      rows = (await env.DB.prepare(
        `SELECT id, title, description, price, size, condition, category, photo_url,
                brand, color, material, weight_oz, local_pickup, ship_city, ship_postcode, ship_country
           FROM listings WHERE user_id = ? AND id IN (${marks})`
      ).bind(userId, ...ids).all()).results || [];
    } else {
      rows = (await env.DB.prepare(
        `SELECT id, title, description, price, size, condition, category, photo_url,
                brand, color, material, weight_oz, local_pickup, ship_city, ship_postcode, ship_country
           FROM listings WHERE user_id = ? AND status = 'active' ORDER BY id DESC LIMIT ?`
      ).bind(userId, FEED_MAX_LISTINGS).all()).results || [];
    }
    let queued = 0;
    for (const l of rows) {
      const payload = payloadFromBody(l.id, l);
      for (const shop of shops) queued += await enqueueJobs(env, {
        userId, itemId: l.id, shop, type: "publish", payload, source: "feed"
      });
    }
    return json({ ok: true, queued, listings: rows.length, shops });
  }

  /* ── POST /api/sessions ── extension heartbeat + web master switch ──── */
  if (path === "/api/sessions" && method === "POST") {
    const body = await readJson(request);
    const installId = installIdOf(request, body);
    const source = str(body.source) || "unknown";
    const probedAt = str(body.probed_at) || new Date().toISOString();
    const pairs = sessionPairs(body);
    for (const [shop, connected] of pairs) {
      await env.DB.prepare(
        `INSERT INTO x_shop_sessions (install_id, shop, connected, source, probed_at)
         VALUES (?,?,?,?,?)
         ON CONFLICT(install_id, shop) DO UPDATE SET
           connected=excluded.connected, source=excluded.source, probed_at=excluded.probed_at`
      ).bind(installId || "anonymous", shop, connected, source, probedAt).run();
    }
    // The web's master switch ("Auto-post new items") persists ONLY for a
    // paired browser — an anonymous caller cannot flip anyone's switch.
    let paired = false;
    if (body.auto_post !== undefined) {
      const userId = await deviceUser(env, installId);
      if (userId) {
        await env.DB.prepare("UPDATE x_device_pairs SET auto_post = ? WHERE install_id = ?")
          .bind(body.auto_post ? 1 : 0, installId).run();
        paired = true;
      }
    }
    return json({ ok: true, stored: pairs.length, paired });
  }

  /* ── GET /api/sessions/list ── web: which browsers are waiting ──────── */
  if (path === "/api/sessions/list" && method === "GET") {
    const me = await requireUser(request, env);
    if (!me) return err("Sign in.", 401);
    const rows = await env.DB.prepare(
      `SELECT s.install_id AS install_id, MAX(s.probed_at) AS probed_at,
              group_concat(DISTINCT s.source) AS source
         FROM x_shop_sessions s
        WHERE s.install_id NOT IN (SELECT install_id FROM x_device_pairs)
          AND s.install_id <> 'anonymous'
        GROUP BY s.install_id
        ORDER BY probed_at DESC LIMIT 20`
    ).all();
    return json({ ok: true, devices: (rows && rows.results) || [] });
  }

  /* ── GET /api/devices/code ── web: 6-char single-use pairing code ───── */
  if (path === "/api/devices/code" && method === "GET") {
    const me = await requireUser(request, env);
    if (!me) return err("Sign in.", 401);
    if (!(await rateLimit(env, request, "device-code", 10, 600))) return err("Too many codes", 429);
    const code = makePairCode();
    await env.DB.prepare(
      "INSERT INTO x_device_codes (code, user_id, expires_at) VALUES (?,?,?)"
    ).bind(code, int(me.sub), Date.now() + CODE_TTL_MS).run();
    return json({ ok: true, code, expires_in: Math.round(CODE_TTL_MS / 1000) });
  }

  /* ── POST /api/devices/pair ── web: link browser to account ─────────── */
  if (path === "/api/devices/pair" && method === "POST") {
    const body = await readJson(request);
    const me = await requireUser(request, env);
    if (!me) return err("Sign in.", 401);
    const installId = str(body.install_id);
    if (!installId) return err("install_id required");
    // Pairing by install_id (the web listed it from /api/sessions/list and the
    // owner tapped "Pair"). A code, when present, must be the caller's own
    // live single-use code — the pair-code path exists so a future extension
    // popup can pair without listing, but it never bypasses the user auth.
    if (body.code != null) {
      const c = await env.DB.prepare("SELECT user_id, expires_at, used FROM x_device_codes WHERE code = ?")
        .bind(str(body.code)).first();
      if (!c || c.used || int(c.expires_at) < Date.now() || int(c.user_id) !== int(me.sub))
        return err("code invalid or expired", 400);
      await env.DB.prepare("UPDATE x_device_codes SET used = 1 WHERE code = ?").bind(str(body.code)).run();
    }
    await env.DB.prepare(
      `INSERT INTO x_device_pairs (install_id, user_id) VALUES (?,?)
       ON CONFLICT(install_id) DO UPDATE SET user_id=excluded.user_id`
    ).bind(installId, int(me.sub)).run();
    return json({ ok: true, paired: true });
  }

  /* ── POST /api/sales, /api/delist, /api/sales/delist-log ── accept+store */
  if ((path === "/api/sales" || path === "/api/delist" || path === "/api/sales/delist-log") && method === "POST") {
    const body = await readJson(request);
    const installId = installIdOf(request, body);
    await env.DB.prepare(
      "INSERT INTO x_sales_events (install_id, shop, event, body) VALUES (?,?,?,?)"
    ).bind(
      installId, str(body.shop) || str(body.marketplace),
      str(body.event) || str(body.type) || str(body.status) || "event",
      JSON.stringify(body).slice(0, 4000)
    ).run();
    return json({ ok: true, stored: true });
  }

  return null; // not our route
}
