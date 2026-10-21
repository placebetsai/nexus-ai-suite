# PlaceBets: free-source odds pipeline (scraper plan)
Wed Oct 21, 2026, about 2:05 PM ET. This is research and a plan only.
- No production change.
- No paid feeds.
- A throwaway Worker `pb-probe-tmp-1021` was deployed on the PlaceBets account for the Cloudflare-egress probe and **deleted at about 1:56 PM ET**. It now returns 404.

Evidence files:
- `/workspace/placebets-preview/probe-1021/`: `probes.mjs`, `box-results.json`, `cf-results.json`.
- `/workspace/placebets-preview/handoff-read/`: the handoffs as read from `origin/master`.

Companion: **`CATALYST-PLAN-2026-10-21.md`** (Catalyst v2 and the ranked build order).

> Correction to `STRATEGY-2026-10-21.md` (written an hour earlier):
> - It recommended Polymarket and Kalshi for futures. The Oct 14 handoff records that **Kalshi's Data ToS and Developer Agreement forbid public display without written consent, and Polymarket's site terms forbid commercial display**. Do not build on them without Iz deciding the legal question.
> - Its code analysis also read the box checkout, which is **behind production** (see §0).

---

## 0. Read first: production code is not in GitHub, and two agents are shipping
- **Live production (Pages, project `placebetsai`) is commit `04616bb`** ("INJURIES: the board was empty for four leagues…").
  - It was deployed **8 times today** between 8:35 AM and 1:54 PM ET.
  - That SHA **does not exist on GitHub**. `get_commit` returns 422, and GitHub `main` is `3d4bc04` (Oct 17).
  - The box checkout `/workspace/tnr/Placebetsai` is at `ff99bb5` (Oct 15). Its `node_modules` is empty.
- Per nexus `ISSUE_LOG` #134–#140 and `OPENCODE-DAILY-ALERTS.md`, **OpenCode on Iz's laptop has been building and deploying placebets** since Oct 17 (`~/site-checks/Placebetsai`).
  - The live site has features the box and GitHub code lack: `/terminal` (Catalyst), `/api/weather`, `/api/line-history`, `/api/attention`, `/api/edges` moves and EV, and the `line_history` / `line_current` / `prediction_clv` / `affiliate_clicks` D1 tables.
- **Blocker 0 for any build:** the deploying agent must push `04616bb` (and any branches) to `placebetsai/Placebetsai`, and Iz or Chief of Staff must name **one owner** (OPENCODE rule: "One owner per site").
  - Otherwise any box build reverts today's production, as ISSUE_LOG #112 warned.

## 1. What the handoffs say is already built (data side)
Sources: HANDOFF-2026-10-14/-10-15-placebets, OPENCODE-COORDINATION, OPENCODE-DAILY-ALERTS, ISSUE_LOG, and the repo's PLAN.md / HANDOFF.md.

**Scheduler**
- `placebetsai-cron` / `placebets-scheduler` (one of them runs on the Fashionistas account) fires every 15 minutes.
- It calls `/api/cron/*` on the site: scrape-live-sportsbooks, scrape-sports-espn, ingest-games, refresh-espn-odds, scrape-odds-espn, scrape-live-odds, scrape-sportsbooks, scrape-sports, ingest-espn-sports, market-data, freshness, housekeeping, cleanup-*, trending, record-picks, grade-outcomes, improve.

**Storage**
- `prediction-market-data.games` holds **one moneyline, spread and total per game** (no per-book rows, overwritten each run).
- `placebets-subscribers.line_history` (live D1, read-only check):
  - 48,184 rows covering 941 event ids, from Oct 18 to now.
  - **Consensus only, with no book column.** Event ids are source-prefixed (`gap-…`, `an-…`), so one game can have two ids.

**Board sources in use**

| Source | Rows | Freshness |
|---|---|---|
| The Odds Gap (best price per side, book named) | 357 | updated 1:00 PM ET |
| Action Network private API | 280 | 1:45 PM ET |
| ESPN (DraftKings line) | 456 | |
| FanDuel `sbapi.mi` | 200 | rows last written **2:47 AM ET**, stale |

- `odds_source` counts: FanDuel 402, ActionNetwork 378, espn/ESPN 489, Novig 196, DraftKings 123, Fanatics 38, bet365 38, Kalshi 37, Polymarket US 32, ProphetX 29, Hard Rock 23, theScore 19, BetMGM 17, BetRivers 11, plus smaller ones.
- These are mostly "best-price book" labels from The Odds Gap.

**Futures**
- ESPN core returns 403 to Cloudflare. The box loop seeds KV `futures:v2:*` with a 6-hour TTL.
- **The loop is silently dead.** PID 1939 still sleeps, but the log's last write is Oct 16 10:35 PM.
  - `scripts/seed-futures-kv.mjs` shells out to `node_modules/.bin/wrangler`, and `node_modules` is now empty.
  - The `| grep "seeded|no priced"` in the loop swallows the error.
  - **This is why the Stanley Cup answer today fell back to standings.**
- Golf futures come from The Odds Gap `/api/futures`, which the handoff says robots.txt allows.

**Rulings already recorded (handoff 10-14 §"Not used (ToS)")**
- Kalshi and Polymarket display are not allowed (see the correction above).
- Pinnacle, Bovada, BetOnline, OddsPortal and OddsChecker forbid scraping.
- DraftKings returns 403.
- Open item 3 in the Oct 15 handoff: **"Scrapers only for sources that permit it (ToS/robots)."**
- Risks: The Odds Gap licence says "Bulk or automated re[use]… needs a conversation first: admin@theoddsgap.com", and the board already depends on it. The ESPN ToS bars commercial use, and the whole board shares that risk.

**Already-built Catalyst v1 APIs** (live, not in GitHub): see CATALYST-PLAN §1.

**Inventory of odds code on the box (ff99bb5)**

| File | Fetches | Where it runs | Works today? |
|---|---|---|---|
| `app/api/cron/scrape-sports-espn` | FanDuel sbapi (MI), Action Network scoreboard, The Odds Gap board, ESPN, TheSportsDB, RSS | Pages via cron | Action Network and Odds Gap yes; FanDuel rows stale |
| `app/api/odds/route.js` | ESPN scoreboard, Action Network (8 books, collapsed to 1), betbetter.world, Odds Gap | Pages | yes; one price per game survives |
| `lib/fetch-homepage-events.js` | ESPN, betbetter, Odds Gap | Pages | yes |
| `app/api/cron/scrape-sportsbooks` | DraftKings, Barstool (defunct), PointsBet AU, William Hill | Pages | DraftKings 403; others defunct or irrelevant |
| `app/api/cron/scrape-live-odds` | Bovada, BetOnline, MyBookie, BetUS (offshore) | Pages | ToS forbids; should be deleted |
| `lib/sportsbook-scrapers.js` | DK, FD, BetMGM, Caesars, BetRivers, PointsBet HTML | Pages | brittle HTML; no evidence of rows |
| `app/api/cron/refresh-espn-odds` | ESPN site plus core | Pages | core returns 403 from Cloudflare |
| `lib/futures.js` | ESPN core futures plus **standings fallback** | Pages | core 403; standings path is the source of the "no-vig 9.8%" lie |
| `scripts/seed-futures-kv.mjs` + box loop | ESPN core → KV | box | **dead since Oct 16** |
| `lib/feeds/the-odds-api.js`, `real-odds-service.js`, `oddsSources.js` | The Odds API | Pages | inactive (no key; paid is rejected) |
| `lib/odds-api-free.js` | b365api, sofascore, cricketdata | Pages | no key; unused |
| `lib/sources/{kalshi,polymarket,predictit}.js`, `kalshi-games.js` | prediction markets | Pages cron `market-data` | rows refresh (53 Kalshi, 80 Polymarket); display ToS issue |
| `lib/splits.js` | Action Network splits | Pages | live `/api/splits` returns tickets and money |
| `lib/multi-source-scraper.js`, `everything-fetcher.js`, `sports-scraper.js`, `sports-sources-v2.js` | mixed (ESPN, NBA CDN, Yahoo, NHL, MLB, crypto) | Pages | legacy; overlapping |

---

## 2. Probe results (one polite request per source per location, Oct 21, 1:52–1:56 PM ET)
How the probes ran:
- **Box** = this box's own egress (not Cloudflare). I treated "my computer" as the box, because the standing rule forbids running commands on Iz's own machines.
- **CF** = the throwaway Worker.
- The honest User-Agent was tried first: `PlaceBetsResearch/0.1 (+https://placebets.ai; one-off source probe)`. A browser UA was tried only if that failed.
- "How often it blocks" can't be measured from one probe; repeat-block evidence comes from the handoffs (for example, Odds Gap 429s to preview).

| Source | Box | CF | What it gives (inspected) | Terms / robots | Verdict |
|---|---|---|---|---|---|
| **The Odds Gap** `/assistant/v1/board`, `/api/futures`, `/api/game`, `/api/game-props`, `/api/line-history`, `/api/opening`, `/api/closing` | 200 | 200 | Board: 292 games, best price per side with book, `books_priced` (for example 16), minute `as_of`. **Futures: per-book prices** for NHL, NBA, NFL, MLB, NCAAF, NCAAB, WNBA and golf majors, across up to 9 books (BetMGM, BetOnline, BetRivers, theScore, FanDuel, Kalshi, Novig, Pinnacle, Polymarket US). Per-book game prices, line history and props are on the game endpoints | robots `Allow` for all these `/api/*` paths, and "AI and LLM crawlers welcome, cite theoddsgap.com". **Licence: attribution plus link; bulk or automated reuse "needs a conversation first"** | **Primary source.** Works from CF. Fixes futures today. Iz should send the licensing note (draft below) |
| **Action Network** web API scoreboard | 200 | 200 | 11 NBA games; **6 books per game** (ids 15, 30, 68, 69, 71, 75) with ML, spread and total. Public %: null on scoreboard, but prod `/api/splits` already shows tickets and money | **robots `Disallow: /`** on api.actionnetwork.com; private API | Already in prod. Secondary. Legal risk is the same as today; Iz to decide |
| **FanDuel** `sbapi.{nj,mi}` content-managed-page | 200 | 200 | NBA page: 495 markets, including ML, spread, total, **milestone player props** (TO_SCORE_10+/15+/20+/25+) and **futures** (season wins, seeds, division) | No robots on the API host; sportsbook ToS not verified for automated access | Works from CF with the honest UA. Use only if Iz accepts ToS risk |
| **BetRivers via Kambi** `eu-offering-api.kambicdn.com/offering/v2018/rsiusnj/...` | 200 | 200 | 19 NBA events with spread, ML and total; `betoffer/event/{id}` returns **full props** (506 KB per event). Futures path needs the right category (my guess returned 400) | CDN, no robots; operator ToS not verified | Works from CF. Same ToS caveat as FanDuel |
| **Pinnacle** guest arcadia API | 200 | 200 | 13 NBA matchups plus 536 specials; `/leagues/487/markets/straight` returns **1,614 priced markets with limits, no key** (props included) | **Handoff: Pinnacle forbids scraping** | Technically the best sharp anchor; **don't use without Iz's explicit OK** |
| **DraftKings** nash/v5 | 403 honest UA; **200 browser UA (nash)** | 403 both | Not inspected (blocked for honest UA) | Akamai bot wall; ToS | Box-only, with a disguised UA. **Not recommended** (it violates the honest-UA rule) |
| Caesars (americanwagering) | 403 | 403 | n/a | CloudFront block | No |
| bet365 | 403 (challenge) | 403 | n/a | Cloudflare challenge | No |
| BetMGM site | 200 HTML | 200 HTML | Shell only; odds sit behind a cds-api access id (not probed) | ToS | No (not worth it) |
| theScore / ESPN Bet | 200 (3.5 KB SPA shell) | 200 | Shell only; GraphQL not probed | ToS | No |
| Fanatics | 200 HTML | **403** | n/a | n/a | No |
| **ESPN site API** (scoreboard, injuries, news, summary) | 403 honest; 200 browser UA | 403 honest; 200 browser UA | **One book (DraftKings) per game**; injuries (897 KB NBA); news; NFL summary includes venue, weather, officials and pickcenter | Akamai UA filter; ESPN ToS bars commercial use (handoff) | Already the backbone for schedules, injuries and scores. The UA issue is a policy question, since today's code sends `Mozilla/5.0` |
| **ESPN core API** (odds per event, futures) | 200 | **403** | Odds: **1 provider (DraftKings)** for this event. Futures: DraftKings | same | Box-only; now redundant with Odds Gap futures |
| Yahoo Sports odds page | 200 | 200 | HTML odds (BetMGM partner) | robots allows `/nba/odds/` | Low value (one book) |
| Covers / OddsShark | 200 | 200 | **Identical bytes**: OddsShark now serves the Covers page. Multi-book HTML (`data-book` = Novig, ProphetX, Polymarket, Underdog, …) | robots not parsed; ToS not verified | Possible but brittle HTML; skip in v1 |
| VegasInsider | 200 | 200 | HTML odds grid | robots disallows `*?*` | Skip in v1 |
| Polymarket gamma | 200 | 200 | NHL 2027 Champion, conference markets and more | **Commercial display forbidden (handoff)** | Iz decision |
| Kalshi | 200 | **429** | Sports events (51 open in the sample) | **Display needs consent (handoff)** | Iz decision |
| PrizePicks / Underdog / BettingPros | 403 / 426 / 403 | same | n/a | app-gated or key-gated | No |
| **Open-Meteo** | 200 | 200 | Hourly temperature, precipitation and wind | **Free tier is non-commercial**; commercial use needs their paid plan | Use **NWS api.weather.gov** (US, public domain, free) for US venues. For non-US venues, Iz decides on Open-Meteo (prod `/api/weather` already uses a venue forecast) |
| Reddit JSON | www 403; old.reddit 200, but it's a login wall | same | n/a | Reddit's API needs OAuth; commercial use needs an agreement | No free pipeline |
| X (syndication) | 429 honest; 200 browser | 429 | n/a | X API is paid; the agent's X connector is not a server pipeline | Not in v1 (see CATALYST-PLAN §3) |
| **NBA referee assignments** (official.nba.com) | 200 | 200 | Daily crew assignments page | robots allows | **Use** (Catalyst) |
| NBA CDN liveData | timeout / 403 | 520 / 403 | n/a | n/a | No |
| **NHL api-web** | 200 | 200 | Schedule; has an `oddsPartners` key | public | Use for schedule and rest |
| **MLB statsapi** | 200 | 200 | Schedule (offseason now) | public | Use for schedule, probables and umpires in season |
| Bovada (offshore) | 200 | 200 | Coupon JSON | offshore; ToS forbids | **No**; delete `scrape-live-odds` |

**What the table means**
- With **no paid feed and no ToS-forbidden scraping**, the only multi-book source that is robots-allowed is **The Odds Gap**, and it works from Cloudflare.
  - It already covers per-book game lines, futures, props, openers, closers and line history.
  - It has the licence condition above.
- Everything else multi-book is one of three things:
  - private and robots-disallowed (Action Network, already used);
  - sportsbook-direct (FanDuel and Kambi/BetRivers work from Cloudflare; ToS unverified);
  - explicitly forbidden (Pinnacle, offshore).
- **Cloudflare can reach almost everything that matters.** Only ESPN core (and Kalshi's rate limit) needs a non-Cloudflare runner, and Odds Gap futures replaces ESPN core futures.
- **So the off-Cloudflare runner becomes a backup, not a dependency.** That removes the class of failure that broke futures.

**Iz decisions needed (one line each)**
1. Send The Odds Gap licensing note (draft in §5)?
2. Keep Action Network (robots-disallowed) as the secondary source?
3. Allow FanDuel and BetRivers/Kambi direct JSON (works from Cloudflare, ToS unverified)?
4. Pinnacle, Kalshi and Polymarket stay off unless he says otherwise.

---

## 3. Build plan: one pipeline, one table family

### 3.1 Shape
```
 sources (adapters)            normalize                D1 (lean)                     readers
 ───────────────────           ─────────               ──────────                    ───────
 Odds Gap board/game/futures ┐                         events, event_alias            lib/market/read.js
 Action Network scoreboard   ├─► adapter → rows ─► upsert odds_current ─┐            ├─ board (/api/odds)
 FanDuel / Kambi (if OK)     │   (book,market,side,   insert odds_ticks │ (on change)├─ bot tools
 ESPN site (DK line, sched)  ┘    line,price,ts)       futures_current/ticks          ├─ grader / CLV
 box runner (ESPN core) ──► CF REST API ──────────►    source_health                  └─ alerts, Catalyst
                                                       R2: daily NDJSON archive of ticks
```

### 3.2 Schema (new D1 tables in `placebets-subscribers`; existing tables untouched until cutover)
- `events(event_id PK, league, starts_at, home, away, home_key, away_key, venue_id, status, espn_id)`
  - `event_id = <league>:<yyyymmdd ET>:<home_key>:<away_key>`, with team keys taken from the ESPN or league team ids.
- `event_alias(source, source_event_id, event_id, PK(source, source_event_id))`
  - This kills the `gap-…` versus `an-…` duplicates and the duplicate-picks bug.
- `books(book_id PK, name, kind ['sportsbook'|'exchange'|'dfs'], sharp INTEGER, affiliate_slug)`
- `odds_current(event_id, market ['ml'|'spread'|'total'], side ['home'|'away'|'draw'|'over'|'under'], book_id, line, price, captured_at, source, PK(event_id, market, side, book_id))`
- `odds_ticks(event_id, market, side, book_id, line, price, ts, source)`
  - A row is written only when `(line, price)` changes, so storage grows with real movement.
  - Index on `(event_id, market, ts)`. Keep 30 days in D1, archive daily to R2.
- `futures_current` / `futures_ticks(league, season, market, outcome_key, outcome_name, book_id, price, ts, source)`
- `props_current` / `props_ticks(event_id, player_key, stat, line, side, book_id, price, ts, source)`: phase 2.
- `source_health(source PK, last_ok, last_err_at, last_err, rows_last, latency_ms, consecutive_fail, expected_every_s)`
- **(calc)** Size: today's consensus `line_history` grows about 16K rows a day. Per-book × about 8 books ≈ 130K rows a day, about 3.9M rows over 30 days at about 100 B each ≈ 0.4 GB. That is inside D1 per-database limits, and it respects the "keep D1 lean" rule because older rows go to R2.

### 3.3 Writers
1. **Cloudflare (primary): one new Worker `placebets-ingest` on the PlaceBets account (2765cb27).** It has D1 bindings and its own crons.
   - Odds Gap: board every 5 minutes; game endpoints only for games starting in under 36 hours, every 10 minutes and in batches; futures every 60 minutes.
   - Action Network: every 5 minutes, per league.
   - FanDuel and Kambi: every 10 minutes, if allowed.
   - ESPN schedules, injuries and news: every 15 minutes.
   - It uses a shared `fetchPolite()`: honest UA `PlaceBetsBot/1.0 (+https://placebets.ai/bot)`, per-host concurrency 1, a minimum gap per host, ETag/If-Modified-Since where offered, and exponential backoff with a circuit breaker on 403/429 (pause the source for 30–120 minutes and record it in `source_health`).
   - It is a separate Worker, so the 15-minute site scheduler and Pages request limits are not involved. Check the account's Workers plan for the subrequest cap before fan-out; the free plan has far fewer per invocation than paid.
2. **Off-Cloudflare runner (backup, only for ESPN core and anything Cloudflare can't reach).**
   - The box has **no systemd and no cron** (PID 1 is `tini`).
   - Iz's laptop already runs OpenCode's `systemd --user` timers (`placebets-kalshi.timer`, per OPENCODE-DAILY-ALERTS), so the hardened runner belongs there as an **OpenCode task**: a `placebets-runner.service` plus `.timer`, `Restart=always`, a pinned Node and **pinned wrangler binary outside the repo** (the box loop died when the repo's `node_modules` vanished).
   - It writes through the Cloudflare D1/KV REST API with a scoped token.
   - It sends errors to the log, not to `grep`.
   - It writes a heartbeat (`source_health.runner`) each run.
   - **No GitHub Actions.** I can't run commands on the laptop myself.
   - If Iz wants it on the box instead: a supervisor loop plus an hourly Grok Bot routine that checks the heartbeat and restarts it.
3. **Alerting.** A Cloudflare cron checks `source_health` every 15 minutes. If a source exceeds 3× its expected interval or has 5 or more consecutive failures, it:
   - emails Iz with a once-per-6-hours dedupe, using the site's existing email path;
   - flips the source to `stale` for readers.

### 3.4 Readers and fail-soft (one module, used by everyone)
- `lib/market/read.js` exports `getGame(eventId)`, `getSlate(league, window)`, `getFutures(league, market)`, `getProps(eventId|player)` and `getHistory(eventId, market, book?)`.
- Each one returns `{ prices[], best, consensus_no_vig, asOf, sources[], stale:boolean, missing:[{what, reason}] }`.
- **No price means `missing: [{what: 'Stanley Cup futures', reason: 'no book or exchange price in the last 6h'}]`.** The UI and bot render this as **"No price available"**.
- **Delete the standings fallback from every price path** (`lib/futures.js` standings ranking). It may still appear only as a labelled "standings" stat, never with the words no-vig, fair, edge, value or Kelly.
- Staleness thresholds:

  | Market | Stale after |
  |---|---|
  | Pregame lines | 30 minutes |
  | Within 2 hours of start | 10 minutes |
  | Futures | 6 hours |
  | Props | 30 minutes |

- **Attribution in the UI and bot:** "Prices via The Odds Gap (link)" wherever their figures appear (licence condition).
- **Naming books:** production now shows anonymised "Book A…G" (`/api/edges`). Affiliate revenue needs named books and deep links. Iz or the owning agent should say why they were anonymised, possibly a compliance choice, before naming them.

### 3.5 Cutover
1. Shadow mode: the ingest writes the new tables while the old ones keep running.
2. A diff report per league compares new `odds_current` best prices against today's board for 48 hours.
3. Switch `/api/odds`, bot tools, the grader/CLV and `/api/edges` to the readers.
4. Delete the dead and forbidden scrapers: `scrape-live-odds` (offshore), `scrape-sportsbooks` (defunct), `sportsbook-scrapers.js`, `odds-api-free.js`, `the-odds-api.js` paths, `multi-source-scraper.js`, and the standings-as-price path.
5. Retire the box futures loop.

### 3.6 Effort (engineer-days, one agent)

| # | Step | Days |
|---|---|---|
| 0 | Get prod `04616bb` into GitHub, name the owner, `npm ci` on the build box | 0.5 (coordination) |
| 1 | Canonical `events` + `event_alias` from ESPN/NHL/MLB schedules, with backfill of `line_history` ids | 2 |
| 2 | Tables, migrations (proposed, applied only on approval), R2 archive job | 1.5 |
| 3 | `fetchPolite` + `source_health` + alert email | 1 |
| 4 | Odds Gap adapter (board, game per-book, futures) | 2 |
| 5 | Action Network multi-book adapter (stop collapsing 6 books to 1) | 1 |
| 6 | FanDuel + Kambi adapters (only if Iz allows) | 2 |
| 7 | `lib/market/read.js` + fail-soft + remove standings-as-price | 1.5 |
| 8 | Shadow diff, cutover of board, bot, grader and edges | 2.5 |
| 9 | Laptop runner (OpenCode) for ESPN core backup | 1 |
| | **Total** | **about 13–15 days** (about 11–13 without step 6) |

**Monthly cost:** $0 in new subscriptions. It uses the existing Cloudflare Workers, D1 and R2 on the account. Watch the Workers plan subrequest limits.

## 4. Fail-soft contract (tests that gate every deploy)
- An eval item fails if any answer or page shows **no-vig, fair, edge, value or Kelly next to a number not traceable to an `odds_current` or `futures_current` row**.
- An eval item fails if a futures or props ask with no rows returns anything other than "No price available" plus what we do have.
- The page test fails on any price older than its staleness threshold that isn't shown with a stale badge.

## 5. Draft for Iz (not sent): licensing note to The Odds Gap
- To: admin@theoddsgap.com
- Subject: PlaceBets.ai: automated use of your free board and futures with attribution
- Body: "Hi, I run PlaceBets.ai, a free odds and research site (no paywall, 21+, responsible-gambling links on every page). We already credit The Odds Gap with a link wherever your figures appear. We'd like to read your robots-allowed /api/ feeds (board, game, futures, line history) on a modest schedule: about every 5 minutes for the board and hourly for futures, with an identified user agent. Your licence asks for a conversation before bulk or automated use. Are these terms OK with you, and are there rate limits or a preferred endpoint you'd like us to use? Happy to add a more prominent credit. Thanks, Iz"
