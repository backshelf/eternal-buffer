// Mounts the whole assembled page once, inside `<StrictMode>`, and verifies:
// 1. Calm 0:00 start directly in the live centered Vim buffer (no blocking welcome modal, no template header,
//    only `h j k l` on the Chalkboard, live reactive Coach prompting `j`, zero Scribes, zero Rooms).
// 2. Progressive Room overlay navigation for every archive room once unlocked.
import { describe, expect, test } from "bun:test";
import { fireEvent, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { freshStore, renderWith } from "watchpot/test";
import { App } from "../src/app/App";
import { NAME, TAB_NAMES } from "../src/content/words";
import { game } from "../src/game/game";

const ROOMS = [
  { id: "tree", label: TAB_NAMES.tree },
  { id: "expeditions", label: TAB_NAMES.expeditions },
  { id: "mosaic", label: TAB_NAMES.mosaic },
  { id: "prestige", label: TAB_NAMES.prestige },
  { id: "challenges", label: TAB_NAMES.challenges },
  { id: "achievements", label: TAB_NAMES.achievements },
] as const;

function mount(opts?: { unlockAll?: boolean }) {
  const { store } = freshStore(game, { seed: "smoke" });
  if (opts?.unlockAll) {
    store.getState().settings.change({ welcomed: true, veteranMode: true });
    store.getState().vim.advanceOnboarding(5);
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

const roomBtn = (label: string) => screen.getByRole("button", { name: new RegExp(`^${label}`) });

describe("the page", () => {
  test("mounts under StrictMode straight into the live centered Vim buffer with progressive 0:00 onboarding", () => {
    const { store } = mount();

    // `jk` escape defaults to off so beginners learn standard Esc first; zero starter Scribes/Treats.
    expect(store.getState().settings.jkEscape).toBe(false);
    expect(store.getState().generators.owned["wax-sealed-moth"] ?? 0).toBe(0);
    expect(store.getState().wallet.treats.toNumber()).toBe(0);

    // No blocking welcome modal — lands straight in the centered Vim workstation.
    expect(screen.queryByRole("button", { name: /Sit at the desk/i })).toBeNull();
    expect(screen.getAllByText(NAME).length).toBeGreaterThan(0);

    // At 0:00 no secondary rooms or Scribes exist yet.
    expect(screen.queryByRole("button", { name: /^Codex/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Mosaic/ })).toBeNull();
    expect(screen.queryByText(/Hire first Scribe/i)).toBeNull();

    // The hero buffer, live reactive Coach bar, Ex line, and Chalkboard are live.
    expect(screen.getByRole("main", { name: "The buffer" })).toBeDefined();
    expect(screen.getByRole("region", { name: "Live mending coach" })).toBeDefined();
    expect(screen.getByText("-- NORMAL --")).toBeDefined();
    expect(document.querySelector(".cm-editor")).not.toBeNull();

    const said = document.body.textContent ?? "";
    expect(said).toContain("vellØum");
    expect(said).toContain("Press j to move down to line 2");
    // Chalkboard starts with ONLY h j k l — never dumping x i a I A on frame 1.
    const chalkboard = screen.getByRole("figure", { name: "Chalkboard" });
    const familyList = chalkboard.querySelector("ul");
    expect(familyList?.textContent).toBe("hjkl");
  });

  test("opens every secondary archive room overlay cleanly once unlocked", () => {
    mount({ unlockAll: true });

    for (const entry of ROOMS) {
      fireEvent.click(roomBtn(entry.label));
      expect(document.querySelector(`[data-tab="${entry.id}"]`)).not.toBeNull();
      expect(screen.getByRole("heading", { level: 1, name: entry.label })).toBeDefined();
      fireEvent.click(screen.getByRole("button", { name: /Back to Buffer/i }));
    }

    // Back in the buffer, the editor is still live.
    expect(document.querySelector(".cm-editor")).not.toBeNull();
    expect(screen.getByText("-- NORMAL --")).toBeDefined();
  });
});
