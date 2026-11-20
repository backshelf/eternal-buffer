// Written by the scaffold from the game's answers. It is the game's now: edit it freely.
import type { CurrencyWords } from "./words";

export const PRESTIGE_NAME = "Bind Volume";
/** The button's word. */
export const PRESTIGE_VERB = ":w Bind Volume";
export const PRESTIGE_CURRENCY: CurrencyWords = { name: "Seal", plural: "Seals", glyph: "flame" };

/** The gain: `floor(k × (earned this run / per) ^ exp)`, times the gain stat. */
export const GAIN = { k: 1, exp: 0.5, per: 358318080000 };
/** Each unit held raises output by this share. */
export const BONUS_PER_UNIT = 0.1;
