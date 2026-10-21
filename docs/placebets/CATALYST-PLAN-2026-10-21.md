# Catalyst v2: a "Bloomberg Terminal for betting lines"
Wed Oct 21, 2026, about 2:15 PM ET. Research and design only; nothing was deployed.
Companion to `SCRAPER-PLAN-2026-10-21.md`, which covers the data pipeline Catalyst depends on.

## 1. What exists today (Catalyst v1, live on placebets.ai)
I found it by inspecting the live site, because the **code isn't in GitHub or on the box** (grep for "catalyst" finds only old PLAN/HANDOFF text). Production commit `04616bb` comes from OpenCode on the laptop; see SCRAPER-PLAN §0.

**Entry and gate**
- The nav item "◆ CATALYST SYSTEM" leads to `/terminal`: "Catalyst System — see what is actually moving the money".
- **It is gated behind an email form** ("Enter the desk… One address opens it"), on both desktop and mobile.
- Screenshots: `audit-1021/terminal-desk1440*.png`, `terminal-mob412*.png`.
- I did not submit an email, so the panels below come from the page bundle and the APIs it calls.

**Panels** (strings from `app/terminal/page-*.js`)
- LINE MOVEMENT / OUR TICKS / ML SHIFT
- **WHY THIS LINE IS MOVING**
- SHARP / PUBLIC SPLIT (tickets versus money)
- CROSS-BOOK EDGE, BEST PRICE SHARE
- PREDICTION MARKET
- PUBLIC ATTENTION ("vs own normal", peak day)
- NEWS WIRE, INJURY / ROSTER WIRE
- THE EVENT FILE
- PUBLISHED LEDGER ("our record on this game")

**How "why" works in v1**
- For a move, it counts injury and headline items for either team that fall **inside the time window before the move**.
- It labels them **"candidates, not proof"**, or says "nothing timestamped before this move".
- Weather is shown when the venue forecast crosses a threshold: "A candidate, not proof."
- The honest labelling is good and should be kept.

**APIs behind it** (all return 200 today)

| API | What it returns |
|---|---|
| `/api/line-history?eventIds=` | 15-minute resolution, 72 h window, 30-day retention. **Consensus only.** From D1 `line_history` (48K rows since Oct 18) |
| `/api/edges` | `moves` (60), `ev` (23, with per-book prices), `longshots`, `suspect`, `bestPriceShare`. **Books anonymised as "Book A…G"** |
| `/api/splits` | Tickets and money % per market (Action Network data) |
| `/api/injuries` | ESPN injury and practice-report rows (for example "Did Not Participate In Practice") |
| `/api/weather` | Venue, roof, lat/lon, forecast; 34 signals out of 149 grounds |
| `/api/attention` | Wikipedia-pageview style public attention; "no_article" for the Lakers/Warriors test |
| `/api/news`, `/api/trending`, `/api/kalshi`, `/api/receipts`, `/api/alerts` | Supporting feeds |

**Defects found today (measured)**
1. **Contradictory move data.**
   - `/api/edges` says Cowboys @ Eagles moneyline moved "from −128 to +180" (ML shift −19.7 pts).
   - `/api/line-history` for the same event id shows home ML 230 → 186 over the same days.
   - Two sources with different side conventions are being mixed. Canonical ids and per-book ticks fix this.
2. **No per-book ticks.** So there's no "which book moved first", no steam detection, and no origin of a move.
3. **Duplicate ids per game** (`gap-…` and `an-…`), so moves and picks split across ids.
4. **Attribution is team-level time-window matching only.** There's no player importance, no direction check (does the news *predict* this direction?), no knock-on markets, and no props.
5. **The email gate hides the product from users and from Google.** Nothing in Catalyst can rank in search.
6. **The futures panel inherits the dead box loop** (SCRAPER-PLAN §1).

## 2. What comparable products do (sourced)

| Product | What maps to Catalyst | Source |
|---|---|---|
| **Bloomberg Terminal** | `GP` price chart with a **News** toggle: click a date to see the news that day, so events sit on the price line. `CN` is company news filtered by date or topic, "set a date if you notice a discontinuity in GP". `SPLC` shows suppliers and customers with revenue/cost % and their price changes, i.e. a dependency graph with exposures. Alerts on developments | [UMich guide](https://kresgeguides.bus.umich.edu/bloomberg/TozziCodes), [Duke guide](https://guides.library.duke.edu/bloomberg/functions), [DoC SPLC guide](https://library.doc.gov/c.php?g=1257152&p=9211692), [Bloomberg](https://www.bloomberg.com/professional/insights/trading/researching-supply-chain-exposures-how-to-analyse-coronavirus-related-risks/) |
| **Action Network PRO Report** | Icons per game: Sharp Action (Sports Insights Bet Signals, i.e. market-wide sudden moves), Big Money (tickets versus money), PRO Systems (historical angles), Model Projections (≥5% versus line). Their education material treats reverse line movement and steam ("sudden, drastic and uniform line move across the marketplace") as the core tells | [PRO Report](https://www.actionnetwork.com/nfl/nfl-pro-report-sharp-action-betting-systems-model-projections-expert-picks), [Sharp Money 101](https://www.actionnetwork.com/education/sports-betting-sharp-money-professional-picks), [What is a sharp](https://www.actionnetwork.com/education/sharp-sports-betting) |
| **Unabated** | Vig-free "Unabated Line" from the sharper books. **Per-book line history on click.** "Use sharp book history to see where the market has moved, how far recreational books are lagging and which news or timing patterns tend to matter." Inline news | [Odds Screen](https://unabated.com/tools/core/odds) |
| **OddsJam** | Odds screen colours cells by size and direction of move, with hover for history. Alerts on significant moves | [OddsJam line movement](https://oddsjam.com/betting-education/how-to-use-the-oddsjam-screen-line-movement) |
| **BettingPros** | Prop analyzer: line history versus results, matchup **injury insights inside matchup screens**, custom line alerts, "Sharp" AI assistant (paid tier) | [App Store](https://apps.apple.com/us/app/bettingpros-picks-odds/id1468109182), [support](https://support.bettingpros.com/hc/en-us/articles/26544514477339-What-is-included-with-BettingPros-PLUS-and-ELITE-subscriptions) |
| Pikkit | Bet sync and tracking, not causal analysis (from the earlier strategy research) | [Pikkit](https://pikkit.com/bet-tracker) |
| Swish Analytics, Sportradar/Genius dashboards | Not researched in depth this session: no public UX detail verified. Swish markets line tracking and injury research; Sportradar and Genius sell B2B trading feeds | n/a |

**The gap nobody fills for free:** a per-game, per-market **timeline that pins each move to a timestamped cause and explains the knock-on markets**. Unabated comes closest, but it's paid and news sits beside the chart rather than linked to the move. That gap is Catalyst's opening.

## 3. Catalyst v2 design

### 3.1 Data (on top of the SCRAPER-PLAN tables)
**`catalysts`**
- Columns: `(id, kind, subkind, league, event_id NULL, team_key, player_key NULL, published_at, seen_at, source, url, headline, payload_json, entity_weight, dedupe_key)`.
- `published_at` is the source's own timestamp. `seen_at` is when we first saw it. The order between them is what lets us claim "before the move".

**Catalyst kinds and free sources**

| Kind | Free source (works from Cloudflare unless noted) | Detection |
|---|---|---|
| injury_status_change / practice_report | ESPN injuries (site API) | **diff** against the previous snapshot (Questionable → Out), not the raw list |
| lineup_confirmed / depth_chart | ESPN game summary (rosters/starters); NHL api-web; MLB statsapi probables | diff |
| weather_forecast_change | NWS api.weather.gov for US venues; Open-Meteo only if Iz accepts its commercial terms | change past a threshold (wind ≥15 mph, precipitation ≥50%, temperature ≤25°F) at an open-air venue |
| venue / roof / surface | ESPN summary plus the existing `/api/weather` grounds table | static |
| travel_rest / back_to_back / 3-in-4 / road-trip length / timezone shift | **computed** from schedules (ESPN, NHL, MLB) | code |
| ref_assignment / umpire | official.nba.com referee assignments (daily); ESPN NFL summary officials; MLB statsapi umpires in season | parse; tendencies computed later from our own results history |
| coaching_change | ESPN news plus Wikipedia | keyword plus entity match, human-readable |
| news | ESPN news API, existing news wire (`news_items`) | entity match (team/player), dedupe |
| market_signal: steam, RLM, book-leader move, key-number cross, split divergence | **computed** from `odds_ticks` and splits | code (§3.2) |
| schedule_spot: lookahead, letdown, post-OT, rivalry | computed | code |
| social | **Deferred.** No free sanctioned server read for X or Reddit (probe: X 429 or paid; Reddit OAuth or commercial). Revisit only with a paid or licensed path, which Iz has rejected for now | n/a |

### 3.2 Move detection (code, from per-book `odds_ticks`)
- **Move:** the consensus no-vig probability changes by at least 2.0 points, or a spread or total crosses a key number (NFL 3/7/10, totals 41/44/47, and so on), within a rolling 60 minutes.
- **Origin:** the first book whose tick started the move. A move is flagged `sharp_origin` when a book marked `sharp=1` moved first and the others followed within 10 minutes.
- **Steam:** at least 4 books move the same direction within 5 minutes.
- **Reverse line movement:** the move goes against the side holding 60% or more of tickets (from splits).
- **Money/ticket divergence:** money % minus tickets % is at least 15.
- **Every threshold is a constant in one file and appears in the UI** ("how the numbers are made").

### 3.3 Attribution (code): linking moves to catalysts
For each move M at time t (the first book tick), score each catalyst C:
- **Entity match:** C must be about a team or player in the event (or the venue).
- **Time:** `published_at` within [t − 6 h, t + 5 min]. Weight decays with the gap. Pregame injury news gets a longer window than in-game events.
- **Direction check:** each kind has an expected direction. For example, a home starter ruled out should move the home side's probability down and, in the NBA, the total down. If M goes the other way, C's score is cut sharply.
- **Importance:** `entity_weight` from the player's share of team minutes, usage or snaps, computed from ESPN box scores in code. Phase 1 uses starter or bench.
- **Labels:**
  - `confirmed order`: C was published before the first book moved, and it's the top-scoring candidate.
  - `candidate`: inside the window, but the order is unprovable or a near-tie.
  - `no public catalyst found`: nothing matched. The UI says "Market-driven move; no public news before it (consistent with sharp action)". It never invents a reason.
- Output rows go to `move_attribution(move_id, catalyst_id, score, label)`. Tests pin a dozen hand-labelled historical moves.

### 3.4 Causal-impact graph (code; the model only writes prose)
- **Nodes:** catalysts, entities (player, team, venue, referee crew) and markets (ML, spread, total, team total, player props).
- **Edges** come from a rule table, `impact_rules(sport, kind, role, market, expected_direction, basis)`. NBA examples:
  - Starting C out → own team's rebounds props for the backup C go up. Opponent's starting C rebounds go up. Own team total goes down. Game total goes down. Spread moves toward the opponent.
  - Primary ball-handler out → teammates' usage and assists up; team total down.
  - Wind ≥15 mph in an open-air NFL game → total down; passing yards props down; kicking props down.
  - Back-to-back road game (second night) → that side's probability down; total down in the NBA.
  - Referee crew with a high foul rate (from our own logged results) → free throws and total up.
- **Magnitudes:** phase 1 shows **direction only**, plus the **measured** market reaction (the actual tick deltas on each linked market, which are data, not estimates).
- Phase 2 adds historical on/off splits computed in code from ESPN box scores ("in the 14 games without X this season, team rebounds averaged …"). Only numbers we computed appear, with sample size.
- **Prose:** the LLM gets the graph JSON and writes 2–4 sentences in the trader voice, using `{ref}` placeholders that code fills and verifies (same contract as the bot). If verification fails, a deterministic template ships.

### 3.5 Screens (terminal style; ungate reading, gate only alerts)
**Desktop at 1440/1920**
- **Left:** watchlist and slate, with each game's biggest move since open, a steam flag and a catalyst count.
- **Centre:** per-market chart with **one line per book**, consensus in bold, and **catalyst markers on the time axis**. Clicking a marker opens the item, like Bloomberg GP plus News.
- **Right:** **"Why it moved"** card (top attribution and label, origin book, steam/RLM chips, measured knock-on moves), then the catalyst feed for this game (like CN).
- **Bottom:** **impact graph** (catalyst → entities → markets, like SPLC), with each edge showing the measured tick delta.
- **Command bar** ("NBA LAL" opens the game; "MOVES NFL" lists moves; "WHY LAL TOTAL").

**Mobile at 412**
- A single column: price header, then a timeline list (time · catalyst · market reaction), the why-card, and the graph collapsed into "This affects: Total ↓ 1.5, Reaves reb O/U ↑ 0.5".

**Other**
- **SEO:** every game gets an indexable `/odds/<league>/<game>/movement` page, ungated, with "As of" time and attribution. This fixes the gate hiding Catalyst from search.
- **Alerts** (email now, using the existing `push_subscriptions` table for web push later), per watchlist:
  - steam;
  - a starter's injury status changes;
  - a key-number cross;
  - a best price beats the no-vig consensus by X;
  - a new ref assignment for a followed team.

### 3.6 Bot on Catalyst
- **New tools:**
  - `why_moved(event, market)` returns attributions and measured deltas.
  - `catalysts(event | team | player, since)`.
  - `impacts(player | catalyst)` returns graph edges and measured reactions.
  - `market(event)` comes from SCRAPER-PLAN readers.
- **Code fills every number. The model never computes.**
- Without data the bot says what's missing ("No public catalyst before this move").

## 4. Ranked plan (the backbone): data first, then Catalyst, then bot, then UI
Effort is in engineer-days for one agent. No new subscriptions; the same Cloudflare account.

| Order | Workstream | Items | Days | Unblocks |
|---|---|---|---|---|
| **0** | Coordination | Production `04616bb` pushed to GitHub. One owner named. Iz answers the 4 source decisions (SCRAPER-PLAN §2) and sends the Odds Gap note | 0.5 | Everything (otherwise the next deploy reverts today's production) |
| **1** | **Data pipeline** | Canonical events, per-book `odds_ticks`/`odds_current`/futures, Odds Gap + Action Network adapters (FanDuel/Kambi if allowed), `source_health` + alerts, readers + fail-soft, shadow + cutover | 13–15 | Line shopping, honest futures, steam/origin, CLV |
| **2** | **Catalyst engine** | `catalysts` ingest + diffs (injuries, lineups, NWS weather, refs, news, schedule spots) 4d; move detector (steam/RLM/origin/key numbers) 2d; attribution scorer + tests 2.5d; impact rules v1 NBA + NFL (direction + measured reactions) 3d; APIs 1d | 12–13 | "Why it moved" with receipts |
| **3** | **Bot** | Tool loop on readers + Catalyst tools, 6 s budget, claim-tag verification, golden eval with hard gates | 6–8 | A bot that explains moves with real numbers |
| **4** | **UI** | Terminal desktop + mobile, ungated SEO movement pages, named-book odds screen (after Iz's book-naming decision), alerts UI | 8–10 | Retention, SEO and affiliate clicks |
| | | **Total** | **about 40–47** | |

Phase 2 later: props ticks and props catalysts, on/off historical magnitudes, referee tendency stats, MLB umpires in season.

## 5. First build slice to ship (about 4–5 days, after step 0)
**"Honest futures + per-book NBA/NFL movement with injury markers."** It is the smallest slice that fixes the visible lie and starts the Catalyst backbone.
1. `placebets-ingest` Worker (PlaceBets account) runs crons:
   - Odds Gap futures, hourly. NHL, NBA, NFL and MLB per-book go to `futures_current`/`futures_ticks`.
   - Odds Gap board, every 5 minutes, plus Action Network 6-book NBA/NFL scoreboard, every 5 minutes. Both go to `odds_ticks`/`odds_current` under canonical `events` ids (NBA + NFL only).
   - `source_health` plus an email alert to Iz on staleness.
2. `lib/market/read.js`: `getFutures` and `getGame` with the fail-soft contract. **Delete the standings-as-price path.**
   - The bot's futures answers read per-book prices with "As of" time and "via The Odds Gap", or say "No price available".
3. Catalyst v2 minimal:
   - ESPN injury-status **diff** for NBA/NFL goes to `catalysts`.
   - A move detector on the new ticks.
   - `/api/catalyst/game?event=` returns `{ticks per book, moves, candidate catalysts with label}`.
4. UI: on the existing game page, add a "Movement" block: a per-book line chart with injury markers and a why-card, ungated. Desktop 1440/1920 and mobile 412 screenshots.
5. Gate:
   - New eval items: Stanley Cup, Super Bowl, "why did the Eagles line move", a no-price futures market.
   - Then `scripts/deploy-safe.sh` (preview → smoke → prod → smoke).
   - Ask Iz whether the Oct 15 preview waiver still holds.

**Acceptance:**
- "Who will win the Stanley Cup" quotes real per-book prices (for example from the Odds Gap NHL futures books) and never uses a standings percentage.
- An NBA game page shows per-book ticks and at least one labelled catalyst marker, or the explicit "no public catalyst found".
- `source_health` is green for 24 hours.
