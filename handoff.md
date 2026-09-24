# 🐝 NEXUS-AI-SUITE — HIVE HANDOFF
Generated: 2026-09-23 · Repo: /home/joffe/projects/nexus-ai-suite (local, no remote needed)

## MISSION (verbatim)
"Two flagship apps (Fashionistas.ai + CreateStuff.ai) rebuilt for REAL — web first, then Android.
Deployed on Cloudflare's free/cheap infrastructure. **No fake scaffolding, no canned fallbacks, no lies.
Every feature is a real, live, testable URL on this machine.**" (handoff.md:5)

## WHAT IS LIVE RIGHT NOW (verified 200 this session)
| App | Frontend | API | Status |
|-----|----------|-----|--------|
| Fashionistas | https://fashionistas-ai.pages.dev | https://fashionistas-api.fashionistas1979.workers.dev | ✅ 200 · real vision llama-3.2-11b |
| CreateStuff | https://app.createstuff.ai | https://api.createstuff.ai | ✅ 200 · custom domain · real JWT |

- Fashionistas REAL register: created user id 32 in prod DB this session.
- CreateStuff REAL register: returned live JWT from prod DB this session.
- Both APIs auth-gated (Unauthorized on bare curl = real security wall, not fake success).
- 6 marketplaces supported: Depop, eBay, Poshmark, Mercari, Vinted, Grailed (near-prebuilt cross-listing, no marketplace APIs needed).

## STACK (100% free, scalable)
- Cloudflare Workers + Pages (free tier, auto-scaling, no VPS) — scale is Cloudflare's problem.
- AI: real llama-3.2-11b-vision-instruct (source:"ai", NO fake fallback) · BYOK optional.
- Agents: opencode free (MIT) + hive/dispatch.mjs parallel dispatch, fallback to default free model.
- DB: Cloudflare D1 (SQLite). Exports: real CSV (orders/inventory). Blog: real posts via created_at.

## HIVE
- hive/hive.json — agent roster (atlas, vogue, pictor, forge, nexus, mnemonic, sentinel, curator, …).
- hive/dispatch.mjs — parallel dispatch: `node hive/dispatch.mjs "prompt" --all` or `--file batch.json`.
- THIS session: fired real parallel batch (hive/tasks/zz-wizard.json) → Vogue→Fashionistas A→Z guide,
  Forge→CreateStuff phone-first + BYOK. One app per agent = no file collisions.
- Freeze: do NOT casually overwrite fashionistas-api / api.createstuff.ai (prod).

## STATUS / OPEN ITEMS
- ✅ Both frontends rebuilt + deployed + E2E verified 200.
- ✅ Real vision, real auth, real DB, real CSV export, real blog.
- ✅ Phone-first CreateStuff: create/rebuild/maintain/publish from phone (360px + real publish URL).
- ⏳ Android: parked (web first; user's call).
- ⏳ 67GB on C: — outside WSL (~889MB) and repo (~78MB); Windows-side check pending user preference.

## REPAIR/TOUCH PROTOCOL
- Only touch apps/<app>/index.html (single-file SPA). Verify with `node --check <extracted js>`.
- Reuse existing functions (doLogin, crosspost, markSold, renderSnap, identifyItem, publish…). No rename/delete.
- Always curl the prod URL after deploy; always report the exact live link + HTTP code.
