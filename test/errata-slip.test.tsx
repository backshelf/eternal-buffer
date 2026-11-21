// The Errata Slip strip: it stays quiet through the opening lesson, draws its first slip once Folio 0 is
// closed, draws the bar and the count honestly, and pays a finished slip exactly once before rolling the
// next. Skip throws a slip away without paying it.
import { afterEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { freshStore, renderWith } from "watchpot/test";
import { ErrataSlip } from "../src/components/ErrataSlip";
import type { ActiveContractState } from "../src/content/contracts";
import { game } from "../src/game/game";

afterEach(() => cleanup());

/** A slip, hand-made so a test can ask for exactly the work and the reward it wants to see. */
function slip(overrides: Partial<ActiveContractState> = {}): ActiveContractState {
  return {
    id: "errata-test",
    serial: 1,
    kind: "clean-cuts",
    title: "Three Clean Cuts, Pinned",
    target: 3,
    progress: 0,
    rewardCurrency: "treats",
    rewardAmount: 2,
    completed: false,
    ...overrides,
  };
}

/** A fresh desk with a slip already installed, and the strip mounted over it. */
function mount(active?: ActiveContractState, foliosCleared = 0, contractSerial?: number) {
  const { store } = freshStore(game, { seed: "errata" });
  store.setState((s) => {
    s.vim.totalFoliosCleared = foliosCleared;
    if (active !== undefined) s.vim.activeContract = active;
    if (contractSerial !== undefined) s.vim.contractSerial = contractSerial;
  });
  const view = renderWith(store, <ErrataSlip />);
  return { ...view, store };
}

describe("the Errata Slip strip", () => {
  test("stays out of the way through the 0:00 lesson and draws nothing", () => {
    const { store } = mount();

    expect(screen.queryByLabelText("Errata slip")).toBeNull();
    // A hidden strip never rolls a slip: the desk is still closed.
    expect(store.getState().vim.activeContract).toBeNull();
  });

  test("draws its first slip once Folio 0 is cleared and shows the work and the bar", async () => {
    const { store } = mount(undefined, 1);

    await waitFor(() => expect(screen.queryByLabelText("Errata slip")).not.toBeNull());

    const active = store.getState().vim.activeContract;
    if (active === null) throw new Error("the desk was open and no slip was drawn");

    const strip = screen.getByLabelText("Errata slip");
    expect(strip.textContent).toContain("ERRATA");
    expect(strip.textContent).toContain(active.title);
    expect(strip.textContent).toContain(`${active.progress}/${active.target}`);
    // Six cells, none of them lit at the start of the work.
    expect(strip.textContent).toContain("░".repeat(6));
    expect(screen.getByRole("button", { name: "Skip" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Claim" })).toBeNull();
  });

  test("claims a finished slip for its reward once, rolls the next, and offers no second Claim", async () => {
    const { store } = mount(slip({ serial: 7, progress: 3, completed: true }), 1, 7);

    const strip = screen.getByLabelText("Errata slip");
    expect(strip.textContent).toContain("█".repeat(6));
    expect(strip.textContent).toContain("3/3");
    expect(strip.getAttribute("data-ready")).not.toBeNull();

    const treatsBefore = store.getState().wallet.treats.toNumber();
    fireEvent.click(screen.getByRole("button", { name: "Claim" }));

    expect(store.getState().wallet.treats.toNumber()).toBe(treatsBefore + 2);
    expect(store.getState().vim.contractsCompleted).toBe(1);
    // The desk drew serial 8, at no progress: the Claim is gone before a second press can reach it.
    expect(store.getState().vim.activeContract?.serial).toBe(8);
    expect(store.getState().vim.activeContract?.completed).toBe(false);
    await waitFor(() => expect(screen.queryByRole("button", { name: "Claim" })).toBeNull());
    expect(screen.getByRole("button", { name: "Skip" })).toBeDefined();
  });

  test("skip rolls the next slip without paying the one thrown away", () => {
    const { store } = mount(slip({ serial: 4, progress: 1 }), 1, 4);

    const treatsBefore = store.getState().wallet.treats.toNumber();
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));

    expect(store.getState().wallet.treats.toNumber()).toBe(treatsBefore);
    expect(store.getState().vim.contractsCompleted).toBe(0);
    expect(store.getState().vim.activeContract?.serial).toBe(5);
    expect(store.getState().vim.activeContract?.progress).toBe(0);
  });

  test("reads its reward badge in both currencies, singular for one", async () => {
    const { store } = mount(slip({ rewardCurrency: "treats", rewardAmount: 2 }), 1);
    expect(screen.getByLabelText("Errata slip").textContent).toContain("+2 Treats");

    act(() => {
      store.setState((s) => {
        s.vim.activeContract = slip({ serial: 2, rewardCurrency: "shards", rewardAmount: 1 });
      });
    });
    await waitFor(() => expect(screen.getByLabelText("Errata slip").textContent).toContain("+1 Shard"));
  });
});
