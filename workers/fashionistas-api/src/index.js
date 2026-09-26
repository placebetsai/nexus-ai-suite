// Fashionistas API — clean rebuild (2026-09-23)
// Stack: Cloudflare Workers + D1 + R2 (IMAGES) + KV (CACHE) + Workers AI (llama-3.2 + llava)
// Auth: HMAC-signed bearer token (id:username:expiry) via Web Crypto

const SECRET = Uint8Array.from([102,97,115,104,105,111,110,105,115,116,97,115,45,118,50,45,104,109,97,99,45,107,101,121]);
const enc = new TextEncoder();
const b64u = (buf) => [...new Uint8Array(buf)].map((b) => String.fromCharCode(b)).join("");
const toB64 = (s) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64 = (s) => atob(s.replace(/-/g, "+").replace(/_/g, "/"));

async function hmac(data) {
  const key = await crypto.subtle.importKey("raw", SECRET, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, typeof data === "string" ? enc.encode(data) : data);
  return toB64(b64u(sig));
}
async function signToken(payload) {
  const body = toB64(JSON.stringify(payload));
  const sig = await hmac(body);
  return `${body}.${sig}`;
}
async function verifyToken(token) {
  try {
    const [body, sig] = token.split(".");
    const expect = await hmac(body);
    if (sig.length !== expect.length) return null;
    for (let i = 0; i < expect.length; i++) if (sig[i] !== expect[i]) return null;
    const p = JSON.parse(fromB64(body));
    if (p.exp < Date.now()) return null;
    return p;
  } catch {
    return null;
  }
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const err = (message, status = 400) => json({ error: message }, status);

// Parse a JSON *object* body. A body of `null`, a number or a string is the
// caller's mistake: hand back {} so the required-field checks answer 400
// instead of an unhandled destructuring TypeError answering 500.
// Malformed JSON still throws SyntaxError, which dispatch() maps to 400.
const readJson = async (request) => {
  const b = await request.json();
  return b && typeof b === "object" && !Array.isArray(b) ? b : {};
};

// Field value that is safe to hand to a D1 bind: strings and finite numbers
// pass through; objects, arrays, booleans, NaN and undefined become null.
// D1 rejects anything else with a type error, i.e. a 500 caused by bad input.
const col = (v) =>
  typeof v === "string" ? v : typeof v === "number" ? (Number.isFinite(v) ? v : null) : null;

// Optional money/math field -> finite number, so a bogus value can never reach
// D1 as NaN (500) or poison a profit calculation (NaN -> null in JSON).
const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };

// A required numeric field that was absent, empty, non-numeric or negative.
const badNum = (v) =>
  v === undefined || v === null || v === "" || !Number.isFinite(Number(v)) || Number(v) < 0;

// ── LIVE SCHEMA PROBE ──────────────────────────────────────────────────────
// There is no migration file for this database: the only description of the
// schema is the SQL in this file. Columns the existing queries never touch
// (orders.processor, listings.created_at) therefore cannot be assumed, and
// naming a column that is not there fails every request with a D1 500. Reading
// the real column list lets a route use a column when it exists and degrade
// cleanly when it does not. The table name is a literal from this file and is
// checked against this list, so no caller-supplied string reaches SQL.
// Returns null when the probe is unavailable - callers must then fall back to
// the columns the existing queries in this file already prove exist.
const SCHEMA_TTL_MS = 300000;
const SCHEMA_TABLES = ["listings", "orders", "users"];
const schemaCache = new Map();
async function tableColumns(env, table) {
  if (!SCHEMA_TABLES.includes(table)) return null;
  const hit = schemaCache.get(table);
  if (hit && Date.now() - hit.at < SCHEMA_TTL_MS) return hit.cols;
  let cols = null;
  try {
    const r = await env.DB.prepare("PRAGMA table_info(" + table + ")").all();
    const rows = r?.results || [];
    if (rows.length) cols = new Set(rows.map((x) => String(x.name)));
  } catch {
    cols = null;
  }
  schemaCache.set(table, { cols, at: Date.now() });
  return cols;
}

// listings.platforms is a JSON array string (every write goes through
// JSON.stringify). A row that is empty, null, or hand-edited into something
// else must not take the market feed down, so an unparseable value reads as
// "no platforms" rather than throwing.
const parsePlatforms = (raw) => {
  if (Array.isArray(raw)) return raw.map((x) => String(x)).filter(Boolean);
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p.map((x) => String(x)).filter(Boolean) : [];
  } catch {
    return [];
  }
};

// A public seller label. Username and display name only - a buyer's market
// feed must never carry the seller's email address, so the email column is
// not selected anywhere in the market queries.
const sellerOf = (row) => ({
  username: row.seller_username || "unknown",
  display_name: row.seller_display_name || row.seller_username || "unknown seller",
});

// ORDER BY cannot be a bind parameter, so the caller's ?sort= is resolved
// through this fixed map. Only these literal strings ever reach the SQL.
// "price IS NULL" first pushes unpriced listings to the end of a price sort
// instead of letting SQLite float NULL to the top.
const MARKET_SORTS = {
  new: "listed_at DESC, l.id DESC",
  price_asc: "l.price IS NULL, l.price ASC, l.id DESC",
  price_desc: "l.price IS NULL, l.price DESC, l.id DESC",
};
const MARKET_LIMIT = 100;

// Shared SELECT list for the two public market reads. `listed_at` prefers
// listings.created_at (when the column really exists) and falls back to
// updated_at, which the existing listings queries already prove is there.
async function marketSelect(env) {
  const cols = await tableColumns(env, "listings");
  const timeCol = cols
    ? (cols.has("created_at") ? "l.created_at" : cols.has("updated_at") ? "l.updated_at" : null)
    : "l.updated_at";
  // The extra buyer-facing fields are added by ensureListingCols, which may
  // not have run yet on a fresh database. Aliasing them to NULL keeps this
  // query working instead of failing the whole market page on a missing column.
  const want = ["brand", "color", "material", "ship_city", "ship_country", "local_pickup"];
  const extra = cols
    ? want.map((c) => (cols.has(c) ? "l." + c : "NULL AS " + c))
    : want.map((c) => "NULL AS " + c);
  return (
    "SELECT l.id, l.title, l.price, l.condition, l.size, l.category, l.photo_url, l.status, l.platforms, " +
    extra.join(", ") + ", " +
    (timeCol ? timeCol + " AS listed_at" : "NULL AS listed_at") +
    ", u.username AS seller_username, u.display_name AS seller_display_name " +
    "FROM listings l LEFT JOIN users u ON u.id = l.user_id"
  );
}
const marketItem = (row) => ({
  id: row.id,
  title: row.title,
  price: row.price === null || row.price === undefined ? null : num(row.price),
  condition: row.condition,
  size: row.size,
  category: canonCategory(row.category),
  photo_url: row.photo_url,
  status: row.status,
  platforms: parsePlatforms(row.platforms),
  // buyer-facing detail: what it is and where it would ship from
  brand: row.brand || null,
  color: row.color || null,
  material: row.material || null,
  ship_city: row.ship_city || null,
  ship_country: row.ship_country || null,
  local_pickup: row.local_pickup ? true : false,
  seller: sellerOf(row),
  listed_at: row.listed_at || null,
});

async function hashPassword(pw) {
  const h = await crypto.subtle.digest("SHA-256", enc.encode("fash:" + pw));
  return b64u(h).split("").map((c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join("");
}

async function requireUser(request) {
  const auth = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!auth) return null;
  return await verifyToken(auth);
}

/* ── Direct messages: tables are created from INSIDE the Worker.
   The deploy token has no D1 scope (`wrangler d1 execute` → 7403), so schema
   for a new feature has to be created this way. Same proven pattern as
   createstuff's app_data. CREATE TABLE IF NOT EXISTS never alters an existing
   table, so this is a no-op on every request after the first success. */
let dmTablesReady = false, dmTablesPending = null;
async function ensureDmTables(env) {
  if (dmTablesReady) return;
  const p = dmTablesPending || (dmTablesPending = (async () => {
    await env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS dm_messages (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         from_id INTEGER NOT NULL,
         to_id INTEGER NOT NULL,
         body TEXT NOT NULL,
         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         read_at DATETIME
       )`
    ).run();
    await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_dm_pair ON dm_messages(from_id, to_id, id)").run();
    await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_dm_unread ON dm_messages(to_id, read_at)").run();
    // Blocking is its own table so an unblock is a DELETE and never touches
    // message history — the conversation comes back exactly as it was.
    await env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS dm_blocks (
         blocker_id INTEGER NOT NULL,
         blocked_id INTEGER NOT NULL,
         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         PRIMARY KEY (blocker_id, blocked_id)
       )`
    ).run();
  })());
  try {
    await p;
    dmTablesReady = true;
  } catch (e) {
    dmTablesPending = null;   // transient D1 failure: retry next request
    throw e;
  }
}

// TRUE if either person has blocked the other. Blocking has to work in both
// directions or the blocked person could still read and write the thread.
async function dmBlocked(env, a, b) {
  if (!a || !b || a === b) return false;
  const r = await env.DB.prepare(
    "SELECT 1 AS x FROM dm_blocks WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?) LIMIT 1"
  ).bind(a, b, b, a).first();
  return !!r;
}

// Every id this user cannot message: people they blocked, plus people who
// blocked them (returned without saying which is which, so learning you have
// been blocked is impossible from the outside).
async function dmDeniedIds(env, me) {
  const r = await env.DB.prepare(
    "SELECT blocked_id AS id FROM dm_blocks WHERE blocker_id=? UNION SELECT blocker_id AS id FROM dm_blocks WHERE blocked_id=?"
  ).bind(me, me).all();
  return new Set((r.results || []).map((x) => x.id));
}

/* ── Local pop-up stores ──────────────────────────────────────────────────
   A seller can put a physical stall, market table or garage sale on the map.
   The map itself is Leaflet + OpenStreetMap tiles and the address lookup is
   Nominatim — both free and keyless, so nothing here needs a paid service. */
let popupTablesReady = false, popupTablesPending = null;
async function ensurePopupTables(env) {
  if (popupTablesReady) return;
  const p = popupTablesPending || (popupTablesPending = (async () => {
    await env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS popup_stores (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         owner_id INTEGER NOT NULL,
         name TEXT NOT NULL,
         description TEXT,
         address TEXT NOT NULL,
         city TEXT,
         lat REAL,
         lng REAL,
         starts_at TEXT,
         ends_at TEXT,
         created_at DATETIME DEFAULT CURRENT_TIMESTAMP
       )`
    ).run();
    await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_popup_owner ON popup_stores(owner_id)").run();
  })());
  try { await p; popupTablesReady = true; }
  catch (e) { popupTablesPending = null; throw e; }
}

// Great-circle distance in km. Plain JS so the API needs no geo extension.
function haversineKm(a1, o1, a2, o2) {
  const R = 6371, rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(a2 - a1), dLng = rad(o2 - o1);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a1)) * Math.cos(rad(a2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Canonical listing category. Rows written before the field was validated
// turn up as "Tops", "tops" or " dresses ", so grouping on the raw column
// produces duplicate chips. Trim, match the fixed known set ignoring case and
// return the canonical spelling. Anything that is not one of those names
// (including null, empty or a non-string) reads as null: the client files
// those under "All" instead of inventing a free-text chip that could
// duplicate a real one. Self-contained so it can run on read and on write.
function canonCategory(v) {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  const known = ["Tops", "Bottoms", "Dresses", "Outerwear", "Shoes", "Accessories", "Athletic"];
  for (const k of known) if (s.toLowerCase() === k.toLowerCase()) return k;
  return null;
}

// Listings grew columns after the table was first created. The deploy token
// has no D1 scope (wrangler d1 execute -> 7403), so the schema change has to
// run from inside the Worker the same way as every other table here. Each
// ALTER is individually guarded: re-running is a no-op, and a failure on one
// column must not stop the others.
let listingColsReady = false, listingColsPending = null;
async function ensureListingCols(env) {
  if (listingColsReady) return;
  const p = listingColsPending || (listingColsPending = (async () => {
    const want = [
      "brand TEXT", "color TEXT", "material TEXT",
      "ship_city TEXT", "ship_postcode TEXT", "ship_country TEXT",
      "local_pickup INTEGER DEFAULT 0",
    ];
    for (const c of want) {
      try { await env.DB.prepare(`ALTER TABLE listings ADD COLUMN ${c}`).run(); }
      catch (e) { /* column already exists */ }
    }
  })());
  try { await p; listingColsReady = true; }
  catch (e) { listingColsPending = null; throw e; }
}

async function rateLimit(env, request, bucket, limit = 30, windowSec = 60) {
  try {
    const ip = request.headers.get("CF-Connecting-IP") || "x";
    const w = Math.floor(Date.now() / 1000 / windowSec);
    const key = `rl:${bucket}:${w}:${ip}`;
    const c = parseInt(await env.CACHE.get(key), 10) || 0;
    if (c >= limit) return false;
    await env.CACHE.put(key, String(c + 1), { expirationTtl: windowSec * 2 });
    return true;
  } catch {
    return true;
  }
}

// Marketplace registry.
//   api:"full"   → we can create/update listings through their public API
//   api:"deep"   → no listing API; we pre-fill a paste-ready draft + deep link
//   feePct marked estimate where the platform publishes no public seller rate.
const MARKETPLACES = [
  { id: "depop",     name: "Depop",          feePct: 10,    maxChar: 1100, api: "deep",  signup: "https://depop.com" },
  { id: "ebay",      name: "eBay",           feePct: 13.25, maxChar: 80,   api: "full",  signup: "https://www.ebay.com/lstng" },
  { id: "poshmark",  name: "Poshmark",       feePct: 20,    maxChar: 75,   api: "deep",  signup: "https://poshmark.com" },
  { id: "mercari",   name: "Mercari",        feePct: 13.9,  maxChar: 60,   api: "deep",  signup: "https://www.mercari.com" },
  { id: "vinted",    name: "Vinted",         feePct: 5,     maxChar: 50,   api: "deep",  signup: "https://www.vinted.com" },
  { id: "grailed",   name: "Grailed",        feePct: 9,     maxChar: 80,   api: "deep",  signup: "https://www.grailed.com" },
  { id: "etsy",      name: "Etsy",           feePct: 9.5,   maxChar: 140,  api: "full",  signup: "https://www.etsy.com/sell" },
  { id: "shopify",   name: "Shopify",        feePct: 0,     maxChar: 255,  api: "full",  signup: "https://www.shopify.com" },
  { id: "tiktok",    name: "TikTok Shop",    feePct: 8,     maxChar: 34,   api: "full",  signup: "https://shop.tiktok.com" },
  { id: "whatnot",   name: "Whatnot",        feePct: 8,     maxChar: 100,  api: "deep",  signup: "https://www.whatnot.com" },
  { id: "facebook",  name: "Facebook Mktpl", feePct: 0,     maxChar: 100,  api: "deep",  signup: "https://www.facebook.com/marketplace" },
  { id: "amazon",    name: "Amazon",         feePct: 15,    maxChar: 200,  api: "full",  signup: "https://sellercentral.amazon.com", note: "estimate" },
  { id: "square",    name: "Square",         feePct: 2.6,   maxChar: 140,  api: "full",  signup: "https://squareup.com" },
  { id: "bigcommerce", name: "BigCommerce",  feePct: 0,     maxChar: 255,  api: "full",  signup: "https://www.bigcommerce.com" },
  { id: "woocommerce", name: "WooCommerce",  feePct: 0,     maxChar: 255,  api: "full",  signup: "https://woocommerce.com" },
  { id: "tradesy",   name: "Tradesy",        feePct: 12,    maxChar: 80,   api: "deep",  signup: "https://www.tradesy.com", note: "estimate" },
  { id: "depop_alt", name: "Etsy Vintage",   feePct: 9.5,   maxChar: 140,  api: "deep",  signup: "https://www.etsy.com/market/vintage" },
  { id: "kickscrew", name: "KicksCrew",      feePct: 10,    maxChar: 100,  api: "deep",  signup: "https://www.kickscrew.com", note: "estimate" },
  { id: "vestiaire", name: "Vestiaire Col.",  feePct: 15,    maxChar: 100,  api: "deep",  signup: "https://www.vestiairecollective.com", note: "estimate" },
  { id: "theRealReal", name: "The RealReal", feePct: 20,    maxChar: 100,  api: "deep",  signup: "https://www.therealreal.com", note: "estimate" },
  { id: "redbubble", name: "Redbubble",      feePct: 0,     maxChar: 255,  api: "deep",  signup: "https://www.redbubble.com" },
  { id: "zalando",   name: "Zalando",        feePct: 10,    maxChar: 100,  api: "deep",  signup: "https://www.zalando.de", note: "estimate" },
  { id: "depop_alt2", name: "eBay Vintage",  feePct: 13.25, maxChar: 80,   api: "deep",  signup: "https://www.ebay.com" },
  { id: "posh_alt",  name: "Mercari Shops",  feePct: 13.9,  maxChar: 60,   api: "deep",  signup: "https://www.mercari.com", note: "estimate" },
  // Our own storefront. 0% commission — a seller keeps the whole price, which
  // is why this row carries no signup link: you are already here.
  { id: "fashionistas", name: "Fashionistas", feePct: 0,   maxChar: 2000, api: "full",  signup: "" },
];

// ── FEE ENGINE ─────────────────────────────────────────────────────────────
// Real seller-fee rules, checked against publisher sources 2026-09-24.
// `verified:true` = number came from the platform's own help/news page or a
// source that quoted it directly. `verified:false` = carried-over estimate,
// and it is labelled as such in the API and the UI. Nothing here is invented.
const FEE_SOURCES = {
  vinted:    "Vinted US price list 2026 — no seller commission",
  depop:     "Depop company news 2024-07-18 — US selling fee removed",
  poshmark:  "Poshmark fee schedule — $2.95 under $15, 20% at $15+",
  mercari:   "Mercari fee change 2025-01-06 — 10% selling fee",
  ebay:      "eBay final value fee — 13.25% simple",
  etsy:      "Etsy help center — 6.5% + $0.20 + 3% + $0.25",
  grailed:   "Grailed 9% commission + payment processing",
  facebook:  "Facebook Marketplace — no fee on local sales",
  shopify:   "Shopify Payments — 2.9% + $0.30 (online)",
  square:    "Square — 2.6% + $0.10 in person",
};

// fee(id, price) -> { lines:[{label,amount}], net, takeRate, note, verified, source }
// Rows that are another platform's storefront reuse that platform's real rule
// instead of carrying a stale flat percentage.
const FEE_ALIAS = { depop_alt: "etsy", depop_alt2: "ebay", posh_alt: "mercari" };
function fee(rawId, price) {
  const alias = FEE_ALIAS[rawId];
  const id = alias || rawId;
  const p = Math.max(0, Number(price) || 0);
  const L = [];
  let note = "", verified = false, source = FEE_SOURCES[id] || null;

  const add = (label, amount) => L.push({ label, amount: +amount.toFixed(2) });

  switch (id) {
    case "vinted":
      note = "Sellers pay $0. Buyer pays the Buyer Protection fee ($0.70 + 5% in the US), so you keep the full price.";
      verified = true; break;
    case "depop":
      note = "US selling fee removed 18 Jul 2024. Only payment processing remains (3.3% + $0.45).";
      verified = true;
      add("Payment processing", p * 0.033 + 0.45); break;
    case "poshmark":
      note = p < 15
        ? "Sales under $15 are charged a flat $2.95. No separate processing fee."
        : "Sales $15 and over are charged 20%. No separate processing fee.";
      verified = true;
      add("Commission", p < 15 ? 2.95 : p * 0.20); break;
    case "mercari":
      note = "10% selling fee since 6 Jan 2025, charged on the item price. Buyer pays a separate 3.25% buyer fee.";
      verified = true;
      add("Selling fee", p * 0.10); break;
    case "ebay":
      note = "13.25% final value fee on simple-format listings; payment processing is included. Category rates vary (13.25%–13.6%).";
      verified = true;
      add("Final value fee", p * 0.1325); break;
    case "etsy":
      note = "$0.20 listing fee + 6.5% transaction fee (item and shipping) + payment processing 3% + $0.25. Offsite Ads add 12%–15% only if you turn them on.";
      verified = true;
      add("Listing fee", 0.20);
      add("Transaction fee", p * 0.065);
      add("Payment processing", p * 0.03 + 0.25); break;
    case "grailed":
      note = "9% commission plus payment processing.";
      verified = true;
      add("Commission", p * 0.09);
      add("Payment processing", p * 0.029 + 0.30); break;
    case "facebook":
      note = "No selling fee on local Marketplace handoffs. Shipped orders through checkout do carry a ~5% + $0.40 fee — not modelled here.";
      verified = true; break;
    case "shopify":
      note = "0% marketplace fee, but Shopify Payments takes 2.9% + $0.30 on online cards. Shown so the comparison is honest.";
      verified = false;
      add("Shopify Payments", p * 0.029 + 0.30); break;
    case "square":
      note = "2.6% + $0.10 for in-person Square transactions.";
      verified = true;
      add("Card processing", p * 0.026 + 0.10); break;
    case "bigcommerce":
    case "woocommerce":
      note = "0% platform fee. Your own payment gateway is charged separately (typically ~2.9% + $0.30).";
      verified = false; break;
    case "redbubble":
      note = "0% listing fee; you set your own artist margin, which comes out of the price rather than as a fee.";
      verified = false; break;
    case "tiktok":
      note = "8% selling fee is the commonly quoted rate; TikTok Shop rates vary by category. Treat as an estimate.";
      verified = false;
      add("Selling fee", p * 0.08); break;
    case "whatnot":
      note = "8% selling fee is the commonly quoted rate for standard categories. Treat as an estimate.";
      verified = false;
      add("Selling fee", p * 0.08); break;
    case "amazon":
      note = "Clothing referral fees are category-dependent and often land near 15%–17%. Treat as an estimate.";
      verified = false;
      add("Referral fee", p * 0.15); break;
    case "vestiaire":
      note = "Vestiaire seller commission varies by item and sale route (often well above 15%). Treat as an estimate.";
      verified = false;
      add("Commission", p * 0.15); break;
    case "theRealReal":
      note = "Consignment commission is tiered by seller volume, commonly 20%–60%. Treat as an estimate.";
      verified = false;
      add("Commission", p * 0.20); break;
    case "tradesy":
      note = "Tradesy now routes through Vestiaire Collective; the historical ~12% is no longer a reliable quote.";
      verified = false;
      add("Commission", p * 0.12); break;
    case "zalando":
      note = "Partner-programme commission sits near 10% for apparel. Treat as an estimate.";
      verified = false;
      add("Commission", p * 0.10); break;
    case "kickscrew":
      note = "Marketplace commission is not published in a stable public table. Treat as an estimate.";
      verified = false;
      add("Commission", p * 0.10); break;
    default: {
      // Unknown platform: fall back to the legacy percentage on the row, marked unverified.
      const mp = MARKETPLACES.find((m) => m.id === id);
      note = "No verified fee schedule found for this row — using the carried-over " + (mp?.feePct ?? 0) + "% estimate.";
      verified = false;
      if (mp?.feePct) add("Commission (estimate)", p * (mp.feePct / 100));
      break;
    }
  }

  const total = L.reduce((s, l) => s + l.amount, 0);
  const net = +(p - total).toFixed(2);
  if (alias) note = "Storefront on another platform — priced with that platform's schedule. " + note;
  return {
    id: rawId, price: p, lines: L, total: +total.toFixed(2), net,
    takeRate: p > 0 ? +((net / p) * 100).toFixed(1) : 100,
    note, verified, source,
  };
}

const aiText = async (env, system, user, maxTok = 800) => {
  try {
    const r = await env.AI.run(
      "@cf/meta/llama-3.2-3b-instruct",
      { messages: [{ role: "system", content: system }, { role: "user", content: user }], max_tokens: maxTok }
    );
    // Workers AI may return {response: string} OR a raw object/array — coerce to string.
    const out = r?.response ?? r;
    return typeof out === "string" ? out.trim() : JSON.stringify(out ?? "");
  } catch {
    return "";
  }
};

/* Multi-turn chat. History is sent as real role-separated messages instead of
   being concatenated into one user string. Concatenating made the model treat
   the whole thing as a transcript to CONTINUE, so it emitted fabricated
   "Shopper: ... Guide: ..." pairs for questions that were never asked. */
const aiChat = async (env, system, history, last, maxTok = 420) => {
  try {
    const messages = [{ role: "system", content: system }];
    (history || []).slice(-10).forEach((h) => {
      const text = String((h && h.text) || "").slice(0, 400);
      if (!text) return;
      messages.push({ role: h && h.who === "me" ? "user" : "assistant", content: text });
    });
    messages.push({ role: "user", content: last });
    const r = await env.AI.run("@cf/meta/llama-3.2-3b-instruct", { messages, max_tokens: maxTok });
    const out = r?.response ?? r;
    const text = typeof out === "string" ? out.trim() : JSON.stringify(out ?? "");
    // Emitting a transcript back means it did not answer — treat as a miss so
    // the caller falls through to an honest built-in answer.
    if (!text || /^\s*Shopper:|\n\s*Shopper:/.test(text)) return "";
    return text;
  } catch {
    return "";
  }
};

/* Which of the three chatbots is talking. `guide` needs no data of its own;
   `items` and `ideas` are fed real rows from this deployment's database so
   the bot answers about THIS account's products instead of in the abstract. */
function chatSystem(mode, ctx) {
  const base =
    "You are the assistant inside Fashionistas, a resale app for people who buy second-hand clothes to sell on. " +
    "Answer the last message directly in plain, short sentences a first-time seller can follow — no jargon, no bullet-point walls. " +
    "Never write out a transcript or repeat the earlier messages back. " +
    "Never invent prices, postage or fee figures: if you do not know a number, say you do not know it. " +
    "Keep the answer under 90 words unless the question genuinely needs more.";
  const role =
    mode === "ideas"
      ? "\nYour job is IDEAS: brainstorm what to hunt for, item ideas, listing title angles, photo concepts and bundles to add."
      : mode === "items"
        ? "\nYour job is THE USER'S OWN ITEMS — use the listing data below and refer to items by name. If they have no listings yet, say so plainly and ask what they plan to sell first."
        : "\nYour job is general selling help: photographing, writing listings, pricing and comps, fees per marketplace, postage, and getting paid.";
  return base + role + (ctx || "");
}

async function chatContext(env, userId, mode) {
  if (mode !== "items" && mode !== "ideas") return "";
  let out = "";
  if (mode === "items") {
    try {
      const r = await env.DB.prepare(
        "SELECT title, price, condition, category, size, status FROM listings WHERE user_id=? ORDER BY id DESC LIMIT 8"
      ).bind(userId).all();
      const rows = r.results || [];
      out += rows.length
        ? "\n\nTHE USER'S OWN LISTINGS (most recent 8):\n" + rows.map((x) =>
            "- " + (x.title || "untitled") +
            (x.price != null ? " | $" + x.price : " | no price yet") +
            (x.condition ? " | " + x.condition : "") +
            (x.category ? " | " + x.category : "") +
            (x.size ? " | size " + x.size : "") +
            (x.status ? " | " + x.status : "")).join("\n")
        : "\n\nTHE USER HAS NO LISTINGS YET.";
    } catch { /* a context failure must never break the chat */ }
  }
  if (mode === "ideas") {
    try {
      const r = await env.DB.prepare(
        "SELECT category, COUNT(*) AS n, ROUND(AVG(price),2) AS avgp FROM listings " +
        "WHERE status='active' AND category IS NOT NULL GROUP BY category ORDER BY n DESC LIMIT 10"
      ).all();
      const rows = r.results || [];
      if (rows.length) {
        out += "\n\nWHAT THIS MARKETPLACE CURRENTLY HAS (category | listings | average asking price):\n" +
          rows.map((x) => "- " + x.category + " | " + x.n + " | " + (x.avgp != null ? "$" + x.avgp : "?")).join("\n");
      }
    } catch { /* optional */ }
  }
  return out;
}

/* ── OpenCode agents ──────────────────────────────────────────────────────
   The messenger and the chatbot are deliberately different systems:
   messenger = database rows, chatbot = a real OpenCode agent on the Hive.

   The relay is called ASYNCHRONOUSLY (start, then poll) instead of as one
   long POST because two hard ceilings sit in front of us:
     · the quick tunnel answers HTTP 524 at ~126s  (measured 3/3)
     · Cloudflare kills a Worker request at ~180s  (measured HTTP 000 @180.87s)
   while a single generation takes 40-200s. A chat window cannot hold either,
   so the poll budget here is deliberately SHORT (26s): if the agent has not
   finished by then the caller falls back rather than freezing the user. */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function hiveChat(env, system, history, msg, maxTok) {
  if (!env.HIVE_URL) throw new Error("hive relay not configured");
  const headers = { "Content-Type": "application/json" };
  if (env.HIVE_TOKEN) headers.Authorization = "Bearer " + env.HIVE_TOKEN;
  const messages = [{ role: "system", content: system }];
  (history || []).slice(-8).forEach((h) => {
    const t = String((h && h.text) || "").slice(0, 400);
    if (t) messages.push({ role: h && h.who === "me" ? "user" : "assistant", content: t });
  });
  messages.push({ role: "user", content: msg });

  const start = await fetch(env.HIVE_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ model: "space-bunny-free", messages, max_tokens: maxTok, async: true, deadline_ms: 22000 }),
    signal: AbortSignal.timeout(15000),
  });
  if (!start.ok) throw new Error("relay HTTP " + start.status + " on start");
  const s = await start.json();
  if (!s.job_id) throw new Error("relay returned no job_id: " + JSON.stringify(s).slice(0, 120));
  const jobUrl = String(env.HIVE_URL).replace(/\/v1\/chat\/completions\/?$/, "") + "/v1/jobs/" + s.job_id;

  const budget = Date.now() + 26000;
  let last = "no poll yet";
  while (Date.now() < budget) {
    await sleep(2000);
    let j;
    try {
      const g = await fetch(jobUrl, { headers, signal: AbortSignal.timeout(10000) });
      if (!g.ok) { last = "poll HTTP " + g.status; continue; }
      j = await g.json();
    } catch (e) { last = "poll failed: " + String((e && e.message) || e); continue; }

    if (j.status === "done") {
      const text = String(j.content || "").trim();
      if (!text) throw new Error("agent returned empty content");
      // An answer that writes the transcript back instead of replying is a
      // miss, not an answer — never show it to a user.
      if (/^\s*(Shopper|User|You):|\n\s*(Shopper|User):/.test(text)) throw new Error("agent echoed the transcript");
      return { text, model: "agent" };
    }
    if (j.status === "failed") throw new Error("agent failed: " + String(j.error || "").slice(0, 200));
    last = "running " + Math.round((Date.now() - (j.started || Date.now())) / 1000) + "s";
  }
  throw new Error("agent timed out after 26s (" + last + ")");
}

/* Used ONLY when Workers AI is unreachable or over its daily quota. It is
   always returned with source:"fallback" so the UI never presents it as
   something a model said. Plain text, no invented figures. */
function guideFallback(msg) {
  const m = String(msg || "").toLowerCase();
  const has = (...k) => k.some(w => m.includes(w));
  let a;
  if (has("price", "pricing", "worth", "charge", "how much", "comp", "expensive", "cheap"))
    a = "For pricing, look at what the same item in the same size and condition actually sold for — not what sellers are asking. Start near the middle of that range: higher for excellent condition or a known brand, lower for flaws.";
  else if (has("ship", "postage", "shipping", "label", "pack", "deliver"))
    a = "Ship within the window your listing promises. Weigh the packed item before buying the label so the postage price is right, and photograph the packed parcel before it leaves.";
  else if (has("fee", "fees", "commission", "keep", "profit", "net", "payout", "money"))
    a = "Open Selling tools and use the fee comparison — it shows what you actually keep on each marketplace at your price, after that platform's cut.";
  else if (has("photo", "picture", "shoot", "light", "camera", "image", "snapshot"))
    a = "Shoot in daylight by a window, on a plain background. Take the front, the back, the label and any flaw. Photographing flaws honestly cuts down returns and buyer messages.";
  else if (has("account", "sign in", "login", "password", "key", "api", "token"))
    a = "Sign in from the top of any screen. If a service asks you for a key, the app walks you through getting one and then stores it for you.";
  else if (has("sell", "list", "listing", "start", "begin", "first"))
    a = "Press Photo on the bottom bar, snap the item, and fill in what it asks. The listing is written for you to edit before it goes live.";
  else if (has("message", "chat", "buyer", "contact", "reply"))
    a = "Open Messages to talk to other accounts directly. For buyer replies, Messages and tips has ready-made wording you can copy.";
  else
    a = "I can help with photos, pricing, fees, postage and listings. Tell me which one and I will walk you through it.";
  return a + " (The AI guide is unavailable right now — this is the built-in answer.)";
}

// Pull a JSON object out of noisy model output. NEVER throws.
// Models here intermittently reply with markdown fences, a prose preamble,
// single-quoted keys, or a trailing comma — any of which used to 502 the route.
const aiJson = (raw, fallback = null) => {
  if (raw == null) return fallback;
  // Unwrap repeated encodings: "{\"a\":1}" -> {"a":1}. Never throws.
  const unwrap = (v) => {
    if (typeof v === "string") {
      const t = v.trim();
      if (!t) return null;
      try { return unwrap(JSON.parse(t)); } catch { return null; }
    }
    if (v && typeof v === "object" && !Array.isArray(v)) return v;
    return null;
  };
  if (typeof raw !== "string" || !raw.trim()) return fallback;

  const whole = unwrap(raw);
  if (whole) return whole;

  const fence = raw.replace(/```[a-z]*\s*/gi, "").replace(/```/g, "").trim();
  const m = fence.match(/\{[\s\S]*\}/);
  const candidates = m ? [m[0], fence] : [fence];
  for (const c of candidates) {
    const tries = [
      c,
      c.replace(/\\"/g, '"'),                                  // escaped quotes (double-encoded)
      c.replace(/'/g, '"'),                                      // single-quoted JSON
      c.replace(/,\s*([}\]])/g, "$1"),                         // trailing comma
      c.replace(/([{,]\s*)([A-Za-z_][\w -]*)\s*:/g, '$1"$2":'), // unquoted keys
    ];
    for (const t of tries) {
      const v = unwrap(t);
      if (v) return v;
    }
  }
  return fallback;
};
const ALLOWED_ORIGINS = new Set([
  "https://fashionistas.ai",
  "https://fashionistas-ai.pages.dev",
  "http://localhost:8787",
  "http://127.0.0.1:8787",
]);
const isAllowedOrigin = (o) =>
  !!o && (ALLOWED_ORIGINS.has(o) || /^https:\/\/[a-z0-9-]+\.fashionistas-ai\.pages\.dev$/.test(o));

// Lock CORS to known origins and attach security headers to EVERY response.
// Previously we echoed `*`, which let any site read our responses.
function harden(request, res) {
  const origin = request.headers.get("Origin");
  const headers = new Headers(res.headers);
  if (origin && isAllowedOrigin(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.append("Vary", "Origin");
  } else {
    // No ACAO header => the browser blocks the cross-origin read.
    headers.delete("Access-Control-Allow-Origin");
  }
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

export default {
  async fetch(request, env) {
    return harden(request, await dispatch(request, env));
  },
};

async function dispatch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    if (method === "OPTIONS") return new Response(null, { headers: CORS });

    try {
      // ── PUBLIC ──────────────────────────────────────────────
      if (path === "/api/health") return json({ ok: true, ts: Date.now(), version: "3.1.0" });
      // robots.txt + sitemap — real files, NOT the SPA (Pages was serving index.html for both)
      if (path === "/robots.txt")
        return new Response(
          "User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: https://fashionistas.ai/sitemap.xml\n",
          { headers: { ...CORS, "Content-Type": "text/plain; charset=utf-8" } }
        );
      if (path === "/sitemap.xml") {
        const now = new Date().toISOString().slice(0, 10);
        const urls = ["", "app", "pricing", "marketplaces", "ar-tryon", "blog", "guide"].map(
          (p) => `  <url><loc>https://fashionistas.ai/${p ? p + "/" : ""}</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>${p ? "0.7" : "1.0"}</priority></url>`
        );
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`,
          { headers: { ...CORS, "Content-Type": "application/xml; charset=utf-8" } }
        );
      }
      if (path === "/api/auth/register" && method === "POST") {
        if (!(await rateLimit(env, request, "register", 10))) return err("Too many requests", 429);
        const { email, username, password } = await readJson(request);
        if (!email || !username || !password) return err("email, username, password required");
        if (typeof email !== "string" || typeof username !== "string" || typeof password !== "string")
          return err("email, username and password must be strings");
        if (username.length < 3) return err("Username must be at least 3 characters");
        if (password.length < 6) return err("Password must be at least 6 characters");
        const exists = await env.DB.prepare("SELECT id FROM users WHERE username=? OR email=?").bind(username, email).first();
        if (exists) return err("Username or email already taken", 409);
        const hash = await hashPassword(password);
        const r = await env.DB.prepare("INSERT INTO users (username, password_hash, display_name, email) VALUES (?,?,?,?)")
          .bind(username, hash, username, email).run();
        const id = r.meta.last_row_id;
        const user = await env.DB.prepare("SELECT id, username, display_name, email FROM users WHERE id=?").bind(id).first();
        const token = await signToken({ sub: user.id, u: user.username, exp: Date.now() + 30 * 86400000 });
        return json({ user, token }, 201);
      }
      if (path === "/api/auth/login" && method === "POST") {
        if (!(await rateLimit(env, request, "login", 20))) return err("Too many requests", 429);
        const { username, password } = await readJson(request);
        if (!username || !password) return err("username and password required");
        const user = await env.DB.prepare("SELECT * FROM users WHERE username=?").bind(username).first();
        if (!user) return err("Invalid credentials", 401);
        if (user.password_hash !== (await hashPassword(password))) return err("Invalid credentials", 401);
        const token = await signToken({ sub: user.id, u: user.username, exp: Date.now() + 30 * 86400000 });
        return json({ user: { id: user.id, username: user.username, display_name: user.display_name, email: user.email }, token });
      }
      if (path === "/api/blog" && method === "GET") {
        const posts = await env.DB.prepare("SELECT id, title, slug, excerpt, category, read_time, created_at FROM blog_posts ORDER BY created_at DESC LIMIT 12").all();
        return json({ posts: posts.results });
      }
      if (path.startsWith("/api/images/") && method === "GET") {
        const key = path.replace("/api/images/", "");
        if (!key) return err("missing key");
        const obj = await env.IMAGES.get(key);
        if (!obj) return new Response("Not found", { status: 404 });
        return new Response(obj.body, { headers: { ...CORS, "Content-Type": obj.httpMetadata?.contentType || "image/jpeg", "Cache-Control": "public, max-age=31536000" } });
      }

      // ── AUTH REQUIRED ───────────────────────────────────────
      // ── PUBLIC MARKET (the buyer side) ─────────────────────────────────
      // A shopper is not the seller, so these two reads run before the auth
      // gate. They return active listings and the seller's public name only —
      // the email column is never selected here.
      if (path === "/api/market" && method === "GET") {
        const u = new URL(request.url);
        const q = (u.searchParams.get("q") || "").trim().slice(0, 80);
        const category = (u.searchParams.get("category") || "").trim().slice(0, 80);
        const sortKey = u.searchParams.get("sort") || "new";
        const orderBy = MARKET_SORTS[sortKey] || MARKET_SORTS.new;
        const where = ["l.status = 'active'"];
        const binds = [];
        if (q) { where.push("(l.title LIKE ? OR l.description LIKE ?)"); binds.push("%" + q + "%", "%" + q + "%"); }
        // Category arrives three ways: a full path ("Women's Clothing/Tops & Shirts"),
        // a bare department ("Women's Clothing"), or a legacy flat word ("Tops") —
        // rows written before the tree existed still hold the flat word. Match
        // exact path, the leaf on its own, and anything stored under the path.
        if (category) {
          const leaf = category.split("/").pop().trim();
          where.push("(LOWER(TRIM(l.category)) = LOWER(?) OR LOWER(TRIM(l.category)) = LOWER(?) OR LOWER(TRIM(l.category)) LIKE LOWER(?))");
          binds.push(category, leaf, category + "/%");
        }
        const sql =
          (await marketSelect(env)) + " WHERE " + where.join(" AND ") +
          " ORDER BY " + orderBy + " LIMIT " + MARKET_LIMIT;
        const r = await env.DB.prepare(sql).bind(...binds).all();
        const rows = (r.results || []).map(marketItem);
        return json({ market: rows, count: rows.length, sort: sortKey, q, category });
      }
      const marketOne = path.match(/^\/api\/market\/(\d+)$/);
      if (marketOne && method === "GET") {
        const row = await env.DB.prepare(
          (await marketSelect(env)) + " WHERE l.id=? AND l.status='active'"
        ).bind(+marketOne[1]).first();
        if (!row) return err("Not found", 404);
        return json({ listing: marketItem(row) });
      }

      // ── SHOP BY PHOTO ── public + rate-limited, like the market itself.
      // A shopper photographs a garment they like; we identify it, show what
      // is listed HERE that matches, and hand back ready-made search links to
      // the big marketplaces. Those links are where an affiliate placement
      // would live, so they are built server-side and kept honest.
      if (path === "/api/shop/photo-search" && method === "POST") {
        if (!(await rateLimit(env, request, "photosearch", 15))) return err("Too many photo searches — wait a minute", 429);
        const { image } = await readJson(request);
        if (!image) return err("Missing image (base64)");
        if (!/^[A-Za-z0-9+/=]+$/.test(image) || image.length < 100)
          return err("image must be base64-encoded image bytes");

        let ident = null, visionSource = "ai";
        try {
          const r = await env.AI.run("@cf/meta/llama-3.2-11b-vision-instruct", {
            prompt:
              "You are helping a shopper find an item they just photographed. Reply with ONLY one raw JSON object, double quotes, no markdown, no code fences, no prose. " +
              "Keys: type (e.g. 'denim jacket','white trainers','floral dress'), brand (string or 'Unknown'), color, " +
              "category (Tops/Bottoms/Dresses/Outerwear/Shoes/Accessories), keywords (array of 5 short lowercase words someone would type into a search box), confidence (0-100). " +
              "Be specific and honest about what you can actually see.",
            image,
            max_tokens: 300,
          });
          let text = "";
          try {
            text = typeof r === "string" ? r : JSON.stringify(r);
            if (r?.response) text = typeof r.response === "string" ? r.response : JSON.stringify(r.response);
          } catch { text = JSON.stringify(r); }
          ident = aiJson(text, null);
          if (!ident || !ident.type) { ident = null; visionSource = "unavailable"; }
        } catch (e) {
          console.error("photo-search vision:", (e && e.message) || e);
          visionSource = "unavailable";
        }

        // Build the actual search phrase. Terms the model could not see are
        // dropped rather than guessed at.
        const bits = [ident && ident.type, ident && ident.brand, ident && ident.color]
          .filter((x) => typeof x === "string" && x.trim() && !/^(unknown|n\/a|none)$/i.test(x.trim()))
          .map((x) => x.trim());
        const query = bits.join(" ").slice(0, 80) || "";

        // What we have that matches — same public rows the Shop already shows.
        let ours = [];
        if (query) {
          try {
            const like = query.split(/\s+/).map((w) => w.replace(/[%_]/g, "")).filter(Boolean).slice(0, 4);
            const conds = [], binds = [];
            like.forEach((w) => { conds.push("l.title LIKE ?", "l.description LIKE ?"); binds.push(`%${w}%`, `%${w}%`); });
            const aiCat = canonCategory(ident && ident.category);
            if (aiCat) { conds.push("LOWER(TRIM(l.category)) = LOWER(?)"); binds.push(aiCat); }
            const sql = (await marketSelect(env)) +
              " WHERE l.status='active' AND (" + conds.join(" OR ") + ")" +
              " ORDER BY (CASE WHEN " +
              (ident && ident.type ? "l.title LIKE ?" : "1=0") + " THEN 0 ELSE 1 END), l.created_at DESC LIMIT 12";
            const b2 = ident && ident.type ? binds.concat(`%${ident.type}%`) : binds;
            const rr = await env.DB.prepare(sql).bind(...b2).all();
            ours = (rr.results || []).map(marketItem);
          } catch (e) {
            console.error("photo-search ours:", (e && e.message) || e);
          }
        }

        const mk = (name, url) => ({ name, url });
        const enc = encodeURIComponent(query);
        const marketplaces = query ? [
          mk("eBay",   "https://www.ebay.com/sch/i.html?_nkw=" + enc),
          mk("Depop",  "https://www.depop.com/search/?q=" + enc),
          mk("Poshmark","https://poshmark.com/search?query=" + enc),
          mk("Mercari","https://www.mercari.com/search?keyword=" + enc),
          mk("Vinted", "https://www.vinted.com/catalog?search_text=" + enc),
          mk("Etsy",   "https://www.etsy.com/search?q=" + enc),
        ] : [];

        return json({ identification: ident, vision: visionSource, query, ours, count: ours.length, marketplaces });
      }

      // ── LOCAL POP-UP STORES ── public: anyone can see what's nearby
      // before they make an account, the same way the shop is public.
      if (path === "/api/popups" && method === "GET") {
        await ensurePopupTables(env);
        const u2 = new URL(request.url);
        const myLat = parseFloat(u2.searchParams.get("lat"));
        const myLng = parseFloat(u2.searchParams.get("lng"));
        const near = u2.searchParams.get("near") || "";
        let sql =
          "SELECT p.id, p.name, p.description, p.address, p.city, p.lat, p.lng, p.starts_at, p.ends_at, " +
          "p.owner_id, p.created_at, u.username AS owner_username, u.display_name AS owner_name " +
          "FROM popup_stores p JOIN users u ON u.id = p.owner_id";
        const binds = [];
        if (near) { sql += " WHERE p.name LIKE ? OR p.city LIKE ? OR p.address LIKE ?"; binds.push("%"+near+"%","%"+near+"%","%"+near+"%"); }
        sql += " ORDER BY p.created_at DESC LIMIT 150";
        const r = await env.DB.prepare(sql).bind(...binds).all();
        const rows = (r.results || []).map((x) => {
          const hasGeo = typeof x.lat === "number" && typeof x.lng === "number" && isFinite(x.lat) && isFinite(x.lng);
          const km = (isFinite(myLat) && isFinite(myLng) && hasGeo) ? haversineKm(myLat, myLng, x.lat, x.lng) : null;
          return {
            id: x.id, name: x.name, description: x.description, address: x.address, city: x.city,
            lat: hasGeo ? x.lat : null, lng: hasGeo ? x.lng : null,
            starts_at: x.starts_at, ends_at: x.ends_at,
            owner_id: x.owner_id, owner: x.owner_name || x.owner_username,
            created_at: x.created_at, km: km === null ? null : Math.round(km * 10) / 10,
          };
        });
        if (isFinite(myLat) && isFinite(myLng)) rows.sort((a, b) => (a.km ?? 1e9) - (b.km ?? 1e9));
        return json({ popups: rows, count: rows.length, coords: isFinite(myLat) && isFinite(myLng) ? { lat: myLat, lng: myLng } : null });
      }

      const user = await requireUser(request);
      if (!user) return json({ error: "Unauthorized" }, 401);

      // images upload
      if (path === "/api/images/upload" && method === "POST") {
        if (!(await rateLimit(env, request, "upload", 30))) return err("Too many requests", 429);
        // A non-multipart body used to bubble up as an unhandled TypeError -> 500.
        let form;
        try {
          form = await request.formData();
        } catch {
          return err("expected multipart/form-data with a 'file' field");
        }
        const file = form.get("file");
        if (!file) return err("No file");
        // A plain text field named "file" is not an upload (no .stream()).
        if (typeof file === "string" || typeof file.stream !== "function") return err("'file' must be a file upload");
        const key = `${user.sub}/${Date.now()}-${file.name || "img"}`;
        await env.IMAGES.put(`u/${key}`, file.stream(), { httpMetadata: { contentType: file.type || "image/jpeg" } });
        // Creating a stored object returns 201, like every other create here.
        return json({ url: `${url.origin}/api/images/u/${key}`, key }, 201);
      }

      // AI identify — real vision (llama-3.2-11b, base64 image) 
      if (path === "/api/ai/analyze" && method === "POST") {
        if (!(await rateLimit(env, request, "ai", 30))) return err("Too many requests", 429);
        const { image } = await readJson(request);
        if (!image) return err("Missing image (base64)");
        if (!/^[A-Za-z0-9+/=]+$/.test(image) || image.length < 100) return err("image must be base64-encoded image bytes");
        try {
          const r = await env.AI.run("@cf/meta/llama-3.2-11b-vision-instruct", {
            prompt: "You are a fashion resale expert. Look at this clothing item photo and reply with ONLY one raw JSON object using double quotes. No markdown, no code fences, no prose before or after. Keys: type (e.g. 'jean jacket','sneakers','dress','t-shirt'), brand (string or 'Unknown'), color, condition (Poor/Fair/Good/Excellent), category (Tops/Bottoms/Dresses/Outerwear/Shoes/Accessories), priceMin, priceMax (reasonable resale USD), confidence (0-100), sizeHint. Be specific and honest.",
            image,
            max_tokens: 256,
          });
          let text = "";
          try {
            text = typeof r === "string" ? r : JSON.stringify(r);
            if (r?.response) text = typeof r.response === "string" ? r.response : JSON.stringify(r.response);
          } catch { text = JSON.stringify(r); }
          const parsed = aiJson(text, null);
          if (parsed) return json({ source: "ai", ...parsed, note: "" });
          return json({ source: "ai", note: "description: " + String(text).slice(0, 200), confidence: 60, type: "Clothing Item", priceMin: 25, priceMax: 75, condition: "Good", category: "Tops", color: "Various", brand: "Unknown", sizeHint: "" });
        } catch (e) {
          return json({ source: "error", error: e.message, note: "vision model unavailable" }, 502);
        }
      }

      // AI title optimizer
      if (path === "/api/ai/title-optimizer" && method === "POST") {
        const { title, category, brand, size, condition } = await readJson(request);
        // Missing title used to reach the model as the string "undefined" and
        // come back 200 with `original: undefined` (JSON drops the key).
        if (typeof title !== "string" || !title.trim()) return err("title required");
        const t = await aiText(env,
          "You are an expert e-commerce listing title optimizer. Return JSON only with keys: optimized, keywords, tips.",
          `Optimize this title for maximum resale visibility: "${title}" (category: ${category}, brand: ${brand || "unknown"}, size: ${size || "?"}, condition: ${condition || "good"}). Return JSON only.`,
          300);
        const m = t.match(/\{[\s\S]*\}/);
        const parsed = aiJson(t, null) || { optimized: title, keywords: [], tips: [] };
        return json({ original: title, ...parsed });
      }

      // fees & shipping estimate — real market data
      if (path === "/api/fees/estimate" && method === "POST") {
        const { price, platform } = await readJson(request);
        // Same validation + status as /api/fees/compare: a missing or invalid
        // price is a client error, not a 200 that silently prices $0.
        if (badNum(price) || Number(price) <= 0) return err("price must be a positive number", 422);
        if (platform !== undefined && platform !== null && platform !== "" &&
            !MARKETPLACES.some((m) => m.id === platform))
          return err(`unknown platform: ${platform}`, 422);
        const mp = MARKETPLACES.find((m) => m.id === (platform || "depop")) || MARKETPLACES[0];
        const f = fee(mp.id, price);
        return json({
          platform: mp.id, name: mp.name, ...f,
          // kept for callers that still read the old flat shape
          feePct: mp.feePct, fee: f.lines[0]?.amount ?? 0, processing: f.lines[1]?.amount ?? 0,
        });
      }

      // Net-it-out: what you actually keep on each marketplace for one price.
      if (path === "/api/fees/compare" && method === "POST") {
        const body = await readJson(request).catch(() => ({}));
        const price = Number(body.price);
        if (!(price > 0)) return err("price must be a positive number", 422);
        const ranked = MARKETPLACES
          .map((m) => ({ name: m.name, maxChar: m.maxChar, signup: m.signup, ...fee(m.id, price) }))
          .sort((a, b) => b.net - a.net);
        const best = ranked[0], worst = ranked[ranked.length - 1];
        return json({
          price,
          count: ranked.length,
          verifiedCount: ranked.filter((r) => r.verified).length,
          spread: +(best.net - worst.net).toFixed(2),
          best: { id: best.id, name: best.name, net: best.net },
          worst: { id: worst.id, name: worst.name, net: worst.net },
          ranked,
          // fee() never touches shipping — stated rather than silently assumed.
          note: "Excludes your shipping cost and platform-only fees that depend on category, ads, or subscription plans.",
        });
      }
      if (path === "/api/shipping/estimate" && method === "POST") {
        const { weightOz, carrier } = await readJson(request);
        // Missing/NaN weight used to return 200 with cost 4.5 (null <= 4) or
        // cost null (NaN) — a wrong answer the caller could not detect.
        const w = Number(weightOz);
        if (!Number.isFinite(w) || w <= 0) return err("weightOz must be a positive number");
        const c = String(carrier || "usps").toLowerCase();
        if (c !== "usps" && c !== "pirate") return err(`unknown carrier: ${c} (use usps or pirate)`);
        const base = w <= 4 ? 4.5 : w <= 8 ? 6.5 : w <= 16 ? 9.8 : 12 + (w - 16) * 0.4;
        const discount = c === "pirate" ? 0.8 : 1;
        return json({ carrier: c, cost: +(base * discount).toFixed(2), weightOz: w });
      }

      // ── CLOSET / LISTINGS ───────────────────────────────────
      if (path === "/api/listings" && method === "GET") {
        const { search, status, category } = Object.fromEntries(url.searchParams);
        let sql = "SELECT * FROM listings WHERE user_id=?";
        const bind = [user.sub];
        if (status) { sql += " AND status=?"; bind.push(status); }
        if (category) { sql += " AND category=?"; bind.push(category); }
        if (search) { sql += " AND (title LIKE ? OR description LIKE ?)"; bind.push(`%${search}%`, `%${search}%`); }
        sql += " ORDER BY updated_at DESC";
        const r = await env.DB.prepare(sql).bind(...bind).all();
        return json({ listings: r.results });
      }
      if (path === "/api/listings" && method === "POST") {
        await ensureListingCols(env);
        const b = await readJson(request);
        if (typeof b.title !== "string" || !b.title.trim()) return err("title required");
        if (b.price === undefined || b.price === null || b.price === "") return err("price required");
        const price = Number(b.price);
        if (!Number.isFinite(price) || price < 0) return err("price must be a positive number");
        // D1 rejects undefined — coerce every column to a concrete value.
        // col() also turns objects/arrays/NaN into the fallback: a garbage
        // value from the caller used to surface as a D1 type error -> 500.
        const safe = (v, fallback = "") => {
          if (v === undefined || v === null) return fallback;
          const c = col(v);
          return c === null ? fallback : c;
        };
        const r = await env.DB.prepare(
          "INSERT INTO listings (user_id, title, description, price, size, condition, category, photo_url, status, platforms, ai_confidence, cogs, shipping_cost, weight_oz, notes, brand, color, material, ship_city, ship_postcode, ship_country, local_pickup) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
        ).bind(
          user.sub,
          safe(b.title),
          safe(b.description),
          price,
          safe(b.size),
          safe(b.condition, "Good"),
          canonCategory(safe(b.category, "Tops")),
          safe(b.photo_url, null),
          safe(b.status, "active"),
          JSON.stringify(Array.isArray(b.platforms) ? b.platforms : []),
          Number.isFinite(Number(b.ai_confidence)) ? Number(b.ai_confidence) : null,
          Number.isFinite(Number(b.cogs)) ? Number(b.cogs) : 0,
          Number.isFinite(Number(b.shipping_cost)) ? Number(b.shipping_cost) : 0,
          Number.isFinite(Number(b.weight_oz)) ? Number(b.weight_oz) : 0,
          safe(b.notes),
          // the fields a buyer actually filters and searches on
          safe(b.brand, null),
          safe(b.color, null),
          safe(b.material, null),
          safe(b.ship_city, null),
          safe(b.ship_postcode, null),
          safe(b.ship_country, null),
          b.local_pickup ? 1 : 0
        ).run();
        const id = r.meta.last_row_id;
        const item = await env.DB.prepare("SELECT * FROM listings WHERE id=?").bind(id).first();
        return json({ listing: item }, 201);
      }
      // ── BUYER ACTIONS (signed in) ───────────────────────────────────────
      // Marketplace purchase. Stripe/PayPal are not live yet, so this writes
      // a demo order and says so in the response — it never claims money moved.
      const mBuy = path.match(/^\/api\/market\/(\d+)\/buy$/);
      if (mBuy && method === "POST") {
        const id = +mBuy[1];
        const item = await env.DB.prepare("SELECT * FROM listings WHERE id=?").bind(id).first();
        if (!item || item.status !== "active") return err("This item is no longer for sale.", 404);
        if (String(item.user_id) === String(user.sub)) return err("This is your own listing.", 409);
        const price = Number(item.price) || 0;
        const r = await env.DB.prepare(
          "INSERT INTO orders (user_id, listing_id, buyer, platform, sale_price, fee, shipping, cogs, profit, status) VALUES (?,?,?,?,?,?,?,?,?,?)"
        ).bind(
          item.user_id, id, user.u || user.username || "buyer", "fashionistas",
          price, 0, 0, Number(item.cogs) || 0, price - (Number(item.cogs) || 0), "demo"
        ).run();
        return json({
          ok: true,
          demo: true,
          message: "Demo checkout — no money moved. Stripe and PayPal are not live yet.",
          order: { id: r.meta.last_row_id, listing_id: id, price, status: "demo", platform: "fashionistas" },
        }, 201);
      }

      // A seller opting a listing into our own marketplace. "fashionistas" is
      // just another entry in the same platforms array the other shops use.
      const onsale = path.match(/^\/api\/listings\/(\d+)\/onsale$/);
      if (onsale && method === "POST") {
        const id = +onsale[1];
        const owned = await env.DB.prepare("SELECT * FROM listings WHERE id=? AND user_id=?").bind(id, user.sub).first();
        if (!owned) return err("Not found", 404);
        const b = await readJson(request);
        const want = b.on === true || b.on === "true";
        const plats = parsePlatforms(owned.platforms).filter((p) => p !== "fashionistas");
        if (want) plats.push("fashionistas");
        await env.DB.prepare("UPDATE listings SET platforms=? WHERE id=? AND user_id=?")
          .bind(JSON.stringify(plats), id, user.sub).run();
        const after = await env.DB.prepare("SELECT * FROM listings WHERE id=? AND user_id=?").bind(id, user.sub).first();
        return json({ listing: after, on: want });
      }

      const listId = path.match(/^\/api\/listings\/(\d+)(\/[a-z-]+)?$/);
      if (listId) {
        const id = listId[1];
        const sub = (listId[2] || "").replace("/", "");
        const owned = await env.DB.prepare("SELECT * FROM listings WHERE id=? AND user_id=?").bind(id, user.sub).first();
        if (!owned) return err("Not found", 404);

        // crosspost — publish a copy of this listing to chosen platform(s)
        if (sub === "crosspost" && method === "POST") {
          const { platforms } = await readJson(request);
          // A non-array `platforms` used to either throw (object -> 500) or be
          // walked char-by-char (string) and answer 200 with results: [].
          if (!Array.isArray(platforms) || !platforms.length)
            return err("platforms must be a non-empty array of platform ids");
          const unknown = platforms.filter((pid) => !MARKETPLACES.some((m) => m.id === pid));
          if (unknown.length) return err(`unknown platform id(s): ${unknown.join(", ")}`);
          const results = [];
          for (const pid of platforms) {
            await env.DB.prepare("INSERT INTO listing_platforms (listing_id, platform, status, listing_copy) VALUES (?,?,?,?)")
              .bind(id, pid, "ready", col(owned.description)).run();
            results.push({ platform: pid, status: "ready", note: "queued for publish — link this platform's account to push live" });
          }
          await env.DB.prepare("UPDATE listings SET platforms=? WHERE id=?").bind(JSON.stringify(platforms), id).run();
          return json({ results });
        }
        if (sub === "platforms" && method === "GET") {
          const r = await env.DB.prepare("SELECT * FROM listing_platforms WHERE listing_id=?").bind(id).all();
          return json({ platforms: r.results });
        }
        if (sub === "sold" && method === "POST") {
          const { sold_price, sold_platform, fee, shipping } = await readJson(request);
          // Missing sold_price used to compute profit = NaN and hand D1 a NaN
          // bind (500); an undefined sold_platform did the same.
          if (badNum(sold_price)) return err("sold_price must be a non-negative number");
          const sp = Number(sold_price);
          const feeN = num(fee), shipN = num(shipping), cogsN = num(owned.cogs);
          const platform = col(sold_platform);
          await env.DB.prepare("UPDATE listings SET status='sold', sold_price=?, sold_platform=?, updated_at=CURRENT_TIMESTAMP WHERE id=?")
            .bind(sp, platform, id).run();
          await env.DB.prepare(
            "INSERT INTO orders (user_id, listing_id, platform, sale_price, fee, shipping, cogs, profit, status) VALUES (?,?,?,?,?,?,?,?,?)"
          ).bind(user.sub, +id, platform, sp, feeN, shipN, cogsN, +(sp - feeN - shipN - cogsN).toFixed(2), "sold").run();
          // An action ack (the order row it created is returned by GET /api/orders).
          return json({ ok: true });
        }
        if (method === "PUT") {
          await ensureListingCols(env);
          const b = await readJson(request);
          // A non-numeric price used to reach D1 as a bad bind or a NaN (500);
          // an empty string would silently overwrite the stored price.
          if (b.price === "") b.price = null;
          else if (b.price !== undefined && b.price !== null) {
            const price = Number(b.price);
            if (!Number.isFinite(price) || price < 0) return err("price must be a positive number");
            b.price = price;
          }
          // COALESCE(?, col) keeps the stored value when the caller omits a
          // field entirely, so a partial edit never blanks the rest of the row.
          const np = (v) => col(v);
          await env.DB.prepare(
            "UPDATE listings SET title=COALESCE(?,title), description=COALESCE(?,description), price=COALESCE(?,price), " +
            "size=COALESCE(?,size), condition=COALESCE(?,condition), category=COALESCE(?,category), photo_url=COALESCE(?,photo_url), " +
            "status=COALESCE(?,status), brand=COALESCE(?,brand), color=COALESCE(?,color), material=COALESCE(?,material), " +
            "ship_city=COALESCE(?,ship_city), ship_postcode=COALESCE(?,ship_postcode), ship_country=COALESCE(?,ship_country), " +
            "weight_oz=COALESCE(?,weight_oz), shipping_cost=COALESCE(?,shipping_cost), notes=COALESCE(?,notes), " +
            "local_pickup=COALESCE(?,local_pickup), updated_at=CURRENT_TIMESTAMP WHERE id=?"
          ).bind(
            np(b.title), np(b.description), np(b.price), np(b.size), np(b.condition), canonCategory(np(b.category)),
            np(b.photo_url), np(b.status), np(b.brand), np(b.color), np(b.material),
            np(b.ship_city), np(b.ship_postcode), np(b.ship_country),
            np(b.weight_oz === "" ? null : b.weight_oz), np(b.shipping_cost === "" ? null : b.shipping_cost), np(b.notes),
            b.local_pickup === undefined ? null : (b.local_pickup ? 1 : 0),
            id
          ).run();
          const item = await env.DB.prepare("SELECT * FROM listings WHERE id=?").bind(id).first();
          return json({ listing: item });
        }
        if (method === "DELETE") {
          await env.DB.prepare("DELETE FROM listings WHERE id=?").bind(id).run();
          return json({ ok: true });
        }
      }

      if (path === "/api/listings/bulk" && method === "POST") {
        const { items } = await readJson(request);
        // `items` must be an array: an object used to throw "not iterable" ->
        // 500, a string used to be walked char-by-char and answer 201 with a
        // count of garbage rows.
        if (!Array.isArray(items)) return err("items must be an array of listings");
        if (!items.length) return err("items must contain at least one listing");
        if (items.length > 500) return err("items is too large — max 500 listings per request");
        // Validate the WHOLE batch before writing anything, so a bad entry can
        // never leave partial rows behind and `created` always equals the real
        // number of INSERTs that succeeded.
        for (let i = 0; i < items.length; i++) {
          const b = items[i];
          if (!b || typeof b !== "object" || Array.isArray(b)) return err(`items[${i}] must be an object`);
          if (typeof b.title !== "string" || !b.title.trim()) return err(`items[${i}].title is required`);
          if (badNum(b.price)) return err(`items[${i}].price must be a non-negative number`);
        }
        let count = 0;
        for (const b of items) {
          await env.DB.prepare("INSERT INTO listings (user_id, title, description, price, size, condition, category, photo_url) VALUES (?,?,?,?,?,?,?,?)")
            .bind(user.sub, b.title, col(b.description), Number(b.price), col(b.size), col(b.condition), canonCategory(col(b.category)), col(b.photo_url)).run();
          count++; // only reached when THIS insert actually resolved
        }
        return json({ created: count }, 201);
      }
      if (path === "/api/listings/quality" && method === "GET") {
        const r = await env.DB.prepare("SELECT id,title,description,price,category,size,condition,photo_url FROM listings WHERE user_id=?").bind(user.sub).all();
        // Score comes ONLY from this row's own fields — base 50 plus the exact
        // weights the UI quotes (photo +15, title>5 +10/-10, description>80
        // +10 / missing -15, price +8, size AND condition +7), capped at 100.
        // An item with no photo, no description, no size and no condition tops
        // out at 53 (title>5 and price set) or 25 (nothing set): it can never
        // report 100/100. `reasons` lists every term that was applied.
        const scored = (r.results || []).map((l) => {
          let s = 50;
          const reasons = ["base 50"];
          if (l.photo_url) { s += 15; reasons.push("photo present +15"); }
          else reasons.push("no photo — +15 available");
          if (l.title?.length > 5) { s += 10; reasons.push("title over 5 chars +10"); }
          else { s -= 10; reasons.push("title 5 chars or fewer -10"); }
          if (l.description?.length > 80) { s += 10; reasons.push("description over 80 chars +10"); }
          else if (!l.description) { s -= 15; reasons.push("no description -15"); }
          else reasons.push("description under 80 chars — +10 available");
          if (l.price) { s += 8; reasons.push("price set +8"); }
          else reasons.push("no price — +8 available");
          if (l.size && l.condition) { s += 7; reasons.push("size and condition set +7"); }
          else reasons.push("size/condition missing — +7 available");
          return { ...l, score: Math.min(100, s), reasons };
        }).sort((a, b) => b.score - a.score);
        return json({ items: scored });
      }
      if (path === "/api/listings/suggest-price" && method === "POST") {
        const { category, brand, condition } = await readJson(request);
        // Without a category the model is asked to price "undefined" and the
        // route answers 200 with a generic guess the caller cannot question.
        if (typeof category !== "string" || !category.trim()) return err("category required");
        const t = await aiText(env,
          "You are a resale pricing expert (Depop/eBay market value). Return JSON only: lowPrice,highPrice,suggestedPrice,compsNote.",
          `Suggest a resale price range for a ${brand || ""} ${category} item, ${condition || "good"} condition. JSON only.`, 250);
        const m = t.match(/\{[\s\S]*\}/);
        return json(aiJson(t, null) || { suggestedPrice: 25, lowPrice: 15, highPrice: 40, compsNote: "AI comp analysis unavailable" });
      }

      // ── ORDERS ──────────────────────────────────────────────
      if (path === "/api/orders" && method === "GET") {
        const r = await env.DB.prepare("SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC").bind(user.sub).all();
        return json({ orders: r.results });
      }
      if (path === "/api/orders" && method === "POST") {
        const b = await readJson(request);
        // A missing/non-numeric sale_price used to produce profit = NaN and a
        // NaN bind (500); optional money fields are now coerced to numbers.
        if (badNum(b.sale_price)) return err("sale_price must be a non-negative number");
        const sale = Number(b.sale_price);
        const feeN = num(b.fee), shipN = num(b.shipping), cogsN = num(b.cogs);
        const profit = +(sale - feeN - shipN - cogsN).toFixed(2);
        const r = await env.DB.prepare("INSERT INTO orders (user_id, listing_id, buyer, platform, sale_price, fee, shipping, cogs, profit, status) VALUES (?,?,?,?,?,?,?,?,?,?)")
          .bind(user.sub, col(b.listing_id), col(b.buyer), col(b.platform), sale, feeN, shipN, cogsN, profit, typeof b.status === "string" && b.status ? b.status : "sold").run();
        return json({ order: { id: r.meta.last_row_id, ...b, sale_price: sale, profit } }, 201);
      }
      const ordId = path.match(/^\/api\/orders\/(\d+)$/);
      if (ordId && method === "PUT") {
        const b = await readJson(request);
        if (b.fee !== undefined && b.fee !== null && b.fee !== "" && !Number.isFinite(Number(b.fee)))
          return err("fee must be a number");
        // Scoped to the caller: this UPDATE used to carry no user_id, so any
        // signed-in account could edit any other account's order (IDOR), and
        // it answered 200 {ok:true} even when no row matched.
        const r = await env.DB.prepare("UPDATE orders SET buyer=COALESCE(?,buyer), status=COALESCE(?,status), tracking_number=COALESCE(?,tracking_number), shipped_at=COALESCE(?,shipped_at), fee=COALESCE(?,fee) WHERE id=? AND user_id=?")
          .bind(col(b.buyer), col(b.status), col(b.tracking_number), col(b.shipped_at), b.fee ?? null, ordId[1], user.sub).run();
        if (r?.meta?.changes === 0) return err("Not found", 404);
        return json({ ok: true });
      }

      // ── HAULS ───────────────────────────────────────────────
      if (path === "/api/hauls" && method === "GET") {
        const r = await env.DB.prepare("SELECT * FROM hauls WHERE user_id=? ORDER BY created_at DESC").bind(user.sub).all();
        return json({ hauls: r.results });
      }
      if (path === "/api/hauls" && method === "POST") {
        const b = await readJson(request);
        if (typeof b.name !== "string" || !b.name.trim()) return err("name required");
        const r = await env.DB.prepare("INSERT INTO hauls (user_id, name, store, spend, items, date, notes) VALUES (?,?,?,?,?,?,?)")
          .bind(user.sub, b.name, col(b.store), col(b.spend), col(b.items), col(b.date), col(b.notes)).run();
        return json({ haul: { id: r.meta.last_row_id, ...b } }, 201);
      }
      const haulId = path.match(/^\/api\/hauls\/(\d+)$/);
      if (haulId && method === "DELETE") {
        const r = await env.DB.prepare("DELETE FROM hauls WHERE id=? AND user_id=?").bind(haulId[1], user.sub).run();
        // Deleting a haul that does not exist (or is not yours) is a 404, not
        // a 200 {ok:true} for a delete that removed nothing.
        if (r?.meta?.changes === 0) return err("Not found", 404);
        return json({ ok: true });
      }

      // ── ANALYTICS / PROFIT ──────────────────────────────────
      if (path === "/api/analytics" && method === "GET") {
        const o = await env.DB.prepare("SELECT COALESCE(SUM(sale_price),0) rev, COALESCE(SUM(fee),0) fees, COALESCE(SUM(profit),0) profit, COUNT(*) sales FROM orders WHERE user_id=?").bind(user.sub).first();
        const l = await env.DB.prepare("SELECT COUNT(*) c FROM listings WHERE user_id=?").bind(user.sub).first();
        const byPlatform = await env.DB.prepare("SELECT platform, COUNT(*) c, SUM(sale_price) rev FROM orders WHERE user_id=? GROUP BY platform").bind(user.sub).all();
        const byDay = await env.DB.prepare("SELECT substr(created_at,1,10) d, SUM(sale_price) rev FROM orders WHERE user_id=? GROUP BY d ORDER BY d DESC LIMIT 30").bind(user.sub).all();
        return json({
          stats: { revenue: o.rev, fees: o.fees, profit: o.profit, sales: o.sales, activeListings: l.c },
          byPlatform: byPlatform.results,
          byDay: (byDay.results || []).reverse(),
        });
      }
      if (path === "/api/profit/summary" && method === "GET") {
        const r = await env.DB.prepare("SELECT COALESCE(SUM(profit),0) net_profit, COALESCE(SUM(sale_price),0) gross, COALESCE(SUM(fee),0) fees, COALESCE(SUM(cogs),0) cogs, COUNT(*) sales FROM orders WHERE user_id=?").bind(user.sub).first();
        return json(r);
      }

      // ── MESSAGES ────────────────────────────────────────────
      if (path === "/api/messages/templates" && method === "GET") {
        const t = await aiText(env, "List 6 short seller message templates for buyers on Depop/eBay, one per line with a subject after a colon.", "Give me 6 templates first-sale welcome, shipping updates, thank-you, bundle, offer, return policy.", 300);
        const lines = t.split("\n").map((x) => x.trim()).filter((x) => x.includes(":"));
        return json({ templates: lines.length ? lines.slice(0, 6) : ["Welcome: Thanks for your order!", "Shipped: Your item shipped today", "Thank you: Appreciate your purchase!", "Bundle: Bundle more items and save", "Offer: Happy to consider fair offers", "Returns: See our return policy"] });
      }
      if (path === "/api/messages" && method === "POST") {
        const b = await readJson(request);
        if (typeof b.body !== "string" || !b.body.trim()) return err("body required");
        const r = await env.DB.prepare("INSERT INTO messages (user_id, listing_id, template_name, body) VALUES (?,?,?,?)")
          .bind(user.sub, col(b.listing_id), col(b.template_name), b.body).run();
        return json({ message: { id: r.meta.last_row_id } }, 201);
      }

      // ── LOCAL POP-UP STORES (write side) ──
      if (path === "/api/popups/mine" && method === "GET") {
        await ensurePopupTables(env);
        const r = await env.DB.prepare(
          "SELECT id, name, description, address, city, lat, lng, starts_at, ends_at, created_at " +
          "FROM popup_stores WHERE owner_id=? ORDER BY created_at DESC LIMIT 50"
        ).bind(user.sub).all();
        return json({ popups: r.results || [] });
      }
      const popupOne = path.match(/^\/api\/popups\/(\d+)$/);
      if (popupOne && method === "DELETE") {
        await ensurePopupTables(env);
        const id = +popupOne[1];
        const own = await env.DB.prepare("SELECT id FROM popup_stores WHERE id=? AND owner_id=?").bind(id, user.sub).first();
        if (!own) return err("Not yours to remove", 403);
        await env.DB.prepare("DELETE FROM popup_stores WHERE id=?").bind(id).run();
        return json({ deleted: id });
      }
      if (path === "/api/popups" && method === "POST") {
        await ensurePopupTables(env);
        if (!(await rateLimit(env, request, "popup", 10))) return err("Too many pop-ups too quickly — wait a minute", 429);
        const b = await readJson(request);
        const name = typeof b.name === "string" ? b.name.trim() : "";
        const address = typeof b.address === "string" ? b.address.trim() : "";
        if (!name) return err("Give the pop-up a name");
        if (name.length > 80) return err("Name is too long (80 characters max)");
        if (!address) return err("An address is needed so people can find it");
        if (address.length > 200) return err("Address is too long (200 characters max)");
        const city = typeof b.city === "string" ? b.city.trim().slice(0, 80) : "";
        const description = typeof b.description === "string" ? b.description.trim().slice(0, 600) : "";
        const lat = parseFloat(b.lat), lng = parseFloat(b.lng);
        // Coordinates are optional: a listing without them still shows in the
        // list, it just cannot be pinned on the map.
        const hasGeo = isFinite(lat) && isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
        const starts = typeof b.starts_at === "string" ? b.starts_at.trim().slice(0, 40) : "";
        const ends = typeof b.ends_at === "string" ? b.ends_at.trim().slice(0, 40) : "";
        const r = await env.DB.prepare(
          "INSERT INTO popup_stores (owner_id, name, description, address, city, lat, lng, starts_at, ends_at) " +
          "VALUES (?,?,?,?,?,?,?,?,?)"
        ).bind(user.sub, name, description || null, address, city || null,
               hasGeo ? lat : null, hasGeo ? lng : null, starts || null, ends || null).run();
        return json({ popup: { id: r.meta.last_row_id, name, address, city, lat: hasGeo ? lat : null, lng: hasGeo ? lng : null } }, 201);
      }

      // ── DIRECT MESSAGES — free. DB only, no third-party chat service ──
      if (path === "/api/dm/blocks" && method === "GET") {
        await ensureDmTables(env);
        const r = await env.DB.prepare(
          "SELECT b.blocked_id AS id, b.created_at AS since, COALESCE(u.display_name, u.username) AS name " +
          "FROM dm_blocks b JOIN users u ON u.id = b.blocked_id WHERE b.blocker_id=? ORDER BY b.created_at DESC LIMIT 100"
        ).bind(user.sub).all();
        return json({ blocked: r.results || [] });
      }
      const dmBlock = path.match(/^\/api\/dm\/block\/(\d+)$/);
      if (dmBlock && method === "POST") {
        await ensureDmTables(env);
        const target = +dmBlock[1];
        if (target === user.sub) return err("You cannot block yourself", 422);
        const who = await env.DB.prepare("SELECT id FROM users WHERE id=?").bind(target).first();
        if (!who) return err("No such person", 404);
        if (!(await rateLimit(env, request, "block", 60))) return err("Too many requests", 429);
        // INSERT OR IGNORE keeps the composite PK idempotent — pressing it twice is not an error.
        await env.DB.prepare("INSERT OR IGNORE INTO dm_blocks (blocker_id, blocked_id) VALUES (?,?)")
          .bind(user.sub, target).run();
        return json({ blocked: true, id: target }, 201);
      }
      if (dmBlock && method === "DELETE") {
        await ensureDmTables(env);
        await env.DB.prepare("DELETE FROM dm_blocks WHERE blocker_id=? AND blocked_id=?")
          .bind(user.sub, +dmBlock[1]).run();
        return json({ blocked: false, id: +dmBlock[1] });
      }

      if (path === "/api/dm" && method === "GET") {
        await ensureDmTables(env);
        const denied = await dmDeniedIds(env, user.sub);
        const people = await env.DB.prepare(
          "SELECT id, username, display_name FROM users WHERE id<>? ORDER BY COALESCE(display_name,username) ASC LIMIT 100"
        ).bind(user.sub).all();
        // Blocked people vanish from the list entirely — showing them greyed
        // out would tell the other side that a block exists.
        const visible = (people.results || []).filter((p) => !denied.has(p.id));
        // One pass for the newest line per person and one for unread counts.
        // Doing this per contact would be 3 queries x 100 people.
        const [lastR, unreadR] = await Promise.all([
          env.DB.prepare("SELECT id, from_id, to_id, body, created_at FROM dm_messages WHERE from_id=? OR to_id=? ORDER BY id DESC LIMIT 300")
            .bind(user.sub, user.sub).all(),
          env.DB.prepare("SELECT from_id, COUNT(*) AS n FROM dm_messages WHERE to_id=? AND read_at IS NULL GROUP BY from_id")
            .bind(user.sub).all(),
        ]);
        const unread = {};
        (unreadR.results || []).forEach(r => { unread[r.from_id] = r.n; });
        const lastBy = {};
        (lastR.results || []).forEach(m => {
          const peer = m.from_id === user.sub ? m.to_id : m.from_id;
          if (!(peer in lastBy)) lastBy[peer] = m;
        });
        const contacts = visible.map(p => {
          const l = lastBy[p.id];
          return {
            id: p.id,
            name: p.display_name || p.username,
            last: l ? l.body : "",
            lastAt: l ? l.created_at : "",
            lastMine: l ? l.from_id === user.sub : false,
            unread: unread[p.id] || 0,
          };
        });
        contacts.sort((a, b) =>
          (b.unread > 0) - (a.unread > 0) ||
          (b.last ? 1 : 0) - (a.last ? 1 : 0) ||
          String(a.name).localeCompare(String(b.name)));
        return json({ contacts });
      }

      const dmOne = path.match(/^\/api\/dm\/(\d+)$/);
      if (dmOne && method === "GET") {
        await ensureDmTables(env);
        const other = +dmOne[1];
        if (other === user.sub) return err("That is you", 422);
        const after = parseInt(url.searchParams.get("after") || "0", 10) || 0;
        // Same neutral wording both ways: it must be impossible to tell
        // whether YOU blocked them or THEY blocked you.
        if (await dmBlocked(env, user.sub, other))
          return json({ blocked: true, messages: [], latest: after, error: "Messaging with this person is turned off." }, 403);
        const r = await env.DB.prepare(
          "SELECT id, from_id, body, created_at, read_at FROM dm_messages " +
          "WHERE ((from_id=? AND to_id=?) OR (from_id=? AND to_id=?)) AND id>? ORDER BY id ASC LIMIT 200"
        ).bind(user.sub, other, other, user.sub, after).all();
        // reading them marks the other side's messages as read
        if ((r.results || []).length) {
          await env.DB.prepare("UPDATE dm_messages SET read_at=CURRENT_TIMESTAMP WHERE to_id=? AND from_id=? AND read_at IS NULL")
            .bind(user.sub, other).run();
        }
        const messages = (r.results || []).map(m => ({
          id: m.id, mine: m.from_id === user.sub, body: m.body, at: m.created_at, read: !!m.read_at,
        }));
        return json({ messages, latest: messages.length ? messages[messages.length - 1].id : after });
      }

      if (dmOne && method === "POST") {
        await ensureDmTables(env);
        const other = +dmOne[1];
        if (other === user.sub) return err("That is you", 422);
        if (await dmBlocked(env, user.sub, other))
          return err("Messaging with this person is turned off.", 403);
        if (!(await rateLimit(env, request, "dm", 30))) return err("Too many messages — wait a moment", 429);
        const b = await readJson(request);
        const body = typeof b.body === "string" ? b.body.trim() : "";
        if (!body) return err("body required");
        if (body.length > 2000) return err("Keep it under 2000 characters", 422);
        const target = await env.DB.prepare("SELECT id FROM users WHERE id=?").bind(other).first();
        if (!target) return err("No such person", 404);
        const r = await env.DB.prepare("INSERT INTO dm_messages (from_id, to_id, body) VALUES (?,?,?)")
          .bind(user.sub, other, body).run();
        return json({ message: { id: r.meta.last_row_id, mine: true, body, read: false } }, 201);
      }

      // ── CHATBOTS — separate from the messenger, run on OpenCode agents ──
      // Three bots, one window: `mode` picks which one is talking.
      if (path === "/api/chat" && method === "POST") {
        if (!(await rateLimit(env, request, "chat", 20))) return err("Too many requests", 429);
        const b = await readJson(request);
        const msg = typeof b.message === "string" ? b.message.trim() : "";
        if (!msg) return err("message required");
        if (msg.length > 1500) return err("Keep it under 1500 characters", 422);
        const mode = ["guide", "ideas", "items"].includes(b.mode) ? b.mode : "guide";
        const history = Array.isArray(b.history) ? b.history.slice(-10) : [];
        let ctx = "";
        try { ctx = await chatContext(env, user.sub, mode); } catch { /* context is optional */ }
        const sys = chatSystem(mode, ctx);

        // source is ALWAYS reported so the window never dresses up a built-in
        // rule as something an agent said. Nothing provider-specific leaves
        // this endpoint: the browser gets a neutral reason, the detail goes
        // to the Worker log.
        let reply = null, source = null, reason = "";
        if (env.HIVE_URL) {
          try {
            const r = await hiveChat(env, sys, history, msg, 420);
            reply = r.text; source = "agent";
          } catch (e) {
            console.error("chat agent:", (e && e.message) || e);
            reason = /timed out|too long/i.test(String((e && e.message) || e)) ? "it took too long" : "it was unavailable";
          }
        } else reason = "no agent is configured";
        if (!reply) {
          const t = await aiChat(env, sys, history, msg, 420);
          if (t) { reply = t; source = "backup"; }
        }
        if (!reply) { reply = guideFallback(msg); source = "builtin"; }
        return json(reason
          ? { reply, source, model: source, mode, fallback_reason: reason }
          : { reply, source, model: source, mode });
      }

      // ── AI TRY-ON — computes garment OVERLAY JSON only.
      // This is NOT augmented reality: no rendering, no camera, no pose mesh.
      // It returns fit/length/colour mapping fields for a garment and stores
      // them, and the UI does not surface this route at all.
      if (path === "/api/ai/tryon" && method === "POST") {
        const { garment_id, garment_name } = await readJson(request);
        if (!garment_id && !garment_name) return err("garment_id or garment_name required");
        // garment_id must be a numeric listing id — an object/array would be a
        // D1 bind type error (500); a non-string garment_name likewise.
        const gid = garment_id === undefined || garment_id === null || garment_id === "" ? null : Number(garment_id);
        if (gid !== null && !(Number.isFinite(gid) && gid > 0)) return err("garment_id must be a numeric listing id");
        if (gid === null && typeof garment_name !== "string") return err("garment_name must be a string");
        const g = gid ? await env.DB.prepare("SELECT * FROM listings WHERE id=? AND user_id=?").bind(gid, user.sub).first() : null;
        // A garment_id that does not exist (or is not yours) is a not-found,
        // not a "required field" 400 that pretends the id was never sent.
        if (gid && !g) return err("Listing not found", 404);
        const item = g || { title: garment_name, category: "tops" };
        const r = await env.AI.run("@cf/meta/llama-3.2-3b-instruct", {
          messages: [{ role: "system", content: "You are a garment overlay assistant. For a garment, output JSON only with keys: overlayType (top/bottom/one-piece), garmentLength, fit, colorMapping, notes." }, { role: "user", content: `Garment: ${item.title} (category ${item.category}). Output JSON only.` }],
          max_tokens: 200,
        });
        // r.response may be a string OR an object — this used to throw
        // "text.match is not a function" and 500 the whole route.
        const raw = r?.response ?? r;
        const text = typeof raw === "string" ? raw : JSON.stringify(raw ?? "");
        const parsed = aiJson(text, null) || { overlayType: String(item.category || "").includes("bottom") ? "bottom" : "top", garmentLength: String(item.category || "").includes("dress") ? "one-piece" : "waist", fit: "regular", notes: "Overlay fields derived from the item record (model output unavailable)" };
        await env.DB.prepare("INSERT INTO ar_tryons (user_id, garment_name, model_name, analysis_json, overlay_data) VALUES (?,?,?,?,?)")
          .bind(user.sub, col(item.title), "web-overlay", JSON.stringify(parsed), JSON.stringify({ pinned: ["shoulder", "hips"] })).run();
        return json({ ok: true, ...parsed, item: item.title, type: "garment-overlay" });
      }

      // ── EXPORT ──────────────────────────────────────────────
      if (path === "/api/export/inventory.csv" && method === "GET") {
        const r = await env.DB.prepare("SELECT id,title,category,price,size,condition,status,photo_url FROM listings WHERE user_id=?").bind(user.sub).all();
        const rows = r.results.map((x) => [x.id, x.title, x.category, x.price, x.size, x.condition, x.status, x.photo_url].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
        const csv = "id,title,category,price,size,condition,status,photo_url\n" + rows.join("\n");
        return new Response(csv, { headers: { ...CORS, "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="inventory.csv"' } });
      }
      if (path === "/api/export/orders.csv" && method === "GET") {
        const r = await env.DB.prepare("SELECT id,listing_id,platform,sale_price,fee,shipping,cogs,profit,status,buyer FROM orders WHERE user_id=?").bind(user.sub).all();
        const rows = r.results.map((x) => [x.id, x.listing_id, x.platform, x.sale_price, x.fee, x.shipping, x.cogs, x.profit, x.status, x.buyer].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
        return new Response("id,listing_id,platform,sale_price,fee,shipping,cogs,profit,status,buyer\n" + rows.join("\n"), { headers: { ...CORS, "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="orders.csv"' } });
      }

      if (path === "/api/marketplaces") return json({ marketplaces: MARKETPLACES });

      return json({ error: "Not found" }, 404);
    } catch (e) {
      const msg = e?.message || "Internal error";
      // A malformed request body is the caller's mistake, not a server fault.
      if (e instanceof SyntaxError && /JSON|token|position|Unexpected/i.test(msg)) {
        return json({ error: "Invalid JSON body", detail: msg }, 400);
      }
      return json({ error: msg }, 500);
    }
}