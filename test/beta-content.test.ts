// Proves the Beta content packs hold their promises: an Errata Slip is a pure function of its serial,
// Tilde's new moods and her Bond wardrobe stay fixed-width and ordered, and the four new folio genres
// generate pages that clear under the same generic anomaly rules every other genre already obeys.
import { describe, expect, test } from "bun:test";
import { type ContractKind, rollContract } from "../src/content/contracts";
import { FOLIO_TEMPLATES, ROT_TOKENS } from "../src/content/folios";
import { TILDE_COSMETICS, TILDE_FRAMES, TILDE_QUIPS, type TildeMood } from "../src/content/tilde";
import { evaluateFolio, type Folio, type FolioAnomaly, generateFolio } from "../src/vim/folio";

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

const NEW_GENRES = ["haiku-folio", "patch-diff", "schema-config", "cursed-json"] as const;

const CONTRACT_KINDS: readonly ContractKind[] = [
  "clean-cuts",
  "folio-clear",
  "no-hjkl-folio",
  "flow-reach",
  "pet-tilde",
  "anomaly-clear",
];

const SERIALS = Array.from({ length: 200 }, (_, index) => index * 3 + 1);
const ACTS = [1, 2, 3, 4, 5, 6, 7] as const;

/** The work each kind may ask for, straight off the Beta brief. */
const TARGET_RANGE: Readonly<Record<ContractKind, readonly [number, number]>> = {
  "clean-cuts": [3, 5],
  "folio-clear": [2, 3],
  "no-hjkl-folio": [1, 1],
  "flow-reach": [8, 15],
  "pet-tilde": [1, 2],
  "anomaly-clear": [6, 10],
};

/** Mend one anomaly by content alone, the way a player would, never by stored line index. */
function mend(lines: readonly string[], anomaly: FolioAnomaly): string[] {
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
    if (left < 0 || right < 0) return out;
    const held = out[left];
    const other = out[right];
    if (held === undefined || other === undefined) return out;
    out[left] = other;
    out[right] = held;
    return out;
  }

  if (anomaly.kind === "broken-refrain") {
    const expected = anomaly.expectedLine;
    if (expected === null) return out;
    const at = out.indexOf(expected);
    const copies = out.filter((line) => line === expected).length;
    if (at >= 0 && copies < 2) out.splice(at + 1, 0, expected);
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

/** Mend every anomaly on the page and hand the page back. */
function clearFolio(folio: Folio): string[] {
  let page = [...folio.lines];
  for (const anomaly of folio.anomalies) page = mend(page, anomaly);
  return page;
}

describe("Errata Slips", () => {
  test("the same serial and act always roll the same slip", () => {
    for (const act of ACTS) {
      for (const serial of SERIALS) {
        const first = rollContract(serial, act);
        const second = rollContract(serial, act);
        expect(JSON.stringify(second)).toBe(JSON.stringify(first));
      }
    }
    // A handful of serials must not all collapse onto one slip.
    const rolled = new Set(SERIALS.map((serial) => rollContract(serial, 4).title));
    expect(rolled.size).toBeGreaterThan(3);
  });

  test("every slip starts empty, unfinished and honest about its pay", () => {
    for (const act of ACTS) {
      for (const serial of SERIALS) {
        const slip = rollContract(serial, act);
        expect(slip.progress).toBe(0);
        expect(slip.completed).toBe(false);
        expect(slip.serial).toBe(serial);
        expect(slip.id).toBe(`errata-${serial}`);
        expect(CONTRACT_KINDS).toContain(slip.kind);
        expect(slip.title.length).toBeGreaterThan(4);
        expect(Number.isInteger(slip.target)).toBe(true);
        expect(slip.target).toBeGreaterThanOrEqual(1);
        expect(Number.isInteger(slip.rewardAmount)).toBe(true);
        expect(slip.rewardAmount).toBeGreaterThanOrEqual(1);
        expect(["treats", "shards"]).toContain(slip.rewardCurrency);
      }
    }
  });

  test("each kind asks for the bite-sized work the Beta brief names", () => {
    for (const act of ACTS) {
      for (const serial of SERIALS) {
        const slip = rollContract(serial, act);
        const [low, high] = TARGET_RANGE[slip.kind];
        expect(slip.target).toBeGreaterThanOrEqual(low);
        expect(slip.target).toBeLessThanOrEqual(high);
      }
    }
  });

  test("a clean Folio without hjkl is never asked of an Act I reader", () => {
    for (const serial of SERIALS) {
      expect(rollContract(serial, 1).kind).not.toBe("no-hjkl-folio");
    }
    // But Act II and beyond do hand it out, or the slip would be dead content.
    const later = new Set(SERIALS.map((serial) => rollContract(serial, 2).kind));
    expect(later.has("no-hjkl-folio")).toBe(true);
  });

  test("an Act I slip is always Act I work: no shard asks for a fresh reader", () => {
    for (const serial of SERIALS) {
      const slip = rollContract(serial, 1);
      expect(slip.rewardCurrency).toBe("treats");
      expect(slip.kind).not.toBe("no-hjkl-folio");
    }
  });

  test("a nonsense serial still hands back a usable slip", () => {
    for (const serial of [0, -1, -99, 1.7, Number.NaN]) {
      const slip = rollContract(serial, 1);
      expect(slip.target).toBeGreaterThanOrEqual(1);
      expect(slip.completed).toBe(false);
      expect(CONTRACT_KINDS).toContain(slip.kind);
    }
  });
});

describe("Tilde's moods and wardrobe", () => {
  const MOODS: readonly TildeMood[] = ["nap", "alert", "purr", "moth", "typing", "celebrate", "startle"];

  test("every mood has frames, and they hold their width", () => {
    expect(Object.keys(TILDE_FRAMES).sort()).toEqual([...MOODS].sort());
    for (const mood of MOODS) {
      const frames = TILDE_FRAMES[mood];
      expect(frames.length).toBeGreaterThan(0);
      const widths = new Set(frames.map((frame) => frame.length));
      expect(widths.size).toBe(1);
      for (const frame of frames) {
        expect(frame.length).toBeGreaterThan(8);
        expect(frame.startsWith("~ ")).toBe(true);
        expect(frame.trim()).toBe(frame);
      }
    }
  });

  test("the two new reactions have their own faces", () => {
    expect(TILDE_FRAMES.celebrate.join("")).not.toBe(TILDE_FRAMES.startle.join(""));
    expect(TILDE_FRAMES.celebrate[0]).toContain("★");
    expect(TILDE_FRAMES.startle[0]).toContain("O");
  });

  test("her wardrobe is unique, ordered by Bond and unlocked gradually", () => {
    const ids = TILDE_COSMETICS.map((cosmetic) => cosmetic.id);
    expect(new Set(ids).size).toBe(ids.length);

    const first = TILDE_COSMETICS[0];
    expect(first?.id).toBe("none");
    expect(first?.minBond).toBe(0);
    expect(first?.badge).toBe("");

    for (let index = 0; index < TILDE_COSMETICS.length; index += 1) {
      const cosmetic = TILDE_COSMETICS[index];
      if (!cosmetic) continue;
      expect(cosmetic.name.length).toBeGreaterThan(2);
      expect(Number.isInteger(cosmetic.minBond)).toBe(true);
      expect(cosmetic.minBond).toBeGreaterThanOrEqual(0);
      if (index > 0) {
        const previous = TILDE_COSMETICS[index - 1];
        expect(previous).toBeDefined();
        expect(cosmetic.minBond).toBeGreaterThan(previous?.minBond ?? -1);
        expect(cosmetic.badge.length).toBeGreaterThan(0);
      }
    }

    // A reader who never pets her still has the first rung, and the last one is a real climb.
    expect(TILDE_COSMETICS.length).toBeGreaterThanOrEqual(4);
    const last = TILDE_COSMETICS[TILDE_COSMETICS.length - 1];
    expect(last?.minBond ?? 0).toBeGreaterThanOrEqual(10);
  });

  test("her opinions are all still there, and none repeat", () => {
    expect(TILDE_QUIPS.length).toBe(27);
    expect(new Set(TILDE_QUIPS).size).toBe(27);
    for (const quip of TILDE_QUIPS) expect(quip.length).toBeGreaterThan(8);
  });
});

describe("the four new folio genres", () => {
  const newTemplates = FOLIO_TEMPLATES.filter((template) =>
    (NEW_GENRES as readonly string[]).includes(template.genre),
  );

  test("two clean pages per new genre, every one a page of 10 to 12 lines", () => {
    for (const genre of NEW_GENRES) {
      const pages = newTemplates.filter((template) => template.genre === genre);
      expect(pages.length).toBe(2);
    }
    expect(newTemplates.length).toBe(8);

    const ids = new Set(FOLIO_TEMPLATES.map((template) => template.id));
    expect(ids.size).toBe(FOLIO_TEMPLATES.length);

    for (const template of newTemplates) {
      expect(template.title.length).toBeGreaterThan(4);
      expect(template.lines.length).toBeGreaterThanOrEqual(10);
      expect(template.lines.length).toBeLessThanOrEqual(12);
      expect(new Set(template.lines).size).toBe(template.lines.length);
      for (const line of template.lines) {
        expect(line.length).toBeGreaterThan(4);
        for (const token of ROT_TOKENS) expect(line).not.toContain(token);
      }
    }
  });

  test("no new page repeats a distinctive token across two lines", () => {
    // `evaluateFolio` clears a rot when its target text is gone, and falls back to "the clean span
    // appears somewhere on the page". A quoted key, an identifier or an uppercase token carried by
    // two lines would let deleting one of them read as a repair, so the new pages keep each of
    // those to a single line.
    for (const template of newTemplates) {
      const carriers = new Map<string, number>();
      for (let index = 0; index < template.lines.length; index += 1) {
        const line = template.lines[index] ?? "";
        const tokens = [
          ...[...line.matchAll(/[A-Z][A-Z0-9_]{2,}/g)].map((match) => match[0]),
          ...[...line.matchAll(/[A-Za-z0-9_.#/@-]*[0-9][A-Za-z0-9_.#/@-]*/g)]
            .filter((match) => match[0].length >= 2)
            .map((match) => match[0]),
          ...[...line.matchAll(/"([^"]+)"/g)].map((match) => `"${match[1] ?? ""}"`),
          ...[...line.matchAll(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g)].map((match) => match[0]),
        ];

        for (const token of tokens) {
          const seenAt = carriers.get(token);
          if (seenAt === undefined) carriers.set(token, index);
          expect(seenAt ?? index).toBe(index);
        }
      }
    }
  });

  test("the new pages generate, and every anomaly on them can be mended", () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 240; seed += 1) {
      const folio = generateFolio({
        seed,
        unlocked: ALL_FAMILIES,
        actTier: 4,
        challengeRules: [],
      });

      expect(folio.lines.length).toBeGreaterThanOrEqual(10);
      expect(folio.anomalies.length).toBeGreaterThanOrEqual(2);
      expect(folio.anomalies.length).toBeLessThanOrEqual(5);
      expect(evaluateFolio(folio.lines, folio, {}).newlyResolved.length).toBe(0);

      const page = clearFolio(folio);
      const result = evaluateFolio(page, folio, {});
      expect(result.newlyResolved.length).toBe(folio.anomalies.length);
      expect(result.allResolved).toBe(true);

      // A line the page never asked about cannot mend anything by disappearing.
      const untouched = folio.lines.findIndex(
        (_line, index) => !folio.anomalies.some((anomaly) => anomaly.line === index),
      );
      if (untouched >= 0) {
        const pruned = [...folio.lines];
        pruned.splice(untouched, 1);
        expect(evaluateFolio(pruned, folio, {}).newlyResolved.length).toBe(0);
      }

      seen.add(folio.title);
    }

    // Every new page shows up in the rotation, so the content is reachable and not merely valid.
    for (const template of newTemplates) expect(seen.has(template.title)).toBe(true);
  });

  test("a new page clears at every act tier", () => {
    for (const act of ACTS) {
      for (let seed = 0; seed < 12; seed += 1) {
        const folio = generateFolio({
          seed: seed * 7 + 3,
          unlocked: ALL_FAMILIES,
          actTier: act,
          challengeRules: [],
        });
        expect(evaluateFolio(clearFolio(folio), folio, {}).allResolved).toBe(true);
      }
    }
  });
});
