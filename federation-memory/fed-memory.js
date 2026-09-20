const http = require('http');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const PORT = 3002;
const DATA_DIR = path.join(__dirname, 'data');
const MEMORY_FILE = path.join(DATA_DIR, 'memories.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function loadMemories() {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
    }
  } catch (e) {}
  return [];
}

function saveMemories(memories) {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(memories, null, 2));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve({}); } });
    req.on('error', reject);
  });
}

function json(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

function sendDashboard(req, res) {
  const dashPath = path.join(__dirname, 'memory-dashboard.html');
  if (fs.existsSync(dashPath)) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(fs.readFileSync(dashPath, 'utf8'));
  } else {
    res.writeHead(404);
    res.end('Dashboard not found');
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  if (url.pathname === '/' && req.method === 'GET') return sendDashboard(req, res);

  if (url.pathname === '/api/memory/save' && req.method === 'POST') {
    const body = await parseBody(req);
    const memories = loadMemories();
    const memory = {
      id: randomUUID(),
      content: body.content || '',
      tags: body.tags || [],
      timestamp: body.timestamp || new Date().toISOString(),
      created: new Date().toISOString()
    };
    memories.push(memory);
    saveMemories(memories);
    return json(res, { success: true, memory });
  }

  if (url.pathname === '/api/memory/list' && req.method === 'GET') {
    return json(res, loadMemories());
  }

  if (url.pathname === '/api/memory/retrieve' && req.method === 'GET') {
    let memories = loadMemories();
    const tag = url.searchParams.get('tag');
    const text = url.searchParams.get('text');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    if (tag) memories = memories.filter(m => m.tags.includes(tag));
    if (text) memories = memories.filter(m => m.content.toLowerCase().includes(text.toLowerCase()));
    if (from) memories = memories.filter(m => m.timestamp >= from);
    if (to) memories = memories.filter(m => m.timestamp <= to);

    return json(res, memories);
  }

  if (url.pathname.startsWith('/api/memory/') && req.method === 'DELETE') {
    const id = url.pathname.split('/api/memory/')[1];
    let memories = loadMemories();
    const before = memories.length;
    memories = memories.filter(m => m.id !== id);
    saveMemories(memories);
    return json(res, { success: true, deleted: before - memories.length });
  }

  if (url.pathname === '/api/memory/export' && req.method === 'POST') {
    return json(res, { success: true, memories: loadMemories() });
  }

  if (url.pathname === '/api/memory/import' && req.method === 'POST') {
    const body = await parseBody(req);
    const existing = loadMemories();
    const imported = body.memories || [];
    const merged = [...existing, ...imported];
    saveMemories(merged);
    return json(res, { success: true, imported: imported.length, total: merged.length });
  }

  json(res, { error: 'Not found' }, 404);
});

server.listen(PORT, () => {
  console.log(`Federation Memory Server running on http://localhost:${PORT}`);
  console.log(`Dashboard: http://localhost:${PORT}/`);
});
