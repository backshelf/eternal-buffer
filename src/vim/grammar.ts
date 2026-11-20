// The Grammar Codex classifier: turns what the player actually typed into the pair they just learned.
//
// Pure TypeScript. Counts are normalised away, text objects keep their bracket, Ex bodies collapse to
// the pair they belong to, and anything the Codex does not curate comes back as `null`.
import { GRAMMAR_CODEX, type GrammarCategory } from "../content/vimActs";

export type { GrammarCategory };

export interface GrammarEvent {
  /** The Codex entry's id, e.g. `d+w`, `c+iw`, `c+i"`, `:%s`, `q+@`, `Ctrl-v+d`. */
  pairId: string;
  label: string;
  category: GrammarCategory;
}

const CODEX_BY_ID: ReadonlyMap<string, (typeof GRAMMAR_CODEX)[number]> = new Map(
  GRAMMAR_CODEX.map((entry) => [entry.id, entry]),
);

function event(id: string): GrammarEvent | null {
  const entry = CODEX_BY_ID.get(id);
  return entry ? { pairId: entry.id, label: entry.name, category: entry.category } : null;
}

/** Every spelling of block-visual a caller might hand us, including the raw `Ctrl-v` control byte. */
const BLOCK_VISUAL_PREFIXES = ["<c-v>", "<ctrl-v>", "ctrl-v", "^v", "\u0016"];

function stripCounts(keys: string): string {
  return keys.replace(/^\d+/, "");
}

/** `di"`, `daw`, `ci(`, `cit`: the object keeps the character the player aimed at. */
function objectToken(lead: "i" | "a", char: string): string {
  switch (char) {
    case "w":
      return `${lead}w`;
    case '"':
      return `${lead}"`;
    case "'":
      return `${lead}'`;
    case "(":
    case ")":
    case "b":
      return `${lead}(`;
    case "{":
    case "}":
    case "B":
      return `${lead}{`;
    case "[":
    case "]":
      return `${lead}[`;
    case "t":
      return `${lead}t`;
    default:
      return `${lead}${char}`;
  }
}

function classifyEx(cmd: string): GrammarEvent | null {
  const body = cmd.trim().replace(/^:/, "").trim();
  const lower = body.toLowerCase();
  if (lower === "") return null;

  if (lower.startsWith("%s")) return event(":%s");
  if (/^vs(plit)?(\s|$)/.test(lower)) return event(":vsplit");
  if (/^sort!?(\s|$)/.test(lower)) return event(":sort");
  if (/^g([!/\s]|$)/.test(lower) || lower.startsWith("global")) return event(":g/d");
  return null;
}

/**
 * Classify one finished Vim command.
 *
 * `rawKeys` is the keystrokes as the editor saw them (`4dw`, `ci(`, `3@a`, `dd`, `Ctrl-vd`, or a
 * whole `:%s/a/b/g`). `exCommand` may be passed instead when the caller already split the `:` body.
 */
export function classifyVimCommand(rawKeys: string, exCommand?: string): GrammarEvent | null {
  const raw = rawKeys.trim();
  const ex = exCommand !== undefined ? exCommand : raw.startsWith(":") ? raw.slice(1) : null;
  if (ex !== null) return classifyEx(ex);

  let keys = raw;
  let blockVisual = false;
  const lower = raw.toLowerCase();
  const prefix = BLOCK_VISUAL_PREFIXES.find((candidate) => lower.startsWith(candidate));
  if (prefix) {
    blockVisual = true;
    keys = keys.slice(prefix.length);
  }

  if (blockVisual) {
    const action = keys[0];
    if (action === "d" || action === "c") return event(`Ctrl-v+${action}`);
    return null;
  }

  const command = stripCounts(keys);
  if (command === "") return null;
  const first = command[0];
  if (first === undefined) return null;

  // Visual mode acts on a selection rather than on a motion.
  if (first === "v" || first === "V") {
    const action = stripCounts(command.slice(1))[0] ?? "";
    return event(`${first}+${action}`);
  }

  // The capitals are shorthand for the line operators.
  if (command === "D") return event("d+$");
  if (command === "C") return event("c+$");
  if (command === "Y") return event("y+$");

  // Search: the lantern and the star.
  if (first === "/" || first === "?" || first === "n" || first === "N") return event("/+n");
  if (first === "*" || first === "#") return event("*+n");

  // Macros and the dot echo.
  if (first === "@") return event(command[1] === "@" ? "@+@" : "q+@");
  if (first === ".") return event("dot");

  // Operators: d, c, y and whatever they were aimed at.
  if (first === "d" || first === "c" || first === "y") {
    const rest = stripCounts(command.slice(1));
    // A lone operator is still pending; it is not the doubled line form.
    if (rest === "") return null;
    const head = rest[0];
    if (head === undefined) return null;
    if (head === first) return event(`${first}+${first}${first}`);
    if (head === "i" || head === "a") {
      const target = rest[1];
      if (target === undefined) return null;
      return event(`${first}+${objectToken(head, target)}`);
    }
    if (head === "g" && rest[1] === "g") return event(`${first}+gg`);
    if (head === "f" || head === "F" || head === "t" || head === "T") {
      return event(`${first}+${head.toLowerCase()}`);
    }
    return event(`${first}+${head}`);
  }

  return null;
}
