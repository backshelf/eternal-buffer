/**
 * Shared human-like pilot for `sim/run.ts` and `sim/fit.ts`.
 *
 * Both the pacing sim and the fit must play the exact same player so fitted prices hold on replay.
 * Every decision here uses only the store's real public actions and is purely deterministic over
 * `(GameState, now)` with no hidden mutable state, so `proveFit` replays any snapshot identically.
 */
import { D } from "watchpot/core";
import { CHALLENGES } from "../src/content/challenges";
import { MOSAIC_PIECES } from "../src/content/mosaic";
import { GRAMMAR_CODEX, type KeyFamilyId } from "../src/content/vimActs";
import type { GameState } from "../src/game/game";
import { activeVimRateOf } from "../src/game/income";
import { autoArrangeMosaic, crafting, held } from "../src/game/mosaic";
import { volumeGain } from "../src/game/prestige";
import { type AnomalyKind, generateFolio } from "../src/vim/folio";

/** One active anomaly edit per ~4 s of attended play. */
export const EDIT_EVERY_MS = 4_000;

/** Pet Tilde roughly once a minute of attended play (cooldown is 30 s, a human is less robotic). */
const PET_EVERY_MS = 60_000;

/** Bail out of a trial if it somehow stalls longer than this (12 minutes). */
const TRIAL_BAIL_MS = 12 * 60_000;

/** Organic Grammar Codex discovery cadence: one extra unlocked combo every N cleared folios. */
const ORGANIC_PAIR_EVERY_FOLIOS = 12;

/** Preferred Act VII `.vimrc` loadout, in priority order (fills up to `vimrcSlots`: 5, or 6 after macro-trial). */
const PREFERRED_VIMRC: readonly string[] = [
  "split-resonance", // 2 slots
  "fast-flow", // 1 slot
  "echo-chain", // 1 slot
  "cat-familiar", // 1 slot
  "ink-siphon", // 1 slot (opens with 6th slot)
];

/**
 * Mosaic crafting preference order with per-piece caps so the pilot builds a diverse, synergistic
 * board rather than filling 16 cells with identical starter caps.
 */
const MOSAIC_PLAN: readonly { readonly id: string; readonly max: number }[] = [
  { id: "tilde-cushion", max: 1 },
  { id: "null-key", max: 1 },
  { id: "ex-prism", max: 3 },
  { id: "wax-matrix", max: 3 },
  { id: "spool-macro", max: 3 },
  { id: "lantern", max: 2 },
  { id: "dither-lens", max: 2 },
  { id: "cap-obj", max: 3 },
  { id: "cap-op", max: 3 },
  { id: "switch-heavy", max: 3 },
  { id: "switch-tactile", max: 3 },
  { id: "inkwell", max: 2 },
  { id: "cap-word", max: 4 },
  { id: "cap-hjkl", max: 4 },
];

/** Keycap families a real player needs unlocked before they can type each Grammar Codex pair. */
const PAIR_FAMILIES: Readonly<Record<string, readonly KeyFamilyId[]>> = {
  "d+w": ["op-delete", "word-stride"],
  "d+$": ["op-delete", "line-edge"],
  "d+gg": ["op-delete", "file-jump"],
  "d+G": ["op-delete", "file-jump"],
  "d+f": ["op-delete", "char-snipe"],
  "d+t": ["op-delete", "char-snipe"],
  "d+dd": ["op-delete"],
  "c+w": ["op-change", "word-stride"],
  "c+$": ["op-change", "line-edge"],
  "c+cc": ["op-change"],
  "c+f": ["op-change", "char-snipe"],
  "y+w": ["op-yank", "word-stride"],
  "y+$": ["op-yank", "line-edge"],
  "y+yy": ["op-yank"],
  "d+iw": ["op-delete", "text-objects"],
  "d+aw": ["op-delete", "text-objects"],
  'd+i"': ["op-delete", "text-objects"],
  'd+a"': ["op-delete", "text-objects"],
  "d+i(": ["op-delete", "text-objects"],
  "d+i{": ["op-delete", "text-objects"],
  "d+it": ["op-delete", "text-objects"],
  "c+iw": ["op-change", "text-objects"],
  "c+aw": ["op-change", "text-objects"],
  'c+i"': ["op-change", "text-objects"],
  "c+i(": ["op-change", "text-objects"],
  "c+it": ["op-change", "text-objects"],
  "c+i{": ["op-change", "text-objects"],
  "y+iw": ["op-yank", "text-objects"],
  'y+i"': ["op-yank", "text-objects"],
  "y+i(": ["op-yank", "text-objects"],
  "Ctrl-v+d": ["visual-modes", "op-delete"],
  "Ctrl-v+c": ["visual-modes", "op-change"],
  "v+d": ["visual-modes", "op-delete"],
  "V+d": ["visual-modes", "op-delete"],
  "V+y": ["visual-modes", "op-yank"],
  "v+~": ["visual-modes", "line-craft"],
  "/+n": ["search-jump"],
  "*+n": ["search-jump"],
  ":%s": ["substitute"],
  "q+@": ["macros"],
  "@+@": ["macros"],
  dot: ["dot-echo"],
  ":g/d": ["ex-power"],
  ":sort": ["ex-power"],
  ":vsplit": ["dual-split"],
};

/** Signature Grammar Codex pairs naturally typed when mending each anomaly kind. */
const ANOMALY_PAIRS: Partial<Readonly<Record<AnomalyKind, readonly string[]>>> = {
  "blighted-verse": ["d+dd"],
  "rotten-word": ["c+w", "d+w"],
  "broken-refrain": ["y+yy"],
  "quoted-curse": ['c+i"', 'd+i"'],
  "column-rot": ["Ctrl-v+d"],
  "scattered-sigil": [":%s"],
  "echo-hunt": ["*+n"],
  "ritual-table": ["dot", "q+@"],
  "sorted-canon": [":sort"],
  "global-purge": [":g/d"],
};

function hashUnit(material: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < material.length; i += 1) {
    hash ^= material.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return (hash >>> 0) / 4_294_967_296;
}

function canUsePair(unlocked: Readonly<Record<string, true>>, pairId: string): boolean {
  const reqs = PAIR_FAMILIES[pairId];
  if (!reqs) return false;
  return reqs.every((id) => unlocked[id] === true);
}

/** Realistic human keystroke count for an anomaly, improving as the player masters that idiom. */
function humanKeysUsed(s: GameState, anomalyId: string, hintId: string, parKeys: number): number {
  const roll = hashUnit(`${anomalyId}|${s.vim.folioSerial}|grade`);
  if (s.trials.rules.includes("parOnly")) {
    return roll < 0.9 ? parKeys : parKeys + 2;
  }
  const mastery = s.vim.hintMastery[hintId] ?? 0;
  const cleanP = mastery < 2 ? 0.55 : mastery < 5 ? 0.72 : 0.86;
  const tidyP = mastery < 2 ? 0.88 : mastery < 5 ? 0.94 : 0.97;
  if (roll < cleanP) return parKeys;
  if (roll < tidyP) return parKeys + 2;
  return parKeys + 5;
}

export interface PilotStore {
  getState(): GameState;
}

/**
 * Plays one realistic human active edit on the folio on screen: realistic par grading, Act VI+ dot/macro
 * echo stacks, signature & organic Grammar Codex pair discovery, and folio clearing.
 */
export function playPilotEdit(store: PilotStore): boolean {
  const s = store.getState();
  const riteFamily = s.vim.pendingRiteFamily ?? undefined;
  const folio = generateFolio({
    seed: s.vim.folioSeed,
    unlocked: s.vim.unlockedFamilies,
    actTier: s.vim.actTier,
    riteFamily,
    challengeRules: s.trials.rules,
  });

  const next = folio.anomalies.find((anomaly) => s.vim.resolvedAnomalyIds[anomaly.id] !== true);
  if (!next) return false;

  // Act VI+ players use `.` / `@a` to echo repeated edits on a folio and during the Macro trial.
  const hasDot = s.vim.unlockedFamilies["dot-echo"] === true;
  const hasMacros = s.vim.unlockedFamilies.macros === true;
  if (
    (hasDot || hasMacros) &&
    (s.trials.rules.includes("macroTrial") ||
      next.kind === "ritual-table" ||
      Object.keys(s.vim.resolvedAnomalyIds).length > 0)
  ) {
    s.vim.noteEcho(hasMacros ? "macro" : "dot");
  }

  const keysUsed = humanKeysUsed(s, next.id, next.hintId, next.parKeys);
  s.vim.resolveAnomaly(next.id, keysUsed, next.parKeys, next.hintId, next.weight, next.kind === "pawprint");

  // Record signature Grammar Codex pairs naturally typed for this anomaly.
  const afterEdit = store.getState();
  for (const pairId of ANOMALY_PAIRS[next.kind] ?? []) {
    if (
      afterEdit.vim.discoveredPairs[pairId] !== true &&
      canUsePair(afterEdit.vim.unlockedFamilies, pairId)
    ) {
      afterEdit.vim.recordGrammar(pairId);
    }
  }

  const allResolved = folio.anomalies.every(
    (anomaly) => store.getState().vim.resolvedAnomalyIds[anomaly.id] === true,
  );
  if (allResolved) {
    store.getState().vim.completeFolio(folio.isRite, riteFamily as KeyFamilyId | undefined);
    // Organic exploration: every ~12 cleared folios, a real Vim learner tries another unlocked grammar combo.
    const cleared = store.getState();
    if (cleared.vim.totalFoliosCleared % ORGANIC_PAIR_EVERY_FOLIOS === 0) {
      const nextPair = GRAMMAR_CODEX.find(
        (entry) =>
          cleared.vim.discoveredPairs[entry.id] !== true &&
          canUsePair(cleared.vim.unlockedFamilies, entry.id),
      );
      if (nextPair) cleared.vim.recordGrammar(nextPair.id);
    }
  }

  return true;
}

/** How many cells are currently open on the Plugin Mosaic (4×4 → 5×5 → 6×6). */
function openMosaicCells(s: GameState): number {
  if (s.wallet.codicesEver.gte(3)) return 36;
  if (s.wallet.sealsEver.gte(25)) return 25;
  return 16;
}

/** Remember the last `(totalHeld, openCells)` arranged per store so we don't re-run greedy `fillBoard`
 * every 15 s when a piece was intentionally left unplaced (e.g. `null-key` without `tilde-cushion`). */
const lastMosaicSig = new WeakMap<object, string>();

function queuedCrafts(s: GameState, id: string): number {
  const job = crafting.select.job(s, id);
  return job ? Math.max(0, job.times - job.done) : 0;
}

/**
 * Plays the human-driven side systems that the engine's generic `autoPlayer` does not declare moves for:
 * petting Tilde, crafting & auto-arranging the Plugin Mosaic, entering Skill Trials when ready, and
 * enabling Act VII `:vsplit` + `.vimrc` rules.
 *
 * Returns `true` if any meaningful action occurred (for quiet-stretch tracking).
 */
export function playPilotSideSystems(store: PilotStore, now: number): boolean {
  let acted = false;
  let s = store.getState();

  // 1. Pet Tilde roughly once a minute of attended play.
  if (now - s.vim.lastPetAt >= PET_EVERY_MS) {
    if (s.vim.petTilde().ok) acted = true;
  }

  // 2. Act VII: turn on `:vsplit` and equip `.vimrc` rules as slots open.
  s = store.getState();
  if (s.vim.unlockedFamilies["dual-split"] === true && !s.vim.activeSplit) {
    s.vim.setDualSplit(true);
    s.vim.recordGrammar(":vsplit");
    acted = true;
  }
  s = store.getState();
  if (s.vim.unlockedFamilies["vimrc-forge"] === true && s.vim.actTier === 7) {
    for (const ruleId of PREFERRED_VIMRC) {
      const cur = store.getState();
      if (cur.vim.vimrcRules[ruleId] === true) continue;
      if (cur.vim.toggleVimrcRule(ruleId)) acted = true;
    }
  }

  // 3. Plugin Mosaic: craft diverse unlocked pieces up to open grid capacity, then Auto-Arrange when changed.
  s = store.getState();
  const openCells = openMosaicCells(s);
  let totalOwnedAndQueued = 0;
  let totalHeld = 0;
  for (const piece of MOSAIC_PIECES) {
    const h = held(s, piece.id);
    totalHeld += h;
    totalOwnedAndQueued += h + queuedCrafts(s, piece.id);
  }
  if (totalOwnedAndQueued < openCells) {
    for (const entry of MOSAIC_PLAN) {
      const owned = held(s, entry.id) + queuedCrafts(s, entry.id);
      if (owned >= entry.max) continue;
      if (crafting.select.craftable(s, entry.id) >= 1) {
        if (s.crafting.craft(entry.id, 1)) {
          acted = true;
          break;
        }
      }
    }
  }
  s = store.getState();
  totalHeld = 0;
  for (const piece of MOSAIC_PIECES) totalHeld += held(s, piece.id);
  const placedCount = Object.keys(s.mosaic.cells).length;
  const sig = `${totalHeld}/${openCells}/${placedCount}`;
  if (placedCount < Math.min(totalHeld, openCells) && lastMosaicSig.get(store) !== sig) {
    const layout = autoArrangeMosaic(s);
    if (Object.keys(layout).length > placedCount) {
      s.mosaic.lay(layout);
      acted = true;
    }
    const afterLay = Object.keys(store.getState().mosaic.cells).length;
    lastMosaicSig.set(store, `${totalHeld}/${openCells}/${afterLay}`);
  }

  // 4. Skill Trials: enter an unlocked, non-maxed trial once current active output can comfortably clear it.
  s = store.getState();
  if (s.trials.active !== null) {
    if (now - s.trials.startedAt > TRIAL_BAIL_MS) {
      s.trials.exit();
    }
  } else {
    // Do not throw away a ready `:w` bind; enter trials between binds.
    const pendingSeals = volumeGain(s);
    const nearBind = pendingSeals.gte(1) && pendingSeals.gte(s.wallet.seals.mul(1.5));
    if (!nearBind) {
      const activeRate = activeVimRateOf(s);
      for (const trial of CHALLENGES) {
        if (trial.id === "macro-trial" && s.vim.unlockedFamilies.macros !== true) continue;
        if (
          s.trials.completions[trial.id] !== undefined &&
          (s.trials.completions[trial.id] ?? 0) >= trial.maxCompletions
        ) {
          continue;
        }
        // Check unlock directly (matches `trials.def`), and require ~25 s of current active output >= goal
        // so that even after losing run upgrades & Flow on entry, the trial clears cleanly in ~1–4 min.
        if (
          s.wallet.sealsEver.gte(trial.minSeals) &&
          s.wallet.codicesEver.gte(trial.minCodices) &&
          activeRate.mul(25).gte(D(trial.goalGlyphs))
        ) {
          const err = s.trials.enter(trial.id);
          if (err === null) {
            acted = true;
            break;
          }
        }
      }
    }
  }

  return acted;
}
