// The active-first promise, proved: a hand on the buffer always out-earns a desk left alone, and neither `:w` nor
// `:wq` takes back what the archive taught you.
import { describe, expect, test } from "bun:test";
import { D, type Decimal, ZERO } from "watchpot/core";
import { autoPlayer } from "watchpot/sim";
import { freshStore } from "watchpot/test";
import { type GameState, game } from "../src/game/game";
import { activeVimRateOf, idleGlyphRateOf, incomeOf, inkRateOf } from "../src/game/income";

/** A step of a run: five seconds of the desk and two Clean Cuts on the folio on screen. */
const STEP_MS = 5_000;
/** A look at the moves every thirty seconds: six steps. */
const LOOK_EVERY = 6;

/** An active player: a fresh store, the auto-player buying, and an edit every two seconds. */
function activePlayer() {
  const { store, play } = freshStore(game, { seed: "economy" });
  const player = autoPlayer(game, {
    objective: (s) => incomeOf(s).toNumber(),
    balance: (s, currency) => (s.wallet as unknown as Record<string, Decimal>)[currency] ?? ZERO,
  });
  let looks = 0;
  return {
    store,
    /** One step: five seconds of the desk down, two Clean Cuts, and the auto-player's look on the half minute. */
    step() {
      play(STEP_MS);
      for (let edit = 0; edit < 2; edit++) store.getState().vim.simulateActiveEdit();
      if (looks % LOOK_EVERY === 0) player.look(store);
      looks += 1;
    },
    /** Plays `minutes` of a sitting, the hand on the buffer the whole time. */
    play(minutes: number) {
      const steps = Math.round((minutes * 60_000) / STEP_MS);
      for (let i = 0; i < steps; i++) this.step();
    },
  };
}

/** The keys the archive has taught: the families unlocked, in a stable order. */
const keys = (s: GameState) => Object.keys(s.vim.unlockedFamilies).sort();

describe("the active-first economy", () => {
  test("the hand out-earns the desk ten minutes, an hour and a bind later", () => {
    const run = activePlayer();
    const outearns = () => {
      const s = run.store.getState();
      // The trickle is real: a comparison against nothing would prove nothing.
      expect(idleGlyphRateOf(s).gt(0)).toBe(true);
      expect(activeVimRateOf(s).gt(idleGlyphRateOf(s))).toBe(true);
    };

    run.play(10);
    outearns();

    run.play(50);
    outearns();
    expect(inkRateOf(run.store.getState()).gt(0)).toBe(true);

    // A volume bound by hand: the run starts over and the epoch carries its seals. The first bind is a ~1:42 climb
    // by the fitted curve, so the fixture lends the run its earnings rather than playing the whole evening.
    run.store.setState((s) => {
      s.wallet.earned = D(3e7);
    });
    expect(run.store.getState().volumes.bind()).toBe(true);
    run.play(10);
    outearns();
  }, 30_000);

  test(":w keeps every keycap family while it empties the run", () => {
    const run = activePlayer();
    run.play(10);

    const before = run.store.getState();
    const unlocked = keys(before);
    expect(unlocked.length).toBeGreaterThan(0);
    expect(before.wallet.glyphs.gt(0)).toBe(true);
    expect(before.wallet.ink.gt(0)).toBe(true);

    // The same loan as above: the test is about what `:w` keeps, not about how long the climb takes.
    run.store.setState((s) => {
      s.wallet.earned = D(3e7);
    });
    expect(run.store.getState().volumes.bind()).toBe(true);

    const after = run.store.getState();
    expect(keys(after)).toEqual(unlocked);
    expect(after.wallet.glyphs.eq(0)).toBe(true);
    expect(after.wallet.ink.eq(0)).toBe(true);
  }, 30_000);

  test(":wq keeps the keys, treats and codices while it starts the epoch over", () => {
    const run = activePlayer();
    // The climb to 250 Seals ever is a long evening, and this test is about the reset, not the climb: the archive is
    // put where a rebind is due. The keys are bought for real, with the Glyphs the fixture lends.
    run.store.setState((s) => {
      s.wallet.glyphs = D(500_000);
      s.wallet.seals = D(40);
      s.wallet.sealsEver = D(320);
      s.wallet.treats = D(4);
      s.wallet.codices = D(2);
      s.volumes.lifetime = D(300);
      s.volumes.runs = 3;
    });
    expect(run.store.getState().vim.unlockFamily("core-move")).toBe(true);
    expect(run.store.getState().vim.unlockFamily("core-edit")).toBe(true);
    expect(run.store.getState().vim.unlockFamily("word-stride")).toBe(true);

    const before = run.store.getState();
    const unlocked = keys(before);
    const treats = before.wallet.treats;
    const held = before.wallet.codices;
    expect(unlocked.length).toBe(3);

    expect(run.store.getState().codex.rebind()).toBe(true);

    const after = run.store.getState();
    expect(keys(after)).toEqual(unlocked);
    expect(after.wallet.treats.gte(treats)).toBe(true);
    expect(after.wallet.codices.gt(held)).toBe(true);
    expect(after.wallet.seals.eq(0)).toBe(true);
    expect(after.volumes.runs).toBe(0);
  }, 30_000);
});
