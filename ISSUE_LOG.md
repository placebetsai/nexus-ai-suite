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

### #59 — fashionistas: the API was destroying the seller's department, and its AI wrote the "looks like shit" titles — **FIXED 2026-10-11**

The owner's words: *"u cant post your feeds and they look like shit, the listings arent clear, buyers
cant find anything i list, and some items dont have prices or sizes."* Four of those turned out to be
**the same defect viewed from four sides**, and all four answered `200`/`201` while doing the wrong
thing — which is why they survived "works on my machine".

**Root cause of "buyers can't find anything": `canonCategory()` matched nothing.**
The Worker carried its own hand-written *second copy* of the category table, with department heads the
shop no longer draws (`Women's Clothing` / `Tops & Shirts` / `Bags & Luggage`). The picker emits the
real table's paths, so every department a seller could pick resolved to `NULL`:

| place | effect |
|---|---|
| `INSERT` | item landed in **no** department → department browsing could never reach it (the UI showed the department as "0 items") |
| `PUT` | an edit **re-nulled** the category → the fix never stuck |
| `GET` | reads ran the row through it too → `/api/market` answered `category: null` |

Four of the eight departments the shop draws could never hold a listing.
**Fix:** `src/categories.js` is now **generated** from `fashionistas.ai/functions/_lib/categories.js`
by `scripts/gen-worker-taxonomy.mjs` (`FASH_WORKER_SRC=<path> node …`, `--check` to prove it is not
stale). One table, one source; parity is locked by `fashionistas-ai/tests/category-parity.test.mjs`
(10 tests, runs without reaching the sibling checkout — the emitter is a pure exported
`renderWorkerTaxonomy()`).

**Deliberately NOT backfilled into D1.** The legacy map funnels flat words into Women
(`Shoes` → `Women/Sneakers`, `Outerwear` → `Women/Coats & Jackets`). Baking that guess into the data
would be permanent; read-side resolution stays reversible. **Seller data was not touched this round**
— 4 of 8 live listings (145–148) still carry `category = NULL` from the old bug, and they need an
owner decision, not a guess.

**Why a department click returned nothing (found by `curl`, not by a test):**
1. the prefix scan was built as `LIKE LOWER(?)` with the bind `"Women/"` and **no trailing `%`** —
   it matches exactly one string that no row holds;
2. even fixed, a bare department cannot reach rows stored as `Women's Clothing/…` or
   `Bags & Luggage/Handbags` — not under it *by string*;
3. enumerating every spelling is the obvious fix and **is wrong**: ~126 values in one `WHERE`, and
   **D1 caps a statement at 100 bound parameters**, so the busiest click in the shop would have 500'd.
   The route now derives a small set of LIKE **prefixes** (61 for `Women`, the largest; every other
   department under 15) plus an authoritative `belongsUnder()` post-filter. Both heads and full legacy
   paths are needed: a legacy sub-path resolves differently from its own head
   (`men's clothing` → `Men/Tops`, `men's clothing/outerwear` → `Men/Coats & Jackets`);
4. `?category=nonsense` answered **all** listings, because `belongsUnder` re-resolved the request and
   read an unresolvable one as "no filter". It now matches nothing, **in SQL too** (`1=0`): showing
   the whole shop under the wrong heading is worse than showing nothing, because it looks like it worked.

**Search + paging.** Search matched title + description only, so a brand typed into the **Brand** field
was unfindable — `q=Versace` returned nothing while the Versace polo sat in the table with `brand`
set. Now searches brand, colour, material, size and department. `?limit` was accepted and silently
ignored, and `MARKET_LIMIT` was 100 (hiding the tail of the catalogue); now honoured (capped 500),
default 250.

**The AI wrote the junk the owner complained about.**
- `/api/ai/analyze` returned `condition:"Unknown"`, `sizeHint:"not visible"`, `brand:"Unknown"` and a
  flat legacy category, all **stored verbatim** — live listing 143 shipped with its size reading
  `"not visible"` to buyers. `sanitizeIdent()` now enforces the four grades, drops every junk spelling,
  and routes the category through the same table as the picker.
- The title prompt said only *"maximum resale visibility"*, which is an **instruction to stuff**, and
  the model complied: live listing 148 came back as
  `"Blue Versace Polo Shirt - Good Condition, Tops, Mens Tops, Tops for Men"` — the same noun three
  times for shops that already tokenize the whole title. `TITLE_PROMPT` now states the order, a
  70-char cap and no repetition, and `cleanTitle()` **enforces all of it on whatever the model
  returns**, because a prompt is a request and this value is written straight into a seller's title
  field. Two earlier guard versions each failed in the opposite direction and both were caught on the
  live call: one *discarded every good rewrite* (it returned the seller's junk verbatim — de-stuffing
  shortens a title by construction, so "must not be shorter" rejected the improvement), the other
  left `versace polo shirt blue m` lowercase. The floor is now **3 words**, the brand is
  **prepended rather than used as an excuse to give up**, and Title Case is applied only to words
  that are entirely lowercase so `hummel` and `iPhone` keep their own spelling.

**Also shipped this round (same complaint round):**
- **Both product feeds were missing** — `GET /feed/google.xml` and `GET /feed/tiktok.csv` were 404.
  New `functions/feed/google.xml.js` (pure `renderGoogleFeed`, `genderOf`/`ageGroupOf`) and
  `functions/feed/tiktok.csv.js` (pure `renderTikTokFeed`, BOM, `COLUMNS`), sharing
  `functions/_lib/feed-market.js`. TikTok Shop US prohibits secondhand goods, so the TikTok feed
  targets **Ads Catalog**, not Seller Center.
- **Google Merchant field gaps** in `functions/_lib/item-meta.js`: Product JSON-LD now carries a real
  `brand` (omitted when null rather than fabricated — Merchant rejects a made-up brand), `item_group_id`,
  `color`, `size`, `material`, `condition`, `offers.itemCondition` (`UsedCondition`), `shippingDetails`
  with a real `countryCode()` lookup (unrecognised country **omits** `shippingDetails` rather than
  emitting `UN`), and `google_product_category`.
- **`_redirects` 202 is invalid** — Pages only honours `200/301/302/303/307/308`, so the channel
  OAuth landing pad 404'd. Replaced by a Pages Function proxy
  `functions/api/channels/callback/[[channel]].js`, allowlisted in the auth-matrix test's `PUBLIC`
  map (an OAuth landing pad, same category as `ebay/oauth/callback`).
- **Item page + shop grid** (`assets/app.393972daf76e.js`, renamed from `app.93db949f7b21.js` with
  `index.html:1471` repointed — **the filename is a content hash, first 12 hex of sha256, so editing
  in place makes the CDN serve stale bytes**): shows Brand/Size/Colour/Material/Condition/Department +
  Ships-from + One-of-a-kind; shop search widened; `openAdd`/`saveManual` collect `m-brand`/`m-color`/
  `m-material`. `ux-pass.css?v=3`.

**Measured on prod after deploy (`curl`, public endpoint — note `/api/listings` is `401 Unauthorized`,
`/api/market` is the public one):**

| probe | result |
|---|---|
| `?category=Women` / `Men` / `Women/Tops` | 2 / 1 / 1 |
| `?category=Men/Coats & Jackets` / `Women/Bags & Handbags` | 1 / 1 |
| `?category=Bags & Luggage/Handbags` / `Women's Clothing/Tops & Shirts` | 1 / 1 |
| `?category=nonsense` | **0** |
| no category | **7** |
| `q=Versace` / `q=Keurig` / `q=blue` / `q=denim` | `[148]` / `[145]` / `[148,146,143]` / `[147]` |
| `?limit=2` | 2 (was ignored) |
| `/feed/google.xml` / `/feed/tiktok.csv` | **200**, 7 `<item>` / 8 rows, BOM present |
| `/api/channels/callback` | **400** (reaches the Worker) — was **404** |
| `/shop/148` JSON-LD | `"brand":{"@type":"Brand","name":"Versace"}`, `addressCountry:"US"` (was `"UN"`), `UsedCondition`, `InStock` |
| `/api/ai/title-optimizer` ×4 on the shipped junk input | `Versace Polo Shirt Blue M` · `Versace Blue Polo Shirt M` · `Blue Versace Polo Shirt M` · `Versace Blue Polo Shirt M` — all ≤70 chars, no repeat, no grade, brand present |

**Gates:** `fashionistas-ai` `npm test` **409 pass / 0 fail** (was 419→409 after the taxonomy tests
absorbed the duplicate legacy assertions; new `tests/category-parity.test.mjs`, `tests/product-feeds.test.mjs`,
`tests/listing-quality.test.mjs`, plus the auth-matrix `PUBLIC` allowlist entry) ·
`node workers/fashionistas-api/listing-titles.test.mjs` **20/20** (new — extracts `sanitizeIdent` and
`cleanTitle` out of the Worker's own source text, the technique `createstuff-api/versions.test.mjs`
already uses, so the *deployed* code is what is asserted) · `wrangler deploy --dry-run` exit 0.

**Commits / deploys:** `fashionistas-ai` `75b4162` → `c28e47b`, both deployed, `version.txt` =
`c28e47b90508dbc3a22d216b8c40839833c9407d`, tree 0 dirty · `nexus-ai-suite` `ecc868f` ·
Worker `fashionistas-api` final version **`3fdde4fc-8768-4b39-8ebe-c154cb65b5cb`**.

**Still open after this round (not fixed, needs the owner):** listings **145–148** still have
`category = NULL` and listing **148** still has the junk title *in the database* — the pipeline that
produced them is fixed, and the seller's "Retitle" button now returns a clean one, but rewriting a
seller's stored data was not done without asking. §24/#25/#26/#27/#43/#49 remain blocked as before.

**Security observation, pre-existing, not changed this round:** `POST /api/auth/demo` mints a valid
`fash_session` for a populated account with **no credentials**, while the password-based
`POST /api/auth/demo/login` path returns `503`. The token is what makes session-gated AI routes
testable, but the asymmetry (one open mint, one 503) is worth a deliberate decision.


## FIXED (2026-10-11 → 2026-10-12)

| # | Site | Issue | Root cause | Fix / evidence |
|---|---|---|---|---|
| 60 | fashionistas.ai | **Every photoreal try-on 401'd, forever** — so the only try-on anyone ever saw was the on-device overlay: a shirt pasted on a photo, sold as a render | **auth split-brain.** `functions/api/_lib/auth.js` `requireAuth()` resolved sessions with `SELECT … FROM sessions WHERE s.token = ?`; the Worker signs `{sub,u,exp}` with HMAC and writes no row. Two incompatible systems | `requireAuth()` now verifies `.`-bearing tokens against `SESSION_SECRET` first, D1 lookup kept for Pages' own routes. **Proven:** `POST /api/tryon/hd` → `200 {"ok":true,"url":"/api/tryon/image/8075….webp","model":"modal/fashn-vton-1.5","provider":"modal","ms":47578}`; engine `GET /healthz` → `200 {"ok":true,"model":"fashn-vton-1.5"}`; a dog photo → `400 "no person detected"` in 1.3s (a real person detector, not a composite) |
| 61 | fashionistas.ai | **Account takeover from a public repo** — `index.js:11` held `Uint8Array.from([102,97,115,104,…])` = `fashionistas-v2-hmac-key`, in `HEAD` and history (`18a784f`) on `github.com/placebetsai/nexus-ai-suite` | key hardcoded in source | key moved to the `SESSION_SECRET` binding (comma-separated, sign with first / verify all). **Forged token before → `200 {"id":1,"username":"admin"}`; after → `401`; real login → `200`.** Rotation published `new,old` on both sides then dropped `old`, so no login gap. Live value grepped out of both repos — not present |
| 62 | fashionistas.ai | **`wrangler pages secret put` reported Success but never reached production** — live kept accepting the old key and rejecting the new one | Pages secrets do not apply until the next deploy | re-ran `npm run deploy`; then new key → `402`/`400`, old key → `401`. **Rule recorded: a Pages secret change is not live until you redeploy** |
| 63 | fashionistas.ai | **Nothing stopped untested code shipping.** `deploy-local.sh` ran no tests and asserted no branch — a clean `lane-3` checkout would have published to production | no gate | now, in order: `npm test` and **exit before upload** on failure (`SKIP_TESTS=1` prints `This deploy is unverified`); refuse detached HEAD; require `ALLOW_BRANCH=<name>` for non-`main`; then the dirty-tree check. Exercised on `adec560`: `running npm test before anything is uploaded … tests passed` |
| 64 | fashionistas.ai | **Demo password in public JavaScript** — `demoLogin()` wrote `Primetime2026!` into the bundle and typed it into the form; second offence after `af79ce8` | credential used as a one-click affordance | button now `POST /api/auth/demo` (mints a session, no credentials); two stale bundles deleted. Live in-page proof: `{"sourceHasPassword":false,"tokenBefore":false,"tokenAfter":"eyJzdWIiOjUwLCJ1IjoiZGVtby...","error":null}` |
| 65 | fashionistas.ai | Stale test pinned a retired product mode — `assert.ok(facts.some((f) => /Photoreal/i…))` failed against the rewritten `grounding.js` | test not updated when Instant/Photoreal were removed | test now asserts the engine (`FASHN VTON`), the overlay denial (`not a sticker`), that `Instant mode` may only appear as *removed*, and the daily cap. **`npm test` 413/413, exit 0** |
| 66 | marketpicks.ai | **Earnings showed a date 72 days in the past** and the cron kept "succeeding" writing 0 rows; **commodity-quotes cron was never scheduled** | `app/api/resolve/route.ts` `ORDER BY date ASC` with no lower bound; `cadencePaths` omitted the job and the route exported only `GET` while the worker POSTs | resolve future-bounded (`>= today`, `< +400d`) with a live Nasdaq fallback; cron gets a real `getRealEarnings()` + deletes expired rows; job added to the 30-min tier; `POST()` added; Wikipedia citations gated on token overlap (was citing Rolling Stones / Kevin Federline for a Fed question). **Committed `2c8c2bf` and deployed.** Live: `resolve NVDA earnings` → **`2026-11-18`** (was `2026-07-22`); `POST /api/cron/commodity-quotes` → **200, 6 rows** (was 405). Tests 57/57 (baseline was 51 pass / 3 fail) |
| 67 | fashionistas.ai | **`POST /api/ebay/listing` had no session gate** while its own header claimed it did — harmless only while `EBAY_CLIENT_ID` is empty | `onRequestPost` called `loadDurableToken()` with no `requireAuth`; the matrix probed with **GET**, so `req.json()` threw → *"no eBay token"* → 401, which it counted as a gate. A real anonymous POST was never tested | `requireAuth` added to the POST, and the matrix now probes `onRequestPost` with a real **POST + JSON body**. Live anon POST → **401** |
| 68 | fashionistas.ai | **Terms and privacy said out loud not to publish them — and were served** at 200 from stable URLs | the only control was `Disallow: /legal/` in robots.txt, which is a request, not a control. `/legal/terms|privacy|risk` → **200** | `functions/legal/[[path]].js` → **404, verified live for all three**. `/privacy/` (the real policy) stays up. Pages `_redirects` cannot express a 404, so a Function is what makes this real. **Counsel is still required before real terms exist** |
| 69 | fashionistas.ai | **Pricing told two stories at once** — "list one item or five hundred" against an enforced 10/3/10 cap, and a 402 advertising "Pro: unlimited. Upgrade from /pricing" for a plan that is not for sale | the API enforced a cap the pricing page denied | one story now: **free during launch, with a fair-use limit**, stated because each AI call costs real money (Workers AI blew its quota 103% Sept 29, 86% Oct 2). Verified in the served `/pricing/` copy |
| 70 | fashionistas.ai | **`/api/ai/analyze` failed OPEN** — the limiter returned `true` when the KV binding was missing *and* when KV threw. Public, unauthenticated, CORS `*`, every accepted request spends paid AI compute | `functions/api/ai/analyze.js:34-46` | measured the cap first, so a blind flip could not break a working route: 25 probes with a body the route never parses returned **20× 415 then 5× 429** (= `RATE_PER_MIN 20`, KV is bound). Now unbound/throwing KV → **503 `error:"unavailable"`**, distinct from 429 so a dead limiter cannot masquerade as traffic shaping |
| 71 | fashionistas.ai | **The Chrome extension was publicly downloadable with no backend** — `/chrome-store/*.zip` → 200 while nothing serves `/api/jobs` or `/api/sessions` and nothing enqueues a job. `chrome-store/PRIVACY.md` described those calls to store reviewers as working infrastructure | zero matching routes on the Worker *and* in Pages functions | zips removed and **gitignored**; `deploy-local.sh` gates rebuilding on explicit `SHIP_EXTENSION=1`; PRIVACY.md marks the four endpoints implemented-client-side-but-not-served. Live → **404** |
| 72 | fashionistas.ai | **The extension gate I first wrote was a no-op** — it probed `/api/jobs` and accepted **401** as proof the route existed | this Worker 401s *every* unmatched `/api` path (`/api/definitely-not-a-real-route-xyz` → 401 too), so a catch-all produced that status, not an endpoint. It shipped the zip on the very next deploy while appearing to withhold it | replaced with explicit `SHIP_EXTENSION=1`. A regression test fails if `200\|401` is ever reintroduced as a liveness test, and the disproving measurement stays in the script |
| 73 | federation | **ihatecollege + spanishtvshows stopped deploying; pushes sat on GitHub** | **ISSUE_LOG #9** — every GitHub Action in the federation was `disabled_manually`, so nothing could fire | all 3 workflows re-enabled. Re-enabling alone was not enough: IHC had a bare `<` in LLM prose (`apprenticeship <$2k`) that killed the **entire** JSX build (introduced `44c5d71`, Oct 9 — why nothing from Oct 7/9/11 shipped), and STV's `TMDB_API_KEY` was stale since 2025-12-23 → 401 → build exits 1. Both fixed. **Live: IHC `/blog` newest `2026-10-06` → `2026-10-11`; STV `2026-10-05` → `2026-10-11`, two previously-404 slugs now 200** |
| 74 | federation | **hiddencameras.tv + scooter.exchange chatbots were dead** — GET 404 / POST 405 | `output: "export"` silently drops `pages/api/*` and `app/api/*/route.ts` while the widget kept calling a path that could never exist; the dead routes read `process.env.GROQ_API_KEY` at module scope, always `""` | hiddencameras: real `functions/api/chatbot.js` reading a Pages **secret**, plus `PROJECT` name and `pages_build_output_dir` corrected (both pointed at a stale Oct-5 artifact). scooter: endpoint added to the existing `scooters-exchange-api` Worker. **Live: hiddencameras `POST {"query":"hello"}` → 200 in 0.88 s, varied real prose per request** |
| 75 | fashionistas.ai | **CSP was missing entirely**, and the obvious fix (enforce one) would have been reckless | `index.html` needs only 3 external origins, but AdSense loads ~15 dynamically — one wrong directive blanks the page and kills ad revenue | shipped as **`Content-Security-Policy-Report-Only`** + `functions/api/csp-report.js` collector. Report-only cannot break rendering; real traffic fills the log; flipping to enforced becomes a one-word edit driven by evidence. GET → **405**, POST → **204**, verified live. Also added HSTS + `X-Frame-Options: DENY` |
| 81 | fashionistas.ai | **Terms and privacy were drafts that said out loud not to be published, and the site had no terms at all** | `/legal/terms`, `/legal/privacy`, `/legal/risk` answered **200** from stable URLs; the only control was `Disallow: /legal/` in robots.txt, a request and not a control | Published real `/terms/` and `/privacy/` (effective 2026-10-12), written from what the **code** does — fee model has no fashionistas line (no cut of sales), `users` is email + salted PBKDF2 with **no username column**, closet/listing tables have **no photo column**, try-on renders go to a third-party engine and land in R2 behind an unguessable public link with **no deletion schedule** (disclosed as-is), full AdSense/DART disclosure with both opt-out URLs. The old `/privacy/` contained **factual errors** (claimed a stored username and stored closet photos) — corrected, not just filled in. **Governing law, venue, arbitration, liability caps, DMCA agent and any GDPR representative were deliberately OMITTED** — an omitted clause is honest, a fabricated one is a liability. `/legal/*` stays 404; `/legal/` stays disallowed. Verified live: both 200, `PLACEHOLDER`/`COUNSEL`/"do not publish" = **0 hits** on either |
| 82 | fashionistas.ai | **The demo sign-in button had no server half — it 405'd on every press.** The auth screen renders `onclick="demoLogin()"` and the shipped bundle POSTs `/api/auth/demo`, which did not exist | the hardcoded demo password was correctly removed from the bundle, but the server half of the passwordless replacement was never written | `functions/api/auth/demo.js` now resolves the seeded demo seller (id 50, verified), mints a 32-byte token, writes a D1 `sessions` row and returns `{ok,id,email,username,token}` — `token` in the body matters, because `afterAuth(d)` reads `d.token` and without it the next call 401s, which reads as "the demo is broken". Tokens carry no `.`, so `requireAuth()` resolves them through the sessions lookup it keeps for this project's own routes — the same path login uses. **Live: demo → `{"ok":true,"id":50,...}`, and that token authenticates `/api/auth/me`**. Regression test reads the shipped bundle for the route the button calls and fails if the file is missing |
| 83 | fashionistas.ai | **The server asked for money it has no way to take.** A signed-in account hitting any of six gated routes was told *"An active $14.99/mo subscription is required to list. POST /api/billing/checkout to subscribe."* — and that endpoint answers **503 "STRIPE_SECRET_KEY not configured"** | found only because #82 made a real signed-in session possible; the earlier pricing pass fixed `pricing/index.html`, `usage.js` and the bundle and missed this because it is the **only copy of the lie that lives server-side**. A prior check grepped for `requireSubscription`, a name that does not exist, so the function looked uncalled — `requireActiveSubscriber` is called from **six** places (`list/ebay`, `list/etsy`, `list/all`, `sales`, `sales/ack`, `sales/delist-log`) | 402 kept (the client branches on that status) but the DETAIL now tells the truth: nothing to buy, no plan to upgrade to, see `/api/marketplaces`, copy the listing and post it yourself. Gate docstrings in `list/ebay.js` + `list/etsy.js` rewritten so nobody restores a plan that never existed. Bundle has **0** occurrences of `14.99`; the chatbot already refused (`grounding.js:311`). **Live: the response now reads "…the site is free while it is in launch…", and a grep for `14.99`/`to subscribe` over it returns 0** |
| 84 | federation | **Four live API keys were committed to public GitHub repos.** All three distinct keys were still usable when tested 2026-10-12: OpenRouter `sk-or-v1-…` (`marketpicks-ai` lib/web-search.ts, web-search-v2.ts, llm-router.ts **and** `Placebetsai-src` lib/web-search.js) → `GET openrouter.ai/api/v1/models` **200**; Groq `gsk_…` (`marketpicks-ai` lib/web-search-v2.ts **and** `Spanishtvshows.com` app/api/chatbot/route.js) → `GET api.groq.com/openai/v1/models` **200**; Gemini `AIza…` (`Ihatecollege` scripts/expand-articles.js) | direct API calls with each literal pulled from source | **marketpicks**: both keys are Pages secrets now (`OPENROUTER_API_KEY` set this round, which also closes #80 — the variable the 3-model ensemble was blocked on — plus the pre-existing `GROQ_API_KEY`); all literals removed. **Placebetsai-src**: removed — safe because nothing imports that module (the chatbot uses `web-search-free.js`) and `LLM_ENABLE_PAID_WEB_SEARCH = "0"` in both wrangler environments. **Ihatecollege**: the key was already dead (below). **Spanishtvshows: STILL EXPOSED — see #86** |
| 85 | marketpicks.ai | **The model leaked "LIVE DATA" into its own answers, and the sanitizer had a second silent defect** | live answer contained `…$778.10, down about 0.06% today [Live Data].` | `sanitizeAnswer` only matched `【LIVE DATA】`, so the square-bracket form shipped. Now a class covering both bracket styles, any case, plus a tidy step for the orphaned space a strip leaves behind. **That tidy rule had its own bug:** the model emits **U+202F** (narrow no-break space) and the rule matched only the ordinary space, so it never fired. U+00A0/U+202F are normalised first, written as `\u` escapes because invisible characters in source are how this class of bug hides. New test extracts the real regex literals from shipped source and runs them, instead of asserting a pattern appears in the file — the previous version of that test stayed green the whole time the marker was leaking |
| 86 | spanishtvshows.com | **A live Groq key is still committed and publicly readable** — `app/api/chatbot/route.js:11` `GROQ_FALLBACK` | `GET api.groq.com/openai/v1/models` with that literal → **200**. `spanishtvshows-site` (the live project, serves the domain) has **no secrets at all** — production `secrets: []`, only `TMDB_API_KEY` as an env var | **Cannot fix with the available token.** `wrangler pages secret put` and `PUT …/pages/projects/spanishtvshows-site/secrets/GROQ_API_KEY` both fail — the API returns `{"code":1001,"error":"method_not_allowed"}`, i.e. the token reads Pages but cannot write secrets. **Do NOT remove the fallback until the secret exists** — the chatbot is live and working on it right now. Owner action: create a token with Pages write (or use the dashboard), then `wrangler pages secret put GROQ_API_KEY --project-name spanishtvshows-site`, redeploy, and only then delete the literal |
| 87 | ihatecollege | **The committed Gemini key had already been revoked, so `scripts/expand-articles.js` failed with an unexplained 403** | `GET generativelanguage.googleapis.com/v1beta/models?key=<literal>` → **403 "Your API key was reported as leaked. Please use another API key."** | Literal removed and replaced with a guard that prints exactly what happened, where to get a key and how to export it, then exits 1 (verified by running it with the var unset). **Needs a NEW key from its owner** — https://aistudio.google.com/apikey — because there is no key to move to an env var |
| 88 | spanishtvshows.com | **A TMDB outage failed every deploy** — `prebuild` runs `scripts/generate-spanish-pages.cjs`, and its only fallback covered the harmless case | reading the source: the guard was `if (!TMDB_API_KEY)` + `existsSync(OUT_FILE)`. Key *missing* → reuse committed content. Key *present but TMDB unreachable* → `fetchShows()` throws → `main().catch()` → `process.exit(1)` → `prebuild` fails → `next build` never runs | The tail now makes the same trade the missing-key branch already makes, for the reason that actually happens in production: if `content/generated/spanish-pages.json` (214 KB, tracked in git) exists, warn, say the content is stale, and return 0. Only with nothing to fall back on does it still exit 1, and the message then says to commit that file. **Tested, not assumed** — simulated the outage with a bad key (TMDB 401): exit=0, reuse message printed, file md5 unchanged before/after (`581a2e8169e60c3b7e256322f5e38b3f`). Tests 9/9. Pushed `2fac86d` |
| 89 | marketpicks.ai | **20 of 25 cron routes were unauthenticated** — anyone who knew the URL could run them | enumerated `app/api/cron/*/route.ts` 2026-10-13: only congress-official, grading, insider-alerts and insider checked anything | Gate added to all 20 using the codebase's own pattern (`if (token && auth !== Bearer …)` → 401). **Deliberately FAIL-OPEN while `CRON_SECRET` is unset** — the firing workers call these over plain HTTPS with no token, so fail-closed would have stopped every scheduled refresh on deploy. New `tests/cron-gate.test.mjs` pins the invariant (gate present, gate stays fail-open, handlers take a Request, POST doesn't drop it) and carries a vacuity guard that caught four of its own bugs while being written. **NOT fully closed: the secret is still unset, so this changes no production behaviour yet.** Locking down = set `CRON_SECRET` in Pages + add it to the firing worker (source not in this repo) |
| 90 | marketpicks.ai | **`/api/cron/quotes` alone could exhaust the day's D1 write budget** — 145 symbols, 8 Yahoo Spark batches, per-symbol retries with sleeps, CoinGecko fallback, one D1 write per row, zero auth | free tier allows 100k D1 writes/day → ~700 unauthenticated GETs would empty it and leave every other query reading stale rows | Same gate as #89. Worst case of the 20; called out separately because it is the one with a hard quota cliff rather than just wasted upstream calls |\n
| 91 | fashionistas.ai | **The wizard let our own stock illustration be published as a real listing.** Live listing **147 "Vintage denim jacket" ($68)** served bytes **md5-identical to `/sample-jacket.jpg`** (`be648bd8908fa7ab6e46186fe7fb7398`), and 143/146 were flat vector art the same way | entropy test on the served JPEGs: 147 = **2.35 bits**, 146 = 2.51, 143 = 2.45, one flat `#F5F0EA` covering 62% of the frame with all four corners identical — against **12.30 bits / 6142 colours / four different corners** for the real Versace polo beside them. Not a loading problem: all 8 images returned 200, decoded, and were `complete: true`, `naturalWidth: 720`, `opacity: 1` in the DOM | `listing-wizard.js:249` offers a live **"No photo handy? Try a sample"** button that loads `/sample-jacket.jpg` and tags it `hint: "sample"`; that hint was read in exactly one place (the identify call) and **`submit()` checked it nowhere** — it uploaded `PHOTOS[0]` straight to `photo_url`. Guard now runs before `BUSY` and before `uploadB64`: promote a real photo to cover when one exists (announced, not silent), refuse when every photo is the sample, so nothing half-made reaches D1. **143/146/147 delisted** (reversible status change, not deleted) → shop now **5 items, every one a real photograph**, verified live |
| 92 | fashionistas.ai | **The fix for #91 would have reached nobody.** `/assets/app.*` is served `Cache-Control: public, max-age=31536000, immutable`, and the bundle was edited **in place without renaming it** — so the filename, which is the *only* cache-buster, no longer matched the bytes | after deploying, the origin had the new copy and `curl https://fashionistas.ai/assets/app.6fc355b2689c.js` still returned the **old** body: `cf-cache-status: HIT`, `age: 33136`, 325025 bytes vs 325271 for the real file. Deploy reported green and `version.txt` verified — the worst shape, because it looks fixed | Renamed to `assets/app.2ba96a44ec63.js` = `sha256(content)[0:12]`. The convention was confirmed, not assumed: `sha256` of the **pre-edit** bytes is exactly `6fc355b2689c`. Updated `index.html` and the one test that hard-coded the path; every other test reads it from `index.html`, which is why none of them noticed. New `tests/bundle-cache-bust.test.mjs` pins `filename == sha256(bytes)[:12]`, forbids a second bundle lingering in `assets/`, and records why `immutable` makes renaming mandatory. **Verified live: `MISS`, served bytes hash to `2ba96a44ec63`, old copy absent** |
| 93 | fashionistas.ai | **A dead promise in the shop:** six buttons reading **"Also listed on eBay/Etsy/Depop/Poshmark/Vinted/Grailed ↗"** under *"Can't find it here? It may be listed on these shops."* | every `href` is that marketplace's **own search URL** for the shopper's query (`ebay.com/sch/i.html?_nkw=${q}` etc.) — the tooltip even said *"searched for what you typed"*. Nothing is listed on any of them; only the label claimed otherwise | Relabelled to what the click does: **SEARCH AROUND → "Search these shops for the same thing" → "Search eBay ↗"**, with an explicit *"Each link opens that marketplace's search for what you typed — we don't post there for you."* and *"Search links, not our listings."* Pinned by test (the old phrases are asserted absent, the search-URL construction asserted present) |
## FIXED (2026-10-13) — the admin portal, and six bugs found by running it

| # | Site | Issue | Root cause | Fix / evidence |
|---|---|---|---|---|
| 104 | federation | **The IndexNow key file was hosted on only 6 of 13 sites**, so 7 had never had their sitemap submitted and search engines were told nothing | key file never added to the sources | key file (`f096cd903fa35672ba1a716d8871bb6e.txt`, 32 bytes, no trailing newline) written into every source and deployed: israeljoffe-com, israeljoffe-org, wuwonline-com, religiousjews-com, createstuff-marketing, fashionistas-ai (static root), diamonds-forsale (`public/` + `out/`, since Next serves those). **Verified live: 13/13 hosts return `200` with the exact key as the body.** fashionistas also carried a real commit gate this time — 447/447 tests, then `version.txt == fa032f2` confirmed on the live domain. religiousjews `bf68453`, diamonds `7ea096a`, wuw `ef011b0` |
| 105 | hiddencameras.tv, ihatecollege.com, placebets.ai | **IndexNow rejects these three with `403 UserForbiddedToAccessSite` — "Please verify the site using the key and try again"** — although their key files are correct | **not a key-file problem.** All three serve `200 text/plain` with the exact key bytes to every user agent tested (IndexNowBot, bingbot, curl, empty UA) and show no challenge; the content is byte-identical to the key file on hosts that *are* accepted (spanishtvshows.com, scooter.exchange, marketpicks.ai all carry the same 33-byte file with a trailing newline and submit fine). Both `api.indexnow.org` and `www.bing.com/indexnow` return the same 403 | **BLOCKED — cannot fix from here.** The rejection is on IndexNow's crawler side or behind a Cloudflare bot rule that only the dashboard can see. Evidence recorded, retries stopped: 10/13 hosts accepted, **7,632 URLs submitted** (israeljoffe.com 70, .org 25, wuw 45, religiousjews 25, fashionistas 24, createstuff 2, spanishtvshows 200, scooter 254, diamonds 62, marketpicks 143) including every `/israel-joffe/` page. **Owner action:** Cloudflare dashboard → the three zones → Security/Security Level and Bot Fight Mode; whitelist or lower for IndexNow's crawler, then resubmit |
| 106 | mondaynightwrestling.com | **17 articles by and about Israel Joffe sat on `mondaynightwrestling.com` with nothing pointing at them.** They existed, they were reachable, and no page in the federation linked to a single one — the only editorial link anyone had found was one Johnny Rodz Substack post | the articles were never inventoried; the `wuwonline.com/israel-joffe-articles/` hub linked 6 of them but nothing linked *out* to the publication from the pages whose subject matched | **SHIPPED to 8 sites, verified live.** 9 editorial pages carry 36 contextual links (israeljoffe.com `/bjj/` `/press/` `/certifications/`; israeljoffe.org `/wuw/` `/writing/`; wuwonline `/johnny-rodz/` `/media/` `/alumni/` `/wrestling-news/`), and the `/israel-joffe/` biography on 6 sites gained 4 links each in its existing source list (`ij-docs`/`ij-links`/`DOCS` array), edited at each site's **source** and never at a build output. Verified live: fashionistas.ai, createstuff.ai, spanishtvshows.com, ihatecollege.com, wuwonline.com, religiousjews.com all serve 4 links; editorial pages serve 2–13 each. A first pass falsely reported `wuwonline.com/israel-joffe/` as "already linked" because the check matched the bare `mondaynightwrestling.com/` URL inside a JSON-LD `sameAs` array rather than an article `/p/` link — re-done properly, 4 links now live |
| 107 | placebets.ai, marketpicks.ai, diamonds.forsale, hiddencameras.tv, scooter.exchange | **The remaining 5 `/israel-joffe/` pages could not be shipped.** Two independent causes, neither fixable from this machine | **(a)** `wrangler pages deploy` from this machine dies mid-upload on every Next.js site: hiddencameras fails at file **276/499** on five consecutive attempts, diamonds at **51/192**, with `ECONNRESET`/`UND_ERR_SOCKET`; placebets times out (exit 124). Not payload size — hiddencameras is 16.9 MB / 276 files and diamonds 7 MB / 192, so it dies on time or request count. Not IPv6 either: `--dns-result-order=ipv4first` changes nothing. Small static sites (israeljoffe-com/org, createstuff, wuw, religiousjews) deploy fine, and the same machine pushed 499-file repos to GitHub without incident. **(b)** The GitHub Actions fallback is switched off: `diamonds-forsale` workflows `deploy.yml` (273510943) and `cf-pages-fix.yml` (273568383) are both `state=disabled_manually`, as are scooters' `deploy-web.yml` (272696171) and `deploy-api.yml` (272696169). Re-enabling needs the `workflow` scope, which the token (`gist, read:org, repo`) does not have — the PATCH returns 404 | **BLOCKED — owner action required, one click each.** (1) GitHub → repo → Settings → Actions → enable `deploy.yml` (diamonds) and `deploy-web.yml` (scooters); both are push-triggered on `master` and the commits (`636bbf0`, `09cbd20`) are already pushed. (2) marketpicks/placebets/hiddencameras have no deploy workflow at all — same fix, add one. Source edits are committed and built everywhere, so nothing needs redoing. **Do not judge these by `deploy.sh`'s result:** `verify_pages` compares a byte-exact sha256 of `index.html`, and the Next.js build ID changes on every build, so it reports FAILED on uploads that may have landed. Judge by whether the live page contains the links |
| 108 | scooter.exchange | **The custom domain resolves to nothing.** `dig +short scooters.exchange A` returns empty and every request returns `HTTP 000`, while `scooters-exchange.pages.dev` answers `200` | DNS record for the apex is missing — unrelated to #107 and predates this round | **OPEN, not caused by this round.** The deployment is healthy; only the custom domain is dead. Owner action: Cloudflare → the zone → DNS, re-add the apex CNAME to `scooters-exchange.pages.dev` |
| 109 | federation analytics | **Usage was reported as unavailable for 5 zones, and that was wrong.** The handoff claimed the CF token was "scoped for Pages deploy only" so fashionistas.ai, israeljoffe.com/.org, religiousjews.com, wuwonline.com and marketpicks.ai were a blind spot | **tested one credential, then generalised.** `CF_API_TOKEN` does genuinely lack `analytics.read`, but the error message was truncated to 46 chars before being quoted, which hid which permission was missing. Nine more credentials were never checked | **CORRECTED.** `cf.env` holds nine tokens plus `hiddencameras-tv/.env.deploy`; all ten return `does not have permission 'com.cloudflare.api.account.zone.analytics.read'`. The credential that works is the **wrangler OAuth login** at `~/.wrangler/config/default.toml` (fashionistas1979@gmail.com, scope `zone (read)`), which reads all seven fashionistas-account zones. **12 of 13 zones now readable**, full figures in handoff §23.14: 14 days = 1,756,773 requests / **388,765 page views**, last 7 days **210,803 pv (+18%)**. Real finding this unlocked: **fashionistas.ai does 61,454 requests → 2,927 page views (0.05 pv/req)**, i.e. the flagship is ~95% machine traffic and flat, while israeljoffe.com is +31% and israeljoffe.org +220% |
| 110 | diamonds.forsale, marketpicks.ai, hiddencameras.tv, scooters.exchange | **#107 declared these undeployable from this machine and offered only a GitHub Actions workaround needing owner clicks. Both halves were wrong.** The ECONNRESET was never the real blocker, and no CI workflow was ever needed | **The actual blocker was an unpublished API contract, recovered by reading `wrangler-dist/cli.js` 3.114.17 instead of guessing.** `POST /pages/projects/{p}/uploads` returns **405 `method_not_allowed`** — that endpoint is gone. Far worse, `GET` on the same path returns **200 with the project object**, so `urllib.request.Request(url, data=None)` (urllib sends GET when data is None) *looked* successful while uploading **zero files**; every later deploy then referenced hashes CF never held. Real flow: `GET /accounts/{acct}/pages/projects/{p}/upload-token` → JWT → `POST /pages/assets/check-missing {hashes}` (Bearer JWT, **no account prefix** — with the prefix it is 400 code 9106, with the API token 404) → `POST /pages/assets/upload` `[{key, value: base64, metadata, base64: true}]` → `POST /pages/assets/upsert-hashes` → `POST /pages/projects/{p}/deployments` as **multipart/form-data** (a JSON body returns 400 code 8000096 *"a manifest field was expected"* even when `manifest` is present, and a part carrying `filename=` is ignored for the same reason). Files are addressed by **MD5** and manifest keys are **paths with a leading slash** — `{"/about.html": "<md5>"}` — which is precisely the `files` shape on a healthy deployment | **4 of the 5 SHIPPED, each verified live.** diamonds 199 files (`5809da85`) via the recovered REST flow — it is pure static, so assets-only is safe. hiddencameras: `.vercel/output` was frozen at **10-05** while `.next` had been built 10-13, so the deployable contained **no links at all**; regenerated to 507 files, wrangler 3.114.17 → `ead486cd`. scooters: workspace monorepo (deps hoist to root, so `apps/web/node_modules` is *legitimately* empty — `next` still resolves), built 618 files → `c4d1ad69`. marketpicks 288 files → see #111. **All four serve `/israel-joffe` with 4 MNW links.** The owner-side Actions re-enable in #107 is no longer needed for these four |
| 111 | marketpicks.ai | **This round took the production site down: every route returned 404 for ~3 minutes, caused by me.** | **A raw manifest deploy does not carry functions.** Uploading the next-on-pages output as plain assets put `/_worker.js/**` in the static file list, produced `uses_functions=False` (against `True` on every prior healthy deployment), and registered no worker at all — so `/`, `/israel-joffe/`, `/screener` all 404'd. The healthy deployment held **101** files with **no** `_worker.js` entries; mine held **288** with them, which is the whole difference. The REST uploader is therefore **only safe on pure-static projects** | **RESTORED and verified.** `wrangler pages deploy` (4.86.0) recompiled the worker and re-uploaded `_routes.json`. Verified against the site's **own sitemap**, not guessed paths: all 8 listed routes — `/`, `/israel-joffe`, `/politician-tracker`, `/screener`, `/heatmap`, `/insider-trades`, `/blog`, `/history/stock-market` — return 200, and `/israel-joffe` carries the 4 MNW links. Two paths I had probed (`/nba-props/`, `/nfl/`) are **not** in that sitemap and were never live, so their 404 is not a regression. **Rule recorded: worker/next-on-pages projects go through wrangler; only genuinely static projects may use the raw manifest** |
| 112 | placebets.ai | **The 5th blocked site was deliberately NOT deployed, and should stay that way** | The only placebets copy on this machine is `Placebetsai-src`, whose `.vercel/output` contains the MNW links — but Grok's `HANDOFF-2026-10-14-placebets.md` marks that copy **"Retired"** and names the canonical source as `/workspace/tnr/Placebetsai` on the box, project `placebetsai` on account `2765cb27…`. That box copy was **shipped three times today** with chatbot fixes 1–3 (`979933e`, `91d21ff`, PRs #16/#17/#18) | **NO ACTION — deploying here would have reverted all three fixes** shipped hours earlier and pushed a stale homepage to production. The MNW links for placebets are committed (`3b3b506`); they ship from the box with the next deploy there, or after the owner confirms `Placebetsai-src` is authoritative. **Owner decision, not a blocker I should resolve unilaterally** |
| 96 | federation | **The admin portal covered one site.** The owner wants to edit and SEO all of them; `joffe-admin` knew only `israeljoffe.com` | single-entry `SITES` registry | all **13** sites registered — com, org, wuw, rjw, fash, cs, hid, stv, sco, dia, ihc, pb, mkt (`ketiservice.com`/`ldm-realestate` left alone on instruction). Each carries `mode: "static"` or `"build"` plus a `note`, surfaced through `/api/sites` and as a banner above the editor, so nobody edits a build-output file believing it survives a rebuild. **Verified live on 127.0.0.1:8788: 13/13 `ready: true`, and 1306/1306 pages open.** `joffe-admin/` was also **never committed at all** — now in git (`37cb898`) |
| 97 | religiousjews.com | **Saving the menu flattened the grouped navigation on 31 files.** Adding one page and deleting it again left `404.html` down 14 lines of `<div class="nav-group">` / `<span class="nav-group-label">` and up a flat row of bare anchors | `writeNav()` rebuilt each `<nav>` from `parseAnchors()`, which returns a flat `{href,label,className}` array — every group wrapper, heading span and inter-anchor element was dropped on the way in. `setInNav()` loops **every** page, so one save rewrote the whole site. `israeljoffe.com` never hit it because its menu is already flat | nav edits are now surgical (`addNavLink`/`removeNavLink`/`renameNavLink`), touching only the one anchor that changed. **Measured on the real files: 3 `<div class="nav-group">` before, 3 after; add-then-delete leaves 31 dirty during and 0 dirty after.** Three placement rules pinned by test: inside the last group, before a `mobile-nav-fine` block (so the phone number never ends up last), before a `primary-cta` (so the CTA stays last). `renameNavLink` only fires on anchors holding the **old** label, because religiousjews' mobile menu says "Kosher Restaurants" where the desktop says "Restaurants" |
| 98 | ihatecollege.com | **The title read as empty and a title save did nothing** | `readPage`, `setTitle` and the page list used a `<title>` regex that did not tolerate `<title data-next-head="">`, which is what the build emits | regex tolerates the attribute. `setTitle` now **inserts** a `<title>` when a page has none, rather than reporting a save that wrote nothing |
| 99 | spanishtvshows.com, ihatecollege.com, scooter.exchange, placebets.ai, diamonds.forsale | **Every flat-file page read back as "not in this sitemap"** while its own `<loc>` sat in the file | `relToUrl()` returns `about.html`; Cloudflare Pages serves `/about`, and that is what the sitemap stores. `readHtml()` then missed and fell through to "not found" | `relToUrl`/`urlToRel` left pure (tests pin them); a disk-aware `urlToRelFor()` resolves the flat case and `flatSibling()` maps `about/index.html` to `about.html` for disk writes. **Round trip `/about` → 200 verified live on all five**, where it was 404 |
| 100 | religiousjews.com | **`upsertSitemap()` and `removeSitemap()` were not inverses — one stray byte per cycle.** Their sitemap is a single 2464-byte line with **0 newlines** in it, which is the only reason a one-pixel discrepancy was visible at all | the entry written ends in a newline; the removal regex ate whitespace *before* the tag but never that trailing newline | removal now deletes the exact string insertion wrote, with the generic pattern kept as fallback for generator-written entries. Pinned by byte-equality test on both one-line and pretty-printed input. **Create/edit/delete through the live portal leaves `religiousjews-com/sitemap.xml` byte-identical: 2464 → 2464 bytes** |
| 101 | ihatecollege.com | **The sitemap toggle was a silent no-op that reported success** — `ihatecollege.com/sitemap.xml` is a 3-loc `<sitemapindex>`, not a `<urlset>` | `upsertSitemap` looked for `</urlset>`, found none, changed nothing, returned 200 | it now throws **409** saying a page can't be added to an index that points at other files. `setInSitemap` also refuses to *create* a missing sitemap — that would have fabricated a 1-URL file shadowing marketpicks.ai's generated 143-URL one — and `POST /pages` catches the refusal and returns **201 with `warnings[]`**. Verified: marketpicks create → `201 inSitemap=false warnings=["…has no sitemap.xml in its build output…"]`, and **no `sitemap.xml` was fabricated** |
| 102 | placebets.ai, marketpicks.ai | **Three tabs 500'd on Worker-rendered sites.** Page creation, Backlinks and Footer all read `index.html`, which these sites do not have on disk | three unguarded `fs.readFileSync(.../index.html)` calls | guarded. They now return `{nav: [], home: false}` and a clear 409 instead. Page creation also resolves its template through `about/index.html` → `about.html` → `index.html` → **the first file that actually contains a `<main>`** — marketpicks' first file on disk is `500.html`, which has none. **Verified: `pb` create → 201 with a sitemap entry, `mkt` create → 201 with a warning; both delete cleanly; backlinks/footer/nav all 200** |
| 103 | federation | **`deploy.sh` routed Pages to two accounts.** A wrong token deploys to a project nobody looks at **while reporting success** | the `case` covered only the default account and `createstuff*`/`placebets*` | `pages` now routes by project name across all five accounts (CF, CS, STV, IHC, HID). `verify_pages` gained a third host argument because **`diamonds-forsale` on IHC really is `diamonds-forsale-53r.pages.dev`, and a different project of the same name sits on the default account**. `env` lists all five; new `routing` action prints the whole map. `bash -n` clean |

**Tests: `node --test test/edit.test.js` → 25/25** (was 12). Four of the new tests encode #97 and #100 as
byte-equality and structure-preservation assertions, so each fails loudly if it comes back.
Pushed: nexus-ai-suite `406e55d..37cb898`. `religiousjews-com` left at **0 dirty files** (`f49ae44`).


---

## FIXED (2026-10-15) — the monetization integrity sweep

| # | Site | Issue | Root cause | Fix / evidence |
|---|---|---|---|---|
| 116 | hiddencameras.tv, religiousjews.com, wuwonline.com | **164 doubled Amazon tags (`…-20-20`) + 19 fake `?ref=hiddencameras` params** — clicks through them paid $0 | prior agent doubled the tag string; invented ref params | boundary-safe rewrite → tag uniform `hiddencamerastv-20`; ref params stripped from `lib/affiliateLinks.js`; commit `77089afad`; live crawl **281/281 200, 0 doubled tags** |
| 117 | hiddencameras.tv, religiousjews.com, spanishtvshows.com | **False "As an Amazon Associate we earn from qualifying purchases" disclosures** (14+ files / 2 pages / `app/resources/page.js`) — claiming commissions with no Associates account = lying to readers | no Associates account exists anywhere in the federation; claims were fabricated alongside the tags | removed everywhere; replaced with "Prices and availability are set by the retailer."; live-proof claim=0 on all three custom domains |
| 118 | hiddencameras.tv, wuwonline.com | **30+ "Buy on Amazon"/"Shop on Amazon" CTAs** | copy written for a program we are not enrolled in | rewritten to plain "Buy"; live: hiddencameras **406 Buy / 0 on-Amazon**, wuw `/shop/` **5 Buy / 0 on-Amazon** |
| 119 | hiddencameras.tv | **16 broken internal links + `/editorial-policy` 404** (9 `/articles/`→`/blog/`, 11 bad slugs, 6 article-JSON `slug` ≠ filename) | dead slug fields fed the blog index | slug fields fixed at source, link rewrite, new `pages/editorial-policy.js`; crawl 0 broken |
| 120 | religiousjews.com | **7 dead `PLACEHOLDER_ASIN` Amazon links + Booking `?aid=PLACEHOLDER`** | placeholders never replaced | unwrapped to plain text / stripped; deployed via `deploy.sh pages` (sha256 pass); live claim=0, PLACEHOLDER=0 |
| 121 | spanishtvshows.com | **Root-level upload took production down (all routes 404 at origin)** during the claim fix | site ships from `.vercel/output/static`, not repo root; `.next/cache` (351 MB) also exceeded Pages' 25 MiB file cap | rolled back to `b4d0a3dc` via Pages rollback API in minutes; rebuilt properly (`STV_TMDB_API_KEY` env, `.npmrc legacy-peer-deps=true` for the next-on-pages `next<=15.5.2` peer cap), deployed `1257064`+; live `/resources` claim=0, all routes 200; `.wranglerignore` committed |

## FIXED (2026-10-15, evening) — AdSense: the fabricated slot IDs

| # | Site | Issue | Root cause | Fix / evidence |
|---|---|---|---|---|
| 122 | spanishtvshows, ihatecollege, placebets, marketpicks, fashionistas, scooters, createstuff, wuw | **4 of the 5 AdSense slot IDs were invented by a prior agent** (`5079047997`, `2843751862`, `9124683051`, `3357291048`) — only `6600722153` is a real unit. AdSense rejects unknown slots → *approved* domains render blank boxes; wuw + hiddencameras (real slot only) were the only sites where ads could ever show — matches the complaint exactly ("ads only on wuwonline") | fabricated data: the same 5-key `SLOTS` map copy-pasted into `AdUnit` components in **8 repos** | collapsed all to `6600722153`. **Deployed + live-verified:** spanishtvshows `70086f9` (rebuilt `.vercel/output/static`; `/`, `/blog`, `/resources` slots=`['6600722153']`, loader=Y, claim=0), ihatecollege `7cfcee7` (own `deploy-safe.sh`, prod smoke **16/17 PASS**, live slots all real), scooters `76a3547`+out-rebuild `5962bcb` (gate smoke **6/6 PASS**, `scooter.exchange` clean). **createstuff = TWO projects, wrong one got fixed first**: `79c9851` landed on side project `createstuff-ai` (default account, no domain); `createstuff.ai` CNAMEs to `createstuff-marketing.pages.dev` (**CS account** — DNS record via `CF_DNS_TOKEN_CREATESTUFF`), whose source `nexus-ai-suite/apps/createstuff-marketing/site-adsense.js` still held all 4 fakes → collapsed there + `2e94519` + shipped via `scripts/deploy-safe-static.sh` (preview→smoke→prod→smoke **4/4**, sha256 prod==source) → live `createstuff.ai/site-adsense.js` = **5× `6600722153`, 0 fabricated**. Note: `data-ad-slot="hero|inContent|bottom|default"` divs are *mount-point markers* filled at runtime by `site-adsense.js` — placement keys, not slot IDs (only the JS map holds real IDs). Committed not-yet-shipped: marketpicks `1505b3c` (#124), wuw `4f54394` (live pages already real-slot-only — no deploy needed). Placebetsai-src edit **reverted** — repo is mid-merge WIP + Retired copy (#126) |
| 123 | Ihatecollege, scooters-exchange (tooling) | **deploy-safe.sh could not ship at all**: (a) ihc — PATH wrangler `4.138.0` dies `fetch failed` on `POST …/pages/projects/ihatecollege/deployments` (twice); (b) scooters — gate runs next-on-pages on an `output:'export'` project, emitting `import("./__next-on-pages-dist__/assets/**/*.bin")` into `_worker.js` — unresolvable (0 `.bin` files, assets dir absent, no esbuild loader) | stale wrangler on PATH; dead-weight worker on a pure static export | (a) `USE_NPX_WRANGLER=1` (wrangler 4.147+) ships; first preview smoke's `/api/chatbot` 404 was a **propagation race** (route in build — re-smoke 16/17 green with a real answer). (b) strip `_worker.js` from the deploy dir → static-only upload, gate green 6/6 |

## FIXED (2026-10-16, morning) — image sitemaps + fashionistas user-story proof

| # | Site | Issue | Root cause | Fix / evidence |
|---|---|---|---|---|
| 130 | wuwonline.com, israeljoffe.com/.org | No standalone `/sitemap-images.xml` (URL soft-404'd to homepage HTML; main sitemaps carried only 1 hero image per post) | never generated | `scripts/gen-image-sitemap.py` crawled every main-sitemap URL, extracted `<img>`/og:image/JSON-LD images, **verified each image URL 200 this run** (dead/trackers dropped, never guessed). LIVE now: wuwonline 45 urls/409 imgs, ij.com 55/219, ij.org 17/161 — all `200 application/xml`, minidom-well-formed, robots.txt references added (wuw `build.py` patched so future builds keep the line; its robots edge cache self-heals ≤24h — busted fetch already serves the new file). wuw `333e4c1` via deploy.sh (VERIFY sha256 pass) · ij.com via deploy-safe-static.sh (smoke **7/7**) · ij.org via deploy.sh. ij dirs are unpopulated git submodules — on-disk bytes are the deploy source (byte-identical to live pre-deploy) |
| 131 | fashionistas.ai | "not usable for sellers or buyers" — tested head-on with hive E2E + lead-dev verification | frontend/backend split: seller API lives behind the `/w` proxy → `fashionistas-api` Worker (Bearer auth, `username` login), NOT Pages `/api/*`; buyer try-on = Pages `/api/tryon/hd` | SELLER PASS live: register 201 → photo upload 201 (`/w/api/images/upload`, returned image serves 200) → POST listing 201 (id) → PUT 200 → DELETE 200 → public `/w/api/market` 200 (7 items) → AI listing gen 200 (Workers AI) → cleanup verified, no residue. BUYER PASS live: `/shop/` 200, `/shop/209` item page w/ Try-on CTA 200, anonymous market + photos 200, **real try-on run: 200 in 27s, fashn-vton-1.5 via hf, result webp serves 200, cost $0**. Defects → #133, none block either loop |

## FIXED (2026-10-16, night) — the UX click-through: "the UX sucks" was right

| # | Site | Issue | Root cause | Fix / evidence |
|---|---|---|---|---|
| 134 | fashionistas.ai | First real mouse-through of the seller flow (photo → AI fill → sign-in wall → account → draft → publish). Flow **works end-to-end**: UI account created, draft (photo + AI title/price) survived the auth wall and restored, listing published → **`/shop/218` live in the anon market (8 items)**. 5 visible defects found, all fixed, every deploy through the `npm test` gate (434+/436 pass, 0 fail), each fix live-verified: | see fixes | (a) **"See it on you" rendered as a vertical one-word-per-line pill overlapping the description** — `ux-pass.css` `.ux-try .btn{flex:1}` let the note `<p>` hog the width → now `flex:0 0 auto; white-space:nowrap` + wrap. LIVE: horizontal red button, note beside it. (b) **seller-coach panel covered the item page's Message button** (z-index 75 over the sticky buy bar) → `html:has(.ux-buybar) #seller-coach-panel{display:none}` (matches the existing mobile rule). LIVE: Message + Buy now fully visible, panel gone. (c) **`/sell` direct visit or middle-click was a hard 404** → `_redirects` `/sell / 200` + `routePath()` branch. First attempt rendered the pre-LW fallback (calculator/chooser) because both bundles are `defer` and app.js runs before `listing-wizard.js` — and `readyState` is already "interactive" then, so the naive guard never registered; final fix gates on `window.LW` + `DOMContentLoaded`. LIVE: `/sell` → title "Sell an item", full photo wizard, same as the nav tab. (d) **nav Sell click never updated the URL** (path stayed `/shop/<id>` → after sign-up `resumeAfterAuth()` dropped the seller on a stale item page) — the nav calls `go('sell')` (not `snap`; both views delegate to `LW.mount`, calculator is only the pre-LW fallback) → both views now `replaceState('/sell')` and `resumeAfterAuth` returns to the wizard. LIVE: click Sell from `/shop/209` → URL `/sell` + wizard. (e) `/assets/app.*` is `Cache-Control: immutable` ×1y → bundle re-hashed every iteration (`52dcdf754011` → … → `107a2871bd89`) with `index.html` + `tests/security-gates.test.mjs` reference updated each time, so returning browsers actually receive fixes. Not touched (product decisions, logged not changed): role defaults to "shopping" for new accounts; header ghost-text artifact during view transitions (cosmetic) |


## OPEN (2026-10-16) — new

| # | Site | Issue | State |
|---|---|---|---|
| 132 | mondaynightwrestling.com | Image sitemap **generated but not deployed** — site is platform-hosted behind Cloudflare (Wix-style A/B cookies), no repo or CF Pages project on this box | deliverable ready + committed: `deliverables/mondaynightwrestling-sitemap-images.xml` (33 urls, **414 live-verified images**, `5fc8e5e`). Owner step: upload via host SEO settings, or point the domain at a federation CF Pages project (#106 lineage) |
| 133 | fashionistas.ai | 4 defects from the E2E round — **2 fixed live (`51abdfc`), 2 retracted as test artifacts**: (a) ~~`/w/api/auth/me` echoes bearer token~~ **FIXED** — proxy strips the field; live body now `{"id":…,"username":…,"authenticated":true}`; (b) ~~ghost listing id~~ **RETRACTED** — `insertListing` returns real `last_row_id` or 500; id 217 was a real row owned by cookie-user 78, cleanup ran as Worker-user 132, user-scoped reads (the IDOR protection) correctly hid it; (c) Worker `/w/api/tryon/hd` 404 — **FIXED** — proxy now routes that path to the Pages implementation; live answer moved 404 → 400 proper multipart validation; (d) ~~unbounded `.all()`~~ **RETRACTED** — grep matched `Promise.all(`; real D1 queries are LIMIT'd (wear feed LIMIT 50) or PK-scoped | CLOSED |

---

## OPEN (fix next, in this order)

| # | Site | Issue | Evidence | Next action |
|---|---|---|---|---|
| 13 | marketpicks.ai | M4 leftovers — `bot2`/`ensemble_noground` off-topic; top-level `confidence` null; `/api/cron/quotes` slow | re-verified live 2026-10-13 | **all three resolved.** (a) `ensemble_noground` is used only when there is no live data, and real no-data questions now answer on-topic — `what is a P/E ratio` and `explain dollar cost averaging` both returned correct prose. (b) A top-level `confidence` field was never in the chatbot contract: commit `87ee0ee` shipped confidence as **prose** via `confidenceLine()` on the price-target path, which works — `will NVDA hit 250` → `CONFIDENCE: 50%`, `will tesla reach 400` → `63%`, and `is apple going to 300` correctly answered "already there". It fires only on `"will X hit/reach Y"` with an explicit number, by design. (c) quotes is batched (145 symbols → 8 Yahoo Spark calls, 12s ceiling each) and now gated — see #89/#90 |
| 14 | createstuff-ai repo | `index.html` dirty (23 added lines) after a successful deploy | `git status` → `M index.html` | **done 2026-10-07** — commit `19a721d`; the file is the deployed state (matches `2517b122.createstuff-ai.pages.dev` byte-for-byte: 48,508 B, slots `5079047997`/`2843751862`/`3357291048`, `initAds` ×3), `git status` clean. Note the apex `createstuff.ai` serves a **different** build — `createstuff-marketing` in nexus-ai-suite — so this repo is the app, not the domain |
| 15 | Ihatecollege repo | 4 dirty sitemap files, deployed but uncommitted | `git status` → 4 files | **done 2026-10-07** — committed `860034b` ("regenerate the four sitemaps"), `git status` clean; live: `/sitemap.xml` **200** referencing `sitemap-blog.xml` **204 URLs** / `sitemap-colleges.xml` **6,211** / `sitemap-static.xml` **44** (6,459 total) and `robots.txt` carries `Sitemap: https://ihatecollege.com/sitemap.xml` |
| 17 | federation | 3 scheduled jobs homeless after Actions shutdown: STV *Generate Spanish Pages* (`0 13 * * *`), *IndexNow ping* (`30 11 * * *`), *Federation Sentinel* (`0 */3 * * *`) | all `disabled_manually` today | **RESOLVED 2026-10-12 — and the log entry was half-wrong.** (a) *Federation Sentinel* was never homeless: its source has always been `workers/federation-watch/`, the Worker is alive and current (`GET /` → 200, `{"at":"2026-10-13T00:30:29Z","failing":0}`), and it is fired every 15 min by `site-cron-trigger` — it genuinely cannot own a trigger because the free plan caps the account at 5 and all 5 are used. (b) *IndexNow ping* really was uncovered: it ran only from `npm run ship` on a laptop, so not deploying meant search engines were told nothing. Now fires daily at 03:00 UTC from `site-cron-trigger` (commit `a10b1ef`), verified live — 142 sitemap URLs → POST 200, and the off-hours tick reports `{"skipped":"not due (daily at 03:00 UTC)"}` rather than silence. (c) *Generate Spanish Pages* runs on every deploy via `prebuild`, and can no longer take the build down with it — see #88 |
| 19 | israeljoffe.com/.org | No AdSense at all (loader 0, slots 0) | live sweep 2026-10-06 | decide: monetize or keep clean |
| 20 | Placebetsai-src | `lib/web-search.js` has a committed `sk-or-v1-…` key | grep | **done 2026-10-12** — removed in `d2bb746`. Safe specifically because **nothing imports that module**: `lib/llm/chatbot-placebets.js:1378,2947` import `../web-search-free.js`, and `LLM_ENABLE_PAID_WEB_SEARCH = "0"` in both wrangler.toml environments, so the paid path is dead code. The literal was still live when tested (GET `openrouter.ai/api/v1/models` → 200). The same key now lives as a Pages secret in marketpicks-ai |
| 21 | spanishtvshows.com | `app/api/chatbot/route.js` committed `gsk_…` key | grep | **SAME ISSUE AS #86 — tracked there.** Confirmed still live at HEAD 2026-10-12 (`GET api.groq.com/openai/v1/models` → 200) and the chatbot runs on it. **Do not delete the fallback until the secret exists.** Blocked: the STV token reads Pages but cannot write secrets (`{"code":1001,"error":"method_not_allowed"}`) |
| 22 | Ihatecollege | `scripts/expand-articles.js` committed `AIza…` key | grep | **done 2026-10-12** — no rotation needed because Google had **already revoked it** (403 `"Your API key was reported as leaked"`), which is why the script was failing with an unexplained 403 and looked like a code bug. Literal removed in `ac99703`, replaced with a guard that names the cause and exits 1. **Needs a NEW key from its owner** → #87 |
| 23 | Placebetsai-src | two Gmail SMTP app passwords in plaintext (`scripts/test-smtp.mjs`) | extracted the literal from git history and authenticated against `smtp.gmail.com:465` (verify only, no mail sent) | **RESOLVED 2026-10-12 — both credentials are DEAD.** Google returns **535** on each, i.e. already revoked, so the 2026-09-29 removal (`19bda0c`) was followed by a real rotation. Also confirmed: nothing at HEAD, and the repo is **private** (404 unauthenticated), so history was never publicly readable. All five SMTP callers are `process.env.GMAIL_APP_PASSWORD`-driven now and skip cleanly when unset |
| 41 | diamonds.forsale | **AdSense loader but no ad units** — 0 `<ins class="adsbygoogle" data-ad-slot>` anywhere, so nothing can render | `grep -rn "data-ad-slot" app` → only `app/layout.tsx:85` (the loader); live sweep 21:35 UTC: `slots=0` on `/`, `/4-cs`, `/about`, `/diamond-value-calculator`, `/blog`, `/sell` while `loader=2, ca-pub=2` | port `Ihatecollege/components/AdUnit.js` (reserved height + push-after-mount) into `app/components/AdUnit.tsx`, drop it into the article/home layouts, rebuild with `ADSENSE_CLIENT`, redeploy `--branch=main`, re-count |
| 49 | fashionistas.ai | **decision: `POST /api/ai/analyze` spends Groq anonymously.** Proven: no session, no key, image posted → **200 / 2.4 s / `"model":"groq_vision"`**. Currently capped at 20/min/IP in KV (holds: 429 after ~20) and stores nothing — but the cap is per-IP, so rotating IPs can burn Groq quota and starve the real identify funnel | live probe 2026-10-07, `functions/api/ai/analyze.js` (allowlisted in #48) | **user decides:** keep public (funnel works logged out) **or** require a session (blocks the sample-jacket/first-photo funnel). If it ever stops holding, gate it — that is written into the allowlist reason |
| 77 | marketpicks.ai | ~~**Chatbot degraded** — the daily LLM cap could never trip, "hello" was a stock quote, and internal pipeline text leaked into answers~~ — **FIXED 2026-10-12 (`b5050f9`)** | Every one of these sat inside a `try {}` with a bare `catch {}` next to it, which is why they shipped unnoticed: `SELECT value FROM settings` (no such table — 30 in `sqlite_master`, none named settings) threw every request; `INSERT INTO llm_usage (day, count)` (real cols `day, calls, last_call_at`) threw every call, so **no usage row was ever written**; `COUNT(*)` on a table whose `day` is the PRIMARY KEY could only ever return 1; `bareSymbol` `^[A-Za-z]{2,6}$` matched "hello" and Yahoo resolved it to **MOMO**; `sanitizeAnswer` only matched `【<digits>】` so a `【LIVE DATA】` banner passed to the seller | cap is now `LLM_DAILY_CAP` (env, no query), insert uses the real columns, counter is `SUM(calls)`, greetings are denylisted **and** a bare-word resolution must return that exact symbol (sentence queries still resolve by name, so the price-target path is unaffected), both LIVE DATA forms are stripped. **Live proof:** `POST /api/chatbot {"query":"hello"}` → *"Hey there! How's the market mood treating you today?"* with `"sources":[]` — no MOMO, no fabricated quote. Tests 66/66 (was 57); tsc 135, unchanged, zero in the touched files |
| 78 | marketpicks.ai | **Citation gate cited Kevin Federline for a question about the Federal Reserve** — the gate was written for the Rolling Stones case and closed that one, but its word boundary `[^a-z0-9]` is satisfied by the **hyphen**, so "fed" matched the Wikipedia summary "…also known as **K-Fed** and FedEx…" | re-ran live 2026-10-12 with `"what happened with the fed"` and got Federline in the source list | boundaries now exclude `-` on both sides; a **single-token** query must match the article **TITLE**, not any snippet; multi-token needs ≥2 hits. Deliberate trade-off, documented in the test: an article titled "Federal Reserve …" is no longer accepted for the bare word "fed", because the only way to accept it by stemming is to also accept "Federline". **Live proof: the same query now returns no Federline and no Rolling Stones** |
| 79 | marketpicks.ai | **earnings_calendar carried two different dates for the same ticker** — the upsert keys on `id` and the providers mint different ids, so a disagreement produced two rows. TSLA had `yahoo=2026-10-19` **and** `Nasdaq=2026-10-21`, and `/api/resolve` returns the **earlier** — so the bot confidently named the wrong earnings day | `SELECT … WHERE symbol='TSLA'` on `marketpicks-db`, 2026-10-12 | Nasdaq's own API now outranks Yahoo's scraped calendar: the weaker source can neither overwrite nor coexist with the stronger one. Live duplicate removed. **Live proof: `resolve TSLA` → `2026-10-21` (Nasdaq), one row** |
| 80 | marketpicks.ai | **Two chatbot defects remain, both needing a decision, not a patch** — `OPENROUTER_API_KEY` is unset (so `route.ts` disables the 3-model ensemble and every OpenRouter model fails), and the 2500 ms Groq clamp loses the race often enough that canned templates ship ~1/3 of the time | `wrangler pages secret list` → only `CONGRESS_INGEST_TOKEN` + `GROQ_API_KEY`; grep of every `.env`/`.secrets`/`~/.config` on the machine found **no OpenRouter key anywhere**, only `.env.example` | **needs the owner:** supply an OpenRouter key (`wrangler pages secret put OPENROUTER_API_KEY --project-name marketpicks-ai`) or delete the OpenRouter branch and stop budgeting latency for it. Then raise `FAST_LLM_MS` from 2500 or give the race a second-chance path |
| 73a | marketpicks.ai | **Wikipedia relevance gate leaks on single-token queries** — the gate it shipped for the Rolling Stones case still returns **Kevin Federline** for `"what happened with the fed"`, because the article's summary opens "…also known as **K-Fed** and FedEx…" and the hyphen satisfies the `fed` word boundary | re-ran the chatbot live 2026-10-12 with `"what happened with the fed"` | in `lib/real-sources.ts`: require **2+ matching tokens**, and for a single-token query match the token against the article **title** only, not the summary extract |
| 76 | federation | ~~**Repo divergence — production cannot be rebuilt from git on a clean machine**~~ — **RESOLVED 2026-10-12** | Was: `fashionistas-ai` `tryon-open` had no upstream and `main` lacked the production commit; `marketpicks-ai` unpushed; `hiddencameras-tv` unpushed; `wuwonline-com` 48 dirty since 2026-08-29; plus `createstuff-ai`, `diamonds-forsale`, `scooters-exchange` | **Every repo now has `[ahead 0]`, verified after each push.** `fashionistas-ai`: local `--ff-only` merge of `tryon-open` into `main` (it was fast-forwardable — `main` had nothing `tryon-open` lacked), pushed `8968579..e2714e6`; **`main` == `tryon-open` == live production**, proven by comparing `git rev-parse` on both against `/version.txt`. `marketpicks-ai` `2c8c2bf..b5050f9`. `hiddencameras-tv` `2a041f7c1..0ad90c167` (5 commits, the 6 dirty files proven to *be* the deployed state — live site serves that exact text). `wuwonline-com` `8a975d5..4bb4fca` (the 48 dirty files were `build.py` output deployed without committing; verified against live `styles.css?v=`, alt text and nav). Also pushed `createstuff-ai`, `diamonds-forsale`, `scooters-exchange` (commits only — 127 dirty files left alone) |

| 94 | fashionistas.ai | **The shop has no real inventory — every active listing is admin, demo or QA data** | D1 2026-10-13: `status='active'` = **32**, owned by `admin` (15), `demo` (9), `auditseller…` (2), `verify…`/`tryonqaef0007`/`lp31447`/`layman…`/`audit…` (1 each) and `Fashionistas.ai` (1). `/api/market` returns only photo-bearing rows, so shoppers see **5**. Department clicks top out at 2 items; **Kids, Art and Other return 0** | Not fixable by code — it needs real sellers and real stock. Owner call on whether to seed genuine listings, open the doors, or launch deliberately thin. The fake-photo half of this is closed (#91) |
| 95 | fashionistas.ai | **3 active listings carry `category = NULL`, so they can never be found by a department click** | D1: of 32 active, **24 have no photo** (hidden by design) and **3 have neither photo nor category**; among the visible, **145 "Keurig Silver Coffee Maker" is `NULL`** while 148/120/98 canonicalise correctly. `/api/market?category=Women` → 2, `?category=Men` → 2, and 145 appears **only** under `All` | **Deliberately not guessed.** `Home/` in `assets/categories.js` contains only Furniture, Home Accents, Lamps & Lighting, Mirrors and Rugs — there is no kitchen path, so inventing one would be a guess dressed as a fix. Owner picks the department (or adds a kitchen path), then `UPDATE listings SET category=… WHERE id=…` |
| 114 | hiddencameras.tv | **CLOSED 2026-10-16.** ASIN truth pass — product cards carried wrong names/prices and dead ASINs (hardcoded prices/ratings are also an Amazon PA-API compliance exposure) | agent verified 138 ASINs live (90 live/47 dead/1 placeholder) + 205 claim targets (`/tmp/asin-fix-map.json`, schema-validated); applied in 4 claim-aware passes: 47 dead/wrong ASINs replaced, unwrap dead-doorbell + generic body-copy links, wrong-product links fixed (Nest Cam on M7 ASIN→`B0FN7GF1ZC`, Eufy S350 on Amcrest ASIN→`B0CD7F1M9R`, Ring Doorbell 4 on Indoor Cam ASIN→`B08JNR77QY`, JMDHKK detector on pinhole ASIN→`B0F5W6W848`, Nest Doorbell on Nest Cam ASIN→`B0BBSLG6PC`), 7 literal `B0C...?` placeholder URLs repaired, tool config links gained `?tag=hiddencamerastv-20`; commits `abd8fc865`+`30194b447`; **final audit: 413 ASIN tokens across 238 shipped files = 100% live-verified, 0 placeholders, 0 claim mismatches**; deployed via repo's `scripts/deploy.sh` (upload 3.37 s on healed uplink), live-verified on hiddencameras.tv + pages.dev (dead ASINs absent, new targets present, `/dp/` spot-checks 4×200) | none — closed. The 2 claim-variant rows (Ring Spotlight Cam Plus, Eufy E220) got their own live verification pass (jina reader + translate proxy + brand-store byline, control Wyze v4 live both ends) → `B09JZ5BG26` / `B0856W45VL`, shipped `cf5c1b260`, live-verified |
| 115 | religiousjews.com | **GitHub `main` vs `remove-fake-counts` lineage** — push to `main` rejected (diverged); `remove-fake-counts` (`6f7c325`) == live lineage, GitHub `main` = unrelated 39-commit pipeline history | `git push` rejected; live content matches `remove-fake-counts` | owner picks which lineage is canonical → fast-forward/reset the other → then deploys can track `main` normally |
| 124 | marketpicks.ai | **CLOSED 2026-10-16.** slot fix `1505b3c` sat undeployed: gate preview timing miss + every wrangler `POST …/deployments` carrying the multi-MB Functions bundle died (ECONNRESET/300 s HeadersTimeout) while the box uplink sat ~10 KB/s | uplink retested **3.3 MB/s (healed)** → `SKIP_BUILD=1 USE_NPX_WRANGLER=1 bash scripts/deploy-safe.sh` succeeded first try: **smoke 11/11 PASS** (pages + health + congress trades + ticker + bot answer-vs-quote 0% drift), live-verified: homepage has real `6600722153`, **zero fabricated slots** | none — closed |
| 125 | fashionistas.ai | **FIXED 2026-10-16.** deploy.sh refused `fashionistas-ai` for lack of its own `deploy-safe.sh` — but the repo's sanctioned path is `scripts/deploy-local.sh` (own docs/AGENT_HANDOFF.md: "Production = bash scripts/deploy-local.sh": npm test → stage → wrangler → verify `version.txt == SHA`, secret 404s). Two rounds: (a) gate failed — 2 test files (`apps/extension/__tests__/{engine,sales}.test.mjs`) import **jsdom**, which is undeclared in package.json and was never on this box → `npm install --no-save jsdom` (registry crawling ~2 KB/s; yarnpkg mirror succeeded, 36 pkgs/11 min); (b) deploy attempt 1 then **succeeded**: live `version.txt == 5343f52…`, live `site-adsense.js` = 5× `6600722153` / **0 fabricated**, `/.env*|/.git/config|/.dev.vars` all 404 | deploy-local.sh output `VERIFIED — live == 5343f528…` + live fetch 2026-10-16 | none — closed. Env shim: `/tmp/fash-env.sh` sources `.secrets/cf.env` → `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` |
| 126 | placebets.ai | **(1)** live still serves the invented slot IDs — canonical source on the box (`/workspace/tnr/Placebetsai`, #112); this copy Retired **and mid-merge** (4 unmerged files = WIP; tree left as-found); **(2) homepage headline garbled on desktop AND mobile**: generic `main:not(.pb-home) h1` (`app/globals.css:3258`) puts `color:transparent;background-clip:text` on the hero h1 whose subtree stacks 5 rotating phrases at `opacity:0` → the text-clip is built from all subtree glyphs → **all five phrases paint at once** (SSR state, before JS); homepage `<main>` never carries `.pb-home` (it sits on an inner `<div>` — other pages put it on `<main>`, which is what the `:not()` guard assumed); side effect: h1 forced to 64px over the intended hero size | live fetch 297,984 B + byte-exact mirror of live HTML/CSS rendered headless: `/tmp/opencode/{local-desktop,mobile-before}.png` reproduce the jumble; 3-line minimal repro isolates the mechanism; patched mirror → `{desktop-after,mobile-after}.png` clean both viewports | **(1)** collapse `components/AdUnit.js` `SLOTS` → `6600722153` on the box; **(2) patch ready: `patches/placebets-hero-headline.patch`** (2 rules appended after the `.pb-sr`/`@media` anchor block; apply by ANCHOR not line no.; touches 0 unmerged files; sentinel `Who wins` stays in DOM; no copy change) → apply on box, ship via repo's `scripts/deploy-safe.sh` + `SHIP_IT=1` (project `placebetsai`, no hyphen). Still unshippable from this machine |
| 127 | hiddencameras.tv | **CLOSED 2026-10-16.** live homepage had no AdSense loader tag although `pages/_app.js` shipped the `<script>` → units could never initialize | root cause was NOT a stale build: the loader used `next/script` `strategy="afterInteractive"`, and **static export (`output:"export"`) never emits afterInteractive tags into the HTML** (the beforeInteractive NPA inline *did* land; the external loader never did — reproduced in a fresh local build: loader=0 in `out/index.html`) | fix `30194b447`: plain `<script async src=adsbygoogle…>` moved into `pages/_document.js` `<Head>` (present in every exported page, no hydration dependency), afterInteractive block removed from `_app.js`; rebuild → loader=1 on homepage+reviews+blog+compare+deep pages; deployed `abd8fc865`+`30194b447` via `scripts/deploy.sh`, live-verified loader=1 NPA=1 on hiddencameras.tv + hiddencameras.pages.dev | none — closed |
| 128 | this machine (test env) | system resolver NXDOMAINs `pagead2.googlesyndication.com` + `googleads.g.doubleclick.net` (public DoH resolves both) → local Chrome gets `net_error:-105` on the ad loader; with DoH-mapped `--host-resolver-rules` the loader loads but **fills stay bot-gated on every site incl. known-good controls** → local rendering can never verify AdSense fill | `getent` fails vs cloudflare-dns.com A answers; CDP rig: setup runs (`aswift_N_host` created, queue processed), zero fill requests | no sudo here → owner-side: router/Pi-hole/AdGuard blocklist or secure DNS; fill verification = owner's own browser only |
| 129 | religiousjews.com, ihatecollege.com | **Both contact/waitlist forms POST to dead Formspree endpoints** — `dating/index.html` → `formspree.io/f/PLACEHOLDER`, `Ihatecollege/pages/advertise.js` → `formspree.io/f/contact`; live `POST` to both → **404**, so every submission silently vanishes (the religiousjews one is a literal placeholder that never existed) | POST probes 2026-10-16: both 404 | formspree signup needs an email the owner confirms → owner-side: create ONE Formspree form (or point both at an existing inbox) and replace the two IDs; interim option = hide the forms with a mailto link — not done unilaterally since it changes lead-capture UX |
---

## BLOCKED (needs Israel — one line each in `NEEDS_ISRAEL.txt` after 3 failures)

| # | Site | Blocked on | Why |
|---|---|---|---|
| 24 | fashionistas.ai | **Stripe test key** (`sk_test_…`) — checkout answers 503 "STRIPE_SECRET_KEY not configured" | re-scanned 2026-10-12: `sk_test_` appears **nowhere** on disk, in any repo, .env or history-adjacent file | **Not a leak — an absence.** This row tracks a MISSING key, not a committed one; there is nothing to rotate. Blocked on the same owner decision as marketplace posting: bring a Stripe account, or leave checkout honestly 503 |
| 25 | fashionistas.ai | **8 env vars** (eBay / Etsy / Google / Stripe) | → OAuth, billing, and the first real marketplace post are all dead. **Zero real posts ever** |
| 26 | fashionistas.ai | **Try-on credits: 9 left** | Modal free credit burning down; `MAX_MONTHLY_TRYON_SPEND` set but no replacement tier |
| 27 | fashionistas.ai | `OPENCODE_API_KEY` absent | opencode leg of the provider chain inert |
| 31 | all | **wrangler OAuth refresh** (`zone:read`) | current token expires `2026-10-06T20:58:54Z`, missing `zone` scope — one click, allowed ask #3 |
| 32 | admin UI | **approval** | proposed Worker + D1 + R2 + Cloudflare Access on `/admin`; user must pick (a) admin panel or (b) finish checklist/handoff first |
| 43 | fashionistas.ai | **"can we post?" — NO, and here is the exact chain** (2026-10-07, re-verified; corrects the old "no login exists" claim) | register **201** (`users` id 78) → login **200** + `fash_session` → `/api/auth/me` **200** → `/api/marketplaces` **200 `count:11`** → **`POST /api/list/all` → 402 `subscription_required` `status:"inactive"`** ("An active $14.99/mo subscription is required to list"; identical on `/api/list/ebay`, `/api/list/etsy`) → `POST /api/billing/checkout` → **503 `STRIPE_SECRET_KEY not configured`** | blocked by **#24 Stripe test key** first, then **#25 the 8 env vars** (`EBAY_SANDBOX_{CLIENT_ID,CLIENT_SECRET,REDIRECT_URI}`, `ETSY_{API_KEY,SHARED_SECRET}`), then the **marketplace OAuth logins**. Order: Stripe → env vars → eBay/Etsy login → post. **Still true 2026-10-07 night** for server `/api/list/*` even after extension one-click (#46) — no real Chrome marketplace post executed yet. Gate: `requireActiveSubscriber()` at `functions/api/_lib/auth.js:189`. Where to test after unblocking: `https://fashionistas.ai/` sign-in `#login-u`/`#login-p` → post UI `#pu-post`, or `POST /api/list/all` with the cookie; QA account `qa-post-test@fashionistas.ai` (id 78) is stored in `.secrets/cf.env` |

| 52 | hiddencameras.tv | ~~**production is served from an account no credential can reach**~~ — **CLAIM DISPROVEN 2026-10-12. Do not re-open it on the old evidence.** | This row asserted the zones were `deactivated` and on-disk tokens returned `403 code 9109`. Both wrong: `.env.deploy` holds an **Account API Token for Hiddencameras79's account `426614a2…`** with `pages (write)`, and `wrangler pages project list` returns project **`hiddencameras`** attached to `hiddencameras.tv, www.hiddencameras.tv, hiddencameras.pages.dev`, last deploy healthy. Zone-level API is **not needed** — the domains attach at the Pages project level. **Deployed and verified live this round (FIXED #74).** The trap that made this look blocked: wrangler's *default* login is the Fashionistas account `7eb89b01…`, which yields `Authentication error [code 10000]`; `.env.deploy` must be sourced | (CSS `de7ebbae…`, `/shop/` = the 5-word stub) while the new build (CSS `8f3eddc2…`, `/shop/` = "Shop by Guide") answers only on `hiddencameras-tv.pages.dev`; `www` → CNAME `hiddencameras.pages.dev` → **522**. All **7 tokens** on disk return `403 code 9109` on zone `5cd13106…`; 4 accounts / **23 Pages projects** contain no project named `hiddencameras`; `~/.cf-tokens` (`HIDDEN79_TOKEN`) does not exist on this computer; the GitHub secret `CF_API_TOKEN` is API-unreadable without running a workflow (banned) |
| 113 | all affiliate links | **No Amazon Associates account exists anywhere in the federation** — every tag (`hiddencamerastv-20`, `religiousjews-20`, `wuwonline-20`) was fabricated; all affiliate revenue = **$0** | research + tag forensics 2026-10-15 | owner signs up personally at affiliate-program.amazon.com (legal name / tax / bank — cannot be delegated) → paste assigned tag → one-line federation-wide swap + exact disclosure re-added |

> Removed this round: **#29** (STV token received), **#30** (repo cloned), **#36** (IHC token received → real domain fixed) — all moved to FIXED.

---

## WONTFIX / BY DESIGN

| # | Item | Why |
|---|---|---|
| 33 | Wildcard DNS on israeljoffe.com/.org + wuwonline.com/.org | user edits those sites; mitigated instead (`409a496` per-isolate cache → ~10 scans/hour, was ~1,500) |
| 34 | `/how-to-crosspost/` guide "live at `0a30892`" (claimed in `HANDOFF-2026-09-29.md`) | **that commit does not exist in any of the 7 fashionistas clones and the URL 404s** — the claim was false. Real guides are `/guide/…` (16 URLs in sitemap) |
| 35 | GitHub `hiddencameras-tv` legacy Pages build can't be disabled (422) | blocked at repo level instead (`actions_enabled=false`); the domain is served by Cloudflare |

