const http = require('http');
const crypto = require('crypto');
function uuidv4() { return crypto.randomUUID(); }

const PORT = 3000;

const MODELS = {
  'muse-spark-1.3': { name: 'Muse Spark 1.3', specialties: ['content_writing', 'copywriting', 'blog'], status: 'online', tasksCompleted: 0, avgLatency: 1200 },
  'mimo-v2.5': { name: 'Mimo v2.5', specialties: ['coding', 'programming', 'debug'], status: 'online', tasksCompleted: 0, avgLatency: 800 },
  'ling-3.0-flash-fin': { name: 'Ling 3.0 Flash Fin', specialties: ['market_analysis', 'finance'], status: 'online', tasksCompleted: 0, avgLatency: 600 },
  'nemotron-3-ultra': { name: 'Nemotron 3 Ultra', specialties: ['research', 'analysis'], status: 'online', tasksCompleted: 0, avgLatency: 1500 },
  'muse-spark-1.2': { name: 'Muse Spark 1.2', specialties: ['creative', 'design'], status: 'online', tasksCompleted: 0, avgLatency: 1100 },
  'nemotron-3.5-lightning': { name: 'Nemotron 3.5 Lightning', specialties: ['speed', 'quick'], status: 'online', tasksCompleted: 0, avgLatency: 300 },
  'union-alpha': { name: 'Union Alpha', specialties: ['general', 'chat'], status: 'online', tasksCompleted: 0, avgLatency: 900 },
  'big-pickle': { name: 'Big Pickle', specialties: ['heavy', 'complex'], status: 'online', tasksCompleted: 0, avgLatency: 2000 },
  'opencode-zen': { name: 'OpenCode Zen', specialties: ['balanced', 'default'], status: 'online', tasksCompleted: 0, avgLatency: 1000 }
};

const ROUTING_RULES = {
  content_writing: 'muse-spark-1.3', copywriting: 'muse-spark-1.3', blog: 'muse-spark-1.3',
  coding: 'mimo-v2.5', programming: 'mimo-v2.5', debug: 'mimo-v2.5',
  market_analysis: 'ling-3.0-flash-fin', finance: 'ling-3.0-flash-fin',
  research: 'nemotron-3-ultra', analysis: 'nemotron-3-ultra',
  creative: 'muse-spark-1.2', design: 'muse-spark-1.2',
  speed: 'nemotron-3.5-lightning', quick: 'nemotron-3.5-lightning',
  general: 'union-alpha', chat: 'union-alpha',
  heavy: 'big-pickle', complex: 'big-pickle',
  balanced: 'opencode-zen', default: 'opencode-zen'
};

let taskHistory = [];
let sseClients = [];

function resolveModel(task) {
  const type = (task.type || 'default').toLowerCase();
  return ROUTING_RULES[type] || 'opencode-zen';
}

function simulateExecution(modelId, task) {
  const model = MODELS[modelId];
  const latency = model.avgLatency + Math.floor(Math.random() * 500) - 250;
  return new Promise(resolve => {
    setTimeout(() => {
      model.tasksCompleted++;
      resolve({
        taskId: uuidv4(),
        model: modelId,
        modelName: model.name,
        task: task.prompt,
        type: task.type,
        result: `[${model.name}] Processed: "${task.prompt}"`,
        latency: Math.max(200, latency),
        timestamp: new Date().toISOString()
      });
    }, latency);
  });
}

function broadcastSSE(data) {
  sseClients.forEach(client => client.write(`data: ${JSON.stringify(data)}\n\n`));
}

function parseBody(req) {
  return new Promise(resolve => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => resolve(JSON.parse(body)));
  });
}

function sendJSON(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // SSE
  if (url.pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache',
      'Connection': 'keep-alive', 'Access-Control-Allow-Origin': '*'
    });
    sseClients.push(res);
    req.on('close', () => { sseClients = sseClients.filter(c => c !== res); });
    return;
  }

  // GET /api/status
  if (url.pathname === '/api/status' && req.method === 'GET') {
    return sendJSON(res, { models: MODELS, totalTasks: taskHistory.length });
  }

  // GET /api/tasks
  if (url.pathname === '/api/tasks' && req.method === 'GET') {
    const limit = parseInt(url.searchParams.get('limit') || '50');
    return sendJSON(res, { tasks: taskHistory.slice(-limit).reverse() });
  }

  // POST /api/dispatch
  if (url.pathname === '/api/dispatch' && req.method === 'POST') {
    const body = await parseBody(req);
    if (!body.prompt) return sendJSON(res, { error: 'prompt required' }, 400);

    const modelId = body.model || resolveModel(body);
    const task = { prompt: body.prompt, type: body.type || 'default' };

    broadcastSSE({ event: 'dispatch', model: modelId, task: task.prompt });

    const result = await simulateExecution(modelId, task);
    taskHistory.push(result);
    broadcastSSE({ event: 'completed', result });

    return sendJSON(res, result);
  }

  // POST /api/parallel
  if (url.pathname === '/api/parallel' && req.method === 'POST') {
    const body = await parseBody(req);
    if (!body.tasks || !Array.isArray(body.tasks)) return sendJSON(res, { error: 'tasks array required' }, 400);

    broadcastSSE({ event: 'parallel_start', count: body.tasks.length });

    const promises = body.tasks.map(task => {
      const modelId = task.model || resolveModel(task);
      return simulateExecution(modelId, { prompt: task.prompt, type: task.type || 'default' });
    });

    const results = await Promise.all(promises);
    results.forEach(r => taskHistory.push(r));
    broadcastSSE({ event: 'parallel_complete', results });

    return sendJSON(res, { results, totalLatency: results.reduce((s, r) => s + r.latency, 0) });
  }

  // Serve dashboard
  if (url.pathname === '/' || url.pathname === '/dashboard') {
    const fs = require('fs');
    const path = require('path');
    const htmlPath = path.join(__dirname, 'dashboard.html');
    if (fs.existsSync(htmlPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end(fs.readFileSync(htmlPath));
    }
  }

  sendJSON(res, { error: 'not found' }, 404);
});

server.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════════╗`);
  console.log(`  ║   MCP Hive Orchestrator - Port ${PORT}       ║`);
  console.log(`  ║   Dashboard: http://localhost:${PORT}        ║`);
  console.log(`  ╚══════════════════════════════════════════╝\n`);
  console.log(`  Models loaded: ${Object.keys(MODELS).length}`);
  console.log(`  Routing rules: ${Object.keys(ROUTING_RULES).length}`);
  console.log(`  Ready to dispatch.\n`);
});
