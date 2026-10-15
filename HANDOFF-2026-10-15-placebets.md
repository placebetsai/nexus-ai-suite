# Handoff: placebets.ai, current as of 7:40 AM ET, Thu Oct 15 2026
(Continues HANDOFF-2026-10-14-placebets.md. No secret values in this file. Tokens live in /home/box/.cf-tokens on the box; use WORKERS_TOKEN. PLACEBETS_TOKEN is dead.)

## 1. Production state
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
| 9 | feat/fix9-grounding | aeb47a3 | chatbot-preview-9 (4b3b3157) | selftest ok, eval 1041/1041, canary 50/50, page test 832/0 fail, smoke.mjs 9/9 |
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
   - **Blocker:** on the box, deploy-safe.sh calls `wrangler` from /home/box/.local/bin, or `npx wrangler@4` when USE_NPX_WRANGLER=1. Both need Node 22, and the box has Node 20.19.2, so it dies at the preview deploy. The repo's own `npx wrangler` (3.114) works. Fix before shipping: install Node 22 on the box, or have Chief of Staff let deploy-safe use `./node_modules/.bin/wrangler`.
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
