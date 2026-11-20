import { type Decimal, defineMissions, nextInt, type RngState, reach } from "watchpot/core";
import { EXPEDITIONS, type ExpeditionContentDef } from "../content/expeditions";
import { wallet } from "./wallet";

/** What the errands read beyond their own slice: the ever-totals that open the stair, and the Act and Tilde's trust. */
export interface ExpeditionReads {
  wallet: { sealsEver: Decimal; codicesEver: Decimal };
  vim: { actTier: number; tildeBond: number };
}

/** What one return pays, rolled at the start on the mission's own stream and stored with the entry. */
export interface ExpeditionReward {
  shards: number;
  treats: number;
  /** Ink handed back on claim; 0 for an errand that gives none. */
  rebate: number;
  /** The journal line drawn for this return. */
  flavor: string;
}

/** Two slots from the first night, the third at 10 Seals ever, the fourth at 2 Codices ever. */
const BASE_SLOTS = 2;

/** A uniform whole number in `[min, max]`, with the stream it moves on. */
function rollRange(rng: RngState, [min, max]: readonly [number, number]): [number, RngState] {
  const low = Math.floor(min);
  const span = Math.max(0, Math.floor(max) - low);
  const [draw, next] = nextInt(rng, span + 1);
  return [low + draw, next];
}

/**
 * This errand's reward: every amount rolled now, off the mission's own stream, so a reload cannot reroll it and the
 * screen can show it before it lands.
 */
function rollReward(content: ExpeditionContentDef) {
  return (_state: ExpeditionReads, rng: RngState): ExpeditionReward => {
    const [shards, afterShards] = rollRange(rng, content.shardsRange);
    const [treats, afterTreats] = rollRange(afterShards, content.treatsRange);
    const notes = content.logFlavor.length > 0 ? content.logFlavor : [""];
    const [line] = nextInt(afterTreats, notes.length);
    return { shards, treats, rebate: content.inkRebate ?? 0, flavor: notes[line] ?? "" };
  };
}

/**
 * The Margin Expeditions on the engine's `missions`: two to four errands away at once, each timed on game time so it
 * is back during an absence, each priced in ink and paid in shards, treats and sometimes a little ink back.
 */
export const expeditions = defineMissions({
  key: "expeditions",
  reach: () => [wallet, reach<ExpeditionReads>()],
  slots: (s: ExpeditionReads) =>
    BASE_SLOTS + (s.wallet.sealsEver.gte(10) ? 1 : 0) + (s.wallet.codicesEver.gte(2) ? 1 : 0),
  list: EXPEDITIONS.map((content) => ({
    id: content.id,
    durationMs: () => content.durationMs,
    available: (s: ExpeditionReads) =>
      (content.minAct ?? 1) <= s.vim.actTier &&
      s.wallet.codicesEver.gte(content.minCodices ?? 0) &&
      (content.minTildeBond ?? 0) <= s.vim.tildeBond,
    cost: content.costInk > 0 ? { ink: content.costInk } : undefined,
    reward: rollReward(content),
  })),
  // The engine only calls `pay` for a mission carrying a cost, and it writes nothing when it refuses.
  pay: (d, mission) => {
    const ink = mission.cost?.ink ?? 0;
    if (ink <= 0) return true;
    if (wallet.select.balance(d, "ink").lt(ink)) return false;
    return wallet.draft.debit(d, "ink", ink);
  },
  onClaim: (d, reward) => {
    wallet.draft.credit(d, "shards", reward.shards);
    wallet.draft.credit(d, "treats", reward.treats);
    if (reward.rebate > 0) wallet.draft.credit(d, "ink", reward.rebate);
  },
  reset: { depth: 2 },
});
