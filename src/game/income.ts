import { type Decimal, ZERO } from "watchpot/core";
import { GENERATORS } from "../content/generators";

/**
 * What the income is read from: the Clarity the stats give, the Vim run's pace and Flow, the trial flags, and the
 * core's own state. Named by type rather than imported, so the tree's `worth` (which values a rank by the income it
 * adds) needs no import of the features it reads.
 */
export interface IncomeSources {
  readonly stats: { readonly output: Decimal };
  /** What a second of active play is worth before the stats, and the Flow that carries it. */
  readonly vim: {
    readonly expectedActivePerSec: Decimal;
    readonly flow: number;
    readonly flowCap: number;
  };
  /** The flags a running trial switches on: `noScribes` silences the Scribes' line. */
  readonly trials: { readonly rules: readonly string[] };
  readonly generators: {
    readonly owned: Readonly<Record<string, number>>;
    readonly perSecond: Readonly<Record<string, Decimal>>;
  };
}

/**
 * Flow Resonance: 1 at a still desk, up to 1.5 while the Flow is full. The Scribes' trickle reads the same share the
 * generators' own step does, so the page and the wallet agree.
 */
const resonanceOf = (s: Pick<IncomeSources, "vim">) =>
  s.vim.flowCap > 0 ? 1 + 0.5 * (s.vim.flow / s.vim.flowCap) : 1;

/** The share of active play the desk may ever trickle in: the rest of the Scribes' work pays in Ink. */
export const IDLE_SHARE_CAP = 0.4;

/** What a second of active Vim play makes now, every stat applied. */
export function activeVimRateOf(s: IncomeSources): Decimal {
  return s.vim.expectedActivePerSec.mul(s.stats.output);
}

/**
 * What the Scribes trickle in Glyphs a second, every stat applied: nothing at all inside a `noScribes` trial, and
 * never more than `IDLE_SHARE_CAP` of the hand's own rate, so a desk left alone can never out-earn a player at the
 * buffer however many Scribes are bought. The rest of their work pays in Ink, which is what they are for.
 */
export function idleGlyphRateOf(s: IncomeSources): Decimal {
  if (s.trials.rules.includes("noScribes")) return ZERO;
  let rate = 0;
  for (const g of GENERATORS) rate += (s.generators.owned[g.id] ?? 0) * g.glyphTrickle;
  if (rate <= 0) return ZERO;
  const raw = s.stats.output.mul(rate * resonanceOf(s));
  const cap = activeVimRateOf(s).mul(IDLE_SHARE_CAP);
  return raw.lt(cap) ? raw : cap;
}

/** What the Scribes brew in Ink a second, every stat applied. */
export function inkRateOf(s: IncomeSources): Decimal {
  return s.generators.perSecond.ink ?? ZERO;
}

/** What the core makes of the main currency a second now: the hand and the desk together. */
export function incomeOf(s: IncomeSources): Decimal {
  return activeVimRateOf(s).add(idleGlyphRateOf(s));
}
