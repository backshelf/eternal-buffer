import { type Decimal, defineBuffs, defineSpawns, type Effect, reach } from "watchpot/core";
import { LIFE_MS, VISITOR_BUFFS, VISITOR_OUTCOMES, WAIT } from "../content/visitor";
import type { StatId } from "../content/words";
import { wallet } from "./wallet";

/** 60 s of ink, handed over the moment the deluge is caught, at the current Ink Flow. */
const INK_DELUGE_SECONDS = 60;

/** Tilde's stash is a gift of food and shards on top of its tempo. */
const STASH_TREATS = 3;
const STASH_SHARDS = 2;

/** What a catch reads beyond the buffs and the wallet: the Scribe line the deluge pays out at. */
export interface VisitorReads {
  stats: { inkRate: Decimal };
}

/** The one kind of arrival, and the id `catch` takes. */
export const VISITOR_KIND = "visitor";

/**
 * Every timed blessing the moth and the cat hand out, on the engine's `buffs`: the content's five rules, each with its
 * own duration and its own effect. A second catch while one runs restarts its clock.
 */
export const boosts = defineBuffs<"boosts", Effect<StatId>>({
  key: "boosts",
  list: VISITOR_BUFFS,
});

/**
 * The Margin Moth, on the engine's `spawns`: one turns up after a ramped wait (`WAIT`), stays `LIFE_MS`, and caught it
 * starts the blessing its weighted outcome names. The deluge also pours 60 seconds of ink into the wallet, and Tilde's
 * stash comes with treats and shards. Its arrivals and catches are on its own saved stream.
 */
export const visitors = defineSpawns({
  key: "visitors",
  reach: () => [boosts, wallet, reach<VisitorReads>()],
  kinds: [
    {
      id: VISITOR_KIND,
      wait: WAIT,
      lifeMs: LIFE_MS,
      outcomes: VISITOR_OUTCOMES,
    },
  ],
  onCatch: (d, outcome, now) => {
    boosts.draft.start(d, outcome, now);
    if (outcome === "ink-deluge") wallet.draft.credit(d, "ink", d.stats.inkRate.mul(INK_DELUGE_SECONDS));
    if (outcome === "tilde-stash") {
      wallet.draft.credit(d, "treats", STASH_TREATS);
      wallet.draft.credit(d, "shards", STASH_SHARDS);
    }
  },
});
