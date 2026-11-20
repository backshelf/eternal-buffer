import type { UniformKind } from "watchpot/shader";
import { BAYER, compose, DOT_SCREENS, IGN, OKLAB, UV, uniformDecls } from "watchpot/shader";
import type { Surface } from "./surface";

/** The uniforms the tile foil declares: the palette, whether the tile is lit, and how much synergy surrounds it. */
export const TILE_FOIL_UNIFORMS = {
  u_ground: "vec4",
  u_ink: "vec4",
  u_accent: "vec4",
  u_active: "float",
  u_synergy: "float",
} as const satisfies Record<string, UniformKind>;

/**
 * The tile foil: a compact dithered shimmer for `ShaderTile` behind affordable keycap unlocks, lit Plugin Mosaic
 * cells and earned Marginalia tiles. A slow diagonal sheen crosses like lamplight, quantised to one-bit dot
 * patterns; a rim of light wakes at the border first, and rare glints twinkle where adjacency synergy
 * (`u_synergy`) is high — brightness rides with `u_active`, dot density with `u_synergy`. Inactive tiles fall
 * back to plain ground, so the pool can hold them still.
 */
export const TILE_FOIL: Surface = {
  fragment: compose(
    BAYER,
    DOT_SCREENS,
    IGN,
    OKLAB,
    UV,
    uniformDecls(TILE_FOIL_UNIFORMS),
    `
void main() {
  vec2 px = floor(gl_FragCoord.xy / max(u_pixelRatio, 1.0));
  vec2 uv = screenUv();
  float active = clamp(u_active, 0.0, 1.0);
  float syn = clamp(u_synergy, 0.0, 1.0);

  // a sheen crossing on the diagonal, slow as lamplight
  float sweep = 0.5 + 0.5 * sin((uv.x + uv.y) * 2.4 - u_time * 0.8);

  // a rim of light at the tile's border, the first thing to wake: a Bayer-ordered dither, not a dot pattern
  vec2 bord = min(uv, 1.0 - uv);
  float rim = smoothstep(0.14, 0.02, min(bord.x, bord.y)) * (0.55 + 0.45 * syn);

  // brightness with activity, dot density with synergy: one bit-pattern per level
  float tone = active * clamp(0.3 + 0.5 * sweep, 0.0, 1.0) * (0.7 + 0.55 * syn);
  int level = int(clamp(tone * 5.0 + 0.5, 0.0, 5.0));
  float on = dotScreen(level, px);
  float rimOn = step(bayer4(floor(px / 2.0)), clamp(active * rim, 0.0, 1.0));

  // earned glints: a rare dot twinkling where synergy runs high, re-picked twice a second
  float glint = step(0.994 - 0.004 * syn, interleavedGradientNoise(px + vec2(floor(u_time * 2.0) * 41.0, 0.0)));
  float sparkle = glint * active * (0.4 + 0.6 * syn);

  // the foil's colour: amber over soot, richer with synergy; the glints run hot toward the ink
  vec3 foil = oklabMix(u_ground.rgb, u_accent.rgb, 0.3 + 0.25 * syn);
  vec3 hi = oklabMix(u_accent.rgb, u_ink.rgb, 0.45);
  vec3 colour = mix(u_ground.rgb, foil, clamp(on * 0.9 + rimOn * 0.55, 0.0, 1.0));
  colour = mix(colour, hi, sparkle * 0.8);
  colour += vec3(interleavedGradientNoise(px) - 0.5) * 0.02;
  fragColor = vec4(colour, 1.0);
}
`,
  ),
  still: [
    "linear-gradient(135deg, color-mix(in srgb, var(--ui-accent) 22%, transparent) 0%, transparent 45%, color-mix(in srgb, var(--ui-accent) 12%, transparent) 100%)",
    "var(--ui-ground)",
  ].join(", "),
  reducedTime: 0.8,
};
