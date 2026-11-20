// The six skill trials: a real Vim restriction, enforced in the editor, paid for in permanent power.
import type { Effect } from "watchpot/core";
import type { StatId } from "./words";

export interface ChallengeContentDef {
  readonly id: string;
  readonly name: string;
  readonly line: string;
  /** What the trial takes away, in one line, for the card under the name. */
  readonly restrictionText: string;
  /** What a completion leaves behind, in one line, for the same card. */
  readonly rewardText: string;
  /** The glyphs the run must earn before the trial counts as cleared. */
  readonly goalGlyphs: number;
  readonly maxCompletions: number;
  /** The flags the vim gate and the features read while the trial is active. */
  readonly rules: readonly string[];
  /** How deep entering the trial resets: 1 for a run, 2 for the whole epoch. */
  readonly depth: 1 | 2;
  readonly minSeals: number;
  readonly minCodices: number;
  /** The permanent reward for the completions so far, fed to the stats. */
  effects(completions: number): Effect<StatId>[];
}

/**
 * Cheapest first. Each one asks for the idiom it forbids you to fake, and each pays a multiplier that stays after the
 * trial is over: the discipline is the reward, the reward is the proof.
 */
export const CHALLENGES: readonly ChallengeContentDef[] = [
  {
    id: "no-hjkl",
    name: "No Crutches",
    line: "The four oldest friends are taken off you at the door. Learn the rest of the room.",
    restrictionText: "h j k l locked. Move with w b e, f t ; ,, gg G, { } and counts.",
    rewardText: "Clarity ×1.75 a completion, up to three.",
    goalGlyphs: 2e5,
    maxCompletions: 3,
    rules: ["noHjkl"],
    depth: 1,
    minSeals: 1,
    minCodices: 0,
    effects: (n) => [{ stat: "output", mul: 1 + 0.75 * n }],
  },
  {
    id: "par-only",
    name: "One-Shot Surgeon",
    line: "Every cut has to land at par. Slop pays nothing here, however long you stand at the table.",
    restrictionText: "Only edits at or under par pay Glyphs. Anything longer pays zero.",
    rewardText: "Flow Tempo ×1.4 a completion, up to three.",
    goalGlyphs: 5e5,
    maxCompletions: 3,
    rules: ["parOnly"],
    depth: 1,
    minSeals: 5,
    minCodices: 0,
    effects: (n) => [{ stat: "tempo", mul: 1 + 0.4 * n }],
  },
  {
    id: "blind-gutter",
    name: "Blind Margins",
    line: "The gutter goes dark and the whispers stop. Trust the rhythm of the words to tell you where you are.",
    restrictionText: "Line numbers and inline hints are hidden for the whole trial.",
    rewardText: "Seal Yield ×1.6 a completion, up to three.",
    goalGlyphs: 2e6,
    maxCompletions: 3,
    rules: ["blindGutter"],
    depth: 1,
    minSeals: 25,
    minCodices: 0,
    effects: (n) => [{ stat: "gain", mul: 1 + 0.6 * n }],
  },
  {
    id: "normal-only",
    name: "No Insert",
    line: "No new runes tonight. Only the ones already on the page, moved, unmade and put back.",
    restrictionText: "i a o c disabled. Everything is done from Normal mode: x d r ~ J p and :%s.",
    rewardText: "Clarity ×2.2 a completion, up to two.",
    goalGlyphs: 1e7,
    maxCompletions: 2,
    rules: ["normalOnly"],
    depth: 1,
    minSeals: 100,
    minCodices: 0,
    effects: (n) => [{ stat: "output", mul: 1 + 1.2 * n }],
  },
  {
    id: "no-scribes",
    name: "Silent Scribes",
    line: "Send the scribes home with their candles. Whatever is written tonight, you write it.",
    restrictionText: "The idle Scribes are muted: not one glyph trickles in.",
    rewardText: "Ink Flow ×2 and Clarity ×1.8.",
    goalGlyphs: 5e7,
    maxCompletions: 1,
    rules: ["noScribes"],
    depth: 1,
    minSeals: 250,
    minCodices: 0,
    effects: (n) => [
      { stat: "inkRate", mul: 1 + n },
      { stat: "output", mul: 1 + 0.8 * n },
    ],
  },
  {
    id: "macro-trial",
    name: "The One-Macro Epoch",
    line: "One recording, a thousand corrections. The epoch belongs to the register that remembers your hands.",
    restrictionText: "Only `.` echoes and `@` macros pay in full. Raw edits pay a tenth.",
    rewardText: "Codex Yield ×2 and one more .vimrc slot.",
    goalGlyphs: 1e11,
    maxCompletions: 1,
    rules: ["macroTrial"],
    depth: 2,
    minSeals: 250,
    minCodices: 1,
    effects: (n) => [{ stat: "codexGain", mul: 1 + n }],
  },
];
