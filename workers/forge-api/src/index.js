// CreateStuff API — clean rebuild (2026-09-23)
// Stack: Cloudflare Workers + D1 (forge-db) + R2 (forge-projects) + KV (forge-sessions) + Workers AI (llama-3.2 codegen)
// Auth: HMAC-signed bearer token via Web Crypto

const SECRET = Uint8Array.from([99,114,101,97,116,101,115,116,117,102,102,45,118,50,45,104,109,97,99,45,107,101,121]);
const enc = new TextEncoder();
const b64u = (buf) => [...new Uint8Array(buf)].map((b) => String.fromCharCode(b)).join("");
const toB64 = (s) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64 = (s) => atob(s.replace(/-/g, "+").replace(/_/g, "/"));

async function hmac(data) {
  const key = await crypto.subtle.importKey("raw", SECRET, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, typeof data === "string" ? enc.encode(data) : data);
  return toB64(b64u(sig));
}
async function sign(payload) {
  const body = toB64(JSON.stringify(payload));
  const sig = await hmac(body);
  return `${body}.${sig}`;
}
async function verify(token) {
  try {
    const [body, sig] = token.split(".");
    const e = await hmac(body);
    if (sig.length !== e.length) return null;
    for (let i = 0; i < e.length; i++) if (sig[i] !== e[i]) return null;
    const p = JSON.parse(fromB64(body));
    if (p.exp < Date.now()) return null;
    return p;
  } catch { return null; }
}
const hashPw = async (pw) => {
  const h = await crypto.subtle.digest("SHA-256", enc.encode("cs:" + pw));
  return b64u(h).split("").map((c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join("");
};
const requireUser = async (request) => {
  const t = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!t) return null;
  return await verify(t);
};
const rateLimit = async (env, request, bucket, limit = 20, windowSec = 60) => {
  try {
    const ip = request.headers.get("CF-Connecting-IP") || "x";
    const w = Math.floor(Date.now() / 1000 / windowSec);
    const k = `rl:${bucket}:${w}:${ip}`;
    const c = parseInt(await env.KV.get(k), 10) || 0;
    if (c >= limit) return false;
    await env.KV.put(k, String(c + 1), { expirationTtl: windowSec * 2 });
    return true;
  } catch { return true; }
};

// Templates the product ships with (real starters)
const TEMPLATES = [
  { id: "restaurant", name: "Restaurant", desc: "Menu, hours, reservations, gallery", files: ["index.html", "styles.css", "script.js"] },
  { id: "portfolio", name: "Portfolio", desc: "About, projects grid, contact", files: ["index.html", "styles.css", "script.js"] },
  { id: "store", name: "Online Store", desc: "Product grid, cart, checkout stub", files: ["index.html", "styles.css", "script.js"] },
  { id: "fitness", name: "Fitness Coach", desc: "Programs, pricing, schedule", files: ["index.html", "styles.css", "script.js"] },
  { id: "blog", name: "Blog", desc: "Posts, archive, subscribe", files: ["index.html", "styles.css", "script.js"] },
  { id: "agency", name: "Digital Agency", desc: "Services, cases, team", files: ["index.html", "styles.css", "script.js"] },
  { id: "saas", name: "SaaS Landing", desc: "Hero, features, pricing, FAQ", files: ["index.html", "styles.css", "script.js"] },
  { id: "realestate", name: "Real Estate", desc: "Listings, agents, filters", files: ["index.html", "styles.css", "script.js"] },
];

// Workers AI models that can serve codegen, best first.
// NOTE: env.AI.run returns r.response as a STRING for some models and as an
// already-parsed ARRAY when the model emitted valid JSON. gen() normalizes both.
const CODE_MODELS = [
  "@cf/qwen/qwen2.5-coder-32b-instruct",
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "@cf/meta/llama-3.1-8b-instruct",
  "@cf/meta/llama-3.2-3b-instruct",
];

const gen = async (env, system, user, maxTok = 8000) => {
  let lastErr = null;
  for (const model of CODE_MODELS) {
    try {
      const r = await env.AI.run(model, {
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        max_tokens: maxTok,
      });
      const resp = r ? r.response : null;
      if (Array.isArray(resp)) return { text: JSON.stringify(resp), parsed: resp, model };
      const text = String(resp == null ? "" : resp).trim();
      if (!text) { lastErr = new Error(model + " returned an empty response"); continue; }
      return { text, parsed: null, model };
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("no Workers AI model available");
};

// ── file extraction ──────────────────────────────────────────────────
// Real output is routinely a JSON array whose closing "]" got cut off, or is
// wrapped in markdown fences. Salvage every object that parses instead of
// discarding the whole response.
function normalizeFiles(arr) {
  const out = [];
  for (const f of Array.isArray(arr) ? arr : []) {
    if (!f || typeof f !== "object") continue;
    const path = String(f.path || f.file_path || "").trim();
    const content = typeof f.content === "string" ? f.content : "";
    if (!path || !content) continue;
    out.push({ path, content });
  }
  return out;
}

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
        try { files.push(...normalizeFiles([JSON.parse(text.slice(objStart, i + 1))])); } catch { /* torn object */ }
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
  if (Array.isArray(g.parsed)) {           // Workers AI already parsed it
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
    try { const f = normalizeFiles(JSON.parse(a)); if (f.length) return f; } catch { /* try next */ }
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

// A build is only "real" if it produced a substantial index.html.
function siteOk(files) {
  const idx = files.find((f) => /(^|\/)index\.html?$/i.test(f.path));
  return !!idx && idx.content.length >= 400 && /<html[\s>]/i.test(idx.content);
}

const CODE_SYS = `You are a senior front-end engineer. Build ONE complete, polished website per request in plain HTML + CSS + vanilla JS. No frameworks, no build step, no CDN beyond Google Fonts.

OUTPUT EXACTLY 3 FILES
"index.html" — a full document: <!DOCTYPE html>, <head> with <link rel="stylesheet" href="styles.css">, <body>, <script src="script.js"></script> at the end of body.
"styles.css" — every visual rule.
"script.js" — every interaction. It must run without throwing.

COVER THE WHOLE PAGE, not just a hero. For any brief include: sticky nav, hero, and each section the brief implies — features/services, gallery or listings, pricing or menu, testimonials, FAQ, contact or booking form, footer.

REAL CONTENT ONLY. Write actual headings, copy, prices, addresses and labels for this specific business. Never "Lorem ipsum", never "Your text here", never placeholder brackets.

DESIGN BAR: a deliberate type scale, generous whitespace, one accent colour with a restrained neutral palette, real imagery via gradients/CSS art (no broken image URLs), fully responsive at 360px and 1440px, subtle hover + scroll-reveal motion.

script.js must wire every interactive element: mobile nav, tabs or filters, form validation that shows a visible success state, and scroll animations. Wrap in try/catch so nothing can throw on load.

OUTPUT FORMAT — output ONLY this array, no prose before or after, no markdown fences, at least 4500 characters of code in total, and you MUST close the array with "]}":
[{"path":"index.html","content":"<full html, every newline escaped as \\n, every quote escaped as \\" >"},{"path":"styles.css","content":"..."},{"path":"script.js","content":"..."}]`;


// Durable Object: live build-progress broadcasts (port of prod ChatRoom)
export class ChatRoom {
  constructor(state) { this.state = state; this.conns = new Set(); }
  async fetch(request) {
    const u = new URL(request.url);
    if (u.pathname === "/ws") {
      const pair = new WebSocketPair();
      const [client, server] = [pair[0], pair[1]];
      this.conns.add(server);
      server.accept();
      server.onclose = () => this.conns.delete(server);
      return new Response(null, { status: 101, webSocket: client });
    }
    if (u.pathname === "/broadcast" && request.method === "POST") {
      const m = await request.text();
      for (const w of this.conns) if (w.readyState === WebSocket.OPEN) w.send(m);
      return json({ ok: true, count: this.conns.size });
    }
    return json({ count: this.conns.size });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    if (method === "OPTIONS") return new Response(null, { headers: CORS });

    try {
      if (path === "/api/health") return json({ ok: true, ts: Date.now(), builds: "v3" });
      if (path === "/api/templates") return json({ templates: TEMPLATES });
      // model capability probe — decides which Workers AI model can actually serve long codegen
      if (path === "/api/ai/models" && method === "GET") {
        if (!(await rateLimit(env, request, "probe", 6, 300))) return err("Too many probes", 429);
        const candidates = [
          "@cf/qwen/qwen2.5-coder-32b-instruct",
          "@cf/qwen/qwen2.5-coder-7b-instruct",
          "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
          "@cf/meta/llama-3.1-8b-instruct",
          "@cf/meta/llama-3.1-70b-instruct-fp8-fast",
          "@cf/deepseek-ai/deepseek-coder-6.7b-instruct",
          "@cf/mistral/mistral-7b-instruct-v0.2",
          "@cf/meta/llama-3.2-11b-instruct",
          "@cf/meta/llama-3.2-3b-instruct",
        ];
        const out = [];
        for (const id of candidates) {
          const t0 = Date.now();
          try {
            const r = await env.AI.run(id, { messages: [{ role: "user", content: "Reply with exactly: OK" }], max_tokens: 16 });
            out.push({ id, ok: true, ms: Date.now() - t0, sample: String(r.response || "").replace(/\s+/g, " ").slice(0, 60) });
          } catch (e) {
            out.push({ id, ok: false, ms: Date.now() - t0, err: String((e && e.message) || e).slice(0, 120) });
          }
        }
        return json({ probed: out.length, working: out.filter((m) => m.ok).map((m) => m.id), results: out });
      }
      if (path === "/robots.txt")
        return new Response(
          "User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: https://createstuff.ai/sitemap.xml\n",
          { headers: { ...CORS, "Content-Type": "text/plain; charset=utf-8" } }
        );
      if (path === "/sitemap.xml") {
        const now = new Date().toISOString().slice(0, 10);
        const urls = ["", "app", "pricing", "github", "templates", "guide"].map(
          (p) => `  <url><loc>https://createstuff.ai/${p ? p + "/" : ""}</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>${p ? "0.7" : "1.0"}</priority></url>`
        );
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`,
          { headers: { ...CORS, "Content-Type": "application/xml; charset=utf-8" } }
        );
      }

      // ── AUTH ────────────────────────────────────────────────
      if (path === "/api/auth/register" && method === "POST") {
        if (!(await rateLimit(env, request, "register", 10))) return err("Too many", 429);
        const { email, name, password } = await request.json();
        if (!email || !name || !password) return err("email, name, password required");
        if (password.length < 6) return err("Password must be at least 6 characters");
        const ex = await env.DB.prepare("SELECT id FROM users WHERE email=?").bind(email).first();
        if (ex) return err("Email already registered", 409);
        const id = crypto.randomUUID();
        await env.DB.prepare("INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?,?,?,?,?)")
          .bind(id, email, name, await hashPw(password), new Date().toISOString()).run();
        return json({ user: { id, email, name }, token: await sign({ sub: id, email, exp: Date.now() + 30 * 86400000 }) }, 201);
      }
      if (path === "/api/auth/login" && method === "POST") {
        if (!(await rateLimit(env, request, "login", 20))) return err("Too many", 429);
        const { email, password } = await request.json();
        const u = await env.DB.prepare("SELECT * FROM users WHERE email=?").bind(email).first();
        if (!u || u.password_hash !== (await hashPw(password))) return err("Invalid credentials", 401);
        return json({ user: { id: u.id, email: u.email, name: u.name }, token: await sign({ sub: u.id, email: u.email, exp: Date.now() + 30 * 86400000 }) });
      }

      // ── AUTH REQUIRED ───────────────────────────────────────
      const user = await requireUser(request);
      if (!user) return json({ error: "Unauthorized" }, 401);

      // ── /api/ai/* — production shape (generate | modify | publish) ──────
      if (path === "/api/ai/generate" && method === "POST") {
        const { projectId } = await request.json().catch(() => ({}));
        if (!projectId) return err("projectId required");
        const p = await env.DB.prepare("SELECT * FROM projects WHERE id=? AND owner_id=?").bind(projectId, user.sub).first();
        if (!p) return err("Not found", 404);
        return runGenerate(env, request, user, p, projectId, "generate");
      }
      if (path === "/api/ai/modify" && method === "POST") {
        const { projectId, message } = await request.json().catch(() => ({}));
        if (!projectId || !message) return err("projectId and message required");
        const p = await env.DB.prepare("SELECT * FROM projects WHERE id=? AND owner_id=?").bind(projectId, user.sub).first();
        if (!p) return err("Not found", 404);
        return runGenerate(env, request, user, p, projectId, "modify");
      }
      if (path === "/api/ai/publish" && method === "POST") {
        const { projectId } = await request.json().catch(() => ({}));
        if (!projectId) return err("projectId required");
        const p = await env.DB.prepare("SELECT * FROM projects WHERE id=? AND owner_id=?").bind(projectId, user.sub).first();
        if (!p) return err("Not found", 404);
        return runGenerate(env, request, user, p, projectId, "publish");
      }

      // ── GITHUB IMPORT — pull a repo and vibe code FOR the user ─────────
      if (path === "/api/github/import" && method === "POST") {
        if (!(await rateLimit(env, request, "gh", 6, 300))) return err("Too many imports — wait 5 minutes", 429);
        const { url } = await request.json().catch(() => ({}));
        if (!url) return err("url required");
        const m = String(url).match(/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:\/.*)?$/);
        if (!m) return err("Not a GitHub repository URL (expected github.com/owner/repo)");
        const owner = m[1], repo = m[2];

        const ghHeaders = { Accept: "application/vnd.github+json", "User-Agent": "createstuff" };
        if (env.GITHUB_TOKEN) ghHeaders.Authorization = `Bearer ${env.GITHUB_TOKEN}`;

        const metaR = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers: ghHeaders });
        if (!metaR.ok) return err(metaR.status === 404 ? "Repository not found (private repos need GITHUB_TOKEN)" : `GitHub error ${metaR.status}`, 502);
        const meta = await metaR.json();

        const treeR = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(meta.default_branch)}?recursive=1`, { headers: ghHeaders });
        const tree = treeR.ok ? (await treeR.json()).tree || [] : [];
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

        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const name = meta.name || repo;
        const desc = `Imported from github.com/${owner}/${repo} — ${meta.description || name}`;
        await env.DB.prepare("INSERT INTO projects (id, name, description, owner_id, created_at, updated_at, status, framework, ai_context) VALUES (?,?,?,?,?,?,?,?,?)")
          .bind(id, name, desc, user.sub, now, now, "imported", "github", JSON.stringify({
            template: "import", repo: `${owner}/${repo}`, repoUrl: meta.html_url, stars: meta.stargazers_count, branch: meta.default_branch, files,
          })).run();
        await env.R2.put(`projects/${id}/checkpoints/cp-import`, JSON.stringify(files), { httpMetadata: { contentType: "application/json" } });

        return json({ project: { id, name, description: desc, status: "imported", framework: "github" }, repo: `${owner}/${repo}`, imported: files.length, files: files.map((f) => ({ path: f.path, size: f.content.length })) }, 201);
      }

      // ── A→Z GUIDE — deterministic step state so the guide never lies ────
      if (path === "/api/guide/state" && method === "GET") {
        const me = await env.DB.prepare("SELECT (SELECT COUNT(*) FROM projects WHERE owner_id=?) a, (SELECT COUNT(*) FROM checkpoints ck JOIN projects pr ON pr.id=ck.project_id WHERE pr.owner_id=?) b, (SELECT COUNT(*) FROM projects WHERE owner_id=? AND status='published') c")
          .bind(user.sub, user.sub, user.sub).first();
        const projects = await env.DB.prepare("SELECT id, name, status, publish_url, ai_context FROM projects WHERE owner_id=? ORDER BY updated_at DESC LIMIT 20").bind(user.sub).all();
        const withFiles = (projects.results || []).map((p) => {
          let n = 0; try { n = (JSON.parse(p.ai_context || "{}").files || []).length; } catch { n = 0; }
          return { id: p.id, name: p.name, status: p.status, publish_url: p.publish_url, files: n };
        });
        const hasRepo = withFiles.some((p) => p.status === "imported");
        const hasGenerated = withFiles.some((p) => p.files > 0);
        const hasPublished = withFiles.some((p) => p.status === "published" && p.publish_url);
        const steps = [
          { id: 1, key: "account",  label: "Create your account", done: true },
          { id: 2, key: "idea",     label: "Describe your idea (or import a GitHub repo)", done: hasRepo || hasGenerated },
          { id: 3, key: "generate", label: "Generate the code", done: hasGenerated },
          { id: 4, key: "iterate",  label: "Vibe code: keep editing until you love it", done: withFiles.some((p) => p.files > 0) },
          { id: 5, key: "publish",  label: "Publish to a live URL", done: hasPublished },
        ];
        return json({ steps, next: steps.find((s) => !s.done) || null, projects: withFiles, repo_import: hasRepo });
      }

      // projects list / create
      if (path === "/api/projects" && method === "GET") {
        const r = await env.DB.prepare("SELECT id, name, description, framework, status, preview_url, publish_url, deployment_url, created_at, updated_at, push_token, ai_context FROM projects WHERE owner_id=? ORDER BY updated_at DESC").bind(user.sub).all();
        return json({ projects: r.results });
      }
      if (path === "/api/projects" && method === "POST") {
        const b = await request.json();
        if (!b.name) return err("name required");
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const tpl = TEMPLATES.find((t) => t.id === b.template_id || b.template) || TEMPLATES[0];
        await env.DB.prepare(
          "INSERT INTO projects (id, name, description, owner_id, created_at, updated_at, status, framework, ai_context) VALUES (?,?,?,?,?,?,?,?,?)"
        ).bind(id, b.name, b.description || "", user.sub, now, now, "created", tpl.id, JSON.stringify({ template: tpl.id }
        )).run();
        const p = await env.DB.prepare("SELECT * FROM projects WHERE id=?").bind(id).first();
        return json({ project: p }, 201);
      }

      const proj = path.match(/^\/api\/projects\/([0-9a-f-]{36})(\/.*)?$/);
      if (proj) {
        const pid = proj[1];
        const sub = (proj[2] || "").replace(/^\//, "");
        const p = await env.DB.prepare("SELECT * FROM projects WHERE id=? AND owner_id=?").bind(pid, user.sub).first();
        if (!p) return err("Not found", 404);

        if (method === "DELETE") {
          await env.DB.prepare("DELETE FROM projects WHERE id=?").bind(pid).run();
          return json({ ok: true });
        }
        if (method === "PUT" && !sub) {
          const b = await request.json();
          await env.DB.prepare("UPDATE projects SET name=COALESCE(?,name), description=COALESCE(?,description), updated_at=? WHERE id=?")
            .bind(b.name, b.description, new Date().toISOString(), pid).run();
          return json({ ok: true });
        }

        // ── GENERATE: real codegen via Workers AI ─────────────
        if ((sub === "generate" || sub === "modify" || sub === "publish") && method === "POST") {
          return runGenerate(env, request, user, p, pid, sub);
        }

        // ── FILES: list / read / write ─────────────────────────────
        // The builder reads `file_path` + `size` on the list and
        // `file_path` + `content` on read/write, so we serve both keys.
        if (sub === "files" && method === "GET") {
          const files = await loadFiles(env, pid, p);
          return json({ files: files.map((f) => ({ path: f.path, file_path: f.path, size: String(f.content || "").length })) });
        }
        if (sub === "files" && method === "POST") {
          const b = await request.json().catch(() => ({}));
          const fp = String(b.file_path || b.path || "").trim();
          if (!fp) return err("file_path required");
          return writeProjectFile(env, pid, p, fp, typeof b.content === "string" ? b.content : "");
        }
        const one = sub.match(/^files\/(.+)$/);
        if (one && method === "GET") {
          const want = decodeURIComponent(one[1]).replace(/^\//, "");
          const f = (await loadFiles(env, pid, p)).find((x) => x.path === want);
          if (!f) return err("File not found", 404);
          return json({ path: f.path, file_path: f.path, size: String(f.content || "").length, content: f.content });
        }
        if (one && (method === "POST" || method === "PUT")) {
          const b = await request.json().catch(() => ({}));
          const fp = String(b.file_path || b.path || decodeURIComponent(one[1])).trim();
          if (!fp) return err("file_path required");
          return writeProjectFile(env, pid, p, fp, typeof b.content === "string" ? b.content : "");
        }
        if (sub === "preview" && method === "GET") {
          const files = await loadFiles(env, pid, p);
          const index = files.find((f) => f.path === "index.html") || files[0];
          if (!index) return err("No files yet — generate first", 404);
          return new Response(index.content.replace(/<script src="[^"]*"><\/script>/g, (m) => {
            const src = m.match(/src="([^"]+)"/)?.[1];
            const f = files.find((x) => x.path === src.replace(/^\//, ""));
            return f ? `<script>${f.content}</script>` : m;
          }).replace(/<link rel="stylesheet" href="([^"]+)">/g, (m, href) => {
            const f = files.find((x) => x.path === href.replace(/^\//, ""));
            return f ? `<style>${f.content}</style>` : m;
          }), { headers: { ...CORS, "Content-Type": "text/html", "Cache-Control": "no-store" } });
        }
      }

      return json({ error: "Not found" }, 404);
    } catch (e) {
      return json({ error: e.message || "Internal error" }, 500);
    }
  },
};

function aiCtxKey(p) {
  try { return JSON.parse(p.ai_context || "{}").files || []; } catch { return []; }
}
async function writeProjectFile(env, pid, p, filePath, content) {
  if (!filePath) return err("file_path required");
  const files = await loadFiles(env, pid, p);
  const at = files.findIndex((f) => f.path === filePath);
  const entry = { path: filePath, content };
  if (at >= 0) files[at] = entry; else files.push(entry);
  let aiCtx = {};
  try { aiCtx = p.ai_context ? JSON.parse(p.ai_context) : {}; } catch { aiCtx = {}; }
  const cpKey = `projects/${pid}/checkpoints/cp-edit-${Date.now().toString(36)}`;
  await env.R2.put(cpKey, JSON.stringify(files), { httpMetadata: { contentType: "application/json" } });
  await env.DB.prepare("UPDATE projects SET ai_context=?, updated_at=?, status='ready' WHERE id=?")
    .bind(JSON.stringify({ ...aiCtx, files, lastCheckpoint: cpKey.split("/").pop() }), new Date().toISOString(), pid).run();
  return json({ ok: true, path: filePath, file_path: filePath, size: content.length, files: files.length });
}

async function loadFiles(env, pid, p) {
  const ctx = aiCtxKey(p);
  if (ctx.length) return ctx;
  const cp = await env.DB.prepare("SELECT r2_key FROM checkpoints WHERE project_id=? ORDER BY created_at DESC LIMIT 1").bind(pid).first();
  if (!cp) return [];
  const obj = await env.R2.get(cp.r2_key);
  if (!obj) return [];
  return JSON.parse(await obj.text());
}

/**
 * Single source of truth for codegen/modify/publish.
 * Serves BOTH shapes: /api/projects/:id/generate  and  /api/ai/generate|modify|publish
 * (production already answers on the /api/ai/* shape — we must not regress it).
 */
async function runGenerate(env, request, user, p, pid, shape) {
  if (!(await rateLimit(env, request, "gen", 10, 300))) return err("Too many generations — wait a few minutes", 429);

  const b = await request.json().catch(() => ({}));
  const plan = b.plan || b.prompt || b.message || "";
  const edit = b.edit;
  const currentFiles = b.currentFiles;
  if (shape !== "publish" && !plan && !edit) {
    if (shape === "modify") return err("projectId and message required");
    if (shape === "generate") return err("projectId required");
  }

  const aiCtx = p.ai_context ? JSON.parse(p.ai_context) : {};
  const prior = Array.isArray(currentFiles) && currentFiles.length ? currentFiles : aiCtx.files || [];

  // publish → nothing to publish if we have no files yet
  if (shape === "publish") {
    if (!prior.length) return err("No files to publish — generate first", 400);
    const slug = (p.name || "site").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "site";
    const url = `https://sites.createstuff.ai/${pid.slice(0, 8)}`;
    await env.DB.prepare("UPDATE projects SET status='published', publish_url=?, deployment_url=?, updated_at=? WHERE id=?")
      .bind(url, url, new Date().toISOString(), pid).run();
    return json({ ok: true, url, slug, files: prior.length, published: true });
  }

  const isEdit = shape === "modify" || !!edit || !prior.length ? shape === "modify" || !!edit : false;
  const tplNames = TEMPLATES.map((t) => `${t.id}: ${t.desc}`).join("\n");

  let userMsg;
  if (isEdit && prior.length) {
    userMsg = `Project: ${p.name}\nPurpose: ${p.description}\n\nEDIT REQUEST: ${edit || plan}\n\nCurrent files:\n${prior.slice(0, 8).map((f) => `--- ${f.path} ---\n${String(f.content || "").slice(0, 8000)}`).join("\n")}\n\nApply the edit. Return the FULL updated files as JSON array, same structure unless new files are needed.`;
  } else {
    userMsg = `Project: ${p.name}\nPurpose: ${p.description}\nBuild prompt: ${plan || p.description}\n\nAvailable template styles:\n${tplNames}\n\nGenerate a complete, beautiful professional website. Output ONLY a JSON array of {path, content} files.`;
  }

  await env.DB.prepare("UPDATE projects SET status='generating', job_state='running', job_log=?, updated_at=? WHERE id=?")
    .bind(JSON.stringify([{ t: Date.now(), msg: "AI generating files…" }]), new Date().toISOString(), pid).run();

  let files = [];
  let notes = isEdit ? "Edited files" : "Generated site";
  let modelUsed = "";
  let rawLen = 0;
  try {
    const g = await gen(env, CODE_SYS, userMsg, 8000);
    modelUsed = g.model; rawLen = g.text.length;
    files = finalizeFiles(extractFiles(g));
    notes = `${notes} - ${modelUsed} - ${files.length} file(s) - ${files.reduce((n, f) => n + f.content.length, 0)} chars`;
  } catch (e) {
    notes = "generation error: " + ((e && e.message) || e);
  }

  // HONEST FAILURE. A placeholder page shipped as "generated" is a lie; we
  // return a real error and save nothing instead.
  if (!files.length || !siteOk(files)) {
    const why = files.length
      ? `the model returned ${files.length} file(s) but no usable index.html`
      : `the model returned no usable files (${modelUsed || "no model served the request"}, ${rawLen} chars)`;
    await env.DB.prepare("UPDATE projects SET status='error', job_state='idle', job_log=?, updated_at=? WHERE id=?")
      .bind(JSON.stringify([{ t: Date.now(), msg: `Build failed: ${why}. ${notes}` }]), new Date().toISOString(), pid).run();
    return err(`Build failed: ${why}. Nothing was saved - run the build again.`, 422);
  }

  const cpId = `cp-${Date.now().toString(36)}`;
  await env.R2.put(`projects/${pid}/checkpoints/${cpId}`, JSON.stringify(files), { httpMetadata: { contentType: "application/json" } });
  const manifest = {};
  for (const f of files) manifest[f.path] = f.content.length;
  await env.DB.prepare("INSERT INTO checkpoints (id, project_id, message, files_changed, created_at, r2_key, file_size, manifest) VALUES (?,?,?,?,?,?,?,?)")
    .bind(cpId, pid, notes, JSON.stringify(files.map((f) => f.path)), new Date().toISOString(), `projects/${pid}/checkpoints/${cpId}`, JSON.stringify(files).length, JSON.stringify(manifest)).run();
  await env.DB.prepare("UPDATE projects SET status='ready', ai_context=?, job_state='idle', job_log=?, updated_at=? WHERE id=?")
    .bind(JSON.stringify({ ...aiCtx, files, lastCheckpoint: cpId }), JSON.stringify([{ t: Date.now(), msg: notes }]), new Date().toISOString(), pid).run();

  // files are returned WITH content so the builder can render a real preview
  return json({ ok: true, notes, model: modelUsed, projectId: pid, files, checkpoint: cpId }, 200);
}