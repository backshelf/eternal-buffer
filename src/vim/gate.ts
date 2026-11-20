// The progressive key gate. Pure TypeScript: no DOM, no CodeMirror, no store. `BufferEditor` calls
// `gateKeystroke` from a capture-phase keydown handler before `@replit/codemirror-vim` ever sees the
// event, and `watchpot/sim` can call it headlessly with the same answers.
import { ACT_BY_ID, FAMILY_BY_ID, type KeyFamilyId } from "../content/vimActs";

export type VimMode = "normal" | "insert" | "visual" | "visual-line" | "visual-block" | "replace" | "command";

export interface GateDecision {
  allowed: boolean;
  family?: KeyFamilyId;
  reason?: "locked" | "challenge-banned" | "arrow-rusted";
  message?: string;
}

export interface GateInput {
  key: string;
  ctrlKey: boolean;
  mode: VimMode;
  /** Everything already typed for the command in flight: counts, operator, and pending object. */
  pendingKeys: string;
  unlocked: Readonly<Record<string, true>>;
  challengeRules: readonly string[];
  veteranMode: boolean;
  arrowTrainingLeft: number;
  arrowShame: "shame" | "block" | "off";
  /**
   * Act I progressive interactive onboarding stage (0..5, default 5 = all Act I keys open):
   * 0 = h j k l only; 1 = +x; 2/3 = +i Esc; 4 = +a u; 5 = +I A (complete).
   */
  onboardingStep?: number;
}

/** The two families every archivist is handed at the door. They are never priced and never lock again. */
const CORE_FAMILIES: ReadonlySet<KeyFamilyId> = new Set(["core-move", "core-edit"]);

const ARROWS: ReadonlySet<string> = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

const HJKL_KEYS: ReadonlySet<string> = new Set(["h", "j", "k", "l"]);

/** Keys that open an insert, and so are banned outright by the `normalOnly` challenge. */
const INSERT_ENTRY_KEYS: ReadonlySet<string> = new Set([
  "i",
  "a",
  "I",
  "A",
  "o",
  "O",
  "c",
  "C",
  "s",
  "S",
  "R",
]);

const ARROW_RUSTED = "Use h j k l — the arrows have rusted.";

/** Families by the single keycap that claims them. `?` is deliberately absent: it always summons help. */
const SINGLE_KEYS: Record<string, KeyFamilyId> = {
  h: "core-move",
  j: "core-move",
  k: "core-move",
  l: "core-move",
  u: "core-move",
  x: "core-edit",
  i: "core-edit",
  a: "core-edit",
  I: "core-edit",
  A: "core-edit",
  o: "line-craft",
  O: "line-craft",
  r: "line-craft",
  R: "line-craft",
  "~": "line-craft",
  J: "line-craft",
  w: "word-stride",
  b: "word-stride",
  e: "word-stride",
  W: "word-stride",
  B: "word-stride",
  E: "word-stride",
  "0": "line-edge",
  $: "line-edge",
  "^": "line-edge",
  f: "char-snipe",
  F: "char-snipe",
  t: "char-snipe",
  T: "char-snipe",
  ";": "char-snipe",
  ",": "char-snipe",
  g: "file-jump",
  G: "file-jump",
  d: "op-delete",
  D: "op-delete",
  c: "op-change",
  C: "op-change",
  s: "op-change",
  S: "op-change",
  y: "op-yank",
  Y: "op-yank",
  p: "op-yank",
  P: "op-yank",
  v: "visual-modes",
  V: "visual-modes",
  "%": "bracket-indent",
  ">": "bracket-indent",
  "<": "bracket-indent",
  "/": "search-jump",
  n: "search-jump",
  N: "search-jump",
  "*": "search-jump",
  "#": "search-jump",
  "{": "para-marks",
  "}": "para-marks",
  m: "para-marks",
  "'": "para-marks",
  "`": "para-marks",
  ".": "dot-echo",
  '"': "registers",
  q: "macros",
  "@": "macros",
};

/** Ctrl chords worth naming. Everything else (Ctrl-[ and friends) is free. */
const CTRL_KEYS: Record<string, KeyFamilyId> = {
  v: "visual-modes",
  r: "line-craft",
  o: "para-marks",
  i: "para-marks",
  w: "dual-split",
};

function keycapLabel(key: string, ctrlKey: boolean): string {
  if (key.length === 1 && ctrlKey) return `Ctrl-${key.toLowerCase()}`;
  return key;
}

/**
 * Which Keycap Family a keystroke belongs to, or `null` when the key is free: typing, arrows,
 * `Escape`, `Ctrl-[`, `:`, `?`, and the unknown keys a keyboard may still send.
 */
export function keyToFamily(
  key: string,
  ctrlKey: boolean,
  pendingKeys: string,
  mode: VimMode,
): KeyFamilyId | null {
  // Inside insert, replace or the `:` prompt, every printable key is typing, never a motion.
  if (mode === "insert" || mode === "replace" || mode === "command") return null;

  if (ctrlKey) return CTRL_KEYS[key.toLowerCase()] ?? null;

  // Multi-character key names: Escape, Backspace, Enter, the arrows, Tab.
  if (key.length !== 1) return null;

  // A text object continues while an operator is waiting on `i` or `a` (`diw`, `ci"`, `ya(`).
  if ((/[dcy]$/.test(pendingKeys) && (key === "i" || key === "a")) || /[dcy][ia]$/.test(pendingKeys)) {
    return "text-objects";
  }

  // A glyph continues a pending object (`di"`), so the object family keeps it, not registers.
  if (/[dcy][ia].$/.test(pendingKeys)) return "text-objects";

  if (key >= "0" && key <= "9") {
    // `0` is a motion at the start of a command and a count once digits are already in flight.
    if (key === "0") return /^\d+$/.test(pendingKeys) ? "counts" : "line-edge";
    return "counts";
  }

  return SINGLE_KEYS[key] ?? null;
}

function lockedMessage(key: string, ctrlKey: boolean, family: KeyFamilyId): string {
  const def = FAMILY_BY_ID[family];
  const act = ACT_BY_ID[def.act];
  return `${keycapLabel(key, ctrlKey)} is sealed — ${def.name} arrives in Act ${act.numeral} · ${act.title}.`;
}

/** The gate every keystroke passes before the Vim engine runs. */
export function gateKeystroke(input: GateInput): GateDecision {
  const {
    key,
    ctrlKey,
    mode,
    pendingKeys,
    unlocked,
    challengeRules,
    veteranMode,
    arrowTrainingLeft,
    arrowShame,
  } = input;

  // Typing modes never gate a character.
  if (mode === "insert" || mode === "replace" || mode === "command") return { allowed: true };

  if (ARROWS.has(key)) {
    if (challengeRules.includes("noArrows")) {
      return {
        allowed: false,
        reason: "arrow-rusted",
        message: "No arrows in this trial. The old roads are closed.",
      };
    }
    if (arrowShame === "off" || arrowTrainingLeft > 0) return { allowed: true };
    if (arrowShame === "block") return { allowed: false, reason: "arrow-rusted", message: ARROW_RUSTED };
    return { allowed: true, reason: "arrow-rusted", message: ARROW_RUSTED };
  }

  // Escape always escapes, `?` always summons the hint, `:` always opens the console.
  if (key === "Escape" || key === "?" || key === ":") return { allowed: true };
  if (ctrlKey && key === "[") return { allowed: true };

  // Opt-in trial rules outrank everything, including Veteran Mode.
  if (challengeRules.includes("noHjkl") && HJKL_KEYS.has(key)) {
    return {
      allowed: false,
      reason: "challenge-banned",
      message: "h j k l are locked in this trial. w b e f t gg G { } — that is your road.",
    };
  }
  const operatorPending = /[dcy]$/.test(pendingKeys);
  const objectKey = key === "i" || key === "a";
  if (
    challengeRules.includes("normalOnly") &&
    INSERT_ENTRY_KEYS.has(key) &&
    !(operatorPending && objectKey)
  ) {
    return {
      allowed: false,
      reason: "challenge-banned",
      message: "No Insert in this trial. Only destructive, transmuting edits.",
    };
  }

  const family = keyToFamily(key, ctrlKey, pendingKeys, mode);
  if (!family) return { allowed: true };

  // During Act I's interactive onboarding beats, hold back not-yet-taught core keys so a beginner
  // discovers each key one step at a time instead of stumbling into Insert/Append by accident.
  const step = input.onboardingStep ?? 5;
  if (!veteranMode && CORE_FAMILIES.has(family) && step < 5) {
    if (key === "x" && step < 1) {
      return {
        allowed: false,
        family,
        reason: "locked",
        message: "Walk onto the glowing red Ø with h j k l first — then x unlocks.",
      };
    }
    if (key === "i" && step < 2) {
      return {
        allowed: false,
        family,
        reason: "locked",
        message: "Finish cutting with x first — i (Insert mode) unlocks on the next step.",
      };
    }
    if ((key === "a" || key === "u") && step < 3) {
      return {
        allowed: false,
        family,
        reason: "locked",
        message: `${key} arrives right after this first page. Use h j k l, x, and i for now.`,
      };
    }
    if ((key === "I" || key === "A") && step < 4) {
      return {
        allowed: false,
        family,
        reason: "locked",
        message: `${key} arrives in the next quick lesson — stick to your unlocked keys for now.`,
      };
    }
  }

  if (CORE_FAMILIES.has(family) || veteranMode || unlocked[family] === true) {
    return { allowed: true, family };
  }

  return {
    allowed: false,
    family,
    reason: "locked",
    message: lockedMessage(key, ctrlKey, family),
  };
}

/** The Ex console's own gate. `:` itself always opens; the powerful commands wait for their Act. */
const EX_RULES: { test: RegExp; family: KeyFamilyId | null }[] = [
  { test: /^%s/, family: "substitute" },
  { test: /^s([/#!]|\s|$)/, family: "substitute" },
  { test: /^substitute/, family: "substitute" },
  { test: /^vs(plit)?(\s|$)/, family: "dual-split" },
  // `:vscode` is a joke, not a window command: matched first so it is always allowed.
  { test: /^vscode/, family: null },
  { test: /^v([/\s]|$)/, family: "ex-power" },
  { test: /^g([!/\s]|$)/, family: "ex-power" },
  { test: /^global/, family: "ex-power" },
  { test: /^norm(al)?!?(\s|$)/, family: "ex-power" },
  { test: /^sort!?(\s|$)/, family: "ex-power" },
];

function exFamily(cmd: string): KeyFamilyId | null {
  const lower = cmd.toLowerCase();
  for (const rule of EX_RULES) {
    if (rule.test.test(lower)) return rule.family;
  }
  return null;
}

/**
 * Gate one Ex command body (`cmd` without its leading `:`).
 *
 * Everything a new archivist needs, and every easter egg, is always allowed: `w`, `wq`, `q`, `q!`,
 * `qa!`, `wq!`, `x`, `help`, `smile`, `ed`, `pet`, `pspsps`, `treat`, `emacs`, `nano`, `vscode`,
 * `set`, `colorscheme`, `42`, `!rm`. Only `:%s`/`:s`, `:g`, `:v`, `:norm`, `:sort` and `:vsplit`
 * wait for their Keycap Family.
 */
export function gateExCommand(
  cmd: string,
  unlocked: Readonly<Record<string, true>>,
  veteranMode: boolean,
): GateDecision {
  const body = cmd.trim().replace(/^:/, "").trim();
  if (body === "") return { allowed: true };

  const family = exFamily(body);
  if (!family) return { allowed: true };
  if (veteranMode || unlocked[family] === true) return { allowed: true, family };

  const def = FAMILY_BY_ID[family];
  const act = ACT_BY_ID[def.act];
  return {
    allowed: false,
    family,
    reason: "locked",
    message: `:${body.split(/\s/)[0] ?? body} is sealed — ${def.name} arrives in Act ${act.numeral} · ${act.title}.`,
  };
}
