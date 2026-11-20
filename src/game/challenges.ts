import { type Decimal, defineChallenges } from "watchpot/core";
import { CHALLENGES } from "../content/challenges";
import { codex, volumes } from "./prestige";
import { wallet } from "./wallet";

/**
 * What a trial's callbacks read: the run's Glyphs, and the ever totals the archive opens a trial on. Named rather than
 * left to `reach`, because the list is mapped: a callback that waits for the reach's type sees the feature's own slice
 * only and reports `s.wallet` missing.
 */
interface TrialReads {
  readonly wallet: {
    readonly earned: Decimal;
    readonly sealsEver: Decimal;
    readonly codicesEver: Decimal;
  };
}

/**
 * The six skill trials on the engine's `challenges`: each one enters a run under its rule flags (which the Vim gate
 * and the side systems read), asks for the run's own Glyphs — wiped when the trial starts, so the goal is met by the
 * trial itself — and pays a permanent multiplier to `stats` through `contributions`, once per completion. The record
 * never resets with the run, so it survives the reset a completion triggers.
 *
 * `volumes` and `codex` are reached so the unlock gates read the whole archive (`sealsEver`, `codicesEver`) through the
 * layers that pay them. Entering resets at the feature's one depth (1): `watchpot`'s `defineChallenges` takes a single
 * `depth` for the list, so the content's per-challenge `depth: 2` on `macro-trial` is not wired yet.
 */
export const trials = defineChallenges({
  key: "trials",
  reach: () => [wallet, volumes, codex],
  list: CHALLENGES.map((c) => ({
    id: c.id,
    unlocked: (s: TrialReads) => s.wallet.sealsEver.gte(c.minSeals) && s.wallet.codicesEver.gte(c.minCodices),
    goal: (s: TrialReads) => s.wallet.earned.gte(c.goalGlyphs),
    maxCompletions: c.maxCompletions,
    rules: c.rules,
    effects: (n) => c.effects(n),
  })),
  // A trial is a return as much as a test: two treats land in the wallet as the record counts the completion.
  onComplete: (d) => wallet.draft.credit(d, "treats", 2),
});
