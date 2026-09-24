const http = require('http');
const { EventEmitter } = require('events');

const PORT = 3000;
const emitter = new EventEmitter();
emitter.setMaxListeners(50);

// ── Model Registry ──────────────────────────────────────────────────────────
const MODELS = {
  'muse-spark-1.3':      { name: 'Muse Spark 1.3',      type: 'content_writing', status: 'online',  latency: 0, tasksHandled: 0 },
  'mimo-v2.5':           { name: 'Mimo v2.5',            type: 'coding',          status: 'online',  latency: 0, tasksHandled: 0 },
  'ling-3.0-flash-fin':  { name: 'Ling 3.0 Flash Fin',   type: 'market_analysis', status: 'online',  latency: 0, tasksHandled: 0 },
  'nemotron-3-ultra':    { name: 'Nemotron 3 Ultra',     type: 'research',        status: 'online',  latency: 0, tasksHandled: 0 },
  'muse-spark-1.2':      { name: 'Muse Spark 1.2',       type: 'creative',        status: 'online',  latency: 0, tasksHandled: 0 },
  'nemotron-3.5-lightning': { name: 'Nemotron 3.5 Lightning', type: 'speed',        status: 'online',  latency: 0, tasksHandled: 0 },
  'union-alpha':         { name: 'Union Alpha',           type: 'general',         status: 'online',  latency: 0, tasksHandled: 0 },
  'big-pickle':          { name: 'Big Pickle',            type: 'heavy',           status: 'online',  latency: 0, tasksHandled: 0 },
  'opencode-zen':        { name: 'OpenCode Zen',          type: 'balanced',        status: 'online',  latency: 0, tasksHandled: 0 },
};

// ── Task Routing ────────────────────────────────────────────────────────────
function routeToModel(taskType) {
  const entry = Object.entries(MODELS).find(([, m]) => m.type === taskType);
  return entry ? entry[0] : null;
}

// ── Activity Log ────────────────────────────────────────────────────────────
const activityLog = [];
const taskQueue = [];
const resultsFeed = [];

function log(msg) {
  const entry = { ts: new Date().toISOString(), msg };
  activityLog.push(entry);
  if (activityLog.length > 200) activityLog.shift();
  console.log(`[HIVE] ${msg}`);
  emitter.emit('log', entry);
}

// ── Simulated Model Execution ───────────────────────────────────────────────
function executeTask(task) {
  const modelId = routeToModel(task.type);
  if (!modelId) return Promise.reject(new Error(`No model for type: ${task.type}`));

  const model = MODELS[modelId];
  const start = Date.now();

  const result = {
    taskId: task.id,
    modelId,
    modelName: model.name,
    taskType: task.type,
    prompt: task.prompt,
    result: `[${model.name}] Processed: "${task.prompt.substring(0, 80)}..."`,
    latency: 0,
    tokensUsed: Math.floor(Math.random() * 500) + 100,
    timestamp: new Date().toISOString(),
  };

  return new Promise((resolve) => {
    const delay = Math.floor(Math.random() * 400) + 100;
    setTimeout(() => {
      result.latency = Date.now() - start;
      model.latency = result.latency;
      model.tasksHandled++;
      log(`Task ${task.id} completed by ${model.name} in ${result.latency}ms`);
      resultsFeed.unshift(result);
      if (resultsFeed.length > 100) resultsFeed.pop();
      emitter.emit('result', result);
      resolve(result);
    }, delay);
  });
}

// ── Dispatch Endpoint ───────────────────────────────────────────────────────
async function handleDispatch(req, res) {
  let body = '';
  for await (const chunk of req) body += chunk;

  let tasks;
  try {
    const parsed = JSON.parse(body);
    tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [parsed];
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Invalid JSON' }));
  }

  // Assign IDs
  tasks.forEach((t, i) => {
    t.id = t.id || `task-${Date.now()}-${i}`;
  });

  log(`Dispatching ${tasks.length} task(s) in parallel`);
  tasks.forEach((t) => {
    taskQueue.push(t);
    emitter.emit('queue', { id: t.id, type: t.type, prompt: t.prompt });
  });

  const start = Date.now();
  try {
    const results = await Promise.all(tasks.map(executeTask));
    const totalLatency = Date.now() - start;
    log(`All ${tasks.length} tasks completed in ${totalLatency}ms total`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      totalLatency,
      tasksCompleted: results.length,
      results,
      modelTracker: results.map(r => ({ taskId: r.taskId, modelId: r.modelId, modelName: r.modelName })),
    }));
  } catch (err) {
    log(`Dispatch error: ${err.message}`);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  } finally {
    tasks.forEach((t) => {
      const idx = taskQueue.findIndex(q => q.id === t.id);
      if (idx !== -1) taskQueue.splice(idx, 1);
    });
  }
}

// ── SSE Endpoint ────────────────────────────────────────────────────────────
function handleSSE(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  res.write('event: connected\ndata: {"connected":true}\n\n');

  const onLog = (entry) => res.write(`event: log\ndata: ${JSON.stringify(entry)}\n\n`);
  const onResult = (r) => res.write(`event: result\ndata: ${JSON.stringify(r)}\n\n`);
  const onQueue = (q) => res.write(`event: queue\ndata: ${JSON.stringify(q)}\n\n`);

  emitter.on('log', onLog);
  emitter.on('result', onResult);
  emitter.on('queue', onQueue);

  // Heartbeat
  const hb = setInterval(() => res.write(': heartbeat\n\n'), 15000);

  req.on('close', () => {
    emitter.off('log', onLog);
    emitter.off('result', onResult);
    emitter.off('queue', onQueue);
    clearInterval(hb);
  });
}

// ── Static File Server ──────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
};

function serveStatic(req, res) {
  const path = req.url === '/' ? '/hive-dashboard.html' : req.url;
  const fs = require('fs');
  const filePath = __dirname + path;
  const ext = require('path').extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not Found');
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

// ── API Router ──────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // API routes
  if (req.method === 'POST' && url.pathname === '/api/dispatch') {
    return handleDispatch(req, res);
  }

  if (url.pathname === '/api/models') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(MODELS));
  }

  if (url.pathname === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      uptime: process.uptime(),
      models: Object.keys(MODELS).length,
      online: Object.values(MODELS).filter(m => m.status === 'online').length,
      queueLength: taskQueue.length,
      resultsCount: resultsFeed.length,
      logCount: activityLog.length,
    }));
  }

  if (url.pathname === '/api/log') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(activityLog.slice(-50)));
  }

  if (url.pathname === '/api/results') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(resultsFeed.slice(0, 20)));
  }

  if (url.pathname === '/api/queue') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(taskQueue));
  }

  if (url.pathname === '/events') {
    return handleSSE(req, res);
  }

  // Static files
  serveStatic(req, res);
});

server.listen(PORT, () => {
  log(`Hive Orchestrator online on http://localhost:${PORT}`);
  log(`Dashboard: http://localhost:${PORT}/`);
  log(`SSE stream: http://localhost:${PORT}/events`);
  console.log('\n── MCP HIVE ORCHESTRATOR ──────────────────────────────');
  console.log(`  Models loaded: ${Object.keys(MODELS).length}`);
  console.log(`  Server: http://localhost:${PORT}`);
  console.log('──────────────────────────────────────────────────────\n');
});

module.exports = { server, MODELS, routeToModel, activityLog, resultsFeed };
