# OpenCode coordination (owner: Chief of Staff / Grok Bot)

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
