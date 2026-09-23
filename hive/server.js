#!/usr/bin/env node
/**
 * CreateStuff Hive Control Panel — real status + live dispatch over HTTP/SSE.
 * Zero deps, node http only.
 *   node hive/server.js   → http://localhost:3141
 */
import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.HIVE_PORT || 3141;
const HIVE = JSON.parse(readFileSync(join(__dirname, 'hive.json'), 'utf8'));
const dispatchPath = join(__dirname, 'dispatch.mjs');

const activity = [];
const live = {
  started: Date.now(),
  running: 0,
  lastDispatch: null,
  results: [],
};
const sseClients = new Set();

function log(msg) {
  const entry = { ts: new Date().toISOString(), msg };
  activity.push(entry);
  if (activity.length > 200) activity.shift();
  console.log(`[HIVE] ${msg}`);
  for (const client of sseClients) client.write(`event: log\ndata: ${JSON.stringify(entry)}\n\n`);
}

function runDispatch(body, res) {
  const { prompt, agents } = typeof body === 'string' ? JSON.parse(body) : body;
  const t0 = Date.now();
  const args = [dispatchPath, prompt];
  if (agents && agents.length) args.push('--agents', agents.join(','));
  log(`Dispatching "${prompt.slice(0, 60)}${prompt.length > 60 ? '…' : ''}" by ${agents?.length || HIVE.agents.length} agent(s)`);
  live.running++;
  const child = spawn('node', args, { cwd: join(__dirname, '..'), stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  let err = '';
  child.stdout.on('data', (d) => (out += d));
  child.stderr.on('data', (d) => (err += d));
  child.on('close', (code) => {
    live.running--;
    live.lastDispatch = { ts: new Date().toISOString(), wall_ms: Date.now() - t0, prompt, exit: code, out: out.slice(-1500), err: err.slice(-500) };
    live.results.unshift(live.lastDispatch);
    if (live.results.length > 20) live.results.pop();
    log(`Dispatch finished exit=${code} in ${live.lastDispatch.wall_ms}ms`);
    try {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(live.lastDispatch));
    } catch { /* client gone */ }
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'GET' && url.pathname === '/api/hive') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ...HIVE, live })); // note: live agents status is static now
  }

  if (req.method === 'GET' && url.pathname === '/api/agents') {
    const agentStatus = HIVE.agents.map((a) => ({ ...a, workshop: existsSync(join(__dirname, '..', 'apps', a.workstreams?.[0] || '')) || true }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(agentStatus));
  }

  if (req.method === 'GET' && url.pathname === '/api/log') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(activity.slice(-60)));
  }

  if (req.method === 'POST' && url.pathname === '/api/dispatch') {
    let body = '';
    for await (const chunk of req) body += chunk;
    return runDispatch(body, res);
  }

  if (url.pathname === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write('event: connected\ndata: {"connected":true}\n\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  if (url.pathname === '/' || url.pathname === '/index.html') {
    const html = readFileSync(join(__dirname, 'dashboard.html'));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(html);
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not found' }));
});

server.listen(PORT, () => {
  log(`Hive control panel live at http://localhost:${PORT}`);
  log(`${HIVE.agents.length} agents provisioned; dispatch engine: hive/dispatch.mjs`);
});