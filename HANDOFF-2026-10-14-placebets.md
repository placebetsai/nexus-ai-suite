# HANDOFF 2026-10-14 — placebets.ai single deploy source

Owner: PlaceBets Bot (sole owner of placebets.ai, per Iz). Verified 2026-10-14 ~07:30 ET via Cloudflare API + gh. No secret values in this file.

## Canonical source (the ONLY one)
| What | Value |
|---|---|
| Repo / branch | `github.com/placebetsai/Placebetsai` · `main` (box checkout `/workspace/tnr/Placebetsai`) |
| CF account | `2765cb2786006552f33cc3dfe0b680a1` (Placebetsai@gmail.com) |
| Pages project | `placebetsai` — custom domains `placebets.ai`, `www.placebets.ai` (both active); production branch `main`; direct upload |
| Prod now | deployment 2026-10-13 11:35 ET, commit `4a6a369` = current `origin/main` HEAD |
| Token | box `/home/box/.cf-tokens` → `WORKERS_TOKEN` (the one that lists account 2765cb27…). `PLACEBETS_TOKEN` there lists no accounts. |

## Deploy commands
```bash
cd /workspace/tnr/Placebetsai && git checkout <branch> && npx @cloudflare/next-on-pages   # builds .vercel/output/static
export CLOUDFLARE_ACCOUNT_ID=2765cb2786006552f33cc3dfe0b680a1 CLOUDFLARE_API_TOKEN=<WORKERS_TOKEN>
# Preview (any branch != main):
wrangler pages deploy .vercel/output/static --project-name placebetsai --branch <preview-branch>
# Production (only after Iz says "ship it", from main):
wrangler pages deploy .vercel/output/static --project-name placebetsai --branch main
```
Verify prod: `curl -s https://placebets.ai/api/odds | jq '{source,coverage:[.coverage[].key]}'` and `POST https://placebets.ai/api/chatbot {"query":...}`.

## Rule
Any UI / mobile / chatbot-behaviour change → preview deploy first → Android (Pixel) screenshots → wait for Iz's literal "ship it" → then prod. Proof = pasted live output only.

## DO NOT USE
- **`placebets-ai` on Nexus account `7eb89b01…77f8`** (fashionistas1979@gmail.com). Exists, only `placebets-ai.pages.dev`, no custom domain; last deploy 2026-10-11 (`2dd74a9`). `HANDOFF-2026-10-06.md` §deploy table (line 91) says `wrangler pages deploy … --project-name=placebets-ai` from `Placebetsai-src` — **wrong target**; deploys there never reach placebets.ai. `deploy.sh` also maps `placebets-ai` → CF (Nexus) token. Treat as dead.
- **`placebets-ai-v2`** on PlaceBets account — stale, last deploy 2026-05-17, no custom domain.

## Retired / flagged copies
| Copy | Status |
|---|---|
| `Placebetsai-src` | Not present on the box. Its last known commits (`2dd74a9`) are already in `origin/main`. Retired. |
| `~/pb-grok` redesign-preview | Not present on the box. Any redesign must be re-proposed as a branch of Placebetsai. Flagged. |
| "main working copy" (likely Iz's laptop) | Unreachable/unchecked. If it has commits, push them as a branch to placebetsai/Placebetsai; never deploy from it. |
| `/workspace/placebets-preview`, `/workspace/placebets-qa`, `/workspace/fash-mobile-qa5/placebets` | QA artifacts only (JSON/screens), not code. |
| Box checkout local state | 2 stashes on main (old chatbot / homepage-events WIP from Sep, superseded); 3 local Sep branches with 0 commits beyond main. Nothing deleted. |

## Open items (refreshed 2026-10-14 ~10:25 AM ET, after Chatbot fix 2 ship)
1. Homepage perf: ~17s total blocking time (main JS chunk + ticker) — needs its own perf PR.
2. No priced futures market in the feed → "next year" answers say no priced market. Find a real championship odds source.
3. Champion answers read like Wikipedia — consider a bookie-voice wrapper that stays deterministic (templated, no LLM).
4. Internal source tags (e.g. `no_line_for_matchup`, "Wikipedia") visible under answers — hide/humanize.
5. lib/__tests__/chatbot-quality.test.mjs: Knicks-typo SUBJECT case fails (also on main before #18).
6. ~~Real-line answers omit "As of … ET" / quote "92% of bets"~~ — CLOSED: shipped to prod in Chatbot fix 3 (2026-10-14 ~11:32 AM ET).
7. AdSense dashboard (Iz): enable Anchor ads; optional in-feed unit for the odds board.
8. Affiliate links — top revenue gap (none on site).
9. The Odds API source has never succeeded in cron health.
10. Prod KV namespace id looks invalid — verify binding.
11. deploy.sh still points at `placebets-ai` (Nexus account) — fix or treat as DO NOT USE.
12. Old git stashes on the box main working copy (/workspace/tnr/Placebetsai) — review/drop.
13. ~~Champion phrasing gap~~ — FIXED ON PREVIEW (Chatbot fix 4), awaiting Iz "ship it". See section below.

## Valuation findings (2026-10-14; full report /workspace/placebets-valuation-2026-10-14.md on the box)
- Top gap: no sportsbook affiliate links (FanDuel/DraftKings/BetMGM/Caesars/Fanatics + state registrations), so no revenue.
- Budget for a paid, licensed odds feed (scraped sources are fragile + legal risk); add real futures.
- Set up Google Analytics + Search Console. Build per-game/team pages and email/push alerts.
- A public, timestamped pick track record + bet tracker and line-movement alerts are the moat.
- Ads: Google restricts gambling-promoting content (allowed for US viewers). Plan direct sportsbook sponsorships alongside AdSense.

## Production ship — 2026-10-14 ~9:53 AM ET (Iz: "ship it")
- PR #16 (chatbot exact-matchup + champion year) merged: `d369b56`
- PR #17 (ads/SEO/compliance) merged: `1257e69` (main HEAD)
- Deployed with Wrangler to Pages project `placebetsai`, branch `main` (production): https://21a5da3a.placebetsai.pages.dev → placebets.ai
- Rollback target if needed: previous production deployment (commit 4a6a369).

### Live verification (placebets.ai)
- PASS: homepage 200, footer "21+ | Gambling Problem? Call 1-800-GAMBLER", no "shit", adsbygoogle present, no noindex header
- PASS: /responsible-gambling, /games/slots 200; /legal-states 200 (first hit 404 from edge cache, 200 after cache-bust)
- PASS: /ads.txt text/plain `google.com, pub-7215975042937417, DIRECT, f08c47fec0942fa0`
- PASS: /api/odds 233 events, 15 leagues (MLB, NBA, NFL, NHL, WNBA, college FB, EPL, La Liga, etc.)
- PASS: "Who wins Yankees vs Red Sox tonight?" → says no line for Yankees, no game swap
- PASS: "Who wins Brooklyn Nets vs Miami Heat?" → real moneyline (MIA -290); UI shows "Odds checked 9:56 AM ET"
- INTERMITTENT FAIL: "Who won the NBA title in 2026, who's winning next year" → 1 of 4 live tries answered Knicks 2026 (Wikipedia, no boxing note); 3 of 4 got replaced by last night's ESPN NBA scores. Cause: the `claimsNoLiveData` gate (chatbot-placebets.js ~L3241 and the final sweep ~L3409) rewrites the model's "no priced futures" wording into a `buildLiveScoreAnswer` scoreboard. NBA preseason scores are now in the feed, so this shows up. Fix: skip that rewrite when the champion/knowledge path ran (or when liveResultsAsk(query) is false). Not rolled back, because the previous production gave the wrong year plus the boxing note.
- Screenshots: /workspace/placebets-preview/live-homepage.png, live-chatbot.png (Pixel 412x915)

## Next
1. Fix the claimsNoLiveData override for champion + next-year asks (above). Preview first.
2. Homepage perf: ~17s total blocking time.
3. AdSense dashboard (Iz): turn on Anchor ads; optional in-feed unit for the odds board.

## Chatbot fix 2 — SHIPPED 2026-10-14 ~10:18 AM ET (Iz: "ship it")
- Merge commit: `979933e` (PR #18 normal merge into main)
- Production deployment: https://ed7d5097.placebetsai.pages.dev (project `placebetsai`, branch main, Wrangler) → https://placebets.ai. Rollback target: deployment 21a5da3a.
- Live verification (POST https://placebets.ai/api/chatbot, 3x each):
  - NBA 2026 + next year: Knicks over Spurs 4–1, no scoreboard, "no complete priced futures market" — 3/3 identical.
  - Yankees vs Red Sox: "No line posted … not swapping in a different game … Want today's MLB board? As of … ET" — 3/3, no other-game lean.
  - Super Bowl 2026 + next year: Seahawks over Patriots 29–13 + no priced futures — 3/3.
  - Real line Nets @ Heat (BKN +240 / MIA -300): 2/3 deterministic with "As of 10:19/10:21 AM ET"; 1/3 LLM lean (Heat -300) without As-of (open item 6).
  - Homepage 200, /legal-states 200, /ads.txt 200 (google.com, pub-7215975042937417, DIRECT).
  - Screenshot (Pixel 412x915): /workspace/placebets-preview/live2-nba.png
- (Original preview notes below.)
### Preview notes (2026-10-14 ~10:10 AM ET)
- PR #18: https://github.com/placebetsai/Placebetsai/pull/18 (branch `fix/chatbot-champion-noswap-2026-10-14`, off main `1257e69`)
- Preview: https://chatbot-preview-2.placebetsai.pages.dev (Wrangler, `--branch chatbot-preview-2`; production untouched)
- Changes (lib/llm/chatbot-placebets.js):
  1. Champion/knowledge path is deterministic (Wikipedia fact + `futuresTailFor` tail, no LLM draft). Champion/futures results carry an internal `no_swap` flag; the no-live-data gate and the final sweep never swap a scoreboard into a champion/futures answer, any league (they drop only an offending sentence).
  2. Asked team/matchup not on the board → deterministic "No line … Want today's <league> board?" — no lean on another game. Matchup detection now uses every league's nicknames + Red Sox/White Sox/Blue Jays/Maple Leafs/Trail Blazers/Golden Knights (Red Sox was missing, which sent Yankees–Red Sox to the LLM path that leaned on Dodgers).
  3. Real-line LLM answers always include "As of h:mm AM ET".
- Preview verification, 5x each, identical every run: NBA 2026 + next year (Knicks, no scoreboard), Super Bowl 2026 (Seahawks over Patriots 29–13), Stanley Cup 2026 (Hurricanes over Golden Knights), Yankees vs Red Sox (no line + "Want today's MLB board?"), Bulls vs Bucks (real ML CHI -130 / MIL +110, "As of … ET").
- Screenshots (Pixel 412x915): /workspace/placebets-preview/fix2-*.png
- Known: preview futures feed returned no complete NBA/NFL/NHL market, so "next year" says no priced market (local run had NFL/NHL futures). lib/__tests__/chatbot-quality: knicks-typo SUBJECT case fails on main too; pushback arithmetic case is LLM-flaky.

## Chatbot fix 3 — SHIPPED 2026-10-14 ~11:32 AM ET (Iz: "ship it" 11:30 AM ET)
- Merge commit on main: 91d21ff (https://github.com/placebetsai/Placebetsai/commit/91d21ff21fb608367f9309d757921d5294832043), git merge --no-ff (no PR opened).
- Production deploy: https://13c11646.placebetsai.pages.dev → placebets.ai. Rollback target: 21a5da3a (or ed7d5097 = 979933e).
- Live verification on https://placebets.ai/api/chatbot, 5x each vs live /api/odds: Nets @ Heat 5/5, Hornets vs Celtics 5/5, NBA 2026 + next year (Knicks) 5/5, Yankees vs Red Sox (no line, no swap) 5/5, Super Bowl 2026 (Seahawks 29–13) 5/5. All with As of ET, no invented stats. Homepage, /legal-states, /ads.txt all 200.
- Live screenshot (Android 412x915): /workspace/placebets-preview/live3-realline.png — self-reviewed: Nets +250 / Heat -310, Heat -7.5, O/U 232.5 (matches /api/odds at 11:38 AM ET after line moved from -305), As of 11:38 AM ET, no betting stats.

### Preview notes (fix 3)
- Branch: `fix/chatbot-realline-deterministic-2026-10-14`, commit 66ae650. PR not opened yet — compare: https://github.com/placebetsai/Placebetsai/compare/main...fix/chatbot-realline-deterministic-2026-10-14
- Preview: https://chatbot-preview-3.placebetsai.pages.dev (deploy https://45720828.placebetsai.pages.dev). Prod NOT deployed; rollback target remains 21a5da3a.
- Root cause: real-line odds path built the grounded answer, then sent board data to the LLM for "polish" and served LLM text whenever it passed gates that only checked American-odds tokens + injuries → invented "92% of bets / 52% of money" slipped through, and that path never stamped "As of … ET". Fallback was degraded because `parseMoneylineBlock` regex couldn't parse `+250 (implied 28.6%)`.
- Fix: exact matchups with a real moneyline skip the LLM entirely (deterministic ML + implied %, team-labelled spread, O/U, As of ET); parser fixed + reads structured event; new `fabricatedBettingStats` filter in `enforceGroundedAnswer` + final POST sweep; Reddit chatter with % dropped; champion facts cached 1h + one retry (fixed 2/10 "Couldn't pull a live Wikipedia read"); champion answers now carry As of ET.
- Preview verification, 10 runs each vs live /api/odds: Nets @ Heat 10/10, Hornets vs Celtics 10/10, NBA 2026 + next year (Knicks over Spurs) 10/10, Yankees vs Red Sox (no line, no swap) 10/10, Super Bowl 2026 (Seahawks 29–13) 10/10.
- Screenshot (Android 412x915): /workspace/placebets-preview/preview3-realline.png — self-reviewed: real lines, As of 11:25 AM ET, no betting stats, no truncation.

## Chatbot fix 4 — PREVIEW ONLY, awaiting "ship it" (2026-10-14 ~12:06 PM ET)
- Branch `fix/chatbot-champion-phrasing-2026-10-14`, commit ca6680b (off main 91d21ff). PR not opened — compare: https://github.com/placebetsai/Placebetsai/compare/main...fix/chatbot-champion-phrasing-2026-10-14
- Preview: https://chatbot-preview-4.placebetsai.pages.dev (deploy https://e96e5cf6.placebetsai.pages.dev). Prod NOT deployed; prod stays 13c11646 (fix 3), rollback 21a5da3a.
- Root cause: `isSportsKnowledgeQuery` bailed on any "who will win" in the text, so compound asks ("who won the 2026 NBA championship and who will win next year") fell to the futures path; other phrasings (champs, rings, won it all, sport words, 2025-26 seasons) weren't recognised or hit news/live-score paths first.
- Fix: new `championFactAsk` + `canonicalChampQuery` (champs/rings/won it all/finals/title, year before or after, season years 2025-26→2026, basketball/hockey/baseball/football→league), routed right after out-of-domain before news/live-scores/futures; pure futures ("who will win the NBA title next year", "2027 Super Bowl", "championship odds") still go to futures. Next-season futures tail detection broadened. Fail soft "not inventing a champion" + As of ET.
- Preview verification: 17 champion phrasings × 3 = 51/51 (NBA/Knicks, Super Bowl/Seahawks 29–13, World Series 2025/Dodgers, Stanley Cup/Hurricanes; compound asks carry a next-season futures line or "no complete priced futures"). Regression ×5: Nets @ Heat (matches /api/odds) 5/5, Yankees vs Red Sox 5/5, Super Bowl 2026 5/5. All with As of ET, no invented stats.
- Screenshot (Android 412x915): /workspace/placebets-preview/preview4-champ.png — self-reviewed: Knicks over Spurs 4–1, next-season no-priced-market note, As of 12:06 PM ET.
- Known (pre-existing): NBA futures feed is stale (GSW +6000 leader in pure futures answers) — item 2.

## Chatbot + data overhaul (fix 5) — IN PROGRESS (started 2026-10-14 ~12:20 PM ET; Iz: "build the overhaul first, ship everything together")
Branch: `feat/chatbot-intent-router-2026-10-14` (off fix 4 `fix/chatbot-champion-phrasing-2026-10-14` ca6680b — fix 4 bundled, ships together). Preview only: `--branch chatbot-preview-5`. Prod stays 13c11646 (fix 3); rollback 21a5da3a. No prod deploy/merge without Iz "ship it".

### Plan / scope
1. **Intent router (stop regex whack-a-mole):** LLM intent/slot extractor (existing provider chain: Groq → MiMo → Workers AI binding `AI`) returns validated JSON {intent: game_odds|pick|past_champion|futures|scores|news|parlay|explain|responsible_gambling|off_topic|general, league, teams, year, next_season, canonical query}. Short timeout + memo; falls back to current rules on LLM failure. LLM never produces numbers — answers stay deterministic from /api/odds, ESPN scores, Wikipedia champion facts, futures feed, with "As of … ET"; grounding + invented-stat filters kept.
2. **Data layer (A):** audit D1 `DB` + `MARKET_DATA_DB` (schema, row counts/league, freshness, stale/duplicate rows); fix prod KV binding (ID looks invalid); dead The Odds API source; stale futures feed (NBA leader Warriors +6000); champion facts cache. Ingest so every board league + futures has fresh timestamped data; freshness checks; bot refuses stale data (fail soft). Real sources only.
3. **Eval bank (B):** 1000+ questions (all board leagues, phrasings, typos, slang, compound, no-line games, futures, champions across years, props, live, parlays, responsible gambling, off-topic, real past user queries from logs with no PII). Programmatic checks (lines match /api/odds, As-of present, no invented stats, champion facts, no game swap) + LLM-as-judge; p50/p95 latency; LLM-down fallback run. `npm run eval -- --base <url>`.
4. **Daily live eval (C):** script reporting failures only.
4b. **Factual-knowledge layer (Iz: "why not Google + Wikipedia"):** Wikipedia/Wikidata APIs for champions, records, history across all leagues/years, cached in D1/KV with fetched-at timestamps; web-search fallback (existing configured search API, or Google Programmable Search / Brave if a key is present — otherwise the needed key is listed here) for facts not in our DB. Answers cite their source. Odds/lines come ONLY from the live odds feed, never from search.

### Acceptance bar (hard ship gate)
- Eval bank ~100% pass on preview (genuinely unanswerable items listed, answered fail-soft); 0 invented odds/stats; 0 game swaps; As-of on every data answer.
- LLM-down run passes the same checks via rule fallback.
- p95 latency reasonable (target < 8s; p50 < 3s).
- Data audit findings + freshness checks documented; no stale futures served as current.
- Android 412x915 screenshots (preview5-*.png) self-reviewed; then Iz "ship it".

## Fix 5 — STATUS UPDATE 1:40 PM ET (preview built + evaluated, NOT shipped)
Preview: https://chatbot-preview-5.placebetsai.pages.dev (deploy 05632080). Branch feat/chatbot-intent-router-2026-10-14 (includes fix 4 ca6680b), pushed.
Compare: https://github.com/placebetsai/Placebetsai/compare/main...feat/chatbot-intent-router-2026-10-14
Production untouched (main 91d21ff). Waiting on Iz "ship it".

**Eval (`npm run eval -- --base <url>`, 1026 items, graded vs production board the bot reads):**
- LLM router on: 1026/1026, p50 516 ms, p95 4341 ms.
- LLM-down (`--llm-down`, rules only): 1025/1026 (1 = line moved mid-run, right game), p50 28 ms, p95 4050 ms.
- Ship gate: must stay >=99% and 0 invented_stat / odds_on_offtopic / leg_not_on_board.
- LLM-as-judge (`--judge`) wired but NOT run: needs GROQ_API_KEY on the runner.
- Daily failures-only eval: `npm run eval:daily`; GitHub workflow template at scripts/eval/daily-eval.workflow.yml (token lacks `workflow` scope; copy into .github/workflows by hand).

**Done:** LLM intent/slot extractor (lib/llm/intent.js; numbers never from LLM; rules fallback), exact two-nickname board matchup fast path, rule slots override LLM year/league, Wikipedia/Wikidata champions layer (cited, KV cached), typo fixer w/ protected city/2-word nicknames, futures refused unless a complete market, board >3h stale refused, no-data LLM numeric gate, RG helpline, parlay legs priced from the served board, preview AI+KV bindings.

**Data audit:**
- MARKET_DATA_DB `games`: 2,578 rows; 1,275 >1 day past; 414 dup matchup+date; mixed timestamp formats; duplicate sport labels (LaLiga/LALIGA, SerieA/SERIEA, Ligue1/LIGUE1); no odds_updated_at for Brasileirao, LigaMX, Eredivisie, SuperLig, LigaPortugal, WTA, ATP, F1, PGA.
- Cleanup SQL written, NOT applied (destructive on prod D1, needs Iz OK): migrations/proposed/2026-10-14-games-cleanup.sql.
- cron_health: games-ingest never succeeded (D1 timeout 2026-07-15); espn + kalshi last ok 2026-08-17; scrape-sports + thesportsdb fresh. Kalshi markets (53) stale since June; Polymarket fresh.
- KV: prod Pages has NO KV binding; wrangler.toml id "placebets-cache" was a title not an id, and Pages ignores wrangler.toml anyway. Preview now bound to 7558ad9c… Prod needs the same in dashboard at ship time.
- The Odds API: dead because no THE_ODDS_API_KEY/ODDS_API_KEY in prod env.
- Futures: NBA feed is a stale 3-team remnant (Warriors +6000); bot now refuses incomplete markets.
- chat_logs: 0 rows, so no real user queries to mine.
- Web search: only Wikipedia + DuckDuckGo lite. Need BRAVE_API_KEY (or GOOGLE_CSE_KEY + GOOGLE_CSE_CX).
- Preview /api/odds serves 169 events vs prod 256 (preview has no D1 binding); bot reads prod board so answers are unaffected.

**Remaining:** apply D1 cleanup + fix games-ingest timeout; add KV/AI bindings to prod at ship; add THE_ODDS_API_KEY or retire source; search key; run LLM-judge; install daily workflow; remove/keep harmless `diag`/`llm_down` request flags; cosmetic "Spread TB -245" (ML shown as spread for NHL) in board line formatter.

## Fix 5 — UPDATE 2:00 PM ET (preview only; deploy 690cc0fb → chatbot-preview-5)
Branch head pushed: feat/chatbot-intent-router-2026-10-14. Production untouched.
- **Spread formatter:** a moneyline in the spread field ("Spread TB -245") is no longer shown; spread printed only if it is a real handicap (|n|≤60). Parlay spread legs guarded the same way.
- **games ingest D1 timeout fixed in code** (app/api/cron/ingest-games): chunked `db.batch` writes of 50 (was 1 round trip/row), schema DDL once per isolate, `games-ingest` health row (success or error), dedupe by sport+matchup+date. Verified against a mock D1 only (360 rows → 8 batches + 1 health batch); NOT run against prod.
- **Runtime self-verification** (lib/verify/answer-verify.js, last step in POST): every "<board team> <price>" re-checked vs live board (consensus + books); mismatch → replaced with the board's true line; missing As-of appended; board >3h → refuse; failures logged to MARKET_DATA_DB `chat_verify_failures` (prod only; preview has no D1). Response carries `verified:{checked,ok,...}`.
- **Freshness monitor:** GET /api/health/data — per-league odds_updated_at, age, upcoming 48h, stale flag (>3h with upcoming games), board_stale. /api/odds now adds `staleLeagues` + `ev.stale`; board shows a STALE badge; bot appends "⚠️ Stale data: <league> odds last updated Nh ago".
  - Note: /api/odds `updatedAt` is generation time (always "now"), so per-league D1 timestamps are the real freshness signal.
- **Canary:** `npm run canary -- <base>` = 50 rotating questions (seeded by 30-min slot, all categories), ~25 s, failures-only, JSON summary, exit 1 on failure. Run every 30 min.
- **Eval gate before every deploy:** `scripts/ship/deploy-gated.sh <branch>` builds → deploys `gate-candidate` preview → full eval `--gate 99` (also fails on any invented_stat / odds_on_offtopic / leg_not_on_board / invented_prop_line / dead_end) → only then deploys `<branch>`. `main` refused unless SHIP_IT=1. `npm run eval:gate -- <base>` for gate alone.
- **Results:** gated deploy 1019/1026 (7 = transient HTML edge errors on the fresh candidate; eval now retries + reports them); rerun on chatbot-preview-5: **1026/1026, 0 hard failures, p50 520 ms, p95 4355 ms**. Canary 50/50.
- Screenshot: /workspace/placebets-preview/preview5-matchup2.png (Bears @ Falcons: real spread Falcons +2.5, As of shown).

### D1 games cleanup — APPROVED by Iz (2026-10-14) for SHIP TIME, backup first
Do NOT run before "ship it". Then run `scripts/ship/d1-games-cleanup.sh`:
1. record Time Travel restore point; 2. `wrangler d1 export prediction-market-data --remote` → /workspace/backups/<db>-<ts>.sql + sha256;
3. verify games row count in dump == live count (abort on mismatch); 4. copy to R2 `placebets-backups/d1/` (bucket must be created first: `npx wrangler r2 bucket create placebets-backups`; only existing bucket is forge-projects);
5. apply migrations/proposed/2026-10-14-games-cleanup.sql; 6. report counts; rollback = `wrangler d1 time-travel restore` to the recorded point.
Other ship-time steps: add KV (7558ad9c…) binding to production Pages; deploy via deploy-gated.sh main with SHIP_IT=1; install 30-min canary + daily eval workflows (token lacks `workflow` scope).

## Fix 5 — SHIPPED 2:22 PM ET (Iz: "GO / ship it")
- **Merge:** a38e7ed into main (plus f8dd2b1 eval-only tweak). Production deploy: https://ecddd446.placebetsai.pages.dev → https://placebets.ai (eval-gated via `SHIP_IT=1 scripts/ship/deploy-gated.sh main`; gate candidate 17f533ad: 1026/1026, 0 hard).
- **Rollback:** previous prod = 91d21ff build 13c11646 (older: 21a5da3a, ed7d5097). D1 Time Travel restore point 2026-10-14T18:12:39Z.
- **D1 cleanup DONE:** backup /workspace/backups/prediction-market-data-20261014-141149.sql (17.2 MB, sha256 OK) and R2 placebets-backups/d1/ (byte-verified). games live=2580 = dump 2580 (verified before running).
  Before: 2580 rows, 1275 past, 415 dups, 32 sport labels. After: 1159 rows, 0 past, 0 dups, 29 labels.
- **Bindings:** production Pages now has KV (7558ad9c…) + AI; D1 DB, MARKET_DATA_DB and env vars kept.
- **Live verification:** / , /legal-states, /ads.txt, /api/health/data all 200. Canary 50/50 (p50 1088 ms, p95 7730 ms).
  Full live eval: 1018/1026. The 8 misses were parlay legs graded against a 60 s-old board snapshot while prod lines moved; every quoted price was on the live board, and the in-bot verifier passed them. Re-run of parlay: 40/40. Eval snapshots are now 15 s. No rollback.
- **/api/health/data (live):** d1=true, board fresh. 29 leagues tracked. Stale = CHAMPIONSTOUR, EREDIVISIE, LPGA, PGA, SUPERLIG, WTA (games but no odds timestamps — ingest gap from audit). NBA/NFL/NHL/MLB/MLS/soccer ages 0–2 min.
- Screenshot: /workspace/placebets-preview/live5-matchup.png (Bears @ Falcons, real spread +2.5, As of 2:21 PM ET).
- **Next:** fill odds timestamps for the 6 stale leagues; schedule `npm run canary -- https://placebets.ai` every 30 min + daily eval (needs workflow-scoped token or cron box); Odds API key or retire; Brave/Google search key; Groq key for LLM-judge runs.

## Live monitoring (since fix 5 ship) — 4:45 PM ET
- Monitor routine is running: /api/health/data every 15 min, plus the 50-question canary (`npm run canary -- https://placebets.ai`) at :22 and :52.
- All clear so far. The canary has gone 50/50 on several runs. Major leagues are fresh. The only stale ones are the 6 known minor leagues (CHAMPIONSTOUR, EREDIVISIE, LPGA, PGA, SUPERLIG, WTA).

## Fix 6 — IN PROGRESS (branch feat/fix6-freshness-latency-affiliate, PREVIEW ONLY: chatbot-preview-6)
**Scope:**
1. Odds freshness for the 6 stale leagues, or honest marking where no real odds source exists.
2. Make /api/health/data read the board without a self-fetch.
3. Get p95 latency under 3 s without failing the gates.
4. Fix the ~17 s homepage freeze.
5. Affiliate CTA scaffolding: config-driven, state-aware, follows /legal-states, 21+/RG disclosures, rel=sponsored nofollow, OFF until real IDs exist; list of programs to apply to.
6. Full eval + canary gate, Android screenshots, handoff.

**Progress so far:**
- (1) scrape-sports now writes odds_updated_at on every moneyline write and keeps the last moneyline instead of nulling it. That covers EREDIVISIE and SUPERLIG, which have DraftKings lines via ESPN.
  - Golf and tennis (PGA, LPGA, CHAMPIONSTOUR, WTA) have no moneyline source at all, so they're reported as `no_odds_source` rather than stale. They were already hidden from the board.
- (2) Done: the odds handler is called in-process. On preview, board_updated_at is populated.
- (3) Root cause: Pages Function responses are never edge-cached (cf-cache-status DYNAMIC), so /api/odds recomputed in 4–7 s on every read. Changes:
  - Added a Cache API wrapper: fresh under 60 s, stale-while-revalidate up to 10 min.
  - The bot reads the board in-process on the same cache key.
  - Futures memo plus edge-cached ESPN subrequests; predict cap cut to 2 s, and no-line asks skip waiting on it.
  - Glossary/board/props fast routes.
  - **Preview eval 1026/1026, p50 518 ms, p95 887 ms (was 4.4 s).**
- (4) Diagnosed: the homepage fires /api/odds 3–4 times in parallel with `?_t=` cache-busting (each one recomputed in ~6 s), from HomePageClient, SportsbookHomepage, Navbar and GlobalTicker. Fix in progress: one shared client fetch plus the cached endpoint.
- (5), (6): next.

## Fix 6 — READY ON PREVIEW 5:00 PM ET (NOT shipped; waiting on Iz "ship it")
Preview: https://chatbot-preview-6.placebetsai.pages.dev (deploy 97191583). Branch feat/fix6-freshness-latency-affiliate (head bb006e8).
Compare: https://github.com/placebetsai/Placebetsai/compare/main...feat/fix6-freshness-latency-affiliate

**Gate (eval-gated deploy):** full eval 1026/1026, 0 hard failures, **p50 488 ms, p95 909 ms** (fix 5: p95 4.3–4.5 s). Canary 50/50, p95 2.2 s. Both runs graded against the candidate's own board.

1. **Freshness:**
   - scrape-sports now writes `odds_updated_at` on every moneyline write and keeps the last moneyline instead of nulling it. This covers EREDIVISIE and SUPERLIG (DraftKings via ESPN).
   - PGA, LPGA, CHAMPIONSTOUR and WTA have NO moneyline source (outrights or schedule only, 0 moneyline rows). They are now reported as `no_odds_source`, not stale, and stay off the board.
2. **/api/health/data** calls the odds handler in-process. board_updated_at is populated and `board_error` is reported.
3. **Latency root cause:** Pages Function responses are never edge-cached (cf-cache-status DYNAMIC), so /api/odds recomputed in 4–7 s on every read. Changes:
   - Cache API wrapper on /api/odds: fresh under 60 s, stale-while-revalidate up to 10 min. Response headers x-pb-cache and x-pb-age-s.
   - The bot reads the board in-process on the same cache key.
   - Futures memo plus edge-cached ESPN subrequests; predict cap 2 s, and skipped when there's no line.
   - Glossary fixes (PK, "over under", vig); "what NFL games…" routes to the board; generic prop asks get an honest no-feed answer.
4. **Homepage freeze root cause:** 3–4 parallel cache-busted /api/odds?_t= fetches (HomePageClient, SportsbookHomepage, Navbar, GlobalTicker; SignalBoard also no-store), each a ~6 s recompute.
   - Now one shared client read (lib/client/board-client.js, 30 s memo) on top of the cached endpoint.
   - Logos use 96 px ESPN thumbnails instead of the 500 px originals (up to 150 KB each).
   - Pixel 4x-CPU test: one /api/odds at ~0.3 s (was 3 × ~6 s); long tasks 914 ms total (was 1.8 s).
   - The preview's HTML TTFB is still 3–5 s because the preview has no D1 binding; prod uses the D1 fast path (~1.4 s).
5. **Affiliate scaffolding (OFF):**
   - lib/affiliates/config.js: AFFILIATES_ENABLED=false, every trackingUrl null, no IDs invented.
   - lib/legal-states.js is now the shared source for /legal-states.
   - /api/geo uses CF region and stores nothing.
   - components/SportsbookCTA.js renders only when enabled + legal state + a real link exists. It carries "Ad · Sponsored", 21+, the legal-states link and 1-800-GAMBLER, with rel="sponsored nofollow noopener noreferrer". `?cta_preview=1` shows an inert layout preview.
   - Program list in AFFILIATES.md: DraftKings draftkings.com/affiliates (verified); FanDuel affiliates.fanduel.com/registration.asp (official, blocks bots); BetMGM betmgmpartners.com (verified); Caesars caesarsaffiliates.com (verified); bet365 bet365partners.com/en (verified); Fanatics Sportsbook NOT verified (fanatics.com/affiliates is the merch program; fanaticspartners.com is parked).
6. **Screenshots:** /workspace/placebets-preview/preview6-home.png, preview6-oddscard-cta.png (CTA moved full-width under the cards after a layout bug).
- **Deploy gate** now grades against the candidate's own board and also requires the canary to pass.
- **Needs Iz:**
  - "ship it" for fix 6.
  - Apply to the affiliate programs; several states need an affiliate/vendor license (NY, NJ, PA…).
  - Fanatics sportsbook contact.
  - Optional: add D1 to preview for prod-like TTFB.

## Fix 7 — Programmatic SEO odds pages (PREVIEW ONLY, not shipped)
- Branch `feat/fix7-seo-game-pages` (head 8db0e7b, stacked on fix 6 — ship together). Preview: https://chatbot-preview-7.placebetsai.pages.dev (deploy 3028d427).
- Routes: `/odds`, `/odds/<league>` hubs, `/odds/<league>/<away>-vs-<home>-<YYYY-MM-DD>` games, `/odds/<league>/<team>` teams. Real board data only (ML/implied/open, spread, total, best price, As of ET), ESPN recent results, deterministic summary, FAQ, chatbot `?ask=` deep-link, RG/legal notes, 1 in-content ad, affiliate CTA off.
- SEO: unique title/meta, canonical, SportsEvent+BreadcrumbList+FAQPage JSON-LD, `/sitemap-index.xml` + `/sitemap-odds.xml`, revalidate 300, noindex on final/old/no-line games and teams with no priced game.
- FAB hides while any `[data-fab-avoid]` (CTA disclosure, RG note) is visible. Mobile nav "More" → "Contact" (Lighthouse link-text).
- Gate: eval 1026/1026 (p95 787ms), canary 50/50; page test (`scripts/seo/page-test.mjs`) 707 pages/0 fail earlier, 460 pages/0 fail at 5:55 PM ET (count shrinks as games finish); Lighthouse mobile SEO 100, perf 90–92 on game/hub/team; /games 25/25 200.
- Screenshots: /workspace/placebets-preview/preview7-{game,hub,team}.png.
- Known: Ask FAB overlaps the right edge of the bottom nav (pre-existing). Next: Iz "ship it" → merge fix6+fix7 → `SHIP_IT=1 scripts/ship/deploy-gated.sh main`, then submit sitemap-index in GSC.
- Update (6:00 PM ET): Ask FAB now sits above the mobile bottom nav (`bottom: calc(64px + safe-area + 12px)`, smaller pill) on all pages; it still hides over `[data-fab-avoid]` CTA/RG disclosures. `deploy-gated.sh` now runs `scripts/seo/page-test.mjs` against the gate candidate after the canary (fails the gate on any page failure). Branch head 54f0250; preview-7 redeployed (54922f41): eval 1026/1026, canary 50/50, page test 460 pages/0 fail. Screenshots preview7-{game,hub,team,home}.png re-reviewed: no nav overlap.
- Update (6:25 PM ET) — PFL stale fix: no real PFL odds source exists (ESPN mma/pfl scoreboard + core odds return 0 items; BetBetter has no pfl/mma feed; no Odds API key). Fetchers: `app/api/cron/scrape-sports-espn` (`mma/pfl`), `lib/oddsSources.js`. Classification made generic in `lib/verify/freshness.js`: a league is `no_odds_source` (never stale) when it has no ML rows, or zero priced upcoming games AND no line update in 7 days; board-side, a league with events but zero priced events is also `no_odds_source`. `/api/odds` now drops odds-less events of leagues with zero priced events; SEO pages/sitemap/page test only include priced games. Run against prod D1+board: stale = SUPERLIG only (1 upcoming game with an untimestamped old line — genuinely stale); no_odds_source = ATP, BRASILEIRAO, CHAMPIONSTOUR, EREDIVISIE, F1, LIGAMX, LIGAPORTUGAL, LPGA, NPB, PFL, PGA, WTA. Head 99dff5c; preview-7 deploy 777af29c: eval 1026/1026, canary 50/50, page test 735 pages/0 fail. Preview /api/health/data ok:true (preview has no D1, so league table is board-only there).

### Fix 7 addendum — odds-source research for "no odds source" leagues (7:05 PM ET, preview only)
Branch head after this work: see `git log feat/fix7-seo-game-pages` (commits 00a07eb + sport-normalize follow-up). Preview-7 gate: eval 1026/1026, canary 50/50, page test 574 pages/0 fail.
Probed live (Oct 14): ESPN scoreboards carry DraftKings lines for ned.1/mex.1/por.1/bra.1/tur.1 → added to the board (same ESPN source/ToS posture as EPL/La Liga). Now on board: Eredivisie 9, Liga MX 9-13, Liga Portugal 1, Brasileirão 10, Süper Lig 7, all priced. Golf: `/odds/golf` outright (major winners) from The Odds Gap `/api/futures` (robots-allowed, attribution+link, US-regulated books only, As-of shown). The Odds API ingest (`lib/feeds/the-odds-api.js`, NPB + soccer backup) is wired but inactive until `THE_ODDS_API_KEY` is set (signup https://the-odds-api.com/#get-access, free 500 credits/mo, ~240/mo budgeted via 24h KV cache).
Not used (ToS): Kalshi Data ToS + Developer Agreement forbid public display/redistribution without written consent (note: existing /api/edges already shows Kalshi — legal review needed); Polymarket site terms forbid commercial display; Pinnacle/Bovada/BetOnline/OddsPortal/OddsChecker forbid scraping (Bovada/BetOnline offshore); DraftKings public JSON 403 from our egress; Action Network has no golf/F1/PFL/NPB and tennis had no odds; odds-api.io free keys paused (£49/mo); SportsGameOdds free 2,500 objects/mo, no outrights (key needed).
Still uncovered: PFL (no licensed free source; The Odds API `mma_mixed_martial_arts` lists PFL bouts — needs key + fighter matching), PGA/LPGA/Champions Tour weekly events (only majors via Odds Gap; weekly needs a key), F1 (no free licensed source; The Odds API has no F1), ATP/WTA as separate keys (tennis already priced via The Odds Gap), NPB (needs The Odds API key).
Risks: The Odds Gap licence says bulk/automated reuse "needs a conversation first: admin@theoddsgap.com" — the board already depends on it; and it returned 429 to preview tonight (preview has no D1 fallback so the board dropped to 187 events; prod 378 unaffected). ESPN ToS bar commercial use — whole board shares this risk.
Screenshots: /workspace/placebets-preview/preview7-newleague-{hub,game,golf}.png (Eredivisie hub, Liga MX game, golf outrights) reviewed OK. Known gap: soccer draw price not shown on game pages yet.

### Fix 7 addendum — 3-way soccer draw price (7:35 PM ET, preview only)
Branch head a61fc26 (commits 1ddb428, dd8ec2e, 660c2f5, a61fc26). Draw price is read only from real feeds: ESPN `drawOdds.moneyLine` / `moneyline.draw.close.odds`, Action Network consensus/book `ml_draw`, The Odds Gap `best_draw`; carried across merged twin rows (not home-relative, no flip). Omitted when absent; 0 non-soccer events carry a draw.
Shown on: SEO game pages (Draw row + implied %, "No-vig 3-way" line with book margin, summary sentence, meta description), hub/team GameRow ("/ Draw +x"), homepage hero cards (Draw row) + board/quick cards, chatbot game answers (LINE "/ Draw +x" + WHY bullet with 3-way no-vig %) and board lists.
Coverage at 7:15 PM ET: draw present on 100% of priced games in EPL, La Liga, Serie A, Bundesliga, Ligue 1, UCL, Europa, Eredivisie, Liga MX, Liga Portugal, Brasileirão, Süper Lig; MLS 31/33.
Gate (preview-7 deploy cc391635): eval 1026/1026, canary 50/50, page test 0 fail. Page test now tolerates board churn: a 404 fails only if a fresh nocache board or fresh sitemap still lists the page (one retry); reported as `churned`. Cause: The Odds Gap keeps returning 429 to preview (no D1 fallback), so the preview board flaps 187↔383 events.
Screenshots: /workspace/placebets-preview/preview7-draw.png (Excelsior vs Heerenveen: +370 / Draw +310 / -160, no-vig 19.8/22.8/57.4, margin 7.2%) and preview7-draw-home.png (hero cards with Draw rows) reviewed.

## Hero-card price alignment (2026-10-14 ~7:55 PM ET) — preview only
- Root cause: label/price boxes already lined up (measured via getBoundingClientRect). The offset came from JetBrains Mono vs sans glyph metrics under align-items:center.
- Fix 5a33c9d (feat/fix7-seo-game-pages): `align-self: baseline` on `.pb-hero-card-team > .pb-hero-card-name/.pb-hero-card-odds` (globals.css). Applies to team rows + Draw row.
- Gate: run 1 eval 1016/1026 (99.03%, 8 hard fails = parlay legs missing from flapping board; CSS-only diff); rerun eval 1026/1026, canary 50/50, page-test 572 pages / 0 fail / 0 churn. chatbot-preview-7 = c1d3f0a7.
- Screens: /workspace/placebets-preview/preview7-draw-home.png, preview7-draw-home-2x.png (reviewed: baselines aligned).
- NOT shipped to production — awaiting Iz "ship it".
