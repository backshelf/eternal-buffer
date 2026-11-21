// Proves the theme registry, the expanded settings and the audio bus faders: eight themes with preview swatches,
// names and aliases that all resolve (including the old `midnight` tint), the new settings' safe defaults, and a
// volume setter that clamps rather than throws.
import { describe, expect, test } from "bun:test";
import { setSoundVolumes } from "../src/app/sound";
import type { ThemeDef, ThemeId } from "../src/content/themes";
import { resolveThemeId, THEME_BY_ID, THEMES } from "../src/content/themes";
import { settings } from "../src/game/settings";

/** The settings factory's initial state; its context is unused by this player's choices. */
function initialSettings() {
  return settings.initial({} as Parameters<typeof settings.initial>[0]);
}

describe("theme registry", () => {
  test("has the eight vellums, five dark and three light", () => {
    expect(THEMES).toHaveLength(8);
    expect(THEMES.map((theme) => theme.id)).toEqual([
      "amber",
      "paper",
      "jade",
      "gruvbox-dark",
      "gruvbox-light",
      "solarized-dark",
      "solarized-light",
      "catppuccin-mocha",
    ]);
    expect(new Set(THEMES.map((theme) => theme.id)).size).toBe(8);
    expect(THEMES.filter((theme) => theme.scheme === "dark")).toHaveLength(5);
    expect(THEMES.filter((theme) => theme.scheme === "light")).toHaveLength(3);
  });

  test("every theme carries a valid scheme, a group and four hex swatches", () => {
    for (const theme of THEMES) {
      expect(theme.scheme === "dark" || theme.scheme === "light").toBe(true);
      expect(theme.group === "archive" || theme.group === "editor").toBe(true);
      expect(theme.swatches).toHaveLength(4);
      for (const swatch of theme.swatches) expect(swatch).toMatch(/^#[0-9a-f]{6}$/);
      expect(THEME_BY_ID[theme.id]).toBe(theme);
    }
  });

  test("the archive keeps its three own vellums and the editor brings five", () => {
    expect(THEMES.filter((theme) => theme.group === "archive").map((theme) => theme.id)).toEqual([
      "amber",
      "paper",
      "jade",
    ]);
    expect(THEMES.filter((theme) => theme.group === "editor")).toHaveLength(5);
  });

  test("resolves every id and display name, case-insensitively", () => {
    for (const theme of THEMES) {
      expect(resolveThemeId(theme.id)).toBe(theme.id);
      expect(resolveThemeId(theme.name)).toBe(theme.id);
      expect(resolveThemeId(`  ${theme.name.toUpperCase()}  `)).toBe(theme.id);
    }
  });

  test("resolves the legacy aliases to their themes", () => {
    const cases: ReadonlyArray<readonly [string, ThemeId]> = [
      ["midnight", "catppuccin-mocha"],
      ["gruvbox", "gruvbox-dark"],
      ["solarized", "solarized-dark"],
      ["catppuccin", "catppuccin-mocha"],
      ["mocha", "catppuccin-mocha"],
      ["light", "paper"],
      ["vellum", "paper"],
      ["dark", "amber"],
    ];
    for (const [alias, id] of cases) expect(resolveThemeId(alias)).toBe(id);
  });

  test("returns null for nothing and for names no theme owns", () => {
    expect(resolveThemeId("")).toBeNull();
    expect(resolveThemeId("   ")).toBeNull();
    expect(resolveThemeId("dracula")).toBeNull();
    expect(resolveThemeId("amber-ish")).toBeNull();
  });

  test("the registry's definition shape is what the UI reads", () => {
    const amber: ThemeDef | undefined = THEME_BY_ID.amber;
    expect(amber?.id).toBe("amber");
    expect(amber?.name).toBe("Midnight Amber");
    expect(amber?.scheme).toBe("dark");
    expect(THEME_BY_ID.paper.scheme).toBe("light");
  });
});

describe("settings", () => {
  test("lands every new field on its default, alongside the old ones", () => {
    const fresh = initialSettings();
    expect(fresh.tintPreset).toBe("amber");
    expect(fresh.glowIntensity).toBe("warm");
    expect(fresh.bufferFontSize).toBe("md");
    expect(fresh.volumeMaster).toBe(0.85);
    expect(fresh.volumeKeys).toBe(0.85);
    expect(fresh.volumeChimes).toBe(0.85);
    expect(fresh.zenMode).toBe(false);

    expect(fresh.sound).toBe(true);
    expect(fresh.motion).toBe("system");
    expect(fresh.jkEscape).toBe(false);
    expect(fresh.veteranMode).toBe(false);
    expect(fresh.arrowShame).toBe("shame");
    expect(fresh.showChalkboard).toBe(true);
    expect(fresh.relativeNumbers).toBe(false);
    expect(fresh.showLineNumbers).toBe(true);
    expect(fresh.touchKeypad).toBe(false);
    expect(fresh.welcomed).toBe(false);
    expect(fresh.showCoach).toBe(true);
  });

  test("the tint default names a theme the registry owns", () => {
    expect(THEME_BY_ID[initialSettings().tintPreset]).toBeDefined();
  });
});

describe("sound buses", () => {
  test("takes in-range faders without complaint", () => {
    expect(() => setSoundVolumes({ master: 0.5, keys: 0.25, chimes: 1 })).not.toThrow();
  });

  test("clamps out-of-range and non-finite faders instead of throwing", () => {
    expect(() => setSoundVolumes({ master: -4, keys: 9, chimes: Number.NaN })).not.toThrow();
    expect(() => setSoundVolumes({ master: Number.POSITIVE_INFINITY, keys: -0.01, chimes: 2 })).not.toThrow();
    expect(() => setSoundVolumes({ master: 0, keys: 0, chimes: 0 })).not.toThrow();
  });
});
