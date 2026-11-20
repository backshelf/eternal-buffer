// Mounts the whole assembled page once, inside `<StrictMode>`, and walks all seven tabs: the proof that the game
// renders what it says it renders, that every screen mounts without throwing, and that the editor and Tilde are
// really there under it. happy-dom: no CSS, no layout, no WebGL2, so this asserts what is drawn, never where.
import { describe, expect, test } from "bun:test";
import { fireEvent, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { freshStore, renderWith } from "watchpot/test";
import { App } from "../src/app/App";
import { TILDE_FRAMES } from "../src/content/tilde";
import { NAME, TAB_NAMES } from "../src/content/words";
import { game } from "../src/game/game";

/** Every face Tilde can wear, so her statusline frame is found whatever mood she is in. */
const FACES = Object.values(TILDE_FRAMES).flat();

/** The seven tabs in reading order, with the heading each screen draws, and the tab whose screen has none. */
const SCREENS = [
  { id: "make", label: TAB_NAMES.make, heading: false },
  { id: "mosaic", label: TAB_NAMES.mosaic, heading: true },
  { id: "expeditions", label: TAB_NAMES.expeditions, heading: true },
  { id: "tree", label: TAB_NAMES.tree, heading: true },
  { id: "prestige", label: TAB_NAMES.prestige, heading: true },
  { id: "challenges", label: TAB_NAMES.challenges, heading: true },
  { id: "achievements", label: TAB_NAMES.achievements, heading: true },
] as const;

/**
 * The page over a seeded profile, mounted the way the entry point mounts it. happy-dom has no stylesheet, so
 * `useShaderTokens` finds no `--ui-*` value and says so on the console once per surface: each then draws its still
 * instead of a canvas, which is the same branch a browser without WebGL2 takes.
 */
function mount() {
  const { store } = freshStore(game, { seed: "smoke" });
  const view = renderWith(
    store,
    <StrictMode>
      <App />
    </StrictMode>,
  );
  return { ...view, store };
}

/** A tab's button in the nav, by the name it is announced with (a count follows the label). */
const tab = (label: string) => screen.getByRole("button", { name: new RegExp(`^${label}`) });

describe("the page", () => {
  test("mounts under StrictMode and shows the Buffer", () => {
    mount();

    // The header names the game.
    expect(screen.getByText(NAME)).toBeDefined();

    // The hero buffer: its own landmark, the Ex line's mode pill, and the editor CodeMirror mounted into it.
    const buffer = screen.getByRole("region", { name: "The buffer" });
    expect(buffer).toBeDefined();
    expect(screen.getByText("-- NORMAL --")).toBeDefined();
    expect(document.querySelector(".cm-editor")).not.toBeNull();

    // Tilde's statusline: one of her faces and her bond.
    const said = document.body.textContent ?? "";
    expect(FACES.some((face) => said.includes(face))).toBe(true);
    expect(said).toContain("BOND 0");
    // The Ex line rests with its own words rather than a stale message.
    expect(said).toContain(": for the console · ? for a whisper");
  });

  test("opens every one of the seven tabs without throwing", () => {
    mount();

    for (const entry of SCREENS) {
      fireEvent.click(tab(entry.label));
      // The page is on the tab it was sent to, and its screen drew.
      expect(document.querySelector(`[data-tab="${entry.id}"]`)).not.toBeNull();
      if (entry.heading) {
        expect(screen.getByRole("heading", { level: 1, name: entry.label })).toBeDefined();
      } else {
        // The Buffer's heading is the editor's landmark, not a title above it.
        expect(screen.getByRole("region", { name: "The buffer" })).toBeDefined();
      }
    }

    // And back to the buffer, the editor rebuilt by the tab change.
    fireEvent.click(tab(TAB_NAMES.make));
    expect(document.querySelector(".cm-editor")).not.toBeNull();
    expect(screen.getByText("-- NORMAL --")).toBeDefined();
  });
});
