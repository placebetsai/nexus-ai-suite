# Handoff 2026-10-15 placebets.ai (continues HANDOFF-2026-10-14-placebets.md)

## Canary grader fix (1:45 AM ET), test tooling only, feat/seo-8 @ 8759bda (pushed)
Trigger: live canary 49/50 then 45/50 at 1:31 AM ET (ml_mismatch Isles/Sens, Bills/Raiders, Flames/Knights, Canucks/Panthers; leg_not_on_board Chiefs -388/Texans -375) while lines were moving.
Cause: grader race, not the bot. The bot answers from a board up to ~3 min older than the grader's: odds Cache API (fresh 60s, SWR up to 10 min) -> chat cache key (60s) -> per-isolate memo (60s). The grader only snapshotted every 15s after each answer, so a short canary often never saw the board the bot used.
Fix (scripts/eval/run.mjs):
- Timestamped board snapshots: polled every 10s during the run, persisted 15 min in /tmp/pb-eval-snaps-<host>.json across runs.
- A price is accepted only if it is on a snapshot built in the answer's own "As of" minute (-60s/+120s) or fetched in the last 180s. ML pairs must still come from the same snapshot.
- On a miss: refetch the board and re-check. Still missing = true ml_mismatch / leg_not_on_board (unchanged severity).
- "unverified" = no snapshot for that As-of minute and As-of <= 12 min old. Reported separately; more than 3 fails the run (so the grader can't go blind).
- `--selftest`: real price must pass; an invented ML and an invented parlay leg must fail. Added to deploy-gated.sh before the eval.
Validation vs production (read-only chat queries): 5 canaries 50/50, 0 hard, 0 unverified. Run 1 recovered 4 items only after the refetch (the 1:31 race). Self-test ok.
As-of honesty: As-of = board updatedAt (set at board compute; cache layers don't rewrite it). In 30 realline answers, every quoted price matched a board built in exactly the answer's As-of minute. Prices are never newer or older than the label says. Design max age is about 12 min, and As-of shows it.
No deploy needed (tooling only). Ships with fix 7/8 on "ship it". The live canary job should run from this branch's run.mjs, or wait for the merge.
