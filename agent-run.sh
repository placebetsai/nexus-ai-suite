#!/usr/bin/env bash
# agent-run.sh — launch one agent as a DETACHED OS process.
# Not a tool call, so it cannot be cancelled when the user types.
set -u
ROOT="/home/billionaremaker/Documents/Default Project/nexus-ai-suite"
JOBS="$ROOT/.jobs"
mkdir -p "$JOBS"

ID="$1"; PROMPT_FILE="$2"; MODEL="$3"

[ -f "$PROMPT_FILE" ] || { echo "no prompt file: $PROMPT_FILE"; exit 2; }
[ -f "$JOBS/$ID.pid" ] && { echo "already running: $ID pid=$(cat "$JOBS/$ID.pid")"; exit 3; }

LOG="$JOBS/$ID.log"
: > "$LOG"

cd "$ROOT" || exit 1
# GIT GUARD — prepend the guard dir so every agent's `git` is the refusing
# shim. Root cause 2026-09-26: an agent ran "git stash ... git checkout --"
# and destroyed three other agents' uncommitted edits. Read-only git passes
# through; destructive subcommands exit 75 with an explanation.
export PATH="$JOBS/bin:$PATH"
MSG="Read the attached file. It contains your full task, rules and the exact output marker you must print at the end. Execute it now."
setsid nohup opencode run -m "opencode/$MODEL" "$MSG" -f "$PROMPT_FILE" > "$LOG" 2>&1 &
PID=$!
echo "$PID" > "$JOBS/$ID.pid"
date +%s > "$JOBS/$ID.start"
echo "$MODEL" > "$JOBS/$ID.model"
disown
echo "launched $ID pid=$PID model=$MODEL log=$LOG"
