# OpenCode coordination (owner: Chief of Staff / Grok Bot)

> **DAILY ALERTS → OpenCode owns them (Iz, 2026-10-15).** Every site's daily checks, Cloudflare alert meanings, triage and known issues: [`OPENCODE-DAILY-ALERTS.md`](OPENCODE-DAILY-ALERTS.md). Chief of Staff no longer runs them.

## STATUS 2026-10-15 (~6:50 AM ET) — Chief of Staff
- **fashionistas.ai prod:** still `89bf396` / Pages `47a70a52` (rollback `d8b758aa`).
- **rebuild PREVIEW awaiting Iz "ship it":** https://rebuild.fashionistas-ai.pages.dev · branch `rebuild` · tip `0ec533a` — rich 2026 visual layer (hero, kinetic text, category cards, try-on card, confetti, edit listing, client-side junk feed filter, gallery endpoint). Pinned try-on demos `/shop/209` (denim trucker) + `/shop/148` (blue Versace polo) share prod DB.
- **Open (Fashionistas):** SSR SEO junk titles, photo column unverified, final polish, real-account extension test, EPN blocked on Iz's eBay login, affiliates `AFFILIATES-PLAN-2026-10-14.md`.
- **marketpicks.ai:** crawler guard `280dc36b` (rollback `0cb3f854`); D1 skip-unchanged triggers + dropped 2 quote indexes (`ops/d1/marketpicks-skip-unchanged-triggers.sql`). MarketPicks Bot: code-level skip + 30-min market-hours quotes; committing live-source. Do not edit their dirty `HANDOFF-marketpicks-2026-10-14.md`.
- **Note — nexus commit `7a62e0d`:** accidentally swept in others' uncommitted `NEEDS_ISRAEL.txt`, `scripts/site-blogs.sh`, `apps/createstuff-marketing/index.html`. Owners should confirm; not reverted.
- **Morning health/traffic audit:** in progress → box `/workspace/audits/health-2026-10-15.md`.

---
Read this first, then the site handoff below. Iz's goal: category-leading, high-traffic sites, free for users, monetized by AdSense + affiliates only.

## Hard rules
- **DEPLOY ONLY VIA deploy-safe (2026-10-15, Iz).** Every bot and OpenCode ships production only through the site's smoke gate (table below): preview → deterministic `scripts/smoke.mjs` → production → smoke again → rollback command on red. Raw `wrangler deploy` / `wrangler pages deploy … --branch=main` / `/tmp/mpdeploy.sh main` / bare `./deploy.sh pages <gated project>` to production is **forbidden**. No GitHub Actions, no AI/LLM calls in the gate. Fix a wrong check in `scripts/smoke.mjs` (own commit, with reason); never bypass. `ALLOW_KNOWN_FAILS=1` only lets through failures that also fail on prod right now.
- Deploy with Wrangler only. Never GitHub Actions, never Telegram.
- Never print or commit secrets. Never change fashionistas CHANNEL_KEY.
- Never invent data (odds, prices, tuition, filings, records, listings).
- Any UI change: preview deploy + 412x915 phone screenshots, then wait for Iz to say "ship it". Never push straight to production.
- Keep D1 lean (tiny durable rows only; caches/logs to KV/R2).
- No single-sport/single-ticker band-aids; fixes must generalize.
- MarketPicks homepage stays a full finance site (congress is a section/CTA only).
- One owner per site. Don't touch a site another agent is working on; check its handoff "in progress" first.
- After every milestone, update that site's HANDOFF file here and push (doc-only commits).

## Deploy gates (added 2026-10-15) — the only sanctioned production path
| Site | Repo @ branch | Production command | Manual smoke |
|---|---|---|---|
| fashionistas.ai | laptop `~/fashionistas-ai` (main + rebuild) | `bash scripts/deploy-safe.sh` (wraps deploy-local.sh; deploy-local now refuses main unless called by the gate) | `npm run smoke -- <url>` |
| placebets.ai | `Placebetsai` @ main | `bash scripts/deploy-safe.sh` (deploy.sh + deploy-gated.sh main now exec it) | `npm run smoke -- <url>` |
| marketpicks.ai | `marketpicks-ai` @ live-source (laptop wip branch must merge `4644260`) | `bash scripts/deploy-safe.sh` (`npm run ship` / `pages:deploy` / deploy.sh route to it) | `npm run smoke -- <url>` |
| ihatecollege.com | `Ihatecollege` @ main | `bash scripts/deploy-safe.sh` — **the GitHub Action `deploy-cf-pages.yml` still auto-deploys main; owner must disable it** | `npm run smoke -- <url>` |
| scooter.exchange | `scooters-exchange` @ master | `bash scripts/deploy-safe.sh web` / `api` — **deploy-web/api.yml Actions still auto-deploy; disable** | `npm run smoke -- <url>` |
| app/api.createstuff.ai | `forge` @ main | `bash scripts/deploy-safe.sh app` / `api` — **deploy-*.yml Actions still auto-deploy and hold a plaintext CF token; disable + rotate** | `npm run smoke -- <url>` |
| createstuff.ai (marketing) | this repo `apps/createstuff-marketing` | `bash scripts/deploy-safe-static.sh createstuff-marketing` | `node scripts/smoke/createstuff-marketing.mjs <url>` |
| israeljoffe.com | this repo `israeljoffe-com/` (laptop) | `bash scripts/deploy-safe-static.sh israeljoffe-com` | `node scripts/smoke/israeljoffe-com.mjs <url>` |

`./deploy.sh pages` now refuses every project above unless called by its gate (`DEPLOY_SAFE=1`).

**Wrangler / Node fallback (placebets, `Placebetsai` 6071c4f on feat/fix9-grounding, approved by Chief of Staff 2026-10-15). Copy it to the other sites' deploy-safe.sh.** wrangler 4 needs Node ≥ 22, but the box runs Node 20.19.2, so the old `wrangler` / `npx wrangler@4` choice died before the preview deploy. `pick_wrangler()` chooses the binary as follows:
- `USE_NPX_WRANGLER=1` → `npx wrangler@4`.
- Node < 22 → the repo-local `node_modules/.bin/wrangler` (3.114). If it's missing, the script dies with "run npm ci".
- Otherwise the global `wrangler`, falling back to `npx wrangler@4`.

Before anything deploys, it prints `wrangler: <binary> (vX.Y.Z) on node vN`. The gate order is unchanged: preview → smoke → prod → smoke. Verified with `PREVIEW_ONLY=1 bash scripts/deploy-safe.sh` on the box (7:47 AM ET): local wrangler v3.114.17 → preview fce7e07a → smoke 9/9 → stopped; production untouched.
Smoke vs production 2026-10-15 ~7:20 AM ET: placebets **FAIL** (NBA bot invents Lakers–Celtics; UFC bot says "nothing matches" with 25 UFC fights on board) · marketpicks **FAIL** (bot NVDA $221.30 vs quote $217.01, 1.98%; `/insider` intermittently 503 "error code: 1102"; health `grading` status unknown) · ihatecollege PASS (warn: /api/civil-service-data empty) · fashionistas PASS (warn: junk #204 lid / #145 Keurig active in public /w/api/market) · scooter PASS · createstuff PASS · israeljoffe PASS. Full logs: box `/workspace/audits/smoke-2026-10-15/`.

## Site map
| Site | Repo / path | Handoff |
|---|---|---|
| fashionistas.ai | laptop ~/fashionistas-ai (local main is production; ignore fa-*, fashionistas-wt-* copies) | HANDOFF-fashionistas-2026-10-14.md, HANDOFF-fashionistas-api-2026-10-14.md |
| placebets.ai | placebetsai/Placebetsai | HANDOFF-2026-10-14-placebets.md |
| marketpicks.ai | marketpicks-ai | HANDOFF-marketpicks-2026-10-14.md |
| ihatecollege.com | Ihatecollege (Ihatecollege79 CF account) | HANDOFF-ihatecollege-2026-10-14.md |
| createstuff.ai | placebetsai/forge | HANDOFF-createstuff-2026-10-14.md |
| israeljoffe / wuwonline SEO | see handoff | HANDOFF-israeljoffe-seo-2026-10-13.md |

## Good OpenCode tasks (grind work)
- Fix bugs and items listed under "next steps" in a handoff, on a preview branch.
- SEO: titles/meta/JSON-LD/sitemaps/internal links from real data.
- Tests, speed, accessibility, copy fixes.

## Leave to Chief of Staff
- Shipping decisions, browser/phone QA, cross-site priorities, anything needing Iz's accounts or keys.

## OpenCode takeover — Fashionistas (2026-10-14 evening)
Iz handed Fashionistas grind to OpenCode (MiMo) on the laptop. Chief of Staff keeps ship-it / Iz blockers / affiliates.

**Start here on the laptop:** `~/fashionistas-ai/OPENCODE-START-HERE.md` (main commit `1954149`).

**Rules reminder for OpenCode:**
- Only `~/fashionistas-ai` (ignore `fa-*`, `fashionistas-wt-*`).
- Deploy via `scripts/deploy-local.sh`. Preview: `DEPLOY_BRANCH=<name> ALLOW_BRANCH=<name>`.
- UI → preview + 412×915 screenshots → Iz says "ship it" → then prod. Never invent data. Never print secrets. Never touch CHANNEL_KEY.
- Update this repo's `HANDOFF-fashionistas-2026-10-14.md` after every milestone and push (doc-only).

**Branches (do not merge until ship-it):**
- `seller-ux` @ `2200a8f` → https://seller-ux.fashionistas-ai.pages.dev (Sprint 1 UX awaiting ship-it)
- `docs/agile` @ `6e60f5b` → backlog / sprints / research (reference only)

**Affiliate plan:** `AFFILIATES-PLAN-2026-10-14.md` (placebetsai@gmail.com). Iz still owns tax/bank/phone for EPN, Amazon, Impact, CJ.
