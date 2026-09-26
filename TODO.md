# TODO — both apps (updated 2026-09-26)

Status legend: `TODO` not started · `WIP` agent working · `DONE` verified live · `BLOCKED` cannot proceed

Every item names the agent that owns it. No item is DONE until a live HTTP/browser number is pasted next to it.

---

## A. CREATESTUFF — make it actually do something

| # | Task | Agent | Model (all $0) | Status | Proof |
|---|------|-------|----------------|--------|-------|
| C1 | **Fix the 9 dead buttons** found by audit: `Create one free`, preview-mode toggle ×2, `Download ZIP`, `+ New file`, `Save file`, `Connect it`, `Save`, `Save keys` — wire each to a real handler or remove it | **Forge** | nemotron-3-ultra-free | WIP | launched 2026-09-26 05:52, pid `.jobs/forge.pid`, prompt `.jobs/p-forge.txt`, watchdog every 30 s |
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

## C. Cross-cutting

| # | Task | Agent | Status |
|---|------|-------|--------|
| X1 | Watchdog: check every agent every 30s, kill+reassign on timeout | Curator | DONE — `watchdog.sh` running detached (`setsid nohup ./watchdog.sh 30 60`, log `.jobs/watchdog.log`), reports per-agent bytes/growing-idle/FINISHED each cycle |
| X2 | Nothing marked DONE without a live number | Mnemonic | standing rule |

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

Commits this session: `9422f12` `4f041a0` `5e22436` `03ac7a2` `f17a912` `92dbff4` `2a85395` `c23b01b` `0d94850`.

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
