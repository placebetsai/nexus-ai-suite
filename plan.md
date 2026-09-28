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

### Phase 2: Backend (TODO)
- [ ] Set up Supabase for auth + database
- [ ] Create Cloudflare Workers for API endpoints
- [ ] Implement user authentication (email + OAuth)
- [ ] Set up database schemas for each app
- [ ] Create API routes for CRUD operations

### Phase 3: Real Data (TODO)
- [ ] Integrate The Odds API for PlaceBets.ai
- [ ] Integrate Alpha Vantage for MarketPicks.ai
- [ ] Integrate Poshmark/eBay APIs for Fashionistas.ai
- [ ] Create content for IHateCollege.com courses
- [ ] Build code execution sandbox for CreateStuff.ai

### Phase 4: AI Integration (TODO)
- [ ] Connect MCP hive models to CreateStuff for code generation
- [ ] Connect Muse Spark to Fashionistas for listing descriptions
- [ ] Connect Ling 3.0 Flash to PlaceBets for bet analysis
- [ ] Connect MiMo V2.5 to CreateStuff for debugging
- [ ] Connect Nemotron Ultra to MarketPicks for stock analysis

### Phase 5: Mobile (TODO)
- [ ] Build Kotlin Android app for CreateStuff
- [ ] Build Kotlin Android app for Fashionistas
- [ ] Build Kotlin Android app for PlaceBets
- [ ] Build Kotlin Android app for MarketPicks
- [ ] Build Kotlin Android app for IHateCollege

### Phase 6: Polish (TODO)
- [ ] Add OG meta tags to all apps
- [ ] Add canonical URLs
- [ ] Add keyboard accessibility
- [ ] Add error handling
- [ ] Add analytics
- [ ] Create help documentation

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
         `cpanel.` etc. across the 8 wildcard zones app-host fronts; each missed the host cache and
         fell through to `SELECT id, deploy_url FROM projects WHERE deploy_url IS NOT NULL …` — a
         **whole-table read**. Measured **18,214 scans on 09-27 → 2,445,142 rows**. The table holds
         **~146 projects, only 19 published** (ratio **7.9 : 1**, confirmed from reads/returns), so
         every scan paid for 146 rows to hand back 19. A per-isolate cache had already cut this to
         **~130 scans/day ≈ 19,000 reads** by 09-28 — a **99.2%** reduction — but nothing stopped
         it from coming back, and nothing watched the pot.
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

      **KV budget respected:** writes kept to 48/day for the
      status key plus a history entry **only on state change** (KV free tier is 1,000 writes/day and
      response caching already spends some of it).


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

### P1 — the visible "they can do that" list
- [x] **Discussion mode**: talk to the Agent about an idea without spending a build
      (Base44 has this explicitly; we were spending a build on every message).
      **DONE 2026-09-28** — a **Build it / Talk it through** switch above the chat box.
      Talking calls `POST /api/ai/discuss`, which writes no code and touches no table:
      **projects 37 → 37, builds unchanged**, answer in ~4.8 s. **Browser E2E 27/27**
      (`tests/e2e/discuss-mode.mjs`, 0 console errors, 0 failed requests) — covers the
      switch, its tips, the answer, *no project created*, the choice surviving a reload,
      and **Build mode still creating an app (37 → 38)** so the old path is unbroken.
- [ ] **Custom domain for a published app** (Replit sells them in-app; Base44 removes branding at
      paid tiers — we should accept a domain the user already owns).
- [x] **Version history list in the builder** with a Restore button.
      **DONE 2026-09-27 (P13)** — the list sits under the preview with a Restore button;
      restoring appends a new version and leaves the older numbers unchanged.
      `versions.test.mjs` **8/8**, Chrome E2E **12/12**.
- [ ] **Templates gallery**: start from a working app instead of a blank chat.
- [ ] **Analytics for published apps**: views, referrers, countries (Base44 dashboard).
- [ ] **SEO audit + one-click fixes** on the published address (Replit SEO Agent).
- [ ] **Scheduled runs / automations** for user apps (Replit Scheduled Deployments, natural
      language → cron, error alerts).
- [ ] **Share a preview link** (password-optional) so someone can look before it goes live.

### P2 — later, do not start these before P0
- [ ] Mobile output beyond installable PWA; email sending from user apps; payments inside user
      apps; invite collaborators and roles; monitoring/logs console for a published app;
      connectors (Slack/GitHub/Notion/Calendly…) as MCP-style add-ons.

**Order of work:** P0 cockpit → P0 checkpoints → P0 repo both ways → P0 backend → P1 discussion mode.
Nothing in this list may be shown as working before it is proven live end to end.
