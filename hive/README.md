# 🐝 Nexus MCP Hive — parallel work across ALL free OpenCode models

**Status:** v3.0.0 · verified 2026-09-24 · 10/10 agents · 8/8 free models · **32/32 tests pass**

A real [Model Context Protocol](https://modelcontextprotocol.io) server that fans work out
across a swarm of agents, each backed by a **$0.00 OpenCode model**. Every call forks a real
`opencode run` process — nothing here is simulated.

---

## Why v3 exists (the bug that made v1/v2 fake)

The old hive claimed "8/8 agents acked in parallel." It was an illusion:

| | Old (v1/v2) | New (v3) |
|---|---|---|
| Model prefix | `opencode-zen/<model>` ❌ errors | `opencode/<model>` ✅ works |
| Readiness output | `model: "default"` on **all 8** | `model: opencode/<id>` on **all 10** |
| `mcp-hive/` | `// ── Simulated Model Execution ──`, `Bearer demo` | real JSON-RPC MCP server |
| Model list | included `mimo-v2.5-free`, `jev-1.13-free`, `union-alpha` — **none exist** | only the 8 verified free ids |
| Parallel proof | none | measured: **5.2×–8.3×** vs serial |

The `opencode-zen/` prefix returns `Unexpected server error`, so every single call silently
fell through to the default model. The swarm was one model answering ten times.

---

## The 8 verified free models (all $0.00 in / $0.00 out)

```
opencode/space-bunny-free
opencode/mimo-v2.6-flash-free
opencode/muse-spark-1.3-contributor-free
opencode/ling-3.0-flash-fin-free
opencode/nemotron-3.5-lightning-free
opencode/muse-spark-1.2-contributor-free
opencode/nemotron-3-ultra-free
opencode/big-pickle
```

Verified by running `opencode run --model opencode/<id>` against each one — 8/8 ACKed.

## The 10 agents

| Agent | Model | Scope |
|---|---|---|
| **Atlas** | mimo-v2.6-flash-free | Full-stack lead (both apps) |
| **Vogue** | muse-spark-1.3-contributor-free | Fashionistas: AI item-ID, AR, cross-listing |
| **Pictor** | muse-spark-1.2-contributor-free | Brand, design system, SVG, OG assets |
| **Forge** | nemotron-3-ultra-free | CreateStuff engine, editor, build pipeline |
| **Nexus** | nemotron-3.5-lightning-free | Architecture, wrangler, D1 schema, deploy |
| **Mnemonic** | space-bunny-free | QA: test suites, contract tests, a11y |
| **Sentinel** | nemotron-3-ultra-free | Security + code review |
| **Curator** | ling-3.0-flash-fin-free | Memory, handoff sync, changelogs |
| **Ledger** | ling-3.0-flash-fin-free | Marketplace fee math, unit economics |
| **Scribe** | space-bunny-free | SEO, meta/OG/JSON-LD, copy |

Each has a brief in [`agents/`](./agents/) and an automatic fallback model, so a single
model outage never stalls a job.

---

## Usage

### As MCP tools (registered in OpenCode)

```bash
opencode mcp add hive -- node hive/mcp-server.mjs   # already added
opencode mcp list                                    # → ✓ hive connected
```

| Tool | What it does |
|---|---|
| `hive_status` | Roster: every agent, model, role, workstream |
| `hive_models` | The 8 verified free model ids |
| `hive_readiness` | Probe all agents in parallel; reports latency + primary-vs-fallback |
| `hive_dispatch` | **One prompt → many agents at once** |
| `hive_fanout` | **Many different prompts → many agents at once** (max throughput) |
| `hive_run` | One prompt on one specific model |

### From the CLI

```bash
node hive/dispatch.mjs                                   # readiness probe
node hive/dispatch.mjs "prompt" --all                    # same prompt → all agents
node hive/dispatch.mjs "prompt" --agents atlas,vogue     # subset
node hive/dispatch.mjs --file hive/tasks/fanout-demo.json # unique task per agent
node hive/dispatch.mjs --models                          # list free models
```

### Fan-out file format

```json
[ { "agent": "atlas", "prompt": "…" }, { "agent": "vogue", "prompt": "…" } ]
```

---

## Verified results

**Readiness (10 agents):**
```
10/10 acked · 10/10 on PRIMARY model · 17,321ms wall
serial would be 143,307ms  →  8.3× parallel speedup
```

**MCP protocol conformance:** `node hive/test/mcp-protocol.test.mjs` → **29 pass / 0 fail**
— covers `initialize`, `ping`, `tools/list`, `tools/call`, unknown tool (`-32602`),
unknown method (`-32601`), model validation, and a live parallel pair.

**Full readiness:** `node hive/test/readiness.test.mjs` → **32 pass / 0 fail**

**Real fan-out (10 distinct tasks):** 10/10 ok, 117,851ms wall vs 370,363ms serial → **3.1×**

---

## Files

```
hive/
├── hive.json                 # roster: 10 agents, 8 free models, verified prefix
├── models.mjs                # canonical model registry + output cleaner
├── dispatch.mjs              # CLI parallel dispatcher (bounded pool + fallback chain)
├── mcp-server.mjs            # REAL MCP server (JSON-RPC 2.0 over stdio)
├── agents/*.md               # 10 agent briefs
├── tasks/fanout-demo.json    # sample 10-way fan-out
├── output/                   # readiness.json, batch-result.json, dispatch-result.json
└── test/
    ├── mcp-protocol.test.mjs # 29 protocol assertions
    └── readiness.test.mjs    # 32 manifest + live-probe assertions
```

`mcp-hive/deprecated/` holds the old simulated orchestrator, kept only for history.

## Design notes

- **Bounded pool** (`parallelism: 10`) — never fork-bombs the box.
- **Fallback chain** primary → fallback → `default`, and results honestly report
  `degraded: true` when a fallback served instead of the primary.
- **stderr is for logs, stdout is for JSON-RPC** — the MCP transport stays clean.
- **ANSI + `> build · model` banner stripped** from model output before returning.
