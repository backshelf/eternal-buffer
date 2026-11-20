// Proves the three things T7 and T16 rely on: the same seed always builds the same folio, every
// anomaly the generator emits can actually be cleared with ordinary Vim edits, and clearing is
// matched by content so an early `dd` cannot desynchronise the page.
import { describe, expect, test } from "bun:test";
import {
  ANOMALY_SPEC,
  ANOMALY_SPECS,
  FOLIO_TEMPLATES,
  PAWPRINT_LINE,
  PRACTICE_RITES,
} from "../src/content/folios";
import {
  anomalyResolved,
  evaluateFolio,
  type Folio,
  type FolioAnomaly,
  generateFolio,
} from "../src/vim/folio";

/** Every unlockable family, plus the two that start unlocked. */
const ALL_FAMILIES = {
  "core-move": true,
  "core-edit": true,
  "word-stride": true,
  "line-edge": true,
  "char-snipe": true,
  "file-jump": true,
  counts: true,
  "op-delete": true,
  "op-change": true,
  "op-yank": true,
  "line-craft": true,
  "text-objects": true,
  "visual-modes": true,
  "bracket-indent": true,
  "search-jump": true,
  "para-marks": true,
  substitute: true,
  "dot-echo": true,
  registers: true,
  macros: true,
  "ex-power": true,
  "dual-split": true,
  "vimrc-forge": true,
} as const satisfies Record<string, true>;

const RITE_FAMILIES = [
  "word-stride",
  "line-edge",
  "char-snipe",
  "file-jump",
  "counts",
  "op-delete",
  "op-change",
  "op-yank",
  "line-craft",
  "text-objects",
  "visual-modes",
  "bracket-indent",
  "search-jump",
  "para-marks",
  "substitute",
  "dot-echo",
  "registers",
  "macros",
  "ex-power",
  "dual-split",
  "vimrc-forge",
];

/** Families a given act has reached, used to build realistic unlock maps. */
const ACT_FAMILIES: Record<number, string[]> = {
  1: ["core-move", "core-edit"],
  2: ["word-stride", "line-edge", "char-snipe", "file-jump", "counts"],
  3: ["op-delete", "op-change", "op-yank", "line-craft"],
  4: ["text-objects", "visual-modes", "bracket-indent"],
  5: ["search-jump", "para-marks", "substitute"],
  6: ["dot-echo", "registers", "macros"],
  7: ["ex-power", "dual-split", "vimrc-forge"],
};

function unlockedForAct(act: number): Record<string, true> {
  const map: Record<string, true> = {};
  for (let tier = 1; tier <= act; tier += 1) {
    for (const family of ACT_FAMILIES[tier] ?? []) map[family] = true;
  }
  return map;
}

function countLine(lines: readonly string[], text: string): number {
  return lines.filter((line) => line === text).length;
}

/**
 * Clear one anomaly the way a player would: no stored indices, only the content the anomaly names.
 * Line 12 of the page may not be line 12 any more, so every lookup is a `indexOf` by text.
 */
function fixAnomaly(lines: readonly string[], anomaly: FolioAnomaly): string[] {
  const out = [...lines];

  if (anomaly.kind === "sorted-canon") {
    const block = anomaly.targetText.split("\n");
    const spots = block
      .map((text) => ({ text, at: out.indexOf(text) }))
      .filter((spot) => spot.at >= 0)
      .sort((left, right) => left.at - right.at);
    const sorted = spots.map((spot) => spot.text).sort();
    spots.forEach((spot, index) => {
      const replacement = sorted[index];
      if (replacement !== undefined) out[spot.at] = replacement;
    });
    return out;
  }

  if (anomaly.kind === "register-splice") {
    const expected = anomaly.expectedLine;
    const partner = anomaly.targetText.split("\n")[0];
    if (expected === null || partner === undefined) return out;
    const left = out.indexOf(partner);
    const right = out.indexOf(expected);
    const held = out[left];
    const other = out[right];
    if (left >= 0 && right >= 0 && held !== undefined && other !== undefined) {
      out[left] = other;
      out[right] = held;
    }
    return out;
  }

  if (anomaly.kind === "broken-refrain") {
    const expected = anomaly.expectedLine;
    if (expected === null) return out;
    const at = out.indexOf(expected);
    if (at >= 0 && countLine(out, expected) < 2) out.splice(at + 1, 0, expected);
    return out;
  }

  if (anomaly.expectedLine === null) {
    return out.filter((line) => !line.includes(anomaly.targetText));
  }

  const clean = anomaly.expectedLine.slice(anomaly.colStart, anomaly.colEnd);
  return out.map((line) =>
    line.includes(anomaly.targetText) ? line.split(anomaly.targetText).join(clean) : line,
  );
}

function clearFolio(folio: Folio): string[] {
  let page = [...folio.lines];
  for (const anomaly of folio.anomalies) page = fixAnomaly(page, anomaly);
  return page;
}

const SEEDS = Array.from({ length: 25 }, (_, index) => index * 7 + 1);
const ACTS = [1, 2, 3, 4, 5, 6, 7] as const;

describe("folio content", () => {
  test("eighteen templates across six genres, every one a page of 10 to 14 lines", () => {
    expect(FOLIO_TEMPLATES.length).toBeGreaterThanOrEqual(18);
    const ids = new Set(FOLIO_TEMPLATES.map((template) => template.id));
    expect(ids.size).toBe(FOLIO_TEMPLATES.length);

    const genres = new Set(FOLIO_TEMPLATES.map((template) => template.genre));
    expect(genres.size).toBe(6);

    for (const template of FOLIO_TEMPLATES) {
      expect(template.lines.length).toBeGreaterThanOrEqual(10);
      expect(template.lines.length).toBeLessThanOrEqual(14);
      expect(template.title.length).toBeGreaterThan(4);
      for (const line of template.lines) expect(line.length).toBeGreaterThan(4);
    }
  });

  test("one anomaly spec per kind, honest weights", () => {
    const kinds = ANOMALY_SPECS.map((spec) => spec.kind);
    expect(new Set(kinds).size).toBe(18);
    for (const spec of ANOMALY_SPECS) {
      expect(spec.weight).toBeGreaterThan(0);
      expect(spec.hintId.length).toBeGreaterThan(0);
      expect(spec.label.length).toBeGreaterThan(0);
    }
    for (const mega of ["scattered-sigil", "global-purge", "ritual-table", "sorted-canon"] as const) {
      expect(ANOMALY_SPEC[mega].weight).toBeGreaterThanOrEqual(2);
    }
    for (const ordinary of ["stray-rot", "rotten-word", "case-typo", "indent-block"] as const) {
      expect(ANOMALY_SPEC[ordinary].weight).toBe(1);
    }
  });

  test("one Practice Rite per unlockable family, each a valid short lesson", () => {
    const families = PRACTICE_RITES.map((rite) => rite.family);
    expect(families.length).toBe(21);
    expect(new Set(families).size).toBe(21);
    expect([...families].sort()).toEqual([...RITE_FAMILIES].sort());

    for (const rite of PRACTICE_RITES) {
      expect(rite.banner).toBeDefined();
      expect(rite.banner.length).toBeGreaterThan(20);
      expect(rite.lines.length).toBeGreaterThanOrEqual(6);
      expect(rite.lines.length).toBeLessThanOrEqual(10);
      expect(rite.anomalies.length).toBeGreaterThanOrEqual(2);
      expect(rite.anomalies.length).toBeLessThanOrEqual(3);
      for (const anomaly of rite.anomalies) {
        expect(anomaly.parKeys).toBeGreaterThan(0);
        expect(anomaly.optimalHint.length).toBeGreaterThan(0);
        expect(anomaly.line).toBeGreaterThanOrEqual(0);
        expect(anomaly.line).toBeLessThan(rite.lines.length);
      }
    }
  });
});

describe("generateFolio", () => {
  test("is deterministic: same seed and inputs, bit-identical folio", () => {
    const input = {
      seed: 20_261_120,
      unlocked: ALL_FAMILIES,
      actTier: 6 as const,
      challengeRules: [] as readonly string[],
    };
    const first = generateFolio(input);
    const second = generateFolio(input);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(second.id).toBe(first.id);
    expect(second.anomalies.map((anomaly) => anomaly.id)).toEqual(
      first.anomalies.map((anomaly) => anomaly.id),
    );
  });

  test("different seeds wander to different pages", () => {
    const pages = new Set<string>();
    for (let seed = 0; seed < 20; seed += 1) {
      pages.add(
        JSON.stringify(generateFolio({ seed, unlocked: ALL_FAMILIES, actTier: 5, challengeRules: [] })),
      );
    }
    expect(pages.size).toBeGreaterThan(4);
  });

  test("every act builds a well-formed folio with unique ids, targets and weights", () => {
    for (const act of ACTS) {
      const unlocked = unlockedForAct(act);
      for (const seed of SEEDS) {
        const folio = generateFolio({ seed, unlocked, actTier: act, challengeRules: [] });

        expect(folio.actTier).toBe(act);
        expect(folio.isRite).toBe(false);
        expect(folio.hasPawprint).toBe(false);
        expect(folio.title.length).toBeGreaterThan(4);
        expect(folio.lines.length).toBeGreaterThanOrEqual(10);
        expect(folio.anomalies.length).toBeGreaterThanOrEqual(2);
        expect(folio.anomalies.length).toBeLessThanOrEqual(5);

        const ids = new Set(folio.anomalies.map((anomaly) => anomaly.id));
        expect(ids.size).toBe(folio.anomalies.length);

        const targets = folio.anomalies.map((anomaly) => `${anomaly.kind}/${anomaly.targetText}`);
        expect(new Set(targets).size).toBe(targets.length);

        for (const anomaly of folio.anomalies) {
          expect(anomaly.weight).toBeGreaterThan(0);
          expect(anomaly.parKeys).toBeGreaterThan(0);
          expect(anomaly.parKeys).toBeLessThan(40);
          expect(anomaly.label.length).toBeGreaterThan(0);
          expect(anomaly.optimalHint.length).toBeGreaterThan(0);
          expect(anomaly.line).toBeGreaterThanOrEqual(0);
          expect(anomaly.line).toBeLessThan(folio.lines.length);

          const spec = ANOMALY_SPEC[anomaly.kind];
          expect(spec.minAct).toBeLessThanOrEqual(act);
          for (const family of spec.families) expect(unlocked[family]).toBe(true);
        }

        // Nothing on the page reads as already mended.
        expect(evaluateFolio(folio.lines, folio, {}).newlyResolved.length).toBe(0);
      }
    }
  });

  test("clearing every anomaly resolves the whole folio, at every act", () => {
    for (const act of ACTS) {
      const unlocked = unlockedForAct(act);
      for (const seed of SEEDS) {
        const folio = generateFolio({ seed, unlocked, actTier: act, challengeRules: [] });
        const page = clearFolio(folio);
        const result = evaluateFolio(page, folio, {});
        expect(result.newlyResolved.length).toBe(folio.anomalies.length);
        expect(result.allResolved).toBe(true);
      }
    }
  });

  test("clears in any order, including last anomaly first", () => {
    for (const act of ACTS) {
      const unlocked = unlockedForAct(act);
      for (const seed of SEEDS) {
        const folio = generateFolio({
          seed,
          unlocked,
          actTier: act,
          challengeRules: [],
          includePawprint: seed % 3 === 0,
        });
        let page = [...folio.lines];
        for (const anomaly of [...folio.anomalies].reverse()) page = fixAnomaly(page, anomaly);
        expect(evaluateFolio(page, folio, {}).allResolved).toBe(true);
      }
    }
  });

  test("already cleared anomalies are never reported twice", () => {
    const folio = generateFolio({ seed: 11, unlocked: ALL_FAMILIES, actTier: 7, challengeRules: [] });
    const settled: Record<string, true> = {};
    for (const anomaly of folio.anomalies) settled[anomaly.id] = true;
    const result = evaluateFolio(folio.lines, folio, settled);
    expect(result.newlyResolved.length).toBe(0);
    expect(result.allResolved).toBe(true);
  });

  test("resolving one anomaly does not hand out the others", () => {
    for (const seed of SEEDS) {
      const folio = generateFolio({ seed, unlocked: ALL_FAMILIES, actTier: 7, challengeRules: [] });
      const target = folio.anomalies[0];
      if (!target) continue;
      const page = fixAnomaly(folio.lines, target);
      const result = evaluateFolio(page, folio, {});
      expect(result.newlyResolved.some((anomaly) => anomaly.id === target.id)).toBe(true);
      expect(result.allResolved).toBe(false);
    }
  });

  test("only the deletion kinds may ask for a whole line removed", () => {
    const deletable = new Set(["blighted-verse", "global-purge", "pawprint"]);
    for (const seed of SEEDS) {
      const folio = generateFolio({ seed, unlocked: ALL_FAMILIES, actTier: 7, challengeRules: [] });
      for (const anomaly of folio.anomalies) {
        if (anomaly.expectedLine === null) expect(deletable.has(anomaly.kind)).toBe(true);
        else expect(anomaly.colStart).toBeLessThanOrEqual(anomaly.colEnd);
      }
    }
  });

  test("only unlocked families are ever used", () => {
    const empty = generateFolio({ seed: 3, unlocked: {}, actTier: 1, challengeRules: [] });
    for (const anomaly of empty.anomalies) {
      expect(ANOMALY_SPEC[anomaly.kind].families.length).toBe(0);
      expect(["stray-rot", "missing-rune"]).toContain(anomaly.kind);
      // Act I hints never suggest locked Act II/III keys like `f`, `r`, or `cw`.
      expect(anomaly.optimalHint).not.toMatch(/^f|\br[a-z]|\bcw\b/);
    }
    expect(empty.anomalies.length).toBeGreaterThanOrEqual(2);

    // Act I alone but a high tier: the act gate still holds the pool down.
    const early = generateFolio({ seed: 3, unlocked: {}, actTier: 6, challengeRules: [] });
    for (const anomaly of early.anomalies) expect(ANOMALY_SPEC[anomaly.kind].minAct).toBe(1);
  });
});

describe("normalOnly challenge", () => {
  test("never emits an anomaly that needs Insert mode", () => {
    const insertOnly = ["missing-rune", "rotten-word", "quoted-curse"];
    for (const act of ACTS) {
      const unlocked = unlockedForAct(act);
      for (const seed of SEEDS) {
        const folio = generateFolio({
          seed,
          unlocked,
          actTier: act,
          challengeRules: ["normalOnly"],
        });
        expect(folio.anomalies.length).toBeGreaterThanOrEqual(2);
        for (const anomaly of folio.anomalies) {
          expect(insertOnly).not.toContain(anomaly.kind);
          expect(ANOMALY_SPEC[anomaly.kind].insertRequired).toBe(false);
        }
        expect(evaluateFolio(clearFolio(folio), folio, {}).allResolved).toBe(true);
      }
    }
  });

  test("act I with normalOnly still fills a folio from stray rot alone", () => {
    for (const seed of SEEDS) {
      const folio = generateFolio({
        seed,
        unlocked: unlockedForAct(1),
        actTier: 1,
        challengeRules: ["normalOnly"],
      });
      expect(folio.anomalies.length).toBeGreaterThanOrEqual(2);
      for (const anomaly of folio.anomalies) expect(anomaly.kind).toBe("stray-rot");
      expect(evaluateFolio(clearFolio(folio), folio, {}).allResolved).toBe(true);
    }
  });
});

describe("a dd in the middle", () => {
  test("shifts every later line and the folio still clears by content", () => {
    let checked = 0;

    for (const seed of SEEDS) {
      const folio = generateFolio({ seed, unlocked: ALL_FAMILIES, actTier: 7, challengeRules: [] });
      const deletion = folio.anomalies.find(
        (anomaly) => anomaly.expectedLine === null && anomaly.kind !== "global-purge",
      );
      if (!deletion) continue;
      const later = folio.anomalies.filter((anomaly) => anomaly.line > deletion.line);
      if (later.length === 0) continue;
      const survivor = later[0];
      if (!survivor) continue;

      const page = folio.lines.filter((line) => !line.includes(deletion.targetText));
      expect(page.length).toBe(folio.lines.length - 1);

      // The stored index is stale now: whatever sits on that line is a different line.
      expect(page[survivor.line]).not.toContain(survivor.targetText);
      // But the anomaly is still recognised, because matching is by content.
      expect(anomalyResolved(page, survivor)).toBe(false);
      const mended = fixAnomaly(page, survivor);
      expect(anomalyResolved(mended, survivor)).toBe(true);

      let finished = page;
      for (const anomaly of folio.anomalies) {
        if (anomaly.id === deletion.id || anomaly.id === survivor.id) continue;
        finished = fixAnomaly(finished, anomaly);
      }
      const result = evaluateFolio(finished, folio, {
        [deletion.id]: true,
        [survivor.id]: true,
      });
      expect(result.allResolved).toBe(true);
      checked += 1;
    }

    expect(checked).toBeGreaterThan(0);
  });

  test("deleting an unrelated line resolves nothing", () => {
    for (const seed of SEEDS) {
      const folio = generateFolio({ seed, unlocked: ALL_FAMILIES, actTier: 7, challengeRules: [] });
      const page = [...folio.lines];
      page.splice(Math.floor(page.length / 2), 1);
      const result = evaluateFolio(page, folio, {});
      expect(result.newlyResolved.length).toBe(0);
      expect(result.allResolved).toBe(false);
    }
  });
});

describe("pawprint", () => {
  test("appends Tilde's line as a removable anomaly", () => {
    const folio = generateFolio({
      seed: 99,
      unlocked: ALL_FAMILIES,
      actTier: 4,
      challengeRules: [],
      includePawprint: true,
    });

    expect(folio.hasPawprint).toBe(true);
    expect(folio.lines[folio.lines.length - 1]).toBe(PAWPRINT_LINE);

    const paw = folio.anomalies.find((anomaly) => anomaly.kind === "pawprint");
    expect(paw).toBeDefined();
    if (!paw) return;

    expect(paw.expectedLine).toBeNull();
    expect(paw.parKeys).toBe(2);
    expect(paw.optimalHint).toBe("dd");
    expect(paw.weight).toBeGreaterThan(0);
    expect(paw.targetText).toBe(PAWPRINT_LINE);

    const cleared = folio.lines.filter((line) => !line.includes(PAWPRINT_LINE));
    expect(anomalyResolved(cleared, paw)).toBe(true);
    expect(anomalyResolved(folio.lines, paw)).toBe(false);

    const everything = folio.anomalies.filter((anomaly) => anomaly.kind !== "pawprint");
    let page = cleared;
    for (const anomaly of everything) page = fixAnomaly(page, anomaly);
    expect(evaluateFolio(page, folio, {}).allResolved).toBe(true);
  });

  test("is off by default", () => {
    const folio = generateFolio({ seed: 99, unlocked: ALL_FAMILIES, actTier: 4, challengeRules: [] });
    expect(folio.hasPawprint).toBe(false);
    expect(folio.anomalies.some((anomaly) => anomaly.kind === "pawprint")).toBe(false);
    expect(folio.lines).not.toContain(PAWPRINT_LINE);
  });
});

describe("Practice Rites", () => {
  test("each rite generates, is a rite, and clears with its own key family", () => {
    for (const family of RITE_FAMILIES) {
      const folio = generateFolio({
        seed: 5,
        unlocked: ALL_FAMILIES,
        actTier: 7,
        riteFamily: family,
        challengeRules: [],
      });

      expect(folio.isRite).toBe(true);
      expect(folio.riteFamily).toBe(family);
      expect(folio.riteBanner?.length ?? 0).toBeGreaterThan(20);
      expect(folio.hasPawprint).toBe(false);
      expect(folio.lines.length).toBeGreaterThanOrEqual(6);
      expect(folio.lines.length).toBeLessThanOrEqual(10);
      expect(folio.anomalies.length).toBeGreaterThanOrEqual(2);
      expect(folio.anomalies.length).toBeLessThanOrEqual(3);

      // No authored edit was silently dropped.
      const authored = PRACTICE_RITES.find((rite) => rite.family === family);
      expect(folio.anomalies.length).toBe(authored?.anomalies.length ?? -1);

      for (const anomaly of folio.anomalies) {
        expect(anomaly.parKeys).toBeGreaterThan(0);
        expect(anomaly.optimalHint.length).toBeGreaterThan(0);
        expect(anomaly.line).toBeLessThan(folio.lines.length);
      }

      expect(evaluateFolio(folio.lines, folio, {}).newlyResolved.length).toBe(0);
      const result = evaluateFolio(clearFolio(folio), folio, {});
      expect(result.newlyResolved.length).toBe(folio.anomalies.length);
      expect(result.allResolved).toBe(true);
    }
  });

  test("a rite ignores the pawprint flag so the lesson stays on its own family", () => {
    const folio = generateFolio({
      seed: 5,
      unlocked: ALL_FAMILIES,
      actTier: 7,
      riteFamily: "word-stride",
      challengeRules: [],
      includePawprint: true,
    });
    expect(folio.isRite).toBe(true);
    expect(folio.hasPawprint).toBe(false);
    expect(folio.anomalies.some((anomaly) => anomaly.kind === "pawprint")).toBe(false);
  });
});
