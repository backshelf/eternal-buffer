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
  | { nodes: number }
  /** Clear this many folios, all time. */
  | { folios: number }
  /** Land this many Clean Cuts (at or under par), all time. */
  | { cleanCuts: number }
  /** Hold this many stacks of Flow at once. */
  | { flow: number }
  /** Discover this many Grammar Codex pairs. */
  | { pairs: number }
  /** Reach this Act of the curriculum. */
  | { act: number }
  /** Press this many pieces into the Plugin Mosaic. */
  | { mosaicPlaced: number }
  /** Claim this many Margin Expeditions. */
  | { expeditions: number }
  /** Raise Tilde's bond this high. */
  | { tildeBond: number }
  /** Pet Tilde this many times. */
  | { tildePets: number }
  /** Complete this many Vim Skill Challenges. */
  | { challenges: number }
  /** Rebind the Codex this many times. */
  | { codexRuns: number }
  /** Awarded by the game at a moment of its own choosing, never by watching state. */
  | { manual: true };

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
export const POWER = { each: 1.04, row: 1.3 };

/** The name of each row, in wall order, for the grid's row asides. */
export const ROW_TITLES: readonly string[] = [
  "Footwork & Early Scribes",
  "Verbs & Flow Mastery",
  "Break-from-Typing Craft",
  "Deep Acts & Skill Trials",
  "Archival Scale",
  "Secret Marginalia",
];

/**
 * Six rows of eight, in reading order: the first steps, the verbs, the systems you touch when the typing stops, the
 * deep acts, the scale of the whole archive, and eight things the archive only admits in a whisper.
 */
export const ACHIEVEMENTS: readonly AchievementDef[] = [
  // Row 1 · Footwork & Early Scribes
  {
    id: "first-cut",
    name: "First Clean Cut",
    line: "One rotten rune, walked to and struck out.",
    when: { cleanCuts: 1 },
  },
  {
    id: "first-folio",
    name: "Folio Sealed",
    line: "The first page closes clean behind you.",
    when: { folios: 1 },
  },
  {
    id: "hundred-glyphs",
    name: "A Hundred Rescued",
    line: "A hundred glyphs pulled back from the rot before dawn.",
    when: { earned: 100 },
  },
  {
    id: "clean-ink",
    name: "Clean Ink",
    line: "A thousand glyphs rescued from rot.",
    when: { earned: 1000 },
  },
  {
    id: "first-scribe",
    name: "First Scribe",
    line: "A wax-sealed moth takes the night shift; you keep the daylight.",
    when: { own: "wax-sealed-moth", count: 2 },
  },
  {
    id: "moth-keeper",
    name: "Moth Keeper",
    line: "Five moths orbiting the gutter.",
    when: { own: "wax-sealed-moth", count: 5 },
  },
  {
    id: "ten-clean-cuts",
    name: "Steady Hands",
    line: "Ten cuts, and not one of them sloppy.",
    when: { cleanCuts: 10 },
  },
  {
    id: "strides",
    name: "Act II · Strides & Snipes",
    line: "You stop walking and start striding; the margins notice.",
    when: { act: 2 },
  },

  // Row 2 · Verbs & Flow Mastery
  {
    id: "verbs",
    name: "Act III · Verbs & Composition",
    line: "Delete, change, yank: the sentence obeys.",
    when: { act: 3 },
  },
  {
    id: "first-binding",
    name: "First Binding",
    line: "Typed :w and meant it.",
    when: { runs: 1 },
  },
  {
    id: "flow-twenty-five",
    name: "Twenty-Five Deep",
    line: "Twenty-five stacks of Flow, candle burning at both ends.",
    when: { flow: 25 },
  },
  {
    id: "flow-ceiling",
    name: "At The Ceiling",
    line: "The Flow bar has nowhere left to go.",
    when: { flow: 50 },
  },
  {
    id: "grammar-fifteen",
    name: "Fifteen Tongues",
    line: "Fifteen operator-motion pairs, spoken without thinking.",
    when: { pairs: 15 },
  },
  {
    id: "footnote-flood",
    name: "Footnote Flood",
    line: "Ten quills scratching in unison.",
    when: { own: "margin-quill", count: 10 },
  },
  {
    id: "objects",
    name: "Act IV · Objects & Visual",
    line: "You reach into the quoted curse and pull it out whole.",
    when: { act: 4 },
  },
  {
    id: "serial-editor",
    name: "Serial Editor",
    line: "Five volumes stacked beside the lamp.",
    when: { runs: 5 },
  },

  // Row 3 · Break-from-Typing Craft
  {
    id: "first-cap",
    name: "First Cap Pressed",
    line: "One keycap seated in the grid, and the board hums.",
    when: { mosaicPlaced: 1 },
  },
  {
    id: "mosaic-twelve",
    name: "Twelve In Order",
    line: "A dozen pieces arguing pleasantly in the phosphor.",
    when: { mosaicPlaced: 12 },
  },
  {
    id: "first-dispatch",
    name: "First Dispatch",
    line: "Someone is sent down the gutter with a lantern and a list.",
    when: { expeditions: 1 },
  },
  {
    id: "expedition-ten",
    name: "Ten Margins Walked",
    line: "Ten expeditions home, shards in hand, no questions asked.",
    when: { expeditions: 10 },
  },
  {
    id: "first-purr",
    name: "First Purr",
    line: "Tilde allows one touch of the statusline and pretends not to.",
    when: { tildePets: 1 },
  },
  {
    id: "cat-tax",
    name: "Cat Tax",
    line: "Twenty-five pets paid on time, every time.",
    when: { tildePets: 25 },
  },
  {
    id: "tilde-bond-three",
    name: "Bond III",
    line: "Tilde sleeps facing the buffer now.",
    when: { tildeBond: 3 },
  },
  {
    id: "tilde-bond-eight",
    name: "Bond VIII",
    line: "Eight treats in, and the cat has opinions about your macros.",
    when: { tildeBond: 8 },
  },

  // Row 4 · Deep Acts & Skill Trials
  {
    id: "lantern",
    name: "Act V · Lantern & Substitute",
    line: "The lantern finds every scattered sigil at once.",
    when: { act: 5 },
  },
  {
    id: "echoes",
    name: "Act VI · Echoes & Choreography",
    line: "Dot repeats, registers swap, the macros run in chorus.",
    when: { act: 6 },
  },
  {
    id: "ex-console",
    name: "Act VII · The Ex-Console",
    line: "The console answers to you, and the .vimrc is yours to write.",
    when: { act: 7 },
  },
  {
    id: "first-trial",
    name: "First Trial",
    line: "You entered the discipline and came back with steadier hands.",
    when: { challenges: 1 },
  },
  {
    id: "trial-adept",
    name: "Trial Adept",
    line: "Three trials cleared while the rest of the archive slept.",
    when: { challenges: 3 },
  },
  {
    id: "first-rebind",
    name: "First Rebind",
    line: "Typed :wq and the whole page went gold.",
    when: { codexRuns: 1 },
  },
  {
    id: "three-codices",
    name: "Three Codices",
    line: "Three rebinds deep; the archive has started wearing your handwriting.",
    when: { codexRuns: 3 },
  },
  {
    id: "twenty-nodes",
    name: "Deep Codex",
    line: "Twenty nodes lit down in the codex, all the way to the back.",
    when: { nodes: 20 },
  },

  // Row 5 · Archival Scale
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
  {
    id: "tera-vellum",
    name: "Tera-Vellum",
    line: "A trillion glyphs and the lamp has not been relit.",
    when: { earned: 1000000000000 },
  },
  {
    id: "peta-folio",
    name: "Peta-Folio",
    line: "Sixteen zeroes of rescued signal, and you still reach for dd.",
    when: { earned: 10000000000000000 },
  },
  {
    id: "grammar-thirty-five",
    name: "Threaded Grammar",
    line: "Thirty-five pairs on the trophy table, each earned mid-folio.",
    when: { pairs: 35 },
  },
  {
    id: "mosaic-full",
    name: "Board Filled",
    line: "Six by six with not a gap left, and the dither has nowhere to hide.",
    when: { mosaicPlaced: 36 },
  },
  {
    id: "five-hundred-folios",
    name: "Five Hundred Folios",
    line: "Five hundred pages bound, and Tilde slept on most of them.",
    when: { folios: 500 },
  },
  {
    id: "codex-whole",
    name: "The Whole Codex",
    line: "Every node raised, every column lit, the tree fully in leaf.",
    when: { nodes: 24 },
  },

  // Row 6 · Secret Marginalia
  {
    id: "trapped-in-vim",
    name: "Trapped In Vim",
    line: "You typed :q and the archive politely declined.",
    when: { manual: true },
    secret: true,
  },
  {
    id: "meaning-of-42",
    name: "The Meaning",
    line: "Forty-two: the answer to life, the universe, and hjkl.",
    when: { manual: true },
    secret: true,
  },
  {
    id: "bram-smile",
    name: "Bram's Smile",
    line: "A colon, the word smile, and a face made of punctuation.",
    when: { manual: true },
    secret: true,
  },
  {
    id: "esc-panic",
    name: "Escape Panic",
    line: "Five Escapes in two seconds, and you were already in Normal mode.",
    when: { manual: true },
    secret: true,
  },
  {
    id: "off-the-keyboard",
    name: "Off The Keyboard",
    line: "Tilde walked the bottom line, and you cleaned up after her.",
    when: { manual: true },
    secret: true,
  },
  {
    id: "rm-rf-denied",
    name: "Permission Denied",
    line: "You tried to delete the archive; the cat was sitting on /dev/null.",
    when: { manual: true },
    secret: true,
  },
  {
    id: "wrong-church",
    name: "The Wrong Church",
    line: "You whispered emacs in a vim archive. The moth heard.",
    when: { manual: true },
    secret: true,
  },
  {
    id: "cat-whisperer",
    name: "Cat Whisperer",
    line: "A hundred pets in, Tilde grants you honorary feline status.",
    when: { tildePets: 100 },
    secret: true,
  },
];
