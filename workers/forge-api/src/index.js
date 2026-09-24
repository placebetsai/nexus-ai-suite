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

const gen = async (env, system, user, maxTok = 2000) => {
  const r = await env.AI.run("@cf/meta/llama-3.2-3b-instruct", {
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
    max_tokens: maxTok,
  });
  return (r.response || "").trim();
};

const CODE_SYS = `You build complete, beautiful, professional single-page websites in pure HTML+CSS+JS (no frameworks, no external CDN dependencies beyond Google Fonts). 
Design must be modern: strong typography, generous spacing, cohesive color palette, responsive (mobile-first), subtle animations.
Always output between 3 and 5 files: index.html, styles.css, script.js, and optionally content for restaurants (menu), or pages. 
Format your ENTIRE response as a single JSON array: [{"path":"index.html","content":"<escaped full html>"}, {...}].
Escape all newlines as \\n and quotes properly. No text outside the JSON array.`;

const FAKE_STARTER = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>{{TITLE}}</title><style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#1a1a2e;background:#fff}
.hero{min-height:70vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:2rem;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff}
.hero h1{font-size:clamp(2rem,6vw,4rem);margin-bottom:1rem}.hero p{font-size:clamp(1rem,2vw,1.25rem);max-width:32rem;opacity:.9}
.btn{display:inline-block;margin-top:1.5rem;padding:.8rem 1.8rem;background:#fff;color:#6366f1;font-weight:700;border-radius:.5rem;text-decoration:none}
@media(max-width:640px){.hero{padding:1rem}}
</style></head><body><section class="hero"><h1>{{TITLE}}</h1><p>{{TAGLINE}}</p><a class="btn" href="#">{{CTA}}</a></section>
<script>console.log("live");</script></body></html>`;

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

      const proj = path.match(/^\/api\/projects\/([0-9a-f-]{36})(\/[a-z-]+)?$/);
      if (proj) {
        const pid = proj[1];
        const sub = (proj[2] || "").replace("/", "");
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

        // serve file content (for preview/editor) from R2
        if (sub === "files" && method === "GET") {
          const cpKey = aiCtxKey(p);
          const files = await loadFiles(env, pid, p);
          return json({ files });
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
  try {
    const out = await gen(env, CODE_SYS, userMsg, 4000);
    const m = out.match(/\[\s*\{[\s\S]*\}\s*\]/);
    files = m ? JSON.parse(m[0]).map((f) => ({ path: f.path || "index.html", content: f.content || "" })) : [];
  } catch (e) {
    notes = "generation error: " + e.message;
  }
  if (!files.length) {
    const title = p.name || "My Site";
    files = [{ path: "index.html", content: FAKE_STARTER.replace("{{TITLE}}", title).replace("{{TAGLINE}}", p.description || "Built with CreateStuff").replace("{{CTA}}", "Get Started") }];
    notes = "generated starter (AI output unparsed)";
  }
  files = files.filter((f) => f.content).slice(0, 12);

  const cpId = `cp-${Date.now().toString(36)}`;
  await env.R2.put(`projects/${pid}/checkpoints/${cpId}`, JSON.stringify(files), { httpMetadata: { contentType: "application/json" } });
  const manifest = {};
  for (const f of files) manifest[f.path] = f.content.length;
  await env.DB.prepare("INSERT INTO checkpoints (id, project_id, message, files_changed, created_at, r2_key, file_size, manifest) VALUES (?,?,?,?,?,?,?,?)")
    .bind(cpId, pid, notes, JSON.stringify(files.map((f) => f.path)), new Date().toISOString(), `projects/${pid}/checkpoints/${cpId}`, JSON.stringify(files).length, JSON.stringify(manifest)).run();
  await env.DB.prepare("UPDATE projects SET status=?, ai_context=?, job_state='idle', job_log=?, updated_at=? WHERE id=?")
    .bind(files.length ? "ready" : "error", JSON.stringify({ ...aiCtx, files, lastCheckpoint: cpId }), JSON.stringify([{ t: Date.now(), msg: notes }]), new Date().toISOString(), pid).run();

  return json({ ok: true, notes, projectId: pid, files: files.map((f) => ({ path: f.path, size: f.content.length })), checkpoint: cpId }, 200);
}