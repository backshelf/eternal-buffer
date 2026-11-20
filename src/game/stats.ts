import { type Decimal, defineStats, type Effect, rankContributions } from "watchpot/core";
import { POWER, WALL_NAME } from "../content/achievements";
import { OFFLINE_BASE } from "../content/economy";
import {
  BONUS_PER_UNIT,
  CODEX_MILESTONES,
  type MilestoneEffect,
  type PrestigeMilestone,
  VOLUME_MILESTONES,
} from "../content/prestige";
import { RUN_NODES, SEAL_NODES } from "../content/tree";
import { type StatId, WORDS } from "../content/words";
import { wall } from "./achievements";
import { trials } from "./challenges";
import { crafting, mosaic } from "./mosaic";
import { codex, volumes } from "./prestige";
import { sealUpgrades, upgrades } from "./tree";
import { vim } from "./vim";
import { boosts } from "./visitor";
import { wallet } from "./wallet";

/** The stats as a reader sees them: each a Decimal under its id (`s.stats.output`). */
export type Stats = {
  readonly [P in StatId]: Decimal;
};

/** What one codex multiplies Clarity by, on top of the seals. */
const CODEX_BONUS_PER_UNIT = 1.5;
/** The Flow Tempo an active `fast-flow` `.vimrc` rule adds: the Flow turns faster while it is on. */
const FAST_FLOW_TEMPO = 1.1;

/** A milestone whose effect raises one of the six stats: its kind is the stat's id. */
type StatMilestone = PrestigeMilestone & {
  effect: Extract<MilestoneEffect, { kind: StatId }>;
};

/** The milestone effect kinds that are stat ids. */
const STAT_KINDS: readonly string[] = ["output", "offline", "gain", "tempo", "inkRate", "codexGain"];

/** Whether a milestone hands the graph a stat. */
const isStatMilestone = (m: PrestigeMilestone): m is StatMilestone => STAT_KINDS.includes(m.effect.kind);

/** The effect a stat milestone gives: a multiplier, or the one additive kind (`offline`). */
const effectOf = (m: StatMilestone): Effect<StatId> =>
  "mul" in m.effect ? { stat: m.effect.kind, mul: m.effect.mul } : { stat: m.effect.kind, add: m.effect.add };

/** What a layer's `reached` reads: the state it was declared over. */
type VolumeReads = Parameters<typeof volumes.select.reached>[0];
type CodexReads = Parameters<typeof codex.select.reached>[0];

/** The Volume milestones that hand the graph a stat, each counting while the layer has reached it. */
const VOLUME_STAT_SOURCES = VOLUME_MILESTONES.filter(isStatMilestone).map((m) => ({
  label: m.name,
  owner: "volumes",
  active: (q: VolumeReads) => volumes.select.reached(q, m.id),
  effects: [effectOf(m)],
}));

/** The Codex milestones that hand the graph a stat, each counting while the layer has reached it. */
const CODEX_STAT_SOURCES = CODEX_MILESTONES.filter(isStatMilestone).map((m) => ({
  label: m.name,
  owner: "codex",
  active: (q: CodexReads) => codex.select.reached(q, m.id),
  effects: [effectOf(m)],
}));

/**
 * The stats, under `stats`: `output` (a multiplier on every payout), `offline` (the share paid while away, never
 * above all of it), `gain` (a multiplier on what a volume pays), `tempo` (a multiplier on every edit), `inkRate` (a
 * multiplier on the Scribes' line) and `codexGain` (a multiplier on what a rebind pays). Each is worked out from the
 * state whenever something it reads changes, and never saved. Every feature that raises one feeds it here, and
 * nothing else reads the content's effects: a feature's own list of what it gives (a tree's ranks, a collection's
 * copies, the running buffs) as `contributions`, a number read off the state as a source.
 * `stats.select.explain(state, "output")` is the breakdown behind a number.
 */
export const stats = defineStats({
  key: "stats",
  vocab: WORDS,
  reach: () => [wallet, volumes, codex, vim, wall, upgrades, sealUpgrades, crafting, mosaic, trials, boosts],

  stats: {
    output: { base: 1 },
    offline: { base: OFFLINE_BASE, hardcap: 1 },
    gain: { base: 1 },
    tempo: { base: 1 },
    inkRate: { base: 1 },
    codexGain: { base: 1 },
  },
  sources: [
    {
      label: "Seals",
      owner: "volumes",
      effects: [{ stat: "output", mul: (q) => q.wallet.seals.pow(0.85).mul(BONUS_PER_UNIT).add(1) }],
    },
    {
      label: "Codices",
      owner: "codex",
      effects: [{ stat: "output", mul: (q) => q.wallet.codices.mul(CODEX_BONUS_PER_UNIT).add(1) }],
    },
    {
      label: WALL_NAME,
      owner: "achievements",
      effects: [{ stat: "output", mul: (q) => wall.select.power(q, POWER) }],
    },
    {
      label: "Grammar Codex",
      owner: "vim",
      effects: [{ stat: "output", mul: (q) => q.vim.codexPairMult }],
    },
    {
      label: "Practice Rites",
      owner: "vim",
      effects: [{ stat: "output", mul: (q) => q.vim.riteMult }],
    },
    {
      label: "Tilde's Bond",
      owner: "vim",
      effects: [
        { stat: "output", mul: (q) => q.vim.tildeClarityMult },
        { stat: "inkRate", mul: (q) => q.vim.tildeInkMult },
      ],
    },
    {
      // The one `.vimrc` rule that raises a stat itself: the rest read their own flags where they act.
      label: ".vimrc",
      owner: "vim",
      active: (q) => q.vim.vimrcRules["fast-flow"] === true,
      effects: [{ stat: "tempo", mul: FAST_FLOW_TEMPO }],
    },
    ...VOLUME_STAT_SOURCES,
    ...CODEX_STAT_SOURCES,
  ],
  contributions: (s) => [
    ...rankContributions("upgrades", RUN_NODES, s.upgrades.ranks),
    ...rankContributions("sealUpgrades", SEAL_NODES, s.sealUpgrades.ranks),
    ...mosaic.select.contributions(s),
    ...trials.select.contributions(s),
    // Every buff still listed is running: the buffs' own step ends one whose time is up at the start of each pass.
    ...boosts.select.contributions(s),
  ],
});
