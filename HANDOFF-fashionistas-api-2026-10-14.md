# fashionistas-api / fashionistas.ai handoff — 2026-10-14

Worker: workers/fashionistas-api. Pages app: ~/fashionistas-ai (see docs/AGENT_HANDOFF.md there).

## LATEST — 2026-10-13/14 night ET: KV write cap fixes, try-on test app, speed preview

**KV fixes (production).** Cloudflare's free tier allows 1k KV writes a day across the whole account, and the cap was hit on 2026-10-13 around 8:45 PM ET.
- Worker `fashionistas-api`: sign-in temp state (passkey challenges, magic links) now lives in D1 `fashionistas-db` table `auth_tmp`, with a KV fallback. It is live as version `9fba7be4-147d-4f51-934c-e5b313dc1ba4` (deployed 2026-10-13 8:54 PM ET); the `auth_tmp` table was confirmed in D1. Rollback: `863dbacc-5ebd-4d9f-a95b-71a53de9e229`. Committed locally in nexus-ai-suite as `f6bf210` (not pushed).
- Pages main: the try-on daily tally is in D1 `kv_counters` (`functions/api/tryon/hd.js`). The warm throttle is in memory (`functions/api/tryon/warm.js`). The analyze rate limiter uses D1 `kv_counters` when bound and still refuses requests if no limiter storage works (`functions/api/ai/analyze.js`; security tests kept, 447/447). Commits `f31542b` and `c3070c5`. Deployed with `scripts/deploy-local.sh`, which excludes dotfiles, not a raw `wrangler pages deploy .`. Deployment `efeb7258`, version.txt `c3070c5`. Rollback: `acd567c9`.
- Production check: the passkey sign-in page loaded 5× on Pixel 7 with no JS errors, and `/w/api/auth/passkey/login-options` returned 200 each time.
- KV writes since 02:31Z (10:31 PM ET) up to 10:38Z on 10-14: 91 account-wide. 64 were on namespace `2c710998`, which is shared by the Worker (`CACHE`) and Pages (`CACHE`/`FASHIONISTAS_KV`). Some fashionistas path still writes KV. Next: find it (the Worker `src/index.js` put and the Pages functions that still call `.put`).

**Try-on test app (Modal).** The `fashn-vton-fast` test app crash-looped on startup with `AttributeError: module 'app' has no attribute 'Fast'`. The snapshot class is only defined when `FASHN_FAST=1`, and that variable was set on the laptop at deploy time but not inside the container. It was stopped at 2026-10-13 9:04 PM ET. Production app `fashn-vton` was not touched. To retry snapshots, set `FASHN_FAST`/`FASHN_APP_NAME` in the image `.env(...)` too.
- Production try-on check, 2026-10-13 10:21 PM ET, called the Modal app directly (no KV): HTTP 200 with a real 576×864 webp. 43.5 s total (22.9 s rendering, the rest upload and network from the laptop).

**Speed preview** `https://speed.fashionistas-ai.pages.dev` at `b680f7b` (branch `speed` in `~/fa-speed`, NOT on production). It includes main's KV fixes and contains:
- Server-rendered shop/item pages. The app keeps them (`hydrateShop`) instead of redrawing.
- App scripts load late, after first paint and idle; on home they wait for idle. Taps made before the app is ready are replayed.
- WebP thumbnails from R2 (`/img/<w>/`, `scripts/backfill-thumbs.py`).
- Self-hosted Inter.
- Try-on:
  - Shop photos load through the same-origin `/w/api/images` proxy. This fixes Iz's "Couldn't load that photo"; the root cause was not reproduced.
  - The picked item shows immediately. A plain link step with a "How?" tip. "Take a selfie" (live camera with a full-body outline, a Now/3 s/10 s timer and a flip button; falls back to `capture="user"`) next to "Choose photo".
  - Uploads are shrunk to 896 px (the model works at 576×864).
  - A clear "Try-on is temporarily down…" message on 5xx, no answer, or a dropped connection.
- Nav: Shop / Sell / You. "Try it on" is on wearable shop tiles (not bags/shoes/jewellery), the item page, a card in You, and the landing menu.
- Lighthouse mobile, last full run: home ~66, shop 73–75, item 92–96, try-on 99. Regression 72/72 on `fe95f8bc`. Screenshots on the box: `/workspace/speed-qa/r4/`.
- Home vs prod screenshot diff: the preview renders Inter where prod falls back to Liberation Sans, and it shows the real "F" logo on /shop where prod's is a 404. Both are bug fixes, but visible. Iz decides.

**Remaining build work (not started):**
- Seller dashboard in D1 (per-shop status posted/copied/opened/sold, mark sold → prompt to delist elsewhere, views/saves, edit, relist).
- Stripe Checkout behind `STRIPE_SECRET_KEY`, with "Checkout coming soon" when it is unset.
- Buyer search and filters (size, brand, price, category), sort, and empty states.
- Premium visual pass benchmarked against Depop/Vinted.
- UX prime-time scorecard (`/workspace/audits/fashionistas-ux-primetime-2026-10-13.md`).
- Junk shop item: "Clear Plastic Cup with special straw" (id 155, Home/Home Accents) is live in the shop and should be hidden or removed.
- Try-on speed: no reliable before/after seconds yet (the laptop network spoiled the timings). Resize-on-upload for thumbnails needs a Worker deploy; until then re-run the backfill script.
- Home Lighthouse is still below 85.

**User-only blockers:** Stripe account and a business entity; eBay keys (`EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`, `EBAY_RU_NAME`, policies); Etsy keys (`ETSY_API_KEY`, `ETSY_API_SECRET`); a Chrome Web Store developer account ($5); Google Search Console verification; `GOOGLE_CLIENT_ID` (Google One Tap); `RESEND_API_KEY` (magic-link email).
