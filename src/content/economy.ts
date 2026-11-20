// Written by the scaffold from the game's answers. It is the game's now: edit it freely.
import type { Currency } from "./words";

/** What a new profile starts with, one balance per currency. */
export const START: Record<Currency, number> = {
  glyphs: 0,
  ink: 0,
  seals: 0,
  shards: 0,
  treats: 0,
  codices: 0,
};
/** Away, the core makes this share of its rate (before the offline stat), for at most `OFFLINE_CAP_MS`. */
export const OFFLINE_BASE = 0.5;
export const OFFLINE_CAP_MS = 8 * 3_600_000;
/** The income a late game makes a second: where the backdrop's heat reaches 1 (log scale from 1). */
export const LATE_RATE = 1e18;

/** What one clean anomaly edit pays at Act I, before every multiplier. */
export const BASE_EDIT_GLYPHS = 8;
/** A Clean Cut (at or under par) pays this much; a tidy edit (par + 3) this; a folio cleared this. */
export const PAR_CRIT_MULT = 2.5;
export const TIDY_EDIT_MULT = 1.4;
export const FOLIO_CLEAR_MULT = 3.0;
/** Flow: one stack falls every `FLOW_DECAY_MS` of no active edit, and each stack raises output by this share. */
export const FLOW_DECAY_MS = 6_000;
export const FLOW_PER_STACK = 0.08;
/** What each discovered Grammar Codex pair multiplies output by. */
export const CODEX_PAIR_MULT = 1.06;
