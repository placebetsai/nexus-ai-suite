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

async function hashPassword(pw) {
  const h = await crypto.subtle.digest("SHA-256", enc.encode("fash:" + pw));
  return b64u(h).split("").map((c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join("");
}

async function requireUser(request) {
  const auth = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!auth) return null;
  return await verifyToken(auth);
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
];

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

export default {
  async fetch(request, env) {
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
        const { email, username, password } = await request.json();
        if (!email || !username || !password) return err("email, username, password required");
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
        const { username, password } = await request.json();
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
      const user = await requireUser(request);
      if (!user) return json({ error: "Unauthorized" }, 401);

      // images upload
      if (path === "/api/images/upload" && method === "POST") {
        if (!(await rateLimit(env, request, "upload", 30))) return err("Too many requests", 429);
        const form = await request.formData();
        const file = form.get("file");
        if (!file) return err("No file");
        const key = `${user.sub}/${Date.now()}-${file.name || "img"}`;
        await env.IMAGES.put(`u/${key}`, file.stream(), { httpMetadata: { contentType: file.type || "image/jpeg" } });
        return json({ url: `${url.origin}/api/images/u/${key}`, key });
      }

      // AI identify — real vision (llama-3.2-11b, base64 image) 
      if (path === "/api/ai/analyze" && method === "POST") {
        if (!(await rateLimit(env, request, "ai", 30))) return err("Too many requests", 429);
        const { image } = await request.json();
        if (!image) return err("Missing image (base64)");
        if (!/^[A-Za-z0-9+/=]+$/.test(image) || image.length < 100) return err("image must be base64-encoded image bytes");
        try {
          const r = await env.AI.run("@cf/meta/llama-3.2-11b-vision-instruct", {
            prompt: "You are a fashion resale expert. Look at this clothing item photo and return JSON only (no markdown) with keys: type (e.g. 'jean jacket','sneakers','dress','t-shirt'), brand (string or 'Unknown'), color, condition (Poor/Fair/Good/Excellent), category (Tops/Bottoms/Dresses/Outerwear/Shoes/Accessories), priceMin, priceMax (reasonable resale USD), confidence (0-100), sizeHint. Be specific and honest.",
            image,
            max_tokens: 256,
          });
          let text = "";
          try {
            text = typeof r === "string" ? r : JSON.stringify(r);
            if (r?.response) text = typeof r.response === "string" ? r.response : JSON.stringify(r.response);
          } catch { text = JSON.stringify(r); }
          const m = text.match(/\{[\s\S]*\}/);
          if (m) {
            const parsed = JSON.parse(m[0]);
            return json({ source: "ai", ...parsed, note: "" });
          }
          return json({ source: "ai", note: "description: " + text.slice(0, 200), confidence: 60, type: "Clothing Item", priceMin: 25, priceMax: 75, condition: "Good", category: "Tops", color: "Various", brand: "Unknown", sizeHint: "" });
        } catch (e) {
          return json({ source: "error", error: e.message, note: "vision model unavailable" }, 502);
        }
      }

      // AI title optimizer
      if (path === "/api/ai/title-optimizer" && method === "POST") {
        const { title, category, brand, size, condition } = await request.json();
        const t = await aiText(env,
          "You are an expert e-commerce listing title optimizer. Return JSON only with keys: optimized, keywords, tips.",
          `Optimize this title for maximum resale visibility: "${title}" (category: ${category}, brand: ${brand || "unknown"}, size: ${size || "?"}, condition: ${condition || "good"}). Return JSON only.`,
          300);
        const m = t.match(/\{[\s\S]*\}/);
        const parsed = m ? JSON.parse(m[0]) : { optimized: title, keywords: [], tips: [] };
        return json({ original: title, ...parsed });
      }

      // fees & shipping estimate — real market data
      if (path === "/api/fees/estimate" && method === "POST") {
        const { price, platform } = await request.json();
        const mp = MARKETPLACES.find((m) => m.id === (platform || "depop")) || MARKETPLACES[0];
        const fee = +(price * (mp.feePct / 100)).toFixed(2);
        const processing = +(0.3 + price * 0.029).toFixed(2);
        const net = +(price - fee - processing).toFixed(2);
        return json({ platform: mp.id, feePct: mp.feePct, fee, processing, net, takeRate: +((net / price) * 100).toFixed(1) });
      }
      if (path === "/api/shipping/estimate" && method === "POST") {
        const { weightOz, carrier } = await request.json();
        const base = weightOz <= 4 ? 4.5 : weightOz <= 8 ? 6.5 : weightOz <= 16 ? 9.8 : 12 + (weightOz - 16) * 0.4;
        const discount = carrier === "pirate" ? 0.8 : 1;
        return json({ carrier: carrier || "usps", cost: +(base * discount).toFixed(2), weightOz });
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
        const b = await request.json();
        if (!b || !b.title) return err("title required");
        if (b.price === undefined || b.price === null || b.price === "") return err("price required");
        const price = Number(b.price);
        if (!Number.isFinite(price) || price < 0) return err("price must be a positive number");
        // D1 rejects undefined — coerce every column to a concrete value.
        const safe = (v, fallback = "") => (v === undefined || v === null ? fallback : v);
        const r = await env.DB.prepare(
          "INSERT INTO listings (user_id, title, description, price, size, condition, category, photo_url, status, platforms, ai_confidence, cogs, shipping_cost, weight_oz, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
        ).bind(
          user.sub,
          safe(b.title),
          safe(b.description),
          price,
          safe(b.size),
          safe(b.condition, "Good"),
          safe(b.category, "Tops"),
          safe(b.photo_url, null),
          safe(b.status, "active"),
          JSON.stringify(Array.isArray(b.platforms) ? b.platforms : []),
          Number.isFinite(Number(b.ai_confidence)) ? Number(b.ai_confidence) : null,
          Number.isFinite(Number(b.cogs)) ? Number(b.cogs) : 0,
          Number.isFinite(Number(b.shipping_cost)) ? Number(b.shipping_cost) : 0,
          Number.isFinite(Number(b.weight_oz)) ? Number(b.weight_oz) : 0,
          safe(b.notes)
        ).run();
        const id = r.meta.last_row_id;
        const item = await env.DB.prepare("SELECT * FROM listings WHERE id=?").bind(id).first();
        return json({ listing: item }, 201);
      }
      const listId = path.match(/^\/api\/listings\/(\d+)(\/[a-z-]+)?$/);
      if (listId) {
        const id = listId[1];
        const sub = (listId[2] || "").replace("/", "");
        const owned = await env.DB.prepare("SELECT * FROM listings WHERE id=? AND user_id=?").bind(id, user.sub).first();
        if (!owned) return err("Not found", 404);

        // crosspost — publish a copy of this listing to chosen platform(s)
        if (sub === "crosspost" && method === "POST") {
          const { platforms } = await request.json();
          const results = [];
          for (const pid of platforms || []) {
            const mp = MARKETPLACES.find((m) => m.id === pid);
            if (!mp) continue;
            await env.DB.prepare("INSERT INTO listing_platforms (listing_id, platform, status, listing_copy) VALUES (?,?,?,?)")
              .bind(id, pid, "ready", owned.description).run();
            results.push({ platform: pid, status: "ready", note: "queued for publish — link this platform's account to push live" });
          }
          await env.DB.prepare("UPDATE listings SET platforms=? WHERE id=?").bind(JSON.stringify(platforms || []), id).run();
          return json({ results });
        }
        if (sub === "platforms" && method === "GET") {
          const r = await env.DB.prepare("SELECT * FROM listing_platforms WHERE listing_id=?").bind(id).all();
          return json({ platforms: r.results });
        }
        if (sub === "sold" && method === "POST") {
          const { sold_price, sold_platform, fee, shipping } = await request.json();
          await env.DB.prepare("UPDATE listings SET status='sold', sold_price=?, sold_platform=?, updated_at=CURRENT_TIMESTAMP WHERE id=?")
            .bind(sold_price, sold_platform, id).run();
          await env.DB.prepare(
            "INSERT INTO orders (user_id, listing_id, platform, sale_price, fee, shipping, cogs, profit, status) VALUES (?,?,?,?,?,?,?,?,?)"
          ).bind(user.sub, +id, sold_platform, sold_price, fee || 0, shipping || 0, owned.cogs || 0, +(sold_price - (fee || 0) - (shipping || 0) - (owned.cogs || 0)).toFixed(2), "sold").run();
          return json({ ok: true });
        }
        if (method === "PUT") {
          const b = await request.json();
          await env.DB.prepare("UPDATE listings SET title=COALESCE(?,title), description=COALESCE(?,description), price=COALESCE(?,price), size=COALESCE(?,size), condition=COALESCE(?,condition), category=COALESCE(?,category), photo_url=COALESCE(?,photo_url), status=COALESCE(?,status), updated_at=CURRENT_TIMESTAMP WHERE id=?")
            .bind(b.title ?? null, b.description ?? null, b.price ?? null, b.size ?? null, b.condition ?? null, b.category ?? null, b.photo_url ?? null, b.status ?? null, id).run();
          const item = await env.DB.prepare("SELECT * FROM listings WHERE id=?").bind(id).first();
          return json({ listing: item });
        }
        if (method === "DELETE") {
          await env.DB.prepare("DELETE FROM listings WHERE id=?").bind(id).run();
          return json({ ok: true });
        }
      }

      if (path === "/api/listings/bulk" && method === "POST") {
        const { items } = await request.json();
        let count = 0;
        for (const b of items || []) {
          await env.DB.prepare("INSERT INTO listings (user_id, title, description, price, size, condition, category, photo_url) VALUES (?,?,?,?,?,?,?,?)")
            .bind(user.sub, b.title ?? null, b.description ?? null, b.price ?? null, b.size ?? null, b.condition ?? null, b.category ?? null, b.photo_url ?? null).run();
          count++;
        }
        return json({ created: count }, 201);
      }
      if (path === "/api/listings/quality" && method === "GET") {
        const r = await env.DB.prepare("SELECT id,title,description,price,category,size,condition,photo_url FROM listings WHERE user_id=?").bind(user.sub).all();
        const scored = (r.results || []).map((l) => {
          let s = 50;
          if (l.photo_url) s += 15;
          if (l.title?.length > 5) s += 10; else s -= 10;
          if (l.description?.length > 80) s += 10; else if (!l.description) s -= 15;
          if (l.price) s += 8;
          if (l.size && l.condition) s += 7;
          return { ...l, score: Math.min(100, s) };
        }).sort((a, b) => b.score - a.score);
        return json({ items: scored });
      }
      if (path === "/api/listings/suggest-price" && method === "POST") {
        const { category, brand, condition } = await request.json();
        const t = await aiText(env,
          "You are a resale pricing expert (Depop/eBay market value). Return JSON only: lowPrice,highPrice,suggestedPrice,compsNote.",
          `Suggest a resale price range for a ${brand || ""} ${category} item, ${condition || "good"} condition. JSON only.`, 250);
        const m = t.match(/\{[\s\S]*\}/);
        return json(m ? JSON.parse(m[0]) : { suggestedPrice: 25, lowPrice: 15, highPrice: 40, compsNote: "AI comp analysis unavailable" });
      }

      // ── ORDERS ──────────────────────────────────────────────
      if (path === "/api/orders" && method === "GET") {
        const r = await env.DB.prepare("SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC").bind(user.sub).all();
        return json({ orders: r.results });
      }
      if (path === "/api/orders" && method === "POST") {
        const b = await request.json();
        const profit = +(b.sale_price - (b.fee || 0) - (b.shipping || 0) - (b.cogs || 0)).toFixed(2);
        const r = await env.DB.prepare("INSERT INTO orders (user_id, listing_id, buyer, platform, sale_price, fee, shipping, cogs, profit, status) VALUES (?,?,?,?,?,?,?,?,?,?)")
          .bind(user.sub, b.listing_id ?? null, b.buyer ?? null, b.platform ?? null, b.sale_price ?? 0, b.fee || 0, b.shipping || 0, b.cogs || 0, profit, b.status || "sold").run();
        return json({ order: { id: r.meta.last_row_id, ...b, profit } }, 201);
      }
      const ordId = path.match(/^\/api\/orders\/(\d+)$/);
      if (ordId && method === "PUT") {
        const b = await request.json();
        await env.DB.prepare("UPDATE orders SET buyer=COALESCE(?,buyer), status=COALESCE(?,status), tracking_number=COALESCE(?,tracking_number), shipped_at=COALESCE(?,shipped_at), fee=COALESCE(?,fee) WHERE id=?")
          .bind(b.buyer ?? null, b.status ?? null, b.tracking_number ?? null, b.shipped_at ?? null, b.fee ?? null, ordId[1]).run();
        return json({ ok: true });
      }

      // ── HAULS ───────────────────────────────────────────────
      if (path === "/api/hauls" && method === "GET") {
        const r = await env.DB.prepare("SELECT * FROM hauls WHERE user_id=? ORDER BY created_at DESC").bind(user.sub).all();
        return json({ hauls: r.results });
      }
      if (path === "/api/hauls" && method === "POST") {
        const b = await request.json();
        const r = await env.DB.prepare("INSERT INTO hauls (user_id, name, store, spend, items, date, notes) VALUES (?,?,?,?,?,?,?)")
          .bind(user.sub, b.name, b.store ?? null, b.spend ?? null, b.items ?? null, b.date ?? null, b.notes ?? null).run();
        return json({ haul: { id: r.meta.last_row_id, ...b } }, 201);
      }
      const haulId = path.match(/^\/api\/hauls\/(\d+)$/);
      if (haulId && method === "DELETE") {
        await env.DB.prepare("DELETE FROM hauls WHERE id=? AND user_id=?").bind(haulId[1], user.sub).run();
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
        const b = await request.json();
        const r = await env.DB.prepare("INSERT INTO messages (user_id, listing_id, template_name, body) VALUES (?,?,?,?)")
          .bind(user.sub, b.listing_id || null, b.template_name ?? null, b.body ?? null).run();
        return json({ message: { id: r.meta.last_row_id } }, 201);
      }

      // ── AI TRY-ON (AR) — real overlay data + parses model output ──
      if (path === "/api/ai/tryon" && method === "POST") {
        const { garment_id, garment_name } = await request.json();
        const g = garment_id ? await env.DB.prepare("SELECT * FROM listings WHERE id=? AND user_id=?").bind(garment_id, user.sub).first() : null;
        if (!g && !garment_name) return err("garment_id or garment_name required");
        const item = g || { title: garment_name, category: "tops" };
        const r = await env.AI.run("@cf/meta/llama-3.2-3b-instruct", {
          messages: [{ role: "system", content: "You are an AR try-on assistant. For a garment, output JSON only with keys: overlayType (top/bottom/one-piece), garmentLength, fit, colorMapping, notes." }, { role: "user", content: `Garment: ${item.title} (category ${item.category}). Output JSON only.` }],
          max_tokens: 200,
        });
        // r.response may be a string OR an object — this used to throw
        // "text.match is not a function" and 500 the whole route.
        const raw = r?.response ?? r;
        const text = typeof raw === "string" ? raw : JSON.stringify(raw ?? "");
        const m = typeof text === "string" ? text.match(/\{[\s\S]*\}/) : null;
        const parsed = m ? JSON.parse(m[0]) : { overlayType: item.category.includes("bottom") ? "bottom" : "top", garmentLength: item.category.includes("dress") ? "one-piece" : "waist", fit: "regular", notes: "AR overlay mapped from AI analysis" };
        await env.DB.prepare("INSERT INTO ar_tryons (user_id, garment_name, model_name, analysis_json, overlay_data) VALUES (?,?,?,?,?)")
          .bind(user.sub, item.title, "web-overlay", JSON.stringify(parsed), JSON.stringify({ pinned: ["shoulder", "hips"] })).run();
        return json({ ok: true, ...parsed, item: item.title, type: "overlay-ar" });
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
      return json({ error: e.message || "Internal error" }, 500);
    }
  },
};