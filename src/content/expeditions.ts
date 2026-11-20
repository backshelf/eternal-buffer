// The Margin Expeditions: eight errands into the archive's unindexed parts, timed on game time.
import { MINUTE_MS } from "watchpot/core";

/** One expedition as the content knows it. The game turns it into a mission's duration, cost and reward. */
export interface ExpeditionContentDef {
  id: string;
  name: string;
  /** Its flavour line, for the list. */
  line: string;
  durationMs: number;
  /** Ink paid when it sets out; 0 is free. */
  costInk: number;
  /** What it brings back, rolled at the start on the mission's own stream. */
  shardsRange: [number, number];
  treatsRange: [number, number];
  /** Ink handed back on claim, on top of the shards. */
  inkRebate?: number;
  /** The Act whose keycaps must be under your hands before it opens. */
  minAct?: number;
  /** Layer 2: this many lifetime Codices before the stair opens. */
  minCodices?: number;
  /** Tilde's own errand, open only once she trusts you this far. */
  minTildeBond?: number;
  /** Journal lines for the log, one drawn per return. */
  logFlavor: string[];
}

/** Eight errands, shortest first, then Tilde's own. */
export const EXPEDITIONS: readonly ExpeditionContentDef[] = [
  {
    id: "gutter-sweep",
    name: "Gutter Sweep",
    line: "Two minutes along the margin gutter with a brush and a bad attitude.",
    durationMs: 2 * MINUTE_MS,
    costInk: 0,
    shardsRange: [1, 2],
    treatsRange: [1, 1],
    logFlavor: [
      "Swept the gutter. Found one shard, a moth wing, and the word 'here' scratched twice.",
      "The gutter was mostly ash. The ash was mostly punctuation.",
      "Nothing bit me this time. The archive is losing its touch.",
    ],
  },
  {
    id: "index-stacks",
    name: "Index Stacks",
    line: "Five minutes among the index cards nobody has filed since the last binding.",
    durationMs: 5 * MINUTE_MS,
    costInk: 1_200,
    shardsRange: [3, 5],
    treatsRange: [1, 2],
    logFlavor: [
      "Filed nine cards. Eight were lies. The ninth was a recipe for tallow.",
      "Someone indexed the same folio under four different names, all wrong.",
      "Came back with dust in the seams of my hands and three shards in my pocket.",
    ],
  },
  {
    id: "burned-colophon",
    name: "Burned Colophon",
    line: "Ten minutes in the scorched endpapers, where the printer signed his name in soot.",
    durationMs: 10 * MINUTE_MS,
    costInk: 18_000,
    shardsRange: [8, 12],
    treatsRange: [2, 2],
    inkRebate: 6_000,
    logFlavor: [
      "The colophon survived the fire. The fire survived the colophon. Neither is happy.",
      "Scraped a signature out of the char. It read 'me', which explains a great deal.",
      "Nothing grows in a burned colophon but the ink keeps coming back. I collected what seeped.",
    ],
  },
  {
    id: "orphaned-manpage",
    name: "Orphaned Manpage",
    line: "Fifteen minutes following a help file that lost its command three centuries ago.",
    durationMs: 15 * MINUTE_MS,
    costInk: 180_000,
    shardsRange: [18, 25],
    treatsRange: [3, 3],
    minAct: 3,
    logFlavor: [
      "The manpage described a flag that no longer exists and a god who never did.",
      "Section seven is missing. Section seven is always missing.",
      "Found the command. It does nothing, beautifully, and I wrote it down.",
    ],
  },
  {
    id: "swapfile-catacombs",
    name: "Swapfile Catacombs",
    line: "Twenty minutes down the swapfile stairs, where abandoned edits go to sulk.",
    durationMs: 20 * MINUTE_MS,
    costInk: 2_500_000,
    shardsRange: [40, 60],
    treatsRange: [4, 4],
    minAct: 4,
    logFlavor: [
      "Every corridor down there is a half-written sentence that someone gave up on.",
      "Something in the catacombs still had my cursor in it. I let it keep it.",
      "Came back up with both hands full and the distinct feeling of having been indexed.",
    ],
  },
  {
    id: "register-vault",
    name: "Register Vault",
    line: "Thirty minutes in the vault where every yank is still stored, alphabetised by regret.",
    durationMs: 30 * MINUTE_MS,
    costInk: 35_000_000,
    shardsRange: [100, 140],
    treatsRange: [6, 6],
    minCodices: 2,
    logFlavor: [
      "The vault keeps everything. I found a line I yanked before I was born.",
      "Register zero is a locked room and the lock is a promise.",
      "Nothing in there is lost, only badly filed. I took what the filing owed me.",
    ],
  },
  {
    id: "null-device-abyss",
    name: "Null-Device Abyss",
    line: "Forty-five minutes over the rim of /dev/null, which does not echo and does not care.",
    durationMs: 45 * MINUTE_MS,
    costInk: 500_000_000,
    shardsRange: [280, 360],
    treatsRange: [10, 10],
    minAct: 7,
    logFlavor: [
      "Threw a page over the rim. It did not land. It did not make a sound. I respect that.",
      "The abyss accepted my offering and returned nothing, as advertised, for once.",
      "I counted the silence on the way down. It counted me back.",
    ],
  },
  {
    id: "tildes-milk-run",
    name: "Tilde's Milk Run",
    line: "Three minutes to the dairy that exists only in the margins, on her instructions.",
    durationMs: 3 * MINUTE_MS,
    costInk: 0,
    shardsRange: [0, 0],
    treatsRange: [3, 5],
    minTildeBond: 3,
    logFlavor: [
      "The milk is warm and the margin is cold and the cat has been very clear about both.",
      "A note on the saucer: 'You may have one. Not the best one.'",
      "The dairy keeper asked after her. I lied and said she was working.",
      "Delivered. Received with a look that I have chosen to read as gratitude.",
    ],
  },
];
