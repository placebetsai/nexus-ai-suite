# LIVE INSPECTION — 2026-09-23
Independent audit of every claimed artifact in handoff.md. No assumptions, all live HTTP + git checks.

## 1. Frontends (Cloudflare Pages)

| URL (handoff) | Live now | Detail |
|---|---|---|
| createstuff-ai.pages.dev | 200 | 10.7KB landing. Smaller than handoff's 108KB claim → older build displaced |
| fashionistas-ai.pages.dev | 200 | 21KB + 44KB app.js. RICHER than handoff's 112KB single-file. References /api/ai/analyze, /api/listings, /api/orders, /api/hauls, /api/analytics, /api/blog, /api/fees/estimate |
| placebets-api.pages.dev | 200 | 90KB SPA — matches handoff claim |
| marketpicks-api.pages.dev | **404** | WRONG URL in handoff. Real app: marketpicks-ai.pages.dev = 200, 248KB SPA |
| ihatecollege-com.pages.dev | 200 | 79KB SPA — matches |
| israeljoffe.com | 200 | portfolio OK |

## 2. Worker APIs

| Worker | Route tested | Result |
|---|---|---|
| createstuff-api…/api/templates | 401 | **BROKEN — every route 401 incl / , /health, /api/auth/signup.** Whole worker gated/errored. Cannot use. |
| fashionistas-ai…/api/marketplaces | 200 | working (matches handoff) |
| fashionistas-ai…/api/auth/signup | 201 | working, D1 persists (user id 9 created) |
| fashionistas-ai…/api/auth/login | 200 | returns token |
| fashionistas-ai…/api/ai/analyze | **404** | frontend calls it, worker has no route |
| fashionistas-ai…/api/fees/estimate | **404** | frontend calls it, worker has no route |
| fashionistas-ai…/api/listings | 401 (auth required) | correct auth behavior, but is this the full listing flow? |
| fashionistas-ai…/api/orders, /api/hauls, /api/analytics, /api/blog, /api/export/* | **404** | frontend calls ALL, worker has NONE |
| placebets-api-worker…/api/odds/nfl | 200 | working |
| marketpicks-api.pages.dev/api/* | **404** | whole project URL wrong/absent |
| ihatecollege-com.pages.dev/api/paths | 200 | working |

## 3. Key finding: FRONTEND AND WORKER ARE OUT OF SYNC
Live Fashionistas frontend (44KB app.js) calls ~20 API routes the deployed worker does NOT implement. GitHub repos placebetsai/fashionistas-ai and createstuff-ai contain only the OLD small landing-page builds (~7KB) — the rich deployed builds are NOT in git anywhere, they exist only as deployed artifacts + temp_*.html. **No source of truth.**

## 4. CreateStuff worker = fully broken
100% of routes return 401 UNAUTHORIZED, including `/`, health, signup. Cannot be "verified 42/42" as written. Either a Cloudflare-side access rule or the worker code gates everything.

## 5. Hive (rebuilt this session)
8/8 agents ack in parallel, 19/19 readiness tests pass. Dispatch engine real + fallback. Verified.

## Verdict
- **Healthy:** PlaceBets, IHateCollege, MarketPicks(ai), portfolio; Fashionistas worker auth+marketplaces.
- **Dead/broken:** CreateStuff worker (all 401), MarketPicks handoff URL (404).
- **Orphaned/mismatched:** Fashionistas frontend vs worker routes; git repos don't match production; initial MCP-hive was a simulation.
- **Needs keys:** no Cloudflare token on this machine; none in plan.md/CLAUDE.md/env. Account id 7eb89b01e9c3bec41ee24db8ecbe77f8 (fashionistas1979), workers on fashionistas1979.workers.dev.