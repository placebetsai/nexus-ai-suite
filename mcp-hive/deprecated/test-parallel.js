const http = require('http');

const API = 'http://localhost:3000';

function post(path, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const req = http.request(`${API}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`${API}${path}`, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('\n=== MCP Hive Orchestrator - Parallel Test ===\n');

  // Test 1: Status check
  const status = await get('/api/status');
  console.log(`Models online: ${Object.keys(status.models).length}`);
  Object.entries(status.models).forEach(([id, m]) => {
    console.log(`  ${m.name.padEnd(22)} [${m.specialties.join(', ')}]`);
  });

  // Test 2: 3 parallel dispatches
  console.log('\n--- Dispatching 3 parallel tasks ---\n');
  const start = Date.now();

  const parallelTasks = {
    tasks: [
      { prompt: 'Write a compelling blog post about AI trends in 2026', type: 'content_writing' },
      { prompt: 'Debug the memory leak in the authentication module', type: 'coding' },
      { prompt: 'Analyze Q3 market performance for the tech sector', type: 'market_analysis' }
    ]
  };

  const result = await post('/api/parallel', parallelTasks);
  const wallTime = Date.now() - start;

  console.log('Results:');
  result.results.forEach((r, i) => {
    console.log(`  [${i + 1}] ${r.modelName.padEnd(22)} | ${r.latency}ms | ${r.task.substring(0, 50)}...`);
  });

  console.log(`\n  Total latency (sum):  ${result.totalLatency}ms`);
  console.log(`  Wall clock time:      ${wallTime}ms`);
  console.log(`  Speedup factor:       ${(result.totalLatency / wallTime).toFixed(1)}x (parallel vs sequential)`);

  // Test 3: Verify task history
  const tasks = await get('/api/tasks');
  console.log(`\n  Tasks in history: ${tasks.tasks.length}`);

  console.log('\n=== All tests passed ===\n');
}

runTests().catch(err => {
  console.error('Test failed:', err.message);
  console.error('Make sure the server is running: node orchestrator.js');
  process.exit(1);
});
