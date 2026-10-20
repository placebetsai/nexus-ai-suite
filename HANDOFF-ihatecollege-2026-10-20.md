# HANDOFF — ihatecollege.com — 2026-10-20

Owner: IHateCollege Bot. No secrets in this file (paths only).

Supersedes `HANDOFF-ihatecollege-2026-10-14.md`. That file still says
"Supabase is primary" and "push to main auto-deploys"; both are false now.

## TL;DR

The ihatecollege stack runs on the **Free** Workers/Pages/D1/KV tiers. No
Workers Paid, no Supabase, no API keys for jobs, photos, or the chatbot. (The account does
carry an unrelated R2 Paid subscription with one bucket,
`scooters-exchange-photos`; this site does not use R2.)

- College pages are static (6,163 URLs). Only `/api/*` reaches a Function.
- News is a KV aggregate refreshed by a `*/15` cron, not per-request RSS.
- Job board, ratings, leads, cron audit all live in D1.
- Jobs are ingested from 3 keyless public APIs; photos come from Wikimedia
  Commons (also keyless). The chatbot runs on the Workers AI `AI` binding.
- Smoke gate: **19/19 passed, 0 failed, 0 warnings** on preview + production.

## Live production (verified 2026-10-20 ~10:10Z)

| Item | Value |
|---|---|
| Site | https://ihatecollege.com 200 |
| Production deployment | `5a321428-…` (2026-10-20T10:07:01Z) |
| Previous production (rollback target) | `669be96f-…` |
| `/api/jobs/list` | `configured:true`, `source:"d1"`, **40 jobs** |
| `/api/civil-service-data` | 7 Wikimedia photos, 0 live matches, X-Data-Status: ok |
| Cron worker | `ihatecollege-cron` deployment `190448ef` (08:59:58Z), last tick 10:00 ok |
| Cron history | **83/83 runs ok** |
| D1 | `job_posts` 40 · `leads` 7 · `school_ratings` 0 · `cron_runs` 83 |

Job mix: Business 23, Tech 15, Healthcare 2 (sources: Himalayas 19, Jobicy 14, Remotive 7).
The board only contains roles that pass the no-degree gate below.

## What changed since 2026-10-14

**CPU / Workers Free (the original problem).** 199,797 requests over 14 days
produced 794 `exceededResources` errors; CPU P50 was 9,885 µs against a
10 ms Free limit. Root cause was SSR on ~6,160 college URLs plus
`_routes.json` sending `/*` through Functions, with RSS parsing on the
request path. Fixes, all live:

1. College pages statically generated (`getStaticPaths`, `fallback:false`).
2. `_routes.json` narrowed to `/api/*`.
3. `_headers` gives long-lived cache headers to static assets.
4. News moved to a KV aggregate (`news:aggregate:v1`, 12-min TTL, 12 feeds,
   refreshed by cron at most every 15 min).
5. 35 legacy `/college/<alias>` URLs are static 301s in `public/_redirects`.

Full RCA: `CPU-LIMIT-RCA-2026-10-19.md`.

**Supabase removed.** Both project refs (`uehqxuqjmuxtlopscnbf`,
`ababarvluvlxukieireh`) are NXDOMAIN. `lib/supabase.js`,
`components/AuthProvider.js`, and `components/AuthModal.js` were deleted.
Login/signup UI is gone; job posts and ratings are anonymous.
`@supabase/supabase-js` is still listed in `package.json` but nothing imports it.

**D1 is the only store.** `lib/jobs-store.js` is the storage boundary for the
board (`listJobs`/`createJob`), so a future move to Durable Objects,
Hyperdrive+Postgres, or Queues is one file.

**Keyless job pipeline.** `cron/sources.js` normalises three public JSON APIs:

| Source | Endpoint | Rows/poll |
|---|---|---|
| Remotive | `remotive.com/api/remote-jobs?limit=25` | ~10 |
| Jobicy | `jobicy.com/api/v2/remote-jobs?count=25&geo=usa` | 25 |
| Himalayas | `himalayas.app/jobs/api?limit=25&country=United States` | ~13–20 |

One feed per 15-minute tick (rotating) keeps CPU inside the Free budget —
each payload is ~140 KB instead of multi-megabyte. Upserts use
`id = "<source>:<external id>"` plus a unique `(source, external_id)` index;
rows expire after 30 days and are refreshed on every poll. A US/remote
location filter drops single-country non-US listings. Human submissions have
`source = NULL` and are never touched by ingestion.

**No-degree gate.** The board promises roles that do not require a degree, and
the raw feeds do not honour that. Ingestion now drops a listing when:

- the title is senior/managerial (`director`, `VP`, `chief`, `head of`,
  `principal`, `manager`, `senior`, `architect`, `tech lead`), or
- the text requires a credential (`NP/PA`, `RN`, physician assistant,
  attorney, CPA, architect, psychologist), or
- the text requires a clearance (`TS/SCI`, top secret, public trust, MBI), or
- the text requires a degree (`bachelor`/`master`/`PhD`/`4-year degree`)
  unless the same sentence says "or equivalent experience".

That removed Nurse Practitioner, Senior Systems Engineer (TS/SCI), and the
director/manager rows. The board dropped from 61 to 30 on reseed and is 40 now
as the feeds refresh. It is a conservative editorial gate, not a legal
guarantee.

**Civil-service page.** One request per page load (was 14), returning
`{jobs, photos}`. Jobs are D1 keyword matches; photos are Wikimedia Commons
(lookups run in parallel, then the whole response is edge-cached for an hour).
The old fake "N open positions" line is now an honest live-match line with the
official apply links always present.

**Chatbot (Professor Debt) — now keyless.** The old bot fell back to a canned
data line because Groq's backup model `llama-3.3-70b-versatile` was 404 in this
org and Groq Free is **8,000 tokens/min per model**, so the primary 429'd. It
now runs on Workers AI through the `AI` binding:

- `@cf/openai/gpt-oss-120b` primary; `@cf/meta/llama-3.3-70b-instruct-fp8-fast`
  backup. No Groq/OpenRouter keys and no external TPM ceiling.
- `wrangler.toml` is now the Pages source of truth: `pages_build_output_dir`,
  the `AI` binding, `NEWS_CACHE` KV, and `DB` D1. Production and preview env
  now contain only `SITE_URL`.
- Answers are shorter and lead with a verdict ("yes / only if / no"), not
  "it depends". Follow-ups resolve across the last 3 user turns; institution-
  wide and national-major figures stay labeled and separate; "why" says the
  data does not establish a cause.
- "What majors pay best at X?" is deterministic. The public extract has no
  school-by-major earnings, so the bot says that, then gives the top national
  fields (Electrical Engineering $97,841; Mechanical Engineering $90,072;
  Computer Science $88,916) plus X's all-major median.
- Requests to label a university antisemitic/racist are refused. The bot says
  it has no incident data, offers FIRE speech-climate grades, and points to
  ADL / Hillel / Department of Education. Plain definitions are answered
  normally.
- UI: prior turns only (no duplicated question or control messages), a New
  chat button, and stale-response protection after reset.

Verified live: greeting; NYU → debt → nursing → why; majors-at-NYU; UCLA topic
shift; antisemitism label refusal; definition; jobs without a degree.
Smoke gate remains 19/19.

**Key cleanup.** While migrating, `wrangler pages download config` printed the
old `GROQ_API_KEY` / `OPENROUTER_API_KEY` values to a local terminal. The
generated file was overwritten and never committed, and both secrets were
removed from Pages. Revoke those two keys at Groq/OpenRouter if they still exist
in those accounts.

## Cloudflare resources

Account `90904956101bde8c4ca51cdaa5bee1ab` (Ihatecollege79).

| Resource | ID / name |
|---|---|
| Pages project | `ihatecollege` |
| D1 | `ihatecollege-leads` = `f36d49e6-2bdd-49d0-9e02-3a6389e35b3a` |
| KV | `NEWS_CACHE` = `bd9102962e1f4cf2a0eafb2598ff4ef7` |
| Cron Worker | `ihatecollege-cron` (`*/15 * * * *`) |
| Zone | `ihatecollege.com` = `45b2cc2ae3510c52bcc9b0bfee526c5a` (Free) |
| Redirect ruleset | `79b6eb72c1ee48cab678a615a296dc22` (`www`→apex 301) |
| Cache ruleset | `fd9e61ddc7a448afbc52ea1fd8f4f834` |
| Rate-limit ruleset | `987f2bc905e54cd3b2592b4b572d98a4` |

Cache rules (2): `/api/og` and `/api/civil-service-data`, both
`respect_origin`. The civil-service route sends `s-maxage=3600`, so it is
`MISS → HIT` with `age` incrementing.

Rate limit: `/api/*`, 40 requests / 10 s per `ip.src` + `cf.colo.id`, 10 s
block. Static pages are unaffected.

D1 tables: `leads`, `job_posts`, `school_ratings`, `cron_runs`.
Migrations: `migrations/0003_cron_runs.sql`, `0004_job_posts.sql`,
`0005_school_ratings.sql`, `0006_job_sources.sql`.

## Repo / deploy state

```
local main        5803973  (6 commits ahead of origin)
origin/main       3271efc  (pushed 2026-10-19)
backup-before-rewrite        4307dce
pending/workflow-manual-only 9941f11  (needs `workflow` token scope)
```

Local commits not pushed: `70009ae` (D1 job board/ratings, auth removal),
`a0d08a8` (docs), `62228da` (keyless feeds + Wikimedia), `4e94009` (no-degree
gate + keyword fix), `b8752ea` (conversational chatbot), `5803973` (keyless
Workers AI chatbot). **Do not push without approval.** GitHub is not the deploy
path.

`.github/workflows/deploy-cf-pages.yml` is `disabled_manually`. Pushing cannot
trigger a deploy today. The parked branch would make that explicit if a token
with `workflow` scope is ever available.

Production was deployed with the sanctioned gate:

```bash
bash scripts/deploy-safe.sh            # build → preview → warm → smoke → prod → smoke
SKIP_BUILD=1 bash scripts/deploy-safe.sh
PREVIEW_ONLY=1 bash scripts/deploy-safe.sh
AUTO_ROLLBACK=1 bash scripts/deploy-safe.sh
```

Never run a raw `wrangler pages deploy`. The gate also sets
`NODE_OPTIONS=--no-network-family-autoselection`; this laptop's IPv6 egress is
broken and Node/wrangler hang without it.

**Gotcha:** wrangler falls back to a cached OAuth login for a different
account (`Fashionistas1979@gmail.com`) and fails the account_id check. Export
the IHC token first:

```bash
set -a; . "/home/billionaremaker/Documents/Default Project/nexus-ai-suite/.secrets/cf.env"; set +a
export CLOUDFLARE_API_TOKEN="$IHC_API_TOKEN" CLOUDFLARE_ACCOUNT_ID="$IHC_ACCOUNT_ID"
```

`deploy-safe.sh` stamps the local git HEAD into its success line. If the tree
has uncommitted edits, that hash is descriptive, not exact — today production
reported `a0d08a8` while the built tree matches `62228da`.

## Verify quickly

```bash
node scripts/smoke.mjs https://ihatecollege.com
curl -s https://ihatecollege.com/api/jobs/list | head -c 300
curl -s "https://ihatecollege.com/api/civil-service-data" | head -c 300
curl -s "https://ihatecollege-cron.ihatecollege79.workers.dev/run?source=jobicy"
```

The cron worker also accepts `?source=remotive|jobicy|himalayas|all`.
`?source=all` is a manual seed and runs all feeds in one invocation.

## Known gaps / next steps

1. **6 commits unpushed.** Push only with approval.
2. **No keyless federal feed found yet.** Tested USAJOBS RSS (404) and JSON
   (404 without a key), governmentjobs.com (no job data in HTML), and three
   guessed apprenticeship.gov endpoints (404). That is not proof none exists;
   it is what was tested. The page keeps official links and shows live D1
   matches when a keyword hits. `USAJOBS_API_KEY` + `USAJOBS_EMAIL` remains
   an optional fallback.
3. **No Trades volume.** The three feeds skew remote tech/business. There is
   no keyless US trades API found yet (apprenticeship.gov has no public JSON).
4. **Job moderation.** Both ingested and human rows use `is_approved = 1`.
   There is no review queue. Consider Turnstile on `/api/jobs/post`.
5. **Photos have no visible attribution.** The route returns `credit` and
   `license` (Commons); the page only uses `alt`. Add a small credit line if
   strict CC attribution is wanted.
6. **Unused dependency.** Remove `@supabase/supabase-js` from `package.json`
   and sync the lockfile when convenient.
7. **Legacy item, not rechecked:** `leads_age_error` in
   `/api/cron/cleanup-d1` was open on 2026-10-14.
8. **Edge caching** on `/api/civil-service-data` is one hour. If a photo query
   changes, cache-bust with `?cb=<random>` or wait for the TTL.

9. **Chatbot free allocation.** Workers AI has a free daily neuron allocation
   (10k/day on Free). If it is exhausted, the bot falls back to the deterministic
   data-only answer. There is no keyed fallback by design; watch AI usage in the
   Cloudflare dashboard and only add capacity if it becomes a regular limit.

## File map

| Path | Role |
|---|---|
| `lib/jobs-store.js` | D1 storage boundary (`listJobs`, `createJob`) |
| `lib/news-cache.js` | KV news aggregate, TTL 12 min |
| `lib/cloudflare.js` | `getEnvSync()` / `getSecret()` request-context resolution |
| `pages/api/jobs/list.js` | reads D1 via `listJobs` |
| `pages/api/jobs/post.js` | D1 insert + formsubmit fallback |
| `pages/api/submit-rating.js` | D1 insert, no silent success on failure |
| `pages/api/civil-service-data.js` | combined D1 + Wikimedia payload |
| `pages/civil-service.js` | one SWR call, `LiveMatches` component |
| `pages/college/[slug].js` | SSG, `fallback:false` |
| `cron/worker.js` | freshness + news + health + job rotation |
| `cron/sources.js` | feed fetchers/normalisers/upserts |
| `scripts/deploy-safe.sh` | the only sanctioned deploy path |
| `scripts/smoke.mjs` | 19-check gate |
| `migrations/000[3-6]_*.sql` | cron_runs, job_posts, school_ratings, job sources |
| `public/_redirects` | 35 static college alias 301s |
