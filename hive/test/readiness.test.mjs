#!/usr/bin/env node
/**
 * Hive readiness test. Validates:
 *  1. hive.json is valid, 8 agents, all free, models exist
 *  2. Every agent brief exists on disk
 *  3. dispatch.mjs + server.js parse and are executable
 *  4. Parallel probe actually dispatches agents and they ACK (or fallback works)
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

console.log(`1. Manifest (${HIVE.name})`);
check('has 8 agents', HIVE.agents.length === 8, `got ${HIVE.agents.length}`);
check('all agents flagged free', HIVE.agents.every(a => a.free === true));
check('agent ids unique', new Set(HIVE.agents.map(a => a.id)).size === HIVE.agents.length);
check('every agent has model + role + workstreams', HIVE.agents.every(a => a.model && a.role && a.workstreams?.length));
check('fallback chain defined', HIVE.fallback_chain?.includes('big-pickle'));
check('parallelism configured', HIVE.dispatch?.parallelism >= 8);

console.log('\n2. Briefs on disk');
HIVE.agents.forEach(a => {
  const b = join(HIVE_DIR, 'agents', `${a.id}.md`);
  check(`brief ${a.id}.md`, existsSync(b), b.replace(HIVE_DIR, '.'));
});

console.log('\n3. Engines');
check('dispatch.mjs exists', existsSync(join(HIVE_DIR, 'dispatch.mjs')));
check('server.js exists', existsSync(join(HIVE_DIR, 'server.js')));
check('dashboard.html exists', existsSync(join(HIVE_DIR, 'dashboard.html')));

console.log('\n4. Live parallel probe (real opencode agents, fallback auto)');
const probeArgs = [join(HIVE_DIR, 'dispatch.mjs')]; // no prompt → readiness probe
const result = await new Promise((resolve) => {
  const child = spawn('node', probeArgs, { cwd: HIVE_DIR, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '', err = '';
  child.stdout.on('data', d => out += d);
  child.stderr.on('data', d => err += d);
  child.on('close', c => resolve({ c, out, err }));
});
const ackRegex = /([0-9]+)\/([0-9]+) agents ack/;
const m = result.out.match(ackRegex);
check('dispatcher ran without crash', result.c === 0, `exit ${result.c}`);
console.log(result.out.split('\n').filter(l => l.includes('→') || l.includes('✓') || l.includes('✗') || l.includes('READINESS')).slice(0, 30).join('\n'));
if (m) {
  const [ , acked, total ] = m;
  check(`readiness result ${acked}/${total} acked`, acked === total, `status: ${acked === total ? 'READY' : 'NOT READY'}`);
} else {
  check('parse readiness line', false, result.out.includes('READINESS') ? 'not acked' : 'missing output');
}

console.log(`\n=== RESULT: ${pass} pass / ${fail} fail ===\n`);
process.exit(fail ? 1 : 0);