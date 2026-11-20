// The core invention: the Vim feature.
//
// Everything here is pure TypeScript over the store state. It imports no DOM and no CodeMirror, so the
// sim, `plainParity` and the tests play exactly the edits the editor does.
//
// Two promises shape the state:
//   1. Muscle memory is permanent. `:w` and `:wq` reset the run, never a keycap family, a Practice Rite,
//      a discovered Grammar Codex pair, Tilde's bond or an Easter egg. The custom `reset` below carries
//      every permanent field over and puts only the run's transient fields back.
//   2. Nothing random comes from the wall. Folio seeds roll through a hash of the seed and the serial,
//      and the treat and shard drops come from the same hash of the anomaly id, so a reload replays the
//      same page and a seeded test says the same thing every time.
import { type BuffsState, D, type Decimal, defineFeature, type Move, reach, startBuff } from "watchpot/core";
import { EGG_BY_ID } from "../content/easterEggs";
import {
  BASE_EDIT_GLYPHS,
  CODEX_PAIR_MULT,
  FLOW_DECAY_MS,
  FLOW_PER_STACK,
  FOLIO_CLEAR_MULT,
  PAR_CRIT_MULT,
  TIDY_EDIT_MULT,
} from "../content/economy";
import { TILDE_BOND_STEP, TILDE_PET_COOLDOWN_MS, tildeTreatCost } from "../content/tilde";
import { KEY_FAMILIES, type KeyFamilyId, VIMRC_RULES } from "../content/vimActs";
import { VISITOR_BUFFS, type VisitorBuffId } from "../content/visitor";
import { generateFolio } from "../vim/folio";
import { wallet } from "./wallet";

/** The par scoring grades: at or under par, within three keys of it, or anything longer. */
export type VimGrade = "clean" | "tidy" | "mended";

/** What one resolved anomaly paid and dropped. */
export interface ResolvedAnomaly {
  grade: VimGrade;
  paid: Decimal;
  shardDrop: boolean;
  treatDrop: boolean;
}

/** What clearing a folio paid, and the seed the next one is drawn from. */
export interface FolioClear {
  bonus: Decimal;
  nextSeed: number;
}

/** Tilde's answer to a pet: whether she allowed it, and the bond level after it. */
export interface TildePetResult {
  ok: boolean;
  bond: number;
}

/**
 * The feature's saved state. Everything down to `highestAct` is permanent: no reset touches it.
 * `flow` onward is the run's: a `:w` or a `:wq` puts it back.
 */
export interface VimState {
  /** The Keycap Families bought, by id. Permanent. */
  unlockedFamilies: Record<string, true>;
  /** The Practice Rites finished, by family id. Permanent. */
  completedRites: Record<string, true>;
  /** The Grammar Codex pairs discovered, by pair id. Permanent. */
  discoveredPairs: Record<string, true>;
  /** Clean Cuts landed per idiom (`hintId`): at five, the whisper retires. Permanent. */
  hintMastery: Record<string, number>;
  /** Tilde's bond, in whole levels. Permanent. */
  tildeBond: number;
  tildePets: number;
  pawprintsCleaned: number;
  totalFoliosCleared: number;
  totalCleanCuts: number;
  totalAnomaliesCleared: number;
  /** The Easter eggs found, by id. Permanent. */
  easterEggsFound: Record<string, true>;
  /** The `.vimrc` rules switched on, by id. Permanent. */
  vimrcRules: Record<string, true>;
  /** Whether both halves of a `:vsplit` are live. Permanent. */
  activeSplit: boolean;
  arrowShameCount: number;
  escPanicCount: number;
  highestAct: 1 | 2 | 3 | 4 | 5 | 6 | 7;

  /** The Flow streak, in stacks, never above `flowCap`. Run-scoped. */
  flow: number;
  /** Silent milliseconds since the last stack fell. Run-scoped. */
  flowDecayMs: number;
  /** Game time of the last active edit. Run-scoped. */
  lastFlowAt: number;
  /** Game time until which Flow does not decay (the tab-away grace). Run-scoped. */
  graceUntil: number;
  /** Moves on every reset and every folio roll, so a folio is named and seeded differently each time. */
  folioSerial: number;
  /** The seed of the folio on screen. Deterministic, so a reload shows the same page. Run-scoped. */
  folioSeed: number;
  runFolios: number;
  /** The anomalies already cleared on the folio on screen, by id. Run-scoped. */
  resolvedAnomalyIds: Record<string, true>;
  /** Dot and macro echoes in the current folio, capped at nine. Run-scoped. */
  echoStacks: number;
  /** The family whose Practice Rite is owed next, or null. Run-scoped. */
  pendingRiteFamily: string | null;
  /** An EWMA of the Glyphs a second of active play makes, for the HUD and the sim. Run-scoped. */
  recentActiveRate: Decimal;
  /** Game time of the last pet, for the cooldown. Run-scoped. */
  lastPetAt: number;
}

/** The values worked out from the state: never saved, never written. */
export interface VimDerived {
  /** The most Flow stacks the run can hold. */
  flowCap: number;
  /** The Flow multiplier on a payout. `tempo` is applied by the action that pays, not here. */
  flowMult: Decimal;
  /** What every discovered Grammar Codex pair multiplies output by. */
  codexPairMult: Decimal;
  /** What the finished Practice Rites multiply output by: linear, so twenty-one rites are ×6.25. */
  riteMult: Decimal;
  /** Tilde's bond on Clarity. */
  tildeClarityMult: Decimal;
  /** Tilde's bond on Ink Flow. */
  tildeInkMult: Decimal;
  /** The highest Act among the unlocked families, at least I. The key prices are the real gate. */
  actTier: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  /** What one par edit pays at this Act, before every multiplier. */
  activeGlyphsPerEdit: Decimal;
  /** What a second of active play is worth now, without the stats: for the sim and the HUD. */
  expectedActivePerSec: Decimal;
}

/** The one `.vimrc` slot count the Forge opens with. */
const VIMRC_SLOTS = 5;
/** The share of anomalies that press a treat into your palm, and the share that leaves a shard. */
const TREAT_DROP_SHARE = 0.15;
const SHARD_DROP_SHARE = 0.05;
/** How far a mended edit may run over par and still count as tidy. */
const TIDY_SLACK = 3;
/** The most echoes a folio holds. */
const ECHO_CAP = 9;
/** How fast the active-rate EWMA forgets: a twelve-second half-life, roughly. */
const RATE_DECAY_MS = 8_000;

// ---------------------------------------------------------------------------------------------
// Deterministic draws
// ---------------------------------------------------------------------------------------------

/** FNV-1a over a string, as an unsigned 32-bit integer. The same material always hashes the same. */
function hashInt(material: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < material.length; index += 1) {
    hash ^= material.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** A number in [0, 1) from a string: a drop roll that no wall clock or random source can move. */
function hashUnit(material: string): number {
  return hashInt(material) / 4_294_967_296;
}

/** The next folio's seed: the folio on screen and its serial, so the same save always shows the same page. */
function rollSeed(seed: number, serial: number): number {
  return hashInt(`${seed}:${serial}`);
}

// ---------------------------------------------------------------------------------------------
// Draft helpers: the same rule whether an action or the sim calls it
// ---------------------------------------------------------------------------------------------

/**
 * What the draft helpers below read or write: the feature's own slice, the wallet (only through
 * `wallet.draft`), and the three features built in parallel and reached by their state type.
 */
interface VimHost {
  vim: VimState & VimDerived;
  /** Read only through `wallet.draft.debit` and `wallet.draft.credit`, which need the slice present. */
  wallet: object;
  stats: { output: Decimal; tempo: Decimal };
  trials: { rules: string[] };
  boosts: BuffsState;
}

/** The trial restriction in force, read straight off the challenges feature's flags. */
function trialRule(s: VimHost, flag: string): boolean {
  return s.trials.rules.includes(flag);
}

/** The grade of an edit against its par: at or under, within three keys, or anything longer. */
function gradeOf(keysUsed: number, parKeys: number): VimGrade {
  if (keysUsed <= parKeys) return "clean";
  if (keysUsed <= parKeys + TIDY_SLACK) return "tidy";
  return "mended";
}

/** The par multiplier for a grade. */
function parMultOf(grade: VimGrade): number {
  if (grade === "clean") return PAR_CRIT_MULT;
  if (grade === "tidy") return TIDY_EDIT_MULT;
  return 1;
}

/**
 * Starts one of Tilde's blessings over the reached buffs slice. The buffs are a feature reached by their
 * state's type (it is built in parallel and wired in Wave 4), so the rule comes from the content and the
 * kernel writes it, exactly as `boosts.draft.start` would.
 */
function startTildeBuff(s: VimHost, id: VisitorBuffId, now: number): void {
  const rule = VISITOR_BUFFS.find((buff) => buff.id === id);
  if (!rule) return;
  s.boosts = startBuff(s.boosts, { id: rule.id, durationMs: rule.durationMs, stack: rule.stack }, now);
}

/**
 * Pays one resolved anomaly. Flow's multiplier and the tempo stat are read at payout time, before this
 * edit moves either, and the whole sum is Decimals: no comparison ever touches an operator.
 */
function resolveAnomalyIn(
  s: VimHost,
  now: number,
  anomalyId: string,
  keysUsed: number,
  parKeys: number,
  hintId: string,
  weight: number,
  isPawprint: boolean,
): ResolvedAnomaly {
  const grade = gradeOf(keysUsed, parKeys);

  // A folio re-evaluated after it was already paid for pays nothing, whatever the grade.
  if (s.vim.resolvedAnomalyIds[anomalyId] === true) {
    return { grade, paid: D(0), shardDrop: false, treatDrop: false };
  }

  // `stats.output` already carries the Grammar Codex and Practice Rite multipliers (and Tilde's bond), so the payout
  // multiplies only the run's own Flow and tempo on top of it.
  let paid = s.vim.activeGlyphsPerEdit
    .mul(weight)
    .mul(parMultOf(grade))
    .mul(s.vim.flowMult)
    .mul(s.stats.tempo)
    .mul(s.stats.output);

  // One-Shot Surgeon: slop pays nothing at all.
  if (trialRule(s, "parOnly") && keysUsed > parKeys) paid = D(0);
  // The One-Macro Epoch: echoes pay five times over, raw edits a tenth.
  if (trialRule(s, "macroTrial")) paid = paid.mul(s.vim.echoStacks > 0 ? 5 : 0.1);

  wallet.draft.credit(s, "glyphs", paid);

  const drop = hashUnit(`${anomalyId}|${s.vim.folioSerial}`);
  const treatDrop = drop < TREAT_DROP_SHARE;
  const shardDrop = !treatDrop && drop < TREAT_DROP_SHARE + SHARD_DROP_SHARE;
  if (treatDrop) wallet.draft.credit(s, "treats", 1);
  if (shardDrop) wallet.draft.credit(s, "shards", 1);

  s.vim.resolvedAnomalyIds[anomalyId] = true;
  s.vim.totalAnomaliesCleared += 1;
  s.vim.recentActiveRate = s.vim.recentActiveRate.mul(0.75).add(paid.div(5));
  if (isPawprint) s.vim.pawprintsCleaned += 1;

  if (grade === "clean") {
    s.vim.totalCleanCuts += 1;
    s.vim.hintMastery[hintId] = (s.vim.hintMastery[hintId] ?? 0) + 1;
    s.vim.flow = Math.min(s.vim.flowCap, s.vim.flow + 2);
  } else if (grade === "tidy") {
    s.vim.flow = Math.min(s.vim.flowCap, s.vim.flow + 1);
  }
  // A mended edit never costs Flow: it still counts as work, so the timer restarts.
  s.vim.lastFlowAt = now;
  s.vim.flowDecayMs = 0;

  return { grade, paid, shardDrop, treatDrop };
}

/** Clears the folio on screen: pays the burst, banks a Practice Rite, and rolls the next page. */
function completeFolioIn(s: VimHost, isRite: boolean, riteFamily?: string): FolioClear {
  const seed = s.vim.folioSeed;
  if (Object.keys(s.vim.resolvedAnomalyIds).length === 0) return { bonus: D(0), nextSeed: seed };

  const bonus = s.vim.activeGlyphsPerEdit.mul(FOLIO_CLEAR_MULT).mul(s.vim.flowMult).mul(s.stats.output);
  wallet.draft.credit(s, "glyphs", bonus);

  s.vim.totalFoliosCleared += 1;
  s.vim.runFolios += 1;
  s.vim.resolvedAnomalyIds = {};
  s.vim.echoStacks = 0;
  if (isRite && riteFamily !== undefined) {
    s.vim.completedRites[riteFamily] = true;
    s.vim.pendingRiteFamily = null;
  }

  const serial = s.vim.folioSerial + 1;
  const nextSeed = rollSeed(seed, serial);
  s.vim.folioSeed = nextSeed;
  s.vim.folioSerial = serial;
  s.vim.flow = Math.min(s.vim.flowCap, s.vim.flow + 3);

  return { bonus, nextSeed };
}

/** Plays one headless active edit on the folio on screen, exactly as a Clean Cut would. */
function simulateActiveEditIn(s: VimHost, now: number): boolean {
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

  resolveAnomalyIn(
    s,
    now,
    next.id,
    next.parKeys,
    next.parKeys,
    next.hintId,
    next.weight,
    next.kind === "pawprint",
  );

  const allResolved = folio.anomalies.every((anomaly) => s.vim.resolvedAnomalyIds[anomaly.id] === true);
  if (allResolved) completeFolioIn(s, folio.isRite, riteFamily);
  return true;
}

// ---------------------------------------------------------------------------------------------
// The feature
// ---------------------------------------------------------------------------------------------

/**
 * The Vim feature, under `vim`: the permanent muscle memory, the run's Flow and folio, and every action
 * the editor, the screens and the sim take. Its `reset` is a function, so a `:w` and a `:wq` both reach it
 * and both keep every permanent field.
 */
export const vim = defineFeature({
  key: "vim",
  reach: () => [
    wallet,
    reach<{
      stats: { output: Decimal; tempo: Decimal };
      boosts: BuffsState;
      trials: { rules: string[] };
    }>(),
  ],
  initial: (): VimState => ({
    unlockedFamilies: {},
    completedRites: {},
    discoveredPairs: {},
    hintMastery: {},
    tildeBond: 0,
    tildePets: 0,
    pawprintsCleaned: 0,
    totalFoliosCleared: 0,
    totalCleanCuts: 0,
    totalAnomaliesCleared: 0,
    easterEggsFound: {},
    vimrcRules: {},
    activeSplit: false,
    arrowShameCount: 0,
    escPanicCount: 0,
    highestAct: 1,
    flow: 0,
    flowDecayMs: 0,
    lastFlowAt: 0,
    graceUntil: 0,
    folioSerial: 0,
    folioSeed: 1_000_003,
    runFolios: 0,
    resolvedAnomalyIds: {},
    echoStacks: 0,
    pendingRiteFamily: null,
    recentActiveRate: D(0),
    lastPetAt: 0,
  }),
  derived: [
    {
      flowCap: (s) => 50 + (s.vim.vimrcRules["fast-flow"] === true ? 10 : 0),
      flowMult: (s) => D(1 + s.vim.flow * FLOW_PER_STACK),
      codexPairMult: (s) => D(CODEX_PAIR_MULT).pow(Object.keys(s.vim.discoveredPairs).length),
      riteMult: (s) => D(1).add(D(0.25).mul(Object.keys(s.vim.completedRites).length)),
      tildeClarityMult: (s) => D(1 + TILDE_BOND_STEP * s.vim.tildeBond),
      tildeInkMult: (s) => D(1 + TILDE_BOND_STEP * s.vim.tildeBond),
      actTier: (s): 1 | 2 | 3 | 4 | 5 | 6 | 7 => {
        let tier: 1 | 2 | 3 | 4 | 5 | 6 | 7 = 1;
        for (const family of KEY_FAMILIES) {
          if (s.vim.unlockedFamilies[family.id] === true && family.act > tier) tier = family.act;
        }
        return tier;
      },
    },
    {
      activeGlyphsPerEdit: (s) => D(BASE_EDIT_GLYPHS).mul(D(1 + 0.35 * (s.vim.actTier - 1))),
    },
    {
      // What a player at a steady pace makes a second: one anomaly about every five seconds, at the run's own Flow.
      // `stats.output` (which carries the Codex pairs and rites) is applied by `income.ts`, never here.
      expectedActivePerSec: (s) => s.vim.activeGlyphsPerEdit.mul(s.vim.flowMult).mul(D(0.2)),
    },
  ],
  reset: (before, fresh) => {
    const serial = before.folioSerial + 1;
    return {
      ...fresh,
      // Permanent: no reset strips a keycap, a rite, a pair, a bond level or an Easter egg.
      unlockedFamilies: before.unlockedFamilies,
      completedRites: before.completedRites,
      discoveredPairs: before.discoveredPairs,
      hintMastery: before.hintMastery,
      tildeBond: before.tildeBond,
      tildePets: before.tildePets,
      pawprintsCleaned: before.pawprintsCleaned,
      totalFoliosCleared: before.totalFoliosCleared,
      totalCleanCuts: before.totalCleanCuts,
      totalAnomaliesCleared: before.totalAnomaliesCleared,
      easterEggsFound: before.easterEggsFound,
      vimrcRules: before.vimrcRules,
      activeSplit: before.activeSplit,
      arrowShameCount: before.arrowShameCount,
      escPanicCount: before.escPanicCount,
      highestAct: before.highestAct,
      // The run: back to a fresh page, one serial on, and a seed no reset repeats.
      folioSerial: serial,
      folioSeed: rollSeed(before.folioSeed, serial),
    };
  },
  actions: (api) => ({
    /**
     * Buys a Keycap Family. Refuses an unknown id, a family whose prerequisites are not bought, and one the
     * wallet cannot cover. A success owes that family's Practice Rite next and raises the Act tier.
     */
    unlockFamily: (id: KeyFamilyId): boolean =>
      api.set((s) => {
        const family = KEY_FAMILIES.find((entry) => entry.id === id);
        if (!family) return false;
        if (s.vim.unlockedFamilies[id] === true) return false;
        if (!family.requires.every((required) => s.vim.unlockedFamilies[required] === true)) return false;
        if (!wallet.draft.debit(s, family.cost.currency, family.cost.amount)) return false;
        s.vim.unlockedFamilies[id] = true;
        s.vim.pendingRiteFamily = id;
        if (family.act > s.vim.highestAct) s.vim.highestAct = family.act;
        return true;
      }),

    /** Pays one mended anomaly at the grade its keys earned, and moves the Flow and the drops with it. */
    resolveAnomaly: (
      anomalyId: string,
      keysUsed: number,
      parKeys: number,
      hintId: string,
      weight: number,
      isPawprint = false,
    ): ResolvedAnomaly =>
      api.set((s) =>
        resolveAnomalyIn(s, api.now(), anomalyId, keysUsed, parKeys, hintId, weight, isPawprint),
      ),

    /** Pays the folio's clearing burst and rolls the next page. Idempotent: an empty folio pays nothing. */
    completeFolio: (isRite: boolean, riteFamily?: KeyFamilyId): FolioClear =>
      api.set((s) => completeFolioIn(s, isRite, riteFamily)),

    /** Logs a Grammar Codex pair. True only the first time, which is the only time it multiplies output. */
    recordGrammar: (pairId: string): boolean =>
      api.set((s) => {
        if (s.vim.discoveredPairs[pairId] === true) return false;
        s.vim.discoveredPairs[pairId] = true;
        return true;
      }),

    /** Notes an Easter egg. True only the first time, and the treats land with it. */
    triggerEasterEgg: (eggId: string): boolean =>
      api.set((s) => {
        if (s.vim.easterEggsFound[eggId] === true) return false;
        s.vim.easterEggsFound[eggId] = true;
        const bonus = EGG_BY_ID[eggId]?.bonusTreats ?? 0;
        if (bonus > 0) wallet.draft.credit(s, "treats", bonus);
        return true;
      }),

    /** Pets Tilde, if her cooldown allows it, and starts her purr. */
    petTilde: (): TildePetResult =>
      api.set((s) => {
        const now = api.now();
        if (now - s.vim.lastPetAt < TILDE_PET_COOLDOWN_MS) return { ok: false, bond: s.vim.tildeBond };
        s.vim.tildePets += 1;
        s.vim.lastPetAt = now;
        startTildeBuff(s, "tilde-purr", now);
        return { ok: true, bond: s.vim.tildeBond };
      }),

    /** Spends the treats the next bond level asks for, and starts her approval. */
    feedTilde: (): boolean =>
      api.set((s) => {
        const now = api.now();
        if (!wallet.draft.debit(s, "treats", tildeTreatCost(s.vim.tildeBond))) return false;
        s.vim.tildeBond += 1;
        startTildeBuff(s, "tilde-approval", now);
        return true;
      }),

    /** Toggles an Act VII `.vimrc` rule, if the Forge is open and a slot is free. Returns whether it is on. */
    toggleVimrcRule: (ruleId: string): boolean =>
      api.set((s) => {
        if (s.vim.actTier !== 7) return false;
        const rule = VIMRC_RULES.find((entry) => entry.id === ruleId);
        if (!rule) return false;
        if (s.vim.vimrcRules[ruleId] === true) {
          delete s.vim.vimrcRules[ruleId];
          return false;
        }
        let used = 0;
        for (const entry of VIMRC_RULES) {
          if (s.vim.vimrcRules[entry.id] === true) used += entry.slotCost;
        }
        if (used + rule.slotCost > VIMRC_SLOTS) return false;
        s.vim.vimrcRules[ruleId] = true;
        return true;
      }),

    /** Opens or closes the second half of a `:vsplit`. Returns whether both halves are live. */
    setDualSplit: (on: boolean): boolean =>
      api.set((s) => {
        s.vim.activeSplit = on;
        return on;
      }),

    /** The arrows rusted: one Flow stack falls and the shame is counted. */
    noteArrowRust: (): void =>
      api.set((s) => {
        s.vim.arrowShameCount += 1;
        s.vim.flow = Math.max(0, s.vim.flow - 1);
      }),

    /** Esc, mashed. */
    noteEscPanic: (): void =>
      api.set((s) => {
        s.vim.escPanicCount += 1;
      }),

    /** One `.` or `@` echo in the folio on screen, up to the cap. */
    noteEcho: (_kind: "dot" | "macro"): void =>
      api.set((s) => {
        s.vim.echoStacks = Math.min(ECHO_CAP, s.vim.echoStacks + 1);
      }),

    /** Holds Flow still until `untilMs` of game time: the tab-away grace. */
    setGrace: (untilMs: number): void =>
      api.set((s) => {
        s.vim.graceUntil = untilMs;
      }),

    /** One headless Clean Cut on the folio on screen, then its clear when that was the last anomaly. */
    simulateActiveEdit: (): boolean => api.set((s) => simulateActiveEditIn(s, api.now())),
  }),
  steps: {
    sync: {
      flowDecay: {
        pass: "tick",
        run: (s, ctx) => {
          if (ctx.dtMs <= 0) return;

          s.vim.recentActiveRate = s.vim.recentActiveRate.mul(Math.exp(-ctx.dtMs / RATE_DECAY_MS));

          // Grace pauses the fall: silence during it is not silence.
          if (ctx.now < s.vim.graceUntil) {
            s.vim.flowDecayMs = 0;
            return;
          }

          s.vim.flowDecayMs += ctx.dtMs;
          while (s.vim.flowDecayMs >= FLOW_DECAY_MS && s.vim.flow > 0) {
            s.vim.flow -= 1;
            s.vim.flowDecayMs -= FLOW_DECAY_MS;
          }
          if (s.vim.flow <= 0) s.vim.flowDecayMs = 0;
        },
      },
    },
  },
  moves: (s) => {
    const moves: Move<typeof s>[] = [];
    for (const family of KEY_FAMILIES) {
      if (s.vim.unlockedFamilies[family.id] === true) continue;
      if (!family.requires.every((required) => s.vim.unlockedFamilies[required] === true)) continue;
      if (!wallet.select.canAfford(s, family.cost.currency, family.cost.amount)) continue;
      moves.push({
        id: `vim.unlock.${family.id}`,
        cost: { currency: family.cost.currency, amount: D(family.cost.amount) },
        worth: () => family.riteBonus + family.act,
        apply: (store) => store.getState().vim.unlockFamily(family.id),
      });
    }

    const treats = tildeTreatCost(s.vim.tildeBond);
    if (wallet.select.canAfford(s, "treats", treats)) {
      moves.push({
        id: "vim.feed-tilde",
        cost: { currency: "treats", amount: D(treats) },
        worth: () => 1,
        apply: (store) => store.getState().vim.feedTilde(),
      });
    }

    return moves;
  },
});
