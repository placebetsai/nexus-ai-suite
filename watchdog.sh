#!/usr/bin/env bash
# watchdog.sh — poll every agent job forever, one status line per job per cycle.
#
# WHY THIS SCRIPT IS BUILT NOT TO DIE (read this before changing anything)
#   The previous version stopped itself at cycle 60 on 2026-09-26 02:19 and
#   nobody noticed: four finished jobs then sat unreported for the rest of the
#   night. Two defects caused that, and both are fixed here.
#
#   1. A hard cycle cap. The cap is now OPTIONAL — `./watchdog.sh` with no
#      arguments runs until a human stops it. Argument 2 still sets the cap and
#      exists only so the script can be self-tested.
#   2. Nothing was able to restart the polling loop when it stopped. The polling
#      loop now runs in a CHILD process, and a SUPERVISOR loop in the parent
#      restarts that child 5 s after it dies — however it dies (crash, `exit`,
#      out of memory, `kill -9` on the child). The child says "I finished my
#      cycles" by exiting 0; the supervisor then stops instead of restarting.
#      Any other exit code means "I died", and the supervisor revives me. The
#      supervisor itself only ever exits 0 — on a signal from a human — so cron,
#      systemd or a nohup wrapper never records a failure and never has to
#      restart me. SIGHUP is ignored by both processes, so losing the terminal
#      cannot kill the watchdog either.
#      Both pids are printed on the start lines. `kill <supervisor-pid>` is how a
#      human stops the whole thing; killing only the child revives it, which is
#      the entire point of the supervisor. The child also exits by itself if the
#      supervisor disappears, so a killed supervisor never leaves a loop polling
#      forever as an orphan nobody can find.
#      Limitation, stated plainly: a child that HANGS is not detected. The
#      supervisor revives dead children, not stuck ones.
#
# USAGE
#   ./watchdog.sh [interval_seconds] [cycles]
#     interval_seconds  seconds between checks            (default 30)
#     cycles            checks before stopping; "" , 0, inf
#                       or forever means run forever       (default 0 = forever)
#     WATCHDOG_NO_SUPERVISOR=1  run the loop in this process instead of
#                       supervising a child (handy under a debugger)
#
# DEPENDENCIES: bash + coreutils only (cat, stat, date, basename, grep, sed,
# cut, sleep, readlink). No systemd, no cron, no python, no jq.
#
# STATE: two runtime bookkeeping files per job under .jobs/, following the same
# convention as the .lastbytes file the previous version already wrote:
#   <id>.lastbytes  log size seen on the previous cycle
#   <id>.stall      consecutive cycles the log has not grown
# A job is called STALLED only while its log is genuinely frozen; the counter is
# reset the moment the log grows again, and a log that shrinks is treated as a
# fresh start rather than a stall. At the default 30 s interval, STALLED means
# "no log growth for about 90 seconds".
set -u

SELF=$(readlink -f -- "${BASH_SOURCE[0]}")
ROOT=$(dirname -- "$SELF")
JOBS="$ROOT/.jobs"

INTERVAL_DEFAULT=30
RESTART_DELAY=5      # seconds the supervisor waits before reviving a dead loop
STALL_AFTER=3        # cycles without log growth before a running job is STALLED
REASON_TAIL=60       # lines at the end of a log searched for a failure reason

WD_PARENT="${WD_PARENT:-}"   # supervisor pid, when this process is a supervised loop
LOOP_START=$(date +%s)

# is_uint VALUE — true when VALUE is a non-negative integer.
is_uint() { case "$1" in ''|*[!0-9]*) return 1 ;; *) return 0 ;; esac; }

# uptime_str EPOCH — "9s" / "7m" / "2h13m", for the cycle header.
uptime_str() {
  local s=$(( $(date +%s) - $1 ))
  [ "$s" -lt 0 ] && s=0
  if   [ "$s" -lt 60 ];   then printf '%ss' "$s"
  elif [ "$s" -lt 3600 ]; then printf '%sm' "$((s / 60))"
  else printf '%sh%sm' "$((s / 3600))" "$((s % 3600 / 60))"; fi
}

# parse_cycles VALUE — sets CYCLES to a number of cycles, or 0 for forever.
parse_cycles() {
  case "$1" in
    ''|0|inf|INF|Inf|infinite|forever|FOREVER) CYCLES=0 ;;
    *) if is_uint "$1"; then
         CYCLES=$1
       else
         printf 'watchdog: bad cycle limit "%s", running forever\n' "$1" >&2
         CYCLES=0
       fi ;;
  esac
  CYCLES_LABEL=$CYCLES
  [ "$CYCLES" -eq 0 ] && CYCLES_LABEL=inf
  return 0
}

# find_reason LOG — the root cause of a finished job, one line, ANSI stripped.
# Only the last REASON_TAIL lines are searched: a failure is what the job ended
# on, and an old error line the job recovered from is not a root cause.
# Permission / auto-reject lines are matched first, because that is the reason
# that silently stops work and that nobody was seeing before. The pattern is
# deliberately diagnostic-shaped (permission denied / permission requested /
# auto-reject) rather than the bare word "permission", so a report that merely
# mentions permissions is not mistaken for a failure. A clean finish says so
# rather than inventing a cause. This stays a best-effort grep: a job that dies
# with no recognisable line in its last REASON_TAIL lines reports a clean
# finish, and the full log is where the truth lives.
find_reason() {
  local log="$1" line=""
  [ -f "$log" ] || { printf 'no log file\n'; return 0; }
  line=$(tail -n "$REASON_TAIL" "$log" 2>/dev/null | sed -e 's/\x1b\[[0-9;]*m//g' \
    | grep -aE 'permission[ _-]?(requested|denied|error|refused)|auto-reject|rejected permission|EACCES|not permitted|forbidden' | tail -n 1)
  [ -n "$line" ] || line=$(tail -n "$REASON_TAIL" "$log" 2>/dev/null | sed -e 's/\x1b\[[0-9;]*m//g' \
    | grep -aE '(^|[^A-Za-z])(Error|ERROR|Fatal|FATAL|Exception|Traceback|panic|error TS[0-9]+):|npm ERR!|exit=[1-9]|^✗' | tail -n 1)
  [ -n "$line" ] || { printf 'clean finish, no error in last %s lines\n' "$REASON_TAIL"; return 0; }
  printf '%s\n' "$line" | sed -e 's/[[:space:]]\{1,\}/ /g' | cut -c1-200
}

# report_job ID — exactly one status line for one job, whatever state it is in.
report_job() {
  local id="$1" pid start age bytes last stall state
  pid=$(cat "$JOBS/$id.pid" 2>/dev/null || true)
  start=$(cat "$JOBS/$id.start" 2>/dev/null || echo 0)
  is_uint "$start" || start=0
  if [ "$start" -gt 0 ]; then age="$(( $(date +%s) - start ))s"; else age='?'; fi
  bytes=$(stat -c%s "$JOBS/$id.log" 2>/dev/null || echo 0)
  is_uint "$bytes" || bytes=0

  if [ -n "$pid" ] && [ -d "/proc/$pid" ]; then
    last=$(cat "$JOBS/$id.lastbytes" 2>/dev/null || echo -1)
    is_uint "$last" || last=-1
    if [ "$last" -lt 0 ] || [ "$bytes" -gt "$last" ]; then
      printf '%s' "$bytes" > "$JOBS/$id.lastbytes"
      rm -f "$JOBS/$id.stall"
      state="growing"
    else
      stall=$(cat "$JOBS/$id.stall" 2>/dev/null || echo 0)
      is_uint "$stall" || stall=0
      stall=$((stall + 1))
      printf '%s' "$bytes" > "$JOBS/$id.lastbytes"
      if [ "$bytes" -lt "$last" ]; then
        # the job truncated its own log, so it is a fresh start, not a stall
        rm -f "$JOBS/$id.stall"
        state="growing (log restarted)"
      else
        printf '%s' "$stall" > "$JOBS/$id.stall"
        if [ "$stall" -ge "$STALL_AFTER" ]; then
          state="STALLED ${stall}cy (no log growth)"
        else
          state="idle ${stall}/${STALL_AFTER}"
        fi
      fi
    fi
    printf '  %s RUNNING pid=%s age=%s log=%sB %s\n' "$id" "$pid" "$age" "$bytes" "$state"
  elif [ -f "$JOBS/$id.pid" ]; then
    # No live process. Say WHY it stopped instead of a bare FINISHED: the old
    # rc=$? never carried information because agent-run.sh writes no .rc file.
    printf '  %s FINISHED pid=%s age=%s log=%sB reason: %s\n' \
      "$id" "$pid" "$age" "$bytes" "$(find_reason "$JOBS/$id.log")"
  else
    printf '  %s FINISHED pid=none age=%s log=%sB reason: never tracked, no .pid file; %s\n' \
      "$id" "$age" "$bytes" "$(find_reason "$JOBS/$id.log")"
  fi
}

# run_loop — the polling loop. Exits 0 when it has done its cycles, so the
# supervisor knows the stop was intentional rather than a death.
run_loop() {
  local c=0 f id
  trap 'exit 130' INT TERM
  trap '' HUP
  printf '%s watchdog loop start self=%s interval=%ss cycles=%s\n' \
    "$(date '+%H:%M:%S')" "$$" "$INTERVAL" "$CYCLES_LABEL"
  while :; do
    c=$((c + 1))
    # A loop must never outlive the supervisor that started it.
    if [ -n "$WD_PARENT" ] && ! kill -0 "$WD_PARENT" 2>/dev/null; then
      printf '%s watchdog loop: supervisor %s is gone, exiting\n' "$(date '+%H:%M:%S')" "$WD_PARENT"
      return 0
    fi
    printf -- '--- cycle %s %s up=%s ---\n' "$c" "$(date '+%H:%M:%S')" "$(uptime_str "$LOOP_START")"
    for f in "$JOBS"/*.log; do
      [ -e "$f" ] || continue
      id=$(basename -- "$f" .log)
      [ "$id" = "watchdog" ] && continue   # this script's own output is not a job
      report_job "$id"
    done
    if [ "$CYCLES" -gt 0 ] && [ "$c" -ge "$CYCLES" ]; then
      printf '%s watchdog loop done after %s cycles\n' "$(date '+%H:%M:%S')" "$c"
      return 0
    fi
    sleep "$INTERVAL"
  done
}

# shutdown CHILD RC MESSAGE — stop the child, say why, exit 0.
# A watchdog told to stop must not leave a polling loop behind it, so the child
# is signalled and reaped here instead of being orphaned.
shutdown() {
  local child="$1" rc="$2" msg="$3"
  if [ -n "$child" ] && kill -0 "$child" 2>/dev/null; then
    kill -TERM "$child" 2>/dev/null
    wait "$child" 2>/dev/null
    printf '%s watchdog supervisor: stopped child %s\n' "$(date '+%H:%M:%S')" "$child"
  fi
  printf '%s watchdog supervisor: %s (rc=%s)\n' "$(date '+%H:%M:%S')" "$msg" "$rc"
  exit 0
}

# ---- child mode: `--loop` is how the supervisor starts a replaceable loop ----
if [ "${1:-}" = "--loop" ]; then
  shift
  INTERVAL="${1:-$INTERVAL_DEFAULT}"
  parse_cycles "${2:-0}"
  is_uint "$INTERVAL" && [ "$INTERVAL" -ge 1 ] || INTERVAL=$INTERVAL_DEFAULT
  run_loop
  exit 0
fi

# ---- supervisor mode (the default) ----
INTERVAL="${1:-$INTERVAL_DEFAULT}"
is_uint "$INTERVAL" && [ "$INTERVAL" -ge 1 ] || {
  printf 'watchdog: bad interval "%s", using %ss\n' "$INTERVAL" "$INTERVAL_DEFAULT" >&2
  INTERVAL=$INTERVAL_DEFAULT
}
parse_cycles "${2:-0}"

if [ "${WATCHDOG_NO_SUPERVISOR:-0}" = "1" ]; then
  WD_PARENT=""
  run_loop
  exit 0
fi

STOP=0
trap 'STOP=1' INT TERM
trap '' HUP
mkdir -p "$JOBS"
printf '%s watchdog supervisor start self=%s root=%s jobs=%s interval=%ss cycles=%s\n' \
  "$(date '+%H:%M:%S')" "$$" "$ROOT" "$JOBS" "$INTERVAL" "$CYCLES_LABEL"
while :; do
  WD_PARENT=$$ "$BASH" "$SELF" --loop "$INTERVAL" "$CYCLES" &
  CHILD=$!
  wait "$CHILD"
  RC=$?
  # RC is the child's status, except when a trapped signal interrupts the wait,
  # where it is 128+signal from this process. STOP tells the two apart.
  if [ "$STOP" -eq 1 ]; then
    shutdown "$CHILD" "$RC" "signal received, stopping"
  fi
  if [ "$RC" -eq 0 ]; then
    shutdown "$CHILD" "$RC" "loop finished $CYCLES_LABEL cycles on request, stopping"
  fi
  printf '%s watchdog supervisor: loop died rc=%s, restarting in %ss\n' \
    "$(date '+%H:%M:%S')" "$RC" "$RESTART_DELAY"
  sleep "$RESTART_DELAY"
done
