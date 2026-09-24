#!/usr/bin/env node
/**
 * MCP protocol conformance test for hive/mcp-server.mjs.
 * Speaks real JSON-RPC over stdio — no simulation.
 * Run: node hive/test/mcp-protocol.test.mjs
 */
import { spawn } from 'node:child_process';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER = resolve(__dirname, '..', 'mcp-server.mjs');

let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  \x1b[32mPASS\x1b[0m ${name}${detail ? ' — ' + detail : ''}`); }
  else { fail++; console.log(`  \x1b[31mFAIL\x1b[0m ${name}${detail ? ' — ' + detail : ''}`); }
};

const child = spawn('node', [SERVER], { stdio: ['pipe', 'pipe', 'pipe'] });
let buf = '';
const pending = new Map();
let stderr = '';
child.stderr.on('data', (d) => (stderr += d));
child.stdout.on('data', (d) => {
  buf += d;
  let nl;
  while ((nl = buf.indexOf('\n')) !== -1) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    if (msg.id !== undefined && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  }
});

let nextId = 1;
function rpc(method, params, timeoutMs = 300000) {
  const id = nextId++;
  const p = new Promise((resolvePromise, reject) => {
    const t = setTimeout(() => { pending.delete(id); reject(new Error(`timeout waiting for ${method}`)); }, timeoutMs);
    pending.set(id, (msg) => { clearTimeout(t); resolvePromise(msg); });
  });
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  return p;
}
function notify(method, params) {
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
}

console.log('\n=== MCP HIVE PROTOCOL TEST ===\n');

// 1. initialize
const init = await rpc('initialize', {
  protocolVersion: '2025-06-18',
  capabilities: {},
  clientInfo: { name: 'readiness-test', version: '1.0.0' },
});
check('initialize returns result', !!init.result, JSON.stringify(init.error || {}));
check('serverInfo.name = nexus-hive', init.result?.serverInfo?.name === 'nexus-hive', init.result?.serverInfo?.name);
check('advertises tools capability', !!init.result?.capabilities?.tools);
check('echoes a supported protocolVersion', typeof init.result?.protocolVersion === 'string', init.result?.protocolVersion);
notify('notifications/initialized', {});

// 2. ping
const ping = await rpc('ping', {});
check('ping returns empty result', ping.result && Object.keys(ping.result).length === 0);

// 3. tools/list
const tools = await rpc('tools/list', {});
const names = (tools.result?.tools || []).map((t) => t.name);
check('tools/list returns tools', names.length >= 6, `${names.length} tools`);
for (const required of ['hive_status', 'hive_models', 'hive_readiness', 'hive_dispatch', 'hive_fanout', 'hive_run']) {
  check(`tool ${required} present`, names.includes(required));
}
check('every tool has inputSchema', (tools.result?.tools || []).every((t) => t.inputSchema?.type === 'object'));
check('every tool has description', (tools.result?.tools || []).every((t) => typeof t.description === 'string' && t.description.length > 20));

// 4. hive_models — must return the 8 verified free models
const models = await rpc('tools/call', { name: 'hive_models', arguments: {} });
const mtext = JSON.parse(models.result.content[0].text);
check('hive_models returns 8 free models', mtext.count === 8, `got ${mtext.count}`);
check('prefix is opencode/ (not opencode-zen/)', mtext.prefix === 'opencode/', mtext.prefix);
check('no bogus model ids', !mtext.models.some((m) => /mimo-v2\.5-free|jev-1\.13-free/.test(m)));

// 5. hive_status — roster
const status = await rpc('tools/call', { name: 'hive_status', arguments: {} });
const st = JSON.parse(status.result.content[0].text);
check('hive_status lists >= 8 agents', st.agents.length >= 8, `${st.agents.length} agents`);
check('every agent model starts with opencode/', st.agents.every((a) => a.model.startsWith('opencode/')));
check('every agent is free ($0)', st.agents.every((a) => a.cost_usd === 0 && a.free === true));

// 6. hive_run — one real free model call
const one = await rpc('tools/call', { name: 'hive_run', arguments: { model: 'big-pickle', prompt: 'Reply with exactly: MCP_OK' } }, 240000);
const oneText = one.result.content[0].text;
check('hive_run executes a real model', one.result.isError !== true, oneText.slice(0, 120).replace(/\n/g, ' '));
check('hive_run output contains MCP_OK', /MCP_OK/.test(oneText));
check('hive_run reports opencode/big-pickle', /big-pickle/.test(oneText));

// 7. hive_run rejects unknown models
const bad = await rpc('tools/call', { name: 'hive_run', arguments: { model: 'jev-1.13-free', prompt: 'x' } }, 30000);
check('hive_run rejects unverified model', bad.result.isError === true, bad.result.content[0].text.slice(0, 80));

// 8. unknown tool → JSON-RPC error
const unk = await rpc('tools/call', { name: 'does_not_exist', arguments: {} }, 30000);
check('unknown tool returns JSON-RPC error', !!unk.error && unk.error.code === -32602, JSON.stringify(unk.error));

// 9. unknown method → -32601
const um = await rpc('does/not/exist', {}, 30000);
check('unknown method returns -32601', um.error?.code === -32601, JSON.stringify(um.error));

// 10. PARALLEL PROOF: two different agents at the same time
console.log('\n  → parallel proof (2 agents simultaneously)…');
const t0 = Date.now();
const [a, b] = await Promise.all([
  rpc('tools/call', { name: 'hive_run', arguments: { model: 'space-bunny-free', prompt: 'Reply with exactly: PAR_A' } }, 240000),
  rpc('tools/call', { name: 'hive_run', arguments: { model: 'nemotron-3.5-lightning-free', prompt: 'Reply with exactly: PAR_B' } }, 240000),
]);
const parWall = Date.now() - t0;
check('parallel call A ok', /PAR_A/.test(a.result.content[0].text));
check('parallel call B ok', /PAR_B/.test(b.result.content[0].text));
console.log(`     both completed together in ${parWall}ms`);

check('server wrote no unhandled stderr crash', !/Cannot find module|SyntaxError/.test(stderr), stderr.split('\n')[0] || 'clean');

child.kill();

console.log(`\n=== RESULT: ${pass} pass / ${fail} fail ===\n`);
process.exit(fail ? 1 : 0);
