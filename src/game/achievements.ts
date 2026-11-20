import { type Achievement, type Decimal, defineAchievements, type Effect, reach } from "watchpot/core";
import { ACHIEVEMENTS, COLUMNS, type When } from "../content/achievements";
import { wallet } from "./wallet";

/** What a condition reads: the part of each feature's state the wall can ask about. */
export interface WallReads {
  wallet: { readonly earned: Decimal };
  generators: { readonly owned: Readonly<Record<string, number>> };
  upgrades: { readonly ranks: Readonly<Record<string, number>> };
  sealUpgrades: { readonly ranks: Readonly<Record<string, number>> };
  volumes: { readonly runs: number };
  codex: { readonly runs: number };
  vim: {
    readonly totalFoliosCleared: number;
    readonly totalCleanCuts: number;
    readonly totalAnomaliesCleared: number;
    readonly flow: number;
    readonly highestAct: number;
    readonly tildeBond: number;
    readonly tildePets: number;
    readonly discoveredPairs: Readonly<Record<string, true>>;
    readonly unlockedFamilies: Readonly<Record<string, true>>;
  };
  /** What is down: a piece per occupied cell. */
  mosaic: { readonly cells: Readonly<Record<string, string>> };
  /** Claims per mission id (the engine's `done`), or a plain count. */
  expeditions: { readonly done: number | Readonly<Record<string, number>> };
  /** Completions per challenge id. */
  trials: { readonly completions: Readonly<Record<string, number>> };
}

/** How many entries a record holds. */
function size(record: object): number {
  return Object.keys(record).length;
}

/** How many nodes hold a rank, across both halves of the codex: the wall counts lit nodes, not ranks. */
function lit(ranks: Readonly<Record<string, number>>): number {
  let nodes = 0;
  for (const rank of Object.values(ranks)) if (rank > 0) nodes += 1;
  return nodes;
}

/** The total of a record of counts (the claims per mission, the completions per challenge). */
function total(counts: Readonly<Record<string, number>>): number {
  let sum = 0;
  for (const count of Object.values(counts)) sum += count;
  return sum;
}

/** How many expeditions came home: a plain count, or the claims kept per mission id (summed, so repeats count). */
function claims(done: number | Readonly<Record<string, number>>): number {
  return typeof done === "number" ? done : total(done);
}

/** Whether the state meets a condition from `content/achievements.ts`. */
export function met(w: When, s: WallReads): boolean {
  if ("own" in w) return (s.generators.owned[w.own] ?? 0) >= w.count;
  if ("earned" in w) return s.wallet.earned.gte(w.earned);
  if ("runs" in w) return s.volumes.runs >= w.runs;
  if ("nodes" in w) return lit(s.upgrades.ranks) + lit(s.sealUpgrades.ranks) >= w.nodes;
  if ("folios" in w) return s.vim.totalFoliosCleared >= w.folios;
  if ("cleanCuts" in w) return s.vim.totalCleanCuts >= w.cleanCuts;
  if ("flow" in w) return s.vim.flow >= w.flow;
  if ("pairs" in w) return size(s.vim.discoveredPairs) >= w.pairs;
  if ("act" in w) return s.vim.highestAct >= w.act;
  if ("mosaicPlaced" in w) return size(s.mosaic.cells) >= w.mosaicPlaced;
  if ("expeditions" in w) return claims(s.expeditions.done) >= w.expeditions;
  if ("tildeBond" in w) return s.vim.tildeBond >= w.tildeBond;
  if ("tildePets" in w) return s.vim.tildePets >= w.tildePets;
  if ("challenges" in w) return total(s.trials.completions) >= w.challenges;
  if ("codexRuns" in w) return s.codex.runs >= w.codexRuns;
  // `manual`: the game awards the secrets itself, through `wall.award(id)`.
  return false;
}

/** The wall's list: each content entry, checked by `met`. */
const LIST: readonly Achievement<WallReads, Effect>[] = ACHIEVEMENTS.map((a) => ({
  id: a.id,
  name: a.name,
  line: a.line,
  secret: a.secret,
  when: (s: WallReads) => met(a.when, s),
}));

/**
 * The wall on the engine's `achievements`: six rows of `COLUMNS`, each earned once and kept through a prestige,
 * checked after every pass's production. What it gives (Clarity, from the count and the full rows) is read in
 * `stats.ts`; `fresh` is the queue the page toasts. The rest of the game is reached by its state types, so nothing
 * here imports the features it asks about.
 */
export const wall = defineAchievements({
  key: "achievements",
  columns: COLUMNS,
  list: LIST,
  reach: () => [wallet, reach<WallReads>()],
});
