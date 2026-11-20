// The Vim feature, on a probe game: the wallet, the buffs, a stats stub and a trials stub, so the tests are
// about the feature's own rules and never about Wave 4's wiring.
import { describe, expect, test } from "bun:test";
import {
  createGameStorage,
  createIdleStore,
  createMemoryBackend,
  D,
  defineBuffs,
  defineFeature,
  defineGame,
  type Effect,
} from "watchpot/core";
import { FAMILY_BY_ID, type KeyFamilyId } from "../src/content/vimActs";
import { WORDS } from "../src/content/words";
import { vim } from "../src/game/vim";
import { wallet } from "../src/game/wallet";

/** The stats the feature reaches by type: a flat number each, no graph behind them. */
const probeStats = defineFeature({
  key: "stats",
  initial: () => ({}),
  derived: { output: () => D(1), tempo: () => D(1) },
});

/** The trial flags the feature reads. Wave 4's `defineChallenges` keeps them in the same place. */
const probeTrials = defineFeature({
  key: "trials",
  initial: () => ({ rules: [] as string[] }),
  actions: (api) => ({
    setRules: (rules: string[]) =>
      api.set((s) => {
        s.trials.rules = rules;
      }),
  }),
});

/** Tilde's two blessings, as timers: the probe only needs the ids the feature starts. */
const probeBoosts = defineBuffs<"boosts", Effect<"tempo">>({
  key: "boosts",
  list: [
    { id: "tilde-purr", durationMs: 20_000, stack: "refresh" },
    { id: "tilde-approval", durationMs: 60_000, stack: "refresh" },
  ],
});

const probe = defineGame({
  id: "vim-probe",
  save: { key: "vim-probe.save", version: 1 },
  vocab: WORDS,
  features: [wallet, probeBoosts, probeStats, probeTrials, vim],
});

/** A store on a wall the test moves by hand, over a memory backend. */
function probeStore() {
  let now = 1_700_000_000_000;
  const store = createIdleStore(probe, {
    storage: createGameStorage(createMemoryBackend()),
    now: () => now,
    seed: "vim",
  });
  return {
    store,
    /** Moves the wall forward and ticks the game over it, as the interval clock would. */
    advance(ms: number) {
      now += ms;
      store.getState().tick(ms, now);
    },
  };
}

describe("unlocking a Keycap Family", () => {
  test("core Act I families start unlocked and paid families pay their price, owe a rite, and survive resets", () => {
    const { store } = probeStore();

    // Act I core families are already bound from the first night and never queue a nonexistent rite.
    expect(store.getState().vim.unlockedFamilies["core-move"]).toBe(true);
    expect(store.getState().vim.unlockedFamilies["core-edit"]).toBe(true);
    expect(store.getState().vim.unlockFamily("core-move")).toBe(false);
    expect(store.getState().vim.pendingRiteFamily).toBeNull();

    // A paid family costs the price the content sets, and the profile starts with none.
    const price = FAMILY_BY_ID["word-stride"].cost.amount;
    expect(price).toBeGreaterThan(0);
    expect(store.getState().vim.unlockFamily("word-stride")).toBe(false);
    // A family whose prerequisite is not bought is refused whatever the wallet holds.
    expect(store.getState().vim.unlockFamily("char-snipe")).toBe(false);

    store.getState().wallet.credit("glyphs", price + 20);
    expect(store.getState().vim.unlockFamily("word-stride")).toBe(true);
    expect(store.getState().wallet.glyphs.toNumber()).toBe(20);
    expect(store.getState().vim.pendingRiteFamily).toBe("word-stride");
    expect(store.getState().vim.highestAct).toBe(2);

    store.getState().resetRun({ depth: 1 });
    expect(store.getState().vim.unlockedFamilies["word-stride"]).toBe(true);
    expect(store.getState().vim.unlockedFamilies["core-move"]).toBe(true);
    expect(store.getState().wallet.glyphs.toNumber()).toBe(0);

    store.getState().resetRun({ depth: 2 });
    expect(store.getState().vim.unlockedFamilies["word-stride"]).toBe(true);
    expect(store.getState().vim.highestAct).toBe(2);
  });

  test("an unknown family is refused", () => {
    const { store } = probeStore();
    // The editor and the screens only ever pass known ids; the action still refuses anything else.
    expect(store.getState().vim.unlockFamily("no-such-family" as KeyFamilyId)).toBe(false);
  });

  test("Act VII .vimrc rules and dual-split resonance take real effect", () => {
    const { store } = probeStore();
    // Raise to Act VII by unlocking an Act VII family directly in state.
    store.setState((s) => {
      s.vim.unlockedFamilies["ex-power"] = true;
      s.vim.unlockedFamilies["dual-split"] = true;
      s.vim.unlockedFamilies["vimrc-forge"] = true;
      s.vim.tildeBond = 2;
    });

    const base = store.getState().vim.resolveAnomaly("r:base", 7, 4, "hint.rot", 1);
    expect(base.grade).toBe("tidy");

    expect(store.getState().vim.toggleVimrcRule("par-forgiveness")).toBe(true);
    expect(store.getState().vim.toggleVimrcRule("ink-siphon")).toBe(true);
    expect(store.getState().vim.toggleVimrcRule("cat-familiar")).toBe(true);

    // Cat familiar boosts Tilde bond from +20% (1.2) to +30% (1.3).
    expect(store.getState().vim.tildeClarityMult.toNumber()).toBeCloseTo(1.3, 10);

    // Par forgiveness widens Clean Cut window by +3 (7 keys on par 4 is now Clean Cut) and ink-siphon drips ink.
    const inkBefore = store.getState().wallet.ink;
    const forgiven = store.getState().vim.resolveAnomaly("r:forgiven", 7, 4, "hint.rot", 1);
    expect(forgiven.grade).toBe("clean");
    expect(store.getState().wallet.ink.gt(inkBefore)).toBe(true);

    // Dual split multiplies payouts cleanly.
    store.getState().vim.setDualSplit(true);
    const splitEdit = store.getState().vim.resolveAnomaly("r:split", 4, 4, "hint.rot", 1);
    expect(splitEdit.paid.gt(forgiven.paid)).toBe(true);
  });
});

describe("par scoring", () => {
  test("a Clean Cut pays more than a sloppy edit and adds two Flow", () => {
    const { store } = probeStore();

    const sloppy = store.getState().vim.resolveAnomaly("folio:0", 9, 4, "hint.rot", 1);
    expect(sloppy.grade).toBe("mended");
    expect(store.getState().vim.flow).toBe(0);
    expect(store.getState().vim.hintMastery["hint.rot"]).toBeUndefined();

    const clean = store.getState().vim.resolveAnomaly("folio:1", 4, 4, "hint.rot", 1);
    expect(clean.grade).toBe("clean");
    expect(clean.paid.gt(sloppy.paid)).toBe(true);
    expect(store.getState().vim.flow).toBe(2);
    expect(store.getState().vim.hintMastery["hint.rot"]).toBe(1);
    expect(store.getState().vim.totalCleanCuts).toBe(1);
    expect(store.getState().vim.totalAnomaliesCleared).toBe(2);
  });

  test("the same anomaly id is never paid for twice", () => {
    const { store } = probeStore();

    const first = store.getState().vim.resolveAnomaly("folio:0", 4, 4, "hint.rot", 1);
    const again = store.getState().vim.resolveAnomaly("folio:0", 4, 4, "hint.rot", 1);
    expect(first.paid.toNumber()).toBeGreaterThan(0);
    expect(again.paid.toNumber()).toBe(0);
    expect(store.getState().vim.totalAnomaliesCleared).toBe(1);
  });

  test("One-Shot Surgeon pays nothing over par", () => {
    const { store } = probeStore();
    store.getState().trials.setRules(["parOnly"]);

    const overPar = store.getState().vim.resolveAnomaly("folio:0", 5, 4, "hint.rot", 1);
    expect(overPar.paid.toNumber()).toBe(0);

    const underPar = store.getState().vim.resolveAnomaly("folio:1", 4, 4, "hint.rot", 1);
    expect(underPar.paid.toNumber()).toBeGreaterThan(0);
  });
});

describe("the Grammar Codex", () => {
  test("each pair multiplies output once, and only once", () => {
    const { store } = probeStore();

    expect(store.getState().vim.recordGrammar("d+w")).toBe(true);
    expect(store.getState().vim.codexPairMult.toNumber()).toBeCloseTo(1.06, 10);

    expect(store.getState().vim.recordGrammar("d+w")).toBe(false);
    expect(store.getState().vim.codexPairMult.toNumber()).toBeCloseTo(1.06, 10);

    expect(store.getState().vim.recordGrammar("c+iw")).toBe(true);
    expect(store.getState().vim.codexPairMult.toNumber()).toBeCloseTo(1.06 ** 2, 10);
  });
});

describe("Tilde", () => {
  test("petting obeys her cooldown and feeding spends treats for bond", () => {
    const { store, advance } = probeStore();

    expect(store.getState().vim.petTilde().ok).toBe(true);
    expect(store.getState().vim.tildePets).toBe(1);
    expect(store.getState().vim.petTilde().ok).toBe(false);

    advance(31_000);
    expect(store.getState().vim.petTilde().ok).toBe(true);
    expect(store.getState().vim.tildePets).toBe(2);

    // Profile starts with 0 treats: no bond until you actually earn one.
    expect(store.getState().wallet.treats.toNumber()).toBe(0);
    expect(store.getState().vim.feedTilde()).toBe(false);

    store.getState().wallet.credit("treats", 1);
    expect(store.getState().vim.feedTilde()).toBe(true);
    expect(store.getState().wallet.treats.toNumber()).toBe(0);
    expect(store.getState().vim.tildeBond).toBe(1);
    expect(store.getState().vim.tildeClarityMult.toNumber()).toBeCloseTo(1.1, 10);

    // No treats, no bond.
    expect(store.getState().vim.feedTilde()).toBe(false);
    expect(store.getState().vim.tildeBond).toBe(1);

    store.getState().wallet.credit("treats", 5);
    expect(store.getState().vim.feedTilde()).toBe(true);
    expect(store.getState().vim.tildeBond).toBe(2);
  });
});

describe("the run", () => {
  test("a run reset clears Flow, the folio and the rite, and rolls a new seed", () => {
    const { store } = probeStore();
    store.getState().vim.resolveAnomaly("folio:0", 4, 4, "hint.rot", 1);
    const before = store.getState().vim;

    store.getState().resetRun({ depth: 1 });
    const after = store.getState().vim;
    expect(after.flow).toBe(0);
    expect(after.echoStacks).toBe(0);
    expect(after.resolvedAnomalyIds).toEqual({});
    expect(after.pendingRiteFamily).toBeNull();
    expect(after.runFolios).toBe(0);
    expect(after.folioSerial).toBe(before.folioSerial + 1);
    expect(after.folioSeed).not.toBe(before.folioSeed);
    // The counters that are the record of play are permanent.
    expect(after.totalAnomaliesCleared).toBe(1);
    expect(after.hintMastery["hint.rot"]).toBe(1);
  });

  test("clearing a folio pays a bonus and rolls the next page", () => {
    const { store } = probeStore();
    const before = store.getState().vim.folioSeed;

    expect(store.getState().vim.completeFolio(false).nextSeed).toBe(before);

    store.getState().vim.resolveAnomaly("folio:0", 4, 4, "hint.rot", 1);
    const cleared = store.getState().vim.completeFolio(false);
    expect(cleared.bonus.toNumber()).toBeGreaterThan(0);
    expect(cleared.nextSeed).not.toBe(before);
    expect(store.getState().vim.folioSeed).toBe(cleared.nextSeed);
    expect(store.getState().vim.resolvedAnomalyIds).toEqual({});
    expect(store.getState().vim.totalFoliosCleared).toBe(1);
    expect(store.getState().vim.runFolios).toBe(1);
  });
});
