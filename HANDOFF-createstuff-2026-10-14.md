# HANDOFF — createstuff.ai — 2026-10-14

Owner bot: CreateStuff Bot (sole owner of createstuff.ai, Pages projects `createstuff-app`/`createstuff-ai` and `createstuff-marketing`, Worker `forge-api`). Touch only these; Cloudflare account keys are shared with placebets/marketpicks.

## What's live (checked 2026-10-14 ~1:15 PM ET)
- https://createstuff.ai (marketing) — 200
- https://app.createstuff.ai (web builder, React+Vite on Pages) — 200
- https://api.createstuff.ai/api/health (Worker `forge-api`) — 200; https://forge-api.placebetsai.workers.dev root returns 401 (auth required, expected)

## Repo / last commit
- Repo: GitHub `placebetsai/forge`, branch `main`
- Head: `63bc05d` (2026-09-15) — merge PR #6, docs note Workers deploy unblocked
- Last feature: `ee359aa` / PR #5 — phone onboarding wizard (Idea/templates → Style → Generate → Preview → Edit/Open) + edit loop (`edit` + `currentFiles` on `/api/ai/generate`); `/api/ai/generate` returns `{ok, files}` and runs `processBuildStep` via `ctx.waitUntil`
- No commits since 2026-09-15.

## Layout
- `apps/cloud-api/src/index.ts` — Worker, all routes (D1 `forge-db`, R2 `forge-projects`, KV `SESSIONS`, Queue `forge-jobs`, DO `ChatRoom`, 5-min cron)
- `apps/web-builder/src/App.tsx` — builder UI
- `apps/marketing/` — static marketing site
- `apps/mobile/` — Expo app (do not ship APKs / Play)

## Deploy (Wrangler only, no GitHub Actions)
```bash
# token: CS_API_TOKEN / CS_ACCOUNT_ID from laptop nexus-ai-suite/.secrets/cf.env (never commit)
export CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=...
cd apps/cloud-api && npx wrangler deploy
cd apps/web-builder && npm run build && npx wrangler pages deploy dist --project-name=createstuff-app
cd apps/marketing && npx wrangler pages deploy . --project-name=createstuff-marketing   # verify project name first
```

## Rollback
- Worker: `npx wrangler deployments list` then `npx wrangler rollback <version-id>` in `apps/cloud-api`
- Pages: Cloudflare dashboard → project → Deployments → previous → Rollback (or redeploy older commit)
- Git: revert the merge commit on `main`

## Rules
- Wrangler-only deploys; never touch PlaceBets, MarketPicks, Android APKs, other repos' docs.
- UI/mobile changes go to a preview with self-reviewed screenshots and wait for Iz's "ship it" before production.
- Marketing must only claim what the product does. Never commit secrets.

## In progress / not done
- Live end-to-end verify of generate (register → project → generate → real `public/index.html` → preview renders, not an empty shell) was NOT completed: box tools failed on 2026-09-15 and Cloud Agents were unavailable on the plan.
- Marketing copy audit: `features.html`, `how-it-works.html`, `pricing.html`, and others still say "watch it build in real time," "AI asks clarifying questions," "publish instantly," custom domains/Pro. These must be checked against the real template → style → generate → preview → edit flow.

## Next steps
1. Smoke-test generate + edit live; fix any empty-preview path in App.tsx or the Worker.
2. Rewrite marketing overclaims to match the shipped flow; deploy to preview, then ship after Iz approves.
3. Known issues: GitHub import ~60% success (E2B sandbox slow), no preview for imported repos, GitHub OAuth unset (returns 503).

## Blockers / needed from Iz
- Cloud Agents (Pro) if repo work should run there.
- `GITHUB_OAUTH_ID` / `GITHUB_OAUTH_SECRET` if repo-browse OAuth is wanted.
- Confirm the marketing Pages project name before deploying.
