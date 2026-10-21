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

/**
 * Resolve a model id to a full CLI id.
 * Bare ids get the opencode/ prefix ("space-bunny-free" -> "opencode/space-bunny-free").
 * Ids that ALREADY carry a provider prefix are left alone, so a LOCAL backend
 * can be mixed in: "ollama/qwen2.5:3b" -> "ollama/qwen2.5:3b" (opencode's built-in
 * ollama provider talks to the local server on 127.0.0.1:11434).
 * Before this, a local model could not be named at all — the prefix was forced.
 */
export function withModelPrefix(id) {
  const s = String(id || '').trim();
  if (!s) return '';
  return s.includes('/') ? s : MODEL_PREFIX + s;
}

/** Resolve an agent's primary + fallback model ids to full CLI ids. */
export function modelsForAgent(agent) {
  const primary = withModelPrefix(agent.model);
  const fallback = agent.fallback ? withModelPrefix(agent.fallback) : 'default';
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
