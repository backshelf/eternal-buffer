import { describe, expect, test } from "bun:test";
import { EASTER_EGGS } from "../src/content/easterEggs";
import { ACTS, GRAMMAR_CODEX, KEY_FAMILIES, VIMRC_RULES } from "../src/content/vimActs";
import {
  type GateDecision,
  type GateInput,
  gateExCommand,
  gateKeystroke,
  keyToFamily,
} from "../src/vim/gate";
import { classifyVimCommand } from "../src/vim/grammar";

type Unlocked = Record<string, true>;

/** Act I hands the player Footwork and the Nib, and nothing else. */
const ACT_ONE: Unlocked = { "core-move": true, "core-edit": true };

function gate(over: Partial<GateInput> = {}): GateDecision {
  return gateKeystroke({
    key: "h",
    ctrlKey: false,
    mode: "normal",
    pendingKeys: "",
    unlocked: ACT_ONE,
    challengeRules: [],
    veteranMode: false,
    arrowTrainingLeft: 0,
    arrowShame: "shame",
    ...over,
  });
}

describe("Act I key gate", () => {
  test("allows h j k l and the core edit keys", () => {
    for (const key of ["h", "j", "k", "l", "x", "i", "a", "u"]) {
      const decision = gate({ key });
      expect(decision.allowed).toBe(true);
      expect(decision.reason).toBeUndefined();
    }
    expect(gate({ key: "Escape" }).allowed).toBe(true);
  });

  test("stages core Act I keys progressively during interactive onboarding", () => {
    // Step 0: only h j k l are open; x, i, a, I, A wait for their reactive beats.
    expect(gate({ key: "j", onboardingStep: 0 }).allowed).toBe(true);
    expect(gate({ key: "x", onboardingStep: 0 })).toMatchObject({ allowed: false, reason: "locked" });
    expect(gate({ key: "i", onboardingStep: 0 })).toMatchObject({ allowed: false, reason: "locked" });
    expect(gate({ key: "A", onboardingStep: 0 })).toMatchObject({ allowed: false, reason: "locked" });

    // Step 1: x unlocks once the cursor lands on Ø; i still waits.
    expect(gate({ key: "x", onboardingStep: 1 }).allowed).toBe(true);
    expect(gate({ key: "i", onboardingStep: 1 })).toMatchObject({ allowed: false, reason: "locked" });

    // Step 2: i unlocks; a/u wait for Folio 1 and I/A wait for Folio 2.
    expect(gate({ key: "i", onboardingStep: 2 }).allowed).toBe(true);
    expect(gate({ key: "a", onboardingStep: 2 })).toMatchObject({ allowed: false, reason: "locked" });
    expect(gate({ key: "I", onboardingStep: 3 })).toMatchObject({ allowed: false, reason: "locked" });

    // Veteran mode always bypasses onboarding holds.
    expect(gate({ key: "A", onboardingStep: 0, veteranMode: true }).allowed).toBe(true);
  });

  test("locks w, f, d, q and Ctrl-v with the family that owns them", () => {
    expect(gate({ key: "w" })).toMatchObject({ allowed: false, family: "word-stride", reason: "locked" });
    expect(gate({ key: "f" })).toMatchObject({ allowed: false, family: "char-snipe", reason: "locked" });
    expect(gate({ key: "d" })).toMatchObject({ allowed: false, family: "op-delete", reason: "locked" });
    expect(gate({ key: "q" })).toMatchObject({ allowed: false, family: "macros", reason: "locked" });
    expect(gate({ key: "v", ctrlKey: true })).toMatchObject({
      allowed: false,
      family: "visual-modes",
      reason: "locked",
    });
  });

  test('locks ci" from its first keystroke', () => {
    // `c` is the insert-entry operator of Act III, so the whole idiom dies at the door.
    expect(gate({ key: "c" })).toMatchObject({ allowed: false, family: "op-change" });
    // Had `c` been unlocked, the quote object still needs Act IV.
    expect(gate({ key: "c", unlocked: { ...ACT_ONE, "op-change": true } }).allowed).toBe(true);
    expect(gate({ key: "i", pendingKeys: "c", unlocked: { ...ACT_ONE, "op-change": true } })).toMatchObject({
      allowed: false,
      family: "text-objects",
    });
  });

  test("always opens the console, so :q! and :w work from minute one", () => {
    expect(gate({ key: ":" }).allowed).toBe(true);
    expect(gateExCommand("q!", ACT_ONE, false).allowed).toBe(true);
    expect(gateExCommand("q", ACT_ONE, false).allowed).toBe(true);
    expect(gateExCommand("w", ACT_ONE, false).allowed).toBe(true);
    expect(gateExCommand("wq", ACT_ONE, false).allowed).toBe(true);
  });
});

describe("counts versus the line-start motion", () => {
  test("0 is line-edge bare and counts after a digit", () => {
    expect(keyToFamily("0", false, "", "normal")).toBe("line-edge");
    expect(keyToFamily("0", false, "1", "normal")).toBe("counts");
    expect(keyToFamily("0", false, "10", "normal")).toBe("counts");
    // The motion after the count is still a motion: 10j is Footwork, not Counts.
    expect(keyToFamily("j", false, "10", "normal")).toBe("core-move");
    // 1 opens a count, and needs the family that teaches counts.
    expect(keyToFamily("1", false, "", "normal")).toBe("counts");
  });

  test("the gate follows the family, not the digit", () => {
    const withLineEdge: Unlocked = { ...ACT_ONE, "line-edge": true };
    expect(gate({ key: "0", unlocked: withLineEdge })).toMatchObject({ allowed: true, family: "line-edge" });
    expect(gate({ key: "0", unlocked: withLineEdge, pendingKeys: "1" })).toMatchObject({
      allowed: false,
      family: "counts",
      reason: "locked",
    });
    expect(gate({ key: "1", unlocked: withLineEdge })).toMatchObject({
      allowed: false,
      family: "counts",
    });
  });
});

describe("operator-pending text objects", () => {
  const noObjects: Unlocked = { ...ACT_ONE, "op-delete": true };
  const withObjects: Unlocked = { ...noObjects, "text-objects": true };

  test('d is allowed once Delete is unlocked, di" still waits for Text Objects', () => {
    expect(gate({ key: "d", unlocked: noObjects })).toMatchObject({ allowed: true, family: "op-delete" });
    expect(gate({ key: "i", unlocked: noObjects, pendingKeys: "d" })).toMatchObject({
      allowed: false,
      family: "text-objects",
      reason: "locked",
    });
    expect(gate({ key: '"', unlocked: noObjects, pendingKeys: "di" })).toMatchObject({
      allowed: false,
      family: "text-objects",
    });
  });

  test("the whole idiom passes once Text Objects lands", () => {
    expect(gate({ key: "d", unlocked: withObjects }).allowed).toBe(true);
    expect(gate({ key: "i", unlocked: withObjects, pendingKeys: "d" })).toMatchObject({
      allowed: true,
      family: "text-objects",
    });
    expect(gate({ key: '"', unlocked: withObjects, pendingKeys: "di" }).allowed).toBe(true);
    expect(gate({ key: "(", unlocked: withObjects, pendingKeys: "ci" }).allowed).toBe(true);
  });
});

describe("veteran mode", () => {
  const locked: Unlocked = {};

  test("bypasses every family lock", () => {
    for (const key of ["w", "f", "d", "q", "y", "g", "."]) {
      const decision = gate({ key, unlocked: locked, veteranMode: true });
      expect(decision.allowed).toBe(true);
      expect(decision.reason).toBeUndefined();
    }
    expect(gate({ key: "v", ctrlKey: true, unlocked: locked, veteranMode: true }).allowed).toBe(true);
  });

  test("still enforces noHjkl", () => {
    for (const key of ["h", "j", "k", "l"]) {
      expect(gate({ key, unlocked: locked, veteranMode: true, challengeRules: ["noHjkl"] })).toMatchObject({
        allowed: false,
        reason: "challenge-banned",
      });
    }
    // A stride key is untouched by the trial.
    expect(gate({ key: "w", unlocked: locked, veteranMode: true, challengeRules: ["noHjkl"] }).allowed).toBe(
      true,
    );
  });

  test("still enforces normalOnly, but not against a pending text object", () => {
    for (const key of ["i", "a", "I", "A", "o", "O", "c", "C", "s", "S", "R"]) {
      expect(
        gate({ key, unlocked: locked, veteranMode: true, challengeRules: ["normalOnly"] }),
      ).toMatchObject({ allowed: false, reason: "challenge-banned" });
    }
    expect(
      gate({ key: "x", unlocked: locked, veteranMode: true, challengeRules: ["normalOnly"] }).allowed,
    ).toBe(true);
    // `diw` is not Insert: the object key is allowed while an operator is pending.
    expect(
      gate({
        key: "i",
        pendingKeys: "d",
        unlocked: locked,
        veteranMode: true,
        challengeRules: ["normalOnly"],
      }).allowed,
    ).toBe(true);
  });
});

describe("classifyVimCommand", () => {
  test("normalises counts away from operators and motions", () => {
    expect(classifyVimCommand("4dw")).toMatchObject({ pairId: "d+w", category: "operator" });
    expect(classifyVimCommand("d2w")).toMatchObject({ pairId: "d+w" });
    expect(classifyVimCommand("5dd")).toMatchObject({ pairId: "d+dd" });
    expect(classifyVimCommand("dw")).toMatchObject({ pairId: "d+w", label: "Word Reap" });
  });

  test("keeps the character a text object was aimed at", () => {
    expect(classifyVimCommand("ci(")).toMatchObject({ pairId: "c+i(", category: "object" });
    expect(classifyVimCommand('ci"')).toMatchObject({ pairId: 'c+i"' });
    expect(classifyVimCommand("2yiw")).toMatchObject({ pairId: "y+iw" });
    expect(classifyVimCommand("dit")).toMatchObject({ pairId: "d+it" });
  });

  test("collapses macros and the block-visual column", () => {
    expect(classifyVimCommand("3@a")).toMatchObject({ pairId: "q+@", category: "macro" });
    expect(classifyVimCommand("@@")).toMatchObject({ pairId: "@+@" });
    expect(classifyVimCommand("Ctrl-vd")).toMatchObject({ pairId: "Ctrl-v+d", category: "visual" });
    expect(classifyVimCommand("\u0016c")).toMatchObject({ pairId: "Ctrl-v+c" });
  });

  test("collapses a whole Ex body to its pair", () => {
    expect(classifyVimCommand(":%s/a/b/g")).toMatchObject({ pairId: ":%s", category: "ex" });
    expect(classifyVimCommand("", "%s/ROT/PURE/g")).toMatchObject({ pairId: ":%s" });
    expect(classifyVimCommand(":g/BLIGHT/d")).toMatchObject({ pairId: ":g/d" });
    expect(classifyVimCommand(":sort")).toMatchObject({ pairId: ":sort" });
    expect(classifyVimCommand(":vsplit")).toMatchObject({ pairId: ":vsplit" });
  });

  test("returns null for anything the Codex does not curate", () => {
    expect(classifyVimCommand("")).toBeNull();
    expect(classifyVimCommand("hjkl")).toBeNull();
    expect(classifyVimCommand(":w")).toBeNull();
    expect(classifyVimCommand("d")).toBeNull();
  });
});

describe("arrow keys", () => {
  test("arrows rust after the training folios", () => {
    const pressing = { key: "ArrowLeft" } as const;
    expect(gate({ ...pressing, arrowTrainingLeft: 3 })).toMatchObject({ allowed: true });
    expect(gate({ ...pressing })).toMatchObject({ allowed: true, reason: "arrow-rusted" });
    expect(gate({ ...pressing, arrowShame: "off" })).toMatchObject({ allowed: true });
    expect(gate({ ...pressing, arrowShame: "block" })).toMatchObject({
      allowed: false,
      reason: "arrow-rusted",
    });
  });
});

describe("the Ex console gate", () => {
  test("always allows the console, the easter eggs and the save commands", () => {
    for (const cmd of [
      "w",
      "wq",
      "q",
      "q!",
      "qa!",
      "wq!",
      "x",
      "help",
      "help 42",
      "smile",
      "ed",
      "pet",
      "pspsps",
      "treat",
      "emacs",
      "nano",
      "vscode",
      "set number",
      "set rnu",
      "set nonu",
      "colorscheme",
      "42",
      "!rm -rf /",
    ]) {
      expect(gateExCommand(cmd, ACT_ONE, false).allowed).toBe(true);
    }
  });

  test("gates the powerful commands by family", () => {
    expect(gateExCommand("%s/a/b/g", ACT_ONE, false)).toMatchObject({
      allowed: false,
      family: "substitute",
      reason: "locked",
    });
    expect(gateExCommand("g/BLIGHT/d", ACT_ONE, false)).toMatchObject({
      allowed: false,
      family: "ex-power",
    });
    expect(gateExCommand("v/BLIGHT/d", ACT_ONE, false)).toMatchObject({
      allowed: false,
      family: "ex-power",
    });
    expect(gateExCommand("norm @a", ACT_ONE, false)).toMatchObject({ family: "ex-power" });
    expect(gateExCommand("sort", ACT_ONE, false)).toMatchObject({ family: "ex-power" });
    expect(gateExCommand("vsplit", ACT_ONE, false)).toMatchObject({ family: "dual-split" });
  });

  test("opens with the family unlocked, or in veteran mode", () => {
    expect(gateExCommand("%s/a/b/g", { ...ACT_ONE, substitute: true }, false).allowed).toBe(true);
    expect(gateExCommand(":vsplit", {}, true).allowed).toBe(true);
  });
});

describe("curriculum data", () => {
  test("seven Acts, in order, each with a window and a voice", () => {
    expect(ACTS).toHaveLength(7);
    ACTS.forEach((act, index) => {
      expect<number>(act.id).toBe(index + 1);
      expect(act.window.length).toBeGreaterThan(0);
      expect(act.flavour.length).toBeGreaterThan(20);
      expect(act.fromHours).toBeLessThan(act.toHours);
    });
  });

  test("twenty-three Keycap Families, two of them free", () => {
    expect(KEY_FAMILIES).toHaveLength(23);
    const ids = new Set<string>();
    for (const family of KEY_FAMILIES) {
      expect(ids.has(family.id)).toBe(false);
      ids.add(family.id);
      expect(family.keys.length).toBeGreaterThan(0);
      expect(family.chalkSummary.length).toBeGreaterThan(0);
      expect(family.act).toBeGreaterThanOrEqual(1);
      expect(family.act).toBeLessThanOrEqual(7);
      expect(["glyphs", "seals", "codices"]).toContain(family.cost.currency);
      if (family.id === "core-move" || family.id === "core-edit") {
        expect(family.cost.amount).toBe(0);
      } else {
        expect(family.cost.amount).toBeGreaterThan(0);
        expect(family.riteBonus).toBeGreaterThan(1);
      }
    }
    // Every prerequisite is a real family.
    for (const family of KEY_FAMILIES) {
      for (const required of family.requires) {
        expect(ids.has(required)).toBe(true);
      }
    }
    // Every Act owns at least one family.
    for (const act of ACTS) {
      expect(KEY_FAMILIES.some((family) => family.act === act.id)).toBe(true);
    }
  });

  test("eight .vimrc rules, each costing at least one slot", () => {
    expect(VIMRC_RULES).toHaveLength(8);
    expect(new Set(VIMRC_RULES.map((rule) => rule.id)).size).toBe(8);
    for (const rule of VIMRC_RULES) {
      expect(rule.slotCost).toBeGreaterThanOrEqual(1);
      expect(rule.line.length).toBeGreaterThan(0);
      expect(rule.effect.length).toBeGreaterThan(0);
    }
  });

  test("a 45-entry Grammar Codex with the pair ids the classifier reports", () => {
    expect(GRAMMAR_CODEX).toHaveLength(45);
    expect(new Set(GRAMMAR_CODEX.map((entry) => entry.id)).size).toBe(45);
    const categories = new Set(["motion", "operator", "object", "visual", "search", "macro", "ex"]);
    for (const entry of GRAMMAR_CODEX) {
      expect(categories.has(entry.category)).toBe(true);
      expect(entry.keys.length).toBeGreaterThan(0);
      expect(entry.name.length).toBeGreaterThan(0);
      expect(entry.line.length).toBeGreaterThan(0);
    }
    // Everything the classifier can return is a real Codex entry.
    for (const keys of ["4dw", 'ci"', "ci(", "dd", "3@a", "Ctrl-vd", ":%s", "v~", "y2iw"]) {
      const pair = classifyVimCommand(keys);
      expect(pair).not.toBeNull();
      if (pair) expect(GRAMMAR_CODEX.some((entry) => entry.id === pair.pairId)).toBe(true);
    }
  });

  test("twenty-five easter eggs with unique ids", () => {
    expect(EASTER_EGGS).toHaveLength(25);
    expect(new Set(EASTER_EGGS.map((egg) => egg.id)).size).toBe(25);
    for (const egg of EASTER_EGGS) {
      expect(egg.trigger.length).toBeGreaterThan(0);
      expect(egg.toast.length).toBeGreaterThan(0);
      if (egg.bonusTreats !== undefined) expect(egg.bonusTreats).toBeGreaterThan(0);
    }
    const triggers = EASTER_EGGS.map((egg) => egg.trigger);
    for (const trigger of [":q", ":q!", ":qa!", ":wq!", "ZZ", "ZQ", ":help", ":help 42", ":smile", ":pet"]) {
      expect(triggers).toContain(trigger);
    }
  });
});
