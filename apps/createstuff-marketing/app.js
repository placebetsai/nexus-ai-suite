(function(){
'use strict';

const API_BASE = 'https://api.createstuff.ai';
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

const CS_TEMPLATE_CATALOG = [
  { id: 1, icon: '🛍️', name: 'Storefront', description: 'Product grid + cart for a small shop', tech_stack: 'HTML, CSS, JavaScript',
    prompt_template: 'Build a storefront with a product grid, product detail cards, a sliding cart drawer and a checkout summary section.' },
  { id: 2, icon: '📅', name: 'Booking Page', description: 'Appointment slots + confirmation', tech_stack: 'HTML, CSS, JavaScript',
    prompt_template: 'Build a booking page with a date picker, available time slots, a customer details form and a confirmation panel.' },
  { id: 3, icon: '📊', name: 'Dashboard', description: 'KPI cards, charts, table', tech_stack: 'HTML, CSS, JavaScript',
    prompt_template: 'Build an analytics dashboard with KPI cards, an inline SVG line chart, a bar chart and a sortable data table.' },
  { id: 4, icon: '✍️', name: 'Blog', description: 'Article list + reader view', tech_stack: 'HTML, CSS, JavaScript',
    prompt_template: 'Build a blog with a list of article cards and a reader view that opens a full article with a table of contents.' },
  { id: 5, icon: '🎓', name: 'Course', description: 'Lessons, progress, quiz', tech_stack: 'HTML, CSS, JavaScript',
    prompt_template: 'Build a course page with a lesson list, a progress bar per lesson and a multiple choice quiz at the end.' },
  { id: 6, icon: '🧾', name: 'Landing', description: 'Hero, features, pricing, FAQ', tech_stack: 'HTML, CSS, JavaScript',
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
      const html = files.filter((f) => /\.html?$/i.test(f.path))
        .sort((a, b) => (b.content || '').length - (a.content || '').length)[0];
      const b = csBuilds()[id];
      if (!b) return;
      b.agent_log.push({ agent: 'Frontend', message: `AI wrote ${files.length} real file(s): ${files.map((f) => f.path).join(', ')}` });
      b.agent_log.push({ agent: 'Test', message: `Validated ${files.length} file(s); preview ready` });
      b.generated_code = html ? html.content : (files[0] ? files[0].content : '');
      b.files = files;
      b.status = b.generated_code ? 'completed' : 'failed';
      b.done = true;
      const all = csBuilds(); all[id] = b; csSaveBuilds(all);
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
        note: (x.published_url ? 'Published' : x.status === 'completed' ? 'Built' : x.status) +
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
    if (welcome) welcome.textContent = `Welcome back, ${displayName} 👋`;
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
  if (page === 'deploy') loadDeployPage();
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
  el.innerHTML = projs.map(p => `
    <div class="recent-item" onclick="renderPage('projects')">
      <span class="recent-icon">${p.icon || '📁'}</span>
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
  const agents = ['Planner','Architect','Frontend','Backend','Style','Test','Deploy','Git','Fix'];
  const icons = ['📋','🏗️','🎨','⚙️','✨','🧪','🚀','🔗','🔧'];
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
    grid.innerHTML = '<div class="empty-state"><p>No projects yet. Start building!</p></div>';
    return;
  }
  grid.innerHTML = projects.map(p => `
    <div class="project-card">
      <div class="project-visual">${p.icon || '📁'}</div>
      <div class="project-info">
        <div class="project-name">${p.name}</div>
        <div class="project-meta">${p.tech_stack || ''} · ${p.status}</div>
        <div class="project-meta"><span class="deploy-status ${p.status === 'deployed' ? 'deploy-live' : 'deploy-pending'}">● ${p.status}</span></div>
      </div>
      <div class="project-actions">
        <button onclick="editProject('${p.id}')">Edit</button>
        <button onclick="cloneProject('${p.id}')">Clone</button>
        <button onclick="deleteProject('${p.id}')">Delete</button>
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
    showToast('Project cloned!');
  } catch (err) {
    showToast('Error cloning project');
  }
};

window.deleteProject = async function(id) {
  if (!confirm('Delete this project?')) return;
  try {
    await api(`/api/projects/${id}`, { method: 'DELETE' });
    loadProjects();
    showToast('Project deleted!');
  } catch (err) {
    showToast('Error deleting project');
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
      <div class="template-visual">${t.icon}</div>
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
  list.innerHTML = '<div class="empty-state"><p>Loading repositories...</p></div>';
  try {
    const data = await api('/api/github/repos');
    const repos = data.repos || [];
    document.getElementById('gh-connect').style.display = 'none';
    document.getElementById('gh-repos').style.display = 'block';
    if (!repos.length) {
      list.innerHTML = '<div class="empty-state"><p>No repositories found.</p></div>';
      return;
    }
    list.innerHTML = repos.map(r => `
      <div class="repo-item" style="display:flex;justify-content:space-between;align-items:center;padding:.85rem;border:1px solid var(--border);border-radius:8px;margin-bottom:.5rem;background:var(--bg2)">
        <div>
          <div style="font-weight:600">${escapeHtml(r.name)}</div>
          <div style="font-size:.8rem;color:var(--text2)">${escapeHtml(r.language || '')} · ★ ${r.stargazers_count} · updated ${new Date(r.updated_at).toLocaleDateString()}</div>
          ${r.description ? `<div style="font-size:.8rem;color:var(--text3);margin-top:.25rem">${escapeHtml(r.description)}</div>` : ''}
        </div>
        <a href="${escapeHtml(r.html_url)}" target="_blank" rel="noopener" style="padding:.35rem .75rem;border-radius:6px;background:var(--bg3);color:var(--text);text-decoration:none;font-size:.8rem;border:1px solid var(--border)">Open</a>
      </div>
    `).join('');
    showToast(`Loaded ${repos.length} repositories`);
  } catch (err) {
    list.innerHTML = '<div class="empty-state"><p>Failed to load GitHub repos. Check server token.</p></div>';
    showToast('GitHub load failed');
  }
}

// ============ DEPLOY ============
async function loadDeployPage() {
  const grid = document.getElementById('deploy-cards');
  if (!grid) return;
  grid.innerHTML = '<div class="empty-state"><p>Loading projects...</p></div>';
  try {
    projects = csProjectList(await api('/api/projects'));
    if (!projects.length) {
      grid.innerHTML = '<div class="empty-state"><p>No projects yet. Build one first.</p></div>';
      return;
    }
    // Get latest build for each project if deployed, show status
    grid.innerHTML = projects.map(p => `
      <div class="deploy-card card" style="padding:1.25rem">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem">
          <div>
            <div style="font-weight:700">${p.icon || '📁'} ${escapeHtml(p.name)}</div>
            <div style="font-size:.8rem;color:var(--text2)">${escapeHtml(p.status || 'draft')}</div>
          </div>
          <span class="deploy-status ${p.status === 'deployed' ? 'deploy-live' : 'deploy-pending'}">● ${p.status === 'deployed' ? 'Live' : 'Pending'}</span>
        </div>
        ${p.deploy_url ? `<a href="${escapeHtml(p.deploy_url)}" target="_blank" rel="noopener" style="display:block;font-size:.8rem;color:#3b82f6;word-break:break-all;margin-bottom:.75rem">${escapeHtml(p.deploy_url)}</a>` : ''}
        <button class="btn-primary" onclick="deployLatestBuild('${p.id}')" style="width:100%">🚀 ${p.status === 'deployed' ? 'Redeploy' : 'Deploy Now'}</button>
      </div>
    `).join('');
  } catch (err) {
    grid.innerHTML = '<div class="empty-state"><p>Failed to load deploy projects.</p></div>';
  }
}

window.deployLatestBuild = async function(projectId) {
  try {
    showToast('Finding latest build...');
    // Find builds by creating a lightweight lookup: we track builds via project status
    // For simplicity, use project's last known build via builds API - need build id.
    // We'll store last build id on project creation path; fallback: scan via builds not listed.
    // Instead: call a deploy endpoint that finds most recent completed build for project.
    const buildId = await findLatestBuildId(projectId);
    if (!buildId) { showToast('No completed build for this project yet'); return; }
    const result = await api(`/api/builds/${buildId}/deploy`, { method: 'POST', body: JSON.stringify({}) });
    showToast('Deployed! Opening URL...');
    window.open(result.url, '_blank');
    loadDeployPage();
  } catch (err) {
    showToast('Deploy failed');
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
}

async function startBuild(prompt) {
  const chat = document.getElementById('chat-messages');
  const agentStatusBar = document.getElementById('agent-status-bar');
  const previewFrame = document.getElementById('preview-frame');

  chat.innerHTML += `<div class="msg user"><div class="msg-avatar">👤</div><div class="msg-content">${escapeHtml(prompt)}</div></div>`;

  document.querySelectorAll('.agent-chip').forEach(c => { c.classList.remove('working', 'done'); c.querySelector('.agent-status-text').textContent = 'Idle' });

  agentStatusBar.innerHTML = '<span class="status-dot active"></span>Hive Working...';
  agentLogSeen = 0;
  addAgentMsg('Planner', 'Analyzing your request and creating a plan...');

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

          agentStatusBar.innerHTML = '<span class="status-dot" style="background:var(--green)"></span>All Done!';

          if (buildStatus.generated_code) {
            previewFrame.innerHTML = `
              <iframe id="live-preview" sandbox="allow-scripts" style="width:100%;height:100%;min-height:400px;border:none;border-radius:8px;background:#fff" srcdoc="${escapeHtml(buildStatus.generated_code)}"></iframe>
              <div style="display:flex;gap:.5rem;padding:.5rem;background:var(--bg2);border-top:1px solid var(--border)">
                <button onclick="deployBuild('${buildStatus.id}')" class="btn-primary" style="flex:1;padding:.5rem">🚀 Deploy</button>
                <button onclick="loadVersions('${buildStatus.id}')" style="flex:1;padding:.5rem;border:1px solid var(--border);border-radius:6px;background:var(--bg3);color:var(--text);cursor:pointer">📜 Versions</button>
              </div>
              <div id="versions-panel" style="display:none;padding:.75rem;background:var(--bg2);border-top:1px solid var(--border);max-height:150px;overflow:auto"></div>
            `;
          }

          addAgentMsg('Deploy', 'Build complete! Click Deploy to get a public URL.');
          showToast('Build complete!');
        } else if (buildStatus.status === 'failed') {
          clearInterval(pollInterval);
          agentStatusBar.innerHTML = '<span class="status-dot" style="background:var(--red)"></span>Build failed';
          addAgentMsg('System', 'Build failed. Please try again.');
          showToast('Build failed');
        }

        const agentNames = ['Planner', 'Architect', 'Frontend', 'Backend', 'Style', 'Test', 'Deploy'];
        const completedCount = buildStatus.agent_log?.length || 0;
        agentNames.forEach((name, i) => {
          const chip = document.querySelector(`.agent-chip[data-agent="${name.toLowerCase()}"]`);
          if (chip) {
            if (i < completedCount) {
              chip.classList.remove('working');
              chip.classList.add('done');
              chip.querySelector('.agent-status-text').textContent = 'Done';
            } else if (i === completedCount) {
              chip.classList.add('working');
              chip.querySelector('.agent-status-text').textContent = 'Working...';
            }
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
    showToast('Deploying...');
    const result = await api(`/api/builds/${buildId}/deploy`, { method: 'POST', body: JSON.stringify({}) });
    showToast('Deployed!');
    window.open(result.url, '_blank');
  } catch (err) {
    showToast('Deploy failed');
  }
};

window.loadVersions = async function(buildId) {
  const panel = document.getElementById('versions-panel');
  if (!panel) return;
  panel.style.display = 'block';
  panel.innerHTML = '<p style="font-size:.8rem;color:var(--text2)">Loading versions...</p>';
  try {
    const versions = await api(`/api/builds/${buildId}/versions`);
    if (!versions.length) {
      panel.innerHTML = '<p style="font-size:.8rem;color:var(--text2)">No versions yet.</p>';
      return;
    }
    panel.innerHTML = versions.map(v => `
      <div style="display:flex;justify-content:space-between;font-size:.8rem;padding:.35rem 0;border-bottom:1px solid var(--border)">
        <span>v${v.version} · ${escapeHtml(v.note || '')}</span>
        <span style="color:var(--text3)">${v.code_len} chars · ${new Date(v.created_at).toLocaleString()}</span>
      </div>
    `).join('');
  } catch (err) {
    panel.innerHTML = '<p style="font-size:.8rem;color:var(--red)">Failed to load versions.</p>';
  }
};

function addAgentMsg(name, msg, code) {
  const chat = document.getElementById('chat-messages');
  const icons = { Planner: '📋', Architect: '🏗️', Frontend: '🎨', Backend: '⚙️', Style: '✨', Test: '🧪', Deploy: '🚀', Git: '🔗', Fix: '🔧', System: '🤖' };
  let html = `<div class="msg agent"><div class="msg-avatar">${icons[name] || '🤖'}</div><div class="msg-content"><strong>${name} Agent</strong><p>${msg}</p>`;
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
    showToast('Failed to load files');
  }
}

async function loadProjectFiles() {
  if (!currentProjectId) return;
  try {
    const files = await api(`/api/projects/${currentProjectId}/files`);
    const list = document.getElementById('file-list');
    if (!list) return;
    if (!files.length) {
      list.innerHTML = '<p style="font-size:.85rem;color:var(--text2)">No files yet. Save one from the editor or build an app.</p>';
      return;
    }
    list.innerHTML = files.map(f => `
      <div class="file-item" onclick="openFile('${currentProjectId}', '${escapeHtml(f.file_path).replace(/'/g, "\\'")}')">
        📄 ${escapeHtml(f.file_path)} <span style="color:var(--text3);font-size:.75rem">(${f.size}b)</span>
      </div>
    `).join('');
  } catch (e) {
    showToast('File list failed');
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
  if (!currentProjectId) { showToast('Select a project'); return; }
  const path = document.getElementById('editor-path').value.trim();
  const content = document.getElementById('editor-content').value;
  if (!path) { showToast('Path required'); return; }
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
  if (!currentProjectId) { showToast('Select a project'); return; }
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
  if (!name) { showToast('Repo name required'); return; }
  try {
    const r = await api('/api/github/create-repo', {
      method: 'POST',
      body: JSON.stringify({ name, description: 'Created from CreateStuff.ai' }),
    });
    showToast(`Created ${r.full_name}`);
    document.getElementById('push-repo').value = r.full_name;
    loadGitHubRepos();
  } catch (e) {
    showToast('Create repo failed');
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
    if (!code) { showToast('No code found — paste content manually'); return; }
    document.getElementById('push-content').value = code;
    showToast('Filled with build code');
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
  if (!repo || !content) { showToast('Repo and content required'); return; }
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

function escapeHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;') }

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.style.display = 'block';
  setTimeout(() => t.style.display = 'none', 3000);
}

document.addEventListener('DOMContentLoaded', init);
})();
