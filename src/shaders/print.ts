import {
  BAYER,
  compose,
  DOT_SCREENS,
  FBM,
  GLOW,
  IGN,
  MOSAIC,
  OKLAB,
  RASTER_FAULTS,
  SCANLINES,
  UV,
  uniformDecls,
  VIGNETTE,
} from "watchpot/shader";
import { BACKDROP_UNIFORMS, type Surface } from "./surface";

/**
 * The archive room: an amber phosphor monitor printing onto coarse Bayer-dithered soot. One warm lamp pool
 * breathes over the desk and swells with `u_heat`; a Clean Cut (`u_pulse`) sends a dithered ring out across the
 * room; while Vim Flow runs hot (`u_flow` > 0.6) a few bands of rows slip out of true, and rare dead columns
 * gutter in the phosphor; each Codex Rebind (`u_depth`) wakes a second golden harmonic octave, printed a hair out
 * of register at half the cell size. Tone is quantised to one-bit dot patterns, colour is mixed in OKLab, and one
 * last interleaved-gradient dither keeps the ambers from banding. On a light vellum ground the soot thins, the
 * scanlines soften and the vignette lifts, so the paper themes stay bright, warm and legible.
 */
export const ARCHIVE_BACKDROP: Surface = {
  fragment: compose(
    BAYER,
    FBM,
    GLOW,
    IGN,
    MOSAIC,
    DOT_SCREENS,
    RASTER_FAULTS,
    OKLAB,
    SCANLINES,
    UV,
    VIGNETTE,
    uniformDecls(BACKDROP_UNIFORMS),
    `
// centered-uv coordinates of a point given in CSS pixels: the space the lamp lives in.
vec2 cuAt(vec2 q) {
  vec2 res = u_resolution;
  return (q * max(u_pixelRatio, 1.0) - 0.5 * res) / min(res.x, res.y);
}

// the room's light at a point in CSS pixels: one warm lamp over the desk, breathing, with the pulse's ring.
float lampTone(vec2 q) {
  float heat = clamp(u_heat, 0.0, 1.0);
  float pulse = clamp(u_pulse, 0.0, 1.0);
  float dist = distance(cuAt(q), vec2(0.0, 0.08));
  float pool = glowExp(dist, 2.6 + 1.4 * heat);
  float breath = 0.55 + 0.05 * sin(u_time * 0.35);
  // a Clean Cut ripples out from the lamp, the ring widening as the pulse decays
  float ringR = 0.12 + 0.75 * (1.0 - pulse);
  float ring = glow(abs(dist - ringR), 0.05) * pulse;
  return clamp(pool * breath * (0.55 + 0.5 * heat) + ring, 0.0, 1.0);
}

void main() {
  // in CSS pixels, so the print stays coarse on a sharp display
  vec2 px = floor(gl_FragCoord.xy / max(u_pixelRatio, 1.0));
  vec2 uv = screenUv();
  float heat = clamp(u_heat, 0.0, 1.0);
  float flow = clamp(u_flow, 0.0, 1.0);
  float depth = clamp(u_depth, 0.0, 1.0);
  // a light vellum ground keeps the room bright: thinner soot, fainter scanlines, a lifted vignette
  float isLight = smoothstep(0.42, 0.58, dot(u_ground.rgb, vec3(0.2126, 0.7152, 0.0722)));

  // the raster fault: while Flow runs hot, a few bands of rows slip sideways
  px.x += rowSkew(px.y, 7.0, floor(u_time * 2.0)) * 3.0 * smoothstep(0.6, 1.0, flow);

  // the soot: a slow ink-blot drift over the ground, heavier toward the foot, thinner on a light vellum
  float blot = 0.5 + 0.5 * fbm(cuAt(px) * 1.3 + vec2(u_time * 0.02, -u_time * 0.014), 4);
  float soot = clamp(mix(blot, 1.0 - uv.y, 0.35) * (0.26 + 0.14 * heat), 0.0, 1.0) * mix(1.0, 0.45, isLight);
  float raised = step(bayer4(floor(px / 2.0)), soot);

  // the phosphor print: the lamp's tone, flat across each coarse cell, one bit-pattern per level
  float tone = lampTone(mosaicCentre(px, 9.0));
  int level = int(clamp(tone * 5.0 + 0.5, 0.0, 5.0));
  float dead = deadDot(px.x, 11.0, 0.003);
  float on = dotScreen(level, px) * (1.0 - dead);

  // the golden harmonic: the same tone an octave finer and a hair out of register, waking with each Rebind
  float goldTone = lampTone(mosaicCentre(px + vec2(2.0, -1.0), 4.0));
  int goldLevel = int(clamp(goldTone * depth * 5.0 + 0.5, 0.0, 5.0));
  float goldOn = dotScreen(goldLevel, px + vec2(3.0, 1.0)) * depth;

  // the room's colour, mixed in OKLab so the ambers never go muddy (text sits on this)
  vec3 colour = u_ground.rgb;
  colour = mix(colour, oklabMix(u_ground.rgb, u_ink.rgb, 0.09), raised);
  colour = mix(colour, oklabMix(u_ground.rgb, u_accent.rgb, 0.5), on * 0.8);
  colour = mix(colour, oklabMix(u_accent.rgb, u_ink.rgb, 0.55), goldOn * 0.5);

  // the tube: faint horizontal scanlines, a soft vignette, one last dither against banding. On a light
  // vellum the scanlines all but vanish and the vignette floor lifts, so the paper themes stay bright
  float lines = u_resolution.y / (3.0 * max(u_pixelRatio, 1.0));
  colour *= scanlines(uv.y, lines, mix(0.05, 0.018, isLight));
  float vignFloor = mix(0.62, 0.88, isLight);
  colour *= vignFloor + (1.0 - vignFloor) * vignette(uv, 0.95, 0.6);
  colour += vec3(interleavedGradientNoise(px) - 0.5) * 0.015;
  fragColor = vec4(colour, 1.0);
}
`,
  ),
  still: [
    // the lamp's pool, printed as a broad stipple of amber
    "radial-gradient(circle at 50% 42%, color-mix(in srgb, var(--ui-accent) 34%, transparent) 0%, color-mix(in srgb, var(--ui-accent) 14%, transparent) 26%, transparent 62%)",
    // the soot's tooth, one dot to a coarse cell
    "radial-gradient(circle at 4px 4px, color-mix(in srgb, var(--ui-ink) 5%, transparent) 1px, transparent 1.6px) 0 0 / 9px 9px",
    // the tube's shadow
    "repeating-linear-gradient(to bottom, transparent 0 2px, color-mix(in srgb, var(--ui-ground) 30%, transparent) 2px 3px)",
    "linear-gradient(to top, color-mix(in srgb, var(--ui-ink) 7%, transparent), transparent 55%)",
    "var(--ui-ground)",
  ].join(", "),
  reducedTime: 18,
};

/** The scaffold's name for the archive backdrop, kept so `look.surface.base` readers still find it. */
export const PRINT = ARCHIVE_BACKDROP;
