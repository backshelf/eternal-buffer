// Mounts the whole assembled page once, inside `<StrictMode>`, and verifies:
// 1. Calm 0:00 start directly in the live centered Vim buffer (no blocking welcome modal, no template header,
//    only `h j k l` on the Chalkboard, live reactive Coach prompting `j`, zero Scribes, zero Rooms).
// 2. Progressive Room overlay navigation for every archive room once unlocked.
// 3. The Beta desk: the `⚙` Settings sheet's eight vellums and its Appearance controls, the `?` Help sheet's
//    Stats tab, Zen mode folding the wings, and the Errata Slip reaching the right rail once Folio 0 is cleared.
import { afterEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
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

function mount(opts?: { unlockAll?: boolean; seed?: string }) {
  const { store } = freshStore(game, { seed: opts?.seed ?? "smoke" });
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

/** The `⚙` in the workstation strip: the real control the Settings sheet opens from. */
const openSettings = () => fireEvent.click(screen.getByRole("button", { name: "⚙" }));

/** The `? Help` button under the rooms: the real control the Help sheet opens from. */
const openHelp = () => fireEvent.click(screen.getByRole("button", { name: "? Help" }));

/** A mastery figure, read from the `dd` beside its `dt` label inside the Stats tab. */
function figureOf(label: string): string {
  return screen.getByText(label).parentElement?.querySelector("dd")?.textContent ?? "";
}

afterEach(cleanup);

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

describe("the desk settings", () => {
  test("opens over the ⚙ and prints all eight vellums, each one checked as it is chosen", () => {
    const { store } = mount({ seed: "smoke-settings-themes" });

    openSettings();
    expect(screen.getByRole("dialog", { name: /Desk Settings/ })).toBeDefined();

    const vellums = screen.getByRole("radiogroup", { name: "Color theme" });
    expect(within(vellums).getAllByRole("radio").length).toBe(8);

    // A fresh save is printed on Midnight Amber, and only it carries the check.
    expect(document.documentElement.dataset.tint).toBe("amber");
    expect(
      within(vellums)
        .getByRole("radio", { name: /Midnight Amber/ })
        .getAttribute("aria-checked"),
    ).toBe("true");

    fireEvent.click(within(vellums).getByRole("radio", { name: /Gruvbox Light/ }));

    expect(store.getState().settings.tintPreset).toBe("gruvbox-light");
    // Both `data-tint` (CSS) and `data-theme` (WebGL2 shader tokens) follow the choice.
    expect(document.documentElement.dataset.tint).toBe("gruvbox-light");
    expect(document.documentElement.dataset.theme).toBe("gruvbox-light");
    expect(
      within(vellums)
        .getByRole("radio", { name: /Gruvbox Light/ })
        .getAttribute("aria-checked"),
    ).toBe("true");
    expect(
      within(vellums)
        .getByRole("radio", { name: /Midnight Amber/ })
        .getAttribute("aria-checked"),
    ).toBe("false");
  });

  test("writes the buffer glow, the type size and the three faders straight onto the settings", () => {
    const { store } = mount({ seed: "smoke-settings-appearance" });

    openSettings();

    const glow = screen.getByRole("group", { name: "Buffer glow" });
    fireEvent.click(within(glow).getByRole("radio", { name: "Subtle" }));
    expect(store.getState().settings.glowIntensity).toBe("subtle");

    const sizes = screen.getByRole("group", { name: "Buffer font size" });
    fireEvent.click(within(sizes).getByRole("radio", { name: "Large" }));
    expect(store.getState().settings.bufferFontSize).toBe("lg");

    // The faders show 0..100 and keep the fraction the mix wants, so `0` is a volume a player can reach.
    fireEvent.change(screen.getByRole("slider", { name: "Master" }), { target: { value: "40" } });
    fireEvent.change(screen.getByRole("slider", { name: "Key thocks" }), { target: { value: "25" } });
    fireEvent.change(screen.getByRole("slider", { name: "Chimes & SFX" }), { target: { value: "0" } });

    expect(store.getState().settings.volumeMaster).toBeCloseTo(0.4);
    expect(store.getState().settings.volumeKeys).toBeCloseTo(0.25);
    expect(store.getState().settings.volumeChimes).toBe(0);
  });

  test("resolves a legacy midnight save preset to Catppuccin Mocha across DOM and Settings", () => {
    const { store } = mount({ seed: "smoke-legacy-midnight" });

    act(() => {
      store.setState((s) => {
        // Simulate a pre-Beta save carrying the retired `midnight` tint id.
        (s.settings as { tintPreset: string }).tintPreset = "midnight";
      });
    });

    expect(document.documentElement.dataset.tint).toBe("catppuccin-mocha");
    expect(document.documentElement.dataset.theme).toBe("catppuccin-mocha");

    openSettings();
    const vellums = screen.getByRole("radiogroup", { name: "Color theme" });
    expect(
      within(vellums)
        .getByRole("radio", { name: /Catppuccin Mocha/ })
        .getAttribute("aria-checked"),
    ).toBe("true");
  });
});

describe("the reference sheets", () => {
  test("opens Help over the ? and counts the player's own record on its Stats tab", () => {
    const { store } = mount({ seed: "smoke-help-stats" });

    openHelp();
    expect(screen.getByRole("dialog", { name: /Reference & Glossary/ })).toBeDefined();

    fireEvent.click(screen.getByRole("tab", { name: "Stats" }));
    expect(screen.getByRole("tab", { name: "Stats" }).getAttribute("aria-selected")).toBe("true");

    expect(screen.getByRole("heading", { name: "Top Keys" })).toBeDefined();
    // An untouched desk reads a clean 0% and asks for a first folio instead of an empty chart.
    expect(figureOf("Clean Cut rate")).toBe("0%");
    expect(screen.getByText("Start mending folios to track your keystrokes.")).toBeDefined();

    act(() => {
      store.setState((s) => {
        s.vim.totalCleanCuts = 3;
        s.vim.totalAnomaliesCleared = 4;
        s.vim.keyCounts = { j: 9, k: 4 };
      });
    });

    // The tab is live over the real store, not a snapshot taken when the sheet opened.
    expect(figureOf("Clean Cut rate")).toBe("75%");
    const keys = Array.from(document.querySelectorAll<HTMLElement>("[data-key]")).map(
      (row) => row.dataset.key,
    );
    expect(keys).toEqual(["j", "k"]);
  });
});

describe("Zen and short work", () => {
  test("folds the desk to the buffer in Zen, and the Exit Zen control brings it back", () => {
    const { store } = mount({ seed: "smoke-zen" });

    expect(document.querySelector("[data-zen]")).toBeNull();

    act(() => {
      store.getState().settings.change({ zenMode: true });
    });

    const workstation = document.querySelector("[data-zen]");
    expect(workstation).not.toBeNull();
    expect(screen.getByRole("button", { name: /Exit Zen/ })).toBeDefined();
    // The buffer is still the desk's centre and still live.
    expect(screen.getByRole("main", { name: "The buffer" })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /Exit Zen/ }));

    expect(store.getState().settings.zenMode).toBe(false);
    expect(document.querySelector("[data-zen]")).toBeNull();
    expect(screen.queryByRole("button", { name: /Exit Zen/ })).toBeNull();
  });

  test("hands the Errata Slip to the right rail once Folio 0 is cleared", async () => {
    const { store } = mount({ unlockAll: true, seed: "smoke-errata" });

    // The slip is rolled by the desk, not by the test: the strip appears with the work already on it.
    await waitFor(() => expect(screen.queryByLabelText("Errata slip")).not.toBeNull());

    const strip = screen.getByLabelText("Errata slip");
    expect(strip.textContent).toContain("ERRATA");
    expect(store.getState().vim.activeContract).not.toBeNull();
    expect(within(strip).getByRole("button", { name: /Skip|Claim/ })).toBeDefined();
  });
});
