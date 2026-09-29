# Cloudflare free-tier audit — where the quota was actually going

**Date:** 2026-09-29 · **Measured by:** live Cloudflare GraphQL analytics + DNS API + direct probes.
Every number below is measured, not estimated. Nothing is claimed as fixed without a probe that
fails before the change and passes after it.

---

## 1. The headline: it was not CPU

The complaint was "fashionistas is hitting a daily free-tier CPU limit and nobody uses the sites."
Cloudflare's own limits page (last updated **2026-09-05**) does not define a daily CPU quota:

| Limit | Workers Free |
|---|---|
| Requests | **100,000 / day** (Error 1027 when exceeded) |
| CPU time **per HTTP request** | **10 ms** |
| CPU time **per Cron Trigger** | **10 ms** |
| Cron Triggers per account | **5** |
| Subrequests | 50 / request |
| D1 rows read (separate product) | **5,000,000 / day** |

Measured against those:

- **`exceededCpu` invocations in the last 8 days: 0.**
  (`success 173,460 · scriptThrewException 1,124 · clientDisconnected 834` — no other outcome exists
  in the data.)
- **Total account CPU: ~37 seconds per day.** There is no daily CPU ceiling to be near.
- The Workers most likely to be *looked at* under a CPU chart are the cheapest per request:
  `app-host` **0.43 ms/req**, `fashionistas-api` **2.1 ms/req** — both far under 10 ms.

So CPU was not the binding constraint. Two **daily** free-tier limits were:

### Limit actually hit #1 — D1 rows read (caused a real outage)

| Date | D1 rows read | 5,000,000 cap |
|---|---:|---|
| 2026-09-25 | 539,294 | 11% |
| 2026-09-26 | 3,917,349 | 78% |
| **2026-09-27** | **5,133,584** | **103% — OVER** |
| 2026-09-28 | 924,169 | 18% |
| 2026-09-29 | 443,311 | 9% |

That is the outage already recorded in `workers/app-host/src/index.js`: 18,214 whole-table scans
read 2,445,142 rows on 2026-09-27 and pushed the account past D1's free daily limit, which took
every site on the account dark until 00:00 UTC.

### Limit actually hit #2 — Workers requests, and `app-host` was 93% of it

Account-wide Worker invocations (cap 100,000/day):

```
2026-09-25    29,187   #################
2026-09-26    24,536   ##############
2026-09-27    40,959   ########################
2026-09-28    51,056   ##############################   ← 51% of the daily cap
2026-09-29    25,005   (partial day)
```

In the 24 hours before the fix:

| Worker | Requests | Share | CPU/req |
|---|---:|---:|---:|
| **`app-host`** | **49,635** | **93%** | 0.43 ms |
| `createstuff-api` | 3,111 | 6% | 3.1 ms |
| everything else | 663 | 1% | — |

`app-host` serves `*.fashionistas.ai/*` **and seven other zones**. Its route is
`request_limit_fail_open: false` — **fail closed** — so if the account ever crossed 100,000 the
app-hostnames would have served Cloudflare **Error 1027** rather than degrading.

---

## 2. Root cause: four wildcard DNS records on portfolio zones

`fashionistas.ai` was never the source. Full DNS dump of all 8 zones in the account:

| Zone | Wildcard record? | Bot subdomains reached app-host? |
|---|---|---|
| fashionistas.ai | **none** (19 records, all explicit) | no |
| marketpicks.ai | **none** | no |
| religiousjews.com | **none** | no |
| ketiservice.com | **none** | no |
| **israeljoffe.com** | `*.israeljoffe.com → israeljoffe.com` | **YES** |
| **israeljoffe.org** | `*.israeljoffe.org → israeljoffe.org` | **YES** |
| **wuwonline.com** | `*.wuwonline.com → wuwonline.com` | **YES** |
| **wuwonline.org** | `*.wuwonline.org → wuwonline.org` | **YES** |

**Control probe (pre-fix), every one of these returned app-host's signature 404:**

```
zqx9k2mail.israeljoffe.com   HTTP 404 ct=application/json  {"error":"No project matched hostname"}
zzq9ctl1.israeljoffe.com     HTTP 404 ct=application/json  {"error":"No project matched hostname"}
zzq9ctl2.wuwonline.com       HTTP 404 ct=application/json  {"error":"No project matched hostname"}
zzq9ctl3.israeljoffe.org     HTTP 404 ct=application/json  {"error":"No project matched hostname"}
zzq9ctl4.wuwonline.org       HTTP 404 ct=application/json  {"error":"No project matched hostname"}
```

Every scanner on the internet probing `mail.`, `cpanel.`, `wp-admin.`… on those four domains
cost one Worker invocation out of the account's shared 100,000/day bucket, and could trigger
`app-host`'s whole-table `projects` scan — the exact query that blew the D1 cap.

Neither wildcard was serving anybody. The only subdomain on any of those four zones is `www`,
which has its own explicit record, and there is not a single published app hostname on them
(the only app hostnames in the whole estate are `app-157`, `live-143`, `e2e-125`, `e2e-nope`
on fashionistas.ai). The wildcards could only ever produce `404 {"error":…}` or `522`.

---

## 3. The fix

1. **Deleted the 4 wildcard CNAME records.** Exact payloads backed up in
   `audit/wildcard-dns-backup-2026-09-29.json` (one `POST`/`PUT` each restores them).
2. **Attempted removal of the 4 portfolio Worker routes** — reverted on purpose:
   `wrangler.toml` declares them, and the next `./deploy.sh worker app-host` re-applied them,
   so local == live again. The routes are now inert because no DNS wildcard can reach them, and
   keeping them means a future hostname attach on those zones still works unchanged.
   Route inventory backed up in `audit/routes-backup-2026-09-29.json`.
3. **Fixed `app.fashionistas.ai`**, which was broken independently: it is a real CNAME straight
   to `fashionistas-ai.pages.dev`, but the `*.fashionistas.ai/*` route intercepted it and answered
   `404 {"error":"No project matched hostname"}`. `app` is in `RESERVED_HOST_LABELS`, so it can
   never be a published project — `canonicalApex()` now treats it like `www`.

### Proof the bots are gone

| Probe | Before | After |
|---|---|---|
| `zqx9k2mail.israeljoffe.com` | HTTP 404, app-host JSON | **HTTP 000, 1.1.1.1 = NXDOMAIN** |
| `zzq9ctl2.wuwonline.com` | HTTP 404, app-host JSON | **HTTP 000, 1.1.1.1 = NXDOMAIN** |
| `zzq9ctl3.israeljoffe.org` | HTTP 404, app-host JSON | **HTTP 000, 1.1.1.1 = NXDOMAIN** |
| `zzq9ctl4.wuwonline.org` | HTTP 404, app-host JSON | **HTTP 000, 1.1.1.1 = NXDOMAIN** |
| `www.israeljoffe.com` | HTTP 200 | HTTP 200 (unchanged) |
| wildcard count, all 8 zones | 4 | **0 (API-confirmed)** |

`HTTP 000` means the connection never happened — the request never reaches Cloudflare, so it
consumes **no Worker request, no D1 read, no CPU**.

### Nothing broke (all 200 after the change)

```
fashionistas.ai 427,029 B     app.fashionistas.ai 427,029 B (was 404)
app-157.fashionistas.ai 5,860 B   live-143.fashionistas.ai 2,310 B
createstuff.ai 108,928 B      app.createstuff.ai 108,928 B
placebets.ai 247,732 B        marketpicks.ai 337,949 B
israeljoffe.com 15,738 B      www.israeljoffe.com 15,738 B
israeljoffe.org 13,664 B      wuwonline.com 19,910 B
www.wuwonline.com 19,163 B    wuwonline.org 19,910 B
religiousjews.com 32,942 B    ketiservice.com 15,973 B
app-host/api/health 200       fashionistas-api/api/ebay/status 200
createstuff-api/api/health 200
404s honest: fashionistas.ai/nope-xyz → 404, marketpicks.ai/nope-xyz → 404
```

---

## 4. app-host request rate — control vs. after

Measured `app-host` invocations per hour (fix landed **14:33Z**):

```
2026-09-29T01    4221
2026-09-29T03    7016   ← one scanner burst
2026-09-29T06    2027
2026-09-29T10     651
2026-09-29T11     405
2026-09-29T13     167
2026-09-29T14      58   (fix landed mid-hour)
```

Pre-fix baseline over the measured window: **avg 1,553/hr**, range 30 → 7,016/hr, 24,841 total.
The traffic is spiky in a way human usage of four portfolio sites is not.

### Post-fix measurement (recorded 2026-09-29 15:47Z, ~74 minutes after the fix)

Because the hourly series is bursty, a single post-fix hour on its own would prove nothing — a quiet
hour would have happened anyway and a burst would have hidden the effect. So the comparison is made
**like for like**: the same 74-minute clock window (14:33Z → 15:47Z), one day apart, from the Workers
analytics GraphQL dataset.

| Window 14:33Z → 15:47Z | 2026-09-28 (pre-fix) | 2026-09-29 (post-fix) | Change |
|---|---:|---:|---:|
| **All Workers, account-wide** | 3,602 | 796 | **−77.9%** |
| **`app-host` only** | 3,562 | 568 | **−84.1%** |

Full days for context: 2026-09-28 = **51,056** account-wide requests; 2026-09-29 = **25,808** through
15:47Z (the fix landed at 14:33Z, so all but the last 74 minutes of that are pre-fix).

**What is causal and what is only correlated.** The percentages above are the *effect*; the *cause* is
a deterministic check that does not depend on traffic levels at all:

- Wildcard DNS records remaining across all 8 zones: **0** (was 4).
- Records whose first label is a scanner magnet (`mail`, `cpanel`, `webmail`, `ftp`, `smtp`, `imap`,
  `autodiscover`, `test`, `dev`, `admin`, …): **0**, across all **51** records / **23** proxied.
- `dig +short @1.1.1.1 cpanel.{israeljoffe.com,israeljoffe.org,wuwonline.com,wuwonline.org}` →
  **empty (NXDOMAIN)** on all four, while each zone's apex still resolves to Cloudflare
  (172.67.x.x / 104.21.x.x). A scanner probing a random label now stops at DNS: **0 Worker
  invocations, 0 D1 rows, 0 CPU ms**, where before it reached the Worker and got a `404`.

**What the remaining traffic is.** The 568 post-fix `app-host` requests are not a residue of the
wildcard mechanism, which by construction cannot fire any more. A 10-minute burst (15:05–15:15Z)
accounts for 498 of them, and the burst was **isolated to `app-host`** — in the same window
`createstuff-api` saw 5 requests, so it was not caused by this session's deploys. With no wildcards
and no magnet labels left, that traffic can only be reaching hostnames that genuinely exist (the 23
proxied records), i.e. bots path-scanning real hostnames — traffic the sites would receive whether or
not the wildcard existed. It is bounded and, importantly, **cheap**: it is served from the per-isolate
hostname cache and does not re-trigger the whole-table D1 read that caused the outage.

**The metric that actually took the sites down is healthy.** `scripts/d1-budget.py`, run at 15:47Z:

```
D1 reads today: 480,233 / 5,000,000 (10%) — marketpicks-db 406,829, createstuff-db 65,952, fashionistas-db 7,452
```

versus **5,133,584 (103%)** on 2026-09-27, the day every site on the account went dark until 00:00 UTC.

**Honest limits of this measurement.** 74 minutes is a short sample and the traffic is bursty, so the
day-over-day percentage is directionally strong but not a final figure; a full post-fix day
(00:00Z → 00:00Z) is the number that settles it. Workers analytics has **no hostname dimension**
(`AccountWorkersInvocationsAdaptiveDimensions` = cacheStatus, coloCode, date, datetime\*, 
dispatchNamespaceName, environmentName, isDispatcher, isPreview, previewSlug, scriptName, scriptTag,
scriptVersion, status, usageModel), and `CF_API_TOKEN` has no zone-analytics read, so per-hostname
attribution of the burst is not obtainable with the credentials in this repo — it is stated as
unattributed here rather than guessed at.

---

## 5. Other findings from the same audit

### 5.1 Cron configuration (free plan allows **5** per account — we use exactly 5)

| Worker | Cron | Notes |
|---|---|---|
| `createstuff-api` | `*/30` **and** `*/5` | publishes the shared D1 read-budget state |
| `marketpicks-ai-api` | `*/15` | 96 runs/day, **96/96 threw** |
| `placebets-scheduler` | `*/15` | 95 runs/day, **95/95 threw** |
| `site-cron-trigger` | `*/15` | fires **17 HTTP endpoints** per run |

> **Correction to an earlier read:** an initial pass reported "no worker has a cron trigger."
> That was a bug in my parser (`result.schedules` is nested one level deeper than I unwrapped).
> The raw `/schedules` responses are recorded above and are authoritative.

### 5.2 Two schedulers fail on *every single run* — **FIXED 2026-09-29**

Root cause found by calling all 23 cron endpoints directly:

| Endpoint | Control status (16:34–16:57Z) |
|---|---|
| `placebets.ai/api/cron/federation-health?quick=1` | **500** — `home: missing: World Cup and live cards, Latest prediction` |
| `placebets.ai/api/cron/scrape-live-sportsbooks` | **401** `{"error":"Unauthorized"}` |
| `marketpicks.ai/api/cron/earnings` | **500** — `rowCount: 0` |
| `marketpicks.ai/api/cron/housekeeping` | **500** — `home: missing: Live Congress Tracker…; unexpected: placeholder` |

Both schedulers collect their results and then `throw` if anything failed, so a single permanently
failing endpoint turns **every** run into `scriptThrewException`. That is 191 failed cron runs/day.

**Fixes and re-run (all measured live, go-ahead received):**

| What was actually wrong | Fix | Re-run |
|---|---|---|
| `scrape-live-sportsbooks` is the one placebets cron route that checks `Authorization`; the scheduler sent only `accept`. The `placebetsai` Pages project has **no `CRON_SECRET`** secret (only `GEMINI_API_KEY` / `GROQ_API_KEY`), so the route's `dev-secret` fallback was the value in force — now stated in `cron/wrangler.scheduler.toml` and sent. It had **never once returned 200**. | auth header added | 401 without header (auth intact) → **200** with it |
| `federation-health` wanted `"World Cup and live cards"` and `"Latest prediction"`, neither in the page (0 occurrences). A **second** failure was hidden behind it in the truncated body: the peer IPO check. | home phrases now match the rendered page; the peer failure was a real bug in `marketpicks-ai` (see below) | **200, 6/6 checks pass** |
| `marketpicks /api/cron/housekeeping`: wanted `"Live Congress Tracker"` (0 occurrences) and `"One engine. Every market."` (split across a `<span>`, so the literal can never match), and rejected the bare word `placeholder` — which matched the `placeholder="…"` attribute on the search input, 4× on each page. It was failing the page for having a working search box. | phrases split/updated; reject list is now `Lorem ipsum` / `coming soon` / `fake data` | **200, 6/6 checks pass** |
| `marketpicks /api/cron/earnings`: Nasdaq answered 200 with 15 items, none for the 9 tracked symbols, and the fallback's hardcoded dates are all in Jul/Aug 2026 — so 0 rows, and 0 rows meant `ok:false`. | `ok` now means *the feed answered and the writes ran*; `rowCount` stays 0 and honest with a `note` saying why. A dead/non-200 feed still 500s. | **200**, `rowCount 0`, `feedItems 6` |
| **Root cause behind the peer failure:** `marketpicks.ai/api/stock/SPCX` served `source: "live-yahoo-fallback"`, `149.22`, `"Space Exploration Technologies Corp."`. The IPO watch basket is *designed* to carry price 0, so it fell into the Yahoo fallback, which looked SPCX up as a listed symbol and stamped an unrelated quote onto it. | route skips the fallback for private-watch tickers | `source private-watch`, `companyName "IPO watch basket"`, `price 0` |

**The throw rule was the real bug.** A 5xx means the endpoint *ran* and reported a degraded upstream
source — `freshness` returns 500 whenever Google News or GDELT yields nothing for a minute. That is
the endpoint's health report, already in its own response and in D1 via `recordCronRun`. Both
schedulers now throw only when a call **never reached the site** (status 0) or **the request itself
was wrong and cannot self-heal** (4xx except 408/429) — the class that had been hiding the 401 all
along. Worker-local federation/housekeeping checks assert wording we wrote, so they always count.

**Re-run, exact control conditions:** placebets 16/16 HTTP 200 (0 failures), marketpicks 9/9 HTTP 200
(0 failures), `site-cron-trigger` 5/5. `scrape-live-sportsbooks` returns 200 but `booksScraped: 0` —
the scrapers find nothing, which is a separate problem from the auth that kept it from running, and
is **not** claimed as working.

**Second wave — the checks the first failure had been hiding (same day, after deploy).** Fixing a
check that fails *loudly* always reveals the ones behind it, and in this codebase they were worse:

| Check | What was actually wrong | Re-run |
|---|---|---|
| `placebets housekeeping` `home` (full mode only) | wanted `AI Signal Hive`, `Who wins?`, `Latest prediction` — **0 occurrences each** in the rendered page. Only ran on `mode=full`, so the control's `?quick=1` never reached it. | **PASS** after asserting `Bet Smarter` / `Odds Desk` / `Ask the Bookie` |
| `placebets housekeeping` `deep predictor` | read **`json.factors`**. The route returns **`key_factors`** — `factors` has never existed on any response, so the check **could not pass even on a perfect answer**. It also probed a hardcoded `q=Lakers tonight`, which only has data on days the Lakers play. | **PASS**: now probes with the matchup the odds board just returned, and asserts `key_factors` |
| `placebets housekeeping` `predictor fallback` | demanded **`suggestions`** *and* **`message`** — two fields no `/api/predict-deep` response has ever carried (it answers `follow_ups` + `answer`). **Could not pass, ever.** | **PASS**: asserts the real contract — an unknown query must be declined as `mode: honest_no_data` with a non-empty answer and follow-ups, i.e. *not hallucinated* |

Measured sequence for `housekeeping` full mode, all live: **500** (home) → **500** (predictor ×2,
after the home fix) → **200, 10/10 checks PASS**. `scrape-live-sportsbooks`' 401 and
`federation-health`'s 500 were the same disease: a check written against text and field names that
were never there.

### 5.3 Duplicate cron work — **FIXED 2026-09-29**

`site-cron-trigger` and `placebets-scheduler` both fire, every 15 minutes:
`ingest-games`, `ingest-espn-sports`, `refresh-espn-odds`, `market-data`, `freshness`,
`housekeeping`, `federation-health`, `grade-outcomes` — **8 endpoints run twice per cycle.**

The overlap was larger than this first pass found. Of `site-cron-trigger`'s 17 endpoints, **13** were
already owned by another worker with its own cron trigger: those 8, plus marketpicks
`news`, `ipo`, `econ`, `earnings` (all in `marketpicks-ai-api`'s `ingestPaths`) and `freshness`.

Its source was not in any repo — only deployed — which is why nobody could see the overlap. It is
now `workers/site-cron-trigger/index.js`, which documents ownership per endpoint.

**After: 17 → 4 endpoints per run.** `placebets-scheduler` owns 16 placebets jobs, `marketpicks-ai-api`
owns 8 marketpicks ingest jobs + freshness + grading, and `site-cron-trigger` owns only
`ingest-top-stories`, `daily-digest` (placebets) and `housekeeping`, `daily-digest` (marketpicks).
Every endpoint now has exactly one owner. Where `site-cron-trigger` had been firing the *full* mode
and the scheduler the *quick* mode, the scheduler alternates: quick every 15 minutes, full hourly.

**What this does and does not save.** Cloudflare meters *incoming* requests against the Workers
100,000/day quota, and cron invocations are unchanged (still 96/day each) — so this is **not** a
Workers-quota saving and is not claimed as one. What it removes is the duplicated work behind those
requests: duplicate upstream fetches (ESPN, TradingView, Google News, Nasdaq) against rate limits,
duplicate self-generated HTTP traffic against two sites with a handful of visitors, and duplicate
D1 reads against the 5M/day budget — the budget that was actually breached on 2026-09-27. D1 reads
are not separately metered per endpoint here, so no number is claimed.

### 5.4 1.5 MB fetched every 15 minutes — **FIXED 2026-09-29**

`placebets-scheduler` calls `placebets.ai/api/odds?record=1` just to log picks.
Measured response: **1,540,456 bytes**, 96×/day ≈ **144 MB/day**.

Three call sites, not one — `record-picks`, `federation-health`'s odds check, and `daily-digest`
(the last fired every 15 minutes by `site-cron-trigger`), plus `marketpicks`' own peer odds check.

`/api/odds?light=1` omits the `events` board and reports `eventCount` instead.

| | control | after |
|---|---:|---:|
| `?record=1&light=1` vs `?record=1` | 1,604,054 B | **60,925 B** (−96.2%) |
| one full 16-job scheduler run | 1,590,662 B | **67,772 B** (−95.7%) |
| one scheduler run × 96/day | ~152.7 MB/day | **~6.5 MB/day** |

Public payload is untouched: without the param the response still carries all 369 events, verified
before/after. `eventCount: 369`, `top: 12`, `source: sportsbook` with the param.

**What this does and does not save.** Cloudflare does not meter response bytes on the free tier, so
this is not a quota saving either — it is less CPU spent parsing a 1.5 MB JSON body on every call and
materially shorter runs. The quota-relevant item in this section is 5.3, and the quota-relevant
finding of the whole audit is §3 (wildcard DNS).

### 5.5 Bundle sizes

`marketpicks-ai` worker bundle is **4.18 MB** (startup limit is 1 second; `app-host` for
comparison is 30 KiB and starts in 2 ms).

### 5.6 A Worker cannot fetch a sibling Worker over `workers.dev` — error 1042

Discovered while verifying the de-duplicated trigger. A second session had added
`federation-watch` (the site monitor, which cannot have its own cron trigger — the free plan's
5 triggers are all taken) to `site-cron-trigger`'s endpoint list. It failed on **every run**:

```
{"url":"federation-watch.fashionistas1979.workers.dev/tick","status":404,"body":"error code: 1042\n"}
```

Three measurements separate the cause from the guesses:

| From | To | Result |
|---|---|---|
| this laptop | `GET federation-watch…/tick` | **200** `{"ran":…,"failing":0}` |
| `site-cron-trigger` (same account, same `fashionistas1979.workers.dev`) | same URL | **404** `error code: 1042` |
| `site-cron-trigger` | `placebets.ai`, `marketpicks.ai` (custom domains) | **200 × 4** |

So the target was healthy and public; only the *worker-to-worker* hop over the shared
`workers.dev` subdomain was refused. The endpoint now goes through a **service binding**
(`[[services]] binding = "FEDERATION_WATCH"`, in `workers/site-cron-trigger/wrangler.toml`), which
calls it in-process instead of over the public network.

**Control vs re-run:** `404 / error code: 1042` twice → re-run **5/5**, and the report now shows
`via=FEDERATION_WATCH` for that entry alongside `via=https` for the four custom domains.

---

## 6. Ownership note

`placebets-scheduler` lives in `Placebetsai-src/cron/worker.ts`.
`marketpicks-ai-api` lives in `marketpicks-ai/cron/worker.ts`.
Both are **other sessions' areas**. Findings 5.2–5.4 were reported here first and patched only after
an explicit go-ahead (2026-09-29), each with a control run captured *before* any change and a
re-run after deploy. Commits: `Placebetsai-src 337441c`, `marketpicks-ai fb517ab`.
`site-cron-trigger` had no source in any repo; it is now tracked at
`workers/site-cron-trigger/`.

Neither repo's other-session work was touched: `marketpicks-ai` still carries its uncommitted
`tsconfig.tsbuildinfo` and `scripts/*/__pycache__/`, and `nexus-ai-suite` still carries
`STATUS.html`, `extensions/crosslister/poshmark-post.js` and `workers/federation-watch/`.

## 7. Backups / rollback

- `audit/wildcard-dns-backup-2026-09-29.json` — exact record payloads + zone IDs to restore.
- `audit/routes-backup-2026-09-29.json` — full route inventory for all 8 zones.
- `app.fashionistas.ai` fix is a 12-line change to `canonicalApex()` in
  `workers/app-host/src/index.js`; `git revert` restores the old behaviour.
