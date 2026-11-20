import { MAIN } from "../src/content/words";
import type { GameState } from "../src/game/game";

/** One timeline row: what the sim reads off the game at a mark. A new column goes here, in `COLUMNS` and in `run.ts`'s metrics. */
export interface Row {
  /** Hours since the profile's start. */
  hours: number;
  day?: number;
  /** log10 of the main balance (0 at none). */
  main: number;
  /** Producer kinds owned (generators) or tiers bought (dimensions). */
  kinds: number;
  /** Upgrade ranks held. */
  ranks: number;
  /** Prestige resets. */
  runs: number;
  /** Achievements earned. */
  earned: number;
}

/** The timeline's columns after the day and the hours: a heading and how a row prints in it. */
export const COLUMNS: readonly [string, (r: Row) => string][] = [
  ["log10 main", (r) => r.main.toFixed(2)],
  ["kinds", (r) => String(r.kinds)],
  ["ranks", (r) => String(r.ranks)],
  ["runs", (r) => String(r.runs)],
  ["earned", (r) => String(r.earned)],
];

export function readRow(s: GameState, hours: number): Row {
  const main = s.wallet[MAIN];
  let kinds = 0;
  kinds = Math.max(kinds, Object.values(s.generators.owned).filter((n) => n > 0).length);
  return {
    hours,
    main: main.gt(0) ? main.log10().toNumber() : 0,
    kinds,
    ranks: Object.values(s.upgrades.ranks).reduce((a, b) => a + b, 0),
    runs: s.prestige.runs,
    earned: Object.keys(s.achievements.earned).length,
  };
}
