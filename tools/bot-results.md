# Survival-bot results (proxy test, not a human playtest)

Tool: `tools/survival-bot.cjs` (headless Chromium via puppeteer-core; runs the real `game.update()` at fixed 60 Hz steps).
Usage: `node survival-bot.cjs <stageIndex0Based> <easy|normal|hard> <seeds>` with the game served at http://127.0.0.1:8000.
Requires `window.__DIFF` (exposed in `src/main.js`).

The bot is a planner. It reads the current bullets and lasers, predicts them forward (curve, delayed homing, turn-after-distance, delay, rotating lasers with the moving boss pivot), and searches a 4px grid over 30 frames for a route that stays safe. It has perfect knowledge of the current state and plays with a 1-frame control loop, so it is stronger than a human. Clearing with this bot shows that a safe route exists. It does not show that the stage is comfortable for a human.

| Stage | Difficulty | Seeds | Result | Hits per run (seed 1/2/3) | Max bullets on screen | Graze per run |
|---|---|---|---|---|---|---|
| 1 Coral Cove | EASY | 3 | 3/3 cleared | 0 / 0 / 0 | 108 | 41–45 |
| 1 Coral Cove | NORMAL | 3 | 3/3 cleared | 0 / 0 / 0 | 121–122 | 57–60 |
| 1 Coral Cove | HARD | 3 | 3/3 cleared | 0 / 0 / 0 | 127–128 | 75–76 |
| 2 Burning Battery | EASY | 3 | 3/3 cleared | 0 / 0 / 1 | 33–37 | 24–30 |
| 2 Burning Battery | NORMAL | 3 | 3/3 cleared | 1 / 1 / 0 | 49 | 27–30 |
| 2 Burning Battery | HARD | 3 | 3/3 cleared | 0 / 0 / 0 | 64–66 | 51–70 |
| 3 Maelstrom | EASY | 3 | 3/3 cleared | 1 / 0 / 1 | 281 | 51–56 |
| 3 Maelstrom | NORMAL | 3 | 3/3 cleared | 1 / 1 / 0 | 399 | 72–78 |
| 3 Maelstrom | HARD | 3 | 3/3 cleared | 0 / 0 / 0 | 581 | 95–109 |

Notes
- Each run uses a deterministic seed for the bot's tie-breaking noise. The game itself is deterministic (the cannon spread is frame-derived).
- Earlier versions of the bot died on some hard runs. Those failures were tracked to bot bugs (laser pivot motion, out-of-field targets, unpredicted homing) and to one design issue (the homing rate of the stage 3 phase 2 fan, lowered from 0.008 to 0.006 with homeDelay 110 → 130). The table shows the final version.
- Stage 3 HARD reaches 581 bullets on screen. That is the density of the slow final rings. It was not verified visually at this density.
- Planner fallbacks (no route found, bot stays still) happened 0–14 times in a run. They were not counted as hits.

## Pseudo-3D phases (cam3d): NOTE on stale results

The table that used to be here was measured with a temporary ship upper limit (y=170) in cam3d phases.
That limit has been removed again (ship movement is back to the 2D range), so the table no longer applies.
The bot2.cjs script was lost when the sandbox was re-provisioned, so the cam3d regression was NOT re-run after the revert.
Camera changes are visual only (view.js); collision and movement code is unchanged from the 2D build.
