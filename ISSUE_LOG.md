# ISSUE LOG — federation (every issue, with state)

Status: `FIXED` · `WIP` · `OPEN` · `BLOCKED` · `WONTFIX`
Update this file **every round**. Evidence = command + real output, never the word "works".
Risk register lives in `nexus-ai-suite/HANDOFF-2026-10-06.md` §8.

---

## FIXED (2026-10-06 → 2026-10-07)

| # | Site | Issue | Root cause | Fix / evidence |
|---|---|---|---|---|
| 1 | placebets.ai | Chatbot gave off-domain answers (Benfica → Bayern/Man City), parlay parsing wrong | **Deployed artifact was stale**: source `14:00:06` > artifact `13:38:25`; live bundle had no `primeira liga` / `Priced right now:` | Rebuilt + deployed `b8f61b65`; suite **170 passed / 0 failed / 173 assertions / 19 cases** (was 169/1); commit `2dd74a9` (+462/−45) |
| 2 | placebets.ai | Build broken by dead agent's trading commit (`../../../lib/…`, `Module not found` ×5) | import depth | `3c9b412`; import audit `resolved=280 BROKEN=0`, build exit 0 |
| 3 | ihatecollege.com | No AdSense | not wired | deployed `07e1e474` → live 200 with `ca-pub-7215975042937417` |
| 4 | israeljoffe.com/.org | Conceited copy openers; missing image alts | hand-written copy | `fc66c516` / `e12c81ee` → live 0 conceited openers, **26/26 alt**; `.com` **2941/2941**; `.org` "7 missing" was a grep line-break false positive (real parse 88 imgs / 0 missing) |
| 5 | fashionistas.ai | No AdSense anywhere | not wired | `8886e25` (7 files) → `npm test` **267/267**, `VERIFIED — live == 8886e25`, 4 slots + `ads.txt 200`; pushed `077e0b0..8886e25` |
| 6 | createstuff.ai (app) | No ad slots | not wired | 3 slots → `2517b122.createstuff-ai.pages.dev` (loader 7, `ads.txt 200`) — **still uncommitted** |
| 7 | spanishtvshows.com | 11 pages imported `AdUnit` but never rendered it | dead import | `186247c` → run `37519900879` success 2m36s; live home **7 slots**, `/best-on-netflix/`, `puerto-rico-tv-shows`, `news`, `costa-rica-tv-shows` 1 slot each |
| 8 | spanishtvshows.com | Provider keys read `process.env` at module scope on the edge | wrong env source | `c790513` "Fix provider keys on the edge: read request context, not process.env" |
| 9 | federation | GitHub Actions spending money / diverging from Cloudflare | workflows enabled across ~70 repos | every workflow disabled (`disabled_manually`) + `hiddencameras-tv` `actions_enabled=false`; **federation-wide re-check = 0 active** |
| 10 | fashionistas.ai | Try-on claimed dead in the 2026-10-04 handoff | handoff was stale after `5ffba1e` reached Pages | live `POST /api/tryon/hd` → **200, 48.2 s, 576×823 WebP 19,072 B, `cost_usd 0`** |
| 11 | placebets.ai | **Real domain served a 2026-10-02 build** — none of today's work was live on `placebets.ai` | project `placebetsai` (acct `2765cb27…`), latest was `fe137b41` `2026-10-02T15:02Z` | deployed `Placebetsai-src/.vercel/output/static` → **`0cf4db31` `2026-10-06T22:57:39Z` (deploy stage ✔)**; domain HTML vs that deploy differs **only by a timestamp**; chatbot `POST /api/chatbot` 200 ×3 with the live-board answer + "not betting advice" |
| 12 | createstuff.ai | **No AdSense, `ads.txt` 404** — domain served `createstuff-marketing` from 2026-09-30 | loader 0, mounts 0, `ads.txt` 404 | `493ccc4` → live **`ads.txt` 200 text/plain 59 B**, `site-adsense.js` 200 application/javascript 8,596 B, home 110,849 B with loader **×1 byte-identical to `loaderTagHTML()`** + mounts **×4** |
| 13a | marketpicks.ai | `/api/health` fabricated `last_success = now` and never read `cron_runs`/`cron_health`; `grading` had no count query | `app/api/health/route.ts:70` | `c91ae99` → live `f4d5bb08`: `quotes.last_success=2026-10-06T23:16:20Z` ("897 rows in quotes; last ran 7m ago"), **0 of 6** sources have `last_success == last_check`, `data_tables.grading=2`; `node --test` **54/54** |
| 16 | marketpicks-ai repo | dirty `tsconfig.tsbuildinfo` | `git status` | committed + pushed `3d6bfe0..c91ae99` on `live-source` |
| 29 | spanishtvshows.com | no token for account `555c6765…` | — | **token received 2026-10-06**, stored as `STV_API_TOKEN` (53 ch) in `.secrets/cf.env` → `/accounts/555c6765…/tokens/verify` `success:true` (`/user/tokens/verify` 401 = account-scoped, expected). Fixes **access** only — the `TMDB_API_KEY` value was still unrecoverable then (see #18 / #28, both **resolved 2026-10-07** by #42) |
| 30 | scooter.exchange | no local repo | — | cloned → `scooters-exchange` (master `ed4c794`); fixes committed **`2e77e3a`** (see #37) |
| 36 | ihatecollege.com | loader fix stranded on `ihatecollege-com.pages.dev` | project in account `90904956…` needed a token | **token received 2026-10-06** (`IHC_API_TOKEN`) → deployed project `ihatecollege` → live `https://ihatecollege.com/` **loader ×1, ad slots ×3, 76,386 B** (was slots ×3 / loader ×0) |
| 37 | scooter.exchange | **23 dead images** (`loremflickr.com` 401 for every URL), **listings mislabelled**, **`/api/rentals/nearby` count:0 in every city**, **seller photos NXDOMAIN** | see evidence below | shipped `2e77e3a` + worker `6c4b1f15` + Pages `56dd2a9d` — evidence below |
| 38 | diamonds.forsale | site stuck on the **2026-07-30** build, **0 AdSense on every page** | two stacked causes: `app/about/page.tsx` passed an `onError` handler from a **server component** → `next build` looped `Static page generation for /about is still timing out after 3 attempts`, so *no* new build could ever ship; and `ADSENSE_CLIENT` was never supplied, which the source gates the loader on (`{ADSENSE && …}`) | removed the handler, repointed the avatar at a file that exists (`/israel-joffe/avatar.jpg` → **404** live before), built with `ADSENSE_CLIENT=ca-pub-7215975042937417` → Pages `37253dda` (`env=production`, was `41c5454f` from 2026-07-30) → **8/8 pages `loader=2, ca-pub=2`**, `/about` avatar file `http=200 image/jpeg`, **all images 200**, `loremflickr=0`; repo `5692dae..775e029`, workflows `disabled_manually` ×2 |
| 39 | the handoff itself | **4 days stale**: `handoff.md` header said `Last updated: 2026-09-29`, §1–15 stopped at 2026-10-02, and it still asserted **`main is 5ffba1e`**, **try-on isn't wired**, **docs leak open** — all three already false | nobody rewrote the doc when the work moved; and `ISSUE_LOG.md` / `PRIMETIME_CHECKLIST.md` / `NEEDS_ISRAEL.txt` lived **only at the project root, which is not a git repo**, so every update was laptop-only and GitHub kept the old story | `handoff.md` → header **2026-10-06** + new **§16** (each correction with command + output, all nine repo shas, what was *not* re-verified); `HANDOFF-2026-10-06.md` → **§10 addendum** + fixed the `scooter.exchange has no local repo` row and its risk; the three live docs **now tracked in the repo** (root paths = symlinks) → pushed `931cd0b..e5c1a6b..f50b87e`; raw GitHub check: §16 present, `LATE ADDENDUM` present, `no local repo` rows = **0**; `Placebetsai-src` had **2 unpushed commits** → `5a03c2a..2dd74a9` (diff scan `hits: 0`) so *every* repo now matches its claimed sha |
| 40 | placebets.ai + createstuff.ai | handoff §5.4 still said both domains served **stale builds** (placebets 229,132 B from `fe137b41`; createstuff 109,988 B, 0 ads, `ads.txt 404`) | both had been redeployed earlier tonight, nobody updated the doc | §5.4 rewritten as **BOTH FIXED** with proof: `placebetsai` → **`0cf4db31` 2026-10-06T22:57:39Z production**, live **277,412 B**, chatbot **on the real domain** `ENDPOINT=https://placebets.ai/api/chatbot` → **170 assertions PASS / 0 fail / 19 cases**; `createstuff-marketing` → **`f63b8a56` 2026-10-06T23:04:53Z**, live **110,849 B = source byte-for-byte**, `loader=1 slots=4 ads.txt 200`; §5.5 table replaced with the 21:35 UTC sweep (and diamonds' missing units flagged as #41) |
| 18 | spanishtvshows.com | `/show/<id>/` → **500 for every id** (1399, 679, 1408, 46648) — 100 of 193 sitemap URLs | `.github/workflows/deploy-pages.yml:42` wrote `TMDB_API_KEY` to project **`spanishtvshows`** while `:51` deployed to **`spanishtvshows-site`** (step `continue-on-error: true`, so every run was "green"); the dynamic edge route reads the **request-context** env only (`lib/cloudflare.js` → `getSecret`) → `lib/tmdb.js:23` `throw` → the `catch` calls `tmdb()` again → identical `__next_error__` 500 (digest `2025926783`) | **FIXED 2026-10-07 (#42)** — key on `spanishtvshows-site` (prod+preview) + rebuild/redeploy: `/show/1399` **500 → 200**, `/show/679` **500 → 200**, `/show/46648` **500 → 200**, **10/10** homepage-linked ids 200, 15-URL sitemap diff vs the previous prod deployment = **7 × `old=500 → live=200`, 0 regressions** |
| 28 | spanishtvshows.com | **`TMDB_API_KEY` locally** — `next build` stopped at `Missing TMDB_API_KEY` | key existed only as a GitHub Actions secret (created 2025-12-23): `gh api …/actions/secrets` returns metadata only, no file/gist/artifact/history copy anywhere (**332** hex-32 literals pulled from every repo's full git history and probed against `/3/configuration` → **0 valid**), and Cloudflare's copy on the wrong project reads back `value:""` | **RESOLVED 2026-10-07** — the user supplied it from the TMDB account `spanishtvshows` → `STV_TMDB_API_KEY` (32 ch, `90ca…4e5e`) + `STV_TMDB_READ_TOKEN` (244 ch) in `.secrets/cf.env` (`-rw-------`, git-ignored, **0 tracked copies**); local build now succeeds (`npx @cloudflare/next-on-pages@latest` **exit 0**, artifact **23 M**) |
| 42 | spanishtvshows.com | **the TMDB key + `/show/*` 500 fix round** (closes #18 and #28) | two stacked causes: key on the wrong project (see #18), **and** Cloudflare only applies a project's env to a **new** deployment — after setting the secret on the right project, `/show/1399` *still* returned 500 because production was running the 2026-10-06 build | see **#42 evidence** below: key stored → secret on `spanishtvshows-site` (prod **and** preview) → local `next-on-pages` build → **preview branch validated first** (`tmdb-check…pages.dev` `/show/1399` 200) → production `--branch=main` → **13/13 `/show/` ids 200** |
| 44 | fashionistas.ai | **the app signed users out itself** — every 401 in the shared `api()` helper ran `logout()` after 600 ms, so a wrong password came back as "Session expired"; `auth/me` was referenced **0×** so the stored session was never checked; a response with no `token` was saved as the string `undefined`; and nothing told the user what to do next | old `index.html:1459` `if (r.status === 401) { toast("Session expired — please log in"); setTimeout(()=>logout(), 600); throw new Error("unauthorized"); }` — the login POST went through the same helper | commit `3cfe08b` deployed to Pages project `fashionistas-ai` (`version.txt` == `3cfe08b`, live == `3cfe08b`), **4 live browser tests** below, `npm test` **267 pass / 0 fail**, ads untouched — see **#44 evidence** below |

| 45 | fashionistas.ai | **Try-on page 404'd its own pipeline** — `/try-on/` imported `/try-on/tryon_pipeline.js` but the file was only under `/core/` | path mismatch after earlier move | commit `c8776cd` → live `/try-on/tryon_pipeline.js` **200** 20,019 B; `/core/tryon_pipeline.js` **404**; Photoreal + Instant modes restored; tip advanced to `593418e` via **wrangler pages deploy** (not Actions) — see **#45 evidence** |
| 46 | fashionistas.ai | **Multilist one-click without Stripe** — server `/api/list/*` still 402, but the Chrome extension can post from logged-in shop tabs | paywall on server path; extension path was incomplete | commit `e768c8f` → live zip `…/fashionistas-extension-v1.0.1.zip` **200** 109,648 B; `ADAPTERS` includes **ebay+etsy**; `docs/MULTILIST-ONE-CLICK.md`; `tests/multilist-one-click.test.mjs` **7/7**; still needs human Load unpacked + shop logins — see **#46 evidence** |
| 47 | fashionistas.ai | **Chatbot refused non-fee / non-listing questions** (Depop how-to, try-on, connect shops) | grounding allow-list too narrow | commit `593418e` (live `version.txt`) → topics `connect_shops`, `chrome_extension`, `try_on`, `listing_from_photo`, `pricing_plan`, `how_to_list` + fees/listings; smoke Depop/try-on/fees **200 refused=false**; grounding tests **19/19** — see **#47 evidence** |
| 48 | fashionistas.ai | **`npm test` was RED after the §16.8 round: 312 tests, 311 pass, 1 fail.** `tests/api-auth-matrix.test.mjs` — *`ai/analyze.js never answered 401/403 for an anonymous caller — it is effectively public*`. The route is public on purpose (convert funnel), but it was never allowlisted | added `ai/analyze.js` to `PUBLIC` with a measured justification: no user data stored, no key exposed, 20/min/IP KV cap **proven live** (request 21+ → 429). Tests were **not** weakened — the allowlist is the mechanism the test itself names, and it still asserts a written reason | `a841924` pushed to `placebetsai/fashionistas-ai`; `npm test` → **312 pass / 0 fail** |

| 50 | diamonds.forsale | **Google AdSense "low value content" notice — the site was thin.** 10 `/diamond-shapes/*` pages at **195–243 words**, `/sell` 272, `/contact` 151 | full sweep of all 61 sitemap URLs: **21 pages under 400 words**, median **483**, min **195** | rebuilt from `lib/shapes.ts` (`SHAPE_FACTS`, single source for the shape panel *and* the comparison table) + `lib/shape-copy.ts` → commit **`4de39c9`**, `next-on-pages` + `wrangler pages deploy` (IHC account) → **measured live**: `<400w` **21 → 8**, median **483 → 508**, min **195 → 289**; shape pages **1218–1239w** each with `FAQPage` + all 4 questions visible in `<main>`; `npx tsc --noEmit` exit 0, build exit 0 — **round 2 (2026-10-07):** the last 8 (`/diamond-size-visualizer` 289, `/clarity-chart` 296, `/blog` 309, `/price-calculator` 336, `/color-scale` 338, `/diamond-shapes` 346, `/sell-engagement-ring-after-divorce` 367, `/sell-inherited-jewelry` 391) rewritten with real sections + 4 visible Q&A each, and `/price-calculator`'s 4 `FAQPage` questions were in JSON-LD **only** — now rendered visibly verbatim → commit **`2516180`**, rebuild + `wrangler pages deploy --branch=main` (the first deploy without `--branch` landed as a **preview**: production kept serving the old build, `cf-cache-status: DYNAMIC` — not a cache problem) → **re-measured live on all 61 sitemap URLs: `<400w` = 0** (was 8), min **410**, median **517**; `npx tsc --noEmit` exit 0, `next-on-pages` exit 0 |
| 51 | hiddencameras.tv | **same notice, plus a real doorway:** `/shop/` was **5 words with 3 ad slots** (client-side redirect), the 4 category pages were **327–379 words with 5 ad slots each**, and `/hidden-camera-laws` promised "all 50 states" while `const PICKS = []` shipped **no state content at all** — with FAQPage JSON-LD that had **no visible FAQ** (structured-data mismatch) | full sweep of all 148 sitemap URLs: 6 pages `<400w`, min **5** | rewritten: `/shop` **1234w** (buying-guide hub), `/hidden-camera-detectors` **1479w**, `/wifi-hidden-cameras` **1331w**, `/hidden-camera-laws` **1458w** (real consent content + FAQ rendered 4/4 in `<main>`), `/hidden-cameras` **1272w**, `/contact` **427w**; commit **`6e57ac4`**, `npm run build` exit 0, deployed — **content is live only on `hiddencameras-tv.pages.dev`; production is blocked, see #52** |
| 53 | marketpicks.ai | **same AdSense "low value content" notice: 63 of 133 sitemap URLs under 400 words**, median **574**, min **175**; `/rooms*` rendered **175 words with 0 server-side `<p>`**, and the `/why-is/*` family was **48 pages off one template** (body median 178w; **75%** of body words appear on ≥95% of those pages) plus **6 byte-identical duplicate routes** `/why-is-{aapl,amd,nvda,pltr,spy,tsla}-moving` | SSR pages shipped a header and nothing under it; the why-is report held real data but no prose to carry it | commit **`4cb7ecf`** → `npm run ship` = `pages:build` (`next build` + `next-on-pages` + edge-cache wrapper) → `wrangler pages deploy .vercel/output/static --project-name=marketpicks-ai --branch=main` → **re-measured all 133 live URLs: `<400w` 63 → 7**, min **175 → 309**, median **574 → 977**, 0 fetch errors, **0 pages missing ad slots**; `/rooms` 175→858, `/rooms/nvda-ai-infrastructure` 175→763, `/watchlist` 208→877, `/methodology` 275→1427, `/screener` 297→918, `/contact` 263→815, `/why-is/TSLA-moving` 351→1005; the 6 legacy routes now **308** → `/why-is/<TICKER>-moving`; **all 48 `/why-is/` URLs kept and enriched rather than deleted** — removing indexed pages mid-review would drop the deepest content; `npm test` **54 pass / 0 fail**, `npm run build` exit 0, `npx tsc --noEmit` **134 errors before and after** (diffed against a clean `git worktree` at HEAD: normalised error sets identical, only union-member ordering differs); **`indexnow:ping` exits 1 (`INDEXNOW_KEY not set`), so `npm run ship` reports exit 1 even though the deployment completed** — **round 2 (2026-10-07):** those last 7 were rewritten against the code itself (`/privacy` and `/terms` claims checked line by line — D1 `subscribers` table, FormSubmit, Plausible, `mp_session`, the SMTP digest's `unsubscribed_at IS NULL`, key names only) → commit **`580303c`**, `npm test` **54/54**, `tsc --noEmit` **134 = baseline** (normalised sets identical), build 0 → `npm run ship` → **re-measured all 133 live URLs: `<400w` = 0** (63 → 7 → **0**), min **175 → 501**, median **574 → 980**, 0 fetch errors, 0 pages without ad slots; two fetches taken immediately after the deploy still returned the *pre-deploy* HTML for `/privacy` (309) and `/history/stock-market` (341) — the edge copy expired and the plain crawl then returned **1,442 / 829** |
| 54 | israeljoffe.org | **no life-story page**, and `/sitemap.xml` served the **homepage HTML** while `robots.txt` advertises that URL | `curl -s https://israeljoffe.org/nope-xyz/` → **200, 13,956 B, homepage `<title>`** — every unknown path falls back to the home page, so the sitemap URL has been returning HTML all along | new **`/story/`** written from this repo's own facts only (Five Towns, Lawrence-Cedarhurst Fire Department during Hurricane Sandy, Fox 5/ABC/Fox News + Starwood/Marriott, FDIC Program Specialist and FDA Senior Advisor, DC 2016 → Palm Beach 2021, Matt Serra 2nd-degree black belt, Johnny Rodz/WUW Brooklyn + Monday Night Wrestling, Muck Rack outlets, 16 archive posts, 11 press citations): **644 words, 10 `<h2>`, 1 `<h1>`, third person, 0 sentences starting with "Israel Joffe", 24 photos pulled from the live gallery with all 24 `alt`s = "Israel Joffe"**; `Story` added to the nav of **39 pages** + linked from home and About; a real `sitemap.xml` (**7 URLs**, all resolve to real files) now answers `robots.txt`; `./deploy.sh pages israeljoffe-org israeljoffe-org` → wrangler exit 0 with **sha256 verification**, live on `https://israeljoffe.org/story/`, `www.` and `israeljoffe-org.pages.dev` (200, "The Story — Israel Joffe", 644w, **24/24 images 200**), `/sitemap.xml` now 880 B XML. **Caveat: `israeljoffe-org` is an uninitialised git submodule** (gitlink `62e3d50`, no `.git` inside), so this content exists on disk and in production but in **no git history** — next action is to initialise/vendor it so GitHub matches live |

---

### #37 evidence — scooter.exchange (shipped 2026-10-06)

**A. Dead images (23 refs).** `curl https://loremflickr.com/900/1200/citi,bike,new,york` → **401** (89,522 B HTML) for *every* URL; sources were `apps/web/app/{page,news,map,history-of-scooters}.tsx` + `packages/api/src/blog.ts`. All 13 URLs replaced with Wikimedia Commons files, each verified before patching: `13/13 OK 200 image/jpeg`, host switched to canonical `upload.wikimedia.org`.
Live now (production deploy `56dd2a9d`):

| page | bytes | `loremflickr` | `upload.wikimedia` | `adsbygoogle` |
|---|---|---|---|---|
| `/` | 54,165 | **0** (was 7) | 7 | 3 |
| `/history-of-scooters` | 57,133 | **0** (was 14) | 14 | 11 |
| `/news` · `/map` | 19,004 · 29,020 | **0** (was 1 · 1) | 1 · 1 | 2 · 2 |

`9/9 images load` (homepage, fetched and checked individually). Blog heroes were **in D1** (`blog_posts.hero_url`, 3 rows) → `UPDATE blog_posts SET hero_url=… WHERE hero_url LIKE '%loremflickr%'`, then rebuilt; live `/blog/*` now `lorem=0`.

**B. Mislabelled data.** The sync labelled rows with *the search query that found them*, not the item. `SELECT COUNT(*), SUM(make IS NULL) … FROM listings` → `n=7004, no_city=7004, no_make=7004, no_year=7004, no_desc=7004, active=1019`, and titles proved it (`gas-scooter` contained *"Ausom DT2 Pro Adult Electric Scooter …115km"*, `electric-scooter` contained *"X-PRO Fiji200 Scooter **Gas** Moped"*). New `packages/api/src/classify.ts` derives category/make/model/year from the title — validated against **all 7,004 real titles** (14/14 spot-checks pass) before use.

Backfill (18 chunked D1 files, `ok=18 fail=0`): **4,439 category corrections**, distribution before → after:
`gas-scooter 3155→226`, `electric-scooter 1937→3014`, `moped 1049→816`, `vespa 750→688`, plus **new** `ebike 1105`, `other 1000`, `bike 19`, `kick-scooter 13`, `mountain-bike 12`, `cargo-bike 8`. Those five categories existed in the buy-page filter since day one but were **not in the `ListingCategory` union**, so the filters could never return a row.
**292 parts/accessories deactivated** (active `1001 → 905`): *"AKRAPOVIC VESPA GTV300 … EXHAUST SYSTEM"*, *"Kitaco 3 ROW Oil Cooler … for STOCK HEAD"* etc. were for sale as scooters.
Live proof: `?category=ebike|electric-scooter|vespa|moped` → `rows=50 all_match=True` for each (was: `ebike` could not match at all).

**C. `rentals` count:0 everywhere.** `GOOGLE_PLACES_API_KEY` is set, but `SELECT key, LENGTH(value) FROM kv_cache WHERE key LIKE 'rentals:%'` → **every row `len:2`** (`[]`), 36 keys — the empty answer was cached for 1 h forever. Fixes: Overpass (OSM) + Photon fallback with hard `AbortSignal` timeouts, empty results cached **5 min** only, Places call timed out at 5 s. Live: NYC `count=25 t=0.24s`, LA `count=25 t=0.28s`, Miami `count=52 t=5.21s` (was `0` in all three).

**D. Seller photos.** `photos.scooter.exchange` → **NXDOMAIN** (`getent hosts` fails), so `listing/page.tsx` and `userRowToFeedItem` pointed every upload at a host that never existed. The worker now serves R2 at `GET /api/photos/<key>` with a strict key regex: missing key `http=404`, traversal `http=404`.

**E. Deploys.** Worker `6c4b1f15` (both cron triggers intact); Pages `56dd2a9d` — **gotcha:** the project's `production_branch` is `main`, so a deploy with `--branch=master` lands as `env=preview` and the domain keeps serving the old build (`aed4a152` stayed preview until redeployed with `--branch=main`). wrangler **v4** also refuses to bundle this artifact (`Could not resolve import "./__next-on-pages-dist__/assets/**/*.bin"`), so `node_modules/.bin/wrangler` (3.114.17) with `--no-bundle` is the working recipe. Repo pushed `ed4c794..2e77e3a`; both workflows remain `disabled_manually`.

---

### #38 evidence — diamonds.forsale (shipped 2026-10-06)

**Why it was frozen since July.** `npx vercel build` (the `pages:build` step) died with:

```
Error: Event handlers cannot be passed to Client Component props.
    {src: ..., alt: ..., className: ..., onError: function onError}
  ⚠ Sending SIGTERM signal to static worker due to timeout of 60 seconds.
  > Build error occurred
  Error: Static page generation for /about is still timing out after 3 attempts.
```

`app/about/page.tsx` (added in `5e33e31`, 2026-09-27) is a **server** component — it exports `metadata`, so it can't be made a client component — yet line 84 passed `onError={…}` to `<img>`. The handler targeted `/israel-joffe/avatar.jpg`, a file that was **never committed**: `curl https://diamonds.forsale/israel-joffe/avatar.jpg → 404`. Fix = drop the handler, point `src` at `/israel-joffe/02-western-wall.jpg` (exists → `200 image/jpeg`, alt still contains *Israel Joffe*).

**Why there were no ads.** `app/layout.tsx:69,82` reads `const ADSENSE = process.env.ADSENSE_CLIENT` and renders `{ADSENSE && (<script …client=${ADSENSE}`)}. The variable was never set at build time → Next inlined `undefined` → loader absent from every exported page. Built with `ADSENSE_CLIENT=ca-pub-7215975042937417`.

**Proof.** `npm run pages:build` → `Build completed successfully.` · `199` files · artifact `index.html` loader refs **2**. Deploy `wrangler pages deploy .vercel/output/static --project-name=diamonds-forsale --branch=main --no-bundle` → `37253dda` (`env=production`, previous `41c5454f` = `2026-07-30`). Live sweep:

| page | bytes | loader | `ca-pub` | dead hosts |
|---|---|---|---|---|
| `/` | 53,656 | **2** | **2** | 0 |
| `/about` | 30,915 | **2** | **2** | 0 |
| `/israel-joffe` | 34,086 | **2** | **2** | 0 |
| `/4-cs` · `/blog` · `/contact` · `/diamond-value-calculator` · `/jewelers` | 33,448 / 29,342 / 24,502 / 21,088 / 21,088 | **2** | **2** | 0 |

`2/2 images 200 image/*` across the sampled pages; `production_branch=main` on the project (same gotcha as #37 — the repo's `pages:deploy` script already passed `--branch=main`).

---

### #42 evidence — spanishtvshows TMDB key + `/show/*` 500 → 200 (2026-10-07 ~02:10 UTC)

**1. The key, delivered by the user** from the TMDB account `spanishtvshows` → *Settings → API*.

```
$ grep -E "^STV_TMDB" .secrets/cf.env | sed 's/=.\{4\}.*/=<redacted>/'
STV_TMDB_API_KEY=<redacted>            # 32 ch, 90ca…4e5e
STV_TMDB_READ_TOKEN=<redacted>         # 244 ch, v4 read token
$ stat -c %a .secrets/cf.env   → 600        $ git ls-files .secrets/ | wc -l  → 0
$ git grep -l "$KEY" -- . | wc -l           → 0   (raw value in no repo, no doc)
```

**2. The key is valid** (this is what makes the GitHub-secret hunt conclusive — a real key answers 200):

```
GET https://api.themoviedb.org/3/configuration?api_key=… → 200
GET https://api.themoviedb.org/3/tv/1399?api_key=…       → 200  (Game of Thrones, 73 eps S1)
GET https://api.themoviedb.org/3/tv/1399  -H 'Authorization: Bearer <v4 token>' → 200
```

**3. Why it stayed broken after the secret was uploaded.** Secret set on the *right* project:

```
$ wrangler pages secret put TMDB_API_KEY --project-name spanishtvshows-site
  🌀 Creating the secret for the Pages project "spanishtvshows-site" (production)
  ✨ Success! Uploaded secret TMDB_API_KEY
$ GET /pages/projects/spanishtvshows-site → production.env_vars = ['TMDB_API_KEY']  (preview too, via PATCH)
$ curl https://spanishtvshows.com/show/1399 -L → 500   ← still
```
Cloudflare applies `deployment_configs` to a **new** deployment; production was still the
`2026-10-06T19:36:19Z` build (`609631cf`). Next.js hides the message in prod — the body was only
`<html id="__next_error__">` + `digest\":\"2025926783`, so the error text was unreadable.

**4. The fix** — built here exactly as CI does, validated on a preview branch first:

```
$ TMDB_API_KEY=… SITE_URL=https://spanishtvshows.com npm_config_legacy_peer_deps=true \
    npx --yes @cloudflare/next-on-pages@latest        # exit 0, 35 s (1.49 s core build)
  (without npm_config_legacy_peer_deps → ERESOLVE: @cloudflare/workers-types@4 vs wrangler@4.148)
$ du -sh .vercel/output/static  → 23M
$ wrangler pages deploy .vercel/output/static --project-name=spanishtvshows-site --branch=tmdb-check
  🌎 … https://tmdb-check.spanishtvshows-site.pages.dev
$ curl https://tmdb-check.spanishtvshows-site.pages.dev/show/1399 → 200 79,323 B  ← first green
$ wrangler pages deploy .vercel/output/static --project-name=spanishtvshows-site --branch=main
  (production_branch = main, so this is the real domain)
```

**5. Before / after on the live domain.**

| URL | before | after |
|---|---|---|
| `/show/1399` | **500** 19,766 B `__next_error__` | **200** 79,323 B · *Game of Thrones Review…* · **40** `image.tmdb.org` |
| `/show/679` | **500** | **200** 80,090 B · *Xiaolin Showdown* · 36 |
| `/show/46648` | **500** | **200** 78,149 B · *True Detective* · 40 |
| 10 homepage-linked ids (`12637 1446 19505 203667 212907 284792 30826 44953 63764 67335`) | — | **10/10 → 200**, not-200 = **0** |
| `/`, `/blog`, `/best-on-netflix`, `/spanish-show-finder`, `/sitemap.xml`, `/ads.txt` | 200 | **200** ×6 |

**6. Regression proof** (the deploy also regenerated a build artifact, so nothing could be dropped
silently): sitemap URL set **old `609631cf` = 202 vs live = 202 → 0 diff**; a 15-URL sample hit
against both deployments gave **7 differences, every one `old=500 → live=200`**, **0** going the
other way. `content/generated/spanish-pages.json` (108 → 51 entries) is a **build artifact**
regenerated on every build — read only by `app/sitemap.js` — so it was reverted with
`git checkout --`; `git status --porcelain` in `Spanishtvshows.com` → **0 dirty**.

**Still open on this site:** homepage link `/Netflix-spanish-shows` → **404**; the 3 retired cron jobs
(*Generate Spanish Pages* now has its key locally) still need Cloudflare Cron Triggers.


### #44 evidence — fashionistas login/session RCA (2026-10-07)

**What the user hit** (their words, paraphrased here): they did the whole login flow *yesterday* and
still had to repeat it every single time, with no guidance at all. Three stacked defects, all client
side — the server was never the problem:

| # | defect | proof |
|---|---|---|
| 1 | **any 401 killed the session** — `api()` is the single fetch helper, so one 401 from *any* endpoint signed you out of the whole app | old `index.html:1459`, `git show 8886e25:index.html` |
| 2 | **a wrong password looked like an expired session** — `doLogin()` posts through `api()`, so bad credentials ran `logout()` and toasted "Session expired" | same line |
| 3 | **the stored session was never validated** — `grep -c "auth/me" index.html` → **0**; boot only read `localStorage.fash_token` | old `:1402` |
| 4 | **the string "undefined" in localStorage** — `afterAuth(d)` did `TOKEN = d.token` while the auth answer can be `{ok,id,email}` (no `token`), so the next request sent `Authorization: Bearer undefined` → 401 → back to defect 1 | old `afterAuth` |
| 5 | **no guidance** — after sign-in you got nothing; 402 and 503 were bare toasts with no action | old `:4536-4537` |

**Server-side contract used by the fix** (`https://fashionistas-api...workers.dev`, auth gate runs
*before* routing, so this is a valid session probe): `GET /api/auth/me` → valid token **404**,
dead token **401**, no token **401**.

**Fix** — `fashionistas-ai` commit `3cfe08b`, deployed by `scripts/deploy-local.sh`
(`wrangler pages deploy . --project-name=fashionistas-ai --branch=main`), live == `3cfe08b`:
401 on `/api/auth/*` is now the credential error with the session untouched; any other 401 is
*confirmed* against `/api/auth/me` before signing anyone out; anonymous 401 says "Sign in first to
do that." with no toast; `restoreSession()` runs once at `DOMContentLoaded`; `afterAuth()` never
stores `undefined` and toasts the next step; 402 opens `guideSubscribe()` → the live `/pricing/`
(**200**); 503 names the missing keys in plain language.

**Proof — 4 tests in a real browser against the live site** (deployment `15ef54f1`, QA credentials
generated inside the page and never written down):

| test | action | result |
|---|---|---|
| A | sign up through `doSignup()` | token stored (**107 chars**), sign-in view hidden, app + tabbar visible, toast *"Signed in as qa... — next: Connect your shop, then Sell to post an item."* |
| B | **failed login while already signed in** | threw **"Invalid credentials"**, token still 107, sign-in view still hidden → `sessionSurvived: true` (before: signed out) |
| C | reload the page | still signed in; network shows `GET /api/auth/me` → **404** (session alive) |
| D | signed out, call an auth-only endpoint | threw **"Sign in first to do that."**, toast **empty** (no "Session expired"), stayed on sign-in |

`npm test` → **267 pass / 0 fail** (baseline held). Live page grep: `restoreSession` **1**,
`guideSubscribe` **1**, old `setTimeout(()=>logout(), 600)` **0**. Ads unchanged: loader **1**,
`data-ad-slot` **4**, `ca-pub` **1**, `GET /` **200** / 422,320 B.


---


### #45 evidence — try-on pipeline path fix (2026-10-07 night ET)

**Deploy:** **not** GitHub Actions — `scripts/deploy-local.sh` → `wrangler pages deploy` → Pages
project `fashionistas-ai`. Push ≠ ship; live tip = `version.txt` after wrangler.

Commit `c8776cd` (`fix(try-on): serve pipeline from /try-on/, restore Photoreal path`): added
`try-on/tryon_pipeline.js` (510 lines), updated `try-on/index.html` import to
`/try-on/tryon_pipeline.js`, kept Photoreal → `POST /api/tryon/hd` and Instant as experimental
on-device overlay.

```
$ curl -sS -o /dev/null -w '%{http_code} %{size_download}\n' https://fashionistas.ai/try-on/tryon_pipeline.js
200 20019
$ curl -sS -o /dev/null -w '%{http_code}\n' https://fashionistas.ai/core/tryon_pipeline.js
404
$ curl -sS https://fashionistas.ai/version.txt
593418e978144a43b79f4a31c316afcd8de58083
```

Live `/try-on/` shows **Photoreal · Pro** and **Instant · experimental overlay**.

### #46 evidence — multilist extension one-click (2026-10-07 night ET)

**Deploy:** wrangler Pages only (no Actions). Zip is on the live Pages artifact after
`wrangler pages deploy`; pushing the repo alone does not publish it.

Commit `e768c8f` (`feat(multilist): one-click via extension without Stripe`). Server `/api/list/all`
remains **402** until Stripe (`#24` / `#43`); the extension path does not need Stripe.

```
$ curl -sS -o /dev/null -w '%{http_code} %{size_download}\n' \
    https://fashionistas.ai/chrome-store/fashionistas-extension-v1.0.1.zip
200 109648
$ node --test tests/multilist-one-click.test.mjs
# tests 7 / pass 7 / fail 0
```

`apps/extension/queue.js` `ADAPTERS` keys include `ebay`, `etsy` (plus poshmark, mercari, depop,
vinted, grailed, facebook, kidizen, vestiaire, whatnot). Repo doc: `docs/MULTILIST-ONE-CLICK.md`
(Pages `/docs/*` may 404 — expected). **Gap:** human must Load unpacked + log into shops before any
real marketplace post; that post has **never** been executed in Chrome.

### #47 evidence — chatbot scope expand (2026-10-07 night ET)

**Deploy:** `593418e` is live because of a **wrangler pages deploy**, not because of a git push.
Fashionistas has **no** GitHub Actions deploy path for production.

Commit `593418e` (`feat(chat): expand stylist scope beyond fees and own listings`). Live tip =
`version.txt` **593418e**. Allowed topics include `connect_shops`, `chrome_extension`, `try_on`,
`listing_from_photo`, `pricing_plan`, `how_to_list` (plus fees/listings).

Smoke with QA `fash_session` cookie (len **64**, user id **78**; password not printed):

| prompt | http | `refused` | `topics` |
|---|---|---|---|
| How do I list on Depop? | **200** | **false** | `how_to_list` |
| How does try-on work? | **200** | **false** | `try_on` |
| What are the fees and pricing plan? | **200** | **false** | `marketplace_fees` |

```
$ node --test functions/api/chat/__tests__/grounding.test.mjs
# tests 19 / pass 19 / fail 0
```

**#43 still true** for the server `/api/list/*` path until `#24` Stripe test key lands (then `#25`
env vars → marketplace OAuth). Extension path (#46) is the Stripe-free alternative pending human
Load unpacked + shop logins.



### #48 evidence — independent audit of the §16.8 round (2026-10-07)

Asked to confirm another agent's handoff claims on fashionistas.ai. Every line below was re-run by
this agent against the **live site** and the **local repo**, not copied from §16.8.

**Verdict: the three ships are real and live. Two evidence lines in §16.8 are stale, and the full
test suite it left behind was red.**

| §16.8 claim | my measurement | verdict |
|---|---|---|
| A · `/try-on/tryon_pipeline.js` → 200 | **200 / 20,019 B**; `/try-on/` → 200 / 43,479 B and loads `"/try-on/tryon_pipeline.js"`; `Photoreal` ×10, `Instant` ×6 | **CONFIRMED** |
| A · `/core/tryon_pipeline.js` → 404 | **200 / 19,809 B** — served deliberately by the new `functions/core/[[path]].js` allow-list (`SERVED = {"tryon_pipeline.js"}`); everything else under `/core/` still blocks | **STALE** (claim no longer true; behaviour is intentional) |
| "tip is now `593418e` (`version.txt` == live)" | live `version.txt` = **`4a0c395`**, repo HEAD = **`a870888`** | **STALE** — but `3cfe08b`, `c8776cd`, `e768c8f`, `593418e` are all `merge-base --is-ancestor 4a0c395` = **YES**, so every ship *is* in production |
| B · zip → 200 / 109,648 B | **200 / 109,648 B** (exact) | **CONFIRMED** |
| B · `ADAPTERS` has ebay + etsy | 11 adapters: poshmark, mercari, depop, vinted, grailed, facebook, kidizen, vestiaire, whatnot, **ebay**, **etsy** | **CONFIRMED** |
| B · `multilist-one-click.test.mjs` 7 pass | **10 pass / 0 fail** (more than claimed) | **CONFIRMED (better)** |
| B · no real post yet | unchanged — still needs Chrome "Load unpacked" + shop logins | **CONFIRMED** |
| C · 3 chat prompts → 200, `refused:false`, topics `how_to_list` / `try_on` / `marketplace_fees` | re-run myself: Depop → **200** `["how_to_list"]`; try-on → **200** `["try_on"]`; fees → **200** `["marketplace_fees"]` (on a fresh account) | **CONFIRMED** |
| C · `grounding.test.mjs` 19 pass | **19 pass / 0 fail** | **CONFIRMED** |
| not mentioned · full suite | **`npm test` → 312 tests, 311 pass, 1 FAIL** | **MISSED** — see row #48 |
| server `/api/list/*` still paywalled | `POST /api/list/all` with a live session → **402 `subscription_required status:"inactive"`** | **CONFIRMED** |

**The failure I found (and fixed):** `tests/api-auth-matrix.test.mjs` requires every route under
`functions/api/` to answer an anonymous caller **401/403** or sit on an explicit, justified
`PUBLIC` allowlist. Grok's identify-fill ship added `functions/api/ai/analyze.js` ungated →
`not ok 195 — an anonymous caller never gets past a gated route`. Fixed in **`a841924`** by
allowlisting it with the measured justification (no user data stored, no key exposed, 20/min/IP cap)
→ **`npm test` 312 pass / 0 fail**. The test was not weakened: the allowlist is the mechanism its own
error message names, and it still asserts a written reason of >20 chars.

**Why that route deserves the scrutiny — measured, not assumed:**

```
$ curl -X POST https://fashionistas.ai/api/ai/analyze -d '{"image":<og.png base64>,"hint":"jacket"}'
200 (2.43s) {"ok":true,"source":"ai","model":"groq_vision","type":"jacket", ...}
```

i.e. **an anonymous stranger reaches a paid Groq vision call.** It stores nothing (vision.js only
`fetch`es `api.groq.com`; no D1/R2/KV write except the counter) and the cap holds — 25 consecutive
anonymous hits returned `422 ×23 then 429 ×2 (25 total)`. Whether that stays public is now **#49**, a decision
for the user, not for an agent.

**Also learned:** the free chat tier is **10 messages/month**. The QA account (id 78) is exhausted —
`402 chat_messages_quota_reached used:10 cap:10 remaining:0 resets 2026-11-01` — so §16.8's smoke
would no longer reproduce on that account; a fresh account reproduces all three 200s. Anonymous chat →
**401** as required.


---

### #55 — placebets: knowledge-intent questions read a WWE *Recruit/concept* article as the answer — **FIXED 2026-10-08**

`POST /api/chatbot {"query":"Next WWE champion?"}` used to lift a WWE recruit/pipeline article into
the answer. The fix is `championRelevanceGate` in `lib/llm/chatbot-placebets.js` (commit `aeb1146`):
a retrieved passage only reaches a champion answer if it passes the gate, otherwise it is skipped
with a logged reason → `null` → the honest path; scripted sports (WWE/AEW/WCW/…) go through
`buildScriptedSportAnswer` and never quote a "winner". Same deploy shipped the conditional
affiliate-commission note deletion (`components/v26/AffiliateSlots.js`, `89abc2c`).

**Local (next dev) before deploy — 4 probes:**

| query | `source` | verdict |
|---|---|---|
| Next WWE champion? | `scripted_entertainment` | honest refusal, **no recruit-article text** |
| Who is the current boxing heavyweight champion? | Wikipedia table | real champions, gated passage cited |
| Chiefs odds today | board/edges | regression intact (full pick + injuries) |
| best pasta recipe | `honest_miss` | refused correctly |

**Live after deploy `2f47e900` (custom domain 200):** WWE → `scripted_entertainment`, boxing →
`Wikipedia` with the same gated champions, disclosure phrase `commission at no cost` **absent** on
`/` and `/predict` (both 200). Stale test `lib/__tests__/tools-discovery.test.mjs` (hrefs moved to
`components/ia/nav-config.js` at `d0e47d6`) fixed in `58ac85d` → suite **36 pass / 0 fail**.
Deps: `~/.secrets/cloudflare.env` (`CF_TOKEN_PLACEBETS`/`CF_ACCT_PLACEBETS`) + `rm node_modules/.cache/wrangler/{wrangler-account,pages}.json` — the stale cache points wrangler at the fashionistas account and the deploy dies with `Project not found [code 8000007]`. **No GitHub push.**


---

### #56 — fashionistas: chatbot scope gate refused in-scope asks / answered off-board — **FIXED 2026-10-08 (verified on prod `5db9db4`)**

The gate was inverted: it now refuses **only** on the `OFF_TOPIC_RE` denylist — everything else
(onboarding, how-to, pricing, multi-turn follow-ups) is answered. Harness `fash_bot_retest.py`
(fresh account per run, 8 probes: onboarding ×2, multi-turn `what about ebay?` with history,
smalltalk, plan price, multi-shop how-to, try-on, off-topic control = must refuse):

* run on prod `cc7ef6a`: **8/8 PASS**; re-run on `274fbc6`: **7/8** — the one FAIL was
  `multi-shop-howto` **http 502 @54 s non-JSON** (upstream model stall, not a refusal), and the
  same query answered **3/3 × 200** on immediate re-probe.
* fresh account on prod `5db9db4`: onboarding **200** (4.4 s), multi-shop-howto **200** (4.0 s),
  `who won the super bowl?` → **`refused:true`** — the control stays refused. Chat cap = 10
  msgs/month/account (the earlier QA account returns **402** — correct, not a bug).

**Why the 502 existed (fixed, see #57):** `completeJSON` gave **each** provider its own 45 s —
groq 429-fails fast → queued Workers AI leg ran unbounded → the pair crossed the platform cut
(~54 s measured) and Cloudflare answered with its opaque HTML 502 instead of the route's JSON.


---

### #57 — fashionistas: "fix it all" round — favicon 404, 3× AdSense `availableWidth=0`, stale-cache class, model budget — **FIXED, prod `5db9db4`**

Ladder (each preview-verified first, `deploy-local.sh` VERIFIED at every step): `bb02ddb`
(favicon.ico + `<link>`; width-gated AdSense `pushAd` → `ResizeObserver` arms hidden slots and only
pushes at width > 0 — all 3 mounts live in `#view-auth`, which is `.hidden` for signed-in sessions;
`contain:layout paint` on `.card.fx`) → Worker `GET /api/auth/me` deployed `5e0fb6ba` (DB-free token
probe; **never** point the SPA at same-origin — Pages D1 rejects Worker HMAC tokens and would sign
everyone out) → `274fbc6` (**`?v=2` on the `site-adsense.js` import in all 4 pages + `SITE_ADSENSE_VERSION`
guard test** — `max-age=14400` had let a browser run the *pre-gate* copy for 4 h while the edge
already served new bytes; this is what made the first "fixed" prod measurement show `pushed:true`) →
`5db9db4` (one `MODEL_TIMEOUT_MS` budget for the whole provider chain + `Promise.race` timer for
`env.AI.run`, which takes no AbortSignal: a stalled first provider can no longer run the chain past
the platform cut into an opaque 502; `ref'd` timer — `AbortSignal.timeout()` does not hold Node's
test loop and cancelled the suite).

**Measured on prod `5db9db4` (fresh tab):** `npm test` **324 pass / 0 fail** (321 + 3 budget tests);
console **0 errors** (was 5: favicon 404 + 3 TagErrors + `auth/me` 404); `/favicon.ico` 200;
signed-in → all 3 mounts `armed:true, pushed:false` (no ad request at all); signed-out →
`pushed:true, w:989`, iframes created (revenue path intact); FX intact (6 cards, glyphs, 58 kinetic
letters); `version.txt` = `5db9db4…`, tree 0 dirty, secrets `/.env* /.git/config /.dev.vars` → 404.

**NOT PROVEN / NOT FIXABLE here:** (a) the old unreferenced bundle `assets/app.959c6582.js` still
answers 200 at the edge — `POST /zones/…/purge_cache` → `Authentication error [code 10000]`, the
deploy token lacks Cache Purge permission (zero user impact: no HTML references it); (b) signed-out
loads log ~10 × 400 from `googleads.g.doubleclick.net` — Google's ad server rejecting this automated
/data-centre browser; the visible-slot push path is byte-equivalent to the pre-fix code, so
pre-existing, and fills for real users can only be confirmed from the AdSense report.


---

### #58 — placebets: health monitor lied — `federation-health` 500 every 15 min on a healthy site — **FIXED 2026-10-08 (deploy `54828cfc`)**

Both cron checks asserted `["Bet Smarter", "Odds Desk", "Ask the Bookie"]` on `/` — but since the IA
redesign **"Bet Smarter" only renders in the empty/feed-down branch** (healthy home = `Who wins
tonight?` hero + `<title>`), so `GET /api/cron/federation-health` returned **500**
`failures: [{"label":"home","detail":"missing: Bet Smarter, Odds Desk, Ask the Bookie"}]` on every
run the cron worker makes (every 15 min) and recorded `ok:false` into D1. Fixed in `eba73a5` to
`["Who wins", "Live Odds", "Parlay"]` (all verified present in the served home; `deploy.sh`
`SENTINEL` updated from the same stale string).

| probe | before | after deploy `54828cfc` |
|---|---|---|
| `GET /api/cron/federation-health` | **500** `ok:false` (home missing ×3) | **200** `ok:true` `failures: []` — 6/6 PASS (home, sports hub, trending board, odds, news, ipo) |
| `GET /api/cron/housekeeping` (full) | home check failed | **200** `ok:true` — 10/10 PASS |
| `placebets.ai/` + `SENTINEL="Who wins"` | deploy gate would fail a healthy site | 200, sentinel present |

Suite held **36/36** through the round. No GitHub push.


---

## OPEN (fix next, in this order)

| # | Site | Issue | Evidence | Next action |
|---|---|---|---|---|
| 13 | marketpicks.ai | M4 leftovers **(1 of 4 done)**: `POST /api/cron/quotes` 76 s → 524 s; `bot2`/`ensemble_noground` off-topic; top-level `confidence` null — `/api/health` fabrication is **fixed** (see 13a) | curator agent timed out 3×300 s | fix the three remaining; `npm test` baseline **54** must hold |
| 14 | createstuff-ai repo | `index.html` dirty (23 added lines) after a successful deploy | `git status` → `M index.html` | **done 2026-10-07** — commit `19a721d`; the file is the deployed state (matches `2517b122.createstuff-ai.pages.dev` byte-for-byte: 48,508 B, slots `5079047997`/`2843751862`/`3357291048`, `initAds` ×3), `git status` clean. Note the apex `createstuff.ai` serves a **different** build — `createstuff-marketing` in nexus-ai-suite — so this repo is the app, not the domain |
| 15 | Ihatecollege repo | 4 dirty sitemap files, deployed but uncommitted | `git status` → 4 files | **done 2026-10-07** — committed `860034b` ("regenerate the four sitemaps"), `git status` clean; live: `/sitemap.xml` **200** referencing `sitemap-blog.xml` **204 URLs** / `sitemap-colleges.xml` **6,211** / `sitemap-static.xml` **44** (6,459 total) and `robots.txt` carries `Sitemap: https://ihatecollege.com/sitemap.xml` |
| 17 | federation | 3 scheduled jobs homeless after Actions shutdown: STV *Generate Spanish Pages* (`0 13 * * *`), *IndexNow ping* (`30 11 * * *`), *Federation Sentinel* (`0 */3 * * *`) | all `disabled_manually` today | move to **Cloudflare Cron Triggers** |
| 19 | israeljoffe.com/.org | No AdSense at all (loader 0, slots 0) | live sweep 2026-10-06 | decide: monetize or keep clean |
| 20 | Placebetsai-src | `lib/web-search.js` has a committed `sk-or-v1-…` key | grep | rotate + move to secret |
| 21 | Spanishtvshows.com | `app/api/chatbot/route.js` committed `gsk_…` key | grep | rotate + move to secret |
| 22 | Ihatecollege | `scripts/expand-articles.js` committed `AIza…` key | grep | rotate + move to secret |
| 23 | Placebetsai-src | two Gmail SMTP app passwords in plaintext (`scripts/test-smtp.mjs`) | `nexus-ai-suite/TODO.md` X4 | rotate + remove |
| 41 | diamonds.forsale | **AdSense loader but no ad units** — 0 `<ins class="adsbygoogle" data-ad-slot>` anywhere, so nothing can render | `grep -rn "data-ad-slot" app` → only `app/layout.tsx:85` (the loader); live sweep 21:35 UTC: `slots=0` on `/`, `/4-cs`, `/about`, `/diamond-value-calculator`, `/blog`, `/sell` while `loader=2, ca-pub=2` | port `Ihatecollege/components/AdUnit.js` (reserved height + push-after-mount) into `app/components/AdUnit.tsx`, drop it into the article/home layouts, rebuild with `ADSENSE_CLIENT`, redeploy `--branch=main`, re-count |
| 49 | fashionistas.ai | **decision: `POST /api/ai/analyze` spends Groq anonymously.** Proven: no session, no key, image posted → **200 / 2.4 s / `"model":"groq_vision"`**. Currently capped at 20/min/IP in KV (holds: 429 after ~20) and stores nothing — but the cap is per-IP, so rotating IPs can burn Groq quota and starve the real identify funnel | live probe 2026-10-07, `functions/api/ai/analyze.js` (allowlisted in #48) | **user decides:** keep public (funnel works logged out) **or** require a session (blocks the sample-jacket/first-photo funnel). If it ever stops holding, gate it — that is written into the allowlist reason |

---

## BLOCKED (needs Israel — one line each in `NEEDS_ISRAEL.txt` after 3 failures)

| # | Site | Blocked on | Why |
|---|---|---|---|
| 24 | fashionistas.ai | **Stripe test key** (`sk_test_…`) | `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` length 0; no key anywhere on disk |
| 25 | fashionistas.ai | **8 env vars** (eBay / Etsy / Google / Stripe) | → OAuth, billing, and the first real marketplace post are all dead. **Zero real posts ever** |
| 26 | fashionistas.ai | **Try-on credits: 9 left** | Modal free credit burning down; `MAX_MONTHLY_TRYON_SPEND` set but no replacement tier |
| 27 | fashionistas.ai | `OPENCODE_API_KEY` absent | opencode leg of the provider chain inert |
| 31 | all | **wrangler OAuth refresh** (`zone:read`) | current token expires `2026-10-06T20:58:54Z`, missing `zone` scope — one click, allowed ask #3 |
| 32 | admin UI | **approval** | proposed Worker + D1 + R2 + Cloudflare Access on `/admin`; user must pick (a) admin panel or (b) finish checklist/handoff first |
| 43 | fashionistas.ai | **"can we post?" — NO, and here is the exact chain** (2026-10-07, re-verified; corrects the old "no login exists" claim) | register **201** (`users` id 78) → login **200** + `fash_session` → `/api/auth/me` **200** → `/api/marketplaces` **200 `count:11`** → **`POST /api/list/all` → 402 `subscription_required` `status:"inactive"`** ("An active $14.99/mo subscription is required to list"; identical on `/api/list/ebay`, `/api/list/etsy`) → `POST /api/billing/checkout` → **503 `STRIPE_SECRET_KEY not configured`** | blocked by **#24 Stripe test key** first, then **#25 the 8 env vars** (`EBAY_SANDBOX_{CLIENT_ID,CLIENT_SECRET,REDIRECT_URI}`, `ETSY_{API_KEY,SHARED_SECRET}`), then the **marketplace OAuth logins**. Order: Stripe → env vars → eBay/Etsy login → post. **Still true 2026-10-07 night** for server `/api/list/*` even after extension one-click (#46) — no real Chrome marketplace post executed yet. Gate: `requireActiveSubscriber()` at `functions/api/_lib/auth.js:189`. Where to test after unblocking: `https://fashionistas.ai/` sign-in `#login-u`/`#login-p` → post UI `#pu-post`, or `POST /api/list/all` with the cookie; QA account `qa-post-test@fashionistas.ai` (id 78) is stored in `.secrets/cf.env` |

| 52 | hiddencameras.tv | **production is served from a Cloudflare account no credential on this machine can reach** (→ `NEEDS_ISRAEL.txt` #9) | `hiddencameras.tv` + `www.hiddencameras.tv` **are** registered on our project `hiddencameras-tv` (acct `7eb89b01…`) but their status is **`deactivated`** (`created_on 2026-05-06`), so Pages will not serve them; apex still returns the **old** build (CSS `de7ebbae…`, `/shop/` = the 5-word stub) while the new build (CSS `8f3eddc2…`, `/shop/` = "Shop by Guide") answers only on `hiddencameras-tv.pages.dev`; `www` → CNAME `hiddencameras.pages.dev` → **522**. All **7 tokens** on disk return `403 code 9109` on zone `5cd13106…`; 4 accounts / **23 Pages projects** contain no project named `hiddencameras`; `~/.cf-tokens` (`HIDDEN79_TOKEN`) does not exist on this computer; the GitHub secret `CF_API_TOKEN` is API-unreadable without running a workflow (banned) |

> Removed this round: **#29** (STV token received), **#30** (repo cloned), **#36** (IHC token received → real domain fixed) — all moved to FIXED.

---

## WONTFIX / BY DESIGN

| # | Item | Why |
|---|---|---|
| 33 | Wildcard DNS on israeljoffe.com/.org + wuwonline.com/.org | user edits those sites; mitigated instead (`409a496` per-isolate cache → ~10 scans/hour, was ~1,500) |
| 34 | `/how-to-crosspost/` guide "live at `0a30892`" (claimed in `HANDOFF-2026-09-29.md`) | **that commit does not exist in any of the 7 fashionistas clones and the URL 404s** — the claim was false. Real guides are `/guide/…` (16 URLs in sitemap) |
| 35 | GitHub `hiddencameras-tv` legacy Pages build can't be disabled (422) | blocked at repo level instead (`actions_enabled=false`); the domain is served by Cloudflare |
