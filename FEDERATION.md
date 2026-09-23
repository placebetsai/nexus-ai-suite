# Nexus Federation Registry (LOCAL source of truth)

> Stored 2026-09-23. Everything discovered LIVE via Cloudflare API. No GitHub — this machine is the source of truth. Deploy via `./deploy.sh`.

## The 2 accounts (both verified working)

| Account | Account ID | Token var (in .secrets/cf.env) | Token name | Owns |
|---|---|---|---|---|
| **Fashionistas1979@gmail.com** | `7eb89b01e9c3bec41ee24db8ecbe77f8` | `CF_API_TOKEN` | yellow-math-1874 | Most Pages + Workers + all D1 (fashionistas-db, createstuff-db, placebets-db, ihatecollege-db, marketpicks-db, quorfy-db-v3) |
| **Placebetsai@gmail.com** | `2765cb2786006552f33cc3dfe0b680a1` | `CS_API_TOKEN` | dark-cell-ecf9 | CreateStuff app + Forge API + cron jobs (forge-db, prediction-market-data, placebets-subscribers) |

## Pages projects (live)

### Fashionistas1979 account
| Project | URL | Notes |
|---|---|---|
| fashionistas-ai | fashionistas-ai.pages.dev | THE Fashionistas app (rich build, 21KB+44KB app.js). **Build here.** |
| createstuff-ai | createstuff-ai.pages.dev | OLD landing only. **Outdated — use createstuff-app on CS account.** |
| app-createstuff | app-createstuff.pages.dev | CreateStuff app (older). |
| marketpicks-ai | marketpicks-ai.pages.dev | THE MarketPicks app (248KB, working). |
| marketpicks-api | marketpicks-api.pages.dev | Old/CONFUSED API project (404s live). |
| placebets-ai | placebets-ai.pages.dev | PlaceBets app (90KB). |
| placebets-api | placebets-api.pages.dev | PlaceBets API harness. |
| ihatecollege-com | ihatecollege-com.pages.dev | IHateCollege site (79KB). |
| ihatecollege-api | ihatecollege-api.pages.dev | IHateCollege API. |
| israeljoffe-org | israeljoffe-org.pages.dev | Portfolio (static). |
| israeljoffe-com | israeljoffe-com.pages.dev | Portfolio (static). |
| (other experiments: midnight-tacos, night-owl-coffee, template-pack, ai-agency, wordforge, etc.) | | Old demos — not our 5 apps. |

### Placebetsai account (CreateStuff)
| Project | URL | Notes |
|---|---|---|
| **createstuff-app** | **app.createstuff.ai** + createstuff-app.pages.dev | **THE CreateStuff app.** Has custom domain. **Build here.** |
| createstuff-marketing | createstuff-marketing.pages.dev | Marketing/landing (updated often). |
| placebets-ai-v2 | placebets-ai-v2.pages.dev | PlaceBets v2 experiment. |

## Workers (live)

### Fashionistas1979 account
| Worker | Blessing | Notes |
|---|---|---|
| fashionistas-api | ✅ | **REBUILT + REDEPLOYED 2026-09-23.** Full router live: auth (HMAC JWT), listings CRUD + crosspost + sold + platforms, fees/shipping real parse, orders, hauls, analytics, profit/summary, messages templates, export CSV, marketplaces. **ai/analyze = REAL vision** (llama-3.2-11b-vision, base64 image → item JSON, source:"ai"). Blog/image-upload R2. |
| fashionistas-ai | ⚠️ | Same account, worker-name collision to watch. |
| ~~createstuff-api~~ | ❌ | **DELETED 2026-09-23.** Zombie (all 401, nothing referenced it). Canonical backend = forge-api on CS account. |
| marketpicks-ai-api / marketpicks-ai | ⚠️ | MarketPicks APIs. |
| placebets-api-worker | ✅ | /api/odds/nfl 200. |
| quorfy-api, quorfy-api-v2 | — | Old experiments. |
| fashion-news, site-cron-trigger | — | Cron/utility. |

### Placebetsai account (CreateStuff)
| Worker | Blessing | Notes |
|---|---|---|
| **forge-api** | ✅ | **CANONICAL CreateStuff backend.** Served at `api.createstuff.ai` (zone route). Verified register/login/projects work 2026-09-23. Data: forge-db. |
| placebetsai-cron, placebets-cron, placebets-chatbot-fix, placebetsai-housekeeping | — | Cron/utility for PlaceBets. |
| marketpicks-ai, marketpicks-ai-api, marketpicks-ai-housekeeping | — | MarketPicks (CS account copy). |
| joffe-daily-cron, site-cron-trigger | — | Cron. |

## D1 databases (existing IDs — REUSE, never recreate)

### Fashionistas1979 account
| DB | ID | Size | For |
|---|---|---|---|
| fashionistas-db | `0c1b88be-00b2-4e25-ae54-d30564190c4d` | 122KB | Fashionistas app (has user data, id 9 verified) |
| createstuff-db | `cc9ab7ed-b343-4883-bf76-07f8493cba9e` | 380KB | CreateStuff (on Fashionistas acct!) |
| placebets-db | `20eb5aaa-2c3a-45ca-be9d-d35c21c9161d` | 49KB | PlaceBets |
| ihatecollege-db | `b4fb4c53-d3d3-4b67-8aa0-3e8d06823e0b` | 49KB | IHateCollege |
| marketpicks-db | `bcc97511-60b8-4fd7-ad03-f2c458b80c6a` | 3.1MB | MarketPicks (lots of data) |
| quorfy-db-v3 | `9a03fef4-996f-498e-b03b-66e6e1ec8b88` | 82KB | Old experiment |

### Placebetsai account (CreateStuff)
| DB | ID | Size | For |
|---|---|---|---|
| **forge-db** | `6b468863-8193-4c7b-9da7-33782149762f` | 7.1MB | CreateStuff primary DB (real data — DO NOT TOUCH carelessly) |
| prediction-market-data | `4eecddc5-ae36-4ea5-8c13-f798b5c59e5e` | 4.4MB | MarketPicks predictions |
| placebets-subscribers | `e88f6550-035a-4559-b271-4f6e1415f509` | 2.7MB | PlaceBets subscribers |

## Deploy commands (from THIS machine)

```bash
cd /home/joffe/projects/nexus-ai-suite
set -a; source .secrets/cf.env; set +a

# Fashionistas app → master account
CLOUDFLARE_API_TOKEN=$CF_API_TOKEN CLOUDFLARE_ACCOUNT_ID=$CF_ACCOUNT_ID npx wrangler pages deploy <build-dir> --project-name=fashionistas-ai --branch main

# CreateStuff app → CS account (has app.createstuff.ai domain)
CLOUDFLARE_API_TOKEN=$CS_API_TOKEN CLOUDFLARE_ACCOUNT_ID=$CS_ACCOUNT_ID npx wrangler pages deploy <build-dir> --project-name=createstuff-app --branch main

# Workers (from the worker's dir)
CLOUDFLARE_API_TOKEN=$CF_API_TOKEN CLOUDFLARE_ACCOUNT_ID=$CF_ACCOUNT_ID npx wrangler deploy
```

Or use `./deploy.sh pages <project> <dir>` / `./deploy.sh worker <name> <dir>` — it routes to the right account automatically.

## Current done/blocked fix agenda (from AUDIT-REPORT.md)
1. ✅ **CreateStuff backend decided + zombie killed (2026-09-23).** Canonical = **forge-api** on Placebetsai account, served at `api.createstuff.ai` (zone route verified: `api.createstuff.ai/* → forge-api`), backed by **forge-db**. Verified end-to-end. The dead `createstuff-api` worker (FASH acct) was DELETED — no domain/route referenced it.
2. ✅ **fashionistas-api worker rebuilt (2026-09-23)** + ALL routes live at `fashionistas-api.fashionistas1979.workers.dev`. Vision AI REAL (llama-3.2-11b, base64 via prompt+image params). Blog query fixed (`created_at`). Local source of truth: `workers/fashionistas-api/`.
3. ✅ **Both frontends REBUILT + deployed (2026-09-23):**
   - **Fashionistas** → `fashionistas-ai` Pages: https://fashionistas-ai.pages.dev (commit b8b6493)
   - **CreateStuff** → `createstuff-app` Pages (custom domain app.createstuff.ai): https://app.createstuff.ai → https://createstuff-app.pages.dev (commit b9f07e8)
   - Local sources: `apps/fashionistas/`, `apps/createstuff/`.
4. CreateStuff `workers/forge-api/` clean rebuild exists but NOT deployed (would need JOB_QUEUE/DLQ bindings + queue handler). Prod forge-api at api.createstuff.ai is UNTOUCHED and working — do not overwrite without care.
5. **NEXT: Android phase** (wrap both PWAs with Capacitor → APK), then any remaining polish.