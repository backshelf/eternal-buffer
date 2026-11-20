// Written by the scaffold from the game's answers. It is the game's now: edit it freely.
import type { CostCurve } from "watchpot/core";

export interface GeneratorDef {
  id: string;
  name: string;
  line: string;
  /** The price of the next one, by how many are owned. */
  cost: CostCurve;
  /** What one makes a second, before the stats. */
  rate: number;
}

/** Each one owned raises the next one's price by this share. */
export const COST_GROWTH = 1.15;

/** Cheapest first. Each costs twelve times the last; one pays itself back in a minute, the next in two, and so on. */
export const GENERATORS: readonly GeneratorDef[] = [
  {
    id: "wax-sealed-moth",
    name: "Wax-Sealed Moth",
    line: "Chews stray semicolons while you sleep.",
    cost: { base: 10, growth: COST_GROWTH, round: "floor" },
    rate: 0.167,
  },
  {
    id: "margin-quill",
    name: "Margin Quill",
    line: "Copies footnotes nobody asked for at 14 Hz.",
    cost: { base: 120, growth: COST_GROWTH, round: "floor" },
    rate: 1,
  },
  {
    id: "tallow-candle",
    name: "Tallow Candle",
    line: "Keeps the phosphor warm past three in the morning.",
    cost: { base: 1440, growth: COST_GROWTH, round: "floor" },
    rate: 6,
  },
  {
    id: "lead-typesetter",
    name: "Lead Typesetter",
    line: "Sets broken brackets back into brass chases.",
    cost: { base: 17280, growth: COST_GROWTH, round: "floor" },
    rate: 36,
  },
  {
    id: "bellows-press",
    name: "Bellows Press",
    line: "Flattens curled vellum one sigh at a time.",
    cost: { base: 207360, growth: COST_GROWTH, round: "floor" },
    rate: 216,
  },
  {
    id: "index-automaton",
    name: "Index Automaton",
    line: "Files lost verses under the wrong letter, fast.",
    cost: { base: 2488320, growth: COST_GROWTH, round: "floor" },
    rate: 1300,
  },
  {
    id: "phosphor-loom",
    name: "Phosphor Loom",
    line: "Weaves stray scanlines back into clean margins.",
    cost: { base: 29859840, growth: COST_GROWTH, round: "floor" },
    rate: 7780,
  },
  {
    id: "null-archivist",
    name: "Null Archivist",
    line: "Reads only the lines that were deleted with dd.",
    cost: { base: 358318080, growth: COST_GROWTH, round: "floor" },
    rate: 46700,
  },
];
