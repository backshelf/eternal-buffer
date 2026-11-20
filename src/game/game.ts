import { defineGame, type StateOf } from "watchpot/core";
import { SLUG, WORDS } from "../content/words";
import { wall } from "./achievements";
import { trials } from "./challenges";
import { expeditions } from "./expeditions";
import { producers, scribeTrickle } from "./generators";
import { crafting, mosaic } from "./mosaic";
import { ascension, codex, volumes } from "./prestige";
import { records } from "./records";
import { settings } from "./settings";
import { stats } from "./stats";
import { sealUpgrades, upgrades } from "./tree";
import { vim } from "./vim";
import { boosts, visitors } from "./visitor";
import { wallet } from "./wallet";

/**
 * The game: its features in order (each phase of a pass runs their steps in this order; the stats are derived, so
 * they need no place), its words, its save. A change to the saved shape bumps `save.version` and adds a migration
 * step (`watchpot` README › Saves).
 *
 * `ascension` is the scaffold's single prestige layer, kept only until its screens move to `volumes`/`codex`.
 */
export const game = defineGame({
  id: SLUG,
  save: { key: `${SLUG}.save`, version: 2, migrations: { 2: (saved) => saved } },
  vocab: WORDS,
  features: [
    wallet,
    settings,
    vim,
    upgrades,
    sealUpgrades,
    volumes,
    codex,
    trials,
    crafting,
    mosaic,
    expeditions,
    wall,
    boosts,
    visitors,
    records,
    stats,
    producers,
    scribeTrickle,
    ascension,
  ],
});

export type GameState = StateOf<typeof game.features>;
