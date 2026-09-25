# Architecture verdict — is this the cheapest, most scalable shape?

Written after deep research against Cloudflare's published limits (checked Sept 2026)
and against load tests we ran on our own live workers. Numbers in **[brackets]**
are measured on our deployment; everything else is cited.

---

## 1. What we run

| Piece | Kind | Bindings | Why it exists |
|---|---|---|---|
| `createstuff-api` | Worker | D1, KV | auth, projects, AI generate/publish |
| `app-host` | Worker | D1, KV | serves generated sites, attaches domains + DNS |
| `fashionistas-api` | Worker | D1, KV, R2 | resale tool API, 38 routes |
| `createstuff-marketing` | Pages | — | the builder UI (`createstuff.ai`, `app.createstuff.ai`) |
| `fashionistas` / `fashionistas-ai` | Pages | — | the seller UI (`fashionistas.ai/app`) |

Everything is on the **Workers Free plan** today. Total infrastructure bill: **$0**.

---

## 2. Is Cloudflare the cheapest option? Yes — confirmed.

Free tier, verified against Cloudflare's own pricing/limits docs:

| Resource | Free allowance | Enforcement |
|---|---|---|
| Workers requests | **100,000 / day** | hard — Error 1027 past the cap |
| Workers CPU | **10 ms / request** | hard |
| Workers subrequests | 50 / request | hard |
| Workers per account | 100 | — |
| D1 rows read | **5,000,000 / day** | **hard failure since 1 Sept 2026** |
| D1 rows written | **100,000 / day** | **hard failure since 1 Sept 2026** |
| D1 storage | 5 GB / account, **500 MB / database** | — |
| D1 queries per invocation | **50 (Free)** vs 1000 (Paid) | hard |
| KV keys read | 100,000 / day | hard |
| KV keys written / deleted | 1,000 / day | hard |
| Pages builds | 500 / month; static requests unmetered | — |

Paid step-up is **$5/month** for Workers, which includes 10M requests and
30M CPU-ms, then $0.30/M requests. D1 paid includes 25B rows read and 50M rows
written per month before any overage.

**Verdict:** no other provider gives this much at $0. Vercel/Netlify/Render all
meter dynamic requests on their free tiers; Fly and Railway have no meaningful
free tier. Cloudflare is correct for us.

---

## 3. The honest free-tier ceiling (this is the part people get wrong)

Taking the **binding** constraint — whichever limit runs out first:

```
Workers:   100,000 req/day  ->  1.16 req/s average, all day
D1 reads:  5,000,000/day    ->  ~50 req/day per request if every request read 100 rows
KV reads:    100,000/day    ->  1.16 key reads/s
```

**Workers' 100,000 requests/day is the binding limit.** It equals
**1.16 requests/second** sustained. Our own load tests already blew past it:

| Test we ran | Rate | vs 100k/day cap |
|---|---|---|
| app-host static | **73.7 rps** | 63.7× over |
| fashionistas health | **424.3 rps** | 366× over |
| createstuff-api health | **341.1 rps** | 294× over |
| D1 read, concurrency 100 | **91.8 rps** | 80× over |

So: **free is genuinely enough to launch and to serve early users, and nothing
more.** The moment real traffic arrives, the answer is Workers Paid at $5/month,
which covers ~333,000 requests/day before any overage — roughly $5/month for a
product at that scale. That is still the cheapest architecture available.

Two second-order traps worth knowing:

1. **KV free allows only 1,000 writes/day and 1,000 deletes/day.** Any design
   that writes KV on every request dies instantly. Read-heavy caching is fine;
   write-through on the hot path is not.
2. **D1 free allows only 50 queries per Worker invocation.** `createstuff-api`
   has 47 `.prepare(` call sites and `fashionistas-api` has 35. Those are call
   sites, not per-request counts, but the headroom on Free is thin — a route
   that loops over rows issuing one query per row will hit the ceiling.

---

## 4. Is it the fastest shape? Not yet — and we can name exactly why.

D1 is **not** a distributed database. Cloudflare's own architecture notes: each
D1 is a Durable Object fronted by a Worker proxy running a **single-threaded
SQLite instance**, and *"reads from distant locations pay latency to reach the
primary."* The documented 10 GB ceiling is described as *"a signal that
horizontal scaling is the intended pattern"* — i.e. **many small per-tenant
databases, not one big one**.

Our measurements line up with that exactly:

| Test | Result |
|---|---|
| D1 read, concurrency 25 | **61.5 rps, p50 409.8 ms** |
| D1 read, concurrency 100 | **91.8 rps, p50 1003.4 ms** |
| app-host static, KV **hit** | `Server-Timing: kv;dur=3` |
| app-host static, KV **miss** | `Server-Timing: d1;dur=40–68` |

Read latency grows ~2.5× as concurrency goes 25 → 100. That is the signature of
a single-threaded primary, not of our query tuning.

### The three fixes, in order of payoff per unit of risk

1. **Push reads into KV.** Already proven on `app-host`: **3 ms** on a hit vs
   **40–68 ms** on a D1 miss, and it lifted static throughput 55.5 → 73.7 rps
   with p50 423.6 → 286.4 ms. Cloudflare's guidance is explicit: *"At scale,
   millions of KV reads cost far less than millions of D1 queries."*
   Extend the same two-layer cache to the remaining read-heavy routes.
2. **Use D1 read replication** (`env.DB.withSession()`). This is Cloudflare's
   own answer to read latency — replicas serve reads near the caller and the
   Sessions API guarantees you still see your own recent writes. One production
   report put p99 read latency at **8 ms** vs 45 ms on a rival edge DB.
   *Status: researched, not yet implemented on our workers.*
3. **Per-tenant databases** at the point where a single database stops being
   enough. Cloudflare explicitly designs D1 for *"per-user, per-tenant or
   per-entity databases."* This is also the shape that matches the product
   direction of giving each user their own isolated agent workspace.

**Do not do this:** replace D1 with a rented Postgres. It would add a monthly
bill, add a cold-start/connection problem at the edge, and lose the
zero-config binding we already have. Nothing in the measurements justifies it.

---

## 5. Multi-agent generation (why not do what Replit does)

Replit's published shape: a **manager / editor / verifier** trio, with a planner
delegating to code writers and test runners, tasks split into forks, run
concurrently, then merged — *"specialized agents (manager, editor, verifier)"
maintaining ~90% tool-invocation success, using code-based tool calls, memory
management and state replay.*

We can express that with **free** components only:

| Replit role | Ours | Cost |
|---|---|---|
| Manager / planner | 1 cheap Workers AI call → structured spec (sections, features, palette) | free tier |
| Editor / writer | the existing `@cf/qwen/qwen2.5-coder-32b-instruct` call | free tier |
| Verifier | `qualityFlags()` — a **rule-based** verifier that already exists and needs no model at all, plus a repair call only when it flags something | free tier |

Measured today: generation is **one** call, **105.66 s**, 3 files, 11,354 chars,
`quality=clean`. Adding a planner and a conditional repair pass is additive and
can fall back to the current single-call path if either stage fails.

**Honest caveats:**
- Three model calls consume Workers AI free allowance faster than one. Within
  the free daily neuron budget, but it is not free in the unlimited sense.
- Multi-agent is slower wall-clock unless stages run in parallel.
- Replit's ~90% figure is theirs, on their harness. Ours is untested.

---

## 6. Decisions

| Question | Answer |
|---|---|
| Cheapest architecture? | **Yes — confirmed.** $0 today, $5/month when traffic is real. |
| Best for scale? | **Yes, with the fixes in §4.** The shape is right; the read path is not yet. |
| Free tier enough? | **To launch: yes. Ceiling: 100k req/day = 1.16 rps.** Beyond that, $5/month. |
| Biggest actual risk | D1 single-threaded primary → p50 1 s at concurrency 100. Fix with KV + read replication. |
| Free-tier landmine | 50 D1 queries/invocation, 1k KV writes/day, hard D1 row caps since 1 Sept 2026. |
| Multi-agent? | Doable for $0 using manager/editor/verifier on Workers AI + the existing rule verifier. |
| What would be *wrong* | Adding a hosted Postgres, or assuming free tier survives a real launch. |

Anything marked *not yet implemented* or *untested* above has not been deployed
and has not been measured.
