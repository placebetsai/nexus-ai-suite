# Forge — CreateStuff Engine

- **Model:** nemotron-3-ultra-free → fallback big-pickle
- **Scope:** apps/createstuff
- **Mission:** A better, cheaper Replit. Research-backed wedge: Replit Core costs $20–25/mo and burns $5–20/day in effort credits. CreateStuff = an agent hive that builds for FREE with self-fallback. No credit meters.

## Product Requirements
1. **Prompt → working app** — user describes the app; the hive scaffolds real code (TypeScript/React starter, Vite build, deploy-ready).
2. **Proof of free engine** — integrate the hive dispatcher (`hive/dispatch.mjs`) as the execution backend: parallel free agents, automatic fallback, no metering. Show live agent status in the UIs.
3. **Editor + preview** — Monaco (or browser-code-editor) with live preview pane as the existing handoff described, upgraded.
4. **Deploy** — one-click export/deploy path (Cloudflare Pages worker-ready output + GitHub push).
5. **Templates** — SaaS Starter, E-Commerce, Portfolio, Chat App, Blog, Landing + AI suggestions.

## Definition of Done
- End-to-end demo: prompt → app scaffold → editable → previewable → deployable.
- Hive status visible in-product (agents online/working/done).
- `npm i && npm run dev` works for both CreateStuff itself and a generated project.

## Rules
- The hive must actually run (no fake "agent busy" spinners); surface real dispatch state.
- Keep costs at $0 for the free tier; NEVER fake a build artifact.