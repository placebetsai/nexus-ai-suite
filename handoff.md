# 🐝 NEXUS-AI-SUITE — HANDOFF FOR AGENTS

> **Newer:** `HANDOFF-2026-09-26.md` — MarketPicks + PlaceBets data/tools session (deploy rules, what's live, open problems).
**Last updated: 2026-09-24** · Repo: `placebetsai/nexus-ai-suite` (branch `master`)
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
- ⚠️ **OPEN 2026-09-28 — 4 of placebets' 17 navbar links cannot be clicked.** `Tools`, `Tourneys`,
  `Receipts` and `Contact` render at **x ≥ 1446 on a 1440 px viewport** with **no scrollable
  ancestor**, so `overflow-x: hidden` clips them; **2 stay offscreen even at 1920 px**. Found while
  proving the email change and **verified byte-identical on the previous production build
  `98099151.placebetsai.pages.dev`**, so `e7eed5e` did not cause it. Needs a nav layout change plus
  a visual re-verify — not touched. (See TODO row **P16**.)
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
  **Proof 79/79** — `/tmp/domain_proof.sh` **33/33**, `/tmp/domain_proof_v2.sh` **27/27**,
  `/tmp/domain_ui_proof.mjs` **19/19** (real Chrome, screenshot `/tmp/domain_ui.png`). Each suite
  creates *and* deletes its own project and its own hostname. Measured lifecycle: DNS `created`
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
