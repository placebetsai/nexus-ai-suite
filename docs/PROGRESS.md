# fashionistas.ai — LIVE BUILD CHECKLIST

**Rule: a row may only move to PASS with raw proof pasted in the Proof column. No proof = stays TODO/BLOCKED.**
Last updated: 2026-10-02 (Europe/Paris)

Legend: `TODO` not started · `WIP` in progress · `PASS` proven · `BLOCKED` 3 failures + exact error

---

## PHASE 0 — Reality check + deploys

| # | Feature | Status | Proof |
|---|---------|--------|-------|
| 0.1 | Map system: frontend + Worker repos | TODO | |
| 0.2 | curl every endpoint the frontend calls | TODO | |
| 0.3 | Live `index.html` == HEAD | PASS | `diff live vs apps/fashionistas/index.html` → IDENTICAL, both 133520 bytes, 2026-10-02 |
| 0.4 | GH Actions: Pages deploy on push | TODO | |
| 0.5 | GH Actions: Worker deploy on push | TODO | |
| 0.6 | `gh secret set` CLOUDFLARE_API_TOKEN / ACCOUNT_ID | TODO | |
| 0.7 | Demo credentials out of client JS | PASS | `af79ce8`; earlier `grep -c Primetime https://fashionistas.ai/app.js` = 0 |
| 0.8 | Forbidden claims removed ("Free forever", "No subscription", "does not post") | TODO | currently index.html ×7, app.js ×5 |
| 0.9 | push → `gh run watch` → live hash == HEAD (both projects) | TODO | |

---

## COMPETITOR BENCHMARK

| # | Feature | Status | Proof |
|---|---------|--------|-------|
| C.1 | Visit live sites + store listings, build matrix | PASS | `docs/COMPETITORS.md`, commit `81ae18e` |
| C.2 | Feature with 2+ competitors → REQUIRED, list additions | PASS | 24 rows flagged, mapped to phases (see COMPETITORS.md) |
| C.3 | Re-run matrix after Phase 6, paste ✓/✗ | TODO | |

---

## PHASE 1 — Closet clearing (the core)

| # | Feature | Status | Proof |
|---|---------|--------|-------|
| 1.1 | Accounts: email/password + Google, HttpOnly cookie, D1 | TODO | |
| 1.2 | Batch closet photo upload (phone camera) | TODO | |
| 1.3 | AI item ID: category/brand/size/color/material/condition | TODO | |
| 1.4 | Background-removed cutout → R2 | TODO | |
| 1.5 | Resale price range from real sold comps, else labelled AI estimate | TODO | |
| 1.6 | Best marketplace(s) + reason | TODO | |
| 1.7 | Net take-home per marketplace after fees + shipping | TODO | |
| 1.8 | Wear logging | TODO | |
| 1.9 | Cost-per-wear + last-worn; unworn 6mo → "clear it" | TODO | |
| 1.10 | "Clear my closet": SELL/DONATE/KEEP + reason + total $ + bundles | TODO | |
| 1.11 | Import existing listings (eBay API, Poshmark/Mercari via extension) | TODO | |
| 1.12 | Seller dashboard: listed/views/sold/earned/$ still sitting | TODO | |
| 1.13 | **PROOF**: 5 real photos → API output + Clear-my-closet total $ | TODO | |

---

## PHASE 2 — One-click sell to all marketplaces + guidance

| # | Feature | Status | Proof |
|---|---------|--------|-------|
| 2.1 | One universal listing form | TODO | |
| 2.2 | Per-shop kits: titles/descriptions/categories/sizes/tags/price/photos | TODO | |
| 2.3 | "Sell everywhere" button, 8 shop checkboxes | TODO | |
| 2.4 | eBay production Sell Inventory API + per-user OAuth | BLOCKED | `/api/ebay/status` → `env:"sandbox"`; no production app credentials exist |
| 2.5 | Etsy Open API v3 + per-user OAuth | TODO | |
| 2.6 | MV3 extension fills 6 shops, stops before Submit | TODO | DOM harness `tests/crosslister-e2e.mjs` → 31/31 (not real Chrome) |
| 2.7 | Mobile guided flow at 390px | TODO | |
| 2.8 | First-run onboarding + connected ✓ checklist | TODO | |
| 2.9 | Per-shop walkthrough with screenshots | TODO | |
| 2.10 | Photo coach | TODO | |
| 2.11 | Pricing coach | TODO | |
| 2.12 | Shipping guide per shop | TODO | |
| 2.13 | Sold → alert → auto-delist (API, no computer running) | TODO | |
| 2.14 | Status board per item + failure reason | TODO | |

---

## PHASE 3 — Virtual try-on

| # | Feature | Status | Proof |
|---|---------|--------|-------|
| 3.1 | `POST /api/tryon` hosted model, R2 storage, 90s, cost logged | TODO | |
| 3.2 | Multiple previews per request + retry | TODO | |
| 3.3 | Full outfit: top + bottom + outerwear layered | TODO | |
| 3.4 | AI colour analysis + clash flags | TODO | |
| 3.5 | "Show it on a model" for sellers | TODO | |
| 3.6 | Shoppers try any listing; My Looks + share links | TODO | |
| 3.7 | `/try-on/` real page; `/ar-tryon/` redirects | TODO | |

---

## PHASE 4 — AI stylist

| # | Feature | Status | Proof |
|---|---------|--------|-------|
| 4.1 | Chat stylist over the user's real closet | TODO | |
| 4.2 | "Sell or style?" for rarely-worn items | TODO | |
| 4.3 | Outfit planner / calendar | TODO | |
| 4.4 | Free-model routing w/ fallthrough (Zen → OpenRouter → Workers AI) | TODO | |

---

## PHASE 5 — Money

| # | Feature | Status | Proof |
|---|---------|--------|-------|
| 5.1 | Free: 10 items / 5 crosslisted / 3 try-ons per month | TODO | |
| 5.2 | Pro $14.99 Stripe Checkout (TEST mode) | BLOCKED | no Stripe code or keys anywhere in repo |
| 5.3 | Webhook flips `user.plan`; customer portal | BLOCKED | depends on 5.2 |
| 5.4 | `/pricing/` page with dated comparison table | TODO | |
| 5.5 | Every forbidden claim grep → 0 | TODO | |

---

## PHASE 6 — App + launch polish

| # | Feature | Status | Proof |
|---|---------|--------|-------|
| 6.1 | PWA manifest + service worker + install prompt + camera | TODO | |
| 6.2 | Capacitor iOS + Android build artifacts in GH Actions | TODO | |
| 6.3 | Real routes `/sell/ /closet/ /try-on/ /stylist/ /pricing/ /guide/ /compare/ /about/ /privacy/ /terms/` | TODO | |
| 6.4 | `/compare/` pages (Vendoo, Crosslist, List Perfectly, DLOOK) | TODO | |
| 6.5 | Homepage hero copy matching what actually works | TODO | |
| 6.6 | SEO: 1 H1/page, JSON-LD, sitemap, AI crawlers allowed | TODO | |
| 6.7 | Legal: terms, privacy, account deletion removes R2 images | TODO | |
| 6.8 | Lighthouse PWA installable, mobile perf ≥ 80 | TODO | |

---

## HIVE SIDECAR WORK (parallel, non-blocking)

| Agent | Task | Output file | Status |
|-------|------|-------------|--------|
| — | Canary: eBay/Etsy fee research | `apps/fashionistas/data/marketplaces.canary.mjs` | **PASS** — eBay `0.136` verified w/ source URL; Etsy `null` + honest "CAPTCHA, unverified" |
| ledger | 8-shop fee/taxonomy dataset | `apps/fashionistas/data/marketplaces.mjs` | TODO |
| vogue | D1 migrations for closet/wear/listings/tryon | `apps/fashionistas/db/migrations/0011,0012_*.sql` | TODO |
| scribe | `/pricing/` + `/compare/` pages | `apps/fashionistas/pricing/`, `compare/` | TODO |
| mnemonic | API endpoint map script | `tests/api-map.mjs` | TODO |
| nexus | GH Actions deploy workflows | `.github/workflows/*.yml` | TODO |

---

## ACCOUNTS / KEYS THE USER MUST CREATE

| Key | Exact URL | Status |
|-----|-----------|--------|
| eBay production Sell app | https://developer.ebay.com/my/keys | MISSING — blocks 2.4 |
| Etsy Open API v3 app | https://www.etsy.com/developers/your-apps | MISSING — blocks 2.5 |
| Stripe (test mode) | https://dashboard.stripe.com/test/apikeys | MISSING — blocks 5.2 |
| Replicate **or** fal.ai token | https://replicate.com/account/api-tokens | MISSING — blocks Phase 3 |
| Google OAuth client | https://console.cloud.google.com/apis/credentials | MISSING — blocks 1.1 |
| Chrome Web Store dev account | https://chrome.google.com/webstore/devconsole | MISSING — blocks 2.6 shipping |
