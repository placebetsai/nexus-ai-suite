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
3. Chat answers show raw ISO as-of timestamp; humanize it.
4. Header tagline "Shit-talking odds expert" — needs Iz's call.
5. The Odds API source has never recorded a success in cron health (429 / stale).
6. Prod KV namespace id in config looks invalid — verify binding.
7. Site is 100% free: no paywall / Pro tier.
