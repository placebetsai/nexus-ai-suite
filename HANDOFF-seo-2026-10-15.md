# Handoff — SEO session 2026-10-14 → 2026-10-15 (Israel Joffe image reclaim + 4-site SEO quick fixes)

Owner: Iz. Deploys are **wrangler only, never GitHub** (pushing may trigger builds; nothing from this session was pushed). Never print secrets.
Tokens: Nexus account `CF_*` in `nexus-ai-suite/.secrets/cf.env` (israeljoffe-com, israeljoffe-org, wuwonline-com); ihatecollege account `CF_TOKEN_IHATECOLLEGE` + `IHC_ACCOUNT_ID` in `~/.secrets/cloudflare.env` (scooters-exchange).

---

## 1. Israel Joffe image reclaim (Google Images "israel joffe")

Goal: the Facebook-post screenshot that Google Images credits to the 1100 Pennsylvania blog post (paywalled, Oct 22 2020) gets credited to Iz's own pages instead. Google indexes the Facebook-post version as its own image, so we compete for that exact file.

**HARD RULE (Iz):** the image and its pages never mention Trump, the hotel, Washington or DC (or politics). Label = "Israel Joffe" only. The image stays OFF all homepages.

Live:
- https://israeljoffe.com/israel-joffe-portrait/ (professional angle), image `/img/israel-joffe-portrait-2020.jpg`
- https://israeljoffe.org/israel-joffe-photo-2020/ (personal/service angle), image `/img/israel-joffe-2020.jpg`
- Each has a title, meta description, canonical, Article + ImageObject schema (creator/copyrightHolder = `https://israeljoffe.com/#person`), BreadcrumbList, and a link to the other site's page. Linked from /about/, /photos/, /publications/ (.com) or /writing/ (.org). Sitemaps include the page + image:image. IndexNow/Bing pinged (200).
- Builder: `scripts/ij-photo-article.py` (idempotent). If `pubs.py` / `gallery.py` regenerate those pages, re-run it afterwards.
- Deploys: israeljoffe-com `2306ed80`, israeljoffe-org `7017a33d`. **Rollback:** com `f4850f9b`, org `86df5bff` (Cloudflare dashboard → Pages → project → Deployments → that ID → Rollback). Pre-change copies: `~/agent-tools/bak-ij-{com,org}-20261014`. Detail: `HANDOFF-israeljoffe-photo-article-2026-10-14.md`.
- Substack: post `israeljoffe.substack.com/p/random-israel-joffe` updated in place (no email option shown). All 4 images have alt text "Israel Joffe"; both Facebook screenshots have the caption "Israel Joffe".

Next steps:
1. **Google Search Console (needs Iz's signed-in Google account; the box browser's account has no properties):** resubmit sitemap.xml for israeljoffe.com and israeljoffe.org; request indexing for both article URLs.
2. **mondaynightwrestling.com:** apply the same treatment to the copy at `/p/israel-joffe` (alt text + caption "Israel Joffe", link to israeljoffe.com/israel-joffe-portrait/). Not done yet; waiting for Iz's go.
3. Optional: link both articles from LinkedIn/X profiles.
4. Open questions for Iz (bio accuracy): FDA tenure (site says both 4 and 6 years); BJJ black belt lineage (Johnny Rodz vs Matt Serra differ between sites).

---

## 2. 4-site SEO plan (scooter.exchange, wuwonline.com, marketpicks.ai, fashionistas.ai)

Requested by Iz via PlaceBets Bot on 2026-10-14. Nothing ships without Iz's "ship it".

Priority list:
1. **scooter.exchange** — DONE 10-15 (see §3): `/history-of-scooters` canonical bug (pointed at homepage: 653 impressions / 1 click); `/map` retitled for "bike share near me" (2,833 impressions / 0 clicks) + FAQ; internal links to the SYM vs Kymco post (the top click earner).
2. **wuwonline.com** — DONE 10-15: `/johnny-rodz/` (3 H1s, messy snippet, 872 impressions / 1 click). Homepage untouched (hard rule).
3. **marketpicks.ai** — TODO: the commodity page template calls futures "stocks" (e.g. CL crude oil). Fix the template so every commodity page uses the right wording. See `HANDOFF-marketpicks-2026-10-14.md` for the deploy recipe.
4. **fashionistas.ai** — TODO: needs content + authority more than fixes. Biggest lever: a free "what's my item worth?" resale checker page.

Link-earning assets (later, real data only — no invented numbers):
- scooter.exchange: embeddable bike-share widget + public US fleet index with CSV download.
- wuwonline.com: Johnny Rodz trainee tree embed for wrestling sites.
Other scooter TODO: the `/map` hero still says "1,275 shared-micromobility fleets across 200+ cities" — unverified, re-check against the feed list or soften.

---

## 3. Shipped 2026-10-15 ~06:50 ET (production)

### scooter.exchange — project `scooters-exchange` (ihatecollege account)
- Source: `~/Documents/Default Project/scooters-exchange/apps/web` (Next 14 `output: 'export'` → `out/`; copy `.vercel/output/static/_headers` into `out/` before deploying).
- Local commit `bea3917` (not pushed): 6 files.
  - `/history-of-scooters`: self-canonical + BlogPosting JSON-LD.
  - `/map`: title "Bike Share & Scooter Rentals Near You – Live Map" (absolute), new meta/og description; H2 "City bike share & scooter rentals near you", intro, 4-question FAQ (`<details>`) + FAQPage JSON-LD. Operators named only where confirmed in the live feed (`api.scooter.exchange/api/gbfs/nearby`): Citi Bike, Divvy, Capital Bikeshare, Metro Bike Share, Lime, Bird.
  - SYM vs Kymco links: "Most read" card on `/blog`; link at the end of `/best-scooters-under-3000`; "Popular:" link at the bottom of every other blog post.
- Production deploy `9c68e77e`. Previous production: `c4d1ad69` (rollback target).
- Verified live: all 200; canonical, title, BlogPosting, FAQPage, Most read card; `/contact` unchanged (normalized markup identical to pre-deploy).

**Contact page (IMPORTANT):** the working tree has an uncommitted `apps/web/app/contact/page.tsx` change plus an untracked `ContactForm.tsx` (JS POST to `api.scooter.exchange/api/contact`, replacing the FormSubmit form). **That version is what live production already serves**, while the committed version (FormSubmit to a personal Gmail, which §20 of handoff.md forbids) does not match live. So the deploy was built WITH the uncommitted version to keep /contact unchanged. It is still uncommitted and was left out of `bea3917`. Saved copies: `/tmp/contact-page-uncommitted.tsx` (+ `.diff`), durable copies in `~/agent-tools/bak-seo-20261015/`. Whoever owns it should commit it (with ContactForm.tsx); do not "restore" the committed version.

Prod deploy:
```
cd ~/Documents/"Default Project"/scooters-exchange/apps/web && npx next build && cp .vercel/output/static/_headers out/_headers && set -a && . ~/.secrets/cloudflare.env && set +a && CLOUDFLARE_API_TOKEN="$CF_TOKEN_IHATECOLLEGE" CLOUDFLARE_ACCOUNT_ID="$IHC_ACCOUNT_ID" wrangler pages deploy out --project-name=scooters-exchange --branch=main --commit-dirty=true
```
Rollback: Cloudflare dashboard → Pages → scooters-exchange → Deployments → `c4d1ad69` → Rollback. Wrangler-only alternative: `git revert bea3917`, rebuild, run the deploy command above.

### wuwonline.com — project `wuwonline-com` (Nexus account)
- Source: `~/Documents/Default Project/wuwonline-com` (static; deploy the folder). **Patched `johnny-rodz/index.html` directly.** A full `build.py` run drops live post-processed sections (MNW "Johnny Rodz in print", backlinks nav), churns ~30 pages and changes the homepage. Don't redeploy a full rebuild without diffing.
- Local commit `89d467a` (not pushed): `johnny-rodz/index.html` + the matching `render_rodz()` change in `build.py`. Other older uncommitted build.py/sitemap changes were left alone.
  - Single H1 (two archive H1s → H2). Title "Johnny Rodz – WWE Hall of Famer & Wrestling Trainer | WUW Brooklyn". New meta/og/twitter description (no stray space). Standalone Person JSON-LD with award "WWE Hall of Fame (Class of 1996)" and sameAs WWE.com bio + twitter.com/Rodzjohnny (both already linked on the site).
- Production deploy `8846cf38`. Previous production: `f8cc3475` (rollback target).
- Verified live: 200, 1 H1, title, description, Person schema; homepage unchanged apart from Cloudflare email masking, which differs on every request. Note: the live domain served the old page for ~1 minute after deploy (propagation).

Prod deploy:
```
cd ~/Documents/"Default Project"/wuwonline-com && set -a && . ../nexus-ai-suite/.secrets/cf.env && set +a && CLOUDFLARE_API_TOKEN="$CF_API_TOKEN" CLOUDFLARE_ACCOUNT_ID="$CF_ACCOUNT_ID" wrangler pages deploy . --project-name=wuwonline-com --branch=main --commit-dirty=true
```
Rollback: dashboard → wuwonline-com → `f8cc3475` → Rollback, or redeploy the pre-change tree: `wrangler pages deploy ~/agent-tools/bak-seo-20261015/wuwonline-com-preseo --project-name=wuwonline-com --branch=main --commit-dirty=true` (same env as above).

### Previews (left up)
- https://seo-preview.scooters-exchange.pages.dev, https://seo-preview.wuwonline-com.pages.dev
- Android 412x915 screenshots: box `/workspace/seo-preview/` (map-412x915.png, map-faq-412.png, johnny-rodz-412x915.png, full-page variants).

### IndexNow
Key `f096cd903fa35672ba1a716d8871bb6e` (served at /<key>.txt on both hosts). Pinged `api.indexnow.org` → 200 for scooter.exchange `/history-of-scooters`, `/map`, `/blog`, `/best-scooters-under-3000`, the SYM post, and wuwonline.com `/johnny-rodz/`. Google still needs a Search Console sitemap resubmit (Iz's account).

### Backups
`~/agent-tools/bak-seo-20261015/` on the laptop: `wuwonline-com-preseo/`, `scooters-web-app-preseo/`, the contact page files.

---

## 4. marketpicks.ai + fashionistas.ai SEO fixes — 2026-10-15 ~07:30 ET (PREVIEW ONLY, needs Iz "ship it")

Rules followed: wrangler only, preview branches only, nothing pushed, no secrets printed, no invented data, no paywalls. Both changes live in **separate git worktrees branched from the exact production commits**, so other bots' newer unshipped work is NOT in these builds.

### marketpicks.ai — preview https://seo-preview.marketpicks-ai.pages.dev (deployment `1d0b964e`)
- Worktree `~/mp-seo`, local branch `seo-preview-2026-10-15` = production commit `40c1fe5` + `72c874d` + `f187af9` (not pushed). The main tree `~/Documents/Default Project/marketpicks-ai` (branch wip/local-2026-10-14) was NOT touched; another bot committed `707b59f`/`e5874d3` there at 06:52–06:54 ET (Senate relay + bot session awareness, unshipped). Whoever ships next must merge/cherry-pick `72c874d`+`f187af9` into that branch, or the next build from it drops these SEO fixes.
- What changed (diff: laptop `~/agent-tools/bak-seo-20261015/marketpicks-seo.diff`; pre-change copies in `~/agent-tools/bak-seo-20261015/marketpicks-pre/`):
  1. `lib/instruments.ts` (new): names/exchange/feed for 21 futures (energy, metals, ags, cattle, E-mini index) + 12 coins, taken from the symbols `lib/finance-api.ts` already quotes. ZS left out on purpose (/stock/ZS resolves to Zscaler in the D1 quote feed). MATIC labelled but unlisted (MATIC-USD feed is stale after the POL migration).
  2. `/stock/[ticker]`: titles now `WTI Crude Oil (CL) Futures Price Outlook & AI Signal`, `Bitcoin (BTC) Price Outlook & AI Signal`, `Apple Inc. (AAPL) Stock Price Outlook & AI Signal`, ETFs/indexes get ETF/Index. Descriptive H1 (big ticker + "WTI Crude Oil futures price outlook"), matching meta. FAQPage JSON-LD + visible FAQ built only from live signal fields (rating, ensemble votes, price, % change, momentum, trend, volatility, updatedAt in ET) plus the contract/feed from the map. BreadcrumbList + breadcrumb to the hub on futures/crypto.
  3. Wrong-data fix found during the audit: futures/crypto pages showed key stats, insider trades, earnings and headlines for the same-letter STOCK (CL page showed Colgate/Charter headlines + Colgate stats; SI = Quantum-Si, NG = Novagold, ES = Eversource). Those cards are hidden for instruments, and headlines must name the instrument.
  4. Headlines (item 2 of the brief): capped at 5, wrapped in `data-nosnippet`, attribution line ("Headline titles only, from the publisher named on each card…"), outbound links `rel="noreferrer nofollow"`. No Reuters text was found on any live page checked (/, /stock/*, /why-is, /world-markets, /trending, /futures…); the Reuters RSS feed only lands in D1 news_items.
  5. New hubs `/commodities` and `/crypto` (CollectionPage + ItemList JSON-LD, links only, no prices), footer links, sitemap adds both hubs + 26 instrument pages (BTC, ETH, SOL, DOGE, ADA, XRP were already in it).
- Verified on preview: all 32 listed instrument pages (and MATIC) 200 with a real price matching Yahoo (spot-checked CT, ATOM, LINK, DOT, LTC, AVAX); /, /stock/AAPL, /stock/SPY, /stock/GLD, /stock/ZS, /commodities, /crypto 200 with the right titles and schema; homepage + congress CTA unchanged. Pre-existing (also on live prod, not from this change): React hydration errors #425/#422 on the homepage; "Updated 10:01 AM" eyebrow on /stock pages is UTC, not ET.
- **Production (only after Iz says ship it)** — ships the exact preview build:
  `cd ~/mp-seo && set -a && . ~/Documents/"Default Project"/nexus-ai-suite/.secrets/cf.env && set +a && CLOUDFLARE_API_TOKEN="$CF_API_TOKEN" CLOUDFLARE_ACCOUNT_ID="$CF_ACCOUNT_ID" npx wrangler pages deploy .vercel/output/static --project-name=marketpicks-ai --branch=main --commit-dirty=true` (run detached: `setsid nohup … &`). Then IndexNow ping for /commodities, /crypto and the instrument URLs.
- **Rollback:** current production `99118312` (commit 40c1fe5) → dashboard → marketpicks-ai → Deployments → 99118312 → Rollback.
- Rebuild preview: `bash ~/agent-tools/mpseo-build.sh` (defaults to branch seo-preview; ~4 min).

### fashionistas.ai — preview https://seo-preview.fashionistas-ai.pages.dev (deployment `e640d8e1`, version.txt `3ba7f38`)
- Worktree `~/fa-seo-preview`, branch `seo-preview` = production commit `89bf396` + `3ba7f38` (index.html only; not pushed). Based on 89bf396 rather than main because main's docs commits would publish `/OPENCODE-START-HERE.md` (an earlier preview, `2244b1ef`, did; that deployment still exists).
- Change: homepage `<title>` "AI Resale Listing Tool – Sell Clothes on Poshmark, eBay & Depop | fashionistas.ai"; meta "Free AI resale listing tool: snap a photo of your clothes, get the title, price and details, then copy the listing to Poshmark, eBay, Depop and more."; matching og/twitter. Organization (@id #organization) + SoftwareApplication (@id #app, price 0, featureList, no ratings/reviews). FAQPage left as is. Marketplace claims checked against `functions/_lib/shops.js`: Poshmark and Depop are "guided" (copy/extension autofill, seller presses Post), eBay is API-when-keys (keys not set), so the copy says "copy the listing to", not "posts to".
- Verified: npm test 459/459, 200, title/meta/schema present, no JS errors, no overflow at 412x915; visually unchanged.
- Note: the `rebuild` preview branch (OpenCode/CoS, awaiting ship-it) has its own homepage head ("Shop & Sell Secondhand Fashion"). If rebuild ships, port this head into it or this change is lost. Title is 81 chars; Google will truncate after ~60.
- **Production (only after Iz says ship it):** `cd ~/fa-seo-preview && DEPLOY_ENV_FILE=$HOME/fashionistas-ai/.env.deploy ALLOW_BRANCH=seo-preview bash scripts/deploy-local.sh` (runs tests, deploys to main, verifies version.txt = 3ba7f38). Then merge `seo-preview` into `main` locally.
- **Rollback:** current production `47a70a52` (89bf396).

### Screenshots (Android 412x915, box `/workspace/seo-preview/`)
mp-CL-412x915.png, mp-CL-headlines-412x915.png, mp-CL-faq-412x915.png, mp-AAPL-412x915.png, mp-AAPL-faq-412x915.png, mp-SPY-412x915.png, mp-BTC-412x915.png, mp-commodities-412x915.png, mp-crypto-412x915.png, mp-footer-412x915.png, mp-home-412x915.png, fash-home-412x915.png.

### Update 2026-10-15 ~11:45 ET: "ship it if no conflicts" (Iz). NOTHING SHIPPED, conflict rule applied
- **marketpicks.ai: not deployed.** Production moved after I branched. It is now `9653b143` (commit `eca57ef`, another bot; before that `3f92f1a4`/adc58e2), not `99118312`. Deploying the `~/mp-seo` build (based on 40c1fe5) would roll back their shipped grading/receipts work.
  - The cherry-pick IS done with no conflicts. I tested `72c874d` + `f187af9` in a scratch worktree on top of `31ed20f`: clean apply, no tsc errors in the touched files. Then I fast-forwarded the main tree's branch `wip/local-2026-10-14`, which is now `…31ed20f → 215026b → 923676b` (local only, not pushed, nothing deployed). The other bot's working-tree files (tsconfig.tsbuildinfo, _t2.mjs, __pycache__) were untouched.
  - **Heads-up for the marketpicks owner:** the next build from that branch carries these SEO fixes AND their unshipped "home v2" (31ed20f, PREVIEW ONLY) plus the worker commits. Preview it, re-check /stock/CL, /commodities and /crypto, then ship together with Iz's OK. Rollback target = whatever production is at that time (currently 9653b143).
- **fashionistas.ai: not deployed.** A new production deployment appeared: `5bb9f845` (ad_hoc, commit `e239702`, the Sept 19 "Fashionistas.ai - AR Try-On… $29 Pro Seller" landing page), created 2026-10-15 10:32 AM ET. It is not mine, and I couldn't find its source. The project's canonical (served) deployment is still `47a70a52` (89bf396): fashionistas.ai/version.txt = 89bf396 and the live title is unchanged. So the latest production upload no longer matches what is served. Treated as "production changed": stop and report. Someone should find out who uploaded 5bb9f845, and make sure nobody promotes it (it has the old paid-plan copy).
  - Ready to ship once cleared: `~/fa-seo-preview`, branch `seo-preview` = main `5a56b5a` + `90bb9e6` (rebased onto main so it carries the new deploy gate). Production must go through the gate: `cd ~/fa-seo-preview && cp ~/fashionistas-ai/.env.deploy . && ALLOW_BRANCH=seo-preview bash scripts/deploy-safe.sh`, then `rm .env.deploy` and merge seo-preview into main. Note: main now includes `OPENCODE-START-HERE.md` at the repo root, and deploy-local's rsync publishes it at /OPENCODE-START-HERE.md (internal brief, no secrets). Consider adding it to the rsync excludes.
  - **The `rebuild` branch (OpenCode/CoS) needs the new homepage head ported in** (title "AI Resale Listing Tool – Sell Clothes on Poshmark, eBay & Depop | fashionistas.ai", the meta/og/twitter descriptions, and the Organization + SoftwareApplication JSON-LD from `90bb9e6`). Its own head ("Shop & Sell Secondhand Fashion") would otherwise replace it when rebuild ships.
- IndexNow: not pinged (nothing shipped).
