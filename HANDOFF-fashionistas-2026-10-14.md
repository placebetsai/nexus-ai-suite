# HANDOFF — fashionistas.ai — 2026-10-14 (~09:45 ET)

## LATEST — 2026-10-14 ~5:00 PM ET: seller-ux PREVIEW (not production; needs Iz's "ship it")
- **Preview:** https://seller-ux.fashionistas-ai.pages.dev (branch `seller-ux`, HEAD `2200a8f`, on top of main `aa86c6d`; main hasn't moved, so no rebase was needed). Production is unchanged.
- **Shipped to the preview one fix at a time:**
  1. Dashboard (`4e372b1`): the greeting uses the seller's name and never "Fashionistas.ai". With no sales it shows a text empty state instead of a fake rising line, and the drifting SELL/NEW/SOLD words behind cards are gone. The bundle was renamed to `assets/app.d8c12daf443d.js` (immutable cache), and index.html and tests were updated.
  2. Connect your shops, Vendoo-style (`0d49615`…`9eea91b`, ext `326d36d`):
     - Board steps: install-extension step, then a 17-marketplace grid. Each shop shows its status from the seller's own browser session: Connected, or a Log in button that opens the site's login tab and rechecks automatically.
     - No key, token or password fields. "Not built", partner and needs-keys rows are hidden. A collapsed "Advanced" section shows only connected stores, ready OAuth, and feeds.
     - Posting: select items → pick marketplaces → Post everywhere → per-site progress panel. One-time consent is in-page.
     - Saved in the backend: `seller_prefs` in D1 via `functions/api/seller/prefs.js` (GET/POST /api/seller/prefs, one row per seller). Per-item status stays in `listing_platforms`.
     - Install page: `/seller/get-extension/`, with the zip at `/downloads/fashionistas-crosslister-0.2.0.zip`. Not on the Chrome Web Store yet.
  3. Clean background (`8ad78ac`): turned off (`CLEAN_BG_ON=false`). Bring it back only with preview and undo.
  4. AI autofill (`a8dcb2e`, `bfc61f3`, `2200a8f`):
     - Under 85% sure: keeps the drafted title, price and details, but the seller picks the category. The card says "Not sure what this is — X?", not "Filled in for you".
     - Category contradicts the item (e.g. a cup lid under Women › Bags): fills nothing and asks the seller.
- **Extension 0.2.0 (`extension/`, `dist/fashionistas-crosslister-0.2.0.zip`):**
  - Covers 14 sites: poshmark, mercari, depop, facebook, grailed, vinted, ebay, etsy, vestiaire, kidizen, whatnot, shopify, amazon, walmart.
  - Bridge messages: FA_CHECK → FA_SESSIONS (streamed per site), FA_OPEN_LOGIN, FA_ACCEPT/FA_ACCEPTED, FA_POST/FA_PROGRESS (opening / filled / listed / no-url).
  - Session check runs in two steps:
    1. A request with the seller's cookies; a bounce to a login URL means logged out.
    2. Otherwise, a probe in a minimized background tab. A visible account, avatar or sign-out control means Connected. A login form or link means logged out. Anything else is unknown and shows "Log in".
  - It never reads cookie values or passwords.
  - Shops are filled one after another. Their listing URLs are watched in parallel.
- **Verified:**
  - npm test 459/459.
  - E2E 12/12 on the preview. The e2e now picks a category when the AI is unsure.
  - With a fresh browser profile and no logins, every shop shows "Log in", so there are no false "Connected". An earlier build had false positives on Cloudflare challenge pages; that's fixed.
  - The real temporary listing flow opens and fills the Poshmark tab and shows progress. The test listings were deleted.
- **Unverified:**
  - "Connected" detection and form filling against real logged-in seller accounts. Iz needs to load the extension and test with his own accounts.
  - Marketplace selectors for the 6 new sites. They use label matching only.
  - A multi-item run waits for each item's listing confirmations before starting the next item.
- **Screenshots and progress log:** `/workspace/fash-ship-qa/seller-ux/` on the box (PROGRESS.md, fix1-*, fix2-*, fix3-*, fix4-*, e2e/).


**Owner: Chief of Staff.** The Fashionistas bot was retired by Iz; Chief of Staff now owns fashionistas.ai.

## LATEST — 2026-10-14 ~11:55 ET: free-v3 SHIPPED TO PRODUCTION (Iz said "ship it")
- **Production:** commit `d26cf1c` (main = merge of free-v3 `4e729e3` + handoff doc). Pages deploy `73a85ca4-39cc-457f-b41d-2eec08a2e3fd`. `version.txt` verified.
- **Rollback:** `6c0d6cbf-e5f1-449c-8fc4-3de5e3adaf72` (commit `8211eb1`). Older rollbacks: `1ecaa1e8` (`4001c02`), `7865a20b` (`452d7e8`).
- **Live checks:**
  - All 12 main pages return 200 with 0 JS errors and no overflow, in light and dark.
  - `ads.txt` is intact; `sitemap.xml` has 40 URLs.
  - E2E 12/12 in light and dark on production. Test listings 175 and 176 were deleted; the public shop shows only the original 4.
  - Live screenshots on the box: `/workspace/fash-ship-qa/live3/closet-empty-{light,dark}.png`, `live3/sell-{light,dark}.png`, and the filled listing flow at `prod3-{light,dark}/s2-ai-filled.png`.

## LATEST — 2026-10-14 ~11:40 ET: free-v2 SHIPPED TO PRODUCTION (Iz said "ship it")
- **Production:** commit `8211eb1` (main = merge of free-v2 `1496c2a` + handoff docs). Pages deploy `6c0d6cbf`. `version.txt` verified.
- **Rollback:** `1ecaa1e8-40eb-40bd-8d2c-ee2a553627ce` (commit `4001c02`). The older rollback is `7865a20b` (`452d7e8`).
- **Live checks:**
  - All 12 main pages (home, shop, search, item, try-on, sell, seller board, seller stats, pricing, contact, account delete, blog) return 200 with 0 JS errors and no horizontal overflow, in light and dark.
  - `ads.txt` is intact (pub-7215975042937417). `sitemap.xml` has 40 URLs. `robots.txt` returns 200.
  - E2E 12/12 against production in light and dark. Test listings 168 and 169 were deleted. The public shop still shows only the 4 original listings.
  - Live screenshots on the box: `/workspace/fash-ship-qa/live-{home,shop,item}-{light,dark}.png`.
- **New preview** https://free-v3.fashionistas-ai.pages.dev (branch `free-v3`, commit `4e729e3`), not in production:
  - The empty closet shows one "Add an item" CTA (in the hero) plus a quiet "Or add one by hand".
  - The listing flow has a Photos → Details → Post stepper and card sections, with a "ready" note.
  - E2E 12/12 light and dark; npm test 447/447.
  - Screenshots: `/workspace/fash-ship-qa/ds-v3/` and `v3-{light,dark}/`.
  - Needs Iz's "ship it".

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

### Update ~11:15 ET: design pass on preview `1496c2a` (https://free-v2.fashionistas-ai.pages.dev)
- **New `ds2.css`**, loaded last in the app:
  - Editorial serif screen titles (Instrument Serif).
  - Pill controls and compact shop sort/filter pills.
  - Rounder photo tiles with a staggered entry.
  - Framed 4:5 item photo with a serif title; Try-on is a dark pill so Buy is the only primary button; frosted buy bar.
  - Compact "You" menu cards, calm centred empty states, and the listing wizard in the same pill language.
- **The app sets `html[data-view]` on every screen**, so CSS can target individual screens.
- **Static pages** (site.css):
  - Follow the phone's light/dark setting.
  - One-row scrollable sticky header on mobile; serif h1.
- **Crosslist board redesigned:**
  - Item cards with a photo and summary chips ("Live here", "Listed on N others").
  - A collapsible "Shops (18)" list.
  - Each shop row: initial badge, name and status pill; at most 3 equal pill buttons on their own row. No more cramped wrapping.
  - Designed empty state.
- **Try-on:** polished CTA, zones and quick-look card (skin.css v3).
- **Checks:**
  - E2E 12/12 in light and dark, 0 page errors (the board check now counts `.bl-shop`).
  - npm test green.
  - Screenshots on the box: `/workspace/fash-ship-qa/ds-final/` (9 screens × light/dark), `shots3-light/` and `shots3-dark/` (E2E flow); "before" shots are in `ds-before/`.
- **Still open:**
  - Listing-wizard internals beyond CSS.
  - The closet hero still shows two "add" CTAs.
  - Production stays at `4001c02` until Iz says "ship it".

### Update ~10:35 ET: preview `16fbea8` (https://free-v2.fashionistas-ai.pages.dev)
- **E2E: 12/12 stories pass in light AND dark.** Spec: `e2e/stories.spec.js`; doc: `docs/USER-STORIES.md`. 0 page errors. Each run deletes its own test listing (ids 156–161 are all gone).
- **Fixed a real bug:** "List on fashionistas" did nothing when tapped while the keyboard was open. The tap blurred the input first and the click was lost. Fixed with pointerdown preventDefault in `listing-wizard.js`, bumped to v=5.
- **Crosslist board:** `/seller/board/` covers 18 rows (ours + 17 shops). Buyers now see "Buy on <shop> ↗" on item pages.
- **Capacitor configs:** `mobile/capacitor/` (appId `ai.fashionistas.app`, remote `server.url`). TWA remains in `docs/twa/`. `e2e/` and `mobile/` are excluded from deploys.
- **Design:** static pages now follow the phone's light/dark setting (they were always dark). Also serif h1, rounded cards, tap and entry motion. A deeper app-wide design pass is still open.
- **Not done:**
  - Deeper visual redesign.
  - Native camera plugin wiring.
  - Store accounts (Iz).
  - Marketplace API keys (Iz).
- Production is still `4001c02` and needs "ship it".

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

## 2026-10-14: Channels / programmatic posting (PREVIEW ONLY, not shipped)

- Branch `channels` @ 0d10784 → https://channels.fashionistas-ai.pages.dev (452 unit tests, e2e 12/12 light+dark, board connect panel screenshots OK, no overflow/page errors).
- CHANNEL_KEY is set on Pages **preview** only. Before shipping, set it on production: `wrangler pages secret put CHANNEL_KEY` with a random 32-byte value. Without it, store connections are off.
- Verified: connect WooCommerce (dummy, removed after), SSRF guard rejects 127.0.0.1, guided channels refuse connect, `/feeds/<uid>.xml|.csv` live (demo user 50 = 3 items).
- Full matrix below (copy of docs/marketplace/CHANNELS.md on branch channels).

# Marketplace & channel matrix (researched 2026-10-14)

Honest status for every channel. **Built** means this repo creates the listing via the real API or feed once keys exist. Nothing uses bots, password scraping or ToS-breaking automation.

| Channel | How | Built | API | Approval | Cost | Keys / who creates them |
|---|---|---|---|---|---|---|
| WooCommerce | Seller key (works today) | yes | REST v3 (/wp-json/wc/v3/products) | None — the store owner creates a REST key | Free (plugin); hosting is the seller's | Seller: store_url, consumer_key, consumer_secret |
| BigCommerce | Seller key (works today) | yes | REST Catalog v3 | None — store owner creates a store-level API account | BigCommerce plan (from $29/mo, seller's) | Seller: store_hash, access_token |
| Shopify | Seller key (works today) | yes | Admin GraphQL productCreate | None for a custom app in the seller's own store (public OAuth app needs Shopify review) | Shopify plan (seller's); API free | Seller: shop_domain, admin_token; Iz: SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET |
| Square Online | Seller key (works today) | yes | Catalog API (UpsertCatalogObject) | None for the seller's own production access token; OAuth app is free | Free API; Square processing fees on sales | Seller: access_token; Iz: SQUARE_APP_ID, SQUARE_APP_SECRET |
| Wix Stores | Seller key (works today) | yes | Wix Stores Catalog API (products) | None — site owner creates an API key | Wix business plan (seller's) | Seller: api_key, site_id |
| Squarespace | Seller key (works today) | yes | Commerce Products API (v1/commerce/products) | None — site owner creates an API key (Commerce Advanced plan) | Squarespace Commerce Advanced (seller's) | Seller: api_key |
| Reverb (music gear only) | Seller key (works today) | no (needs make/model/category/condition mapping for gear; not useful for clothing) | REST /api/listings | None — personal access token | Free API; Reverb selling fees | Seller: token |
| Mercari Shops (Japan only) | Seller key (works today) | no (Japan-only, needs category IDs and a JP fixed IP; build on request) | GraphQL createProduct | Mercari Shops API contract; JP shops; may need a registered fixed IP | Free API; Mercari Shops fees | Seller: token |
| eBay | OAuth (needs our app keys) | yes | Sell Inventory API | eBay developer account (free) + production keyset | Free API; eBay fees | Iz: EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, EBAY_RU_NAME |
| Etsy | OAuth (needs our app keys) | yes | Open API v3 createDraftListing | Etsy developer app (free); commercial access review | Free API; $0.20 listing fee + Etsy fees (seller's) | Iz: ETSY_API_KEY |
| Google (free listings / Merchant Center) | Product feed (works today) | yes | Our feed URL (works now). Merchant API productInputs.insert later | Google Cloud OAuth client (free); seller has a Merchant Center account | Free | Iz: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET |
| Facebook & Instagram Shops | Product feed (works today) | yes | Our feed URL as a scheduled catalog data feed (works now). items_batch API after Meta App Review | Meta app + App Review for catalog_management; seller has Commerce Manager | Free | Iz: META_APP_ID, META_APP_SECRET |
| Pinterest catalogs | Product feed (works today) | yes | Catalog data source (feed URL); API v5 catalogs needs Standard access | Pinterest business account; claim website | Free | — |
| TikTok catalog (ads) | Product feed (works today) | yes | Catalog Manager scheduled feed | TikTok Ads/Business Center account | Free | — |
| Amazon | Approval-gated API | no | Selling Partner API — Listings Items putListingsItem | SP-API developer registration + seller authorization; used clothing is restricted (new/Amazon-approved conditions only) | Professional seller plan $39.99/mo (seller's); API free | Iz: AMAZON_LWA_CLIENT_ID, AMAZON_LWA_CLIENT_SECRET, AMAZON_SPAPI_APP_ID |
| Walmart Marketplace | Approval-gated API | no | Marketplace Items API (feeds) | Approved Walmart Marketplace seller; mostly new items only (pre-owned via Walmart Restored) | Free API; referral fees | Iz: (seller) WALMART_CLIENT_ID, (seller) WALMART_CLIENT_SECRET |
| TikTok Shop | Approval-gated API | no | TikTok Shop Partner API (products) | TikTok Shop Partner Center app approval; seller in a supported country/category | Free API; TikTok Shop fees | Iz: TIKTOK_APP_KEY, TIKTOK_APP_SECRET |
| Bonanza | Approval-gated API | no | Bonapitit API (addFixedPriceItem) | Request developer ID/cert from Bonanza (free); seller authorizes via fetchToken | Free API; Bonanza fees | Iz: BONANZA_DEV_ID, BONANZA_CERT_ID |
| Depop | Approval-gated API | no | Depop Selling API (partners) | Partner application to Depop; not open to the public | Unknown until approved | Iz: DEPOP_CLIENT_ID, DEPOP_CLIENT_SECRET |
| Vinted | Approval-gated API | no | Vinted Pro Integrations (CreateItems) | Allowlisted Vinted Pro businesses only (EU/UK); no public application | Free API if allowlisted | Iz: (seller) VINTED_ACCESS_KEY, (seller) VINTED_SIGNING_KEY |
| Vestiaire Collective | Approval-gated API | no | Seller API | Professional sellers with ~1,000 listings/month; CSV mass import from 200/month | Free API if approved; commission | Iz: (seller) VESTIAIRE credentials from account manager |
| Whatnot | Approval-gated API | no | Seller API (GraphQL) — Developer Preview | Not accepting new applicants (2026) | — | — |
| Poshmark | Copy & open only | no | None public | — | — | — |
| Mercari (US) | Copy & open only | no | None public for US marketplace | — | — | — |
| Grailed | Copy & open only | no | None public | — | — | — |
| Facebook Marketplace (personal) | Copy & open only | no | None for personal Marketplace listings (Shops use Meta catalog above) | — | — | — |
| Kidizen | Copy & open only | no | None public | — | — | — |
| Curtsy | Copy & open only | no | None (app only) | — | — | — |
| eBid | Copy & open only | no | No current public listing API found; bulk CSV upload for sellers | — | — | — |
| Ruby Lane | Copy & open only | no | None public; shop-owner bulk tools only | Shop approval + monthly fees | Ruby Lane shop fees | — |
| ThredUp | Copy & open only | no | None — consignment (send a bag) | — | — | — |
| The RealReal | Copy & open only | no | None — consignment | — | — | — |
| Lyst / ShopStyle | Copy & open only | no | Retailer/brand feeds via affiliate networks; not open to individual resellers | Retailer partnership | — | — |

## Crosslisting aggregators as a bridge (Vendoo, List Perfectly, Crosslist, Nifty, PrimeLister)
- None publish a partner API that lets another app post through them. They're consumer subscriptions ($15–$60/mo).
- Their Poshmark/Mercari/Depop "integrations" run inside the seller's own browser via an extension. List Perfectly makes the seller press Post.
- Poshmark's terms prohibit automated access, and there's no Poshmark API. Routing our sellers through those tools would just move that ToS risk onto them. **We don't bridge through aggregators.** Our Copy & open plus the extension auto-fill already gives the same "seller presses Post" result for free.

## Product feed (built, free, works today)
- `/feeds/<sellerId>.xml` is in Google RSS 2.0 format, with `g:` fields (id, title, description, link, image_link, availability, condition, price, brand, size, color).
- `/feeds/<sellerId>.csv` has the same fields.
- Paste it once into:
  - Google Merchant Center → Products → Add feed → Scheduled fetch (free listings).
  - Meta Commerce Manager → Catalog → Data sources → Data feed → Scheduled.
  - Pinterest → Catalogs → Data source.
  - TikTok Catalog Manager → Scheduled feed.
- Each feed contains only that seller's live, for-sale listings, which are already public on /shop.

## Seller-key stores (built, real API, no approval)
- **Stores:** WooCommerce, BigCommerce, Shopify (custom app token), Square, Wix, Squarespace.
- **How it works:** the seller pastes their own key on /seller/board/. It's stored encrypted with AES-GCM using `CHANNEL_KEY`, and "Post via API" creates the product.
- **Honest labels:** an item is marked "listed" only when the remote API returns an id.
- **Photos:** Square and Squarespace need the photo added in their own editor, because their image upload takes a file, not a URL. The app tells the seller.
- **Key status:** `CHANNEL_KEY` is set on Preview only. Production stays off until Iz approves.

## Keys checklist for Iz
1. `CHANNEL_KEY` (production): a random 32-byte secret that turns on seller-key stores in production.
2. eBay: `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`, `EBAY_RU_NAME` (developer.ebay.com, free).
3. Etsy: `ETSY_API_KEY` (etsy.com/developers, free; commercial access review).
4. Shopify public app (optional; the custom-app token already works): `SHOPIFY_CLIENT_ID` and `SHOPIFY_CLIENT_SECRET` (Shopify Partners, free; App Store review).
5. Square OAuth (optional): `SQUARE_APP_ID` and `SQUARE_APP_SECRET` (developer.squareup.com, free).
6. Google Merchant API (optional; the feed already works): `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (Google Cloud, free).
7. Meta catalog API (optional; the feed already works): `META_APP_ID` and `META_APP_SECRET`, plus App Review for `catalog_management`.
8. Amazon SP-API: developer registration, plus `AMAZON_LWA_CLIENT_ID`, `AMAZON_LWA_CLIENT_SECRET` and `AMAZON_SPAPI_APP_ID`. Sellers need the $39.99/mo Pro plan. Used clothing is restricted.
9. TikTok Shop: Partner Center app, `TIKTOK_APP_KEY` and `TIKTOK_APP_SECRET`.
10. Bonanza: email Bonanza for a dev ID and cert: `BONANZA_DEV_ID` and `BONANZA_CERT_ID`.
11. Depop: partner application. Vinted Pro: allowlist only. Vestiaire: about 1,000 listings a month. Whatnot: closed to new applicants.

## 2026-10-14: Channels SHIPPED

- Live: 86d6d70 = deploy d8b758aa-0ed8-430d-a4e4-c780c7b90be9. Rollback: 73a85ca4-39cc-457f-b41d-2eec08a2e3fd (d26cf1c).
- CHANNEL_KEY set on production (random 32 bytes, never printed). Losing or rotating it makes stored seller keys unreadable, so sellers must reconnect.
- Verified live: version.txt, pages + board 200 with no JS errors, connect/disconnect of the fake WooCommerce store (removed), SSRF guard, /feeds/50.xml (3 items), ads.txt and sitemap (40 locs), e2e 12/12 (test listing cleaned up).

---
## RESUME HERE (cold start) — updated 2026-10-14 12:20 ET

**Production:** commit `86d6d70` (channels shipped) = Pages deploy `d8b758aa-0ed8-430d-a4e4-c780c7b90be9`. **Rollback:** `73a85ca4-39cc-457f-b41d-2eec08a2e3fd` (d26cf1c); older `6c0d6cbf…` (8211eb1).

**Repo / deploy**
- Laptop repo: `~/fashionistas-ai` (Cloudflare Pages project `fashionistas-ai`, D1 `fashionistas-db` shared by preview+prod, R2, worker API proxied at `/w/*`).
- Prod: from `main` → `bash scripts/deploy-local.sh` (runs npm test, deploys, verifies `/version.txt`).
- Preview: `ALLOW_BRANCH=<b> DEPLOY_BRANCH=<b> [SKIP_TESTS=1] bash scripts/deploy-local.sh` → `https://<b>.fashionistas-ai.pages.dev`.
- Local `main` is ~80+ commits ahead of origin/main — DO NOT push main. Laptop handoff = local commit only.
- nexus-ai-suite handoff: worktree `/tmp/nx-ho` → `git fetch && git reset --hard origin/master`, edit `HANDOFF-fashionistas-2026-10-14.md`, commit, `git push origin HEAD:master`.
- Hashed bundle `assets/app.<sha12>.js`: after editing, rehash/rename and update `index.html` + `tests/security-gates.test.mjs`.
- QA box (agent box): `/workspace/fash-ship-qa` — `BASE=<url> SCHEME=light|dark OUT=dir node e2e/stories.spec.js` (12 stories, self-cleans its listing), `ch.js` (B=<url>: channels API + connect fake woo + board screenshots), `prodchk.js`, `ds.js`.

**Rules (Iz)**
- Deploy with Wrangler only (deploy-local.sh); never GitHub Actions.
- Preview first + self-reviewed 412x915 light AND dark screenshots; nothing to prod without Iz's "ship it".
- Never invent data (listings, prices, stats, "listed" states — listed only when a remote API returns an id or the seller confirms).
- Site stays free for users; keep demo listings.
- Never print secrets. NEVER change/rotate `CHANNEL_KEY` (Pages secret, set on preview AND production; rotating makes every stored seller credential unreadable).
- Irreversible/external actions need explicit approval. Clean up test-seller listings/connections.

**Test seller:** `iz_test_seller` (user 130); creds in gitignored `~/fashionistas-ai/.env.test-seller` and box `/workspace/fash-ship-qa/.env.test-seller`. Login via worker `/w/api/auth/login` (username). User 129 = unused leftover.

**Channel matrix:** see the "Channels / programmatic posting" section above (copy of `docs/marketplace/CHANNELS.md`). Code: `functions/_lib/channels.js` (registry), `vault.js` (AES-GCM, table channel_creds), `channel-adapters.js` (woo, bigcommerce, shopify, square, wix, squarespace), `functions/api/channels/{index,connect,post}.js`, `functions/feeds/[[path]].js` (`/feeds/<uid>.xml|.csv`), board `seller/board/index.html`. eBay/Etsy OAuth: `functions/api/{ebay,etsy}/oauth/{start,callback}.js`.

**IN PROGRESS — "easiest seller journey"** (branch `easy`, from main `86124c9`; nothing committed yet; preview will be https://easy.fashionistas-ai.pages.dev)
1. OAuth Connect replacing pasted keys: Shopify (public app OAuth, needs shop domain), WooCommerce (`/wc-auth/v1/authorize` key-grant → keys POSTed to our callback; no app registration), BigCommerce app OAuth, Square OAuth, Wix OAuth (installer + wixapis /oauth/access, refresh), Squarespace OAuth (partner approval), eBay/Etsy existing. Plan: `functions/_lib/oauth-apps.js` + `functions/api/oauth/[[path]].js` (start/callback), store tokens via vault in the same field shape adapters use; refresh helper.
2. Feeds auto-push via OAuth: Google Merchant API, Pinterest v5 catalogs/feeds (register our feed URL), Meta catalog product_feeds (schedule URL). Else one-tap copy + deep link + 3-step guide.
3. Guided "Post everywhere" run-through for guided sites: tap-copy title, tap-copy desc+price, photos via share-sheet/zip, open sell page, "Done, next site"; per-site timer + progress (mark listed only on seller "Done").
4. Onboarding "Connect your shops" checklist after first listing: time per channel + honest click counts.
5. Measure a real timed journey with the test seller; report seconds per channel (OAuth flows can't be timed until Iz registers apps — say so).
Then: preview deploy, screenshots, e2e 12+/12, handoffs, report. No prod without "ship it".

**Keys / app registrations Iz owes (one-time, site owner)** — redirect base `https://fashionistas.ai`:
- Shopify Partner app (public, write_products) → redirect `/api/oauth/shopify/callback`; env SHOPIFY_CLIENT_ID/SECRET. Public listing needs Shopify review.
- BigCommerce Dev Portal app → auth callback `/api/oauth/bigcommerce/callback` (+ load/uninstall); env BIGCOMMERCE_CLIENT_ID/SECRET.
- Square Developer app (prod) → redirect `/api/oauth/square/callback`; SQUARE_APP_ID/SECRET.
- Wix Dev Center app → redirect `/api/oauth/wix/callback`; WIX_APP_ID/SECRET.
- Squarespace OAuth (apply via partner form) → `/api/oauth/squarespace/callback`; SQUARESPACE_CLIENT_ID/SECRET.
- Google Cloud OAuth client (Content API scope; needs verification) → `/api/oauth/google/callback`; GOOGLE_CLIENT_ID/SECRET.
- Pinterest app (catalogs scopes) → `/api/oauth/pinterest/callback`; PINTEREST_APP_ID/SECRET.
- Meta app (catalog_management, App Review) → `/api/oauth/meta/callback`; META_APP_ID/SECRET.
- eBay keyset + RuName; Etsy app (ETSY_API_KEY/SECRET) — existing routes.
- WooCommerce: none.
- Partner applications still pending: Amazon SP-API, Walmart, TikTok Shop, Bonanza, Depop; Whatnot/Vinted waitlists.

### Progress 2026-10-14 12:55 ET
- Branch `easy` @ f25e95d deployed to https://easy.fashionistas-ai.pages.dev (456 tests pass). Built: `functions/_lib/oauth-apps.js` (providers, signed state, Shopify HMAC, refresh), `functions/api/oauth/[[path]].js` (POST /api/oauth/<p>/start → {url}; GET|POST /callback), refresh in channels/post.js, board: one-tap Connect + shop input, feed Connect / 3-step guide, onboarding checklist (#ob), Post-everywhere run-through (#run, zip/share photos, timer, progress), tests/oauth.test.mjs.
- Next: verify on preview (woo start URL, forged-state rejection), timing run (box timing.js), fill MEASURED in board, screenshots 412x915 light/dark, e2e 12/12, report.

### Progress 2026-10-14 12:46 ET (easy journey — PREVIEW, not shipped)
- Branch `easy` @ b0a4855, deployed https://easy.fashionistas-ai.pages.dev (VERIFIED; 456 unit tests; e2e 12/12 light + dark).
- Done: OAuth Connect for WooCommerce (built-in key grant, works now, no app needed), Shopify, BigCommerce, Square, Wix, Squarespace (all off until Iz's app keys exist); feed auto-register via OAuth for Google Merchant API / Pinterest v5 / Meta catalog (off until app keys) + copy link + deep link + 3-step guide; Post-everywhere run-through (copy title, copy desc+price, photos zip/share, open sell page, Done→next, timer, progress; marks listed only on seller Done); Connect-your-shops checklist (click counts, measured ~7s/site); forged-state callbacks rejected (400/redirect), anon start 401.
- Measured (box timing.js, test seller): photo→AI fill 3–4.5s, post live 1.2–1.9s, photo→live 4.4–6.4s; run-through 17 sites in 121s (6.5–8.5s/site with 1.2s pause per tap; 2.1s/site at robot speed). Real marketplace form time is extra and not measurable.
- Left: re-check the run sheet's final 'All done' screenshot after the b0a4855 fix (sheet moved to body because main has a transform); exclude consignment sites (ThredUp/RealReal) from the run-through; Iz registers the apps; 'ship it' → merge easy into main + deploy-local.sh.
- Apps to register (redirect base https://fashionistas.ai): Shopify /api/oauth/shopify/callback (SHOPIFY_CLIENT_ID/SECRET); BigCommerce auth callback /api/oauth/bigcommerce/callback (BIGCOMMERCE_APP_ID/CLIENT_ID/CLIENT_SECRET); Square /api/oauth/square/callback (SQUARE_APP_ID/SECRET); Wix /api/oauth/wix/callback (WIX_APP_ID/SECRET); Squarespace /api/oauth/squarespace/callback (SQUARESPACE_CLIENT_ID/SECRET, partner approval); Google /api/oauth/google/callback (GOOGLE_CLIENT_ID/SECRET, content-scope verification); Pinterest /api/oauth/pinterest/callback (PINTEREST_APP_ID/SECRET); Meta /api/oauth/meta/callback (META_APP_ID/SECRET, App Review). Set each with wrangler pages secret put. Never touch CHANNEL_KEY.

### 2026-10-14 12:55 ET — NEW TASK: crosslister browser extension (branch `ext` from easy b0a4855)
- Build MV3 extension in extension/: bridge on fashionistas.ai board, opens marketplace sell pages in seller's own tabs, autofills (title/desc/price/brand/size/category/condition/photos via DataTransfer), review-then-submit (opt-in auto-submit with human pacing), captures listing URL → /api/crosslist/status listed; delist-on-sold. Targets: Poshmark, Mercari, Depop, FB Marketplace, Grailed, Vinted, eBay, Etsy. ToS warning. Mock page test; zip for Chrome Web Store ($5 fee Iz pays). Also drop ThredUp/RealReal/Amazon/Walmart/Whatnot from manual run-through. Preview only.

### 2026-10-14 13:10 ET — extension milestone (branch `ext` @ 735c21a, preview https://ext.fashionistas-ai.pages.dev VERIFIED, 456 tests)
- extension/ (MV3): manifest, background.js (opens sell tabs, injects fill.js, watches tab URL for listing pattern → POST /api/crosslist/status listed; delist runner), sites.js (8 sites: sell URL, field hints, submit, listed regex, delist words), fill.js (React-safe value setter, label/placeholder matching, comboboxes, photos via DataTransfer, opt-in auto-submit w/ random 0.35–1s pauses), bridge.js (board ↔ extension; token via postMessage), options/popup with ToS warning + accept + auto-submit toggle (off by default), test/mock-sell.html.
- Zip: dist/fashionistas-crosslister-0.1.0.zip (excluded from Pages deploy along with extension/).
- Board: Post everywhere → extension if installed (else step-by-step); Sold → offers extension delist; run-through drops ThredUp/RealReal/Amazon/Walmart/Whatnot.
- Tested: mock page fills all 7 fields + 2 photos + auto-submit; unpacked extension loads (service worker OK), bridge detected on preview board. Real sell pages all require login (Poshmark/Etsy/Vinted redirect to sign-in; Mercari/Depop/Grailed render nothing signed out; eBay timed out) → site selectors are UNVERIFIED until tested with real seller accounts.
- Next: test with real accounts and fix selectors per site; Chrome Web Store: $5 dev account, upload zip, privacy policy + single-purpose + host-permission justifications; 'ship it' to merge ext → main.

### 2026-10-14 13:35 ET — revenue milestone
- Audit of all 4 sites: REVENUE-AUDIT-2026-10-14.md (this repo). fashionistas preview branch `revenue` @ 1039402 → https://revenue.fashionistas-ai.pages.dev: env-gated EPN_CAMPID / AMAZON_TAG affiliate tagging on Buy-on links + disclosure; pSEO plan (gated ≥5 real listings). Not shipped. Ext branch 735c21a still unshipped; revenue branched from ext.

## 2026-10-14 14:10 ET — SHIPPED revenue+ext+easy
- Production: `89bf396` (merge of revenue 1039402, incl. ext 735c21a + easy b0a4855) = deploy `47a70a52-041e-4e46-b7c4-7c620c1ccfb6`. **Rollback:** `d8b758aa-0ed8-430d-a4e4-c780c7b90be9` (86d6d70).
- Verified live: version.txt; /, /shop/, /seller/board/, /pricing/, /try-on/, /blog/ 200, no JS errors; checklist + Post-everywhere run (test listing, cleaned); extension loads + board detects it (faExt 0.1.0); Woo OAuth start URL ok, Shopify app_not_registered, forged callbacks rejected; /api/crosslist/links affiliate:false (no EPN_CAMPID/AMAZON_TAG); ads.txt + sitemap (40) intact; e2e 12/12; test seller 0 listings / 0 connections. CHANNEL_KEY untouched.
- Pending on Iz: EPN_CAMPID / AMAZON_TAG secrets, OAuth app registrations, Chrome Web Store upload of dist/fashionistas-crosslister-0.1.0.zip, real-account selector testing for the extension.
## 2026-10-14 15:45 ET — Cloudflare "exceeded free CPU 10ms" alert (account fashionistas1979)
- NOT Fashionistas. GraphQL analytics (24h): fashionistas-ai Pages (pages-worker--12510043) 0 exceededResources, p50 3ms; fashionistas-api Worker p90 2.5ms. Revenue deploy 47a70a52 is clean.
- Culprit: marketpicks-ai Pages (pages-worker--13772260): 1,955 prod + 56 preview exceededResources, p50 14ms, p90 193ms. Tail: AhrefsBot/SemrushBot crawling uncached SSR long-tail (/congress/ticker/*, /insider-trades?ticker=*) at 120-350ms CPU each.
- Fix (backend only): SEO-tool bot guard in marketpicks scripts/edge-cache-wrapper.mjs (cached copy or 503 Retry-After; Googlebot/Bing/humans unchanged). Prod 280dc36b (preview b059dbaf verified). Rollback 0cb3f854.
- Other >10ms scripts on the account (smaller): federation-watch cron p50 14ms (96/day), placebets-scheduler p50 10ms (110/day), marketpicks-ai-api p90 34ms + 76 exceptions.
- Post everywhere 13/17: likely by design — run-through drops ThredUp/RealReal/Amazon/Walmart/Whatnot (see Board notes above); not re-verified.

## Agile reset (2026-10-14, evening)
Iz called the app the worst-put-together he'd seen. It now runs as an agile project, and the docs are on fashionistas-ai branch `docs/agile`:
- docs/agile/UX-RESEARCH.md: 10 sourced findings.
  - Delist-on-sale is the #1 crosslister failure.
  - No API keys: connect through logged-in sessions.
  - Honest AI with no fake %.
  - Background clean must be non-destructive.
  - Honest empty states.
  - Baymard mobile filters.
- docs/agile/BACKLOG.md: BUG-1..7 from Iz's screenshots, plus seller, buyer and trust stories with MoSCoW and severity. Supersedes docs/USER-STORIES.md.
- docs/agile/SPRINTS.md: 2–3 day sprints.
  - S1 (Oct 14–16, branch `seller-ux`, other worker): no-key connect, no "not built", non-destructive clean, honest AI (coffee-lid fixture), greeting, $0 empty dashboard, plain tiles, Post everywhere (eBay, Poshmark, Depop, Mercari).
  - S2: delist-everywhere.
  - S3: buyer filters and item page.
  - S4: messages and payouts.
  - S5: SEO, AdSense, Chrome Web Store.
- Done = the e2e/agile test passes on preview, 412x915 screenshots are posted, and Iz says "ship it".
