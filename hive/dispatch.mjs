#!/usr/bin/env node
/**
 * CreateStuff Hive Dispatcher
 * Runs registered opencode agents in PARALLEL, each free model with
 * automatic fallback to the known-good default model.
 *
 * Usage:
 *   node hive/dispatch.mjs                     # status/readiness probe (all agents ack)
 *   node hive/dispatch.mjs "prompt here" --agents atlas,vogue
 *   node hive/dispatch.mjs "prompt here" --all
 *   node hive/dispatch.mjs "prompt here" --file task-batch.json   # [{agent, prompt}]
 */
import { spawn } from 'node:child_process';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const HIVE = JSON.parse(readFileSync(join(__dirname, 'hive.json'), 'utf8'));
const FALLBACK = 'default';
const OUT = join(__dirname, 'output');
mkdirSync(OUT, { recursive: true });

function log(msg) {
  console.log(`[HIVE] ${msg}`);
}

function runAgent(model, prompt, timeoutMs) {
  return new Promise((resolve) => {
    // Fallback uses the authenticated default provider (no --model), which is
    // the only guaranteed-free execution path on this box. Forcing a model id
    // routes through the zen gateway and needs OPENCODE_API_KEY.
    const args = model === 'default' ? ['run', prompt] : ['run', '--model', model, prompt];
    const child = spawn('opencode', args, {
      cwd: ROOT,
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    let err = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve({ ok: false, model, error: 'timeout', output: out });
    }, timeoutMs);
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        resolve({ ok: false, model, error: `exit ${code}: ${err.slice(-200)}`, output: out });
      } else {
        resolve({ ok: true, model, output: out.slice(-2000) });
      }
    });
  });
}

async function dispatchOne(agent, prompt, timeoutMs) {
  const primary = `opencode-zen/${agent.model}`;
  log(`→ ${agent.name} (${primary})`);
  const first = await runAgent(primary, prompt, timeoutMs);
  if (first.ok) {
    log(`✓ ${agent.name} done via ${primary}`);
    return { agent: agent.id, ok: true, model: primary, output: first.output };
  }
  log(`  ${agent.name} failed on ${primary}: ${first.error} → falling back to default free model`);
  const second = await runAgent('default', prompt, timeoutMs);
  if (second.ok) {
    log(`✓ ${agent.name} done via default free model (fallback)`);
    return { agent: agent.id, ok: true, model: 'default', fallback: true, output: second.output };
  }
  log(`✗ ${agent.name} failed on fallback too`);
  return { agent: agent.id, ok: false, error: second.error };
}

function parseArgs(argv) {
  const args = { prompt: '', agents: [], all: false, file: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--all') args.all = true;
    else if (a === '--agents') args.agents = argv[++i].split(',');
    else if (a === '--file') args.file = argv[++i];
    else args.prompt = a;
  }
  return args;
}

async function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);

  if (args.file) {
    const batch = JSON.parse(readFileSync(args.file, 'utf8'));
    const items = batch.map((t) => ({ agent: HIVE.agents.find((a) => a.id === t.agent), prompt: t.prompt }));
    const results = await Promise.all(
      items.map((it) => dispatchOne(it.agent, it.prompt, HIVE.dispatch.timeout_per_task_ms))
    );
    writeFileSync(join(OUT, 'batch-result.json'), JSON.stringify({ ts: Date.now(), results }, null, 2));
    console.log('\n' + JSON.stringify({ ts: Date.now(), results }, null, 2));
    return;
  }

  if (!args.prompt) {
    // Readiness probe: prompt omitted → each agent just acknowledges and reports its assignment.
    const probes = HIVE.agents.map((a) => ({
      agent: a,
      prompt:
        `You are hive agent "${a.name}" — ${a.role}. ` +
        `Respond with exactly one line: "<name> READY · streaming to workspace · scope: <workstreams>". Nothing else.`,
    }));
    log(`Probing ${probes.length} agents in parallel (timeout ${HIVE.dispatch.timeout_per_task_ms}ms each)`);
    const t0 = Date.now();
    const results = await Promise.all(
      probes.map((p) => dispatchOne(p.agent, p.prompt, 90000))
    );
    const wall = Date.now() - t0;
    const ok = results.filter((r) => r.ok).length;
    const status = { ts: new Date().toISOString(), wall_ms: wall, total: results.length, ok, ready: ok === results.length, results };
    writeFileSync(join(OUT, 'readiness.json'), JSON.stringify(status, null, 2));
    console.log(`\n=== HIVE READINESS: ${ok}/${results.length} agents ack in ${wall}ms => ${status.ready ? 'READY' : 'NOT READY'} ===`);
    console.log(JSON.stringify(results.map((r) => ({ agent: r.agent, ok: r.ok, model: r.model, fallback: r.fallback || false })), null, 2));
    return;
  }

  if (args.prompt) {
    let targets = args.all ? HIVE.agents : HIVE.agents.filter((a) => args.agents.includes(a.id));
    if (!args.all && args.agents.length === 0) {
      log('No agents selected. Use --all or --agents atlas,vogue,...');
      process.exit(1);
    }
    log(`Dispatching ${targets.length} agent(s) in parallel: ${targets.map((t) => t.name).join(', ')}`);
    const t0 = Date.now();
    const results = await Promise.all(
      targets.map((a) => dispatchOne(a, args.prompt, HIVE.dispatch.timeout_per_task_ms))
    );
    const wall = Date.now() - t0;
    writeFileSync(join(OUT, 'dispatch-result.json'), JSON.stringify({ ts: Date.now(), prompt: args.prompt, wall_ms: wall, results }, null, 2));
    console.log(`\n=== ${results.filter((r) => r.ok).length}/${results.length} agents completed in ${wall}ms ===`);
    console.log(JSON.stringify(results.map((r) => ({ agent: r.agent, ok: r.ok, model: r.model, fallback: r.fallback || false })), null, 2));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});