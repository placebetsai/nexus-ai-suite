# Federation audit — 2026-10-21 (read-only sweep)

Two independent passes, both receipt-based:
- **Direct**: `hive/tasks/federation-audit.sh` — curl loop, no model involved (ground truth).
- **Agent**: the rebuilt hive board (10 agents, parallelism 3) running the same checklist —
  see `hive/output/pool-latest.json`.

Every field below is an observed value. `ketiservice.com` and `ldm-realestate` are HANDS OFF and
were not touched.

## Direct sweep (2026-10-21 ~20:16Z)

| site | home | robots | sitemap | deep link | ads.txt | CMP marker | font <12px |
|---|---|---|---|---|---|---|---|
| marketpicks.ai | 200 | 200 | **503 → 200** | 200 | 200 | **no** | ok |
| placebets.ai | 200 | 200 | 200 | 200 | 200 | yes | **LOW** |
| ihatecollege.com | 200 | 200 | 200 | 200 | 200 | no | **LOW** |
| createstuff.ai | 200 | 200 | 200 | 200 | **000ERR** | yes | ok |
| fashionistas.com | **000ERR** | — | — | — | — | — | — |
| fashionistas.ai (the real one) | **200** | 200 | 200 | 200 | 200 | no | ok |
| hiddencameras.tv | 200 | 200 | 200 | 200 | 200 | yes | **LOW** |
| scooter.exchange | 200 | 200 | 200 | 200 | 200 | no | **LOW** |
| diamonds.forsale | 200 | 200 | 200 | 200 | 200 | no | ok |
| israeljoffe.com | 200 | 200 | 200 | 200 | 200 | no | ok |
| spanishtvshows.com | 200 | 200 | 200 | 200 | 200 | no | **LOW** |
| wuwonline.com | 200 | 200 | 200 | 200 | 200 | no | ok |
| mondaynightwrestling.com | **000ERR** | — | — | — | — | — | — |
| mondaynightwrestling.com (www) | **200** | — | — | — | — | — | — |

## Findings, ranked

1. **`mondaynightwrestling.com` apex HTTPS is dead.** DNS resolves, `http://` → 301, but
   `https://` on the apex times out (25s) while `https://www.mondaynightwrestling.com/` = 200.
   No Pages project for it in this account, so either the apex isn't bound (certificate/hostname
   gap) or it lives in another account. **Fix: bind the apex or add an apex→www redirect.**
2. **`fashionistas.com` is NOT our domain.** The Pages project `fashionistas-ai` is bound to
   `fashionistas-ai.pages.dev`, **`fashionistas.ai`**, `www.fashionistas.ai` — and
   `fashionistas.ai` answers 200 (www → 308 → apex ✓). But `http://fashionistas.com` → 301 →
   `https://www.kurtgeiger.com/` (a third party). **Never publish fashionistas.com in copy,
   canonicals, OG tags or outreach — the canonical is fashionistas.ai.** If the .com was once
   ours, it needs reclaiming; if it was never ours, treat it as hostile for SEO.
3. **`marketpicks.ai/sitemap.xml` served a 503 before the 200** (cold-start: the route renders
   per request). robots.txt correctly lists both sitemaps ✓. A crawler hitting a cold edge can
   get a 503 → **prebuild or cache the sitemap route.**
4. **No consent/CMP marker on marketpicks.ai** (grep: fundingchoices/googlefc/cmp/consent → none)
   while placebets.ai, createstuff.ai and hiddencameras.tv have one. That blocks AdSense in
   regulated regions — the known open chore, now with a receipt per site.
5. **`createstuff.ai` has no ads.txt** (000ERR) while every other site answers 200.
6. **font-size below 12px on 5 sites** (placebets.ai, ihatecollege.com, hiddencameras.tv,
   scooter.exchange, spanishtvshows.com) — marketpicks.ai enforces the ≥12px floor with a test
   (`tests/font-floor.test.mjs`); these five do not. The detector is a regex for
   `font-size:(9|10|11)px`, so it may be catching tiny footer/legal text — verify per site
   before changing anything.

## Finding 7 — the biggest one: our own heavy SSR routes were intermittently 503-ing (Cloudflare 1102)

The agent audit flagged `marketpicks.ai/politician-tracker` = **503** while the homepage looked
fine. That is the "the website's problems are back" class, so it got a full investigation.

**Symptom:** intermittent `503` with `content-type: text/plain`, body **`error code: 1102`**
(Cloudflare: *Worker exceeded resource limits* — the edge CPU limit).

**Measurement (the part that matters):**

| probe | result |
|---|---|
| 12 sequential hits, /politician-tracker | 5× 503 (42%) |
| 8 **concurrent** hits, each of /politician-tracker, /terminal, /briefing | 1× 503 each (12.5%) |
| 8 concurrent hits, /stock/NVDA | 0× 503 |
| 8 hits on the idle PREVIEW deployment (ef0054b3) during the same window | 0× 503 |
| all 5 of today's deployments, measured later | 0× 503 |

**Diagnosis:** not a code regression from today's commits (every deployment behaves identically
when measured now) and not DNS — it is the **edge CPU limit under production traffic**: the
live deployment is the one carrying real crawler/user traffic; the idle preview URL answers 200
the whole time, which is why the first A/B looked like a code difference. Sequential retries hid
it; concurrency exposed it.

**Fix shipped (`9f3d901`):**
1. `lib/politician-trades-loader.ts` — the newest-first sort now computes its keys **once per
   row** (a comparator that called `Date.parse` on every comparison cost ~130k parses on a
   5.2k-row merge) and **maps only the rows the caller asked for** (the API serves ≤500 of
   ~5.2k merged rows). Totals still count every row, so "4,993 trades · 102 members" stays true.
2. `next.config.mjs` — a **60s CDN window** (`s-maxage=60, stale-while-revalidate=300`) on the
   three heavy routes, so repeat visitors are served from the edge instead of re-running the
   function. The browser still revalidates (`max-age=0`).

## Domain ownership receipts (who can actually be fixed by us)

| domain | in our CF account? | consequence |
|---|---|---|
| `fashionistas.ai` | **YES** (zone `1329a2e63b17d6d9afd291fac2d0beab`, active) | the canonical; `www` → 308 → apex ✓ |
| `fashionistas.com` | **NO** | http → 301 → `https://www.kurtgeiger.com/` — **not ours**. Never publish it in copy, canonicals, OG tags or outreach. |
| `mondaynightwrestling.com` | **NO** (apex) | apex HTTPS dead, `www` = 200. The zone is in another account, so this one cannot be fixed from here. |
| `marketpicks.ai` | YES | ours; robots.txt lists both sitemaps ✓; `/sitemap.xml` answered **503 once then 200** — a cold-start render, so a crawler hitting a cold edge can get a 503. Worth prebuilding/caching. |

## Hive/infra findings (same session)

7. **Only 3 of 10 rostered free models actually serve today.** Sequential probe
   (`~/.local/bin/hive-probe-models.sh`, receipts in `~/.local/hive-model-probe.json`):
   `nemotron-3.5-lightning-free` ✓ 3.3s · `beam-free` ✓ 3.3s · `nemotron-3-ultra` ✓ 3.9s;
   **dead**: deepseek-v4.1-flash-free, flint-40b-free, glm-5.3-flash-free,
   nemotron-3.5-super-vl-free, big-pickle, mimo-v2.6-flash-free (75s timeouts) and
   longcat-2.5-preview-free ("Endpoint is unavailable"). The old roster pointed at seven dead
   ids — which is why the board acked 3/10 in a 537s wall while looking configured.
8. Fixes shipped: roster rebuilt from live probes (`hive/hive-rebuild-roster.mjs`),
   `dispatch.parallelism` 10 → 3 (the board's own 2026-10-06 RCA), a **local Ollama floor**
   (`ollama/qwen2.5:7b`, `ollama/qwen2.5:3b` — installed rootless, free, cannot 403 or hit a
   quota) sits between the cloud fallback and the banned `default`, and
   `hive/local-pool.mjs` runs a bounded pool that re-reads the roster on every invocation (the
   MCP server caches it at module load, so its config edits only apply on its next start).
