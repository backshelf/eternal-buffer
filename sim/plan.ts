// The plan: the played minute each Keycap Family gate opens, for the 12–16 hour arc the spec draws (a 10 hour
// floor, up to ~18–20 for a completionist). Minutes are played minutes (`docs/plan-and-fit.md` › Played hours): the
// no-life cadence the contract's `ACTIVE` schedule plays, one look every 15 s with the hand on the keyboard.
//
// The gates are the twenty-one priced families (the two Act I families are free and never gates). The Act-opening
// families carry the spec's minutes; the rest are spread through their Act's window so every stretch has a payoff
// worth waiting for. `MARKS` are the plan's other named moments — the prestige landings, the Mosaic and the endgame —
// which no wallet price gates: they land where the prestige curves (`src/content/prestige.ts`) put them, and
// `bun sim/fit.ts` reports the minute each actually landed against its target.
import type { KeyFamilyId } from "../src/content/vimActs";

/** Every gate the fit prices: a priced Keycap Family. */
export type GateKey = KeyFamilyId;

/** One gate: the family and the played minute it should open at. */
export interface PlanGate {
  readonly key: GateKey;
  readonly minute: number;
  /** Why the minute is what it is, printed with the fit's report. */
  readonly note: string;
}

/**
 * The arc, in purchase order. Act II opens at 35 m and the first `:w` lands inside it; Act III follows the first
 * binding; Acts IV–V ride the seal economy the bindings build; the first `:wq` at ~7.2 h pays for Act VI; the
 * rebinding epoch carries the Mosaic to 6×6 and Act VII in at ~10.3 h; the `.vimrc` Forge completes the curriculum
 * at the mouth of the 12–16 h endgame.
 */
export const PLAN: readonly PlanGate[] = [
  { key: "word-stride", minute: 12, note: "Act II opens: Strides & Snipes (early Vim aha-moment)" },
  { key: "line-edge", minute: 22, note: "" },
  { key: "char-snipe", minute: 35, note: "" },
  { key: "file-jump", minute: 52, note: "" },
  { key: "counts", minute: 72, note: "" },
  { key: "op-delete", minute: 110, note: "Act III opens, on the far side of the first `:w`" },
  { key: "op-change", minute: 140, note: "" },
  { key: "op-yank", minute: 170, note: "" },
  { key: "line-craft", minute: 195, note: "" },
  { key: "text-objects", minute: 215, note: "Act IV opens: Objects & Visual" },
  { key: "visual-modes", minute: 250, note: "" },
  { key: "bracket-indent", minute: 290, note: "" },
  { key: "search-jump", minute: 350, note: "Act V opens: Lantern & Substitute" },
  { key: "para-marks", minute: 385, note: "" },
  { key: "substitute", minute: 420, note: "" },
  {
    key: "dot-echo",
    minute: 425,
    note: "Act VI opens: Echoes & Choreography (one Codex, out of first `:wq`)",
  },
  { key: "registers", minute: 510, note: "" },
  { key: "macros", minute: 570, note: "" },
  { key: "ex-power", minute: 630, note: "Act VII opens: the Ex-Console (never before hour 10)" },
  { key: "dual-split", minute: 680, note: "" },
  { key: "vimrc-forge", minute: 730, note: "the `.vimrc` Forge: the endgame's first gate" },
];

/** The plan's order of keys, as `fitTableSource` writes a table and the report reads one. */
export const PLAN_ORDER: readonly GateKey[] = PLAN.map((gate) => gate.key);

/** The last planned minute: the fit needs this much play, at least. */
export const LAST_MINUTE = Math.max(...PLAN.map((gate) => gate.minute));

/** A named moment of the arc that no family price gates. */
export interface PlanMark {
  readonly key: string;
  readonly minute: number;
  /** What lands here, in one line. */
  readonly line: string;
}

/**
 * The plan's other targets. The fit cannot price these — they are curve outcomes of the prestige gains and the
 * rebinding epoch — but it records the minute each landed at and says how far off the plan it was.
 */
export const MARKS: readonly PlanMark[] = [
  { key: "first-bind", minute: 100, line: "the first `:w Bind Volume` (Act III's door)" },
  { key: "first-rebind", minute: 430, line: "the first `:wq Rebind Codex` (~7.2 h)" },
  { key: "act-six", minute: 450, line: "Act VI's first keycap in hand (~7.5 h)" },
  { key: "mosaic-six", minute: 560, line: "the Mosaic opens to 6×6 (three Codices ever, ~9.3 h)" },
  { key: "act-seven", minute: 630, line: "Act VII's first keycap in hand (~10.5 h)" },
  { key: "endgame", minute: 730, line: "the `.vimrc` Forge and the mastery endgame (~12.2 h)" },
];
