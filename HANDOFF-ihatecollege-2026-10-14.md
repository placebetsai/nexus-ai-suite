# HANDOFF — ihatecollege.com — 2026-10-14

Owner: IHateCollege Bot (sole owner of this site). No secrets in this file.

## What's live (verified 2026-10-14 ~1:14 PM ET)
- https://ihatecollege.com returns HTTP 200; `/api/health` returns `{"ok":true,"site":"ihatecollege"}`.
- College search (`/api/search-colleges?q=...`) serves College Scorecard fields (cost, tuition in/out, debt, earnings, admit/grad rate).
- Chatbot (`/api/chatbot`, `components/AiProfessor.js`) labels salary/tuition estimates and prefers Scorecard/site facts (PRs #3, #4).
- Lean D1: `leads` is upserted by email (unique index), fields capped, 5,000-row cap, 365-day prune. `/api/cron/cleanup-d1` cleans up and skips junk tables. Last check had a small `leads_age_error`, which is still open.
- Pages `_headers` CDN caching (commit `ddc2577`).

## Current commit
- `placebetsai/Ihatecollege` main @ `4b54203` (2026-10-13, "link the Monday Night Wrestling articles").
- Recent: `59eb8cf` and `afb20a8` (israel-joffe SEO), `ac99703` (revoked Gemini key script fix), `2dc99c9` (escape `<` in generated JSX so `next build` passes).

## Repo / paths
- GitHub: https://github.com/placebetsai/Ihatecollege
- Box checkout: `/workspace/tnr/Ihatecollege`
- Data: `data/colleges.json` (Scorecard, refreshed by `scripts/fetch-colleges.js` in prebuild)

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
- None active. Daily content automation and the Twitter workflows keep committing to main.

## Next steps (priority)
1. ROI calculator that walks cost, then debt, then earnings, then risk in plain language, built on Scorecard fields (biggest gap vs Niche/Scorecard).
2. Side-by-side compare of up to 4 schools.
3. Chatbot grounding: pull the matched school's Scorecard row into the prompt for money questions.
4. Fix `leads_age_error` in `/api/cron/cleanup-d1`.

## Blockers / needs from Iz
- Pick the next priority (ROI calculator is recommended).
- The IHC Cloudflare token is only on the laptop, not on the box. CI deploys work without it; it's needed only for manual wrangler/D1 work.

## Freshness overhaul — shipped Oct 14 2026 (~4:30–4:45 PM ET)
- Merged `feat/freshness-overhaul-2026-10-14` into Ihatecollege `main` as a fast-forward → `c062b92`. Deploy run 38632189085: success.
- Follow-up `39b390e` (chatbot prompt wording: "median debt at graduation" is undergraduate debt; the 3-yr repayment rate means "paying down principal", not paid off; no conclusions beyond what FIRE reports). Deploy run 38632825720: success.
- What changed: Scorecard data now from the June 2026 bulk CSV (`scripts/import-scorecard-csv.js`), repaymentRate filled in, Carnegie R1/R2 mapping fixed, data year shown on pages; `-2025` pages became `-2026` with BLS/NY Fed/FSA citations, and the old slugs 308-redirect; the homepage hero CTA is now "Where does your campus stand?", backed by FIRE data (261 campuses, `/liberal-vs-conservative`, `/campus/[slug]`); the blog index lists newest first and the title-truncation bug is fixed (template posts are still indexed, per Iz); the chatbot is grounded in Scorecard + FIRE, cites sources, falls back to OpenRouter, and gives a deterministic answer if the AI call fails.
- Live checks passed: / 200 with the CTA; /liberal-vs-conservative 200; /campus/university-of-california-berkeley 200; /roi-calculator 200; /is-college-worth-it-2025 and /trade-school-vs-college-salary-2025 → 308 to -2026; /college/ucla → 308 to /college/university-of-california-los-angeles; /blog newest = Oct 14 2026; /api/search-colleges?q=UCLA repaymentRate "79%".
- Chatbot API body: POST /api/chatbot `{"query": "...", "history": []}`.
- Screenshots: /workspace/ihc-live-shots/ (box).
- Open: a "Check Loan Rates" floating bar covers chatbot suggestion chips on mobile; check whether it should hide while the chat is open.
