// Written by the scaffold from the game's answers. It is the game's now: edit it freely.
import { activeSchedule, type BandRow, type SessionSchedule } from "watchpot/sim";

/** The session the game is built for: long sittings: two or three a day, most of an hour each, the tab often left open. */
export const SESSION = "long";

/**
 * How the sim's player plays: at it around the clock, a look every fifteen seconds, so every
 * hour of the run is a played hour. The pacing contract is judged on this, and the fit (`sim/fit.ts`)
 * prices the plan at the same cadence.
 */
export const ACTIVE = activeSchedule(15, 0);

/** How a session player comes and goes (`bun run sim -- --sessions`): a second look at the game, never judged. */
export const SCHEDULE: SessionSchedule = {
  kind: "sessions",
  wakeHour: { min: 7, max: 9 },
  sleepHour: { min: 22, max: 24 },
  sessionsPerDay: { min: 2, max: 3 },
  sessionMin: { median: 45, spread: 0.5, min: 20, max: 90 },
  lookEveryMin: { min: 3, max: 6 },
  tabLeftOpen: 0.6,
  skipDay: 0,
  skipWeekendDay: 0,
  decay: [1],
  lengthDecay: [1],
  pressesPerSession: { min: 0, max: 0 },
  firstDayBonusSessions: 1,
};

/** The played hours the contract reads (the first sitting: nobody starts an idle game and goes idle), and how many
 * the sim plays by default (a day at most; `--hours=16` verifies the arc keeps scaling past it). */
export const CONTRACT_HOURS = [1, 2, 4, 8, 12] as const;
export const SIM_HOURS = 12;
/** How many days a session run plays by default. */
export const SIM_DAYS = 7;

/**
 * The pacing contract: per metric, the [low, high] it should sit in at each contract hour of play. These are the
 * design's intent, not a measurement: tune the content until `bun run sim -- --contract` holds them, or move a band
 * on purpose and say why in the commit.
 *
 * The bands are drawn from the fitted run at this commit (seed `sim`, one run — the contract is a single-seed
 * check; `--seed=` varies it) with room either side:
 *   - `act` holds the arc itself: the Ex-Console tier unlocks out of the first `:wq`, which the volume curve lands
 *     at ~10.3 played hours, so hour 8 has not seen Act VI yet and hour 12 has finished Act VII.
 *   - `sealsRuns` counts the current epoch's bindings (a `:wq` starts it over), so its late bands are wide.
 *   - `activeShare` is the spec's active-first guarantee: the hand always makes the majority of the glyphs.
 */
export const BANDS = [
  [
    "act",
    [
      [1, 2],
      [2, 3],
      [2, 4],
      [3, 6],
      [6, 7],
    ],
  ],
  [
    "kinds",
    [
      [3, 6],
      [3, 6],
      [4, 7],
      [6, 8],
      [7, 10],
    ],
  ],
  [
    "ranks",
    [
      [10, 30],
      [20, 45],
      [30, 55],
      [45, 75],
      [55, 90],
    ],
  ],
  [
    "sealsRuns",
    [
      [0, 1],
      [0, 3],
      [1, 10],
      [5, 40],
      [0, 40],
    ],
  ],
  [
    "codexRuns",
    [
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 1],
      [1, 150],
    ],
  ],
  [
    "activeShare",
    [
      [0.55, 1],
      [0.55, 1],
      [0.55, 1],
      [0.55, 1],
      [0.55, 1],
    ],
  ],
] as const satisfies readonly BandRow<string>[];
