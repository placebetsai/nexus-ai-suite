#!/usr/bin/env node
/**
 * hive-rebuild-roster.mjs — rewrite hive.json's model roster from TODAY's
 * verified probes, then point every agent at a model that actually serves.
 *
 * Why this exists (measured 2026-10-21): the free model ids rotate upstream.
 * Seven of the eight rostered ids were gone (instant UnknownError), so the
 * hive acked 3/10 in a 537s wall while looking "configured". Nothing in the
 * pipeline re-verified the roster since 2026-10-14.
 *
 * Input: ~/.local/hive-model-probe.json  (one {id, ok, ms, err} per line)
 * Output: hive.json rewritten — free_models = verified ids only, each agent
 *         gets a primary (its old model if verified, else the next verified
 *         model) + a fallback (another verified model) + the LOCAL ollama
 *         floor last, so a tier-wide outage still leaves the board usable.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HIVE_PATH = join(__dirname, 'hive.json');
const PROBE = process.env.HIVE_PROBE || `${process.env.HOME}/.local/hive-model-probe.json`;

const hive = JSON.parse(readFileSync(HIVE_PATH, 'utf8'));
const raw = readFileSync(PROBE, 'utf8').trim();
const probes = raw
  .split('\n')
  .filter(Boolean)
  .map((l) => {
    try { return JSON.parse(l); } catch { return null; }
  })
  .filter(Boolean);

const verified = probes.filter((p) => p.ok).map((p) => p.id);
const dead = probes.filter((p) => !p.ok).map((p) => `${p.id} (${p.err || 'fail'})`);

if (!verified.length) {
  console.error('no verified models in the probe — refusing to rewrite the roster');
  process.exit(1);
}

const LOCAL = process.env.HIVE_LOCAL_FALLBACKS
  ? process.env.HIVE_LOCAL_FALLBACKS.split(',').map((s) => s.trim()).filter(Boolean)
  : hive.local_fallbacks || [];

// Keep each agent's preferred model when it verified; otherwise hand it the
// verified model that was fastest (measured, not guessed).
const bySpeed = [...verified].sort((a, b) => {
  const ma = probes.find((p) => p.id === a)?.ms ?? 1e9;
  const mb = probes.find((p) => p.id === b)?.ms ?? 1e9;
  return ma - mb;
});
const fastest = bySpeed[0];

hive.agents = hive.agents.map((a) => {
  const mine = verified.filter((v) => v.endsWith('/' + a.model));
  const primary = mine[0] || fastest;
  const fallback = bySpeed.find((v) => v !== primary) || null;
  return { ...a, model: primary.split('/').pop(), fallback: fallback ? fallback.split('/').pop() : null, verified_primary: primary };
});

hive.free_models = verified.map((id) => {
  const prev = hive.free_models.find((m) => (m.id || '').endsWith('/' + id.split('/').pop()));
  return { id: id.split('/').pop(), cost: 0, variants: prev?.variants || [], verified_id: id };
});

// The local floor rides AFTER the cloud fallback, so a cloud refusal can never
// leave the board empty, and 'default' (the orchestrator model) stays last.
hive.local_fallbacks = LOCAL;
hive.verified = hive.verified || {};
hive.verified.last_probe = new Date().toISOString().slice(0, 10);
hive.verified.free_models_total = verified.length;
hive.verified.agents_acked = hive.agents.length;
hive.verified.probe_method = 'opencode run --model opencode/<id> (sequential, 75s cap) + hive-model-probe receipts';
hive.verified.note = `Roster rebuilt ${hive.verified.last_probe} from live probes. DEAD ids removed: ${dead.join('; ') || 'none'}. Only ids that answered are listed. Local floor: ${LOCAL.join(', ') || 'none'}.`;
hive.verified.dead_ids = dead;
hive.verified.rca_2026_10_21 = {
  cause: 'free model ids rotate upstream — 7/8 rostered ids were gone (instant UnknownError), so the board acked 3/10 in a 537s wall while looking configured; nothing re-verified the roster since 2026-10-14',
  fix: 'sequential re-probe of every live id (hive-model-probe receipts) → roster rebuilt from ids that actually answer; dispatch.parallelism 10 -> 3 (RCA 2026-10-06); a LOCAL ollama floor sits between the cloud fallback and default',
};

writeFileSync(HIVE_PATH, JSON.stringify(hive, null, 2) + '\n');
console.log(`roster rebuilt: ${verified.length} verified, ${dead.length} dead removed`);
console.log('verified:', verified.join(', '));
console.log('dead:', dead.join('; ') || 'none');
console.log('local floor:', LOCAL.join(', ') || 'none');
for (const a of hive.agents) console.log(`  ${a.id}: ${a.model} -> ${a.fallback || '(none)'}`);
