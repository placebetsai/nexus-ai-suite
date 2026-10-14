# HANDOFF — fashionistas.ai — 2026-10-14 (~09:45 ET)

**Owner: Chief of Staff.** The Fashionistas bot was retired by Iz; Chief of Staff now owns fashionistas.ai.

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
