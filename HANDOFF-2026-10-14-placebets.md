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
13. Champion phrasing gap: "who won the 2026 NBA championship and who will win next year" routes to the futures path (no-priced-market / futures board) instead of the Knicks fact; only "Who won the NBA title in 2026, who's winning next year" phrasing hits the knowledge path. Pre-existing on prod, not a fix-3 regression.

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
- Live screenshot: /workspace/placebets-preview/live3-realline.png (in progress).

### Preview notes (fix 3)
- Branch: `fix/chatbot-realline-deterministic-2026-10-14`, commit 66ae650. PR not opened yet — compare: https://github.com/placebetsai/Placebetsai/compare/main...fix/chatbot-realline-deterministic-2026-10-14
- Preview: https://chatbot-preview-3.placebetsai.pages.dev (deploy https://45720828.placebetsai.pages.dev). Prod NOT deployed; rollback target remains 21a5da3a.
- Root cause: real-line odds path built the grounded answer, then sent board data to the LLM for "polish" and served LLM text whenever it passed gates that only checked American-odds tokens + injuries → invented "92% of bets / 52% of money" slipped through, and that path never stamped "As of … ET". Fallback was degraded because `parseMoneylineBlock` regex couldn't parse `+250 (implied 28.6%)`.
- Fix: exact matchups with a real moneyline skip the LLM entirely (deterministic ML + implied %, team-labelled spread, O/U, As of ET); parser fixed + reads structured event; new `fabricatedBettingStats` filter in `enforceGroundedAnswer` + final POST sweep; Reddit chatter with % dropped; champion facts cached 1h + one retry (fixed 2/10 "Couldn't pull a live Wikipedia read"); champion answers now carry As of ET.
- Preview verification, 10 runs each vs live /api/odds: Nets @ Heat 10/10, Hornets vs Celtics 10/10, NBA 2026 + next year (Knicks over Spurs) 10/10, Yankees vs Red Sox (no line, no swap) 10/10, Super Bowl 2026 (Seahawks 29–13) 10/10.
- Screenshot (Android 412x915): /workspace/placebets-preview/preview3-realline.png — self-reviewed: real lines, As of 11:25 AM ET, no betting stats, no truncation.
