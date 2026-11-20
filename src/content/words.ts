// Written by the scaffold from the game's answers. It is the game's now: edit it freely.
import { type CurrencyOf, type RarityOf, vocab } from "watchpot/core";
import type { GlyphId } from "../app/icons";

export const NAME = "The Eternal Buffer";
/** The save key's and the game id's stem. */
export const SLUG = "eternal-buffer";
export const PREMISE =
  "You are a midnight archivist mending an infinite, glitching manuscript of reality in a glowing modal editor. Motions carve clean signal from rot, operators stitch broken folios, and a stray cat named Tilde naps on your statusline.";

/** The currency the core makes and every upgrade costs. */
export const MAIN = "glyphs";

/** The game's words: its currencies, the stats its upgrades raise, its rarity ladder (lowest first). */
export const WORDS = vocab({
  currencies: [MAIN],
  stats: ["output", "offline", "gain"],
  rarities: ["common"],
} as const);

export type Currency = CurrencyOf<typeof WORDS>;
export type Rarity = RarityOf<typeof WORDS>;
export type StatId = "output" | "offline" | "gain";

export interface CurrencyWords {
  name: string;
  plural: string;
  glyph: GlyphId;
}

export const CURRENCY: Record<Currency, CurrencyWords> = {
  glyphs: { name: "Glyph", plural: "Glyphs", glyph: "key" },
};

/** What each stat is called in the fiction. */
export const STAT: Record<StatId, string> = {
  output: "Clarity",
  offline: "Night Watch",
  gain: "Seal Yield",
};

/** The tabs' names, one per screen. */
export const TAB_NAMES = { make: "Buffer", tree: "Codex", prestige: "Volumes", achievements: "Marginalia" };

/** The starter backdrop this game was scaffolded with (`src/shaders/`), or none; the build writes its own. */
export const SURFACE: string | null = "print";
/** The sentence every shader in the game answers to. */
export const SURFACE_LINE =
  "An amber phosphor monitor printing onto coarse Bayer-dithered soot: a warm 4x4 ordered-dither light pool breathes around your Vim cursor, ripples outward on Clean Cuts, thickens with Flow, and casts dot-screen light behind every ASCII panel.";
