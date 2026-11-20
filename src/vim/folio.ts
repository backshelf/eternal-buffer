// The Living Folio: procedural manuscript generation and real-time verification.
//
// Two rules shape everything here:
//   1. Same seed and same inputs produce a bit-identical `Folio`. Every draw comes from `seedRng`.
//   2. Verification matches by *content*, never by line index. A `dd` early in the page moves every
//      later line up one, and the evaluator does not care.
//
// Column convention (this is what makes the evaluator possible without extra fields): `colStart` and
// `colEnd` index the CLEAN line stored in `expectedLine`. The corrupted page reads
// `expectedLine.slice(0, colStart) + targetText + expectedLine.slice(colEnd)`. So the clean text a
// player must restore is always `expectedLine.slice(colStart, colEnd)`, and the span on the page they
// are looking at is `[colStart, colStart + targetText.length)`.
//
// Multi-line kinds (`sorted-canon`, `register-splice`) join their participating lines with "\n" into
// `targetText`, the only way to describe a permutation or a swap with a single anomaly record.
import { nextInt, pickWeighted, type RngState, seedRng } from "watchpot/core";
import {
  ACT1_FOLIO_TEMPLATES,
  ANOMALY_SPEC,
  ANOMALY_SPECS,
  type AnomalySpec,
  FOLIO_TEMPLATES,
  type FolioTemplate,
  PAWPRINT_LINE,
  type PracticeRiteDef,
  practiceRite,
  practiceRiteDocument,
  ROT_CHARS,
  ROT_TOKENS,
} from "../content/folios";

export type AnomalyKind =
  | "stray-rot"
  | "missing-rune"
  | "margin-snipe"
  | "summit-abyss"
  | "rotten-word"
  | "blighted-verse"
  | "broken-refrain"
  | "case-typo"
  | "quoted-curse"
  | "column-rot"
  | "indent-block"
  | "scattered-sigil"
  | "echo-hunt"
  | "ritual-table"
  | "register-splice"
  | "sorted-canon"
  | "global-purge"
  | "pawprint";

export interface FolioAnomaly {
  id: string;
  kind: AnomalyKind;
  /** 0-indexed line on the page as it was handed to the player. Verification ignores it. */
  line: number;
  /** Column where the clean span starts; also where the corruption starts on the page. */
  colStart: number;
  /** End of the clean span. The corrupted span on the page is `colStart + targetText.length` wide. */
  colEnd: number;
  /** The corrupted substring, or the whole line for whole-line kinds, or lines joined by "\n". */
  targetText: string;
  /** The clean line. `null` means the line should be deleted outright. */
  expectedLine: string | null;
  parKeys: number;
  hintId: string;
  optimalHint: string;
  label: string;
  /** Payout multiplier. Ordinary anomalies pay 1, the mega ones (a column, a table, a purge) pay 2+. */
  weight: number;
}

export interface Folio {
  id: string;
  title: string;
  actTier: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  isRite: boolean;
  riteFamily?: string;
  riteBanner?: string;
  lines: string[];
  anomalies: FolioAnomaly[];
  hasPawprint: boolean;
}

export interface GenerateFolioInput {
  seed: number;
  unlocked: Readonly<Record<string, true>>;
  actTier: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  riteFamily?: string;
  challengeRules: readonly string[];
  includePawprint?: boolean;
}

/** An anomaly draft: everything `FolioAnomaly` has except the two fields generation assigns. */
interface AnomalyDraft {
  kind: AnomalyKind;
  line: number;
  colStart: number;
  colEnd: number;
  targetText: string;
  expectedLine: string | null;
  parKeys: number;
  optimalHint: string;
}

interface SpanMutation {
  line: number;
  start: number;
  end: number;
  text: string;
}

/** A span on the page, before its replacement text is known. */
interface SpanSpot {
  line: number;
  start: number;
  end: number;
}

/** One anomaly plus the page edits that put it there. */
interface SitePlan {
  draft: AnomalyDraft;
  spans?: readonly SpanMutation[];
  swap?: readonly [number, number];
  reorder?: { readonly block: readonly number[]; readonly order: readonly number[] };
}

const MIN_ANOMALIES = 2;
const MAX_ANOMALIES = 5;
const BLIGHT_MARK = "~BLIGHT~";
/** `~BLIGHT~` is reserved for blighted verse so a purge never eats a blight the player must `dd`. */
const PURGE_TOKENS: readonly string[] = ROT_TOKENS.filter((token) => token !== BLIGHT_MARK);
const WORD_PATTERN = /[A-Za-z][A-Za-z'-]{2,}/g;
const RUNE_GAP = "[_]";

// ---------------------------------------------------------------------------------------------
// Deterministic draws
// ---------------------------------------------------------------------------------------------

interface Dice {
  int(bound: number): number;
  /** Weights need not sum to one. Returns -1 when every weight is zero. */
  weighted(weights: readonly number[]): number;
}

function diceFor(seed: string | number): Dice {
  let state: RngState = seedRng(seed);
  return {
    int(bound) {
      if (bound <= 1) return 0;
      const [value, next] = nextInt(state, bound);
      state = next;
      return value;
    },
    weighted(weights) {
      let total = 0;
      for (const weight of weights) total += weight;
      if (total <= 0) return -1;
      const [value, next] = pickWeighted(state, weights);
      state = next;
      return value;
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Page scanning
// ---------------------------------------------------------------------------------------------

interface WordSite {
  line: number;
  start: number;
  end: number;
  word: string;
}

function wordsIn(line: string): WordSite[] {
  const sites: WordSite[] = [];
  for (const match of line.matchAll(WORD_PATTERN)) {
    const word = match[0];
    const start = match.index ?? 0;
    sites.push({ line: -1, start, end: start + word.length, word });
  }
  return sites;
}

interface Gen {
  dice: Dice;
  clean: readonly string[];
  unlocked: Readonly<Record<string, true>>;
  taken: Set<number>;
  usedTargets: Set<string>;
  usedTokens: Set<string>;
  tokenPointer: number;
  charPointer: number;
  plans: SitePlan[];
}

/** Every free word long enough to hide a corruption, in page order. */
function wordSites(g: Gen, minLength = 1): WordSite[] {
  const sites: WordSite[] = [];
  g.clean.forEach((line, index) => {
    if (g.taken.has(index)) return;
    for (const site of wordsIn(line)) {
      if (site.word.length >= minLength) sites.push({ ...site, line: index });
    }
  });
  return sites;
}

/** Which free lines carry each word. Insertion order is page order, so it is deterministic. */
function wordIndex(g: Gen): Map<string, number[]> {
  const index = new Map<string, number[]>();
  g.clean.forEach((line, lineIndex) => {
    if (g.taken.has(lineIndex)) return;
    for (const site of wordsIn(line)) {
      if (site.word.length < 3) continue;
      const carriers = index.get(site.word);
      if (!carriers) {
        index.set(site.word, [lineIndex]);
      } else if (carriers[carriers.length - 1] !== lineIndex) {
        carriers.push(lineIndex);
      }
    }
  });
  return index;
}

function nextToken(g: Gen): string {
  for (let attempt = 0; attempt < PURGE_TOKENS.length; attempt += 1) {
    const candidate = PURGE_TOKENS[(g.tokenPointer + attempt) % PURGE_TOKENS.length];
    if (candidate !== undefined && !g.usedTokens.has(candidate)) {
      g.tokenPointer = (g.tokenPointer + attempt + 1) % PURGE_TOKENS.length;
      g.usedTokens.add(candidate);
      return candidate;
    }
  }
  const fallback = PURGE_TOKENS[g.tokenPointer % PURGE_TOKENS.length] ?? "##ROT##";
  g.tokenPointer = (g.tokenPointer + 1) % PURGE_TOKENS.length;
  return fallback;
}

function nextRotChar(g: Gen): string {
  const value = ROT_CHARS[g.charPointer % ROT_CHARS.length] ?? "Ø";
  g.charPointer += 1;
  return value;
}

function touchedLines(plan: SitePlan): number[] {
  const lines = new Set<number>([plan.draft.line]);
  for (const span of plan.spans ?? []) lines.add(span.line);
  if (plan.swap) for (const line of plan.swap) lines.add(line);
  if (plan.reorder) for (const line of plan.reorder.block) lines.add(line);
  return [...lines];
}

/** Claim the site, or drop the plan without touching the page. */
function accept(g: Gen, plan: SitePlan): SitePlan | null {
  if (g.usedTargets.has(plan.draft.targetText)) return null;
  const lines = touchedLines(plan);
  for (const line of lines) if (g.taken.has(line)) return null;
  for (const line of lines) g.taken.add(line);
  g.usedTargets.add(plan.draft.targetText);
  if (plan.draft.expectedLine !== null) g.usedTargets.add(plan.draft.expectedLine);
  g.plans.push(plan);
  return plan;
}

// ---------------------------------------------------------------------------------------------
// Planners: one per anomaly kind
// ---------------------------------------------------------------------------------------------

interface CharRotOptions {
  onLine?: (index: number) => boolean;
  minLineLength?: number;
  inSecondHalf?: boolean;
}

/** A single wrong character inside a word, repaired with `f` + `r`. */
function planCharRot(g: Gen, spec: AnomalySpec, options: CharRotOptions = {}): SitePlan | null {
  const pool: WordSite[] = [];
  g.clean.forEach((line, index) => {
    if (g.taken.has(index)) return;
    if (options.onLine && !options.onLine(index)) return;
    if (options.minLineLength !== undefined && line.length < options.minLineLength) return;
    for (const site of wordsIn(line)) {
      if (site.word.length < 5) continue;
      if (options.inSecondHalf === true && site.start < line.length / 2) continue;
      pool.push({ ...site, line: index });
    }
  });
  if (pool.length === 0) return null;

  const site = pool[g.dice.int(pool.length)];
  if (!site) return null;
  const middle = Math.floor(site.word.length / 2);
  const rot = nextRotChar(g);
  const cleanChar = site.word[middle] ?? "a";
  const corrupt = site.word.slice(0, middle) + rot + site.word.slice(middle + 1);
  const hasSnipe = g.unlocked["char-snipe"] === true;
  const hasReplace = g.unlocked["line-craft"] === true;
  const optimalHint =
    hasSnipe && hasReplace
      ? `f${rot} r${cleanChar}`
      : hasSnipe
        ? `f${rot} x i ${cleanChar} Esc`
        : `h/j/k/l to ${rot}, then x i ${cleanChar} Esc`;
  const parKeys = hasSnipe && hasReplace ? 4 : hasSnipe ? 7 : 10;

  return accept(g, {
    draft: {
      kind: spec.kind,
      line: site.line,
      colStart: site.start,
      colEnd: site.end,
      targetText: corrupt,
      expectedLine: g.clean[site.line] ?? "",
      parKeys,
      optimalHint,
    },
    spans: [{ line: site.line, start: site.start, end: site.end, text: corrupt }],
  });
}

function planStrayRot(g: Gen, spec: AnomalySpec): SitePlan | null {
  return planCharRot(g, spec);
}

function planSummitAbyss(g: Gen, spec: AnomalySpec): SitePlan | null {
  const last = g.clean.length - 1;
  const plan = planCharRot(g, spec, { onLine: (index) => index === 0 || index === last });
  if (!plan) return null;
  plan.draft.parKeys = 6;
  plan.draft.optimalHint = `${plan.draft.line === 0 ? "gg" : "G"} ${plan.draft.optimalHint}`;
  return plan;
}

function planMarginSnipe(g: Gen, spec: AnomalySpec): SitePlan | null {
  return planCharRot(g, spec, { minLineLength: 56, inSecondHalf: true });
}

function planMissingRune(g: Gen, spec: AnomalySpec): SitePlan | null {
  if (g.usedTargets.has(RUNE_GAP)) return null;
  const pool = wordSites(g, 4);
  if (pool.length === 0) return null;
  const site = pool[g.dice.int(pool.length)];
  if (!site) return null;
  const hasSnipe = g.unlocked["char-snipe"] === true;
  const hasChange = g.unlocked["op-change"] === true;
  const optimalHint =
    hasSnipe && hasChange
      ? `f[ cw ${site.word} Esc`
      : hasChange
        ? `cw ${site.word} Esc`
        : `x x x i ${site.word} Esc`;
  const parKeys = (hasChange ? 6 : 9) + site.word.length;
  return accept(g, {
    draft: {
      kind: spec.kind,
      line: site.line,
      colStart: site.start,
      colEnd: site.end,
      targetText: RUNE_GAP,
      expectedLine: g.clean[site.line] ?? "",
      parKeys,
      optimalHint,
    },
    spans: [{ line: site.line, start: site.start, end: site.end, text: RUNE_GAP }],
  });
}

function planRottenWord(g: Gen, spec: AnomalySpec): SitePlan | null {
  const pool = wordSites(g, 4);
  if (pool.length === 0) return null;
  const site = pool[g.dice.int(pool.length)];
  if (!site) return null;
  const rot = nextToken(g);
  return accept(g, {
    draft: {
      kind: spec.kind,
      line: site.line,
      colStart: site.start,
      colEnd: site.end,
      targetText: rot,
      expectedLine: g.clean[site.line] ?? "",
      parKeys: 4 + site.word.length,
      optimalHint: `cw ${site.word} Esc`,
    },
    spans: [{ line: site.line, start: site.start, end: site.end, text: rot }],
  });
}

function planBlightedVerse(g: Gen, spec: AnomalySpec): SitePlan | null {
  const candidates: number[] = [];
  g.clean.forEach((line, index) => {
    if (g.taken.has(index) || line.startsWith(BLIGHT_MARK) || line.length < 12) return;
    candidates.push(index);
  });
  if (candidates.length === 0) return null;
  const line = candidates[g.dice.int(candidates.length)];
  if (line === undefined) return null;
  const original = g.clean[line] ?? "";
  const corrupt = `${BLIGHT_MARK} ${original}`;
  return accept(g, {
    draft: {
      kind: spec.kind,
      line,
      colStart: 0,
      colEnd: original.length,
      targetText: corrupt,
      expectedLine: null,
      parKeys: 2,
      optimalHint: "dd",
    },
    spans: [{ line, start: 0, end: original.length, text: corrupt }],
  });
}

/** A refrain that should be sung twice and is only printed once. */
function planBrokenRefrain(g: Gen, spec: AnomalySpec): SitePlan | null {
  const candidates: string[] = [];
  g.clean.forEach((line, index) => {
    if (g.taken.has(index) || line.length < 16) return;
    if (g.clean.filter((other) => other === line).length !== 1) return;
    candidates.push(line);
  });
  if (candidates.length === 0) return null;
  const refrain = candidates[g.dice.int(candidates.length)];
  if (refrain === undefined) return null;
  const line = g.clean.indexOf(refrain);
  return accept(g, {
    draft: {
      kind: spec.kind,
      line,
      colStart: 0,
      colEnd: refrain.length,
      targetText: refrain,
      expectedLine: refrain,
      parKeys: 4,
      optimalHint: "yy p",
    },
  });
}

function planCaseTypo(g: Gen, spec: AnomalySpec): SitePlan | null {
  const pool = wordSites(g, 4);
  if (pool.length === 0) return null;
  const site = pool[g.dice.int(pool.length)];
  if (!site) return null;
  const at = Math.min(1, site.word.length - 1);
  const character = site.word[at] ?? "";
  const flipped = character === character.toLowerCase() ? character.toUpperCase() : character.toLowerCase();
  if (flipped === character) return null;
  const corrupt = site.word.slice(0, at) + flipped + site.word.slice(at + 1);
  return accept(g, {
    draft: {
      kind: spec.kind,
      line: site.line,
      colStart: site.start,
      colEnd: site.end,
      targetText: corrupt,
      expectedLine: g.clean[site.line] ?? "",
      parKeys: 3,
      optimalHint: `f${flipped} ~`,
    },
    spans: [{ line: site.line, start: site.start, end: site.end, text: corrupt }],
  });
}

function planQuotedCurse(g: Gen, spec: AnomalySpec): SitePlan | null {
  const options: { line: number; start: number; end: number; inner: string }[] = [];
  g.clean.forEach((line, index) => {
    if (g.taken.has(index)) return;
    for (const match of line.matchAll(/"([^"]{5,26})"/g)) {
      const inner = match[0].slice(1, -1);
      const start = (match.index ?? 0) + 1;
      options.push({ line: index, start, end: start + inner.length, inner });
    }
  });
  if (options.length === 0) return null;
  const site = options[g.dice.int(options.length)];
  if (!site) return null;
  const rot = nextToken(g);
  return accept(g, {
    draft: {
      kind: spec.kind,
      line: site.line,
      colStart: site.start,
      colEnd: site.end,
      targetText: rot,
      expectedLine: g.clean[site.line] ?? "",
      parKeys: 4 + site.inner.length,
      optimalHint: `ci" ${site.inner} Esc`,
    },
    spans: [{ line: site.line, start: site.start, end: site.end, text: rot }],
  });
}

/** A whole column of rot: one `Ctrl-v` block delete clears every row at once. */
function planColumnRot(g: Gen, spec: AnomalySpec): SitePlan | null {
  const column = 10;
  const runs: number[][] = [];
  let run: number[] = [];
  for (let index = 0; index < g.clean.length; index += 1) {
    const line = g.clean[index] ?? "";
    if (g.taken.has(index) || line.length < column + 14) {
      if (run.length >= 4) runs.push(run);
      run = [];
      continue;
    }
    run.push(index);
  }
  if (run.length >= 4) runs.push(run);
  if (runs.length === 0) return null;

  const chosen = runs[g.dice.int(runs.length)];
  if (!chosen) return null;
  const count = Math.min(chosen.length, 4 + g.dice.int(2));
  const block = chosen.slice(0, count);
  const anchor = block[0];
  if (anchor === undefined) return null;
  const rot = nextToken(g);
  return accept(g, {
    draft: {
      kind: spec.kind,
      line: anchor,
      colStart: column,
      colEnd: column,
      targetText: rot,
      expectedLine: g.clean[anchor] ?? "",
      parKeys: count + 3,
      optimalHint: `${column}| Ctrl-v ${count - 1}j d`,
    },
    spans: block.map((line) => ({ line, start: column, end: column, text: rot })),
  });
}

/** One line leaning one level too far right; `<<` squares it back up. */
function planIndentBlock(g: Gen, spec: AnomalySpec): SitePlan | null {
  const candidates: number[] = [];
  g.clean.forEach((line, index) => {
    if (g.taken.has(index) || line.length < 20 || /^\s/.test(line)) return;
    candidates.push(index);
  });
  if (candidates.length === 0) return null;
  const line = candidates[g.dice.int(candidates.length)];
  if (line === undefined) return null;
  const original = g.clean[line] ?? "";
  const corrupt = `  ${original}`;
  return accept(g, {
    draft: {
      kind: spec.kind,
      line,
      colStart: 0,
      colEnd: original.length,
      targetText: corrupt,
      expectedLine: original,
      parKeys: 3,
      optimalHint: "<<",
    },
    spans: [{ line, start: 0, end: original.length, text: corrupt }],
  });
}

/** The same word corrupted in five places: `:%s` wipes all five in one command. */
function planScatteredSigil(g: Gen, spec: AnomalySpec): SitePlan | null {
  const index = wordIndex(g);
  const candidates = [...index.entries()].filter(([, lines]) => lines.length >= 5);
  if (candidates.length === 0) return null;
  const chosen = candidates[g.dice.int(candidates.length)];
  if (!chosen) return null;
  const [word, carriers] = chosen;
  const block = carriers.slice(0, 5);
  const anchor = block[0];
  if (anchor === undefined) return null;
  const anchorSite = wordsIn(g.clean[anchor] ?? "").find((site) => site.word === word);
  if (!anchorSite) return null;

  const spans: SpanSpot[] = [];
  for (const line of block) {
    const site = wordsIn(g.clean[line] ?? "").find((entry) => entry.word === word);
    if (site) spans.push({ line, start: site.start, end: site.end });
  }
  if (spans.length < 5) return null;
  const rot = nextToken(g);
  return accept(g, {
    draft: {
      kind: spec.kind,
      line: anchor,
      colStart: anchorSite.start,
      colEnd: anchorSite.end,
      targetText: rot,
      expectedLine: g.clean[anchor] ?? "",
      parKeys: 9 + rot.length + word.length,
      optimalHint: `:%s/${rot}/${word}/g`,
    },
    spans: spans.map((span) => ({ ...span, text: rot })),
  });
}

/** An echo of one word, twice, far apart: `*` then `n` and `cw` on each. */
function planEchoHunt(g: Gen, spec: AnomalySpec): SitePlan | null {
  const middle = Math.floor(g.clean.length / 2);
  const index = wordIndex(g);
  const candidates = [...index.entries()].filter(
    ([, lines]) =>
      lines.length === 2 && lines.some((line) => line < middle) && lines.some((line) => line >= middle),
  );
  if (candidates.length === 0) return null;
  const chosen = candidates[g.dice.int(candidates.length)];
  if (!chosen) return null;
  const [word, carriers] = chosen;
  const anchor = carriers[0];
  if (anchor === undefined) return null;
  const anchorSite = wordsIn(g.clean[anchor] ?? "").find((site) => site.word === word);
  if (!anchorSite) return null;

  const spans: SpanSpot[] = [];
  for (const line of carriers) {
    const site = wordsIn(g.clean[line] ?? "").find((entry) => entry.word === word);
    if (site) spans.push({ line, start: site.start, end: site.end });
  }
  if (spans.length !== 2) return null;
  const rot = nextToken(g);
  return accept(g, {
    draft: {
      kind: spec.kind,
      line: anchor,
      colStart: anchorSite.start,
      colEnd: anchorSite.end,
      targetText: rot,
      expectedLine: g.clean[anchor] ?? "",
      parKeys: 12,
      optimalHint: `* n cw ${word} Esc`,
    },
    spans: spans.map((span) => ({ ...span, text: rot })),
  });
}

/** Six rows, one edit: fix the first with `cw`, then `.` down the column or `5@a`. */
function planRitualTable(g: Gen, spec: AnomalySpec): SitePlan | null {
  const rows = 6;
  for (let start = 0; start + rows <= g.clean.length; start += 1) {
    const block: number[] = [];
    for (let i = start; i < start + rows; i += 1) {
      if (g.taken.has(i)) break;
      block.push(i);
    }
    if (block.length < rows) continue;

    for (const candidate of wordsIn(g.clean[start] ?? "")) {
      if (candidate.word.length < 3) continue;
      const spans: SpanSpot[] = [];
      for (const line of block) {
        const site = wordsIn(g.clean[line] ?? "").find((entry) => entry.word === candidate.word);
        if (site) spans.push({ line, start: site.start, end: site.end });
      }
      if (spans.length !== rows) continue;
      const anchor = block[0];
      const anchorSite = wordsIn(g.clean[anchor ?? 0] ?? "").find((entry) => entry.word === candidate.word);
      if (anchor === undefined || !anchorSite) continue;
      const rot = nextToken(g);
      return accept(g, {
        draft: {
          kind: spec.kind,
          line: anchor,
          colStart: anchorSite.start,
          colEnd: anchorSite.end,
          targetText: rot,
          expectedLine: g.clean[anchor] ?? "",
          parKeys: 10 + candidate.word.length,
          optimalHint: `cw ${candidate.word} Esc j . . . . .`,
        },
        spans: spans.map((span) => ({ ...span, text: rot })),
      });
    }
  }
  return null;
}

/** Two clauses swapped by mistake, swapped back through two named registers. */
function planRegisterSplice(g: Gen, spec: AnomalySpec): SitePlan | null {
  const first = g.clean.findIndex((line, index) => !g.taken.has(index) && line.length > 14);
  if (first < 0) return null;
  let partner = -1;
  for (let index = first + 1; index < g.clean.length; index += 1) {
    const line = g.clean[index] ?? "";
    if (g.taken.has(index) || line.length < 14 || line === (g.clean[first] ?? "")) continue;
    partner = index;
    break;
  }
  if (partner < 0) return null;

  const a = g.clean[first] ?? "";
  const b = g.clean[partner] ?? "";
  return accept(g, {
    draft: {
      kind: spec.kind,
      line: first,
      colStart: 0,
      colEnd: a.length,
      targetText: `${b}\n${a}`,
      expectedLine: a,
      parKeys: 14,
      optimalHint: '"a dd "b dd "ap',
    },
    swap: [first, partner],
  });
}

/** A ledger block shuffled by a careless scribe: `:sort` puts the canon back. */
function planSortedCanon(g: Gen, spec: AnomalySpec): SitePlan | null {
  const runs: number[][] = [];
  let run: number[] = [];
  for (let index = 0; index < g.clean.length; index += 1) {
    const line = g.clean[index] ?? "";
    if (g.taken.has(index)) {
      if (run.length >= 3) runs.push(run);
      run = [];
      continue;
    }
    const previousIndex = run[run.length - 1];
    const previous = previousIndex === undefined ? "" : (g.clean[previousIndex] ?? "");
    if (previousIndex !== undefined && previous > line) {
      if (run.length >= 3) runs.push(run);
      run = [index];
      continue;
    }
    run.push(index);
  }
  if (run.length >= 3) runs.push(run);
  if (runs.length === 0) return null;

  const long = runs.filter((entry) => entry.length >= 4);
  const pool = long.length > 0 ? long : runs;
  const chosen = pool[g.dice.int(pool.length)];
  if (!chosen) return null;
  const block = chosen.slice(0, Math.min(chosen.length, 4));
  const order = [...block];
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = g.dice.int(i + 1);
    const held = order[i];
    order[i] = order[j] ?? held ?? 0;
    order[j] = held ?? order[j] ?? 0;
  }
  const anchor = block[0];
  if (anchor === undefined) return null;
  const sorted = [...block].sort((left, right) => left - right);
  if (order.every((line, index) => line === sorted[index])) return null;

  return accept(g, {
    draft: {
      kind: spec.kind,
      line: anchor,
      colStart: 0,
      colEnd: (g.clean[anchor] ?? "").length,
      targetText: order.map((line) => g.clean[line] ?? "").join("\n"),
      expectedLine: g.clean[anchor] ?? "",
      parKeys: 7,
      optimalHint: ":sort",
    },
    reorder: { block, order },
  });
}

/** Three blighted lines and one `:g/pattern/d`. */
function planGlobalPurge(g: Gen, spec: AnomalySpec): SitePlan | null {
  const candidates: number[] = [];
  g.clean.forEach((line, index) => {
    if (g.taken.has(index) || line.length < 12) return;
    candidates.push(index);
  });
  if (candidates.length < 3) return null;
  const count = Math.min(candidates.length, 3 + g.dice.int(2));
  const block = candidates.slice(0, count);
  const anchor = block[0];
  if (anchor === undefined) return null;
  const rot = nextToken(g);
  return accept(g, {
    draft: {
      kind: spec.kind,
      line: anchor,
      colStart: 0,
      colEnd: (g.clean[anchor] ?? "").length,
      targetText: rot,
      expectedLine: null,
      parKeys: 6 + rot.length,
      optimalHint: `:g/${rot}/d`,
    },
    spans: block.map((line) => ({ line, start: 0, end: 0, text: `${rot} ` })),
  });
}

const PLANNERS: Readonly<
  Record<Exclude<AnomalyKind, "pawprint">, (g: Gen, spec: AnomalySpec) => SitePlan | null>
> = {
  "stray-rot": planStrayRot,
  "missing-rune": planMissingRune,
  "margin-snipe": planMarginSnipe,
  "summit-abyss": planSummitAbyss,
  "rotten-word": planRottenWord,
  "blighted-verse": planBlightedVerse,
  "broken-refrain": planBrokenRefrain,
  "case-typo": planCaseTypo,
  "quoted-curse": planQuotedCurse,
  "column-rot": planColumnRot,
  "indent-block": planIndentBlock,
  "scattered-sigil": planScatteredSigil,
  "echo-hunt": planEchoHunt,
  "ritual-table": planRitualTable,
  "register-splice": planRegisterSplice,
  "sorted-canon": planSortedCanon,
  "global-purge": planGlobalPurge,
};

// ---------------------------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------------------------

function isEligible(
  spec: AnomalySpec,
  unlocked: Readonly<Record<string, true>>,
  actTier: number,
  normalOnly: boolean,
): boolean {
  if (spec.kind === "pawprint") return false;
  if (spec.minAct > actTier) return false;
  if (normalOnly && spec.insertRequired) return false;
  return spec.families.every((family) => unlocked[family] === true);
}

function pickTemplate(dice: Dice, compact: boolean): FolioTemplate {
  const pool = compact ? ACT1_FOLIO_TEMPLATES : FOLIO_TEMPLATES;
  const chosen = pool[dice.int(pool.length)];
  if (chosen) return chosen;
  const first = pool[0];
  if (first) return first;
  return { id: "blank-folio", genre: "margin-script", title: "A Blank Folio", lines: [""] };
}

function applyPlans(template: FolioTemplate, plans: readonly SitePlan[]): string[] {
  const lines = [...template.lines];
  for (const plan of plans) {
    if (plan.swap) {
      const [a, b] = plan.swap;
      const left = lines[a];
      const right = lines[b];
      if (left !== undefined && right !== undefined) {
        lines[a] = right;
        lines[b] = left;
      }
    }
    if (plan.reorder) {
      const { block, order } = plan.reorder;
      order.forEach((from, index) => {
        const target = block[index];
        const source = template.lines[from];
        if (target !== undefined && source !== undefined) lines[target] = source;
      });
    }
    for (const span of plan.spans ?? []) {
      const base = template.lines[span.line];
      if (base === undefined) continue;
      lines[span.line] = base.slice(0, span.start) + span.text + base.slice(span.end);
    }
  }
  return lines;
}

function draftToAnomaly(draft: AnomalyDraft, folioId: string, index: number): FolioAnomaly {
  const spec = ANOMALY_SPEC[draft.kind];
  return {
    id: `${folioId}:${index}`,
    kind: draft.kind,
    line: draft.line,
    colStart: draft.colStart,
    colEnd: draft.colEnd,
    targetText: draft.targetText,
    expectedLine: draft.expectedLine,
    parKeys: draft.parKeys,
    hintId: spec.hintId,
    optimalHint: draft.optimalHint,
    label: spec.label,
    weight: spec.weight,
  };
}

function hashId(input: GenerateFolioInput): string {
  const material = `${input.seed}|${input.actTier}|${input.riteFamily ?? "-"}|${
    input.includePawprint === true ? 1 : 0
  }`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < material.length; i += 1) {
    hash ^= material.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

function pawprintAnomaly(line: number, folioId: string): FolioAnomaly {
  const spec = ANOMALY_SPEC.pawprint;
  return {
    id: `${folioId}:paw`,
    kind: "pawprint",
    line,
    colStart: 0,
    colEnd: PAWPRINT_LINE.length,
    targetText: PAWPRINT_LINE,
    expectedLine: null,
    parKeys: 2,
    hintId: spec.hintId,
    optimalHint: "dd",
    label: spec.label,
    weight: spec.weight,
  };
}

function buildRiteFolio(rite: PracticeRiteDef, folioId: string): Folio {
  const page = practiceRiteDocument(rite);
  return {
    id: folioId,
    title: rite.title,
    actTier: rite.actTier,
    isRite: true,
    riteFamily: rite.family,
    riteBanner: rite.banner,
    lines: page.lines,
    anomalies: page.anomalies.map((draft, index) => draftToAnomaly(draft, folioId, index)),
    hasPawprint: false,
  };
}

/**
 * Build the next page. With `riteFamily` the hand-authored lesson for that family comes back
 * verbatim; otherwise every point of variation is drawn from `seed`.
 *
 * A Practice Rite never carries a pawprint: it is a lesson, not the random cat event, and the page
 * must stay clearable with exactly the family the rite teaches.
 */
export function generateFolio(input: GenerateFolioInput): Folio {
  const folioId = `folio-${hashId(input)}`;

  if (input.riteFamily) {
    const rite = practiceRite(input.riteFamily);
    if (rite) return buildRiteFolio(rite, folioId);
  }

  const normalOnly = input.challengeRules.includes("normalOnly");
  const eligible = ANOMALY_SPECS.filter((spec) =>
    isEligible(spec, input.unlocked, input.actTier, normalOnly),
  );

  const dice = diceFor(input.seed);
  const compactAct1 = input.actTier === 1 && input.unlocked["word-stride"] !== true;
  const template = pickTemplate(dice, compactAct1);
  const g: Gen = {
    dice,
    clean: template.lines,
    unlocked: input.unlocked,
    taken: new Set<number>(),
    usedTargets: new Set<string>(),
    usedTokens: new Set<string>(),
    tokenPointer: 0,
    charPointer: 0,
    plans: [],
  };

  const cap = compactAct1 ? 3 : MAX_ANOMALIES;
  const wanted = Math.min(MIN_ANOMALIES + dice.int(cap - MIN_ANOMALIES + 1), cap);
  const exhausted = new Set<string>();

  for (let attempt = 0; attempt < 16 && g.plans.length < wanted; attempt += 1) {
    const weights = eligible.map((spec) => {
      if (exhausted.has(spec.kind)) return 0;
      const spent = g.plans.some((plan) => plan.draft.kind === spec.kind);
      return spec.weight * (spent ? 0.25 : 1);
    });
    const index = dice.weighted(weights);
    if (index < 0) break;
    const spec = eligible[index];
    if (!spec) break;
    const planner = PLANNERS[spec.kind as Exclude<AnomalyKind, "pawprint">];
    const plan = planner(g, spec);
    if (!plan) exhausted.add(spec.kind);
  }

  const stray = ANOMALY_SPEC["stray-rot"];
  for (let i = 0; i < 6 && g.plans.length < MIN_ANOMALIES; i += 1) planStrayRot(g, stray);

  const lines = applyPlans(template, g.plans);
  const anomalies = [...g.plans]
    .sort((left, right) => left.draft.line - right.draft.line || left.draft.colStart - right.draft.colStart)
    .map((plan, index) => draftToAnomaly(plan.draft, folioId, index));

  if (input.includePawprint === true) {
    lines.push(PAWPRINT_LINE);
    anomalies.push(pawprintAnomaly(lines.length - 1, folioId));
  }

  return {
    id: folioId,
    title: template.title,
    actTier: input.actTier,
    isRite: false,
    lines,
    anomalies,
    hasPawprint: input.includePawprint === true,
  };
}

// ---------------------------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------------------------

function appearsIn(lines: readonly string[], text: string): boolean {
  if (text === "") return false;
  return lines.some((line) => line.includes(text));
}

function countLine(lines: readonly string[], text: string): number {
  let count = 0;
  for (const line of lines) if (line === text) count += 1;
  return count;
}

/** `:sort` landed: the block's members sit in the page in lexicographic ascending order. */
function canonSorted(lines: readonly string[], anomaly: FolioAnomaly): boolean {
  const block = anomaly.targetText.split("\n");
  if (block.length < 2) return false;
  const placed: { text: string; at: number }[] = [];
  for (const text of block) {
    const at = lines.indexOf(text);
    if (at < 0) return false;
    placed.push({ text, at });
  }
  placed.sort((left, right) => left.at - right.at);
  for (let i = 1; i < placed.length; i += 1) {
    const previous = placed[i - 1];
    const current = placed[i];
    if (!previous || !current || previous.text > current.text) return false;
  }
  return true;
}

/** The two spliced clauses landed back in order. */
function spliceLanded(lines: readonly string[], anomaly: FolioAnomaly): boolean {
  const expected = anomaly.expectedLine;
  if (expected === null) return false;
  const partner = anomaly.targetText.split("\n")[0];
  if (partner === undefined) return false;
  const wanted = lines.indexOf(expected);
  const other = lines.indexOf(partner);
  return wanted >= 0 && other >= 0 && wanted < other;
}

/** One anomaly against the whole page. Content only: never a line index. */
export function anomalyResolved(lines: readonly string[], anomaly: FolioAnomaly): boolean {
  if (anomaly.kind === "sorted-canon") return canonSorted(lines, anomaly);
  if (anomaly.kind === "register-splice") return spliceLanded(lines, anomaly);
  if (anomaly.kind === "broken-refrain") {
    if (anomaly.expectedLine === null) return false;
    return countLine(lines, anomaly.expectedLine) >= 2;
  }

  if (anomaly.expectedLine === null) return !appearsIn(lines, anomaly.targetText);

  const expected = anomaly.expectedLine;
  if (lines.includes(expected)) return true;
  if (appearsIn(lines, anomaly.targetText)) return false;
  const clean = expected.slice(anomaly.colStart, anomaly.colEnd);
  if (clean === "") return true;
  return lines.some((line) => line.includes(clean));
}

/**
 * Compare the page against every unresolved anomaly. Anything already cleared is skipped, so a
 * folio can be verified on every keystroke without re-paying anything.
 */
export function evaluateFolio(
  currentLines: readonly string[],
  folio: Folio,
  alreadyResolved: Readonly<Record<string, true>>,
): { newlyResolved: FolioAnomaly[]; allResolved: boolean } {
  const cleared = new Set<string>(Object.keys(alreadyResolved));
  const newlyResolved: FolioAnomaly[] = [];

  for (const anomaly of folio.anomalies) {
    if (cleared.has(anomaly.id)) continue;
    if (anomalyResolved(currentLines, anomaly)) {
      cleared.add(anomaly.id);
      newlyResolved.push(anomaly);
    }
  }

  const allResolved = folio.anomalies.every((anomaly) => cleared.has(anomaly.id));
  return { newlyResolved, allResolved };
}

export { practiceRite };
