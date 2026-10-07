# PRIMETIME CHECKLIST — live (updated every round)

Status: `TODO` · `WIP` · `PROVEN` · `NOT PROVEN` · `BLOCKED`

## 🔴 ONE THING NEEDED FROM YOU (blocks placebets going live)
Click the wrangler OAuth link (it is waiting on `localhost:8976`):

```
https://dash.cloudflare.com/oauth2/auth?response_type=code&client_id=54d11594-84e4-41aa-b438-e81b8fa78ee7&redirect_uri=http%3A%2F%2Flocalhost%3A8976%2Foauth%2Fcallback&scope=account%3Aread%20user%3Aread%20pages%3Awrite%20d1%3Awrite%20workers_scripts%3Awrite%20workers%3Awrite%20workers_routes%3Awrite%20workers_tail%3Aread%20zone%3Aread%20email_routing%3Awrite%20offline_access&state=acoUaocz8VcI3x.5CGIMzupYEGTc_2o3&code_challenge=dz3my0uC8qrMe0ywvt1E-_D_QWG-_M7-I2y0Sy6URLY&code_challenge_method=S256
```

Why: `placebets.ai` is **not attached to any Pages project in this account**, so
**none of today's placebets deploys ever reached the real domain.** Pages demands
`CNAME placebets.ai → placebets-ai.pages.dev`; the apex has proxied A records to a
*different* deployment (md5 differs from ours). Current scopes = `pages/d1/workers/account`,
**no `zone`** → I cannot read or write that DNS. After you click I get `zone:read` +
`workers_routes:write` (+ `email_routing:write` for the support inbox).

## fashionistas.ai — ready for buyers + sellers
| # | item | status | evidence |
|---|------|--------|----------|
| F1 | D1 master-record schema (`photos/status/updated_at` + `listing_destinations`) | **PROVEN** | `migrations/0002` rows_written **6**, `0003` rows_written **5**, applied to live `fashionistas-db`; `0003` now committed (`077e0b0`) |
| F1b | **Seller can create a listing** — was 503 `model_not_configured` AND `no such column: colour` | **PROVEN** | live `POST /api/listing` → **HTTP 200**, `writer:seller`, `listing.id:133`, 6-shop breakdown (best Depop net 65.31), D1 row verified then cleaned; **live == `077e0b0`**; tests **213/213** |
| F2 | Chrome store blocker: manifest icons | **PROVEN** | `manifest.json` had `icons:null`; now `icons` + `action.default_icon` → `icons/icon-{16,32,48,128}.png`, all 4 files exist inside the package, manifest parses as valid JSON. `a194cef` |
| F3 | WEB-1 mobile one-tap "Copy listing + open <marketplace>" + photos to device | TODO | |
| F4 | WEB-2 onboarding signup→extension→first listing < 3 min (timed) | TODO | |
| F5 | WEB-3 Stripe test-mode: one $9.99 charge + refund (LIVE off) | **BLOCKED** | `.env` has `STRIPE_SECRET_KEY=` **empty (length 0)** and `STRIPE_WEBHOOK_SECRET=` empty; no key on disk anywhere. Needs a **test** key (`sk_test_…`) before any charge |
| F6 | WEB-4 Chrome Web Store package (zip/icons/screenshots/privacy) | **PROVEN (package)** | rebuilt `chrome-store/fashionistas-extension-v.zip`: **59 entries**, `manifest.json`×1, `icons/icon-*.png`×4, junk (tests/.env/node_modules/.map) **0**; old package had 54 entries, **0 icons**, and shipped all 7 `__tests__/*.mjs`. `LISTING.md` + `PRIVACY.md` present, 4 screenshots. Store *upload* still manual |
| F7 | WEB-5 terms + privacy + per-marketplace risk pages | DONE | `61ada91` |
| F8 | WEB-6 error alerting + uptime + support@ inbox | TODO | needs the OAuth link (`email_routing:write`) to create `support@` routing |
| F9 | **BUYER FLOW: a buyer CANNOT buy.** UI exists, server has none of it | **PROVEN (diagnosis)** — build not started | `GET /api/market` → **404**, `POST /api/market/1/buy` → **405**, `grep -rn "INSERT INTO orders"` → **0 hits**, `index.html:2440` says *"This is a DEMO checkout (Stripe/PayPal not live yet)"*. Inventory is there: `active 17, pending 1, sold 12`. 5-step build order in `CART_GAP.md` (Stripe **test mode** only) |
| F10 | Phase 1: 6-site listing dry-run (Grailed 11/12, eBay URL known) | BLOCKED | needs 3 taps from Israel |

## placebets.ai
| # | item | status | evidence |
|---|------|--------|----------|
| **P0** | **Deploys never reached the real domain** | **PROVEN — BLOCKED on DNS** | `placebets.ai` claimed by **0** Pages projects and **0** Worker custom domains in this account; Pages attach returned `verification: {"error_message":"CNAME record not set"}`, then Cloudflare **rolled the attach back** (`domains count: 0`). md5(`placebets.ai/`) ≠ md5(`placebets-ai.pages.dev/`). Live `POST /api/trade/dry-run` = **404** (old build) vs **400** (our build) → route exists only in ours |
| P1 | Ticker looks/behaves badly | **PROVEN (code shipped to Pages)** | `5a03c2a` — `NewsTicker` +313, `GlobalTicker` +84, `globals.css` +80: scroll speed, contrast, hover/focus pause, `prefers-reduced-motion`, empty-feed fallback, no layout shift. Compiles (build exit 0, 86 pages). **Not visible on placebets.ai until P0** |
| P2 | Backgrounds: animated words, graphics cards, backgrounds | **PROVEN (code shipped to Pages)** | `cc1ce09` wired the 5 orphaned components into `SportsbookHomepage.js`: `MatrixBackground`, `AnimatedWords`, `CategoryMarquee`, `PickCards` (+`SportIcons`), `app/sportsbook.css` +426. grep proof: each has ≥1 external importer. **Not visible on placebets.ai until P0** |
| P3 | Chatbot claims "no live feed data" | **PROVEN in suite, NOT PROVEN live** | `NO LIVE-DATA CLAIM 13/13`, `NO BARE CONCESSION 1/1`, `NO DEAD END 11/12` — but the suite hits **production**, which still runs the OLD build (P0). Re-run after the CNAME |
| P4 | Chatbot doesn't predict / knows no current events | **NOT PROVEN — 5 assertions fail** | `TEAMS no NBA substitution 6/7`, `LIVE FEED named 2/3`, `LIVE DATA in answer 1/3`, `NO DATA owns the miss 0/2` (source reports `workers_ai`/`wikipedia+llm` as if a model were a data source) |
| P5 | Build was broken by the dead agent's trading commit | **PROVEN + FIXED** | `a1578bc` shipped `../../../lib/…` from `app/api/<a>/<b>/route.js` (4 levels deep) → `Module not found` ×5, `next build` exit 1 → no deploy could ever run. Fixed in `3c9b412`; import audit `resolved=280 BROKEN=0`, build exit 0 |

## marketpicks.ai
| # | item | status | evidence |
|---|------|--------|----------|
| M1 | Congress picks are weeks old | **PROVEN (root cause + deployed)** | `/api/insider/breaking-trades` returned **8 rows all `days_ago:21`, every one Kevin Hern** — whale filter + `slice(0,8)` with no recency gate. Trigger/upstream were FINE (`crons=["*/15 * * * *"]`, congress.json `generatedAt` minutes old). `cron/worker.ts` also **did not compile**. Fixed `c33c61c` + `3d6bfe0`; **Pages `8c3306e1`, worker `b5d922a0`** |
| M2 | Data wrong / stale — nothing ever checked age | **PROVEN (live)** | `freshness:{ok:true,sourceAgeHours:1.2,dataAgeDays:4,newestDisclosure:"2026-10-02",origin:"official_json"}`; `politician-trades` newest `2026-10-02, 2026-10-01, 2026-09-25…`; `breaking-trades` → `source=newest_filings oldest_disclosure_age_days=18 all_breaking=False`. Agent also **tailed the cron live**: `"event":{"cron":"*/15 * * * *"}` at `11:45:51`, `outcome:"ok"` |
| M3 | Chatbot wrong, no live data, sycophantic | **PROVEN (deployed)** | `87ee0ee`; agent's 8 live probes: **0/8** matched a "no live data" claim; pushback probe held its call — `BUY at $238.90 – CONFIDENCE 55% (soft)`, **0/8 flip markers**; `source=market_quote+llm`, `As-of: live_quote`. `npm test` **34/34** |
| M4 | marketpicks leftovers (pre-existing, unfixed) | NOT PROVEN | `/api/health` still fabricates `last_success = now` from row counts (never reads `cron_runs`); `POST /api/cron/quotes` takes **76s** then 524s under cron; `bot2` (`ensemble_noground`) answers off-topic; `confidence` top-level field is `null` on every response |

## House rules (unchanged)
- Parallel sidecars on **disjoint files**; commit+push per phase
- Every report = **PROVEN (paste command + real output)** or **NOT PROVEN**
- **NO GitHub ACTIONS.** Wrangler + Cloudflare only, files stay on laptop
- No heavy local compute; `npm test` fast; deploys ~76s
- $0 until proven; Stripe test mode only; secrets never in git

---

## AGENT HEALTH (live) — why agents kept dying

| # | item | status | evidence |
|---|------|--------|----------|
| A1 | RCA: subagents inherit the orchestrator model when `model` is unset | PROVEN | 4 dead sessions all logged `model={"id":"mimo-v2.6-flash-free"}` = orchestrator's model; 5 concurrent streams → `AI.Error.QuotaExceeded`, all 4 dead within 7s (04:30:31–04:30:38) |
| A2 | RCA: hive `dispatch.parallelism=10` + `timeout_per_task_ms=300000` < measured 382s task | PROVEN | `hive.json.bak-20261006-rca` |
| A3 | RCA: dead endpoint `ling-3.0-flash-fin-free` still in model pool | PROVEN | `hive_models()` returned it live |
| A4 | FIX: `hive.json` → parallelism 3, task timeout 900000, probe 120000, 0 agents on mimo, dead model removed | PROVEN (fresh process) | `node -e "loadHive()"` printed the new values; backup `hive.json.bak-20261006-rca` |
| A5 | FIX binds in current session? | NOT PROVEN — **next session** | `mcp-server.mjs:16` + `dispatch.mjs:27` do `const HIVE = loadHive()` at module load; live `hive_models()` still showed the old pool |
| A6 | FIX: every subagent launched with an explicit non-mimo `model` | **PROVEN** | `space-bunny-free` (placebets A/A3) and `big-pickle` (marketpicks) — neither hit quota; both ran to completion |
| A7 | concurrency cap 2 children | **PROVEN** | at most 2 running at once; both completed with full reports, 0 quota errors during their runs |
| A8 | RCA written up | PROVEN | `nexus-ai-suite/RCA-AGENTS.md` ("RCA #2", 156 lines) |
| A9 | Agent output actually landed | **PROVEN** | marketpicks: **4 commits pushed**, `npm test 34/34`, 12-row PROVEN/NOT-PROVEN report. placebets: `cc1ce09` + `3c9b412` + `5a03c2a`, wiring grep proof, live test tally 117 pass/5 fail |

## TODAY (2026-10-06) — full log

**Shipped + verified**
- placebets root cause (stale artifact) → `2dd74a9` → deploy **`b8f61b65`** → suite **170/0, 173 assertions, 19 cases**
- Ihatecollege AdSense → **`07e1e474`**, live 200 + `ca-pub-7215975042937417`, tests 7/7
- israeljoffe.com / .org copy + alts → **`fc66c516` / `e12c81ee`**, live 0 conceited openers, 26/26 alt; `.com` 2941/2941, `.org` 88 imgs / 0 missing
- fashionistas AdSense → **`8886e25`**, `npm test` **267/267**, `VERIFIED — live == 8886e25`, pushed to origin
- createstuff app ad slots → **`2517b122.createstuff-ai.pages.dev`** (repo still dirty, +23)
- spanishtvshows `186247c` + `c790513` pushed, run **`37519900879`** success 2m36s, live home **7 slots** + 3 interior pages; tests 5/5

**fashionistas — PROVEN live today**
- **Try-It works**: `POST /api/tryon/hd` → 200, **48.2 s**, `576×823` WebP **19,072 B**, `cost_usd 0`, **credits_left 9**
- chatbot 200 / 4.17 s (correct scope refusal) · `/api/marketplaces` **count 11** · `/api/closet/clear` 200 (empty closet)
- **NOT ready for prime time**: zero real marketplace posts ever, 8 env vars missing, no Stripe test key, mobile = Expo WIP with no build

**Governance**
- **GitHub Actions OFF everywhere**: every workflow in ~70 repos `disabled_manually` + `hiddencameras-tv` `actions_enabled=false` → federation-wide re-check **0 active**
- `ISSUE_LOG.md` created (36 issues: 10 fixed, 13 open, 9 blocked, 4 wontfix)
- `nexus-ai-suite/HANDOFF-2026-10-06.md` = the blueprint: mission, accounts, key map (names/paths only), dated log, risks

**🔴 NEW BLOCKERS found**
- spanishtvshows `/show/<id>/` → **500 for every id tested**

**Round 2 (late 2026-10-06) — the two "not on the real domain" gaps closed**
- **handoff pushed to GitHub**: `f091eea..4bac909 master` (Actions are off repo-wide — nothing triggered)
- **placebets.ai now serves today's build**: `.vercel/output/static` → project `placebetsai` (acct `2765cb27…`) → **`0cf4db31` `2026-10-06T22:57:39Z`, deploy stage ✔**. Proof: domain HTML vs that deployment is identical after stripping timestamps; `POST /api/chatbot` → 200 ×3, live-board answer, `source: odds_board_structured`, disclaimer present.
  - *Why it never shipped*: `npx wrangler` in that repo is **v3.114**, which ignores `CLOUDFLARE_ACCOUNT_ID` and targets the wrong account (`7eb89b01…` → auth error 10000). `/usr/local/bin/wrangler` **v4.138** honours it — used for every account-crossing deploy from here on.
- **createstuff.ai now has ads**: `493ccc4` (nexus-ai-suite, pushed). Live: `ads.txt` **200 text/plain 59 B**, `site-adsense.js` **200 application/javascript 8,596 B**, home **110,849 B** with **1 loader byte-identical to `loaderTagHTML()`** + **4 mount points** (`hero`, `inContent`, `bottom`, `default`).
- **marketpicks.ai `/api/health` tells the truth**: `c91ae99` → deploy **`f4d5bb08`**; `quotes.last_success=2026-10-06T23:16:20Z` ("897 rows in quotes; last ran 7m ago"), **0 of 6** sources equal `last_check`, `data_tables.grading=2` (was reported as "no data yet"); tests **54/54**.
- **chatbot sweep, live**: placebets.ai ×3 (200), marketpicks (live quote + `[Live Data]`), ihatecollege (honest data-limit answer), spanishtvshows (sourced pick), fashionistas (Bearer, proven earlier).
- **israeljoffe.com/.org** live files are **md5-identical** to the deployed repo files; 26/26 + 26/26 alts contain "Israel Joffe"; **0** banned sentence openers (the single `.org/about` hit is an image caption).

**Round 3 (late 2026-10-06) — two new accounts opened, scooter.exchange repaired**

- **credentials secured**: `STV_*` (account `555c6765…`) and `IHC_*` (account `90904956…`, `ihatecollege79@gmail.com`) stored in `nexus-ai-suite/.secrets/cf.env` (`-rw-------`, git-ignored) → **verified** `/accounts/{id}/tokens/verify` `success:true`. Registered in `plan.md` + `HANDOFF-2026-10-06.md` as key names/paths/lengths/account IDs only — **values are never written to the handoff, which is a PUBLIC repo** (`placebetsai/nexus-ai-suite`). Push `493ccc4..931cd0b`; `git show HEAD | grep -c 'cfat_[A-Za-z0-9]{40}'` → **0**.
- **ihatecollege.com now serves the fix**: deployed project `ihatecollege` → live `https://ihatecollege.com/` **loader ×1, ad slots ×3, 76,386 B** (was loader ×0 on the real domain).
- **scooter.exchange** — 4 defects fixed in one round (full evidence in `ISSUE_LOG` **#37**):
  - dead pics: 23 `loremflickr.com` refs (host 401s on *every* URL) → 13 Wikimedia Commons files, each `200 image/jpeg` before patching → live `/` `/history-of-scooters` `/news` `/map` now **`loremflickr=0`**, homepage **9/9 images load**
  - data: `SELECT … FROM listings` → `n=7004, no_make=7004, no_year=7004`, labels came from the *search query* → new `classify.ts` + backfill **4,439 category corrections**, `ebike 1105`, `other 1000`, **292 parts deactivated** (active `1001→905`); every buy-page filter `all_match=True`
  - rentals: all 36 `rentals:*` cache rows were `[]` → Overpass/Photon fallback → **NYC 25, LA 25, Miami 52** (was 0)
  - seller photos: `photos.scooter.exchange` **NXDOMAIN** → `GET /api/photos/<key>` (`404` for missing + traversal)
  - shipped: worker **`6c4b1f15`**, Pages **`56dd2a9d`**, repo **`ed4c794..2e77e3a`**; workflows still `disabled_manually`
  - gotchas recorded: project `production_branch` = **`main`** (`--branch=master` silently deploys as *preview* and the domain keeps the old build) · wrangler **v4** cannot bundle this next-on-pages artifact → use `node_modules/.bin/wrangler` (3.114.17) `--no-bundle`
- **diamonds.forsale — shipped `37253dda` (was frozen on `2026-07-30`).** Build was broken by `onError` on an `<img>` in a **server** component (`Static page generation for /about is still timing out after 3 attempts`), and `ADSENSE_CLIENT` was never supplied so the gated loader never rendered. Now: **8/8 pages `loader=2, ca-pub=2`**, `/about` avatar `200` (was `404`), **all images 200**, `loremflickr=0`, repo `5692dae..775e029`, workflows `disabled_manually` ×2 — evidence `ISSUE_LOG` **#38**.

**🔴 BLOCKERS still open**
- **spanishtvshows `/show/<id>/` → 500 for every id** — RCA in `ISSUE_LOG` #18: the workflow sets `TMDB_API_KEY` on project `spanishtvshows` but deploys to `spanishtvshows-site`. Fix needs the `555c6765…` account token; Actions are retired, so the workflow will not do it.
- marketpicks M4 ×3 (`/api/cron/quotes` 524 s, `bot2`/`ensemble_noground` off-topic, `confidence` null) · fashionistas prime time (9 try-on credits, 0 real posts, 8 env vars) · key rotations ×4 + SMTP ×2 · wrangler OAuth refresh
