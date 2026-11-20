// Written by the scaffold from the game's answers. It is the game's now: edit it freely.
import type { CurrencyWords } from "./words";

/** Layer 1, the run's own binding: glyphs into Seals, typed as `:w`. */
export const PRESTIGE_NAME = "Bind Volume";
/** The button's word. */
export const PRESTIGE_VERB = ":w Bind Volume";
export const PRESTIGE_CURRENCY: CurrencyWords = { name: "Seal", plural: "Seals", glyph: "seal" };

/** The gain: `floor(k × (earned this run / per) ^ exp)`, times the gain stat. `per` is roughly a first hour's
 * active editing, so bindings begin before the wallet has time to pool and crater: every glyph gate after the
 * first one prices on a small between-bind peak and opens on its minute, the shape the plan's own rule asks for
 * (a gate measured in a currency the reset wipes belongs before that reset, and the binds never stop coming after
 * it). `exp` keeps the auto-player's bind-at-double bar reachable run after run, and `per` is the arc's clock: it
 * sets both when the bindings start and — the same curve read backwards — when the eight of them the `:wq` gate
 * needs (250 Seals ever) have passed, which the plan wants just past hour seven. */
export const VOLUME_GAIN = { k: 1, exp: 0.27, per: 5.5e9 };
/** Each unit held raises output by this share. */
export const BONUS_PER_UNIT = 0.15;

/** Kept from the scaffold's single layer: Layer 1's curve, under its old name. */
export const GAIN = VOLUME_GAIN;

/** Layer 2, the whole archive rebound: Seals into Codices, typed as `:wq`. */
export const CODEX_NAME = "Rebind Codex";
/** The button's word. */
export const CODEX_VERB = ":wq Rebind Codex";
export const CODEX_CURRENCY: CurrencyWords = { name: "Codex", plural: "Codices", glyph: "codex" };

/** The gain: `floor(k × (Seals paid this epoch / per) ^ exp)`, times the codex yield. The first `:wq` at 250 Seals
 * pays 1–2 Codices (opening Act VI at 1 Codex, Mosaic 6×6 at 3 Codices on a subsequent epoch, and Act VII at 8 Codices
 * past hour 10), keeping the rebind epochs cleanly spaced instead of dumping 50 Codices on the first reset. */
export const CODEX_GAIN = { k: 1, exp: 0.42, per: 250 };

/**
 * What a milestone hands the game. The six stats are plain effects on the stat graph; the rest name a system that
 * reads the reached milestone itself (the Mosaic opening a larger grid, the trials taking another slot, a scribe
 * hired on the house, an Act opening early, a seal count that accrues while you are elsewhere).
 */
export type MilestoneEffect =
  | { readonly kind: "output"; readonly mul: number }
  | { readonly kind: "offline"; readonly add: number }
  | { readonly kind: "gain"; readonly mul: number }
  | { readonly kind: "tempo"; readonly mul: number }
  | { readonly kind: "inkRate"; readonly mul: number }
  | { readonly kind: "codexGain"; readonly mul: number }
  | { readonly kind: "mosaic-open"; readonly size: number }
  | { readonly kind: "challenge-slots"; readonly add: number }
  | { readonly kind: "seal-trickle"; readonly perSec: number }
  | { readonly kind: "auto-scribe"; readonly id: string }
  | { readonly kind: "act"; readonly act: number };

/**
 * A permanent unlock on a layer: `at` of what it counts (`on`, `best` unless said), a name and a line in the
 * archive's voice, and the effect the game applies while the milestone stands. No reset takes one back.
 */
export interface PrestigeMilestone {
  readonly id: string;
  readonly name: string;
  readonly line: string;
  /** What it counts: the best single payout (default) or the layer's lifetime. */
  readonly on?: "best" | "total";
  readonly at: number;
  readonly effect: MilestoneEffect;
}

/**
 * Five marks on the best Seal payout ever pressed. They survive `:wq`: a codex rebind starts the count of volumes
 * over, but the archive remembers that it once held five hundred seals in one hand.
 */
export const VOLUME_MILESTONES: readonly PrestigeMilestone[] = [
  {
    id: "first-seal",
    name: "The First Seal",
    line: "One seal, still warm. A candle is hired on the house to celebrate.",
    on: "best",
    at: 1,
    effect: { kind: "auto-scribe", id: "tallow-candle" },
  },
  {
    id: "quick-vellum",
    name: "Quick Vellum",
    line: "Five seals and the vellum takes ink faster than you can think it.",
    on: "best",
    at: 5,
    effect: { kind: "tempo", mul: 1.1 },
  },
  {
    id: "five-by-five",
    name: "Five by Five",
    line: "Twenty-five seals buy a wider bench: the Mosaic opens to 5 by 5.",
    on: "best",
    at: 25,
    effect: { kind: "mosaic-open", size: 5 },
  },
  {
    id: "spare-desk",
    name: "A Spare Desk",
    line: "A hundred seals and the trials keep a second chair for you.",
    on: "best",
    at: 100,
    effect: { kind: "challenge-slots", add: 1 },
  },
  {
    id: "seal-drip",
    name: "The Seal Drip",
    line: "Five hundred seals and the wax starts pressing itself while you sleep.",
    on: "best",
    at: 500,
    effect: { kind: "seal-trickle", perSec: 0.02 },
  },
];

/**
 * Five marks on the codices ever bound, counted as a lifetime rather than a best, since a rebind is meant to be
 * repeated. The first opens Act VI, the third widens the Mosaic to 6 by 6, the eighth opens Act VII.
 */
export const CODEX_MILESTONES: readonly PrestigeMilestone[] = [
  {
    id: "echoes-bound",
    name: "Echoes Bound",
    line: "One codex and the archive answers back: Act VI opens, and with it the dot and the macro.",
    on: "total",
    at: 1,
    effect: { kind: "act", act: 6 },
  },
  {
    id: "six-by-six",
    name: "Six by Six",
    line: "Three codices buy the whole bench: the Mosaic opens to 6 by 6.",
    on: "total",
    at: 3,
    effect: { kind: "mosaic-open", size: 6 },
  },
  {
    id: "ex-console",
    name: "The Ex-Console",
    line: "Eight codices and the command line widens into Act VII, where `:g`, `:norm` and `:sort` live.",
    on: "total",
    at: 8,
    effect: { kind: "act", act: 7 },
  },
  {
    id: "night-shift",
    name: "The Long Night Shift",
    line: "Twenty-five codices and the night watch stops asking whether you are at the desk.",
    on: "total",
    at: 25,
    effect: { kind: "offline", add: 0.1 },
  },
  {
    id: "eternal-shelf",
    name: "The Eternal Shelf",
    line: "A hundred codices. The archive stops being a place you work and becomes a place you keep.",
    on: "total",
    at: 100,
    effect: { kind: "output", mul: 1.5 },
  },
];
