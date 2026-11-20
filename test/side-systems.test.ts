// Proves the side systems on `watchpot/core` do what the plan says: the bench prices and counts pieces, the grid
// opens in rings and rewards adjacency, the auto-arrange never loses to an empty board, an expedition pays exactly
// what it rolled, a caught moth starts its blessing (and its windfall), and the records fold a run and a life.
import { describe, expect, test } from "bun:test";
import {
  createGameStorage,
  createIdleStore,
  createMemoryBackend,
  D,
  defineFeature,
  defineGame,
  MINUTE_MS,
} from "watchpot/core";
import { START } from "../src/content/economy";
import { MOSAIC_PIECES } from "../src/content/mosaic";
import { WORDS } from "../src/content/words";
import { expeditions } from "../src/game/expeditions";
import { autoArrangeMosaic, crafting, held, mosaic, score } from "../src/game/mosaic";
import { records } from "../src/game/records";
import { boosts, visitors } from "../src/game/visitor";
import { wallet } from "../src/game/wallet";

/** The two slices the side systems reach by type, kept as small as the reaches ask. */
const vim = defineFeature({
  key: "vim",
  initial: () => ({ actTier: 1, tildeBond: 0 }),
});

const stats = defineFeature({
  key: "stats",
  initial: () => ({ inkRate: D(1) }),
});

/** A probe game over the side systems alone: no income, no screens, nothing to move but what a test moves. */
const probe = defineGame({
  id: "side-systems-probe",
  save: { key: "side-systems-probe.save", version: 1 },
  vocab: WORDS,
  features: [wallet, vim, stats, crafting, mosaic, expeditions, boosts, records, visitors],
});

/** Noon on a fixed day, the test kit's default instant. */
const T0 = Date.UTC(2026, 0, 1, 12);

/**
 * The test kit's `freshStore` without `watchpot/test`: its barrel re-exports the render helpers, which ask for
 * `@testing-library/react`, a peer this game does not install.
 */
function freshProbe(seed: number) {
  let now = T0;
  const store = createIdleStore(probe, {
    storage: createGameStorage(createMemoryBackend(), { debounceMs: 0 }),
    now: () => now,
    seed,
  });
  store.getState().catchUp(now);
  /** Moves the wall forward `ms` and ticks the store over it, at the new now. */
  const play = (ms: number) => {
    now += ms;
    store.getState().tick(ms, now);
  };
  return { store, play };
}

/** The source the board gives one piece in one cell (`<board>:<piece>@<x>,<y>`). */
const sourceOf = (piece: string, x: number, y: number) => `mosaic:${piece}@${x},${y}`;

describe("Plugin Mosaic", () => {
  test("the bench prices a piece, scales its cost on each cut, enforces limits, and counts it as held", () => {
    const { store } = freshProbe(1);
    store.getState().wallet.credit("ink", 100_000);
    store.getState().wallet.credit("shards", 20);

    const before = store.getState();
    expect(before.crafting.craft("cap-obj")).toBe(true);
    const after = store.getState();

    const capObj = MOSAIC_PIECES.find((p) => p.id === "cap-obj");
    const firstInk = capObj?.recipe.inputs.ink ?? 0;
    const firstShards = capObj?.recipe.inputs.shards ?? 0;
    expect(after.wallet.ink.toNumber()).toBe(before.wallet.ink.toNumber() - firstInk);
    expect(after.wallet.shards.toNumber()).toBe(before.wallet.shards.toNumber() - firstShards);
    expect(after.crafting.made["cap-obj"]?.toNumber()).toBe(1);
    expect(held(after, "cap-obj")).toBe(1);
    // Cutting one raises the next cut's ink price while keeping the flat shard price.
    expect(crafting.select.cost(after, "cap-obj").ink?.toNumber()).toBeGreaterThan(firstInk);
    expect(crafting.select.cost(after, "cap-obj").shards?.toNumber()).toBe(firstShards);
    // The free cap is held before the bench cuts anything.
    expect(held(after, "cap-hjkl")).toBe(1);

    // A recipe whose Act has not come is shut; the first Act's own pieces are open.
    expect(crafting.select.open(after, "ex-prism")).toBe(false);
    expect(crafting.select.open(after, "cap-obj")).toBe(true);
  });

  test("a piece lays on an open inner cell and is refused the closed outer ring", () => {
    const { store } = freshProbe(2);
    store.getState().wallet.credit("ink", 50_000);
    store.getState().wallet.credit("shards", 10);
    expect(store.getState().crafting.craft("cap-obj")).toBe(true);

    const board = mosaic.def.board;
    expect(store.getState().mosaic.place(board.cellOf(2, 2), "cap-obj")).toBeNull();
    expect(store.getState().mosaic.place(board.cellOf(5, 5), "cap-hjkl")).toBe("closed");
    expect(store.getState().mosaic.place(board.cellOf(0, 0), "cap-hjkl")).toBe("closed");

    // 25 Seals ever widen the ring to 5x5; 3 Codices ever open the whole 6x6.
    store.getState().wallet.credit("seals", 25);
    expect(store.getState().mosaic.place(board.cellOf(0, 0), "cap-hjkl")).toBeNull();
    store.getState().wallet.credit("codices", 3);
    expect(store.getState().crafting.craft("cap-hjkl")).toBe(true);
    expect(store.getState().mosaic.place(board.cellOf(5, 5), "cap-hjkl")).toBeNull();
  });

  test("adjacency changes what a piece gives", () => {
    const { store } = freshProbe(3);
    store.getState().wallet.credit("ink", 50_000);
    store.getState().wallet.credit("shards", 20);
    expect(store.getState().crafting.craft("cap-obj")).toBe(true);
    expect(store.getState().crafting.craft("cap-op")).toBe(true);

    const board = mosaic.def.board;
    store.getState().mosaic.place(board.cellOf(2, 2), "cap-obj");
    store.getState().mosaic.place(board.cellOf(3, 2), "cap-op");

    const addOf = (state: ReturnType<typeof store.getState>) => {
      const effect = mosaic.select
        .contributions(state)
        .find((c) => c.source === sourceOf("cap-obj", 2, 2))?.effect;
      return effect?.add;
    };

    // +0.40 alone, plus the content's +0.20 for the operator beside it.
    expect(addOf(store.getState())).toBeCloseTo(0.6, 5);
    store.getState().mosaic.lift(board.cellOf(3, 2));
    expect(addOf(store.getState())).toBeCloseTo(0.4, 5);
  });

  test("auto-arrange lays a board at least as good as an empty one", () => {
    const { store } = freshProbe(4);
    store.getState().wallet.credit("ink", 50_000);
    store.getState().wallet.credit("shards", 30);
    expect(store.getState().crafting.craft("cap-obj")).toBe(true);
    expect(store.getState().crafting.craft("cap-hjkl")).toBe(true);
    expect(store.getState().crafting.craft("switch-tactile")).toBe(true);

    const state = store.getState();
    const board = mosaic.def.board;
    const limits = mosaic.select.limits(state);

    const cells = autoArrangeMosaic(state);
    expect(Object.keys(cells).length).toBeGreaterThan(0);
    expect(score(board.contributions(cells, limits))).toBeGreaterThanOrEqual(
      score(board.contributions({}, limits)),
    );
  });
});

describe("Margin Expeditions", () => {
  test("slots grow with the ever-totals", () => {
    const { store } = freshProbe(5);
    expect(expeditions.select.slots(store.getState())).toBe(2);
    store.getState().wallet.credit("seals", 10);
    expect(expeditions.select.slots(store.getState())).toBe(3);
    store.getState().wallet.credit("codices", 2);
    expect(expeditions.select.slots(store.getState())).toBe(4);
  });

  test("an expedition pays exactly what it rolled, once it is back", () => {
    const { store, play } = freshProbe(7);
    const twin = freshProbe(7).store;

    expect(store.getState().expeditions.start("gutter-sweep")).toBeNull();
    expect(twin.getState().expeditions.start("gutter-sweep")).toBeNull();
    const entry = store.getState().expeditions.active[0];
    const twinEntry = twin.getState().expeditions.active[0];
    if (!entry || !twinEntry) throw new Error("the errand did not start");
    // Seeded: two profiles roll the same return, and a reload could not reroll it.
    expect(twinEntry.reward).toEqual(entry.reward);
    expect(entry.reward.shards).toBeGreaterThanOrEqual(1);
    expect(entry.reward.shards).toBeLessThanOrEqual(2);

    play(2 * MINUTE_MS + 1_000);
    expect(store.getState().expeditions.claim(entry.id)).toBe(true);
    const after = store.getState();
    expect(after.wallet.shards.toNumber()).toBe(entry.reward.shards);
    expect(after.wallet.treats.toNumber()).toBe(START.treats + entry.reward.treats);
    expect(after.expeditions.done["gutter-sweep"]).toBe(1);
    expect(after.expeditions.active.length).toBe(0);
  });

  test("an errand with a rebate hands ink back on claim", () => {
    const { store, play } = freshProbe(8);
    store.getState().wallet.credit("ink", 20_000);
    expect(store.getState().expeditions.start("burned-colophon")).toBeNull();
    expect(store.getState().wallet.ink.toNumber()).toBe(2_000);

    const entry = store.getState().expeditions.active[0];
    if (!entry) throw new Error("the errand did not start");
    play(10 * MINUTE_MS + 1_000);
    expect(store.getState().expeditions.claim(entry.id)).toBe(true);
    expect(store.getState().wallet.ink.toNumber()).toBe(2_000 + 6_000);
  });

  test("pay refuses without touching the wallet when the ink is short", () => {
    const { store } = freshProbe(9);
    expect(store.getState().wallet.ink.toNumber()).toBe(0);
    expect(store.getState().expeditions.start("index-stacks")).toBe("cannot-pay");
    const after = store.getState();
    expect(after.wallet.ink.toNumber()).toBe(0);
    expect(after.expeditions.active.length).toBe(0);
  });
});

describe("Margin Moth", () => {
  test("catching a moth starts its blessing and pays the windfall it carries", () => {
    const { store, play } = freshProbe(10);
    const seen = new Set<string>();

    for (let caught = 0; caught < 40 && seen.size < 3; caught++) {
      let waited = 0;
      while (!store.getState().visitors.kinds.visitor?.live && waited < 8 * MINUTE_MS) {
        play(5_000);
        waited += 5_000;
      }
      expect(store.getState().visitors.kinds.visitor?.live).not.toBeNull();

      const before = store.getState();
      const ink = before.wallet.ink;
      const treats = before.wallet.treats.toNumber();
      const shards = before.wallet.shards.toNumber();

      const outcome = store.getState().visitors.catch("visitor");
      if (!outcome) throw new Error("a live moth was not caught");
      const after = store.getState();

      expect(boosts.select.active(after, outcome, after.gameNow())).toBe(true);
      // The deluge pours 60 seconds of ink at the current Ink Flow (1 in this probe).
      if (outcome === "ink-deluge") expect(after.wallet.ink.sub(ink).toNumber()).toBe(60);
      // Tilde's stash comes with its treats and shards.
      if (outcome === "tilde-stash") {
        expect(after.wallet.treats.toNumber()).toBe(treats + 3);
        expect(after.wallet.shards.toNumber()).toBe(shards + 2);
      }
      seen.add(outcome);
    }

    expect(seen.size).toBe(3);
  });
});

describe("Records", () => {
  test("a sum folds across the run and the life; a peak keeps its highest", () => {
    const { store } = freshProbe(11);
    store.getState().records.add("edits", 2);
    store.getState().records.add("edits", 3);
    expect(store.getState().records.run("edits")).toBe(5);
    expect(store.getState().records.life("edits")).toBe(5);

    store.getState().records.note("glyphsPeak", 12);
    store.getState().records.note("glyphsPeak", 9);
    expect(records.select.value(store.getState(), "life", "glyphsPeak")?.toNumber()).toBe(12);
  });
});
