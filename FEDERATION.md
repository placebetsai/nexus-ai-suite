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
| fashionistas-api | ✅ | Auth + marketplaces work (signup 201, login 200). MISSING many routes the frontend calls (ai/analyze, fees, orders, hauls, analytics, blog, export). |
| fashionistas-ai | ⚠️ | Same account, worker-name collision to watch. |
| createstuff-api | ❌ | **ALL ROUTES 401** (incl /, /health, /api/auth/signup). Broken — fix first. |
| marketpicks-ai-api / marketpicks-ai | ⚠️ | MarketPicks APIs. |
| placebets-api-worker | ✅ | /api/odds/nfl 200. |
| quorfy-api, quorfy-api-v2 | — | Old experiments. |
| fashion-news, site-cron-trigger | — | Cron/utility. |

### Placebetsai account (CreateStuff)
| Worker | Blessing | Notes |
|---|---|---|
| **forge-api** | ⚠️ | CreateStuff's real backend (forge-db, 7MB — has real data). The cash cow. |
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

## Current blocked/fix agenda (from AUDIT-REPORT.md)
1. **createstuff-api worker**: every route 401 → diagnose (CF Access rule vs worker code) → redeploy.
2. **fashionistas-api worker**: add missing routes (ai/analyze, fees/estimate, orders, hauls, analytics, blog, export/*) to match live frontend.
3. Decide canonical home of CreateStuff backend: forge-api (CS acct) vs createstuff-api (FASH acct) — consolidate, don't run both.
4. GitHub repos abandoned — deleted remote already. This registry + local git = source of truth.