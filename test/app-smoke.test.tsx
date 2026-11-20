// Mounts the whole assembled page once, inside `<StrictMode>`, and verifies both the calm 0:00
// progressive-disclosure start (Welcome plate -> Folio 0 interactive lesson with live Coach bar)
// and full 7-tab navigation once the archive has opened.
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

/** The seven tabs in progressive discovery order, with the heading each screen draws. */
const SCREENS = [
  { id: "make", label: TAB_NAMES.make, heading: false },
  { id: "tree", label: TAB_NAMES.tree, heading: true },
  { id: "expeditions", label: TAB_NAMES.expeditions, heading: true },
  { id: "mosaic", label: TAB_NAMES.mosaic, heading: true },
  { id: "prestige", label: TAB_NAMES.prestige, heading: true },
  { id: "challenges", label: TAB_NAMES.challenges, heading: true },
  { id: "achievements", label: TAB_NAMES.achievements, heading: true },
] as const;

function mount(opts?: { unlockAll?: boolean }) {
  const { store } = freshStore(game, { seed: "smoke" });
  if (opts?.unlockAll) {
    store.getState().settings.change({ welcomed: true });
    store.getState().wallet.credit("seals", 1);
  }
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
  test("mounts under StrictMode with calm 0:00 progressive start and Folio 0 interactive lesson", () => {
    const { store } = mount();

    // `jk` escape defaults to off so beginners learn standard Esc first.
    expect(store.getState().settings.jkEscape).toBe(false);

    // Arrival plate is shown on a fresh save and names the game.
    expect(screen.getAllByText(NAME).length).toBeGreaterThan(0);
    const sitButton = screen.getByRole("button", { name: /Sit at the desk/i });
    fireEvent.click(sitButton);
    expect(store.getState().settings.welcomed).toBe(true);

    // At 0:00 only the Buffer exists, so the secondary tab bar is hidden.
    expect(screen.queryByRole("button", { name: /^Codex/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Mosaic/ })).toBeNull();

    // The hero buffer, live Coach bar, Ex line, and Tilde statusline are all live.
    const buffer = screen.getByRole("region", { name: "The buffer" });
    expect(buffer).toBeDefined();
    expect(screen.getByRole("region", { name: "Live mending coach" })).toBeDefined();
    expect(screen.getByText("-- NORMAL --")).toBeDefined();
    expect(document.querySelector(".cm-editor")).not.toBeNull();

    const said = document.body.textContent ?? "";
    expect(FACES.some((face) => said.includes(face))).toBe(true);
    expect(said).toContain("BOND 0");
    expect(said).toContain("INTERACTIVE LESSON");
    expect(said).toContain("vellØum");
  });

  test("opens every one of the seven tabs without throwing once unlocked", () => {
    mount({ unlockAll: true });

    for (const entry of SCREENS) {
      fireEvent.click(tab(entry.label));
      expect(document.querySelector(`[data-tab="${entry.id}"]`)).not.toBeNull();
      if (entry.heading) {
        expect(screen.getByRole("heading", { level: 1, name: entry.label })).toBeDefined();
      } else {
        expect(screen.getByRole("region", { name: "The buffer" })).toBeDefined();
      }
    }

    // Back to the buffer, the editor rebuilt cleanly.
    fireEvent.click(tab(TAB_NAMES.make));
    expect(document.querySelector(".cm-editor")).not.toBeNull();
    expect(screen.getByText("-- NORMAL --")).toBeDefined();
  });
});
