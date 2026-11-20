import { defineCurrencies } from "watchpot/core";
import { START } from "../content/economy";
import { WORDS } from "../content/words";

/**
 * Every balance, under `wallet`. `earned` totals this run's main currency (what a prestige pays on); it goes back to
 * zero with the main currency at every reset. Seals and shards are wiped only by a deeper reset (`:wq`), treats and
 * codices never are. `sealsEver` and `codicesEver` total every one ever, for the layers' unlock gates.
 */
export const wallet = defineCurrencies({
  key: "wallet",
  vocab: WORDS,
  start: START,
  depth: { glyphs: 1, ink: 1, seals: 2, shards: 2, treats: "never", codices: "never" },
  earnedThisRun: { glyphs: "earned" },
  earnedEver: { glyphs: "glyphsEver", seals: "sealsEver", codices: "codicesEver" },
});
