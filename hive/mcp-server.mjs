#!/usr/bin/env node
/**
 * Nexus MCP Hive — a REAL Model Context Protocol server (stdio transport).
 *
 * Speaks JSON-RPC 2.0, newline-delimited, per the MCP spec.
 * Exposes the free-OpenCode-model agent swarm as tools any MCP client can call.
 *
 * THIS IS NOT A SIMULATION. Every tool call forks real `opencode run`
 * processes against verified-free models ($0.00 input, $0.00 output).
 *
 * Register with:  opencode mcp add hive -- node hive/mcp-server.mjs
 */
import { runModel, } from './dispatch.mjs';
import { loadHive, freeModelIds, modelsForAgent, MODEL_PREFIX } from './models.mjs';

const HIVE = loadHive();
const OUT_STDIO = process.stdout;

let logFile = null;
function log(msg) {
  // Diagnostics go to stderr — stdout is reserved for JSON-RPC.
  process.stderr.write(`[MCP-HIVE] ${msg}\n`);
}

function send(obj) {
  OUT_STDIO.write(JSON.stringify(obj) + '\n');
}

function result(id, payload) {
  send({ jsonrpc: '2.0', id, result: payload });
}

function rpcError(id, code, message, data) {
  send({ jsonrpc: '2.0', id, error: { code, message, ...(data ? { data } : {}) } });
}

function toolText(payload) {
  const p = typeof payload === 'string' ? payload : { status: 'done', ...payload };
  const text = typeof p === 'string' ? p : JSON.stringify(p, null, 2);
  return { content: [{ type: 'text', text }], isError: false };
}

function toolErr(payload) {
  const p = typeof payload === 'string' ? payload : { status: 'failed', ...payload };
  const text = typeof p === 'string' ? p : JSON.stringify(p, null, 2);
  return { content: [{ type: 'text', text }], isError: true };
}

/* ── bounded parallelism ─────────────────────────────────────────────────── */
async function mapPool(items, limit, fn) {
  const results = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return results;
}

function withTimeout(promise, ms, reason) {
  return new Promise((resolvePromise, reject) => {
    const timer = setTimeout(() => reject(new Error(reason || 'timeout')), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolvePromise(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

function resolveJobTimeout(jobTimeoutMs, agent) {
  return {
    agent: agent?.id || 'unknown',
    name: agent?.name || 'unknown',
    ok: false,
    status: 'timeout',
    model: null,
    requested: null,
    attempts: [],
    error: `job timed out after ${jobTimeoutMs}ms`,
    reason: 'timeout',
  };
}

async function dispatchAgent(agent, prompt, timeoutMs, perJobTimeoutMs) {
  const jobTimeout = perJobTimeoutMs || timeoutMs * 4;
  const jobPromise = (async () => {
    const { primary, fallback } = modelsForAgent(agent);
    const chain = [...new Set([primary, fallback, 'default'])];
    const attempts = [];
    for (const model of chain) {
      const r = await runModel(model, prompt, timeoutMs);
      attempts.push({ model, ok: r.ok, ms: r.ms, error: r.error });
      if (r.ok) {
        return { agent: agent.id, name: agent.name, ok: true, status: 'done', model: r.model, requested: primary, degraded: r.model !== primary, ms: r.ms, output: r.output, attempts };
      }
      if (r.error && /permission|ask|reject/i.test(r.error)) {
        return { agent: agent.id, name: agent.name, ok: false, status: 'failed', model: r.model, requested: primary, attempts, error: `permission rejected: ${r.error}`, reason: 'permission_rejection' };
      }
    }
    const lastAttempt = attempts[attempts.length - 1];
    return { agent: agent.id, name: agent.name, ok: false, status: 'failed', model: null, requested: primary, attempts, error: lastAttempt?.error || 'all models failed', reason: lastAttempt?.error ? lastAttempt.error : 'all_models_failed' };
  })();
  try {
    return await withTimeout(jobPromise, jobTimeout, `job timed out after ${jobTimeout}ms`);
  } catch (e) {
    return resolveJobTimeout(jobTimeout, agent);
  }
}

/* ── tool implementations ────────────────────────────────────────────────── */
const TOOLS = [
  {
    name: 'hive_status',
    description:
      'List the Nexus Hive roster: every free OpenCode model verified available, every agent with its assigned model, role and workstreams. Use before dispatching to see who can take work.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    async run() {
      return toolText({
        hive: HIVE.name,
        version: HIVE.version,
        verified: HIVE.verified,
        free_models: freeModelIds(HIVE).map((id) => MODEL_PREFIX + id),
        agents: HIVE.agents.map((a) => ({
          id: a.id,
          name: a.name,
          role: a.role,
          model: MODEL_PREFIX + a.model,
          fallback: a.fallback ? MODEL_PREFIX + a.fallback : 'default',
          free: true,
          cost_usd: 0,
          workstreams: a.workstreams,
        })),
        parallelism: HIVE.dispatch.parallelism,
      });
    },
  },
  {
    name: 'hive_models',
    description: 'List every verified FREE OpenCode model id (all $0.00 in/out) that the hive can run.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    async run() {
      return toolText({ prefix: MODEL_PREFIX, count: freeModelIds(HIVE).length, models: freeModelIds(HIVE) });
    },
  },
  {
    name: 'hive_readiness',
    description:
      'Probe EVERY agent in parallel and confirm each one really answers on its assigned free model. Returns per-agent latency and whether the primary model or a fallback served it.',
    inputSchema: {
      type: 'object',
      properties: {
        timeout_ms: { type: 'number', description: 'Per-agent timeout in ms (default 180000).', default: 180000 },
      },
      additionalProperties: false,
    },
    async run(args) {
      const timeout = args.timeout_ms || HIVE.dispatch.probe_timeout_ms;
      const t0 = Date.now();
      const results = await mapPool(HIVE.agents, HIVE.dispatch.parallelism, (a) =>
        dispatchAgent(a, `Reply with exactly one line and nothing else: "${a.name} READY · scope: ${a.workstreams.join(', ')}".`, timeout, timeout * 4)
      );
      const wall = Date.now() - t0;
      const ok = results.filter((r) => r.ok).length;
      const primary = results.filter((r) => r.ok && !r.degraded).length;
      return toolText({ status: ok === results.length ? 'done' : 'failed', total: results.length, acked: ok, on_primary_model: primary, wall_ms: wall, ready: ok === results.length, results: results.map((r) => ({ agent: r.agent, ok: r.ok, model: r.model, degraded: r.degraded || false, ms: r.ms, ack: (r.output || '').split('\n')[0] })) });
    },
  },
  {
    name: 'hive_dispatch',
    description:
      'Send ONE prompt to MULTIPLE agents simultaneously and collect all outputs. This is the parallel-speedup primitive: N agents work the same problem at once.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'The task/prompt every selected agent receives.' },
        agents: { type: 'array', items: { type: 'string' }, description: 'Agent ids to target. Omit or empty = ALL agents.' },
        timeout_ms: { type: 'number', description: 'Per-agent timeout (default 300000).', default: 300000 },
      },
      required: ['prompt'],
      additionalProperties: false,
    },
    async run(args) {
      const ids = Array.isArray(args.agents) && args.agents.length ? args.agents : HIVE.agents.map((a) => a.id);
      const targets = HIVE.agents.filter((a) => ids.includes(a.id));
      if (!targets.length) return toolErr({ error: 'no matching agents', known: HIVE.agents.map((a) => a.id) });
      const timeout = args.timeout_ms || HIVE.dispatch.timeout_per_task_ms;
      const t0 = Date.now();
      const results = await mapPool(targets, HIVE.dispatch.parallelism, (a) => dispatchAgent(a, args.prompt, timeout, timeout * 4));
      const wall = Date.now() - t0;
      return toolText({ status: 'done', total: results.length, ok: results.filter((r) => r.ok).length, wall_ms: wall, results });
    },
  },
  {
    name: 'hive_fanout',
    description:
      'Give EACH agent a DIFFERENT task and run them all at the same time. Highest-throughput tool: pass an array of {agent, prompt} jobs and they execute in parallel with independent fallback chains.',
    inputSchema: {
      type: 'object',
      properties: {
        jobs: {
          type: 'array',
          description: 'Array of jobs, each with an agent id and its own prompt.',
          items: {
            type: 'object',
            properties: { agent: { type: 'string' }, prompt: { type: 'string' } },
            required: ['agent', 'prompt'],
            additionalProperties: false,
          },
        },
        timeout_ms: { type: 'number', description: 'Per-job timeout (default 300000).', default: 300000 },
      },
      required: ['jobs'],
      additionalProperties: false,
    },
    async run(args) {
      const jobs = Array.isArray(args.jobs) ? args.jobs : [];
      if (!jobs.length) return toolErr({ error: 'jobs must be a non-empty array' });
      const unknown = jobs.filter((j) => !HIVE.agents.some((a) => a.id === j.agent)).map((j) => j.agent);
      if (unknown.length) return toolErr({ error: 'unknown agent ids', unknown, known: HIVE.agents.map((a) => a.id) });
      const timeout = args.timeout_ms || HIVE.dispatch.timeout_per_task_ms;
      const t0 = Date.now();
      const results = await mapPool(jobs, HIVE.dispatch.parallelism, (j) =>
        dispatchAgent(HIVE.agents.find((a) => a.id === j.agent), j.prompt, timeout, timeout * 4)
      );
      const wall = Date.now() - t0;
      return toolText({ status: 'done', total: results.length, ok: results.filter((r) => r.ok).length, wall_ms: wall, results });
    },
  },
  {
    name: 'hive_run',
    description: 'Run a single prompt on ONE specific free model. Use when you already know which model you want.',
    inputSchema: {
      type: 'object',
      properties: {
        model: { type: 'string', description: `Free model id, e.g. "space-bunny-free". Prefix optional.` },
        prompt: { type: 'string' },
        timeout_ms: { type: 'number', default: 300000 },
      },
      required: ['model', 'prompt'],
      additionalProperties: false,
    },
    async run(args) {
      const id = args.model.startsWith(MODEL_PREFIX) ? args.model.slice(MODEL_PREFIX.length) : args.model;
      if (!freeModelIds(HIVE).includes(id)) return toolErr({ error: 'not a verified free model', model: id, available: freeModelIds(HIVE) });
      const jobTimeout = args.timeout_ms || HIVE.dispatch.timeout_per_task_ms;
      const r = await withTimeout(runModel(MODEL_PREFIX + id, args.prompt, jobTimeout), jobTimeout * 2, `hive_run timed out after ${jobTimeout}ms`).catch((e) => ({ ok: false, model: id, error: e.message, output: '', ms: jobTimeout * 2, status: 'timeout', reason: 'timeout' }));
      if (!r.status) r.status = r.ok ? 'done' : 'failed';
      if (!r.reason && !r.ok) r.reason = r.error;
      return toolText(r);
    },
  },
];

/* ── JSON-RPC / MCP lifecycle ────────────────────────────────────────────── */
const SUPPORTED_PROTOCOLS = ['2025-06-18', '2025-03-26', '2024-11-05'];

async function handle(msg) {
  const { id, method, params } = msg;
  const isNotification = id === undefined || id === null;

  switch (method) {
    case 'initialize': {
      const requested = params?.protocolVersion;
      result(id, {
        protocolVersion: SUPPORTED_PROTOCOLS.includes(requested) ? requested : SUPPORTED_PROTOCOLS[0],
        capabilities: { tools: { listChanged: false }, logging: {} },
        serverInfo: { name: 'nexus-hive', version: HIVE.version },
        instructions:
          'Nexus Hive runs a parallel swarm of free OpenCode agents ($0.00). Use hive_status to see the roster, hive_fanout to give each agent a different task at once, hive_dispatch to send one prompt to many agents, hive_readiness to prove all agents answer.',
      });
      return;
    }
    case 'notifications/initialized':
    case 'notifications/cancelled':
      return;
    case 'ping':
      result(id, {});
      return;
    case 'tools/list':
      result(id, {
        tools: TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
      });
      return;
    case 'tools/call': {
      const tool = TOOLS.find((t) => t.name === params?.name);
      if (!tool) return rpcError(id, -32602, `Unknown tool: ${params?.name}`);
      try {
        const out = await tool.run(params?.arguments || {});
        result(id, out);
      } catch (e) {
        result(id, toolErr({ error: e.message, stack: String(e.stack || '').split('\n').slice(0, 4), status: 'failed' }));
      }
      return;
    }
    case 'resources/list':
      result(id, { resources: [] });
      return;
    case 'prompts/list':
      result(id, { prompts: [] });
      return;
    default:
      if (!isNotification) rpcError(id, -32601, `Method not found: ${method}`);
  }
}

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  let nl;
  while ((nl = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, nl).trim();
    buffer = buffer.slice(nl + 1);
    if (!line) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
      continue;
    }
    handle(msg).catch((e) => {
      if (msg.id !== undefined && msg.id !== null) rpcError(msg.id, -32603, e.message);
    });
  }
});
process.stdin.on('end', () => process.exit(0));

log(`ready — ${HIVE.agents.length} agents, ${freeModelIds(HIVE).length} free models, parallelism=${HIVE.dispatch.parallelism}`);
