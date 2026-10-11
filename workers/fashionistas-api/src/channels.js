// Fashionistas — real marketplace posting channels.
//
// WHY THIS FILE EXISTS, AND WHY IT IS SEPARATE FROM index.js
//
// The old story was "we have not built eBay": every /api/ebay/* route answered
// 501 and told the seller to copy the kit and paste it by hand. That was true,
// and it was also the whole reason the product's central claim was false.
//
// These are the official seller APIs — the same ones List Perfectly and
// Crosslist cannot use either, because they are not published by the
// marketplaces to everyone. Three shops are genuinely reachable today:
//
//   eBay     Sell Inventory API       free, self-serve keys, no review queue
//   Etsy     Open API v3              Seller App approved in minutes
//   Whatnot  Seller API (GraphQL)     open developer preview
//
// Everything else on the "eleven shops" list has no public posting API at all
// (Poshmark, Mercari, Grailed, Facebook) or is gated behind volume or an
// allowlist (Vinted, Vestiaire), and Kidizen shut down. Those keep using the
// browser extension, which fills the form and lets the seller press the button
// — which is the only method those sites permit, and the reason
// `SUBMITTED = false` in apps/extension/fill.js stays exactly where it is.
//
// NOTHING HERE AUTOMATES A HUMAN'S CLICK. A listing reaching eBay or Etsy
// goes there because that marketplace's own documented API accepted it, from a
// token the seller granted on that marketplace's own consent screen.
//
// CREDENTIALS. Every key is read from an environment variable. With none set
// the channel still exists and still answers — it just reports configured:false
// and says what to paste where. Deploying this file cannot break the site, and
// nobody has to hand us a secret before the UI can render.

/* ──────────────────────────────────────────────────────────────────────────
   The three channels.
   ────────────────────────────────────────────────────────────────────────── */

const EBAY_INV = "https://api.ebay.com";
const EBAY_SANDBOX = "https://api.sandbox.ebay.com";
const ETSY_API = "https://api.etsy.com/v3/application";
const WHATNOT_API = "https://api.whatnot.com/seller-api";

export const CHANNELS = {
  ebay: {
    id: "ebay",
    name: "eBay",
    blurb: "Ships to 190+ countries. Biggest audience of the three.",
    env: ["EBAY_CLIENT_ID", "EBAY_CLIENT_SECRET", "EBAY_RUNAME"],
    need: "developer.ebay.com → Application Keys → Production. Paste App ID, Cert ID and the RuName.",
    // eBay names the redirect by a registered handle ("RuName"), not a URL.
    runameEnv: "EBAY_RUNAME",
    host: (env, live) => (live ? EBAY_INV : EBAY_SANDBOX),
    scopes: [
      "https://api.ebay.com/oauth/api_scope/sell.inventory",
      "https://api.ebay.com/oauth/api_scope/sell.account",
    ].join(" "),
  },
  etsy: {
    id: "etsy",
    name: "Etsy",
    blurb: "Buyers searching for handmade, vintage and secondhand clothes.",
    env: ["ETSY_KEYSTRING", "ETSY_SHARED_SECRET"],
    need: "etsy.com/developers → create a Seller App. Paste the Keystring and Shared Secret.",
    // Etsy uses PKCE (S256) on every authorization flow. Required, not optional.
    pkce: true,
    scopes: "listings_r listings_w shops_r",
  },
  whatnot: {
    id: "whatnot",
    name: "Whatnot",
    blurb: "Live-sale and drop crowd. Good for streetwear and collectibles.",
    env: ["WHATNOT_CLIENT_ID", "WHATNOT_CLIENT_SECRET"],
    need: "developers.whatnot.com → request a Seller API secret. Paste the Client ID and Secret.",
    host: (env, live) => (live ? WHATNOT_API : "https://api.stage.whatnot.com"),
    scopes: "read:inventory write:inventory",
  },
};

export const CHANNEL_IDS = Object.keys(CHANNELS);

/* ──────────────────────────────────────────────────────────────────────────
   Is this channel configured? Never leaks a value — only which names are set.
   ────────────────────────────────────────────────────────────────────────── */

export function channelConfigured(env, id) {
  const c = CHANNELS[id];
  if (!c) return false;
  return c.env.every((k) => !!env[k]);
}

/* ──────────────────────────────────────────────────────────────────────────
   WHO OWNS THE KEYS — and why the answer is the seller, not us.

   The first draft read every credential out of a Worker secret, which meant
   the whole feature waited on ONE person handing me an App ID and a Cert ID.
   That is also just wrong about what these credentials are: an eBay App ID
   identifies a developer application, and an application belongs to an eBay
   account. Only the person who owns the shop can register one — there is no
   way for a third party to obtain it honestly, and the lane1 docs said so
   before this file existed ("we do not create eBay seller or developer
   accounts for you").

   So the keys are the SELLER's, pasted once on /connect/, stored against
   their own account. The server env vars still work and still take priority —
   an operator wiring up one shop for the whole site is a legitimate thing to
   do — but nothing blocks on it. Nobody has to wait for anybody.

   The values never leave this server: no route returns them, and they are
   read only when a token has to be exchanged.
   ────────────────────────────────────────────────────────────────────────── */

// Which stored column backs which env-style name, per marketplace.
const KEY_FIELDS = {
  ebay:    { client_id: "EBAY_CLIENT_ID", client_secret: "EBAY_CLIENT_SECRET", runame: "EBAY_RUNAME" },
  etsy:    { keystring: "ETSY_KEYSTRING", shared_secret: "ETSY_SHARED_SECRET" },
  whatnot: { client_id: "WHATNOT_CLIENT_ID", client_secret: "WHATNOT_CLIENT_SECRET" },
};

export async function ensureChannelKeys(env) {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS channel_keys (
       user_id       INTEGER NOT NULL,
       marketplace   TEXT NOT NULL,
       client_id     TEXT,
       client_secret TEXT,
       runame        TEXT,
       keystring     TEXT,
       shared_secret TEXT,
       updated_at    TEXT DEFAULT (datetime('now')),
       PRIMARY KEY (user_id, marketplace)
     )`
  ).run();
}

export async function saveChannelKeys(env, userId, marketplace, k) {
  await ensureChannelKeys(env);
  await env.DB.prepare(
    `INSERT INTO channel_keys (user_id, marketplace, client_id, client_secret, runame, keystring, shared_secret, updated_at)
     VALUES (?,?,?,?,?,?,?,datetime('now'))
     ON CONFLICT(user_id, marketplace) DO UPDATE SET
       client_id=excluded.client_id, client_secret=excluded.client_secret,
       runame=excluded.runame, keystring=excluded.keystring,
       shared_secret=excluded.shared_secret, updated_at=excluded.updated_at`
  ).bind(
    userId, marketplace,
    k.client_id || null, k.client_secret || null, k.runame || null,
    k.keystring || null, k.shared_secret || null
  ).run();
}

export async function getChannelKeys(env, userId, marketplace) {
  await ensureChannelKeys(env);
  return env.DB.prepare("SELECT * FROM channel_keys WHERE user_id=? AND marketplace=?")
    .bind(userId, marketplace).first();
}

// Does THIS SELLER have working keys — theirs or the site's?
export async function channelReady(env, userId, marketplace) {
  const c = CHANNELS[marketplace];
  if (!c) return false;
  if (c.env.every((k) => !!env[k])) return true;
  const row = userId ? await getChannelKeys(env, userId, marketplace) : null;
  if (!row) return false;
  // Etsy is one string pair, the other two are id+secret (+ RuName for eBay).
  return marketplace === "etsy" ? !!(row.keystring && row.shared_secret) : !!(row.client_id && row.client_secret);
}

// The env-shaped view of a marketplace's credentials for this seller. Server
// env wins; the seller's own keys fill whatever is missing.
export async function credsFor(env, userId, marketplace) {
  const out = { ...env };
  const fields = KEY_FIELDS[marketplace] || {};
  const row = userId ? await getChannelKeys(env, userId, marketplace) : null;
  if (row) {
    for (const [col, name] of Object.entries(fields)) {
      if (row[col] && !out[name]) out[name] = row[col];
    }
  }
  return out;
}

/* ──────────────────────────────────────────────────────────────────────────
   OAuth state. Stateless and signed, so the callback needs no session and no
   server-side stash: the marketplace sends it back untouched and we read the
   user id, the channel and (for Etsy) the PKCE verifier out of it again.

   A separate key from the session HMAC on purpose — a token that authenticates
   a user must not also be a token that carries an OAuth redirect.
   ────────────────────────────────────────────────────────────────────────── */

const STATE_KEY = enc2b64("fashionistas-oauth-state-v1");
function enc2b64(s) {
  return Uint8Array.from([...s].map((c) => c.charCodeAt(0)));
}

async function hmac(keyBytes, msg) {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc2.encode(msg)));
}

const enc2 = new TextEncoder();

async function signState(payload) {
  const body = toB64uStr(JSON.stringify(payload));
  const sig = b64urlStr(await hmac(STATE_KEY, body));
  return body + "." + sig;
}

async function verifyState(state) {
  if (typeof state !== "string" || state.indexOf(".") < 0) return null;
  const i = state.lastIndexOf(".");
  const body = state.slice(0, i);
  const sig = state.slice(i + 1);
  const expect = b64urlStr(await hmac(STATE_KEY, body));
  if (sig.length !== expect.length) return null;
  // Constant-time: length already differs, but never short-circuit on content.
  let diff = 0;
  for (let k = 0; k < sig.length; k++) diff |= sig.charCodeAt(k) ^ expect.charCodeAt(k);
  if (diff !== 0) return null;
  try {
    return JSON.parse(fromB64uStr(body));
  } catch {
    return null;
  }
}

function toB64uStr(s) {
  return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64uStr(s) {
  return decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))));
}
function b64urlStr(u8) {
  return btoa(String.fromCharCode(...u8)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const randomHex = (n = 32) =>
  [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, "0")).join("");

/* ──────────────────────────────────────────────────────────────────────────
   PKCE (Etsy requires it on every flow).
   ────────────────────────────────────────────────────────────────────────── */

export async function makePkce() {
  const verifier = randomHex(32) + randomHex(32);
  const digest = await crypto.subtle.digest("SHA-256", enc2.encode(verifier));
  return { verifier, challenge: b64urlStr(new Uint8Array(digest)) };
}

/* ──────────────────────────────────────────────────────────────────────────
   The connections table, created the same lazy way every other table here is.
   ────────────────────────────────────────────────────────────────────────── */

export async function ensureChannelTables(env) {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS marketplace_connections (
       id           INTEGER PRIMARY KEY AUTOINCREMENT,
       user_id      INTEGER NOT NULL,
       marketplace  TEXT NOT NULL,
       access_token TEXT,
       refresh_token TEXT,
       expires_at   INTEGER,
       shop_id      TEXT,
       shop_name    TEXT,
       created_at   TEXT DEFAULT (datetime('now')),
       updated_at   TEXT DEFAULT (datetime('now')),
       UNIQUE(user_id, marketplace)
     )`
  ).run();
  // A receipt for every posting, so "where did that listing go?" has an answer
  // that does not depend on the seller remembering.
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS channel_posts (
       id          INTEGER PRIMARY KEY AUTOINCREMENT,
       user_id     INTEGER NOT NULL,
       listing_id  INTEGER,
       marketplace TEXT NOT NULL,
       remote_id   TEXT,
       url         TEXT,
       created_at  TEXT DEFAULT (datetime('now'))
     )`
  ).run();
}

export async function getConnection(env, userId, marketplace) {
  return env.DB.prepare(
    "SELECT * FROM marketplace_connections WHERE user_id=? AND marketplace=?"
  ).bind(userId, marketplace).first();
}

export async function listConnections(env, userId) {
  const r = await env.DB.prepare(
    "SELECT marketplace, shop_id, shop_name, expires_at, updated_at FROM marketplace_connections WHERE user_id=?"
  ).bind(userId).all();
  return r.results || [];
}

export async function saveConnection(env, userId, marketplace, tok, shop) {
  await ensureChannelTables(env);
  const now = Date.now();
  const expiresAt = tok.expires_in ? now + tok.expires_in * 1000 : null;
  await env.DB.prepare(
    `INSERT INTO marketplace_connections (user_id, marketplace, access_token, refresh_token, expires_at, shop_id, shop_name, updated_at)
     VALUES (?,?,?,?,?,?,?,?)
     ON CONFLICT(user_id, marketplace) DO UPDATE SET
       access_token=excluded.access_token,
       refresh_token=COALESCE(excluded.refresh_token, marketplace_connections.refresh_token),
       expires_at=excluded.expires_at,
       shop_id=COALESCE(excluded.shop_id, marketplace_connections.shop_id),
       shop_name=COALESCE(excluded.shop_name, marketplace_connections.shop_name),
       updated_at=excluded.updated_at`
  ).bind(
    userId, marketplace,
    tok.access_token || null,
    // Etsy rotates refresh tokens; some providers omit one when it is unchanged.
    tok.refresh_token || null,
    expiresAt,
    shop?.id || null,
    shop?.name || null
  ).run();
}

export async function disconnectChannel(env, userId, marketplace) {
  await ensureChannelTables(env);
  await env.DB.prepare("DELETE FROM marketplace_connections WHERE user_id=? AND marketplace=?")
    .bind(userId, marketplace).run();
}

/* ──────────────────────────────────────────────────────────────────────────
   The callback URL. One handler serves all three channels.
   ────────────────────────────────────────────────────────────────────────── */

export const CALLBACK_PATH = "/api/channels/callback";

export function callbackUrl(env, marketplace) {
  // Prefer the configured canonical host; fall back to the worker's own origin
  // so a local test never points at production by accident.
  const base = (env.SITE_ORIGIN || env.PUBLIC_ORIGIN || "").replace(/\/+$/, "");
  const origin = base || "https://fashionistas-api.fashionistas1979.workers.dev";
  return origin + CALLBACK_PATH + "?channel=" + encodeURIComponent(marketplace);
}

/* ──────────────────────────────────────────────────────────────────────────
   Step 1 — build the URL the seller opens. They approve on the marketplace's
   own page; we never see or ask for their marketplace password.
   ────────────────────────────────────────────────────────────────────────── */

export async function startAuth(env, userId, marketplace) {
  const c = CHANNELS[marketplace];
  if (!c) throw new Error("Unknown channel");
  // Ready means the SELLER has keys, not that the operator does.
  if (!(await channelReady(env, userId, marketplace))) {
    const e = new Error(c.name + " is not connected to this site yet.");
    e.code = "channel_not_configured";
    e.need = c.need;
    throw e;
  }

  const C = await credsFor(env, userId, marketplace);
  const redirect = callbackUrl(env, marketplace);
  const stateObj = { u: userId, c: marketplace, n: randomHex(8), i: Date.now() };
  let pkce = null;
  if (c.pkce) {
    pkce = await makePkce();
    stateObj.v = pkce.verifier;
  }
  const state = await signState(stateObj);

  const p = new URLSearchParams();
  if (marketplace === "ebay") {
    // eBay's redirect_uri is the registered RuName handle, not the URL itself.
    p.set("client_id", C.EBAY_CLIENT_ID);
    p.set("redirect_uri", C.EBAY_RUNAME);
    p.set("response_type", "code");
    p.set("state", state);
    p.set("scope", c.scopes);
    return { url: `${c.host(env, false)}/oauth2/authorize?` + p.toString(), redirect };
  }
  if (marketplace === "etsy") {
    p.set("response_type", "code");
    p.set("redirect_uri", redirect);
    p.set("scope", c.scopes);
    p.set("client_id", C.ETSY_KEYSTRING);
    p.set("state", state);
    p.set("code_challenge", pkce.challenge);
    p.set("code_challenge_method", "S256");
    return { url: `https://www.etsy.com/oauth/connect?` + p.toString(), redirect };
  }
  // Whatnot
  p.set("client_id", C.WHATNOT_CLIENT_ID);
  p.set("redirect_uri", redirect);
  p.set("response_type", "code");
  p.set("state", state);
  p.set("scope", c.scopes);
  return { url: `${c.host(env, false)}/rest/oauth/authorize?` + p.toString(), redirect };
}

/* ──────────────────────────────────────────────────────────────────────────
   Step 2 — the marketplace sends the seller back with a code. Exchange it.
   ────────────────────────────────────────────────────────────────────────── */

export async function finishAuth(env, marketplace, code, state) {
  const c = CHANNELS[marketplace];
  if (!c) throw new Error("Unknown channel");
  const payload = await verifyState(state);
  if (!payload || payload.c !== marketplace) {
    const e = new Error("That sign-in link expired or was not ours. Try again.");
    e.code = "bad_state";
    throw e;
  }
  // 15 minutes is plenty for a consent screen and short enough to be useless
  // if the link is lifted out of a browser history entry.
  if (Date.now() - (payload.i || 0) > 15 * 60000) {
    const e = new Error("That sign-in link expired. Try again.");
    e.code = "bad_state";
    throw e;
  }

  const C = await credsFor(env, payload.u, marketplace);
  const redirect = callbackUrl(env, marketplace);
  let tok;

  if (marketplace === "ebay") {
    const basic = btoa(`${C.EBAY_CLIENT_ID}:${C.EBAY_CLIENT_SECRET}`);
    const r = await fetch(`${c.host(env, false)}/identity/v1/oauth2/token`, {
      method: "POST",
      headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: C.EBAY_RUNAME,
      }).toString(),
    });
    tok = await readToken(r, c.name);
    // eBay expires access tokens in 2 hours; the refresh token runs ~18 months.
    tok.expires_in = tok.expires_in || 7200;
  } else if (marketplace === "etsy") {
    const r = await fetch(`${ETSY_API}/oauth/token`, {
      method: "POST",
      headers: { "x-api-key": C.ETSY_KEYSTRING, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: C.ETSY_KEYSTRING,
        redirect_uri: redirect,
        code,
        code_verifier: payload.v,
      }).toString(),
    });
    tok = await readToken(r, c.name);
    // Access token 1 hour, refresh token 90 days — see the refresh below.
    tok.expires_in = tok.expires_in || 3600;
  } else {
    const r = await fetch(`${c.host(env, false)}/rest/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: C.WHATNOT_CLIENT_ID,
        client_secret: C.WHATNOT_CLIENT_SECRET,
        redirect_uri: redirect,
        code,
      }).toString(),
    });
    tok = await readToken(r, c.name);
    tok.expires_in = tok.expires_in || 86400;
  }

  // Find the shop so the seller sees a name, not an id.
  let shop = null;
  try { shop = await lookupShop(env, payload.u, marketplace, tok.access_token); } catch { /* non-fatal */ }

  await saveConnection(env, payload.u, marketplace, tok, shop);
  return { userId: payload.u, marketplace, shop };
}

async function readToken(r, name) {
  let body = null;
  try { body = await r.json(); } catch { /* non-JSON error body */ }
  if (!r.ok) {
    const detail = body?.error_description || body?.error || body?.message || r.status;
    const e = new Error(`${name} refused the sign-in: ${detail}`);
    e.code = "token_exchange_failed";
    throw e;
  }
  if (!body?.access_token) {
    const e = new Error(`${name} returned no access token.`);
    e.code = "token_exchange_failed";
    throw e;
  }
  return body;
}

async function lookupShop(env, userId, marketplace, accessToken) {
  const C = await credsFor(env, userId, marketplace);
  if (marketplace === "etsy") {
    const r = await fetch(`${ETSY_API}/users/current/shops`, {
      headers: { Authorization: `Bearer ${accessToken}`, "x-api-key": `${C.ETSY_KEYSTRING}:${C.ETSY_SHARED_SECRET}` },
    });
    if (!r.ok) return null;
    const b = await r.json();
    const s = (b.results || [])[0];
    return s ? { id: String(s.shop_id), name: s.shop_name } : null;
  }
  if (marketplace === "whatnot") {
    const r = await fetch(`${WHATNOT_API}/graphql`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: "{ currentUser { username } }" }),
    });
    if (!r.ok) return null;
    const b = await r.json();
    return b?.data?.currentUser ? { id: String(b.data.currentUser.username), name: b.data.currentUser.username } : null;
  }
  return null;
}

/* ──────────────────────────────────────────────────────────────────────────
   Tokens expire. eBay's die every 2 hours, Etsy's every hour. A channel that
   silently stops working the afternoon a seller connects it is worse than one
   that was never built, so refresh is automatic and invisible.
   ────────────────────────────────────────────────────────────────────────── */

export async function freshToken(env, userId, marketplace) {
  await ensureChannelTables(env);
  const conn = await getConnection(env, userId, marketplace);
  if (!conn) { const e = new Error("not_connected"); e.code = "not_connected"; throw e; }

  const skew = 5 * 60000;
  if (conn.expires_at && Date.now() < conn.expires_at - skew) return { token: conn.access_token, conn };
  if (!conn.refresh_token) return { token: conn.access_token, conn };

  const c = CHANNELS[marketplace];
  const C = await credsFor(env, userId, marketplace);
  let tok;
  if (marketplace === "ebay") {
    const basic = btoa(`${C.EBAY_CLIENT_ID}:${C.EBAY_CLIENT_SECRET}`);
    const r = await fetch(`${c.host(env, false)}/identity/v1/oauth2/token`, {
      method: "POST",
      headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token", refresh_token: conn.refresh_token,
        scope: c.scopes,
      }).toString(),
    });
    tok = await readToken(r, c.name);
  } else if (marketplace === "etsy") {
    const r = await fetch(`${ETSY_API}/oauth/token`, {
      method: "POST",
      headers: { "x-api-key": C.ETSY_KEYSTRING, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: C.ETSY_KEYSTRING,
        refresh_token: conn.refresh_token,
      }).toString(),
    });
    tok = await readToken(r, c.name);
  } else {
    const r = await fetch(`${c.host(env, false)}/rest/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: C.WHATNOT_CLIENT_ID,
        client_secret: C.WHATNOT_CLIENT_SECRET,
        refresh_token: conn.refresh_token,
      }).toString(),
    });
    tok = await readToken(r, c.name);
  }

  await saveConnection(env, userId, marketplace, tok, {
    id: conn.shop_id, name: conn.shop_name,
  });
  return { token: tok.access_token, conn };
}

/* ──────────────────────────────────────────────────────────────────────────
   Step 3 — the actual listing.
   ────────────────────────────────────────────────────────────────────────── */

export async function postListing(env, userId, marketplace, listing) {
  if (marketplace === "ebay") return postEbay(env, userId, listing);
  if (marketplace === "etsy") return postEtsy(env, userId, listing);
  if (marketplace === "whatnot") return postWhatnot(env, userId, listing);
  throw new Error("Unknown channel");
}

/* ──────────────────────────────────────────────────────────────────────────
   eBay — four calls, in this order, because the API is built that way:
     1. business policies (shipping / payment / returns) — one-time, reused
     2. inventory item  — the product itself
     3. offer            — price, quantity, format, policies
     4. publish offer    — the moment it becomes a live listing
   ────────────────────────────────────────────────────────────────────────── */

async function postEbay(env, userId, L) {
  const { token, conn } = await freshToken(env, userId, "ebay");
  const live = (env.EBAY_ENV || "production") === "production";
  const api = CHANNELS.ebay.host(env, live);
  const H = (extra = {}) => ({
    Authorization: `Bearer ${token}`,
    "Content-Language": "en-US",
    "Content-Type": "application/json",
    ...extra,
  });
  const marketId = "EBAY_US";

  const policies = await ensureEbayPolicies(env, api, H, marketId);

  // A SKU is the join key for the whole eBay inventory model. It has to be
  // stable or every re-post creates a second product instead of updating one.
  const sku = "FS-" + (L.id || "X") + "-" + userId;
  const images = (L.images || (L.photo_url ? [L.photo_url] : [])).filter(Boolean).slice(0, 24);

  const inv = await fetch(`${api}/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`, {
    method: "PUT",
    headers: H({ "Content-Language": "en-US" }),
    body: JSON.stringify({
      condition: mapCondition(L.condition),
      product: {
        title: (L.title || "").slice(0, 80),
        description: (L.description || L.title || "").slice(0, 4000),
        // eBay takes plain HTTPS image URLs — and the Worker already serves
        // every uploaded photo as one. No separate picture-hosting step.
        imageUrls: images,
        brand: L.brand || undefined,
      },
      availability: { shipToLocationAvailability: { quantity: Math.max(1, L.quantity || 1) } },
    }),
  });
  const invBody = await safeJson(inv);
  if (!inv.ok) throw ebayErr("eBay rejected the item details", inv.status, invBody);

  const categoryId = await ebayCategory(api, H, L);
  const price = Number(L.price || 0);
  if (!(price > 0)) throw new Error("This listing needs a price before it can go to eBay.");

  const offer = await fetch(`${api}/sell/inventory/v1/offer`, {
    method: "POST",
    headers: H(),
    body: JSON.stringify({
      sku,
      marketplaceId: marketId,
      format: "FIXED_PRICE",
      availableQuantity: Math.max(1, L.quantity || 1),
      categoryId,
      listingDescription: (L.description || L.title || "").slice(0, 4000),
      listingPolicies: {
        fulfillmentPolicyId: policies.fulfillment,
        paymentPolicyId: policies.payment,
        returnPolicyId: policies.return,
      },
      pricingSummary: { price: { value: price.toFixed(2), currency: "USD" } },
    }),
  });
  const offerBody = await safeJson(offer);
  if (!offer.ok) throw ebayErr("eBay rejected the offer", offer.status, offerBody);
  const offerId = offerBody.offerId;
  if (!offerId) throw new Error("eBay did not return an offer id.");

  const pub = await fetch(`${api}/sell/inventory/v1/publish_offer`, {
    method: "POST",
    headers: H(),
    body: JSON.stringify({ offerId }),
  });
  const pubBody = await safeJson(pub);
  if (!pub.ok) throw ebayErr("eBay refused to publish the listing", pub.status, pubBody);

  const listingId = pubBody.listingId || pubBody.offerId;
  return {
    ok: true,
    marketplace: "ebay",
    listingId,
    url: listingId ? `https://www.ebay.com/itm/${listingId}` : null,
    note: conn.shop_name ? `Live on ${conn.shop_name}'s eBay.` : "Live on eBay.",
  };
}

async function ensureEbayPolicies(env, api, H, marketId) {
  const one = async (kind) => {
    const r = await fetch(`${api}/sell/account/v1/${kind}_policy?marketplace_id=${marketId}`, { headers: H() });
    const b = await safeJson(r);
    if (r.ok) {
      const rows = b[`${kind}_policies`] || b[`${kind}Policies`] || [];
      if (rows.length) return rows[0][`${kind}PolicyId`] || rows[0][`${kind}PolicyID`];
    }
    // No policies yet — the seller has never configured shipping on eBay, so
    // make sane defaults once. eBay refuses to publish without them.
    const body =
      kind === "fulfillment" ? {
        name: "Fashionistas standard shipping",
        marketplaceId: marketId,
        shippingOptions: [{ optionType: "DOMESTIC", shippingServiceCode: "FEDEX_GROUND", freeShipping: true }],
      } : kind === "payment" ? {
        name: "Fashionistas standard payment",
        marketplaceId: marketId,
        paymentMethods: [{ paymentMethodType: "CREDIT_CARD" }],
        immediatePayRequired: false,
      } : {
        name: "Fashionistas standard returns",
        marketplaceId: marketId,
        returnsAccepted: true,
        returnPeriod: { unit: "DAY", value: 30 },
        shippingCostPaidBy: "BUYER",
      };
    const c = await fetch(`${api}/sell/account/v1/${kind}_policy`, {
      method: "POST", headers: H(), body: JSON.stringify(body),
    });
    const cb = await safeJson(c);
    if (!c.ok) throw ebayErr(`eBay could not set up ${kind} terms`, c.status, cb);
    return cb[`${kind}PolicyId`] || cb[`${kind}PolicyID`];
  };
  return {
    fulfillment: await one("fulfillment"),
    payment: await one("payment"),
    return: await one("return"),
  };
}

async function ebayCategory(api, H, L) {
  const q = [L.brand, L.title].filter(Boolean).join(" ").slice(0, 80);
  try {
    const r = await fetch(
      `${api}/sell/taxonomy/v1/category_tree/0/category_suggestions?${new URLSearchParams({ query: q })}`,
      { headers: H() }
    );
    const b = await safeJson(r);
    const s = b.categorySuggestions?.[0]?.category;
    if (s?.categoryId) return s.categoryId;
  } catch { /* fall through to the default */ }
  // Clothing, Shoes & Accessories > Women's Clothing — the safe default for a
  // fashion resale listing when the title gave us nothing to match on.
  return "11450";
}

function mapCondition(c) {
  const s = String(c || "").toLowerCase();
  if (/new|nwt|tags/.test(s)) return "NEW";
  if (/excellent|like new/.test(s)) return "LIKE_NEW";
  if (/good|very good/.test(s)) return "USED_EXCELLENT";
  if (/fair|poor|worn/.test(s)) return "USED_GOOD";
  return "USED_GOOD";
}

function ebayErr(what, status, body) {
  const e = new Error(`${what} (${status})`);
  e.code = "marketplace_rejected";
  const errs = body?.errors || body?.error || [];
  const first = Array.isArray(errs) ? errs[0] : errs;
  e.detail = first?.longMessage || first?.message || first?.error_description || null;
  return e;
}

/* ──────────────────────────────────────────────────────────────────────────
   Etsy — draft, then images, then activate. A listing cannot go active without
   at least one image, so the order is load-bearing.
   ────────────────────────────────────────────────────────────────────────── */

async function postEtsy(env, userId, L) {
  const { token } = await freshToken(env, userId, "etsy");
  const C = await credsFor(env, userId, "etsy");
  const key = `${C.ETSY_KEYSTRING}:${C.ETSY_SHARED_SECRET}`;
  const H = (extra = {}) => ({ Authorization: `Bearer ${token}`, "x-api-key": key, ...extra });
  const get = async (p) => {
    const r = await fetch(`${ETSY_API}${p}`, { headers: H() });
    return { ok: r.ok, body: await safeJson(r), status: r.status };
  };

  const shops = await get("/users/current/shops");
  if (!shops.ok || !shops.body?.results?.[0]) throw new Error("We couldn't find the Etsy shop on this account.");
  const shopId = shops.body.results[0].shop_id;

  const profiles = await get(`/shops/${shopId}/shipping-profiles`);
  const shippingProfileId = profiles.body?.results?.[0]?.shipping_profile_id;
  if (!shippingProfileId) throw new Error("Etsy needs a shipping profile before a listing can exist. Set one up in your shop first.");

  // Etsy refuses a listing without a processing profile too.
  const readiness = await get(`/shops/${shopId}/readiness-state-definitions`);
  const readinessStateId = readiness.body?.results?.[0]?.readiness_state_id;

  const price = Number(L.price || 0);
  if (!(price > 0)) throw new Error("This listing needs a price before it can go to Etsy.");

  const draft = await fetch(`${ETSY_API}/shops/${shopId}/listings`, {
    method: "POST",
    headers: { ...H(), "Content-Type": "application/json" },
    body: JSON.stringify({
      quantity: Math.max(1, L.quantity || 1),
      title: (L.title || "").slice(0, 140),
      description: (L.description || L.title || "").slice(0, 4000),
      price: price.toFixed(2),
      who_made: "someone_else",
      when_made: "2020_2025",
      taxonomy_id: L.etsy_taxonomy_id || 2078,
      shipping_profile_id: shippingProfileId,
      ...(readinessStateId ? { readiness_state_id: readinessStateId } : {}),
      state: "draft",
      should_auto_renew: false,
    }),
  });
  const draftBody = await safeJson(draft);
  if (!draft.ok) throw etsyErr("Etsy rejected the listing", draft.status, draftBody);
  const listingId = draftBody.listing_id;

  // Images: Etsy wants the bytes, not a URL — so stream them from where the
  // Worker already stores them straight through to Etsy.
  const images = (L.images || (L.photo_url ? [L.photo_url] : [])).filter(Boolean).slice(0, 10);
  let uploaded = 0;
  for (let i = 0; i < images.length; i++) {
    const ok = await etsyUploadImage(env, shopId, listingId, images[i], i + 1, H, L.title);
    if (ok) uploaded++;
  }
  if (!uploaded) throw new Error("Etsy needs at least one photo on the listing.");

  // Now it can go live.
  const act = await fetch(`${ETSY_API}/shops/${shopId}/listings/${listingId}`, {
    method: "PATCH",
    headers: { ...H(), "Content-Type": "application/json" },
    body: JSON.stringify({ state: "active" }),
  });
  const actBody = await safeJson(act);
  if (!act.ok) {
    // Leave it as a draft rather than failing the whole post — the seller can
    // press Publish themselves and loses nothing.
    return {
      ok: true, marketplace: "etsy", listingId, uploaded,
      url: `https://www.etsy.com/listing/${listingId}`,
      note: `Saved as a draft on Etsy with ${uploaded} photo${uploaded === 1 ? "" : "s"} — press Publish there to make it live.`,
      draft: true,
    };
  }

  return {
    ok: true, marketplace: "etsy", listingId, uploaded,
    url: actBody?.listing?.url || `https://www.etsy.com/listing/${listingId}`,
    note: `Live on Etsy with ${uploaded} photo${uploaded === 1 ? "" : "s"}.`,
  };
}

async function etsyUploadImage(env, shopId, listingId, url, rank, H, altText) {
  try {
    const img = await fetch(url);
    if (!img.ok) return false;
    const type = (img.headers.get("content-type") || "image/jpeg").split(";")[0];
    const bytes = new Uint8Array(await img.arrayBuffer());
    if (!bytes.length) return false;
    const fd = new FormData();
    fd.append("image", new Blob([bytes], { type }), `photo-${rank}.jpg`);
    fd.append("rank", String(rank));
    if (altText) fd.append("alt_text", String(altText).slice(0, 500));
    const r = await fetch(`${ETSY_API}/shops/${shopId}/listings/${listingId}/images`, {
      method: "POST",
      headers: H(),
      body: fd,
    });
    return r.ok;
  } catch {
    return false;
  }
}

function etsyErr(what, status, body) {
  const e = new Error(`${what} (${status})`);
  e.code = "marketplace_rejected";
  const errs = body?.error;
  e.detail = Array.isArray(errs) ? errs.map((x) => x.message).filter(Boolean).join("; ") : (errs || null);
  return e;
}

/* ──────────────────────────────────────────────────────────────────────────
   Whatnot — GraphQL. Product → variant → listing → publish.
   ────────────────────────────────────────────────────────────────────────── */

async function postWhatnot(env, userId, L) {
  const { token } = await freshToken(env, userId, "whatnot");
  const live = (env.WHATNOT_ENV || "production") === "production";
  const api = CHANNELS.whatnot.host(env, live);
  const gql = async (query, variables) => {
    const r = await fetch(`${api}/graphql`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    const b = await safeJson(r);
    if (!r.ok || b?.errors?.length) {
      const e = new Error("Whatnot rejected the listing");
      e.code = "marketplace_rejected";
      e.detail = b?.errors?.[0]?.message || `HTTP ${r.status}`;
      throw e;
    }
    return b.data;
  };

  const images = (L.images || (L.photo_url ? [L.photo_url] : [])).filter(Boolean);
  const price = Number(L.price || 0);
  if (!(price > 0)) throw new Error("This listing needs a price before it can go to Whatnot.");

  const created = await gql(
    `mutation($input: ProductInput!) {
       productCreate(input: $input) { product { id title } }
     }`,
    {
      input: {
        title: (L.title || "").slice(0, 140),
        description: (L.description || L.title || "").slice(0, 2000),
        weight: 1,
        weightUnit: "lb",
        images: images.slice(0, 8),
      },
    }
  );
  const product = created?.productCreate?.product;
  if (!product?.id) throw new Error("Whatnot did not create a product.");

  const variant = await gql(
    `mutation($input: ProductVariantInput!) {
       productVariantCreate(input: $input) { productVariant { id } }
     }`,
    { input: { productId: product.id, price: price.toFixed(2), quantity: Math.max(1, L.quantity || 1) } }
  );
  const variantId = variant?.productVariantCreate?.productVariant?.id;
  if (!variantId) throw new Error("Whatnot did not create a variant.");

  const pub = await gql(
    `mutation($input: ListingInput!) { listingPublish(input: $input) { listing { id } } }`,
    { input: { productVariantId: variantId, published: true } }
  );
  const listingId = pub?.listingPublish?.listing?.id;

  return {
    ok: true, marketplace: "whatnot", listingId,
    url: null,
    note: "Live on Whatnot.",
  };
}

/* ──────────────────────────────────────────────────────────────────────────
   Small shared bits.
   ────────────────────────────────────────────────────────────────────────── */

async function safeJson(r) {
  try { return await r.json(); } catch { return null; }
}
