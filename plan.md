# MCP Hive First Mission Plan

## Goal: Build Billion-Dollar Apps Using Free AI Models

> **🖥 LOCAL-FIRST (decided 2026-09-23).** No GitHub. This computer is the source of truth. Deploy = `wrangler` straight to Cloudflare via `./deploy.sh` reading `.secrets/cf.env`. Full live inventory of accounts/pages/workers/D1 in **FEDERATION.md**.

> **⚠️ CLOUDFLARE CREDENTIALS — stored 2026-09-23.** Raw tokens are in `.secrets/cf.env` (gitignored, chmod 600). DO NOT paste raw tokens into this repo (public). Load: `set -a; source .secrets/cf.env; set +a`.
> - CreateStuff app → account `2765cb2786006552f33cc3dfe0b680a1`, `CS_API_TOKEN` (dark-cell-ecf9)
> - All other Nexus apps → account `7eb89b01e9c3bec41ee24db8ecbe77f8`, `CF_API_TOKEN` (yellow-math-1874)
> - Both VERIFIED live 2026-09-23. See handoff.md → Credentials & Config.

### Phase 0: Audit (DONE 2026-09-23 — see AUDIT-REPORT.md)
- [x] Verify all 5 apps live (3 healthy, MarketPicks URL wrong, CreateStuff worker dead)
- [x] Frontend/worker out of sync; git repos don't match production
- [x] Hive rebuilt as REAL parallel opencode dispatcher (8/8 ack)

### Phase 1: Infrastructure (DONE)
- [x] Configure MCP Hive with 9 free models
- [x] Set up Cloudflare Pages deployment
- [x] Create GitHub repos for all apps
- [x] Deploy landing pages for all 5 apps
- [x] Add credentials to portfolio sites

### Phase 2: Backend (TODO)
- [ ] Set up Supabase for auth + database
- [ ] Create Cloudflare Workers for API endpoints
- [ ] Implement user authentication (email + OAuth)
- [ ] Set up database schemas for each app
- [ ] Create API routes for CRUD operations

### Phase 3: Real Data (TODO)
- [ ] Integrate The Odds API for PlaceBets.ai
- [ ] Integrate Alpha Vantage for MarketPicks.ai
- [ ] Integrate Poshmark/eBay APIs for Fashionistas.ai
- [ ] Create content for IHateCollege.com courses
- [ ] Build code execution sandbox for CreateStuff.ai

### Phase 4: AI Integration (TODO)
- [ ] Connect MCP hive models to CreateStuff for code generation
- [ ] Connect Muse Spark to Fashionistas for listing descriptions
- [ ] Connect Ling 3.0 Flash to PlaceBets for bet analysis
- [ ] Connect MiMo V2.5 to CreateStuff for debugging
- [ ] Connect Nemotron Ultra to MarketPicks for stock analysis

### Phase 5: Mobile (TODO)
- [ ] Build Kotlin Android app for CreateStuff
- [ ] Build Kotlin Android app for Fashionistas
- [ ] Build Kotlin Android app for PlaceBets
- [ ] Build Kotlin Android app for MarketPicks
- [ ] Build Kotlin Android app for IHateCollege

### Phase 6: Polish (TODO)
- [ ] Add OG meta tags to all apps
- [ ] Add canonical URLs
- [ ] Add keyboard accessibility
- [ ] Add error handling
- [ ] Add analytics
- [ ] Create help documentation
