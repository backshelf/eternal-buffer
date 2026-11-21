/**
 * The eight vellums the archive can be printed on: three of its own (Midnight Amber, Daylight Vellum, Jade
 * Phosphor) and five borrowed from the terminal (Gruvbox, Solarized, Catppuccin). `group` says which shelf a theme
 * belongs to, `scheme` says whether it is soot or paper, and `swatches` is what a preview chip draws, in order:
 * ground, surface, accent, ink.
 *
 * The id is what the settings save. The name is what a person reads. The aliases are the names a player may type at
 * `:colorscheme`, including the archive's old `midnight` tint, which now means Catppuccin Mocha so a save from
 * before the pack never lands on nothing.
 */
export type ThemeId =
  | "amber"
  | "paper"
  | "jade"
  | "gruvbox-dark"
  | "gruvbox-light"
  | "solarized-dark"
  | "solarized-light"
  | "catppuccin-mocha";

export interface ThemeDef {
  readonly id: ThemeId;
  readonly name: string;
  /** The archive's own shelf, or the editor palette it borrowed. */
  readonly group: "archive" | "editor";
  readonly scheme: "dark" | "light";
  /** `[ground, surface, accent, ink]`, as hex, for a UI preview chip. */
  readonly swatches: readonly [string, string, string, string];
  readonly aliases?: readonly string[];
}

export const THEMES: readonly ThemeDef[] = [
  {
    id: "amber",
    name: "Midnight Amber",
    group: "archive",
    scheme: "dark",
    swatches: ["#110f0d", "#1c1916", "#e59a28", "#ebe3d0"],
    aliases: ["dark", "amber crt"],
  },
  {
    id: "paper",
    name: "Daylight Vellum",
    group: "archive",
    scheme: "light",
    swatches: ["#e9e0cc", "#f3ecdc", "#a8650f", "#1a1510"],
    aliases: ["light", "vellum", "daylight"],
  },
  {
    id: "jade",
    name: "Jade Phosphor",
    group: "archive",
    scheme: "dark",
    swatches: ["#0b1412", "#12211d", "#45b7a5", "#dff3ea"],
    aliases: ["phosphor"],
  },
  {
    id: "gruvbox-dark",
    name: "Gruvbox Dark",
    group: "editor",
    scheme: "dark",
    swatches: ["#282828", "#3c3836", "#d79921", "#ebdbb2"],
    aliases: ["gruvbox"],
  },
  {
    id: "gruvbox-light",
    name: "Gruvbox Light",
    group: "editor",
    scheme: "light",
    swatches: ["#fbf1c7", "#f2e5bc", "#af3a03", "#3c3836"],
  },
  {
    id: "solarized-dark",
    name: "Solarized Dark",
    group: "editor",
    scheme: "dark",
    swatches: ["#002b36", "#073642", "#b58900", "#93a1a1"],
    aliases: ["solarized"],
  },
  {
    id: "solarized-light",
    name: "Solarized Light",
    group: "editor",
    scheme: "light",
    swatches: ["#fdf6e3", "#eee8d5", "#b58900", "#586e75"],
  },
  {
    id: "catppuccin-mocha",
    name: "Catppuccin Mocha",
    group: "editor",
    scheme: "dark",
    swatches: ["#1e1e2e", "#313244", "#cba6f7", "#cdd6f4"],
    // `midnight` was the archive's old dark vellum; its save keeps working here.
    aliases: ["midnight", "catppuccin", "mocha"],
  },
];

/** The registry by id, for a lookup that cannot miss. */
export const THEME_BY_ID: Readonly<Record<ThemeId, ThemeDef>> = Object.freeze(
  Object.fromEntries(THEMES.map((theme) => [theme.id, theme])) as Record<ThemeId, ThemeDef>,
);

/** Ids, names and aliases are matched with the same loose spelling: `"Gruvbox Dark"`, `"gruvbox-dark"`, `"gruvbox"`. */
function normalize(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, " ");
}

/**
 * The theme a typed name means, or `null` if it means none. Case-insensitive over ids, display names and aliases,
 * so `:colorscheme Solarized` and a saved `"midnight"` both land somewhere real. Consumers fall back to
 * `THEME_BY_ID.amber` for `null`.
 */
export function resolveThemeId(raw: string): ThemeId | null {
  const asked = normalize(raw);
  if (asked === "") return null;
  for (const theme of THEMES) {
    if (normalize(theme.id) === asked || normalize(theme.name) === asked) return theme.id;
    if (theme.aliases?.some((alias) => normalize(alias) === asked)) return theme.id;
  }
  return null;
}
