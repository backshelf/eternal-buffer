import type { Decimal } from "watchpot/core";
import { MAIN } from "../src/content/words";
import type { GameState } from "../src/game/game";
import { activeVimRateOf, type IncomeSources, idleGlyphRateOf } from "../src/game/income";

/**
 * One timeline row: what the sim reads off the game at a mark. A new column goes here, in `COLUMNS` and in `run.ts`'s
 * metrics.
 */
export interface Row {
  /** Hours since the profile's start. */
  hours: number;
  day?: number;
  /** log10 of the glyphs held (0 at none). */
  main: number;
  /** log10 of the ink held (0 at none). */
  ink: number;
  /** The Act the run has reached: `vim.highestAct`, the tier bought, not clocked. */
  act: number;
  /** Scribe kinds owned. */
  kinds: number;
  /** Upgrade ranks held across both trees: the run's Codex and the shelf that survives `:w`. */
  ranks: number;
  /** `:w` Bind Volume resets. */
  sealsRuns: number;
  /** `:wq` Rebind Codex resets. */
  codexRuns: number;
  /** Grammar Codex pairs discovered. The headless pilot plays Clean Cuts but never types, so this stays 0: a real
   * player's Clarity runs ahead of the sim by `1.06 ^ pairs`. */
  pairs: number;
  /** Achievements earned. */
  earned: number;
  /** The hand's share of the glyph income: `activeVimRateOf / (active + idle)`, at least 1 with the desk silent. */
  activeShare: number;
  /** The longest stretch of played minutes so far without a meaningful purchase or unlock (`run.ts` tracks it). */
  maxGapMin: number;
}

/** What the run keeps that a row cannot read off the state: the quiet-stretch record. */
export interface RunWatch {
  /** The longest gap between meaningful payoffs so far, in played minutes. */
  maxGapMin: number;
}

/** The timeline's columns after the day and the hours: a heading and how a row prints in it. */
export const COLUMNS: readonly [string, (r: Row) => string][] = [
  ["log10 main", (r) => r.main.toFixed(2)],
  ["log10 ink", (r) => r.ink.toFixed(2)],
  ["act", (r) => String(r.act)],
  ["kinds", (r) => String(r.kinds)],
  ["ranks", (r) => String(r.ranks)],
  ["sealsRuns", (r) => String(r.sealsRuns)],
  ["codexRuns", (r) => String(r.codexRuns)],
  ["pairs", (r) => String(r.pairs)],
  ["earned", (r) => String(r.earned)],
  ["activeShare", (r) => r.activeShare.toFixed(2)],
  ["maxGapMin", (r) => r.maxGapMin.toFixed(1)],
];

/** The glyph income's two lines, as `income.ts` works them: the hand's and the desk's. */
export function sharesOf(s: GameState): { active: Decimal; idle: Decimal } {
  const sources = s as unknown as IncomeSources;
  return { active: activeVimRateOf(sources), idle: idleGlyphRateOf(sources) };
}

export function readRow(s: GameState, hours: number, watch: RunWatch): Row {
  const { active, idle } = sharesOf(s);
  const total = active.add(idle);
  const ink = s.wallet.ink;
  return {
    hours,
    main: s.wallet[MAIN].gt(0) ? s.wallet[MAIN].log10().toNumber() : 0,
    ink: ink.gt(0) ? ink.log10().toNumber() : 0,
    act: s.vim.highestAct,
    kinds: Object.values(s.generators.owned).filter((n) => n > 0).length,
    ranks:
      Object.values(s.upgrades.ranks).reduce((a, b) => a + b, 0) +
      Object.values(s.sealUpgrades.ranks).reduce((a, b) => a + b, 0),
    sealsRuns: s.volumes.runs,
    codexRuns: s.codex.runs,
    pairs: Object.keys(s.vim.discoveredPairs).length,
    earned: Object.keys(s.achievements.earned).length,
    activeShare: total.gt(0) ? active.div(total).toNumber() : 1,
    maxGapMin: watch.maxGapMin,
  };
}
