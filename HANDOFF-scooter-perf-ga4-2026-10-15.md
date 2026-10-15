# Handoff — scooter.exchange 504/perf fix + GA4 loaders on every site (2026-10-15, ~7:30 AM ET)

Rules unchanged: no secrets printed, never change CHANNEL_KEY, UI changes need preview + 412x915 screenshots + Iz "ship it".

## A. scooter.exchange

### What the "493 HTTP 504s / 24h" actually were
Cloudflare GraphQL (zone scooter.exchange, last 24h before the fix):
- **491 of 491 HTTP 504s had `requestSource = earlyHintsCache`**, UA "nginx-ssl early hints" / "bastion early hints". That's Cloudflare Pages
  looking up its *internal* Early Hints cache, not a visitor request. **Visitors (requestSource=eyeball) got 0 HTTP 5xx.**
  /, /map, /sell, /contact all return 200 in 0.15–0.35 s. Pages turns `<link rel=preload>` into a `Link:` header → Early Hints → those internal 504s.
- Real problems were in the API Worker `scooters-exchange-api` (api.scooter.exchange):
  - **D1 reads 2.70M rows/24h; 2.10M (78%) from one query**: `SELECT price_cents FROM listings WHERE category=? AND is_active=1 ORDER BY price_cents`,
    run 3,199×/day. That was `rescoreDeal()`, which ran once per listing on every `/api/listings` call.
  - **Google Places: 237–246 HTTP 429s/day.** The body says: *"Quota exceeded for quota metric 'SearchTextRequest' and limit 'SearchTextRequest per day'
    … project_number:389633621778"*. Every cache miss fired 7 parallel searchText calls, the cache only lasted 1 h on a ~1 km grid, and it never stopped calling after a 429.
  - The rentals fallback (Photon) returned **results on other continents**: the NYC cache held "rentals" in Prishtinë (Kosovo) and Siem Reap (Cambodia).
    Overpass (OSM) almost never answers from Workers (521/502/timeouts).
  - `/api/gbfs/nearby` read all 1,275 `gbfs_providers` rows per call (61K rows/day). Worker CPU p99 was 473 ms, max 1,187 ms (that includes the cron runs).
  - No edge caching on any read route; eBay fetches had no timeout.

### Fixes (backend only), live in production
Repo `placebetsai/scooters-exchange`. Branch `fix/api-504-perf-2026-10-15`; API part also on `master` (`6a5de26`).
- `packages/api/src/edge.ts` (new): Cache API wrapper (`edgeCached`) + bot detection + per-IP limit.
  Edge TTLs: /api/listings 5 min, /api/listings/:id 10 min, /api/gbfs/providers 1 h, /api/gbfs/nearby 20 s (lat/lon rounded to ~100 m),
  /api/rentals/nearby 6 h (rounded), /api/news + /api/blog 15 min, authors 1 h, health 60 s. Known bots/crawlers that miss the cache on
  rentals/gbfs get 429 (no upstream fan-out). Per-IP: rentals 20/min, gbfs 60/min → 429.
- `sync.ts`: category median memoised per isolate (30 min, shared in-flight promise).
- `gbfs.ts`: provider list memoised per isolate (30 min), only the needed columns.
- `rentals.ts`: ~5 km grid (0.05°) for key and search center; non-empty cached **30 days**, empty 30 min (and never edge-cached);
  3 sequential Places queries (was 7 parallel); any 429 opens a **6 h circuit breaker** (`kv_cache` key `places:cooldown`);
  stale-but-good list served if upstreams fail; Photon now restricted with `bbox` and every result filtered to the search area;
  Overpass and Photon run in parallel (Photon timeout 9 s).
- `ebay.ts`: 10 s timeout on OAuth, 15 s on search.
- D1 migration `0007_perf_indexes.sql` (applied to prod): `idx_listings_cat_active_price`, `idx_listings_active_hot_fetched`,
  `idx_listings_active_cat_hot`. EXPLAIN shows the median query now uses the covering index.
- Worker versions: **live `7bdaf392-19d2-447f-b7a1-312b9b08eb5e`** (intermediate `b2159c8c`). **Rollback: `40705d9c-1056-4cee-ab79-747ec6e62943`**
  (`cd packages/api && wrangler rollback 40705d9c-1056-4cee-ab79-747ec6e62943`, IHC token from ~/.secrets/cloudflare.env as CLOUDFLARE_API_TOKEN).
  Indexes are additive; to undo, `DROP INDEX` the three names.
- Verified before/after on prod (12 endpoints): listings identical (20 items, same fair/great/overpriced split), GBFS NYC 98 vehicles,
  chatbot 200, rentals NYC now real Manhattan/Brooklyn shops, LA real LA shops; repeat calls `X-Edge-Cache: HIT` in 60–80 ms.
- Preview: workers.dev/preview URLs are disabled for this worker, so verification used `wrangler dev --remote`. **It shares the zone's edge cache**:
  a pre-fix preview response got cached and had to be purged by URL. Purge bad cache entries the same way (zone purge_cache by exact URL).

### Not done / pending
- **Web `_headers` (`/* ! Link`, turns Early Hints off)** is on branch `fix/api-504-perf-2026-10-15` only. Verified on Pages preview
  https://perf-preview.scooters-exchange.pages.dev (no Link header, pages 200). **Not deployed to prod**: the live Pages build (`9c68e77e`,
  deployed 10:47 UTC today from a local tree) differs from repo HEAD (different JS chunk hashes, /map +4.5 KB), so deploying from git would roll back
  someone's uncommitted work. Whoever owns the scooter web deploy: add `apps/web/public/_headers` to their tree and deploy.
- **Analytics note:** the Cache API logs its own misses as HTTP 504 with `requestSource = edgeWorkerCacheAPI`. Like the Early Hints ones, these are
  internal. **Always filter on `requestSource = "eyeball"` when counting visitor errors.**
- Google Places: daily SearchTextRequest quota on GCP project 389633621778 is exhausted. Iz: raise it in Google Cloud Console → APIs & Services →
  Places API (New) → Quotas → "SearchTextRequest per day", or leave it. The site works on the OSM fallback, and the breaker stops the 429 spam.
- The `deploy-api.yml` GitHub Action did not run on the master push (no run listed). Deploys are manual via wrangler.

## B. GA4: loaders added, all no-ops until a Measurement ID is set

Loader (same everywhere): async and loads after window load + idle. It skips visitors with Global Privacy Control or DNT. Consent Mode sets
`analytics_storage` to denied by default in EEA/UK/CH only. Google signals and ad personalisation are off, and it **never touches AdSense consent**.
With an empty ID nothing renders (Next sites, Pages middleware) or the 0.9 KB inline stub returns immediately (static sites).
Tested in headless Chromium with a fake ID (G-TEST1234): gtag.js loads and a `g/collect` hit fires. With no ID there are zero Google requests.

| Site | Code (repo @ branch → commit) | Where the ID goes |
|---|---|---|
| fashionistas.ai | fashionistas-ai @ `main` 6b9a615 and `rebuild` 611d6db: `functions/_lib/ga4.js` + `functions/_middleware.js` (HTMLRewriter appends to `<head>`) | **Pages env var `GA_MEASUREMENT_ID`** on project `fashionistas-ai` (Fashionistas1979 account), Production (and Preview if wanted), then redeploy. No code change. Verified with `wrangler pages dev`: injected with the var, byte-identical HTML without it. |
| placebets.ai | Placebetsai @ `main` a3840b4: `components/GoogleAnalytics.js`, used in `app/layout.js` | Paste into `""` in `components/GoogleAnalytics.js`, or `NEXT_PUBLIC_GA_MEASUREMENT_ID` at build. Merge into the branch you deploy from (active work is on feat/fix9-grounding). |
| marketpicks.ai | marketpicks-ai @ `live-source` 01823a4: `components/GoogleAnalytics.tsx`, used in `app/layout.tsx` | Same, `NEXT_PUBLIC_GA_MEASUREMENT_ID` or paste. (`main` on GitHub is a 6-file stub; `live-source` is the real app.) |
| ihatecollege.com | Ihatecollege @ `main` 351f718: `components/GoogleAnalytics.js`, used in `pages/_app.js` | Same. `next build` passes, and the ID is inlined in the `_app` chunk. |
| scooter.exchange | scooters-exchange @ `fix/api-504-perf-2026-10-15` f9f0446: `apps/web/app/components/Analytics.tsx` | `NEXT_PUBLIC_GA_MEASUREMENT_ID` (old `NEXT_PUBLIC_GA_ID` also accepted) or paste. Static export builds and was browser-tested. Ships with the next web deploy (see the A "Not done" note). |
| createstuff.ai | nexus-ai-suite `apps/createstuff-marketing/*.html` (3 pages) | `python3 scripts/ga4-static-inject.py apps/createstuff-marketing G-XXXXXXXXXX`, then deploy `createstuff-marketing`. Preview https://ga4-check.createstuff-marketing.pages.dev is visually identical to live at 412x915 with 0 Google requests. app.createstuff.ai (`createstuff-app`, forge `apps/web-builder`) isn't instrumented yet. |
| israeljoffe.com | **Not edited.** No tree matches what's live: ~/seo-preview/israeljoffe-com matches `/` but not `/about/` or `/publications/`. | Before the next deploy, run `python3 scripts/ga4-static-inject.py <israeljoffe-com deploy dir> G-XXXXXXXXXX` on the real source (idempotent, re-run to change the ID). Or turn on Cloudflare Zaraz → Google Analytics 4 on the israeljoffe.com zone (Fashionistas1979 account), which needs no code. |

### Iz: GA4 setup (analytics.google.com, signed in as placebetsai@gmail.com or the Google account you want to own it)
1. Admin → Create → Account "Iz Sites" (once).
2. Create one **property per site** (time zone America/New_York, currency USD), each with one **Web data stream**:
   fashionistas.ai · placebets.ai · marketpicks.ai · ihatecollege.com · scooter.exchange · createstuff.ai · israeljoffe.com
   (7 properties, 7 streams; createstuff.ai's stream also covers app.createstuff.ai if it gets the loader later).
3. Copy each stream's **Measurement ID (G-…)** and send the 7 IDs. An agent wires each one into the place in the table above and deploys it.
4. Optional: in each stream, leave Enhanced measurement on, and link AdSense (Admin → Product links → AdSense) for revenue-per-page.

## C. Cloudflare tokens missing analytics permission (verified today)
- **Fashionistas1979 account token** (`CLOUDFLARE_API_TOKEN` in ~/fashionistas-ai/.env.deploy). It can list zones fashionistas.ai, israeljoffe.com,
  israeljoffe.org, marketpicks.ai, wuwonline.com/.org, religiousjews.com, ketiservice.com, but GraphQL says it lacks
  `com.cloudflare.api.account.zone.analytics.read`.
- **Placebetsai account token** (`CF_TOKEN_PLACEBETS` in ~/.secrets/cloudflare.env). It can't list any zone or read the account (placebets.ai, createstuff.ai).
- Steps (in each Cloudflare account): My Profile → **API Tokens** → the token → **Edit** → add permissions
  **Zone → Analytics → Read**, **Zone → Zone → Read**, **Account → Account Analytics → Read** (Workers/D1/Pages metrics) →
  Zone Resources: **Include → All zones from account → <that account>** → Continue to summary → **Update token**.
  Editing a token keeps the same secret, so no files need changing.
