import { afterEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { freshStore, renderWith } from "watchpot/test";
import { BufferEditor } from "../src/components/BufferEditor";
import { game } from "../src/game/game";

afterEach(cleanup);

describe("BufferEditor input and Touch Vim gating", () => {
  test("blocks stray beforeinput literal characters in Normal mode", () => {
    const { store } = freshStore(game, { seed: "input-guard" });
    renderWith(store, <BufferEditor />);

    const content = document.querySelector(".cm-content") as HTMLElement;
    expect(content).not.toBeNull();
    const initialText = content.textContent ?? "";

    // Simulate a browser/IME beforeinput arriving in Normal mode for 'j', 'l', 'x', '?'
    for (const ch of ["j", "l", "x", "?"]) {
      const ev = new InputEvent("beforeinput", {
        bubbles: true,
        cancelable: true,
        inputType: "insertText",
        data: ch,
      });
      content.dispatchEvent(ev);
      expect(ev.defaultPrevented).toBe(true);
    }

    expect(content.textContent).toBe(initialText);
  });

  test("Touch Vim keypad hides locked Act II keys at Folio 0 and reveals a/I/A when unlocked", () => {
    const { store } = freshStore(game, { seed: "touch-gate" });
    act(() => {
      store.getState().settings.change({ touchKeypad: true });
    });
    renderWith(store, <BufferEditor />);

    const keypad = screen.getByRole("group", { name: "Touch Vim keypad" });
    // At Folio 0 step 0: h, j, k, l, : are shown; w, b, 0, $, p, a, I, A are hidden
    expect(keypad.querySelectorAll("button").length).toBeGreaterThanOrEqual(5);
    expect(screen.queryByRole("button", { name: "w" })).toBeNull();
    expect(screen.queryByRole("button", { name: "p" })).toBeNull();
    expect(screen.queryByRole("button", { name: "a" })).toBeNull();

    // Advance onboarding to step 4 (after Folio 1 & 2) -> a, I, A appear; w still hidden
    act(() => {
      store.getState().vim.advanceOnboarding(4);
    });
    expect(screen.getByRole("button", { name: "a" })).toBeDefined();
    expect(screen.getByRole("button", { name: "I" })).toBeDefined();
    expect(screen.getByRole("button", { name: "A" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "w" })).toBeNull();

    // Clicking a locked or gated key never crashes
    fireEvent.click(screen.getByRole("button", { name: "j" }));
  });
});
