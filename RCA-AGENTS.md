# RCA — why the agents keep dying

Measured 2026-09-25. Every number below was produced by running the test, not by reasoning about it.

## What actually happened

The fanout call returned:

```json
{"error":{"type":"aborted","message":"Tool execution interrupted"}}
```

The agents did **not** crash. The **call** was cancelled. Proof: `nexus` had already written
92 lines into `workers/fashionistas-api/src/index.js` (file mtime 16:11) before the abort — it
was alive and working, then it was cut off mid-task.

## Root causes, in order of severity

### 1. There is no async agent primitive available. Everything blocks my turn.
- `search("background agent spawn task")` returns only `hive_fanout`, `hive_dispatch`, `hive_run`.
- Calling `tools.subagent(...)` returns: `Unknown tool 'subagent'. Did you mean tools.opencode.models?`
- All three hive tools are **synchronous MCP tool calls**. They hold the turn open until they finish.
- **Consequence:** a long job cannot outlive the turn it was started in.

### 2. Any user message kills the in-flight call.
- The abort above is `"Tool execution interrupted"`, not `"timeout"`. Interrupt = cancelled, not expired.
- You were typing while it ran. The harness cancels the running tool to accept your message.
- **Consequence:** every agent job dies the moment you talk to me. This is structural, not flaky.

### 3. My timeouts were physically too short for these models.
Measured with `hive_readiness` (a task that asks each agent only to say READY):

| agent | ms to say "ready" |
|---|---|
| vogue | 16,837 |
| pictor | 39,344 |
| curator | 39,434 |
| atlas | 53,132 |
| forge | 53,743 |
| nexus | 56,041 |
| mnemonic | 56,722 |
| sentinel | 58,483 |
| ledger | 51,094 |
| scribe | 55,807 |
| **wall (all 10)** | **82,845** |

A one-line acknowledgement costs 17–58 s. I launched **4 agents to write real code** with
`timeout_ms: 300000` (5 min). They would have timed out even with nobody typing.
**Real code tasks need 10–30 min, not 5.**

### 4. Agents silently fall back to a different model.
`hive_readiness` reported `acked 10, on_primary_model 8`:
- `vogue` → `model:"default"`, `degraded:true`
- `pictor` → `model:"opencode/big-pickle"`, `degraded:true`

Two of ten were not running the model the roster claims. Nothing surfaces this during a job.

### 5. I had this written down and used it anyway.
Prior session note, verbatim:
> "Hive fanout unusable for long jobs — blocks up to 10 min, any user message aborts it."

I used fanout anyway. That is the actual cause of the last hour.

## The fix

Move agent execution off blocking MCP tool calls and onto **detached OS processes**.

Verified working:

```
$ timeout 90 opencode run -m opencode/space-bunny-free "Reply with exactly: OK"
exit=0 elapsed=16s
```

A background `nohup opencode run ... > log 2>&1 &` process:
- is an OS process, not a tool call → **survives my turn ending**
- **survives you typing**, because nothing is in-flight to cancel
- has **no MCP timeout** → can run 30 min
- writes its own log → a watchdog can poll it every 30 s

### Rules going forward
1. Long agent jobs run as `nohup opencode run` background processes with log files.
2. Never launch a >2 min agent job through `hive_fanout` / `hive_dispatch` / `hive_run`.
3. Timeout budget = measured ack time × ~40 for a real code task (58 s × 40 ≈ 40 min ceiling).
4. Record `on_primary_model` before and after; if an agent degrades, say so out loud.
5. Watchdog polls every 30 s and reports: pid alive?, log growing?, finished?

---

## RCA #2 — measured 2026-10-06 (the "everyone dies at once" incident)

4 background subagents all died within **7 seconds** of each other. Logged evidence
(`~/.local/share/opencode/log/opencode.log`):

```
04:30:31.792  ses_ef09ce3d5ffeXc11FQuQx0uS3m   AI.Error.QuotaExceeded: Rate limit exceeded
04:30:31.976  ses_ef0861f3dffeL43jjSuE5tmVE7   AI.Error.QuotaExceeded: Rate limit exceeded
04:30:36.602  ses_ef09ce3d7ffe27qVWZVlDVW8ps   AI.Error.QuotaExceeded: Rate limit exceeded
04:30:38.808  ses_ef0861f3effe4awc6h4SnxmWnD   AI.Error.QuotaExceeded: Rate limit exceeded
```

`QuotaExceeded` occurs **114 times** in the log. Stream counts by model show the collision:

| model | streams |
|---|---|
| **mimo-v2.6-flash-free** | **1416** |
| space-bunny-free | 1396 |
| nemotron-3-ultra-free | 1103 |
| big-pickle | 1093 |

### Root cause 1 (the killer): every subagent ran on the orchestrator's model
`tools.subagent` has an optional `model` parameter. When it is omitted the child **inherits the
session model**. The session model was `mimo-v2.6-flash-free`. I spawned 4 subagents with no
`model` → 4 children + the orchestrator = **5 concurrent streams on one free model** →
`QuotaExceeded` → all 4 children killed inside 7s.
Hive compounds it: `hive/agents/*` also had 3 agents wired to `mimo` (`atlas` primary,
`sentinel` + `curator` fallback).

### Root cause 2: hive timeouts shorter than the work
`dispatch.parallelism = 10`, `dispatch.timeout_per_task_ms = 300000` (5 min). Measured: a READY
probe costs 17–58s, and a medium task on `big-pickle` took **382s**. So a 300s budget
guarantees timeouts on anything real — `ledger` burned 3 × 420s and failed.
Also `ling-3.0-flash-fin-free` (`endpoint-unavailable`) was still in the pool.

### Fix applied to `hive/hive.json` (backup `hive.json.bak-20261006-rca`)
| knob | before | after |
|---|---|---|
| `dispatch.parallelism` | 10 | **3** |
| `dispatch.timeout_per_task_ms` | 300000 | **900000** |
| `dispatch.probe_timeout_ms` | 180000 | **120000** |
| agents touching `mimo` | 3 | **0** |
| dead model in pool | `ling-3.0-flash-fin-free` | **removed** |

### Binding caveat — READ THIS
`mcp-server.mjs:16` and `dispatch.mjs:27` both do `const HIVE = loadHive()` **at module load**,
and `mcp-server.mjs` `import`s `runModel` from `dispatch.mjs` in the same process. So the running
MCP server holds the **old** config until it is restarted (= next OpenCode session).
Proof it did NOT take effect in-session: `hive_models()` still returned 8 models including the
dead `ling-3.0-flash-fin-free`.
Proof a fresh process reads it:
```
$ node --input-type=module -e "import {loadHive} from './models.mjs'; const h=loadHive(); ..."
parallelism        = 3
task timeout ms    = 900000
probe timeout ms   = 120000
free models        = space-bunny-free, muse-spark-1.3-contributor-free, nemotron-3.5-lightning-free,
                     longcat-2.5-preview-free, nemotron-3-ultra-free, big-pickle
agents on mimo     = NONE
```

### Operating rule going forward
1. **Every background subagent MUST be launched with an explicit `model` that is NOT the
   orchestrator's model.** Spreading across distinct free models is the whole fix.
2. **Concurrency cap = 2 background subagents** (orchestrator + 1), never 4.
3. Hive code tasks get `timeout_ms >= 900000` and are sliced small (one concern per agent).
4. A `QuotaExceeded` blast is detected by grepping the log — do not relaunch onto the same model.
