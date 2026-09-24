#!/usr/bin/env node
/**
 * Hive readiness test. Validates the hive is REAL, not simulated:
 *  1. hive.json manifest — agents, free models, correct `opencode/` prefix
 *  2. Every agent has a brief on disk
 *  3. Engines parse (dispatch.mjs, models.mjs, mcp-server.mjs)
 *  4. Live parallel probe — real opencode processes, real ACKs
 *
 * Run: node hive/test/readiness.test.mjs
 */
import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HIVE_DIR = resolve(__dirname, '..');
const HIVE = JSON.parse(readFileSync(join(HIVE_DIR, 'hive.json'), 'utf8'));

let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  \x1b[32mPASS\x1b[0m ${name}${detail ? ' — ' + detail : ''}`); }
  else { fail++; console.log(`  \x1b[31mFAIL\x1b[0m ${name}${detail ? ' — ' + detail : ''}`); }
};

console.log('\n=== HIVE READINESS TEST ===\n');

console.log(`1. Manifest (${HIVE.name} v${HIVE.version})`);
check('has >= 8 agents', HIVE.agents.length >= 8, `got ${HIVE.agents.length}`);
check('all agents flagged free', HIVE.agents.every((a) => a.free === true));
check('agent ids unique', new Set(HIVE.agents.map((a) => a.id)).size === HIVE.agents.length);
check('every agent has model + role + workstreams', HIVE.agents.every((a) => a.model && a.role && a.workstreams?.length));
check('every agent has a fallback', HIVE.agents.every((a) => a.fallback), 'all agents have fallback chains');
check('model prefix is opencode/ (NOT opencode-zen/)', HIVE.model_prefix === 'opencode/', HIVE.model_prefix);
check('8 verified free models listed', HIVE.free_models?.length === 8, `got ${HIVE.free_models?.length}`);
check('no bogus model ids in roster', !HIVE.agents.some((a) => /mimo-v2\.5-free|jev-1\.13-free|union-alpha/.test(a.model)));
check('no agent model missing from free_models', HIVE.agents.every((a) => HIVE.free_models.some((m) => m.id === a.model)));
check('all fallbacks are real free models', HIVE.agents.every((a) => HIVE.free_models.some((m) => m.id === a.fallback)));
check('parallelism configured >= 8', HIVE.dispatch?.parallelism >= 8, `got ${HIVE.dispatch?.parallelism}`);

console.log('\n2. Briefs on disk');
HIVE.agents.forEach((a) => {
  const b = join(HIVE_DIR, 'agents', `${a.id}.md`);
  check(`brief ${a.id}.md`, existsSync(b), b.replace(HIVE_DIR, '.'));
});

console.log('\n3. Engines parse');
for (const f of ['dispatch.mjs', 'models.mjs', 'mcp-server.mjs']) {
  check(`${f} exists`, existsSync(join(HIVE_DIR, f)));
}
check('fake orchestrator quarantined', existsSync(join(HIVE_DIR, '..', 'mcp-hive', 'deprecated', 'orchestrator.js')), 'mcp-hive/deprecated/');

console.log('\n4. Live parallel probe (real opencode processes)…');
const result = await new Promise((res) => {
  const child = spawn('node', [join(HIVE_DIR, 'dispatch.mjs')], { cwd: HIVE_DIR, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '', err = '';
  child.stdout.on('data', (d) => (out += d));
  child.stderr.on('data', (d) => (err += d));
  child.on('close', (c) => res({ c, out, err }));
});
check('dispatcher ran without crash', result.c === 0, `exit ${result.c}`);
check('dispatcher printed progress', /READINESS/.test(result.out), (result.err.split('\n')[0] || 'no stderr'));

const rs = JSON.parse(readFileSync(join(HIVE_DIR, 'output', 'readiness.json'), 'utf8'));
check(`all agents acked (${rs.ok}/${rs.total})`, rs.ok === rs.total, `wall ${rs.wall_ms}ms`);
check('readiness flag true', rs.ready === true);
check('agents served by PRIMARY model (not silent fallback)', rs.primary_ok === rs.total, `${rs.primary_ok}/${rs.total} on primary`);
check('no agent fell back to default', !rs.results.some((r) => r.model === 'default'));

const serial = rs.results.reduce((s, r) => s + (r.ms || 0), 0);
const speedup = serial / rs.wall_ms;
check('actually parallel (speedup > 2x)', speedup > 2, `${speedup.toFixed(1)}x (${serial}ms serial → ${rs.wall_ms}ms wall)`);

console.log(`\n=== RESULT: ${pass} pass / ${fail} fail ===\n`);
process.exit(fail ? 1 : 0);
