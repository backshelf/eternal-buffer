import { defineCurrencies } from "watchpot/core";
import { START } from "../content/economy";
import { MAIN, WORDS } from "../content/words";

/**
 * Every balance, under `wallet`. `earned` totals this run's main currency (what a prestige pays on); it goes back to
 * zero with the main currency at every reset.
 */
export const wallet = defineCurrencies({
  key: "wallet",
  vocab: WORDS,
  start: {
    [MAIN]: START.main,
  },
  earnedThisRun: { [MAIN]: "earned" },
});
