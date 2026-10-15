# Handoff: placebets.ai, current as of 8:40 AM ET, Thu Oct 15 2026
(Continues HANDOFF-2026-10-14-placebets.md. No secret values in this file. Tokens live in /home/box/.cf-tokens on the box; use WORKERS_TOKEN. PLACEBETS_TOKEN is dead.)

## REBUILD IN PROGRESS (Oct 15 9:15 AM ET)
- **Why:** Iz says desktop placebets.ai is broken (blank half-page, breaks after loading, slow, ugly). His new plan replaces the desktop diagnosis task.
- **Branch:** `feat/analyst-rebuild` (placebetsai/Placebetsai).
- **Rollback targets:** 9e4dbe96 (current prod, c21a37b), then ecddd446 before that. Only on Iz's say-so.
- **Plan:**
  1. Rebuild /api/chatbot as a research-analyst LLM tool loop. Tools: live odds board, futures/outrights (ESPN plus others; Stanley Cup and every major champion), web search plus Wikipedia, team/game stats, line history. Sharp take: no-vig fair, edge vs price, best price, movement, Kelly sizing. Every number comes from a tool with source and "As of"; the invented-number filter and grounding stay. Never "won't invent"; if data is missing, say what's unavailable and still analyze.
  2. Desktop at 1440/1920: fix blank, broken and slow sections; full-width polished homepage, clean loading states, subtle animation.
  3. Iz waived the preview gate: deploy via `scripts/deploy-safe.sh` (auto preview, smoke, prod smoke), with the eval as a sanity check. Ship if the smoke passes, even if the eval is below ~95% (report it). Add Stanley Cup, futures and open-ended questions to the eval and smoke.
  4. Live desktop and mobile check, screenshots `/workspace/placebets-preview/rebuild-*.png`, Stanley Cup live test, handoff, report.
- **Status:** step 0 (this note) done; starting work.

## 0c. SHIPPED 8:24 AM ET: fixes 6–9 plus main are LIVE (third run, 8:15 AM go-ahead after the provider fix)
- **Live deployment: 9e4dbe96-eae5-4b6f-a6b8-256a0b9ec0fc** (created 12:24:02Z = 8:24 AM ET; aliases placebets.ai and www). Code: main @ **c21a37b**.
- **Rollback target: ecddd446-7acf-4fa1-8765-2f92f2cf41ba** (the previous production deployment). Use Pages dashboard → Rollback, or POST .../pages/projects/placebetsai/deployments/ecddd446.../rollback. Only on Iz's say-so.
- **c21a37b, provider fix:** ESPN returns `provider` as an object, which rendered "[object Object]". The new `lib/provider-name.js` `providerName()` is used in the /api/odds ESPN setter and the light payload, fetch-homepage-events, d1-odds-events, board-normalize, PredictClient and OddsDesk, which also renders `String(pick.provider)`. page-test.mjs now sweeps 13 site pages (/, /parlay, /daily-picks, /receipts, /predict, /bankroll, the calculators, /line-movement, /embed, /widget/odds). It fails on "[object Object]", undefined or NaN, and on any /api/odds `odds.provider` that is not a string. The Chief of Staff's smoke.mjs was not edited.
- Pre-production screenshot: `/workspace/placebets-preview/fix9-provider-pickcard-espn.png` (an ESPN-fallback Süper Lig card showing "· DraftKings").
- Gates, from `SHIP_IT=1 scripts/ship/deploy-gated.sh main`:

  | Gate | Result |
  |---|---|
  | Grader selftest | ok |
  | Full eval | 1041/1041 |
  | Canary | 50/50 |
  | Page test | 847 pages, 0 fail |
  | Preview smoke (bc329e82) | 9/9 |
  | Production smoke | 9/9 |

- Live verification (8:24–8:40 AM ET):
  - Prod canary: 50/50.
  - Prod slate eval: 15/15.
  - `/api/health`: operational, predictions 1209.
  - `/api/health/data`: stale leagues down from 9 to 3 (BRASILEIRAO, LIGAMX, SUPERLIG).
  - Chatbot spot checks:
    - "Who wins tonight's NBA game?" → `board_slate_scoped`, Raptors @ Knicks and Thunder @ Rockets, PICK Knicks −205, "As of" stamp.
    - "UFC this weekend" → `board_slate_scoped`, 25 fights.
  - Pages, all 200 with no "[object Object]": /odds game page, /sitemap-index.xml (→ sitemap.xml and sitemap-odds.xml), /bankroll, /ev-calculator, /implied-probability-calculator, /arbitrage-calculator, /line-movement, /embed, /widget/odds (4.6 s).
  - 301s: /betting-tools → /tools and /bankroll → /bankroll-calculator.
- Live screenshots (412x915, self-reviewed OK):
  - `/workspace/placebets-preview/live9-home.png`
  - `/workspace/placebets-preview/live9-nba-tonight.png`
- **Grading:**
  - Dry run (`/api/cron/grade-outcomes?dry=1`, no writes): 216 candidates, 51 scanned, would grade 31 (12 correct, 19 incorrect), 20 still pending. Skipped as unsupported: tennis 143, predict-deep 15, soccer 7.
  - **Real grading writes already happened on their own after the ship.** The deployed fix unblocked the existing grade-outcomes trigger. prediction_grading_runs shows 12:32:36Z (88 graded) and 12:33:27Z (82 graded), i.e. 8:32–8:33 AM ET. The executor did not trigger them; its only call was the dry run.
  - The two runs were 51 s apart, which doesn't fit a 15-minute cron cadence. The second trigger is unidentified; check the placebetsai-cron logs.
  - Outcome totals now (live rows): 372 correct, 218 incorrect, 91 push, 528 pending.
  - If Iz did not want automatic grading yet, the options are a D1 Time Travel restore of predictions to just before 12:32Z (this also loses picks logged since then) or pausing the cron call. Either one needs Iz's OK.
- **Search Console:** the sitemap needs to be resubmitted (https://placebets.ai/sitemap-index.xml). Iz does it in the browser.

## 0b. SHIP RETRY 8:00 AM ET (the one allowed retry, under Iz's 7:44 "ship it"): STOPPED again at the preview smoke. Production NOT changed (still ecddd446).
- `SHIP_IT=1 scripts/ship/deploy-gated.sh main` @ 6071c4f:

  | Step | Result |
  |---|---|
  | Grader selftest | ok |
  | Full eval | 1041/1041 |
  | Canary | 50/50 |
  | Page test | 833 pages, 0 fail |
  | deploy-safe.sh wrangler | repo-local v3.114.17 |
  | Preview dd8ab418 smoke | **8/9** |

- **This time the homepage was within its time budget (4,713 ms) but showed "[object Object]"** on a Europa League pick card ("Hapoel Be'er Sheva +650 / AZ Alkmaar -280 · [object Object]").
- **Root cause: a real bug, already in production's code (a38e7ed), only visible on the ESPN fallback.**
  - `app/api/odds/route.js` and `lib/fetch-homepage-events.js extractEspnOdds()` set `provider: odds.provider || "espn"`. ESPN's `odds.provider` is an object (`{id:"100", name:"DraftKings", …}`).
  - `components/OddsDesk.js` (line 227) prints `{pick.provider}` as text.
  - It shows only when a game's odds come from the ESPN fallback, i.e. on the preview when The Odds Gap returns 429 (that board had 185 events). Production reads D1 and showed 0 occurrences at 8:15 AM, but it can surface there whenever the fallback is used.
- **Fix (not applied, needs a go):** normalise the provider to a string at the source, `provider: (typeof odds.provider === "object" ? (odds.provider?.displayName || odds.provider?.name) : odds.provider) || "espn"`, in both extractors (and `lib/d1-odds-events.js`, `lib/board-normalize.js` for safety). Render `String(pick.provider)` defensively in OddsDesk. Then re-run the gated ship.
- Not done (ship pending): live verification, screenshots, the post-deploy canary, and the grading dry run (still unsafe on the old production code, which ignores `?dry=1`). Rollback target once shipped: ecddd446.

## 0. SHIP ATTEMPT 7:44 AM ET (Iz: "ship it"): STOPPED at the deploy-safe preview smoke. Production NOT changed.
- `main` was fast-forwarded to **6071c4f** (fixes 6–9 + Chief of Staff main) and pushed. **Production still runs ecddd446 (code a38e7ed)**, so main ≠ production until a ship passes.
- `SHIP_IT=1 scripts/ship/deploy-gated.sh main` results:

  | Step | Result |
  |---|---|
  | Grader selftest | ok |
  | Full eval on gate-candidate | 1041/1041 |
  | Canary | 50/50 |
  | Page test | 832 pages, 0 fail |
  | deploy-safe.sh wrangler | repo-local v3.114.17 on node v20.19.2 |
  | Preview 6ca2317e smoke | **8/9: FAIL "page / (home)" 10,196 ms (budget 6,000)** |

  The gate then stopped with "production was NOT touched".
- **Diagnosis: preview environment, not code.**
  - Preview deployments have **no D1 binding**: preview /api/health returns "Database unavailable".
  - So `fetchHomepageEvents()` skips its D1 fast path and fans out live to 15 ESPN feeds plus The Odds Gap and betbetter.
  - Warm homepage TTFB on the preview is 3.0–3.5 s and a cold hit took 10 s. The production deployment's own URL (ecddd446.placebetsai.pages.dev, with D1) is 0.7–1.1 s warm.
  - `lib/fetch-homepage-events.js` is unchanged between a38e7ed and main.
- **Per Iz's rule ("if any gate fails, stop; don't force it") nothing was retried or overridden.** Options for Iz or Chief of Staff:
  - (a) Add the D1 bindings (DB, MARKET_DATA_DB) to the Pages **preview** environment so the preview is representative. This is the recommended fix, a project setting change.
  - (b) Have smoke.mjs warm `/` once before timing it, or give previews a longer home budget. This is a smoke change and needs Chief of Staff's sign-off.
  - (c) Re-run as-is: warm TTFB is under 6 s, so it may pass, but that is a retry of a failed gate.
  - ALLOW_KNOWN_FAILS=1 doesn't apply, because production passes the homepage check.
- **Not done, because the ship is pending:**
  - Live verification, live screenshots and the post-deploy canary.
  - The grading dry run. **Do not call `/api/cron/grade-outcomes?dry=1` on production before fix 9 is live:** the live code ignores `dry` and would perform a real grading write.
  - Search Console sitemap submission. Iz does that in the browser after the ship.
- Rollback target once shipped: **ecddd446**.

## 1. Production state
- **UPDATE 8:24 AM ET: superseded by 0c.** Live = 9e4dbe96 (main c21a37b); rollback target = ecddd446. The text below describes the state before the ship.
- Repo placebetsai/Placebetsai, `main` = **a3840b4** (GA4 loader, no-op until the ID is set) on **547c74a** (Chief of Staff: `scripts/deploy-safe.sh` + `scripts/smoke.mjs`) on **f8dd2b1**. Neither 547c74a nor a3840b4 is deployed.
- Production code = **a38e7ed** (merge of fix 5). Verified 7:30 AM ET via the Pages API: no production deploy since ecddd446 (Oct 14, 2:16 PM ET).
- Live Cloudflare Pages deployment: **ecddd446** (project `placebetsai`, account 2765cb2786006552f33cc3dfe0b680a1).
- Rollback options (earlier production deployments, newest first): **13c11646**, **ed7d5097**, **21a5da3a**. Roll back in the Pages dashboard ("Rollback to this deployment") or by redeploying that commit; not needed so far.
- D1 restore point: **2026-10-14T18:12:39Z** (Time Travel bookmark, taken before the fix 5 ship). Restore with `wrangler d1 time-travel restore <db> --timestamp 2026-10-14T18:12:39Z`, only on Iz's say-so.
- Backups: pre-ship D1 export plus R2 copy made by the ship script before fix 5 (see HANDOFF-2026-10-14 for paths). The ship script takes a fresh backup each time it runs.

## 2. Waiting on Iz "ship it" (stacked, ship together)
The stack is linear: f8dd2b1 ⊂ fix6 ⊂ fix7 ⊂ fix8 ⊂ fix9. Current main (547c74a, a3840b4) was merged into fix9 at 1c8a011 with no conflicts (auto-merged app/layout.js, package.json, scripts/ship/deploy-gated.sh). Shipping feat/fix9-grounding carries fixes 6–9 plus main.

| Fix | Branch | Head | Preview | Last gate |
|---|---|---|---|---|
| 6 | feat/fix6-freshness-latency-affiliate | bb006e8 | chatbot-preview-6 (97191583) | passed on preview (see 10-14 handoff) |
| 7 | feat/fix7-seo-game-pages | 5a33c9d | chatbot-preview-7 (84b41eef, draw-row fix 5a33c9d) | eval 1026/1026, canary 50/50, page test 554/0 fail |
| 9 | feat/fix9-grounding | 6071c4f | chatbot-preview-9 (4b3b3157) | selftest ok, eval 1041/1041, canary 50/50, page test 832/0 fail, smoke.mjs 9/9 |
| 8 | feat/seo-8 | 8759bda | chatbot-preview-8 (74f7b7cd @ 54e92c4; 8759bda is tooling-only) | eval 1024/1025 (0 hard), canary 50/50, page test 899/0 fail/0 churn, Lighthouse mobile SEO 100 |

- **Fix 6:** freshness/latency (in-process board, edge cache with stale-while-revalidate), affiliate plumbing.
- **Fix 7:** SEO game/team/league pages and sitemaps, Ask FAB above the bottom nav, page test in the gate, generic `no_odds_source` classification, extra ESPN soccer leagues, /odds/golf, three-way draw prices everywhere, hero-card baseline alignment.
- **Fix 8:**
  - 404/301 cleanup (`lib/seo/redirects.js` plus expired market/game/league redirects); canonical/title fixes; robots.txt points only to /sitemap-index.xml.
  - /bankroll calculator suite plus /ev-calculator, /implied-probability-calculator, /arbitrage-calculator.
  - Widgets: /widget/*, /embed.js, /embed.
  - Weekly /line-movement report with move validation: sign check, moneyline confirmation, verify flag above 6 pts.
  - Footer links, OG images, mobile CLS fix.
  - **Canary grader fix 8759bda** (section 3).
- Screenshots: /workspace/placebets-preview/preview7-*.png and preview8-*.png (Android 412x915, self-reviewed).

**Ship steps (only after Iz says "ship it"):**
1. Fast-forward main to feat/fix9-grounding. It contains fixes 6–9 and current main. Commit as placebetsai.
2. `SHIP_IT=1 scripts/ship/deploy-gated.sh main`. Since aeb47a3 this runs build → gate-candidate → grader selftest → full eval (99) → canary 50 → page test, and then `scripts/deploy-safe.sh` with SKIP_BUILD=1 on the same build: preview → smoke → **prod** → smoke, printing a rollback command. deploy-safe.sh is the only sanctioned production path; a raw `wrangler pages deploy --branch=main` is forbidden.
   - **Node/wrangler blocker: fixed in 6071c4f** (Chief of Staff approved; ships with fix 9). On Node < 22, deploy-safe.sh uses the repo-local `node_modules/.bin/wrangler` (3.114.17) and prints the binary and version first. The box runs Node 20.19.2, and wrangler 4 needs 22. Verified at 7:47 AM ET with `PREVIEW_ONLY=1 bash scripts/deploy-safe.sh`: build → preview fce7e07a (gate-candidate) → smoke 9/9 → stopped. Production untouched (still ecddd446). Recorded in OPENCODE-COORDINATION.md for the other sites.
3. Live check on placebets.ai:
   - `npm run smoke -- https://placebets.ai`, `npm run canary https://placebets.ai`, `node scripts/seo/page-test.mjs --base https://placebets.ai`.
   - Spot-check /bankroll, /line-movement, /embed, the 301s and /sitemap-index.xml.
   - Android screenshots.
4. Search Console: submit sitemap-index, then request indexing for /bankroll.
5. Rollback target: ecddd446.

## 3. Overnight monitor summary (Oct 14 evening → 6:49 AM ET)
- **What actually ran overnight: only two automated jobs, the /api/health check and the chat canary (50 sampled eval questions).** Nobody checked the homepage, the /odds pages or the chatbot beyond the canary sample, so this summary can't say they were healthy. The canary bank also had no teamless slate asks ("Who wins tonight's NBA game?", UFC this weekend). That's why its 50/50 passes missed the bugs the Chief of Staff graded F at 6:50 AM (section 6). /api/health also misreported "predictions 0" (wrong database; see section 6).
- **One false canary failure at 1:31 AM ET** (49/50, then 45/50): ml_mismatch on Islanders/Senators, Bills/Raiders, Flames/Knights, Canucks/Panthers, plus one leg_not_on_board (Chiefs -388 / Texans -375).
  - Cause: a race between the grader and the bot's board cache. The bot answers from a board up to ~3 min older than the grader's, through the odds cache, chat cache and in-memory copy. Lines were moving (Senators -166 → -147). Not a bot error: prices were on the live board.
  - Fixed in the grader on feat/seo-8 (8759bda):
    - Timestamped snapshots, polled every 10 s and persisted 15 min.
    - Prices graded against boards that bracket the answer's own "As of" minute, with a refetch before declaring a mismatch.
    - "Unverified" is reported separately; more than 3 fails the run.
    - `--selftest` proves invented prices still fail; it's in the gate.
  - "As of" verified honest: all 30 sampled answers matched a board built in their exact As-of minute.
- **Every canary from 1:45 AM to about 7:00 AM passed 50/50.** The 7:29 AM live canary failed 46/50 twice. The cause: it runs the box checkout, which now holds fix 9's new `slate` eval items, against production, which doesn't have the fix. This is newly measured, not a production regression (production is unchanged since ecddd446). It clears when fix 9 ships.
- **Stale minor leagues now 9:** BRASILEIRAO, CHAMPIONSTOUR, EREDIVISIE, F1, LIGAMX, NPB, PFL, SUPERLIG, WTA. LPGA and PGA recovered; NPB newly stale. Majors (NFL, NBA, NHL, MLB, NCAAF, EPL, UCL) are fresh.
- **The live canary still uses the old grader until ship**, so it can false-fail while lines move. Treat lone ml_mismatch spikes during fast markets with that in mind and check the board before escalating.

## 4. Open items
1. **Trader-style bot** (no-vig fair price, EV, CLV, steam moves, best price across books, Kelly sizing in chat): scoped, awaiting Iz's go. Not started.
2. **THE_ODDS_API_KEY** pending (Iz). `lib/feeds/the-odds-api.js` stays inactive until it's set as a Pages secret. It would cover the stale minors.
3. **Scrapers only for sources that permit it** (ToS/robots). No scraping of books that forbid it.
4. **Search Console 404 list:** need Iz's GSC export of the ~82 404 URLs to close any gaps the inferred redirect map missed.
5. **Line-movement migration not applied:** `migrations/proposed/2026-10-14-line-movement-reports.sql` (weekly archive table). The page works without it; apply after ship only if Iz wants archives.
6. **Daily eval workflow:** `scripts/eval/daily-eval.workflow.yml` can't be pushed to .github/workflows with the current GitHub token (no `workflow` scope). Needs a token with workflow scope or Iz adding it via the UI.
7. **The Odds Gap licensing email** (data use / rate limits; the preview gets 429s): draft for Iz to send; not sent.
8. **Affiliate applications:** Iz applies personally. NY/NJ/PA require a state affiliate license before those geos can show offers; keep them gated until then.
10. **Tennis and predict-deep picks are ungradeable** (143 + 15 skipped). They need a tennis results source.
11. **Duplicate picks under name variants** (e.g. "Atlanta United @ CF Montreal" / "Atlanta United FC @ CF Montréal" each graded separately), which inflates the record. Dedupe by event id.
12. **/api/cron/grade-outcomes has no auth.** Anyone can trigger a real grading write. Add a CRON_SECRET check (needs Iz's OK and a secret set).
13. **Stale leagues: BRASILEIRAO, LIGAMX, SUPERLIG** (ESPN fallback only). THE_ODDS_API_KEY would fix them.
14. **Search Console sitemap resubmit** (Iz).
9. **SEO for Iz's other sites** handed to the Israel JOFFE SEO bot; not in this bot's scope.

## 5. Standing rules
- Preview first (chatbot-preview-N); production only after Iz says "ship it". Android 412x915 screenshots, self-reviewed, for every UI change.
- Free site: money from affiliates and ads only. No paywalls.
- Keep the casino games (virtual chips, no real money, 21+).
- No invented odds, stats or prices. Fail soft and show "As of … ET" on data.
- Never print or commit secrets. Never run commands on Iz's own machines. Commit in small increments as placebetsai.

---
## 6. Fix 9: Chief of Staff F grade (6:50 AM) — preview only, feat/fix9-grounding (pushed)
**Claims** (reproduced read-only on prod and on preview-8 with the exact wording):
1. **"Who wins tonight's NBA game?" → "No line posted for Lakers vs Celtics": REAL.**
   - The LLM intent router invented teams for a question that names none. The bot rewrote the query to "Lakers vs Celtics who wins", and exact-matchup gave "no line".
   - The rules path (llm_down) answered correctly.
   - Other wordings hit the same bug: "who wins tonight" → "Patriots vs Chiefs".
2. **"Who should I bet on in UFC this weekend?" → "Nothing on the board matches" + Europa League: REAL.**
   - The board has 34 UFC fights. Other wordings also failed on the rules path:
     - "fights" was typo-fixed to "Knights", so "Which UFC fights…" got an NHL "No line for Knights".
     - "Ultimate Fighting Championship" routed to NHL futures.
     - "best mma fight this weekend" opened with "Nothing matches" and then listed UFC.
     - "best nhl bet tonight" returned Tennis and Europa League.
3. **"predictions 0, grading cron never ran, /api/picks 404": mixed.**
   - **"predictions 0" is an ARTIFACT.** /api/health counted predictions on MARKET_DATA_DB, which has no predictions table. placebets-subscribers holds 1,175 picks: 267 correct, 154 incorrect, 90 push, 664 pending. The last pick was logged 6:31 AM ET.
   - **"Grading never ran" is half true.**
     - The cron does run: 8 runs in 24 h, the last at 7:05 AM ET. It is triggered by the placebetsai-cron worker every 15 minutes. It writes prediction_grading_runs, never cron_health, so health always said "never recorded".
     - **REAL bug:** every run graded 0. The oldest 100 pending rows are all ungradeable (tennis, unmapped La Liga/Bundesliga/Serie A/Ligue 1, predict-deep), so each run rescanned the same 100. Behind them, 221 gradeable past-due picks (NBA, NFL, NHL, NCAAF, MLS, UCL and others) never got a turn. 360 picks are past due and pending.
   - **/api/picks 404 is an ARTIFACT.** No such route has ever existed in git history, and nothing links to it. The real routes are /api/receipts (+ .json) and /receipts (/track-record). `/picks` already 301s to /daily-picks.
4. **9 stale minor leagues:** known and unchanged. They need THE_ODDS_API_KEY. Not a bot bug.

**Commits:**
- **edf2ee5:**
  - New teamless slate/pick route, which runs before the LLM router. It uses `lib/llm/slate-scope.js`:
    - Sport scope is matched to the board's own sport/group labels. Any fight wording counts as UFC/MMA, and no teams are hardcoded.
    - ET windows: tonight (evening first), today, tomorrow, this weekend (Fri–Sun), weekdays, this week.
    - Each row shows its market favorite. A pick is given only for pick asks, and only at a price of −400 or better; heavier chalk is named instead.
    - If nothing is in the window, the answer says so and lists the next rows. If nothing is in scope, it says so and gives counts, with no substitute sport.
  - fixTeamTypos requires the same first letter (fights ≠ Knights).
  - "Ultimate Fighting Championship" is mapped to UFC.
- **d04abeb:** LLM slots are grounded in the user's own words (exact, typo, clipped nickname, abbreviation). Invented teams and canonicals are dropped, and the memo key now includes the chat history.
- **1895287:** route wording ('best <league> bet'); how-many and futures asks are left to their own routes.
- **d657443:** the participant check ignores league words ('college football' is not Boston College).
- **d2c54f6:** eval slate rows are verified across snapshots.
- **344ae3b:** typo tie-break. "Pakcers" now resolves to Packers, not Pacers. It was also wrong on prod ("No line posted for Cowboys vs Pacers").
- **4766302:** grade-outcomes head-of-line fix.
  - Reads a 21-day window, skips ungradeable rows (reported by reason) and takes 100 gradeable ones.
  - Adds ESPN scoreboards esp.1/ger.1/ita.1/fra.1, uses datetime() comparisons and adds `?dry=1` (no writes).
  - A local dry run on today's real rows would grade 88/100 (53 correct, 35 incorrect, 12 still pending).
- **7a8c6a7:** /api/health reads predictions and grade-outcomes status (prediction_grading_runs) from the DB where they are stored.
- **59e3e3e and later:** a new `slate` eval category with 15 audit wordings, including all 4 from the 7:29 canary. Production baseline: 13/15 fail.
- **aeb47a3:** deploy-gated main = eval gates first, then deploy-safe.sh on the same build. The previous early `exec` skipped the eval gate.

**Gate (chatbot-preview-9, deployment 4b3b3157):** grader selftest ok; full eval **1041/1041**; canary **50/50**; page test **832 pages, 0 fail**; Chief of Staff `scripts/smoke.mjs` **9/9 PASS** (production: 7/9).
**Screenshots:** /workspace/placebets-preview/preview9-nba-tonight.png and preview9-ufc-weekend.png (412x915, self-reviewed: tonight's NBA rows only; [UFC] rows only; prices, pick and As-of shown).

**Open after fix 9 (plan, not done):**
- **Tennis picks (143 pending) can't be graded.** ESPN tennis has no home/away competitors. Either stop logging tennis picks or add a tennis results source.
- **predict-deep picks (15) have no grader branch.**
- **Duplicate picks for one game under different names** (Lyon @ Lens and Lyon @ RC Lens) logged opposite sides, which inflates both the win and loss records. Dedupe by event id, not by subject.
- **grade-outcomes has no auth.** Anyone can trigger a run; this was already the case.
- **After ship, one run clears the backlog.** Check `/api/cron/grade-outcomes?dry=1` first, and only with Iz's ok, since it writes to prod D1.

## Log (earlier today)

## Canary grader fix (1:45 AM ET), test tooling only, feat/seo-8 @ 8759bda (pushed)
Trigger: live canary 49/50 then 45/50 at 1:31 AM ET (ml_mismatch Isles/Sens, Bills/Raiders, Flames/Knights, Canucks/Panthers; leg_not_on_board Chiefs -388/Texans -375) while lines were moving.
Cause: grader race, not the bot. The bot answers from a board up to ~3 min older than the grader's: odds Cache API (fresh 60s, SWR up to 10 min) -> chat cache key (60s) -> per-isolate memo (60s). The grader only snapshotted every 15s after each answer, so a short canary often never saw the board the bot used.
Fix (scripts/eval/run.mjs):
- Timestamped board snapshots: polled every 10s during the run, persisted 15 min in /tmp/pb-eval-snaps-<host>.json across runs.
- A price is accepted only if it is on a snapshot built in the answer's own "As of" minute (-60s/+120s) or fetched in the last 180s. ML pairs must still come from the same snapshot.
- On a miss: refetch the board and re-check. Still missing = true ml_mismatch / leg_not_on_board (unchanged severity).
- "unverified" = no snapshot for that As-of minute and As-of <= 12 min old. Reported separately; more than 3 fails the run (so the grader can't go blind).
- `--selftest`: real price must pass; an invented ML and an invented parlay leg must fail. Added to deploy-gated.sh before the eval.
Validation vs production (read-only chat queries): 5 canaries 50/50, 0 hard, 0 unverified. Run 1 recovered 4 items only after the refetch (the 1:31 race). Self-test ok.
As-of honesty: As-of = board updatedAt (set at board compute; cache layers don't rewrite it). In 30 realline answers, every quoted price matched a board built in exactly the answer's As-of minute. Prices are never newer or older than the label says. Design max age is about 12 min, and As-of shows it.
No deploy needed (tooling only). Ships with fix 7/8 on "ship it". The live canary job should run from this branch's run.mjs, or wait for the merge.
