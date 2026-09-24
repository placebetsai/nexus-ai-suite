#!/usr/bin/env node
/**
 * Nexus Hive Dispatcher — parallel execution across ALL free OpenCode models.
 *
 * v3.0 (2026-09-24)
 *   FIXED: model ids now use the `opencode/` prefix (the old `opencode-zen/`
 *          prefix errored on every call, so all agents silently fell back to
 *          the default model and "parallelism" was an illusion of 1 model).
 *   ADDED: real per-model fallback chains, concurrency cap, honest reporting
 *          of which model actually served each task.
 *
 * Usage:
 *   node hive/dispatch.mjs                          # readiness probe (all agents)
 *   node hive/dispatch.mjs "prompt" --all           # same prompt to every agent
 *   node hive/dispatch.mjs "prompt" --agents atlas,vogue
 *   node hive/dispatch.mjs --file batch.json        # [{agent, prompt}] fan-out
 *   node hive/dispatch.mjs --models                 # list verified free models
 */
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync, realpathSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadHive, freeModelIds, modelsForAgent, cleanOutput } from './models.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const HIVE = loadHive();
const OUT = join(__dirname, 'output');
mkdirSync(OUT, { recursive: true });

const log = (m) => console.error(`[HIVE] ${m}`);

/** Run one opencode call. Resolves with {ok, model, output, ms, error}. */
export function runModel(fullModelId, prompt, timeoutMs, cwd = ROOT) {
  return new Promise((resolvePromise) => {
    const args = fullModelId === 'default' ? ['run', prompt] : ['run', '--model', fullModelId, prompt];
    const t0 = Date.now();
    const child = spawn('opencode', args, {
      cwd,
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    let err = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolvePromise({ ok: false, model: fullModelId, error: 'timeout', output: cleanOutput(out), ms: Date.now() - t0 });
    }, timeoutMs);
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('error', (e) => {
      clearTimeout(timer);
      resolvePromise({ ok: false, model: fullModelId, error: `spawn: ${e.message}`, output: '', ms: Date.now() - t0 });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      const ms = Date.now() - t0;
      const cleaned = cleanOutput(out);
      if (code !== 0 || /Unexpected server error|err_[a-z0-9]+/.test(cleaned)) {
        resolvePromise({
          ok: false,
          model: fullModelId,
          error: code !== 0 ? `exit ${code}: ${cleanOutput(err).slice(-300)}` : 'gateway error',
          output: cleaned,
          ms,
        });
      } else {
        resolvePromise({ ok: true, model: fullModelId, output: cleaned, ms });
      }
    });
  });
}

/** Dispatch one agent: primary model → fallback → default. Always reports the truth. */
async function dispatchOne(agent, prompt, timeoutMs) {
  const { primary, fallback } = modelsForAgent(agent);
  const chain = [...new Set([primary, fallback, 'default'])];
  const attempts = [];
  for (const model of chain) {
    const r = await runModel(model, prompt, timeoutMs);
    attempts.push({ model, ok: r.ok, ms: r.ms, error: r.error });
    if (r.ok) {
      return {
        agent: agent.id,
        name: agent.name,
        ok: true,
        model: r.model,
        requested: primary,
        degraded: r.model !== primary,
        ms: r.ms,
        output: r.output,
        attempts,
      };
    }
    log(`${agent.name} failed on ${model} (${r.error}) → next in chain`);
  }
  return { agent: agent.id, name: agent.name, ok: false, model: null, requested: primary, attempts, error: 'all models failed' };
}

/** Bounded concurrency so we don't fork-bomb the box. */
async function mapPool(items, limit, fn) {
  const results = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return results;
}

function parseArgs(argv) {
  const args = { prompt: '', agents: [], all: false, file: null, models: false, limit: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--all') args.all = true;
    else if (a === '--models') args.models = true;
    else if (a === '--agents') args.agents = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--file') args.file = argv[++i];
    else if (a === '--limit') args.limit = parseInt(argv[++i], 10);
    else args.prompt = a;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.models) {
    console.log(JSON.stringify({ prefix: 'opencode/', free_models: freeModelIds(HIVE) }, null, 2));
    return;
  }

  const limit = args.limit || HIVE.dispatch.parallelism;
  const timeout = HIVE.dispatch.timeout_per_task_ms;

  // ── FAN-OUT: [{agent, prompt}] each agent gets its own task ──────────────
  if (args.file) {
    const batch = JSON.parse(readFileSync(args.file, 'utf8'));
    const items = batch.map((t) => ({
      agent: HIVE.agents.find((a) => a.id === t.agent),
      prompt: t.prompt,
    })).filter((x) => x.agent);
    log(`Fanning ${items.length} tasks across ${new Set(items.map((i) => i.agent.id)).size} agents (pool=${limit})`);
    const t0 = Date.now();
    const results = await mapPool(items, limit, (it) => dispatchOne(it.agent, it.prompt, timeout));
    const wall = Date.now() - t0;
    const ok = results.filter((r) => r.ok).length;
    const payload = { ts: Date.now(), wall_ms: wall, total: results.length, ok, results };
    writeFileSync(join(OUT, 'batch-result.json'), JSON.stringify(payload, null, 2));
    console.log(`\n=== FAN-OUT: ${ok}/${results.length} ok in ${wall}ms ===`);
    console.log(JSON.stringify(results.map((r) => ({ agent: r.agent, ok: r.ok, model: r.model, degraded: r.degraded, ms: r.ms })), null, 2));
    return;
  }

  // ── READINESS PROBE ──────────────────────────────────────────────────────
  if (!args.prompt) {
    const probes = HIVE.agents.map((a) => ({
      agent: a,
      prompt:
        `You are hive agent "${a.name}" — ${a.role}. ` +
        `Reply with exactly one line and nothing else: "${a.name} READY · scope: ${a.workstreams.join(', ')}".`,
    }));
    log(`Probing ${probes.length} agents in parallel (pool=${limit}, timeout ${timeout}ms)`);
    const t0 = Date.now();
    const results = await mapPool(probes, limit, (p) => dispatchOne(p.agent, p.prompt, HIVE.dispatch.probe_timeout_ms));
    const wall = Date.now() - t0;
    const ok = results.filter((r) => r.ok).length;
    const primaryOnly = results.filter((r) => r.ok && !r.degraded).length;
    const status = { ts: new Date().toISOString(), wall_ms: wall, total: results.length, ok, primary_ok: primaryOnly, ready: ok === results.length, results };
    writeFileSync(join(OUT, 'readiness.json'), JSON.stringify(status, null, 2));
    console.log(`\n=== HIVE READINESS: ${ok}/${results.length} acked · ${primaryOnly} on primary model · ${wall}ms => ${status.ready ? 'READY' : 'NOT READY'} ===`);
    console.log(JSON.stringify(results.map((r) => ({ agent: r.agent, name: r.name, ok: r.ok, model: r.model, degraded: r.degraded || false, ms: r.ms, first_line: (r.output || '').split('\n')[0] })), null, 2));
    return;
  }

  // ── ONE PROMPT → MANY AGENTS ────────────────────────────────────────────
  let targets = args.all ? HIVE.agents : HIVE.agents.filter((a) => args.agents.includes(a.id));
  if (!args.all && args.agents.length === 0) {
    log('No agents selected. Use --all or --agents atlas,vogue');
    process.exit(1);
  }
  log(`Dispatching ${targets.length} agent(s) in parallel: ${targets.map((t) => t.name).join(', ')}`);
  const t0 = Date.now();
  const results = await mapPool(targets, limit, (a) => dispatchOne(a, args.prompt, timeout));
  const wall = Date.now() - t0;
  const ok = results.filter((r) => r.ok).length;
  writeFileSync(join(OUT, 'dispatch-result.json'), JSON.stringify({ ts: Date.now(), prompt: args.prompt, wall_ms: wall, results }, null, 2));
  console.log(`\n=== ${ok}/${results.length} agents completed in ${wall}ms ===`);
  console.log(JSON.stringify(results.map((r) => ({ agent: r.agent, ok: r.ok, model: r.model, degraded: r.degraded || false, ms: r.ms })), null, 2));
}

// argv[1] may be relative (e.g. "hive/dispatch.mjs"), so resolve before comparing.
const invokedPath = process.argv[1] ? pathToFileURL(realpathSync(process.argv[1])).href : '';
if (import.meta.url === invokedPath) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
