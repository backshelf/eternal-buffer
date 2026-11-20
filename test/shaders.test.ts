import { describe, expect, test } from "bun:test";
import { BACKDROP } from "../src/shaders/backdrop";
import { BUFFER_GLOW, BUFFER_GLOW_UNIFORMS } from "../src/shaders/bufferGlow";
import { CODEX_MOMENT, CODEX_MOMENT_UNIFORMS } from "../src/shaders/codexMoment";
import { ARCHIVE_BACKDROP, PRINT } from "../src/shaders/print";
import { cleanCutPulse, folioClearPulse, momentState } from "../src/shaders/pulses";
import type { Surface } from "../src/shaders/surface";
import { BACKDROP_UNIFORMS } from "../src/shaders/surface";
import { TILE_FOIL, TILE_FOIL_UNIFORMS } from "../src/shaders/tileFoil";

/** A hex colour literal, the CSS-style colour a fragment must never hold: its palette arrives as vec4 uniforms. */
const HEX = /#[0-9a-fA-F]{3,8}(?![0-9a-fA-Za-z_])/;

/** The suite, with the uniforms its fragment must declare. */
const SURFACES: ReadonlyArray<{ name: string; surface: Surface; uniforms: Record<string, string> }> = [
  { name: "ARCHIVE_BACKDROP", surface: ARCHIVE_BACKDROP, uniforms: BACKDROP_UNIFORMS },
  { name: "BUFFER_GLOW", surface: BUFFER_GLOW, uniforms: BUFFER_GLOW_UNIFORMS },
  { name: "TILE_FOIL", surface: TILE_FOIL, uniforms: TILE_FOIL_UNIFORMS },
  { name: "CODEX_MOMENT", surface: CODEX_MOMENT, uniforms: CODEX_MOMENT_UNIFORMS },
];

describe("the shader suite", () => {
  for (const { name, surface } of SURFACES) {
    test(`${name} composes a whole fragment with a still to fall back on`, () => {
      expect(surface.fragment.length).toBeGreaterThan(0);
      expect(surface.fragment).toContain("void main()");
      expect(surface.fragment).toContain("fragColor");
      expect(surface.still.length).toBeGreaterThan(0);
      expect(surface.reducedTime).toBeGreaterThanOrEqual(0);
    });

    test(`${name} holds no hex colour literal`, () => {
      expect(HEX.test(surface.fragment)).toBe(false);
    });

    test(`${name} declares every uniform its record names`, () => {
      for (const [uniform, kind] of Object.entries(SURFACES.find((s) => s.name === name)?.uniforms ?? {})) {
        expect(surface.fragment).toContain(`uniform ${kind} ${uniform};`);
      }
    });
  }

  test("the backdrop wiring points at the archive room", () => {
    expect(PRINT).toBe(ARCHIVE_BACKDROP);
    expect(BACKDROP).toBe(ARCHIVE_BACKDROP);
  });

  test("the pulses bump and decay", () => {
    cleanCutPulse.bump();
    expect(cleanCutPulse.value()).toBeGreaterThan(0.9);
    folioClearPulse.bump(0.6);
    expect(folioClearPulse.value()).toBeGreaterThan(0.5);
  });

  test("momentState opens once, is heard, and closes", () => {
    const heard: boolean[] = [];
    const stop = momentState.subscribe((active) => {
      heard.push(active);
    });
    expect(momentState.isActive()).toBe(false);
    expect(momentState.trigger()).toBe(true);
    expect(momentState.isActive()).toBe(true);
    // a second trigger while the Moment plays changes nothing
    expect(momentState.trigger()).toBe(false);
    expect(heard).toEqual([true]);
    expect(momentState.finish()).toBe(true);
    expect(momentState.isActive()).toBe(false);
    expect(momentState.finish()).toBe(false);
    expect(heard).toEqual([true, false]);
    stop();
    // with the listener gone the Moment still runs clean
    expect(momentState.trigger()).toBe(true);
    expect(momentState.isActive()).toBe(true);
    momentState.finish();
    expect(momentState.isActive()).toBe(false);
  });
});
