// Written by the scaffold from the game's answers. It is the game's now: edit it freely.
import { activeSchedule, type BandRow, type SessionSchedule } from "watchpot/sim";

/** The session the game is built for: long sittings: two or three a day, most of an hour each, the tab often left open. */
export const SESSION = "long";

/**
 * How the sim's player plays: at it around the clock, a look every ten seconds, so every
 * hour of the run is a played hour. The pacing contract is judged on this.
 */
export const ACTIVE = activeSchedule(10, 0);

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
 * the sim plays by default (a day at most). */
export const CONTRACT_HOURS = [1, 2, 4] as const;
export const SIM_HOURS = 4;
/** How many days a session run plays by default. */
export const SIM_DAYS = 7;

/**
 * The pacing contract: per metric, the [low, high] it should sit in at each contract hour of play. These are the
 * design's intent, not a measurement: tune the content until `bun run sim -- --contract` holds them, or move a band
 * on purpose and say why in the commit.
 */
export const BANDS = [
  [
    "kinds",
    [
      [3, 8],
      [7, 8],
      [8, 8],
    ],
  ],
  [
    "ranks",
    [
      [1, 120],
      [5, 180],
      [10, 240],
    ],
  ],
  [
    "runs",
    [
      [0, 3],
      [1, 8],
      [2, 24],
    ],
  ],
] as const satisfies readonly BandRow<string>[];
