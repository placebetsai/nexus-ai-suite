# Handoff: placebets.ai, current as of 6:49 AM ET, Thu Oct 15 2026
(Continues HANDOFF-2026-10-14-placebets.md. No secret values in this file. Tokens live in /home/box/.cf-tokens on the box; use WORKERS_TOKEN. PLACEBETS_TOKEN is dead.)

## 1. Production state
- Repo placebetsai/Placebetsai, `main` = **f8dd2b1** (eval: 15s board snapshots) on top of **a38e7ed** (merge of fix 5: intent router, eval bank, self-verification, freshness monitor, data layer).
- Live Cloudflare Pages deployment: **ecddd446** (project `placebetsai`, account 2765cb2786006552f33cc3dfe0b680a1).
- Rollback options (earlier production deployments, newest first): **13c11646**, **ed7d5097**, **21a5da3a**. Roll back in the Pages dashboard ("Rollback to this deployment") or by redeploying that commit; not needed so far.
- D1 restore point: **2026-10-14T18:12:39Z** (Time Travel bookmark, taken before the fix 5 ship). Restore with `wrangler d1 time-travel restore <db> --timestamp 2026-10-14T18:12:39Z`, only on Iz's say-so.
- Backups: pre-ship D1 export plus R2 copy made by the ship script before fix 5 (see HANDOFF-2026-10-14 for paths). The ship script takes a fresh backup each time it runs.

## 2. Waiting on Iz "ship it" (stacked, ship together)
The stack is linear and contains main: main f8dd2b1 ⊂ fix6 ⊂ fix7 ⊂ fix8 (verified 6:49 AM with `git merge-base --is-ancestor`).

| Fix | Branch | Head | Preview | Last gate |
|---|---|---|---|---|
| 6 | feat/fix6-freshness-latency-affiliate | bb006e8 | chatbot-preview-6 (97191583) | passed on preview (see 10-14 handoff) |
| 7 | feat/fix7-seo-game-pages | 5a33c9d | chatbot-preview-7 (84b41eef, draw-row fix 5a33c9d) | eval 1026/1026, canary 50/50, page test 554/0 fail |
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
1. Merge in order into main: fix6 → fix7 → feat/seo-8. Fast-forward is possible because the stack is linear, so merging feat/seo-8 into main carries all three. Commit as placebetsai.
2. `set -a; . /home/box/.cf-tokens; set +a; CLOUDFLARE_API_TOKEN="$WORKERS_TOKEN" CLOUDFLARE_ACCOUNT_ID=2765cb2786006552f33cc3dfe0b680a1 SHIP_IT=1 scripts/ship/deploy-gated.sh main`. This runs: build → gate-candidate → grader selftest → full eval (99 gate) → canary 50 → page test → backup → production.
3. Live check on placebets.ai:
   - `npm run canary https://placebets.ai`, now on the new grader.
   - `node scripts/seo/page-test.mjs --base https://placebets.ai`.
   - Spot-check /bankroll, /line-movement, /embed, /widget/odds, a few 301s (/tools, /bankroll-calculator), and /sitemap-index.xml.
   - Android screenshots of the home page and /bankroll.
4. Search Console: submit `https://placebets.ai/sitemap-index.xml`, then URL Inspection → Request indexing for `https://placebets.ai/bankroll`.
5. If anything is off, roll back to ecddd446 (current live deployment).

## 3. Overnight monitor summary (Oct 14 evening → 6:49 AM ET)
- Site healthy all night: home, /odds, /api/odds, the chatbot and /api/health/data all responded normally.
- **One false canary failure at 1:31 AM ET** (49/50, then 45/50): ml_mismatch on Islanders/Senators, Bills/Raiders, Flames/Knights, Canucks/Panthers, plus one leg_not_on_board (Chiefs -388 / Texans -375).
  - Cause: a race between the grader and the bot's board cache. The bot answers from a board up to ~3 min older than the grader's, through the odds cache, chat cache and in-memory copy. Lines were moving (Senators -166 → -147). Not a bot error: prices were on the live board.
  - Fixed in the grader on feat/seo-8 (8759bda):
    - Timestamped snapshots, polled every 10 s and persisted 15 min.
    - Prices graded against boards that bracket the answer's own "As of" minute, with a refetch before declaring a mismatch.
    - "Unverified" is reported separately; more than 3 fails the run.
    - `--selftest` proves invented prices still fail; it's in the gate.
  - "As of" verified honest: all 30 sampled answers matched a board built in their exact As-of minute.
- **Every canary since has passed 50/50.**
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
