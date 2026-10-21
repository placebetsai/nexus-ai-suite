#!/usr/bin/env node
/**
 * local-pool.mjs — a runnable, bounded agent pool for THIS laptop.
 *
 * Why it exists (measured 2026-10-21): the Nexus MCP hive's readiness probe
 * acked only 3/10 agents in a 442s wall because it fanned out at
 * dispatch.parallelism = 10, while the board's own RCA (2026-10-06) says
 * parallelism must stay <= 3 (the free cloud tiers 403/429/hang under load).
 * The MCP server also caches hive.json at module load, so config edits only
 * apply after it restarts. This runner re-reads the roster on every invocation
 * and takes its own concurrency limit, so it works RIGHT NOW.
 *
 * Chain per agent: primary model → its fallback → LOCAL backends
 * (hive.json local_fallbacks, e.g. ollama/qwen2.5:3b — rate-limit immune) →
 * 'default'. 'default' is last because it inherits the orchestrator model,
 * which the RCA says background agents must never use.
 *
 * Usage:
 *   node hive/local-pool.mjs --jobs jobs.json [--parallel 3] [--timeout 150000]
 *   node hive/local-pool.mjs --prompt "text" --agents atlas,nexus,mnemonic
 *
 * jobs.json = [{ "agent": "atlas", "prompt": "..." }]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runModel } from './dispatch.mjs';
import { loadHive, modelsForAgent, withModelPrefix } from './models.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, 'output');
mkdirSync(OUT, { recursive: true });

function arg(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  if (i === -1) return dflt;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}

const HIVE = loadHive(); // fresh on every run — no stale module cache
const PARALLEL = Math.max(1, Math.min(8, Number(arg('parallel', HIVE.dispatch?.parallelism ?? 3)) || 3));
const TIMEOUT = Number(arg('timeout', HIVE.dispatch?.timeout_per_task_ms ?? 150000)) || 150000;
const LOCAL = (HIVE.local_fallbacks || []).map(withModelPrefix).filter(Boolean);

async function dispatchOne(agent, prompt) {
  if (!agent) return { ok: false, error: 'unknown agent', output: '' };
  const { primary, fallback } = modelsForAgent(agent);
  const chain = [...new Set([primary, fallback, ...LOCAL, 'default'])];
  const attempts = [];
  for (const model of chain) {
    const r = await runModel(model, prompt, TIMEOUT);
    attempts.push({ model, ok: r.ok, ms: r.ms, error: r.error });
    if (r.ok) {
      return {
        agent: agent.id,
        name: agent.name,
        ok: true,
        model: r.model,
        requested: primary,
        degraded: r.model !== primary,
        local: LOCAL.includes(r.model),
        ms: r.ms,
        output: r.output,
        attempts,
      };
    }
  }
  return { agent: agent.id, name: agent?.name, ok: false, model: null, attempts, error: 'all models failed' };
}

/** Bounded concurrency — a hard cap, so a fan-out can't fork-bomb the box. */
async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return out;
}

const jobsFile = arg('jobs', null);
let jobs = [];
if (jobsFile) {
  jobs = JSON.parse(readFileSync(jobsFile, 'utf8'));
} else {
  const prompt = arg('prompt', '');
  const ids = String(arg('agents', '')).split(',').map((s) => s.trim()).filter(Boolean);
  const targets = ids.length ? HIVE.agents.filter((a) => ids.includes(a.id)) : HIVE.agents;
  jobs = targets.map((a) => ({ agent: a.id, prompt }));
}
if (!jobs.length) {
  console.error('no jobs — pass --jobs jobs.json or --prompt "text" [--agents a,b,c]');
  process.exit(2);
}

const byId = Object.fromEntries(HIVE.agents.map((a) => [a.id, a]));
const t0 = Date.now();
console.error(`[pool] ${jobs.length} jobs, parallelism ${PARALLEL}, timeout ${TIMEOUT}ms, local fallbacks: ${LOCAL.join(', ') || 'none'}`);
const results = await pool(jobs, PARALLEL, (j) => dispatchOne(byId[j.agent], j.prompt));

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const file = join(OUT, `pool-${stamp}.json`);
writeFileSync(file, JSON.stringify({ startedAt: new Date(t0).toISOString(), wall_ms: Date.now() - t0, parallel: PARALLEL, results }, null, 1));
writeFileSync(join(OUT, 'pool-latest.json'), JSON.stringify({ startedAt: new Date(t0).toISOString(), wall_ms: Date.now() - t0, parallel: PARALLEL, results }, null, 1));

const ok = results.filter((r) => r.ok);
console.error(`[pool] ${ok.length}/${results.length} ok in ${((Date.now() - t0) / 1000).toFixed(0)}s -> ${file}`);
for (const r of results) {
  console.error(`  ${r.ok ? 'OK  ' : 'FAIL'} ${r.agent}: model=${r.model || '-'} ${r.local ? '(local)' : ''} ${r.ms || 0}ms${r.error ? ' err=' + r.error : ''}`);
}
process.stdout.write(JSON.stringify({ wall_ms: Date.now() - t0, parallel: PARALLEL, results }, null, 1));
