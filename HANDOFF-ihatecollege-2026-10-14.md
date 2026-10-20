# HANDOFF — ihatecollege.com — 2026-10-14 (updated 2026-10-15 6:50 AM ET)

> **SUPERSEDED 2026-10-20** by `HANDOFF-ihatecollege-2026-10-20.md`.
> Since this file was written: Supabase is gone (both refs NXDOMAIN); D1
> backs jobs, ratings, leads and cron; college pages are fully static;
> news is a KV aggregate; the job board is fed by keyless public APIs; and
> `main` is no longer auto-deployed by the GitHub Action (it is
> `disabled_manually`).

Owner: IHateCollege Bot (sole owner of this site). No secrets in this file.

## What's live (verified 2026-10-14 ~1:14 PM ET)
- https://ihatecollege.com returns HTTP 200; `/api/health` returns `{"ok":true,"site":"ihatecollege"}`.
- College search (`/api/search-colleges?q=...`) serves College Scorecard fields (cost, tuition in/out, debt, earnings, admit/grad rate).
- Chatbot (`/api/chatbot`, `components/AiProfessor.js`) labels salary/tuition estimates and prefers Scorecard/site facts (PRs #3, #4).
- Lean D1: `leads` is upserted by email (unique index), fields capped, 5,000-row cap, 365-day prune. `/api/cron/cleanup-d1` cleans up and skips junk tables. Last check had a small `leads_age_error`, which is still open.
- Pages `_headers` CDN caching (commit `ddc2577`).

## Current commit (as of 2026-10-15 6:50 AM ET)
- `placebetsai/Ihatecollege` main @ `353f9d6` (mobile/data sweep). Homepage 200.
- Oct 14 ships, in order: `48400f3` ROI calculator (`/roi-calculator`, grad rate <50% = Risky), `c062b92` freshness overhaul, `39b390e` chatbot wording, `353f9d6` mobile/data sweep. All deployed by the Action with success.
- Pre-Oct-14 baseline for rollback comparisons: `4b54203`.

## Repo / paths
- GitHub: https://github.com/placebetsai/Ihatecollege
- Box checkout: `/workspace/tnr/Ihatecollege`
- Data: `data/colleges.json` (College Scorecard, June 2026 release, rebuilt via `scripts/import-scorecard-csv.js`; `scripts/fetch-colleges.js` needs `COLLEGE_SCORECARD_API_KEY` and skips without it). Campus politics: FIRE 2027 rankings via `scripts/fetch-fire-rankings.py` + `scripts/link-politics-to-scorecard.js`.

## Deploy
- Automatic: a push to `main` runs the GitHub Action `.github/workflows/deploy-cf-pages.yml`, which runs `npx @cloudflare/next-on-pages@1`, then `npx wrangler@3 pages deploy .vercel/output/static --project-name=ihatecollege --branch=main`.
- Cloudflare account: Ihatecollege79 (`90904956101bde8c4ca51cdaa5bee1ab`), Pages project `ihatecollege`, D1 `ihatecollege-leads`.
- Token: repo secret `CF_API_TOKEN_IHATECOLLEGE`. Locally it's `CF_TOKEN_IHATECOLLEGE` in the laptop's `~/.secrets/cloudflare.env`. NEVER use the PlaceBets/MarketPicks tokens, which are a different account.
- Manual: `npm ci && npx @cloudflare/next-on-pages@1 && CLOUDFLARE_ACCOUNT_ID=9090...ab CLOUDFLARE_API_TOKEN=<IHC token> npx wrangler@3 pages deploy .vercel/output/static --project-name=ihatecollege --branch=main`

## Rollback
- Cloudflare dashboard: Pages > ihatecollege > Deployments, then pick the previous production deploy and choose "Rollback".
- Or `git revert <sha> && git push` on main, which redeploys through the Action.

## Rules
- Never invent tuition, salary, or debt numbers. Use Scorecard/site data, and label every estimate as an estimate.
- Keep D1 lean. Only `leads` writes there; chat, news, and ratings go to Supabase or in-memory.
- Cloudflare Pages only (no Vercel). Touch only ihatecollege projects, because the account keys are shared.
- Don't touch `pages/israel-joffe.js` or `public/sitemap.xml` unless Iz asks.
- UI/mobile changes go to a preview with self-reviewed Android screenshots, and wait for Iz's "ship it" before production.

## In progress
- Nothing mid-flight. No open branches awaiting merge.

## Next steps (priority)
1. Blog pipeline: Railway generator has not posted since Oct 7. Either fix Railway or activate `ops/daily-content.yml` (needs Iz's approval + a token with `workflow` scope).
2. Thin content: 126 template blog posts + ~14 near-duplicate `-2026` post pairs. Recommend noindex/regenerate (needs Iz's OK).
3. Hide Google's "Check Loan Rates" auto-ad bar while chat is open (find real selector) or have Iz disable that auto-ad format.
4. Side-by-side compare of up to 4 schools.
5. Fix `leads_age_error` in `/api/cron/cleanup-d1`.
6. Remove the stale Vercel GitHub check (fails on every push; harmless).

## Blockers / needs from Iz
- AdSense: check Reports for the date impressions dropped, and Ads > By site > ihatecollege.com auto-ads settings (see AdSense section below).
- Approve or reject daily auto-posting; grant `workflow` scope if approved.
- The IHC Cloudflare token is only on the laptop, not on the box, so there are no Cloudflare preview deploys from the box (previews are local `next start` + screenshots). CI deploys work without it.

## Freshness overhaul — shipped Oct 14 2026 (~4:30–4:45 PM ET)
- Merged `feat/freshness-overhaul-2026-10-14` into Ihatecollege `main` as a fast-forward → `c062b92`. Deploy run 38632189085: success.
- Follow-up `39b390e` (chatbot prompt wording: "median debt at graduation" is undergraduate debt; the 3-yr repayment rate means "paying down principal", not paid off; no conclusions beyond what FIRE reports). Deploy run 38632825720: success.
- What changed: Scorecard data now from the June 2026 bulk CSV (`scripts/import-scorecard-csv.js`), repaymentRate filled in, Carnegie R1/R2 mapping fixed, data year shown on pages; `-2025` pages became `-2026` with BLS/NY Fed/FSA citations, and the old slugs 308-redirect; the homepage hero CTA is now "Where does your campus stand?", backed by FIRE data (261 campuses, `/liberal-vs-conservative`, `/campus/[slug]`); the blog index lists newest first and the title-truncation bug is fixed (template posts are still indexed, per Iz); the chatbot is grounded in Scorecard + FIRE, cites sources, falls back to OpenRouter, and gives a deterministic answer if the AI call fails.
- Live checks passed: / 200 with the CTA; /liberal-vs-conservative 200; /campus/university-of-california-berkeley 200; /roi-calculator 200; /is-college-worth-it-2025 and /trade-school-vs-college-salary-2025 → 308 to -2026; /college/ucla → 308 to /college/university-of-california-los-angeles; /blog newest = Oct 14 2026; /api/search-colleges?q=UCLA repaymentRate "79%".
- Chatbot API body: POST /api/chatbot `{"query": "...", "history": []}`.
- Screenshots: /workspace/ihc-live-shots/ (box).
- Open: a "Check Loan Rates" floating bar covers chatbot suggestion chips on mobile; check whether it should hide while the chat is open.

## Mobile/data sweep — shipped Oct 14 2026 (~5:35 PM ET)
- Merged `fix/mobile-data-sweep-2026-10-14` into Ihatecollege `main` as a fast-forward → `353f9d6`. Deploy run 38640944614: success.
- What changed: replaced 5 dead Unsplash images (85+ blog posts plus the job board); AdUnit now loads AdSense on edge-rendered `/college/[slug]` pages, which skip `_document`; added CSS to hide AdSense anchor ins while the chat is open; concrete-finisher post now uses BLS May 2025 figures (median $57,020, P10 $39,190, P90 $85,480) with a 2026 title; the sitemap generator adds the 261 `/campus/*` pages and drops the literal `[slug]`.
- Live checks passed: 10 sample posts and the job board have 0 broken images; `/college/harvard-university` loads adsbygoogle.js exactly once; concrete-finisher shows the new title and figures; `/blog` has no 2024 headings; sitemap-static has 261 campus URLs and 0 `[slug]` entries.
- Still open: Google's auto-ad "Check Loan Rates" bar sometimes still covers the chat suggestion chips on mobile (seen live). It doesn't match the anchor CSS selector, and it shows up only intermittently. Next step: turn off anchor / search-style auto-ad formats in the AdSense UI, or find the bar's real selector when it appears.
- Pending, NOT approved: the daily blog workflow is parked at `ops/daily-content.yml` (Groq, 3 posts/day, push to main, then dispatch the deploy). It's inactive because the token lacks the `workflow` scope and the user hasn't approved it. The Railway generator has posted nothing since Oct 7.

## AdSense investigation — Oct 14 2026 (~8:30 PM ET)
- Iz reports no ads showing although ads showed before. AdSense dashboard (Iz's screenshots, 9:52 PM): ihatecollege.com = **Ready**, ads.txt found with the publisher ID.
- Regression check vs baseline `4b54203`: no code change broke ads. Only ad-related diffs: `components/AdUnit.js` loads the AdSense script if missing (only matters on edge `/college/[slug]` pages, which previously never loaded AdSense) and `styles/globals.css` hides anchor/side-rail ins only while chat is open. No changes to `_app.js`, `_document.js`, `SEO.js`, `Layout.js`, `ads.txt`, or `_headers`; no CSP header live.
- Headless test: live made ad requests on all tested pages, 1 filled slot; baseline 0 filled. No push() errors. Most slots unfilled / unfill-optimized (Google-side decision; datacenter IPs get little fill).
- `/ads.txt`: `google.com, pub-7215975042937417, DIRECT, f08c47fec0942fa0`.
- Conclusion: cause is account-side (auto-ads settings, serving limits, demand) or client-side (ad blocker). Waiting on Iz for the impressions-drop date to correlate with site changes.

## Oct 15 2026 health fixes (7–7:30 AM ET)
- **/college 500s.** Cause: `getServerSideProps` returning `notFound: true` on the edge-runtime college page becomes an HTTP 500 on Cloudflare Pages (next-on-pages). Any slug not in the data 500'd, including the 240 slugs dropped by the Oct 14 Scorecard rebuild (77 renamed and 163 closed), plus legacy short slugs. All 6,125 sitemap URLs were returning 200.
  - Fix in `bf61072`: `middleware.js` checks against a slug allow-list (`data/college-slugs.json`, generated by `scripts/build-college-facts.js`) and returns a real 404 using the static 404 page with noindex; 77 renamed slugs now 308 via `data/college-slug-renames.json` in next.config; malformed URL escapes no longer crash.
  - Live: 200 of 200 sampled URLs return 200, unknown slugs return 404, renamed slugs 308.
- **/api/civil-service-data `[]`.** `USAJOBS_API_KEY` (and the `USAJOBS_EMAIL` that USAJOBS requires as the User-Agent) aren't set anywhere; they're not GitHub secrets, and Cloudflare Pages env presumably doesn't have them either. The route now sends `X-Data-Status: missing-key | upstream-<code> | ok`.
  - To get real data: register at developer.usajobs.gov, then add both values as Cloudflare Pages env vars.
  - The UI empty-state fix is on branch `ui/civil-service-empty-state-2026-10-15`, awaiting ship-it.
- **Chatbot campus disambiguation** (`bf61072`, plus `959bb72` for truncated replies): multi-campus systems pick the single R1 campus or a clearly largest one (Penn State → Main Campus, Rutgers → New Brunswick); systems with several R1s (UC) get a "which campus?" list; answers name the campus and say the figures are institution-wide; other campuses appear as suggestion chips; "cal state X" now maps to CSU. The `max_tokens` 400 limit was truncating gpt-oss replies; it's now 1200 with low reasoning, and the bot skips any reply that finishes on the length limit.
- **Caching.** `/college/*` gets Cache-Control set via middleware (next.config headers don't apply to edge responses on Pages); `/campus/*` gets it via `public/_headers`. Cloudflare still reports `cf-cache-status: DYNAMIC` for Function responses, so real edge caching needs a Cache Rule. That, and WAF rate limiting, require the IHC Cloudflare token or dashboard (Iz).
- **HeadlessChrome traffic.** Most likely our own Oct 14 testing from the box (egress 104.28.246.223): roughly 300 Playwright page loads at about 52 same-origin requests each, enough to account for ~9,966 requests.

## Deploy gate — Oct 15 2026 (~7:25 AM ET)
- NEW HARD RULE: production deploys ONLY via `bash scripts/deploy-safe.sh` (added in Ihatecollege main `e8b41c7`): build, then preview, then smoke, then prod, then smoke, with rollback on failure.
- Per the farm-wide rule (Wrangler only, never GitHub Actions), the GitHub Action "Deploy to Cloudflare Pages" (workflow id 273779478) is now **disabled** (`gh workflow disable`). Pushes to main no longer deploy. The YAML file still exists; it wasn't deleted, because the box token lacks the `workflow` scope. Re-enable with `gh workflow enable 273779478 -R placebetsai/Ihatecollege` if ever needed.
- Consequence: deploys now need the IHC Cloudflare token (Ihatecollege79). `deploy-safe.sh` reads it from the laptop's `nexus-ai-suite/.secrets/cf.env` (`IHC_API_TOKEN`). The box has no IHC token, so the box can't deploy until one is provided.
- Not done: Groq/OpenRouter keys for the Pages **preview** env. The values exist only as GitHub secrets (unreadable) and in prod Pages env, and setting them needs the IHC token. On the laptop: `wrangler pages secret put GROQ_API_KEY --project-name=ihatecollege --env preview` (same for OPENROUTER_API_KEY).
