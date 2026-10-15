# HANDOFF — createstuff.ai — 2026-10-15

Owner bot: CreateStuff Bot. Supersedes HANDOFF-createstuff-2026-10-14.md for deploy rules and alerts. OpenCode on the laptop owns the daily alerts below. The bot does NOT run them.

## Daily alerts (OpenCode runs these, once a day, ~8:00 AM ET)
Run from the laptop with Node >= 18. All checks are deterministic (no AI grading). Exit 0 = pass, exit 1 = alert.

| Site | Command | Alert if |
|---|---|---|
| app.createstuff.ai (builder) | `cd forge && node scripts/smoke.mjs https://app.createstuff.ai --json /tmp/cs-app.json` | exit 1, or any hard check failed |
| api.createstuff.ai (Worker forge-api) | `curl -fsS -m 20 https://api.createstuff.ai/api/health` | non-200, timeout, or body not OK |
| createstuff.ai (marketing) | `cd nexus-ai-suite && node scripts/smoke/createstuff-marketing.mjs https://createstuff.ai --json /tmp/cs-mkt.json` | exit 1 |
| createstuff.ai/ads.txt | `curl -fsS https://createstuff.ai/ads.txt \| head -c 200` | returns HTML (`<!doctype`/`<html`) instead of plain text |

On a failure: report to Iz with the failing check, URL, HTTP status, and the JSON output. Do NOT auto-redeploy or roll back without Iz. If a fix is needed, follow the deploy rules below (preview first, screenshots, Iz says "ship it").

Optional: schedule via laptop cron, e.g. `0 8 * * * cd ~/forge && node scripts/smoke.mjs https://app.createstuff.ai --quiet || <notify>`. Do NOT use GitHub Actions. Do not add createstuff to `nexus-ai-suite/workers/site-cron-trigger` unless Iz asks.

## Deploy rules (hard)
- CreateStuff app/API: ONLY `cd forge && bash scripts/deploy-safe.sh app|api` (commit ad3ad29). It smoke-tests a preview before production and re-checks production after.
- createstuff.ai marketing: ONLY `cd nexus-ai-suite && bash scripts/deploy-safe-static.sh createstuff-marketing`. Live marketing comes from nexus-ai-suite, NOT forge `apps/marketing`.
- No GitHub Actions, ever. All 6 forge workflows are disabled (checked 2026-10-15).
- UI changes: preview + self-reviewed mobile screenshots + Iz "ship it" before production.
- Never commit secrets. Token names only (CS_API_TOKEN / CS_ACCOUNT_ID in laptop `nexus-ai-suite/.secrets/cf.env`).

## SECURITY: rotate now (needs Iz)
forge `.github/workflows/deploy-api.yml`, `deploy-marketing.yml` and `deploy-web-platform.yml` contain a plaintext Cloudflare API token (prefix `cfut_7…`, line 14). Workflows are disabled, but the token is in git history. Iz: revoke it in the Cloudflare dashboard and issue a new one. OpenCode: after rotation, delete those three workflow files (doc-only commit, no deploy).

## Status
- Live today: app, API health and marketing all respond; Chief of Staff smoke run passed 4/4 on 2026-10-15.
- forge PR #8 (generate preview, free-model fallback router, build/repair loop): draft, NOT merged, not deployed. AI path never verified live.
- forge PR #9 (8-tool text generator library in forge apps/marketing): REJECTED by Iz. Do not merge; it also targets the wrong marketing source.
- Direction under discussion: visual AI studio (image generator, browser-side background remover, editor, gallery). Research: `/workspace/createstuff-research-2026-10-14.md` on the bot's box. Nothing approved yet.

## Needs Iz
- Rotate the leaked Cloudflare token.
- Decide on the visual-studio direction before any new build.
- AdSense publisher ID (`ca-pub-…`) when applying; contact email for the site.
