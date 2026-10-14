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
