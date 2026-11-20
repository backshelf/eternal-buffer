// The Plugin Mosaic: fourteen pieces cut from margin ink and seal shards, and what each does from where it sits.
import type { BoardPiece, BoardView, Effect } from "watchpot/core";
import type { Currency, Rarity, StatId } from "./words";

type Fx = Effect<StatId>;

/**
 * One family tag per piece. Summed over these, `view.count` gives every piece on the board, which is what the Bayer
 * Lens reads; keep the list in step with `MOSAIC_PIECES`.
 */
export const PIECE_TAGS = [
  "motion",
  "operator",
  "object",
  "switch",
  "ink",
  "catalyst",
  "macro",
  "cat",
  "seal",
  "codex",
] as const;

/** What the bench charges to cut one, read at the moment of the cut. */
export interface MosaicRecipe {
  inputs: Partial<Record<Currency, number>>;
  /** How long the bench takes on game time; instant when left out. */
  takesMs?: number;
  /** The Act whose keycaps must be under your hands before the bench will open for it. */
  minAct?: number;
}

/** A piece as the board takes it, plus the words and price the bench needs. */
export interface MosaicPieceDef extends BoardPiece<Fx> {
  name: string;
  /** The two-cell badge it wears on the grid. */
  glyph: string;
  rarity: Rarity;
  /** Its flavour line. */
  line: string;
  /** Where it wants to be laid, in one sentence. */
  synergyHint: string;
  recipe: MosaicRecipe;
}

/** Six by six; the open ring is the game's to grow. */
export const MOSAIC_GRID = { width: 6, height: 6 } as const;

/** The four cells sharing a side, in the board's own order. */
const ORTHOGONAL = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const;

const besideTag = (view: BoardView<Fx>, tag: string) =>
  view.beside.filter((piece) => piece.tags?.includes(tag)).length;

/** Cells with nothing in them: empty, closed and off the grid all read the same to a piece. */
const besideEmpty = (view: BoardView<Fx>) =>
  ORTHOGONAL.reduce((count, [dx, dy]) => (view.at(dx, dy) ? count : count + 1), 0);

/** The caps an operator-hungry piece counts as company. */
const besideCaps = (view: BoardView<Fx>) =>
  besideTag(view, "motion") + besideTag(view, "operator") + besideTag(view, "object");

/** Distinct family tags beside a piece, which is the Ex Prism's whole diet. */
const besideTags = (view: BoardView<Fx>) => {
  const seen = new Set<string>();
  for (const piece of view.beside) for (const tag of piece.tags ?? []) seen.add(tag);
  return seen.size;
};

/** Every piece down anywhere on the board, itself included. */
const wholeBoard = (view: BoardView<Fx>) => PIECE_TAGS.reduce((count, tag) => count + view.count(tag), 0);

/**
 * The fourteen. Bonuses stay small and mostly additive so a crowded board compounds gently: the grid rewards a
 * layout drawn for one stat at a time, never one layout that beats every goal.
 */
export const MOSAIC_PIECES: readonly MosaicPieceDef[] = [
  {
    id: "cap-hjkl",
    name: "Home-Row Cap",
    glyph: "HJ",
    tags: ["motion"],
    rarity: "common",
    line: "The four keys your fingers find without asking permission.",
    synergyHint: "Set a switch beside it and the cap takes the hint.",
    recipe: { inputs: { ink: 20 } },
    effects: (view) => [{ stat: "output", mul: 1.15 + 0.1 * besideTag(view, "switch") }],
  },
  {
    id: "cap-word",
    name: "Word-Stride Cap",
    glyph: "WD",
    tags: ["motion"],
    rarity: "common",
    line: "A cap that crosses a whole line in one unhurried stride.",
    synergyHint: "Lay motions beside it in the same row; it counts the company.",
    recipe: { inputs: { ink: 60, shards: 1 } },
    effects: (view) => [
      { stat: "output", mul: 1.25 + 0.12 * view.row.filter((p) => p.tags?.includes("motion")).length },
    ],
  },
  {
    id: "cap-op",
    name: "Operator Cap",
    glyph: "OP",
    tags: ["operator"],
    rarity: "uncommon",
    line: "It speaks only in verbs: delete, change, yank, and then silence.",
    synergyHint: "An operator wants motions on all four sides before it will work.",
    recipe: { inputs: { ink: 200, shards: 2 } },
    effects: (view) => [{ stat: "output", mul: 1.3 + 0.18 * besideTag(view, "motion") }],
  },
  {
    id: "cap-obj",
    name: "Bracket Cap",
    glyph: "{}",
    tags: ["object"],
    rarity: "uncommon",
    line: "Brackets, words, paragraphs: anything an operator can reach into.",
    synergyHint: "Operators beside it sharpen it; the bracket does the aiming.",
    recipe: { inputs: { ink: 320, shards: 3 } },
    effects: (view) => [{ stat: "output", mul: 1.4 + 0.2 * besideTag(view, "operator") }],
  },
  {
    id: "switch-tactile",
    name: "Amber Tactile Switch",
    glyph: "::",
    tags: ["switch"],
    rarity: "common",
    line: "Amber stem, forty-five grams, a click like a knuckle in winter.",
    synergyHint: "Caps laid around it keep the tempo up; the switch keeps the time.",
    recipe: { inputs: { ink: 150, shards: 1 } },
    effects: (view) => [{ stat: "tempo", mul: 1.12 + 0.05 * besideCaps(view) }],
  },
  {
    id: "switch-heavy",
    name: "Brass Clickbar",
    glyph: "##",
    tags: ["switch"],
    rarity: "uncommon",
    line: "Brass clickbar, eighty grams, bought purely for the noise.",
    synergyHint: "Put it on the rim of the open cells, where its weight shows.",
    recipe: { inputs: { ink: 240, shards: 2 } },
    effects: (view) => [{ stat: "gain", mul: 1.18 + (view.edge || view.corner ? 0.1 : 0) }],
  },
  {
    id: "inkwell",
    name: "Margin Inkwell",
    glyph: "IN",
    tags: ["ink"],
    rarity: "uncommon",
    line: "A well of margin ink that refills from the space around it.",
    synergyHint: "Leave it breathing room. On this board, empty cells are machinery.",
    recipe: { inputs: { ink: 300, shards: 2 } },
    effects: (view) => [{ stat: "inkRate", mul: 1.35 + 0.15 * besideEmpty(view) }],
  },
  {
    id: "lantern",
    name: "Phosphor Lantern",
    glyph: "LN",
    tags: ["catalyst"],
    rarity: "rare",
    line: "Phosphor in a glass jar, hung where the archive is darkest.",
    synergyHint: "Corners are where the dark pools, and where the lantern earns its keep.",
    recipe: { inputs: { ink: 800, shards: 5 }, takesMs: 8_000 },
    effects: (view) =>
      view.corner
        ? [
            { stat: "offline", mul: 1.1 },
            { stat: "output", mul: 1.2 },
          ]
        : [{ stat: "offline", mul: 1.1 }],
  },
  {
    id: "spool-macro",
    name: "Macro Tape Spool",
    glyph: "@q",
    tags: ["macro"],
    rarity: "rare",
    line: "Tape that remembers a hundred keystrokes and repeats them badly.",
    synergyHint: "A column of spools multiplies its own noise; one spool is just loud.",
    recipe: { inputs: { ink: 1_200, shards: 8 }, takesMs: 10_000 },
    effects: (view) => [
      { stat: "tempo", mul: 1.45 },
      { stat: "output", mul: 1 + 0.25 * view.column.filter((p) => p.tags?.includes("macro")).length },
    ],
  },
  {
    id: "tilde-cushion",
    name: "Tilde's Velvet Cushion",
    glyph: "zz",
    tags: ["cat"],
    rarity: "relic",
    limit: 1,
    line: "A velvet cushion, cat-shaped, comprehensively indented.",
    synergyHint: "Surround it. She sleeps better on a crowded shelf.",
    recipe: { inputs: { ink: 2_500, shards: 18 }, takesMs: 20_000, minAct: 2 },
    effects: (view) => {
      const crowd = 1.25 + 0.15 * view.around.length;
      return [
        { stat: "output", mul: crowd },
        { stat: "inkRate", mul: crowd },
        { stat: "tempo", mul: crowd },
      ];
    },
  },
  {
    id: "wax-matrix",
    name: "Seal Die",
    glyph: "wx",
    tags: ["seal"],
    rarity: "rare",
    line: "A die cut from candle wax and stubbornness, still warm.",
    synergyHint: "Switches beside it press harder; wax remembers pressure.",
    recipe: { inputs: { ink: 900, shards: 6 }, takesMs: 8_000 },
    effects: (view) => [{ stat: "gain", mul: 1.3 + 0.15 * besideTag(view, "switch") }],
  },
  {
    id: "ex-prism",
    name: "Ex-Console Prism",
    glyph: "Ex",
    tags: ["codex"],
    rarity: "rare",
    line: "An old ex-console prism, ground to split a command into its colours.",
    synergyHint: "Variety beside it is the whole point; four alike tags waste the glass.",
    recipe: { inputs: { ink: 1_800, shards: 9 }, takesMs: 12_000, minAct: 3 },
    effects: (view) => [{ stat: "codexGain", mul: 1.25 + 0.15 * besideTags(view) }],
  },
  {
    id: "dither-lens",
    name: "Bayer Lens",
    glyph: "4x",
    tags: ["catalyst"],
    rarity: "uncommon",
    line: "Everything it looks at becomes dots, and every dot gets clearer.",
    synergyHint: "It counts the whole board, so fill the grid before you judge it.",
    recipe: { inputs: { ink: 500, shards: 4 } },
    effects: (view) => [{ stat: "output", mul: 1 + 0.05 * wholeBoard(view) }],
  },
  {
    id: "null-key",
    name: "Escape Blank",
    glyph: "<>",
    tags: ["cat"],
    rarity: "mythic",
    line: "The key that does nothing, kept because it does nothing extremely well.",
    synergyHint: "Set it beside Tilde's cushion and it finally does something.",
    recipe: { inputs: { ink: 4_000, shards: 30 }, takesMs: 30_000, minAct: 4 },
    effects: (view) =>
      view.beside.some((piece) => piece.id === "tilde-cushion")
        ? [
            { stat: "inkRate", mul: 1.2 },
            { stat: "gain", mul: 1.2 },
          ]
        : [],
  },
];
