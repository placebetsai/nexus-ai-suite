# 🐝 NEXUS-AI-SUITE — HANDOFF FOR AGENTS
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

## 8. KNOWN GAPS / OPEN ITEMS

- ⏳ **Stale repos** `placebetsai/fashionistas-ai` + `placebetsai/createstuff-ai` need commit/push of the synced live files.
- ⚠️ `createstuff.ai` routes `/api/builds`, `/api/templates`, `/api/github/create-repo`, `/api/github/push`, `/api/projects/:id/download.zip` **do not exist on forge-api** → those buttons will 404. Auth, projects and `github/repos` do work. Either implement them on forge-api or remove the UI.
- ⚠️ `POST /api/ai/analyze` → 400 "image must be base64-encoded image bytes" for tiny inputs (**correct validation**, but confirm with a real image ≥100 chars).
- ⚠️ `GET /api/projects/:id/preview` → 404 on production (preview is served via `/published/:id/...`).
- ⏸ **Android/iOS** parked by user decision.
- ⚠️ `deploy.sh` **worker branch is broken** (see §6.2).
- ⚠️ Hive control panel `http://localhost:3141` is **not** systemd-managed — dies on reboot.
- ⚠️ User's sudo password was shared in chat (`Izzy@1299`) — **recommend changing it.**

---

## 8. HIVE — HOW TO DRIVE IT

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
