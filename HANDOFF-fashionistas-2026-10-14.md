# HANDOFF — fashionistas.ai — 2026-10-14 (~09:45 ET)

**Owner: Chief of Staff.** The Fashionistas bot was retired by Iz; Chief of Staff now owns fashionistas.ai.

## LATEST — 2026-10-14 ~10:20 ET: "free-v2" build in progress, scope expanded by Iz (read first)

**Production (unchanged):** commit `4001c02`, Pages deploy `1ecaa1e8`. Rollback: `7865a20b-2be6-4451-a8cc-b7aa131b2dae` (commit `452d7e8`).
**Preview:** https://free-v2.fashionistas-ai.pages.dev (branch `free-v2`, commit `2f9126d`). No UI goes to production until Iz says "ship it".

### Scope from Iz, with where each item stands
1. **Permanently free pricing copy** ("free for good, supported by ads & affiliate links"). DONE on preview: pricing, home FAQ/JSON-LD, terms, chat grounding, auth copy, app bundle and tests.
2. **Cheapest try-on.** DONE on preview:
   - Tier 1: instant, free in-browser overlay ("Quick look", $0).
   - Tier 2: Modal FASHN VTON v1.5 (Apache-2.0, so it's the cheapest *commercially legal* option).
   - Identical renders are cached in R2 (`tryon-cache/<sha256>`) and cost $0. A cache hit doesn't count toward the daily cap.
   - Real cost: L4 $0.000222/s × 22.9 s warm ≈ **$0.0055/render**. Cold start costs $0.013–0.033. Modal Starter includes $30/mo free.
   - Monthly: 10k ≈ $35–65; 100k ≈ $520–600; 1M ≈ $5.5k (needs about 20 containers).
   - Alternatives: fal CatVTON ≈ $0.017, Replicate IDM-VTON ≈ $0.024, fal FASHN $0.04–0.075. IDM/Cat/OOTD are non-commercial (NC licences).
3. **Crosslist to every marketplace + one tracking board.** In progress, live on preview at `/seller/board/`.
   - New functions: `functions/_lib/shops.js` (17 shops); `/api/crosslist/board` (GET, signed in); `/api/crosslist/status` (POST, owner-checked; "sold" writes orders); `/api/crosslist/links` (public; powers "Buy on <shop> ↗" on item pages).
   - API when keys exist: eBay, Etsy, Shopify.
   - Guided copy-and-open: Poshmark, Mercari, Depop, Vinted, Grailed, FB Marketplace, Vestiaire (which absorbed Tradesy), Kidizen, Curtsy (app only), Whatnot, Amazon, Walmart.
   - Consign links: ThredUp, The RealReal.
   - Statuses are only what the seller (or an API) confirmed. Nothing is guessed.
4. **Buyer flow:** browse/search → try on → Message / Reserve (no charge) / Buy on <shop>. Exists; the Buy-on links are new. Stripe is not approved, so there's no card checkout.
5. **User stories + Playwright E2E.** In progress.
   - Spec: box `/workspace/fash-ship-qa/e2e/stories.spec.js`. The doc goes to `docs/USER-STORIES.md`.
   - Passing: S1 sign-in, S2 AI fills a listing from a photo.
   - Debugging: S3, where the "List on fashionistas" click doesn't submit under Playwright.
6. **Design pass** (premium, mobile-first). Not started.
7. **Android/iOS:** TWA prep is in `docs/twa/`. Capacitor config not started.
8. **Test seller account.** DONE.
   - Account: `iz_test_seller` (user 130). The password is in the laptop's gitignored `~/fashionistas-ai/.env.test-seller` (never committed or printed).
   - E2E listings it creates are deleted at the end of each run. No invented public listings.
   - (User 129 is an unused account from the Pages register path. Ignore it.)

### Rules
- Wrangler only (`scripts/deploy-local.sh`). Never GitHub Actions.
- Never print secrets. Never invent data. Keep the demo listings. Keep everything free for users.
- Preview + 412×915 light/dark screenshots before any ship. Production only on Iz's "ship it".
- Local `main` is 76 commits ahead of `origin/main`. Production deploys from local main, so don't push main blindly.

### Keys / decisions needed from Iz
- eBay: `EBAY_CLIENT_ID`/`EBAY_CLIENT_SECRET` (+ RuName).
- Etsy: `ETSY_API_KEY`.
- Shopify: `SHOPIFY_STORE` + `SHOPIFY_ADMIN_TOKEN`.
- Stripe Connect approval (optional).
- OK to raise `MODAL_MONTHLY_CAP_USD` from $6 to $30 (stays inside Modal's free credit).
- Apple developer account + Play Console for the app builds.

## Live in production (verified)
- `https://fashionistas.ai/version.txt` = `4001c0203211d82dbe81b1eb721bee5aa0b6e39e` (main, merge of p0-preview `4bd61d4`). Pages deployment `1ecaa1e8` (https://1ecaa1e8.fashionistas-ai.pages.dev).
- **Rollback:** Pages deployment `7865a20b-2be6-4451-a8cc-b7aa131b2dae` (commit `452d7e8`, contact fix only). Before that: commit `c3070c5`.
- Contents: contact form → fashionistas1979@gmail.com (FormSubmit from the browser, test delivered 8:21 AM ET); speed branch (SSR shop/item, WebP thumbs, nav Shop/Sell/You); try-on queue (D1 `tryon_slots`, max 2 at once, honest place in line); /account/delete/ + POST /api/account/delete; junk listing 155 hidden; PNG/maskable icons + manifest; search filters (size/colour/condition/price/saved), sorts (newest/popular/A–Z/Z–A/price), 24-per-page "Show more", URL state; Save button; category pages /shop/c/…, brand pages /shop/b/…; /price-guide/ (real data only, ≥3 non-demo listings); Breadcrumb/CollectionPage/ItemList JSON-LD; sitemap function live; events → D1 `listing_stats` (daily aggregates) + /api/stats/popular + /api/seller/stats + /seller/stats/ page; AdSense slots on blog (21 pages), shop in-feed (9+ items), item (≥120-char description), reserved space.
- Verified live on 412×915: home, shop, search, sort, category, brand, item, blog, seller stats, contact, account delete all 200; no JS errors (only AdSense report-only CSP frame warnings, ad 400s because AdSense isn't approved, and expected 401s when signed out). ads.txt intact (pub-7215975042937417).
- Sitemap has 40 static URLs and **no listing/category/brand URLs**, because all 4 public listings belong to the `demo` account and are excluded on purpose. Iz chose to keep the demo listings as they are.

## Repo / deploy
- Repo: laptop `b7d4ca89` (billionaremaker-Latitude-5420), `~/fashionistas-ai`, branch `main` (origin/main is stale; do not push main to origin per older handoff). Preview branch `p0-preview`.
- API Worker source: `~/Documents/Default Project/nexus-ai-suite/workers/fashionistas-api` (shared D1 `fashionistas-db` 0c1b88be…).
- Deploy production: `bash scripts/deploy-local.sh` (runs tests, uploads with Wrangler, checks version.txt). Preview: `ALLOW_BRANCH=<b> DEPLOY_BRANCH=<b> bash scripts/deploy-local.sh`. Credentials are in `.env.deploy` (never print). That token can't run D1 queries.
- Preview branches share the production D1.

## Rules
- Wrangler only, never GitHub Actions.
- UI changes go to a preview first, with self-reviewed 412×915 Android screenshots (light + dark). Production only after Iz says "ship it". Record the rollback deployment ID first.
- Never invent data (listings, prices, stats, "listed" states). Keep it free for users.
- When renaming the hashed bundle, read each file before writing it (a truncation bug emptied a test file once).

## Pending
- Shopify integration (allowed, not built). eBay/Etsy integrations exist but are off until keys exist.
- Stripe Connect checkout: researched in docs/marketplace/CHECKOUT-STRIPE-CONNECT.md, not built.
- AdSense approval (console only). Add `ep2.adtrafficquality.google` and `www.google.com` to the CSP frame-src (report-only warnings).
- Android TWA: set `/.well-known/assetlinks.json` once the signing SHA-256 exists (docs/twa/).
- One test view on listing 148 is in `listing_stats` from preview testing.
- Real (non-demo) inventory is needed before category, brand and price pages enter the sitemap.

## Keys and decisions needed from Iz
eBay production keys + business policies; Etsy app keys + commercial access; Shopify Partner app; Depop partner application (business@depop.com); Stripe account (decide on checkout); Modal try-on spend cap raise (currently $6/mo); Workers Paid ($5/mo); Play Console ($25) + signing fingerprint; Apple developer account ($99/yr) for iOS; GOOGLE_CLIENT_ID, RESEND_API_KEY.
