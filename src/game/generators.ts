import {
  type Decimal,
  defineFeature,
  defineGenerators,
  type GeneratorDef as Generator,
  reach,
} from "watchpot/core";
import { OFFLINE_CAP_MS } from "../content/economy";
import { GENERATORS, type GeneratorDef } from "../content/generators";
import { type Currency, MAIN } from "../content/words";
import { idleGlyphRateOf } from "./income";
import { wallet } from "./wallet";

/**
 * What the Scribes' callbacks read, named by type so this file and the Vim, trials and stats features need not import
 * each other: the stats, the Vim run's Flow and Act, and the rule flags a trial switches on. Wave 4 lists those three
 * features in `game.ts`, which is what satisfies this reach.
 */
interface Reads {
  readonly stats: { readonly output: Decimal; readonly inkRate: Decimal; readonly offline: Decimal };
  readonly vim: {
    readonly flow: number;
    readonly flowCap: number;
    readonly actTier: number;
    readonly expectedActivePerSec: Decimal;
  };
  readonly trials: { readonly rules: string[] };
}

/** Flow Resonance: 1 at a still desk, up to 1.5 while the Flow is full, so active editing always outspeeds the desk. */
const resonance = (s: Pick<Reads, "vim">) => (s.vim.flowCap > 0 ? 1 + 0.5 * (s.vim.flow / s.vim.flowCap) : 1);

/**
 * The ten Scribes on the engine's `generators`: each is bought with Glyphs and brews `ink` a second, which is the
 * Scribes' real work. `stats.inkRate` multiplies them all, a live Flow raises it further (`Flow Resonance`), and a
 * `noScribes` trial mutes them to nothing. A Scribe with a `minAct` above the current Act is not yet open. Away, they
 * pay the `offline` share for at most `OFFLINE_CAP_MS`. Buy with `buy(id, count)` and `buyMax(id)`; read prices and
 * rates off `producers.select`.
 */
export const producers = defineGenerators({
  key: "generators",
  wallet,
  reach: () => [reach<Reads>()],
  list: GENERATORS.map((g): Generator<Currency> & GeneratorDef => ({
    ...g,
    pays: MAIN,
    makes: "ink",
    rate: g.rate,
    milestones: g.milestones,
    free: 0,
  })),
  mult: (s) => (s.trials.rules.includes("noScribes") ? 0 : s.stats.inkRate.mul(resonance(s))),
  open: (s, g) => (g.minAct ?? 1) <= s.vim.actTier,
  away: (s) => ({ rate: s.stats.offline.toNumber(), capMs: OFFLINE_CAP_MS }),
});

/**
 * The Scribes' secondary line: a few percent of their ink rate in Glyphs, times `stats.output` and the same Flow
 * Resonance, so a desk left alone pays a little and an editing hand pays a lot more. It pays over both passes (a
 * catch-up included) and pays exactly nothing inside a `noScribes` trial. It keeps no state of its own: only the
 * wallet moves.
 */
export const scribeTrickle = defineFeature({
  key: "scribeTrickle",
  initial: () => ({}),
  reach: () => [wallet, producers, reach<Reads>()],
  steps: {
    produce: {
      trickle: {
        pass: "both",
        run: (s, ctx) => {
          if (ctx.dtMs === 0) return;
          // The same capped rate the page and the economy test read, so nothing can drift between them.
          const glyphs = idleGlyphRateOf(s).mul(ctx.dtMs / 1000);
          if (glyphs.lte(0)) return;
          wallet.draft.credit(s, "glyphs", glyphs);
        },
      },
    },
  },
});
