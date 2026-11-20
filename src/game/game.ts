import { defineGame, type StateOf } from "watchpot/core";
import { SLUG, WORDS } from "../content/words";
import { wall } from "./achievements";
import { producers } from "./generators";
import { ascension } from "./prestige";
import { settings } from "./settings";
import { stats } from "./stats";
import { upgrades } from "./tree";
import { boosts, visitors } from "./visitor";
import { wallet } from "./wallet";

/**
 * The game: its features in order (each phase of a pass runs their steps in this order; the stats are derived, so
 * they need no place), its words, its save. A change to the saved shape bumps `save.version` and adds a migration
 * step (`watchpot` README › Saves).
 */
export const game = defineGame({
  id: SLUG,
  save: { key: `${SLUG}.save`, version: 1 },
  vocab: WORDS,
  features: [wallet, settings, upgrades, ascension, wall, boosts, visitors, stats, producers],
});

export type GameState = StateOf<typeof game.features>;
