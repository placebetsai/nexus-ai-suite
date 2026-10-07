# 🐝 NEXUS-AI-SUITE — HANDOFF FOR AGENTS

> **Newer:** `HANDOFF-2026-10-06.md` — current daily handoff (accounts, tokens, deploy recipe, open blockers).
**Last updated: 2026-10-07** · Repo: `placebetsai/nexus-ai-suite` (branch `master`)
**Sections 1–15 are history (2026-09-24 → 2026-10-02). Current truth = §16 + `HANDOFF-2026-10-06.md` +
`ISSUE_LOG.md` + `PRIMETIME_CHECKLIST.md`.** If a claim below disagrees with those, the other files win.
**Local path:** `/home/billionaremaker/Documents/Default Project/nexus-ai-suite`
**Local GitHub backup (mirror):** `/home/billionaremaker/Documents/GitHub-Backup/`

---

## 1. THE GOAL (verbatim, from the user)

> "Two flagship apps — **Fashionistas.ai** and **CreateStuff.ai** — rebuilt for REAL. Web first,
> then native Android/iOS (**no web wrappers**). Deployed on Cloudflare. **No fake scaffolding,
> no canned fallbacks, no lies. Every feature must be a real, live, testable URL.** The hive must
> test ALL features and confirm we have real apps."

Secondary goals added this session:
- **CreateStuff:** vibe-code *from a phone* on web; pull **any person's GitHub repo** and guide them A→Z; scalable; native only after web proves out.
- **Fashionistas:** photo → AI item ID → one-click cross-list to marketplaces; AR try-on for buyers; sold to Etsy sellers.
- Both sites **SEO-optimized** (OG/Twitter/canonical/JSON-LD/robots/sitemap/favicon/manifest).
- Beautiful + modern with animated words, graphics, cards.

---

## 2. WHAT THE GOAL IS NOW (current phase)

| # | Objective | Status |
|---|-----------|--------|
| 1 | Both apps live on real domains, real backends | ✅ done |
| 2 | Full SEO head on all 3 sites | ✅ done, **audit-passed** |
| 3 | Hive proves every feature with real HTTP evidence | ✅ round 1 done · round 2 (re-run) in progress |
| 4 | Fix every defect the hive finds | 🔄 in progress |
| 5 | Keep GitHub + local backup in sync | ✅ done, keep doing after every push |
| 6 | Native Android/iOS | ⏸ parked — **only after web is proven** |

**If you are an agent picking this up:** your job is to *find defects with real curl output, fix them, redeploy, re-verify, commit, push, backup*. Never claim success without an HTTP code you actually observed.

---

## 3. WHAT WAS DONE THIS SESSION (2026-09-24)

### 3.1 SEO — all three sites (was: **zero** OG/canonical/JSON-LD on every site)
Injected a marked, idempotent `<!--SEO-START-->…<!--SEO-END-->` block into each `<head>`:
- `meta description`, `robots`, **one** `rel=canonical`, `theme-color`
- Open Graph (`og:type/site_name/title/description/url/image/width/height/locale`)
- Twitter (`summary_large_image` + title/description/image)
- **3 JSON-LD blocks** each: `SoftwareApplication`, `Organization`, `FAQPage` (5 real Q&As)
- favicon (`icon.svg`), `apple-touch-icon`, `manifest`
- Real static `robots.txt`, `sitemap.xml`, `manifest`, **`og.png`** (1200×630, generated with PIL)

**Fixed after hive `scribe` audit** — titles/descriptions were over Google's limits:

| Site | title | desc | was |
|------|-------|------|-----|
| fashionistas.ai | **54** ✅ | **139** ✅ | 68 ❌ / 181 ❌ |
| app.createstuff.ai | **53** ✅ | **128** ✅ | 178 ❌ |
| createstuff.ai | **53** ✅ | **125** ✅ | 169 ❌ |

`og:title`/`og:description`/`twitter:*` updated to match. **Live-verified 3/3 PASS.**

### 3.2 Production bug fixed — `fashionistas-api`
- `POST /api/ai/tryon` was returning **500 `text.match is not a function`** because Workers AI returned a non-string.
- Fix: `aiText()` now coerces `r?.response ?? r` to a string (`JSON.stringify` if not a string), and try-on guards `typeof text === "string"` before `.match()`.
- **Now: 200 with real AR overlay JSON.** Worker version `3.1.0`, Version ID `2f20d2b3-a3d2-4c44-b58a-5d6466fc4486`.
- Also earlier this session: `/api/listings` POST 500 (`D1_TYPE_ERROR`) fixed with title/price validation (→400) + `safe()` column coercion (→201).

### 3.3 Dead backend found and repointed — `createstuff.ai`
- `createstuff.ai/app.js` pointed at `createstuff-api.fashionistas1979.workers.dev` → **worker was DELETED (HTTP 404, error 1042)**. Every API call from that site failed.
- **Repointed `API_BASE` → `https://api.createstuff.ai`** (the live forge-api). Verified 0 dead refs remain, `node --check` passes.

### 3.4 Discovered: production CreateStuff is much richer than expected
I initially probed wrong paths and reported missing features. The **real** forge-api (`placebetsai/forge/apps/cloud-api`, 3,036 lines TS) already ships:
`/api/github/auth|callback|repos|status|disconnect`, **`/api/projects/import-github` (verified 201 on a real repo)**, `/api/ai/generate|modify|restore|discover|intent`, **`/api/hive/capabilities|execute|code|deploy|diff|undo`**, `/api/publishing-guide`, queues, cron, DO.
→ **Do NOT redeploy my `workers/forge-api` rebuild** — it is a smaller, never-deployed rewrite and would *replace* a richer production service.

### 3.5 Hive tested production — real evidence (round 1, 10 agents, 320s wall, 10/10 ok)
| Agent | Result | Evidence |
|-------|--------|----------|
| **nexus** | ✅ **16/16 URLs → 200**, `NOT_200: none` | all frontends + SEO assets + both API healths |
| **atlas** | ✅ **25/25 frontend↔backend contract MATCH** | extracted every `/api/*` from live HTML, hit each one |
| **ledger** | ✅ **24/24 marketplace fee math PASS**, `ANOMALIES: none` | verified `net = price − fee − processing` per marketplace |
| **mnemonic** | 7/8 | the 1 "FAIL" = **test expectation error**: `GET /api/listings` → 200 `{"listings":[]}` (correct wrapper; atlas independently confirmed 200) |
| **scribe** | ❌ FAIL → **FIXED** | found over-length title/desc on all 3 sites; now 3/3 PASS |
| **pictor** | reported `OG_IMAGE_BROKEN: yes` | **false alarm / race** — it tested before redeploy; all 3 `og.png` now `200 image/png`, magic `89504e47` |
| **sentinel / vogue / forge / curator** | ⚠️ **empty or partial output** | **no evidence produced → re-running** (`hive/tasks/evidence-rerun.json`) |
| **nexus** degraded | primary `nemotron-3.5-lightning-free` **timed out 300s**, auto-fell-back to `big-pickle` and still delivered | proves the fallback chain works |

### 3.6 Git + backup
- `nexus-ai-suite` → pushed, commits `331f172`, `9eb266c`. Git identity set to `placebetsai <placebetsai@users.noreply.github.com>`; `gh auth setup-git` configured.
- **Local mirror backup:** `/home/billionaremaker/Documents/GitHub-Backup/` — bare mirrors of `nexus-ai-suite`, `fashionistas-ai`, `createstuff-ai`, `forge`, `Placebetsai`, `hive`, `joffe-federation-memory` (84 MB).
- `fashionistas-ai` + `createstuff-ai` stale repos staged with current live files (index.html + robots/sitemap/icon/manifest/og.png) — **commit/push if not already done.**

### 3.7 `createstuff.ai` — tested IN A REAL BROWSER, 14 defects found and fixed
Earlier work only proved the files were *served*. This section is what happened when the flows were actually **clicked**. Every fix below was re-verified in a browser after redeploy, not merely checked with curl.

| # | Defect (real, observed) | Fix |
|---|---|---|
| 1 | Login sent `{username,password}` → forge-api requires `{email,password}` → **400 `{"error":"email, password required"}`**. UI showed a generic "Invalid credentials". | form now sends `{email,password}`; server `error` text surfaced to the user |
| 2 | **`Demo: admin / Izzy1234` was a lie** — those credentials never existed on forge-api | removed; replaced with a working **Create account** flow → `POST /api/auth/register` |
| 3 | Welcome line read `user.username` (forge-api returns `user.name`) → `Welcome back, undefined` | reads `display_name \|\| name \|\| username` |
| 4 | **4-hour browser cache** (`max-age=14400`) made every deploy invisible to returning visitors | added `_headers` (HTML `max-age=0`) **plus** `?v=<md5>` cache-busting on `app.js`/`styles.css` |
| 5 | Build sent `{plan}` only; `project.id` read off the wrong shape (`{project:{…}}`) → **`generate` 400 `projectId required`** | unwrap `response.project`, hard-fail if missing → `generate` **200** |
| 6 | **Live preview was a 27-char blank page** — `escapeHtml` never escaped `"` so `srcdoc="…"` truncated at `<html lang=` | escape `"` and `'` → `srcdoc` **27 → 10,151 chars**, `</html>` present |
| 7 | 6 inline handlers passed ids unquoted (`deleteProject(${p.id})`) → **ReferenceError → dead buttons** (Edit/Clone/Delete/Deploy/Versions/Open-file) | quoted all 6. **`useTemplate` left unquoted on purpose** — numeric ids with `===` |
| 8 | My own repair patch then dropped the closing `"` on 5 attributes → malformed HTML | re-patched; verified `onclick="fn('uuid')"` renders and fires |
| 9 | `GET /api/projects` returns `{projects:[…]}` but code treated it as an array → **"My Projects" always empty** | `csProjectList()` unwrap on all 4 sites |
| 10 | Stat selectors mutated *their own* attribute (`data-count="5"`→`"3"`) → **2nd dashboard load threw `TypeError: null.dataset`**; "Lines of Code" was fabricated (`projects.length * 2400`) | stable `data-stat` keys; all four numbers now computed from real API + real builds |
| 11 | `parseInt()` on a UUID → `currentProjectId = NaN` on dropdown change; Files page never refetched projects | keep the raw string; always refetch |
| 12 | `GET /api/builds/:id/versions` has **no route on forge-api** (404) — Versions button dead | shim returns real build history (real prompt, real code length, real timestamp, real `checkpointId`) |
| 13 | GitHub page **statically claimed "Connected via server token"** while the API said `{connected:false}`; `loadGitHubRepos()` then *hid* the connect card, so the real message ("GitHub not connected. Click Connect GitHub to authorize.") was never shown | accurate status line; honors `connected:false`, surfaces the server message, keeps the connect affordance |
| 14 | **3 dead buttons**: `app.js` is an IIFE, but inline `onclick` resolves against `window` → `loadGitHubRepos`, `renderPage`, `showToast` all threw `ReferenceError` (broke *Load My Repositories*, every **Recent Project** tile, and *Configure*) | all three exposed on `window`. Audited all **14** inline handlers: **3 dead → 0 dead** |

**All three repaired buttons re-verified in the browser after deploy:** Recent Project tile `#dashboard → #projects` · Load My Repositories shows the real server message · Configure fires the toast — `errors: []` in every case.

**Browser evidence for the full happy path (not curl — actual clicks):**
`POST /api/auth/register → 200` · `POST /api/projects → 201 {"project":{id}}` ·
`POST /api/ai/generate → 200` real `public/index.html` · preview `srcdoc` = 10,151 B ·
`POST /api/ai/publish → 200 {"publishUrl":…,"checkpointId":"cp-muftvqm2"}` ·
**live URL `200`, `<title>Photography Portfolio</title>`, 7,621 B** ·
**Download ZIP → `project-734bd3f1….zip`, 7,753 B, `unzip -t` = "No errors detected", extracted file byte-identical to the live published file** ·
Clone → `201`, cards 3→4 · Versions panel → `v1 · Built: … · 7621 chars` · `errors: []` throughout.

**Deploy source now lives in the repo:** `apps/createstuff-marketing/` (was only in `/tmp`, which has already been wiped twice this session). Deploy with:
`./deploy.sh pages createstuff-marketing apps/createstuff-marketing`

---

## 4. LIVE URLS (re-verify these; all were 200 this session)

### Fashionistas
| What | URL |
|------|-----|
| Frontend (custom) | https://fashionistas.ai |
| Frontend (pages.dev) | https://fashionistas-ai.pages.dev |
| API | https://fashionistas-api.fashionistas1979.workers.dev |
| SEO | `/robots.txt` (text/plain) · `/sitemap.xml` (xml, 7 urls) · `/icon.svg` · `/manifest.webmanifest` · `/og.png` (image/png) |

### CreateStuff (three surfaces — know the difference)
| Surface | URL | Backend |
|---------|-----|---------|
| **The app** | https://app.createstuff.ai · https://createstuff-app.pages.dev | https://api.createstuff.ai |
| **Marketing/older full app** | https://createstuff.ai | now → `https://api.createstuff.ai` (was dead) |
| **API (forge-api)** | https://api.createstuff.ai | direct: https://forge-api.placebetsai.workers.dev |

Both API healths: `fashionistas …/api/health` → `{"ok":true,"version":"3.1.0"}` · `api.createstuff.ai/api/health` → `{"status":"ok","version":"3.0.0","env":"production","ai":true}`

---

## 5. TECHNOLOGY STACK (built to scale)

### Why this scales without you doing anything
| Layer | Tech | Why it scales |
|-------|------|---------------|
| **Compute** | Cloudflare **Workers** (serverless) | No VPS, no containers, no capacity planning. Runs at the edge in 300+ cities. Scales 0→millions automatically; you pay $0 on free tier. **Scale is Cloudflare's problem, not yours.** |
| **Frontend** | Cloudflare **Pages** (static, direct-upload) | Globally cached static assets + automatic atomic deploys (no downtime, instant rollback by deployment ID). |
| **Database** | Cloudflare **D1** (SQLite at the edge) | Serverless SQLite — no connection pooling, no replicas to manage. Reads are local to the region. |
| **Object storage** | Cloudflare **R2** | S3-compatible, **zero egress fees** — cheap storage for user projects/images. |
| **Async jobs** | Cloudflare **Queues** + **cron triggers** | Background build/AI jobs off the request path; retries + dead-letter queue built in. |
| **Realtime** | Cloudflare **Durable Objects** (`ChatRoom`) | Websocket-ish state per room, coordinated globally without a game server. |
| **AI** | Cloudflare **Workers AI** (`llama-3.2-3b`, `llama-3.2-11b-vision`) | Inference at the edge, no GPU fleet, `source:"ai"` = real model output (never a fake fallback). |
| **Auth** | Real **JWT** (hand-rolled HS256) + auth-gated routes | Bearer-token wall; bare curl → 401 proves it's real. |
| **Agents** | **OpenCode** free models + `hive/dispatch.mjs` | 10 agents × verified $0 models, parallel `mapPool`, **automatic model fallback** on timeout (proven this session). |
| **Deploy** | `wrangler pages deploy` / `wrangler deploy` direct-upload | No git-connected builds, so no surprise redeploys. |

### Scaling path (when traffic demands it)
1. **Now (free):** Workers free tier + Pages free + D1 free → handles the first tens of thousands of users at $0.
2. **Paid Workers ($5/mo):** when you exceed 100k req/day → still no architecture change.
3. **D1 read replicas** if read traffic concentrates in one region.
4. **Native Android/iOS** → **only after web proves out**, and as real native (Kotlin/Swift), **never a web wrapper**. The APIs are already clean JSON REST, so a native client drops straight onto the same Workers.

---

## 6. REPAIR / TOUCH PROTOCOL (follow exactly)

1. **Frontends are single-file SPAs.** Only edit `apps/<app>/index.html`.
   - The SEO block is **idempotent** — it strips any prior `<!--SEO-START-->…<!--SEO-END-->` before re-injecting. Never hand-edit inside it; regenerate instead.
   - **Keep title ≤ 60 chars and description 120–160 chars.** The hive `scribe` agent checks this.
   - After editing, verify JS: extract inline `<script>` bodies (skip `application/ld+json`) and run `node --check` on each. Assert **no duplicate `id=`**.
2. **Workers:** edit `workers/<name>/src/index.js`, run `node --check`, then deploy with:
   ```bash
   cd workers/<name> && npx wrangler deploy        # NOT deploy.sh worker (it's broken)
   ```
   `deploy.sh worker` passes the *directory* as the script arg → "You need to provide the name of your worker".
3. **Never deploy `workers/forge-api`** (see §3.4). Production forge-api lives in `placebetsai/forge`.
4. **Always curl the prod URL after deploy** and report the exact link + HTTP code. No code, no claim.
5. **After every push:** refresh the backup —
   ```bash
   for r in nexus-ai-suite fashionistas-ai createstuff-ai forge Placebetsai hive joffe-federation-memory; do
     git -C /home/billionaremaker/Documents/GitHub-Backup/$r pull --all 2>/dev/null
   done
   ```
6. **Freeze on prod:** do not casually overwrite `fashionistas-api` or `api.createstuff.ai` — real user data lives in their D1 DBs.

---

## 7. HIVE ROUND 2 — EVIDENCE IN (`hive/tasks/evidence-rerun.json`, 4/4 ok, 81s)

| Agent | Result | Literal evidence |
|-------|--------|------------------|
| **sentinel** | ✅ **SECURITY 6/6 PASS** | `401 / 401 / 401 / 201 / 200` — bad token, no token, CSV-no-auth all rejected; SQLi title stored without 500 and table survived |
| **vogue** | ✅ **FEATURES 6/6 PASS** | all endpoints 200 incl. **`tryon -> 200`** (proves the 500 fix) · `MARKETPLACES: total=24 full=8` |
| **forge** | reported 6/8 — **both "FAIL"s are test error, not defects** | see verdict below |
| **curator** | ✅ **WROTE-FILE** | `hive/output/PRIMETIME-STATUS.md` contains exact observed JSON: `fashionistas … "version":"3.1.0"` · `api.createstuff.ai … "version":"3.0.0"` |

**Verdict on forge's `/api/ai/generate` + `/files` "404"s — investigated with my own curl:**
- `POST /api/ai/generate` with a **valid** projectId → **200 with real file content** (`public/index.html`, 7084 B).
- `GET /api/projects/:id/files` valid → **200** `{"files":[{"path":"public/index.html","size":7084}]}`.
- Both routes with **no auth → 401** (route exists; a truly absent route such as `/api/templates` returns 404).
- **Bogus projectId with valid auth → 404 `{"error":"Not found"}`** ⇒ forge failed to extract `projectId` from the register/project response. **No production defect.**

**Final tally (round 1 + 2):** uptime 16/16 · frontend↔backend contract 25/25 · fee math 24/24 · security 6/6 · features 6/6 · SEO 3/3 (after fix).

---

## 7b. HIVE ROUND 3 — EVIDENCE IN (`hive/tasks/contract-createstuff.json`, 3/3 ok, 279s)

Dispatched after the `createstuff.ai` fixes in §3.7. All three produced full numbered output.

| Agent | Model | Result | Literal evidence |
|-------|-------|--------|------------------|
| **atlas** | `opencode/mimo-v2.6-flash-free` | ✅ **CONTRACT 9/9 MATCH**, `BROKEN_ROUTES: none` | `register→409` `login→200` `projects GET→200` `projects POST→201` `project GET→200` `project/status→200` **`ai/generate→200`** `ai/modify→200` **`ai/publish→200`** |
| **scribe** | `opencode/space-bunny-free` | ✅ **SEO 3/3 PASS** | fashionistas.ai title **54** / desc **135** · app.createstuff.ai **53 / 128** · createstuff.ai **53 / 125** — every one ≤60 and within 120–160; `canonical` = 1 each; `og:*` all 4 present; `twitter:card` yes; **3** JSON-LD each; robots `200 text/plain` + contains `Sitemap:`; sitemap `application/xml` (7 / 6 / 5 `<url>`); manifest valid JSON |
| **mnemonic** | `opencode/space-bunny-free` | reported **7/10** — **all 3 FAILs are its own test bug** | verdict below |

**Verdict on mnemonic's three `401` FAILs — verified with my own curl:**

| Endpoint | No token | With token |
|---|---|---|
| `GET /api/listings` | `401 {"error":"Unauthorized"}` | **200 `{"listings":[]}`** |
| `GET /api/export/inventory.csv` | `401` | **200 `id,title,category,price,size,condition,status,photo_url`** |
| `GET /api/marketplaces` | `401` | **200** Depop `feePct:10`, `api:"deep"` |

The agent's register step returned **201**, but it never sent `Authorization: Bearer` on steps 3–5. The routes are auth-protected and work correctly. **Real regression score: 10/10.**

**Cumulative tally (rounds 1–3):** uptime 16/16 · contract 9/9 (r3) + 25/25 (r1) · fees 24/24 · security 6/6 · features 6/6 · regression 10/10 · **SEO 3/3 (re-audited after the shorten fix)**.

---

## 8. KNOWN GAPS / OPEN ITEMS

- ✅ **RESOLVED 2026-09-29 (cron cleanup — go-ahead received) — both cron schedulers threw on *every
  single run*: 191 failed cron runs/day.** Control, called exactly as the schedulers call them
  (16:34–16:57Z): `placebets.ai/api/cron/scrape-live-sportsbooks` **401**,
  `placebets.ai/api/cron/federation-health` **500**, `marketpicks.ai/api/cron/earnings` **500
  `rowCount:0`**, `marketpicks.ai/api/cron/housekeeping` **500** (2 failing checks). Six root causes,
  not four: ① `scrape-live-sportsbooks` is the *only* placebets cron route that compares
  `Authorization`, and the scheduler sent only `accept` — the `placebetsai` Pages project has no
  `CRON_SECRET` secret (only `GEMINI_API_KEY`/`GROQ_API_KEY`), so `dev-secret` was the value in
  force, now stated in `cron/wrangler.scheduler.toml` and sent. **It had never once returned 200.**
  ② `federation-health` wanted `World Cup and live cards` / `Latest prediction` (**0 occurrences**
  each) — and a *second* failure was hidden behind it in the truncated body. ③ marketpicks
  `housekeeping` wanted `Live Congress Tracker` (**0**) and `One engine. Every market.` (split across
  a `<span>` → the literal can never match), and rejected the bare word `placeholder`, which matched
  the `placeholder="…"` attribute on the search input (4× per page) — **failing the page for having
  a working search box**. ④ `earnings` — Nasdaq answered **200 with 15 items**, none for the 9
  tracked symbols, and the fallback's hardcoded dates are all Jul/Aug 2026 → 0 rows → `ok:false`.
  ⑤ **The actual cause of the peer failure:** `marketpicks.ai/api/stock/SPCX` served
  `source "live-yahoo-fallback"`, `149.22`, `Space Exploration Technologies Corp.` — the IPO watch
  basket is *designed* to carry price 0, so it fell into the Yahoo fallback, which looked SPCX up as
  a listed symbol and **stamped an unrelated quote onto it**. ⑥ **The throw rule itself:** a 5xx
  means the endpoint *ran* and reported a degraded upstream source (`freshness` 500s whenever Google
  News or GDELT yields nothing for a minute) — that is the endpoint's health report, already in its
  response and in D1 via `recordCronRun`, not a broken scheduler. Both schedulers now throw only on
  **unreachable (status 0)** or a **4xx that cannot self-heal (not 408/429)** — the class that had
  been hiding the 401 all along — while worker-local checks we wrote still always count.
  **De-duplication:** `site-cron-trigger`'s source existed in **no repo**, only as deployed code, so
  nobody could see that of its 17 endpoints **13 were already owned** by a cron-bearing worker. Pulled
  from the API and now tracked at `workers/site-cron-trigger/` with per-endpoint ownership comments;
  **17 → 4** (`ingest-top-stories`, `daily-digest` + marketpicks `housekeeping`, `daily-digest`),
  with every endpoint having exactly one owner and the scheduler alternating quick-15min/full-hourly
  where the trigger had been firing full mode on top of it. **1.5 MB payload:** `/api/odds?light=1`
  omits the `events` board and reports `eventCount` — used by `record-picks`, both `federation-health`
  odds checks and `daily-digest` (3 call sites, not the 1 the audit found). **RE-RUN under exact
  control conditions: placebets 16/16 HTTP 200, 0 failures, 67,772 B per run (was 1,590,662 B,
  −95.7%); marketpicks 9/9 HTTP 200, 0 failures; `site-cron-trigger` 4/4; housekeeping 6/6 checks;
  federation-health 6/6 checks; `SPCX` → `private-watch` / `IPO watch basket` / price 0.**
  `scrape-live-sportsbooks` answers 200 but `booksScraped: 0` — **explicitly not claimed as working**;
  the scrapers finding nothing is a separate problem from the auth that stopped it running.
  **Honest scope (audit §5.3–5.4):** neither the de-dup nor the byte cut is a *Workers-quota* saving —
  the 100,000/day quota counts *inbound* requests and cron invocations are unchanged — they remove
  duplicated upstream fetches, self-generated traffic and D1 reads (the budget actually breached on
  2026-09-27). Commits `Placebetsai-src 337441c`, `marketpicks-ai fb517ab`.

- ✅ **RESOLVED 2026-09-29 (cron cleanup, second wave — what the first fix exposed) — three more
  checks that had never once passed, and a Worker that could not call another Worker.** Fixing a
  check that fails loudly always reveals the ones behind it. **(1)** `placebets housekeeping` in
  **full** mode only (the control had exercised `?quick=1`, which skips it) wanted
  `AI Signal Hive` / `Who wins?` / `Latest prediction` — **0 occurrences each** in the rendered
  home. **(2)** Its `deep predictor` check read **`json.factors`**; the route returns
  **`key_factors`**, so `factors` was 0 on *every* response including perfect ones — **it could not
  pass even when the predictor worked** — and it probed a hardcoded `q=Lakers tonight`, which only
  has data on days the Lakers play. **(3)** Its `predictor fallback` check demanded **`suggestions`**
  *and* **`message`**, two fields `/api/predict-deep` has never returned (it answers `follow_ups` +
  `answer`) — **it could not pass, ever.** All three fixed against the endpoint's real contract; the
  predictor probe now uses a matchup the odds board just returned. **Measured sequence, all live:
  `housekeeping` full 500 (home) → 500 (predictor ×2) → 200, 10/10 checks PASS**, with quick mode
  still 200 and `federation-health` still 6/6. **(4)** `site-cron-trigger` had been extended by
  another session with `federation-watch/tick` (it cannot have its own cron — the free plan's 5
  triggers are all used) and it failed **every** run with `404 / error code: 1042`. Three
  measurements: from this laptop the URL is **200**; from `site-cron-trigger` — same account, same
  `fashionistas1979.workers.dev` — it is **404/1042**; and that same worker's four **custom-domain**
  endpoints are **200**. So the target was healthy and only the worker-to-worker hop over the shared
  `workers.dev` subdomain was refused. Now reached through a **service binding**
  (`[[services]] binding = "FEDERATION_WATCH"`), i.e. in-process rather than over the network.
  **Control 404/1042 twice → re-run 5/5**, reported as `via=FEDERATION_WATCH` vs `via=https` for the
  four custom domains. Final re-run under exact control conditions: placebets **16/16 HTTP 200,
  0 failures, 71,387 B per run** (control 1,590,662 B), `site-cron-trigger` **5/5**.

- ✅ **RESOLVED 2026-09-29 (cron, third wave) — the health check was failing endpoints that were
  still working.** After the throw rule was fixed the scheduler stopped raising, but reports still
  said `failures: 1` on some runs, so the cause was chased rather than declared done.
  **Control, measured two ways.** (a) Latency over the 24 h to 20:00 UTC, read out of
  `cron_runs.checks_json`: `predictor fallback` **p50 7,774 ms with 3 of 9 runs pinned at the old
  10,000 ms ceiling**, `deep predictor` **p50 5,804 ms / 16,703 ms on direct calls**, `odds api`
  **max 14,840 ms**, `mlb odds api` **max 10,000 ms** — the ceiling was *below* the latency of the
  endpoints it was probing. (b) **Three direct full `housekeeping` calls on the pre-fix build →
  HTTP 200 / 500 / 500 with failures 0 / 3 / 3**, the three being `odds api`, `mlb odds api` and
  `predictor fallback`, **all exactly 10,000 ms**; an aborted probe returns `status 0`, so `json` is
  null and every field reads `n/a`. The **scheduled 2026-09-29 20:00:46Z full run recorded the same
  class of failure in D1** (`ok=0`, `failures=1`, `deep predictor` `mode=n/a`, aborted at 10,000 ms)
  while the 20:04:47 full run was 10/10 — the flakiness was the ceiling, not the endpoints.
  **Two fixes:** ① `TIMEOUT_MS` **10,000 → 30,000** in `app/api/cron/housekeeping/route.js`
  (clears the measured maximum; worst case ~4 blocking checks × 30 s, well inside the scheduler's
  15-minute interval — the scheduler has no per-job timeout, verified in `cron/worker.ts`). ② The
  `deep predictor` assertion demanded `structured → keyFactors>0 AND sources>0`, but when a
  recognised matchup has incomplete market data the route **correctly** answers `recommendation:
  RESEARCH_ONLY`, `confidence: 0`, `key_factors: []`, `supportingFactors: []` and puts the reason in
  `missingData` — measured on `Storm Hunter @ Yu Jun Lin`:
  `missingData = ["unsupported or unavailable tennis moneyline baseline"]`. Refusing to invent
  factors is the product working, so the rule now also accepts an honest refusal and only fails a
  structured answer with **neither** factors nor sources. **Re-run (after, same three calls): HTTP
  200 / 200 / 200, 10 checks each, failures 0 / 0 / 0** — and `predictor fallback` measured
  **12,001 / 10,765 / 11,147 ms**, i.e. every one of those passes would have been reported as a
  failure under the old ceiling. Deploy `57dd48d1` (own gate `✅ PASS … 200 with live content`),
  commit `e894eee`. `freshness` was deliberately **left** at 10 s: its GDELT checks sit at the cap
  **5/5 of the time** (a dead upstream), so raising that ceiling would only triple the wait for
  checks that are already non-blocking — recorded as an observation, not a pass.

- ✅ **RESOLVED 2026-09-29 — CreateStuff's build cockpit was theatre, and its poll could not read
  the server.** Four defects in one path: **(1)** the chip bar listed **9** helpers while the
  generator writes 6 agent names / 5 stages — *Architect, Backend, Style, Git* are written by no
  run ever and sat on "Idle" through every build; **(2)** the poll ranked chips off a **positional**
  array, so it printed "Architect: Done / Frontend: Working" on runs where those agents never spoke
  (including a refusal, where only the Planner answered) — and the chip called `deploy` in the
  markup is matched against the word "Deploy" while the generator writes **`Online`**, so that chip
  **never once turned green** and the run's own `Fix` stage was never checked; **(3)** the poll read
  the build from **localStorage**, where a numeric id is the server's row carrying `started_at` — a
  refresh or a second device had nothing to show, and any row it did find read **0s old** and
  **"unknown error"** even when the Worker had written the reason; **(4)** `POST /api/builds`
  answered only when the **whole** build had finished, so the id did not exist until there was
  nothing left to watch. **Fix:** `CHIP_AGENTS` name-keyed mapping (5 chips = exactly the 5 stages),
  `csFromServerBuild()` to translate a server row into the shape the poll reads, the browser opening
  the row with `prepare:1` *before* it draws, an append-only `POST /api/builds/:id/log` that only
  works while the build is `running`, the stale sweep **15 → 5 min**, and a failure line that says
  the reason **once** instead of twice. **Proof `tests/e2e/createstuff-build.mjs` (22 checks, live):
  CONTROL pre-fix `5/22` exit 1** — 9 chips, old positional array still shipped, `CHIP_AGENTS` /
  `csFromServerBuild` / `prepare: 1` all absent, and **`no prepared:true after 79561ms …
  "status":"completed"`** (the Worker ran the entire build before it could return an id) → **post-fix
  `22/22` exit 0, and `22/22` on re-run** (`prepare` answered in **610–690 ms**, row readable
  `status=running log=1` mid-run, then **6 log entries** to `completed` in **83–96 s**, **3 files**).
  **Full suite after deploy: `4 passed / 0 failed / 0 skipped`, 136.0 s, exit 0** — createstuff-build
  **22/22**, crosspost **26/26**, discuss-mode **27/27**, env-vars **25/25** = **100 checks**.
  Deployed to worker `createstuff-api` (version `362bd490`) and **both** Pages projects
  (`createstuff-marketing`, `createstuff-app`) from `apps/createstuff-marketing`. Two harness bugs
  were found by the control run and fixed before shipping — see TODO **C19**.
- ✅ **RESOLVED 2026-09-29 — Cloudflare free-tier burn: post-fix measurement recorded.** Full audit
  in `audit/CLOUDFLARE-FREE-TIER-AUDIT.md`; §4 now carries the like-for-like numbers. **Same 74-min
  clock window (14:33Z→15:47Z), day over day: account-wide 3,602 → 796 (−77.9%), `app-host` 3,562 →
  568 (−84.1%).**** Cause, not correlation: **0 wildcard records remain across all 8 zones** (was 4),
  **0 scanner-magnet labels** (`mail`, `cpanel`, `webmail`, `ftp`, …) across all **51** records /
  **23** proxied, and `dig +short @1.1.1.1 cpanel.<each of the 4 zones>` → **NXDOMAIN** while every
  apex still resolves — a scanner now stops at DNS: **0 Worker invocations, 0 D1 rows, 0 CPU**. The
  metric that caused the 2026-09-27 outage is healthy: **D1 reads today 480,233 / 5,000,000 (10%)**
  vs **5,133,584 (103%)** then. Honest limits, stated in the doc rather than glossed: 74 min is a
  short sample on bursty traffic (a full post-fix day settles it), and a 498-request burst at
  15:05–15:15Z is **unattributed** — Workers analytics has no hostname dimension and `CF_API_TOKEN`
  has no zone-analytics read, so per-hostname attribution is not obtainable with the credentials in
  this repo.

- ✅ **RESOLVED 2026-09-29 — there was no command that ran the e2e suites.** `tests/e2e/` held
  suites and no runner, so "the e2e tests" was not something you could do. **`node
  tests/e2e/run.mjs`** now discovers them, runs each in its own child process, and reports
  `PASS`/`FAIL`/`SKIP` with the suite's own tally. Contract is in the file header and the exit
  code: **a suite missing credentials is `SKIP`, never a pass**; non-zero exit, crash or timeout
  is `FAIL`; **`0`** = ≥1 suite really ran and nothing failed, **`1`** = something failed,
  **`2`** = nothing ran. It derives each suite's required env vars by reading the suite itself
  (`process.env.X` plus the documented `X=… node suite.mjs` header), so new suites need no edit
  here. Flags: `--list --only <name> --with-walks --allow-skip --timeout <s>`.
  **Proved both directions:** no credentials → `0 passed, 0 failed, 2 skipped`, **exit 2**;
  with credentials → **`discuss-mode 27/27` + `env-vars 25/25`, 2 passed / 0 failed / 0 skipped,
  exit 0**. Commit **`30165ad`**.
- ✅ **RESOLVED 2026-09-29 — that runner's first run found four real bugs in shipped code.**
  `env-vars` came back **19/24 plus a hard crash**, and neither was the test's imagination.
  In `apps/createstuff-marketing/app.js`: **(1)** `csDeleteEnv` had **no guard**, so with no app
  selected it sent `DELETE /api/projects//env/KEY` → **404 the owner experiences as nothing
  happening** (now: *"Choose an app above first"*); **(2)** `loadFilesPage()` **reset the
  selection to `projects[0]` every time you opened the page**, discarding the app you were
  looking at (now: keeps a selection that still exists, falls back only when it is gone);
  **(3)** `sel.onchange` wrote `currentProjectId = sel.value` **unchecked**, so an empty select
  became an empty id and an empty id became `//` in every URL (now ignored); **(4)** one failed
  `GET /api/projects` left the card blank and mute with nothing wired (now retries once, then
  wires the card and lets it explain itself). The **test** was also wrong: `#env-card` goes
  visible *before* the project fetch resolves, so its reselect `change` event was fired into an
  unpopulated select and dropped silently — the rest of the suite was then measuring a different
  app from the one it had written the variable to. It now waits for the select to be populated
  **and** wired, waits for the reselect to take, and **asserts the app under test is selected**
  — one *more* check than before. **19/24 + crash → 25/25 exit 0, run twice.** Commit `30165ad`.
- ✅ **RESOLVED 2026-09-29 — fashionistas and createstuff returned HTTP 200 for every URL.**
  Neither project shipped a `404.html`, so Cloudflare Pages served `index.html` for anything
  unmatched: `fashionistas.ai/nope-xyz` → **200, 421,661 B, byte-identical to the homepage**,
  `fashionistas.ai/assets/nope.css` → **200**, and on createstuff `/`, `/app/`, `/pricing/`,
  `/templates/`, `/guide/` and `/nope-xyz/` were all **200 with the same `adae6034…` body**. A
  deleted page, a stylesheet that never existed and a typo were indistinguishable from the front
  page. Each app now ships a `404.html` in its own design language plus `_redirects` so
  previously-working URLs **301** instead of dying. **After:** `fashionistas.ai/nope-xyz` →
  **404 / 3,164 B**, `createstuff.ai/nope-xyz` → **404 / 5,563 B**, `createstuff.ai/{app,pricing,
  templates,guide}/` → **301 → `/`**, `fashionistas.ai/app/` → **301 → `/`**, while `/` kept
  `d680e1a6…` and `adae6034…` and every real subpage stayed 200. Sitemaps pruned of four createstuff
  URLs that have not existed since the landing-page refresh and a duplicate `/app/`. Deployed to
  `fashionistas-ai`, `createstuff-marketing`, `createstuff-app`. Commit **`9533581`**.
- ✅ **RESOLVED 2026-09-29 — Hive readiness sat at 31/1 for days.** *"agents served by PRIMARY
  model"* failed even though all ten agents acked, because acking and being served on your
  assigned model are different things. **Root cause measured: two roster models are dead.**
  `muse-spark-1.2-contributor-free` is **no longer returned by `opencode.models` at all**
  (`Unexpected server error … ref_1ff12057`); `ling-3.0-flash-fin-free` answers **`Upstream
  request failed: Endpoint is unavailable.`** (exit 1). They were pictor's, vogue's, curator's
  and ledger's models, so all four silently ran elsewhere. The **briefs had drifted from
  `hive.json`** too — `atlas.md` claimed `mimo-v2.5-free`, `sentinel.md` claimed `jev-1.13-free`,
  neither exists. Roster now matches opencode's live eight (muse-1.2 → `longcat-2.5-preview-free`,
  ling-3.0 kept but `endpoint-unavailable` and **assigned to nobody**), all ten agents and briefs
  corrected, and readiness gained the two checks whose absence let it happen: **briefs must
  declare the same model as `hive.json`** and **every agent-facing model must answer live**.
  **Control run** (fix stashed) → `31 pass / 1 fail`, **7/10 on primary**, exit 1 → **fixed**
  → `35 pass / 0 fail`, **10/10 on primary**, exit 0 → **re-run** → `35 / 0`, exit 0.
  Wall clock **125.6 s → 23.4 s**. Commit **`79cc0d3`**.
- ⚠️ **OPEN 2026-09-29 — PlaceBets' newsletter cannot send.** `POST /api/subscribe` → `200
  {"ok":true,"via":"d1"}` and `GET /api/cron/daily-digest` → **200** with today's real digest,
  so signups land and the content builds. The **send** half (`scripts/daily-digest.mjs`,
  `scripts/send-welcomes.mjs` on a cron runner with `GMAIL_APP_PASSWORD`) has **no working
  transport**: all four credential pairs → **`535-5.7.8 Username and Password not accepted`,
  0/4 verified**. The FormSubmit welcome still works, so first contact is fine; **the daily
  digest and the `welcomed_at` sweep are not going anywhere.** Fixing it needs a credential that
  can only come from the owner — rotate a Gmail app password (Google Account → Security →
  2-Step Verification → App passwords) or supply an SMTP/API key. **Nobody should claim the
  digest ships until this row is closed.**
- ⛔ **BLOCKED 2026-09-29 — fashionistas.ai has no client-side analytics.** The other three sites
  carry the Cloudflare beacon (placebets and marketpicks also load Plausible). Turning it on for
  fashionistas is refused from here: every `GET /accounts/7eb89b01…/rum/*` route →
  **`Unable to authenticate request`**, i.e. `CF_API_TOKEN` lacks Web Analytics permission, and
  copying another site's beacon token would file fashionistas' traffic under the wrong property.
  **Zone-level Cloudflare analytics still count requests for it**, so traffic is not invisible —
  only page-level detail is. Needs a token with Web Analytics permission.
- ⚠️ **OPEN — `/help` does not exist on placebets, marketpicks or createstuff** (fashionistas has
  `/about`, `/fees`, `/contact` but no `/help` either). See plan.md Phase 6.
- ✅ **RESOLVED 2026-09-29 — no skip-to-content link on any of the four sites.** *(Was an open
  item: also missing a `<main>` landmark on fashionistas, and alt-less images.)* **Control
  (pre-fix, live):** all **4 home pages skip-link MISSING**; fashionistas `<main>` count **0** and
  **6 real alt-less `<img>`** (a 7th grep hit was a JS-comment false positive); createstuff's anchor
  **untargeted**; marketpicks **no skip link**. **Shipped:** 4 home pages + 5 fashionistas subpages
  + fashionistas `404.html` + `crosslister-privacy.html` + createstuff `404.html`. Design notes worth
  keeping: fashionistas home `<div class="wrap">` → `<main class="wrap" id="main-content"
  tabindex="-1">` (zero layout risk; the footer sitting inside `main` is a documented wart — moving
  it would reorder the signed-in view); createstuff needs **two** skip links (landing → `#top`,
  `#app` → `#main-content`) because `#app` is `display:none` pre-auth, so only the *visible*
  region's link can be focusable — no JS; marketpicks got **one** layout-level
  `<div id="main-content" tabIndex={-1}>` wrapper instead of editing 34 pages; placebets got
  `<main id="main-content" tabIndex={-1}>` + the link before `<OddsFormatProvider>`. **Alt rule:**
  grid thumbnails whose visible title sits directly beneath get `alt=""` (WCAG 1.1.1 redundancy),
  the two detail photos get `alt="Photo of <title>"`, and the listing-form preview gets a
  descriptive fallback because Title is blank on a new listing. **Real-browser proof, all four
  sites (not grep):** fresh document → **Tab #1 = "Skip to content"**, computed `left: -9999px →
  0px`, **Enter → focus lands on the target and the hash updates** — placebets `MAIN#main-content`,
  marketpicks `DIV#main-content`, createstuff `SECTION#top`, fashionistas `MAIN#main-content`.
  Screenshots show **no layout regression** (marketpicks header `top:0 h:214`, body
  `padding-top:214`, brand y=12, ticker y=74, hero y=213, `scrollWidth == innerWidth`).
  **Live re-run:** fashionistas `/`, `/about/`, `/contact/`, `/fees/`, `/privacy/`,
  `/how-to-crosspost/` → skip 1 / main 1 / target 1; `/crosslister-privacy.html` → 308 → 200 with
  target; `fashionistas /<junk>` → 404 with link; `createstuff /<junk>` → 404 (6,020 B) with link
  + `id="main-content"`; **alt-less 6 real → 0 real**; **no horizontal overflow anywhere**.
  Deployed `fashionistas-ai`, `createstuff-marketing`, `placebetsai` (`7f5bd05a`), `marketpicks-ai`
  (`23235420`); commits **nexus `67c90aa`, Placebetsai-src `52c397e`, marketpicks `bca776e`**, all
  pushed with 0 unpushed. *Harmless:* placebets' global `transition: 0.15s` makes the link slide the
  last few px (settles at 0); `:focus` reads `false` in the harness only because
  `document.hasFocus()` is false — a control `<button>` behaves identically. Remaining
  accessibility-adjacent work (Phase 5 mobile, `/help`) is untouched by this row.
- ✅ **RESOLVED 2026-09-30 — CreateStuff built pages that opened and then did nothing, and the
  build reported them as `quality=clean`.** The complaint was specific (*"it's just a web page
  generator"*) and it was correct: each treatment below was a working control→fix pair on the
  **same brief** (`/tmp/csproof/plan5.txt`, a reading-list app), so nothing is attributed across
  different prompts.
  **Controls, all measured in a real browser on the published URL.**
  **(1) project 246** — "Create Account" opened **3 stacked `prompt()` dialogs**, the console threw
  `prompt() is not supported`, **no account was ever created**, and the console carried **4 errors**
  on a signed-out load (`GET /app/246/api/reading-list?mine=1 → 401` twice) because the SDK list
  helper did not fall back when signed out.
  **(2) project 247** — `script.js` **did not parse** (`acorn: Unexpected token (18:868)` from
  `const dark=try{…}catch(e){false}`), the browser threw `SyntaxError` at `script.js:18:869`,
  `appInit` was undefined, every form was unwired, and it was **published as a live dead page**
  reporting `quality=clean`.
  **(3) project 248** — the file parsed, but `$ = id=>document.getElementById(id)` was called as
  `$('.mobile-menu')` → `null` → `.addEventListener` threw inside `try{wire()}catch(e){}`, so
  **sign-up, sign-in, add-book, log-out and the theme toggle had no handlers at all**, and the
  `auth` handler never called `preventDefault()` — the register click **navigated the page** (`…/index.html?`)
  instead of posting. Zero requests, zero messages, nothing on the console (the try/catch swallowed it).
  **(4) project 249** — parsed and wired, but `e=>authHandler(e,'login')` reached
  `async function authHandler(form,type){ form.querySelector(…) }` →
  **`TypeError: form.querySelector is not a function` on every submit**; sign-in and sign-up threw
  and did nothing.
  **(5) project 250** — the control for the last rule: the **Create account** tab only relabelled
  the form (`showAuth('signup')` unhid the name field) while the form stayed bound to
  `authHandler(e,'login')`, so **Create account → `POST /auth/login → 401`**, console `401`,
  `token:false`, no name shown, and **the auth error element stayed empty** — the visitor saw
  nothing at all. A visitor could not register on any of these five.
  **Fixes shipped in `workers/createstuff-api/src/index.js` (CODE_SYS rules + a single
  SCRIPT-HEALTH GATE that runs five checks and does ONE focused single-file re-ask naming the
  defects, then hard-fails only on an unparseable script):**
  ① `jsSyntaxError()` (bundled **acorn**) — a file the browser cannot parse now fails the build
  instead of publishing; ② **no `prompt()`/`alert()`** and sign-up must be a real form;
  ③ **`preventDefault()` first** in every submit handler; ④ **helper/call-site must match**
  (`getElementById`-style `$` never gets `'.class'`), don't wrap wiring in `try/catch`;
  ⑤ **the listener hands you an event, not a form** (`eventAsForm`);
  ⑥ **the mode you show must be the mode you send** (`unreachableMode`). All six are advisory
  except parse: warnings are recorded in `quality` flags after the repair attempt, because a name
  heuristic must never be able to refuse a build that works.
  **Detector precision, measured by extracting the real shipped functions and running them on the
  14 scripts this session produced: every single flag is a defect proven live, and the 7 healthy
  builds produce 0 flags on all six checks** — 247→`parse BROKEN`, 248→`noPD:auth` + 2 selector
  mismatches + `eventAsForm:auth`, 249→`eventAsForm:authHandler`, 250→`unreachableMode:authHandler:signup`,
  gen1–gen5/gen7/246→ all clean. (The first draft of `eventAsForm` silently returned `[]` because
  its parameter regex was not anchored to the function name and matched `search=($` — caught by
  that same precision run, not by inspection.)
  **A sixth, different failure found while proving it: Cloudflare's free 50-subrequest cap.**
  Build **136** died mid-build — `Fix tool: could not ask for the missing files (Too many
  subrequests by single Worker invocation)` → `status: failed`. Cause measured in the code: the
  relay is polled every **3 s**, so one 85 s writer call burned **~28 subrequests** and a build
  makes 3–5 calls. **Fix:** backoff polling (**2 s → ×1.6 → 15 s cap**) plus instrumentation nobody
  had: every relay call now logs `polls=N` and every build logs
  `http-fetches=N of 50-subrequest cap (D1/KV not countable from here)`.
  **Measured after the fix:** build 137's 94.4 s writer → **9 polls** (the old flat cadence would
  have been 31) and **23 HTTP fetches for the whole build**; build 138's 63.5 s writer → **7 polls**,
  **12 HTTP fetches**; build 136 never got past the cap, builds 137/138/139 all completed.
  **Proof that a visitor can now use it — control 250 vs treatment 251, same brief, only the worker
  changed between them.** 251 was built clean (`quality=clean`, `1 script(s) parse cleanly` in the
  build row's own log, `http-fetches=12`) and then walked end to end in a real browser with storage
  cleared first: **0 console errors on first paint**, `__APP` injected, `appInit` defined, **no
  duplicate ids** → Create-account tab flips `authMode` to `signup` → **`POST /auth/register → 201`**
  with token stored and *"You are signed in."* → add a book → **`POST /reading-list → 201`** with the
  row rendered → **reload → `GET /auth/me 200` + `GET /reading-list?mine=1 200`** → signed-in state
  **and the row still on screen**, again 0 console errors, again no duplicate ids. The identical
  click sequence on control 250 produced `POST /auth/login 401` and no account.
  **Honest limits:** n=1 per arm for the mode rule (the control and the treatment are one build
  each, so this is evidence the rule worked on this brief, not a measured pass rate — the
  deterministic half is the detector: 250 flagged, 251 clean, across 14 scripts with 0 false flags);
  the acorn repair path has fired only for the missing-asset sibling (build 137/138's
  "page links styles.css, script.js" step), never for a parse or rule defect, so that branch is
  **untested live**; builds 137/138/139 ran on the relay — direct Zen remains a 15 s-cap fallback.
  Deploys this stretch: `ce24bfea` (gate + event rule), then the subrequest/backoff build, then the
  `unreachableMode` build. Control artifacts kept live on purpose:
  `https://sites.createstuff.ai/250/index.html` (cannot register) vs `…/251/index.html` (can).
- ⚠️ **STILL NEEDS YOU — rotate the two Gmail app passwords.** `scripts/test-smtp.mjs` is scrubbed
  (0 occurrences of either value; it reads `SMTP_COMBOS` / gitignored `scripts/.smtp-creds.json` /
  `GMAIL_APP_PASSWORD`) and the live values were moved to the ignored file, but **they remain in
  `Placebetsai-src` git history and only the Google account holder can rotate them.** Measured
  today: **both are already dead** (`535-5.7.8`, 0/4 verified), so this is hygiene, not an
  emergency. Commit `19bda0c`.

- ✅ **RESOLVED 2026-09-28 — a personal Gmail address was published on every page of two sites.**
  **fashionistas.ai** printed it in the contact lede (*"we read every note at …"*), in 6 footers,
  in **3 meta descriptions** (so Google and social previews carried it), in privacy's *"Email us to
  request account deletion"* and on the about page. Cloudflare's Email Obfuscation kept it out of
  the source but **decoded it back onto the screen**, which is why it was visible. **placebets.ai**
  carried it in the **Organization JSON-LD on every single page** (structured data handed to Google)
  plus rendered text on `/about`, `/privacy` and `/terms`. Removed from all of them: fashionistas
  commit **`27fab1b`**, placebets commit **`e7eed5e`** (rebased over 5 ops-lane commits; their
  `.github/workflows/dns-cname.yml` preserved untouched).
  **Proof — fashionistas, real Chrome 6/6** on `/ /contact /about /privacy /fees /how-to-crosspost`:
  0 in rendered text, 0 in source once the form's `action` attribute is excluded, **0 `mailto:`
  links anywhere**, 0 JS errors; the lede now reads *"Send a message — we read every note."*
  **The form still works** — one clearly-labelled test submission POSTed to `formsubmit.co`,
  redirected to `/contact/?sent=1` and showed the success banner with 0 ≥400 responses.
  **Proof — placebets, real Chrome 5/5** on `/ /about /privacy /terms /contact`: 0 occurrences in
  rendered text **and** in source, JSON-LD still parses as **valid JSON** reporting
  `email=info@placebets.ai` (Cloudflare's obfuscation did **not** corrupt it), and the new
  *"contact form"* link on `/about` was **clicked: `hitSelf=true` → `/contact` → form visible →
  inbox shown**, 0 of our JS errors. placebets delivery was proven **before** the change: one
  labelled test POST to `formsubmit.co/info@placebets.ai` → `/contact/thanks`, 0 ≥400.
  **Deliberately kept:** the FormSubmit `action` attributes (an attribute, never rendered) — they
  are what actually delivers the message, and placebets' own contact page has always published
  `info@placebets.ai` as its "General inbox", so the JSON-LD now matches what was already shipped.
  **Not proven:** that mail to `info@placebets.ai` lands in an inbox — Cloudflare Email Routing MX
  + SPF are live on the domain (`route1/2/3.mx.cloudflare.net`) but no token in this environment can
  read that zone's routing rules, so receipt is **untested**.
- ✅ **RESOLVED 2026-09-29 — 4 of placebets' 17 navbar links could not be clicked.** Root cause was
  measured, not guessed: `.desktop-links` carried 16 links (1214px) + the odds toggle (74px) + the
  search box (184px) + 17 gaps (379px) = **1851px inside a 1015px box with no `overflow` set
  anywhere**, so the excess was painted past the viewport instead of scrolling — which is why every
  clipped link reported `scrollableAncestor=NONE`. Fixed in `Placebetsai-src` (`app/globals.css`,
  `components/Navbar.js`): `overflow-x: auto` on the strip as the guarantee, tighter spacing, the
  search collapsed to an icon, and header + sport tabs widened 1200px → 1300px (the smallest width
  that fits with nothing to scroll).
  **Proof `/tmp/p16_nav_proof.mjs` 29/29, run twice on live `placebets.ai` and once on origin
  `placebetsai.pages.dev`.** Every link is judged independently and passes only when
  `elementFromPoint` at its centre returns that link, so "inside the viewport but clipped by the
  strip" does not slip through. **Control: the same script on the pre-fix build `98099151` fails**
  — 4 unreachable @1440, 2 @1920, **5 @1366 and @1280 (worse than the original report)**, all with
  no scroll ancestor — so a green run means something.
  **Result: `overflow=0` at 1280/1366/1440/1920**; narrower widths scroll and stay clickable. The
  search field was proven separately (collapsed → opens at 132px inside the nav, takes focus, types,
  collapses on blur, submit opens the search). Screenshot `/tmp/p16_final_1440.png`.
  Two `deploy.sh` defects surfaced and were fixed on the way: it sent Pages projects to the wrong
  Cloudflare account (`placebetsai` exists only under `2765cb27…`, so the account-A token could never
  have deployed it), and its verifier required a local `index.html`, which a next-on-pages export
  does not have because `/` is served by `_worker.js` — it now compares `about.html` instead of
  failing closed.
- ⚠️ **OPEN 2026-09-28 — two Gmail SMTP app passwords are committed in plaintext** in
  `Placebetsai-src/scripts/test-smtp.mjs` (lines 3–4, tracked since `1e64d32`). Contained: the repo
  is **private** and the file is never built into `.vercel/output/static`, so nothing is exposed
  today, but they live in git history forever. Recommend rotating both app passwords. (TODO row
  **X4**.)
- ✅ **RESOLVED 2026-09-28 — Environment variables / secrets for a generated app** (plan.md
  P0, *"for the generated app, not just ours"*). An **Environment variables** card on the Code
  page, bound to the app selected in the dropdown above it: add, reveal/hide, delete. The values
  are **server-side**, keyed to the project in a new `project_env` table the worker creates
  lazily with `CREATE TABLE IF NOT EXISTS` (the D1 REST API returns an auth error from this
  machine — the binding is the only thing that can create it). New routes
  `GET/PUT /api/projects/:id/env` and `DELETE /api/projects/:id/env/:key`, all **placed before**
  the generic `DELETE /api/projects/:id` branch: that branch matches on the prefix alone, so an
  env DELETE reaching it would have deleted the project — the same collision that once let one
  file deletion destroy a project (C9). Ownership enforced: another account gets **404**.
  The worker injects **`window.__ENV`** into HTML at **serve** time (`injectProjectEnv`), not at
  publish time, so a change lands on the next request with no rebuild, the user's source file is
  never rewritten, and a `</script>` in a value is escaped to `\u003c`. Guard rails: name pattern
  `^[A-Za-z_][A-Za-z0-9_]{0,63}$`, value ≤ 4096 chars, ≤ 50 per app. The card states plainly that
  a published page is public — this is for a base address, a brand name or a domain-restricted
  key, never a password. **API 17/17** and **browser 24/24** (`tests/e2e/env-vars.mjs`, 0
  JavaScript errors, every ≥400 accounted for). Note: the edge cache in `sites-proxy` serves a
  published file for up to 60 s, so a change can take up to a minute to show on the branded host.
- ✅ **RESOLVED 2026-09-28 — webhooks and scheduled jobs for a user's own app (`7fb643e`).** Two
  new outbound mechanisms behind one **Automations** card on the Code page (same dropdown as
  Environment variables, immediately below it):
  **webhooks** fire when a record is created/changed/removed in the generated app — signed
  `HMAC-SHA256` as `X-CreateStuff-Signature`, plus `X-CreateStuff-Event` and a unique
  `X-CreateStuff-Delivery`, sent *after* the response through `ctx.waitUntil` so a dead receiver
  can never fail or slow the write it is announcing; the signing key is returned **once** and
  `GET .../hooks` deletes it from every later listing.
  **scheduled jobs** call an address on a 5/10/15/30/60-minute interval off a new `*/5` cron
  trigger, and `last_run_at` is written **even on failure** so a dead endpoint retries once per
  interval instead of hundreds of times a day. `crons` is now `["*/30 * * * *", "*/5 * * * *"]`,
  split by `event.cron` inside `scheduled()` so the D1 budget watcher and the stale-build
  watchdog keep their original cadence and nothing runs twice at minute 30. **The account is now
  at the free plan's ceiling of 5 cron triggers — no further trigger can be added without
  removing one** (that is also why `workers/hook-sink` deliberately has none).
  Both are owner-only (other account **404**, signed out **401**), capped at **10 per app**,
  `http(s)` only, 10 s timeout, with a plain-language result instead of a bare status.
  **SSRF is refused by the network, not a regex**: `global_fetch_strictly_public` was already set
  in `wrangler.toml`, and the proof shows `169.254.169.254` and `127.0.0.1` both coming back
  **403** with *"Refused. Calls to private or internal addresses are blocked."*
  **Proven 113/113 across three suites**, all measured against **`workers/hook-sink`** — a
  separate worker that records what genuinely arrives, so nothing is asserted from the sender's
  own log: `/tmp/hooks_jobs_proof.sh` **76/76**, `/tmp/cron_proof.sh` **11/11**,
  `/tmp/auto_ui_proof.mjs` **26/26** (0 console errors, 0 failed first-party calls).
  **Three real bugs were found by that proof and fixed with it:**
  1. **`DELETE /api/projects/:id/<anything>` deleted the entire project.** The generic branch
     matched on the prefix alone, so `DELETE /api/projects/204/hooks/21` — *delete one webhook* —
     parsed `id=204`, wiped `project_files` and `builds`, dropped the `projects` row and answered
     `{"ok":true}`. Same collision as C9, and it had survived the env-vars fix because that fix
     only special-cased `files`. Now the exact path removes a project; `/hooks` and `/jobs` fall
     through to their own routes. Regression-covered by checks 8b/8c of the proof.
  2. **A deleted app still accepted writes** — `handleAppRequest` never checked the project
     existed, so rows landed in `app_data` for a project with nobody left to read them and its
     auth routes kept minting sessions. One indexed `SELECT id FROM projects WHERE id=?` now
     guards the API side (`serveAppFile` already 404'd).
  3. **Scheduled jobs had no request around them**, so a deleted app's jobs would have gone on
     calling outside URLs indefinitely. `runDueJobs` drops orphaned rows and joins `projects`;
     project `DELETE` now cascades across all ten tables it owns, each `.catch()`-guarded so a
     table this deployment never created cannot abort the deletion.
  Also corrected: the test reply used to say `reachable: true` for a **403 or 530** — an HTTP
  answer from Cloudflare's edge is not a reachable endpoint — replaced with a written note.
  `workers/hook-sink` (the receiver) is committed as a **TEST HARNESS**; its dump key is a Worker
  secret, never a line in git.
- ✅ **RESOLVED 2026-09-28 — Discussion mode: talk to the Agent without spending a build.**
  The builder box used to make *every* message create a project and start a generation, so
  asking "is this worth building" cost an app in the list and a 60–150 s wait. There is now a
  **Build it / Talk it through** switch above the input (`apps/createstuff-marketing/index.html`
  + `app.js` → `csChatMode/csSetChatMode/csSend/discuss`). Talking calls the new
  **`POST /api/ai/discuss`** (`workers/createstuff-api/src/index.js`, system prompt
  `DISCUSS_SYS`), which runs one model call and **writes no code, creates no project, touches no
  table**. `DISCUSS_SYS` caps the answer at 150 words, forbids unverified superlatives and
  requires "I don't know" where it applies — the same no-unproven-claims rule as the rest of the
  product. Proven twice: **API** (`ok:true`, 112 words, `ms 4728`, **projects 34 → 34, builds
  1 → 1**, no-token **401**, empty message rejected) and **real Chrome 27/27**
  (`tests/e2e/discuss-mode.mjs`, 0 console errors, 0 failed product requests), which also checks
  the choice survives a reload and that **Build mode still creates an app (37 → 38)**. Deployed
  to `createstuff-app` **and** `createstuff-marketing`; live sha256 == local on both.
  The proof script reads `CS_E2E_EMAIL`/`CS_E2E_PASS` from the environment and finds playwright
  itself, so **no credential is committed to this public repo**.

  The builder box used to make *every* message create a project and start a generation, so
  asking "is this worth building" cost an app in the list and a 60–150 s wait. There is now a
  **Build it / Talk it through** switch above the input (`apps/createstuff-marketing/index.html`
  + `app.js` → `csChatMode/csSetChatMode/csSend/discuss`). Talking calls the new
  **`POST /api/ai/discuss`** (`workers/createstuff-api/src/index.js`, system prompt
  `DISCUSS_SYS`), which runs one model call and **writes no code, creates no project, touches no
  table**. `DISCUSS_SYS` caps the answer at 150 words, forbids unverified superlatives and
  requires "I don't know" where it applies — the same no-unproven-claims rule as the rest of the
  product. Proven twice: **API** (`ok:true`, 112 words, `ms 4728`, **projects 34 → 34, builds
  1 → 1**, no-token **401**, empty message rejected) and **real Chrome 27/27**
  (`tests/e2e/discuss-mode.mjs`, 0 console errors, 0 failed product requests), which also checks
  the choice survives a reload and that **Build mode still creates an app (37 → 38)**. Deployed
  to `createstuff-app` **and** `createstuff-marketing`; live sha256 == local on both.
  The proof script reads `CS_E2E_EMAIL`/`CS_E2E_PASS` from the environment and finds playwright
  itself, so **no credential is committed to this public repo**.

- ✅ **RESOLVED 2026-09-27 — `sites.createstuff.ai` (the branded publish host) is LIVE.** The one
  thing that had blocked it for weeks was a single missing DNS record plus the absence of any
  credential here that could write it. Fixed: user issued token **`raspy-credit-99f5`**
  (`cfat_qL7N…84da4`, account `2765cb2786006552f33cc3dfe0b680a1`, **Zone.DNS:Edit on
  `createstuff.ai` / zone `ca23f072cf08ee77d34c88ce36598265`**) → CNAME
  `sites → createstuff-sites.pages.dev` (proxied, id `d1de453269b1685ca98f174e8eee0316`) → Pages
  custom domain `active` → `PUBLISH_HOST` flipped in `workers/createstuff-api/src/index.js` →
  worker redeployed (`wrangler exit 0`, `/api/health` 200). **Proof:** publish returns
  `https://sites.createstuff.ai/179/index.html`, serves **200 / 3039 bytes / `<title>Steady —
  Savings Goal Tracker</title>`**, byte-identical to the old host, `x-served-by: edge`; real Chrome
  **7/7** (0 console errors, 0 failed requests, 7 subresources); gates `sites-proxy` 7/7,
  `versions` 8/8, `cs-inline` 6/6, acorn OK. **The raw token is NOT in this repo (it is public)** —
  it lives in `.secrets/cf.env` → `CF_DNS_TOKEN_CREATESTUFF` (gitignored) and in the PRIVATE repo
  `placebetsai/joffe-federation-memory` → `memory/reference_cf_dns_createstuff_token.md`.
  **It is the only DNS-writing credential on this machine**; the three older `.secrets/cf.env`
  tokens and all 15 GitHub Actions secrets across 13 other repos return `error 10000`/`403` on that
  zone. **Do not rotate or revoke it**; if it starts returning 401/403, tell the user at once so a
  replacement can be issued. Old `createstuff-sites.pages.dev` links keep serving the same bytes.

- ✅ **RESOLVED** — the `createstuff.ai` routes `/api/builds`, `/api/templates`, `/api/github/create-repo`, `/api/github/push`, `/api/projects/:id/download.zip` still **do not exist on forge-api**; they are now served by a **client-side shim in `app.js`** (`csShim()`), each backed by a real call: real `generate`/`publish`, a real in-browser ZIP (CRC32 verified by `unzip -t`), and real `api.github.com` writes using the user's own PAT. See §3.7.
- ✅ **RESOLVED** — `deploy.sh` worker branch (`cd` into the dir before `wrangler deploy`); `bash -n` passes.
- ✅ **RESOLVED** — stale `placebetsai/fashionistas-ai` + `placebetsai/createstuff-ai` pushed.
- ⚠️ **`GET /api/projects/:id/preview` → 404** on production (preview is served via `/published/:id/...`). Unchanged.
- ⚠️ **forge-api still cannot be deployed from here** — it lives on a *third* Cloudflare account with no token on this machine (`~/.cf-tokens` does not exist; only `CF_*`, `CS_*` are in `.secrets/cf.env`). The local `workers/forge-api` rebuild must **never** be deployed over it.
- ⚠️ `POST /api/ai/analyze` → 400 "image must be base64-encoded image bytes" for tiny inputs (**correct validation**; confirm with a real image).
- ⏸ **Android/iOS** parked by user decision (web first).
- ⚠️ Hive control panel `http://localhost:3141` is **not** systemd-managed — dies on reboot.
- ⚠️ Pages projects are **direct-upload only (no git connection)** — pushes never deploy. Deploy manually with `./deploy.sh` (see §6).
- ⚠️ User's sudo password was shared in chat (`Izzy@1299`) — **recommend changing it.**

- ✅ **RESOLVED 2026-09-28 — D1 is watched, breakered, indexed and off its worst offender.**
  Raised by *"why the fuck is D1 full when no one uses the sites?"*. Free tier is
  **5,000,000 rows read/day across the WHOLE account**; MarketPicks, Fashionistas and CreateStuff
  share one pot, and on **2026-09-27 it hit 5,133,584 = 103%** and every database read on every
  site failed until 00:00 UTC. Full diagnosis + 7-day table + all four fixes are in
  **plan.md → P0 → "Stop D1 going to zero"**. What is proven here:
  - **Monitor** runs on Cloudflare (`createstuff-api` cron `*/30`, version `9e5fb49a`) and reads
    **Cloudflare's own analytics API — zero D1 reads, otherwise the watch would eat what it
    protects**. Public readout **`GET /api/d1-budget`**; token is the Worker secret
    `CF_ANALYTICS_TOKEN` (never in the repo).
  - **Circuit breaker in `app-host`** (version `0134bfea`) — one KV read, memoised 5 min, exposed
    at **`GET /api/budget-guard`**. **Forced-halt proof:** KV state set to `halt` → guard returned
    `skipped:1` + `serving_stale:true` while `/api/health` stayed **200**; cleared → `performed`
    rose `1 → 2` and `serving_stale:false`. Unknown/unreadable state **allows** the scan (a broken
    monitor must never take a site down).
  - **Partial index** `idx_projects_deployed … WHERE deploy_url IS NOT NULL AND deploy_url != ''`
    → the scan went **7.71 rows-read-per-row-returned → 1.0** (19,037/2,470 → **114/114**);
    `createstuff-db` is now **865 reads/hour**.
  - **MarketPicks diet, commit `b6e21b1`, deployed site 13:21 + cron worker `69115a12` 13:22.**
    MarketPicks was **94% of all reads (590,399 of 628,951)** on a near-empty site. Fixed:
    the `COUNT(*) politician_trades` cap check (**71,478 rows/day to police a 50k cap on a
    2k-row table**) is memoised 24 h; the receipts COUNT no longer shares a cache key with
    `limit`/`offset` (was 230 scans/day); quotes/news memos 600 → 1800 s; and the cron stopped
    re-fetching six of its **own** live URLs every 15 minutes (576 self-requests/day) — housekeeping
    and grading are hourly now, with predictions deduped per ticker+day so the track record is
    untouched. **Browser proof 4/4** (`/`, `/receipts`, `/trending`, `/world-markets`): 0 JS errors,
    0 first-party ≥400, receipts renders **ALL-TIME 224 · 48.6% win rate**; ad-slot 400s are
    identical on the pre-change deployment `0c91f640` so they are not ours.
    **CORRECTION (measured 2026-09-29, `/tmp/corrected.py`, Cloudflare query analytics for
    `marketpicks-db`, window 2026-09-28 04:00 → 2026-09-29 02:00, DESC + ASC unioned):** the
    `COUNT(*) AS n FROM politician_trades` cap check above must **not** be credited with any drop
    to zero. **Last run of that COUNT: 2026-09-28 12:00 UTC. Memo deployed: 13:21:38 UTC — 81
    minutes LATER.** The counter went quiet before the fix existed, because the insider-feed job
    died on a Bargo 429 and stopped executing its cron body. The job then recovered on its own
    (81 INSERT runs at 19:45, 256 at 00:00 on the 29th) while `COUNT(*)` never ran again — so the
    workload is **not** currently exercising the memo at all. `cache_snapshots` (the memo table)
    appears on every 15-minute bucket across the whole window, before, during and after the
    deploy, which is the only directly observable part. **`COUNT → 0` is therefore UNPROVEN as a
    memo effect; it measures "nobody asked", not "nobody read".** Earlier wording conflated the
    two.
  - **MarketPicks build gotcha:** the repo's `deploy.sh` runs only `next build`, **not**
    `next-on-pages`, so it would re-upload a stale bundle — and `next-on-pages@1.13.16` demands
    `next>=14.3.0` while the project pins `next@14.2.35`, so the nested `npm install` fails
    (ERESOLVE) unless built with **`npm_config_legacy_peer_deps=true npm run pages:build`**.
    A failed `vercel build` **wipes `.vercel/output/{functions,static}`** — they are gitignored, so
    always rebuild before deploying. Ships from branch **`live-source`** (`origin/live-source`),
    not `main` (`main` is a separate static landing page).
  - **Placebets build gotcha (hit 2026-09-29):** `next-on-pages` declares **`vercel` as a peer
    dependency** (`>=30 <=47.0.4`), and the documented build command runs with
    `npm_config_legacy_peer_deps=true` — which is exactly what stops npm from installing peers. Any
    `npm install` then prunes the un-saved `vercel` **and** the `@vercel/next` builder it had pulled
    in, so `vercel build` dies with `ENOENT … node_modules/@vercel/next/dist/server-launcher.js`
    **after already wiping `.vercel/output/static`**, leaving the repo with no build output at all.
    Fixed by declaring **both** `vercel` and `@vercel/next` in `devDependencies`, so no install can
    prune them again; live was unaffected throughout because the Pages deployment is separate.
    `Placebetsai-src` ships from branch `main`.
  - **Re-check after a clean hour:** GraphQL
    `d1AnalyticsAdaptiveGroups` grouped by `databaseId`+`datetimeFifteenMinutes` (this costs nothing)
    — marketpicks baseline was **~35–60k/hour ≈ 1.2M/day**.
- ✅ **RESOLVED 2026-09-29 — a project had no web address of its own.** The "Your own web address"
  box on *Put it online* (and step D of *Start here*) already called
  `POST /api/projects/:id/host`, but `createstuff.ai` was missing from `app-host`'s
  `CONTROLLED_ZONES`, so every name on our own zone came back **422**. Two hard facts had to be
  designed around first, both measured: a CNAME from the `createstuff.ai` zone to
  `app-host…workers.dev` is refused by Cloudflare with **error 1014 (cross-client)**, and a Worker
  can only have routes in its **own** account — zone `ca23f072` sits in account `2765cb27` while
  `app-host` lives in `7eb89b01`, and `CS_API_TOKEN` returns **403 "No access to the specified
  resource"** for both `PUT …/workers/scripts` and `POST …/zones/…/workers/routes`, so **no
  `*.createstuff.ai` worker route can be created with the credentials we hold.**
  **What works instead:** DNS `CNAME <name> → createstuff-sites.pages.dev` written with
  `raspy-credit-99f5`, **and** that name attached to the `createstuff-sites` Pages project via
  `POST /accounts/…/pages/projects/createstuff-sites/domains`. Pages serves it;
  `sites-proxy/_worker.js` now branches on `url.hostname` and calls the new public
  `GET /api/hosts/serve?host=…&path=…` on `createstuff-api`, which resolves through the **same
  `app_hosts` row** the button wrote — one source of truth, no second copy of anybody's site.
  A proxied record is flattened to A records on the wire, so the CNAME is read back through the
  Cloudflare API, never `dig`.
  **Proof 82/82** — `/tmp/domain_proof.sh` **36/36**, `/tmp/domain_proof_v2.sh` **27/27**,
  `/tmp/domain_ui_proof.mjs` **19/19** (real Chrome, screenshot `/tmp/domain_ui.png`). Each suite
  creates *and* deletes its own project and its own hostname, and **both API suites were run
  twice** — a first pass from a clean machine proves much less than a re-run. Measured lifecycle: DNS `created`
  immediately → address **200 at ~75 s** → Pages **`active` at ~150 s** → release → gone once the
  60 s edge window lapses (re-checked at 95 s). Also covered: a **second real account → 403 with
  no DNS record written**, `app`/`sites`/`www`/`api`/`mail` → **422**, duplicate → **409**, no
  token → **401**, `..` traversal → **404**, and `app.` / `sites.` / apex / `api.` / `www.`
  byte-checked unchanged afterwards. Zone left with exactly its original **5 records**;
  `createstuff-sites` left with exactly one domain (`sites.createstuff.ai`).
  **Two bugs found by proving it, both fixed:** (1) **nothing stopped a user claiming
  `app.createstuff.ai`** — the attach would have overwritten the CNAME behind the product itself
  and taken the builder offline. Fixed twice over: a reserved-label list refuses it, and
  `ensureDnsRecord` now refuses to repoint any record pointing somewhere else. (2) The claim's
  evidence was overwritten a second later by the host-list refresh, so the person pressing the
  button never saw whether the record was created — `lzCheckHosts()` now runs *before* the result
  is written.
  **Two proof-harness defects, found only by running the suites a second time:** (3) the ownership
  check registered its second account with a *fixed* `name`, and `POST /api/auth/register` maps
  `name` to a **username** — unique — so run #2 got **409** and the check failed as a misleading
  **401**. It now asserts register 201 / login 200 / token present separately before calling.
  (4) Cleanup read the `fashionistas.ai` zone with `CF_API_TOKEN`, which returns **error 10000
  Authentication error** there; `CF_DNS_TOKEN` is the credential that can list and delete records
  on that zone. **Credentials gotcha worth remembering:** `CF_API_TOKEN` (account A) can *list
  zones* across all of them but **cannot touch DNS records** — use `CF_DNS_TOKEN`.
  **Told straight in the UI:** the badge reads *Attached — warming up* and the evidence says the
  address answers within about two minutes, until step D gets a real 200 from that exact URL.
  **Gotchas:** `wrangler secret list` on `app-host` printed nothing on the first attempts and
  looks empty — it is not; `CF_DNS_TOKEN`, `CF_DNS_TOKEN_CREATESTUFF` and `CS_API_TOKEN` are all
  set (verified by a successful attach). Two Worker secrets carry the cross-account credentials;
  neither is in git.

---

## 9. HIVE — HOW TO DRIVE IT

```bash
cd /home/billionaremaker/Documents/Default Project/nexus-ai-suite
node hive/dispatch.mjs --file hive/tasks/<batch>.json     # parallel fan-out
node hive/dispatch.mjs --all "prompt"                     # one prompt, every agent
node hive/dispatch.mjs --probe                            # readiness
```
- MCP server registered as `hive` in `~/.config/opencode/opencode.jsonc` → `tools.hive.hive_status|hive_models|hive_readiness|hive_dispatch|hive_fanout|hive_run`.
- **Model IDs must use the `opencode/` prefix** (`opencode/space-bunny-free`). The old `opencode-zen/` prefix silently fails everything.
- Results land in `hive/output/batch-result.json` (full `output` text per agent) and `hive/output/readiness.json`.
- **Round-1 lesson:** prompt agents with *"You MUST actually execute curl using the shell tool — if you produce no numbered results you fail"*, and demand an exact output format. Vague prompts → empty `output` fields → zero evidence.

---

## 10. 2026-09-30 (later) — THE REFUSAL, THE SILENT GATE, THE HYBRID PAGE

Three separate defects that all read as "these apps don't work". Each one is
labelled below as **measured** (something was actually run and observed) or
**inferred** (a cause that fits the evidence but was not directly observed).

### 10.1 A model guess could block a Build the person had pressed — FIXED

**Reproduced from the user's own paste:** `first connectt to my github lets vibe code`
→ `Classifier tool: tool=hive-relay …/job-10 HTTP 200 5444ms polls=2 -> not_build (rule model, model). No site generated.`
→ empty state **"No site was built - the answer is above."** with nothing to click.

*Cause (measured from the code + the run):* `CONNECT_ACCOUNT` matches `\bconnect\b`.
The user typed **`connectt`**, so the deterministic rule missed → keyword path
returned `no-signal` → the **model** was consulted → it guessed `not_build` →
`runGenerate` stage 0 pushed `cls.reply`, set `status='answered'`, returned
`{ok:false, notBuild:true}`. A guess overrode a Build button.

*Fix:* in `classifyWithModel`, a **model-sourced** `not_build` no longer blocks. It
comes back as `kind:"build"`, `rule:"model-not-build-overridden"`, with the model's
objection recorded in `why` so it lands in the agent log instead of as a wall.
The deterministic `NOT_BUILD_RULES` (deploy-to-X, repo/credentials questions —
including the `connect my GitHub` reply shipped by `5854593`) are untouched: those
never reach a model.

*Proof:* **control** = the user's screenshot (refusal). **treatment** = build **148**,
project 255, same string:

```
classifier=model/model-not-build-overridden
planner=hive/space-bunny-free  writer=hive/space-bunny-free
3 files, 38,919 chars   quality=clean   verifier=rules(1 flag)   repair=fixed-1
```
`repair=fixed-1` = the repair re-ask path's **first live fire**. Published →
`https://sites.createstuff.ai/255/index.html`, 0 console errors, title
"Branchroom — Vibe Code", and the app ships **Connect GitHub / Disconnect** buttons.

### 10.2 The gate's silence could not be told apart from "clean" — INSTRUMENTED

Build 144's published page died (`appInit` threw at `script.js:244`) while the gate
reported 0 flags; the offline control flagged **15 ids** on those exact bytes. The log
carried only `qualityFlags … found nothing to fix` and `acorn … parse cleanly`, so
*never ran* and *ran and passed* were the same observation.

1. **`missingElements` was declared inside `runGenerate`.** Proven by
   `POST /api/script-probe` → `{"error":"missingElements is not defined"}` (500).
   Moved to module scope so diagnostics (and anything else) can reach it.
2. **Unconditional `script-health` line** — build 150:
   `1 script(s) scanned | missing-element: html=3907b ids=26 lookups=14 missing=0 idHelper=1 [every lookup resolved] | 0 defects`.
   `missingElements.diag` reports `htmlBytes / idsHave / lookups / missing / idHelper / why`
   on every early return, so a silent gate now says *why* it was silent.
3. **`POST /api/script-probe` `{html,script}`** runs the shipped detector in the real
   runtime on caller bytes. On build 144's exact published bytes:
   `{"htmlBytes":10184,"idsHave":32,"lookups":21,"missing":15,"idHelper":true}` →
   `15 id(s), first: name-field->nameField, auth-submit, password, book-count` —
   **identical to the offline control.** The detector works in production.

*Attribution, stated honestly:* that build 144 ran pre-detector code is **inferred**
from a 2.2 s race (deploy `91ca709c` created `09:17:26.322Z`, build row started
`09:17:28.499Z`), not measured. What is measured: current production flags those bytes.

### 10.3 The page that was *correct* still opened dead — CDN hybrid, FIXED

Build 150 passed the gate (and offline) — published — and the page **still** threw
`appInit failed … script.js:244`. The gate was right; the bytes were right; the pairing
was not.

**Measured:**

| request | cache status | bytes |
|---|---|---|
| `sites.createstuff.ai/252/index.html` | `cf-cache-status: DYNAMIC` | new (6,765 B) |
| `sites.createstuff.ai/252/script.js` | `cf-cache-status: HIT, age: 4688` | **build 144's**, md5 `5e60e151…` |
| origin `createstuff-api…/published/252/script.js` | `cache-control: no-cache` | **new**, 7,234 B, md5 `5e9a5cb4…` |

`.html` is not edge-cacheable by default, `.js/.css` is, and the proxy advertises
`max-age=604800` → **fresh HTML wired to a stale script.** The origin was correct all
along; only the edge chose to keep the old file.

*Fix:* `stampAssetRefs()` runs in `POST /api/ai/publish` and stamps the page's own
js/css references with the publish time (`href="styles.css?v=0763591564"`,
`src="script.js?v=0763591564"`), replacing any existing `?v=` rather than stacking it,
skipping `//` and `data:` URLs; the rewritten index is written back with the same
delete+insert as `saveFiles` plus `cacheDrop(filesListKey)`.

*Measured proof the edge keys on the query string:* the stamped URL returned **7,234 B,
`age: 0`**, md5 identical to origin, while the bare URL returned the old 10,300 B.

*Browser verification (cache bypassed with `?cb=`):* **252 → 0 console errors**,
`appInit` defined, no dup ids; **251 → 0 errors** (Leafmark, stamped); **255 → 0 errors**
(Branchroom, stamped). Republished **246, 247, 248, 249, 250, 251, 255** — all carry a stamp.

*Honest caveat:* `index.html` still advertises `max-age=604800`, so a visitor already
holding the pre-stamp HTML keeps the old pair (consistent with itself) until their own
cache expires. A purge is **not available**: the `createstuff-sites` Pages project is in
neither account we hold tokens for (account A lists 10 Pages projects, no such name;
account B's token has no Pages read).

### 10.4 fashionistas.ai — E2E measured, main flow works

Home (0 console errors, no dup ids) → demo login `POST /api/auth/login → 200` (673 ms,
`fash_token`/`fash_user`) → My clothes `GET /api/listings → 200` ("2 FOR SALE / 5 SOLD /
$214 LISTED VALUE", departments, sort/filter) → Photo Sell (`input[type=file] accept=image/*`)
→ **real item photo → `POST /api/ai/analyze → 200 in 1,867 ms`** → title "Cream Handbag",
price 300, size Medium, colour cream, description written. Every console error captured in
that session was **this agent's own** CORS/404 probe, not the app's (the API lives on a
separate origin, `fashionistas-api.fashionistas1979.workers.dev`, which answers
`access-control-allow-origin: https://fashionistas.ai`). **Not tested:** Multilist/cross-post
and checkout.

### 10.5 Repo note

Head already carried another session's commits `5854593` (GitHub keyword reply +
`/api/ai/discuss`), `4a16b86` (Groq-first) and `c2d76c5` (`RELAY_OFF=1`) when this stretch
began; today's edits sit **on top of** them and were deployed together — nothing was
reverted. `STATUS.html` and `extensions/crosslister/poshmark-post.js` are other sessions'
uncommitted work and are never staged. Deploys this stretch: `c45c84f3` (refusal fix),
`1941988c` (script-health + diag), `9b532a9a` (`script-probe` + `missingElements` to module
scope), `1af309a7` (`stampAssetRefs`).

### 10.6 fashionistas.ai — Multilist measured end to end; two defects fixed

**What it does (measured by clicking it, not assumed).** Multilist does **not** post to the
outside shops. `GET /api/marketplaces` returns **21** entries: **20 with `api:"deep"`** (guide +
paste) and **1 with `api:"full"`** (fashionistas itself). The screen says so plainly — *"You post
yourself on every shop."* The guide half genuinely works: pick an item →
`GET /api/listings/120/platforms → 200 (278 ms)` → 21 fee-labelled checkboxes → Select all →
`POST /api/listings/120/crosspost → 200 in ~2.05 s` → **21 saved drafts**, one per shop, each
carrying TITLE / PRICE / META / FIELDS / TONE / DESCRIPTION / TAGS plus a real *Open listing page*
deep link (eBay, Depop, Poshmark, Mercari, Vinted, Grailed, Etsy hrefs verified). eBay's optional
API path is honestly switched off: `{"ok":true,"available":false,"connected":false,"env":"sandbox",
"message":"eBay posting is not switched on for this site yet.","nextStep":"You do not need it —
copy the kit and paste it on eBay yourself."}`.

**Defect 1 — the eBay connection panel could never load (CORS preflight).**
*Control (pre-fix, browser):* console `Request header field cache-control is not allowed by
Access-Control-Allow-Headers in preflight response` + `net::ERR_FAILED` on `/api/ebay/status`,
while the very same URL answered **200 with a correct ACAO from curl**.
*Cause (measured in source):* `apps/fashionistas/index.html:2654` sends
`headers: {"cache-control":"no-store"}`, and the worker's `Access-Control-Allow-Headers` listed
only `Content-Type, Authorization`.
*Fix:* `workers/fashionistas-api/src/index.js` now allows `Cache-Control` too.
*Treatment:* a live OPTIONS preflight with the browser's exact header pair → **200**,
`access-control-allow-headers: Content-Type, Authorization, Cache-Control`; in the page
`GET /api/ebay/status → 200 (22 ms)` and **0 CORS errors** on two separate runs.

**Defect 2 — every kit shipped a hashtag no marketplace can resolve.**
*Control (pre-fix, same item — "White Handbag", category `Bags & Luggage/Handbags`):* all **19**
TAGS lines read `#Bags&Luggage/Handbags`.
*Cause:* `xlKitTags()` only removed spaces from the category *path*.
*Fix:* take the path's leaf, lowercase it, keep letters and digits, drop it if outside 3–24 chars
(the same word feeds eBay's comma keywords).
*Treatment (two independent runs):* 21 kits, 19 TAGS lines, **`badTags: 0`** — every line is
`#handbags`, Depop's is `#vintage #thrift #y2k #resale #rework #preloved #handbags`,
`POST /crosspost → 200` in **2,047 ms** then **2,091 ms**, **0 console errors**.

**Deploy trap, recorded because it cost time and looks like success.** `wrangler pages deploy .`
with **no `--branch`** created deployment `7f112964` with **`environment=preview`**: the
deployment URL and `master.fashionistas-ai.pages.dev` served the new bytes while `fashionistas.ai`
and `fashionistas-ai.pages.dev` kept serving production `98abeaf5` — and `cf-cache-status: DYNAMIC`
on the apex ruled caching out, so only the deployments API exposed the truth. Redeploying with
`--branch main` (what `deploy.sh` and `FEDERATION.md` already specify) produced
**`882eb790 env=production`**, after which the apex matched local md5 `c3a7fafd` byte for byte.
**Check `environment` in the deployments API after every Pages deploy.**

*Untested:* actually posting to a marketplace through an API (no marketplace credentials exist —
20 of 21 are `deep` by design); clipboard copy showed `Copy blocked by browser` under automation,
where the kit text is still on screen to select and copy by hand.

### 10.7 createstuff.ai — asking for GitHub now reaches GitHub; the push is proven

**The complaint (owner, verbatim):** *"i can vibe code my guthub for shit … u made me some lame
webpage generator"*. Two halves, both measured.

**CONTROL — what it did before this change.**

1. The same family of sentence built a decorative page: **build 152 "GitHub Vibe"**, whose
   *Connect GitHub* buttons do nothing (recorded earlier 2026-09-30). Cause: the keyword
   `CONNECT_ACCOUNT` rule needs `connect` spelled correctly, the person typed **`connectt`**, so
   the keyword path said *build*, and the model's `not_build` guess was overridden by rule
   (`model-not-build-overridden`).
2. When a rule *did* answer, it answered in prose only — `REPLY_GIT`, *"I cannot log into GitHub
   from here…"* — with no way to act on it, while the tool it described (list repos → pull one in
   → edit → send back) already existed behind `#github`.
3. The live front end answered **the same question twice** and printed a first-party console
   error: build **154** → `POST /api/ai/generate → 200`, then `POST /api/ai/discuss → 200 (66 ms)`
   carrying the identical paragraph again, and `POST /api/builds/154/log → **409** "This build is
   no longer open."` (the plan line always lands ~800 ms after an answer that closed in ~600 ms).

**WHAT CHANGED** — `workers/createstuff-api/src/index.js`, `apps/createstuff-marketing/app.js`:

- New classifier rule **`repo-intent`**: typo-tolerant verb list (`connectt?`, `vibe code`,
  `pull`/`push`/`import`…), and it never fires on an explicit build request, so
  *"build me a github stars page"* still builds. It returns `not_build` **plus an action**:
  `{label:"Open my GitHub tools", href:"#github"}`. GitLab/Bitbucket get no action — there is no
  panel for them here, and an action must lead somewhere real.
- The action travels end to end: `push(agent, message, extra)` stamps `answer:true` + `action` on
  the row; `POST /api/ai/generate` and `POST /api/ai/discuss` both return `action`;
  `csActionHtml()` renders it as a `btn btn-primary` with `data-tip` **and** `title` (href
  accepted only as an in-app hash, label escaped).
- The poll does not ask the model a question the worker already answered (`hadAnswer`) → one
  reply instead of two. `/api/ai/discuss` now runs the keyword path first (deterministic, **66 ms**
  vs a model round trip) and only falls to the model when unsure.
- `POST /api/builds/:id/log` accepts appends on **`answered`** rows (201). `completed`/`failed`
  still refuse with 409 — those logs are history.
- When nothing was built, the **plan card and the stage strip are removed**: a card describing an
  app that does not exist is the same lie as a preview.

**TREATMENT — live, real Chrome, fresh reload per run (2026-09-30 17:10–17:18Z):**

| check | measured |
|---|---|
| offline classifier gate (block re-extracted from the shipped file) | **16/16**, incl. `first connectt to my github lets vibe code → not_build/repo-intent/#github`, `build me a github stars page → build` |
| ask, build **155** / **156** / **157** (three runs) | `POST /api/ai/generate → 200` (546–750 ms), reply printed **once**, button **"Open my GitHub tools"** present, status **"Answered — no app was built."** |
| `POST /api/ai/discuss` re-ask | **not called** (was 200/66 ms on 154) |
| `POST /api/builds/157/log` | **201** (was 409) |
| plan card / stage strip on an answer | **gone** (`#cs-plan-card` absent, `#cs-plan-stage` empty) |
| click the button | → `#github`, **51 repos** rendered, `GET /api/github/repos → 200 (937 ms)`, **Bring it in** + **Send it to GitHub** both visible |
| console errors (fresh load → ask → click → panel) | **0** |

**The push — previously *untested* (row C5), now measured with a read-back from GitHub:**
`#push-repo=placebetsai/createstuff-e2e-probe`, `path=e2e-verify.txt`, `branch=main` →
`POST /api/github/push → **200 (1,580 ms)**` → toast *"Pushed to GitHub!"* → **independent `gh`
read-back**: file `e2e-verify.txt`, 23 B, content exactly `E2E-PROBE-1790788226173`, commit
**`e45c148cfc`** with the message typed in the box. Repo then restored by hand
(commit `d40847eaf0`, tree back to `["README.md","index.html"]`) — **their repo is as it was.**

**The import:** paste URL → `POST /api/github/import → **201 (1,438 ms)**` → *"New app:
createstuff-e2e-probe (github)"*, `GET /api/projects → 200`.

**Also measured (pre-existing, works):** typing *"first connectt to my github lets vibe code"*
is caught client-side by `csSend()` → *"Opening GitHub for you…"* → `#github` panel. The two
layers are complementary: the client rule needs `connect`/`my`/`import`… as whole words, the new
server rule does not, which is exactly the `connectt`-with-no-`my` gap that produced build 152.

**Deployed:** `createstuff-api` deployment `13d327d8` (version `92c147e2`, 100%, `/api/health → 200`);
Pages `createstuff-marketing` `c67e09fc` and `createstuff-app` `686230da`, both
**`environment=production`** (deployed with `--branch main` via `deploy.sh`), and
`app.js` sha256 matches local on **both** `createstuff.ai` and `app.createstuff.ai`
(`53450a33a8acbe2f`). `node --check` passes on both edited files; `cs-inline.test.mjs` **12/12**.

*Untested:* pushing to a repository the connected account does not own (fork/second owner);
GitLab and Bitbucket (no panel here — the reply says GitHub only); OAuth device flow for a
*different* user's GitHub (only the connected account's token path has been exercised).

### 10.8 fashionistas.ai — the "Fill it for me" button could hang for ever; now it says what to do

**The complaint:** *"fashionistas doesn't have any sort of auto flow that lists your item on all
the fucking sites."* What exists, measured: an item → **Multilist** → pick shops → kits for
**21** platforms (title/price/fields/tone/description/tags + a real *Open listing page* link
each), plus an auto-fill helper that opens a shop's sell form already filled in for the **6**
shops the helper actually supports — `XL_FILL_SHOPS = depop, ebay, poshmark, mercari, vinted,
grailed`, which is exactly the shop list inside `extensions/crosslister` (measured: those six
are the only shop names in the extension's sources). **No shop outside fashionistas can be
posted to server-side: 20 of 21 are `api:"deep"` by design — no marketplace credentials exist**
(that is the Q1 question still waiting on the owner).

**The defect, measured (CONTROL, 2026-09-30).** `xlAutofill()` posted `FASH_CROSSLIST` and then
waited for `FASH_CROSSLIST_ACK` **with no timeout**. With the helper silent (switched off,
mid-update, or waiting for a reload after install — `bridge.js` has to answer for the message to
come back), the status line stayed on **`Opening 6 shops…` at 5 s and at 10 s** and for ever
after. A second press made it worse: each press added its own listener and countdown, so the old
one could still overwrite the new message.

**The fix** (`apps/fashionistas/index.html`): a **4-second countdown** — if nobody answers, the
line becomes *"Nothing opened yet — the shop helper is not switched on in this browser, or it
needs this page reloaded after installing. Use the Fashionistas Fill bookmark above (no
install), or switch the Crosslister on and press the button again. Every one of your 21 picked
shops already has its text ready in the kits below."* A second press now clears the previous
listener and timer first (`XL_FILL_TIMER` / `XL_FILL_ACK`).

**TREATMENT (live, real Chrome, fresh load, signed in as the demo seller):**

| | control | treatment |
|---|---|---|
| press with a silent helper | `Opening 6 shops…` at **5 s** and **10 s**, forever | `Opening 6 shops…` → guidance at **4 s** (captured inside a 9 s wait) |
| what the line says | nothing useful | bookmark advice + **"your 21 picked shops"** + kits still listed (**22** `[data-kit]` nodes on screen) |
| ACK arrives instead | — | `Opened in new tabs. Check each one and press Post there.` within 6 s, **and still there at +6 s** — the countdown was cancelled, so success never turns into a warning |
| console errors | — | **0** |

*How the ACK half was proven:* this harness has **no extension-install tool**, so the extension's
own reply was replayed in-page using the exact contract from `extensions/crosslister/bridge.js:14`
(`source:"fashionistas-crosslister"`, `type:"FASH_CROSSLIST_ACK"`, `ok:true`) after 300 ms. The
real extension end-to-end run is `tests/crosslister-e2e.mjs`, which needs `playwright` — **not
installed in this workspace**, so that exact test was **not** re-run. Untested here: a real
helper answering on a real shop tab (same contract, different machine).

**Gates:** acorn on the extracted inline script (`1` JS block, `3` JSON-LD blocks skipped) → OK;
`./deploy.sh pages fashionistas-ai apps/fashionistas` → deployment **`ee9bf8d5`** with
**`environment=production`**; `fashionistas.ai` == `fashionistas-ai.pages.dev` == local
(**429,890 B**, both containing the new text), `cf-cache-status: DYNAMIC`.

### 10.9 createstuff — send the WHOLE app to GitHub in one save (Replit parity), 2026-09-30

**The ask.** *"Replit and Base44 can do it — why the fuck can't you?"* Checked the claim first:
**Replit** = two-way GitHub with *"stage and commit all changes"*; **Base44** = **one-way**
export to GitHub on a **paid** plan; and on the shops **Depop's listing API is partner-only**,
**Vinted has no public API** (Poshmark/Mercari/Grailed publish none). The real gap on our side:
we could push exactly **one file per call**, so a whole app cost as many pushes — and as many
lines of history — as it had files.

**CONTROL (live pre-fix worker, 2026-09-30).** `POST /api/github/push` with
`{"files":[{"path":"a.txt",…},{"path":"b.txt",…}]}` → **422 `{"error":"There is no code to
send"}`**; `gh` read-back of `placebetsai/createstuff-e2e-probe` still
`["README.md","index.html"]` — no file was created.

**The fix** — `workers/createstuff-api/src/index.js`, same route, new `files` branch:

- validated first: ≤ **60** files, ≤ **4 MB** total, no `..` in a path, no empty body
  (each of those has its own message + status);
- written through GitHub's **Git Data API** — one `POST /git/trees` (with `base_tree`), one
  `POST /git/commits`, one `PATCH /git/refs/heads/<branch>` — so **the branch changes once or
  not at all**; an empty repository gets `POST /git/refs` instead;
- the single-file path is byte-for-byte the old behaviour (`oneFileMessage` keeps its default
  `Update <file> from CreateStuff`).

**Defect the treatment run caught** (and `node --check` could not: TDZ is not a syntax error):
the first deployment put the new block above `const branch` / `const message` →
`Cannot access 'branch' before initialization` → **500** on the very first whole-app push.
Hoisted both above the block, re-deployed.

**TREATMENT, server.** `POST /api/github/push` with 3 files → **200 in 2.57 s** → commit
**`2f37733730`** *"Send my whole app from CreateStuff"* whose `files` array is exactly
`["README.md","src/app.js","src/styles.css"]` — **one commit**. Single-file regression on the
same deploy: **200 in 1.29 s**, `index.html` blob sha updated as before.

**TREATMENT, the button (real Chrome, signed in, `#github`).** New **Send my whole app**
button (`pushAllToGitHub`, `data-tip` + `title`: *"Saves every file of the app you have open to
GitHub as one single save…"*) → `POST /api/github/push → **200 (2,356 ms)**` → commit
**`93246c0bb4`** *"Whole app: 2 files, one save"* on a fresh repository: tree
`README.md + index.html`, **2 files**, parent `498b77efcb`, contents byte-equal to what project
**259** holds; toast **"Sent 2 files to GitHub in one commit"**; **0 console errors**. The
button is on screen at `createstuff.ai/#github` (measured 191×41 px, below the fold).

**Gates:** `node --check` on `index.js` and `app.js`; `apps/createstuff-marketing/cs-inline.test.mjs`
pass, `workers/createstuff-api/versions.test.mjs` pass; worker deployment `/api/health → 200`;
Pages `createstuff-app` + `createstuff-marketing` both verified and **both custom domains**
(`createstuff.ai`, `app.createstuff.ai`) serve `app.js` **sha `e178a631a8e7ff84` == local**.

**Disclosed, not glossed:** `createstuff-wholeapp-probe` **could not be deleted** — `gh` reports
*"Must have admin rights to Repository."* (the token has `repo`, not `delete_repo`), so that
probe repository stays on `placebetsai`. `createstuff-e2e-probe` was restored to `d40847eaf0`
(`README.md + index.html`). Still unproven: the 60-file/4 MB rejections, a repo the account does
not own, GitLab/Bitbucket.

### 10.10 fashionistas.ai — the form told you that you had not typed what you had just typed

**Found by walking the site as a user, not by reading code.** Both add-item forms rejected a
half-filled form with one message for both fields: `saveListing()` said *"Title and a valid price
are required"* and `saveManual()` said *"Title and price are required"* — shown even when the
title **was** filled and only the price was empty. To a seller that reads as the app being broken.
The department rule (`Pick a department…`) had the same problem in reverse: nothing on screen
points at the select, so the click appears to do nothing.

**CONTROL (live, pre-fix):** title `"Vintage Levi's Trucker Jacket"` typed, price empty → press
*Save to my clothes* → toast **"Title and price are required"**, focus stays on the button, no
field highlighted. Next: price filled, department empty → **"Pick a department so buyers can find
this item"**, focus still on the button.

**The fix** (`apps/fashionistas/index.html`, both `saveListing()` and `saveManual()`): say the
**one** box that is empty and **move the cursor into it** —
`Add a title first — e.g. Levi's Trucker Jacket` / `Add a price — e.g. 45` /
`Pick a department — e.g. Women's Clothing — so buyers can find it`.

**TREATMENT (live, fresh load, signed in as the demo seller):**

| step | toast | focus lands on |
|---|---|---|
| title only | **Add a price — e.g. 45** | `#m-price` |
| + price, no department | **Pick a department — e.g. Women's Clothing — so buyers can find it** | `#m-dept` |
| department chosen | *Added ✓* → item on screen | — |

`POST /api/listings → **201 (963 ms)**`, `GET /api/listings → 200`, **0 console errors**.

**Gates:** acorn on the extracted inline script (1 JS block, JSON-LD skipped) → OK;
`./deploy.sh pages fashionistas-ai apps/fashionistas` → verified; `fashionistas.ai` ==
`fashionistas-ai.pages.dev` == local (**430,874 B**, sha `115602f2773b0d0b`), new copy served
twice. *Not browser-proven:* the main Sell-form leg of the same edit.

**Two claims withdrawn in this same pass** (so they are not repeated): `/predict` looked stuck
only because the harness freezes background tabs (`$RT` undefined, `$RB=6` never flushed — with
the tab focused it renders and answers); and createstuff's storage did **not** get wiped by the
app (`logout()` only runs from the Sign-out buttons; the emptiness followed a ~12 h profile
restart, and keys survive a plain reload with sibling tabs closed).

### 10.11 placebets + marketpicks finally get a phone test — and it passed only after I fixed the test

**The gap:** `tests/walk-390.mjs` covers fashionistas and `tests/measure-createstuff-390px.mjs`
covers createstuff. placebets and marketpicks had **no mobile coverage at all**, so neither could
be vouched for on the device most people use. `playwright` is available in this workspace
(installed under `Placebetsai-src/node_modules`) — the blocker was that nobody ran it.

**New: `tests/walk-390-pb-mp.mjs`** — iPhone 14 viewport (390×844, `isMobile`, `hasTouch`, iOS
user agent). Per screen it records horizontal overflow (the sideways swipe that means the layout
is broken), first-party load failures, whether the screen's own control is thumb-sized, and then
**performs the screen's main action** and asserts on the result.

**First run: FAIL (6).** Three were my test's fault, and saying so is the point:

| first-run failure | what it actually was |
|---|---|
| "no console errors" ×3 | `Failed to load resource` lines carry **no URL**. A clean diagnostic load of all four pages showed the only failing resource on every one of them was `pagead2.googlesyndication.com` (AdSense) — DNS-blocked by this sandbox. The classifier now ignores URL-less resource lines (`requestfailed` reports the same event with a URL) and `net::ERR_ABORTED`, which is a normal SPA route change. |
| "ask submits on a phone" | the assertion read only the first 400 characters of the page — on a phone that is nav and ticker, so a result that rendered further down looked absent. The URL *was* `/predict?q=NBA`. Fixed to search the whole page. |
| "ask bar is thumb-sized" | I demanded a 200 px input. Measured: input **166×42**, submit **80×42** — both over the 40 px touch minimum. The rule now tests the standard, not my preference. |
| "chat renders" (ready selector) | I guessed `[aria-label*=chat]`, which does not exist. The chat itself opened fine. |

**TREATMENT — re-run after the fixes: `=== RESULT: PASS ===`**, with all four sites on a phone:

- **placebets** home (no overflow), `/predict` — typed `NBA` on the phone → `/predict?q=NBA` →
  *"Predictions for …"*, ask bar 166×42 / 80×42, **0 first-party failures**; `/parlay` — 3 flavor
  tabs **300×126**, board renders.
- **marketpicks** home (no overflow), chat opened → input **288×53**, send **48×48** → asked and
  received an answer, **0 first-party failures**.
- fashionistas (existing `walk-390.mjs`) and createstuff (`measure-createstuff-390px.mjs`)
  re-run in the same pass: both **PASS**.

**Also hunted, in case the complaint lives somewhere else:** every internal link on the four
landings — the 13 marketpicks routes that return an empty `<main>` from a raw fetch all render
real content in a browser (4k–72k chars); createstuff `#projects`/`#settings` render their empty
states when clicked (my 400-char threshold was a false alarm); placebets `/games` "Coming soon" is
a per-game status badge on a live catalog, not a stub; fashionistas **Create account** →
`POST /api/auth/register → 201` → Home → `POST /api/listings → 201`, toast *Added ✓*, 0 errors.
Reliability burst across five endpoints: **22/22 HTTP 200**. The single non-200 was my probe
sending `message` where the API expects `query`.

## 11. 2026-10-01 (data layer) — the owner's four complaints, each with a control and a treatment

The owner's words, verbatim: the chat bots *"aren't predictive or conversational, they need
database checked and internet enabled"*, *"the sites have bad data"*, fashionistas *"isn't ready
for primetime for scalability"*, createstuff *"isn't a cheap free replit base44 killer yet"*.
Every claim below was first reproduced against the live system, then fixed, then re-measured on
the same endpoint. Nothing is claimed that was not run.

### 11.1 The proof harness, and the two times it caught its own limits

**`tests/data-layer-proof.mjs`** — five live checks against the production sites, each with a
documented control payload, plus an offline **DISCRIMINATION** section that feeds every judge a
broken payload and requires the judge to reject it (a judge that cannot fail proves nothing;
failure there exits 2). Missing credentials = SKIP, never PASS; a non-200 or an empty body = FAIL.

| check | control (what was broken) | treatment (what it measures now) |
|---|---|---|
| C1 trending feed | `topics: []` while answering `{ok:true, topics:0}` | `topics.length > 0` |
| C2 probability vs prose | refusal prose scored `0.578` / `0.545` | refusal ⇒ `null`; an asserted % must match |
| C3 Kalshi freshness | 20/20 markets past `closeDate` | 0 past-dated markets |
| C4 marketpicks latency | 2/4 calls `503`, p50 ≈ 11 s | 4/4 `200`, p50 < 4000 ms |
| C5 chatbot context | follow-up drops the matchup | names both teams |

**Two honest failures of the harness itself, both fixed rather than worked around:**

1. **C2 failed 1 run in 3 with `HTTP 502`** — not a flaky test: `POST /api/predict` was really
   failing (root cause in 11.2). Reproduced outside the harness with 12/12 and 6/6 consecutive
   branded Cloudflare `502` pages.
2. **C2 then failed with `answer asserts 52.4% but probability is null`** — the *judge* was
   wrong. It counted any percentage as a promise, so when the fallback model answered with odds
   math (the system prompt's own worked example, *"a -110 line means 52.4% implied
   probability"*) it demanded a number the prose never claimed for the asked question, while the
   shipped `extractProbability()` had correctly returned `null`. `d40939a` makes a percentage
   count as **asserted** only when its 70-character lookback carries no price/maths marker, and
   adds three judges so the escape hatch is itself tested (D11 odds-math prose + `null` must
   pass, D12 the model's own number left `null` must fail, D13 a number scraped out of odds math
   must fail). **Judges 10/10 → 13/13.**

**Final state:** judges **13/13**, `PROOF 5/5`, `RESULT PASS`, **exit 0**, reproduced on
separate runs at 20:29Z and again in two later runs (C4 p50 **2151 / 2808 / 3067 / 3122 ms**).

### 11.2 placebets — four dead-data defects, all reproduced first

| # | control (measured on the live site) | treatment |
|---|---|---|
| trending cron | `app/api/cron/trending/route.js` named a bare `GROQ_KEY` (deleted in `eccbd0d`), the `ReferenceError` was swallowed by its own `catch`, and it answered `{ok:true, topics:0}` while writing **0 rows**; **4 of 21** cron routes had no caller at all | **7 rows**, `fetched_at 18:00:32Z`; scheduler `placebets-scheduler` `a66dca7e` calling **18 `/api/cron/*` paths** with the hourly gate, verified in the deployed bundle |
| probability scraping | `probability` was simply the first `%` in the prose — including refusals (`0.578`, `0.545`) | 4/4 refusal answers → **`probability: null`**, 0 violations; **0 violations across 39 live answers** after the provider work |
| Kalshi freshness | **20/20** markets served past their `closeDate`, presented as live | **0/20** past-dated, repeatedly, in every harness run |
| chatbot not predictive | **0** references to `api/predict` in the chatbot — the engine could never have run | `prediction.consulted: true` with a real `as_of`; **negative control** on a greeting → `consulted: false`, no engine entry in `sources` |

**Then the outage the harness found.** `POST /api/predict` failed **20+ consecutive times**:
the apex returned Cloudflare's branded HTML (`placebets.ai | 502: Bad gateway … Host Error`,
6,413 B, `text/html`) while the deployment host returned our own `{"error":"AI engine error"}`
`502` — same build on both hosts (`/` byte-identical, 229,981 B), control routes all `200`
(`/api/trending`, `/api/odds`, `/api/edges`, `POST /api/chatbot`, `GET` → `405`, `POST {}` →
`400`), so the worker was healthy and **only the provider call failed**.

- **Root cause, measured:** Groq returns **HTTP 429** on `openai/gpt-oss-120b` (tokens-per-minute
  on the on-demand tier) — the first `429` arrived **62 ms** after the request, and one call
  reported `rate_limit_seconds: 127`. The route had **one provider and no timeout**, so a dark
  provider *was* an outage. A missing `GROQ_API_KEY` was a hard `500`.
- **`ff6fbe7`:** Groq stays primary with `AbortSignal.timeout(6000)`; on failure the route falls
  back to `chatbotResolve()` — the site's own chain (groq → openrouter → mimo → **workers_ai**,
  which needs no key) that the chatbot already used. Dead-end router sources (`timeout`,
  `budget_cap`, `paid_fallback_disabled`, `error`) are rejected rather than served as answers,
  and the `502` body now carries a `providers` array so a failure is diagnosable from the
  response alone. It stays a `5xx` on purpose: an engine that cannot answer must never look like
  a passing answer.
- **Treatment:** **14/14 HTTP 200 JSON, 0 branded HTML**, `workers_ai` serving 12 of 14; the old
  build `0206993d` reproduced the branded `502` **3/3** as the control.

**And the answer-clipping defect `92752b3`.** When the model replied in prose instead of JSON,
`lib/llm-router.js` used `text.substring(0, 500)` as the answer — a character-count cut that
lands inside words.

- **Control (live, 10 calls):** one answer **exactly 500 chars** ending `…check the live lin`,
  another 499 ending `…that's a 56.5% implied`, 3 of 10 with no terminal punctuation.
- **Control reproduced on pre-fix code an hour later:** deployment `b9780a5b` (source
  `8842ba4`, still `substring(0,500)`) → **1/20** answers at exactly 500 chars ending
  `…but I'd put it aro`.
- **Treatment:** **0/19** answers at the 500-char cap; answers now run to **779 chars** (the old
  distribution stopped dead at 500).
- **`finish_reason` now returned — and it retracts a hypothesis:** both Groq answers reported
  `stop`, `length` **never** appeared, so **`max_tokens: 350` is not truncating anything**. The
  incomplete sentence I had attributed to the token cap is **not** that, and I withdraw the
  claim.
- **Honest gap:** `clipProse()` never fired in production during those 40 calls (no answer
  reached the 1200 ceiling), so the boundary behaviour is **proven by the unit suite only** —
  8/8 including a CONTROL that runs the old expression and a 211-ceiling sweep where the old
  code shows violations and the helper shows **exactly 0**. Marked untested live.

### 11.3 marketpicks — the chat was pinned at its own 7-second budget

**Control** (6 sequential live POSTs, same query, 500 ms apart): **6.68, 3.17, 7.28, 7.19, 7.60,
6.70 s → p50 ≈ 6.95 s** — pinned at `REQUEST_BUDGET_MS`, plus empty bodies and `503`s (harness
control: 2/4 `503`). Root cause read from the code: `findSources()` (default **6000 ms** across
two RSS feeds) was awaited **to completion before the LLM was started**, so one cold feed spent
most of the budget before a single token was generated.

**`c5d5493`:** the news lookup starts in parallel, is capped at `NEWS_LOOKUP_MS` (1500) with a
450 ms head-start before the prompt is built and at most 350 ms residual afterwards;
`fetchNumericPrice` clamped to `trace.clamp(2500)`; **every** response body (200/400/429/catch)
now carries `{total_ms, stages}` so a slow turn is attributable from the payload alone.

**Treatment:** p50 **3072 / 3031 / 3075 / 2870 / 2923 / 3015 / 2151 / 2808 / 3067 / 3122 ms**
across ten harness runs — **every one under the 4000 ms budget** — with 6/6 and 4/4 HTTP 200,
non-empty, `timing` present on all calls. The `timeout` option `findSources` accepts was verified
in its own JSDoc and implementation (`lib/real-sources.ts`), so the cap is honoured at the source
and not merely by the wrapper.

### 11.4 fashionistas — primetime means the page stops being one 432 KB lump

**Control:** `index.html` was a single **432,399 B** document carrying a ~298,913 B inline
`<script>` — every visitor parses the whole app up front, every change re-serves everything, and
there is no cache granularity at all. Static assets on this domain are served
`cache-control: public, max-age=14400` while HTML is `max-age=0`, so a naive external script
could have left browsers on 4-hour-old JS behind fresh HTML.

**`ced043d`:** the script lives in `apps/fashionistas/app.js`, loaded by
`<script src="/app.js?v=1ca902262a62" defer>` where the `?v=` is a **sha256 of app.js's own
bytes**, rewritten on every deploy. **HTML shell 133,520 B + app.js 298,913 B.**

- **Live:** `GET /` → 200, **133,520 B**, sha256 **`143864b73113caca…` = the worktree byte for
  byte** (local == git == live); `GET /app.js?v=…` → 200, **298,913 B**, `max-age=14400`.
- **Browser:** `readyState` complete, script srcs = 3 JSON-LD + `/app.js`, and
  `typeof saveListing / renderShop / taxPath / canonCat` **all `function`** — the externalised
  script really executed — **0 console errors**.
- **Tests:** `harness-categories.mjs` had been slicing the code under test out of `index.html`
  and found nothing (`HARNESS 0/0`); it now reads whichever file holds the code. **Control at
  committed HEAD 65/67 (two stale assertions), working tree 68/68 PASS, exit 0.**
- **Hover tips — the alarm was mine, and the design was right.** My browser probe read
  **64/64** elements with `data-tip` and no `title`, which looks like a broken hover rule until
  you read `syncTips()`: it deliberately **removes** `title` on hover-capable devices (one
  tooltip, not two) and **sets** it when the device cannot hover. Proven on both branches against
  the live DOM: real `mouseover` **and** `focusin` both fill `#tip-bubble` (class `on`,
  `role="tooltip"`, correct text), **8/8** icon-only tips carry `aria-label`, and re-running the
  shipped function with `CAN_HOVER = false` gives **64/64 titles with `title === data-tip`**,
  which the app's own `syncTips` then restores to **0**. Keyboard path works too; 0 console
  errors.

### 11.5 createstuff — the 401s were real, and the Replit comparison was never measured

**Auth (control → treatment, `0bb3bde`, worker `efcb76d4`).** The session key was derived from
**randomness per isolate**, so a token verified on one isolate was rejected by the next: **60
parallel `GET /api/auth/me` → 13×`200` / 47×`401`**. The key is now derived once from the
**bound secrets** (no secret material in source). **Treatment: 60/60 on the first run, 60/60 on
a second run, 3× interleaved requests with `sleep 0.1` between batches, 0 failures.**

**The Replit/Base44 comparison (measured for the first time).** A real build, timed end to end:
`prepare` **598 ms** → `generate` **213,208 ms** → **214.0 s wall**, producing **3 files /
9,361 B** (`index.html`, `styles.css`, `script.js`) on `@cf/meta/llama-3.3-70b-instruct-fp8-fast`.
`GET /api/builds/:id/log` → **404** (the streaming route does not exist; only `POST …/log` does),
and as observed by a 1-second poll the log showed **2 chunks in the first 2.4 s and then nothing
for 212 s** — progress that only appears when the build ends. The gap table this produced is
labelled **measured** for our own rows and **inferred, unverified** for every Replit/Base44 row,
because those products were not run today.

### 11.6 What is still true and not fixed (read this before claiming anything above)

- **Groq is rate-limited, not fixed.** `429` on `openai/gpt-oss-120b` is the measured root cause;
  the fallback keeps the product answering, but the **primary** provider is degraded (in the last
  treatment sample: `workers_ai` 17, `groq` 2).
- **`/api/predict` still fails intermittently:** one branded `502` in 19 treatment calls at
  **9,613 ms**, and the earlier sample showed roughly 1 in 13. The `502` is Cloudflare's own
  page, not our JSON, and the trigger at ~9.6 s is **not identified — untested, not explained.**
- **The named control deployment `0206993d` now answers `502` on 24/24 `/api/predict` calls.**
  It predates the provider fallback, so this is the *old* single-provider code failing, not a new
  regression — but it means that host can no longer serve as a control.
- **`clipProse()` has never been observed firing in production** (see 11.2). Unit-proven only.
- **fashionistas inventory is still 2 items** — the honest copy from `3454c97` states it; filling
  the shop needs the Q1 auto-posting decision (WAITING-ON-YOU).
- **createstuff still loses rows** to Replit/Base44 on build speed (214 s vs the 60–150 s the UI
  states), collaboration, terminal and per-generated-app database — none of that changed today.
- **Disclosure:** earlier in this round a subagent's grep printed the value of `CS_API_TOKEN`
  into a tool output. It was never written to any repository and `.secrets/cf.env` is
  gitignored, but the token should be **rotated** — owner action, since minting it needs the
  Cloudflare dashboard.

## 12. 2026-10-01 (Connect panel) — the fake connect, and the easy way that was already in the repo

**The complaint, verbatim:** the fashionistas **Connect Depop** panel showed *"Ready to
guide / Local status · not a password vault / ✕ / Honest: Depop has no public seller OAuth …
Optional I've connected is a local flag only / Coach · checklist"*, and the instruction was
**"figure out an easy way"** — after **"easier better integrated ways to get users plugged in
… auto screenshots to ship items"**.

**What was already true and unsurfaced:** this repo ships a working autofill path —
`extensions/crosslister/` injects `bridge.js` on fashionistas.ai and `filler.js` on the six
shops, `background.js` queues one job per shop and opens the sell page, and `app.js` already
had `xlAutofill()` ("Fill it for me on 6 shops") **in the Multilist kit area**. The Connect
panel — the screen the owner actually opened — offered only a checklist and a localStorage
flag. The defect was not missing capability; it was that the panel never performed.

### 12.1 Control and treatment

| | Control (`45fcb471aae0`) | Treatment (`a4308ffb48d8`) |
|---|---|---|
| Panel primary action | none — coach checklist + `Open create listing` + `I've connected` | **`Fill Depop for me`** (helper detected) / **`Copy my listing & open Depop`** (not) |
| Subtitle | *"Free guide · open the shop · paste your draft"* | *"One tap · your draft lands in the shop's own form"* |
| Status tag | local label only | **`Auto-fill ready`** only when `data-fash-crosslister` is set by the extension itself; otherwise the honest local label |
| `I've connected` | button in panel + rows | removed; **`I have an account`**, tip *"nothing was connected"* |
| Depop deep link | `/sell/` — measured: *"Sell Clothes Online for Free"*, a marketing page | `/products/create/` → `/login/?redirect=%2Fproducts%2Fcreate%2F`, the real form behind its own login |
| Honest line | *"no public seller OAuth"* (stale) + names a button label | partner-granted API, self-serve **untested**, action described without naming a label |

**Proof — `tests/connect-fill-e2e.mjs`, new, 37/37 exit 0, real Chrome + the unpacked
extension + the local build + the live API** (shop pages mocked, nothing ever submitted):

- **Helper installed:** panel click → `FASH_CROSSLIST` ack *"Opened in new tabs"* → shop tab
  opens → mock Depop form shows **description filled**, **price 25**, **1 attached photo**,
  `submitted !== true`.
- **Helper switched off (dataset cleared):** button changes honestly, the no-install
  bookmark is offered, `window.open` gets `…/products/create/`, and the **real system
  clipboard** (permission granted the way a person's browser grants it on a click) reads
  back **375,493 chars** of `fashionistas:1` JSON whose `shops.depop` carries
  title/description/price and whose `photos[0].data` starts `data:image/jpeg;base64`.
- **Nothing ticked, Multilist never opened:** the panel still resolves an item — and now
  picks one **with** a photo (`rows[0]=126 photo=false → picks 98`), which the live demo
  account forced into the open (126 has an empty `photo_url`).

Other suites after the change: `crosslister-e2e` **31/31**, `bookmarklet-e2e` **26/26**,
`harness-categories` **68/68**, live `crosspost` **26/26** before **and** after deploy;
`data-layer-proof.mjs` still **13/13, `PROOF 5/5`, exit 0**. Deploy: apex == pages.dev ==
local, `app.js?v=a4308ffb48d8` (deployment `8e334053`); commit **`372c234`** pushed.

### 12.2 Two things the proof caught in *me*

1. **It was shipping a photo-less listing.** With nothing ticked, the fallback took
   `listings[0]` = row **126**, whose `photo_url` is empty — the whole pitch is "photo
   included", so the fallback now prefers the newest item that has one.
2. **Opening the shop first broke the copy.** The live click opened Depop (tab
   `tab_b75007` → its own login gate) *while the panel reported* "Your browser blocked the
   copy", console `NotAllowedError … Write permission denied` at `app.js:3327`. Root cause
   measured, not assumed: focus had already moved, and separately this automation desktop
   reports `navigator.permissions.query(clipboard-write) === "denied"` — a bare
   `writeText` probe fails identically, so the environment itself refuses clipboard writes.
   Fix shipped: copy starts while the document is focused, the shop opens after, and a
   blocked popup yields an explicit **`Open Depop here`** link. The real-clipboard proof
   therefore lives in the e2e with the permission granted.

### 12.3 What is still true and not fixed (read before claiming anything above)

- **"It copies for a real person" is inferred, not measured.** No real user profile was
  available; this desktop denies `clipboard-write`. What is measured: the bytes are correct
  (375,493 chars, photo included) and the code path succeeds whenever the permission is
  granted (e2e, twice). What is not: a stock Chrome profile on a normal desktop.
- **Depop partner API self-serve availability is untested.** Every
  `partnerapi.depop.com/api-docs/*` path answered `routing` / `Assets controller` errors from
  this machine (raw fetch 404, in-browser errors); the Selling API exists and is
  partner-granted (documented route `business@depop.com`, unverified by us). The panel says
  partner-granted and does not offer a key box.
- **The helper path still requires installing the extension** (zip / developer mode); a
  **Chrome Web Store listing was not verified this round**. The zero-install bookmark is the
  path that needs no install.
- Unchanged carried gaps: placebets email delivery (4 Gmail app passwords dead,
  `535-5.7.8`), fashionistas analytics token lacks zone analytics + RUM,
  `forge-api`/`api.createstuff.ai` undeployable, Groq unreachable from this machine (403),
  `createstuff-wholeapp-probe` undeletable, account A cron ceiling full (5/5), and the six
  WAITING-ON-YOU items in `TODO.md`.

---

## 13. 2026-10-02 (four-site complaint round) — chatbots that answered nothing, data that was never real

The owner's report, verbatim: *"these fucking apps dont do shit … marketpicks and
placebets have shit data and the chatbots arent conversaitonal or accurate."* No URL was
given, so the round opened by **measuring all four sites first-hand** rather than asking
again (the same question had already been asked once and answered with a repeat of the
complaint).

### 13.1 What the measurements actually found

| Site | Claim | Measured |
|---|---|---|
| placebets | chatbot not conversational | **Did not reproduce.** `POST /api/chatbot` answered every follow-up 200: *"build me a 2-leg parlay"* → priced live legs (`Seahawks -360 · Combined -149 · $10 pays $17`), *"what about the other game?"* → *"We didn't discuss another game yet…"* — context-honest, not canned. Latency 4.7 s greeting / 7.1 s question. |
| placebets | shit data | **Partly real.** `/api/odds` 200, 489 events, `updatedAt` = now; `/api/news` 30 items today. But `/api/trending` served **7 rows of AI refusal text** ("As an AI, my responses are based on a mixture of licensed data…", "my knowledge cut-off is September 2021") as trending content, written by the hourly cron at 00:06. |
| marketpicks | chatbot not accurate | **Real.** *"is there a football game tonight"* → invented `Chiefs vs Ravens 8:15 PM ET` (neither was playing), labelled *"the live schedule says"* with `sources:[]`; *"hi"* → *"Just got done scanning the markets"* with `sources:[]` and `source:"ensemble"`; a factual question cited a **2026-08-23** preseason article on 2026-10-01. |
| marketpicks | shit data endpoints | **Did not reproduce — retracted.** The 404s were my own probe hitting `/api/odds` on a host the frontend never calls. Real endpoints (`/api/news` 200/3.7 kB, `/api/trending` 200/71 kB, `/api/politician-trades`) all answered. |
| fashionistas | chatbot not conversational | **Real.** `POST /api/chat` returned `source:"backup"`, `fallback_reason:"it was unavailable"` on **3/3** — the agent path was dead. |
| createstuff | doesn't do shit | **Did not reproduce.** Login 200, projects 200, `POST /api/ai/discuss` 200 with a *correct* answer in 275 ms, and the real UI build path ran end to end (below). The walk's two "failures" were the walker's own harness: it used `POST /api/chatbot` (route does not exist — the chat route is `/api/ai/discuss`) and a bare `POST /api/builds` with a 25 s curl timeout, which is the documented inline path and which stranded row 181 until the 5-minute sweeper closed it (measured: it did). |

### 13.2 fashionistas — the dead agent path

**Root cause (measured, not assumed):** the Worker's `hiveChat` throws
`hive relay not configured`-class errors and falls back to Workers AI. A `cloudflared`
quick-tunnel was running but its log spammed `ERR Register tunnel error … Unauthorized:
Tunnel not found` — the random hostname had been re-issued and the `HIVE_URL` secret
still pointed at the dead one. That is the failure mode `HANDOFF-2026-09-25.md:251` and
`HANDOFF-2026-09-27.md:83` already documented ("quick-tunnel hostname is random per
restart → must re-put HIVE_URL").

**Treatment:** tunnel restarted (`parliament-traditions-statements-discuss.trycloudflare.com`),
verified end to end through the **public** URL (`202 → job-24 → 200 "ok"`, 1.4 s), then
`wrangler secret put HIVE_URL` on `fashionistas-api` **and** `createstuff-api` (creds
sourced from `.secrets/cf.env`, never printed).

**Control → treatment, live:**

| | control (before) | treatment (after) |
|---|---|---|
| `source` | `backup` ×3 | **`agent` ×4** |
| `fallback_reason` | `it was unavailable` ×3 | absent |
| reply | generic | *"Check sold listings for the same model on eBay or Depop… open Photo and upload clear photos"* — names the app's own tool |
| latency | 0.78–1.00 s | 2.76–7.32 s (real model, re-checked after the worker redeploy) |

**Carried risk:** this is still a *quick* tunnel. When it dies again the chat silently
falls back to `source:"backup"`. A named tunnel with stable DNS is the fix that was
already recommended on 2026-09-25 and is **still not done** — recorded here so nobody
reads `source:"agent"` as permanent.

### 13.3 fashionistas — two diagnostic claims retracted, one real bug fixed

A parallel diagnostic walk reported *"no endpoint reverts sold→active"* and *"no unblock
endpoint"*. **Both failed to reproduce and are retracted:**

- `PUT /api/listings/126 {"status":"active"}` → **200**, listing `sold → active`.
- `DELETE /api/dm/block/62` → **200** `{"blocked":false,"id":62}`, block list **1 → 0**
  (the UI has always sent this — `app.js:3712`).

**The real bug:** that same walk had marked listing 126 sold **twice** (orders **20**
`sale=35 profit=35` and **21** `sale=0`, both 00:15–00:16 on 2026-10-02). `/api/analytics`
`SUM`s every `orders` row, so those two fabricated sales were counted as revenue
**forever** — control `revenue 197, sales 7` against the five real orders from 2026-09-25 —
and there was no way to remove an order. A seller who mis-taps *Mark sold* had exactly the
same one-way door.

**Fix shipped (`62f1d97`): `DELETE /api/orders/:id`** — scoped to the caller (bogus id →
**404**, not a silent 200), deletes the order, and returns the listing to `active` with
`sold_price`/`sold_platform` cleared **only when it was that listing's last order**;
other sales for the same listing keep it sold, because those really happened.

**Control → treatment, live on the demo account:**

| | control | treatment |
|---|---|---|
| revenue | 197 | **162** |
| sales | 7 | **5** |
| profit | 119.8 | **84.8** |
| listing 126 | `sold`, `sold_price 35` | **`active`, `sold_price null`** |
| orders 20, 21 | present | **gone**; 15–19 untouched |

### 13.4 marketpicks — three defects, all measured, shipped `453215d`

1. **Sports fabrication.** `isSportsQuestion()` gate before any data path →
   `source:"off_domain"` with an honest redirect (*"I'm the markets bot"*), **0.43 s**
   instead of a 2.9 s invention. Ambiguous one-word "teams" (`jets`, `bills`, `bulls`,
   `heat`, `nets`, `rockets`…) only match **with fixture context nearby**, so a *"bull
   market"* question can never be declined as sports.
2. **Stale citations.** `findSources()` sorted news by date but never *filtered* by age —
   sorting is not a freshness rule. Added a recency gate (`maxAgeDays = 14`; wiki/ddg
   undated reference material still passes). **Proof `tests/recency-gate.test.mjs`
   4/4 PASS exit 0**: control (`maxAgeDays:0`) returns the 40-day-old article, treatment
   drops it and keeps the fresh one — the control is the old behaviour, so the test fails
   if the gate is ever removed.
3. **Dishonest labels.** `source:"ensemble"` is now `ensemble_noground` when no live data
   was consulted; the `wikipedia` and `llm_factual` returns now carry `sources` at all
   (they previously rendered an unclickable `[1]`); PERSONA forbids claiming a scan that
   never ran.

**Live after deploy, apex == pages.dev:** `hi` → `ensemble_noground`, football questions →
`off_domain`, *"best etf for AI exposure"* → `market_quote` with **5 sources**, *"latest
news on nvda"* → 5 sources all dated **2026-10-01**. `tsc`: **0 errors in the touched
files**, total 135 == the 135 on HEAD (no regression).

### 13.5 placebets — the trending corpus was never real (shipped `cba4073`)

The same defect in three acts, each measured before the next was attempted:

- **Act 1 — refusals published.** The hourly cron asked an LLM *"top 5 … right now?"*; a
  model with no live feed cannot answer "now", so all 7 rows came back *"As an AI…"* and
  `extractContent` (any non-empty string) wrote them over the good rows. Serving had no
  opinion about it.
- **Act 2 — grounding stopped refusals and started fabrication.** Feeding the prompt this
  deployment's own `/api/news` + `/api/odds?light=1` made the model write **"Victor Oladipo
  traded to Lakers"**, **"Jayson Tatum traded to Celtics"**, **"Warriors 120-112 Rockets"** —
  none of which are in the feed (it carried exactly **one** NBA item, a Wembanyama quote),
  and it put a high-school football story under **UFC, MLB and NBA**. Fabricated scores and
  trades are the one thing this product must never ship, so **model authorship was removed
  entirely**.
- **Act 3 — deterministic.** `buildTopicContent()` filters this deployment's own
  `/api/news` (100 real headlines) per topic. A topic with no matching story is reported
  **failed** and its stale row **deleted** rather than filled in.

**Proof:** tests **37/37** (the two refusal strings and the fabricated lines are fixtures,
taken verbatim from what was served); syntax gate 301/301. **Live after deploy:**
cron `ok:true, topics:6, failed:1` (WWE — honest, no story in the feed), 6 topics served,
**0 malformed lines**, and none of `Oladipo`, `Tatum`, `120-112`, `As an AI`, `Jericho`
present anywhere in the payload. Regression: chatbot, `/api/odds` (486 events, `updatedAt`
= now), `/api/news`, `/` all re-checked **200** after the deploy.

The serving side keeps `isAnswerText()` as defence in depth, so any row written *before*
this change still cannot be shown.

### 13.6 createstuff — the payoff chain, measured end to end

`prepare:1` → **201 in 0.58 s** → `POST /api/ai/generate` with the buildId → **200 in
218.6 s**, 3 files, 6,224 chars, row closes `status: completed` with **9 log entries**.
`POST /api/ai/publish` → **200 in 1.69 s** →
`https://sites.createstuff.ai/281/index.html` → **HTTP 200, 5,253 bytes, real
`<title>Lemonade Stand</title>` markup** (`h1×1 h2×5 p×8`, mentions "lemonade").

So *"doesn't do shit"* does not reproduce: brief → build → publish → a live URL that
renders. **Open, measured, not fixed:** **218.6 s** against the 60–150 s promise (carried
gap, unchanged); the probe row opened by the walker's bare POST was closed by the sweeper
(measured working), and the row I opened to watch the sweeper was closed honestly via
`POST /api/builds/183/log {"close":"failed"}` rather than left `running`.

### 13.7 Gates after the round (all exit 0)

`connect-fill` **37/37** · `crosslister` **31/31** · `bookmarklet` **26/26** ·
`harness-categories` **68/68** · live `crosspost` **26/26** · `data-layer-proof`
**PROOF 5/5** · marketpicks `recency-gate` **4/4** · placebets `trending-*` **37/37** ·
placebets `check-syntax` **301/301**.

Commits: marketpicks **`453215d`** (pushed) · placebets **`cba4073`** (pushed) ·
nexus **`62f1d97`** (pushed). Every deploy verified by `deploy.sh` (sha == live);
`STATUS.html` and `extensions/crosslister/poshmark-post.js` belong to another session and
were never staged.

### 13.8 Still open and not fixed

- **The tunnel is still a quick-tunnel.** Chat degrades to `source:"backup"` the next time
  it dies; the named tunnel from 2026-09-25 was never built.
- createstuff **218.6 s** vs the 60–150 s promise; `GET /api/builds/:id/log` still 404
  (POST-only, by design).
- fashionistas `photo-search` vision returns an empty stub when vision is unavailable —
  it is **labelled** (`vision:"unavailable"`), so it is honest, but it is not a working
  photo search.
- The six WAITING-ON-YOU items in `TODO.md` are unchanged, including *"which site/link
  failed"* — this round proceeded by measurement instead of re-asking.

## 14. 2026-10-02 (GOAL 1) — placebets proven end to end, and two claims I had to retract

### What ships
`Placebetsai-src` @ `64e86f2` = `origin/main` = live Pages `Source`. Five proof scripts, all
exit 0: `board-integrity` · `fanduel-orientation` · `parlay` · `chatbot-gates` (31/31) ·
`bookie-proof` (4/4 live).

### The bookie bot's four gates — all in `lib/llm/chatbot-placebets.js`
| gate | exported as | what it stops |
|---|---|---|
| routing | `bookieTakeAsk(query)` | a pick/banter ask being answered from the news feed with no odds |
| prices | `fabricatedOddsNumbers(answer, boardBlock)` | citing an American-odds number that is not in the board rows the model was shown |
| lineup | `fabricatedInjuries(answer, fullBlock)` | naming a player as out who is not in the data → one corrective retry, then the grounded take |
| banter | `banterInstruction(query)` | the trash-talk ask being specified away by each branch's own per-request prompt |

The first three run through one shared `enforceGroundedAnswer({answer, boardBlock, fullBlock,
userQuery, db})`. **`fullBlock` must be `liveDataSection`, not `promptData`** — the injury
report and public-betting sections are appended to `liveDataSection` after `promptData` is
built, so checking injuries against `promptData` would falsely accuse every legitimately
listed player.

Run `node scripts/chatbot-gates-proof.mjs` after any change to those four. It exits 0/1.

### Retracted — do not repeat these
- **"The bot invented G. Spiller."** False. `lib/injuries.js` under key `cfb` lists
  `Delaware Fightin' Blue Hens | G. Spiller | Out`. Searching `/api/odds` for a player name
  is the wrong test: the injury report comes from a different feed. (`C. Wood`, `J. Marshall`
  also real.) The gate deliberately reads the whole block so these pass.
- **"The bot invented the Texans."** False. `Dallas Cowboys @ Houston Texans` is a real row.
  Its away price swings `144` ↔ `-120` depending on which feed (theoddsgap / actionnetwork)
  supplied it last. Snapshotting the board at the wrong moment makes a real number look
  fabricated. Re-check against a fresh `/api/odds` before calling anything invented.

### `deploy.sh` provenance fix
`Source` in `wrangler pages deployment list` comes from the *current directory's* git HEAD.
deploy.sh runs from `nexus-ai-suite`, so it labelled placebets.ai deploys with
nexus-ai-suite's hash (`62f1d97` while Placebetsai-src was `9f42b29`). New `commit_arg()`
passes `--commit-hash` from the directory being uploaded — it prints `>> source commit: …` on
every run, and wrangler also prints `fatal: bad object <hash>` because it tries to resolve
that object against nexus-ai-suite's repo. **That line is harmless and expected**; the deploy
completes and `verify_pages` confirms the bytes.

Note `DRY_RUN=1 ./deploy.sh …` does **not** dry-run: `DRY_RUN` is reset to `0` at line ~230
and set only by a CLI flag. Invoking it with the env var performs a real deploy.

### Known gaps carried forward
- GH Actions deploy workflow still at `ci/deploy.yml` — pushing into `.github/workflows/`
  is rejected, gh token has `gist, read:org, repo` and no `workflow` scope.
- `chatbot-quality.test.mjs` fails 1–2 live assertions (`history-followup`). **Verified to
  fail identically at HEAD in a clean worktree** — pre-existing, flaky, not a regression.
  Compare against HEAD before blaming a change.
- theoddsgap `429` still gates tennis/UFC/soccer coverage.
- Two sessions work this repo concurrently; `components/ProWrestlingPage.js` and
  `package-lock.json` are not mine — stage files explicitly, never `git add -A`.

## 15. 2026-10-02 — GOALs 2–5 audit (2 PASS, 2 BLOCKED)

**GOAL 2 marketpicks.ai — PASS.** live == HEAD == `origin/live-source` `ecb50ca`.
AAPL bot/board/Yahoo agreed to 0.08%; congress feed matched the House Clerk PDF
bracket-for-bracket (BE 07/24/26 `$1,000,001-$5,000,000`, BE 07/28/26 `$500,001-$1,000,000`,
INTC 07/24/26 `$250,001-$500,000`, filed `08/21/26`); bot declines sport 1/1.
Gaps: `/api/odds|markets|congress` 404; chatbot 400 omits the field name;
`health.quotes.last_success` is a heartbeat, not a write.

**GOAL 3 createstuff.ai — PASS** (register → build → publish → curl 200, all measured).
Chain proven: `planner=groq`, writers two different `:free` OpenRouter models, Zen measurably
429-dead yet builds completed, one build honestly `422`. **BLOCKED:** forcing the *first*
provider to fail — no request field exists; needs a deployed-env change.
Live source of createstuff.ai is `nexus-ai-suite/apps/createstuff-marketing/` (sha matches live),
**not** the `createstuff-ai` repo (which points at an unbound project).

**GOAL 4 fashionistas.ai — BLOCKED 4/6.** photo→ID/price/fees/multi-shop and MV3 all pass.
**prod eBay** blocked: `env:"sandbox"`, `501 ebay_not_configured`, no `EBAY_*` secret.
**Stripe test plan** blocked: no keys, no billing routes.
**no-demo-creds-in-JS** blocked: `app.js:66` ships `Primetime2026!`; the fix needs the worker,
and deploying that worker would ship another session's uncommitted 77-line change.

**GOAL 5 — 3 PASS / 6 BLOCKED on `live deploy hash == HEAD?`.** All nine are 200 with a valid
sitemap and exactly one `<h1>`; 8/9 have clean internal links. **spanishtvshows.com was the
exception**: 100 of 193 sitemap URLs are `/show/…` and every one tested returned `500` (7/7) —
**fixed 2026-10-07, `/show/*` → 200 (§16.5, `ISSUE_LOG` #42)** — plus a homepage 404 at
`/Netflix-spanish-shows`, **still open**. `religiousjews.com` has no AI-bot rules in robots.txt.

**Gotcha worth remembering:** wrangler's `pages deployment list` resolved to the wrong account
even under `env -i`; the Cloudflare REST API with `Authorization: Bearer` is the reliable way to
read deployment provenance. Pass `CLOUDFLARE_ACCOUNT_ID` explicitly — the CS token's
`GET /accounts` returns an empty list, so account discovery cannot be used to identify it.

---

## 16. 2026-10-06 (late) — THE HANDOFF ITSELF WAS STALE; what is actually true now

**Why this section exists.** Sections 1–15 stop at 2026-10-02 and the header still said
`Last updated: 2026-09-29`. Three claims a reader would take from the older handoff were
already false: *`main is 5ffba1e`*, *try-on isn't wired up*, *the docs leak is open*. Every
correction below carries its command and its output.

### 16.1 Corrections

| Old claim | Truth as of 2026-10-06 | Proof |
|---|---|---|
| `main is 5ffba1e` | every repo HEAD, **all pushed** (§16.2) — `5ffba1e` now appears in **no** handoff, only as a historical note in `ISSUE_LOG.md` #10 | `git log --oneline -1` per repo; `git status -sb` shows no `ahead`; `Placebetsai-src` had 2 unpushed commits → `5a03c2a..2dd74a9` pushed tonight after a diff secret scan `hits: 0` |
| **try-on isn't wired up** | live `POST /api/tryon/hd` → **200, 48.2 s, 576×823 WebP 19,072 B, `cost_usd 0`** (2026-10-06); API worker answers `/api/health` → `{"ok":true,…,"version":"3.1.0"}` | `ISSUE_LOG.md` #10 · `curl https://fashionistas-api.fashionistas1979.workers.dev/api/health` → `http=200` |
| **docs leak is open** | **the docs are clean.** At `931cd0b`, `git grep -E` over tracked `*.md`/`*.txt`: `sk_test_` **0 files**, `sk_live_` **0**, `AIza…` **0**, `ghp_` **0**; `cfat_` matches 3 files **only in redacted form** (`cfat_qL7N…84da4`, never a value). Credential *values* live in `.secrets/cf.env` (`-rw-------`, git-ignored) | scan run 2026-10-06, output pasted in session |
| …but **key rotation is still open** | the *source-code* leaks are untouched: **4 leaked keys in committed files + 2 Gmail SMTP app passwords** (Placebetsai-src web-search, Spanishtvshows chatbot, Ihatecollege expand-articles) | `NEEDS_ISRAEL.txt` #8 · `ISSUE_LOG` BLOCKED |

**How to read that split:** exposure through the handoff/public repo is closed; rotation of the keys
that leaked *inside the code* is not, and it needs Israel (allowed ask).

### 16.2 Repo state (2026-10-06 — every one pushed)

| repo | HEAD | branch | note |
|---|---|---|---|
| `nexus-ai-suite` | `931cd0b` | master | docs: STV + IHC tokens as names/paths/lengths only |
| `fashionistas-ai` | `e239702` | main | OG/canonical/focus-visible |
| `Placebetsai-src` | `2dd74a9` | main | was +2 unpushed → pushed tonight |
| `marketpicks-ai` | `c91ae99` | live-source | M4 #1 |
| `Ihatecollege` | `860034b` | main | sitemaps |
| `Spanishtvshows.com` | `186247c` | main | ads: render the AdUnit 11 pages already imported |
| `createstuff-ai` | `39e695e` | main | 1 dirty file (`index.html` +23) still to commit |
| `scooters-exchange` | `2e77e3a` | master | shipped tonight (was `ed4c794`) |
| `diamonds-forsale` | `775e029` | master | shipped tonight (was `5692dae`) |

### 16.3 Still open — unchanged, and explicit about what was **not** re-verified

- **No marketplace post has ever gone out — and the reason is now pinned down (§16.6, re-verified
  2026-10-07).** The earlier note here claimed *"there is no login to mint a session with"* — **that
  was wrong.** Site auth works: `POST /api/auth/register` → **201** (D1 `users` id 78), `login` →
  **200** + `fash_session`, `/api/auth/me` → **200**, `/api/marketplaces` → **200 (11 marketplaces)**.
  What actually stops a post is **`402 subscription_required`** ($14.99/mo gate) and, behind it,
  `POST /api/billing/checkout` → **503 `STRIPE_SECRET_KEY not configured`**. The worker's data routes
  still answer `401` **because no credentials were sent**, not because login is missing. The real
  external blocker remains the marketplace OAuth logins (eBay/Etsy) — see `ISSUE_LOG` #25 / #43.
- ~~`TMDB_API_KEY` value unrecoverable → spanishtvshows `/show/*` still 500~~ → **RESOLVED
  2026-10-07 (§16.5).** The user delivered the key from the TMDB account `spanishtvshows`
  (*Settings → API*). It is stored as `STV_TMDB_API_KEY` (32 ch, `90ca…4e5e`) + `STV_TMDB_READ_TOKEN`
  (244 ch) in `.secrets/cf.env` (`-rw-------`, git-ignored, **0 tracked copies**), set on Cloudflare as
  the Pages secret `TMDB_API_KEY` on project **`spanishtvshows-site`** (production *and* preview), and
  `/show/*` now returns **200**. **The raw value is never written into this handoff** — the repo is
  PUBLIC (`placebetsai/nexus-ai-suite`); name + path + length + `90ca…4e5e` only.
- fashionistas: 8 env vars + Stripe **test** key + `OPENCODE_API_KEY`; try-on credits = 9 left.
- wrangler OAuth refresh (`zone:read`) — stored token expired `2026-10-06T20:58:54Z`.
- Key rotations (4 + 2) · RunPod signup · APK (no build exists) · admin-UI approval.
- Informational, **not** defects: `api.fashionistas.ai` never had DNS (the live page calls the
  absolute origin `https://fashionistas-api.fashionistas1979.workers.dev`), and `fashionistas.ai/api/*`
  returns the Pages 404 page because the API is a Worker, not Pages Functions.

### 16.4 Round-3 ships (2026-10-06, after §15)

| site | what changed | deploy / commit |
|---|---|---|
| scooter.exchange | 23 dead `loremflickr` refs → Wikimedia (live `loremflickr=0`, homepage `9/9` images load); **4,439 category corrections** over 7,004 rows parsed from titles (`ebike` 1,105, `other` 1,000) + 292 parts deactivated; rentals `count:0 → 25/25/52`; seller photos `NXDOMAIN → GET /api/photos/<key>` | worker `6c4b1f15` · Pages `56dd2a9d` · `ed4c794..2e77e3a` |
| ihatecollege.com | loader **×1, slots ×3 on the real domain** (was loader ×0 there) | Pages `498b4603`, acct `90904956…` |
| diamonds.forsale | build **broken since 2026-09-27** by `onError` on an `<img>` in a server component (`Static page generation for /about … timing out after 3 attempts`) → **0 ads on every page** since July; fixed, built with `ADSENSE_CLIENT`, avatar `404 → 200` | Pages `37253dda` · `5692dae..775e029` |
| docs | STV (`555c6765…`) + IHC (`90904956…`) tokens registered as names/paths/lengths | `493ccc4..931cd0b` |

**Deploy recipe that works on this machine:** the Pages project's `production_branch` is **`main`** —
`--branch=master` uploads as `env=preview` and *the domain keeps serving the old build, silently*;
and wrangler v4 refuses to bundle the next-on-pages artifact
(`Could not resolve import "./__next-on-pages-dist__/assets/**/*.bin"`), so use
`node_modules/.bin/wrangler` (3.114.17) with `--no-bundle`. Full evidence: `ISSUE_LOG.md` #37 / #38.

### 16.5 2026-10-07 (after midnight) — the TMDB key arrived; `/show/*` 500 → 200

**What was wrong (two stacked causes).**
1. `.github/workflows/deploy-pages.yml` wrote `TMDB_API_KEY` to project **`spanishtvshows`**
   (line 42) but deployed to **`spanishtvshows-site`** (line 51) — so the key was on a project that
   does not serve the domain. The step was `continue-on-error: true`, so every run reported success.
2. **Uploading the secret to the right project was still not enough.** After the key was set on
   `spanishtvshows-site` (production), `/show/1399` kept returning **500** — Cloudflare applies a
   project's env to a **new** deployment, and production was still running the 2026-10-06 build.

**Proof the key itself was never the problem.** `GET /3/configuration?api_key=…` → **200**;
`/3/tv/1399?api_key=…` → **200** (`Game of Thrones`, 73 episodes in S1); v4 Bearer token → **200**.

**Fix.** (a) key stored locally → `STV_TMDB_API_KEY` (32 ch, `90ca…4e5e`) in `.secrets/cf.env`;
(b) Pages secret `TMDB_API_KEY` set on `spanishtvshows-site` for **production *and* preview**;
(c) rebuilt from this laptop exactly as CI does — `npx @cloudflare/next-on-pages@latest` with
`TMDB_API_KEY` + `SITE_URL` (needed `npm_config_legacy_peer_deps=true`, else `ERESOLVE` on
`@cloudflare/workers-types` vs `wrangler@4.148`); (d) staged on a **preview** branch first, then
`wrangler pages deploy .vercel/output/static --project-name=spanishtvshows-site --branch=main`
(`production_branch = main`).

**Evidence (2026-10-07 ~02:10 UTC).**

| check | before | after |
|---|---|---|
| `/show/1399` | **500** (19,766 B, `__next_error__`, digest `2025926783`) | **200** 79,323 B — title *Game of Thrones Review…*, **40 `image.tmdb.org` refs** |
| `/show/679` | **500** | **200** 80,090 B — *Xiaolin Showdown*, 36 refs |
| `/show/46648` | **500** | **200** 78,149 B — *True Detective*, 40 refs |
| 10 homepage-linked ids (`12637 1446 19505 203667 212907 284792 30826 44953 63764 67335`) | — | **10/10 → 200**, 0 not-200 |
| sitemap sample, old prod deployment `609631cf` vs live | 15 URLs, **7 differences, all `old=500 → live=200`** | **0 regressions** |
| `/`, `/blog`, `/best-on-netflix`, `/spanish-show-finder`, `/sitemap.xml`, `/ads.txt` | 200 | **200** (all six) |
| sitemap URL set old vs live | **202 vs 202, identical, 0 diff** | no page was dropped |

**Gotchas worth remembering.**
- A Pages secret change does **not** reach an already-deployed release — a redeploy is mandatory.
  Symptom: secret present in `deployment_configs.production.env_vars`, page still 500.
- `next build` regenerates `content/generated/spanish-pages.json` (108 → 51 entries here). It is a
  **build artifact**, regenerated on every build (CI does the same), and the sitemap is built from
  `app/sitemap.js`, not from that file — reverted with `git checkout --`, repo left clean at `0 dirty`.
- The error message is invisible in prod (Next serves `__next_error__` + a numeric `digest` only);
  compare a *previous deployment URL* (`https://<hash>.spanishtvshows-site.pages.dev`) against live
  to see what actually changed.

**Still open on spanishtvshows:** homepage link `/Netflix-spanish-shows` → **404**; the 3 retired cron
jobs (incl. *Generate Spanish Pages*, which now has its key locally) still need Cloudflare Cron Triggers.

### 16.6 2026-10-07 — fashionistas: **can we post?** the full chain, measured

Asked directly: *"can we post something on it or not? where do i test?"* Answer, every step with
its real status code (base `https://fashionistas.ai`, which serves the **Pages Functions**, not the
worker — the worker has a different, older auth that wants `username`+`password`):

| # | step | endpoint | result |
|---|---|---|---|
| 1 | create an account | `POST /api/auth/register` `{email,password}` | **201** `{"ok":true,"id":78,…}` |
| 2 | sign in | `POST /api/auth/login` | **200** + `Set-Cookie: fash_session=…; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000` |
| 3 | prove the session | `GET /api/auth/me` | **200** `{"id":78,"authenticated":true}` |
| 4 | see the marketplaces | `GET /api/marketplaces` | **200** `count:11` (its own `caveat` says *"no real marketplace post has ever been executed"*) |
| 5 | **publish a listing** | `POST /api/list/all` `{title,description,price,photoUrl}` | **402 `subscription_required` `status:"inactive"`** — *"An active $14.99/mo subscription is required to list"* (same on `/api/list/ebay` and `/api/list/etsy`) |
| 6 | pay for the subscription | `POST /api/billing/checkout` | **503 `STRIPE_SECRET_KEY not configured`** — *"Set the STRIPE_SECRET_KEY Pages environment variable…"* |

**So: NO, not today — and it is not a mystery.** The gate is `requireActiveSubscriber()`
(`functions/api/_lib/auth.js:189`) → Stripe. Behind Stripe sit `EBAY_SANDBOX_{CLIENT_ID,CLIENT_SECRET,
REDIRECT_URI}` + `ETSY_{API_KEY,SHARED_SECRET}` (the "8 env vars", `ISSUE_LOG` #25) and then the
marketplace OAuth logins themselves. Unblocking order: **Stripe test key → env vars → eBay/Etsy login → post.**

**Where you test it** (once a subscription can be bought): `https://fashionistas.ai/` → sign-in form
`#login-u` / `#login-p` (the page calls `auth/login` and `auth/register`), then the post UI `#pu-post`;
or straight API `POST /api/list/all` with the `fash_session` cookie. A QA account already exists for
this — **`qa-post-test@fashionistas.ai`, D1 `users` id 78**, password in `.secrets/cf.env`
(`FASH_QA_EMAIL` / `FASH_QA_PASSWORD`, 600, git-ignored, 0 tracked copies).

**Correcting my own earlier claim:** "there is no login to mint a session with" (§16.3, older
handoffs) is **false** — steps 1–4 above are the proof. The `401`s on
`fashionistas-api…workers.dev/{marketplaces,listings,marketplace/posts,marketplace/accounts}` mean
*no credentials were sent*, not *no auth exists*.

**Ads, re-measured on the live homepage (was stale in the checklist):** `fashionistas.ai/` →
**200, 420,008 B**, loader **2** `adsbygoogle` refs, **4** `data-ad-slot` units, `ca-pub` **2**,
`ads.txt` **200 (548 B)**.

**Not a fix, recorded for the record:** the IMDb API the user researched is **not** a tonight
substitute for TMDB — it is sold through **AWS Data Exchange** and needs an AWS account, an access
key, a subscription request that *"IMDb staff process within five business days"*, then a paid
product. Fine as a second source later; it cannot unblock anything now.


### 16.7 2026-10-07 — fashionistas login: **the app was signing users out itself**

The complaint (their words, paraphrased): they did the whole login flow *yesterday* and still had to
repeat it every time, with no guidance. Root cause — three stacked defects, **all client side** in
`fashionistas-ai/index.html`, the server was fine:

| # | defect | where |
|---|---|---|
| 1 | **any 401 destroyed the session.** `api()` is the single fetch helper, so `if (r.status === 401) { toast("Session expired — please log in"); setTimeout(()=>logout(), 600) ... }` meant one bad response from *any* endpoint signed you out of the whole app | old `index.html:1459` |
| 2 | **a wrong password looked like an expired session** — `doLogin()`/`doSignup()` post through that same `api()`, so bad credentials ran `logout()` and toasted "Session expired" | same line |
| 3 | **the stored session was never validated** — `grep -c "auth/me" index.html` → **0**; boot only trusted `localStorage.fash_token` | old `:1402` |
| 4 | **`"undefined"` in localStorage** — `afterAuth(d)` did `TOKEN = d.token` while an auth answer can be `{ok,id,email}` with no `token`, so the next request sent `Authorization: Bearer undefined` → 401 → defect 1 | old `afterAuth` |
| 5 | **no guidance** — nothing after sign-in, and 402/503 were bare toasts with no action | old `:4536-4537` |

**Shipped** as `fashionistas-ai` commit `3cfe08b` (pushed), deployed by `scripts/deploy-local.sh` →
`wrangler pages deploy . --project-name=fashionistas-ai --branch=main`; `version.txt` == `3cfe08b`
and live == `3cfe08b`.

- `api()`: 401 from `/api/auth/*` → thrown as the **real** credential error, session untouched; any
  other 401 → **confirmed first** against `GET /api/auth/me` (auth gate runs before routing: valid
  token → **404**, dead or absent token → **401**) — only a genuinely dead token signs you out;
  anonymous 401 → "Sign in first to do that." with **no toast and no logout**.
- `restoreSession()` once at `DOMContentLoaded`: keeps a live session, and *explains* an expired one
  instead of failing on the first click.
- `afterAuth()` never stores `undefined`, and toasts the next step: *"Signed in as … — next: Connect
  your shop, then Sell to post an item."*
- 402 → `guideSubscribe()` names the $14.99/mo plan and offers the live `/pricing/` (**200**); 503 →
  names the missing keys in plain language instead of `key missing: EBAY_…`.

**Proof — 4 tests in a real browser on the live site** (deployment `15ef54f1`; QA credentials
generated inside the page, never written down):

| test | action | result |
|---|---|---|
| A | sign up through `doSignup()` | token stored (**107 chars**), sign-in view hidden, app + tabbar visible, guidance toast shown |
| B | **failed login while signed in** | threw **"Invalid credentials"**, token still 107, sign-in view still hidden → `sessionSurvived: true` (before: signed out) |
| C | reload the page | **still signed in**; network shows `GET /api/auth/me` → **404** (session alive) |
| D | signed out, call an auth-only endpoint | threw **"Sign in first to do that."**, toast **empty** (no "Session expired"), stayed on sign-in |

`npm test` → **267 pass / 0 fail** (baseline held). Live grep: `restoreSession` **1**,
`guideSubscribe` **1**, the old `setTimeout(()=>logout(), 600)` **0**. Ads untouched: loader **1**,
`data-ad-slot` **4**, `ca-pub` **1**, `GET /` **200** / 422,320 B.

**Where to test it yourself:** `https://fashionistas.ai/` → sign in → **reload the page**: you stay
signed in. Then type a wrong password on purpose: you get *"Invalid credentials"*, not "Session
expired", and you stay signed in. Full write-up: `ISSUE_LOG.md` **#44 evidence**.

**Still blocked behind it** (unchanged): posting needs the Stripe test key (`#24`) → the 8 env vars
(`#25`) → the eBay/Etsy OAuth logins. Login now works and *stays* working; the paywall is what is
left, and it says so out loud instead of failing silently.

### 16.8 2026-10-07 (night ET) — fashionistas functionality ship: try-on path, multilist extension, chatbot scope

Three live ships after the login fix (`3cfe08b`). Tip is now **`593418e`** (`version.txt` == live).
Prior tonight: `e768c8f` multilist extension one-click; `c8776cd` try-on pipeline fix; `3cfe08b` auth session fix.

#### A. Try-on pipeline 404 → 200 (`c8776cd`)

The `/try-on/` page imported `/try-on/tryon_pipeline.js`, but the file lived under `/core/` → **404**.
Fix: serve the pipeline from `/try-on/`, restore **Photoreal** (`POST /api/tryon/hd`) and keep
**Instant** as the experimental on-device overlay.

```
$ curl -sS -o /dev/null -w '%{http_code} %{size_download}\n' https://fashionistas.ai/try-on/tryon_pipeline.js
200 20019
$ curl -sS -o /dev/null -w '%{http_code}\n' https://fashionistas.ai/core/tryon_pipeline.js
404
$ curl -sS https://fashionistas.ai/version.txt
593418e978144a43b79f4a31c316afcd8de58083
```

UI modes on live `/try-on/`: **Photoreal · Pro** and **Instant · experimental overlay** (import =
`/try-on/tryon_pipeline.js`). Commit then tip advanced past `c8776cd`.

#### B. Multilist one-click via Chrome extension — no Stripe (`e768c8f`)

Server `/api/list/*` still hits the $14.99 paywall (`ISSUE_LOG` **#43** / **#24**). The extension path
posts from the user's logged-in shop tabs instead — **no Stripe required** for that path.

```
$ curl -sS -o /dev/null -w '%{http_code} %{size_download}\n' \
    https://fashionistas.ai/chrome-store/fashionistas-extension-v1.0.1.zip
200 109648
```

- Zip on live Pages (**200**, 109,648 B). Doc in repo: `docs/MULTILIST-ONE-CLICK.md` (Pages `/docs/*`
  may **404** — that is fine; the zip + in-app UX are what ship).
- `apps/extension/queue.js` `ADAPTERS` includes **ebay** + **etsy** (plus poshmark, mercari, depop,
  vinted, grailed, facebook, kidizen, vestiaire, whatnot).
- Unit proof: `node --test tests/multilist-one-click.test.mjs` → **7 pass / 0 fail**.
- **Still needs a human:** Load unpacked in Chrome + shop logins before the first real marketplace
  post. No real post has been executed in Chrome yet.

#### C. Chatbot conversational expand (`593418e` — live tip)

Stylist scope beyond fees / own listings. Allowed topics include: `connect_shops`,
`chrome_extension`, `try_on`, `listing_from_photo`, `pricing_plan`, `how_to_list` (+ fees/listings).

Smoke (QA session cookie `fash_session` len **64**, account id **78**; no secrets printed):

| prompt | http | refused | topics | note |
|---|---|---|---|---|
| How do I list on Depop? | **200** | **false** | `how_to_list` | step-by-step Connect → extension |
| How does try-on work? | **200** | **false** | `try_on` | Photoreal + Instant modes named |
| What are the fees and pricing plan? | **200** | **false** | `marketplace_fees` | fees still answered |

Unit: `node --test functions/api/chat/__tests__/grounding.test.mjs` → **19 pass / 0 fail**.

#### Still blocked (unchanged)

| blocker | issue |
|---|---|
| Stripe **test** key | `#24` |
| 8 env vars (eBay/Etsy/…) | `#25` |
| Real marketplace post in Chrome | never executed (extension Load unpacked + shop logins still human) |
| Server `/api/list/*` | `#43` still true until Stripe → then env vars → OAuth |
| Own marketplace | deferred |

**Where to test:** `https://fashionistas.ai/try-on/` (Photoreal / Instant) · extension zip URL above ·
chat after sign-in. Write-up: `ISSUE_LOG.md` **#45–#47**, `HANDOFF-2026-10-06.md` **§14**.


**Next agent:** sections 1–15 are history. Start from `HANDOFF-2026-10-06.md`, then
`ISSUE_LOG.md` (FIXED + OPEN), `PRIMETIME_CHECKLIST.md`, `NEEDS_ISRAEL.txt`.
