# MarketPicks handoff — Thu 2026-10-15 (current state)
Written 6:49 AM ET. History, earlier deploys and the reasoning behind each fix: `HANDOFF-marketpicks-2026-10-14.md` (same folder).

> **Worker mode (added Oct 15, commits 0c35f5c + c42d7ed):** `bash scripts/deploy-safe.sh worker` ships the cron worker (cron/, marketpicks-ai-api). Pages mode is unchanged (`bash scripts/deploy-safe.sh` or `… pages`). The steps:
> 1. Records the live version as the rollback target.
> 2. Bundles with `wrangler deploy --dry-run`.
> 3. Runs `wrangler versions upload`, which doesn't serve traffic.
> 4. Smokes the uploaded version with `scripts/smoke-worker.mjs` against its Version Preview URL. This worker has no preview URL, and I didn't enable one because its unauthenticated /api/cron/* routes would be exposed. So instead it runs the scheduled-handler test: `wrangler dev --local --test-scheduled` on a throwaway D1 built from migrations/, at 14:00Z, with SITE_URL pointed at a dead port so no production route is hit. It must reach the end-of-run summary with desk-direction receipts and no TypeError/ReferenceError.
> 5. Promotes `<id>@100%` only if step 4 passes.
> 6. Checks the live version and runs the site smoke.
> 7. Prints `npx wrangler versions deploy <prev>@100% -y` (AUTO_ROLLBACK=1 runs it).
>
> Run it detached: `setsid nohup bash /tmp/mpsafe-worker.sh > ~/mpsafe-worker.log 2>&1 < /dev/null & disown`. It uses the global wrangler (4.138); the repo's npx wrangler 4.86 can't run compat date 2026-06-27 locally.

> **HARD RULE (Chief of Staff, Oct 15 ~7:20 AM):** marketpicks.ai production deploys go ONLY through `bash scripts/deploy-safe.sh` (in the repo; from live-source commit 4644260, merged into wip/local-2026-10-14). It runs build → preview (branch gate-candidate) → `scripts/smoke.mjs` on the preview → production only if green → smoke on production → prints the rollback command (AUTO_ROLLBACK=1 runs it). `/tmp/mpdeploy.sh main` and raw `wrangler pages deploy --branch=main` are FORBIDDEN. Manual smoke: `npm run smoke -- <url>`. Options: SKIP_BUILD=1, PREVIEW_ONLY=1, ALLOW_KNOWN_FAILS=1 (only for failures that already fail on production). Run it detached: `setsid nohup bash /tmp/mpsafe.sh > ~/mpsafe.log 2>&1 < /dev/null & disown` (/tmp/mpsafe.sh = cd repo && bash scripts/deploy-safe.sh). Re-create the vercel symlinks first.


## 1. What's live
| Piece | Id | Notes |
|---|---|---|
| Pages production (marketpicks.ai) | **9653b143** (https://9653b143.marketpicks-ai.pages.dev) | Shipped Oct 15 ~9:12 AM ET via deploy-safe.sh from commit eca57ef (gate preview ca6fc2ef; prod smoke 11/11, 0 warnings). Grading backlog fix. Before: 3f92f1a4 (adc58e2), ba82c2f0 (f4717ec), 79b42864, 99118312. |
| Cron worker `marketpicks-ai-api` | **90700d47-b292-4e47-9c09-37f35d0be3c3** | Oct 15 10:14 AM ET via `deploy-safe.sh worker` (commit c42d7ed): directional receipts. **Rollback version: 8cc54059-4b73-4fad-868e-df5d47eb4a14** (Senate eFD DO relay, 7:05 AM): `cd cron && npx wrangler versions deploy 8cc54059-4b73-4fad-868e-df5d47eb4a14@100% -y`. Older: 36d7680f. |
| Pages rollback target | **3f92f1a4** | Previous production (adc58e2). Rollback: `curl -fsS -X POST -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/marketpicks-ai/deployments/3f92f1a4-0de4-4743-bf79-cf7c955c1594/rollback`. Older: ba82c2f0, 79b42864. |
| Preview alias | gate-candidate.marketpicks-ai.pages.dev (deploy-safe) | 59096a39 = same build as prod. preview-fresh-data is the older manual alias. |

Rollback: Cloudflare dashboard → Pages → marketpicks-ai → Deployments → 280dc36b → "Rollback to this deployment". Worker: `npx wrangler versions deploy <old-version>@100% -y` from `cron/` (previous worker version 36d7680f-bb06-4514-800e-5023a6526f37; note it has no SENATE_PROXY binding, so rolling back to it brings back the Senate 403s).

## 2. Overnight check (Thu 6:49 AM ET, read-only)
- /api/health: status **operational**, ok true. quotes/news/ipo/econ/earnings all **ok** (grading "unknown" = no timestamp recorded, long-standing).
  - Quotes never got close to stale overnight. Reason: the health check also counts MAX(quotes.updated_at), and the crypto scraper (every 30 min, 24/7) writes into the same `quotes` table. The 66h off-hours gate therefore never had to kick in. It is there for the case where crypto also stops.
- Congress: status ok; cloud ingest last success 10:15Z (6:15 AM ET, 0.6h old); newest filing 2026-10-14; laptop congress.json 1.6h old. Standing error on every run: `senate: Error: no csrf (http 403)` — the Senate eFD half of the cloud ingest is failing (House works; the laptop timer still covers the Senate). Worth fixing.
- D1 marketpicks-db rows_written, last 24h (11:00Z Oct 14 → 10:59Z Oct 15): **53,150 of 100,000 (53%)**. Of that, ~44k happened before the fixes. After the worker deploy (02:00Z–10:59Z, off-hours): 300–530/hour, one 1,593 spike at 08:00Z (4 AM ET). Expect roughly 10–20k/day once a full market day has run; re-measure Thu evening.
- Bot live: "Should I buy NVDA this morning?" → `desk+llm`, 2.1s, trader-style answer with price, MAs, returns and "The call: WAIT … stop $209.69, target $251.82". Health bot self-test: groq ok, workers_ai ok.
- Errors seen: Senate csrf 403 (above). `site-blogs.service` is in failed state on the laptop. Not marketpicks (ihatecollege/spanishtvshows blogs, another bot's script); not touched.

## 3. Architecture and data sources
- **Site:** Next.js on Cloudflare Pages through next-on-pages (edge runtime). Project `marketpicks-ai`, account 7eb89b01… (fashionistas1979). D1 binding `marketpicks-db` (bcc97511…).
- **Edge cache wrapper:** `scripts/edge-cache-wrapper.mjs` wraps the built `_worker.js`. It caches /congress pages and holds a guard for AhrefsBot/SemrushBot: cached copy or 503 (verified 503 this morning). Googlebot, Bing and humans are unaffected.
- **Cron worker:** `cron/worker.ts` (wrangler.toml in `cron/`), schedule `*/15`. It POSTs the Pages `/api/cron/*` routes and runs the cloud congress ingest itself.
- **Quotes:** Yahoo/TradingView/crypto scrapers → D1 `quotes` (995 rows). Ticker tape and the bot fetch Yahoo live.
- **Congress:** official House Clerk PTR PDFs + Senate eFD.
  - Cloud: `cron/official-ingest.ts` + `cron/house-ptr.ts`. Hourly index, drained into `politician_trades`, logged to cron_health `congress_cloud_official`.
  - Laptop: timer `marketpicks-congress.timer` runs `scripts/congress/official_congress.py`, which publishes marketpicks-data.pages.dev/congress.json.
  - The loader (`lib/politician-trades-loader.ts`) merges the cloud rows (21 days) over congress.json, with the Bargo API as the last fallback.
  - Manual run: `curl -H "Authorization: Bearer $(cat ~/.cache/mp-ingest-token)" https://marketpicks-ai-api.fashionistas1979.workers.dev/api/congress/official-run`
- **Other laptop timers:** marketpicks-insiders, marketpicks-screener.
- **SEO pages:** /congress/[slug], /congress/ticker/[ticker], /congress/trade/[id] (with OG image), /congress/today, /congress/feed.xml, /congress/sitemap.xml. /politician/:slug redirects (308) to /congress/:slug. IndexNow: `scripts/indexnow-ping.mjs`.
- **Ads and performance:**
  - `components/LazyChrome.tsx` loads the chat, the signup popup and adsbygoogle after the first interaction or after 4s.
  - `components/AdUnit.tsx` reserves 280px.
  - Publisher ca-pub-7215975042937417.

## 4. Bot design (`app/api/chatbot/route.ts` + `lib/trader-desk.ts`)
- `traderDesk()` runs before the older paths. Routes:
  - single ticker → `desk`
  - "X vs Y" → `desk_compare`
  - market/rates/macro → `desk_macro` (SPY, QQQ, IWM, ^VIX, ^TNX, plus XLK/XLF/XLE/XLU for rates or sector questions)
  - earnings → `desk_earnings`
  - unknown symbol → `desk_unknown_ticker`
  - banter → `desk_banter`
  - The congress feed keeps its own path.
- `getFacts` pulls the Yahoo 1y chart: price, change, volume vs the 20d average, 5d/1m/3m/YTD/1y returns, 52w range, SMA 20/50/200, ATR14, 20d swing high/low, realized vol and a plain-English "read" line. `getHeadlines` adds Yahoo news; congress filings for the ticker are added too.
- `levels()` turns a score into BULLISH / BEARISH / WAIT with entry, stop, target and timeframe (a `PLAN:` line). For comparisons the code picks the winner and the answer opens "X over Y." After the model answers, the code forces "The call:" to match the computed plan.
- `TRADER_PERSONA`: punchy trader-friend voice; every number must come from DATA; ends with "Not financial advice." Banter skips the disclaimer.
- Grounding: `ungroundedNumbers()` checks every number against DATA. On a miss it retries once; if that fails too, `templateCall()` answers without the model.
- Models: a dedicated Groq call (gpt-oss-120b → 20b → llama-3.1-8b-instant, `reasoning_effort` low, max_tokens 1200), then Workers AI (gemma-4-26b, llama-3.1-8b-fp8-fast).
- Answer cache key: `chat-answer/v7` (as of Oct 15). Bump it after any prompt change, or old answers keep being served (this bit us on Oct 14).
- In-isolate rate limit on cf-connecting-ip.
- Eval kit (box): `/workspace/botq.txt` (12 prompts), `/workspace/ask.py <base> <out.json>`, before/after with grades: `/workspace/marketpicks-bot-before-after.md`. Screenshots: `/workspace/marketpicks-bot-pixel7.png` (preview), `/workspace/marketpicks-bot-pixel7-live.png` (live). Old route backup: laptop `~/chatbot.route.pre-financebro.2026.bak`.

## 5. D1 write controls
- Free cap: 100k rows_written/day per account. marketpicks-db was ~77k on Oct 14.
- **CoS triggers (Chief of Staff, applied directly to the DB; keep them):** BEFORE UPDATE triggers that RAISE(IGNORE) unchanged rows. SQL: `ops/d1/marketpicks-skip-unchanged-triggers.sql`.
  - quotes_skip_unchanged (2h refresh)
  - news (6h), ipo (6h), earnings (6h), econ (2h)
  - pt_skip_unchanged (politician_trades, 24h on fetched_at)
  - CoS also dropped 2 quotes indexes.
- **Code guard:** the quote upserts in `lib/market-data.ts` (upsertQuote, used by every scrape-*/crypto/commodity/sports writer) and `app/api/cron/quotes/route.ts` only update when price, pct_change, week_change or volume changed.
- **Cadence (worker):**
  - Stock/ETF quotes (`/api/cron/quotes`, scrape-stocks-tradingview, scrape-etf-tradingview): every 30 min Mon–Fri 09:30–16:15 New York, plus 08:00 and 17:00; none on weekends.
  - Crypto: every 30 min, 24/7.
  - Commodities: every 30 min on weekdays.
  - News/ipo/econ/earnings: every 15 min.
  - Insider alerts: 30 min. Cleanup: 06:00 UTC.
- **fetched_at gotcha:** pt_skip_unchanged freezes `fetched_at` on unchanged rows. Every freshness check (worker watchdog, /api/health congress block, loader generatedAt) now uses the newer of MAX(fetched_at) and cron_health `congress_cloud_official.last_success`. Don't revert that.
- **Health gate:** /api/health quotes uses 90/180 min during market hours and 66h/72h otherwise.
- **Measure:** Cloudflare GraphQL `d1AnalyticsAdaptiveGroups` (sum rowsWritten by datetimeHour, filter databaseId). Script: laptop `/tmp/d1an.sh` (it uses CF_API_TOKEN, which can read analytics but not run D1 queries, error 7403).

## 6. Daily health routine (~2 min, no login)
1. `curl -s https://marketpicks.ai/api/health`
   - status "operational"; all sources ok.
   - congress.status ok, last_fetch_age_hours ≤ 6, newest_filing within ~3 business days.
   - bot.status ok.
2. If congress is stale: read congress.cron_health last_error, then force a run (curl in section 3).
3. Ask the bot "Should I buy NVDA?". The source should be `desk+llm`, with the live price and "The call:".
4. Spot-check /, /congress/today, /track-record, /stock/NVDA (all 200).
5. Weekly: the D1 rows_written trend (section 5) and one mobile Lighthouse on home (`CHROME_PATH=/home/box/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome npx -y lighthouse@12 https://marketpicks.ai/ --only-categories=performance --form-factor=mobile`). Run 3 times and use the median; single runs swing ±10.

## 7. Deploy steps and gotchas (laptop, wrangler only, never GitHub, never push)
- Tree: `~/Documents/Default Project/marketpicks-ai`. Commit on a local branch before every deploy.
- **vercel symlinks:** next-on-pages needs vercel, which is not a devDependency. Before any build, re-create:
  `ln -sfn ~/.cache/vercel-cli/node_modules/vercel node_modules/vercel; ln -sfn ../vercel/dist/vc.js node_modules/.bin/vercel`
  `npm install`/`npm ci` deletes them. `/tmp/mpbuildprev.sh` re-creates them.
- **Preview:** `rm -f ~/mpbuildprev.log; setsid nohup bash /tmp/mpbuildprev.sh > ~/mpbuildprev.log 2>&1 < /dev/null & disown` (build ~7–9 min, then deploys branch preview-fresh-data; the log prints the URL).
- **Production:** ONLY `bash scripts/deploy-safe.sh` (see the hard rule at the top). `/tmp/mpdeploy.sh main` is forbidden. UI changes still need Iz's "ship it".
- **Worker:** template `/tmp/mpworker-d1.sh` (versions upload, then versions deploy of the new version id). Same detached pattern.
- Always detached. Remote sessions drop (ECONNRESET), and the laptop is "temporarily unreachable" now and then; just retry.
- **Stale deploy ID in the log:** on Oct 14 the mpdeploy log printed "74c26c55" while the real new deployment was 99118312. Always confirm with `npx wrangler pages deployment list --project-name=marketpicks-ai --environment production` (source commit column) before reporting an ID.
- Pages can 404 a route for ~1 min after a deploy. Re-check before judging.
- `/tmp` scripts vanish on reboot. Copies of the logic are in this doc.
- Secrets: `nexus-ai-suite/.secrets/cf.env` (CF_API_TOKEN / CF_ACCOUNT_ID for account 7eb89b01…). Never print them. The CS_* token is a different account.
- Don't touch: ihatecollege (another bot owns it), createstuff files, CoS's D1 triggers.

## 8. Local git state
- Branch **wip/local-2026-10-14** (from live-source @ ee9304f), not pushed:
  - 04c6f6d: snapshot of the ~45 previously-uncommitted files (congress cloud ingest, SEO pages, speed fix, bot).
  - 40c1fe5: D1 diet + bot tweaks. This is what production 99118312 was built from.
- Left untracked on purpose: tsconfig.tsbuildinfo, _t2.mjs, scripts/congress/__pycache__/.
- Pre-existing TypeScript error (not from this work): `app/api/cron/quotes/route.ts(138)` SparkQuote type mismatch. The build still passes.
- nexus-ai-suite commit 7a62e0d (CoS) also swept in NEEDS_ISRAEL.txt, scripts/site-blogs.sh and apps/createstuff-marketing/index.html. They are other bots' work, not marketpicks; left as-is.

## 9. Known soft spots
- Bot wording: sometimes says "tape's quiet" on a 3% drop. The gold answer reads clunky ("averages all ahead").
- (Fixed Oct 15) Bot timing before the open / after hours. See the update at the end.
- CLS 0.141 on the live home page (Lighthouse Oct 14 night: scores 75/86/88, median 86, LCP 2.6s). Earlier speed-fix runs measured CLS 0.058, so look for the shifting element.
- (Fixed Oct 15 7:16 AM) Senate eFD cloud ingest 403s. See the update at the end.
- Hero ad slot 5079047997 returns 400 for headless browsers on both marketpicks and ihatecollege (see Oct 14 doc). Not a code bug.
- Contact form rewrite still parked (Oct 14 doc, "Excluded").

## 10. Iz's open items
1. **Rotate the Groq key.** It is in plaintext in the public repo placebetsai/Spanishtvshows.com (app/api/chatbot/route.js), plus scooters-exchange/packages/api/.dev.vars and ~/.config/site-blogs.env. Then set it again with `wrangler pages secret put GROQ_API_KEY --project-name=marketpicks-ai` (and for preview).
2. **AdSense consent message:** AdSense → Privacy & messaging → European regulations (Google-certified CMP), required for EEA/UK/CH visitors.
3. **Grant placebetsai@gmail.com access to AdSense** (account ihatecollege79), so the bot can check Sites status (marketpicks.ai must be "Ready"), the slot ids and per-site reports.
4. **Submit https://marketpicks.ai/congress/sitemap.xml** in Google Search Console (IndexNow already pinged 2,291 URLs).


## Update Thu Oct 15 ~7:20 AM ET — Senate ingest fixed + bot knows the market session (shipped, backend only, no UI change)

### Senate eFD `no csrf (http 403)`
- Cause: eFD answers 403 to some Cloudflare egress locations. Fetch-triggered runs (colo MIA) and a `wrangler dev --remote` test got 200 through the full flow (home → csrftoken + csrfmiddlewaretoken → agreement POST 302 → /search/report/data/ 200). Scheduled cron runs land in whatever colo is idle, often outside the US, and got 403 on every run.
- Fix (cron/worker.ts, cron/official-ingest.ts, cron/wrangler.toml): every Senate request goes through `SenateProxy`, a Durable Object (SQLite class, migration tag `v1-senate-proxy`, binding SENATE_PROXY) created with `locationHint: "enam"` (Eastern North America).
  - The DO only relays https://efdsearch.senate.gov/ URLs and stores nothing.
  - It returns a JSON envelope (status, location, set-cookies, body), because Set-Cookie did not survive a raw stub response; the first attempt failed with report-data 403 for that reason.
  - If the binding is missing or the DO call throws, it falls back to a direct fetch.
  - On a csrf failure the error now names the worker colo and the start of the page.
- Verified: 5 manual runs plus the scheduled 7:16 AM ET run all indexed 19 Senate PTRs with `last_error` null (previously the error appeared on every scheduled run). /api/health congress ok.
- No fallback dataset was needed. Nothing was invented.
- Senate data state: 688 official_senate_efd rows; newest stock-trade filing is Whitehouse 10/01 (ADI, V, JPM). The newer Senate PTRs hold only bonds, private stock or "Other" (Fetterman 10/07 corporate bonds, Justice 09/28 non-public stock, Blumenthal 09/28 other), so they correctly add 0 rows. I cross-checked from the box with a direct eFD session.
- The token-gated `/api/congress/official-run` now also returns congress_docs counts by chamber/status and the Senate row count/newest date (read-only), which is handy for debugging.

### Bot market session (lib/trader-desk.ts, app/api/chatbot/route.ts)
- `getFacts` also pulls Yahoo's 1-day 5-minute chart with includePrePost (in parallel, ~0 added latency). From `currentTradingPeriod` it sets `session` (pre / regular / post / closed), `closeLabel` ("today's close", "yesterday's close", "Friday's close") and the last pre-market or after-hours print with its % change vs that close and the time in ET.
- Outside the regular session the fact sheet says "last close $X (yesterday's close), -3.16% on yesterday's session" and adds a `session:` line with the pre-market or after-hours price.
- Persona rule 2: never call the last close "today's" move; use DATA's words and give the extended-hours price and % if present. The macro board labels each symbol the same way.
- Answer cache key is now `chat-answer/v7`.
- Live at 7:19 AM ET: "NVDA $221.30, down 3.16% on yesterday's session; pre‑market $217.69 (-1.63%)." Crypto and indexes without pre/post behave as before. Backup of the pre-change desk file: laptop ~/trader-desk.pre-session.bak.

### Git (local only, nothing pushed)
- New commits on wip/local-2026-10-14: 707b59f, e5874d3, 1e39025 (worker), plus c728e5e (macro board labels; what production 79b42864 is built from).
- **Worker deploy note:** Durable Object migrations need `npx wrangler deploy` (template /tmp/mpworker-senate.sh). `versions upload` can't apply migrations.
- The laptop clock ran ~9 min behind the box this morning; use the box or Cloudflare timestamps.


## Update Thu Oct 15 ~7:45 AM ET — three smoke failures fixed, shipped via deploy-safe.sh (ba82c2f0)
Smoke logs that triggered this: box /workspace/audits/smoke-2026-10-15/marketpicks.{txt,json}.

1. **Bot price vs /api/stock (FAIL → PASS).**
   - Before: the bot's headline was Yahoo's last close ($221.30) while /api/stock/NVDA served $217.01 (1.98% off).
   - Now traderDesk reads the site's own quote, `getD1Quote` (the same fresh D1 row /api/stock serves; 1.5s cap), and passes it into `getFacts(sym, ms, live)`. That quote is the headline price and the basis for returns and levels.
   - Off-session the % change is vs the last close, and the fact sheet adds "<yesterday>'s session: x% vs prior close" plus the pre-market/after-hours line.
   - Safety net: if the first $ figure in the answer is more than 1% from the headline, the code prepends "<T> $<price> now.".
   - No D1 row → Yahoo, same as /api/stock's fallback. Cache key `chat-answer/v8`.
   - Live: "NVDA $217.01, down 1.94% vs yesterday's close $221.3 – pre‑market…" vs /api/stock 217.01. AAPL $346.11 = /api/stock 346.11. Smoke: "bot $217.01 vs quote $217.01".
2. **/insider Error 1102 (CPU).**
   - Cause: a force-dynamic SSR on every request. `loadPoliticianTrades(80)` parsed the ~5k-row congress file from the Cache API on cold isolates and re-merged and aggregated all ~5k rows on every request.
   - Fix (no visual change):
     - (a) The edge cache wrapper now caches /insider HTML (s-maxage 300, SWR 3600).
     - (b) `loadPoliticianTrades` memoizes member-less payloads of ≤200 rows in edgeCached `congress:payload:v1:<n>` for 5 min, so a cache-miss render works on 80 rows instead of 5k. Empty payloads are never memoized.
   - Live: 20/20 GETs 200 with no 1102 (x-mp-cache HIT, ~0.15s); 5 forced uncached renders (?nocache) all 200.
3. **Health "grading: unknown".**
   - The hourly grading route (`/api/cron/grading`, worker tick%4==0) recorded nothing.
   - It now writes one `cron_runs` row per run (job "grading", ok = no errors; ~24 rows/day; pruned by the lean cleanup). /api/health already reads cron_runs per job.
   - It stays "unknown" (a smoke WARN, not a fail) until the first post-deploy run at the top of the hour.
   - I deliberately did NOT use prediction_grading_runs.checked_at as a fallback: it may be old and would turn the source "down", which would hard-fail the smoke gate.

Git: merged 4644260 (deploy gate) into wip/local-2026-10-14 (merge a0bf320), then f4717ec. The GA4 commit 01823a4 on origin/live-source was NOT merged. Nothing pushed.
Backups (laptop): ~/trader-desk.pre-siteprice.bak, ~/trader-desk.pre-session.bak.

**Follow-up ~8:18 AM ET (adc58e2 → production 3f92f1a4, via deploy-safe.sh):**
- After ba82c2f0, the 8:00 AM grading run still left health at "unknown". The likely cause: the run marked itself ok only when errorCount==0.
- errorCount also counts per-row data gaps: rows with no logged price, or no market price yet. 125 overdue pending receipts (futures/indexes, resolved 00:01Z) can keep every run "not ok".
- Now a run is ok unless a D1 write fails. Data gaps go in the notes as "skipped N".
- I could not confirm this from D1 directly: the wrangler/API tokens on the laptop get 7403 on D1 queries, and the Cloudflare MCP needs auth.
- Grading should show ok after the 9:00 AM ET run. If it is still unknown, check whether the worker's GET /api/cron/grading returns 401 (CRON_SECRET mismatch) or times out.
- Separate open item: about 125 overdue pending receipts are not being graded (see /api/receipts?outcome=pending). Worth investigating why the grader doesn't resolve them, e.g. slim snapshots without a price, or futures symbols.
- Live verification at 8:20 AM ET:
  - /insider: 20/20 200 with 0 × 1102 (~0.15s); 3 uncached renders 200.
  - Bot "NVDA $217.69" = /api/stock $217.69 (pre-market, vs yesterday's close).
- **Confirmed 9:01 AM ET:** /api/health grading = **ok**, last_success 2026-10-15 9:01:50 AM ET (13:01:50Z), "last ran 0m ago". Overall status operational. All smoke checks are now green.

## Update Thu Oct 15 ~9:15 AM ET — grading backlog (125 overdue pending receipts), production 9653b143 (eca57ef)
**Why the receipts stayed pending:**
- The grader made 2 Yahoo requests per row (at pick time and at resolve time), looping over up to 500 rows. A 125+ row backlog hit the per-invocation subrequest cap, so Yahoo calls failed.
- Rows then fell back to the latest cached quote in D1 `quotes` (which also meant grading old rows against today's price).
- Futures and macro symbols (ES, NQ, NG, BZ, HG, SI, VX, DXY, …) have no `quotes` row under the bare ticker, so they waited forever.
- The "no trading between pick and deadline" rule never moved the deadline, so weekend picks also waited forever.
- Graded rows since Oct 14 all carry `src=cache@…`, which confirms the Yahoo path wasn't working.
- A box simulation shows Yahoo has real hourly closes for all 125 overdue rows across 15 symbols.

**Fix (app/api/cron/grading/route.ts; backup ~/grading.pre-batch.bak):**
- One Yahoo chart request per symbol per run: hourly closes over the window the rows need, with a query2 fallback, a 6s timeout and at most 30 symbols per run.
- Symbol mapping: futures `X=F`, `VX→^VIX`, `DXY→DX-Y.NYB`, `TNX→^TNX`, indexes `^…`, crypto `-USD`.
- The resolve price is the last real close at or before resolves_at.
  - If nothing traded since the pick (weekend), it uses the first real close after the deadline.
  - If the logged pick price is missing or more than 3% off the market, it uses the market close at pick time and notes `replaced_by_market`.
  - The quotes-cache fallback (current price) is removed.
- Void, never guessed:
  - Yahoo says the symbol has no data and the row is 2+ days overdue, or there is still no real price 14+ days past the deadline → `VOID (no data): …`.
  - The schema CHECK allows only pending/correct/incorrect/push. The grader tries outcome='void' first. If the CHECK rejects it, it keeps outcome 'pending', writes `grading_notes = 'VOID (no data): …'` and excludes the row from future scans.
  - `lib/receipts.ts` (backup ~/receipts.pre-void.bak) reports those rows as outcome "void" and leaves them out of "pending". The receipts page shows the word "void"; it already prints outcome text verbatim, so there's no layout change.
- Writes go in batches of 50 per D1 batch, retried row by row if a batch fails.
- cron_runs notes: `scanned/graded/void/waiting/symbols/write errors`.
- Health ok = no write errors.
- Local harness (box /workspace/gtest) on the real 125 rows: all 125 graded in 3 batches, 15 Yahoo requests. The void path was exercised with a bogus ticker.

**Pre-deploy baseline:** 144 pending, 125 overdue (VX 17, DXY 17, TIP 13, ES/NQ/NG/BZ/HG 12 …), 0 void.

**Verified after the 10:00 AM ET grading run (first run on eca57ef):**
- **Pending: 144 → 20.** Overdue pending: **125 → 1.** The one left is IWM, due 10:02 AM ET, just after the run started; the 11:00 run picks it up. The other 19 aren't due yet.
- **127 receipts graded from real Yahoo closes** (`src=yahoo:<sym>@<bar time>`):
  - 115 push, 11 incorrect, 1 correct. Mostly NEUTRAL calls, which grade as push by design.
  - Spot checks: ES→ES=F 7851.00→7743.75; NQ→NQ=F; VX→^VIX 15.27→16.85; DXY→DX-Y.NYB; TIP weekend picks graded at Monday's open bar (`next_session`).
  - One DXY receipt shows +0.00%. That's real: the Yahoo hourly close on Oct 15 at 00:00Z was 102.19, the same as the logged price.
- **Void: 0.** Every overdue symbol had real prices, so the void path wasn't needed. It's tested locally and stays in place for bad or delisted tickers.
- **/api/health:** operational. Grading ok, last_success 10:02:14 AM ET.

## Thu Oct 15 ~10:05 AM ET — directional receipts (7755e22, worker) — SHIPPED 10:14 AM ET, see below
- **Where receipts come from:**
  - Almost all of them come from the cron worker `marketpicks-ai-api`: `runDailyPredictionSlice` logs 3 of 25 watchlist tickers per 15-min tick, 14:00–16:00 UTC (10 AM–12 PM ET).
  - The direction was `getStockSignal().rating` (the engine's Bullish/Neutral/Bearish), and it was mostly Neutral.
  - The chatbot logs no receipts. `/api/resolve` (Pages) logs the occasional `market:etf` receipt; left unchanged.
- **Change (local commit on wip/local-2026-10-14; backups ~/trader-desk.pre-receiptcall.bak, ~/worker.pre-receiptcall.bak):**
  - New pure `receiptCall(facts)` in lib/trader-desk.ts, built on the bot's own fact sheet and `levels()`.
  - When the bot's call is BULLISH or BEARISH, that is logged as the call.
  - When the bot says WAIT, the receipt logs the **lean**, graded on that lean and labelled `conviction:"lean"` in the snapshot. The lean comes from price vs the 20/50/200-day averages, 5d/1m momentum and distance to the 52w high.
  - NEUTRAL only when |score| < 0.75.
  - The worker stores `rating` = direction, `engineRating`, and `call{direction,conviction,botCall,score,why}`.
  - prediction_text (shown on /receipts) is unchanged.
- **Dry run on 35 symbols (live data, 10:20 AM ET):** 15 BULLISH, 20 BEARISH, 0 NEUTRAL (11 of them WAIT→lean).
- **Blocked:** this is a WORKER change. `scripts/deploy-safe.sh` only ships Pages; its `run_worker` exists but isn't wired (no build_worker, never called). It needs Iz/CoS to OK one of two routes:
  - (a) wire a worker mode into deploy-safe.sh, or
  - (b) a one-off `cd cron && npx wrangler deploy`.
  - `wrangler deploy --dry-run` builds clean.

**Shipped 10:14 AM ET via `deploy-safe.sh worker` (Iz approved; no /receipts label change):**
- **Worker version:** **90700d47-b292-4e47-9c09-37f35d0be3c3** (commit c42d7ed), confirmed at 100% with `wrangler deployments status`.
- **Rollback version:** **8cc54059-4b73-4fad-868e-df5d47eb4a14**.
- **Gate:**
  - The scheduled-handler test logged `SPY:BEARISH(lean), QQQ:BEARISH(lean), IWM:BEARISH`.
  - Production site smoke 11/11, 0 warnings.
  - /api/health operational, all sources ok.
- **First run:** the first receipt on the new code is NVDA at 10:16 AM ET (14:16Z). Daily ticks run 10:00 AM–12:00 PM ET; today's 10:00 batch (SPY/QQQ/IWM) was logged by the old code.
- A tick that has already logged a ticker skips it for the rest of the day (dedupe).
- The other bot's uncommitted homepage files (app/page.tsx, app/briefing/, components/Home*.tsx) were not touched. The worker bundle doesn't include them.
