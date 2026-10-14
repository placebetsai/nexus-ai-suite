# MarketPicks handoff — 2026-10-14 (work from 2026-10-13)

## Why congress looked stale
- Not an ingest failure. The feed is the official House Clerk + Senate eFD filings and was current (newest House filing 2026-10-12, newest Senate filing 2026-10-01; 4,950 trades / 101 members).
- Cause: the cards and the /politician-tracker were sorted and labeled by TRADE date. STOCK Act filings can arrive up to 45 days after the trade, so trades filed yesterday looked weeks old.
- Fix: cards read "filed <ago> · traded <date>", the tracker sorts by filing date, and the homepage congress section shows "Last updated <age> · newest filing <date>".

## Real ingest setup
- Runs on the laptop, not Cloudflare cron: systemd user timer `marketpicks-congress.timer` (about every 2h) runs `scripts/congress/official_congress.py`.
- Sources: House Clerk PTR index + PDFs (disclosures-clerk.house.gov) and Senate eFD (efdsearch.senate.gov). Cache: ~/.cache/marketpicks-congress (history.json, seen.json).
- Publishes https://marketpicks-data.pages.dev/congress.json, and the site reads that first. Loader order (lib/politician-trades-loader.ts): that published file, then D1, then the Worker API, then the Bargo free API as last fallback.
- The House parsing fix shipped: one space is enough before the trade type, so long asset names no longer drop rows; trade ids are keyed per filing and trade, and duplicates are removed.
- Other laptop timers: marketpicks-insiders, marketpicks-screener.

## Prediction bot
- Root cause: the Pages project has no LLM secrets (no Groq or OpenRouter), so only the Workers AI binding answers. It had a 2.5s race, so almost every reply fell to the canned "SOFT mild bid … tape-only" template. Production measured 5 real answers out of 25.
- Fixes (app/api/chatbot/route.ts):
  - REQUEST_BUDGET_MS 7000→11000; WORKERS_AI_MS 2500→6500.
  - The answer wait is sized to Workers AI when there is no Groq key.
  - First usable model wins (llama-3.3-70b-fp8-fast and llama-3.1-8b-instruct-fast run in parallel).
  - The persona must state the live price first and give no confidence/probability numbers that aren't in the data.
  - sanitizeAnswer strips "CONFIDENCE: NN%".
- Preview result: 20 real answers out of 25, average about 1.6s, 0 made-up confidence figures. SPY still gets the canned market_outlook template on every run.

## Floating Ask button
- components/FloatingChatbot.tsx: on phones it stays hidden until the reader scrolls past the first screen, and it is smaller. It no longer covers the homepage hero CTA. Desktop is unchanged.

## Shipped
- Congress filing-date sort and labels, the Last updated line, the House parsing fix, receipts/track-record page titles, sitemap additions (receipts, track-record, why-it-moved, insider, insider-signals, markets, world, team, ask; no contact), digest/welcome scripts no longer fall back to a hardcoded Gmail, the floating Ask fix, and the chatbot fixes.
- Deploys (wrangler from the laptop, CF_API_TOKEN):
  - Preview `preview-fresh-data`: https://f79add12.marketpicks-ai.pages.dev (Oct 14, 7:01 AM ET)
  - PRODUCTION `main`: https://48037c7c.marketpicks-ai.pages.dev (Oct 14, ~7:02 AM ET), live on marketpicks.ai
- Live checks Oct 14 ~7:05 AM ET:
  - /, /insider, /politician-tracker, /ask and /stock/NVDA all return 200; /api/contact returns 404, so it was excluded as intended.
  - The homepage shows "Last updated … · newest filing 2026-10-12" and the cards show "filed …" labels.
  - NVDA bot: market_quote+llm on 2 of 2 tries, with the live price $228.52, and no "CONFIDENCE: NN%".
  - Screenshot: box /workspace/marketpicks-preview-shots/live-home.png. The daily-digest popup that covers the hero was already there before this deploy.

## Excluded (parked, not deleted)
- Contact form rewrite (`app/contact/ContactForm.tsx`, `app/api/contact`) and the matching privacy text. Files are in laptop /tmp/mp-excluded/ (note: /tmp may be cleared on reboot; copy them somewhere permanent if wanted). Production keeps the older /contact page.
  - CONTACT_EMAIL is not set, so messages would only sit in the D1 table site_contacts and nobody would be emailed.
  - No rate limit, so it is a spam/D1-write vector.
  - migrations/0012_site_contacts.sql is untracked. The table exists and holds one test row ("ShipReview Test", test@example.com).
- The `vercel` devDependency was reverted. Side effect: next-on-pages now fetches vercel via npx. A broken npx cache (~/.npm/_npx/69f9afb961c37556) caused an ENOTEMPTY build failure; clearing that cache dir fixed it.

## Build workaround (important)
- With the `vercel` devDependency removed, next-on-pages runs `npx vercel build`, and the npx cache (~/.npm/_npx/69f9afb961c37556) kept hanging or failing with ENOTEMPTY.
- Workaround (package.json untouched): vercel@47.0.4 is installed in ~/.cache/vercel-cli, symlinked as node_modules/vercel and as node_modules/.bin/vercel (pointing to ../vercel/dist/vc.js). `npm install` or `npm ci` removes these links; re-create them before `npm run pages:build`, or decide to re-add vercel as a devDependency.
- Deploys run from the remote session got cut off (ECONNRESET on the final deployments POST) while the laptop network was weak. Run them detached: `setsid nohup bash /tmp/mpdeploy.sh main > ~/mpdeploy-main.log 2>&1 &` (/tmp/mpdeploy.sh loads cf.env and runs wrangler pages deploy for the given branch).
- Right after a deploy, a page can return 404 for about a minute (seen on /insider and /ask on the preview). Re-check before judging.

## Ingest outage overnight
- marketpicks-congress.service failed at 02:31, 04:32 and 06:41 ET on Oct 14 (exit-code or timeout, during the network trouble). The site then reported source_stale (about 13h old).
- A manual run at 7:04 AM ET succeeded (5,157 published, 0 new; newest filing is still 2026-10-12).
- Worth adding: an alert when the timer fails twice in a row.

## Cloudflare tokens
- Works: CF_API_TOKEN / CF_ACCOUNT_ID (account 7eb89b01…) in ~/Documents/Default Project/nexus-ai-suite/.secrets/cf.env.
- Not this one: CS_* is a different account (2765cb27…). Its deploy fails with "D1 database not found".
- CF_API_TOKEN cannot run `wrangler d1 execute` (error 7403); it can deploy Pages.
- Pages project secrets: none set.

## Backups (laptop)
- /tmp/chatbot.route.bak (original chatbot route before the timeout change; the confidence-strip change came after it)
- /tmp/cta.bak (CongressCtaSection before the Last updated line)
- /tmp/floating.bak (FloatingChatbot before the scroll hide)
- /tmp/mp-excluded/ (contact files, privacy page, package.json and lock with vercel)

## Next fixes
1. Add GROQ_API_KEY as a Pages secret (fast, reliable bot answers).
2. Finnhub / FMP keys as backup congress sources (none configured today).
3. SPY / market_outlook canned formula: fixed "+6% to +10%" base case and "tape is red" on -0.0%. Replace it with a grounded answer.
4. Gold answer said the "congressional STOCK Act trade feed is showing a bearish lean on gold." Stop the persona attributing quote signals to the congress feed.
5. Commit the working tree (nothing is committed; no git push was done).

## Deploy steps (laptop, wrangler only, no GitHub)
```
cd ~/Documents/"Default Project"/marketpicks-ai
set -a; . ../nexus-ai-suite/.secrets/cf.env; set +a
export CLOUDFLARE_API_TOKEN="$CF_API_TOKEN" CLOUDFLARE_ACCOUNT_ID="$CF_ACCOUNT_ID"
npm run pages:build
npx wrangler pages deploy .vercel/output/static --project-name=marketpicks-ai --branch=preview-fresh-data --commit-dirty=true   # preview
npx wrangler pages deploy .vercel/output/static --project-name=marketpicks-ai --branch=main --commit-dirty=true                  # production (needs Iz's OK)
```
Rollback: promote the previous production deployment in the Cloudflare Pages dashboard, or redeploy from the backups.

---
## Oct 14 follow-up ("fix it all"): PREVIEW ONLY, nothing promoted
Preview: https://bf5fc47c.marketpicks-ai.pages.dev (alias preview-fresh-data). Cron worker version fd294df1-59ef-486e-93e5-7dd939c6f7c8, uploaded but NOT deployed (preview URL https://fd294df1-marketpicks-ai-api.fashionistas1979.workers.dev).

### 1. Congress ingest in the cloud
- The cloud fallback already existed: the cron worker `marketpicks-ai-api` (*/15) runs the Bargo ingest into D1 every 4h, and the loader serves D1 over a stale official file when D1 has newer filings. Bargo is current again (newest 2026-10-12).
- New hourly watchdog (cron/worker.ts runCongressWatchdog):
  - Reads congress.json generatedAt and its newest filing.
  - Unzips the House Clerk yearly index (2026FD.zip → XML, 421 PTRs, newest 2026-10-12; tested).
  - If the file is >6h old or the Clerk lists newer PTRs, it runs the Bargo cloud ingest immediately and upserts one cron_health row `congress_official_json` with the reason. That is one write per hour.
- PDF parsing still runs only on the laptop. Senate eFD has no cloud parser; Bargo covers the Senate in the cloud.
- UI: an amber line "Official filing feed is delayed (Nh since last fetch)…" under Last updated when the source is >6h old.

### 2. Track record
- Page views no longer write predictions. They used to: Pages /api/analyze and the worker's /api/stock and /api/analyze each logged one row per ticker per day on request.
- New cron-only log: 24 fixed tickers (indices, megacaps, crypto, gold/oil/silver), 3 per tick from 14:00 UTC, deduped per ticker per day. Cap is about 24 rows a day.
  - SHIP THE WORKER TOGETHER WITH PAGES, or logging stops.
- New /track-record and /receipts scorecard (lib/horizon-scorecard.ts, components/HorizonScorecard.tsx):
  - Directional calls scored at 1, 5 and 20 trading sessions against real Yahoo daily closes.
  - Read-only, cached in the edge Cache API for 6h. "Sample building" until 30 decided calls; calls too recent count as "waiting".
  - Calls whose logged price is >15% off the ticker's own close are excluded and counted (futures roots such as ES resolved to the wrong instrument).
- Preview numbers (Oct 14 11:26 UTC):
  - 1-day 58.2% (32 right / 23 wrong / 53 push)
  - 5-day 64.5% (49/27/14, 18 waiting)
  - 20-day 75.9% (41/13, 54 waiting)
  - Basis: 197 calls, 18 tickers, 31 excluded.
  - Caveat: the sample is small and mostly early-September batches. The 20-day average +8.5% reflects that one window.

### 3. Bot
- No fast LLM key exists (Pages project secrets: none). Workers AI (free) is what answers now.
- Needed: a free Groq key from console.groq.com. Then:
  `npx wrangler pages secret put GROQ_API_KEY --project-name=marketpicks-ai` (with CF_API_TOKEN/CF_ACCOUNT_ID exported), then redeploy.
- The persona *required* "CONFIDENCE: NN%". That rule is gone; the bot now ends with the driving number from live data, and may mention congress only when congress data is in the turn.
- The SPY/outlook formula (a fixed +6–10% band) is replaced by the ticker's own 1M/3M/1Y returns, 52-week range and a 1-sigma realized-volatility band labelled "not a forecast". The answer says flat/green/red with a ±0.05% dead zone.
- Preview tests: SPY and NVDA outlooks are grounded; gold and TSLA give no confidence % and no congress claims.

### 4. Traffic
- Plausible script is wired (data-domain marketpicks.ai). The dashboard is private; no API key on file.
- Cloudflare zone 197ce22d… exists, but neither token has Zone Analytics Read.
- No visit numbers are available. Needed: a Plausible stats API key or login, or a CF token with Account Analytics/Zone Analytics Read.

### To ship (after Iz's OK)
```
bash /tmp/mpdeploy.sh main      # Pages (run detached: setsid nohup ... &)
cd marketpicks-ai/cron && npx wrangler versions deploy fd294df1-59ef-486e-93e5-7dd939c6f7c8@100% -y
```
Backups: /tmp/chatbot.route.pre-oct14.bak, /tmp/worker.pre-oct14.bak, /tmp/analyze.pre-oct14.bak (laptop).
Before building: re-create the vercel symlinks (they had vanished again).

---
## Update 2026-10-14 ~10:00 ET: "Ship it" verified + reliability + SEO/AdSense (PREVIEW ONLY)

### Shipped to production (verified 08:05 ET)
- Pages main deploy 75cb2a60; worker marketpicks-ai-api version fd294df1 at 100%.
- Live checks passed: key pages 200, /track-record shows real graded numbers, SPY answer uses trailing returns (no +6-10%), no CONFIDENCE text, Last updated line. Screenshot: box /workspace/marketpicks-preview-shots/live-v3-home.png
- GROQ_API_KEY Pages secret set for production AND preview (value never printed).
  ROTATE THIS KEY: the same gsk_ key sits in plaintext in Spanishtvshows.com/app/api/chatbot/route.js, which is git-tracked and pushed to github.com/placebetsai/Spanishtvshows.com. It is also in scooters-exchange/packages/api/.dev.vars and ~/.config/site-blogs.env. After rotating: `wrangler pages secret put GROQ_API_KEY --project-name=marketpicks-ai` (and again with `--env preview`).

### Reliability (preview: Pages 608bda6e / alias preview-fresh-data; worker version a8452f0f uploaded, NOT deployed)
- Cloud congress ingest, no laptop needed: cron/official-ingest.ts + cron/house-ptr.ts.
  - Hourly (tick%4==1): House Clerk {year}FD.zip index + Senate eFD (agreement cookie → report search API) → congress_docs queue (INSERT OR IGNORE, batched).
  - Each 15-min tick: parse 4 House PTR PDFs in-Worker (unpdf/pdf.js text positions); hourly also 6 Senate PTR HTML pages. Batch upsert into politician_trades. Ids match official_congress.py so rows dedupe.
  - Tested on the version preview URL: index 68 House + 19 Senate PTRs (60 days), parses in 0.4-2.8 s wall. Against 39 recent PDFs the Worker parser found all 475 laptop rows except 1 (a laptop row with a garbled amount) plus 56 rows the laptop parser missed.
  - Those test runs wrote to the production D1 (normal cron-style batched upserts).
  - Site loader merges cloud D1 official rows (last 21 days, edge-cached 15 min, read-only) over the published congress.json. The watchdog counts cloud rows as fresh data, so Bargo is still the fallback if both go stale.
  - Manual trigger: GET /api/congress/official-run on the worker with Bearer INGEST_RUN_TOKEN (worker secret; local copy ~/.cache/mp-ingest-token, mode 600).
- Bot: Groq rotation gpt-oss-120b → gpt-oss-20b → llama-3.1-8b-instant (separate free quotas), then Workers AI (gemma-4-26b + llama-3.1-8b-fp8-fast). SPY/gold outlook answers are now written by the AI from the computed numbers ("market_outlook+llm"); the computed text is the fallback. 10-min per-question answer cache (Cache API). Simple in-isolate per-IP limit. The Cache-API rate counter was removed because Cache API puts don't persist on *.pages.dev.
- /api/health now has `congress` (newest filing, last fetch age, published file vs cloud ingest, cron_health rows) and `bot` (Groq + Workers AI ping, cached 10 min). No writes.

### SEO (preview)
- New pages: /congress/[member-slug] (101), /congress/ticker/[TICKER] (1,046), /congress/trade/[id] (share pages with OG image, X/Reddit/copy buttons; 1,000 newest in sitemap), /congress/today, /congress/feed.xml (RSS, 100 items), /congress/sitemap.xml (2,148 URLs). robots.txt lists both sitemaps.
- Edge-cached through scripts/edge-cache-wrapper.mjs. Tickers with no data get noindex. Old /politician/[slug] → 308 to /congress/[slug] (next.config redirects). Internal links switched to /congress/.
- Lighthouse mobile on preview: home perf 59 (TBT 1.5 s, LCP 3.4 s), member 96, ticker 91, tracker 97. SEO 100 on all four. Best-practices 79.
- IndexNow is prepared, not run: after ship, `node scripts/indexnow-ping.mjs` (INDEXNOW_KEY in .env.local; now also reads /congress/sitemap.xml). Also submit https://marketpicks.ai/congress/sitemap.xml in Search Console.

### AdSense
- ca-pub-7215975042937417 in layout + AdUnit. /ads.txt is text/plain with the right line. Script uses lazyOnload. AdUnit now reserves 280px (stops CLS). Privacy, terms, about, contact and disclaimer all return 200.
- Gaps for Iz: (1) no Google-certified consent banner (CMP), which is required for EEA/UK/CH traffic; turn on AdSense → Privacy & messaging → European regulations message. (2) Confirm the AdUnit slot ids exist in the AdSense account.

### Ship steps when Iz says go
bash /tmp/mpdeploy.sh main; cd cron && npx wrangler versions deploy <latest worker version>@100% -y; then IndexNow + Search Console.

---
## SHIPPED 2026-10-14 ~10:00 ET (reliability + SEO + AdSense fixes)
- Pages production deploy: 3481a136 (branch main). Worker marketpicks-ai-api version a8452f0f-1fb7-4802-983e-68ce04a7bbef at 100%. Laptop-free congress ingest is now live in the cron.
- Live checks: 13 key URLs return 200 (all /congress/* pages, feed.xml as RSS, sitemap.xml as XML). /politician/rick-larsen returns 308 → /congress/rick-larsen. /congress/sitemap.xml has 2,148 URLs. /api/health: operational; congress ok (newest filing 2026-10-12, last fetch 0.7h); bot ok (Groq + Workers AI). NVDA bot answer came from the AI (market_quote+llm) with the live price. ads.txt is correct.
- IndexNow ping sent: 2,291 URLs, HTTP 200.
- TODO for Iz: submit https://marketpicks.ai/congress/sitemap.xml in Google Search Console (needs his login).

## Homepage mobile performance (PREVIEW only)
- Baseline live / mobile: perf 68 (59 earlier on preview), LCP 3.3 s (79% render delay), TBT 860 ms, main thread 21 s. Cause: ~100 infinite CSS animations plus backdrop blurs repainting all the time, plus AdSense, Funding Choices and the chat widget all landing in the first seconds.
- Changes: a mobile CSS block at the end of app/globals.css (decorative animations and blur off at ≤760px; tapes still scroll). components/LazyChrome.tsx loads the chat widget, signup popup and adsbygoogle.js on first interaction or after 4 s. The static AdSense <Script> was removed from layout, and a google-adsense-account meta tag was added for verification.
- Backups: /tmp/globals.css.pre-perf.bak, /tmp/layout.tsx.pre-perf.bak
- Preview deploy: 1c189466 (alias preview-fresh-data). NOT in production.
- Lighthouse mobile, home:
  - Live marketpicks.ai with ads: perf 77-80, TBT 640-820 ms.
  - Same page with ad scripts blocked: perf 85-88, TBT 150-360 ms. So AdSense + Funding Choices cost about 8-10 points, and the lazy loader targets exactly that.
  - *.pages.dev URLs serve no ads, so they can't show that gain. Production-build URL before: 85/85. Preview after: 87/84 (LCP 2.6/2.2 s; main-thread 19.2/4.9 s before vs 8.6/7.1 s after). Within noise.
  - The real before/after has to be measured on marketpicks.ai after ship.
- Verified on preview: the ad script is absent at load and injected after a scroll. The Ask button and chat still render. No page errors.
- Screenshots: box /workspace/marketpicks-preview-shots/perf-home-after.png, perf-home-after-scrolled.png

---
## SPEED FIX SHIPPED 2026-10-14 ~10:15 ET + CURRENT STATE (read this first)

### All deploys today (Oct 14)
| What | Id | Status |
|---|---|---|
| "Fix it all" ship (track record, SPY formula, watchdog) | Pages 75cb2a60 + worker fd294df1 | superseded |
| Reliability + SEO pages + AdSense CLS fix | Pages 3481a136 + worker a8452f0f-1fb7-4802-983e-68ce04a7bbef (100%) | worker LIVE |
| Homepage speed fix | Pages 74c26c55 (branch main) | LIVE (current production) |
| Previews: 8feb5d48, fd3b0259, 608bda6e, 1c189466 (alias preview-fresh-data) | | preview only |

### Speed fix results (live marketpicks.ai, mobile Lighthouse)
- Before (live, with ads): 77 / 80, LCP 2.6 s, TBT 640-820 ms.
- After (3 runs): 85 / 76 / 86 (median 85), LCP 3.0 / 2.6 / 2.6 s, TBT 290 / 860 / 410 ms, CLS 0.058. Better on median; one noisy run. No rollback needed.
- Checks: 10 key pages return 200. The ad script is absent at load and injected after a scroll. Two ad units rendered iframes; both reported "unfilled" to the headless test browser, which is normal for datacenter or bot traffic. The Ask button opens chat.
- One console error: googleads returns HTTP 400 for slot 5079047997 ("hero"). That slot id probably doesn't exist in the AdSense account (see the Iz items below).
- Rollback, if ever needed: copy /tmp/globals.css.pre-perf.bak → app/globals.css and /tmp/layout.tsx.pre-perf.bak → app/layout.tsx, delete components/LazyChrome.tsx, rebuild (bash /tmp/mpbuildprev.sh builds and deploys preview), then bash /tmp/mpdeploy.sh main.

### Daily health routine (~2 min, no login)
1. curl -s https://marketpicks.ai/api/health → status "operational"; congress.status "ok" (last_fetch_age_hours ≤ 6, newest_filing within ~3 business days); bot.status "ok" (groq and workers_ai ok).
2. If congress is stale: check congress.cron_health rows (congress_cloud_official / congress_official_json last_error). Force a run: curl -H "Authorization: Bearer $(cat ~/.cache/mp-ingest-token)" https://marketpicks-ai-api.fashionistas1979.workers.dev/api/congress/official-run
3. Spot-check pages: /, /congress/today, /track-record, and ask the bot "Should I buy NVDA?". The source should end in "+llm" and the answer should show the live price.
4. Laptop timer (marketpicks-congress.timer) is optional now. If it runs, it still publishes congress.json; the cloud ingest covers new filings without it.

### Pending items Iz owns
1. ROTATE the Groq key. It is in plaintext in the public GitHub repo placebetsai/Spanishtvshows.com (app/api/chatbot/route.js), plus scooters-exchange/packages/api/.dev.vars and ~/.config/site-blogs.env. Then: wrangler pages secret put GROQ_API_KEY --project-name=marketpicks-ai (and again with --env preview).
2. AdSense consent message: AdSense → Privacy & messaging → European regulations (Google-certified CMP), required for EEA/UK/CH visitors.
3. Confirm the ad slot ids in components/AdUnit.tsx exist in AdSense (default 6600722153, hero 5079047997, inContent 2843751862, sidebar 9124683051, bottom 3357291048). The hero slot returns HTTP 400.
4. Submit https://marketpicks.ai/congress/sitemap.xml in Google Search Console. The IndexNow ping (2,291 URLs) was already sent.

---
## AdSense hero-slot 400: findings (2026-10-14 11:35 ET), no code change
- ihatecollege.com (read-only check, nothing changed): same publisher ca-pub-7215975042937417, same ads.txt line, a normal async adsbygoogle.js tag in the page. It uses the SAME slot ids (hero 5079047997 auto, 2843751862 auto, 3357291048 rectangle). Its <ins> tags have min-height 250px; marketpicks reserves 280px.
- Headless Pixel 7 test on both sites, from the box (datacenter) AND from the laptop (home IP): the hero slot request returns HTTP 400 and comes back "unfilled" on BOTH sites. Auto ads also come back unfilled on both.
- Conclusion: the 400 is not a marketpicks bug (client id, slot, format, ads.txt, deferred loader all match the working site; the slot is 412px wide when pushed, with no duplicate push). Google refuses or doesn't fill ad requests from automated/headless browsers. Iz's real-browser views decide whether ads fill.
- Real-world check for Iz: open both sites in a normal phone browser. AdSense → Reports by site shows impressions per domain. marketpicks.ai must be listed and "Ready" under AdSense → Sites, or ads won't serve there even though the account is approved.
- No preview made; the markup is already equivalent.

## 2026-10-14 15:45 ET — Cloudflare "exceeded free CPU 10ms" alert (account fashionistas1979)
- NOT Fashionistas. GraphQL analytics (24h): fashionistas-ai Pages (pages-worker--12510043) 0 exceededResources, p50 3ms; fashionistas-api Worker p90 2.5ms. Revenue deploy 47a70a52 is clean.
- Culprit: marketpicks-ai Pages (pages-worker--13772260): 1,955 prod + 56 preview exceededResources, p50 14ms, p90 193ms. Tail: AhrefsBot/SemrushBot crawling uncached SSR long-tail (/congress/ticker/*, /insider-trades?ticker=*) at 120-350ms CPU each.
- Fix (backend only): SEO-tool bot guard in marketpicks scripts/edge-cache-wrapper.mjs (cached copy or 503 Retry-After; Googlebot/Bing/humans unchanged). Prod 280dc36b (preview b059dbaf verified). Rollback 0cb3f854.
- Other >10ms scripts on the account (smaller): federation-watch cron p50 14ms (96/day), placebets-scheduler p50 10ms (110/day), marketpicks-ai-api p90 34ms + 76 exceptions.
- Post everywhere 13/17: likely by design — run-through drops ThredUp/RealReal/Amazon/Walmart/Whatnot (see Board notes above); not re-verified.
