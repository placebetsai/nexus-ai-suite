// Free-model catalog for CreateStuff builds.
//
// The goal: power every build with free models, in this order, falling through on
// any failure —
//   1. OpenCode Zen free models. The roster is DISCOVERED, not hard-coded:
//      https://opencode.ai/zen/v1/models is pulled and every id ending in
//      `-free` is kept, plus `big-pickle`. Measured 2026-10-02 that endpoint
//      listed 13 free ids; the chain had 3 of them hard-coded.
//   2. OpenRouter `:free` models, from https://openrouter.ai/api/v1/models.
//      Measured 2026-10-02: 16 free ids; two of them (qwen/qwen3.8-27b:free,
//      google/gemma-4-31b-it:free) answered "Provider returned error" and the
//      rest worked, so the order is retried, not trusted.
//   3. Cloudflare Workers AI, the last resort.
//
// The catalog is refreshed at most every 6 hours and cached in KV, with the
// last-known-good list used whenever a refresh fails — a provider outage must
// not empty the roster that is supposed to survive it.

export const CATALOG_TTL_S = 6 * 60 * 60;
const CATALOG_KEY = "freemodels:catalog:v1";

/** Zen: an id is free when it ends in `-free`, or when it is `big-pickle`. */
export function zenFreeIds(ids) {
  return [...new Set((ids || []).map((s) => String(s || "").trim()).filter((id) => id.endsWith("-free") || id === "big-pickle"))];
}

/** OpenRouter: an id is free when it ends in `:free`. */
export function openRouterFreeIds(ids) {
  return [...new Set((ids || []).map((s) => String(s || "").trim()).filter((id) => id.endsWith(":free")))];
}

/**
 * Order matters inside a provider: the coding-capable free models first, so the
 * common case (a code-writer build) lands on a model that can actually write a
 * page. Everything else follows in catalog order, which is stable.
 */
const ZEN_RANK = [
  "big-pickle",
  "space-bunny-free",
  "kimi-k3-free",
  "mimo-v2.6-flash-free",
  "mimo-v2.5-free",
  "deepseek-v4-flash-free",
  "nemotron-3.5-lightning-free",
  "nemotron-3-ultra-free",
  "jev-1.13-free",
  "fledge-alpha-free",
  "longcat-2.5-preview-free",
  "ling-3.0-flash-fin-free",
];
// Measured against the writer stage on 2026-10-02: north-mini-code:free planned a
// brief correctly, so code-shaped free models lead. The 2.6b general models are
// last on purpose — lfm-2.5-2.6b:free was the only one that answered inside the
// old 45s deadline and it returned prose, not a document.
const OPENROUTER_RANK = [
  "cohere/north-mini-code:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "poolside/laguna-s-2.1:free",
  "poolside/laguna-xs-2.1:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "qwen/qwen3.8-27b:free",
  "google/gemma-4-31b-it:free",
  "thinkingmachines/inkling:free",
  "inclusionai/ling-3.0-flash-sante:free",
  "nvidia/nemotron-3.5-lightning:free",
  "google/gemma-4-26b-a4b-it:free",
  "liquid/lfm-2.5-2.6b:free",
  "dots-studio/dots-3-note-preview:free",
  "thinkingmachines/inkling-small:free",
  "apodex/apodex-1.1-mini:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "nvidia/nemotron-3.5-content-safety:free",
];

const rank = (ids, preferred) => {
  const p = preferred.filter((id) => ids.includes(id));
  const rest = ids.filter((id) => !p.includes(id));
  return [...p, ...rest];
};

export const FALLBACK_ZEN_FREE = [
  "space-bunny-free",
  "mimo-v2.6-flash-free",
  "nemotron-3.5-lightning-free",
  "big-pickle",
];
export const FALLBACK_OPENROUTER_FREE = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "poolside/laguna-s-2.1:free",
];

const SHARED_HEADERS = { accept: "application/json", "user-agent": "CreateStuff/1.0 (+https://createstuff.ai)" };

async function fetchZenIds() {
  const r = await fetch("https://opencode.ai/zen/v1/models", { headers: SHARED_HEADERS, signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error("zen models HTTP " + r.status);
  const j = await r.json();
  const ids = (j?.data || []).map((m) => m?.id).filter(Boolean);
  if (!ids.length) throw new Error("zen models returned no ids");
  return ids;
}

async function fetchOpenRouterIds() {
  const r = await fetch("https://openrouter.ai/api/v1/models", { headers: SHARED_HEADERS, signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error("openrouter models HTTP " + r.status);
  const j = await r.json();
  const ids = (j?.data || []).map((m) => m?.id).filter(Boolean);
  if (!ids.length) throw new Error("openrouter models returned no ids");
  return ids;
}

/**
 * Returns { zen, openrouter, fetchedAt, stale }. Never throws: a failed refresh
 * keeps the previous list (or the compiled-in fallback) rather than emptying the
 * chain.
 */
export async function loadFreeModelCatalog(env, { force = false } = {}) {
  const kv = env?.KV;
  let cached = null;
  if (kv) {
    try {
      const raw = await kv.get(CATALOG_KEY);
      if (raw) cached = JSON.parse(raw);
    } catch {
      cached = null;
    }
  }
  const age = cached?.fetchedAt ? Date.now() - cached.fetchedAt : Infinity;
  if (!force && cached && age < CATALOG_TTL_S * 1000) return { ...cached, stale: false };

  const [zenAll, orAll] = await Promise.allSettled([fetchZenIds(), fetchOpenRouterIds()]);
  const zenIds = zenAll.status === "fulfilled" ? zenFreeIds(zenAll.value) : null;
  const orIds = orAll.status === "fulfilled" ? openRouterFreeIds(orAll.value) : null;

  const next = {
    zen: zenIds?.length ? rank(zenIds, ZEN_RANK) : cached?.zen?.length ? cached.zen : FALLBACK_ZEN_FREE,
    openrouter: orIds?.length ? rank(orIds, OPENROUTER_RANK) : cached?.openrouter?.length ? cached.openrouter : FALLBACK_OPENROUTER_FREE,
    fetchedAt: zenIds?.length || orIds?.length ? Date.now() : cached?.fetchedAt ?? 0,
  };
  next.stale = !(zenIds?.length && orIds?.length);
  if (kv && next.fetchedAt) {
    try {
      await kv.put(CATALOG_KEY, JSON.stringify(next), { expirationTtl: CATALOG_TTL_S * 4 });
    } catch {
      /* a cache write failure must not fail the build */
    }
  }
  return next;
}
