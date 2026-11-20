// The Vim curriculum: seven Acts, twenty-three Keycap Families, the Act VII `.vimrc` rules and the
// 45-pair Grammar Codex.
//
// This file is plain data and plain types. It imports nothing but the currency words, so the sim,
// the store and the editor all read exactly the same tables and none of them need a DOM.
import type { Currency } from "./words";

export type ActId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type KeyFamilyId =
  | "core-move"
  | "core-edit"
  | "word-stride"
  | "line-edge"
  | "char-snipe"
  | "file-jump"
  | "counts"
  | "op-delete"
  | "op-change"
  | "op-yank"
  | "line-craft"
  | "text-objects"
  | "visual-modes"
  | "bracket-indent"
  | "search-jump"
  | "para-marks"
  | "substitute"
  | "dot-echo"
  | "registers"
  | "macros"
  | "ex-power"
  | "dual-split"
  | "vimrc-forge";

/** One price on a Keycap Family. Plain numbers: the store wraps them in Decimals, this file never does. */
export interface KeyCost {
  currency: Currency;
  amount: number;
}

export interface KeyFamilyDef {
  id: KeyFamilyId;
  /** The Chalkboard's name for the family. */
  name: string;
  act: ActId;
  /** The keycaps this family claims, terse and exactly as the player types them. */
  keys: string[];
  /** Families that must be unlocked before this one may be bought. */
  requires: KeyFamilyId[];
  /** Permanent Clarity multiplier for finishing this family's Practice Rite. */
  riteBonus: number;
  /** One line for the Chalkboard badge. */
  chalkSummary: string;
  cost: KeyCost;
}

export interface ActDef {
  id: ActId;
  numeral: string;
  title: string;
  subtitle: string;
  /** The target played-time window as printed in the Act header ("0:35 – 1:45"). */
  window: string;
  fromHours: number;
  toHours: number;
  /** Families from the previous Acts that must already be unlocked for this Act to open. */
  requiredUnlocks: KeyFamilyId[];
  /** `:w` Seals ever bound, the way Act III opens. */
  minSealsEver?: number;
  /** Lifetimes Codices, the way Acts VI and VII open. */
  minCodicesEver?: number;
  flavour: string;
}

export interface VimrcRuleDef {
  id: string;
  name: string;
  /** The line as it would read inside a real `.vimrc`. */
  line: string;
  effect: string;
  /** `.vimrc` slots this rule consumes (the Forge opens with five). */
  slotCost: number;
}

export type GrammarCategory = "motion" | "operator" | "object" | "visual" | "search" | "macro" | "ex";

export interface GrammarCodexDef {
  /** The pair id `classifyVimCommand` reports, e.g. `d+w`, `c+i"`, `:%s`, `Ctrl-v+d`. */
  id: string;
  /** How the pair is printed on a keycap ribbon. */
  keys: string;
  name: string;
  category: GrammarCategory;
  /** Midnight Archivist marginalia for the Codex page. */
  line: string;
}

export const ACTS: ActDef[] = [
  {
    id: 1,
    numeral: "I",
    title: "Footwork",
    subtitle: "Four directions and a pair of scissors.",
    window: "0:00 – 0:35",
    fromHours: 0,
    toHours: 0.583,
    requiredUnlocks: [],
    flavour:
      "The archive opens at midnight and hands you nothing but a cursor. Walk before you cut. Tilde watches from the statusline and says nothing, which is its way of approving.",
  },
  {
    id: 2,
    numeral: "II",
    title: "Strides & Snipes",
    subtitle: "Sentences have edges. Learn them.",
    window: "0:35 – 1:45",
    fromHours: 0.583,
    toHours: 1.75,
    requiredUnlocks: ["core-move", "core-edit"],
    flavour:
      "Ten keystrokes of `l` is not travel, it is a walk of shame. Learn to stride a word and to throw the cursor like a knife. The rot does not care about your dignity.",
  },
  {
    id: 3,
    numeral: "III",
    title: "Verbs & Composition",
    subtitle: "A motion is a noun. An operator is a verb.",
    window: "1:45 – 3:30",
    fromHours: 1.75,
    toHours: 3.5,
    requiredUnlocks: ["word-stride", "line-edge", "char-snipe", "file-jump", "counts"],
    minSealsEver: 1,
    flavour:
      "Your first Binding seals a Volume and wakes the verbs. `d` and `c` and `y` take a motion and do something to it. The old manuals call this grammar. They are right.",
  },
  {
    id: 4,
    numeral: "IV",
    title: "Objects & Visual",
    subtitle: "Name the thing, then act on it.",
    window: "3:30 – 5:45",
    fromHours: 3.5,
    toHours: 5.75,
    requiredUnlocks: ["op-delete", "op-change", "op-yank", "line-craft"],
    flavour:
      "A quoted curse is not a line and not a word; it is an object. Objects are what the manuscript already knows about itself. Select one and the rot comes away whole.",
  },
  {
    id: 5,
    numeral: "V",
    title: "Lantern & Substitute",
    subtitle: "Search is a lantern. Substitute is a pen.",
    window: "5:45 – 7:30",
    fromHours: 5.75,
    toHours: 7.5,
    requiredUnlocks: ["text-objects", "visual-modes", "bracket-indent"],
    flavour:
      "You cannot walk to every page of an infinite buffer. Cast forward instead, and when the same sigil has rotted five times, rewrite all five in one breath.",
  },
  {
    id: 6,
    numeral: "VI",
    title: "Echoes & Choreography",
    subtitle: "Do it once. Let the buffer repeat it.",
    window: "7:30 – 10:30",
    fromHours: 7.5,
    toHours: 10.5,
    requiredUnlocks: ["search-jump", "para-marks", "substitute"],
    minCodicesEver: 1,
    flavour:
      "A Codex Rebind hands you the echo. `.` repeats the last change; `q` records a liturgy and `@` plays it back. Choreography pays four times what labour does.",
  },
  {
    id: 7,
    numeral: "VII",
    title: "The Ex-Console & .vimrc",
    subtitle: "The command line was here before the window.",
    window: "10:30 – 16:00+",
    fromHours: 10.5,
    toHours: 16,
    requiredUnlocks: ["dot-echo", "registers", "macros"],
    minCodicesEver: 8,
    flavour:
      "The console predates the window by decades and remembers everything. Now you may purge by pattern, sort the canon, split the folio in two, and write your own rules into the wall.",
  },
];

export const KEY_FAMILIES: KeyFamilyDef[] = [
  {
    id: "core-move",
    name: "Footwork",
    act: 1,
    keys: ["h", "j", "k", "l", "u"],
    requires: [],
    riteBonus: 1,
    chalkSummary: "h j k l — the four directions. u undoes your regrets.",
    cost: { currency: "glyphs", amount: 0 },
  },
  {
    id: "core-edit",
    name: "Nib & Scissors",
    act: 1,
    keys: ["x", "i", "a", "I", "A", "Esc", "jk", "Ctrl-["],
    requires: [],
    riteBonus: 1,
    chalkSummary: "x cuts one rune. i and a open the margin. Esc closes it.",
    cost: { currency: "glyphs", amount: 0 },
  },
  {
    id: "word-stride",
    name: "Word Stride",
    act: 2,
    keys: ["w", "b", "e", "W", "B", "E"],
    requires: ["core-move"],
    riteBonus: 1.25,
    chalkSummary: "w b e — one word at a time. W B E — one sentence at a time.",
    cost: { currency: "glyphs", amount: 120 },
  },
  {
    id: "line-edge",
    name: "Line Edge",
    act: 2,
    keys: ["0", "$", "^"],
    requires: ["core-move"],
    riteBonus: 1.25,
    chalkSummary: "0 is the left margin, $ the right. ^ is the first ink on the line.",
    cost: { currency: "glyphs", amount: 200 },
  },
  {
    id: "char-snipe",
    name: "Char Snipe",
    act: 2,
    keys: ["f", "F", "t", "T", ";", ","],
    requires: ["word-stride"],
    riteBonus: 1.25,
    chalkSummary: "f then a rune: the cursor lands on it. ; throws again. , throws back.",
    cost: { currency: "glyphs", amount: 320 },
  },
  {
    id: "file-jump",
    name: "File Jump",
    act: 2,
    keys: ["gg", "G"],
    requires: ["line-edge"],
    riteBonus: 1.25,
    chalkSummary: "gg the first line, G the last. The folio has ends. Use them.",
    cost: { currency: "glyphs", amount: 520 },
  },
  {
    id: "counts",
    name: "Counts",
    act: 2,
    keys: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
    requires: ["char-snipe"],
    riteBonus: 1.25,
    chalkSummary: "8j. 3w. A number in front of a motion multiplies it.",
    cost: { currency: "glyphs", amount: 800 },
  },
  {
    id: "op-delete",
    name: "Delete",
    act: 3,
    keys: ["d", "dd", "D"],
    requires: ["counts"],
    riteBonus: 1.25,
    chalkSummary: "d takes a motion and removes what it crossed. dd takes the line.",
    cost: { currency: "glyphs", amount: 1400 },
  },
  {
    id: "op-change",
    name: "Change",
    act: 3,
    keys: ["c", "cc", "C", "s", "S"],
    requires: ["op-delete"],
    riteBonus: 1.25,
    chalkSummary: "c is d that leaves a doorway. Step in, type, Esc.",
    cost: { currency: "glyphs", amount: 2400 },
  },
  {
    id: "op-yank",
    name: "Yank & Put",
    act: 3,
    keys: ["y", "yy", "p", "P"],
    requires: ["op-change"],
    riteBonus: 1.25,
    chalkSummary: "y copies without cutting. p puts it after, P puts it before.",
    cost: { currency: "glyphs", amount: 3600 },
  },
  {
    id: "line-craft",
    name: "Line Craft",
    act: 3,
    keys: ["o", "O", "r", "R", "~", "J", "Ctrl-r"],
    requires: ["op-yank"],
    riteBonus: 1.25,
    chalkSummary: "o opens a line below. r replaces one rune. J sews two lines into one.",
    cost: { currency: "glyphs", amount: 5400 },
  },
  {
    id: "text-objects",
    name: "Text Objects",
    act: 4,
    keys: ["iw", "aw", 'i"', 'a"', "i'", "i(", "a(", "i[", "i{", "it"],
    requires: ["op-change", "op-yank"],
    riteBonus: 1.25,
    chalkSummary: 'iw is a word. i" is what the quotes hold. Objects are nouns you already know.',
    cost: { currency: "seals", amount: 3 },
  },
  {
    id: "visual-modes",
    name: "Visual Modes",
    act: 4,
    keys: ["v", "V", "Ctrl-v"],
    requires: ["text-objects"],
    riteBonus: 1.25,
    chalkSummary: "v selects characters, V lines, Ctrl-v a column. Then act.",
    cost: { currency: "seals", amount: 6 },
  },
  {
    id: "bracket-indent",
    name: "Brackets & Indent",
    act: 4,
    keys: ["%", ">", "<"],
    requires: ["visual-modes"],
    riteBonus: 1.25,
    chalkSummary: "% jumps to the matching bracket. > and < push the margin out and in.",
    cost: { currency: "seals", amount: 10 },
  },
  {
    id: "search-jump",
    name: "Search & Land",
    act: 5,
    keys: ["/", "?", "n", "N", "*", "#"],
    requires: ["line-edge"],
    riteBonus: 1.25,
    chalkSummary: "/ casts a lantern forward. n walks the light again.",
    cost: { currency: "seals", amount: 12 },
  },
  {
    id: "para-marks",
    name: "Paragraphs & Marks",
    act: 5,
    keys: ["{", "}", "m", "'", "`", "Ctrl-o", "Ctrl-i"],
    requires: ["search-jump"],
    riteBonus: 1.25,
    chalkSummary: "{ and } cross blank lines. m sets a mark; ' returns to it.",
    cost: { currency: "seals", amount: 18 },
  },
  {
    id: "substitute",
    name: "Substitute",
    act: 5,
    keys: [":s", ":%s"],
    requires: ["search-jump"],
    riteBonus: 1.25,
    chalkSummary: ":%s/ROT/PURE/g rewrites every rot in the folio in one breath.",
    cost: { currency: "seals", amount: 30 },
  },
  {
    id: "dot-echo",
    name: "Dot Echo",
    act: 6,
    keys: ["."],
    requires: ["op-change"],
    riteBonus: 1.25,
    chalkSummary: ". repeats the last change. The Echo Stack counts every repetition.",
    cost: { currency: "codices", amount: 2 },
  },
  {
    id: "registers",
    name: "Registers",
    act: 6,
    keys: ['"a', '"0', '"+', "Ctrl-r"],
    requires: ["dot-echo"],
    riteBonus: 1.25,
    chalkSummary: '"a stores. "ap puts it back. Named pockets, no pockets.',
    cost: { currency: "codices", amount: 4 },
  },
  {
    id: "macros",
    name: "Macros",
    act: 6,
    keys: ["q", "@", "@@"],
    requires: ["registers"],
    riteBonus: 1.25,
    chalkSummary: "qa records into a. @a plays it back. @@ plays the last one.",
    cost: { currency: "codices", amount: 7 },
  },
  {
    id: "ex-power",
    name: "Ex Power",
    act: 7,
    keys: [":g", ":v", ":norm", ":sort"],
    requires: ["substitute"],
    riteBonus: 1.25,
    chalkSummary: ":g/BLIGHT/d purges every blighted line. :sort orders the ledger.",
    cost: { currency: "codices", amount: 10 },
  },
  {
    id: "dual-split",
    name: "Dual Split",
    act: 7,
    keys: [":vsplit", "Ctrl-w"],
    requires: ["ex-power"],
    riteBonus: 1.25,
    chalkSummary: ":vsplit opens a second folio. Ctrl-w w walks between them.",
    cost: { currency: "codices", amount: 14 },
  },
  {
    id: "vimrc-forge",
    name: "Vimrc Forge",
    act: 7,
    keys: [":vimrc", "<leader>"],
    requires: ["dual-split"],
    riteBonus: 1.25,
    chalkSummary: "Your own rules, on your own keyboard. The Forge opens five slots.",
    cost: { currency: "codices", amount: 20 },
  },
];

/** Act VII's toggleable meta-rules. Five slots by default, six once The One-Macro Epoch is cleared. */
export const VIMRC_RULES: VimrcRuleDef[] = [
  {
    id: "fast-flow",
    name: "Fast Flow",
    line: "set flowtime=4",
    effect: "Flow loses a stack every 4s of silence instead of every 6s, but every Clean Cut pays +1 stack.",
    slotCost: 1,
  },
  {
    id: "echo-chain",
    name: "Echo Chain",
    line: "let g:echo_chain = 1",
    effect: "Each consecutive `.` repeat adds +10% to the Echo Stack multiplier, up to +50%.",
    slotCost: 1,
  },
  {
    id: "auto-snipe-crit",
    name: "Auto Snipe Crit",
    line: "set snipecrit",
    effect: "Every `f`/`t`/`;` landing inside an anomaly counts one key toward par.",
    slotCost: 2,
  },
  {
    id: "split-resonance",
    name: "Split Resonance",
    line: "set splitresonance",
    effect: "While both halves of a `:vsplit` are live, Flow decays half as fast and clears pay ×2.5.",
    slotCost: 2,
  },
  {
    id: "ink-siphon",
    name: "Ink Siphon",
    line: "let g:ink_siphon = 0.1",
    effect: "Clean Cuts also drip Ink equal to 10% of their Glyph payout.",
    slotCost: 1,
  },
  {
    id: "par-forgiveness",
    name: "Par Forgiveness",
    line: "set par+3",
    effect: "The Clean Cut window widens by 3 keystrokes; Tidy widens to par + 6.",
    slotCost: 1,
  },
  {
    id: "cat-familiar",
    name: "Cat Familiar",
    line: "let g:tilde_familiar = 1",
    effect: "Tilde's Bond bonuses apply at 1.5× and the pawprint visits twice as often.",
    slotCost: 1,
  },
  {
    id: "macro-overclock",
    name: "Macro Overclock",
    line: "let g:macro_overclock = 1",
    effect: "`@` playback pays double while a macro runs, and the Choreography multiplier gains +1.",
    slotCost: 2,
  },
];

export const GRAMMAR_CODEX: GrammarCodexDef[] = [
  // Operators crossed with motions.
  {
    id: "d+w",
    keys: "d w",
    name: "Word Reap",
    category: "operator",
    line: "dw clears one word forward. The cursor never leaves the line.",
  },
  {
    id: "d+$",
    keys: "d $",
    name: "Gutter Sweep",
    category: "motion",
    line: "$ takes the tail of the line and d takes everything it crossed.",
  },
  {
    id: "d+gg",
    keys: "d gg",
    name: "Scroll Purge",
    category: "motion",
    line: "dgg deletes upward to the first line. The archivist starts at the top.",
  },
  {
    id: "d+G",
    keys: "d G",
    name: "Abyss Purge",
    category: "motion",
    line: "dG clears from here to the last line. Mind the drop.",
  },
  {
    id: "d+f",
    keys: "d f x",
    name: "Find Reap",
    category: "motion",
    line: "df and a rune deletes through the rune. One leap, no walk.",
  },
  {
    id: "d+t",
    keys: "d t x",
    name: "Till Reap",
    category: "motion",
    line: "dt stops one rune short. Use it before a comma you want to keep.",
  },
  {
    id: "d+dd",
    keys: "d d",
    name: "Line Fall",
    category: "operator",
    line: "dd drops the whole line. The oldest trick in the archive, and still the best.",
  },
  {
    id: "c+w",
    keys: "c w",
    name: "Word Rewrite",
    category: "operator",
    line: "cw leaves a doorway where the word was. Step in, type, Esc.",
  },
  {
    id: "c+$",
    keys: "c $",
    name: "Tail Rewrite",
    category: "operator",
    line: "c$ saves you the walk back along a rotted tail.",
  },
  {
    id: "c+cc",
    keys: "c c",
    name: "Line Rewrite",
    category: "operator",
    line: "cc empties the line and keeps its place in the folio.",
  },
  {
    id: "c+f",
    keys: "c f x",
    name: "Find Rewrite",
    category: "operator",
    line: "cf leaps to the rune and rewrites the span behind it.",
  },
  {
    id: "y+w",
    keys: "y w",
    name: "Word Copy",
    category: "operator",
    line: "yw copies a word. The manuscript is unbothered.",
  },
  {
    id: "y+$",
    keys: "y $",
    name: "Tail Copy",
    category: "operator",
    line: "y$ takes the tail of the line into the unnamed register.",
  },
  {
    id: "y+yy",
    keys: "y y",
    name: "Line Copy",
    category: "operator",
    line: "yy copies the line. p puts it back. A broken refrain heals.",
  },
  // Text objects.
  {
    id: "d+iw",
    keys: "d i w",
    name: "Inner Word",
    category: "object",
    line: "diw removes the word you stand in, wherever the cursor sits inside it.",
  },
  {
    id: "d+aw",
    keys: "d a w",
    name: "Around Word",
    category: "object",
    line: "daw takes the word and the space after it. Tidier margins.",
  },
  {
    id: 'd+i"',
    keys: 'd i "',
    name: "Quote Crush",
    category: "object",
    line: 'di" empties the quotes and leaves the quotation marks standing.',
  },
  {
    id: 'd+a"',
    keys: 'd a "',
    name: "Quote Lift",
    category: "object",
    line: 'da" takes the quotes with it. Use it when the whole clause is rot.',
  },
  {
    id: "d+i(",
    keys: "d i (",
    name: "Paren Crush",
    category: "object",
    line: "di( clears the argument list and keeps the parentheses.",
  },
  {
    id: "d+i{",
    keys: "d i {",
    name: "Brace Crush",
    category: "object",
    line: "di{ hollows the block without unbending it.",
  },
  {
    id: "d+it",
    keys: "d i t",
    name: "Tag Crush",
    category: "object",
    line: "dit takes what sits between the tags. The tags survive.",
  },
  {
    id: "c+iw",
    keys: "c i w",
    name: "Inner Rewrite",
    category: "object",
    line: "ciw is the archivist's favourite: the word vanishes, the cursor waits.",
  },
  {
    id: "c+aw",
    keys: "c a w",
    name: "Around Rewrite",
    category: "object",
    line: "caw replaces a word and eats the space, welding the neighbours.",
  },
  {
    id: 'c+i"',
    keys: 'c i "',
    name: "Quote Rewrite",
    category: "object",
    line: 'ci" is the whole quoted curse gone in two keys and a word of ink.',
  },
  {
    id: "c+i(",
    keys: "c i (",
    name: "Paren Rewrite",
    category: "object",
    line: "ci( rewrites an argument without hunting for its brackets.",
  },
  {
    id: "c+it",
    keys: "c i t",
    name: "Tag Rewrite",
    category: "object",
    line: "cit swaps the contents of a tag element, markup untouched.",
  },
  {
    id: "c+i{",
    keys: "c i {",
    name: "Brace Rewrite",
    category: "object",
    line: "ci{ refills a block. The braces stay where the author left them.",
  },
  {
    id: "y+iw",
    keys: "y i w",
    name: "Inner Copy",
    category: "object",
    line: "yiw lifts a word out without a single character moving.",
  },
  {
    id: 'y+i"',
    keys: 'y i "',
    name: "Quote Copy",
    category: "object",
    line: 'yi" copies a quotation clean. Paste it where it is wanted.',
  },
  {
    id: "y+i(",
    keys: "y i (",
    name: "Paren Copy",
    category: "object",
    line: "yi( takes an argument list whole, brackets and all, or without them by choice.",
  },
  // Visual modes.
  {
    id: "Ctrl-v+d",
    keys: "Ctrl-v d",
    name: "Column Cut",
    category: "visual",
    line: "Ctrl-v marks a column and d takes it out of every line at once.",
  },
  {
    id: "Ctrl-v+c",
    keys: "Ctrl-v c",
    name: "Column Rewrite",
    category: "visual",
    line: "Ctrl-v then c rewrites one column across the whole table.",
  },
  {
    id: "v+d",
    keys: "v d",
    name: "Span Cut",
    category: "visual",
    line: "v selects, d cuts. Anything you can see, you can remove.",
  },
  {
    id: "V+d",
    keys: "V d",
    name: "Line Span Cut",
    category: "visual",
    line: "V takes whole lines and d takes them all. Six rotted lines, one keystroke.",
  },
  {
    id: "V+y",
    keys: "V y",
    name: "Line Span Copy",
    category: "visual",
    line: "V y lifts a stanza. p sets it down twice, as refrains should be.",
  },
  {
    id: "v+~",
    keys: "v ~",
    name: "Span Case Flip",
    category: "visual",
    line: "v then ~ flips the case of everything selected. Shouting, quietly.",
  },
  // Search.
  {
    id: "/+n",
    keys: "/ n",
    name: "Lantern Cast",
    category: "search",
    line: "/ casts the lantern forward. n walks the beam to the next match.",
  },
  {
    id: "*+n",
    keys: "* n",
    name: "Star Hunt",
    category: "search",
    line: "* searches the word under the cursor. n follows the echo.",
  },
  {
    id: ":%s",
    keys: ":%s/old/new/g",
    name: "Whole Substitute",
    category: "ex",
    line: "One substitution, every rot in the folio. The console does not tire.",
  },
  // Macros and echo.
  {
    id: "q+@",
    keys: "q a … q @ a",
    name: "Record & Play",
    category: "macro",
    line: "q records a liturgy into a register. @ plays it back, note for note.",
  },
  {
    id: "@+@",
    keys: "@ @",
    name: "Macro Echo",
    category: "macro",
    line: "@@ repeats the last liturgy without naming it again.",
  },
  {
    id: "dot",
    keys: ".",
    name: "Dot Echo",
    category: "operator",
    line: "One change, then a full stop for every line that needs the same mercy.",
  },
  // The Ex console.
  {
    id: ":g/d",
    keys: ":g/pat/d",
    name: "Global Purge",
    category: "ex",
    line: ":g/BLIGHT/d wipes every blighted line in a sixteen-line folio.",
  },
  {
    id: ":sort",
    keys: ":sort",
    name: "Canon Sort",
    category: "ex",
    line: ":sort orders a scrambled ledger. The archive prefers its shelves in order.",
  },
  {
    id: ":vsplit",
    keys: ":vsplit",
    name: "Vertical Split",
    category: "ex",
    line: ":vsplit opens a second folio beside the first. Two hands, two margins.",
  },
];

export const FAMILY_BY_ID: Record<KeyFamilyId, KeyFamilyDef> = Object.fromEntries(
  KEY_FAMILIES.map((family) => [family.id, family]),
) as Record<KeyFamilyId, KeyFamilyDef>;

export const ACT_BY_ID: Record<ActId, ActDef> = Object.fromEntries(
  ACTS.map((act) => [act.id, act]),
) as Record<ActId, ActDef>;

/** The families claimed by one Act, in purchase order. */
export function familiesOfAct(act: ActId): KeyFamilyDef[] {
  return KEY_FAMILIES.filter((family) => family.act === act);
}
