# OpenCode — daily alerts for every site (owner: OpenCode on the laptop)

**From 2026-10-15, OpenCode (MiMo) owns the daily alerts for every site, not Chief of Staff.** Iz said so on 2026-10-15. Chief of Staff and the site bots do not run these checks any more.
Written by Chief of Staff from the real repos, the gates and the 2026-10-15 health audit. Nothing here is guessed; where something is unknown it says so.

Read this first, then `OPENCODE-COORDINATION.md` (hard rules + deploy-gate table), then the site handoff.

---

## 0. The daily run (≈8:00 AM ET, ~2 minutes, free)

Plain Node scripts, zero dependencies, no AI grading. Exit 0 = pass, exit 1 = alert. `WARN` lines never fail but are still worth reading.
Laptop Node is v22, so these run as-is.

**Use clean, read-only check clones.** The laptop working trees belong to other agents, are dirty and are mostly *stale* (no gate scripts in them):
`Placebetsai-src` (main 3b3b506, 13 dirty files), `Ihatecollege` (4b54203, dirty), `scooters-exchange` (148+ dirty files; `~/scooters-exchange` 165), `marketpicks-ai` (`wip/local-2026-10-14`), `nexus-ai-suite` (7 dirty). There is **no forge checkout** on the laptop. Never `reset`, `stash` or `checkout` in those trees.

One-time setup:
```bash
mkdir -p ~/site-checks && cd ~/site-checks
for r in Placebetsai marketpicks-ai Ihatecollege scooters-exchange forge nexus-ai-suite; do
  git clone -q https://github.com/placebetsai/$r.git
done
git -C marketpicks-ai checkout -q live-source          # gate lives on live-source, not main
git -C Placebetsai checkout -q feat/fix9-grounding      # until fix 9 ships; then back to main
# fashionistas: use ~/fashionistas-ai (clean, branch rebuild a4c3c05, has the gate)
```

Daily:
```bash
cd ~/site-checks && for r in */; do git -C "$r" pull -q --ff-only; done
git -C ~/fashionistas-ai fetch -q
D=/tmp/alerts-$(date +%F); mkdir -p $D
(cd ~/fashionistas-ai            && node scripts/smoke.mjs https://fashionistas.ai    --json $D/fashionistas.json) > $D/fashionistas.txt; echo "fashionistas $?"
(cd ~/site-checks/Placebetsai    && node scripts/smoke.mjs https://placebets.ai       --json $D/placebets.json)    > $D/placebets.txt;    echo "placebets $?"
(cd ~/site-checks/marketpicks-ai && node scripts/smoke.mjs https://marketpicks.ai     --json $D/marketpicks.json)  > $D/marketpicks.txt;  echo "marketpicks $?"
(cd ~/site-checks/Ihatecollege   && node scripts/smoke.mjs https://ihatecollege.com   --json $D/ihc.json)          > $D/ihc.txt;          echo "ihc $?"
(cd ~/site-checks/scooters-exchange && node scripts/smoke.mjs https://scooter.exchange --json $D/scooter.json)     > $D/scooter.txt;      echo "scooter $?"
(cd ~/site-checks/forge          && node scripts/smoke.mjs https://createstuff.ai     --json $D/createstuff.json)  > $D/createstuff.txt;  echo "createstuff $?"
(cd ~/site-checks/nexus-ai-suite && node scripts/smoke/createstuff-marketing.mjs https://createstuff.ai --json $D/cs-mkt.json) > $D/cs-mkt.txt; echo "cs-marketing $?"
(cd ~/site-checks/nexus-ai-suite && node scripts/smoke/israeljoffe-com.mjs https://israeljoffe.com   --json $D/israeljoffe.json) > $D/israeljoffe.txt; echo "israeljoffe $?"
```
All smoke scripts take `node scripts/smoke.mjs [baseUrl] [--json out.json] [--skip-bots] [--quiet]`.

Plus the existing laptop jobs (systemd **user** timers already running; just check them):
```bash
systemctl --user list-timers --all --no-pager | grep -E 'nexus-d1-budget|marketpicks-|placebets-kalshi'
systemctl --user --failed --no-pager
journalctl --user -u marketpicks-congress.service --since yesterday --no-pager | tail -20
```
- `nexus-d1-budget.timer` (hourly, `nexus-ai-suite/scripts/d1-budget.py`): D1 rows-read for the Fashionistas1979 account; desktop warning at 60% of 5M/day.
- `marketpicks-congress.timer` (~2 h), `marketpicks-insiders.timer`, `marketpicks-screener.timer`: MarketPicks data ingest from the laptop.
- `placebets-kalshi.timer`: PlaceBets Kalshi snapshot.
- user crontab: `pb-grok/scripts/daily-digest-cron.sh` every 2nd day 7 AM.

Baseline (Chief of Staff run, 2026-10-15 ~7:20 AM ET, logs on the bot box `/workspace/audits/smoke-2026-10-15/`):
placebets FAIL 7/9 (bot, fixed in fix 9 on preview) · marketpicks FAIL 9/11 (NVDA bot price) · ihatecollege PASS 16/17 · fashionistas PASS 8/12 (warns) · scooter PASS 6/6 · createstuff PASS 4/4 · israeljoffe PASS 7/7.
**Only a NEW failure vs. this baseline (or vs. yesterday's run) is an alert.** Known failures are listed per site below.

Optional local cron (only if Iz asks for one; no GitHub Actions, no AI routine):
`0 8 * * * bash ~/site-checks/daily.sh >> ~/site-checks/daily.log 2>&1` (put the "Daily" block above into `daily.sh`).

---

## 1. Cloudflare email alerts — what they mean (all sites)

| Email | Means | First move |
|---|---|---|
| **Workers: "exceeded CPU time limit" / exceededResources** | A Worker invocation hit the CPU cap. On **marketpicks-ai-api** this was crawlers (Ahrefs, Semrush, etc.) hitting expensive routes. Crawler guard is live: version **`280dc36b`**, rollback **`0cb3f854`**. 2026-10-15: 0 exceededResources in 24 h on both visible accounts; p99 CPU still high on marketpicks-ai-api (339 ms) and scooters-exchange-api (473 ms). | Check GraphQL `workersInvocationsAdaptive` by scriptName + status for the last 24 h. If it is crawler UAs again, widen the guard (generic UA list, not one bot). Don't roll back unless the guard itself broke pages. |
| **D1: usage approaching/exceeded limit** (free: 5M rows read/day, 100k rows written/day per account) | **marketpicks-db** writes came from the quotes cron rewriting every quote row each run. Fix: skip-unchanged triggers + 2 quote indexes dropped, in nexus `ops/d1/marketpicks-skip-unchanged-triggers.sql`; result ~19k writes/day (was 76k on Oct 14). **scooters-exchange-db** (Ihatecollege79) reads were ~3.4M/day projected (68%) before the perf fix (worker `7bdaf392`, migration `0007_perf_indexes.sql`). | `d1AnalyticsAdaptiveGroups` by databaseId: which DB, read or write. If marketpicks writes jump, check the triggers still exist (`SELECT name FROM sqlite_master WHERE type='trigger'`). Keep D1 lean: caches/logs go to KV/R2. |
| **KV: usage** (free: 1k writes / 100k reads per day) | Fashionistas1979 account was 77 writes / 136 reads on Oct 15. Any spike = some code writing KV per request. | Find the writer via Worker logs; fix in code, through the gate. |
| **HTTP 5xx / 504 spikes (zone analytics or Notifications)** | **504s with `requestSource = earlyHintsCache`** are Cloudflare Pages' internal Early Hints lookups. **504s with `requestSource = edgeWorkerCacheAPI`** are the Cache API logging its own misses. **Neither is a visitor error.** | **Count visitor errors with `requestSource = "eyeball"` only.** scooter's "493 × 504/day" were 491 earlyHintsCache, 0 eyeball 5xx. |

Zone analytics access (from the health audit): Ihatecollege79 token can read zone + account analytics (ihatecollege.com, scooter.exchange). Fashionistas1979 token (`CF_API_TOKEN`) has account analytics but **no Zone Analytics:Read** (fashionistas.ai, marketpicks.ai, israeljoffe.com). Placebetsai account token has **neither** (placebets.ai, createstuff.ai). Note: placebets-api-worker, placebets-scheduler and createstuff-api Workers actually run in the **Fashionistas1979** account. Adding those permissions is an Iz task.

---

## 2. Per site

Secrets: **paths and variable names only. Never print, echo, cat or commit values.** Load with `set -a; . <file>; set +a`.
- `~/Documents/Default Project/nexus-ai-suite/.secrets/cf.env`: `CF_API_TOKEN`/`CF_ACCOUNT_ID` (Fashionistas1979, 7eb89b…), `CS_API_TOKEN`/`CS_ACCOUNT_ID` (Placebetsai, 2765cb…), `IHC_API_TOKEN`/`IHC_ACCOUNT_ID` (Ihatecollege79, 909049…). **Every repo's `deploy-safe.sh` loads this file itself** (except fashionistas).
- `~/.secrets/cloudflare.env`: `CF_TOKEN_IHATECOLLEGE`/`CF_ACCT_IHATECOLLEGE` (Ihatecollege79: IHC + scooter), also `CF_TOKEN_PLACEBETS`. Use it for manual wrangler work on the IHC/scooter account (rollback, D1, GraphQL), exported as `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID`.
- `~/fashionistas-ai/.env.deploy` (fashionistas deploys), `~/fashionistas-ai/.env.test-seller` (test seller `iz_test_seller`; smoke reads `FASH_SMOKE_USER`/`FASH_SMOKE_PASS`).

### fashionistas.ai
- **Repo:** placebetsai/fashionistas-ai · laptop `~/fashionistas-ai` (only this copy; ignore `fa-*`, `fashionistas-wt-*`, and `~/Documents/Default Project/fashionistas-ai`, which is 4 weeks stale). Branch `rebuild` @ `a4c3c05` holds the gate. Production = `main` `89bf396` / Pages `47a70a52`, rollback Pages `d8b758aa`. Rebuild preview https://rebuild.fashionistas-ai.pages.dev awaits Iz's "ship it".
- **Daily check:** `cd ~/fashionistas-ai && node scripts/smoke.mjs https://fashionistas.ai` (also run on `https://rebuild.fashionistas-ai.pages.dev`). The API is checked through `fashionistas.ai/w/api/health` and `/w/api/market` (fashionistas.ai/api/* is 404 by design).
- **Deploy:** `bash scripts/deploy-safe.sh` (from main) or `PREVIEW_ONLY=1 ALLOW_BRANCH=<branch> bash scripts/deploy-safe.sh`. It wraps `scripts/deploy-local.sh` and reads `.env.deploy`. Preview only: `DEPLOY_BRANCH=<b> ALLOW_BRANCH=<b> scripts/deploy-local.sh`. Never change `CHANNEL_KEY`.
- **Alerts you'll see:** smoke WARN "market has no junk/test listings"; GA4 does nothing until Pages env `GA_MEASUREMENT_ID` is set (Iz). D1/KV for fashionistas-db is in the Fashionistas1979 account (same as MarketPicks).
- **Triage:** smoke red on prod → check `version.txt` = expected sha → `/w/api/health` → worker logs → if a deploy caused it, use the rollback the gate printed.
- **Known open (not new alerts):**
  - Junk listings still active in the public API `/w/api/market` and in SSR SEO lists/titles: #204 Black Coffee Cup Lid, #145 Keurig, #155 Clear Plastic Cup. Rebuild only hides them client-side. Real fix = server-side filter / deactivate (needs owner OK; don't delete user data).
  - Prod smoke WARNs `/sell` and `/you` 404: those routes exist only in the rebuild (not shipped). Signed-in board check skipped unless the test-seller env is loaded.

### placebets.ai
- **Repo:** placebetsai/Placebetsai. `main` = `a3840b4` (not deployed yet); production deployment is still `ecddd446`. **Fix 9 on preview**: branch `feat/fix9-grounding` @ `6071c4f`, preview `chatbot-preview-9` (deployment `4b3b3157`): smoke 9/9, eval 1041/1041, canary 50/50, page test 832/0. **Production waits for Iz's "ship it".** Laptop tree `~/Documents/Default Project/Placebetsai-src` is stale+dirty; use `~/site-checks/Placebetsai`. Handoff: `HANDOFF-2026-10-15-placebets.md`.
- **Daily check:** `node scripts/smoke.mjs https://placebets.ai`. Extra (free, deterministic grader): `npm run canary https://placebets.ai` (50 sampled eval questions), `npm run eval:daily`. On fix-9 branch also `node scripts/seo/page-test.mjs --base https://placebets.ai`.
- **Deploy:** `SHIP_IT=1 scripts/ship/deploy-gated.sh main` (eval → canary → page test → `scripts/deploy-safe.sh` with SKIP_BUILD=1), or `bash scripts/deploy-safe.sh` / `PREVIEW_ONLY=1 bash scripts/deploy-safe.sh`. Creds: nexus `cf.env` `CS_API_TOKEN`. **deploy-safe.sh now falls back to the repo-local wrangler (3.114) when Node < 22** (Placebetsai `6071c4f`); it prints `wrangler: <binary> (vX) on node vN` first.
- **Alerts you'll see:** smoke bot FAILs "tonight NBA" (invents Lakers–Celtics) and "UFC this weekend" (says nothing matches) until fix 9 ships. The canary run from the fix-9 branch against prod fails ~46/50 for the same reason (new `slate` items): expected until ship. Lone `ml_mismatch` canary failures during fast-moving lines are grader races, not bot bugs; check the board first.
- **Not alerts (artifacts):** "predictions 0" in /api/health = health reading the wrong DB (1,175 picks exist; fixed in 7a8c6a7, on fix 9). `/api/picks` 404 = route never existed (real: `/api/receipts`, `/receipts`; `/picks` 301s to `/daily-picks`). "grade-outcomes never recorded" = it writes `prediction_grading_runs`, not `cron_health`; it runs every 15 min via placebetsai-cron.
- **Known open:** /api/odds is ~5–6 s / 1.7 MB; 9 leagues flagged stale (Brasileirão, Champions Tour, Eredivisie, F1, Liga MX, NPB, PFL, Süper Lig, WTA). After fix 9 ships: check `/api/cron/grade-outcomes?dry=1` and only run it for real with Iz's OK (writes prod D1).

### marketpicks.ai
- **Repo:** placebetsai/marketpicks-ai @ **`live-source`** (gate `4644260`; main lacks it). Laptop working tree `~/Documents/Default Project/marketpicks-ai` is on `wip/local-2026-10-14` (MarketPicks Bot's, dirty) and must merge `4644260`. Handoff: `HANDOFF-marketpicks-2026-10-14.md` (don't edit their dirty copy).
- **Daily check:** `cd ~/site-checks/marketpicks-ai && node scripts/smoke.mjs https://marketpicks.ai`.
- **Deploy:** `bash scripts/deploy-safe.sh` (`npm run ship` / `pages:deploy` route to it). Creds: nexus `cf.env` `CF_API_TOKEN` (Fashionistas1979). Build needs the vercel-CLI symlink workaround in the handoff. `CF_API_TOKEN` can't run `wrangler d1 execute` (7403).
- **Alerts you'll see:** Workers CPU-limit emails (crawlers; guard `280dc36b`, rollback `0cb3f854`); D1 write alerts (quotes cron; triggers `ops/d1/marketpicks-skip-unchanged-triggers.sql` in nexus); `marketpicks-congress.service` failures (it failed 3× overnight Oct 14 when the network was bad; site then shows `source_stale`. Re-run: `systemctl --user start marketpicks-congress.service`).
- **Known open:**
  - **Bot NVDA price wrong**: bot said $221.30 vs `/api/stock/NVDA` $217.01 (1.98% off; smoke FAIL, gate needs ≤1%). Two price sources disagree; fix generally (one quote source for bot + pages), not an NVDA patch.
  - **`/insider` intermittent 503 "error code: 1102"** (Worker resource limit).
  - marketpicks-ai-api 56 exceptions/24h (27% error rate over 7d). Health `grading` state "unknown" (WARN: no timestamp in `prediction_grading_runs`).
  - Pages project has no Groq/OpenRouter secrets (Iz).

### ihatecollege.com
- **Repo:** placebetsai/Ihatecollege @ `main` (gate `e8b41c7`; head `351f718`). Laptop `~/Documents/Default Project/Ihatecollege` is stale (4b54203) and dirty; use `~/site-checks/Ihatecollege`. Account Ihatecollege79. Handoff: `HANDOFF-ihatecollege-2026-10-14.md`.
- **Daily check:** `node scripts/smoke.mjs https://ihatecollege.com` (17 checks incl. one bot question).
- **Deploy:** `bash scripts/deploy-safe.sh`. Creds: nexus `cf.env` `IHC_API_TOKEN` (auto). GitHub Action "Deploy to Cloudflare Pages" (273779478) is **disabled**; pushes don't deploy.
- **Alerts you'll see:** smoke WARN `/api/civil-service-data` empty; 404 noise from crawlers (81% of traffic is bots).
- **Known open:**
  - **USAJOBS keys missing**: `USAJOBS_API_KEY` + `USAJOBS_EMAIL` must be set as Pages env vars (Iz registers at developer.usajobs.gov). Until then the route returns `[]` with `X-Data-Status: missing-key`. Empty-state UI on branch `ui/civil-service-empty-state-2026-10-15` awaits ship-it.
  - **D1 live prune pending** (needs the IHC token run on the laptop; keep only `leads` in D1).
  - Preview env lacks Groq/OpenRouter keys (preview bot check may fail): `wrangler pages secret put GROQ_API_KEY --project-name=ihatecollege --env preview` (same for `OPENROUTER_API_KEY`) with the IHC token.
  - `/trade-vs-college` 404 → redirect to `/compare` in progress (IHateCollege Bot).
  - `/college/*` is still `cf-cache-status: DYNAMIC`; needs a Cache Rule (Iz/dashboard).

### scooter.exchange
- **Repo:** placebetsai/scooters-exchange @ `master` (gate `b230973`). Laptop `~/Documents/Default Project/scooters-exchange` and `~/scooters-exchange` (branch `fix/api-504-perf-2026-10-15`) both have 150-ish uncommitted files: the live web build was deployed from one of them. **Do not deploy web from git HEAD**; it would roll back that work. Account Ihatecollege79. Handoff: `HANDOFF-scooter-perf-ga4-2026-10-15.md`, audit box `/workspace/affiliates/SCOOTER.md`.
- **Daily check:** `node scripts/smoke.mjs https://scooter.exchange`. API: `curl -fsS https://api.scooter.exchange/api/health` (expect >100 active listings; 1,472 on Oct 15).
- **Deploy:** `bash scripts/deploy-safe.sh web` / `bash scripts/deploy-safe.sh api`. Creds: nexus `cf.env` `IHC_API_TOKEN` (auto). API worker live `7bdaf392`, rollback `40705d9c`: `cd packages/api && wrangler rollback 40705d9c-1056-4cee-ab79-747ec6e62943` with `~/.secrets/cloudflare.env` `CF_TOKEN_IHATECOLLEGE` exported as `CLOUDFLARE_API_TOKEN`.
- **Alerts you'll see:** 504 spikes = earlyHintsCache / edgeWorkerCacheAPI (internal; count `eyeball` only). Google Places 429s on `/v1/places:searchText` (quota exhausted; the 6 h circuit breaker in KV `places:cooldown` stops the spam; OSM fallback serves). D1 reads on scooters-exchange-db (watch vs 5M/day).
- **Known open:**
  - **Early Hints `_headers` (`/* ! Link`) NOT deployed**: only on branch `fix/api-504-perf-2026-10-15`, verified on https://perf-preview.scooters-exchange.pages.dev. The web owner must add `apps/web/public/_headers` to the tree that is live and ship via the gate.
  - **GitHub Actions**: `deploy-api.yml` / `deploy-web.yml` are now **disabled_manually** (checked 2026-10-15 7:45 AM ET), but the YAML files still exist in `.github/workflows/`. Delete them in a doc-only commit; never re-enable.
  - **Google Places quota exhausted** (GCP project 389633621778, "SearchTextRequest per day"). Iz decides whether to raise it.
  - Bot answers are generic LLM (not grounded in the 1,472 listings); EPN campid unknown.

### createstuff.ai (forge + marketing in nexus)
- **Repos:** placebetsai/**forge** @ `main` (gate `ad3ad29`): app.createstuff.ai (Pages `createstuff-app`) + api.createstuff.ai (Worker `forge-api`). Marketing createstuff.ai ships from **nexus** `apps/createstuff-marketing` (not forge `apps/marketing`). No forge checkout on the laptop: use `~/site-checks/forge`. Handoff: `HANDOFF-createstuff-2026-10-15.md` (CreateStuff Bot; same daily list).
- **Daily check:** `cd ~/site-checks/forge && node scripts/smoke.mjs https://createstuff.ai` (checks marketing, app, `api/health`, auth gate). Plus `node scripts/smoke/createstuff-marketing.mjs https://createstuff.ai` in nexus, and `curl -fsS https://createstuff.ai/ads.txt | head -c 200` (alert if it returns HTML).
- **Deploy:** `bash scripts/deploy-safe.sh app|api` (forge); marketing `bash scripts/deploy-safe-static.sh createstuff-marketing` (nexus). Creds: nexus `cf.env` `CS_API_TOKEN` (auto).
- **Known open:**
  - **SECURITY: a plaintext Cloudflare token starting `cfut_7…`** sits in forge `.github/workflows/deploy-api.yml`, `deploy-marketing.yml`, `deploy-web-platform.yml` (and git history). Workflows are disabled. **Iz must revoke + reissue it in the Cloudflare dashboard.** After rotation, OpenCode deletes the three files (doc-only commit). **Never print the full token.**
  - PR #8 (AI generate path) is draft, not deployed; AI generation never verified live. PR #9 rejected by Iz.

### israeljoffe.com
- **Repo:** placebetsai/nexus-ai-suite `israeljoffe-com/` @ `master`. Laptop `~/Documents/Default Project/nexus-ai-suite` (dirty: other agents' files; never commit them). Fashionistas1979 account. Handoff: `HANDOFF-israeljoffe-seo-2026-10-13.md`.
- **Daily check:** `cd ~/site-checks/nexus-ai-suite && node scripts/smoke/israeljoffe-com.mjs https://israeljoffe.com` (pages, sitemap >50 URLs, feed).
- **Deploy:** `bash scripts/deploy-safe-static.sh israeljoffe-com`. Bare `./deploy.sh pages israeljoffe-com` is refused.
- **Known open:** no AdSense here by design; traffic ~2 real loads/day.

---

## 3. Triage checklist (every alert)

1. **Is it real?** Re-run the one failing smoke after 2 minutes (pages can 404 for ~1 min after a deploy). For 5xx counts, filter `requestSource = "eyeball"`.
2. **Is it new?** Compare with yesterday's `/tmp/alerts-*` JSON and the "Known open" list. Known = no alert; note it once a day at most.
3. **What changed?** Last deploy per project (`wrangler pages deployment list --project-name <p>` / `wrangler deployments list` in the worker dir), last commit on the branch, cron/timer failures (`systemctl --user --failed`).
4. **Data or code?** Data stale (odds, quotes, congress, news, listings) → check the ingest job/cron and its source. Code → reproduce on preview.
5. **Fix** on a branch in a clean clone → preview via the repo's gate (`PREVIEW_ONLY=1 bash scripts/deploy-safe.sh …`) → smoke green. Backend-only fixes: through the gate to production. **Any UI change: 412x915 Android screenshots and wait for Iz's "ship it".**
6. **Production broke after a deploy:** use the exact rollback command the gate printed (`AUTO_ROLLBACK=1` exists). Then update the site's HANDOFF in nexus.
7. **Update the handoff** (doc-only commit in nexus; `git add <only your file>`, never `git add -A`).

## 4. Hard rules

- **Deploy only via each repo's `scripts/deploy-safe.sh`** (static sites: nexus `scripts/deploy-safe-static.sh`), which uses **Wrangler**. **Never GitHub Actions** (never re-enable a disabled workflow), never Telegram, never raw `wrangler pages deploy --branch=main`. `ALLOW_KNOWN_FAILS=1` only for failures that also fail on production right now.
- **UI changes:** preview + **412x915 Android screenshots**, then wait for Iz to say **"ship it"**. Never straight to production.
- **Never invent data** (odds, prices, tuition, filings, listings, counts). **Keep D1 lean.** **Never change `CHANNEL_KEY`.** **Never print secrets** (paths and variable names only).
- **No AI-run scheduled routines.** Checks are the plain scripts above, run by OpenCode, or a local laptop cron **only if Iz asks for one**.
- **Escalate to Iz only when he is the one who must act**: rotating a token, adding keys/env vars (USAJOBS, Groq, GA4 ID), raising a quota, granting a token permission, approving a "ship it", AdSense/affiliate account steps. Everything else: fix it or log it in the handoff.
- One owner per site: if the site bot's handoff shows work "in progress", don't touch that area; log the alert in the handoff instead.

## 5. What needs Iz (current list)
1. Rotate the forge `cfut_7…` Cloudflare token.
2. "Ship it" for PlaceBets fix 9 and the Fashionistas rebuild preview.
3. USAJOBS API key + email (IHC); Groq key for MarketPicks Pages; Groq/OpenRouter on IHC preview env.
4. Google Places quota decision (scooter).
5. Zone Analytics:Read on the Fashionistas1979 token; Account + Zone Analytics:Read on the Placebetsai token.
6. GA4 Measurement IDs (all loaders are no-ops until set).
