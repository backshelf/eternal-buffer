// Written by the scaffold from the game's answers. It is the game's now: edit it freely.

export const WALL_NAME = "Marginalia";

/** What earns one. Anything subtler is the game's to write in `src/game/achievements.ts`. */
export type When =
  /** Own `count` of a producer (by id). */
  | { own: string; count: number }
  /** Earn this much of the main currency in one run. */
  | { earned: number }
  /** Reset this many times. */
  | { runs: number }
  /** Hold a rank in this many of the tree's nodes. */
  | { nodes: number };

export interface AchievementDef {
  id: string;
  name: string;
  /** Its flavour line. */
  line: string;
  when: When;
  /** Hidden until earned. */
  secret?: boolean;
}

/** Tiles to a row. */
export const COLUMNS = 8;
/** Output ×`each` per achievement earned, and ×`row` per full row. */
export const POWER = { each: 1.03, row: 1.25 };

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  {
    id: "moth-keeper",
    name: "Moth Keeper",
    line: "Five moths orbiting the gutter.",
    when: { own: "wax-sealed-moth", count: 5 },
  },
  {
    id: "footnote-flood",
    name: "Footnote Flood",
    line: "Ten quills scratching in unison.",
    when: { own: "margin-quill", count: 10 },
  },
  {
    id: "midnight-wax",
    name: "Midnight Wax",
    line: "Ten candles, zero smoke alarms.",
    when: { own: "tallow-candle", count: 10 },
  },
  {
    id: "brass-chase",
    name: "Brass Chase",
    line: "Five lead typesetters locking lines.",
    when: { own: "lead-typesetter", count: 5 },
  },
  {
    id: "flat-vellum",
    name: "Flat Vellum",
    line: "Five bellows pressing the night away.",
    when: { own: "bellows-press", count: 5 },
  },
  {
    id: "misfiled-fast",
    name: "Misfiled Fast",
    line: "Five automatons alphabetizing dreams.",
    when: { own: "index-automaton", count: 5 },
  },
  {
    id: "amber-warp",
    name: "Amber Warp",
    line: "Three looms humming at 60 Hz.",
    when: { own: "phosphor-loom", count: 3 },
  },
  {
    id: "deleted-lore",
    name: "Deleted Lore",
    line: "One Null Archivist reading the void.",
    when: { own: "null-archivist", count: 1 },
  },
  { id: "clean-ink", name: "Clean Ink", line: "A thousand glyphs rescued from rot.", when: { earned: 1000 } },
  {
    id: "million-line-scroll",
    name: "Million-Line Scroll",
    line: "The gutter needs seven digits now.",
    when: { earned: 1000000 },
  },
  {
    id: "giga-folio",
    name: "Giga-Folio",
    line: "A billion glyphs, still no exit.",
    when: { earned: 1000000000 },
  },
  { id: "first-binding", name: "First Binding", line: "Typed :w and meant it.", when: { runs: 1 } },
  {
    id: "serial-editor",
    name: "Serial Editor",
    line: "Five volumes stacked beside the lamp.",
    when: { runs: 5 },
  },
  { id: "keycap-scholar", name: "Keycap Scholar", line: "Four nodes lit on the Codex.", when: { nodes: 4 } },
  { id: "full-layout", name: "Full Layout", line: "Ten nodes humming in sequence.", when: { nodes: 10 } },
  {
    id: "no-write-since-last-epoch",
    name: "No Write Since Last Epoch",
    line: "Trillion glyphs deep and you still haven't left.",
    when: { earned: 1000000000000 },
    secret: true,
  },
];
