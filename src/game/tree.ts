import { defineUpgradeTree, reach } from "watchpot/core";
import { RUN_NODES, SEAL_NODES, type UpgradeNode } from "../content/tree";
import type { Currency } from "../content/words";
import { type IncomeSources, incomeOf } from "./income";
import { wallet } from "./wallet";

/** The currency only a rebound codex pays in: a node priced in it waits for the first one. */
const CODICES: Currency = "codices";

/**
 * What the next rank of a node is worth to the auto-player: the income one more adds a second. `output` counts at
 * face value, `offline` at half (it only pays while away) and every other stat at a tenth (it needs work to show).
 */
function worthOf(s: IncomeSources, node: UpgradeNode): number {
  const rate = incomeOf(s).toNumber();
  return node.effects.reduce((sum, effect) => {
    // A fixed number, or nothing: the sim never reads an effect worked out from state.
    const mul = typeof effect.mul === "number" ? effect.mul : 1;
    const add = typeof effect.add === "number" ? effect.add : 0;
    if (effect.stat === "output") return sum + rate * (mul - 1);
    if (effect.stat === "offline") return sum + rate * add * 0.5;
    return sum + rate * (mul - 1 + add) * 0.1;
  }, 0);
}

/**
 * The run's half of the Keycap Codex, under `upgrades`: fourteen nodes bought with the run's own glyphs, cleared by
 * every `:w`. Its effects reach the stats as contributions (`stats.ts`). It declares the auto-player's moves itself,
 * one per rank that can be bought; `worth` says what a rank adds in the sim's unit.
 */
export const upgrades = defineUpgradeTree({
  key: "upgrades",
  nodes: RUN_NODES,
  wallet,
  // Worth reads the income a rank raises: the stats and the scribes, reached by their state types.
  reach: reach<IncomeSources>(),
  worth: (s, node) => worthOf(s, node),
});

/**
 * The half that survives `:w`, under `sealUpgrades`: ten nodes bought with seals and codices, cleared only by `:wq`.
 * A node priced in codices is held back until the first rebind (`codicesEver >= 1`); the seal-priced ones open at
 * once, so a rebound archive still has somewhere to spend its seals.
 */
export const sealUpgrades = defineUpgradeTree({
  key: "sealUpgrades",
  nodes: SEAL_NODES,
  wallet,
  reset: { depth: 2 },
  open: (s, node) => node.cost.every((c) => c.currency !== CODICES) || s.wallet.codicesEver.gte(1),
  reach: reach<IncomeSources>(),
  worth: (s, node) => worthOf(s, node),
});
