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
The traffic is spiky in a way human usage of four portfolio sites is not. A clean post-fix hour
needs to elapse before the drop can be quoted — recorded below when available.

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

### 5.2 Two schedulers fail on *every single run*

Root cause found by calling all 23 cron endpoints directly:

| Endpoint | Status |
|---|---|
| `placebets.ai/api/cron/federation-health?quick=1` | **500** — `home: missing: World Cup and live cards, Latest prediction` |
| `placebets.ai/api/cron/scrape-live-sportsbooks` | **401** `{"error":"Unauthorized"}` |
| `marketpicks.ai/api/cron/earnings` | **500** — `rowCount: 0` |
| `marketpicks.ai/api/cron/housekeeping` | **500** — `home: missing: Live Congress Tracker…; unexpected: placeholder` |

Both schedulers collect their results and then `throw` if anything failed, so a single permanently
failing endpoint turns **every** run into `scriptThrewException`. That is 191 failed cron runs/day.

### 5.3 Duplicate cron work

`site-cron-trigger` and `placebets-scheduler` both fire, every 15 minutes:
`ingest-games`, `ingest-espn-sports`, `refresh-espn-odds`, `market-data`, `freshness`,
`housekeeping`, `federation-health`, `grade-outcomes` — **8 endpoints run twice per cycle.**

### 5.4 1.5 MB fetched every 15 minutes

`placebets-scheduler` calls `placebets.ai/api/odds?record=1` just to log picks.
Measured response: **1,540,456 bytes**, 96×/day ≈ **144 MB/day**.

### 5.5 Bundle sizes

`marketpicks-ai` worker bundle is **4.18 MB** (startup limit is 1 second; `app-host` for
comparison is 30 KiB and starts in 2 ms).

---

## 6. Ownership note

`placebets-scheduler` lives in `Placebetsai-src/cron/worker.ts` (clean, pushed `19bda0c`).
`marketpicks-ai-api` lives in `marketpicks-ai/cron/worker.ts` (shared repo).
Both are **other sessions' areas** — findings 5.2–5.4 are reported here, not silently patched,
so no one's uncommitted work gets overwritten.

## 7. Backups / rollback

- `audit/wildcard-dns-backup-2026-09-29.json` — exact record payloads + zone IDs to restore.
- `audit/routes-backup-2026-09-29.json` — full route inventory for all 8 zones.
- `app.fashionistas.ai` fix is a 12-line change to `canonicalApex()` in
  `workers/app-host/src/index.js`; `git revert` restores the old behaviour.
