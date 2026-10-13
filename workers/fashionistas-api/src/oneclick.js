// One-tap sign-in for fashionistas.ai (2026-10-13).
//   - Passkeys (WebAuthn, fingerprint / face / screen lock). No third-party key.
//   - Google Identity Services One Tap / button. Needs GOOGLE_CLIENT_ID.
//   - Email magic link. Needs RESEND_API_KEY (+ optional MAGIC_FROM).
// Every path ends in the same HMAC token the rest of the Worker already
// accepts, with the same one-year sliding life (see /api/auth/me).
// No shop or Google password is ever stored here.

const enc = new TextEncoder();
const CHALLENGE_TTL = 300;          // seconds
const MAGIC_TTL = 900;              // seconds

const b64uEnc = (buf) => {
  const b = new Uint8Array(buf); let s = "";
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const b64uDec = (s) => {
  s = String(s || "").replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(s + "=".repeat((4 - (s.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};
const rand = (n) => { const b = new Uint8Array(n); crypto.getRandomValues(b); return b64uEnc(b); };
const sha256 = async (data) => new Uint8Array(await crypto.subtle.digest("SHA-256", data));
const eq = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i]; return d === 0; };

// Origins allowed to run a ceremony. rpId is that origin's host.
export function allowedOrigin(origin) {
  try {
    const u = new URL(origin);
    if (u.protocol !== "https:" && u.hostname !== "localhost") return null;
    const h = u.hostname;
    if (h === "fashionistas.ai" || h === "www.fashionistas.ai" || h === "localhost") return u.origin;
    if (h === "fashionistas-ai.pages.dev" || h.endsWith(".fashionistas-ai.pages.dev")) return u.origin;
    return null;
  } catch { return null; }
}

let ready = false;
async function ensureTables(env) {
  if (ready) return;
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS passkeys (
    id TEXT PRIMARY KEY, user_id INTEGER NOT NULL, public_key TEXT NOT NULL,
    alg INTEGER NOT NULL, sign_count INTEGER DEFAULT 0, rp_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP, last_used_at TEXT)`).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS passkeys_user ON passkeys(user_id)`).run();
  ready = true;
}

async function kvPut(env, key, val, ttl) { await env.CACHE.put(key, JSON.stringify(val), { expirationTtl: ttl }); }
async function kvTake(env, key) {
  const v = await env.CACHE.get(key); if (!v) return null;
  await env.CACHE.delete(key); return JSON.parse(v);
}

const pubUser = (u) => ({ id: u.id, username: u.username, display_name: u.display_name, email: u.email });

async function uniqueUsername(env, base) {
  base = String(base || "seller").toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 18) || "seller";
  if (base.length < 3) base = "seller";
  for (let i = 0; i < 8; i++) {
    const name = i === 0 ? base : base + Math.floor(1000 + Math.random() * 9000);
    const hit = await env.DB.prepare("SELECT id FROM users WHERE username=?").bind(name).first();
    if (!hit) return name;
  }
  return base + rand(4).toLowerCase().replace(/[^a-z0-9]/g, "");
}

// password_hash "!" never equals a sha256 hex, so password login stays closed
// for accounts that only have a passkey / Google / email link.
async function createUser(env, { username, email, display }) {
  const name = await uniqueUsername(env, username);
  const r = await env.DB.prepare("INSERT INTO users (username, password_hash, display_name, email) VALUES (?,?,?,?)")
    .bind(name, "!", display || name, email || null).run();
  return await env.DB.prepare("SELECT id, username, display_name, email FROM users WHERE id=?").bind(r.meta.last_row_id).first();
}
async function userByEmail(env, email, display) {
  email = String(email).trim().toLowerCase();
  const u = await env.DB.prepare("SELECT id, username, display_name, email FROM users WHERE lower(email)=?").bind(email).first();
  if (u) return { user: u, created: false };
  return { user: await createUser(env, { username: email.split("@")[0], email, display }), created: true };
}

// DER ECDSA signature -> raw r||s (WebCrypto wants raw).
function derToRaw(der) {
  let p = 2; if (der[1] & 0x80) p += der[1] & 0x7f;
  const read = () => { p++; let len = der[p++]; let v = der.slice(p, p + len); p += len;
    while (v.length > 32 && v[0] === 0) v = v.slice(1);
    const o = new Uint8Array(32); o.set(v, 32 - v.length); return o; };
  const r = read(), s = read(); const out = new Uint8Array(64); out.set(r); out.set(s, 32); return out;
}

function checkClientData(cdBytes, type, challenge, origin) {
  const cd = JSON.parse(new TextDecoder().decode(cdBytes));
  if (cd.type !== type) throw new Error("wrong ceremony type");
  if (cd.challenge !== challenge) throw new Error("challenge mismatch");
  if (cd.origin !== origin) throw new Error("origin mismatch");
}
async function checkAuthData(ad, rpId, needUV) {
  if (ad.length < 37) throw new Error("authenticator data too short");
  if (!eq(ad.slice(0, 32), await sha256(enc.encode(rpId)))) throw new Error("rpId mismatch");
  const flags = ad[32];
  if (!(flags & 0x01)) throw new Error("user not present");
  if (needUV && !(flags & 0x04)) throw new Error("user not verified");
  return new DataView(ad.buffer, ad.byteOffset + 33, 4).getUint32(0);
}

export async function handleOneClick(path, method, request, env, h) {
  const { json, err, readJson, signToken, requireUser, SESSION_MS, rateLimit } = h;
  const issue = async (user, extra = {}) => {
    const token = await signToken(env, { sub: user.id, u: user.username, exp: Date.now() + SESSION_MS });
    return json({ user: pubUser(user), token, ...extra });
  };
  const originOf = () => allowedOrigin(request.headers.get("X-Fash-Origin") || request.headers.get("Origin") || "");

  if (path === "/api/auth/config" && method === "GET") {
    return json({
      passkey: true,
      google_client_id: env.GOOGLE_CLIENT_ID || null,
      magic_link: !!env.RESEND_API_KEY,
      session_days: Math.round(SESSION_MS / 86400000),
    });
  }

  // ---------- passkeys ----------
  if (path === "/api/auth/passkey/register-options" && method === "POST") {
    if (!(await rateLimit(env, request, "pk", 30))) return err("Too many requests", 429);
    const origin = originOf(); if (!origin) return err("Sign-in is not allowed from this page.", 403);
    await ensureTables(env);
    const body = await readJson(request);
    const me = await requireUser(request, env);
    let uid = null, uname, display;
    if (me && me.sub) {
      const u = await env.DB.prepare("SELECT id, username, display_name FROM users WHERE id=?").bind(me.sub).first();
      if (u) { uid = u.id; uname = u.username; display = u.display_name || u.username; }
    }
    if (!uid) {
      const want = typeof body.name === "string" ? body.name.trim().slice(0, 40) : "";
      uname = want || "seller"; display = want || "fashionistas seller";
    }
    const challenge = rand(32), cid = rand(16), handle = rand(16);
    const rpId = new URL(origin).hostname;
    await kvPut(env, "pkc:" + cid, { challenge, origin, rpId, uid, uname, display, kind: "reg" }, CHALLENGE_TTL);
    let exclude = [];
    if (uid) {
      const rows = await env.DB.prepare("SELECT id FROM passkeys WHERE user_id=?").bind(uid).all();
      exclude = (rows.results || []).map((r) => ({ type: "public-key", id: r.id }));
    }
    return json({ cid, publicKey: {
      challenge, rp: { id: rpId, name: "fashionistas.ai" },
      user: { id: handle, name: uname, displayName: display },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
      authenticatorSelection: { residentKey: "required", requireResidentKey: true, userVerification: "preferred" },
      attestation: "none", timeout: 120000, excludeCredentials: exclude,
    } });
  }

  if (path === "/api/auth/passkey/register" && method === "POST") {
    const b = await readJson(request);
    const st = await kvTake(env, "pkc:" + String(b.cid || ""));
    if (!st || st.kind !== "reg") return err("That sign-in took too long. Tap again.", 400);
    try {
      checkClientData(b64uDec(b.clientDataJSON), "webauthn.create", st.challenge, st.origin);
      if (!b.publicKey || !b.authenticatorData || !b.id) throw new Error("missing key");
      await checkAuthData(b64uDec(b.authenticatorData), st.rpId, false);
      const alg = Number(b.alg);
      if (alg !== -7 && alg !== -257) throw new Error("unsupported key type");
      // Make sure the SPKI imports before we keep it.
      await crypto.subtle.importKey("spki", b64uDec(b.publicKey),
        alg === -7 ? { name: "ECDSA", namedCurve: "P-256" } : { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    } catch (e) { return err("Could not save that passkey: " + e.message, 400); }
    await ensureTables(env);
    let user;
    if (st.uid) user = await env.DB.prepare("SELECT id, username, display_name, email FROM users WHERE id=?").bind(st.uid).first();
    if (!user) user = await createUser(env, { username: st.uname, display: st.display });
    await env.DB.prepare("INSERT INTO passkeys (id, user_id, public_key, alg, sign_count, rp_id) VALUES (?,?,?,?,0,?)")
      .bind(String(b.id), user.id, String(b.publicKey), Number(b.alg), st.rpId).run();
    return issue(user, { created: !st.uid, method: "passkey" });
  }

  if (path === "/api/auth/passkey/login-options" && method === "POST") {
    if (!(await rateLimit(env, request, "pk", 30))) return err("Too many requests", 429);
    const origin = originOf(); if (!origin) return err("Sign-in is not allowed from this page.", 403);
    const challenge = rand(32), cid = rand(16), rpId = new URL(origin).hostname;
    await kvPut(env, "pkc:" + cid, { challenge, origin, rpId, kind: "auth" }, CHALLENGE_TTL);
    return json({ cid, publicKey: { challenge, rpId, userVerification: "preferred", timeout: 120000, allowCredentials: [] } });
  }

  if (path === "/api/auth/passkey/login" && method === "POST") {
    const b = await readJson(request);
    const st = await kvTake(env, "pkc:" + String(b.cid || ""));
    if (!st || st.kind !== "auth") return err("That sign-in took too long. Tap again.", 400);
    await ensureTables(env);
    const row = await env.DB.prepare("SELECT * FROM passkeys WHERE id=?").bind(String(b.id || "")).first();
    if (!row) return err("This phone's passkey isn't on any fashionistas account. Create one with one tap instead.", 404);
    try {
      const cd = b64uDec(b.clientDataJSON), ad = b64uDec(b.authenticatorData);
      checkClientData(cd, "webauthn.get", st.challenge, st.origin);
      if (row.rp_id && row.rp_id !== st.rpId) throw new Error("passkey belongs to another site");
      const count = await checkAuthData(ad, st.rpId, false);
      const signed = new Uint8Array(ad.length + 32); signed.set(ad); signed.set(await sha256(cd), ad.length);
      let sig = b64uDec(b.signature), algo;
      if (row.alg === -7) { algo = { name: "ECDSA", hash: "SHA-256" }; sig = derToRaw(sig); }
      else algo = { name: "RSASSA-PKCS1-v1_5" };
      const key = await crypto.subtle.importKey("spki", b64uDec(row.public_key),
        row.alg === -7 ? { name: "ECDSA", namedCurve: "P-256" } : { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
      if (!(await crypto.subtle.verify(algo, key, sig, signed))) throw new Error("bad signature");
      if (count && row.sign_count && count <= row.sign_count) throw new Error("passkey counter went backwards");
      await env.DB.prepare("UPDATE passkeys SET sign_count=?, last_used_at=CURRENT_TIMESTAMP WHERE id=?").bind(count, row.id).run();
    } catch (e) { return err("Passkey check failed: " + e.message, 401); }
    const user = await env.DB.prepare("SELECT id, username, display_name, email FROM users WHERE id=?").bind(row.user_id).first();
    if (!user) return err("That account no longer exists.", 404);
    return issue(user, { method: "passkey" });
  }

  // ---------- Google One Tap ----------
  if (path === "/api/auth/google/onetap" && method === "POST") {
    if (!env.GOOGLE_CLIENT_ID) return json({ error: "Google sign-in isn't switched on yet.", need: ["GOOGLE_CLIENT_ID"] }, 503);
    if (!(await rateLimit(env, request, "login", 20))) return err("Too many requests", 429);
    const { credential } = await readJson(request);
    if (!credential || typeof credential !== "string") return err("credential required");
    const r = await fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(credential));
    if (!r.ok) return err("Google didn't accept that sign-in.", 401);
    const p = await r.json();
    const ids = String(env.GOOGLE_CLIENT_ID).split(",").map((s) => s.trim());
    if (!ids.includes(p.aud)) return err("Google sign-in was for another app.", 401);
    if (!["accounts.google.com", "https://accounts.google.com"].includes(p.iss)) return err("bad issuer", 401);
    if (String(p.email_verified) !== "true" || !p.email) return err("That Google account has no verified email.", 401);
    if (Number(p.exp) * 1000 < Date.now()) return err("That Google sign-in expired. Tap again.", 401);
    const { user, created } = await userByEmail(env, p.email, p.name);
    return issue(user, { created, method: "google" });
  }

  // ---------- Email magic link ----------
  if (path === "/api/auth/magic/start" && method === "POST") {
    if (!env.RESEND_API_KEY) return json({ error: "Email sign-in links aren't switched on yet. Use your fingerprint or Google.", need: ["RESEND_API_KEY"] }, 503);
    if (!(await rateLimit(env, request, "magic", 5, 600))) return err("Too many links asked for. Try again in a few minutes.", 429);
    const origin = originOf() || "https://fashionistas.ai";
    const { email } = await readJson(request);
    if (typeof email !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return err("Enter a valid email");
    const t = rand(32);
    await kvPut(env, "magic:" + t, { email: email.trim().toLowerCase() }, MAGIC_TTL);
    const link = origin + "/?signin=" + t;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + env.RESEND_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.MAGIC_FROM || "fashionistas.ai <signin@fashionistas.ai>",
        to: [email.trim()], subject: "Your fashionistas.ai sign-in link",
        text: "Tap to sign in (works for 15 minutes, once):\n\n" + link + "\n\nIf you didn't ask for this, ignore it.",
      }),
    });
    if (!res.ok) return err("Couldn't send the email right now. Use your fingerprint or Google.", 502);
    return json({ ok: true, sent: true });
  }
  if (path === "/api/auth/magic/verify" && method === "POST") {
    const { t } = await readJson(request);
    const st = await kvTake(env, "magic:" + String(t || ""));
    if (!st) return err("That link was already used or expired. Ask for a new one.", 400);
    const { user, created } = await userByEmail(env, st.email);
    return issue(user, { created, method: "email" });
  }

  return null;
}
