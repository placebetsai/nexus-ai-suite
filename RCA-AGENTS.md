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
