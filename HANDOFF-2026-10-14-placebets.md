# HANDOFF 2026-10-14 — placebets.ai single deploy source

Owner: PlaceBets Bot (sole owner of placebets.ai, per Iz). Verified 2026-10-14 ~07:30 ET via Cloudflare API + gh. No secret values in this file.

## Canonical source (the ONLY one)
| What | Value |
|---|---|
| Repo / branch | `github.com/placebetsai/Placebetsai` · `main` (box checkout `/workspace/tnr/Placebetsai`) |
| CF account | `2765cb2786006552f33cc3dfe0b680a1` (Placebetsai@gmail.com) |
| Pages project | `placebetsai` — custom domains `placebets.ai`, `www.placebets.ai` (both active); production branch `main`; direct upload |
| Prod now | deployment 2026-10-13 11:35 ET, commit `4a6a369` = current `origin/main` HEAD |
| Token | box `/home/box/.cf-tokens` → `WORKERS_TOKEN` (the one that lists account 2765cb27…). `PLACEBETS_TOKEN` there lists no accounts. |

## Deploy commands
```bash
cd /workspace/tnr/Placebetsai && git checkout <branch> && npx @cloudflare/next-on-pages   # builds .vercel/output/static
export CLOUDFLARE_ACCOUNT_ID=2765cb2786006552f33cc3dfe0b680a1 CLOUDFLARE_API_TOKEN=<WORKERS_TOKEN>
# Preview (any branch != main):
wrangler pages deploy .vercel/output/static --project-name placebetsai --branch <preview-branch>
# Production (only after Iz says "ship it", from main):
wrangler pages deploy .vercel/output/static --project-name placebetsai --branch main
```
Verify prod: `curl -s https://placebets.ai/api/odds | jq '{source,coverage:[.coverage[].key]}'` and `POST https://placebets.ai/api/chatbot {"query":...}`.

## Rule
Any UI / mobile / chatbot-behaviour change → preview deploy first → Android (Pixel) screenshots → wait for Iz's literal "ship it" → then prod. Proof = pasted live output only.

## DO NOT USE
- **`placebets-ai` on Nexus account `7eb89b01…77f8`** (fashionistas1979@gmail.com). Exists, only `placebets-ai.pages.dev`, no custom domain; last deploy 2026-10-11 (`2dd74a9`). `HANDOFF-2026-10-06.md` §deploy table (line 91) says `wrangler pages deploy … --project-name=placebets-ai` from `Placebetsai-src` — **wrong target**; deploys there never reach placebets.ai. `deploy.sh` also maps `placebets-ai` → CF (Nexus) token. Treat as dead.
- **`placebets-ai-v2`** on PlaceBets account — stale, last deploy 2026-05-17, no custom domain.

## Retired / flagged copies
| Copy | Status |
|---|---|
| `Placebetsai-src` | Not present on the box. Its last known commits (`2dd74a9`) are already in `origin/main`. Retired. |
| `~/pb-grok` redesign-preview | Not present on the box. Any redesign must be re-proposed as a branch of Placebetsai. Flagged. |
| "main working copy" (likely Iz's laptop) | Unreachable/unchecked. If it has commits, push them as a branch to placebetsai/Placebetsai; never deploy from it. |
| `/workspace/placebets-preview`, `/workspace/placebets-qa`, `/workspace/fash-mobile-qa5/placebets` | QA artifacts only (JSON/screens), not code. |
| Box checkout local state | 2 stashes on main (old chatbot / homepage-events WIP from Sep, superseded); 3 local Sep branches with 0 commits beyond main. Nothing deleted. |

## Open items
1. PR #16 (`fix/chatbot-exact-matchup-champion-year-2026-10-14`, head `19eeb09`) — preview https://chatbot-preview.placebetsai.pages.dev — awaiting Iz's "ship it".
2. No priced futures in the odds feed → "next year" answers can't quote real futures prices.
3. ~~Chat answers show raw ISO as-of timestamp~~ — DONE in preview (PR #17): "As of 9:16 AM ET".
4. ~~Header tagline "Shit-talking odds expert"~~ — DONE in preview (PR #17): "Straight-talking odds expert"; profanity removed from user copy/prompts.
5. The Odds API source has never recorded a success in cron health (429 / stale).
6. Prod KV namespace id in config looks invalid — verify binding.
7. Site is 100% free: no paywall / Pro tier.
8. PR #17 (`fix/compliance-brand-2026-10-14`, builds on #16; merge #16 first) — https://github.com/placebetsai/Placebetsai/pull/17 — preview https://compliance-preview.placebetsai.pages.dev — awaiting Iz's "ship it". Contains:
   - /legal-states (30 states + DC, AGMA as of 2026-10-14, cross-checked Action Network; Delaware omitted, sources disagree) + footer/odds-board notice "Sports betting is legal only in some states. 21+. Gambling problem? Call 1-800-GAMBLER."
   - /responsible-gambling help box (1-800-GAMBLER + NCPG), no ads there.
   - Slots/casino: Iz decided to KEEP them (removal reverted). All 24 /games/* pages now have unique title/description, canonical, OG, visible FAQ + FAQPage JSON-LD, breadcrumbs, a free-play/no-real-money/21+ note.
   - SEO: 0 duplicate titles (was 22), 0 missing canonicals (was 28); metadata moved into <head> (htmlLimitedBots); SportsEvent JSON-LD on home; sitemap drops 8 "coming soon" games; stale public/sitemap.xml removed.
   - Ads (already AdSense-approved, pub-7215975042937417, existing slot ids): labeled "Advertisement", reserved min-height, lazy. Placement: home odds board after 8 Live cards + after every 2 sport sections; home after Top Stories; guides after 1st section; /calculators after hero; /games/* before FAQ; desktop ≥1480px sticky left rail (sidebar slot). None in the chatbot, /legal-states or /responsible-gambling. Missing: a native in-feed slot id (display slot used); mobile anchor = turn on Auto ads → Anchor in the AdSense dashboard.
   - AdSense policy (Google Publisher Restrictions, "Online gambling"): restricted (not banned) = content that "enables users to participate in online, real-money gambling…", examples include "online sports betting, aggregator or affiliate sites that promote online gambling pages"; excluded when shown to users in the US (and 17 other listed countries). Free-play casino with virtual chips isn't real-money gambling by that definition. Risk: once affiliate links go in, those pages count as online gambling content, and non-US visitors get restricted ads. Publisher Policies also bar personalized ads based on "activity by users on … gambling … sites".
   - Lighthouse mobile (box-run, noisy): home perf 36→52, SEO 83→92. Slots/sports SEO shows 58 on the preview only because pages.dev sends `x-robots-tag: noindex`. The slots LCP of ~13s and CLS of 0.139 also show on prod, so they were already there. Home TBT is ~17s (main JS chunk + ticker), which needs its own perf PR.
   - Screenshots: /workspace/placebets-preview/compliance-*.png (box).
9. Both PR #16 and PR #17 await Iz's literal "ship it". Nothing on main.

## Valuation findings (2026-10-14; full report /workspace/placebets-valuation-2026-10-14.md on the box)
- Top gap: no sportsbook affiliate links (FanDuel/DraftKings/BetMGM/Caesars/Fanatics + state registrations), so no revenue.
- Budget for a paid, licensed odds feed (scraped sources are fragile + legal risk); add real futures.
- Set up Google Analytics + Search Console. Build per-game/team pages and email/push alerts.
- A public, timestamped pick track record + bet tracker and line-movement alerts are the moat.
- Ads: Google restricts gambling-promoting content (allowed for US viewers). Plan direct sportsbook sponsorships alongside AdSense.
