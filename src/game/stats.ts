import { type Decimal, defineStats, rankContributions, reach } from "watchpot/core";
import { POWER } from "../content/achievements";
import { OFFLINE_BASE } from "../content/economy";
import { BONUS_PER_UNIT } from "../content/prestige";
import { NODES } from "../content/tree";
import { WORDS } from "../content/words";
import { wall } from "./achievements";
import { upgrades } from "./tree";
import { boosts } from "./visitor";

/** The stats as a reader sees them: each a Decimal under its id (`s.stats.output`). */
export type Stats = { readonly [P in "output" | "offline" | "gain"]: Decimal };

/**
 * The stats, under `stats`: `output` (a multiplier on the core's income), `offline` (the share paid while away, never
 * above all of it) and `gain` (a multiplier on what a prestige pays). Each is worked out from the state whenever
 * something it reads changes, and never saved. Every feature that raises one feeds it here, and nothing else reads
 * the content's effects: a feature's own list of what it gives (a tree's ranks, a collection's copies, the running
 * buffs) as `contributions`, a number read off the state as a source. `stats.select.explain(state, "output")` is
 * the breakdown behind a number.
 */
export const stats = defineStats({
  key: "stats",
  vocab: WORDS,
  reach: () => [
    upgrades,
    wall,
    boosts,
    // The layer reads `gain`, so it is reached by its state's type.
    reach<{ prestige: { currency: Decimal } }>(),
  ],
  stats: {
    output: { base: 1 },
    offline: { base: OFFLINE_BASE, hardcap: 1 },
    gain: { base: 1 },
  },
  sources: [
    {
      label: "prestige",
      owner: "prestige",
      effects: [{ stat: "output", mul: (q) => 1 + BONUS_PER_UNIT * q.prestige.currency.toNumber() }],
    },
    {
      label: "achievements",
      owner: "achievements",
      effects: [{ stat: "output", mul: (q) => wall.select.power(q, POWER) }],
    },
  ],
  contributions: (s) => [
    ...rankContributions("upgrades", NODES, s.upgrades.ranks),
    // Every buff still listed is running: the buffs' own step ends one whose time is up at the start of each pass.
    ...boosts.select.contributions(s),
  ],
});
