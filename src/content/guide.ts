// Plain-English teaching data, currency/system glossary, :ex navigation commands, and the
// hand-crafted Folio 0 interactive opening lesson. Pure data — no DOM, no store imports.
import type { Folio } from "../vim/folio";
import type { Currency } from "./words";

/** Plain-English 1-line explanation for every Vim keycap shown on the Chalkboard or in Help. */
export const KEY_GLOSS: Readonly<Record<string, string>> = {
  // Act I — Footwork & Nib
  h: "Move cursor left one character",
  j: "Move cursor down one line",
  k: "Move cursor up one line",
  l: "Move cursor right one character",
  u: "Undo the last change",
  x: "Delete the single character under the cursor",
  i: "Enter Insert mode before the cursor (type text normally)",
  a: "Enter Insert mode after the cursor",
  I: "Enter Insert mode at the start of the line",
  A: "Enter Insert mode at the end of the line",
  Esc: "Leave Insert/Visual mode and return to Normal mode",
  jk: "Quick chord to leave Insert mode (same as Esc)",
  "Ctrl-[": "Terminal chord to leave Insert mode (same as Esc)",

  // Act II — Strides & Snipes
  w: "Jump forward to the start of the next word",
  b: "Jump backward to the start of the previous word",
  e: "Jump forward to the end of the current/next word",
  W: "Jump forward to the next space-separated WORD",
  B: "Jump backward to the previous space-separated WORD",
  E: "Jump forward to the end of the next WORD",
  "0": "Jump to column 1 (the very start of the line)",
  $: "Jump to the last character of the line",
  "^": "Jump to the first non-space character on the line",
  f: "Find forward: press f then a character to jump onto it",
  F: "Find backward: press F then a character to jump back onto it",
  t: "Till forward: jump right before the next matching character",
  T: "Till backward: jump right after the previous matching character",
  ";": "Repeat the last f / F / t / T search forward",
  ",": "Repeat the last f / F / t / T search in reverse",
  gg: "Jump to the very first line of the folio",
  G: "Jump to the very last line of the folio",
  "1": "Count prefix: type a number before a motion (e.g. 4j)",
  "2": "Count prefix: repeat the next motion twice (e.g. 2w)",
  "3": "Count prefix: repeat the next motion 3 times (e.g. 3j)",
  "4": "Count prefix: repeat the next motion 4 times",
  "5": "Count prefix: repeat the next motion 5 times",
  "6": "Count prefix: repeat the next motion 6 times",
  "7": "Count prefix: repeat the next motion 7 times",
  "8": "Count prefix: repeat the next motion 8 times",
  "9": "Count prefix: repeat the next motion 9 times",

  // Act III — Verbs & Composition
  d: "Delete operator: combine with a motion (dw deletes a word)",
  dd: "Delete the entire current line",
  D: "Delete from the cursor to the end of the line",
  c: "Change operator: delete and enter Insert mode (cw changes a word)",
  cc: "Change the entire current line",
  C: "Change from the cursor to the end of the line",
  s: "Substitute: delete one character and enter Insert mode",
  S: "Substitute the entire line",
  y: "Yank (copy) operator: combine with a motion (yw copies a word)",
  yy: "Yank (copy) the entire current line",
  p: "Put (paste) copied or deleted text after the cursor / below the line",
  P: "Put (paste) before the cursor / above the line",
  o: "Open a new blank line below and enter Insert mode",
  O: "Open a new blank line above and enter Insert mode",
  r: "Replace the single character under the cursor (stays in Normal mode)",
  R: "Enter Replace mode (overtype characters until Esc)",
  "~": "Flip uppercase/lowercase on the character under the cursor",
  J: "Join the line below onto the end of the current line",
  "Ctrl-r": "Redo a change you undid with u",

  // Act IV — Objects & Visual
  iw: "Text object: inner word (use with operator, e.g. ciw or diw)",
  aw: "Text object: a word plus surrounding space (e.g. daw)",
  'i"': 'Text object: everything inside double quotes (e.g. ci")',
  'a"': 'Text object: double quotes and everything inside (e.g. da")',
  "i'": "Text object: everything inside single quotes (e.g. ci')",
  "i(": "Text object: everything inside parentheses (e.g. ci()",
  "a(": "Text object: parentheses and everything inside",
  "i[": "Text object: everything inside square brackets",
  "i{": "Text object: everything inside curly braces",
  it: "Text object: everything inside matching HTML/XML tags",
  v: "Enter character-wise Visual selection mode",
  V: "Enter line-wise Visual selection mode",
  "Ctrl-v": "Enter Visual Block (column) selection mode",
  "%": "Jump to the matching bracket, parenthesis, or brace",
  ">": "Indent the line or selection right (>> indents one line)",
  "<": "Outdent the line or selection left (<< outdents one line)",

  // Act V — Lantern & Substitute
  "/": "Search forward for a pattern (press Enter to jump)",
  "?": "Whisper a hint for the current anomaly (archive override)",
  n: "Jump to the next search match",
  N: "Jump to the previous search match",
  "*": "Search forward for the exact word under the cursor",
  "#": "Search backward for the exact word under the cursor",
  "{": "Jump up to the previous blank line / paragraph",
  "}": "Jump down to the next blank line / paragraph",
  m: "Set a bookmark at the cursor (e.g. ma sets mark a)",
  "'": "Jump to the line of a bookmark (e.g. 'a)",
  "`": "Jump to the exact line & column of a bookmark",
  "Ctrl-o": "Jump back to your previous cursor location",
  "Ctrl-i": "Jump forward in the jump list",
  ":%s": "Replace a pattern across the whole folio (:%s/old/new/g)",
  ":s": "Replace a pattern on the current line (:s/old/new/g)",

  // Act VI — Echoes & Choreography
  ".": "Dot-repeat: replay your last edit at the cursor",
  '"a': 'Use named register a (e.g. "ayy to copy into a, "ap to paste)',
  '"0': "Yank register: always holds your last yanked text",
  '"+': "System clipboard register",
  q: "Record a macro: press qa to record into a, then q to stop",
  "@": "Play back a recorded macro (e.g. @a or 5@a)",
  "@@": "Replay the last macro you ran",

  // Act VII — Ex-Console & .vimrc
  ":g": "Run a command on every matching line (e.g. :g/BLIGHT/d)",
  ":v": "Run a command on every line NOT matching a pattern",
  ":norm": "Run Normal-mode keystrokes on a range of lines",
  ":sort": "Sort lines alphabetically",
  ":vsplit": "Split the folio into twin side-by-side panes",
  "Ctrl-w w": "Switch cursor focus between split panes",
};

/** Plain-English tooltip copy for every currency in the header. */
export const CURRENCY_HELP: Readonly<Record<Currency, { title: string; summary: string; detail: string }>> = {
  glyphs: {
    title: "Glyphs",
    summary: "Rescued by mending red rot in the Buffer.",
    detail: "Spend on Scribes, Codex upgrades, and permanently unlocking new Vim key families.",
  },
  ink: {
    title: "Ink",
    summary: "Brewed passively by your Scribes.",
    detail: "Spend on Margin Expeditions and crafting keycap pieces in the Plugin Mosaic.",
  },
  seals: {
    title: "Seals",
    summary: "Earned by binding a Volume (:w) at 50K+ run Glyphs.",
    detail: "Permanent across :w resets. Boosts Clarity and unlocks Seal Shelf upgrades & Mosaic rings.",
  },
  shards: {
    title: "Shards",
    summary: "Brought back by Margin Expeditions and rare folio clears.",
    detail: "Used alongside Ink to craft higher-tier pieces on the Plugin Mosaic bench.",
  },
  treats: {
    title: "Treats",
    summary: "Found on Expeditions, folio clears, and pawprint cleanups.",
    detail:
      "Feed to Tilde (~) on the statusline to permanently raise her Bond (+10% Clarity & Ink Flow each).",
  },
  codices: {
    title: "Codices",
    summary: "Earned by Rebinding the Codex (:wq) at 250+ lifetime Seals.",
    detail: "Permanent forever. Each Codex adds +150% Clarity and unlocks Acts VI & VII.",
  },
};

/** Ex-console navigation and desk commands, shown in Help and wired in BufferEditor. */
export const EX_NAV_COMMANDS: readonly { cmd: string; aliases: string; desc: string }[] = [
  { cmd: ":buf", aliases: ":buffer", desc: "Return to the mending Buffer" },
  { cmd: ":scribes", aliases: ":desk", desc: "Toggle the Scribes margin dock" },
  { cmd: ":codex", aliases: ":tree", desc: "Open the Codex (new Vim keys & upgrades)" },
  { cmd: ":exp", aliases: ":expeditions", desc: "Open Margin Expeditions" },
  { cmd: ":mosaic", aliases: ":board", desc: "Open the Plugin Mosaic" },
  { cmd: ":vol", aliases: ":volumes", desc: "Open Volumes (:w / :wq prestige)" },
  { cmd: ":trials", aliases: ":challenges", desc: "Open Vim Skill Trials" },
  { cmd: ":log", aliases: ":marginalia", desc: "Open Marginalia achievements" },
  { cmd: ":help", aliases: ":h", desc: "Open this Vim Reference & Glossary" },
  { cmd: ":stats", aliases: "", desc: "Open the ledger of your stats" },
  { cmd: ":pet", aliases: ":treat", desc: "Pet or feed Tilde (~) from the console" },
  { cmd: ":buy <scribe>", aliases: ":hire", desc: "Hire a Scribe by seat number or name" },
  { cmd: ":colorscheme <name>", aliases: ":colo", desc: "Print the page on another vellum (no arg cycles)" },
  { cmd: ":zen", aliases: "", desc: "Fold the desk to the buffer alone" },
  { cmd: ":w", aliases: "ZZ", desc: "Bind Volume when ready (+Seals)" },
  { cmd: ":wq", aliases: "", desc: "Rebind Codex when ready (+Codices)" },
];

/** Plain-English archive glossary entries for the Help sheet. */
export const ARCHIVE_GLOSSARY: readonly { term: string; summary: string }[] = [
  {
    term: "The Buffer & Anomalies",
    summary:
      "Each Folio is a glitching manuscript page. Move the cursor to red highlighted rot and fix it to match the clean text shown in the Coach bar.",
  },
  {
    term: "Clean Cuts & Flow",
    summary:
      "Fixing an anomaly within its keystroke par scores a Clean Cut (×2.5 Glyphs and +2 Flow). Flow stacks multiply both your active edits and your Scribes.",
  },
  {
    term: "Glyphs & Clarity",
    summary:
      "Glyphs are your main currency from active editing. Clarity is the global multiplier applied to every Glyph you earn (hover Clarity in the top bar for a breakdown).",
  },
  {
    term: "Scribes & Ink",
    summary:
      "Scribes work in the margin dock, passively brewing Ink (plus a small trickle of Glyphs). Spend Ink on Expeditions and Plugin Mosaic keycaps.",
  },
  {
    term: "Practice Rites (Interactive Lessons)",
    summary:
      "Every time you unlock a new Vim key family in the Codex, the next Folio is a guided Practice Rite teaching those exact keys. Finishing it grants a permanent ×1.25 Clarity bonus.",
  },
  {
    term: "Expeditions & Shards",
    summary:
      "Mouse-friendly timed errands that run even while you are away. They return Shards (for Mosaic crafting) and Treats (for Tilde).",
  },
  {
    term: "Plugin Mosaic",
    summary:
      "A mouse-friendly keycap board. Craft pieces from Ink & Shards and place them next to synergistic neighbours for stacking Clarity, Flow, and Ink multipliers.",
  },
  {
    term: "The Bind (:w) & Seals",
    summary:
      "Your first prestige layer. Once a run earns 50,000+ Glyphs, type :w (or use the Volumes tab) to reset Glyphs, Ink, and Scribes in exchange for permanent Seals. You NEVER lose unlocked Vim keys.",
  },
  {
    term: "Tilde (~)",
    summary:
      "The stray cat on your statusline. Pet her for a Flow Tempo boost, and feed her Treats for permanent Bond levels (+10% Clarity & Ink Flow per rank).",
  },
];

/**
 * Which Act I keys should be shown on the Chalkboard & Help sheet at a given onboarding step.
 * Keeps `x i a I A u` from overwhelming a total Vim beginner on frame 1.
 */
export function visibleAct1Keys(onboardingStep: number, veteranMode: boolean, jkEscape: boolean): string[] {
  const all = ["h", "j", "k", "l", "u", "x", "i", "a", "I", "A", "Esc", ...(jkEscape ? ["jk"] : [])];
  if (veteranMode || onboardingStep >= 5) return all;
  const keys = ["h", "j", "k", "l"];
  if (onboardingStep >= 1) keys.push("x");
  if (onboardingStep >= 2) keys.push("i", "Esc");
  if (onboardingStep >= 3) keys.push("a", "u");
  if (onboardingStep >= 4) keys.push("I", "A");
  return keys;
}

/**
 * Hand-crafted Folio 0: a reactive 3-step interactive opening lesson teaching `h j k l`, `x`, `i`, and `Esc`
 * one key at a time inside the real Vim buffer. Used on a brand-new player's very first folio.
 */
export const FIRST_LESSON_FOLIO: Folio = {
  id: "folio-0-first-lesson",
  title: "First Mending · Desk 7",
  actTier: 1,
  isRite: true,
  riteFamily: "core-edit",
  riteBanner: "Walk with h j k l. New keys unlock as you reach each glitch.",
  lines: [
    "00:00 — Desk 7, midnight shift.",
    "The vellØum is warm by the lamp.",
    "A stray [_] naps by the desk.",
    "Dark ink smells of ce#ar wax.",
  ],
  anomalies: [
    {
      id: "folio-0-first-lesson:0",
      kind: "stray-rot",
      line: 1,
      colStart: 4,
      colEnd: 10,
      targetText: "vellØum",
      expectedLine: "The vellum is warm by the lamp.",
      parKeys: 12,
      hintId: "stray-rot",
      optimalHint: "j to line 2, l onto Ø, then press x",
      label: "CUT",
      weight: 1,
    },
    {
      id: "folio-0-first-lesson:1",
      kind: "missing-rune",
      line: 2,
      colStart: 8,
      colEnd: 11,
      targetText: "[_]",
      expectedLine: "A stray cat naps by the desk.",
      parKeys: 16,
      hintId: "missing-rune",
      optimalHint: "x x x to clear [_], press i, type cat, then Esc",
      label: "INS",
      weight: 1,
    },
    {
      id: "folio-0-first-lesson:2",
      kind: "stray-rot",
      line: 3,
      colStart: 19,
      colEnd: 24,
      targetText: "ce#ar",
      expectedLine: "Dark ink smells of cedar wax.",
      parKeys: 16,
      hintId: "stray-rot",
      optimalHint: "Move to #, press x, press i, type d, then Esc",
      label: "FIX",
      weight: 1,
    },
  ],
  hasPawprint: false,
};

/**
 * Hand-crafted Folio 1: teaches `a` (append AFTER cursor) and `u` (undo) in 2 quick edits,
 * right after basic `hjkl` / `x` / `i` / `Esc` have clicked.
 */
export const FOLIO_1_APPEND_LESSON: Folio = {
  id: "folio-1-append-lesson",
  title: "Append & Undo · Desk 7",
  actTier: 1,
  isRite: true,
  riteFamily: "core-edit",
  riteBanner: "New keys: a inserts AFTER the cursor (great at word ends). u undoes a slip.",
  lines: [
    "Night shift, page two.",
    "The brass lam burns steady.",
    "Warm vellum holds the inØk.",
    "Press u anytime to undo a mistake.",
  ],
  anomalies: [
    {
      id: "folio-1-append-lesson:0",
      kind: "missing-rune",
      line: 1,
      colStart: 10,
      colEnd: 14,
      targetText: "lam",
      expectedLine: "The brass lamp burns steady.",
      parKeys: 14,
      hintId: "append-a",
      optimalHint: "Move onto m in lam, press a, type p, then Esc",
      label: "APP",
      weight: 1,
    },
    {
      id: "folio-1-append-lesson:1",
      kind: "stray-rot",
      line: 2,
      colStart: 22,
      colEnd: 25,
      targetText: "inØk",
      expectedLine: "Warm vellum holds the ink.",
      parKeys: 14,
      hintId: "stray-rot",
      optimalHint: "Move onto Ø and press x",
      label: "CUT",
      weight: 1,
    },
  ],
  hasPawprint: false,
};

/**
 * Hand-crafted Folio 2: teaches `I` (insert at start of line) and `A` (insert at end of line)
 * on two crisp lines — completing the Act I foundation without dumping `x i a I A` on frame 1.
 */
export const FOLIO_2_EDGE_LESSON: Folio = {
  id: "folio-2-edge-lesson",
  title: "Line Edges · Desk 7",
  actTier: 1,
  isRite: true,
  riteFamily: "core-edit",
  riteBanner: "New keys: I jumps to the START of a line to type; A jumps to the END of a line to type.",
  lines: [
    "Night shift, page three.",
    "moth drifts near the amber glass.",
    "The ledger spine holds tight.",
    "Every clean cut builds your Flo",
  ],
  anomalies: [
    {
      id: "folio-2-edge-lesson:0",
      kind: "missing-rune",
      line: 1,
      colStart: 0,
      colEnd: 6,
      targetText: "moth",
      expectedLine: "A moth drifts near the amber glass.",
      parKeys: 10,
      hintId: "edge-I",
      optimalHint: "Anywhere on line 2, press Shift+i (I), type A and space, then Esc",
      label: "START",
      weight: 1,
    },
    {
      id: "folio-2-edge-lesson:1",
      kind: "missing-rune",
      line: 3,
      colStart: 28,
      colEnd: 33,
      targetText: "Flo",
      expectedLine: "Every clean cut builds your Flow.",
      parKeys: 10,
      hintId: "edge-A",
      optimalHint: "Anywhere on line 4, press Shift+a (A), type w. then Esc",
      label: "END",
      weight: 1,
    },
  ],
  hasPawprint: false,
};
