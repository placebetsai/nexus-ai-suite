#!/usr/bin/env bash
# watchdog.sh — poll every agent job, print one status line each cycle.
set -u
ROOT="/home/billionaremaker/Documents/Default Project/nexus-ai-suite"
JOBS="$ROOT/.jobs"
INTERVAL="${1:-30}"
CYCLES="${2:-40}"

echo "watchdog start $(date '+%H:%M:%S') interval=${INTERVAL}s cycles=$CYCLES"
for ((c=1; c<=CYCLES; c++)); do
  echo "--- cycle $c $(date '+%H:%M:%S') ---"
  for f in "$JOBS"/*.pid; do
    [ -e "$f" ] || continue
    ID=$(basename "$f" .pid)
    PID=$(cat "$f" 2>/dev/null)
    LOG="$JOBS/$ID.log"
    START=$(cat "$JOBS/$ID.start" 2>/dev/null || echo 0)
    AGE=$(( $(date +%s) - START ))
    BYTES=$(stat -c%s "$LOG" 2>/dev/null || echo 0)
    if [ -d "/proc/$PID" ]; then
      # check log grew since last cycle
      LAST=$(cat "$JOBS/$ID.lastbytes" 2>/dev/null || echo -1)
      if [ "$BYTES" = "$LAST" ]; then GROW="idle"; else GROW="growing"; fi
      echo "$BYTES" > "$JOBS/$ID.lastbytes"
      echo "  $ID pid=$PID age=${AGE}s log=${BYTES}B $GROW"
    else
      RC=$(cat "$JOBS/$ID.rc" 2>/dev/null || echo "?")
      echo "  $ID FINISHED rc=$RC age=${AGE}s log=${BYTES}B"
    fi
  done
  sleep "$INTERVAL"
done
echo "watchdog end $(date '+%H:%M:%S')"
