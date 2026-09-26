# CLAUDE.md — handoff for Claude (and any other agent)

Read this before touching anything. It is the source of truth for **how this
project is built, verified and shipped**. If something here contradicts what
you assumed, this file wins.

Last updated: 2026-09-26.

---

## 1. How files are stored and shipped (the important part)

**Local-first. GitHub is a backup, not the pipeline.**

| Question | Answer |
|---|---|
| Where do the files live? | On this machine, under `/home/billionaremaker/Documents/Default Project/` |
| How does a change reach users? | `./deploy.sh` → `wrangler` → Cloudflare |
| Is GitHub in the deploy path? | **No.** `deploy.sh` line 5 says it outright: *"NO GitHub. Credentials live in `.secrets/cf.env`."* |
| Is GitHub used at all? | Only as a **read/write backup remote**. Nothing deploys from it. |
| Is GitHub already cloned here? | **Yes — 6 clones**, all with `github.com/placebetsai/*` origins (table below) |

So: edit files **here** → verify **here** → deploy **here** with wrangler.
Do not push to GitHub to make something live. Do not expect a GitHub Action to
build anything. There is no CI/CD step between your edit and the live site.

### The 6 clones

| Local folder | GitHub remote | Branch | In deploy path? |
|---|---|---|---|
| `nexus-ai-suite/` | `placebetsai/nexus-ai-suite` | `master` | **Yes** — apps + workers + `deploy.sh` |
| `Placebetsai-src/` | `placebetsai/Placebetsai` | `main` | Yes — placebets.ai (Next.js) |
| `marketpicks-ai/` | `placebetsai/marketpicks-ai` | `live-source` | Yes — marketpicks.ai (Next.js) |
| `placebets-ai/` | `placebetsai/placebets-ai` | `main` | Legacy small static site |
| `fashionistas-ai/` | `placebetsai/fashionistas-ai` | `main` | Legacy |
| `createstuff-ai/` | `placebetsai/createstuff-ai` | `main` | Legacy |

**Backup staleness check (2026-09-26):** `nexus-ai-suite` was **11 commits
ahead** of `origin/master` and 0 behind. `Placebetsai-src` was 0/0. That means
the GitHub backup is currently behind reality — pushing is a backup action,
never a deploy action.

### Deploy commands

```bash
cd nexus-ai-suite
./deploy.sh pages  <project-name> <dir>    # static site to Pages
./deploy.sh worker  <worker-name> <dir>    # a Worker
./deploy.sh env                            # which Cloudflare accounts are wired
./deploy.sh list                           # federation registry
./deploy.sh --dry-run <action> ...         # print the exact command, don't run it
```

A deploy only exits 0 when **both** are true:
1. wrangler returned 0 (printed as `>> wrangler exit code: N`), and
2. an independent `curl` check saw the expected content.

wrangler hangs after a successful deploy on this machine, so exit 124 from the
180s cap is treated as **INDETERMINATE** — the curl verification decides.
That is deliberate. Do not "fix" it by removing the verification.

Wrangler is at `/usr/local/bin/wrangler`.

---

## 2. Never expose the machinery to end users

The products never mention their own tooling. Not in copy, not in buttons, not
in error messages.

**Banned in any user-visible string:** `OpenCode`, `Hive`, `Cloudflare`,
`Workers AI`, `R2`, `D1`, `Next.js`, and any model or provider name.

The product is called **"the Agent"**. Storage is "your account". A URL is "a
shareable link".

---

## 3. Honesty rules (non-negotiable)

These exist because unverified claims were shipped before and had to be
publicly retracted.

1. **Never claim a feature works without pasting the evidence** — the actual
   command output, the actual HTTP status, the actual pass count.
2. **Anything you could not test gets the literal word `untested`** next to it.
   Untested is fine. Untested-and-claimed-working is not.
3. **No superlatives** (`best`, `fastest`, `#1`, `most powerful`,
   `free forever`, `permanent`) unless you can cite the measurement. Remove
   them otherwise.
4. **No fake live indicators.** If there is no live feed, label the value as an
   example instead of showing a `LIVE` badge.
5. **No emoji used as UI.** Buttons carry plain-English labels.
6. **Every interactive control** (button, link, chip, input, tab) carries
   `data-tip="plain English sentence"` **and** `title="same sentence"`.

---

## 4. Verification gate — run this before saying "done"

```bash
# HTML with inline scripts
python3 -c "import io,re;h=io.open('FILE.html',encoding='utf-8').read();\
s=re.findall(r'<script>(.*?)</script>',h,re.S);\
[io.open('/tmp/x%d.js'%i,'w',encoding='utf-8').write(x) for i,x in enumerate(s)]"
for f in /tmp/x*.js; do node --check "$f" && echo "OK $f"; done

# plain JS / Workers (they are ES modules)
cp workers/NAME/src/index.js /tmp/w.mjs && node --check /tmp/w.mjs

# shell
bash -n script.sh
```

`node --check` passing is the floor, not the finish. Behaviour needs a harness
that actually exercises the change and prints a pass count.

**Regression suite:** `node tests/e2e/run.mjs` — intended to exit non-zero on
any failure. *(Status 2026-09-26 10:40: **not written yet**; the agent writing
it had not finished. Treat this line as a TODO, not as a working command, until
the file exists and you have run it yourself.)*

### Testing a phone width when the browser has no viewport tool

There is **no resize / device-emulation tool** in this harness — the desktop
window only ever reports its real width (975px+), which is why "does it fit at
390px?" has stayed untested for months. It *is* testable, and it has now been
done on fashionistas (buyer and seller screens):

inject a **same-origin 390px-wide iframe**. Media queries inside an iframe
evaluate against **the iframe's** width, not the window's, so `@media
(max-width:390px)` fires for real.

```js
const f = document.createElement('iframe');
f.src = location.origin + '/app';            // SAME origin, or you cannot read it
f.style.cssText = 'position:fixed;left:0;top:0;width:390px;height:740px;border:0';
document.body.appendChild(f);
// wait for #screen inside f.contentDocument, then:
f.contentWindow.innerWidth                                  // -> 390
f.contentDocument.documentElement.scrollWidth               // <= 390 means no h-overflow
```

Measure **`documentElement.scrollWidth > innerWidth`** for page-level
horizontal scrolling. Do **not** count children of an `overflow-x:auto` rail or
an `overflow:hidden` hero — they legitimately sit outside the viewport; that is
the scroll container doing its job. Write a per-element scan, then subtract
`.catrail`/`.catcard`/`.hero-mono` before reporting a number.

Gotcha: the app defines a global `$`, so `$()` inside your test script
silently selects from the **outer** document. Always define your own
frame-scoped `q`/`qa` against `f.contentDocument`.

---

## 5. Running a parallel agent

Agents run as **detached OS processes**, not as tool calls, so they survive
user input:

```bash
cd nexus-ai-suite
./agent-run.sh <id> .jobs/p-<id>.txt <free-model-name>
# logs:  .jobs/<id>.log      pids: .jobs/<id>.pid
# status: ./status.sh  → STATUS.html (auto-refresh board)
# watch:  ./watchdog.sh (30s, infinite, self-restarting)
```

### Rules that are load-bearing — breaking these kills the agent

| Rule | Why |
|---|---|
| **Never `cd` in a shell command** | cwd is already the repo root |
| **Never use an absolute path inside a shell command** | trips an `external_directory` permission, which a headless runner **auto-rejects**, killing the agent mid-task |
| **One agent = one file** | two agents editing one file clobber each other |
| **No destructive git** | enforced, see below |
| **Never deploy or `git` from an agent** | I verify and deploy myself |

### The git guard (why it exists)

On 2026-09-26 an agent ran `git stash … git checkout -- … git stash drop` and
**destroyed three other agents' finished, uncommitted work**. Reflog evidence:
`b6e72be reset: moving to HEAD`.

`.jobs/bin/git` now refuses `reset`, `checkout`, `clean`, `stash`, `restore`,
`revert` with exit 75 and an explanation. `agent-run.sh` prepends that directory
to `PATH`, so every agent inherits it. Read-only git (`status`, `diff`, `log`,
`show`) passes through. **Verified:** `.jobs/bin/git reset --hard HEAD` →
`BLOCKED by git guard`, exit 75.

### Permissions

`~/.config/opencode/opencode.jsonc` sets `"external_directory": { "*": "allow" }`
because `ask` under a headless runner becomes an auto-reject.
`doom_loop` is deliberately left on `ask` as a circuit breaker.

### LSP enabled

`vscode-html-language-server`, `vscode-css-language-server`,
`vscode-json-language-server`, `typescript-language-server` are installed into
`~/.local` (no sudo) and configured in the same config file. Use them — parser
diagnostics beat eyeballing a 300KB HTML file.

---

## 6. Live sites and test logins

| Site | URL |
|---|---|
| fashionistas app | `https://fashionistas.ai/app` |
| fashionistas marketing (**never** overwrite with the app) | `https://fashionistas.pages.dev` |
| createstuff app | `https://app.createstuff.ai` |
| createstuff marketing | `https://createstuff.ai` |
| placebets | `https://placebets.ai` |
| marketpicks | `https://marketpicks.ai` |
| fashionistas API | `https://fashionistas-api.fashionistas1979.workers.dev` |
| createstuff API | `https://createstuff-api.fashionistas1979.workers.dev` |

- fashionistas login: `POST /api/auth/login` → `demo` / `Primetime2026!` (user id 50)
- createstuff login: `POST /api/auth/login` → `loop@createstuff.ai` / `QApower2026!` (user id 12)
- localStorage keys: `cs_auth`, `cs_token`, `cs_user`

Test projects: **157** (broken set → publish 409), **158** (3 files → publish
200), **159** (`Maple & Mutt Dog Grooming`), **160** (`Spoke & Spring`, all 200).

---

## 7. Known blockers — do not rediscover these

| Blocker | Consequence |
|---|---|
| Production `forge-api` / `api.createstuff.ai` | undeployable — third account, no token |
| `wrangler d1 execute --remote` → error `7403` | no D1 cleanup, **no ALTER TABLE**. Workaround: fresh project per test |
| Camera capture | embedder auto-denies `getUserMedia` (`NotAllowedError`) — stays **untested** |
| Workers AI daily quota (10,000 neurons) | exhausted until ~20:00 UTC |
| `quick-tunnel` hostname | random per restart → `HIVE_URL` must be re-set on both workers after any restart |
| `fashionistas-api` redeploy | works with `CF_API_TOKEN` via `./deploy.sh worker` (verified 2026-09-26, version 5df1dd0b); only D1 SQL (`d1 execute`) is blocked |

---

## 8. STATUS — what is DONE (with proof) and what is LEFT

> **MarketPicks + PlaceBets (2026-09-26):** see `HANDOFF-2026-09-26.md`. That covers
> real day-change math, congress tape labels, constant-speed tickers and a conversational
> bot on marketpicks, plus /ev, /movers, /books-vs-kalshi, the track-record delete guard,
> the laptop Kalshi timer (`placebets-kalshi.timer`) and the chatbot cap fix on placebets.
> **News pipeline (later same day):** the ingest cron **never wrote a row** — the fixes doc's
> "just run it" advice could not have worked. Rebuilt with fallback chains + Wikipedia +
> Grokipedia and given the homepage a real rail. Full evidence in
> `Placebetsai-src/FIXES-2026-09-26.md` §5 and HANDOFF §10.

### DONE and verified on the live sites — 2026-09-26

**fashionistas.ai** — deployed, sha256-verified against local, then driven in a browser:

| Fix | Proof |
|---|---|
| **A1** duplicate `Tops`/`tops` chips | Live browser walk: **10 chips** = role switch + `All` + exactly 7 categories (`Accessories, Athletic, Bottoms, Dresses, Outerwear, Shoes, Tops`). One `Tops`. |
| **`canonCat` slash-key bug** (found by me, not an agent) | Lookup was `"/tops"` but the API sends `"Tops"` → every lookup missed → `.filter(c=>c)` dropped everything → **zero chips**. Harness **8/8**, real payload yields 7 chips. |
| **`renderShop` crash — `Set.filter is not a function`** (found by me, not an agent) | `[...new Set(X).filter(c=>c)]` called `.filter` on the **Set**. This aborted `renderShop`, so the Shop sat on **"Loading what is for sale…" forever**. Console showed the TypeError at `renderShop:1772`. Fixed to `[...new Set(X)].filter(c=>c)`. Harness **6/6**, including a sensitivity check that proves the test still detects the original broken form. |
| **A3** affiliate card told users to go sign up for affiliate programs | Live: old card gone (`Partner Network` absent), new card present (`It may be listed on these shops`) with eBay/Etsy/Depop/Poshmark/Vinted/Grailed search links and `rel="noopener noreferrer sponsored"`. |
| **Map at 390px** (TODO D) | `@media (max-width:390px)` block shipped. |
| **API category canonicalisation** | `canonCategory` in the worker, read + write side. Harness **12/12** + **13/13**. |
| Deploy proof | `DEPLOY OK`, `sha256 matches apps/fashionistas/index.html (303592 bytes)`. Browser re-walk after deploy: **zero JS errors**, `stillLoading: false`, screen 123 → **4,862 chars**. |
| **Two-level category tree** (departments → subcategories, like Craigslist/eBay) | `TAX` has **8 departments / 40+ subcategories**, stored as a **slash-joined path inside the existing `category` column** — because remote D1 is read-only (`7403`), so `ALTER TABLE` is impossible. `TAX_LEGACY` maps every old flat word; no data was rewritten. `taxPath/taxDept/taxSub/taxLabel/taxMatches/taxQ/taxUnq/canonCat` **must stay at module scope** (declaring them inside a render function caused an earlier `ReferenceError` outage). Harness `tests/harness-categories.mjs` **67/67**. Live walk: `72 items` → *Women's Clothing* `58` → *Tops & Shirts* `25` with breadcrumb `All departments › Women's Clothing › Tops & Shirts`, grid **25**, tap-again climbs one level (→ `72`), `errs:[]`. Closet: `All types › Women's Clothing`, subs `7/2/1/4`, grid **11 → 7**. |
| **Graphic cards + animated backdrops + moving words** (buyer *and* seller screens) | The brand asset pack (`fashionistas-bg-aurora-animated.svg`, `-bg-ribbon.svg`, `-monogram-animated.svg`, icon sprite) was shipped with **0 references** — now wired into hero banners. Buyer hero rotates `vintage → statement piece → designer find → one-off → steal` (**observed changing**); seller hero rotates `cash → a shop → a stall → a side income`. 8 department tiles are gradient + drawn mark + **word + count** in a swipe rail. Seller stats **count up** from `/api/analytics`: **11 for sale · 5 sold · $276→$277**. All 3 assets **HTTP 200**. **390px: no page-level horizontal overflow** (`documentElement.scrollWidth` **375 ≤ 390**), hero clamps **32 → 23.4px**, cards **132px**, rail swipeable (1137/347). `prefers-reduced-motion` honoured. |
| **Two `countUp` definitions — one silently shadowed the other** (found by me) | My new function had the **same name** as the app's existing number-roll `function countUp`. Because function declarations hoist and the later one wins, the seller stats were **never animating**. Removed mine; the stats now use the app's own `[data-count]`/`[data-pre]` roll. **Lesson: grep for the name before defining a function in a 4,500-line inline script.** |
| **Sold count was wrong on the seller hero** | It was derived from `S.listings`, which only holds *active* listings → the seller always saw **0 SOLD** while Home correctly said **5 sold**. Now reads `/api/analytics` via `statsRefresh()`. Browser: hero shows **5 sold**, matching Home. |

**createstuff.ai + app.createstuff.ai** — both deployed from `apps/createstuff-marketing/`, sha256-verified:

| Fix | Proof |
|---|---|
| **A4** builder overflowed (416px > 390px) | Fixed via mobile `.app`/`.main-content` flex constraints (`min-width: 0; box-sizing: border-box`). Live Playwright 390px measurement: `scrollWidth 390 <= 390`, no horizontal overflow. PASS. |
| **A5** chat input only 245px | Builder padding & controls resized. Live Playwright 390px measurement: chat input `257px >= 250px`, send button `40x40px` touch-friendly, voice button `40x40px`. PASS. |
| **A6** mobile landed on `#dashboard` not `#builder` | Hardcoded `renderPage('dashboard')` removed from `init()` and `login-form.onsubmit`. Live Playwright 390px measurement: authed landing hash is `#builder`. PASS. |
| Broken apps could be published | Publish guard now requires **both** `missingAssets()` **and** `siteOk()`. Harness **19/19**. GitHub-import / manual-upload path was the bypass. |
| Bare `prompt()` asking users for a GitHub token | Full in-app dialog: 6 numbered steps, real `github.com/settings/tokens` link, `repo` scope, `type="password"`, masked to last 4, Disconnect, plain-English errors. Harness **7/7**. Live `app.js` is **byte-identical** to local (115,431 B) and the native prompt copy is gone. |
| Landing page lied | Fake `aggregateRating 4.8/1263` removed; banned-word scan = 0; `data-tip` **0 → 43**. |
| app-host served 13 asset types as `application/octet-stream` | `webp/mp4/woff2` etc. now correct types — with `nosniff` the old behaviour made browsers refuse them. Before/after harness pasted in the agent log. |
| Landing copy honesty | Provider names, `Free forever`, `permanent`, `in 60s`, `high-converting` all removed or made measurable. |

**placebets.ai** — deployed and re-measured in the browser (this session):

| Fix | Proof |
|---|---|
| **News feed was empty everywhere** | Root cause was code, not ops: `app/api/cron/ingest-top-stories/route.js` fetched RSS and returned JSON **without a single INSERT**, so "run the cron" (the advice recorded in the fixes doc) could never have worked. Rebuilt: 12 fallback-chain slots (ESPN/Yahoo/BBC/Guardian/Sky/CNBC/Bloomberg/MarketWatch/NPR/Google News…), **Wikipedia** featured feed, **Grokipedia** via `/search` (it has no feed — every endpoint 404s, sitemap `lastmod` stops Jan 2026). Proof: ingest `84` headlines / `17` sources → re-run **`saved:0`** (idempotent); maintenance `clamped:9, relinked:20, deduped:18` → second run **all zeros**; `/api/news` **30 items, 15 sources, `generatedAt` fresh, 0 future-dated, 0 `&amp;` links, 0 duplicate links**. |
| **Every ticker headline was a hardcoded fallback** | `/api/news` returned `link`/`published_at`; `NewsTicker` reads `item.url`/`item.publishedAt`. Now both are emitted (snake_case kept), plus `generatedAt` — which both health crons require and which never existed, so the news health check was permanently failing. Browser: 8 real headlines, each to its own distinct publisher URL, 0 hardcoded fallbacks. |
| **Homepage news fetch was dead code** | `HomePageClient` fetched `/api/news` into state **nothing rendered** — and it is imported by no file in the tree. New `components/TopStories.js` (rendered by `SportsbookHomepage`, the component that actually ships) draws the rail: 8 unique cards from 4 hosts, `data-tip`+`title`+`rel=noopener` on every link, "Background reading" chips alternating **Wikipedia / Grokipedia**, exact-text copy verified, screenshot captured. |
| **One source pinned to the top of the ticker** | ESPN stamps headlines up to ~36 min ahead of real time; the ticker sorts newest-first. Future `published_at` values are clamped (a story cannot publish in the future) — live: `clamped: 9`, then `future-dated: 0`. |

**Infrastructure**
- `external_directory` was `ask` → headless auto-reject killed agents. Fixed to `allow`; proven with a live `PERMISSION-OK` run.
- **Git guard** at `.jobs/bin/git` refuses `reset/clean/checkout/stash/restore/revert` (exit 75). Reason: an agent's `git stash … checkout … stash drop` destroyed three finished jobs. Proven: `git reset --hard HEAD` → `BLOCKED`.
- Watchdog rewritten: infinite by default, self-restarting, flags STALLED, prints the root-cause line per dead job. **Running.**
- `status.sh` → `STATUS.html`, auto-refresh every 15s.
- LSPs installed to `~/.local` and enabled: html, css, json, typescript.
- Handoff committed and **pushed** (HEAD == `origin/master`).

### LEFT to do

**fashionistas**
1. ~~Shop renders~~ — done. ~~**buyer↔seller messaging end-to-end between two accounts**~~ — **WALKED & VERIFIED LIVE (2026-09-26)** via `tests/walk-messaging.mjs`: Demo seller (`id: 50`) and testbuyer2026 (`id: 66`), bidirectional send and real-time polling verified in live DOM.
2. ~~**Logged-out `unauthorized` view.**~~ **Re-measured 2026-09-26 → fixed for `closet`.** Opening `My clothes` while signed out now renders `Log in to see your clothes / Sign in to search, sort and manage everything you are selling.` with **3 buttons** (`Log in`, `Create free account`, `Log in as demo seller`) — not the raw 12-char string. `unauthorized` is still *thrown* (line 1344) but every renderer now catches it: `renderAuthPrompt` at lines **1382 / 2348 / 2418 / 2456 / 2502 / 2560 / 2612**, `if (e.message === "unauthorized")` at **2417 / 2501 / 2611**. **`home` and `xl` were not re-measured signed-out this session** — re-measure before calling those done.
3. Camera capture stays **untestable** here — the embedder auto-denies `getUserMedia` (`NotAllowedError`). Never claim it works.
4. **Shopping cart: open decision.** Revenue is our affiliate links on other marketplaces, so a cart would collect money we never touch. Recommendation was **no cart until there is checkout**. Needs a yes/no.

**createstuff**
1. ~~**390px width never measured in a real viewport**~~ — **MEASURED & VERIFIED LIVE (2026-09-26)** via `tests/measure-createstuff-390px.mjs`: A4 (builder scrollWidth 390 <= 390 PASS), A5 (chat input 257px >= 250px PASS, send/voice buttons 40x40 touch target PASS), A6 (narrow viewport landing hash #builder PASS).
2. GitHub connect **network path untested** — `fetch` was stubbed in the harness. A real PAT create-repo/push has never been run.
3. Live GitHub/`publish` click-through by a human.
4. Production `api.createstuff.ai` (`forge-api`) is **undeployable** — third account, no token.

**both**
- `tests/e2e/run.mjs` — **not written** (the agent died). `tests/e2e/` exists and is empty. Do not treat it as a working command.
- Regression baseline for `data-tip` counts.
- D1 cleanup blocked (`wrangler d1 execute --remote` → `7403`), so **no ALTER TABLE** — use a fresh project per test.

### The standing product goal

- **Fashionistas** = a reselling business: snap a photo → AI names/sizes/prices it → cross-post to marketplaces → track fees, postage, profit, orders → buyer↔seller messaging → local pop-up map. Shoppers also see real listings on other marketplaces **through our affiliate links** — that is *one* revenue line, not the whole product.
- **Createstuff** = a layman types an idea, gets a real multi-file app, and publishes it to a public link.
- Both must be **genuinely working and honest**: no fake `LIVE` badges, no unverifiable superlatives, plain-English controls, usable at 390px, `data-tip` on everything.
- Nothing counts as done until it is **deployed and then re-measured in the browser**. A harness pass is the floor, not the finish.

---

## 9. Repository map inside `nexus-ai-suite/`

```
apps/fashionistas/index.html          the shopper/seller app (304KB, single file)
apps/createstuff-marketing/index.html createstuff UI shell
apps/createstuff-marketing/app.js     createstuff front-end logic (102KB)
apps/createstuff/index.html           createstuff landing page
workers/fashionistas-api/src/index.js fashionistas API
workers/createstuff-api/src/index.js  createstuff API (build/publish)
workers/app-host/src/index.js         static host + zone control
hive/                                 parallel agent runner + tests (hive/test/)
deploy.sh  agent-run.sh  watchdog.sh  status.sh
tests/e2e/run.mjs                     regression suite
```

**Partition rule:** exactly one agent per file. `TODO.md`, `CLAUDE.md`,
`deploy.sh` and `agent-run.sh` belong to the orchestrator, not to an agent.
