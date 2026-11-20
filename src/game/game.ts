import { defineGame, type StateOf } from "watchpot/core";
import { SLUG, WORDS } from "../content/words";
import { wall } from "./achievements";
import { trials } from "./challenges";
import { expeditions } from "./expeditions";
import { producers, scribeTrickle } from "./generators";
import { crafting, mosaic } from "./mosaic";
import { codex, volumes } from "./prestige";
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
 */
export const game = defineGame({
  id: SLUG,
  save: {
    key: `${SLUG}.save`,
    version: 4,
    migrations: {
      2: (saved) => saved,
      3: (saved) => {
        if (!saved || typeof saved !== "object") return saved;
        const root = saved as {
          vim?: { unlockedFamilies?: Record<string, true>; pendingRiteFamily?: string | null };
        };
        if (!root.vim) return saved;
        const unlocked = {
          "core-move": true as const,
          "core-edit": true as const,
          ...(root.vim.unlockedFamilies ?? {}),
        };
        const pending =
          root.vim.pendingRiteFamily === "core-move" || root.vim.pendingRiteFamily === "core-edit"
            ? null
            : root.vim.pendingRiteFamily;
        return { ...root, vim: { ...root.vim, unlockedFamilies: unlocked, pendingRiteFamily: pending } };
      },
      4: (saved) => {
        if (!saved || typeof saved !== "object") return saved;
        const root = saved as {
          vim?: {
            totalFoliosCleared?: number;
            totalAnomaliesCleared?: number;
            onboardingStep?: number;
            seenBeats?: Record<string, true>;
          };
        };
        if (!root.vim) return saved;
        const experienced =
          (root.vim.totalFoliosCleared ?? 0) > 0 || (root.vim.totalAnomaliesCleared ?? 0) > 0;
        return {
          ...root,
          vim: {
            ...root.vim,
            onboardingStep: root.vim.onboardingStep ?? (experienced ? 5 : 0),
            seenBeats: root.vim.seenBeats ?? (experienced ? { scribes: true } : {}),
          },
        };
      },
    },
  },
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
  ],
});

export type GameState = StateOf<typeof game.features>;
