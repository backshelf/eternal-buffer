// The mastery panel over a real game store: the empty desk, the Clean Cut rate's arithmetic, the tallies that
// pair a found count with its content list, and the Top Keys chart's sort, tie-break, cap and bar fill.
import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, screen } from "@testing-library/react";
import { freshStore, renderWith } from "watchpot/test";
import { StatsPanel } from "../src/components/StatsPanel";
import { EASTER_EGGS } from "../src/content/easterEggs";
import { GRAMMAR_CODEX } from "../src/content/vimActs";
import { game } from "../src/game/game";

afterEach(cleanup);

/** A KPI row's figure, read from the `dd` beside its `dt` label. */
function figureOf(label: string): string {
  return screen.getByText(label).parentElement?.querySelector("dd")?.textContent ?? "";
}

/** The chart's rows, in render order. */
function keyRows(view: ReturnType<typeof renderWith>): HTMLElement[] {
  return Array.from(view.container.querySelectorAll<HTMLElement>("[data-key]"));
}

describe("the Vim mastery panel", () => {
  test("an untouched desk reads 0% and asks for a first folio instead of an empty chart", () => {
    const { store } = freshStore(game, { seed: "stats-panel-empty" });
    const view = renderWith(store, <StatsPanel />);

    // Never NaN: no anomalies cleared is a clean 0%.
    expect(figureOf("Clean Cut rate")).toBe("0%");
    expect(screen.getByText("Start mending folios to track your keystrokes.")).toBeDefined();
    expect(keyRows(view).length).toBe(0);
  });

  test("the Clean Cut rate is the share of anomalies mended cleanly, and every tally is read off the record", () => {
    const { store } = freshStore(game, { seed: "stats-panel-kpi" });
    store.setState((s) => {
      s.vim.totalCleanCuts = 3;
      s.vim.totalAnomaliesCleared = 4;
      s.vim.totalFoliosCleared = 12;
      s.vim.bestCleanStreak = 7;
      s.vim.bestFlow = 34;
      s.vim.contractsCompleted = 2;
      s.vim.tildeBond = 5;
      s.vim.discoveredPairs = { "d+w": true };
      s.vim.easterEggsFound = { "no-write-since": true };
    });
    renderWith(store, <StatsPanel />);

    expect(figureOf("Clean Cut rate")).toBe("75%");
    expect(figureOf("Best Clean Streak")).toBe("7");
    expect(figureOf("Best Flow")).toBe("34");
    expect(figureOf("Folios Mended")).toBe("12");
    expect(figureOf("Anomalies Mended")).toBe("4");
    expect(figureOf("Grammar Pairs")).toBe(`1 / ${GRAMMAR_CODEX.length}`);
    expect(figureOf("Errata Slips Completed")).toBe("2");
    expect(figureOf("Easter Eggs")).toBe(`1 / ${EASTER_EGGS.length}`);
    expect(figureOf("Tilde Bond")).toBe("5");
  });

  test("Top Keys sorts by count, breaks ties by key name, and keeps only the eight most-pressed", () => {
    const { store } = freshStore(game, { seed: "stats-panel-keys" });
    store.setState((s) => {
      s.vim.keyCounts = { w: 5, d: 10, x: 5, j: 1, k0: 4, k1: 3, k2: 2, k3: 7, k4: 6 };
    });
    const view = renderWith(store, <StatsPanel />);

    const rows = keyRows(view);
    // d first; the w/x tie breaks on the name; the ninth key never makes it.
    expect(rows.map((row) => row.dataset.key)).toEqual(["d", "k3", "k4", "w", "x", "k0", "k1", "k2"]);
    expect(rows.length).toBe(8);
    // Every bar is twelve cells, and the most-pressed key fills all of them.
    expect(rows[0]?.querySelectorAll("span")[1]?.textContent).toBe("█".repeat(12));
    expect(rows[0]?.dataset.lit).toBe("12");
  });

  test("a key with a tiny share still lights one cell", () => {
    const { store } = freshStore(game, { seed: "stats-panel-tiny" });
    store.setState((s) => {
      s.vim.keyCounts = { d: 100, h: 1 };
    });
    const view = renderWith(store, <StatsPanel />);

    const rows = keyRows(view);
    expect(rows.map((row) => row.dataset.key)).toEqual(["d", "h"]);
    expect(rows[1]?.dataset.lit).toBe("1");
    // Twelve cells either way: one lit, eleven quiet.
    expect(rows[1]?.querySelectorAll("span")[1]?.textContent).toBe(`${"█".repeat(1)}${"░".repeat(11)}`);
  });
});
