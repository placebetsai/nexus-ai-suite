# Handoff: placebets.ai, Wed Oct 21 2026, 5:15 PM ET (Grok Bot)
(Continues HANDOFF-2026-10-15-placebets.md. No secret values here. Tokens: /home/box/.cf-tokens, use WORKERS_TOKEN; deploy-safe.sh loads it itself.)

## 1. Source of truth
- **Iz's laptop repo `Placebetsai` at HEAD 04616bb** (not GitHub). Copied read-only to the box; the laptop was never touched.
- Box working tree: `/workspace/pb/Placebetsai-src`, now committed on top of 04616bb:
  - `43cfdc1` REBUILD: per-book ingest (pb_* tables), tool agent (gpt-oss-120b, falls back to llama-3.3-70b), 6 s deadline, grounding check
  - `5c11395` EDGE: code decides value / fair / no edge (fixes "+700 vs fair +822 gives us edge")
  - `1887748` CATALYST v2: per-book movement chart, markers, "why it moved" card, `/catalyst` page
- **Laptop sync tarball: `/workspace/pb/laptop-sync-2026-10-21.tar.gz`** (git bundle + 3 patches + plain changed files + README). Until the laptop is synced, deploying from the laptop reverts all of today's work.

## 2. Production
- **Live: deployment 6e2eefbe** (rebuild only, shipped earlier today with FORCE_DEPLOY=1 via deploy-safe). It is also the **rollback target**.
- **NOT yet promoted: the edge fix plus Catalyst v2.** The preview passed fully at 5:00 PM ET (0e0b8ad1). Then the one-promote-per-day cadence rule blocked it. Two FORCE_DEPLOY=1 runs (8ee3aacd, e9b0d58d) failed the gate on `/api/weather` "55 of 178 grounds did not answer". **Production fails that same check right now (123/178)**, so this is an upstream forecast outage or a venue-batch limit (the board grew to 416 games), not today's code. smoke.mjs was not edited.
- To ship: once /api/weather recovers, run `cd /workspace/pb/Placebetsai-src && FORCE_DEPLOY=1 PROPAGATE_S=75 bash scripts/deploy-safe.sh`. Or wait until after 8 PM ET (the UTC day rolls over) and drop FORCE. Gate flakes seen today on fresh previews: injury "McCoy" deadline, "tonight NBA" deadline, weather. All were cold-cache or upstream.

## 3. Edge fix (5c11395)
- `lib/llm/verdict.js` computes `priceVerdict()` as EV against the no-vig fair price, with a ±1% band. Verdicts: 'value', 'fair', 'no edge / overpriced'. Also `noVigMarket()` (sum and no-vig ≤ implied consistency check) and `stripEdgeClaims()`.
- Futures answers:
  - The implied % is now the best price's own. It used to be the cross-book median, so +700 printed "13.3%".
  - Adds no-vig % and fair price.
  - Adds a code "Verdict:" line for the asked team, matched by city or nickname.
- The model's take (tool agent) and the analyst prose lose any edge, value or worth-it sentence unless the code verdict is 'value'.
- A named matchup that isn't on the board gets the no-line answer on the fallback path too.
- Eval: new `futures_verdict` grader. Regression cases added: Carolina value, Avalanche edge, Wizards vs Kings, Panthers vs Rangers. Unit tests in `lib/__tests__/verdict.test.mjs`.

## 4. Catalyst v2 (1887748)
- `lib/market/movement.js` reads `pb_odds_ticks`, one source per book, with **real book names**. "Book A–G" is gone from this path, and live `/api/edges` already shows named books.
- It computes:
  - the first mover and move size (ML moves need ≥ 0.5 implied pts);
  - steam (3+ books moving the same way within 10 min);
  - the nearest catalyst before the first move: 'confirmed order' (timed, ≤ 3 h before), 'candidate' (date-only or older), or 'no public catalyst found'.
- `/api/movement` accepts `?event=`, `?away&home&start`, or `?top=1`. Markers come from the injury report, the news wire and the venue forecast (stamped at read time). Fail-soft "no movement yet".
- UI: `components/MovementBlock.js` is on every game page; `/catalyst` is an ungated most-moved list. Desktop shows a wide chart plus a side card; 412 is a single column with no sideways overflow.
- Screenshots: `/workspace/pb/shots/catalyst/{desktop1440,desktop1920,mobile412}-{game,catalyst}.png`. Chat: `/workspace/pb/shots/{desktop1440,mobile412}-chat-stanleycup-verdict.png`.

## 5. Evals (200-item sample, same 30-min slot)
- Earlier today: 189 before the rebuild, then 195 after it (shipped as 6e2eefbe).
- Same-slot comparison: prod 189/200, edge-fix preview 190/200, edge fix + Catalyst preview (a9534d13) **192/200**. All 4 new regression cases pass.
- Remaining failures:
  - live-price flakes: Bulls/Raptors, Aston Villa parlays;
  - deadline replies: Knicks injuries, CFB Saturday;
  - "best value bet" has no source line.
- Files: `/workspace/pb/eval/s200-*.json`.

## 6. Paused
- Routine **"placebets.ai live monitor"** is paused for token cost. It used to run every 15 min with 50 bot questions twice an hour. Bring it back only on Iz's OK, on a light schedule.

## 7. Next steps
1. Promote the edge fix and Catalyst v2 once /api/weather recovers (see §2), then curl-verify live and take screenshots.
2. Sync the laptop from the tarball.
3. Catalyst: steam alerts, per-book movement on the board rows, and catalyst feeds with real timestamps (injury status-change history, lineups, refs).
4. Nicknames and slang coverage (beyond Wings/Habs/Bolts/Niners).
5. Player props: coverage and freshness.
6. Pre-existing bugs seen today:
   - The chat widget shows raw `**markdown**`.
   - The game page shows "Total: 0 (opened 230.5)" and "Best price … (the market)".
   - /api/weather is down to 123/178 grounds.
