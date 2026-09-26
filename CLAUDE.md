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
| `fashionistas-api` redeploy | needs a deploy token with D1 scope |

---

## 8. STATUS — what is DONE (with proof) and what is LEFT

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

**createstuff.ai + app.createstuff.ai** — both deployed from `apps/createstuff-marketing/`, sha256-verified:

| Fix | Proof |
|---|---|
| **A4** builder overflowed (416px > 390px) | `DEFECT A4` present live on both domains. |
| **A5** chat input only 245px | `DEFECT A5` present live. |
| **A6** mobile landed on `#dashboard` not `#builder` | `DEFECT A6` present live. |
| Broken apps could be published | Publish guard now requires **both** `missingAssets()` **and** `siteOk()`. Harness **19/19**. GitHub-import / manual-upload path was the bypass. |
| Bare `prompt()` asking users for a GitHub token | Full in-app dialog: 6 numbered steps, real `github.com/settings/tokens` link, `repo` scope, `type="password"`, masked to last 4, Disconnect, plain-English errors. Harness **7/7**. Live `app.js` is **byte-identical** to local (115,431 B) and the native prompt copy is gone. |
| Landing page lied | Fake `aggregateRating 4.8/1263` removed; banned-word scan = 0; `data-tip` **0 → 43**. |
| app-host served 13 asset types as `application/octet-stream` | `webp/mp4/woff2` etc. now correct types — with `nosniff` the old behaviour made browsers refuse them. Before/after harness pasted in the agent log. |
| Landing copy honesty | Provider names, `Free forever`, `permanent`, `in 60s`, `high-converting` all removed or made measurable. |

**Infrastructure**
- `external_directory` was `ask` → headless auto-reject killed agents. Fixed to `allow`; proven with a live `PERMISSION-OK` run.
- **Git guard** at `.jobs/bin/git` refuses `reset/clean/checkout/stash/restore/revert` (exit 75). Reason: an agent's `git stash … checkout … stash drop` destroyed three finished jobs. Proven: `git reset --hard HEAD` → `BLOCKED`.
- Watchdog rewritten: infinite by default, self-restarting, flags STALLED, prints the root-cause line per dead job. **Running.**
- `status.sh` → `STATUS.html`, auto-refresh every 15s.
- LSPs installed to `~/.local` and enabled: html, css, json, typescript.
- Handoff committed and **pushed** (HEAD == `origin/master`).

### LEFT to do

**fashionistas**
1. ~~Shop renders~~ — done. Still unverified: **buyer↔seller messaging end-to-end between two accounts** (quill added `threadScreen`, but no two-account walk has been run). Label **untested** until someone walks it.
2. **Logged-out `unauthorized` view.** Measured on the live site: `home`, `closet`, `xl` render the raw 12-character string `unauthorized` with **0 buttons** for a visitor who is not logged in. They must show a login prompt instead. *(Measured before this deploy; re-measure before fixing.)*
3. Camera capture stays **untestable** here — the embedder auto-denies `getUserMedia` (`NotAllowedError`). Never claim it works.
4. **Shopping cart: open decision.** Revenue is our affiliate links on other marketplaces, so a cart would collect money we never touch. Recommendation was **no cart until there is checkout**. Needs a yes/no.

**createstuff**
1. **390px width never measured in a real viewport** — desktop browser only reports 975px. A4/A5/A6 are shipped and syntax-clean but the phone fit is still **untested**.
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
