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
