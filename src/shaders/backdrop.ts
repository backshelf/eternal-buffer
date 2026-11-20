import { SURFACE } from "../content/words";
import { PRINT } from "./print";
import type { Surface } from "./surface";

/** The starter backdrops this game has, by `look.surface.base`. */
export const STARTERS = {
  print: PRINT,
} satisfies Record<string, Surface>;

/**
 * The page's backdrop: the starter the game was scaffolded with, or null for a page with none. The shader pass
 * replaces it with the game's own.
 */
export const BACKDROP: Surface | null =
  SURFACE === null ? null : ((STARTERS as Record<string, Surface>)[SURFACE] ?? null);
