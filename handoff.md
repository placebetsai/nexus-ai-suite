# Nexus AI Suite — Mission Handoff

## What We're Building & Why

**Two flagship apps (Fashionistas.ai + CreateStuff.ai) rebuilt for REAL — web first, then Android.** Deployed on Cloudflare's free/cheap infrastructure. No fake scaffolding, no canned fallbacks, no lies. Every feature is a real, live, testable URL on this machine.

**Why:** Prove free AI agents can build, deploy, and operate real scalable SaaS products. Store everything on THIS computer (no GitHub — origin removed 2026-09-23).

---

## Live URLs (CURRENT — verified 2026-09-23)

### Active Flagship App: Fashionistas.ai
| Layer | URL |
|-------|-----|
| Frontend | https://fashionistas-ai.pages.dev (static shell — rebuild in progress) |
| **API (REAL, live)** | **https://fashionistas-api.fashionistas1979.workers.dev** |
| D1 DB | fashionistas-db `0c1b88be-00b2-4e25-ae54-d30564190c4d` (FASH acct) |
| R2 images | `fashionistas-images` bucket |
| AI vision | llama-3.2-11b-vision-instruct via workers `AI` binding (REAL, source:"ai") |

**API status:** auth (register/login/JWT), listings CRUD + crosspost/sold/platforms, fees real-calc, shipping real-calc, orders, hauls, analytics, profit/summary, messages templates, export CSV, marketplaces, **ai/analyze = REAL vision** (identifies item type/brand/color/condition/price ranges from a photo via Cloudflare workers AI). Deployed 2026-09-23 (version `09eb5e7e` → `18a784f`).

### Active Flagship App: CreateStuff.ai
| Layer | URL |
|-------|-----|
| Frontend | https://createstuff-app.pages.dev (prod Pages) → custom domain **app.createstuff.ai** |
| **API (REAL, live, do NOT overwrite)** | **https://api.createstuff.ai** (zone route → forge-api) |
| D1 DB | forge-db `6b468863-8193-4c7b-9da7-33782149762f` (CS acct) |
| R2 | `forge-projects` bucket |
| Bindings | AI, Anthropic, Groq, E2B sandbox, Durable Object ChatRooms, JOB_QUEUE `forge-jobs`, DLQ, JWT |

**CreateStuff status:** forge-api is a real sophisticated backend (register → project → ai/generate returns real multi-file site in ~36s, verified end-to-end at api.createstuff.ai). A clean rebuild exists in `workers/forge-api/` but is NOT deployed (queue bindings). Frontend needs a professional rebuild (in progress).

### Other 3 apps (PlaceBets / MarketPicks / IHateCollege) — earlier build, not part of current rebuild focus.

### Portfolio Sites
- https://israeljoffe.com
- https://israeljoffe.org (deployed to 8562e255.israeljoffe-org.pages.dev)

### All apps have a fixed bottom bar linking to every other app + all API endpoints for easy testing.

---

## What Was Built — Complete Feature List

### 1. CreateStuff.ai — Free Replit Alternative
- Monaco code editor with syntax highlighting (HTML/CSS/JS)
- Live preview pane
- AI assistant (calls OpenCode Zen API for code generation)
- 6 project templates: SaaS Starter, E-Commerce, Portfolio, Chat App, Blog, Portfolio
- Prompt builder with AI suggestions
- Template selector with difficulty levels
- Auth system (signup/login/me) via Cloudflare KV + D1
- Deploy to Cloudflare Pages integration

### 2. Fashionistas.ai — AI Fashion Marketplace
- **Snap & Identify:** Camera/photo upload with canvas-based color analysis (mock AI)
- **AR Try-On:** Camera overlay with garment selection, zoom/rotate/flip controls
- **Multi-Marketplace Listing:** One-click post to Poshmark, eBay, Depop
- **Buyer Marketplace:** Search, filters, featured carousel, item detail views
- **Trending Feed:** Social-style feed with likes, comments, discussions
- **Fashion Blogs:** AI-generated blog content
- **Wardrobe Management:** Upload, organize, track clothing items
- Auth system via D1
- Marketplace config with fee structures, API endpoints, category mappings

### 3. PlaceBets.ai — AI Sports Picks
- **Live Odds:** 5 sportsbooks (DraftKings, FanDuel, BetMGM, Caesars, PointsBet)
- **AI Picks:** Confidence scores, strategy labels, signal analysis, expected value
- **Live Scores:** Auto-updating across 9 sports (NFL, NBA, MLB, NHL, Soccer, CFB, MMA, Tennis, Golf)
- **Parlay Calculator:** Multi-leg combinations, implied probability, vig-free analysis
- **Bankroll Management:** Kelly criterion, risk levels, stop-loss, daily limits
- **Historical Performance:** 60-day history with sport/strategy breakdowns
- **Bet Tracker:** Log bets, track P&L (uses D1 for persistence)
- **News Feed:** 20 headlines with sentiment analysis
- Auth system (signup/login) via D1

### 4. MarketPicks.ai — AI Stock Picks
- **28 Stocks:** Real-time simulated prices across 8 sectors
- **AI Picks:** BUY/SELL/HOLD signals with confidence scores
- **Sector Analysis:** Technology, Financial, Healthcare, Energy, etc.
- **News Feed:** 15 financial headlines with impact tags
- **Earnings Calendar:** Upcoming and reported earnings with EPS estimates
- **Technical Indicators:** RSI, MACD, SMA computation
- **Portfolio Tracker:** Holdings with gain/loss calculations
- **Watchlist:** Add/remove stocks (uses D1)
- Auth system via D1

### 5. IHateCollege.com — Career Alternatives Education
- **6 Career Paths:** Web Development, AI/ML Engineering, Cybersecurity, UX Design, Cloud/DevOps, Digital Marketing
- **ROI Calculator:** $120K college vs $15K bootcamp vs $5K self-taught with salary projections
- **Lesson System:** Structured curriculum per path
- **Progress Tracking:** Completed lessons, overall progress (uses D1)
- **Success Stories:** Real-world career change stories
- **Positioning:** Practical education alternatives, neutral, ROI-focused
- Auth system via D1

---

## Architecture

```
Frontends:     Cloudflare Pages (static HTML/JS/CSS, no frameworks)
APIs:          Cloudflare Workers (serverless JS)
Database:      Cloudflare D1 (SQLite at edge, 5 databases)
Cache:         Cloudflare KV (sessions, templates)
Auth:          SHA-256 password hashing + Bearer token sessions
AI Models:     OpenCode Zen free models (mimo-v2.5-free, etc.)
Deployment:    Direct wrangler CLI (no GitHub Actions waste)
Payments:      Demo checkout flow (Stripe deferred)
```

### D1 Database IDs
| Database | ID |
|----------|-----|
| createstuff-db | cc9ab7ed-b343-4883-bf76-07f8493cba9e |
| fashionistas-db | 0c1b88be-00b2-4e25-ae54-d30564190c4d |
| placebets-db | 20eb5aaa-2c3a-45ca-be9d-d35c21c9161d |
| marketpicks-db | bcc97511-60b8-4fd7-ad03-f2c458b80c6a |
| ihatecollege-db | b4fb4c53-d3d3-4b67-8aa0-3e8d06823e0b |

### D1 Schema (7 tables per DB)
- `users` — id, name, email, password_hash, created_at
- `projects` — id, user_id, name, template, html/css/js_code (CreateStuff)
- `listings` — id, user_id, title, description, category, condition, size, price, status, marketplaces, image_url (Fashionistas)
- `bets` — id, user_id, sport, game, pick, amount, odds, status, profit_loss (PlaceBets)
- `watchlist` — id, user_id, ticker, added_at (MarketPicks)
- `portfolio` — id, user_id, ticker, shares, avg_cost (MarketPicks)
- `progress` — id, user_id, path_id, lesson_id, completed, completed_at (IHateCollege)

---

## Mobile Apps (React Native — Created, Not Built)

| App | Directory | Screens |
|-----|-----------|---------|
| CreateStuff Mobile | createstuff-mobile/ | Home, Editor, Templates, AI, Settings |
| Fashionistas Mobile | fashionistas-mobile/ | Home, Snap, AR, Marketplace, Profile, Checkout |
| PlaceBets Mobile | placebets-mobile/ | Home, Odds, Picks, Parlay, Tracker |
| IHateCollege Mobile | ihatecollege-mobile/ | Paths, Lessons, Progress, ROI, Settings |
| MarketPicks Mobile | NOT CREATED | Agent was cancelled |

---

## MCP Hive — 9 Free AI Agents

> **STATUS (2026-09-23): REBUILT AS REAL OPENCODE HIVE — `hive/` (v2).**
> The old orchestrator was a SIMULATION (random timers/canned strings). The new hive dispatches REAL free opencode agents in parallel with automatic fallback. Verified: 8/8 agents ack in 21.6s, 19/19 readiness tests pass.
> - Roster: `hive/hive.json` · Briefs: `hive/agents/*.md` · Engine: `hive/dispatch.mjs` · Panel: `hive/server.js` (http://localhost:3141)
> - Probe run: `node hive/test/readiness.test.mjs` · Dispatch: `node hive/dispatch.mjs "<prompt>" --all`
> - Zen free models (mimo-v2.5-free etc.) listed in config but need OPENCODE_API_KEY on this box; dispatcher auto-falls back to authenticated default free model. All §9 agents below remain the persona map.

| Agent | Model | Role |
|-------|-------|------|
| Atlas | mimo-v2.5-free | Full-stack builder |
| Vogue | muse-spark-1.3-contributor-free | Fashion specialist |
| Pulse | muse-spark-1.3-contributor-free | Sports data |
| Ticker | ling-3.0-flash-fin-free | Financial data |
| Rebel | muse-spark-1.2-contributor-free | Education |
| Nexus | union-alpha-free | Orchestration/deployment |
| Mnemonic | big-pickle-free | QA testing |
| Curator | opencode-zen-free | Portfolio/memory |
| Sentinel | nemotron-3.5-lightning-free | QA/security |

**How to dispatch:** Use the Task tool with `subagent_type: "general"` for each agent.

---

## Credentials & Config

> **⚠️ CREDENTIALS STORED 2026-09-23 — do NOT lose.**
> Full secrets live ONLY in `.secrets/cf.env` (gitignored, chmod 600). Raw token values MUST NOT be pasted into this repo — it is PUBLIC.

> **🚫 NO GITHUB — LOCAL-FIRST (DECIDED 2026-09-23).**
> This machine is the source of truth. Git remote origin REMOVED; repo is local-only. Deploy exclusively via `wrangler` direct to Cloudflare using `./deploy.sh` (auto-routes to the right account) or the manual commands in FEDERATION.md. Both Cloudflare accounts verified working with wrangler 4.137.0.

| Item | Value |
|------|-------|
| GitHub Org | placebetsai |
| GitHub PAT | [REDACTED - see env vars] |
| **CreateStuff Cloudflare Account ID** | `2765cb2786006552f33cc3dfe0b680a1` |
| CreateStuff API Token | `cfat_...` → **`.secrets/cf.env` → `CS_API_TOKEN`** (token: `dark-cell-ecf9`, created 2026-09-23, VERIFIED live) |
| CreateStuff R2 | `.secrets/cf.env` → `CS_R2_ACCESS_KEY` / `CS_R2_SECRET` / `CS_R2_ENDPOINT` |
| **Fashionistas + all Nexus Cloudflare Account ID** | `7eb89b01e9c3bec41ee24db8ecbe77f8` |
| Fashionistas/Nexus API Token | `cfat_...` → **`.secrets/cf.env` → `CF_API_TOKEN`** (token: `yellow-math-1874`, created 2026-09-23, VERIFIED live) |
| Fashionistas/Nexus R2 | `.secrets/cf.env` → `CF_R2_ACCESS_KEY` / `CF_R2_SECRET` / `CF_R2_ENDPOINT` |
| PMI-CPMAI # | 2509803 (expires 9/2/2028) |
| Node.js | v24.19.0 |
| Wrangler | (install via `npm i -g wrangler`) |

### Loading credentials (Linux)
```bash
cd /home/joffe/projects/nexus-ai-suite
set -a; source .secrets/cf.env; set +a
# CS app deploy:    CLOUDFLARE_API_TOKEN=$CS_API_TOKEN CLOUDFLARE_ACCOUNT_ID=$CS_ACCOUNT_ID npx wrangler ...
# Nexus apps deploy: CLOUDFLARE_API_TOKEN=$CF_API_TOKEN CLOUDFLARE_ACCOUNT_ID=$CF_ACCOUNT_ID npx wrangler ...
```

### Wrangler Command (PowerShell — legacy machine, token now in cf.env)
```powershell
$env:CLOUDFLARE_API_TOKEN = "<your-token>"
$env:CLOUDFLARE_ACCOUNT_ID = "<your-account-id>"
& "C:\Users\ASUS2\AppData\Roaming\npm\wrangler.cmd" pages deploy . --project-name=NAME
```

---

## Portfolio Site Updates (israeljoffe.com)

- **TAGLINE:** PMP Certified - PMI-CPMAI Certified in AI Management - Senior Executive in Finance & Fintech
- **SITE_DESC:** Senior executive in finance and fintech, PMP certified, PMI-CPMAI certified in AI management
- All DFC (Data Fusion Corporation) references REMOVED from build.py and all rendered pages
- About page reads: "PMP Certified - PMI-CPMAI Certified in AI Management - Senior Executive in Finance & Fintech"
- No current employer references — emphasizes certifications and executive positioning
- Special character encoding fixed (emoji removed from meta tags)
- Deployed to both israeljoffe.com and israeljoffe.org

---

## Shared Components
- `shared/demo-checkout.js` — Fake credit card form with processing animation, "Demo Mode" banner
- `shared/upgrade-pricing.js` — Free/Pro $9.99/Business $29.99 pricing tiers
- `db-schema.sql` — D1 schema (7 tables)
- `wrangler-d1.toml` — D1 bindings config for all apps

---

## What's Done (VERIFIED — 42/42 TESTS PASS)
- [x] 5 web apps deployed and live with full SPA functionality
- [x] 5 Cloudflare Worker APIs deployed and responding
- [x] 5 D1 databases created and initialized with schema
- [x] D1 bindings wired into all wrangler.toml files
- [x] PlaceBets worker.js updated to use D1 (persistent auth + bet tracking) — VERIFIED
- [x] CreateStuff worker uses KV + D1 — VERIFIED
- [x] Fashionistas worker updated for D1 (auth, listings) — VERIFIED
- [x] MarketPicks: sectors, news, earnings, indicators routes added — VERIFIED
- [x] IHateCollege: route matching fixed (leading slash bug) — VERIFIED
- [x] Cross-app navigation footer on all 5 apps — VERIFIED
- [x] QA: 42/42 PASS — all frontends + all APIs + auth flows + D1 persistence
- [x] Portfolio sites updated (DFC removed, PMP/CPMAI emphasis)
- [x] Mobile app projects created (4 of 5)

## Test Results (2026-09-20)
```
=== 5 FRONTENDS ===
PASS CreateStuff.ai - 200 - 108792 bytes
PASS Fashionistas.ai - 200 - 112082 bytes
PASS PlaceBets.ai - 200 - 90798 bytes
PASS MarketPicks.ai - 200 - 75517 bytes
PASS IHateCollege.com - 200 - 79991 bytes

=== CreateStuff API ===
PASS /api/templates - 5 templates
PASS /api/auth/signup
PASS /api/auth/login+me

=== Fashionistas API ===
PASS /api/marketplaces - 3 marketplaces
PASS /api/auth/signup

=== PlaceBets API (9 sports) ===
PASS /api/odds/NFL,NBA,MLB,NHL,Soccer,CFB,MMA,Tennis,Golf - 6 games each
PASS /api/picks/NFL - 6 picks
PASS /api/live-scores - 17 games
PASS /api/news - 20 headlines
PASS /api/marketplaces - 5 sportsbooks
PASS /api/parlay/calculate - 2 legs
PASS /api/history - 60 bets
PASS auth/signup+login+me (D1 persistence)
PASS /api/bets/track + /api/bets (D1 persistence)

=== MarketPicks API ===
PASS /api/stocks - 8 stocks
PASS /api/picks - 8 picks
PASS /api/sectors - 5 sectors
PASS /api/news - 8 headlines
PASS /api/earnings - 7 events
PASS /api/indicators/AAPL - RSI+MACD+SMA
PASS /api/portfolio - 5 holdings
PASS /api/watchlist - 4 items

=== IHateCollege API ===
PASS /api/paths - 6 career paths
PASS /api/auth/signup
PASS /api/paths/web-dev/lessons - 5 lessons

=== Cross-Link Footer ===
PASS all 5 apps have NEXUS AI SUITE footer
```

## What's Remaining
- [ ] Create marketpicks-mobile/ (agent was cancelled)
- [ ] Build React Native apps with Android SDK/Gradle
- [ ] Real AI integration (need API keys for production — currently mock/limited)
- [ ] Stripe payment processing (demo flow only currently)
- [ ] User analytics dashboard
- [ ] Email notifications
- [ ] Rate limiting and abuse prevention
- [ ] Production-grade error handling

---

## Key Rules
1. **DO NOT use Supabase** — Cloudflare D1/KV/Workers only
2. **No GitHub Actions waste** — deploy directly via wrangler
3. **All CSS/JS changes must be approved** by user first
4. **Stripe for last** — use demo payment flow until ready
5. **Each app appraised at $60K** — maximize value
6. **Parallel agents, not sequential** — dispatch 9 at once via Task tool
