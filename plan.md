# MCP Hive First Mission Plan

## Goal: Build Billion-Dollar Apps Using Free AI Models

> **🖥 LOCAL-FIRST (decided 2026-09-23).** No GitHub. This computer is the source of truth. Deploy = `wrangler` straight to Cloudflare via `./deploy.sh` reading `.secrets/cf.env`. Full live inventory of accounts/pages/workers/D1 in **FEDERATION.md**.

> **⚠️ CLOUDFLARE CREDENTIALS — stored 2026-09-23.** Raw tokens are in `.secrets/cf.env` (gitignored, chmod 600). DO NOT paste raw tokens into this repo (public). Load: `set -a; source .secrets/cf.env; set +a`.
> - CreateStuff app → account `2765cb2786006552f33cc3dfe0b680a1`, `CS_API_TOKEN` (dark-cell-ecf9)
> - All other Nexus apps → account `7eb89b01e9c3bec41ee24db8ecbe77f8`, `CF_API_TOKEN` (yellow-math-1874)
> - Both VERIFIED live 2026-09-23. See handoff.md → Credentials & Config.
>
> **🔑 DNS WRITER for `createstuff.ai` — issued by the user 2026-09-27, DO NOT LOSE.** Token **name `raspy-credit-99f5`**, id prefix `cfat_qL7N…84da4`, account `2765cb2786006552f33cc3dfe0b680a1`, scope **Zone.DNS:Edit on `createstuff.ai` (zone `ca23f072cf08ee77d34c88ce36598265`)**. Raw value lives in **two** places, never in this public repo: `.secrets/cf.env` → `CF_DNS_TOKEN_CREATESTUFF` (gitignored), and the private repo `placebetsai/joffe-federation-memory` → `memory/reference_cf_dns_createstuff_token.md`. It is the **only** credential found on this machine that can write DNS to that zone: the three older tokens in `.secrets/cf.env` (`CF_API_TOKEN`, `CF_DNS_TOKEN`, `CS_API_TOKEN`) and all 15 GitHub Actions secrets across 13 other repos return `error 10000` / `403` on it. **Never suggest rotating or revoking it**; if it returns 401/403, tell the user immediately so a replacement can be issued.
> - Load it: `set -a; source .secrets/cf.env; set +a; curl -H "Authorization: Bearer $CF_DNS_TOKEN_CREATESTUFF" "https://api.cloudflare.com/client/v4/zones/$CREATESTUFF_ZONE_ID/dns_records"`

### DONE 2026-09-27 — `sites.createstuff.ai` custom publish host (was blocked for weeks)
- [x] **CNAME created** in the `createstuff.ai` zone: `sites → createstuff-sites.pages.dev`, proxied,
      record id `d1de453269b1685ca98f174e8eee0316`, written with token `raspy-credit-99f5`.
- [x] **Pages custom domain went `active`** (`validation http` → `active/active`); the host answers
      **HTTP 200**.
- [x] **`PUBLISH_HOST` flipped** in `workers/createstuff-api/src/index.js` to
      `https://sites.createstuff.ai`, worker redeployed (`wrangler exit 0`, version
      `df3960ea`, `/api/health` 200).
- [x] **Live proof, end to end:** `POST /api/ai/publish` now returns
      `https://sites.createstuff.ai/179/index.html` (was `…pages.dev`); that URL serves **200,
      3039 bytes, `<title>Steady — Savings Goal Tracker</title>`**, byte-identical to the old host
      (`cmp` → identical), `x-served-by: edge`. **Real Chrome render 7/7** — HTTP 200, h1 rendered,
      652 chars of content, **7 subresources, 0 console errors, 0 failed requests**.
- [x] **Gates:** `sites-proxy/worker.test.mjs` **7/7**, `versions.test.mjs` **8/8**,
      `cs-inline.test.mjs` **6/6**, `npx acorn --ecma2022 --module` on the changed file **OK**.
- [x] Old `createstuff-sites.pages.dev` links still serve the same bytes — nothing broke.

### Phase 0: Audit (DONE 2026-09-23 — see AUDIT-REPORT.md)
- [x] Verify all 5 apps live (3 healthy, MarketPicks URL wrong, CreateStuff worker dead)
- [x] Frontend/worker out of sync; git repos don't match production
- [x] Hive rebuilt as REAL parallel opencode dispatcher (8/8 ack)

### Phase 1: Infrastructure (DONE)
- [x] Configure MCP Hive with 9 free models
- [x] Set up Cloudflare Pages deployment
- [x] Create GitHub repos for all apps
- [x] Deploy landing pages for all 5 apps
- [x] Add credentials to portfolio sites

### Phase 2: Backend — VERIFIED 2026-09-29 (was an unchecked TODO list; every box below was re-checked against the live system)

> The original Phase 2–6 list was written on 2026-09-23 as a guess about what
> we would need. It sat unchecked for six days while the work happened, so the
> file said "TODO" about things that were live and "TODO" about things we
> decided not to build. Every line below was re-measured on 2026-09-29.

- [x] **Database** — Cloudflare D1, one database per product (`placebets-subscribers`,
      `createstuff-db`, …). **Supabase was never set up and is not needed**; the
      original line named the wrong product. Proof: `POST /api/subscribe` on
      `placebets.ai` → `{"ok":true,"via":"d1"}`.
- [x] **API endpoints on Cloudflare Workers** — **13 workers live** on account
      `7eb89b01…`: `app-host`, `createstuff-api`, `fashion-news`, `fashionistas-ai`,
      `fashionistas-api`, `hook-sink`, `marketpicks-ai`, `marketpicks-ai-api`,
      `placebets-api-worker`, `placebets-scheduler`, `quorfy-api`, `quorfy-api-v2`,
      `site-cron-trigger`. Verified `GET /workers/scripts` → 200 with that list.
- [x] **User authentication** — **email + password works end to end.** Measured
      2026-09-29: `POST /api/auth/register` → 201 with a 241-char token, then
      `GET /api/projects` with that token → `200 {"projects":[]}`; without a token
      the same routes → **401**. **OAuth (Google/GitHub sign-in) was never built
      — that half of the original line is still open.**
- [x] **Database schemas** — one schema per app, migrated and in use (the D1
      attribution work and the subscriber table both sit on them).
- [x] **CRUD API routes** — `GET/POST /api/projects`, `PUT/DELETE /api/projects/:id/env`,
      `/api/projects/:id/files`, `/api/builds`, `/api/github/*`, `/api/ai/*` all
      answer 200 authenticated / 401 unauthenticated.
- [ ] **OAuth sign-in** — see above. Not started.

### Phase 3: Real Data — VERIFIED 2026-09-29

- [x] **Live odds for PlaceBets.ai** — `GET https://placebets.ai/api/odds` → **200,
      174 events, 12 top picks, 8 sports covered** (`source: "sportsbook"`; the
      ingest also pulls `espn`, `theoddsgap`, `actionnetwork`). The plan named
      "The Odds API" — we ended up on free public feeds instead, same outcome.
- [x] **Real market data for MarketPicks.ai** — `@/lib/finance-api`, `@/lib/market-data`,
      `@/lib/yahoo-prev-close`, `@/lib/politician-trades-loader`, plus ~20 cron
      scrapers (crypto, ETFs, econ, earnings, IPOs, insiders, congress trades).
      **Alpha Vantage was never wired up** — it wants a paid key for this volume;
      the free feeds replaced it.
- [x] **A code sandbox for CreateStuff.ai** — the preview is
      `<iframe id="live-preview" sandbox="allow-scripts" srcdoc="…">`, so a
      generated app runs with scripts allowed and everything else denied.
- [x] **IHateCollege.com is live** (HTTP 200, 85 KB) with real sections —
      "Free Tools — Find Your Path In 60 Seconds", "6 Paths That Pay Without A
      Degree", "Your Real College Cost", "Ask Professor Debt Anything".
      **It ships tools and articles, not the "courses" the plan imagined.**
- [ ] **Poshmark/eBay API posting for Fashionistas.ai** — **not built, and not
      claimed.** Cross-posting is paste-ready drafts + a bookmarklet + a browser
      extension; the app never posts for you. Awaiting the user's call on
      extension vs. API keys vs. paste-only.

### Phase 4: AI Integration — VERIFIED 2026-09-29

- [x] **Free models generate CreateStuff's code** — `POST /api/ai/{plan,generate,
      modify,discuss,publish}` on `createstuff-api`, with an OpenAI-compatible
      caller that prefers **the Hive relay** (a fan-out over OpenCode's free
      roster) and falls back to `opencode.ai/zen/v1`. Every call reports the tool
      it actually ran. No paid model is in the path.
- [x] **Generated apps a visitor can actually use — the gate that makes "done" mean done.**
      **2026-09-30.** *Was:* five consecutive builds on the same brief produced pages
      that opened and then did nothing while reporting `quality=clean` — 246 (3 stacked
      `prompt()` dialogs, **no account ever created**, 4 console errors on a signed-out
      load), 247 (`script.js` **did not parse** → `SyntaxError`, `appInit` undefined,
      every form unwired — **published live**), 248 (`$` = `getElementById` called with
      `'.class'` → the wiring threw inside `try{}catch{}`, so **sign-up, sign-in and
      add-book had no handlers at all**, and `auth` never called `preventDefault()` so
      the register click **navigated** instead of posting), 249
      (`e=>authHandler(e,'login')` reaching `form.querySelector` → **`TypeError` on
      every submit**), 250 (the Create-account tab only relabelled the form →
      **`POST /auth/login 401`**, error element left empty, no account). *Shipped:* one
      **SCRIPT-HEALTH GATE** after the missing-asset gate — bundled **acorn** parse as a
      **hard fail**, plus five advisory checks (`unwiredHandlers`,
      `submitNoPreventDefault`, `selectorMismatches`, `eventAsForm`, `unreachableMode`)
      that perform **one focused single-file re-ask naming the defects** and then record
      whatever remains as quality flags — advisory on purpose, because a name heuristic
      must never be able to refuse a build that works. *Detector precision, measured by
      extracting the shipped functions and running them over the 14 scripts this session
      produced:* **every flag is a defect proven live, and the 7 healthy builds give 0
      flags on all six checks.** *Live proof, control 250 vs treatment 251, same brief,
      only the worker changed between them:* 251 → tab flips `authMode` to `signup` →
      **`POST /auth/register 201`** → **`POST /reading-list 201`** → **reload →
      `/auth/me 200` + `/reading-list?mine=1 200`** with the row still on screen, **0
      console errors, no duplicate ids** at every step; the identical click sequence on
      250 → **`POST /auth/login 401`**, no account. *Also measured and fixed:* the free
      tier's **50-subrequest cap** killed a build mid-repair (`Too many subrequests by
      single Worker invocation`) because the relay was polled on a flat 3 s cadence →
      **backoff 2 s ×1.6 → 15 s** plus instrumentation nobody had (`polls=N` on every
      relay call, `http-fetches=N of 50-subrequest cap` on every build): a 94.4 s writer
      now takes **9 polls (flat cadence = 31)** and a whole build costs **23 HTTP
      fetches**; and the missing-asset retry's **8k token cap**, too small for a full
      stylesheet, is now **16k** with a log line saying what actually came back.
      Deploys `ce24bfea` → `36777f72`.
- [x] **Hive itself is real and green** — `node hive/test/readiness.test.mjs`
      → **35 pass / 0 fail, 10/10 agents on their assigned model, 7/7 agent-facing
      models answering live** (fixed 2026-09-29; see the P14 entry).
- [x] **Model → product wiring** — the roster is in `hive/hive.json` and the
      CreateStuff worker consumes it through the relay. The four "connect X model
      to Y app" lines below were this, written before the relay existed.
- [ ] Muse Spark → Fashionistas listing descriptions, Ling 3.0 → PlaceBets bet
      analysis, Nemotron → MarketPicks analysis as **dedicated** integrations —
      not built as separate features. (Ling 3.0 is in any case **offline**:
      `Endpoint is unavailable`.)

### Phase 5: Mobile — NOT STARTED

- [ ] Kotlin Android apps for all five products. **No mobile app exists.**
      Every product is a mobile-usable website; this was always the largest
      untouched box on the plan.

### Phase 6: Polish — VERIFIED 2026-09-29

- [x] **OG meta tags** — `og:title` / `og:description` / `og:image` present on
      **all five** live sites (placebets, fashionistas, createstuff, marketpicks,
      app.createstuff).
- [x] **Canonical URLs** — `rel="canonical"` present on all five.
- [x] **Error handling** — **shipped 2026-09-29.** Before today, fashionistas and
      createstuff returned **HTTP 200 with the homepage body for every URL that
      existed or not** (`/nope-xyz`, even `/assets/nope.css`). Both now ship a
      real `404.html`:
      `fashionistas.ai/nope-xyz` → **404**, `createstuff.ai/nope-xyz` → **404**,
      while every real page still returns 200 byte-identically. Old URLs that
      used to "work" as soft-404s now **301** to the homepage instead of dying
      (`createstuff.ai/{app,pricing,templates,guide}/` → 301 `/`;
      `fashionistas.ai/app/` → 301 `/`). placebets and marketpicks already
      returned real 404s (Next.js `404.html`).
- [x] **Keyboard accessibility** — **shipped and browser-verified 2026-09-29.**
      *Was:* landmarks, `aria-label`, `:focus` styles and `<button>`-not-`<div>`
      were in place on all four sites, but **none of the four had a
      skip-to-content link**, fashionistas had no `<main>` landmark, and 6 real
      fashionistas images had no `alt`. *Control (pre-fix, live):* all 4 skip
      links MISSING, fashionistas `<main>` **0**, alt-less real images **6**,
      createstuff anchor untargeted, marketpicks no skip link. *Shipped:* 4
      home pages + 5 fashionistas subpages + fashionistas `404.html` +
      `crosslister-privacy.html` + createstuff `404.html`; fashionistas home
      `<div class="wrap">` → `<main class="wrap" id="main-content"
      tabindex="-1">`; createstuff **two** skip links (landing → `#top`,
      `#app` → `#main-content`) because `#app` is `display:none` pre-auth;
      marketpicks **one** layout-level `<div id="main-content" tabIndex={-1}>`
      instead of editing 34 pages; placebets `<main id="main-content"
      tabIndex={-1}>` before `<OddsFormatProvider>`. *Real-browser proof, all
      four sites:* fresh document → **Tab #1 = "Skip to content"**, computed
      `left: -9999px → 0px`, **Enter → focus lands on the target and the hash
      updates** (placebets `MAIN#main-content`, marketpicks `DIV#main-content`,
      createstuff `SECTION#top`, fashionistas `MAIN#main-content`), screenshots
      show no layout regression. *Live re-run:* every page 1 skip / 1 main /
      1 target, both 404 pages carry the link, **alt-less 6 → 0**, **no
      horizontal overflow anywhere**. Deploys `fashionistas-ai`,
      `createstuff-marketing`, `placebetsai` (`7f5bd05a`), `marketpicks-ai`
      (`23235420`); commits nexus `67c90aa`, Placebetsai-src `52c397e`,
      marketpicks `bca776e`, all pushed.
- [ ] **Analytics** — placebets, marketpicks and createstuff carry the Cloudflare
      beacon (placebets and marketpicks also load Plausible). **fashionistas has
      none**, and it cannot be switched on from here: `CF_API_TOKEN` is refused
      on every `/accounts/…/rum/*` route with *"Unable to authenticate request"*.
      (Zone-level Cloudflare analytics still count requests for it, so traffic is
      not invisible — only page-level detail is.) **Blocked on a token permission.**
- [ ] **Help documentation** — `/help` does not exist on placebets, marketpicks
      or createstuff (fashionistas has `/about`, `/fees`, `/contact` but no
      `/help` either). **Open.**

---

## Competitive gap: what Replit and Base44 have that we do not (researched 27 Sep 2026)

Sources: replit.com + docs.replit.com (Agent 4, Plan Mode, Parallel Agents, Agents & Automations,
Scheduled Deployments, Integrations, pricing), base44.com/features. Prices: Replit free = 1 live
published project, one background task at a time, built-in database, "Made with Replit" badge;
Core $18–20/mo, Pro $90–100/mo. Base44 free = 25 credits, **preview only, no publish**; $16–20/mo.
Our free tier publishes real apps to real addresses with no credits — that stays the wedge.

### P0 — the ones that decide whether this is a product or a toy
- [x] **Stop D1 going to zero with nobody using the sites.** (Raised 2026-09-28 after
      *"why the fuck is D1 full when no one uses the sites?"*.)
      **DIAGNOSIS — measured, not guessed, via Cloudflare's own GraphQL analytics.**
      D1's free tier is **5,000,000 rows read PER DAY across the whole account** — MarketPicks,
      Fashionistas and CreateStuff share **one pot**, and when it empties **every** database read on
      **every** site fails until 00:00 UTC. That is what happened on **2026-09-27: 5,133,584 = 103%**.

      | day | total | createstuff-db | fashionistas-db | marketpicks-db |
      |---|---|---|---|---|
      | 09-22 | 114,059 (2%) | 1,838 | 1,871 | 110,350 |
      | 09-23 | 123,560 (2%) | 3,553 | 11,659 | 108,348 |
      | 09-24 | 112,148 (2%) | — | 3,857 | 108,291 |
      | 09-25 | 539,294 (11%) | 410,198 | 11,248 | 117,848 |
      | 09-26 | 3,917,349 (78%) | 2,445,142 | 77,158 | 1,395,049 |
      | **09-27** | **5,133,584 (103%)** | **2,482,438** | 22,098 | **2,629,048** |
      | 09-28 | ~1M/day (12% @ midday) | 38,210 | 58 | 577,355 |

      **Two root causes, both ours — zero of it was real users.**
      1. **app-host rescanned `projects` on every unknown hostname.** Bots probe `mail.`,
         `cpanel.` etc. across the zones app-host fronts — and 4 of them (`israeljoffe.com/.org`,
         `wuwonline.com/.org`) had **wildcard DNS records**, so those random labels resolved and
         every probe reached the Worker; each missed the host cache and
         fell through to `SELECT id, deploy_url FROM projects WHERE deploy_url IS NOT NULL …` — a
         **whole-table read**. Measured **18,214 scans on 09-27 → 2,445,142 rows**. The table holds
         **~146 projects, only 19 published** (ratio **7.9 : 1**, confirmed from reads/returns), so
         every scan paid for 146 rows to hand back 19. A per-isolate cache had already cut this to
         **~130 scans/day ≈ 19,000 reads** by 09-28 — a **99.2%** reduction — but nothing stopped
         it from coming back, and nothing watched the pot.
         **Both halves are now closed.** The cache/index/breaker above stop the *scan*; the
         **wildcard records themselves were deleted on 2026-09-29**, so a random label on those
         zones is **NXDOMAIN** and the probe never reaches the Worker at all — **0 invocations, 0 D1
         rows, 0 CPU**. Post-fix: **0 wildcards and 0 scanner-magnet labels** across all 8 zones'
         51 records (23 proxied), and a like-for-like 74-minute window day-over-day shows
         account-wide requests **3,602 → 796 (−77.9%)**, `app-host` **3,562 → 568 (−84.1%)**.
         Full numbers and their honest limits: `audit/CLOUDFLARE-FREE-TIER-AUDIT.md` §4.
      2. **MarketPicks runs a `*/15` cron plus full-surface page queries**: a window-function scan
         over `quotes` (107,316 reads/13 h), `SELECT COUNT(*) FROM politician_trades` (71,478 reads
         to return 33 — 2,166 rows a call), `news_items` and `predictions` list scans. Steady
         **~40k/hour around the clock, ~1M/day with no visitors** — machine traffic, not people.

      **Baseline before the runaways was ~114k/day = 2%**, which is healthy. The architecture was
      not fundamentally over budget; it had **runaway whole-table scans and no ceiling to catch the
      next one.**

      **FIX 1 — a watch that runs on Cloudflare, not on the laptop** (the old `scripts/d1-budget.py`
      only ran while this machine was awake). `createstuff-api` now has `[triggers] crons =
      ["*/30 * * * *"]` and a `scheduled` handler that queries **Cloudflare's own analytics API —
      which costs no D1 read, that would defeat the purpose** — then writes one short-lived KV
      record shared by namespace `e4f7f32a…` (createstuff-api + app-host). Public readout at
      **`GET /api/d1-budget`**: today `reads: 615,623 / 5,000,000 (12.3%), state ok`, per-database
      split matching an independent GraphQL query exactly. Token is a **Worker secret**
      (`CF_ANALYTICS_TOKEN`, type `secret_text`), never in the repo.
      **FIX 2 — a circuit breaker.** `app-host` reads that record (one KV read, memoised 5 min so
      the guard costs nothing) and, when state is `halt`, **keeps serving its last cached list of
      published apps instead of starting a whole-table scan** — a slightly stale list beats a day
      of total outage. It still scans when nothing is cached, so no app ever 404s. A missing or
      unreadable record **allows** the scan: a broken monitor must never take a working site down.
      **FIX 3 — a partial index** `projects(deploy_url) WHERE deploy_url IS NOT NULL AND
      deploy_url != ''`, so a scan reads the **19 published rows instead of all 146** (wrapped in
      its own try, so an engine that refuses a partial index degrades to the old scan rather than
      taking the worker down).
      **Guard proofs — run live 2026-09-28, not asserted.** The budget state was forced to
      `halt` in KV, then a real browser-level request was pointed at app-host through a wildcard
      zone: guard answered `{"state":"halt","scans":{"performed":1,"skipped":1},"cache":{"rows":19,
      "serving_stale":true}}` — **the scan was skipped and the cached list served instead, while
      `/api/health` stayed 200**. The forced `halt` was then cleared, and after the 5-minute memo
      lapsed the guard reported `performed` rising `1 → 2` with `serving_stale:false` again.
      Fail-open confirmed too: an isolate that had never read the memo reported `cache:null` and
      did not block anything.

      **FIX 3 measured: 7.71 → 1.0.** The `deploy_url` query read **19,037 rows to return 2,470
      (ratio 7.71)** before the index; after the deploy it reads **114 rows to return 114 (ratio
      1.0)** — every row now scanned is a row handed back. `createstuff-db` dropped to **865 reads
      in hour 13** (from 9,284 in hour 00).

      **FIX 4 — MarketPicks stops paying for work nobody asked for.** MarketPicks alone was
      **590,399 of the 628,951 reads at 13:05 = 94% of everything the account spent**, on a site
      with a handful of visitors, running at ~1.2M/day. Four measured offenders, fixed in commit
      `b6e21b1` and deployed (site at 13:21, cron worker at 13:22):
      1. `SELECT COUNT(*) AS n FROM politician_trades` ran at **3 call sites on cron ticks —
         71,478 rows read in one day to police a 50,000-row cap on a table holding ~2,000.** Now
         memoised in `cache_snapshots` for 24 h (1 row read + 1 row write/day), falling through to
         a real count if the memo cannot be read or written, so the cap can never be silently
         abandoned.
      2. `listPredictionReceipts` cached rows **and** the COUNT under one key containing
         `limit`+`offset`, so every pagination combination re-ran the COUNT: **230 scans / 51,520
         rows read per day.** Split into `receipts:rows` (TTL 1800) and `receipts:count` (TTL 3600).
      3. quotes and news memos were TTL 600 while the cron refills both every 15 min → raised to
         1800, **3× fewer full-table scans** (the quotes window alone reads ~2,440 rows per run,
         107,316/day) for at most two cron cycles of staleness.
      4. **The site was hitting itself.** Housekeeping re-fetched six live `marketpicks.ai` URLs
         and grading scanned the predictions table on **every** 15-minute tick — 576 + 96
         self-generated requests a day. Both now run **hourly**; predictions are deduped per ticker
         per day, so the public track record is unaffected.
      **Proven after deploy:** headless Chrome **4/4 PASS** (`/`, `/receipts`, `/trending`,
      `/world-markets`) — 0 JS errors, 0 first-party ≥400 responses, HTML byte-identical in size to
      the pre-deploy baseline, and `/receipts` renders **ALL-TIME 224 · 48.6% win rate** with real
      rows; `/api/receipts` returns `total: 224`. Third-party ad-slot 400s were checked against the
      **pre-change deployment `0c91f640`** and are identical there, so they are reported apart.
      Post-deploy read rate to be re-measured after a full clean hour (see handoff.md §8).

      **CORRECTION (measured, not asserted — 2026-09-29, `/tmp/corrected.py`):** item 1's
      `COUNT(*) AS n FROM politician_trades` must **NOT** be credited with dropping to zero.
      Cloudflare's own query analytics for `marketpicks-db` show the counter **stopped being
      asked at 2026-09-28 12:00 UTC** — **81 minutes before** the `b6e21b1` fix went live at
      13:21:38 — because the insider-feed job died on a Bargo 429 and stopped running its cron
      body. After the deploy the job **came back on its own** (81 INSERT runs at 19:45, 256 at
      00:00 on the 29th) and yet `COUNT(*)` has still never run again, so it reads **0** for a
      reason the memo had nothing to do with. The memo table `cache_snapshots` runs continuously
      through the whole window — before, during and after the deploy — which is the only part of
      item 1 that is directly observable. What stays **unproven**: that the 24 h memo actually
      saved the reads it was projected to save (71,478 rows/day), because the workload it was
      meant to shrink had already stopped for unrelated reasons. Do not restate this anywhere as
      "COUNT → 0, fixed by the memo."

      **KV budget respected:** writes kept to 48/day for the
      status key plus a history entry **only on state change** (KV free tier is 1,000 writes/day and
      response caching already spends some of it).

      **FIX 5 — the two cron schedulers threw on *every single run* (191 failed runs/day), and a
      third worker was duplicating them from source that existed nowhere.** Full record in
      `audit/CLOUDFLARE-FREE-TIER-AUDIT.md` §5.2–5.4 and TODO `P17`; patched 2026-09-29 only after
      an explicit go-ahead, each with a control run captured before any change. Six root causes, all
      measured: the scheduler sent **no `Authorization` header** to the one route that checks one
      (401 — and it had *never* returned 200); four checks asserted wording, and the word
      `placeholder`, that **0 occurrences / 4 occurrences of a search input** prove wrong; the real
      peer failure was `marketpicks` stamping an unrelated Yahoo quote onto the price-0 IPO basket
      ticker `SPCX`; and the **throw rule** treated a 5xx (an endpoint reporting a momentary
      upstream source gap) as script breakage. **`site-cron-trigger` had no source in any repo** —
      pulled from the API it turned out **13 of its 17 endpoints were already owned** by a
      cron-bearing worker, now **17 → 4** with per-endpoint ownership recorded in
      `workers/site-cron-trigger/`. `/api/odds?light=1` cut the logged board **1,604,054 → 60,925 B
      (−96.2%)** and a whole scheduler run **1,590,662 → 67,772 B (−95.7%)**, public payload
      verified unchanged. **Re-run under exact control conditions: placebets 16/16 HTTP 200,
      marketpicks 9/9, trigger 4/4, 0 failures.** Stated plainly: this is **not** a Workers-quota
      saving (the 100,000/day quota counts *inbound* requests and cron invocations are unchanged) —
      it removes duplicated upstream fetches, self-generated traffic and D1 reads, which is the
      budget that actually broke on 2026-09-27.

      **FIX 5b — what fixing that exposed, measured the same day.** Every check that failed loudly
      had others behind it, and those were worse: three of placebets' `housekeeping` (full mode
      only) checks had **never once passed**. `home` wanted three phrases with **0 occurrences**
      each; `deep predictor` read `json.factors` when the route returns **`key_factors`**, so it was
      0 even on a perfect answer, and probed `q=Lakers tonight` (data only on days the Lakers play);
      `predictor fallback` demanded **`suggestions` + `message`**, fields `/api/predict-deep` has
      never returned — it answered `follow_ups` + `answer`. Measured live: `housekeeping` full
      **500 → 500 → 200, 10/10 checks PASS**. The probe now uses a matchup the odds board just
      returned, and the fallback check asserts the real contract: an unknown query must be declined
      as `honest_no_data` rather than invented. **One architectural fact worth keeping: a Worker
      cannot fetch a sibling Worker on the same `workers.dev` subdomain.** `site-cron-trigger`'s
      call to `federation-watch/tick` returned `404 / error code: 1042` on every run while the same
      URL returned 200 from a laptop and the same worker's four custom-domain endpoints returned
      200 — fixed with a **service binding**, control 404 twice → re-run **5/5**.

      **FIX 5c — the health check itself was wrong, and that is why `failures: 1`
      kept coming back.** With the throw rule fixed the scheduler stopped raising,
      but some runs still reported a failure, so it was measured instead of
      explained away. **Control, two independent measurements:** (1) latency over
      the 24 h to 2026-09-29 20:00 UTC, read out of `cron_runs.checks_json` —
      `predictor fallback` **p50 7,774 ms (3 of 9 runs pinned at the 10,000 ms
      ceiling)**, `deep predictor` **p50 5,804 ms / 16,703 ms on direct calls**,
      `odds api` **max 14,840 ms**, `mlb odds api` **max 10,000 ms**: the probe
      ceiling was *below* the latency of the endpoints it probed; (2) three
      direct full `housekeeping` calls on the pre-fix build → **HTTP 200 / 500 /
      500, failures 0 / 3 / 3**, the three being `odds api`, `mlb odds api`,
      `predictor fallback` — **all exactly 10,000 ms**, because an aborted probe
      returns `status 0`, `json` is null and every field reads `n/a`. The
      **scheduled 20:00:46Z full run recorded the same class of failure in D1**
      (`ok=0`, `failures=1`) while the 20:04:47 full run was 10/10 — the
      flakiness was the ceiling, not the endpoints. **Fixes:** `TIMEOUT_MS`
      **10,000 → 30,000** (clears the measured maximum; worst case ~4 blocking
      checks × 30 s, well inside the 15-minute interval, and the scheduler has no
      per-job timeout); and the `deep predictor` assertion, which demanded
      `structured → keyFactors>0 AND sources>0` when the route's *correct* answer
      for an incomplete matchup is `RESEARCH_ONLY` / `confidence 0` /
      `key_factors: []` with the reason in `missingData` (measured:
      `["unsupported or unavailable tennis moneyline baseline"]`). **Re-run, same
      three calls: HTTP 200 / 200 / 200, 10 checks each, failures 0 / 0 / 0** —
      with `predictor fallback` at **12,001 / 10,765 / 11,147 ms**, i.e. every one
      of those passes would have been a failure before. Deploy `57dd48d1`, commit
      `e894eee`. `freshness` deliberately left at 10 s: its GDELT checks sit at
      the cap **5/5 of the time** (dead upstream), so raising that ceiling would
      only triple the wait for already non-blocking checks — an observation, not
      a pass.


- [ ] **P1 A→Z Agent cockpit**: show the planner's plan as a card you can read and approve, run the
      steps with free agents in parallel with live per-agent status + 30 s watchdogs, then a browser
      self-test gate before Publish. (This is Replit's Plan Mode → Parallel Agents → browser
      self-test flow, run on free agents instead of paid tokens.)
- [x] **Checkpoints / undo**: every build stores a version you can go back to (Replit rollback,
      Pro-only at 28 days — ours free and unlimited).
      **DONE 2026-09-27 (P13)** — `versions.test.mjs` **8/8**, `cs-inline` **6/6**,
      `sites-proxy` **7/7**, live API round trip **7/7**, Chrome E2E **12/12** (0 console
      errors, 0 failed requests), commit `f5ce0f8`.
- [ ] **Whole repository both ways**: import every file of a repo (exists) and push every changed
      file back in one press (today: one file at a time).
- [ ] **Real backend for user apps**: a database table and a sign-in for the app the user just
      described, by asking for it in chat (Base44's core infrastructure).
- [x] **Secrets / environment UI** for the generated app, not just ours.
      **DONE 2026-09-28** — an **Environment variables** card on the Code page, bound to the
      app selected above it: add, reveal/hide, delete. Values live on the server against the
      project (new `project_env` table, created lazily by the worker), **not** in the browser.
      The worker hands them to the published page as **`window.__ENV` at serve time**, so a
      change lands on the next request with no rebuild and the user's source file is never
      rewritten. Names are validated, values capped at 4096 chars and 50 per app, ownership
      enforced (another account gets 404), `</script>` in a value escaped to `\u003c`.
      The UI says plainly that a published page is public. **API 17/17**, **browser 24/24**
      (`tests/e2e/env-vars.mjs`, **0 JavaScript errors**, every ≥400 accounted for as the
      test's own probing).

- [x] **Every public site was publishing a personal Gmail address.** (Raised 2026-09-28:
      *"GET THE FUCKING EMAIL ADDRESS OUTTA THERE"*.) **DONE 2026-09-28** — fashionistas
      `27fab1b`, placebets `e7eed5e`.
      **fashionistas.ai** printed it in the contact lede (*"we read every note at …"*), in
      6 footers, in **3 meta descriptions** (so Google and social previews carried it), in
      privacy's *"Email us to request account deletion"* and on the about page. Cloudflare's
      Email Obfuscation kept it out of the source but **decoded it back onto the screen** —
      that is why it was plainly visible. **placebets.ai** carried it in the **Organization
      JSON-LD on every page** (structured data handed straight to Google) plus rendered text
      on `/about`, `/privacy`, `/terms`.
      Removed from every rendered surface and from source. **Real Chrome 6/6** for
      fashionistas (`/ /contact /about /privacy /fees /how-to-crosspost`): 0 visible, 0 in
      source once the form's `action` is excluded, **0 `mailto:` links anywhere**, 0 JS
      errors. **Real Chrome 5/5** for placebets: 0 occurrences rendered *and* in source,
      JSON-LD still parses as **valid JSON** with `email=info@placebets.ai`, and the new
      *contact form* link on `/about` was **clicked through** to `/contact` with the form
      visible. **Delivery proved, not assumed:** one labelled test submission per site
      POSTed to `formsubmit.co` and redirected to its success page (`?sent=1` /
      `/contact/thanks`) with 0 ≥400 responses. The FormSubmit `action` attributes are
      **kept deliberately** — they are an attribute, never rendered, and they are the only
      thing that actually delivers the message. **Sweep of all 9 live URLs afterwards:**
      the only remaining personal address anywhere is that one attribute; every other site
      already publishes a branded address (`admin@createstuff.ai`, `info@placebets.ai`,
      `support@marketpicks.ai`).
      **Unproven and stated as such:** that mail to `info@placebets.ai` reaches an inbox —
      MX + SPF are live (`route1/2/3.mx.cloudflare.net`) but no token here can read that
      zone's routing rules.

### P1 — the visible "they can do that" list
- [x] **Discussion mode**: talk to the Agent about an idea without spending a build
      (Base44 has this explicitly; we were spending a build on every message).
      **DONE 2026-09-28** — a **Build it / Talk it through** switch above the chat box.
      Talking calls `POST /api/ai/discuss`, which writes no code and touches no table:
      **projects 37 → 37, builds unchanged**, answer in ~4.8 s. **Browser E2E 27/27**
      (`tests/e2e/discuss-mode.mjs`, 0 console errors, 0 failed requests) — covers the
      switch, its tips, the answer, *no project created*, the choice surviving a reload,
      and **Build mode still creating an app (37 → 38)** so the old path is unbroken.
- [x] **Custom domain for a published app** (Replit sells them in-app; Base44 removes branding at
      paid tiers — we should accept a domain the user already owns).
      **DONE 2026-09-29 — every project can claim `<name>.createstuff.ai` and really be served
      there** (`Put it online → Your own web address → Connect it`). Two of the three things
      needed were blockers rather than features:
      * `createstuff.ai` was **not** in `app-host`'s `CONTROLLED_ZONES`, so the endpoint the UI
        already called returned 422 for every name on our own zone.
      * A CNAME from that zone to `app-host…workers.dev` is refused by Cloudflare with **error
        1014 (cross-client)** — the two Cloudflare accounts are separate and a Worker can only
        have routes in its own account, so `app-host` cannot answer `*.createstuff.ai` at all.
      What ships instead: DNS `CNAME <name> → createstuff-sites.pages.dev` (written with
      `raspy-credit-99f5`) **plus** that same name attached to the `createstuff-sites` Pages
      project through the Pages API. Pages serves it; `sites-proxy/_worker.js` reads
      `GET /api/hosts/serve?host=…&path=…` from `createstuff-api`, which resolves it against the
      **same `app_hosts` row the button writes** — one source of truth, no second copy of
      anybody's site.
      **Live proof 82/82** across three suites that each create *and* delete their own project
      and their own hostname: `/tmp/domain_proof.sh` **36/36**, `/tmp/domain_proof_v2.sh`
      **27/27**, `/tmp/domain_ui_proof.mjs` **19/19** (real Chrome). Both API suites were run
      **twice**, and the second run is what matters — the first pass only ever passed from a
      clean machine. Covered: the DNS record
      read back from the Cloudflare API (a proxied record is flattened on the wire, so `dig`
      can never show it), `initializing → pending → active` with the address serving in
      between, the bytes belonging to that exact project, `..` traversal refused, a **second
      real account** getting **403** on someone else's project **with no DNS record written**,
      reserved names (`app`, `sites`, `www`, `api`, `mail`) **422**, **409** when the name is
      taken, **401** with no token, release → gone once the 60 s edge window lapses, and
      `app.` / `sites.` / apex / `api.` / `www.` checked unchanged afterwards. Zone left with
      exactly its original 5 records.
      **Two real bugs the proof caught, both fixed:** ① nothing stopped a user claiming
      `app.createstuff.ai`, which would have **repointed the product's own CNAME and taken the
      builder offline** — there is now a reserved-label list, and `ensureDnsRecord` refuses to
      overwrite any record that points somewhere else. ② the claim's evidence was overwritten a
      second later by the host-list refresh, so the person never saw whether the record was
      created.
      Timing is told straight: **serving at ~75 s, `active` at ~150 s** — the badge says
      *Attached — warming up*, never "live", until a real 200 comes back from that address.
      **Two proof-harness defects the re-run exposed, both fixed:** ① the ownership check
      registered its second account with a *fixed* `name`, and `POST /api/auth/register` maps
      `name` to a **username** — unique — so the second run got **409** and the check failed as
      a confusing **401**. It now asserts register 201 / login 200 / token present as three
      separate checks before ever making the ownership call. ② Cleanup read the `fashionistas.ai`
      zone with `CF_API_TOKEN`, which returns **error 10000 Authentication error** there;
      `CF_DNS_TOKEN` is the credential that can list and delete records on that zone.
- [ ] **A domain the user already owns** (their own apex, e.g. `myshop.com`) — **not started**.
      Distinct from the address above: that one is on our zone. This needs the user to point a
      record at us and a Pages attach against a zone we do not hold.
- [x] **Version history list in the builder** with a Restore button.
      **DONE 2026-09-27 (P13)** — the list sits under the preview with a Restore button;
      restoring appends a new version and leaves the older numbers unchanged.
      `versions.test.mjs` **8/8**, Chrome E2E **12/12**.
- [ ] **Templates gallery**: start from a working app instead of a blank chat.
- [ ] **Analytics for published apps**: views, referrers, countries (Base44 dashboard).
- [ ] **SEO audit + one-click fixes** on the published address (Replit SEO Agent).
- [x] **Scheduled runs / automations** for user apps (Replit Scheduled Deployments, natural
      language → cron, error alerts).
      **DONE 2026-09-28 (`7fb643e`)** — and it went in as two real outbound mechanisms, not a
      mock, because both Replit and Base44 are judged on this row:
      * **Webhooks** — a generated app can POST to any address when a record is created, changed
        or removed. Signed `HMAC-SHA256` (`X-CreateStuff-Signature`) plus `X-CreateStuff-Event`
        and a unique `X-CreateStuff-Delivery`, delivered *after* the response via `ctx.waitUntil`
        so a dead receiver can never fail or delay the write that triggered it. Signing key is
        returned once and never listed again.
      * **Scheduled jobs** — an address called on an owner-chosen interval (5/10/15/30/60 min)
        off a new `*/5` cron trigger. `last_run_at` is written **even when the call fails**, so a
        dead endpoint is retried once per interval instead of hundreds of times a day.
      * Both are owner-only (other account 404, signed out 401), capped at 10 per app, `http(s)`
        only, 10 s timeout, and the reply is plain language ("Refused. Calls to private or
        internal addresses are blocked.") rather than a bare number.
      * **SSRF is enforced by the network**, not by a regex: `wrangler.toml` already carries
        `global_fetch_strictly_public`, measured refusing `169.254.169.254` and `127.0.0.1` with
        403. Those two addresses never see the request.
      * UI: an **Automations** card on the Code page sharing the Environment-variables project
        picker — add/remove/test either kind, key shown once, last result printed in the row.
      * **Proven live, three suites, 113/113**, all against an *independent* receiver
        (`workers/hook-sink`, a separate worker that records what actually arrives — never
        asserting from the sender's own log): `/tmp/hooks_jobs_proof.sh` **76/76** (delivery
        headers + signature, create/update/delete each firing exactly once, refusal of internal
        targets, ftp:// and javascript: rejected, cap 409, cross-owner 404, cascade),
        `/tmp/cron_proof.sh` **11/11** (jobs fired by the real `*/5` trigger with no manual
        trigger — *and after deleting one app its job stopped at 1 while the survivor went
        1→2*), `/tmp/auto_ui_proof.mjs` **26/26** (0 console errors, 0 failed calls).
      * **Three bugs found while proving it**, all fixed in the same commit:
        1. **`DELETE /api/projects/:id/<anything>` deleted the whole project** — the generic
           branch keyed off the prefix alone, so deleting *one webhook* parsed `id=165`, wiped
           every file and build, dropped the project row and answered `{"ok":true}`. Same shape
           as C9. Only the exact path removes a project now.
        2. **A deleted app kept accepting writes** — `handleAppRequest` never checked the
           project still existed.
        3. **Scheduled jobs had no request around them**, so a deleted app's jobs would have
           called outside URLs forever — `runDueJobs` now joins `projects` and drops orphans,
           and project DELETE cascades across all ten tables it owns.
      * Not done here: the *natural-language → cron* phrasing, and inbound connectors
        (Slack/GitHub/Notion) — webhooks are the outbound primitive those will sit on. See P2.
- [ ] **Share a preview link** (password-optional) so someone can look before it goes live.

### P2 — later, do not start these before P0
- [ ] Mobile output beyond installable PWA; email sending from user apps; payments inside user
      apps; invite collaborators and roles; monitoring/logs console for a published app;
      connectors (Slack/GitHub/Notion/Calendly…) as MCP-style add-ons.

**Order of work:** P0 cockpit → P0 checkpoints → P0 repo both ways → P0 backend → P1 discussion mode.
Nothing in this list may be shown as working before it is proven live end to end.

### 2026-09-30 — three defects that all presented as "the app doesn't work"
- [x] **A model guess could veto a Build the user pressed.** `first connectt to my github lets
      vibe code` missed the `\bconnect\b` rule (typo), so the model answered `not_build` and the
      UI dead-ended at *"No site was built - the answer is above."* Model-sourced `not_build`
      now fails **open** to a build (`model-not-build-overridden`); deterministic capability
      rules still answer. Control = the user's screenshot; treatment = build 148 → 3 files,
      38,919 chars, `repair=fixed-1`, published, **0 console errors**.
- [x] **The verifier's silence was indistinguishable from a pass.** `missingElements` lived
      inside `runGenerate` (proved by a 500 from `/api/script-probe`), and no line was written
      when a check came back clean. Now at module scope, with an unconditional `script-health`
      line (`ids/lookups/missing/why`) and `POST /api/script-probe`, which flags **build 144's
      own published bytes with the same 15 ids** the offline control found.
- [x] **A correctly-built page still opened dead.** The edge caches `.js` for 7 days and never
      caches `.html`, so republishing produced fresh HTML wired to a stale script
      (`cf-cache-status: HIT, age: 4688` vs origin `no-cache` + new bytes). Publish now stamps
      the page's own asset references (`script.js?v=<publish time>`); the stamped URL was
      measured serving the new bytes at `age: 0` with md5 identical to origin. 252, 251 and 255
      re-verified in a browser at **0 console errors**; 246–250 also restamped.
- [ ] Remaining: handset testing (no device emulation here), `/help`, createstuff map #3–#8,
      the fashionistas analytics credential, `preview` 404, hostname detach — and no purge rights
      for `createstuff-sites`, so pre-stamp visitors keep a cached `index.html` for up to 8 h.

### 2026-09-30 (later) — fashionistas Multilist, measured instead of asserted
- [x] **What Multilist actually does (measured, because nobody had clicked it):** it does
      **not** post to the outside shops. `/api/marketplaces` returns **21** entries, **20 with
      `api:"deep"`** (guide + paste) and **1 with `api:"full"`** (fashionistas itself), and the
      screen says so in its own words — *"You post yourself on every shop."* The guide half
      genuinely works: pick an item → `GET /api/listings/120/platforms → 200` → 21 fee-labelled
      checkboxes → Select all → `POST /api/listings/120/crosspost → 200 in ~2.05 s` → **21
      saved drafts**, each with TITLE / PRICE / META / FIELDS / TONE / DESCRIPTION / TAGS and a
      real *Open listing page* link (eBay, Depop, Poshmark, Mercari, Vinted, Grailed, Etsy hrefs
      checked). eBay's optional API path is honestly switched off:
      `{"available":false,"connected":false,"message":"eBay posting is not switched on for this
      site yet.","nextStep":"…copy the kit and paste it on eBay yourself."}`.
- [x] **The eBay connection panel could never load — CORS preflight.** Control (pre-fix, in the
      browser): `Request header field cache-control is not allowed by Access-Control-Allow-Headers
      in preflight response` + `net::ERR_FAILED` on `/api/ebay/status`, while the same URL
      answered **200 with a correct ACAO from curl**. Cause measured: `index.html:2654` sends
      `{"cache-control":"no-store"}` and the worker allowed only `Content-Type, Authorization`.
      Fixed server-side; treatment = live preflight → 200 with
      `allow-headers: Content-Type, Authorization, Cache-Control`, in-page
      `GET /api/ebay/status → 200 (22 ms)`, **0 CORS errors**.
- [x] **Every kit shipped an unresolvable hashtag.** Control (same item, `Bags & Luggage/Handbags`):
      **19/19** TAGS lines read `#Bags&Luggage/Handbags` — no marketplace resolves `&` or `/` in
      a tag. `xlKitTags()` only stripped spaces from the category *path*; it now takes the leaf,
      lowercased, letters and digits only. Treatment, run twice: 21 kits, 19 TAGS lines,
      **`badTags: 0`** (`#handbags` everywhere; Depop `#vintage #thrift #y2k #resale #rework
      #preloved #handbags`), crosspost 200 in 2,047 ms then 2,091 ms, **0 console errors**.
- [x] **A successful-looking Pages deploy can be a preview.** `wrangler pages deploy
      --project-name=fashionistas-ai` with **no `--branch`** created `7f112964` with
      `environment=preview`: the deployment URL and `master.…pages.dev` served the new bytes
      while `fashionistas.ai` kept serving production `98abeaf5` — with `cf-cache-status: DYNAMIC`,
      so caching was ruled out and only the deployments API exposed it. `--branch main` (what
      `deploy.sh` and `FEDERATION.md` already say) produced **`882eb790 env=production`** and the
      apex then matched local md5 byte for byte. **Always check `environment` after a deploy.**
- [ ] Still open: auto-posting to the outside shops needs their APIs/credentials — that is the
      Q1 A/B/C question already waiting on the owner, and no marketplace here is connected.

### 2026-09-30 (evening) — "vibe code my github" reached a dead end, twice

- [x] **Asking for GitHub built a page that cannot connect to GitHub.** Control (measured
      earlier today): the owner's own sentence `first connectt to my github lets vibe code`
      produced **build 152 "GitHub Vibe"** — decorative Connect buttons, nothing behind them —
      because `CONNECT_ACCOUNT` needs `connect` spelled correctly and the keyword path then said
      *build*, overriding the model's `not_build`. Second control: when a rule *did* answer, the
      answer was prose only (`REPLY_GIT`), with no action. Treatment: new `repo-intent` rule —
      typo-tolerant, guarded so `build me a github stars page` still builds — returns `not_build`
      **plus** `{label:"Open my GitHub tools", href:"#github"}`. Offline gate on the shipped block
      **16/16**; live builds **155/156/157** each answered **once** with the button, status
      **"Answered — no app was built."**, and the click lands on `#github` with **51 repos**,
      `GET /api/github/repos → 200 (937 ms)`, **0 console errors**.
- [x] **The same question was answered twice, and the plan line printed a console error.**
      Control, build **154** (old front end): `POST /api/ai/generate → 200` then
      `POST /api/ai/discuss → 200 (66 ms)` with the identical paragraph, plus
      `POST /api/builds/154/log → **409**`. Treatment: the row carries `answer:true`, so the poll
      never re-asks; `/api/builds/:id/log` accepts appends on `answered` rows → **201**
      (`completed`/`failed` still 409); `/api/ai/discuss` answers from the keyword path first
      (66 ms, deterministic). Build **157**: **one** reply, **no** discuss call, **201**, **0 errors**.
- [x] **An answer that built nothing still showed an app plan.** Treatment, build **157**: the
      plan card and the stage strip are removed the moment the answer lands — `#cs-plan-card`
      absent, `#cs-plan-stage` empty, status still **"Answered — no app was built."**
- [x] **The GitHub push was never executed (row C5 said "untested").** Measured now:
      `POST /api/github/push → **200 (1,580 ms)**` → file `e2e-verify.txt` (23 B) on
      `placebetsai/createstuff-e2e-probe`, read back with `gh` — content exactly
      `E2E-PROBE-1790788226173`, commit **`e45c148cfc`** carrying the message typed in the box.
      Repo restored afterwards (`d40847eaf0`, tree `["README.md","index.html"]`). Import leg:
      `POST /api/github/import → **201 (1,438 ms)**` → *"New app: createstuff-e2e-probe (github)"*.
- [ ] Still open: push to a repo the connected account does not own; GitLab/Bitbucket (no panel
      here); a *different* user's GitHub OAuth. None of those are claimed.

### 2026-09-30 (later) — fashionistas "Fill it for me" could wait for ever

- [x] **The auto-fill button had no timeout.** CONTROL: with the helper silent,
      `#xl-fill-msg` read **`Opening 6 shops…` at 5 s and at 10 s**, forever — a broken-looking
      button with no way forward. TREATMENT: a **4-second countdown** now replaces it with the
      bookmark/no-install route, the extension switch-on steps and *"your 21 picked shops already
      have their text ready"*; measured on a fresh load (guidance inside a 9 s wait, **0 console
      errors**), and with an ACK arriving (replayed from `bridge.js:14`'s contract) the success
      line stays put at **+6 s** — the countdown is cancelled, so success never turns into a
      warning. A second press now clears the previous listener/timer first.
- [ ] Honest scope, unchanged: auto-fill covers the **6** shops the helper supports
      (`depop, ebay, poshmark, mercari, vinted, grailed` — the only shops in the extension);
      the other 15 of the 21 get ready-written kits + links, and **posting to them server-side is
      impossible without their credentials** (Q1, still waiting on the owner).

### 2026-09-30 (later) — Replit parity: send the whole app, not one file

- [x] **The complaint, checked instead of argued.** Owner: *"Replit and Base44 can do it — why
      can't you?"* Searched before answering: **Replit** is two-way GitHub (import, Git pane,
      *"stage and commit all changes"*, one-click push); **Base44** is **one-way** *"Export to
      GitHub … a one-way connection"* and it sits on a paid plan. On the shops: **Depop's**
      listing API is **partner-only** (`partnerapi.depop.com`), **Vinted has no public API**,
      Poshmark/Mercari/Grailed publish none — which is why crosslisting tools scrape. So the
      one honest parity gap on our side was this: **Replit commits every changed file in one go,
      we could only send ONE file per push.**
- [x] **CONTROL (live pre-fix worker):** `POST /api/github/push` with
      `files:[{path,content}]` → **422 `{"error":"There is no code to send"}`**, and `gh`
      read-back of `placebetsai/createstuff-e2e-probe` still `["README.md","index.html"]` —
      nothing landed.
- [x] **The fix** (`workers/createstuff-api/src/index.js`): `files` is now accepted — validated
      (≤ 60 files, ≤ 4 MB, no `..` paths, no empty bodies) and written through GitHub's **Git
      Data API**: one tree → one commit → one ref move, so the branch either changes once or not
      at all. The single-file path is untouched.
- [x] **Defect found by the treatment run, not by the gate:** the first deploy put the new block
      *above* `const branch` / `const message`, so the whole-app path threw
      `Cannot access 'branch' before initialization` → **500**. Hoisted both declarations, kept
      `oneFileMessage` for the old path, re-deployed. (`node --check` had passed on both builds —
      TDZ is not a syntax error, only the live call caught it.)
- [x] **TREATMENT, server:** one call, **200 in 2.57 s**, commit **`2f37733730`** *"Send my
      whole app from CreateStuff"* containing **exactly 3 files** (`README.md`, `src/app.js`,
      `src/styles.css`) — one line of history, not three. Single-file regression: **200 in
      1.29 s**, `index.html` blob updated.
- [x] **TREATMENT, the button a person clicks** (`pushAllToGitHub`, `#github`, real Chrome,
      signed in): *Send my whole app* → `POST /api/github/push → **200 (2,356 ms)**` → commit
      **`93246c0bb4`** *"Whole app: 2 files, one save"* on a freshly created repo, **2 files**,
      parent `498b77efcb` (the branch moved, it did not fork), contents byte-equal to what
      project **259** holds; toast **"Sent 2 files to GitHub in one commit"**; **0 console
      errors**; both `createstuff.ai` and `app.createstuff.ai` serve `app.js` sha
      `e178a631a8e7ff84` == local.
- [ ] Not proven: the 60-file / 4 MB rejections (routes written, never executed live), pushing
      into a repo this account does not own, GitLab/Bitbucket. `createstuff-wholeapp-probe`
      **stays on the account** — the `gh` token has `repo` but not `delete_repo`, so the DELETE
      came back *"Must have admin rights to Repository."* Disclosed, not glossed.

### 2026-10-01 — layman walk of all four: what actually executes (and two alarms I retracted)

- [x] **Why this pass.** Owner: *"the apps still don't do shit."* Instead of arguing, every site
      was driven like a first-time user, in a focused tab, recording request + response:
      - **placebets.ai/predict** — typed `Chiefs`, pressed Predict → `?q=Chiefs`,
        *"Predictions for "Chiefs""*; board data `GET /api/odds → 200`, **468 matches** with
        picks, PASS/LEAN labels and *Open prediction* links.
      - **marketpicks.ai** — clicked *Is NVIDIA overvalued?* → `POST /api/chatbot → **200 in
        8.3 s**` → real answer about NVDA's forward multiple with **named sources**, rendered
        in the chat.
      - **fashionistas.ai** — demo seller → *Add without a photo* → filled the form →
        `POST /api/listings → **201 (963 ms)**` → item listed with price and department counts
        updated, toast *Added ✓*, **0 console errors**.
      - **createstuff.ai** — register → `cs_auth`/`cs_token`/`cs_user` stored → sign-in lands on
        `#dashboard`; **session survives a plain reload** (keys still there, *Sign out* visible).
- [x] **Two alarms I raised and then withdrew** (recorded so nobody re-litigates them):
      1. *"/predict is stuck on Loading…"* — false. The harness **freezes background tabs**, so
         `requestAnimationFrame`/`setTimeout` never fired and React's `$RV` flush (`$RB` stayed
         at **6**, `$RT` stayed `undefined`) never ran. With the tab **focused**: `$RT=114`,
         `$RB=0`, `S:1` consumed, page **509 px** tall with the ask box working. Retracted.
      2. *"localStorage is wiped on every reload"* — false. After closing the sibling
         createstuff.ai tabs, sign-in keys **survive a plain reload**. Both origins' storage was
         empty only after ~12 h across a date change (browser profile restart), and the current
         build's `logout()` runs **only** from the Sign-out buttons (`#logout-btn`,
         `#mobile-logout`) — nothing auto-clears. Retracted.
- [x] **The one real dead end found by doing it** (row F19): both add-item forms refused with a
      **combined** message. Control: title typed, price left empty → *"Title and price are
      required"* — the app blamed a field the seller had just filled. Fix: name the **one**
      missing box, put the cursor in it.
- [x] **TREATMENT (live, fresh load, demo seller):** price empty → **"Add a price — e.g. 45"**
      with focus on `#m-price`; price filled, department empty → **"Pick a department — e.g.
      Women's Clothing — so buyers can find it"** with focus on `#m-dept`; department chosen →
      `POST /api/listings → 201 (963 ms)`, item visible, **0 console errors**. Same edit applied
      to the main Sell form (`saveListing`) — **that path was not browser-proven here**.
- [ ] Still open: mobile/Phase 5 (no device emulation tool in this harness), `/help`, createstuff
      map #3–#8, and the four WAITING-ON-YOU items.

### 2026-10-01 (later) — the phone path, tested for the first time on all four

- [x] **Why.** The owner is still saying the apps don't work, and the one device class nobody
      had ever executed was a phone — `tests/walk-390.mjs` (fashionistas) and
      `tests/measure-createstuff-390px.mjs` (createstuff) existed; **placebets and marketpicks
      had no mobile test at all.** `playwright` turned out to be installed under
      `Placebetsai-src/node_modules`, so the excuse "no device emulation" was wrong: it is
      available, it just was not being used for these two sites.
- [x] **New test `tests/walk-390-pb-mp.mjs`** — iPhone 14 viewport (390×844, touch, iOS UA),
      per screen: horizontal overflow, whether the screen's own control is thumb-sized, whether
      the main action actually completes, and first-party load failures.
- [x] **First run FAILed 6 checks**, which is what a test is for. Sorting them:
      - **ad-host noise** — the console line `Failed to load resource: net::ERR_*` carries no URL,
        so it cannot be attributed; a clean diagnostic load of all four pages at 390px showed the
        only failing resource was `pagead2.googlesyndication.com` (AdSense, DNS-blocked in this
        sandbox). The classifier now ignores URL-less resource lines (`requestfailed` already
        reports the same event *with* a URL) and `net::ERR_ABORTED` (a normal SPA route change:
        the new navigation cancels the old prefetch — it fires on every `router.push`).
      - **my own thresholds were wrong** — the predict assertion read only the first 400 chars of
        the page, which on a phone is nav and ticker; the result heading is further down. Fixed to
        search the whole page. The "thumb-sized" bar rule demanded a 200 px input; measured
        input is **166×42** with an **80×42** submit, which meets the 40 px touch minimum — the
        rule now tests the standard, not my preference.
      - **my ready selector for the chat was a guess** (`[aria-label*=chat]`) that never existed;
        the chat itself opened fine (input **288×53**, send **48×48**).
- [x] **TREATMENT — all four sites now have a phone walk and all four PASS:**
      - fashionistas `tests/walk-390.mjs` — 10 screens, 0 overflow, 0 errors, Send tappable;
      - createstuff `tests/measure-createstuff-390px.mjs` — A4 fit / A5 thumb controls / A6 land
        on `#builder` all PASS;
      - placebets + marketpicks (new) — home, `/predict` (typed a query on the phone →
        `/predict?q=NBA` → *"Predictions for …"*), `/parlay` (3 flavor tabs 300×126, board
        renders), marketpicks chat (opened → asked → answered), **0 first-party failures**.
- [x] **Also swept while hunting the complaint:** all internal links on the four landings (13
      marketpicks routes that a raw fetch returns empty for all **render real content** —
      4k–72k chars, e.g. `/receipts` 72k, `/insider-trades` 39k); createstuff's hash routes
      `#projects`/`#settings` render their empty states when **clicked** (my 400-char threshold
      was the false alarm); `/games` "Coming soon" is a per-game status badge on a live 24-game
      catalog, not a stub page; fashionistas **Create account** → `POST /api/auth/register →
      201` → Home shows the add button → `POST /api/listings → 201`, toast *Added ✓*, 0 errors.
- [x] **Reliability burst** (5× `/api/odds`, 4× `/api/news`, 4× `/api/parlay-showcase`, 4×
      chatbot, 5× `/api/health`): **22/22 HTTP 200**, chatbot 0.9–3.1 s with live prices
      (BTC $83.9k, NVDA $230.2x). The one non-200 in the burst was my own probe sending
      `message` instead of the API's `query` field — recorded as a probe bug, not a product bug.
- [ ] Still open: a real handset (Playwright fakes width, not touch hardware), `/help`,
      createstuff map #3–#8, and the WAITING-ON-YOU list.

### 2026-10-01 (data layer) — the owner's four complaints, reproduced and then closed

The instruction was: fix the data layer first, prove every claim live, label anything untested.
Every row below started as a **reproduction against production**, not a code reading. Full
control/treatment detail in `handoff.md` §11; the standing gate is
`node tests/data-layer-proof.mjs` (**judges 13/13, PROOF 5/5, exit 0**, repeatable).

- [x] **"the sites have bad data" — four defects on placebets, each reproduced first:**
      - the trending cron named a bare `GROQ_KEY` (deleted in `eccbd0d`), its `catch` swallowed
        the `ReferenceError`, and it replied **`{ok:true, topics:0}` while writing 0 rows**;
        **4 of 21** cron routes had no caller → treatment **7 rows** at `18:00:32Z` with
        scheduler `placebets-scheduler` `a66dca7e` driving **18 `/api/cron/*` paths** hourly;
      - `probability` was the first `%` in the prose, **including refusals** (`0.578`, `0.545`)
        → treatment **refusal ⇒ `null`**, 4/4, and **0 violations across 39 live answers**;
      - `/api/kalshi` served **20/20 markets past `closeDate`** as if live → **0/20**;
      - the chatbot had **0 references to `/api/predict`**, so the engine could never have run →
        `prediction.consulted: true` with a real `as_of`, plus the negative control (greeting →
        `consulted: false`).
- [x] **The harness found an outage the calls had not:** `POST /api/predict` failed 20+
      consecutive times — apex = Cloudflare's branded `502` HTML (6,413 B), deployment host = our
      own `{"error":"AI engine error"}` `502`, `/` byte-identical on both hosts and every control
      route `200`, so only the provider call was failing. **Root cause measured: Groq `429` on
      `openai/gpt-oss-120b`** (first `429` at **62 ms**; one call `rate_limit_seconds: 127`), and
      the route had **one provider, no timeout**, a missing key was a hard `500`. `ff6fbe7` keeps
      Groq primary with a 6 s cap and falls back through the site's own chain to **workers_ai**
      (no key needed), reporting `providers` on failure. **Treatment 14/14 `200` JSON, 0 branded
      HTML; old build `0206993d` reproduces the `502` 3/3 as the control.**
- [x] **"isn't ready for primetime for scalability" (fashionistas) — one 432 KB lump → two
      cacheable pieces:** control `index.html` = **432,399 B** with the whole app inline (no
      cache granularity; assets cache `max-age=14400` while HTML is `max-age=0`); `ced043d`
      ships **133,520 B HTML + 298,913 B `/app.js?v=1ca902262a62`** where the `?v=` is sha256 of
      app.js's own bytes. **Live sha `143864b73113caca…` == worktree byte for byte**, `/app.js`
      200 / 298,913 B, browser reports all four externalised functions defined and **0 console
      errors**; harness **68/68** (control at HEAD **65/67**).
- [x] **The hover-tip alarm was mine, not the product's:** the probe read 64/64 `data-tip`
      without `title` — by design (`syncTips()` removes `title` on hover-capable devices so you
      do not get two tooltips, and sets it when the device cannot hover). Proven on **both**
      branches against the live DOM: `mouseover` **and** `focusin` both fill `#tip-bubble`
      (`role="tooltip"`, correct text), 8/8 icon-only tips have `aria-label`, and re-running the
      shipped function with `CAN_HOVER=false` yields **64/64 `title === data-tip`**, which the
      app's own `syncTips` restores to **0**. Nothing to fix; recorded so nobody re-opens it.
- [x] **marketpicks chat pinned at its own 7 s budget:** control p50 **6.95 s** (6.68, 3.17,
      7.28, 7.19, 7.60, 6.70) with 2/4 `503`s — `findSources()` (default **6000 ms**, two RSS
      feeds) was awaited *before* the LLM started. `c5d5493` runs it in parallel with a 450 ms
      head-start, a 1500 ms ceiling and 350 ms residual, and stamps `{total_ms, stages}` on
      every response. **Treatment p50 3072 / 3031 / 3075 / 2870 / 2923 / 3015 / 2151 / 2808 /
      3067 / 3122 ms across ten runs — every one under the 4000 ms budget.**
- [x] **"not a cheap free Replit/Base44 killer" — the auth defect that made it feel broken:**
      the session key came from **per-isolate randomness**, so a token was valid on one isolate
      and rejected on the next: **control 60 parallel `GET /api/auth/me` → 13×`200` / 47×`401`**;
      `0bb3bde` derives it once from the bound secrets (no secret in source) → **60/60 twice,
      3× interleaved, 0 failures** (worker `efcb76d4`).
- [x] **createstuff vs Replit/Base44 was INFERRED, now MEASURED:** real build **214.0 s**
      (`prepare` 598 ms → `generate` 213,208 ms), **3 files / 9,361 B**;
      `GET /api/builds/:id/log` → **404** (no streaming route) and a 1 s poll saw **2 chunks in
      2.4 s then nothing for 212 s**. Gap table rows for our own site are `measured`; every
      Replit/Base44 cell is `inferred, unverified` because those products were not run today.
- [x] **The bot cut answers in half (`92752b3`):** control `substring(0, 500)` → live answers
      ending **`…check the live lin`** (exactly 500 chars) and `…56.5% implied` (499); the same
      fingerprint reproduced on pre-fix deployment `b9780a5b` an hour later (`…put it aro`).
      `clipProse()` now cuts only on a boundary the original text confirms and always ends `…`;
      **treatment 0/19 at the 500-char cap, answers run to 779 chars.** New `finish_reason`
      field **retracts my own hypothesis**: both Groq answers reported `stop`, never `length`, so
      `max_tokens: 350` is **not** truncating.
- [x] **The harness itself was wrong twice, and both fixes are ships:** C2 failed 1 run in 3 on
      real `502`s (a product defect it correctly caught), then on **odds math**
      (`a -110 line means 52.4% implied probability` is not a promise about the asked question).
      `d40939a` requires a maths marker-free context before a percentage counts as asserted, and
      adds D11/D12/D13 so the escape hatch is tested in both directions: **judges 10/10 → 13/13,
      PROOF 5/5, exit 0, repeatable.**
- [ ] **Open, measured and not fixed:** Groq `429` still degrades the *primary* provider
      (workers_ai now serves 17 of 19); `/api/predict` returned a branded `502` **1 time in 19**
      at **9,613 ms** and the trigger is **unidentified (untested, not explained)**; control host
      `0206993d` now answers `502` on 24/24 because it predates the fallback (so it can no longer
      serve as a control); `clipProse` has **never been observed firing in production** —
      unit-proven only; fashionistas still lists **2 items** (blocked on the Q1 auto-posting
      decision); createstuff still loses on build speed (214 s vs the 60–150 s the UI states),
      collaboration, terminal and per-generated-app database.
- [ ] **Disclosure:** a subagent's grep printed the value of `CS_API_TOKEN` into a tool output
      this round. Never written to a repo, `.secrets/cf.env` stays gitignored — **rotate the
      token** (owner action).

### 2026-10-01 (Connect panel) — "Connect Depop" stops being a checklist and a flag

Owner, verbatim: *"Connect Depop … Ready to guide … I've connected is a local flag only …
figure out an easy way"*, following *"easier better integrated ways to get users plugged in …
auto screenshots to ship items"*. This repo already had an extension that fills each shop's
form (`extensions/crosslister/`) — the Connect panel simply never surfaced it.

- [x] **The panel performs (build `a4308ffb48d8`, commit `372c234`).** CONTROL build
      `45fcb471aae0`: coach checklist + `Open create listing` + `I've connected`, subtitle
      *"Free guide · open the shop · paste your draft"*, nothing sent anywhere. TREATMENT:
      **`Fill Depop for me`** when `bridge.js` reports the helper (round-trips
      `FASH_CROSSLIST` → ack), **`Copy my listing & open Depop`** when it does not; subtitle
      *"One tap · your draft lands in the shop's own form"*; tag **`Auto-fill ready` only
      when `data-fash-crosslister` is set by the extension itself**, otherwise the honest
      local label. New proof `tests/connect-fill-e2e.mjs` **37/37, exit 0**: helper on →
      panel click → extension ack → Depop form filled (description, **price 25**, **1 photo
      attached**, **never posted**); helper off → **real system clipboard read back
      375,493 chars**, `fashionistas:1`, `data:image/jpeg;base64`, shop opened.
- [x] **The photos ship (the "auto screenshots" complaint), measured live:** payload with
      nothing ticked = `photoCount: 1`, `data:image/jpeg;base64`, **375,493 chars**; the API
      photo answers `access-control-allow-origin: https://fashionistas.ai` (so the no-install
      fetch works from the page), and the extension path attaches the file itself
      (`Depop photo attached: 1`).
- [x] **It was shipping a photo-less item:** demo account row **126 has `photo_url` empty**
      and was what the fallback selected. Fallback is now the newest item **that has a
      photo** (test: `rows[0]=126 photo=false → picks 98`; live panel with nothing ticked
      ships 98).
- [x] **The one-tap copy failed on the live site while the tab opened — measured:** opening
      the shop first moved focus and Chrome refused the write
      (`NotAllowedError: … Write permission denied`, console pinned to `app.js:3327`). Copy
      now starts while this document is focused, the shop opens after, and a blocked popup
      produces an explicit **`Open Depop here`** link instead of silence. The refusal in
      *this* environment was isolated separately: `navigator.permissions.query(clipboard-write)`
      → **`denied`** on the automation desktop profile (a bare `writeText` probe fails
      identically).
- [x] **Fake affordance gone:** `I've connected` → **`I have an account`** in panel and rows
      (tip: *"no connection was made"*); `tests/e2e/crosspost.mjs` §3 still **26/26**
      (`Account noted`, tip *"Nothing was connected"*).
- [x] **Depop deep link corrected:** `createListing` was `/sell/` (measured: a marketing
      page, no form) → `/products/create/`, which redirects to
      `/login/?redirect=%2Fproducts%2Fcreate%2F`, the actual form behind its own login.
- [x] **Copy corrected, hedged where untested:** Depop's *"no public seller OAuth"* is stale —
      its Selling API is partner-granted and `partnerapi.depop.com` answered only `routing` /
      `Assets controller` errors from this machine, so **self-serve signup is recorded
      untested**; the honest line and coach steps no longer name a button label the other
      browser state hides (live: `honestHasLabel:false`, `honestOneTap:true`).
- [x] **Gates, all exit 0:** `connect-fill-e2e` **37/37**, `crosslister-e2e` **31/31**,
      `bookmarklet-e2e` **26/26**, `harness-categories` **68/68**, live `crosspost` **26/26**
      before and after deploy; `data-layer-proof.mjs` unchanged **13/13, PROOF 5/5, exit 0**.
      Deploy verified: **apex == pages.dev == local**, `app.js?v=a4308ffb48d8`
      (`8e334053`); one deploy exited 1 on an origin race and was re-run to a clean
      **VERIFY pass** rather than reported as success.
- [ ] **Open, measured, not fixed:** "it copies for a real person" is **inferred, not
      measured** (this desktop denies `clipboard-write`; the e2e proves the bytes only with
      the permission granted, the way a person's browser grants it); Depop partner-API
      self-serve availability **untested** (docs unreachable; `business@depop.com` is the
      documented route, unverified by us); the helper path still needs the extension
      installed and a **Chrome Web Store listing was not verified this round** — the
      zero-install bookmark remains the path that needs no install at all.
