# TODO — both apps (2026-09-25)

Status legend: `TODO` not started · `WIP` agent working · `DONE` verified live · `BLOCKED` cannot proceed

Every item names the agent that owns it. No item is DONE until a live HTTP/browser number is pasted next to it.

---

## A. CREATESTUFF — make it actually do something

| # | Task | Agent | Model (all $0) | Status | Proof |
|---|------|-------|----------------|--------|-------|
| C1 | **Fix the 9 dead buttons** found by audit: `Create one free`, preview-mode toggle ×2, `Download ZIP`, `+ New file`, `Save file`, `Connect it`, `Save`, `Save keys` — wire each to a real handler or remove it | **Forge** | nemotron-3-ultra-free | TODO | audit must return DEAD: 0 |
| C2 | **Put the finished app in the user's face.** After build+publish, one unmissable panel: live URL + big **OPEN YOUR APP** button that persists | **Forge** | nemotron-3-ultra-free | TODO | browser: link present, 200 |
| C3 | **Cut the Launch A→Z wall of text.** Same 7 steps, ~70% less prose, collapse to accordions | **Scribe** | space-bunny-free | TODO | byte count + screenshot |
| C4 | **Make the Hive agents real, not labels.** Planner/Frontend/Online must have actual tools (read files, write files, publish) and refuse/redirect when asked something it cannot do (e.g. "log into my GitHub") | **Atlas** | mimo-v2.6-flash-free | TODO | e2e: ask non-build question → honest answer |
| C5 | **GitHub connection** (repo: `placebetsai`) — real OAuth or PAT, import + push | **Forge** | nemotron-3-ultra-free | TODO | 200 on repo list |
| C6 | Per-user OpenCode Hive: automated provisioning of a personal free-model roster | **Nexus** | nemotron-3.5-lightning-free | TODO | BLOCKED — needs design decision |
| C7 | Logos + animated background + animated words on marketing + app shell | **Pictor** | muse-spark-1.2-contributor-free | TODO | sha256 match live |

## B. FASHIONISTAS — it has no buyer side

| # | Task | Agent | Model (all $0) | Status | Proof |
|---|------|-------|----------------|--------|-------|
| F1 | **Buyer marketplace view** — browse every live listing: photo, price, seller, condition, where else it's listed | **Vogue** | muse-spark-1.3-contributor-free | TODO | browser: grid renders rows |
| F2 | **Listing detail + Buy** → demo checkout (Stripe/PayPal labelled DEMO, nothing charged) | **Vogue** | muse-spark-1.3-contributor-free | TODO | order row written, 201 |
| F3 | **"Sell it here too" toggle** — adds `fashionistas` to `platforms`, makes a seller's item appear in F1 | **Vogue** | muse-spark-1.3-contributor-free | TODO | item appears in market |
| F4 | **Public market API** `GET /api/market` + `GET /api/market/:id` (no auth) | **Atlas** | mimo-v2.6-flash-free | TODO | 200 unauthenticated |
| F5 | **Fix the camera** — test for real on fashionistas.ai (last attempt ran on a createstuff tab, invalid) | **Mnemonic** | space-bunny-free | TODO | actual getUserMedia result |
| F6 | Seller screen vs buyer screen — plain-language top switch ("I'm selling / I'm shopping") | **Pictor** | muse-spark-1.2-contributor-free | TODO | screenshot |
| F7 | Only Stripe/PayPal may be fake. Everything else must return real data. Sweep for stubs | **Sentinel** | nemotron-3-ultra-free | TODO | list of every stub found |

## C. Cross-cutting

| # | Task | Agent | Status |
|---|------|-------|--------|
| X1 | Watchdog: check every agent every 30s, kill+reassign on timeout | Curator | WIP |
| X2 | Nothing marked DONE without a live number | Mnemonic | standing rule |

---

## Agent roster (Nexus Hive, all free — $0.00 in/out)

| Agent | Role | Model |
|---|---|---|
| Atlas | Full-stack lead, both apps | mimo-v2.6-flash-free |
| Vogue | Fashionistas specialist | muse-spark-1.3-contributor-free |
| Pictor | Brand, logos, design | muse-spark-1.2-contributor-free |
| Forge | CreateStuff engine | nemotron-3-ultra-free |
| Nexus | Infra, deploy, D1 schema | nemotron-3.5-lightning-free |
| Mnemonic | QA at scale | space-bunny-free |
| Sentinel | Security / code review | nemotron-3-ultra-free |
| Curator | Docs + watchdog | ling-3.0-flash-fin-free |
| Ledger | Marketplace economics | ling-3.0-flash-fin-free |
| Scribe | Copy + SEO | space-bunny-free |
