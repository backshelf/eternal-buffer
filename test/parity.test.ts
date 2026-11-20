// The two proofs every game owes the engine: the plain store plays exactly the game the real one does, and no Decimal
// is compared with an operator. Both run the whole game, Wave 4's wiring included.
import { expect, test } from "bun:test";
import { type Decimal, ZERO } from "watchpot/core";
import { type AutoPlayer, type AutoStore, autoPlayer } from "watchpot/sim";
import { decimalComparisons, plainParity } from "watchpot/test";
import { type GameState, game } from "../src/game/game";

/** The game's balances, read by a currency id the auto-player passes as a string. */
const balance = (s: GameState, currency: string): Decimal =>
  (s.wallet as unknown as Record<string, Decimal>)[currency] ?? ZERO;

test("the plain store plays the game exactly", () => {
  // One auto-player per store: each keeps its own worths, so the two stores are played the same way.
  const players = new WeakMap<object, AutoPlayer<GameState>>();
  const error = plainParity(game, {
    steps: 600,
    tickMs: 1000,
    act(store) {
      let player = players.get(store);
      if (!player) {
        player = autoPlayer(game, { balance });
        players.set(store, player);
      }
      // The active hand: one headless Clean Cut before every look, the same edit on both stores.
      const state = store.getState() as unknown as GameState;
      state.vim.simulateActiveEdit();
      player.look(store as unknown as AutoStore<GameState>);
    },
  });
  expect(error).toBeNull();
}, 60_000);

test("no Decimal is compared with an operator", async () => {
  expect(await decimalComparisons({ tsconfig: "tsconfig.json", under: ["src", "sim"] })).toEqual([]);
});
