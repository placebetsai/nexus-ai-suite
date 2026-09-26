(function(){
'use strict';

// Production forge-api runs on a third Cloudflare account with no API token on
// this machine, so it cannot be redeployed from here. createstuff-api runs on
// the account we control, bound to the same createstuff-db D1.
const API_BASE = 'https://createstuff-api.fashionistas1979.workers.dev';
const AUTH_KEY = 'cs_auth';
const TOKEN_KEY = 'cs_token';
const USER_KEY = 'cs_user';

function isLoggedIn() { return localStorage.getItem(AUTH_KEY) === 'true' }
function getToken() { return localStorage.getItem(TOKEN_KEY) }
function getUser() { try { return JSON.parse(localStorage.getItem(USER_KEY)) } catch { return null } }
function setAuth(token, user) {
  localStorage.setItem(AUTH_KEY, 'true');
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
function logout() {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  location.hash = '';
}

let currentPage = 'dashboard';
let projects = [];
// forge-api returns {projects:[...]}; the views below expect a bare array.
function csProjectList(r) {
  if (Array.isArray(r)) return r;
  if (r && Array.isArray(r.projects)) return r.projects;
  return [];
}

let templates = [];
let currentBuild = null;

// ============================================================
// API COMPATIBILITY SHIM
// Production forge-api has NO /api/templates, /api/builds,
// /api/projects/:id/download.zip, /api/github/create-repo or
// /api/github/push (verified against the 3036-line source).
// These back them with REAL services instead of dead routes:
//   templates  -> real local catalog
//   builds     -> real forge-api /api/ai/generate + /api/ai/publish
//   zip        -> real ZIP built in-browser (store method + CRC32)
//   github     -> real api.github.com using the user's own PAT
// ============================================================

const CS_TEMPLATE_ICONS = {
  storefront: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5h18v10.5H3z"/><path d="M2.5 9.5 4.8 4.5h14.4l2.3 5"/><path d="M9.5 20v-5.2h5V20"/></svg>',
  booking:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15.5" rx="2.6"/><path d="M3.5 9.6h17M8 3v4M16 3v4"/><path d="m9.2 15.2 2.1 2.1 3.9-4"/></svg>',
  dashboard:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2.6"/><path d="M7 16.5v-3.2M11 16.5v-6.4M15 16.5v-4.6M19 16.5v-7.6"/></svg>',
  blog:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20.5h16"/><path d="M16.4 4.4a2.1 2.1 0 0 1 3 3L9.2 17.7l-4 1 1-4z"/></svg>',
  course:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4 2.8 8.4 12 12.8l9.2-4.4z"/><path d="M6.6 10.6V16c0 1.7 2.4 3 5.4 3s5.4-1.3 5.4-3v-5.4"/><path d="M21.2 8.4v6.2"/></svg>',
  landing:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2.6"/><path d="M3 8.6h18"/><path d="M6.5 12.6h6.5M6.5 16.2h9.5"/></svg>'
};

const CS_TEMPLATE_CATALOG = [
  { id: 1, icon: 'storefront', name: 'Storefront', description: 'Product grid + cart for a small shop', tech_stack: 'HTML, CSS, JavaScript',
    prompt_template: 'Build a storefront with a product grid, product detail cards, a sliding cart drawer and a checkout summary section.' },
  { id: 2, icon: 'booking', name: 'Booking Page', description: 'Appointment slots + confirmation', tech_stack: 'HTML, CSS, JavaScript',
    prompt_template: 'Build a booking page with a date picker, available time slots, a customer details form and a confirmation panel.' },
  { id: 3, icon: 'dashboard', name: 'Dashboard', description: 'KPI cards, charts, table', tech_stack: 'HTML, CSS, JavaScript',
    prompt_template: 'Build an analytics dashboard with KPI cards, an inline SVG line chart, a bar chart and a sortable data table.' },
  { id: 4, icon: 'blog', name: 'Blog', description: 'Article list + reader view', tech_stack: 'HTML, CSS, JavaScript',
    prompt_template: 'Build a blog with a list of article cards and a reader view that opens a full article with a table of contents.' },
  { id: 5, icon: 'course', name: 'Course', description: 'Lessons, progress, quiz', tech_stack: 'HTML, CSS, JavaScript',
    prompt_template: 'Build a course page with a lesson list, a progress bar per lesson and a multiple choice quiz at the end.' },
  { id: 6, icon: 'landing', name: 'Landing', description: 'Hero, features, pricing, FAQ', tech_stack: 'HTML, CSS, JavaScript',
    prompt_template: 'Build a landing page with an animated hero, a features grid, three pricing tiers and an FAQ accordion.' },
];

// ---- real ZIP writer (store method, no compression) ----
const CS_CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function csCrc32(buf) { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = CS_CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function csDosDateTime(d) {
  const time = ((d.getHours() & 31) << 11) | ((d.getMinutes() & 63) << 5) | ((d.getSeconds() / 2) & 31);
  const date = (((d.getFullYear() - 1980) & 127) << 9) | (((d.getMonth() + 1) & 15) << 5) | (d.getDate() & 31);
  return { time, date };
}
function csBuildZip(files) {
  const enc = new TextEncoder(), now = csDosDateTime(new Date());
  const chunks = [], central = [];
  let offset = 0;
  for (const f of files) {
    const nameB = enc.encode(f.path.replace(/^\//, ''));
    const dataB = enc.encode(f.content);
    const crc = csCrc32(dataB);
    const lh = new Uint8Array(30 + nameB.length);
    const dv = new DataView(lh.buffer);
    dv.setUint32(0, 0x04034b50, true); dv.setUint16(4, 20, true); dv.setUint16(6, 0x0800, true);
    dv.setUint16(8, 0, true); dv.setUint16(10, now.time, true); dv.setUint16(12, now.date, true);
    dv.setUint32(14, crc, true); dv.setUint32(18, dataB.length, true); dv.setUint32(22, dataB.length, true);
    dv.setUint16(26, nameB.length, true); dv.setUint16(28, 0, true);
    lh.set(nameB, 30);
    chunks.push(lh, dataB);
    const ch = new Uint8Array(46 + nameB.length);
    const cv = new DataView(ch.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true); cv.setUint16(10, 0, true);
    cv.setUint16(12, now.time, true); cv.setUint16(14, now.date, true);
    cv.setUint32(16, crc, true); cv.setUint32(20, dataB.length, true); cv.setUint32(24, dataB.length, true);
    cv.setUint16(28, nameB.length, true); cv.setUint32(42, offset, true);
    ch.set(nameB, 46);
    central.push(ch);
    offset += lh.length + dataB.length;
  }
  const centralSize = central.reduce((s, c) => s + c.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true); ev.setUint32(16, offset, true);
  return new Blob([...chunks, ...central, eocd], { type: 'application/zip' });
}

// ---- GitHub PAT (user's own token; forge-api is read-only) ----
function csGhPat() { return localStorage.getItem('cs_gh_pat') || ''; }
async function csGh(path, opts = {}) {
  const pat = csGhPat();
  if (!pat) {
    const entered = prompt('Enter a GitHub Personal Access Token (repo scope) to create/push:\nCreate one at github.com/settings/tokens — it is stored only in this browser.');
    if (!entered) throw new Error('no token');
    localStorage.setItem('cs_gh_pat', entered.trim());
  }
  const res = await fetch(`https://api.github.com${path}`, {
    ...opts,
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${csGhPat()}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`GitHub ${res.status}: ${t.slice(0, 160)}`); }
  return res.status === 204 ? {} : res.json();
}

// ---- build store (real generate runs server-side on forge-api) ----
function csBuilds() { try { return JSON.parse(localStorage.getItem('cs_builds') || '{}'); } catch { return {}; } }
function csSaveBuilds(o) { localStorage.setItem('cs_builds', JSON.stringify(o)); }

// The preview iframe is srcdoc: <link href="styles.css"> would 404, so the
// generated stylesheet and script get inlined into the document we render.
function csInline(files) {
  if (!Array.isArray(files) || !files.length) return '';
  const html = files.filter(f => /\.html?$/i.test(f.path))
    .sort((a, b) => String(b.content || '').length - String(a.content || '').length)[0]
    || files.find(f => String(f.content || '').includes('<html')) || files[0];
  let doc = String(html.content || '');
  if (!doc) return '';
  const css = files.filter(f => /\.css$/i.test(f.path)).map(f => f.content).join('\n');
  const js = files.filter(f => /\.js$/i.test(f.path)).map(f => f.content).join('\n');
  if (css && !/<style[\s>]/i.test(doc)) {
    if (/<\/head>/i.test(doc)) doc = doc.replace(/<\/head>/i, `<style>\n${css}\n</style></head>`);
    else doc = `<style>\n${css}\n</style>` + doc;
  }
  if (js) {
    const safe = js.replace(/<\/script/gi, '<\\/script');
    if (/<script[^>]+src=/i.test(doc)) doc = doc.replace(/<script[^>]+src=[^>]*>\s*<\/script>/i, `<script>\n${safe}\n</script>`);
    else if (/<\/body>/i.test(doc)) doc = doc.replace(/<\/body>/i, `<script>\n${safe}\n</script></body>`);
    else doc += `<script>\n${safe}\n</script>`;
  }
  return doc;
}

async function csStartBuild(promptText, projectId) {
  const id = `b_${Date.now().toString(36)}`;
  const build = {
    id, project_id: projectId, prompt: promptText, status: 'running',
    agent_log: [{ agent: 'Planner', message: `Accepted brief: ${promptText.slice(0, 90)}` }],
    generated_code: '', error: null, started: Date.now(), done: false,
  };
  const all = csBuilds(); all[id] = build; csSaveBuilds(all);

  // REAL generation on forge-api
  api('/api/ai/generate', { method: 'POST', body: JSON.stringify({ projectId, plan: promptText }) })
    .then((r) => {
      const files = (r && r.files) || [];
      const b = csBuilds()[id];
      if (!b) return;
      b.files = files;
      b.model = r && r.model;
      b.generated_code = csInline(files);
      const bytes = files.reduce((n, f) => n + String(f.content || '').length, 0);
      // The classifier answered instead of building. That is an answer, not a
      // failure — calling a correct refusal "Build failed" would teach the
      // user that the agent saying no is an error.
      if (r && r.ok === false && r.notes) {
        b.status = 'answered';
        b.error = null;
        b.agent_log.push({ agent: 'Planner', message: r.notes });
        b.done = true;
        const a1 = csBuilds(); a1[id] = b; csSaveBuilds(a1);
        return;
      }
      if (b.generated_code) {
        b.agent_log.push({ agent: 'Planner', message: `${b.model || 'model'} returned ${files.length} file(s): ${files.map((f) => f.path).join(', ')}` });
        b.agent_log.push({ agent: 'Frontend', message: `${bytes} chars of real code, CSS and JS inlined into the preview` });
        b.status = 'completed';
      } else {
        b.status = 'failed';
        b.error = 'The model returned no usable files.';
        b.agent_log.push({ agent: 'System', message: `Build failed: ${(r && r.notes) || 'no files'}` });
      }
      b.done = true;
      const all = csBuilds(); all[id] = b; csSaveBuilds(all);
      lpAfterBuild(projectId).catch(() => {});
    })
    .catch((e) => {
      const b = csBuilds()[id];
      if (!b) return;
      b.status = 'failed'; b.error = String(e && e.message || e); b.done = true;
      const all = csBuilds(); all[id] = b; csSaveBuilds(all);
    });
  return build;
}

// ---- dispatcher: returns {ok:true,value} if handled, {ok:false} if it's a real API path ----
async function csShim(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  let body = null;
  try { body = options.body ? JSON.parse(options.body) : null; } catch { body = null; }

  // GET /api/templates -> real local catalog (route 404s on forge-api)
  if (method === 'GET' && path === '/api/templates') return { ok: true, value: CS_TEMPLATE_CATALOG };

  // POST /api/builds -> start a REAL forge-api generation
  if (method === 'POST' && path === '/api/builds') {
    return { ok: true, value: await csStartBuild((body && body.prompt) || '', body && body.project_id) };
  }

  // GET /api/builds/20 -> legacy "latest generated code" lookup
  if (method === 'GET' && path === '/api/builds/20') {
    const all = csBuilds();
    const ids = Object.keys(all).sort((a, c) => (all[c].started || 0) - (all[a].started || 0));
    const latest = ids.map((i) => all[i]).find((b) => b.generated_code);
    if (!latest) throw new Error('API error: 404');
    return { ok: true, value: { generated_code: latest.generated_code } };
  }

  // GET /api/builds/:id -> real progress + real generated_code
  const bm = path.match(/^\/api\/builds\/([^/]+)$/);
  if (method === 'GET' && bm) {
    const b = csBuilds()[bm[1]];
    if (!b) throw new Error('API error: 404');
    if (!b.done && Date.now() - b.started > 120000) {
      b.status = 'failed'; b.error = 'Generation timed out'; b.done = true;
      const all = csBuilds(); all[b.id] = b; csSaveBuilds(all);
    }
    return { ok: true, value: b };
  }

  // GET /api/builds/:id/versions -> REAL history for this project.
  // forge-api has no /versions route (its checkpoints are not listable), so this
  // returns builds we actually ran: real prompt, real code length, real timestamp,
  // and the real checkpoint id the server handed back on publish.
  const vm = path.match(/^\/api\/builds\/([^/]+)\/versions$/);
  if (method === 'GET' && vm) {
    const b = csBuilds()[vm[1]];
    if (!b) throw new Error('API error: 404');
    const hist = Object.values(csBuilds())
      .filter(x => x.project_id === b.project_id)
      .sort((a, c) => (a.started || 0) - (c.started || 0));
    return {
      ok: true,
      value: hist.map((x, i) => ({
        version: i + 1,
        note: (x.published_url ? 'Put online' : x.status === 'completed' ? 'Built' : x.status) +
              ': ' + String(x.prompt || '').slice(0, 70),
        code_len: (x.generated_code || '').length,
        created_at: new Date(x.started || Date.now()).toISOString(),
        checkpoint_id: x.checkpoint_id || null,
        status: x.status,
      })),
    };
  }

  // POST /api/builds/:id/deploy -> REAL forge-api publish
  const dm = path.match(/^\/api\/builds\/([^/]+)\/deploy$/);
  if (method === 'POST' && dm) {
    const b = csBuilds()[dm[1]];
    if (!b) throw new Error('API error: 404');
    const r = await api('/api/ai/publish', { method: 'POST', body: JSON.stringify({ projectId: b.project_id }) });
    const url = (r && (r.publishUrl || r.publish_url || r.url)) || '';
    if (!url) throw new Error('API error: 502');
    b.checkpoint_id = r.checkpointId || r.checkpoint_id || null;
    b.published_url = url;
    b.published_at = Date.now();
    { const all = csBuilds(); all[b.id] = b; csSaveBuilds(all); }
    showLivePanel(url, { projectId: b.project_id, reason: 'publish' }).catch(() => {});
    return { ok: true, value: { url, ok: true } };
  }

  // GitHub WRITE (forge-api is read-only) -> user's own PAT against api.github.com
  if (path === '/api/github/create-repo' && method === 'POST') {
    const r = await csGh('/user/repos', { method: 'POST', body: JSON.stringify({ name: body.name, description: body.description || '', private: false }) });
    return { ok: true, value: { full_name: r.full_name, html_url: r.html_url } };
  }
  if (path === '/api/github/push' && method === 'POST') {
    const rel = String(body.path || 'index.html').replace(/^\/+/, '');
    let sha;
    try { const cur = await csGh(`/repos/${body.repo}/contents/${rel}?ref=${encodeURIComponent(body.branch || 'main')}`); sha = cur && cur.sha; } catch { /* new file */ }
    const r = await csGh(`/repos/${body.repo}/contents/${rel}`, {
      method: 'PUT',
      body: JSON.stringify({
        message: body.message || 'Update from CreateStuff.ai',
        content: btoa(unescape(encodeURIComponent(body.content || ''))),
        branch: body.branch || 'main',
        ...(sha ? { sha } : {}),
      }),
    });
    return { ok: true, value: { html_url: r && r.content && r.content.html_url } };
  }

  return { ok: false }; // not shimmed -> real API
}

// ---- real ZIP download: list files, pull content from /published/<pid>/<path> ----
async function csDownloadZip(projectId) {
  const token = getToken();
  const j = async (p) => {
    const r = await fetch(`${API_BASE}${p}`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!r.ok) throw new Error(`API error: ${r.status}`);
    return r.json();
  };
  // publish first so every file exists in R2
  try {
    await fetch(`${API_BASE}/api/ai/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ projectId }),
    });
  } catch { /* continue: files may already be published */ }
  const listing = await j(`/api/projects/${projectId}/files`);
  const paths = ((listing && listing.files) || []).map((f) => f.path);
  if (!paths.length) throw new Error('API error: 404 empty project');
  const files = [];
  for (const p of paths) {
    const r = await fetch(`${API_BASE}/published/${projectId}/${p}`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (r.ok) files.push({ path: p, content: await r.text() });
  }
  if (!files.length) throw new Error('API error: 404 no content');
  return { blob: csBuildZip(files), filename: `project-${projectId}.zip` };
}

async function api(path, options = {}) {
  const shimmed = await csShim(path, options);      // dead routes -> real backends
  if (shimmed.ok) return shimmed.value;
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    let msg = `API error: ${res.status}`;
    try { const j = await res.json(); if (j && j.error) msg = j.error; } catch {}
    const e = new Error(msg); e.status = res.status; throw e;
  }
  return res.json();
}

function init() {
  if (!isLoggedIn()) { showLogin(); return; }
  showApp();
  setupRouter();
  setupSidebar();
  setupMobile();
  setupLogout();
  renderPage('dashboard');
}

function showLogin() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
  // forge-api's login expects {email,password} (NOT {username,...}) and
  // register expects {email,name,password}. Offer both flows.
  let authMode = 'login';
  const errBox = document.getElementById('login-error');
  const submitBtn = document.getElementById('login-submit');
  const nameGroup = document.getElementById('login-name-group');
  const toggle = document.getElementById('auth-toggle');

  function paintAuth() {
    const registering = authMode === 'register';
    if (submitBtn) submitBtn.textContent = registering ? 'Create Account' : 'Sign In';
    if (nameGroup) nameGroup.style.display = registering ? 'block' : 'none';
    if (toggle) toggle.textContent = registering ? 'Back to sign in' : 'Create one free';
    const pass = document.getElementById('login-pass');
    if (pass) pass.setAttribute('autocomplete', registering ? 'new-password' : 'current-password');
    if (errBox) { errBox.style.display = 'none'; errBox.textContent = ''; }
  }
  if (toggle) toggle.onclick = (e) => { e.preventDefault(); authMode = authMode === 'login' ? 'register' : 'login'; paintAuth(); };
  paintAuth();

  document.getElementById('login-form').onsubmit = async function(e) {
    e.preventDefault();
    const email = document.getElementById('login-user').value.trim();
    const p = document.getElementById('login-pass').value;
    const nameEl = document.getElementById('login-name');
    if (submitBtn) submitBtn.disabled = true;
    try {
      const data = authMode === 'register'
        ? await api('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({
              email,
              name: (nameEl && nameEl.value.trim()) || email.split('@')[0],
              password: p,
            }),
          })
        : await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password: p }) });
      if (!data || !data.token) throw new Error('No session token returned');
      setAuth(data.token, data.user);
      showApp();
      setupRouter();
      setupSidebar();
      setupMobile();
      setupLogout();
      renderPage('dashboard');
    } catch (err) {
      if (errBox) { errBox.textContent = err.message || 'Sign in failed'; errBox.style.display = 'block'; }
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  };
}

function showApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  const user = getUser();
  if (user) {
    const welcome = document.querySelector('#page-dashboard .page-header h1');
    const displayName = user.display_name || user.name || user.username || 'there';
    if (welcome) welcome.textContent = `Welcome back, ${displayName}`;
  }
}

function setupRouter() {
  window.onhashchange = function() { renderPage(location.hash.slice(1) || 'dashboard') };
  renderPage(location.hash.slice(1) || 'dashboard');
}

function setupSidebar() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.onclick = function(e) { e.preventDefault(); renderPage(this.dataset.page) };
  });
  document.querySelectorAll('.quick-action-btn').forEach(btn => {
    btn.onclick = function(e) { e.preventDefault(); renderPage(this.dataset.page) };
  });
}

function renderPage(page) {
  currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if (el) el.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => { n.classList.toggle('active', n.dataset.page === page) });
  location.hash = page;
  if (page === 'dashboard') loadDashboard();
  if (page === 'projects') loadProjects();
  if (page === 'templates') loadTemplates();
  if (page === 'builder') setupBuilder();
  if (page === 'github') loadGitHubRepos();
  if (page === 'files') loadFilesPage();
  if (page === 'launch') loadLaunch();
  if (page === 'deploy') loadDeployPage();
  if (page === 'settings') loadSettings();
  document.getElementById('sidebar').classList.remove('open');
}

function setupMobile() {
  document.getElementById('menu-toggle').onclick = function() { document.getElementById('sidebar').classList.toggle('open') };
  document.getElementById('mobile-logout').onclick = logout;
}

function setupLogout() { document.getElementById('logout-btn').onclick = logout }

// ============ DASHBOARD ============
async function loadDashboard() {
  try {
    projects = csProjectList(await api('/api/projects'));
    // Real numbers only: projects come from the API, the rest are counted from
    // builds we actually generated/published in this browser.
    const bs = Object.values(csBuilds());
    const deployed = projects.filter(p => p.status === 'deployed').length;
    const builds = bs.filter(b => b.status === 'running' || b.status === 'completed').length;
    const deploys = bs.filter(b => b.published_url).length;
    const lines = bs.reduce((sum, b) => {
      const code = b.generated_code || '';
      const fromFiles = (b.files || []).reduce((n, f) => n + String(f.content || '').split('\n').length, 0);
      return sum + (code ? code.split('\n').length : 0) || fromFiles;
    }, 0);

    const setStat = (key, val) => {
      const el = document.querySelector('[data-stat="' + key + '"]');
      if (el) el.dataset.count = String(Math.max(0, val || 0));
    };
    setStat('projects', projects.length);
    setStat('builds', builds);
    setStat('deployed', deploys || deployed);
    setStat('lines', lines);

    animateStats();
    renderRecentProjects(projects.slice(0, 3));
    renderHiveStatus();
  } catch (err) {
    console.error('Dashboard load error:', err);
    animateStats();
  }
}

function animateStats() {
  document.querySelectorAll('.stat-value[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count);
    let current = 0;
    const step = Math.max(1, Math.ceil(target / 30));
    const iv = setInterval(() => {
      current += step;
      if (current >= target) { current = target; clearInterval(iv) }
      el.textContent = current.toLocaleString();
    }, 30);
  });
}

function renderRecentProjects(projs) {
  const el = document.getElementById('recent-projects');
  if (!el) return;
  if (!projs.length) {
    el.innerHTML = '<p style="font-size:.85rem;color:var(--text3);line-height:1.6">Nothing here yet. Press <b>Start here</b> above and you will have something to show in a few minutes.</p>';
    return;
  }
  el.innerHTML = projs.map(p => `
    <div class="recent-item" onclick="renderPage('projects')">
      <span class="recent-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.2l2 2h7.8A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z"/></svg></span>
      <div class="recent-info">
        <div class="recent-name">${p.name}</div>
        <div class="recent-meta">${p.tech_stack || ''} · ${p.status}</div>
      </div>
    </div>
  `).join('');
}

function renderHiveStatus() {
  const el = document.getElementById('hive-status-dash');
  if (!el) return;
  const agents = ['Planner','Architect','Frontend','Backend','Style','Test','Online','Git','Fix'];
  const icons = ['<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7h12M8 12h12M8 17h8"/><path d="M4 7h.01M4 12h.01M4 17h.01"/></svg>','<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.2 20 7.6v8.8L12 20.8 4 16.4V7.6z"/><path d="M12 8.4 16 10.6v4.2M12 8.4 8 10.6v4.2M12 8.4v4.2"/></svg>','<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/></svg>','<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.2 20 7.6v8.8L12 20.8 4 16.4V7.6z"/><path d="M12 8.4 16 10.6v4.2M12 8.4 8 10.6v4.2M12 8.4v4.2"/></svg>','<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.2 20 7.6v8.8L12 20.8 4 16.4V7.6z"/><path d="M12 8.4 16 10.6v4.2M12 8.4 8 10.6v4.2M12 8.4v4.2"/></svg>','<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.2 20 7.6v8.8L12 20.8 4 16.4V7.6z"/><path d="M12 8.4 16 10.6v4.2M12 8.4 8 10.6v4.2M12 8.4v4.2"/></svg>','<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2.5 11 13M21.5 2.5l-6.8 19-3.7-8.5L2.5 9.3z"/></svg>','<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.2 20 7.6v8.8L12 20.8 4 16.4V7.6z"/><path d="M12 8.4 16 10.6v4.2M12 8.4 8 10.6v4.2M12 8.4v4.2"/></svg>','<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.2 20 7.6v8.8L12 20.8 4 16.4V7.6z"/><path d="M12 8.4 16 10.6v4.2M12 8.4 8 10.6v4.2M12 8.4v4.2"/></svg>'];
  el.innerHTML = agents.map((a, i) => `<div class="hive-agent"><span class="dot"></span>${icons[i]} ${a}</div>`).join('');
}

// ============ PROJECTS ============
async function loadProjects() {
  try {
    projects = csProjectList(await api('/api/projects'));
    renderProjects();
  } catch (err) {
    console.error('Projects load error:', err);
    projects = [];
    renderProjects();
  }
}

function renderProjects() {
  const grid = document.getElementById('projects-grid');
  if (!grid) return;
  if (!projects.length) {
    grid.innerHTML = '<div class="empty-state"><p>No apps yet. Press Start here to make your first one.</p></div>';
    return;
  }
  grid.innerHTML = projects.map(p => `
    <div class="project-card">
      <div class="project-visual"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 8.5 4.5 12l4 3.5M15.5 8.5l4 3.5-4 3.5M13.5 5.5l-3 13"/></svg></div>
      <div class="project-info">
        <div class="project-name">${p.name}</div>
        <div class="project-meta">${p.tech_stack || ''} · ${p.status}</div>
        <div class="project-meta"><span class="deploy-status ${p.status === 'deployed' ? 'deploy-live' : 'deploy-pending'}">● ${p.status}</span></div>
      </div>
      <div class="project-actions">
        <button onclick="editProject('${p.id}')" data-tip="Opens the chat builder so you can keep working on this app." title="Opens the chat builder so you can keep working on this app.">Edit</button>
        <button onclick="cloneProject('${p.id}')" data-tip="Makes a second copy of this app, so you can change one and leave the other alone." title="Makes a second copy of this app, so you can change one and leave the other alone.">Copy</button>
        <button onclick="deleteProject('${p.id}')" data-tip="Removes this app and its files for good. There is no undo." title="Removes this app and its files for good. There is no undo.">Delete</button>
      </div>
    </div>
  `).join('');
}

window.editProject = function(id) {
  renderPage('builder');
};

window.cloneProject = async function(id) {
  const project = projects.find(p => p.id === id);
  if (!project) return;
  try {
    await api('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name: project.name + ' (Copy)', description: project.description, icon: project.icon, tech_stack: project.tech_stack }),
    });
    loadProjects();
    showToast('Copy made');
  } catch (err) {
    showToast('Could not make a copy');
  }
};

window.deleteProject = async function(id) {
  if (!confirm('Delete this app for good? This cannot be undone.')) return;
  try {
    await api(`/api/projects/${id}`, { method: 'DELETE' });
    loadProjects();
    showToast('App deleted');
  } catch (err) {
    showToast('Could not delete it');
  }
};

// ============ TEMPLATES ============
async function loadTemplates() {
  try {
    templates = await api('/api/templates');
    renderTemplates();
  } catch (err) {
    console.error('Templates load error:', err);
    templates = [];
    renderTemplates();
  }
}

function renderTemplates() {
  const grid = document.getElementById('templates-grid');
  if (!grid) return;
  if (!templates.length) {
    grid.innerHTML = '<div class="empty-state"><p>No templates available.</p></div>';
    return;
  }
  grid.innerHTML = templates.map(t => `
    <div class="template-card" onclick="useTemplate(${t.id})">
      <div class="template-visual">${CS_TEMPLATE_ICONS[t.icon] || CS_TEMPLATE_ICONS.landing}</div>
      <div class="template-info">
        <div class="template-name">${t.name}</div>
        <div class="template-meta">${t.description}</div>
        <div style="display:flex;gap:.35rem;margin-top:.5rem;flex-wrap:wrap">
          ${(t.tech_stack || '').split(', ').map(tech => `<span style="font-size:.65rem;padding:.15rem .4rem;background:var(--bg3);border-radius:4px;color:var(--text2)">${tech}</span>`).join('')}
        </div>
      </div>
    </div>
  `).join('');
}

window.useTemplate = function(id) {
  const template = templates.find(t => t.id === id);
  if (!template) return;
  renderPage('builder');
  setTimeout(() => {
    document.getElementById('chat-input').value = template.prompt_template;
  }, 500);
};

// ============ GITHUB ============
async function loadGitHubRepos() {
  const list = document.getElementById('repo-list');
  if (!list) return;
  list.innerHTML = '<div class="empty-state"><p>Looking for your projects on GitHub…</p></div>';
  try {
    const data = await api('/api/github/repos');
    const repos = data.repos || [];
    const status = document.getElementById('gh-status');
    // forge-api reports connected:false with its own message — surface it instead
    // of hiding the connect card and implying an authorised session exists.
    if (data.connected === false) {
      document.getElementById('gh-connect').style.display = 'block';
      document.getElementById('gh-repos').style.display = 'block';
      if (status) status.textContent = data.message || 'GitHub is not connected yet.';
      list.innerHTML = `<div class="empty-state"><p>${escapeHtml(data.message || 'GitHub not connected.')}</p></div>`;
    } else {
      document.getElementById('gh-connect').style.display = 'none';
      document.getElementById('gh-repos').style.display = 'block';
      if (status) status.textContent = 'Connected — here are your saved projects.';
      if (!repos.length) {
        list.innerHTML = '<div class="empty-state"><p>We could not find any projects on your GitHub account.</p></div>';
      } else {
        list.innerHTML = repos.map(r => `
          <div class="repo-item" style="display:flex;justify-content:space-between;align-items:center;padding:.85rem;border:1px solid var(--border);border-radius:8px;margin-bottom:.5rem;background:var(--bg2)">
            <div>
              <div style="font-weight:600">${escapeHtml(r.name)}</div>
              <div style="font-size:.8rem;color:var(--text2)">${escapeHtml(r.language || '')} · <svg viewBox="0 0 24 24" width="11" height="11" style="fill:currentColor;vertical-align:-1px"><path d="m12 3.4 2.65 5.37 5.93.86-4.29 4.18 1.01 5.9L12 16.9l-5.3 2.8 1.01-5.9L3.42 9.63l5.93-.86z"/></svg> ${r.stargazers_count} · updated ${new Date(r.updated_at).toLocaleDateString()}</div>
              ${r.description ? `<div style="font-size:.8rem;color:var(--text3);margin-top:.25rem">${escapeHtml(r.description)}</div>` : ''}
            </div>
            <a href="${escapeHtml(r.html_url)}" target="_blank" rel="noopener" data-tip="Opens this repository on github.com in a new tab." title="Opens this repository on github.com in a new tab." style="padding:.35rem .75rem;border-radius:6px;background:var(--bg3);color:var(--text);text-decoration:none;font-size:.8rem;border:1px solid var(--border)">Open</a>
          </div>
        `).join('');
        showToast(`Found ${repos.length} projects on GitHub`);
      }
    }
    ensureImportSection();
  } catch (err) {
    list.innerHTML = '<div class="empty-state"><p>Could not reach GitHub. Check the connection and try again.</p></div>';
    showToast('GitHub is unreachable right now');
  }
}

function ensureImportSection() {
  const pageGithub = document.getElementById('page-github');
  if (!pageGithub) return;
  if (document.getElementById('gh-import')) return;
  const importHtml = `
    <div class="card" id="gh-import" style="margin-top:1rem">
      <h3><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:.4rem"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15v3"/></svg>Bring in a project from GitHub</h3>
      <p style="color:var(--text2);margin-bottom:.75rem;font-size:.85rem">Paste the link to a project you keep on GitHub (it looks like https://github.com/owner/name) and we copy its files in as a new app you can edit here.</p>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap">
        <input type="url" id="import-repo-url" placeholder="https://github.com/owner/repo" data-tip="Paste the full web address of your repository, starting with https://github.com/" title="Paste the full web address of your repository, starting with https://github.com/" style="flex:1;min-width:220px;padding:.5rem;border-radius:8px;border:1px solid var(--border);background:var(--bg2);color:var(--text)">
        <button class="btn-primary" id="import-repo-btn" data-tip="Copies a project from your GitHub account into CreateStuff so you can work on it here." title="Copies a project from your GitHub account into CreateStuff so you can work on it here."><span id="import-btn-text">Bring it in</span><span id="import-btn-spinner" class="cs-spin" style="display:none;margin-left:.5rem"></span></button>
      </div>
      <div id="import-result" style="margin-top:.75rem;display:none"></div>
    </div>
  `;
  pageGithub.insertAdjacentHTML('beforeend', importHtml);
  const btn = document.getElementById('import-repo-btn');
  const input = document.getElementById('import-repo-url');
  if (btn) btn.onclick = handleImportClick;
  if (input) input.onkeydown = (e) => { if (e.key === 'Enter') handleImportClick(); };
}

let importInProgress = false;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) importInProgress = false;
});

async function handleImportClick() {
  if (importInProgress) return;
  const input = document.getElementById('import-repo-url');
  const btn = document.getElementById('import-repo-btn');
  const btnText = document.getElementById('import-btn-text');
  const btnSpinner = document.getElementById('import-btn-spinner');
  const resultDiv = document.getElementById('import-result');
  const url = input?.value?.trim();
  if (!url) { showToast('Paste a GitHub link first'); return; }
  if (!/^https:\/\/github\.com\/[\w\-]+\/[\w\-.]+/.test(url)) { showToast('That does not look like a GitHub link'); return; }

  importInProgress = true;
  if (btn) btn.disabled = true;
  if (btnText) btnText.textContent = 'Bringing it in…';
  if (btnSpinner) btnSpinner.style.display = 'inline';
  if (resultDiv) { resultDiv.style.display = 'none'; resultDiv.innerHTML = ''; }

  try {
    const resp = await api('/api/github/import', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
    const { project, repo, imported, files } = resp || {};
    if (!project || !imported) throw new Error('Unexpected response from server');

    if (resultDiv) {
      resultDiv.style.display = 'block';
      resultDiv.innerHTML = `
        <div style="padding:.75rem;background:var(--green);color:#052e16;border-radius:8px;font-size:.85rem">
          <div style="font-weight:600;margin-bottom:.25rem">Brought in ${escapeHtml(repo)}</div>
          <div>New app: <strong>${escapeHtml(project.name)}</strong> (${escapeHtml(project.tech_stack || 'unknown')})</div>
          <div>Files copied: <strong>${files?.length || 0}</strong></div>
          ${files?.length ? `<details style="margin-top:.5rem"><summary style="cursor:pointer;color:var(--text2)">Show file names</summary><ul style="margin:.5rem 0;padding-left:1.25rem;font-family:monospace;font-size:.75rem">${files.map(f => `<li>${escapeHtml(f.path)} (${f.size}b)</li>`).join('')}</ul></details>` : ''}
        </div>
      `;
    }
    showToast(`Brought in ${files?.length || 0} files from ${repo}`);
    input.value = '';
    loadProjects();
  } catch (err) {
    const status = err?.status;
    let msg = err?.message || 'We could not bring that in';
    if (status === 400) msg = 'That link does not look like a GitHub project link.';
    else if (status === 401) msg = 'Please sign in again.';
    else if (status === 429) msg = 'Too many tries — wait a moment and try again.';
    else if (status === 502) msg = 'We could not find that project on GitHub.';
    if (resultDiv) {
      resultDiv.style.display = 'block';
      resultDiv.innerHTML = `<div style="padding:.75rem;background:var(--red);color:#7f1d1d;border-radius:8px;font-size:.85rem">${escapeHtml(msg)}</div>`;
    }
    showToast(msg);
  } finally {
    importInProgress = false;
    if (btn) btn.disabled = false;
    if (btnText) btnText.textContent = 'Bring it in';
    if (btnSpinner) btnSpinner.style.display = 'none';
  }
}

// ============ DEPLOY ============
async function loadDeployPage() {
  const grid = document.getElementById('deploy-cards');
  if (!grid) return;
  // bound even with zero projects: connecting a domain is impossible without
  // one, and saying so plainly beats leaving a dead button on the page.
  const dcb = document.getElementById('domain-connect-btn');
  if (dcb) dcb.onclick = function () {
    const v = (document.getElementById('custom-domain').value || '').trim();
    if (!v) { showToast('Type an address first'); return; }
    window.csLaunchConnect(v);
  };
  grid.innerHTML = '<div class="empty-state"><p>Looking for your apps…</p></div>';
  try {
    projects = csProjectList(await api('/api/projects'));
    if (!projects.length) {
      grid.innerHTML = '<div class="empty-state"><p>No apps yet. Make one first, then come back here to put it online.</p></div>';
      return;
    }
    // Get latest build for each project if deployed, show status
    grid.innerHTML = projects.map(p => `
      <div class="deploy-card card" style="padding:1.25rem">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem">
          <div>
            <div style="font-weight:700">${escapeHtml(p.name)}</div>
            <div style="font-size:.8rem;color:var(--text2)">${escapeHtml(p.status || 'draft')}</div>
          </div>
          <span class="deploy-status ${p.status === 'deployed' ? 'deploy-live' : 'deploy-pending'}">● ${p.status === 'deployed' ? 'Live' : 'Pending'}</span>
        </div>
        ${p.deploy_url ? `<a href="${escapeHtml(p.deploy_url)}" target="_blank" rel="noopener" data-tip="Opens your live app in a new tab." title="Opens your live app in a new tab." style="display:block;font-size:.8rem;color:#3b82f6;word-break:break-all;margin-bottom:.75rem">${escapeHtml(p.deploy_url)}</a>` : ''}
        <button class="btn-primary" onclick="deployLatestBuild('${p.id}')" style="width:100%" data-tip="Puts this app on a web address other people can visit." title="Puts this app on a web address other people can visit."><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2.5 11 13M21.5 2.5l-6.8 19-3.7-8.5L2.5 9.3z"/></svg> ${p.status === 'deployed' ? 'Put online again' : 'Put online'}</button>
      </div>
    `).join('');
  } catch (err) {
    grid.innerHTML = '<div class="empty-state"><p>We could not load your apps here. Go to Your apps and try again.</p></div>';
  }
}

window.deployLatestBuild = async function(projectId) {
  try {
    showToast('Finding your latest app...');
    // Find builds by creating a lightweight lookup: we track builds via project status
    // For simplicity, use project's last known build via builds API - need build id.
    // We'll store last build id on project creation path; fallback: scan via builds not listed.
    // Instead: call a deploy endpoint that finds most recent completed build for project.
    const buildId = await findLatestBuildId(projectId);
    if (!buildId) { showToast('Nothing finished yet — build this app first'); return; }
    const result = await api(`/api/builds/${buildId}/deploy`, { method: 'POST', body: JSON.stringify({}) });
    showToast('It is online! Opening your web address...');
    window.open(result.url, '_blank');
    loadDeployPage();
  } catch (err) {
    showToast('Putting it online failed — try again');
  }
};

async function findLatestBuildId(projectId) {
  // Builds aren't listable; track currentBuild if same project
  if (currentBuild && currentBuild.project_id === projectId && currentBuild.status === 'completed') {
    return currentBuild.id;
  }
  // Fallback: try to get from projects grid build_count - we need an endpoint.
  // Use stored mapping from this session:
  try {
    const stored = JSON.parse(sessionStorage.getItem('cs_build_map') || '{}');
    if (stored[projectId]) return stored[projectId];
  } catch {}
  return null;
}

function loadSettings() {
  const user = getUser();
  if (user) {
    const nameInput = document.querySelector('#page-settings .card:first-of-type input[type="text"]');
    const emailInput = document.querySelector('#page-settings .card:first-of-type input[type="email"]');
    const saveBtn = document.querySelector('#page-settings .card:first-of-type button.btn-primary');
    if (nameInput && user.display_name) nameInput.value = user.display_name;
    if (emailInput && user.email) emailInput.value = user.email;
    if (saveBtn) {
      saveBtn.onclick = async function() {
        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        if (!name || !email) { showToast('Fill in both fields'); return; }
        try {
          await api('/api/auth/me', {
            method: 'PUT',
            body: JSON.stringify({ display_name: name, email }),
          });
          user.display_name = name;
          user.email = email;
          localStorage.setItem(USER_KEY, JSON.stringify(user));
          const welcome = document.querySelector('#page-dashboard .page-header h1');
          if (welcome) welcome.textContent = `Welcome back, ${name}`;
          showToast('Saved');
        } catch (e) {
          showToast('Save failed');
        }
      };
    }
  }

  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const stored = localStorage.getItem('cs_theme');
    themeToggle.checked = stored ? stored === 'dark' : prefersDark;
    document.documentElement.classList.toggle('dark', themeToggle.checked);
    themeToggle.onchange = function() {
      const isDark = this.checked;
      document.documentElement.classList.toggle('dark', isDark);
      localStorage.setItem('cs_theme', isDark ? 'dark' : 'light');
    };
  }

  const aiKeyInput = document.querySelector('#page-settings .card:last-of-type input[placeholder="sk-..."]');
  const ghKeyInput = document.querySelector('#page-settings .card:last-of-type input[placeholder="ghp_..."]');
  const saveKeysBtn = document.querySelector('#page-settings .card:last-of-type button.btn-primary');
  if (aiKeyInput) aiKeyInput.value = localStorage.getItem('cs_ai_key') || '';
  if (ghKeyInput) ghKeyInput.value = localStorage.getItem('cs_gh_pat') || '';
  if (saveKeysBtn) {
    saveKeysBtn.onclick = function() {
      const aiKey = aiKeyInput.value.trim();
      const ghKey = ghKeyInput.value.trim();
      if (aiKey) localStorage.setItem('cs_ai_key', aiKey); else localStorage.removeItem('cs_ai_key');
      if (ghKey) localStorage.setItem('cs_gh_pat', ghKey); else localStorage.removeItem('cs_gh_pat');
      showToast('Keys saved');
    };
  }
}

// ============ BUILDER ============
let agentLogSeen = 0;

function setupBuilder() {
  const sendBtn = document.getElementById('send-btn');
  const input = document.getElementById('chat-input');
  const voiceBtn = document.getElementById('voice-btn');

  sendBtn.onclick = function() { const v = input.value.trim(); if (v) { input.value = ''; startBuild(v) } };
  input.onkeydown = function(e) { if (e.key === 'Enter') { const v = input.value.trim(); if (v) { input.value = ''; startBuild(v) } } };

  if (voiceBtn) {
    voiceBtn.onclick = function() {
      if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        showToast('Voice not supported in this browser');
        return;
      }
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.onresult = function(event) {
        const text = event.results[0][0].transcript;
        input.value = text;
        setTimeout(() => { input.value = ''; startBuild(text) }, 500);
      };
      recognition.start();
    };
  }

  document.querySelectorAll('.preview-mode').forEach(btn => {
    btn.onclick = function() {
      document.querySelectorAll('.preview-mode').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const frame = document.getElementById('preview-frame');
      if (!frame) return;
      if (this.dataset.mode === 'phone') {
        frame.style.maxWidth = '375px';
        frame.style.margin = '0 auto';
        frame.style.borderRadius = '24px';
        frame.style.boxShadow = '0 0 0 8px #111, 0 20px 40px -20px rgba(0,0,0,.8)';
      } else {
        frame.style.maxWidth = 'none';
        frame.style.margin = '0';
        frame.style.borderRadius = '8px';
        frame.style.boxShadow = 'none';
      }
    };
  });
}

async function startBuild(prompt) {
  const chat = document.getElementById('chat-messages');
  const agentStatusBar = document.getElementById('agent-status-bar');
  const previewFrame = document.getElementById('preview-frame');

  chat.innerHTML += `<div class="msg user"><div class="msg-avatar"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20.2a7.5 7.5 0 0 1 15 0"/></svg></div><div class="msg-content">${escapeHtml(prompt)}</div></div>`;

  document.querySelectorAll('.agent-chip').forEach(c => { c.classList.remove('working', 'done'); c.querySelector('.agent-status-text').textContent = 'Idle' });

  agentStatusBar.innerHTML = '<span class="status-dot active"></span>The team is working…';
  agentLogSeen = 0;
  addAgentMsg('Planner', 'Reading what you asked for...');

  try {
    const projectResp = await api('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name: prompt.substring(0, 50), description: prompt, status: 'building' }),
    });
    // forge-api returns 201 {project:{...}} — unwrap so project.id is real.
    const project = projectResp && projectResp.project ? projectResp.project : projectResp;
    if (!project || !project.id) throw new Error('Project was not created');

    const build = await api('/api/builds', {
      method: 'POST',
      body: JSON.stringify({ project_id: project.id, prompt, project_name: project.name }),
    });

    // Track build for deploy page
    try {
      const map = JSON.parse(sessionStorage.getItem('cs_build_map') || '{}');
      map[project.id] = build.id;
      sessionStorage.setItem('cs_build_map', JSON.stringify(map));
    } catch {}

    let attempts = 0;
    const pollInterval = setInterval(async () => {
      attempts++;
      try {
        const buildStatus = await api(`/api/builds/${build.id}`);
        currentBuild = buildStatus;

        if (buildStatus.agent_log && Array.isArray(buildStatus.agent_log)) {
          while (agentLogSeen < buildStatus.agent_log.length) {
            const log = buildStatus.agent_log[agentLogSeen++];
            addAgentMsg(log.agent, log.message, log.code);
          }
        }

        if (buildStatus.status === 'completed') {
          clearInterval(pollInterval);

          document.querySelectorAll('.agent-chip').forEach(c => {
            c.classList.remove('working');
            c.classList.add('done');
            c.querySelector('.agent-status-text').textContent = 'Done';
          });

          agentStatusBar.innerHTML = '<span class="status-dot" style="background:var(--green)"></span>All done!';

          if (buildStatus.generated_code) {
            previewFrame.innerHTML = `
              <iframe id="live-preview" sandbox="allow-scripts" style="width:100%;height:100%;min-height:400px;border:none;border-radius:8px;background:#fff" srcdoc="${escapeHtml(buildStatus.generated_code)}"></iframe>
              <div style="display:flex;gap:.5rem;padding:.5rem;background:var(--bg2);border-top:1px solid var(--border)">
                <button onclick="deployBuild('${buildStatus.id}')" class="btn-primary" style="flex:1;padding:.5rem" data-tip="Puts this app on a web address other people can visit." title="Puts this app on a web address other people can visit."><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2.5 11 13M21.5 2.5l-6.8 19-3.7-8.5L2.5 9.3z"/></svg> Put online</button>
                <button onclick="loadVersions('${buildStatus.id}')" style="flex:1;padding:.5rem;border:1px solid var(--border);border-radius:6px;background:var(--bg3);color:var(--text);cursor:pointer" data-tip="Earlier versions of this app, so you can go back to one." title="Earlier versions of this app, so you can go back to one."><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7.5A2.5 2.5 0 0 0 5 5.5v13A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V8z"/><path d="M14 3v5h5"/></svg> Version history</button>
              </div>
              <div id="versions-panel" style="display:none;padding:.75rem;background:var(--bg2);border-top:1px solid var(--border);max-height:150px;overflow:auto"></div>
            `;
          }

          addAgentMsg('Online', 'All done! Press Put online to get a web address people can visit.');
          showToast('Build complete!');
        } else if (buildStatus.status === 'answered') {
          clearInterval(pollInterval);
          agentStatusBar.innerHTML = '<span class="status-dot" style="background:var(--green)"></span>No site was built - the answer is above.';
          showToast('Answered above');
        } else if (buildStatus.status === 'failed') {
          clearInterval(pollInterval);
          agentStatusBar.innerHTML = '<span class="status-dot" style="background:var(--red)"></span>Build failed';
          addAgentMsg('System', 'Build failed: ' + (buildStatus.error || 'unknown error'));
          showToast('Build failed');
        }

        // Chips must reflect which agent actually wrote a log entry. Numbering
        // them off by index claimed "Architect: Done / Backend: Done" and
        // "Frontend: Working" on runs where none of those were ever called —
        // including a refusal, where only the Planner answered.
        const ran = new Set((buildStatus.agent_log || []).map((l) => String((l && l.agent) || '').toLowerCase()));
        ['Planner', 'Architect', 'Frontend', 'Backend', 'Style', 'Test', 'Deploy'].forEach((name) => {
          const chip = document.querySelector(`.agent-chip[data-agent="${name.toLowerCase()}"]`);
          if (!chip) return;
          const txt = chip.querySelector('.agent-status-text');
          if (ran.has(name.toLowerCase())) {
            chip.classList.remove('working');
            chip.classList.add('done');
            if (txt) txt.textContent = 'Done';
          } else {
            chip.classList.remove('working', 'done');
            if (txt) txt.textContent = 'Idle';
          }
        });

      } catch (err) {
        console.error('Poll error:', err);
      }

      if (attempts > 60) {
        clearInterval(pollInterval);
        agentStatusBar.innerHTML = '<span class="status-dot" style="background:var(--yellow)"></span>Timed out';
      }
    }, 3000);

  } catch (err) {
    console.error('Build error:', err);
    addAgentMsg('System', 'Error starting build. Please try again.');
    agentStatusBar.innerHTML = '<span class="status-dot" style="background:var(--red)"></span>Error';
  }
}

window.deployBuild = async function(buildId) {
  try {
    showToast('Putting it online…');
    const result = await api(`/api/builds/${buildId}/deploy`, { method: 'POST', body: JSON.stringify({}) });
    showToast('It is online!');
    window.open(result.url, '_blank');
  } catch (err) {
    showToast('Putting it online failed — try again');
  }
};

window.loadVersions = async function(buildId) {
  const panel = document.getElementById('versions-panel');
  if (!panel) return;
  panel.style.display = 'block';
  panel.innerHTML = '<p style="font-size:.8rem;color:var(--text2)">Loading earlier versions…</p>';
  try {
    const versions = await api(`/api/builds/${buildId}/versions`);
    if (!versions.length) {
      panel.innerHTML = '<p style="font-size:.8rem;color:var(--text2)">This is the first version — earlier ones will show up here.</p>';
      return;
    }
    panel.innerHTML = versions.map(v => `
      <div style="display:flex;justify-content:space-between;font-size:.8rem;padding:.35rem 0;border-bottom:1px solid var(--border)">
        <span>v${v.version} · ${escapeHtml(v.note || '')}</span>
        <span style="color:var(--text3)">${v.code_len} chars · ${new Date(v.created_at).toLocaleString()}</span>
      </div>
    `).join('');
  } catch (err) {
    panel.innerHTML = '<p style="font-size:.8rem;color:var(--red)">Could not load earlier versions.</p>';
  }
};

function addAgentMsg(name, msg, code) {
  const chat = document.getElementById('chat-messages');
  const AGENT_IC = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.2 20 7.6v8.8L12 20.8 4 16.4V7.6z"/><path d="M12 8.4 16 10.6v4.2M12 8.4 8 10.6v4.2M12 8.4v4.2"/></svg>';
  const icons = {};
  let html = `<div class="msg agent"><div class="msg-avatar">${icons[name] || AGENT_IC}</div><div class="msg-content"><strong>${name} Agent</strong><p>${msg}</p>`;
  if (code) html += `<pre style="background:var(--bg);padding:.75rem;border-radius:8px;margin-top:.75rem;font-family:var(--font-mono);font-size:.8rem;overflow-x:auto;color:#a5d6ff">${escapeHtml(code)}</pre>`;
  html += `</div></div>`;
  chat.innerHTML += html;
  chat.scrollTop = chat.scrollHeight;
}

// ============ V2: FILES, ZIP, GITHUB PUSH ============
let currentProjectId = null;

async function loadFilesPage() {
  try {
    projects = csProjectList(await api('/api/projects')); // always refresh: builds add projects
    const sel = document.getElementById('files-project');
    if (!sel) return;
    sel.innerHTML = projects.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
    if (projects.length) {
      currentProjectId = projects[0].id;
      sel.value = currentProjectId;
      sel.onchange = () => {
        // project ids are UUID strings — parseInt() would turn them into NaN
        currentProjectId = sel.value;
        loadProjectFiles();
      };
    }
    const zip = document.getElementById('download-zip');
    if (zip) zip.onclick = downloadProjectZip;
    const saveBtn = document.getElementById('save-file-btn');
    if (saveBtn) saveBtn.onclick = () => {
      const path = prompt('File path:', 'styles.css');
      if (path) {
        document.getElementById('editor-path').value = path;
        document.getElementById('editor-content').value = '';
        document.getElementById('editor-content').focus();
      }
    };
    const es = document.getElementById('editor-save');
    if (es) es.onclick = saveCurrentFile;
    await loadProjectFiles();
  } catch (e) {
    showToast('Could not load your files');
  }
}

async function loadProjectFiles() {
  if (!currentProjectId) return;
  try {
    const resp = await api(`/api/projects/${currentProjectId}/files`);
    const files = Array.isArray(resp) ? resp : ((resp && resp.files) || []);
    const list = document.getElementById('file-list');
    if (!list) return;
    if (!files.length) {
      list.innerHTML = '<p style="font-size:.85rem;color:var(--text2)">No files yet. Write one in the editor, or build an app first.</p>';
      return;
    }
    list.innerHTML = files.map(f => `
      <div class="file-item" onclick="openFile('${currentProjectId}', '${escapeHtml(f.file_path).replace(/'/g, "\\'")}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7.5A2.5 2.5 0 0 0 5 5.5v13A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V8z"/><path d="M14 3v5h5"/></svg> ${escapeHtml(f.file_path)} <span style="color:var(--text3);font-size:.75rem">(${f.size}b)</span>
      </div>
    `).join('');
  } catch (e) {
    showToast('Could not load your files');
  }
}

window.openFile = async function(pid, path) {
  try {
    const f = await api(`/api/projects/${pid}/files/${encodeURIComponent(path)}`);
    document.getElementById('editor-path').value = f.file_path;
    document.getElementById('editor-content').value = f.content || '';
    document.querySelectorAll('.file-item').forEach(el => el.classList.remove('active'));
  } catch (e) {
    showToast('Could not open file');
  }
};

async function saveCurrentFile() {
  if (!currentProjectId) { showToast('Choose an app first'); return; }
  const path = document.getElementById('editor-path').value.trim();
  const content = document.getElementById('editor-content').value;
  if (!path) { showToast('Give the file a name first'); return; }
  try {
    await api(`/api/projects/${currentProjectId}/files`, {
      method: 'POST',
      body: JSON.stringify({ file_path: path, content }),
    });
    showToast(`Saved ${path}`);
    loadProjectFiles();
  } catch (e) {
    showToast('Save failed');
  }
}

async function downloadProjectZip() {
  if (!currentProjectId) { showToast('Choose an app first'); return; }
  try {
    const { blob, filename } = await csDownloadZip(currentProjectId);   // real ZIP, built in-browser
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast('ZIP downloaded');
  } catch (e) {
    showToast('ZIP download failed');
  }
}

window.createGitHubRepo = async function() {
  const name = document.getElementById('new-repo-name').value.trim();
  if (!name) { showToast('Give it a name first'); return; }
  try {
    const r = await api('/api/github/create-repo', {
      method: 'POST',
      body: JSON.stringify({ name, description: 'Created from CreateStuff.ai' }),
    });
    showToast(`Created ${r.full_name}`);
    document.getElementById('push-repo').value = r.full_name;
    loadGitHubRepos();
  } catch (e) {
    showToast('Could not create it');
  }
};

window.fillPushFromBuild = async function() {
  try {
    let code = '';
    try {
      const b = await api('/api/builds/20');
      code = b.generated_code || '';
    } catch {}
    if (!code) {
      const ed = document.getElementById('editor-content');
      code = ed && ed.value ? ed.value : '';
    }
    if (!code) { showToast('Nothing to copy in — paste the code yourself'); return; }
    document.getElementById('push-content').value = code;
    showToast('Copied your latest app into the box');
  } catch (e) {
    showToast('Could not fill content');
  }
};

window.pushToGitHub = async function() {
  const repo = document.getElementById('push-repo').value.trim();
  const path = document.getElementById('push-path').value.trim() || 'index.html';
  const branch = document.getElementById('push-branch').value.trim() || 'main';
  const message = document.getElementById('push-msg').value.trim();
  const content = document.getElementById('push-content').value;
  if (!repo || !content) { showToast('Fill in the project name and the code first'); return; }
  try {
    const r = await api('/api/github/push', {
      method: 'POST',
      body: JSON.stringify({ repo, path, branch, message, content }),
    });
    showToast('Pushed to GitHub!');
    window.open(r.html_url, '_blank');
  } catch (e) {
    showToast('Push failed');
  }
};


// ============ A TO Z LAUNCH PATH ============
// Nothing on this page is allowed to look complete because it was stored
// locally. A green step means the browser just received a 2xx from a server,
// and the numbers printed under it were read out of that same response.
const LZ_HOST = 'https://app-host.fashionistas1979.workers.dev';
const LZ_STEPS = [
  { key: 'account',  letter: 'A', title: 'Your account',
    desc: 'Sign in, so everything you make belongs to you and stays with you.' },
  { key: 'brief',    letter: 'B', title: 'One sentence about your app',
    desc: 'One plain sentence describing what you want. These exact words are what the AI is told to build.' },
  { key: 'project',  letter: 'C', title: 'A home for your app',
    desc: 'This creates a place to keep your files and picks it. Your web address points at it later.' },
  { key: 'generate', letter: 'G', title: 'Build it',
    desc: 'The AI writes the HTML, CSS and JavaScript and saves the files for you.' },
  { key: 'publish',  letter: 'P', title: 'Put it online',
    desc: 'The files are copied so anyone with the link can open them.' },
  { key: 'domain',   letter: 'D', title: 'Your web address',
    desc: 'Attach a name such as my-app.example.com. We set up the pointing for you instead of leaving it as homework.' },
  { key: 'live',     letter: 'Z', title: 'Check it is live',
    desc: 'Open the real address and print exactly what came back.' },
];

const lz = { brief: '', projectId: null, hostname: '', liveUrl: '', states: {}, projects: [], busy: false, defer: 0 };

function lzState(key) {
  if (!lz.states[key]) lz.states[key] = { status: 'idle', badge: 'Not started', detail: '' };
  return lz.states[key];
}
function lzSet(key, patch, defer) {
  Object.assign(lzState(key), patch);
  if (!lz.defer) lzRender();
}

async function lzCall(url, opts, timeoutMs) {
  const t0 = performance.now();
  try {
    const real = { ...opts };
    if (timeoutMs && !real.signal && typeof AbortSignal !== 'undefined' && AbortSignal.timeout) {
      real.signal = AbortSignal.timeout(timeoutMs);
    }
    const res = await fetch(url, real);
    const text = await res.text();
    const ms = Math.round(performance.now() - t0);
    let body = null;
    try { body = JSON.parse(text); } catch { /* not JSON — text is still real evidence */ }
    return { status: res.status, ms, text, body, bytes: text.length };
  } catch (e) {
    return { status: 0, ms: Math.round(performance.now() - t0), text: '', body: null, bytes: 0, failed: true, message: String(e && e.message || e) };
  }
}
function lzErr(r) {
  if (!r) return 'network error';
  if (r.failed) return r.message;
  if (r.body && r.body.error) return r.body.error;
  if (r.status === 401) return 'session expired — sign in again';
  return `HTTP ${r.status}`;
}
function lzMs(ms) { return ms >= 1000 ? (ms / 1000).toFixed(2) + ' s' : ms + ' ms'; }
function lzNum(n) { return Number(n || 0).toLocaleString(); }

function lzProjectControls() {
  const opts = lz.projects.length
    ? lz.projects.map(p => `<option value="${p.id}" ${String(p.id) === String(lz.projectId) ? 'selected' : ''}>#${p.id} — ${escapeHtml(p.name)}</option>`).join('')
    : `<option value="">No apps yet</option>`;
  const has = !!lz.projectId;
  const selTip = 'Your existing apps. Pick one to put this build inside it.';
  const projTip = lz.projects.length
    ? 'Keeps the app you picked from the list above and carries on with it.'
    : 'We create a new app for you and pick it straight away. You do not have to choose anything.';
  return `<select id="lz-project" class="lz-sel" data-tip="${selTip}" title="${selTip}"${lz.busy ? ' disabled' : ''}>${opts}</select>
<button class="btn-primary" data-lz-act="project" data-tip="${escapeHtml(projTip)}" title="${escapeHtml(projTip)}"${lz.busy ? ' disabled' : ''}>${lz.projects.length ? 'Use this one' : 'Make a new app'}</button>
<p class="lz-hint">${lz.projects.length ? 'Pick one you already made, or make a new one.' : 'We make one for you and pick it.'}</p>`;
}

function lzControls(key) {
  const st = lzState(key);
  const hold = lz.busy || st.status === 'working';
  const STEP_TIP = 'Runs this step now. Whatever the site answers is printed underneath, including the status code and how long it took.';
  const btn = (act, label, primary, tip) => {
    const t = tip || STEP_TIP;
    return `<button class="${primary === false ? 'btn-secondary' : 'btn-primary'}" data-lz-act="${act}" data-tip="${escapeHtml(t)}" title="${escapeHtml(t)}"${hold ? ' disabled' : ''}>${label}</button>`;
  };
  switch (key) {
    case 'account':  return btn('account', st.status === 'done' ? 'Check the sign-in again' : 'Check you are signed in', false, 'Asks the server whether you are signed in. It changes nothing — it only looks.');
    case 'brief':    {
      const TIP = 'Type one plain sentence about the app you want. These exact words are handed to the AI unchanged.';
      const examples = [
        'A gym workout tracker with sets, reps and a 1RM calculator',
        'A one page site for my bakery with opening hours and a menu',
        'A recipe box where I can save and search my own recipes',
        'A simple budget tracker that adds up what I spend',
      ];
      return `<label class="lz-fieldlabel" for="lz-brief" data-tip="${TIP}" title="${TIP}"><svg class="lz-ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>Type your idea here</label>
<textarea id="lz-brief" class="lz-input lz-input-lg" rows="4"${hold ? ' disabled' : ''} data-tip="${TIP}" title="${TIP}" placeholder="A gym workout tracker with sets, reps and a 1RM calculator">${escapeHtml(lz.brief)}</textarea>
<div class="lz-examples">${examples.map(e => `<button type="button" class="lz-ex" data-lz-ex="${escapeHtml(e)}" data-tip="Puts this example into the box above so you can edit it. Nothing is sent until you press the button." title="Puts this example into the box above so you can edit it. Nothing is sent until you press the button.">${escapeHtml(e)}</button>`).join('')}</div>
<button class="btn-primary lz-submit" data-lz-act="brief"${hold ? ' disabled' : ''} data-tip="Saves your sentence, makes a place to keep the files, then starts the build. You do not have to do anything else." title="Saves your sentence, makes a place to keep the files, then starts the build. You do not have to do anything else.">Save my sentence and build it</button>
<p class="lz-hint">One sentence is enough. Write it the way you would say it out loud.</p>`;
    }
    case 'project':  return lzProjectControls();
    case 'generate': return btn('generate', st.status === 'working' ? 'Building…' : (st.status === 'done' ? 'Build it again' : 'Build it'), undefined, 'Hands your sentence to the AI and waits while it writes the HTML, CSS and JavaScript. Usually 1-3 minutes. Leave this tab open.');
    case 'publish':  return btn('publish', st.status === 'working' ? 'Putting it online…' : (st.status === 'done' ? 'Put online again' : 'Put online'), undefined, 'Copies your files to a public web address so anyone with the link can open them.');
    case 'domain':   return `<input id="lz-host" class="lz-input" data-tip="Type the address you want, for example my-app.fashionistas.ai. We set up the pointing for you." title="Type the address you want, for example my-app.fashionistas.ai. We set up the pointing for you."${hold ? ' disabled' : ''} placeholder="my-app.fashionistas.ai" value="${escapeHtml(lz.hostname)}">` + btn('domain', st.status === 'working' ? 'Setting it up…' : (st.status === 'done' ? 'Use this address again' : 'Use this address'), undefined, 'Attaches this address to your app and points it at your files.');
    case 'live':     return btn('live', st.status === 'working' ? 'Checking…' : 'Check it is live', undefined, 'Opens your real web address and prints exactly what came back, including the HTTP status.')
      + (lz.liveUrl ? `<a class="lz-open" href="${escapeHtml(lz.liveUrl)}" target="_blank" rel="noopener" data-tip="Opens your app in a new tab." title="Opens your app in a new tab.">Open ${escapeHtml(lz.liveUrl.replace(/^https?:\/\//, ''))}</a>` : '');
  }
  return '';
}

function lzRender() {
  const ol = document.getElementById('lz-steps');
  if (!ol) return;
  // keep the caret where the user left it: a background step completing must
  // never yank focus out of the brief they are typing.
  const ae = document.activeElement;
  const focusId = ae && ae.id ? ae.id : null;
  const selStart = ae && typeof ae.selectionStart === 'number' ? ae.selectionStart : null;

  ol.innerHTML = LZ_STEPS.map((s) => {
    const st = lzState(s.key);
    const cls = st.status === 'done' ? 'is-done'
      : st.status === 'ready' ? 'is-ready'
      : st.status === 'working' ? 'is-working'
      : st.status === 'blocked' ? 'is-blocked'
      : '';
    const badgeCls = st.status === 'done' ? 'ok' : st.status === 'ready' ? 'skip' : st.status === 'working' ? 'work' : st.status === 'blocked' ? 'bad' : (st.badgeCls || '');
    const stepTip = `Step ${s.letter} of 7 — ${s.title}. ${s.desc}`;
    const badgeTip = st.status === 'done'
      ? 'This step has been answered by the real site already. The text under it is what came back.'
      : st.status === 'working'
      ? 'Running right now. It prints the answer the moment it arrives.'
      : st.status === 'blocked'
      ? 'Something needs your attention. The reason is printed below the title.'
      : 'Nothing has been checked for this step yet.';
    const evTip = 'The raw answer the site gave — status code, how long it took, how many bytes. Nothing here is written by hand.';
    return `<li class="lz-step ${cls}" data-step="${s.key}">
      <div class="lz-letter" data-tip="${escapeHtml(stepTip)}" title="${escapeHtml(stepTip)}">${s.letter}</div>
      <div class="lz-body">
        <h3 class="lz-title" data-tip="${escapeHtml(stepTip)}" title="${escapeHtml(stepTip)}">${escapeHtml(s.title)}<span class="lz-badge ${badgeCls}" data-tip="${escapeHtml(badgeTip)}" title="${escapeHtml(badgeTip)}">${escapeHtml(st.badge)}</span></h3>
        <p class="lz-desc" data-tip="${escapeHtml(s.desc)}" title="${escapeHtml(s.desc)}">${escapeHtml(s.desc)}</p>
        <pre class="lz-evidence" id="lz-ev-${s.key}" data-tip="${evTip}" title="${evTip}">${escapeHtml(st.detail)}</pre>
      </div>
      <div class="lz-actions">${lzControls(s.key)}</div>
    </li>`;
  }).join('');

  lzPaintCount();

  const brief = document.getElementById('lz-brief');
  if (brief) {
    brief.oninput = function () {
      lz.brief = this.value;
      const ok = lz.brief.trim().length >= 12;
      lzSet('brief', ok
        ? { status: 'ready', badge: 'Ready', detail: `Brief held for the model (${lz.brief.trim().length} chars).\n"${lz.brief.trim().slice(0, 160)}${lz.brief.trim().length > 160 ? '…' : ''}"` }
        : { status: 'idle', badge: 'Not started', detail: '' }, true);
      lzPaintCount();
    };
  }
  // example chips: fill the box, never send on their own
  ol.querySelectorAll('[data-lz-ex]').forEach((b) => {
    b.onclick = function () {
      const box = document.getElementById('lz-brief');
      if (!box) return;
      box.value = this.dataset.lzEx;
      box.dispatchEvent(new Event('input', { bubbles: true }));
      box.focus();
    };
  });
  const sel = document.getElementById('lz-project');
  if (sel) sel.onchange = function () {
    lz.projectId = this.value ? parseInt(this.value, 10) : null;
    if (lz.projectId) lzAuditProject();
  };
  const hostInput = document.getElementById('lz-host');
  if (hostInput) hostInput.oninput = function () { lz.hostname = this.value.trim(); };

  ol.querySelectorAll('[data-lz-act]').forEach((b) => {
    b.onclick = function () { lzAct(this.dataset.lzAct); };
  });

  if (focusId) {
    const again = document.getElementById(focusId);
    if (again && again !== document.activeElement) {
      again.focus();
      if (selStart != null && typeof again.setSelectionRange === 'function') {
        try { again.setSelectionRange(selStart, selStart); } catch { /* not a text field */ }
      }
    }
  }
}

// ---- read-only checks: these never change server state, they only ask ----
function lzPaintCount() {
  const n = LZ_STEPS.filter(s => { const t = lzState(s.key).status; return t === 'done' || t === 'ready'; }).length;
  const el = document.getElementById('lz-done');
  if (el) el.textContent = String(n);
}

async function lzCheckAccount(defer) {
  const r = await lzCall(`${API_BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${getToken()}` } }, 15000);
  const u = r.body && r.body.user;
  lzSet('account', (r.status === 200 && u)
    ? { status: 'done', badge: 'Signed in', detail: `GET /api/auth/me → ${r.status} in ${lzMs(r.ms)}\nid ${u.id} · ${u.email || u.username || 'unknown'} · ${r.bytes} B` }
    : { status: 'blocked', badge: 'Not signed in', detail: `GET /api/auth/me → ${r.status} in ${lzMs(r.ms)}\n${lzErr(r)}` }, defer);
}

async function lzLoadProjects(defer) {
  const r = await lzCall(`${API_BASE}/api/projects`, { headers: { Authorization: `Bearer ${getToken()}` } }, 15000);
  const list = (r.body && (r.body.projects || r.body)) || [];
  lz.projects = Array.isArray(list) ? list : [];
  if (lz.projectId == null && lz.projects.length) lz.projectId = parseInt(lz.projects[0].id, 10);
  const own = lz.projects.find(p => String(p.id) === String(lz.projectId));
  lzSet('project', own
    ? { status: 'done', badge: 'Selected', detail: `GET /api/projects → ${r.status} in ${lzMs(r.ms)}\n${lz.projects.length} project(s) on this account\nselected #${own.id} “${own.name}” (${own.status || 'no status'})` }
    : { status: 'idle', badge: 'Not started', detail: lz.projects.length ? '' : `GET /api/projects → ${r.status}, 0 projects — create one below.` }, defer);
}

async function lzCheckFiles(defer) {
  if (!lz.projectId) { lzSet('generate', { status: 'idle', badge: 'Not started', detail: '' }, defer); return; }
  const r = await lzCall(`${API_BASE}/api/projects/${lz.projectId}/files`, { headers: { Authorization: `Bearer ${getToken()}` } }, 15000);
  const files = (r.body && (r.body.files || r.body)) || [];
  const bytes = files.reduce((n, f) => n + (f.size || f.content ? (f.content ? f.content.length : (f.size || 0)) : 0), 0);
  lzSet('generate', (r.status === 200 && files.length)
    ? { status: 'done', badge: 'Code present', detail: `GET /api/projects/${lz.projectId}/files → ${r.status} in ${lzMs(r.ms)}\n${files.length} file(s): ${files.slice(0, 6).map(f => f.path).join(', ')}${files.length > 6 ? ' …' : ''}${bytes ? `\n${lzNum(bytes)} chars of source` : ''}` }
    : { status: 'idle', badge: 'Nothing generated', detail: `GET /api/projects/${lz.projectId}/files → ${r.status} in ${lzMs(r.ms)}\n${files.length} file(s) — write a brief and press Generate.` }, defer);
}

async function lzCheckPublished(defer) {
  if (!lz.projectId) { lzSet('publish', { status: 'idle', badge: 'Not started', detail: '' }, defer); return; }
  const r = await lzCall(`${API_BASE}/published/${lz.projectId}/index.html`, { headers: { Authorization: `Bearer ${getToken()}` } }, 15000);
  lzSet('publish', (r.status === 200 && r.bytes)
    ? { status: 'done', badge: 'Published', detail: `GET /published/${lz.projectId}/index.html → ${r.status} in ${lzMs(r.ms)}\n${lzNum(r.bytes)} bytes served · content readable from storage` }
    : { status: 'idle', badge: 'Not published', detail: `GET /published/${lz.projectId}/index.html → ${r.status} in ${lzMs(r.ms)}\n${r.status === 404 ? 'nothing published yet' : lzErr(r)}` }, defer);
  if (lz.liveUrl === '' && r.status === 200) lz.liveUrl = `${API_BASE}/published/${lz.projectId}/index.html`;
}

async function lzCheckHosts(defer) {
  if (!lz.projectId) {
    lzSet('domain', { status: 'idle', badge: 'Not started', detail: '' }, defer);
    lzSet('live', { status: 'idle', badge: 'Not started', detail: '' }, defer);
    return;
  }
  const r = await lzCall(`${LZ_HOST}/api/projects/${lz.projectId}/host`, { headers: { Authorization: `Bearer ${getToken()}` } }, 20000);
  const hosts = (r.body && r.body.hosts) || [];
  if (r.status !== 200) {
    lzSet('domain', { status: 'blocked', badge: 'Check failed', detail: `GET ${LZ_HOST.replace('https://', '')}/api/projects/${lz.projectId}/host → ${r.status}\n${lzErr(r)}` }, defer);
    lzSet('live', { status: 'blocked', badge: 'Check failed', detail: `GET → ${r.status}\n${lzErr(r)}` }, defer);
    return;
  }
  lzSet('domain', hosts.length
    ? { status: 'done', badge: 'Attached', detail: hosts.map(h => `${h.hostname} → attached ${h.created_at || ''}`).join('\n') + `\n${hosts.length} hostname(s) point at project ${lz.projectId}` }
    : { status: 'idle', badge: 'No domain yet', detail: `GET → ${r.status}, 0 hostnames attached to project ${lz.projectId}.\nEnter a hostname and press Connect domain.` }, defer);

  const live = hosts.find(h => h.probe && h.probe.live);
  const best = live || hosts[0];
  if (best && best.probe) {
    lz.liveUrl = best.url;
    lz.hostname = best.hostname;
    lzSet('live', best.probe.live
      ? { status: 'done', badge: 'Serving', detail: `GET ${best.url} → ${best.probe.status} in ${lzMs(r.ms)}\n${lzNum(best.probe.bytes)} bytes returned · ${best.hostname}` }
      : { status: 'blocked', badge: 'Not resolving', detail: `GET ${best.url} → ${best.probe.status || 'no response'}\n${best.probe.error || 'DNS attached but the site did not answer with 200.'}` }, defer);
  } else {
    lzSet('live', { status: 'idle', badge: 'Nothing to test', detail: 'Connect a domain first (step D).' }, defer);
  }
}

async function lzAuditProject() {
  if (!lz.projectId) return;
  lz.defer += 1;
  try {
    await Promise.all([lzCheckFiles(true), lzCheckPublished(true), lzCheckHosts(true)]);
  } catch (e) {
    // a failed check must not freeze the page: fall through to finally, which
    // releases the defer and repaints with whatever each step did manage to learn
    console.warn('launch audit (project) failed:', e);
  } finally {
    lz.defer = Math.max(0, lz.defer - 1);
    lzRender();
  }
}

async function lzAuditAll() {
  lz.defer += 1;
  try {
    await lzCheckAccount(true);
    await lzLoadProjects(true);
    if (lz.projectId) {
      await lzCheckFiles(true);
      await lzCheckPublished(true);
      await lzCheckHosts(true);
    }
  } catch (e) {
    console.warn('launch audit failed:', e);
  } finally {
    lz.defer = Math.max(0, lz.defer - 1);
    lzRender();
  }
}

// ---- the actions that change server state ----
// `nested` marks a call made from inside lzRunAll, which already holds the busy
// flag. Without it the guard below returns immediately and the step silently
// does nothing — the run looks like it finished while every action was skipped.
async function lzAct(kind, nested) {
  if (lz.busy && !nested) return;
  const owned = !lz.busy;
  if (owned) lz.busy = true;
  try {
    if (kind === 'account') { await lzCheckAccount(); return; }

    // Step B submit. Before this existed the box had no button at all, so a
    // person could type their idea and have nothing to press.
    if (kind === 'brief') {
      const box = document.getElementById('lz-brief');
      if (box) lz.brief = box.value;
      const v = String(lz.brief || '').trim();
      if (v.length < 12) {
        lzSet('brief', { status: 'blocked', badge: 'Too short', detail: 'Write one sentence about the app you want.\nNothing has been sent yet.' });
        showToast('Write a sentence first');
        return;
      }
      lz.brief = v;
      lzSet('brief', { status: 'done', badge: 'Sent', detail: `Saved ${v.length} characters.\n"${v.slice(0, 200)}${v.length > 200 ? '…' : ''}"` });
      showToast('Got it — starting your build');
      // Hand the sentence to the working chat builder. startBuild() makes the
      // project itself, so step C never has to be a forced choice.
      if (typeof renderPage === 'function') renderPage('builder');
      await new Promise(r => setTimeout(r, 120));
      if (typeof startBuild === 'function') startBuild(v);
      return;
    }

    if (kind === 'project') {
      lzSet('project', { status: 'working', badge: 'Working', detail: 'Contacting the API…' });
      if (lz.projectId) { await lzLoadProjects(); await lzAuditProject(); return; }
      const name = (lz.brief.trim().split(/[.!?\n]/)[0] || 'My app').slice(0, 60) || 'My app';
      const r = await lzCall(`${API_BASE}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ name }),
      });
      if (r.status === 201 && r.body && r.body.project) {
        lz.projectId = parseInt(r.body.project.id, 10);
        await lzLoadProjects();
        lzSet('generate', { status: 'idle', badge: 'Not generated yet', detail: `Project #${lz.projectId} created. Write a brief and press Generate.` });
        showToast(`App #${lz.projectId} ready`);
      } else {
        lzSet('project', { status: 'blocked', badge: 'Create failed', detail: `POST /api/projects → ${r.status}\n${lzErr(r)}` });
      }
      return;
    }

    if (kind === 'generate') {
      if (!lz.projectId) { lzSet('generate', { status: 'blocked', badge: 'No project', detail: 'Choose or create a project first (step C).' }); return; }
      if (lz.brief.trim().length < 12) { lzSet('generate', { status: 'blocked', badge: 'No brief', detail: 'Write a brief first (step B). It is sent to the model verbatim.' }); return; }
      lzSet('generate', { status: 'working', badge: 'Generating', detail: 'POST /api/ai/generate … the model is writing the files.\nUsually 60–150 seconds. Leave this tab open.' });
      const t0 = performance.now();
      const timer = setInterval(() => {
        const el = document.getElementById('lz-ev-generate');
        if (el) el.textContent = `POST /api/ai/generate … ${((performance.now() - t0) / 1000).toFixed(1)} s elapsed\nThe model is writing the files. Leave this tab open.`;
      }, 200);
      const r = await lzCall(`${API_BASE}/api/ai/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ projectId: lz.projectId, plan: lz.brief }),
      }).finally(() => clearInterval(timer));
      const files = (r.body && r.body.files) || [];
      const chars = files.reduce((n, f) => n + (f.content ? f.content.length : 0), 0);
      if (r.status === 200 && files.length) {
        lzSet('generate', { status: 'done', badge: 'Generated', detail: `POST /api/ai/generate → ${r.status} in ${lzMs(r.ms)}\n${files.length} files · ${lzNum(chars)} chars · model ${r.body.model || 'unreported'}\n${r.body.notes || ''}`.trim() });
        // regenerating invalidates anything previously published or probed
        lzSet('publish', { status: 'idle', badge: 'Stale — publish again', detail: 'The code changed, so the published copy is out of date.' });
        lzSet('live', { status: 'idle', badge: 'Re-check needed', detail: 'Code changed — publish, then re-check the live site.' });
        // Deliberately NOT calling lzCheckFiles() here: it would overwrite the
        // generate response with a directory listing, hiding the model, the
        // elapsed time and the quality notes the user just waited 2 minutes for.
        showToast('Built ' + files.length + ' files');
      } else {
        lzSet('generate', { status: 'blocked', badge: 'Failed', detail: `POST /api/ai/generate → ${r.status} in ${lzMs(r.ms)}\n${lzErr(r)}${files.length ? '' : '\nno files returned'}` });
      }
      return;
    }

    if (kind === 'publish') {
      if (!lz.projectId) { lzSet('publish', { status: 'blocked', badge: 'No project', detail: 'Choose a project first (step C).' }); return; }
      lzSet('publish', { status: 'working', badge: 'Publishing', detail: 'POST /api/ai/publish …' });
      const p = await lzCall(`${API_BASE}/api/ai/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ projectId: lz.projectId }),
      });
      if (p.status !== 200 || !p.body) {
        lzSet('publish', { status: 'blocked', badge: 'Publish failed', detail: `POST /api/ai/publish → ${p.status} in ${lzMs(p.ms)}\n${lzErr(p)}` });
        return;
      }
      lz.liveUrl = p.body.publishUrl || lz.liveUrl;
      const g = await lzCall(`${API_BASE}/published/${lz.projectId}/index.html`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const lpOk = !!(g.status === 200 && g.bytes);
      lzSet('publish', lpOk
        ? { status: 'done', badge: 'Published', detail: `POST /api/ai/publish → ${p.status} in ${lzMs(p.ms)}\n${p.body.publishUrl || ''}\nthen GET …/index.html → ${g.status}, ${lzNum(g.bytes)} bytes in ${lzMs(g.ms)}` }
        : { status: 'blocked', badge: 'Not readable back', detail: `publish returned ${p.status}, but reading it back gave ${g.status} (${lzNum(g.bytes)} B)\n${lzErr(g)}` });
      showToast(lpOk ? 'It is online' : 'Published, but the address is not answering yet');
      showLivePanel(lz.liveUrl, { projectId: lz.projectId, live: lpOk, reason: 'publish' }).catch(() => {});
      return;
    }

    if (kind === 'domain') {
      if (!lz.projectId) { lzSet('domain', { status: 'blocked', badge: 'No project', detail: 'Choose a project first (step C).' }); return; }
      const host = (lz.hostname || `app-${lz.projectId}.fashionistas.ai`).trim();
      lz.hostname = host;
      lzSet('domain', { status: 'working', badge: 'Connecting', detail: `POST /api/projects/${lz.projectId}/host {hostname:"${host}"}\nCreating the DNS record…` });
      const r = await lzCall(`${LZ_HOST}/api/projects/${lz.projectId}/host`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ hostname: host, projectId: lz.projectId }),
      });
      const dns = r.body && r.body.dns;
      if ((r.status === 200 || r.status === 201) && r.body && r.body.ok) {
        lz.liveUrl = r.body.url;
        lzSet('domain', { status: 'done', badge: 'Attached', detail: `POST /api/projects/${lz.projectId}/host → ${r.status} in ${lzMs(r.ms)}\nhostname ${r.body.hostname}\nDNS ${dns ? dns.status : 'unreported'}${dns && dns.zone ? ` in zone ${dns.zone} → ${dns.target}` : ''}` });
        showToast('Address set: ' + host);
        await lzCheckHosts();
      } else {
        lzSet('domain', { status: 'blocked', badge: 'Connect failed', detail: `POST /api/projects/${lz.projectId}/host → ${r.status} in ${lzMs(r.ms)}\nhostname ${host}\n${lzErr(r)}${dns && dns.detail ? `\nDNS: ${dns.detail}` : ''}` });
      }
      return;
    }

    if (kind === 'live') { await lzCheckHosts(); return; }
  } finally {
    if (owned) lz.busy = false;
    lzRender();
  }
}

async function lzRunAll() {
  if (lz.busy) return;
  lz.busy = true;
  const run = document.getElementById('lz-run');
  try {
    await lzCheckAccount(true);
    await lzLoadProjects(true);
    // No canned example brief: the whole point of step B is that the model is
    // told what YOU want. Without one the run stops here and says so.
    if (lz.brief.trim().length < 12) {
      lzSet('brief', { status: 'blocked', badge: 'Needs your words', detail: 'Write one sentence describing the app (step B), then run again.\nNothing is generated from an example — the brief has to be yours.' });
      showToast('Write one sentence first (step B)');
      return;
    }
    lzRender();
    if (!lz.projectId) await lzAct('project', true);
    if (!lz.projectId) return;
    await lzAct('generate', true);
    // Stop on the first real failure rather than piling three more errors on
    // top of the one that already explains the problem.
    if (lzState('generate').status === 'blocked') return;
    await lzAct('publish', true);
    if (lzState('publish').status === 'blocked') return;
    if (!lz.hostname) lz.hostname = `app-${lz.projectId}.fashionistas.ai`;
    await lzAct('domain', true);
    if (lzState('domain').status === 'blocked') return;
    await lzAct('live', true);
  } finally {
    lz.busy = false;
    if (run) run.textContent = 'Do it all for me';
    lzRender();
  }
}

function loadLaunch() {
  const run = document.getElementById('lz-run');
  const re = document.getElementById('lz-recheck');
  if (run) run.onclick = function () { if (!lz.busy) { this.textContent = 'Running…'; lzRunAll(); } };
  if (re) re.onclick = function () { if (!lz.busy) lzAuditAll(); };
  lzRender();
  lzAuditAll();
}

// The Deploy page's Custom Domain box used to be a button that printed
// "Domain configured!" and changed nothing. It now hands the hostname to the
// same code path the guide uses, so the response a user sees is the real one.
window.csLaunchConnect = async function (hostname) {
  lz.hostname = String(hostname || '').trim();
  renderPage('launch');
  if (!lz.hostname) { lzRender(); await lzAuditAll(); return; }
  await lzAuditAll();
  if (!lz.projectId) {
    lzSet('domain', { status: 'blocked', badge: 'No project', detail: 'Create a project first — step C. A hostname has to point at a project.' });
    showToast('Make an app first (step C)');
    return;
  }
  await lzAct('domain');
};

function escapeHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;') }

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.style.display = 'block';
  setTimeout(() => t.style.display = 'none', 3000);
}

// ============================================================
// LIVE PANEL — after a build or a publish, one panel in the
// user's face telling them where their app is.
//
// Hard rule: the words "Your app is live" are only ever shown
// after a real HTTP 200 read back from that exact address.
// A finished build that has never been published shows
// "Your app is ready to go online" and a working
// "Put it online" button instead.
// ============================================================
const lp = { url: '', projectId: null, live: false, busy: false, wired: false };

function lpEl(id) { return document.getElementById(id) }
function lpOff() { try { return sessionStorage.getItem('cs_lp_off') === '1' } catch { return false } }
function lpSetOff(v) { try { v ? sessionStorage.setItem('cs_lp_off', '1') : sessionStorage.removeItem('cs_lp_off') } catch { /* private mode */ } }

// Real read of the address itself. Nothing else counts as proof.
async function lpCheck(url) {
  if (!url) return { live: false, status: 0, bytes: 0 };
  try {
    const r = await fetch(url, { headers: { 'Authorization': `Bearer ${getToken()}` }, cache: 'no-store' });
    let bytes = 0;
    try { bytes = (await r.text()).length } catch { bytes = 0 }
    return { live: !!r.ok, status: r.status, bytes };
  } catch (e) {
    return { live: false, status: 0, bytes: 0, error: String((e && e.message) || e) };
  }
}

// Where does this project currently live, if anywhere?
async function lpProjectUrl(pid) {
  if (!pid) return '';
  try {
    const r = await fetch(`${API_BASE}/api/projects`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
    if (!r.ok) return '';
    const j = await r.json();
    const list = Array.isArray(j) ? j : (j.projects || []);
    const p = list.find((x) => Number(x.id) === Number(pid));
    return (p && p.deploy_url) || '';
  } catch { return '' }
}

function lpRender() {
  const panel = lpEl('live-panel');
  if (!panel) return;
  const head = lpEl('live-panel-headline');
  const a = lpEl('live-panel-url');
  const open = lpEl('live-panel-open');
  const openText = lpEl('live-panel-open-text');
  const copy = lpEl('live-panel-copy');

  if (head) head.textContent = lp.live ? 'Your app is live' : 'Your app is ready to go online';

  if (a) {
    if (lp.url) {
      a.textContent = lp.url;
      a.href = lp.url;
      a.removeAttribute('aria-hidden');
      a.style.display = '';
    } else {
      a.textContent = '';
      a.href = '#';
      a.setAttribute('aria-hidden', 'true');
      a.style.display = 'none';
    }
  }
  const label = lp.live ? 'Open your app' : 'Put it online';
  const tip = lp.live
    ? 'Opens your app in a new tab.'
    : 'Sends this build online, then shows you the address.';
  if (openText) openText.textContent = label;
  if (open) { open.setAttribute('data-tip', tip); open.setAttribute('title', tip); }
  if (copy) copy.style.display = lp.url ? '' : 'none';
}

function lpShow(on) {
  const panel = lpEl('live-panel');
  if (!panel) return;
  panel.classList.toggle('is-visible', !!on);
  panel.setAttribute('aria-hidden', on ? 'false' : 'true');
}

async function lpPublish() {
  const pid = lp.projectId;
  if (!pid) { showToast('Choose a project first'); return; }
  if (lp.busy) return;
  lp.busy = true;
  const open = lpEl('live-panel-open');
  const openText = lpEl('live-panel-open-text');
  if (openText) openText.textContent = 'Putting it online...';
  if (open) open.disabled = true;
  try {
    const r = await fetch(`${API_BASE}/api/ai/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
      body: JSON.stringify({ projectId: pid }),
    });
    const j = await r.json().catch(() => null);
    const url = (j && (j.publishUrl || j.publish_url || j.url)) || lp.url;
    if (!r.ok) throw new Error((j && (j.error || j.message)) || 'HTTP ' + r.status);
    if (!url) throw new Error('the service did not give back an address');
    const c = await lpCheck(url);
    lp.url = url;
    lp.live = c.live;
    lpSetOff(false);
    lpRender();
    showToast(c.live ? 'It is online' : 'Published, but it is not answering yet');
    if (typeof lz !== 'undefined' && lz && Number(lz.projectId) === Number(pid)) lz.liveUrl = url;
  } catch (e) {
    showToast('Could not put it online: ' + String((e && e.message) || e));
    lpRender();
  } finally {
    lp.busy = false;
    if (open) open.disabled = false;
  }
}

function lpWire() {
  if (lp.wired) return;
  const open = lpEl('live-panel-open');
  const copy = lpEl('live-panel-copy');
  const close = lpEl('live-panel-close');
  if (!open || !copy || !close) return;
  lp.wired = true;

  open.addEventListener('click', () => {
    if (lp.live && lp.url) window.open(lp.url, '_blank', 'noopener');
    else lpPublish();
  });

  copy.addEventListener('click', async () => {
    const url = lp.url;
    if (!url) return;
    const t = lpEl('live-panel-copy-text');
    let ok = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(url); ok = true; }
    } catch { ok = false }
    if (!ok) {
      try {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:-1000px;left:-1000px;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch { ok = false }
    }
    if (t) {
      t.textContent = ok ? 'Copied' : 'Copy failed';
      setTimeout(() => { if (t.isConnected) t.textContent = 'Copy the link' }, 2000);
    }
    showToast(ok ? 'Link copied' : 'This browser would not copy it');
  });

  close.addEventListener('click', () => {
    lpSetOff(true);
    lpShow(false);
  });
}

// opts: { projectId, live (known HTTP result), forceReady (this build is
// unpublished), reason: 'publish' | 'build' }
async function showLivePanel(url, opts) {
  opts = opts || {};
  if (!lp.wired) lpWire();
  lp.url = url || '';
  if (opts.projectId != null) lp.projectId = opts.projectId;
  lpRender();

  if (opts.reason === 'publish') lpSetOff(false);
  if (lpOff()) { lpShow(false); return; }

  if (opts.forceReady) lp.live = false;
  else if (typeof opts.live === 'boolean') lp.live = opts.live;
  else { const c = await lpCheck(lp.url); lp.live = c.live; }

  lpRender();
  lpShow(true);
}

// After a plain build: we know this build is not published yet, so the
// panel never claims live here. It offers "Put it online" instead.
async function lpAfterBuild(pid) {
  const url = await lpProjectUrl(pid);
  try { showLivePanel(url, { projectId: pid, forceReady: true, reason: 'build' }); } catch { /* panel missing */ }
}

// Inline onclick="..." handlers in HTML resolve against `window`, but this file
// is an IIFE, so bare function declarations are unreachable from them. These three
// were referenced from index.html/app.js templates and threw ReferenceError.
window.loadGitHubRepos = loadGitHubRepos;
window.renderPage = renderPage;
window.showToast = showToast;

document.addEventListener('DOMContentLoaded', init);
})();
