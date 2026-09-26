# TODO — both apps (updated 2026-09-26)

Status legend: `TODO` not started · `WIP` agent working · `DONE` verified live · `BLOCKED` cannot proceed

Every item names the agent that owns it. No item is DONE until a live HTTP/browser number is pasted next to it.

---

## A. CREATESTUFF — make it actually do something

| # | Task | Agent | Model (all $0) | Status | Proof |
|---|------|-------|----------------|--------|-------|
| C1 | **Fix the 9 dead buttons** found by audit: `Create one free`, preview-mode toggle ×2, `Download ZIP`, `+ New file`, `Save file`, `Connect it`, `Save`, `Save keys` — wire each to a real handler or remove it | **Forge** + orchestrator | nemotron-3-ultra-free | **DONE** | Every button clicked live 2026-09-26 ~21:00, **0 JS errors**: `Create one free` → submit "Create Account" + name field appears + link "Back to sign in", click again → back to "Sign In" (round trip) · phone preview → frame `375px/r24px`, desktop → `none/r8px`, exactly **1** active at a time · `Download ZIP` → real blob anchor **`project-159.zip`** + toast "ZIP downloaded" (empty project → "No files yet — there is nothing to download") · `+ New file` → prompt "File path:" default `styles.css` → path field filled, editor cleared · `Save file` → `POST /files` **201** + toast "Saved index.html" + **server read-back byte-identical (10,965 B)** · `Connect it` → toast "Type an address first" · `Save` → toast "Saved" + **server read-back name change → restore** · `Save keys` → localStorage set then cleared + toast "Keys saved" |
| C8 | **Settings "Save" always failed** (found by clicking C1) — front end PUTs `/api/auth/me`, worker only had GET → **404 every time** | orchestrator | $0 | **DONE** | `PUT /api/auth/me` added (name/email validation + uniqueness). Live: PUT → **200**, server read-back `Loop Tester R2`, restored to `Loop Tester`, `ok:true`; redeploy regression passed |
| C9 | **File DELETE destroyed whole projects** (found by clicking C1) — no file route existed; `DELETE /api/projects/165/files/index.html` matched the generic project-delete, parsed id 165, wiped files+builds+project row and answered `{"ok":true}` | orchestrator | $0 | **DONE** | Route split: file path → deletes **one** file (`deleted:1, files_left:0`, **no cascade**); path-less delete → **400**. Live E2E: create 167 → file delete → **project still listed (28)** → project delete → gone (27), **netChange 0**, project 121 untouched |
| C10 | **Incident, reported as-is**: my own C1 probe used that broken file-DELETE and destroyed project **165 `audit-09261536`** (empty scratch project, created 15:37, **0 files when I found it** — list went 28 → 27). Its files/builds are gone; nothing referenced the project (grepped) so it was not recreated. C9 is the fix so it cannot recur | orchestrator | $0 | recorded | evidence: project list 28 → 27 after the DELETE; source line `DELETE FROM projects WHERE id=?` matched by prefix |
| C2 | **Put the finished app in the user's face.** After build+publish, one unmissable panel: live URL + big **OPEN YOUR APP** button that persists | **Forge** | nemotron-3-ultra-free | DONE | browser: publish → "Your app is live" + url, copy → "Copied", close → aria-hidden, re-publish → reappears 1001 ms; **build → "Your app is ready to go online" with no url at all**; "Put it online" → 1002 ms → live, url `/published/159/index.html` HTTP 200 10,980 B |
| C3 | **Cut the Launch A→Z wall of text.** Same 7 steps, ~70% less prose, collapse to accordions | **Scribe** | space-bunny-free | TODO | byte count + screenshot |
| C4 | **Make the Hive agents real, not labels.** Planner/Frontend/Online must have actual tools (read files, write files, publish) and refuse/redirect when asked something it cannot do (e.g. "log into my GitHub") | **Atlas** | mimo-v2.6-flash-free | DONE | live worker: GitHub request → **HTTP 200 in 2 ms**, no site, files untouched, reply "I cannot log into GitHub from here… Want that?"; Stripe request → same shape. Harness **44/44** (run by me, exit 0), `node --check` PASS. UI: 3502 ms, no "Build failed", chips Planner Done + 8 Idle |
| C5 | **GitHub connection** (repo: `placebetsai`) — real OAuth or PAT, import + push | **Forge** | nemotron-3-ultra-free | TODO | 200 on repo list |
| C6 | Per-user OpenCode Hive: automated provisioning of a personal free-model roster | **Nexus** | nemotron-3.5-lightning-free | TODO | BLOCKED — needs design decision |
| C7 | Logos + animated background + animated words on marketing + app shell | **Pictor** | muse-spark-1.2-contributor-free | TODO | sha256 match live |

## B. FASHIONISTAS — it has no buyer side

| # | Task | Agent | Model (all $0) | Status | Proof |
|---|------|-------|----------------|--------|-------|
| F1 | **Buyer marketplace view** — browse every live listing: photo, price, seller, condition, where else it's listed | **Vogue** | muse-spark-1.3-contributor-free | DONE | `GET /api/market` **HTTP 200, 24,742 B, 70 rows, no auth**; Shop screen renders rows, photo search returns "ON OUR MARKET (8)" with live prices |
| F2 | **Listing detail + Buy** → demo checkout (Stripe/PayPal labelled DEMO, nothing charged) | **Vogue** | muse-spark-1.3-contributor-free | DONE | browser: detail opens → "Sold by demo (@demo) / Buy this item", tip reads **"Start checkout for this item. No money moves yet."**, DEMO label present |
| F3 | **"Sell it here too" toggle** — adds `fashionistas` to `platforms`, makes a seller's item appear in F1 | **Vogue** | muse-spark-1.3-contributor-free | DONE | browser: 9 toggles; listing 115 text **"Sell it here too" → "Stop selling here"**, toast "Now visible to buyers", toggled back → "Hidden from buyers", state restored |
| F4 | **Public market API** `GET /api/market` + `GET /api/market/:id` (no auth) | **Atlas** | mimo-v2.6-flash-free | DONE | **HTTP 200 with no Authorization header**, 70 rows incl. `brand/color/material/ship_city/ship_country/local_pickup` |
| F5 | **Fix the camera** — test for real on fashionistas.ai (last attempt ran on a createstuff tab, invalid) | **Mnemonic** | space-bunny-free | BLOCKED | embedder auto-denies `getUserMedia` → `NotAllowedError`; modal opens, `PS_CAM=true`, honest fallback shown. Kernel camera healthy (`v4l2-ctl`). Needs a real device |
| F6 | Seller screen vs buyer screen — plain-language top switch ("I'm selling / I'm shopping") | **Pictor** | muse-spark-1.2-contributor-free | DONE | browser: Shop renders both chips with tips ("Show your seller tools…" / "See what is for sale…"), `setRole()` routes correctly |
| F7 | Only Stripe/PayPal may be fake. Everything else must return real data. Sweep for stubs | **Sentinel** | nemotron-3-ultra-free | DONE | report `STUBS-2026-09-26.md`: both apps substantially real, **5 stubs** (fashionistas analyze fallback fabricates priceMin/Max 25/75, title optimizer echoes, 6 canned message templates, sample-jacket reference, static Hive status), **6 legitimate demos**. I checked its most actionable claim: **false positive** — `sample-jacket.jpg` resolves in-browser to `https://fashionistas.ai/sample-jacket.jpg` → **HTTP 200, image/jpeg, 289,011 B** |
| F8 | **Category chips did nothing** — clicking a Shop chip threw `Uncaught ReferenceError: canonCat is not defined`; the list never changed (71 price tags before, 71 after). `canonCat` had been declared *inside* `renderShop` while `marketRows` calls it from outside; the `if (S.marketCat)` guard hid it on first load | **Orchestrator** | — | DONE | browser pre-fix: `canonCatGlobal:"undefined"`, `errors:["Uncaught ReferenceError: canonCat is not defined"]`, 4862→4862 chars. post-fix: `canonCatGlobal:"function"`, **71 → 25 price tags on Tops**, `errs:[]`. Harness `tests/harness-categories.mjs` **37/37** incl. a scope assertion and a check that the old nested shape would still be caught |
| F9 | **Closet had no category filter** — a seller with 11 items only got `All / For sale / Sold` | **Orchestrator** | — | DONE | browser: `#closet-cats` now renders `All types, Dresses, Outerwear, Tops, Unfiled` (only types actually owned, plus **Unfiled** for items saved with no category). Click `Outerwear` → **10 → 4 items**; `All types` → back to **11**, new item visible, `matches:1`. Stale selection auto-resets when that type no longer exists |
| F10 | **Saving a listing could die silently** — `renderListingForm` pre-selected a chip only when a value already existed, so a brand-new item had no `.on` node and `$("#f-cat .on").textContent` threw; the seller saw nothing happen | **Orchestrator** | — | DONE | browser: form with `category:null, condition:null` now pre-selects `Tops` / `Good`; picking `Dresses` sets `catAfterPick:"Dresses"`; save → toast **`Added to your closet ✓`**, `stillOnForm:false`, `errorsDuringSave:[]`, item appears in Closet and is returned by the Dresses filter. Reads made null-safe with fallbacks in both `saveListing` and the manual sheet |
| F11 | **Real hierarchical categories + subcategories, like Craigslist/eBay** — superseded the flat chips from F8/F9. 8 departments → 40+ subcategories, stored as a slash-joined path in the existing `category` column (remote D1 is read-only, so `ALTER TABLE` is impossible — `7403`). `TAX_LEGACY` maps every old flat word, no data rewrite. Both Shop and Closet get breadcrumb + department + sub-type drill-down with live counts; listing form, manual sheet and price estimator take a department `<select>` then subcategory chips, department **required** before save | **Orchestrator** | — | DONE | Harness `tests/harness-categories.mjs` **67/67**. Live: `72 items` → click *Women's Clothing* → `58 items in Women's Clothing` + 7 sub-chips with counts → click *Tops & Shirts* → breadcrumb `All departments › Women's Clothing › Tops & Shirts`, `25 items…`, grid **25**, `aria-pressed` set, `errs:[]`; tapping the active step climbs one level back (→ `72 items`). Closet: breadcrumb `All types › Women's Clothing`, subs `All Women's Clothing 7 / Tops & Shirts 2 / Dresses 1 / Outerwear 4`, grid **11 → 7**. Worker `/api/market` accepts path, department or legacy leaf. Deployed, sha256 match **`c417f408…` 343,171 B** |
| F12 | **Visual layer for buyer + seller screens** — animated backdrops, kinetic (moving) words, graphic cards with words, generic marks where there is no photo. Built on the brand asset pack that was shipped but **never wired in** (`fashionistas-bg-aurora-animated.svg`, `-bg-ribbon.svg`, `-monogram-animated.svg` had **0 references** before this) | **Orchestrator** | — | DONE | Buyer hero `Find your next [vintage→statement piece→designer find→one-off→steal]` — active word observed **rotating** (`vintage` → `statement piece`); eyebrow + 4 tags + 2 CTAs. 8 department **graphic cards**: gradient + drawn mark + word + count, in a swipeable rail (8 cards, `--a/--b` set per department). Seller hero `Turn your closet into [cash→a shop→a stall→a side income]` + stat strip counting up from `/api/analytics`: **11 for sale · 5 sold · $276→$277 listed value** (caught mid-animation, and `5 sold` now matches the home screen — it previously derived sold from active listings and always said **0**). All 3 assets **HTTP 200**. **390px: no page-level horizontal overflow** (`documentElement.scrollWidth` **375 ≤ 390**), hero clamped **32px → 23.4px**, cards **132px**, rail genuinely swipeable (1137px content / 347px viewport), `pageLevelOverflowCount` **0** on both screens. 0 JS errors throughout |

## C. Cross-cutting

| # | Task | Agent | Status |
|---|------|-------|--------|
| X1 | Watchdog: check every agent every 30s, kill+reassign on timeout | Curator | DONE — `watchdog.sh` running detached (`setsid nohup ./watchdog.sh 30 60`, log `.jobs/watchdog.log`), reports per-agent bytes/growing-idle/FINISHED each cycle |
| X2 | Nothing marked DONE without a live number | Mnemonic | standing rule |

---

## E. PLACEBETS + MARKETPICKS — missions 1–3

Status as of 2026-09-26 20:30 UTC. Detail + evidence lives in `Placebetsai-src/FIXES-2026-09-26.md`.

| # | Task | Status | Proof so far |
|---|------|--------|--------------|
| P1 | **Mission 1 — placebets data freshness** (odds, edges, injuries, comparisons) | DONE (audited live) | `/api/odds` `updatedAt` = today, **233 events / 7 sports / 20 live / 11,810 odds values**; `/api/edges` + `/api/injuries` today; `/api/odds-comparison` 336 rows; **307/307** team-logo URLs HTTP 200 |
| P2 | **News pipeline — empty feed root-caused and rebuilt** | DONE | cron **never wrote a row** (the doc's "just run it" advice could not have worked); rebuilt with **12 fallback-chain slots + Wikipedia + Grokipedia**; ingest `saved:54` → re-run **`saved:0`**; maintenance `clamped:9, relinked:20, deduped:18` → second run **all zeros**; `/api/news` **30 items / 15 sources / 0 future-dated / 0 bad links**; new **Top stories rail** browser-verified with screenshot; commits `4bd4f06` `4ec115a` `3fbea45` |
| P3 | **Mission 2 — content current + accurate image/logo cards on marketpicks** | TODO | not started (placebets side done: logos 307/307, news real) |
| P4 | **Mission 3 — audit both sites vs best-in-industry + money potential** | TODO | — |
| P5 | Known-empty endpoints: `/api/trending` → `topics: []`, `/api/kalshi` → `source: "unavailable"` | TODO | observed live 2026-09-26 |
| P6 | React error #418 (hydration text mismatch), placebets homepage only | TODO | **pre-existing, not from P2**: reproduced in a build where a bundle scan proved the rail absent from every shipped chunk; `/compare` shows no #418; needs a non-minified trace — see FIXES §5.5 |
| P7 | Google News article links (JS-redirect URLs) not browser-verified here | TODO | proxy returned `ERR_TUNNEL_CONNECTION_FAILED` on several unrelated domains during the test; minority source (1 primary slot + 3 fallbacks) |
| M1 | marketpicks defect fixes | TODO | no changes made yet |

## F. Cross-cutting — still open from the original brief

| # | Task | Status |
|---|------|--------|
| Q1 | Two-account buyer↔seller messaging walk on fashionistas | **untested** — must be run and recorded honestly |
| Q2 | Does fashionistas need a shopping cart/checkout? (recommendation on record: no cart until checkout exists) | awaiting your answer |
| Q3 | `tests/e2e/run.mjs` | **not written** (`tests/e2e/` is empty — not a working command) |
| Q4 | Production `forge-api` / `api.createstuff.ai` undeployed (third Cloudflare account, no token) | BLOCKED |
| Q5 | Camera path | BLOCKED — embedder auto-denies `getUserMedia`; stays labelled untested |

---

## D. Shipped and browser-verified 2026-09-26 (this session)

| What | Measured proof |
|---|---|
| Landing nav → three real sections in nav order | `#land-how` / `#land-ai` / `#land-shops` land at viewport top **82** (nav bottom 67); distinct scroll anchors 699 / 1241 / 1968; doc height 1506 → 3103 |
| Landing mobile menu | 390 px iframe: burger `display:grid` → tap → links `flex`, `aria-expanded=true`; tapping a link **closes** the menu and sets `hash=#land-how` |
| Logo `.ai` suffix | `bottom:45%`, font `clamp(13px,2vw,17px)` → measured **16 px**; `.ai` baseline y163 vs wordmark baseline ≈160 |
| Shop by photo — camera path | "Take a photo" opens modal, **view stays Shop** (was being yanked to Snap), `PS_CAM=true`; modal Files button routes to the photo-search picker; on denial shows `NotAllowedError` fallback |
| Shop by photo — search | in-browser E2E: 385,371 B photo → identification "denim jacket / Light Blue / Outerwear, 80% sure" → **read in 2.7 s → 8 own-listing matches** + marketplace links |
| Map screen | Leaflet loads, `.leaflet-container` present, **2 markers, 9 tiles**, listing row with km + Directions; empty state now draws a real map instead of a text placeholder |
| Affiliate panel | 3 verified programmes with **live sign-up links** (eBay 200, Etsy 200, Grailed loads in-browser), honest "no programme found" note for Depop/Poshmark/Mercari + Vinted vouchers, dated 26 Sep 2026 |
| Hover tips — createstuff | 20 buttons / 27 anchors / **16 inputs** all tipped (78 `data-tip`); hovering `#login-user` fills `#cs-tip` with `display:block, opacity:1` |
| Hover tips — fashionistas | 141/141 buttons tipped (196 `data-tip` total); hover creates `#tip-bubble.on` at opacity 1 |
| "How your buyer gets it" | fieldset renders 3 plain-English options + green "No Shopify, no website, no subscription" note; `f-city` keeps `autocomplete=address-level2` |
| Hive relay restored | relay `127.0.0.1:8787` + new tunnel `ppc-cherry-mortality-organizational.trycloudflare.com` → `/health` **HTTP 200, 0.59 s**; `HIVE_URL` re-put on **both** workers |
| Chatbots back on real agents | `POST /api/chat` → **`source=agent`** in **2.63 s** (guide) and **2.73 s** (ideas), HTTP 200 |
| **A build can no longer ship a page that opens broken** | Found by running it: project 159's writer returned `index.html` alone while it links `styles.css`/`script.js` → publish 200 but both assets **404**. Now `missingAssets()` → a second editor call for those files by name → honest failure if still missing → `POST /api/ai/publish` **409** on a stored broken set. Proof: harness **9/9**; project 160 generate **200, 3 files, 29,768 chars**; publish **200 in 551 ms**; assets **200/12,740 · 200/13,330 · 200/3,768 B**; project 159 publish **409** naming both files. *Second-chance recovery call: coded + checked, not yet observed firing live.* |
| Refusals are answers, not failures | client showed `"Build failed: The model returned no usable files."` for a correct refusal. Now status `answered`, bar reads "No site was built - the answer is above.", no "Press Put online", agent chips driven by which agent actually logged (was lit by **index**, showing "Architect/Backend Done, Frontend Working" on a refusal). Measured 3502 ms GitHub / same for Stripe; real build → chips planner/frontend/git/fix Done, rest Idle |
| **fashionistas category tree + visual layer** | Harness **67/67**. Live drill `72 → 58 → 25 → 72`, breadcrumb `All departments › Women's Clothing › Tops & Shirts`, 8 graphic department cards with per-department counts, seller stats `11 / 5 / $277` counting up from real analytics, all 3 brand assets **HTTP 200**, **390px no horizontal overflow (375 ≤ 390)**, **0 JS errors**. Deployed sha256-matched **`c417f408…` 343,171 B** |
| **placebets news: real feed + real rail** | Ingest with fallback chains: `84` headlines, `17` sources incl. **Wikipedia + Grokipedia**, idempotent re-run `saved:0`, link maintenance `relinked:20/deduped:18` → `0/0`, `/api/news` `count:30` `generatedAt` fresh `future-dated:0` `&amp;=0` dup-links `0`, rail browser-verified: 8 unique cards / 4 hosts / Wikipedia+Grokipedia alternating / tips+rel ok / exact-text copy check / screenshot captured. Commits `4bd4f06` `4ec115a` `3fbea45` |

Commits this session: `9422f12` `4f041a0` `5e22436` `03ac7a2` `f17a912` `92dbff4` `2a85395` `c23b01b` `0d94850` `0b186a6` `0584633` `cb5bd6f`.

---

## Agent roster (Nexus Hive, all free — $0.00 in/out)

| Agent | Role | Model |
|---|---|---|
| Atlas | Full-stack lead, both apps | mimo-v2.6-flash-free |
| Vogue | Fashionistas specialist | muse-spark-1.3-contributor-free |
| Pictor | Brand, logos, design | muse-spark-1.2-contributor-free |
| Forge | CreateStuff engine | nemotron-3-ultra-free |
| Nexus | Infra, deploy, D1 schema | nemotron-3.5-lightning-free |
| Mnemonic | QA at scale | space-bunny-free |
| Sentinel | Security / code review | nemotron-3-ultra-free |
| Curator | Docs + watchdog | ling-3.0-flash-fin-free |
| Ledger | Marketplace economics | ling-3.0-flash-fin-free |
| Scribe | Copy + SEO | space-bunny-free |
