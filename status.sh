#!/usr/bin/env bash
# status.sh — regenerate a live status board from the .jobs directory.
# One line per agent: state, age, log size, whether it printed its result
# marker, and the root cause if it died. Safe to run any time; it only reads.
set -u
ROOT="/home/billionaremaker/Documents/Default Project/nexus-ai-suite"
JOBS="$ROOT/.jobs"
OUT="$ROOT/STATUS.html"
NOW=$(date +%s)

rows=""
for f in "$JOBS"/*.pid; do
  [ -e "$f" ] || continue
  ID=$(basename "$f" .pid)
  PID=$(cat "$f" 2>/dev/null)
  LOG="$JOBS/$ID.log"
  START=$(cat "$JOBS/$ID.start" 2>/dev/null || echo 0)
  MODEL=$(cat "$JOBS/$ID.model" 2>/dev/null || echo "?")
  AGE=$(( NOW - START ))
  BYTES=$(stat -c%s "$LOG" 2>/dev/null || echo 0)
  MARK=$(grep -c "RESULT ===" "$LOG" 2>/dev/null); MARK=${MARK:-0}
  LAST=$(cat "$JOBS/$ID.lastbytes" 2>/dev/null || echo -1)

  if [ -d "/proc/$PID" ]; then
    if [ "$BYTES" = "$LAST" ]; then STATE="STALLED"; CLS="stall"; else STATE="RUNNING"; CLS="run"; fi
    REASON="—"
  else
    if [ "$MARK" -gt 0 ]; then STATE="DONE"; CLS="done"
    else STATE="DIED"; CLS="dead"; fi
    REASON=$(grep -m1 -E "auto-rejecting|rejected permission|Error:|SchemaError|Cannot find module" "$LOG" 2>/dev/null | cut -c1-110)
    [ -z "$REASON" ] && { [ "$MARK" -gt 0 ] && REASON="finished, no result marker" || REASON="exit without result marker"; }
  fi
  echo "$BYTES" > "$JOBS/$ID.lastbytes"
  [ -n "${REASON:-}" ] || REASON="—"
  REASON=${REASON//&/&amp;}; REASON=${REASON//</&lt;}; REASON=${REASON//>/&gt;}
  rows="$rows<tr class=\"$CLS\"><td>$ID</td><td>$STATE</td><td>${AGE}s</td><td>${BYTES}B</td><td>$MODEL</td><td class=\"r\">$REASON</td></tr>"
done

cat > "$OUT" <<HTML
<!doctype html><meta charset="utf-8"><title>Hive live status</title>
<style>
body{background:#0b0d12;color:#e7ecf3;font:14px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;margin:0;padding:24px}
h1{font-size:18px;margin:0 0 4px;font-weight:600}
p.sub{color:#8b96a8;margin:0 0 18px;font-size:13px}
table{border-collapse:collapse;width:100%;font-size:13px}
th,td{padding:8px 10px;text-align:left;border-bottom:1px solid #1c2230;vertical-align:top}
th{color:#8b96a8;font-weight:500;text-transform:uppercase;font-size:11px;letter-spacing:.06em}
td.r{color:#9aa6b8;word-break:break-word}
tr.run td:nth-child(2){color:#3ddc97}
tr.done td:nth-child(2){color:#7cc4ff}
tr.dead td:nth-child(2){color:#ff6b6b}
tr.stall td:nth-child(2){color:#ffb020}
footer{color:#5f6b7d;font-size:12px;margin-top:16px}
</style>
<h1>Hive — live agent status</h1>
<p class="sub">Auto-refreshing every 15 seconds. RUNNING = working, STALLED = log unchanged 1 cycle, DONE = printed its result marker, DIED = exited without one (reason shown).</p>
<table><tr><th>Agent</th><th>State</th><th>Age</th><th>Log</th><th>Model</th><th>Reason / root cause</th></tr>
$rows</table>
<footer>Generated $(date '+%Y-%m-%d %H:%M:%S') — reloads automatically</footer>
<meta http-equiv="refresh" content="15">
HTML
echo "wrote $OUT ($(( NOW - START ))s window, $(printf '%s' "$rows" | grep -o '<tr' | wc -l) agents)"
