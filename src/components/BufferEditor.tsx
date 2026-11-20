// The hero buffer: CodeMirror 6 with @replit/codemirror-vim, printed over the BUFFER_GLOW canvas.
//
// Four promises hold this file together:
//   1. The gate runs before the Vim keymap. `gateKeystroke` sits in a `Prec.highest` DOM keydown handler;
//      CodeMirror calls DOM handlers in plugin-precedence order and stops at the first one that answers
//      `true` (`computeHandlers` then `runHandlers` in @codemirror/view), so a locked key never reaches Vim.
//   2. The page is the folio's, until the player touches it. The document is replaced only when `folio.id`
//      changes; everything else reads the page as the player left it.
//   3. A keystroke never re-renders React. The cursor, the mode colour and Flow go to the shader through its
//      ref handle; the Ex line and the Chalkboard subscribe to a tiny module store instead of taking props.
//   4. Nothing is registered twice. The `:ex` handlers are module-level and bound once; the editor view is
//      destroyed on unmount and every listener it added goes with it (React StrictMode mounts twice in dev).
import { history } from "@codemirror/commands";
import { Compartment, EditorState, type Extension, Prec, StateEffect } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  GutterMarker,
  gutter,
  lineNumbers,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import { type ExFn, getCM, Vim, type vimState as VimCore, vim } from "@replit/codemirror-vim";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { fmt } from "watchpot/core";
import { useReducedMotion } from "watchpot/kit";
import { ShaderCanvas, type ShaderHandle, useShaderTokens, useSteppedFrame } from "watchpot/shader";
import { cx } from "watchpot/ui";
import { marks } from "../app/feel";
import { useGameState, useGameStore } from "../app/hooks";
import {
  type KeyThock,
  playActUnlock,
  playBindVolume,
  playCatch,
  playEditFeedback,
  playFolioClear,
  playKeyThock,
  playTildePurr,
} from "../app/sound";
import { EGG_BY_ID } from "../content/easterEggs";
import { FIRST_LESSON_FOLIO } from "../content/guide";
import type { KeyFamilyId } from "../content/vimActs";
import { codex, volumes } from "../game/prestige";
import { VISITOR_KIND } from "../game/visitor";
import { BUFFER_GLOW } from "../shaders/bufferGlow";
import { cleanCutPulse, folioClearPulse, momentState } from "../shaders/pulses";
import { evaluateFolio, type Folio, type FolioAnomaly, generateFolio } from "../vim/folio";
import { gateExCommand, gateKeystroke, type VimMode } from "../vim/gate";
import { classifyVimCommand } from "../vim/grammar";
import s from "./BufferEditor.module.css";

/** The shell's Vim Reference sheet hears this when `:help` runs, and opens the drawer. */
export const HELP_EVENT = "eternal-buffer:help";
/** Ex navigation commands (`:codex`, `:exp`, `:mosaic`, `:vol`, `:trials`, `:log`, `:buf`, `:scribes`) fire this. */
export const NAV_EVENT = "eternal-buffer:nav";
/** Fired when the welcome plate or a tab wants to put focus directly into the Vim buffer. */
export const FOCUS_BUFFER_EVENT = "eternal-buffer:focus";

/** How often the folio carries a pawprint: one page in seventeen, by the serial, so a reload repeats it. */
const PAWPRINT_EVERY = 17;
/** Silence on one anomaly before the idiom is whispered, ms. */
const HINT_IDLE_MS = 4_000;
/** Five Escapes inside two seconds is a panic, and the archive notices. */
const ESC_PANIC_COUNT = 5;
const ESC_PANIC_WINDOW_MS = 2_000;
/** How many rusted arrow presses before the keys are declared dust. */
const RUST_EGG_AT = 10;
/** How many training anomalies the arrows survive: the first three Clean Cuts. */
const ARROW_TRAINING = 3;
/** Anomalies are short; eight marks is a column-rot and then some. */
const MAX_MARKS = 8;

// ---------------------------------------------------------------------------------------------
// The tiny store the Ex line and the Chalkboard read
// ---------------------------------------------------------------------------------------------

/** The buffer's modes, in the vocabulary the gate and the Ex line share. */
export type BufferMode = VimMode;

/** The anomaly the Coach bar is currently guiding the player through. */
export interface ActiveCoachTarget {
  id: string;
  kind: FolioAnomaly["kind"];
  /** 1-based line number in the live document. */
  line: number;
  label: string;
  corrupt: string;
  /** The exact clean text that replaces `corrupt`, or `null` when the whole line should be deleted. */
  clean: string | null;
  optimalHint: string;
  parKeys: number;
}

/** What the buffer publishes for the lines beneath it, once per mode change or cursor move. */
export interface BufferStatus {
  mode: BufferMode;
  /** The Ex line's message: an easter egg's toast, a status, or the cheerful refusal. */
  message: string;
  /** The keys of the command in flight: `d`, `ci`, `5`. */
  pending: string;
  /** The register a macro is recording into, or null. */
  recording: string | null;
  line: number;
  col: number;
  /** The fading whisper under the Chalkboard. */
  whisper: string | null;
  whisperKind: "hint" | "lock" | "rust";
  /** The keycap last pressed, and a counter so a repeated press still reads as a press. */
  lastKey: string | null;
  press: number;
  /** The Practice Rite's ribbon, when the page on screen is one. */
  riteBanner: string | null;
  /** Live interactive coach data for the current folio & active anomaly. */
  folioTitle: string;
  isRite: boolean;
  riteFamily: string | null;
  resolvedCount: number;
  totalAnomalies: number;
  activeTarget: ActiveCoachTarget | null;
}

const STATUS_EMPTY: BufferStatus = {
  mode: "normal",
  message: "",
  pending: "",
  recording: null,
  line: 1,
  col: 1,
  whisper: null,
  whisperKind: "hint",
  lastKey: null,
  press: 0,
  riteBanner: null,
  folioTitle: "",
  isRite: false,
  riteFamily: null,
  resolvedCount: 0,
  totalAnomalies: 0,
  activeTarget: null,
};

let status: BufferStatus = STATUS_EMPTY;
const statusListeners = new Set<() => void>();

/** Merges a patch into the buffer's status and tells everyone who reads it. Nothing renders from here. */
export function publishStatus(patch: Partial<BufferStatus>): void {
  for (const key of Object.keys(patch) as (keyof BufferStatus)[]) {
    if (patch[key] === status[key]) continue;
    status = { ...status, ...patch };
    for (const hear of statusListeners) hear();
    return;
  }
}

function subscribeStatus(hear: () => void): () => void {
  statusListeners.add(hear);
  return () => {
    statusListeners.delete(hear);
  };
}

/** The buffer's live status, for the Ex line and the Chalkboard. */
export function useBufferStatus(): BufferStatus {
  return useSyncExternalStore(
    subscribeStatus,
    () => status,
    () => STATUS_EMPTY,
  );
}

// ---------------------------------------------------------------------------------------------
// Reading the Vim engine's state
// ---------------------------------------------------------------------------------------------

/** Operator names back to the keycap that started them: what the Ex line prints while one waits. */
const OPERATOR_KEYS: Readonly<Record<string, string>> = {
  delete: "d",
  change: "c",
  yank: "y",
  indent: ">",
};

/**
 * The adapter `getCM` hands out. Its `state.vim` is nullable where the package's `CodeMirrorV` insists it is
 * not, so the helpers below take this and treat a missing engine as Normal mode.
 */
type VimAdapter = NonNullable<ReturnType<typeof getCM>>;

/** The Vim mode the buffer is in, in the vocabulary the gate and the Ex line share. */
function modeOf(cm: VimAdapter | null): BufferMode {
  const state = cm?.state.vim;
  if (!state) return "normal";
  if (state.exMode === true) return "command";
  if (state.insertMode) return cm?.state.overwrite === true ? "replace" : "insert";
  if (state.visualMode) {
    if (state.visualBlock) return "visual-block";
    if (state.visualLine) return "visual-line";
    return "visual";
  }
  return "normal";
}

/** Everything typed for the command in flight, rebuilt from the engine so it is right on the first key. */
function pendingOf(state: VimCore | null | undefined): string {
  if (!state) return "";
  const input = state.inputState;
  const operator = input.operator ? (OPERATOR_KEYS[input.operator] ?? "") : "";
  return `${input.prefixRepeat.join("")}${operator}${input.motionRepeat.join("")}${input.keyBuffer.join("")}`;
}

/** The keycap a Vim key names, for the Chalkboard's depression. */
function keycapOf(key: string): string {
  if (key === "<Esc>") return "Esc";
  if (key === "<CR>") return "Enter";
  const control = /^<C-(.)>$/i.exec(key);
  if (control) return `Ctrl-${(control[1] ?? "").toLowerCase()}`;
  return key;
}

/** Which mechanical voice a press is: the operator clack, the insert tap, the Escape tok, or a motion. */
function thockOf(key: string, mode: BufferMode): KeyThock {
  if (key === "<Esc>") return "esc";
  if (mode === "insert" || mode === "replace") return "insert";
  if (key.length === 1 && "dcysSYpPxXDC<>~J".includes(key)) return "op";
  return "motion";
}

/** The mode's theme token, so the halo's colour is the palette's and never a hex in this file. */
type ModeToken =
  | "--ui-mode-normal"
  | "--ui-mode-insert"
  | "--ui-mode-visual"
  | "--ui-mode-command"
  | "--ui-mode-replace";

function modeToken(mode: BufferMode): ModeToken {
  if (mode === "insert") return "--ui-mode-insert";
  if (mode === "visual" || mode === "visual-line" || mode === "visual-block") return "--ui-mode-visual";
  if (mode === "replace") return "--ui-mode-replace";
  if (mode === "command") return "--ui-mode-command";
  return "--ui-mode-normal";
}

// ---------------------------------------------------------------------------------------------
// Anomaly spans: located by content, never by the stored line index
// ---------------------------------------------------------------------------------------------

/** One marked span on the page, in 0-based line and column terms. */
interface MarkedSpan {
  line: number;
  start: number;
  end: number;
  anomaly: FolioAnomaly;
}

/** What the decorations and the gutter read: the page, what is cleared, and whether the gutter is blind. */
interface BufferContext {
  folio: Folio | null;
  resolved: Readonly<Record<string, true>>;
  blind: boolean;
}

function docLines(doc: EditorView["state"]["doc"]): string[] {
  const lines: string[] = [];
  for (let index = 1; index <= doc.lines; index += 1) lines.push(doc.line(index).text);
  return lines;
}

/**
 * Every span an unresolved anomaly still occupies on the page *now*. `anomaly.line` is the line of the clean
 * template and a `dd` above it moves every later line up one, so the search matches the corrupted text: at
 * the recorded column first (which survives every edit that leaves that row alone), then anywhere on the
 * page. Multi-line kinds (`:sort`, a register splice) match whole lines, since their corruption is order.
 */
function spansFor(lines: readonly string[], anomaly: FolioAnomaly): MarkedSpan[] {
  const spans: MarkedSpan[] = [];
  const push = (line: number, start: number, end: number) => {
    if (spans.length >= MAX_MARKS || line < 0 || line >= lines.length) return;
    const text = lines[line] ?? "";
    const from = Math.min(Math.max(start, 0), Math.max(text.length - 1, 0));
    const to = Math.min(Math.max(end, from + 1), text.length);
    if (to <= from) return;
    spans.push({ line, start: from, end: to, anomaly });
  };

  if (anomaly.targetText.includes("\n")) {
    for (const part of anomaly.targetText.split("\n")) {
      if (part === "") continue;
      push(lines.indexOf(part), 0, part.length);
    }
    return spans;
  }

  const width = anomaly.targetText.length;
  if (width === 0) return spans;
  lines.forEach((text, line) => {
    if (text.slice(anomaly.colStart, anomaly.colStart + width) === anomaly.targetText) {
      push(line, anomaly.colStart, anomaly.colStart + width);
    }
  });
  if (spans.length > 0) return spans;

  lines.forEach((text, line) => {
    const at = text.indexOf(anomaly.targetText);
    if (at >= 0) push(line, at, at + width);
  });
  return spans;
}

/** Every span on the page that still needs mending, in page order. */
function markedSpans(view: EditorView, context: BufferContext): MarkedSpan[] {
  const folio = context.folio;
  if (!folio) return [];
  const lines = docLines(view.state.doc);
  const spans: MarkedSpan[] = [];
  for (const anomaly of folio.anomalies) {
    if (context.resolved[anomaly.id] === true) continue;
    spans.push(...spansFor(lines, anomaly));
  }
  return spans;
}

/** The anomaly the caret is standing in or beside, if any. */
function anomalyAtCaret(view: EditorView, context: BufferContext): FolioAnomaly | null {
  const head = view.state.selection.main.head;
  const info = view.state.doc.lineAt(head);
  const col = head - info.from;
  const line = info.number - 1;
  for (const span of markedSpans(view, context)) {
    if (span.line === line && col >= span.start - 1 && col <= span.end) return span.anomaly;
  }
  return null;
}

/** The anomaly a press counts toward: the one under the caret, else the first still unresolved. */
function countTarget(view: EditorView, context: BufferContext): FolioAnomaly | null {
  const here = anomalyAtCaret(view, context);
  if (here) return here;
  const folio = context.folio;
  if (!folio) return null;
  return folio.anomalies.find((anomaly) => context.resolved[anomaly.id] !== true) ?? null;
}

/** Builds the live Coach Bar snapshot for the active anomaly, with its current 1-based line number. */
function coachTargetOf(view: EditorView | null, context: BufferContext): ActiveCoachTarget | null {
  const folio = context.folio;
  if (!folio) return null;
  const anomaly = view
    ? countTarget(view, context)
    : (folio.anomalies.find((entry) => context.resolved[entry.id] !== true) ?? null);
  if (!anomaly) return null;

  let displayLine = anomaly.line + 1;
  if (view) {
    const spans = spansFor(docLines(view.state.doc), anomaly);
    if (spans[0]) displayLine = spans[0].line + 1;
  }

  const clean =
    anomaly.expectedLine === null ? null : anomaly.expectedLine.slice(anomaly.colStart, anomaly.colEnd);
  return {
    id: anomaly.id,
    kind: anomaly.kind,
    line: displayLine,
    label: anomaly.label,
    corrupt: anomaly.targetText,
    clean,
    optimalHint: anomaly.optimalHint,
    parKeys: anomaly.parKeys,
  };
}

/** Counts how many anomalies in the current folio have been resolved so far. */
function resolvedCountOf(folio: Folio | null, resolved: Readonly<Record<string, true>>): number {
  if (!folio) return 0;
  let n = 0;
  for (const a of folio.anomalies) {
    if (resolved[a.id] === true) n += 1;
  }
  return n;
}

/**
 * The page as the record says it stands: a folio that was half-mended when the tab closed opens with those
 * anomalies already mended, so a reload never shows paid-for rot. Only the kinds that are a single span (or
 * a whole line, or several such rows) can be drawn back; a sort, a splice or a refrain needs the player.
 */
function pageOf(folio: Folio, resolved: Readonly<Record<string, true>>): string[] {
  const lines = [...folio.lines];
  for (const anomaly of folio.anomalies) {
    if (resolved[anomaly.id] !== true) continue;
    if (anomaly.expectedLine === null) {
      const at = lines.findIndex((line) => line.includes(anomaly.targetText));
      if (at >= 0) lines.splice(at, 1);
      continue;
    }
    const clean = anomaly.expectedLine;
    const width = anomaly.targetText.length;
    const mended = clean.slice(anomaly.colStart, anomaly.colEnd);
    lines.forEach((line, index) => {
      if (width === 0) return;
      if (line.slice(anomaly.colStart, anomaly.colStart + width) !== anomaly.targetText) return;
      lines[index] = line.slice(0, anomaly.colStart) + mended + line.slice(anomaly.colStart + width);
    });
  }
  return lines;
}

// ---------------------------------------------------------------------------------------------
// Decorations and the margin tag
// ---------------------------------------------------------------------------------------------

/** Tells the decoration plugin the page or the cleared set changed. It carries nothing: it is a nudge. */
const annotate = StateEffect.define<null>();

/** A `[ROT · par 3]` tag in the margin, one per line that holds part of an unresolved anomaly. */
class ParTag extends GutterMarker {
  readonly text: string;
  constructor(text: string) {
    super();
    this.text = text;
  }
  eq(other: GutterMarker): boolean {
    return other instanceof ParTag && other.text === this.text;
  }
  toDOM(): Node {
    const el = document.createElement("span");
    el.className = "eb-par-tag";
    el.textContent = this.text;
    return el;
  }
}

function buildMarks(view: EditorView, context: BufferContext): DecorationSet {
  const head = view.state.doc.lineAt(view.state.selection.main.head);
  const caretLine = head.number - 1;
  const caretCol = view.state.selection.main.head - head.from;
  const ranges: { from: number; to: number; deco: Decoration }[] = [];
  for (const span of markedSpans(view, context)) {
    const info = view.state.doc.line(span.line + 1);
    const target = span.line === caretLine && caretCol >= span.start - 1 && caretCol <= span.end;
    ranges.push({
      from: info.from + span.start,
      to: info.from + span.end,
      deco: Decoration.mark({ class: target ? "eb-span-target" : "eb-span-rot" }),
    });
  }
  ranges.sort((left, right) => left.from - right.from || left.to - right.to);
  return Decoration.set(
    ranges.map((range) => range.deco.range(range.from, range.to)),
    true,
  );
}

/**
 * The anomaly plate: a rot mark on every unresolved span, the amber target on the one under the caret, and
 * the margin's par tag. Rebuilt on every document or cursor change and on an `annotate` nudge.
 */
function anomalyMarks(context: BufferContext): Extension {
  const plugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = buildMarks(view, context);
      }
      update(update: ViewUpdate): void {
        const nudged = update.transactions.some((tr) => tr.effects.some((fx) => fx.is(annotate)));
        if (update.docChanged || update.selectionSet || nudged) {
          this.decorations = buildMarks(update.view, context);
        }
      }
    },
    { decorations: (instance) => instance.decorations },
  );

  const tag = gutter({
    class: "eb-par-gutter",
    lineMarker(view, line) {
      if (context.blind) return null;
      const lineIndex = view.state.doc.lineAt(line.from).number - 1;
      for (const span of markedSpans(view, context)) {
        if (span.line !== lineIndex) continue;
        return new ParTag(`[${span.anomaly.label}·${span.anomaly.parKeys}]`);
      }
      return null;
    },
    initialSpacer: () => new ParTag("[PAW·14]"),
  });

  return [plugin, tag];
}

// ---------------------------------------------------------------------------------------------
// The editor's look and the line numbers
// ---------------------------------------------------------------------------------------------

/**
 * The buffer's face, on the shader's soot rather than over it. Every colour is a theme token, so
 * `:colorscheme` recolours the page without this file knowing a hex.
 */
const editorTheme = EditorView.theme(
  {
    "&": { backgroundColor: "transparent", color: "var(--ui-ink)", fontSize: "15px" },
    "&.cm-focused": { outline: "none" },
    ".cm-scroller": {
      fontFamily: "var(--ui-font-num)",
      lineHeight: "1.75",
      overflowX: "auto",
    },
    ".cm-content": { padding: "12px 0 20px", caretColor: "var(--ui-mode-insert)" },
    ".cm-line": { padding: "0 12px 0 8px" },
    ".cm-gutters": {
      border: "none",
      backgroundColor: "transparent",
      color: "var(--ui-ink-muted)",
      fontFamily: "var(--ui-font-num)",
      fontSize: "11px",
    },
    ".cm-lineNumbers .cm-gutterElement": { minWidth: "20px", padding: "0 6px 0 8px" },
    ".eb-par-gutter": { color: "var(--ui-rot-ink)", fontSize: "10px", letterSpacing: "0.02em" },
    ".eb-par-gutter .cm-gutterElement": { padding: "0 4px 0 0", whiteSpace: "nowrap" },
    ".eb-par-tag": { opacity: "0.82" },
    ".eb-span-rot": { backgroundColor: "var(--ui-rot-bg)", color: "var(--ui-rot-ink)" },
    ".eb-span-target": {
      backgroundColor: "var(--ui-target-bg)",
      color: "var(--ui-target-ink)",
      boxShadow: "inset 0 -1px 0 var(--ui-target-ink)",
    },
    ".cm-vim-panel": {
      borderTop: "1px solid var(--ui-line)",
      padding: "4px 10px",
      fontFamily: "var(--ui-font-num)",
      fontSize: "12px",
    },
    ".cm-vim-panel input": {
      border: "none",
      backgroundColor: "transparent",
      color: "var(--ui-mode-command)",
      outline: "none",
    },
  },
  { dark: true },
);

/** The line numbers the settings and the trial ask for: absolute, relative, or none at all. */
function gutterExtension(show: boolean, relative: () => boolean): Extension {
  if (!show) return [];
  return lineNumbers({
    formatNumber: (lineNo, state) => {
      if (!relative()) return String(lineNo);
      const cursor = state.doc.lineAt(state.selection.main.head).number;
      return lineNo === cursor ? String(lineNo) : String(Math.abs(lineNo - cursor));
    },
  });
}

// ---------------------------------------------------------------------------------------------
// The Ex console's voice
// ---------------------------------------------------------------------------------------------

/** The cheerful refusals. */
const REFUSALS = {
  write: "Nothing to bind yet — the page is worth no seal. Mend a little more.",
  rebind: "A Rebind wants 250 Seals ever bound and a codex still owing. Not tonight.",
  treat: "Tilde has no treats left to accept. (`:help` will not conjure one.)",
} as const;

/** The touch keypad's caps: the day-one motions and the two ways into a mode. */
const TOUCH_KEYS = [
  { id: "h", label: "h", vim: "h" },
  { id: "j", label: "j", vim: "j" },
  { id: "k", label: "k", vim: "k" },
  { id: "l", label: "l", vim: "l" },
  { id: "w", label: "w", vim: "w" },
  { id: "b", label: "b", vim: "b" },
  { id: "0", label: "0", vim: "0" },
  { id: "dollar", label: "$", vim: "$" },
  { id: "x", label: "x", vim: "x" },
  { id: "p", label: "p", vim: "p" },
  { id: "i", label: "i", vim: "i" },
  { id: "esc", label: "Esc", vim: "<Esc>" },
  { id: "colon", label: ":", vim: ":" },
  { id: "u", label: "u", vim: "u" },
] as const;

// ---------------------------------------------------------------------------------------------
// The component
// ---------------------------------------------------------------------------------------------

export interface BufferEditorProps {
  /** A class of the screen's, for the plate around the hero buffer. */
  className?: string;
}

/**
 * The hero buffer. It owns the CodeMirror view, the gate, the folio's page and the Ex console, and it
 * publishes its mode and its last message so `<ExLine>` and `<Chalkboard>` can be mounted beside it.
 */
export function BufferEditor({ className }: BufferEditorProps) {
  const store = useGameStore();
  const frameRef = useRef<HTMLElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const handleRef = useRef<ShaderHandle | null>(null);

  const seed = useGameState((state) => state.vim.folioSeed);
  const actTier = useGameState((state) => state.vim.actTier);
  const unlocked = useGameState((state) => state.vim.unlockedFamilies);
  const riteFamily = useGameState((state) => state.vim.pendingRiteFamily);
  const rules = useGameState((state) => state.trials.rules.join(","));
  const serial = useGameState((state) => state.vim.folioSerial);
  const totalFoliosCleared = useGameState((state) => state.vim.totalFoliosCleared);
  const resolved = useGameState((state) => state.vim.resolvedAnomalyIds);
  const showLineNumbers = useGameState((state) => state.settings.showLineNumbers);
  const relativeNumbers = useGameState((state) => state.settings.relativeNumbers);
  const jkEscape = useGameState((state) => state.settings.jkEscape);
  const veteranMode = useGameState((state) => state.settings.veteranMode);
  const catFamiliar = useGameState((state) => state.vim.vimrcRules["cat-familiar"] === true);
  const split = useGameState((state) => state.vim.activeSplit);
  const touchKeypad = useGameState((state) => state.settings.touchKeypad);
  const reduced = useReducedMotion();

  const challengeRules = useMemo(() => (rules === "" ? [] : rules.split(",")), [rules]);
  const blind = challengeRules.includes("blindGutter");
  const pawEvery = catFamiliar ? Math.max(2, Math.floor(PAWPRINT_EVERY / 2)) : PAWPRINT_EVERY;
  const includePawprint =
    serial > 0 && serial % pawEvery === 0 && (unlocked["op-delete"] === true || veteranMode);

  const isFirstLesson =
    serial === 0 &&
    totalFoliosCleared === 0 &&
    riteFamily === null &&
    !veteranMode &&
    challengeRules.length === 0;

  const folio = useMemo(
    () =>
      isFirstLesson
        ? FIRST_LESSON_FOLIO
        : generateFolio({
            seed,
            unlocked,
            actTier,
            riteFamily: riteFamily ?? undefined,
            challengeRules,
            includePawprint,
          }),
    [isFirstLesson, seed, unlocked, actTier, riteFamily, challengeRules, includePawprint],
  );

  // The plugin and the gutter read the live context, so a new page or a cleared anomaly is visible without
  // rebuilding the view. Written here rather than in an effect because the view is constructed in its own
  // effect, which runs before any effect could refresh this.
  const context = useRef<BufferContext>({ folio: null, resolved: {}, blind: false });
  context.current.folio = folio;
  context.current.resolved = resolved;
  context.current.blind = blind;

  /** The folio whose page the document holds. Only a change of folio rewrites the document. */
  const appliedFolio = useRef<string | null>(null);
  /** Keystrokes counted against each unresolved anomaly, by id. */
  const keysUsed = useRef(new Map<string, number>());
  /** Set while this file replaces the page, so the replace is not read as an edit. */
  const applying = useRef(false);
  /** Set between a folio clear and the next page landing, so the cleared page cannot pay twice. */
  const clearing = useRef(false);
  const gutterCompartment = useRef(new Compartment()).current;
  const cursorTarget = useRef({ x: 0.5, y: 0.5 });
  const cursorPlaced = useRef({ x: 0.5, y: 0.5 });
  const modeRef = useRef<BufferMode>("normal");
  const relativeRef = useRef(relativeNumbers);
  relativeRef.current = relativeNumbers;
  /** What the view is born with: the gutter's state at mount, kept in sync by its own effect after that. */
  const gutterBorn = useRef(showLineNumbers && !blind);
  gutterBorn.current = showLineNumbers && !blind;

  const tokens = useShaderTokens(frameRef, [
    "--ui-ground",
    "--ui-ink",
    "--ui-accent",
    "--ui-mode-normal",
    "--ui-mode-insert",
    "--ui-mode-visual",
    "--ui-mode-command",
    "--ui-mode-replace",
  ]);

  // The cursor halo: the eased caret, the mode's colour, Clean Cut shockwave pulse and Flow, a stepped frame at a time.
  // The frame callback is read fresh on every step, so the mode colour follows a mode change with no render.
  useSteppedFrame(
    handleRef,
    (_seconds, dt) => {
      const ease = 1 - Math.exp(-Math.min(dt, 0.25) * 14);
      const target = cursorTarget.current;
      const placed = cursorPlaced.current;
      placed.x += (target.x - placed.x) * ease;
      placed.y += (target.y - placed.y) * ease;
      const live = store.getState();
      const uniforms: Record<string, number | readonly number[] | string> = {
        u_cursor: [placed.x, placed.y],
        u_flow: Math.min(1, live.vim.flow / Math.max(1, live.vim.flowCap)),
        u_pulse: Math.max(cleanCutPulse.value(), folioClearPulse.value()),
      };
      if (tokens) uniforms.u_modeColor = tokens[modeToken(modeRef.current)];
      return uniforms;
    },
    { fps: 24, running: !reduced, at: BUFFER_GLOW.reducedTime ?? 8 },
  );

  // -------------------------------------------------------------------------------------------
  // The view, its listeners and the Ex console: built once, torn down cleanly
  // -------------------------------------------------------------------------------------------
  useEffect(() => {
    const host = hostRef.current;
    const frame = frameRef.current;
    if (!host) return;

    /** The Ex message of the command in flight, for the grammar classifier. */
    let exBody: string | null = null;
    /** The keys typed since the last finished command, for the same classifier. */
    let typed: string[] = [];
    /** Escape presses in Normal mode, with their times. */
    let escapes: number[] = [];
    /** The last Vim keys, for `ggVG` and `zz`. */
    let recent = "";
    /** Whether the last key was `Z`, for `ZZ` and `ZQ`. */
    let pendingZ = false;
    /** The register a macro is recording into: `""` armed, a letter recording, `null` idle. */
    let recording: string | null = null;
    let hintTimer: number | undefined;

    const say = (message: string) => publishStatus({ message });

    /** Records an easter egg, awards its secret Marginalia tile if it has one, and answers with the Ex toast. */
    const egg = (id: string): string => {
      const live = store.getState();
      live.vim.triggerEasterEgg(id);
      const tileId = EGG_BY_ID[id]?.achievementId;
      if (tileId) live.achievements.award(tileId);
      return EGG_BY_ID[id]?.toast ?? "";
    };

    /** Consecutive `u` presses that left the document untouched, for the `oldest-change` egg. */
    let emptyUndos = 0;
    /** Whether the last key was `g`, for `g m` (catch live Margin Moth). */
    let pendingG = false;

    const resetHint = () => {
      if (hintTimer !== undefined) window.clearTimeout(hintTimer);
      hintTimer = undefined;
    };

    /** Arms the 4 s whisper for whatever the caret is standing on. Silent once the idiom is mastered. */
    const armHint = (view: EditorView) => {
      resetHint();
      if (context.current.blind) return;
      hintTimer = window.setTimeout(() => {
        const live = store.getState();
        const anomaly = anomalyAtCaret(view, context.current) ?? countTarget(view, context.current);
        if (!anomaly) return;
        if ((live.vim.hintMastery[anomaly.hintId] ?? 0) >= 5) return;
        publishStatus({ whisper: anomaly.optimalHint, whisperKind: "hint" });
      }, HINT_IDLE_MS);
    };

    /** Where the caret sits in the plate, 0..1 with y up from the foot: the halo's centre. Read in a measure. */
    const placeCursor = (view: EditorView) => {
      view.requestMeasure<{ x: number; y: number } | null>({
        read: (measured) => {
          const plate = frameRef.current;
          const coords = measured.coordsAtPos(measured.state.selection.main.head);
          if (!plate || !coords) return null;
          const box = plate.getBoundingClientRect();
          if (box.width === 0 || box.height === 0) return null;
          const clamp = (value: number) => Math.min(1, Math.max(0, value));
          const cx = (coords.left + coords.right) / 2;
          const cy = (coords.top + coords.bottom) / 2;
          return {
            x: clamp((cx - box.left) / box.width),
            y: clamp(1 - (cy - box.top) / box.height),
          };
        },
        write: (placed) => {
          if (placed) cursorTarget.current = placed;
        },
      });
    };

    /** Pays one newly cleared anomaly: its grade, its light, and its mark where it stood. */
    const payAnomaly = (view: EditorView, anomaly: FolioAnomaly) => {
      const keys = keysUsed.current.get(anomaly.id) ?? anomaly.parKeys;
      keysUsed.current.delete(anomaly.id);
      const isPawprint = anomaly.kind === "pawprint";
      const paid = store
        .getState()
        .vim.resolveAnomaly(anomaly.id, keys, anomaly.parKeys, anomaly.hintId, anomaly.weight, isPawprint);
      if (isPawprint) store.getState().achievements.award("off-the-keyboard");
      playEditFeedback(paid.grade, store.getState().vim.flow);
      cleanCutPulse.bump();
      // The corruption is gone from the page by now, so the mark lands on the line it was on. Geometry is read
      // in a measure, as CodeMirror asks: a listener may not lay the page out.
      view.requestMeasure<{ x: number; y: number } | null>({
        read: (measured) => {
          const info = measured.state.doc.line(Math.min(anomaly.line + 1, measured.state.doc.lines));
          const coords = measured.coordsAtPos(info.from + Math.min(anomaly.colStart, info.length));
          return coords ? { x: (coords.left + coords.right) / 2, y: (coords.top + coords.bottom) / 2 } : null;
        },
        write: (point) => {
          if (!point) return;
          marks.at(point.x, point.y, {
            kind: paid.grade,
            text: paid.grade === "clean" ? "CLEAN CUT" : paid.grade === "tidy" ? "TIDY EDIT" : "MENDED",
          });
        },
      });
      say(
        `${anomaly.label} ${paid.grade === "clean" ? "cut clean" : "mended"} — +${fmt(paid.paid).text} Glyphs.`,
      );
    };

    /** After every document change: verify the page, pay what landed, roll the page when it is clear. */
    const verify = (view: EditorView) => {
      if (applying.current || clearing.current) return;
      const page = context.current.folio;
      if (!page) return;
      const live = store.getState();
      const { newlyResolved, allResolved } = evaluateFolio(
        docLines(view.state.doc),
        page,
        live.vim.resolvedAnomalyIds,
      );
      for (const anomaly of newlyResolved) payAnomaly(view, anomaly);
      if (newlyResolved.length === 0 || !allResolved) return;

      clearing.current = true;
      const cleared = store
        .getState()
        .vim.completeFolio(page.isRite, page.riteFamily as KeyFamilyId | undefined);
      // A rite is a family confirmed, so it gets the brass; an ordinary page gets the paper-turn arpeggio.
      if (page.isRite) playActUnlock();
      playFolioClear();
      folioClearPulse.bump();
      publishStatus({
        message: page.isRite
          ? `${page.title} — the rite is kept, and the family is yours. +${fmt(cleared.bonus).text} Glyphs.`
          : `Folio cleared. +${fmt(cleared.bonus).text} Glyphs, and the next page is turning.`,
        whisper: null,
        pending: "",
      });
    };

    const grammar = (raw: string, body?: string) => {
      const pair = classifyVimCommand(raw, body);
      if (!pair) return;
      if (store.getState().vim.recordGrammar(pair.pairId)) say(`Grammar Codex · ${pair.label}.`);
      if (pair.pairId === "dot") store.getState().vim.noteEcho("dot");
      if (pair.pairId === "q+@" || pair.pairId === "@+@") store.getState().vim.noteEcho("macro");
    };

    /** `?` in Normal mode: the whisper, master or not. False when there is nothing to whisper. */
    const showHint = (view: EditorView): boolean => {
      const live = store.getState();
      if (context.current.blind) return false;
      const here = anomalyAtCaret(view, context.current);
      const anomaly = here ?? countTarget(view, context.current);
      if (!anomaly) return false;
      const mastered = (live.vim.hintMastery[anomaly.hintId] ?? 0) >= 5;
      if (mastered && here === null) return false;
      resetHint();
      publishStatus({
        whisper: mastered ? `${anomaly.optimalHint} — already yours, this one.` : anomaly.optimalHint,
        whisperKind: "hint",
      });
      return true;
    };

    /** The gate. Runs before Vim's keymap: `true` here means the key never reaches the engine. */
    const onKeyDown = (event: KeyboardEvent, view: EditorView): boolean => {
      const cm = getCM(view);
      const state = cm?.state.vim ?? null;
      const mode = modeOf(cm);
      const live = store.getState();

      // Escape, mashed in Normal mode.
      if (event.key === "Escape" && mode === "normal") {
        const now = performance.now();
        escapes = [...escapes.filter((at) => now - at < ESC_PANIC_WINDOW_MS), now];
        if (escapes.length >= ESC_PANIC_COUNT) {
          escapes = [];
          store.getState().vim.noteEscPanic();
          say(egg("esc-panic"));
        }
      }

      // `g m`: catch a live Margin Moth from Normal mode without touching the mouse (Spec §5C).
      if (mode === "normal" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        if (pendingG && event.key === "m") {
          pendingG = false;
          const moth = live.visitors.kinds[VISITOR_KIND]?.live ?? null;
          if (moth && moth.diesAt > live.gameNow()) {
            event.preventDefault();
            if (store.getState().visitors.catch(VISITOR_KIND) !== null) {
              playCatch();
              say("Margin Moth caught by hand (`g m`). The lamp flares brighter.");
            }
            return true;
          }
        }
        pendingG = event.key === "g";
      } else {
        pendingG = false;
      }

      // `ZZ` and `ZQ`: the engine's keymap does not bind them, so the archive reads them here.
      if (mode === "normal" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const second = pendingZ;
        pendingZ = event.key === "Z";
        if (second && event.key === "Q") {
          event.preventDefault();
          say(egg("zq-refused"));
          return true;
        }
        if (second && event.key === "Z") {
          event.preventDefault();
          writeVolume(true);
          return true;
        }
      } else {
        pendingZ = false;
      }

      // `?` in Normal mode is the archive's whisper, not a backward search.
      if (event.key === "?" && mode === "normal" && !event.ctrlKey && showHint(view)) {
        event.preventDefault();
        return true;
      }

      const decision = gateKeystroke({
        key: event.key,
        ctrlKey: event.ctrlKey || event.metaKey,
        mode,
        pendingKeys: pendingOf(state),
        unlocked: live.vim.unlockedFamilies,
        challengeRules: live.trials.rules,
        veteranMode: live.settings.veteranMode,
        arrowTrainingLeft: Math.max(0, ARROW_TRAINING - live.vim.totalCleanCuts),
        arrowShame: live.settings.arrowShame,
      });

      if (decision.reason === "arrow-rusted") {
        playKeyThock("rust");
        store.getState().vim.noteArrowRust();
        const message = decision.message ?? "Use h j k l — the arrows have rusted.";
        publishStatus({
          whisper: message,
          whisperKind: "rust",
          lastKey: keycapOf(event.key),
          press: status.press + 1,
        });
        if (store.getState().vim.arrowShameCount >= RUST_EGG_AT) say(egg("rusty-arrows"));
        if (!decision.allowed) {
          event.preventDefault();
          return true;
        }
        return false;
      }

      if (decision.allowed) return false;

      event.preventDefault();
      playKeyThock("locked");
      publishStatus({
        message: decision.message ?? "",
        whisper: decision.message ?? null,
        whisperKind: "lock",
        lastKey: keycapOf(event.key),
        press: status.press + 1,
      });
      return true;
    };

    // --- the Ex console ---------------------------------------------------------------------

    const writeVolume = (fromZz: boolean): boolean => {
      const live = store.getState();
      const gain = volumes.select.gain(live);
      if (live.volumes.bind()) {
        playBindVolume();
        say(`${fromZz ? "ZZ — the old shorthand. " : ""}Volume bound: +${fmt(gain).text} Seals.`);
        return true;
      }
      say(fromZz ? "Tilde is already napping; no need to ZZ yet." : REFUSALS.write);
      return false;
    };

    const rebindCodex = (enthusiastic: boolean): boolean => {
      const live = store.getState();
      const gain = codex.select.gain(live);
      const toast = enthusiastic ? egg("enthusiastic-rebind") : "";
      if (live.codex.rebind()) {
        momentState.trigger();
        say(`${toast} Codex rebound: +${fmt(gain).text} Codices.`);
        return true;
      }
      say(enthusiastic ? `${toast} ${REFUSALS.rebind}` : REFUSALS.rebind);
      return false;
    };

    const setOption = (args: string[]): void => {
      const live = store.getState();
      const name = (args[0] ?? "").toLowerCase();
      if (name === "number" || name === "nu") {
        live.settings.change({ showLineNumbers: true });
        say(egg("gutter-numbers"));
      } else if (name === "nonumber" || name === "nonu") {
        live.settings.change({ showLineNumbers: false });
        say(egg("gutter-hidden"));
      } else if (name === "relativenumber" || name === "rnu") {
        live.settings.change({ relativeNumbers: true, showLineNumbers: true });
        say("Relative numbers. Every line counts its distance from the cursor.");
      } else if (name === "norelativenumber" || name === "nornu") {
        live.settings.change({ relativeNumbers: false });
        say("Absolute numbers again. The margins are honest.");
      } else {
        say(`E518: Unknown option: ${name || "(none)"}`);
      }
    };

    const cycleScheme = (arg: string): void => {
      const live = store.getState();
      const order = ["amber", "jade", "paper", "midnight"] as const;
      type Tint = (typeof order)[number];
      const asked = arg.trim().toLowerCase();
      let next: Tint;
      if ((order as readonly string[]).includes(asked)) {
        next = asked as Tint;
      } else {
        const at = order.indexOf(live.settings.tintPreset);
        next = order[(at + 1) % order.length] ?? "amber";
      }
      live.settings.change({ tintPreset: next });
      say(`${egg("phosphor-cycle")} (${next})`);
    };

    /** Every `:ex` command the archive answers itself. The engine keeps `:s`, `:g`, `:v`, `:norm`, `:sort`. */
    const runEx = (name: string, argString: string, args: string[]): void => {
      exBody = `${name}${argString === "" ? "" : ` ${argString}`}`;
      const live = store.getState();
      const gated = gateExCommand(
        `${name} ${argString}`.trim(),
        live.vim.unlockedFamilies,
        live.settings.veteranMode,
      );
      if (!gated.allowed) {
        playKeyThock("locked");
        publishStatus({ message: gated.message ?? "", whisper: gated.message ?? null, whisperKind: "lock" });
        return;
      }
      const body = argString.trim().toLowerCase();
      switch (name) {
        case "write":
          writeVolume(false);
          return;
        case "wq": {
          rebindCodex(argString.includes("!"));
          return;
        }
        case "q":
          say(argString.includes("!") ? egg("exit-deleted") : egg("no-write-since"));
          return;
        case "qa":
          say(egg("quit-all-refused"));
          return;
        case "x":
          writeVolume(false);
          return;
        case "help": {
          const topic = (args[0] ?? "").trim();
          say(topic === "42" ? egg("meaning-of-42") : egg("codex-drawer"));
          window.dispatchEvent(
            new CustomEvent(HELP_EVENT, { detail: { topic: topic === "" ? null : topic } }),
          );
          return;
        }
        case "smile":
          say(`${egg("bram-smile")}  ☺`);
          store.getState().vim.petTilde();
          playTildePurr();
          return;
        case "ed":
          say(egg("standard-editor"));
          return;
        case "pet":
        case "pspsps": {
          const petted = store.getState().vim.petTilde();
          say(egg("pet-from-ex"));
          if (petted.ok) playTildePurr();
          return;
        }
        case "treat": {
          const fed = store.getState().vim.feedTilde();
          say(fed ? egg("treat-from-ex") : REFUSALS.treat);
          if (fed) playTildePurr();
          return;
        }
        case "emacs":
          say(egg("wrong-church"));
          return;
        case "nano":
          say(egg("nano-exit"));
          return;
        case "vscode":
          say(egg("electron-vellum"));
          return;
        case "colorscheme":
          cycleScheme(body);
          return;
        case "set":
          setOption(args);
          return;
        case "vsplit": {
          const on = !live.vim.activeSplit;
          store.getState().vim.setDualSplit(on);
          say(
            on
              ? "Two margins. The folio is split; Ctrl-w w walks between them."
              : "The twin margin folds away. One page again.",
          );
          return;
        }
        case "buffer":
        case "codex":
        case "expeditions":
        case "mosaic":
        case "volumes":
        case "trials":
        case "marginalia":
        case "log":
        case "scribes": {
          const target =
            name === "buffer"
              ? "make"
              : name === "codex"
                ? "tree"
                : name === "volumes"
                  ? "prestige"
                  : name === "trials"
                    ? "challenges"
                    : name === "marginalia" || name === "log"
                      ? "achievements"
                      : name;
          window.dispatchEvent(new CustomEvent(NAV_EVENT, { detail: { target } }));
          return;
        }
        case "!":
          if (/^rm\b/i.test(body)) {
            say(egg("rm-rf-denied"));
            return;
          }
          say(`sh: ${argString.trim()}: the archive does not run commands.`);
          return;
        default:
          say(`Not an editor command: :${name}`);
      }
    };

    bindExOnce(runEx);

    // --- the view --------------------------------------------------------------------------

    const view = new EditorView({
      state: EditorState.create({
        doc: (context.current.folio ? pageOf(context.current.folio, context.current.resolved) : ["~"]).join(
          "\n",
        ),
        extensions: [
          history(),
          // Highest precedence: CodeMirror runs DOM handlers in plugin order and stops at the first
          // `true`, so this answers before @replit/codemirror-vim's keydown ever runs.
          Prec.highest(EditorView.domEventHandlers({ keydown: onKeyDown })),
          vim({ status: false }),
          EditorView.lineWrapping,
          gutterCompartment.of(gutterExtension(gutterBorn.current, () => relativeRef.current)),
          anomalyMarks(context.current),
          editorTheme,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              emptyUndos = 0;
              verify(update.view);
            }
            if (!update.docChanged && !update.selectionSet && !update.geometryChanged) return;
            placeCursor(update.view);
            if (!update.docChanged && !update.selectionSet) return;
            armHint(update.view);
            const info = update.state.doc.lineAt(update.state.selection.main.head);
            publishStatus({
              line: info.number,
              col: update.state.selection.main.head - info.from + 1,
              activeTarget: coachTargetOf(update.view, context.current),
              resolvedCount: resolvedCountOf(context.current.folio, store.getState().vim.resolvedAnomalyIds),
            });
          }),
        ],
      }),
      parent: host,
    });
    viewRef.current = view;
    view.contentDOM.setAttribute("aria-label", "The folio. Edit it with Vim keys.");
    placeCursor(view);
    // Keep the cursor halo synced when fonts finish loading or the plate resizes (e.g. `:vsplit`).
    const ro =
      typeof ResizeObserver !== "undefined" && frame ? new ResizeObserver(() => placeCursor(view)) : null;
    if (ro && frame) ro.observe(frame);
    document.fonts?.ready.then(() => {
      if (viewRef.current === view) placeCursor(view);
    });
    if (typeof window !== "undefined" && window.matchMedia?.("(min-width: 900px)").matches) {
      view.focus();
    }
    const onFocusRequest = () => view.focus();
    window.addEventListener(FOCUS_BUFFER_EVENT, onFocusRequest);
    publishStatus({
      mode: "normal",
      riteBanner: context.current.folio?.riteBanner ?? null,
      message: context.current.folio?.riteBanner ?? "",
      pending: "",
      folioTitle: context.current.folio?.title ?? "",
      isRite: context.current.folio?.isRite ?? false,
      riteFamily: context.current.folio?.riteFamily ?? null,
      resolvedCount: resolvedCountOf(context.current.folio, context.current.resolved),
      totalAnomalies: context.current.folio?.anomalies.length ?? 0,
      activeTarget: coachTargetOf(view, context.current),
    });

    const cm = getCM(view);
    const onModeChange = () => {
      const mode = modeOf(cm);
      modeRef.current = mode;
      if (frameRef.current) frameRef.current.dataset.mode = mode;
      publishStatus({ mode });
    };
    const onKeyPress = (key: string) => {
      const mode = modeOf(cm);
      playKeyThock(thockOf(key, mode));
      recent = `${recent}${key}`.slice(-6);
      typed.push(key);
      // A macro: `q` arms the recorder, the next key names its register, and a later `q` stops it.
      if (key === "q" && recording === null) recording = "";
      else if (recording === "" && key.length === 1 && key !== "q") recording = key;
      else if (recording !== null && recording !== "" && key === "q") recording = null;
      // Two gestures the archive watches for, never while a line is being typed.
      const typing = mode === "insert" || mode === "replace";
      if (!typing && recent.endsWith("ggVG")) say(egg("whole-buffer"));
      if (!typing && recent.endsWith("zz")) say(egg("zz-zen"));
      // `u` pressed 5× with nothing left to undo: "Already at oldest change (circa 1976, Bill Joy's terminal)."
      if (!typing && key === "u") {
        emptyUndos += 1;
        if (emptyUndos >= 5) {
          emptyUndos = 0;
          say(egg("oldest-change"));
        }
      } else if (!typing) {
        emptyUndos = 0;
      }
      const target = countTarget(view, context.current);
      if (target) keysUsed.current.set(target.id, (keysUsed.current.get(target.id) ?? 0) + 1);
      publishStatus({
        lastKey: keycapOf(key),
        press: status.press + 1,
        whisper: null,
        pending: pendingOf(cm?.state.vim),
        recording,
      });
    };
    const onCommandDone = () => {
      const raw = typed.join("");
      typed = [];
      grammar(raw, exBody ?? undefined);
      exBody = null;
      publishStatus({ pending: "", recording });
    };

    cm?.on("vim-mode-change", onModeChange);
    cm?.on("vim-keypress", onKeyPress);
    cm?.on("vim-command-done", onCommandDone);

    // `jk` is a mapping, not a mode: applied and unmapped with the setting.
    applyJkMapping(store.getState().settings.jkEscape);

    // The `:` prompt lives outside the content DOM, so its gate is a capture listener on the plate.
    const onPromptKey = (event: KeyboardEvent) => {
      if (event.key !== "Enter") return;
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || !target.closest(".cm-vim-panel")) return;
      const input = target.value.trim();
      const live = store.getState();
      const closePrompt = () => {
        target.value = "";
        target.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", keyCode: 27, bubbles: true }));
      };
      // `:42`: the engine reads a bare number as a line range, so the archive takes the joke itself.
      if (input === "42") {
        event.preventDefault();
        event.stopPropagation();
        say(egg("cat-whisperer"));
        closePrompt();
        return;
      }
      const stripped = input.replace(/^[%$.\d,'*+-]+/, "");
      const first = gateExCommand(input, live.vim.unlockedFamilies, live.settings.veteranMode);
      const second =
        stripped === input
          ? first
          : gateExCommand(stripped, live.vim.unlockedFamilies, live.settings.veteranMode);
      const locked = !first.allowed ? first : !second.allowed ? second : null;
      if (!locked) {
        grammar("", input);
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      playKeyThock("locked");
      publishStatus({
        message: locked.message ?? "",
        whisper: locked.message ?? null,
        whisperKind: "lock",
      });
      // Close the prompt without submitting it: a real Escape keydown on the prompt itself.
      closePrompt();
    };
    frame?.addEventListener("keydown", onPromptKey, true);

    // Clicking away from the buffer releases the keyboard, so buttons and tabs keep their own navigation.
    const onPointerDown = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (frameRef.current?.contains(target)) return;
      if (view.hasFocus) view.contentDOM.blur();
    };
    document.addEventListener("pointerdown", onPointerDown, true);

    return () => {
      resetHint();
      ro?.disconnect();
      window.removeEventListener(FOCUS_BUFFER_EVENT, onFocusRequest);
      frame?.removeEventListener("keydown", onPromptKey, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
      cm?.off("vim-mode-change", onModeChange);
      cm?.off("vim-keypress", onKeyPress);
      cm?.off("vim-command-done", onCommandDone);
      view.destroy();
      viewRef.current = null;
    };
    // The view is built once: everything it reads at key time comes from the store or from a ref.
  }, [store, gutterCompartment]);

  // The page. Replaced only when the folio itself changes; anything else is the player's own work.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (appliedFolio.current === folio.id) return;
    appliedFolio.current = folio.id;
    applying.current = true;
    clearing.current = false;
    keysUsed.current.clear();
    // Always return to Normal mode when a fresh folio lands so finishing a page in Insert mode
    // never leaves the next folio stuck in Insert mode.
    const cm = getCM(view);
    if (cm?.state.vim?.insertMode) {
      Vim.exitInsertMode(cm as Parameters<typeof Vim.exitInsertMode>[0]);
    }
    modeRef.current = "normal";
    if (frameRef.current) frameRef.current.dataset.mode = "normal";
    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: pageOf(folio, context.current.resolved).join("\n"),
      },
      selection: { anchor: 0 },
      effects: annotate.of(null),
    });
    applying.current = false;
    publishStatus({
      mode: "normal",
      riteBanner: folio.riteBanner ?? null,
      message: folio.riteBanner ?? "",
      pending: "",
      whisper: null,
      line: 1,
      col: 1,
      folioTitle: folio.title,
      isRite: folio.isRite,
      riteFamily: folio.riteFamily ?? null,
      resolvedCount: resolvedCountOf(folio, context.current.resolved),
      totalAnomalies: folio.anomalies.length,
      activeTarget: coachTargetOf(view, context.current),
    });
  }, [folio]);

  // A cleared anomaly (or a new page, or a blind gutter coming on) re-marks the buffer. The context the
  // decoration plugin reads was updated during the render; this is the nudge that makes it look again.
  // biome-ignore lint/correctness/useExhaustiveDependencies: these three are the trigger, not the payload
  useEffect(() => {
    viewRef.current?.dispatch({ effects: annotate.of(null) });
    if (viewRef.current) {
      publishStatus({
        resolvedCount: resolvedCountOf(context.current.folio, context.current.resolved),
        totalAnomalies: context.current.folio?.anomalies.length ?? 0,
        activeTarget: coachTargetOf(viewRef.current, context.current),
      });
    }
  }, [resolved, folio, blind]);

  // Line numbers: the setting, the trial's blind gutter, and the relative option. The reconfigure is the
  // point (the format function reads the relative setting through a ref), so `relativeNumbers` is a trigger.
  // biome-ignore lint/correctness/useExhaustiveDependencies: relativeNumbers only triggers the reconfigure
  useEffect(() => {
    viewRef.current?.dispatch({
      effects: gutterCompartment.reconfigure(
        gutterExtension(showLineNumbers && !blind, () => relativeRef.current),
      ),
    });
    viewRef.current?.dispatch({ effects: annotate.of(null) });
  }, [gutterCompartment, showLineNumbers, blind, relativeNumbers]);

  // `jk` → `<Esc>`, mapped and unmapped with the setting.
  useEffect(() => {
    applyJkMapping(jkEscape);
  }, [jkEscape]);

  const typeKey = (key: string) => {
    const view = viewRef.current;
    const cm = view ? getCM(view) : null;
    if (!view || !cm) return;
    view.focus();
    Vim.handleKey(cm, key, "user");
  };

  const baseUniforms = tokens
    ? {
        u_ground: tokens["--ui-ground"],
        u_ink: tokens["--ui-ink"],
        u_accent: tokens["--ui-accent"],
        u_modeColor: tokens[modeToken(modeRef.current)],
        u_cursor: [cursorPlaced.current.x, cursorPlaced.current.y],
        u_pulse: 0,
        u_flow: 0,
      }
    : undefined;
  const still = <div className={s.still} style={{ background: BUFFER_GLOW.still }} />;

  return (
    <section
      ref={frameRef}
      className={cx(s.frame, className)}
      data-mode="normal"
      aria-label="The folio buffer"
      onClick={(event) => {
        // A click anywhere on the plate that is not on the page or a keypad button puts the caret back.
        const target = event.target as HTMLElement | null;
        if (target?.closest(".cm-editor") || target?.closest("button")) return;
        viewRef.current?.focus();
      }}
    >
      <div className={s.glow} aria-hidden="true">
        {tokens ? (
          <ShaderCanvas
            {...BUFFER_GLOW}
            ref={handleRef}
            uniforms={baseUniforms}
            paused
            reduced={reduced}
            maxPixels={500_000}
            still={still}
            onError={(log) => console.error(`buffer shader: ${log}`)}
          />
        ) : (
          still
        )}
      </div>
      <div className={s.panes} data-split={split ? "on" : undefined}>
        <div className={s.host} ref={hostRef} />
        {split && (
          <aside className={s.twin} aria-label="Twin margin" onClick={() => viewRef.current?.focus()}>
            <p className={s.twinHead}>TWIN MARGIN · Ctrl-w w</p>
            {pageOf(folio, resolved).map((line, index) => (
              <p key={`${folio.id}-${index}`} className={s.twinLine}>
                {line === "" ? "~" : line}
              </p>
            ))}
          </aside>
        )}
      </div>
      {touchKeypad && (
        <fieldset className={s.keypad} aria-label="Touch Vim keypad">
          {TOUCH_KEYS.map((cap) => (
            <button key={cap.id} type="button" className={s.keypadKey} onClick={() => typeKey(cap.vim)}>
              {cap.label}
            </button>
          ))}
        </fieldset>
      )}
    </section>
  );
}

/** `imap jk <Esc>`: the mapping the game promises from minute one. */
function applyJkMapping(on: boolean): void {
  if (on) {
    Vim.map("jk", "<Esc>", "insert");
    return;
  }
  Vim.unmap("jk", "insert");
}

// ---------------------------------------------------------------------------------------------
// The Ex handlers, registered once for the whole page
// ---------------------------------------------------------------------------------------------

type ExRouter = (name: string, argString: string, args: string[]) => void;

let exRouter: ExRouter | null = null;
let exBound = false;

/**
 * Binds the game's Ex commands to the module's one router. A module guard, not an effect: React StrictMode
 * mounts twice, and `Vim.defineEx` would otherwise stack a second handler on every command.
 */
function bindExOnce(router: ExRouter): void {
  exRouter = router;
  if (exBound) return;
  exBound = true;
  const answer = (name: string): ExFn => {
    return (_cm, params) => {
      // A bare `:q` reaches here with no argument string at all: the engine leaves it undefined.
      exRouter?.(name, params.argString ?? "", params.args ?? []);
    };
  };
  // Most specific first is the map's business; every pair here is a name with its own prefix.
  const BINDINGS: readonly (readonly [string, string])[] = [
    ["wq", "wq"],
    ["write", "w"],
    ["q", "q"],
    ["qa", "qa"],
    ["x", "x"],
    ["help", "h"],
    ["smile", "smile"],
    ["ed", "ed"],
    ["pet", "pet"],
    ["pspsps", "pspsps"],
    ["treat", "treat"],
    ["emacs", "emacs"],
    ["nano", "nano"],
    ["vscode", "vscode"],
    ["colorscheme", "colo"],
    ["set", "set"],
    ["vsplit", "vs"],
    ["buffer", "buf"],
    ["codex", "codex"],
    ["expeditions", "exp"],
    ["mosaic", "mosaic"],
    ["volumes", "vol"],
    ["trials", "trials"],
    ["marginalia", "marg"],
    ["log", "log"],
    ["scribes", "scribes"],
    ["!", "!"],
  ];
  for (const [name, prefix] of BINDINGS) Vim.defineEx(name, prefix, answer(name));
}
