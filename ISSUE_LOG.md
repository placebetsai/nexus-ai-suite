# ISSUE LOG — federation (every issue, with state)

Status: `FIXED` · `WIP` · `OPEN` · `BLOCKED` · `WONTFIX`
Update this file **every round**. Evidence = command + real output, never the word "works".
Risk register lives in `nexus-ai-suite/HANDOFF-2026-10-06.md` §8.

---

## FIXED (2026-10-06)

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
| 29 | spanishtvshows.com | no token for account `555c6765…` | — | **token received 2026-10-06**, stored as `STV_API_TOKEN` (53 ch) in `.secrets/cf.env` → `/accounts/555c6765…/tokens/verify` `success:true` (`/user/tokens/verify` 401 = account-scoped, expected). Fixes **access** only — the `TMDB_API_KEY` value is still unrecoverable (see #18 / #28) |
| 30 | scooter.exchange | no local repo | — | cloned → `scooters-exchange` (master `ed4c794`); fixes committed **`2e77e3a`** (see #37) |
| 36 | ihatecollege.com | loader fix stranded on `ihatecollege-com.pages.dev` | project in account `90904956…` needed a token | **token received 2026-10-06** (`IHC_API_TOKEN`) → deployed project `ihatecollege` → live `https://ihatecollege.com/` **loader ×1, ad slots ×3, 76,386 B** (was slots ×3 / loader ×0) |
| 37 | scooter.exchange | **23 dead images** (`loremflickr.com` 401 for every URL), **listings mislabelled**, **`/api/rentals/nearby` count:0 in every city**, **seller photos NXDOMAIN** | see evidence below | shipped `2e77e3a` + worker `6c4b1f15` + Pages `56dd2a9d` — evidence below |
| 38 | diamonds.forsale | site stuck on the **2026-07-30** build, **0 AdSense on every page** | two stacked causes: `app/about/page.tsx` passed an `onError` handler from a **server component** → `next build` looped `Static page generation for /about is still timing out after 3 attempts`, so *no* new build could ever ship; and `ADSENSE_CLIENT` was never supplied, which the source gates the loader on (`{ADSENSE && …}`) | removed the handler, repointed the avatar at a file that exists (`/israel-joffe/avatar.jpg` → **404** live before), built with `ADSENSE_CLIENT=ca-pub-7215975042937417` → Pages `37253dda` (`env=production`, was `41c5454f` from 2026-07-30) → **8/8 pages `loader=2, ca-pub=2`**, `/about` avatar file `http=200 image/jpeg`, **all images 200**, `loremflickr=0`; repo `5692dae..775e029`, workflows `disabled_manually` ×2 |

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

## OPEN (fix next, in this order)

| # | Site | Issue | Evidence | Next action |
|---|---|---|---|---|
| 13 | marketpicks.ai | M4 leftovers **(1 of 4 done)**: `POST /api/cron/quotes` 76 s → 524 s; `bot2`/`ensemble_noground` off-topic; top-level `confidence` null — `/api/health` fabrication is **fixed** (see 13a) | curator agent timed out 3×300 s | fix the three remaining; `npm test` baseline **54** must hold |
| 14 | createstuff-ai repo | `index.html` dirty (23 added lines) after a successful deploy | `git status` → `M index.html` | commit |
| 15 | Ihatecollege repo | 4 dirty sitemap files, deployed but uncommitted | `git status` → 4 files | commit |
| 17 | federation | 3 scheduled jobs homeless after Actions shutdown: STV *Generate Spanish Pages* (`0 13 * * *`), *IndexNow ping* (`30 11 * * *`), *Federation Sentinel* (`0 */3 * * *`) | all `disabled_manually` today | move to **Cloudflare Cron Triggers** |
| 18 | spanishtvshows.com | `/show/<id>/` → **500 for every id** (1399, 679, 1408, 46648) | **RCA (code-level, deploy-side unconfirmed):** `.github/workflows/deploy-pages.yml` writes the secret to project **`spanishtvshows`** (line 42 `pages/projects/spanishtvshows`) but deploys to **`--project-name=spanishtvshows-site`** (line 51) — two different projects, and the secret step is `continue-on-error: true`. Build-time is fine (the Build step exports `TMDB_API_KEY`, so prerendered TMDB pages render: home 79 `image.tmdb.org` refs, `/best-on-netflix/` 58). The dynamic edge route reads the **request-context** env only (`lib/cloudflare.js` → `getSecret`), where the key was never set → `lib/tmdb.js:23` `throw new Error("Missing TMDB_API_KEY")` → the `catch` calls `tmdb()` again and throws again. Local `next dev` + a dummy key reproduces the **identical** `__next_error__` 500 page | set the secret + deploy against `spanishtvshows-site`: **needs account `555c6765…` token (BLOCKED #29)** — Actions are retired, so the workflow will not do it |
| 19 | israeljoffe.com/.org | No AdSense at all (loader 0, slots 0) | live sweep 2026-10-06 | decide: monetize or keep clean |
| 20 | Placebetsai-src | `lib/web-search.js` has a committed `sk-or-v1-…` key | grep | rotate + move to secret |
| 21 | Spanishtvshows.com | `app/api/chatbot/route.js` committed `gsk_…` key | grep | rotate + move to secret |
| 22 | Ihatecollege | `scripts/expand-articles.js` committed `AIza…` key | grep | rotate + move to secret |
| 23 | Placebetsai-src | two Gmail SMTP app passwords in plaintext (`scripts/test-smtp.mjs`) | `nexus-ai-suite/TODO.md` X4 | rotate + remove |

---

## BLOCKED (needs Israel — one line each in `NEEDS_ISRAEL.txt` after 3 failures)

| # | Site | Blocked on | Why |
|---|---|---|---|
| 24 | fashionistas.ai | **Stripe test key** (`sk_test_…`) | `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` length 0; no key anywhere on disk |
| 25 | fashionistas.ai | **8 env vars** (eBay / Etsy / Google / Stripe) | → OAuth, billing, and the first real marketplace post are all dead. **Zero real posts ever** |
| 26 | fashionistas.ai | **Try-on credits: 9 left** | Modal free credit burning down; `MAX_MONTHLY_TRYON_SPEND` set but no replacement tier |
| 27 | fashionistas.ai | `OPENCODE_API_KEY` absent | opencode leg of the provider chain inert |
| 28 | spanishtvshows.com | **`TMDB_API_KEY` locally** | build stops at `Missing TMDB_API_KEY`; key exists only as a GitHub secret (API-unreadable) |
| 29 | spanishtvshows.com | **token for account `555c6765…`** | project `spanishtvshows-site` is not in `7eb89b01…` |
| 30 | scooter.exchange | **no local repo** | cannot be rebuilt from this laptop |
| 31 | all | **wrangler OAuth refresh** (`zone:read`) | current token expires `2026-10-06T20:58:54Z`, missing `zone` scope — one click, allowed ask #3 |
| 32 | admin UI | **approval** | proposed Worker + D1 + R2 + Cloudflare Access on `/admin`; user must pick (a) admin panel or (b) finish checklist/handoff first |

> Removed this round: **#29** (STV token received), **#30** (repo cloned), **#36** (IHC token received → real domain fixed) — all moved to FIXED.

---

## WONTFIX / BY DESIGN

| # | Item | Why |
|---|---|---|
| 33 | Wildcard DNS on israeljoffe.com/.org + wuwonline.com/.org | user edits those sites; mitigated instead (`409a496` per-isolate cache → ~10 scans/hour, was ~1,500) |
| 34 | `/how-to-crosspost/` guide "live at `0a30892`" (claimed in `HANDOFF-2026-09-29.md`) | **that commit does not exist in any of the 7 fashionistas clones and the URL 404s** — the claim was false. Real guides are `/guide/…` (16 URLs in sitemap) |
| 35 | GitHub `hiddencameras-tv` legacy Pages build can't be disabled (422) | blocked at repo level instead (`actions_enabled=false`); the domain is served by Cloudflare |
| 36 | Ads never render on this laptop | ProtonVPN NetShield blocks `pagead2.googlesyndication.com` — verify from another network |
