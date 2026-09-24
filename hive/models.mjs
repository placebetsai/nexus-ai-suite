/**
 * Canonical model registry for the Nexus MCP Hive.
 *
 * SOURCE OF TRUTH: the ids below were verified on 2026-09-24 by running
 * `opencode run --model opencode/<id>` for every model — 8/8 returned a
 * clean ACK in parallel (70s wall clock).
 *
 * DO NOT reintroduce the `opencode-zen/` prefix: it returns
 * "Unexpected server error" and silently forced 100% fallback to default.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const MODEL_PREFIX = 'opencode/';

export function loadHive() {
  return JSON.parse(readFileSync(join(__dirname, 'hive.json'), 'utf8'));
}

/** Every free model id (exact, as returned by opencode.models). */
export function freeModelIds(hive = loadHive()) {
  return hive.free_models.map((m) => m.id);
}

/** Resolve an agent's primary + fallback model ids to full CLI ids. */
export function modelsForAgent(agent) {
  const primary = MODEL_PREFIX + agent.model;
  const fallback = agent.fallback ? MODEL_PREFIX + agent.fallback : 'default';
  return { primary, fallback };
}

const ANSI = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

/** Strip ANSI colour codes and the `> build · model` banner opencode prints. */
export function cleanOutput(raw) {
  return String(raw)
    .replace(ANSI, '')
    .split('\n')
    .filter((l) => !/^\s*>\s*(build|model)\s*·/.test(l))
    .join('\n')
    .trim();
}
