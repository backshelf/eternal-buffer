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
  encodeProfile,
  saveSetAside,
} from "watchpot/core";
import { freshStore } from "watchpot/test";
import { type ActiveContractState, rollContract } from "../src/content/contracts";
import { FAMILY_BY_ID, type KeyFamilyId } from "../src/content/vimActs";
import { WORDS } from "../src/content/words";
import { game } from "../src/game/game";
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

/** One Errata Slip, hand-made so a test can ask for exactly the work it wants to see advanced. */
function slip(overrides: Partial<ActiveContractState> = {}): ActiveContractState {
  return {
    id: "errata-test",
    serial: 1,
    kind: "clean-cuts",
    title: "Test Slip",
    target: 2,
    progress: 0,
    rewardCurrency: "treats",
    rewardAmount: 3,
    completed: false,
    ...overrides,
  };
}

/** Puts a slip on the desk of a probe store. */
function installSlip(store: ReturnType<typeof probeStore>["store"], active: ActiveContractState): void {
  store.setState((s) => {
    s.vim.activeContract = active;
  });
}

describe("Tilde's wardrobe", () => {
  test("a cosmetic the Bond has not opened is refused, and one it has is worn", () => {
    const { store } = probeStore();

    expect(store.getState().vim.tildeCosmetic).toBe("none");
    // The Shelf Crown opens at Bond 12, and this cat barely knows you.
    expect(store.getState().vim.setTildeCosmetic("crown")).toBe(false);
    expect(store.getState().vim.tildeCosmetic).toBe("none");

    store.setState((s) => {
      s.vim.tildeBond = 12;
    });
    expect(store.getState().vim.setTildeCosmetic("crown")).toBe(true);
    expect(store.getState().vim.tildeCosmetic).toBe("crown");

    // Nothing at all is always allowed, and a cosmetic that does not exist never is.
    expect(store.getState().vim.setTildeCosmetic("none")).toBe(true);
    expect(store.getState().vim.setTildeCosmetic("no-such-cosmetic")).toBe(false);
    expect(store.getState().vim.tildeCosmetic).toBe("none");
  });
});

describe("the key mastery record", () => {
  test("counts keys, ignores junk, and stops at sixty-four distinct keys", () => {
    const { store } = probeStore();

    store.getState().vim.recordKeyUsage("d");
    store.getState().vim.recordKeyUsage("d");
    store.getState().vim.recordKeyUsage("w");
    expect(store.getState().vim.keyCounts.d).toBe(2);
    expect(store.getState().vim.keyCounts.w).toBe(1);

    // Empty and over-long keys are not keys at all.
    store.getState().vim.recordKeyUsage("");
    store.getState().vim.recordKeyUsage("a-key-that-never-was");
    expect(store.getState().vim.keyCounts[""]).toBeUndefined();
    expect(store.getState().vim.keyCounts["a-key-that-never-was"]).toBeUndefined();

    // Fill the record: the cap stops new keys but never stops counting the ones already kept.
    for (let i = 0; i < 70; i += 1) store.getState().vim.recordKeyUsage(`k${i}`);
    expect(Object.keys(store.getState().vim.keyCounts).length).toBe(64);
    expect(store.getState().vim.keyCounts.k69).toBeUndefined();
    store.getState().vim.recordKeyUsage("d");
    expect(store.getState().vim.keyCounts.d).toBe(3);
  });
});

describe("Vim mastery telemetry", () => {
  test("Clean Cuts build a streak, a sloppier edit breaks it, and the bests are kept", () => {
    const { store } = probeStore();

    store.getState().vim.resolveAnomaly("f:0", 4, 4, "hint.rot", 1);
    store.getState().vim.resolveAnomaly("f:1", 4, 4, "hint.rot", 1);
    expect(store.getState().vim.currentCleanStreak).toBe(2);
    expect(store.getState().vim.bestCleanStreak).toBe(2);
    expect(store.getState().vim.bestFlow).toBe(4);

    // A tidy edit ends the run's streak but not the record, and adds one Flow stack.
    store.getState().vim.resolveAnomaly("f:2", 6, 4, "hint.rot", 1);
    expect(store.getState().vim.currentCleanStreak).toBe(0);
    expect(store.getState().vim.bestCleanStreak).toBe(2);
    expect(store.getState().vim.bestFlow).toBe(5);

    // A new run's streak starts over; the best still stands.
    store.getState().vim.resolveAnomaly("f:3", 4, 4, "hint.rot", 1);
    expect(store.getState().vim.currentCleanStreak).toBe(1);
    expect(store.getState().vim.bestCleanStreak).toBe(2);
    // Flow went to 7, so the best follows it.
    expect(store.getState().vim.bestFlow).toBe(7);
  });
});

describe("Errata Slips", () => {
  test("a slip is drawn once and is the same slip until it is claimed or skipped", () => {
    const { store } = probeStore();

    expect(store.getState().vim.activeContract).toBeNull();
    const first = store.getState().vim.ensureContract();
    expect(first.serial).toBe(1);
    expect(first).toEqual(rollContract(1, 1));
    // Drawing again answers with the slip already on the desk.
    expect(store.getState().vim.ensureContract()).toEqual(first);
    expect(store.getState().vim.contractSerial).toBe(1);
  });

  test("Clean Cuts advance a clean-cuts slip, and it is claimed for its reward exactly once", () => {
    const { store } = probeStore();
    installSlip(store, slip({ kind: "clean-cuts", target: 2, rewardAmount: 3 }));

    store.getState().vim.resolveAnomaly("f:0", 4, 4, "hint.rot", 1);
    expect(store.getState().vim.activeContract?.progress).toBe(1);
    expect(store.getState().vim.activeContract?.completed).toBe(false);

    // An open slip claims nothing.
    expect(store.getState().vim.claimContract()).toBe(false);

    store.getState().vim.resolveAnomaly("f:1", 4, 4, "hint.rot", 1);
    expect(store.getState().vim.activeContract?.completed).toBe(true);
    expect(store.getState().vim.activeContract?.progress).toBe(2);

    const treatsBefore = store.getState().wallet.treats.toNumber();
    expect(store.getState().vim.claimContract()).toBe(true);
    expect(store.getState().wallet.treats.toNumber()).toBe(treatsBefore + 3);
    expect(store.getState().vim.contractsCompleted).toBe(1);
    expect(store.getState().vim.contractSerial).toBe(2);
    // The desk hands out the next slip at once, unfinished and at no progress.
    expect(store.getState().vim.activeContract?.serial).toBe(2);
    expect(store.getState().vim.activeContract?.progress).toBe(0);
    expect(store.getState().vim.activeContract?.completed).toBe(false);

    // The slip that paid is gone: nothing can pay it twice.
    const treatsAfter = store.getState().wallet.treats.toNumber();
    expect(store.getState().vim.claimContract()).toBe(false);
    expect(store.getState().wallet.treats.toNumber()).toBe(treatsAfter);
    expect(store.getState().vim.contractsCompleted).toBe(1);
  });

  test("skipping throws the slip away and draws the serial after it", () => {
    const { store } = probeStore();
    installSlip(store, slip({ serial: 1 }));

    const next = store.getState().vim.skipContract();
    expect(next.serial).toBe(2);
    expect(next.completed).toBe(false);
    expect(next.progress).toBe(0);
    expect(store.getState().vim.activeContract).toEqual(next);
    expect(store.getState().vim.contractSerial).toBe(2);
  });

  test("each kind of work advances the slip that asks for it, and no other", () => {
    const { store } = probeStore();

    // An anomaly pays off an anomaly-clear slip.
    installSlip(store, slip({ kind: "anomaly-clear", target: 6 }));
    store.getState().vim.resolveAnomaly("f:0", 9, 4, "hint.rot", 1);
    expect(store.getState().vim.activeContract?.progress).toBe(1);

    // A folio clear pays off a folio-clear slip.
    installSlip(store, slip({ kind: "folio-clear", target: 2 }));
    store.getState().vim.completeFolio(false);
    expect(store.getState().vim.activeContract?.progress).toBe(1);

    // Closing a folio without HJKL is its own slip.
    installSlip(store, slip({ kind: "no-hjkl-folio", target: 1 }));
    store.getState().vim.noteNoHjklFolio();
    expect(store.getState().vim.activeContract?.completed).toBe(true);

    // Flow at the ask meets a flow-reach slip.
    installSlip(store, slip({ kind: "flow-reach", target: 2 }));
    store.getState().vim.resolveAnomaly("f:1", 4, 4, "hint.rot", 1);
    expect(store.getState().vim.flow).toBeGreaterThanOrEqual(2);
    expect(store.getState().vim.activeContract?.completed).toBe(true);

    // Petting her pays off a pet-tilde slip, on her cooldown.
    installSlip(store, slip({ kind: "pet-tilde", target: 2 }));
    expect(store.getState().vim.petTilde().ok).toBe(true);
    expect(store.getState().vim.activeContract?.progress).toBe(1);
    expect(store.getState().vim.petTilde().ok).toBe(false);
    expect(store.getState().vim.activeContract?.progress).toBe(1);
  });
});

describe("the permanent record", () => {
  test("cosmetics, mastery and the slip on the desk survive a :w reset", () => {
    const { store } = probeStore();
    store.setState((s) => {
      s.vim.tildeBond = 12;
      s.vim.tildeCosmetic = "crown";
      s.vim.bestFlow = 21;
      s.vim.currentCleanStreak = 4;
      s.vim.bestCleanStreak = 9;
      s.vim.contractsCompleted = 3;
      s.vim.contractSerial = 4;
      s.vim.activeContract = slip({ serial: 4, progress: 1, completed: false });
      s.vim.keyCounts = { d: 12, w: 5 };
    });

    store.getState().resetRun({ depth: 1 });
    const after = store.getState().vim;
    expect(after.tildeCosmetic).toBe("crown");
    expect(after.bestFlow).toBe(21);
    expect(after.bestCleanStreak).toBe(9);
    // The streak is permanent too: the spec keeps it across a reset, like every telemetry field.
    expect(after.currentCleanStreak).toBe(4);
    expect(after.contractsCompleted).toBe(3);
    expect(after.contractSerial).toBe(4);
    expect(after.activeContract).toEqual(slip({ serial: 4, progress: 1, completed: false }));
    expect(after.keyCounts).toEqual({ d: 12, w: 5 });
  });
});

describe("the save", () => {
  test("version 5 backfills the Vim fields a version 4 save never had", () => {
    expect(game.save.version).toBe(5);
    const step = game.save.migrations?.[5];
    if (!step) throw new Error("the game declares no migration to version 5");

    const migrated = step({
      vim: {
        tildeBond: 7,
        totalCleanCuts: 11,
        hintMastery: { "hint.rot": 2 },
      },
      wallet: { glyphs: 42 },
    }) as {
      vim: Record<string, unknown>;
    };

    expect(migrated.vim.tildeCosmetic).toBe("none");
    expect(migrated.vim.bestFlow).toBe(0);
    expect(migrated.vim.currentCleanStreak).toBe(0);
    expect(migrated.vim.bestCleanStreak).toBe(0);
    expect(migrated.vim.contractsCompleted).toBe(0);
    expect(migrated.vim.contractSerial).toBe(1);
    expect(migrated.vim.activeContract).toBeNull();
    expect(migrated.vim.keyCounts).toEqual({});
    // Nothing the old save did know is clobbered.
    expect(migrated.vim.tildeBond).toBe(7);
    expect(migrated.vim.totalCleanCuts).toBe(11);
    expect(migrated.vim.hintMastery).toEqual({ "hint.rot": 2 });

    // A save that already carries a field keeps it.
    const kept = step({
      vim: {
        tildeCosmetic: "bell",
        bestFlow: 9,
        contractSerial: 6,
        activeContract: slip({ serial: 6 }),
        keyCounts: { d: 3 },
      },
    }) as {
      vim: Record<string, unknown>;
    };
    expect(kept.vim.tildeCosmetic).toBe("bell");
    expect(kept.vim.bestFlow).toBe(9);
    expect(kept.vim.contractSerial).toBe(6);
    expect(kept.vim.activeContract).toEqual(slip({ serial: 6 }));
    expect(kept.vim.keyCounts).toEqual({ d: 3 });

    // A save with no Vim slice at all is left for the merge to fill.
    expect(step({ wallet: { glyphs: 42 } })).toEqual({ wallet: { glyphs: 42 } });
  });

  test("a version 4 save loads and keeps its progress", () => {
    const v4 = encodeProfile(
      {
        vim: {
          tildeBond: 5,
          tildePets: 9,
          totalCleanCuts: 40,
          highestAct: 3,
          onboardingStep: 5,
          unlockedFamilies: { "core-move": true, "core-edit": true, "word-stride": true },
          hintMastery: { "hint.rot": 5 },
        },
        wallet: { glyphs: 1_000, treats: 4 },
      },
      0,
      4,
    );

    const { store } = freshStore(game, { save: v4, catchUp: false, seed: "migration" });
    expect(saveSetAside(store)).toBeNull();

    const loaded = store.getState().vim;
    expect(loaded.tildeBond).toBe(5);
    expect(loaded.totalCleanCuts).toBe(40);
    expect(loaded.hintMastery["hint.rot"]).toBe(5);
    expect(loaded.tildeCosmetic).toBe("none");
    expect(loaded.bestFlow).toBe(0);
    expect(loaded.currentCleanStreak).toBe(0);
    expect(loaded.bestCleanStreak).toBe(0);
    expect(loaded.contractsCompleted).toBe(0);
    expect(loaded.contractSerial).toBe(1);
    expect(loaded.activeContract).toBeNull();
    expect(loaded.keyCounts).toEqual({});
  });
});
