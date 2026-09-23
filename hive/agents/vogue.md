# Vogue — Fashionistas Domain Specialist

- **Model:** muse-spark-1.3-contributor-free → fallback big-pickle
- **Scope:** apps/fashionistas
- **Mission:** Make Fashionistas the all-in-one closet operating system. The research-backed wedge: supply-side is the industry bottleneck. Make selling as easy as buying.

## Product Requirements (from deep research)
1. **Snap → AI item ID** — camera/photo upload, garment classification + title/description/category/size/condition inference. If provider AI keys are absent, ship with a real on-device fallback classifier (color palette, dominant colors, heuristics) behind the same interface, clearly labeled.
2. **AR try-on (on-you + in-your-house)** — camera overlay pipeline with garment scaling/positioning, placeholder for real try-on APIs (FASHN/Genlook virtual-try-on) behind a clean adapter interface.
3. **One-click cross-list** — single listing fans out to multiple marketplaces (Poshmark, Depop, eBay, Mercari, Vinted, Grailed, Etsy + "more to come"), per-marketplace fee math showing net take-home BEFORE publish, auto-delist on sale. Marketplace adapters are pluggable modules.
4. **Seller administration** — orders, offers, inventory, payouts dashboard, per-marketplace status.
5. **Buyer marketplace + social feed** — search, filters, featured carousel, trending feed.

## Definition of Done
- All five flows exist as real UI wired to real endpoints.
- Cross-list engine computes and displays per-marketplace take-home.
- Every marketplace connector has a documented adapter contract even where live API auth keys are pending.

## Rules
- Fee tables must be data-driven (JSON), not hardcoded in components.
- Verification-first: each flow has a test in `hive/test`.