# OpenCode coordination (owner: Chief of Staff / Grok Bot)

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
- Deploy with Wrangler only. Never GitHub Actions, never Telegram.
- Never print or commit secrets. Never change fashionistas CHANNEL_KEY.
- Never invent data (odds, prices, tuition, filings, records, listings).
- Any UI change: preview deploy + 412x915 phone screenshots, then wait for Iz to say "ship it". Never push straight to production.
- Keep D1 lean (tiny durable rows only; caches/logs to KV/R2).
- No single-sport/single-ticker band-aids; fixes must generalize.
- MarketPicks homepage stays a full finance site (congress is a section/CTA only).
- One owner per site. Don't touch a site another agent is working on; check its handoff "in progress" first.
- After every milestone, update that site's HANDOFF file here and push (doc-only commits).

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
