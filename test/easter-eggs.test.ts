// Proves the whisper network the archive keeps: every Easter egg is triggerable exactly once and carries its words,
// its treats and its secret tile; the eight secret tiles exist and can be earned; and all forty-eight Marginalia
// tiles are definitions this build can read. Rule and content only: a fresh seeded store, no DOM, no wall clock.
import { describe, expect, test } from "bun:test";
import { D } from "watchpot/core";
import { freshStore } from "watchpot/test";
import { ACHIEVEMENTS, COLUMNS, ROW_TITLES } from "../src/content/achievements";
import { EASTER_EGGS, EGG_BY_ID } from "../src/content/easterEggs";
import { met, type WallReads, wall } from "../src/game/achievements";
import { game } from "../src/game/game";

/** Row 6 of the wall, in reading order: the eight tiles the archive only admits in a whisper. */
const SECRETS: readonly string[] = [
  "trapped-in-vim",
  "meaning-of-42",
  "bram-smile",
  "esc-panic",
  "off-the-keyboard",
  "rm-rf-denied",
  "wrong-church",
  "cat-whisperer",
];

/** The reads a wall condition asks about, all at their lowest: nothing owned, earned, placed or discovered. */
const ZERO: WallReads = {
  wallet: { earned: D(0) },
  generators: { owned: {} },
  upgrades: { ranks: {} },
  sealUpgrades: { ranks: {} },
  volumes: { runs: 0 },
  codex: { runs: 0 },
  vim: {
    totalFoliosCleared: 0,
    totalCleanCuts: 0,
    totalAnomaliesCleared: 0,
    flow: 0,
    highestAct: 1,
    tildeBond: 0,
    tildePets: 0,
    discoveredPairs: {},
    unlockedFamilies: {},
  },
  mosaic: { cells: {} },
  expeditions: { done: 0 },
  trials: { completions: {} },
};

/** A profile at the start of its life, on the test kit's clock, its draws seeded so the page and the drops repeat. */
const aFreshStore = (seed: string) => freshStore(game, { seed });

describe("the Easter egg list", () => {
  test("every egg has a unique id and says what triggers it and what it toasts", () => {
    const ids = EASTER_EGGS.map((egg) => egg.id);
    expect(new Set(ids).size).toBe(ids.length);
    // The spec asks for twenty-four at the least; the archive wrote twenty-five.
    expect(EASTER_EGGS.length).toBeGreaterThanOrEqual(24);

    for (const egg of EASTER_EGGS) {
      expect(egg.id).toBe(egg.id.trim());
      expect(egg.id).not.toBe("");
      expect(egg.trigger.trim()).not.toBe("");
      expect(egg.toast.trim()).not.toBe("");
      // The editor looks an egg up by its id: the record and the list hold the same object.
      expect(EGG_BY_ID[egg.id]).toBe(egg);
    }
    expect(Object.keys(EGG_BY_ID).length).toBe(EASTER_EGGS.length);
  });
});

describe("finding an egg", () => {
  test("an egg is noted the first time and never again", () => {
    const { store } = aFreshStore("eggs");
    expect(Object.keys(store.getState().vim.easterEggsFound).length).toBe(0);

    for (const egg of EASTER_EGGS) {
      expect(store.getState().vim.triggerEasterEgg(egg.id)).toBe(true);
      expect(store.getState().vim.easterEggsFound[egg.id]).toBe(true);
      // The toast is not repeated and the record does not move.
      expect(store.getState().vim.triggerEasterEgg(egg.id)).toBe(false);
    }

    expect(Object.keys(store.getState().vim.easterEggsFound).length).toBe(EASTER_EGGS.length);
  });

  test(":q! presses its bonus treat into your palm exactly once", () => {
    const { store } = aFreshStore("quit");
    const egg = EASTER_EGGS.find((entry) => entry.trigger === ":q!");
    expect(egg).toBeDefined();
    const bonus = egg?.bonusTreats ?? 0;
    expect(bonus).toBeGreaterThan(0);
    if (!egg) throw new Error("the :q! egg is missing");

    const before = store.getState().wallet.treats;
    expect(store.getState().vim.triggerEasterEgg(egg.id)).toBe(true);
    expect(store.getState().wallet.treats.sub(before).toNumber()).toBe(bonus);

    // Found once: the treat is not pressed twice for the same joke.
    expect(store.getState().vim.triggerEasterEgg(egg.id)).toBe(false);
    expect(store.getState().wallet.treats.sub(before).toNumber()).toBe(bonus);
  });
});

describe("the secret Marginalia", () => {
  test("the eight secret tiles are all there, all secret, and all earnable", () => {
    const { store } = aFreshStore("secrets");

    const secrets = ACHIEVEMENTS.filter((entry) => entry.secret === true).map((entry) => entry.id);
    expect(secrets).toEqual([...SECRETS]);
    // They are the wall's last row: six rows of eight, the eighth column of the list's last place.
    expect(ACHIEVEMENTS.slice(-SECRETS.length).map((entry) => entry.id)).toEqual([...SECRETS]);

    for (const id of SECRETS) {
      expect(ACHIEVEMENTS.some((entry) => entry.id === id)).toBe(true);
      expect(store.getState().achievements.award(id)).toBe(true);
      expect(store.getState().achievements.earned[id]).toBeDefined();
    }
    // Every tile an egg names is one of them.
    for (const egg of EASTER_EGGS) {
      if (egg.achievementId === undefined) continue;
      expect(SECRETS).toContain(egg.achievementId);
    }
  });

  test("an egg's tile is earned once, and an unknown id is refused", () => {
    const { store } = aFreshStore("tiles");
    const named = EASTER_EGGS.filter((egg) => egg.achievementId !== undefined);
    expect(named.length).toBeGreaterThan(0);
    const tiles = new Set(named.map((egg) => egg.achievementId));

    for (const egg of named) {
      const id = egg.achievementId as string;
      expect(store.getState().achievements.award(id)).toBe(true);
      expect(store.getState().achievements.earned[id]).toBeDefined();
      // Idempotent: a second award of the same tile does nothing and says so.
      expect(store.getState().achievements.award(id)).toBe(false);
    }
    expect(Object.keys(store.getState().achievements.earned).length).toBe(tiles.size);

    expect(store.getState().achievements.award("no-such-tile")).toBe(false);
    expect(store.getState().achievements.earned["no-such-tile"]).toBeUndefined();
  });

  test("cat-whisperer is also earned by a hundred pets, off the wall's own check", () => {
    const { store, play } = aFreshStore("pets");
    expect(store.getState().achievements.earned["cat-whisperer"]).toBeUndefined();

    // A hundred pets, written straight onto the state: the tally the wall reads, without a hundred cooldowns.
    store.setState((state) => ({ vim: { ...state.vim, tildePets: 100 } }));
    play(1_000);

    expect(store.getState().achievements.earned["cat-whisperer"]).toBeDefined();
  });
});

describe("the wall", () => {
  test("all forty-eight tiles are definitions this build can read", () => {
    expect(ACHIEVEMENTS.length).toBe(48);
    expect(COLUMNS).toBe(8);
    expect(ROW_TITLES.length).toBe(6);
    expect(ACHIEVEMENTS.length).toBe(COLUMNS * ROW_TITLES.length);
    // The feature carries the same list: the screen and the closing check read one wall.
    expect(wall.def.list.length).toBe(ACHIEVEMENTS.length);
    expect(wall.def.columns).toBe(COLUMNS);

    const ids = ACHIEVEMENTS.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const entry of ACHIEVEMENTS) {
      expect(entry.id).toBe(entry.id.trim());
      expect(entry.id).not.toBe("");
      expect(entry.name.trim()).not.toBe("");
      expect(entry.line.trim()).not.toBe("");
      // The build understands every condition: `met` answers false at zero, and never throws on one.
      expect(met(entry.when, ZERO)).toBe(false);
    }
  });
});
