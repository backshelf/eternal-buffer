// Written by the scaffold from the game's answers. It is the game's now: edit it freely.
import type { CostCurve, GeneratorBoost, Threshold } from "watchpot/core";

export interface GeneratorDef {
  id: string;
  name: string;
  line: string;
  /** The price of the next one, by how many are owned. */
  cost: CostCurve;
  /** Ink a second from one owned, before the stats. The scribes' real work: ink fuels the bench and the road. */
  inkRate: number;
  /**
   * The ink rate's primary output, kept here so the current generator wiring reads one field. Always equal to
   * `inkRate`; the glyph trickle is a separate, deliberately small line.
   */
  rate: number;
  /** Glyphs a second from one owned, before the stats: a few percent of the ink rate, never a substitute for a hand. */
  glyphTrickle: number;
  /** What the owned count gives at 10, 25, 50 and 100: a multiplier on both lines this scribe writes. */
  milestones: readonly Threshold<GeneratorBoost>[];
  /** The Act a scribe first takes work in; absent means from the first night. */
  minAct?: number;
}

/** Each one owned raises the next one's price by this share. */
export const COST_GROWTH = 1.15;

/** Every scribe answers the same ledger: ten is a habit, a hundred is an institution. */
const SCRIBE_MILESTONES: readonly Threshold<GeneratorBoost>[] = [
  { at: 10, gives: { mult: 1.5 } },
  { at: 25, gives: { mult: 2 } },
  { at: 50, gives: { mult: 2 } },
  { at: 100, gives: { mult: 2.5 } },
];

/**
 * Cheapest first. Each costs twelve times the last and brews six times the ink, so one pays itself back in a minute,
 * the next in two, and so on. The glyph trickle slides from eight percent of the ink rate down to four: the deeper
 * you get, the more the scribes are for ink and the less they stand in for your hands.
 */
export const GENERATORS: readonly GeneratorDef[] = [
  {
    id: "wax-sealed-moth",
    name: "Wax-Sealed Moth",
    line: "Chews stray semicolons while you sleep.",
    cost: { base: 1, growth: COST_GROWTH, round: "floor" },
    inkRate: 0.167,
    rate: 0.167,
    glyphTrickle: 0.013,
    milestones: SCRIBE_MILESTONES,
  },
  {
    id: "margin-quill",
    name: "Margin Quill",
    line: "Copies footnotes nobody asked for at 14 Hz.",
    cost: { base: 12, growth: COST_GROWTH, round: "floor" },
    inkRate: 1,
    rate: 1,
    glyphTrickle: 0.08,
    milestones: SCRIBE_MILESTONES,
  },
  {
    id: "tallow-candle",
    name: "Tallow Candle",
    line: "Keeps the phosphor warm past three in the morning.",
    cost: { base: 144, growth: COST_GROWTH, round: "floor" },
    inkRate: 6,
    rate: 6,
    glyphTrickle: 0.42,
    milestones: SCRIBE_MILESTONES,
  },
  {
    id: "lead-typesetter",
    name: "Lead Typesetter",
    line: "Sets broken brackets back into brass chases.",
    cost: { base: 1728, growth: COST_GROWTH, round: "floor" },
    inkRate: 36,
    rate: 36,
    glyphTrickle: 2.3,
    milestones: SCRIBE_MILESTONES,
    minAct: 2,
  },
  {
    id: "bellows-press",
    name: "Bellows Press",
    line: "Flattens curled vellum one sigh at a time.",
    cost: { base: 20736, growth: COST_GROWTH, round: "floor" },
    inkRate: 216,
    rate: 216,
    glyphTrickle: 13,
    milestones: SCRIBE_MILESTONES,
    minAct: 2,
  },
  {
    id: "index-automaton",
    name: "Index Automaton",
    line: "Files lost verses under the wrong letter, fast.",
    cost: { base: 248832, growth: COST_GROWTH, round: "floor" },
    inkRate: 1300,
    rate: 1300,
    glyphTrickle: 72,
    milestones: SCRIBE_MILESTONES,
    minAct: 3,
  },
  {
    id: "phosphor-loom",
    name: "Phosphor Loom",
    line: "Weaves stray scanlines back into clean margins.",
    cost: { base: 2985984, growth: COST_GROWTH, round: "floor" },
    inkRate: 7800,
    rate: 7800,
    glyphTrickle: 400,
    milestones: SCRIBE_MILESTONES,
    minAct: 3,
  },
  {
    id: "null-archivist",
    name: "Null Archivist",
    line: "Reads only the lines that were deleted with dd.",
    cost: { base: 35831808, growth: COST_GROWTH, round: "floor" },
    inkRate: 46700,
    rate: 46700,
    glyphTrickle: 2200,
    milestones: SCRIBE_MILESTONES,
    minAct: 4,
  },
  {
    id: "swapfile-weaver",
    name: "Swapfile Weaver",
    line: "Spins half-written drafts out of the editor's graveyard: .swp, .swp, .swp.",
    cost: { base: 429981696, growth: COST_GROWTH, round: "floor" },
    inkRate: 280000,
    rate: 280000,
    glyphTrickle: 12000,
    milestones: SCRIBE_MILESTONES,
    minAct: 5,
  },
  {
    id: "colophon-engine",
    name: "Colophon Engine",
    line: "Stamps the ending on books it has not read yet.",
    cost: { base: 5159780352, growth: COST_GROWTH, round: "floor" },
    inkRate: 1680000,
    rate: 1680000,
    glyphTrickle: 67000,
    milestones: SCRIBE_MILESTONES,
    minAct: 6,
  },
];
