import type { UniformKind } from "watchpot/shader";
import {
  BAYER,
  compose,
  DOT_SCREENS,
  GLOW,
  HASH,
  IGN,
  MATH,
  MOSAIC,
  OKLAB,
  RASTER_FAULTS,
  SCANLINES,
  SDF,
  UV,
  uniformDecls,
} from "watchpot/shader";
import type { Surface } from "./surface";

/** The uniforms the Moment declares: the palette, and how far the 4.2s write-and-quit has played. */
export const CODEX_MOMENT_UNIFORMS = {
  u_ground: "vec4",
  u_ink: "vec4",
  u_accent: "vec4",
  u_progress: "float",
} as const satisfies Record<string, UniformKind>;

/**
 * The `:wq` Codex Rebind Moment, a four-phase ceremonial write-and-quit: the manuscript dissolves top-to-bottom
 * into coarse Bayer-dithered amber dust while the command bar glows (`u_progress` 0..0.30); everything left
 * collapses to one flickering horizontal phosphor line that gutters out into the deep void, where a golden tilde
 * walks left-to-right leaving a trail of empty-buffer tildes (0.30..0.55); the golden colophon bloom swells with
 * two dithered rings and a brass plate for the stamp (0.55..0.85); and the raster curtain lifts on the refreshed
 * archive, its golden octave already awake (0.85..1). Every phase is timed by `u_progress` alone, so a pinned or
 * reduced-motion frame is the same instant every time; `u_time` only feeds the row-slip shimmer.
 */
export const CODEX_MOMENT: Surface = {
  fragment: compose(
    MATH,
    HASH,
    BAYER,
    IGN,
    MOSAIC,
    DOT_SCREENS,
    RASTER_FAULTS,
    SDF,
    GLOW,
    OKLAB,
    SCANLINES,
    UV,
    uniformDecls(CODEX_MOMENT_UNIFORMS),
    `
// the moment's own easing: a smooth stop.
float ease(float t) {
  return t * t * (3.0 - 2.0 * t);
}

// centered-uv coordinates of a point given in CSS pixels.
vec2 cuAt(vec2 q) {
  vec2 res = u_resolution;
  return (q * max(u_pixelRatio, 1.0) - 0.5 * res) / min(res.x, res.y);
}

// one small wave glyph, two slanted strokes meeting in the middle: the empty buffer's tilde.
float tilde(vec2 q, float w) {
  float d1 = sdSegment(q, vec2(0.0, 0.0), vec2(w * 0.5, w * 0.26));
  float d2 = sdSegment(q, vec2(w * 0.5, w * 0.26), vec2(w, 0.0));
  return min(d1, d2);
}

void main() {
  vec2 px = floor(gl_FragCoord.xy / max(u_pixelRatio, 1.0));
  vec2 res = u_resolution / max(u_pixelRatio, 1.0);
  vec2 cu = centeredUv();
  vec2 uv = screenUv();
  float p = clamp(u_progress, 0.0, 1.0);
  float s = min(res.x, res.y);

  // the four phases, each on its own clock
  float pa = clamp(p / 0.30, 0.0, 1.0);
  float pb = clamp((p - 0.30) / 0.25, 0.0, 1.0);
  float pc = clamp((p - 0.55) / 0.30, 0.0, 1.0);
  float pd = clamp((p - 0.85) / 0.15, 0.0, 1.0);

  // === the manuscript page: the buffer being quit, centred, its lines ragged ===
  vec2 rel = px - 0.5 * res;
  vec2 pageHalf = vec2(0.31 * s, 0.34 * s);
  float inPage = 1.0 - smoothstep(-1.0, 1.0, sdBox(rel, pageHalf));
  float lineBand = step(fract(px.y / 9.0), 0.5);
  float chars = blockScreen(px, 7.0);
  float rowSeed = hash11(floor(px.y / 9.0) + 3.0);
  float lineLen = step(rel.x / pageHalf.x, mix(-0.1, 0.92, rowSeed));
  float text = lineBand * chars * lineLen;
  vec3 paperCol = oklabMix(u_ground.rgb, u_ink.rgb, 0.16);
  float paperDots = step(bayer8(floor(px / 2.0)), 0.85);
  vec3 pageCol = mix(u_ground.rgb, paperCol, paperDots);
  pageCol = mix(pageCol, u_ink.rgb, text * 0.8);

  // === phase A: the raster dissolve, top to bottom, into amber dust ===
  float frontY = res.y * (1.0 - pa);
  float gone = step(frontY, px.y);
  float pageCov = inPage * smoothstep(0.0, 0.02, p) * (1.0 - gone);

  float dustWin = smoothstep(0.0, 0.02, p) * (1.0 - smoothstep(0.30, 0.5, p));
  vec2 dp = px;
  dp.x += rowSkew(px.y, 9.0, floor(p * 24.0)) * 3.0;
  float above = px.y - frontY;
  float thin = exp(-max(above, 0.0) / (0.22 * res.y));
  vec2 fall = floor((dp + vec2(0.0, p * 0.45 * res.y)) / 3.0);
  float dustPat = step(bayer8(fall), clamp(0.26 + 0.4 * thin, 0.0, 1.0));
  float dust = dustPat * gone * dustWin;
  vec3 dustCol = oklabMix(u_accent.rgb, u_ink.rgb, 0.35);

  float frontWin = smoothstep(0.0, 0.02, pa) * (1.0 - smoothstep(0.985, 1.0, pa));
  float frontOn = step(bayer4(dp), glow(abs(dp.y - frontY), 5.0)) * frontWin;
  vec3 frontCol = oklabMix(u_accent.rgb, u_ink.rgb, 0.2);

  // the command bar: where ":wq" was typed, glowing while the dissolve runs
  float barD = sdBox(cu - vec2(0.0, -0.38), vec2(0.34, 0.05));
  float barWin = smoothstep(0.0, 0.03, p) * (1.0 - smoothstep(0.20, 0.30, p));
  float barFill = (1.0 - smoothstep(0.0, 0.004, barD)) * barWin;
  float barOn = step(bayer4(floor(px / 2.0)), clamp(barFill * 1.2, 0.0, 1.0)) * (1.0 - gone);
  vec3 barCol = oklabMix(u_accent.rgb, u_ink.rgb, 0.25);

  // === phase B: the collapse to one glowing horizontal phosphor line, then the void ===
  float lineLife = sin(PI * pb);
  float flicker = 0.82 + 0.18 * sin(p * 260.0);
  float lineWin = smoothstep(0.29, 0.31, p) * (1.0 - smoothstep(0.53, 0.56, p));
  float lineD = abs(cu.y) * mix(80.0, 26.0, lineLife);
  float lineOn = step(bayer4(px), clamp(glowExp(lineD, 1.0) * lineLife * flicker, 0.0, 1.0)) * lineWin;
  float lineCore = (1.0 - smoothstep(1.5, 2.5 + 3.0 * lineLife, abs(cu.y) * s)) * lineLife * flicker * lineWin;
  vec3 lineCol = oklabMix(u_accent.rgb, u_ink.rgb, 0.3);

  float voidWin = smoothstep(0.38, 0.52, p);
  vec3 voidCol = oklabMix(u_ground.rgb, vec3(0.0), 0.6);

  // the tilde walk: one golden wave crossing the void, a fading trail of empty-buffer tildes behind it
  float walk = clamp((p - 0.42) / 0.38, 0.0, 1.0);
  float walkWin = smoothstep(0.40, 0.44, p) * (1.0 - smoothstep(0.78, 0.84, p));
  float tildeCov = 0.0;
  for (int k = 0; k < 9; k++) {
    float fk = float(k);
    float tx = (mix(0.12, 0.9, walk) - fk * 0.085) * res.x;
    if (tx > -16.0) {
      vec2 q = vec2(px.x - tx, px.y - 0.52 * res.y);
      float glyph = 1.0 - smoothstep(1.2, 2.2, tilde(q, 15.0));
      tildeCov = max(tildeCov, glyph * pow(0.72, fk));
    }
  }
  tildeCov *= walkWin;
  vec3 tildeCol = oklabMix(u_accent.rgb, u_ink.rgb, 0.5);

  // === phase C: the golden colophon bloom, two dithered rings, and the brass plate for the stamp ===
  float swell = sin(PI * pc);
  float bloomWin = smoothstep(0.54, 0.57, p) * (1.0 - smoothstep(0.83, 0.87, p));
  float bdist = distance(cuAt(mosaicCentre(px, 4.0)), vec2(0.0, 0.06));
  float bloom = glowExp(bdist, mix(5.0, 1.5, ease(pc))) * swell;
  float bloomOn = step(bayer4(floor(px / 3.0)), clamp(bloom, 0.0, 1.0)) * bloomWin;
  float ring1 = glow(abs(bdist - (0.08 + 0.55 * pc)), 0.05) * swell;
  float ring2 = glow(abs(bdist - (0.04 + 0.85 * pc)), 0.07) * swell * 0.7;
  bloomOn = max(bloomOn, step(bayer8(floor(px / 2.0)), clamp(max(ring1, ring2), 0.0, 1.0)) * bloomWin);
  vec3 bloomCol = oklabMix(u_accent.rgb, u_ink.rgb, 0.5);

  float plateWin = smoothstep(0.60, 0.68, p) * (1.0 - smoothstep(0.82, 0.87, p));
  float plateD = sdBox(cu - vec2(0.0, 0.14), vec2(0.44, 0.055));
  float plateIn = 1.0 - smoothstep(0.0, 0.004, plateD);
  float plateFrame = (1.0 - smoothstep(1.5, 2.5, abs(plateD) * s)) * plateWin;
  float plateFill = step(bayer8(floor(px / 2.0)), 0.5) * plateIn * plateWin;
  vec3 plateCol = oklabMix(u_accent.rgb, u_ink.rgb, 0.35);

  // === phase D: the raster curtain lifts on the refreshed archive, golden octave awake ===
  float liftY = pd * (res.y + 24.0);
  float revealed = 1.0 - smoothstep(liftY - 1.5, liftY + 1.5, px.y);
  vec2 ep = px;
  ep.x += rowSkew(px.y, 7.0, floor(p * 30.0)) * 4.0 * (1.0 - 0.7 * pd);
  float edgeGlow = glow(abs(ep.y - liftY), 5.0) * (1.0 - smoothstep(0.96, 1.0, pd));
  float edgeOn = step(bayer4(ep), clamp(edgeGlow, 0.0, 1.0));
  edgeOn *= 1.0 - deadDot(ep.x, 3.0, 0.02) * (1.0 - pd);

  float lamp = glowExp(distance(cu, vec2(0.0, 0.08)), 2.6);
  float soot = step(bayer4(floor(px / 2.0)), clamp(0.2 + 0.1 * lamp, 0.0, 1.0));
  int lampLevel = int(clamp(lamp * 5.0 + 0.5, 0.0, 5.0));
  float dotsOn = dotScreen(lampLevel, px);
  float gold = step(bayer8(floor((px + vec2(2.0, -1.0)) / 4.0)), clamp(lamp * 0.5, 0.0, 1.0));
  vec3 archiveCol = mix(u_ground.rgb, oklabMix(u_ground.rgb, u_ink.rgb, 0.09), soot);
  archiveCol = mix(archiveCol, oklabMix(u_ground.rgb, u_accent.rgb, 0.4), dotsOn * 0.8);
  archiveCol = mix(archiveCol, oklabMix(u_accent.rgb, u_ink.rgb, 0.55), gold * 0.45);

  // === the composition, back to front ===
  vec3 colour = mix(u_ground.rgb, voidCol, voidWin);
  colour = mix(colour, dustCol, clamp(dust, 0.0, 1.0) * 0.85);
  colour = mix(colour, pageCol, pageCov);
  colour = mix(colour, barCol, barOn * 0.9);
  colour = mix(colour, frontCol, frontOn);
  colour = mix(colour, lineCol, clamp(lineOn * 0.8 + lineCore, 0.0, 1.0));
  colour = mix(colour, tildeCol, tildeCov * 0.9);
  colour = mix(colour, bloomCol, bloomOn * 0.5);
  colour = mix(colour, plateCol, clamp(plateFill * 0.45 + plateFrame, 0.0, 1.0));
  colour = mix(colour, archiveCol, revealed);
  colour = mix(colour, oklabMix(u_accent.rgb, u_ink.rgb, 0.2), edgeOn * 0.85);

  // the tube over everything: scanlines and one last dither
  colour *= scanlines(uv.y, res.y / 3.0, 0.05);
  colour += vec3(interleavedGradientNoise(px) - 0.5) * 0.015;
  fragColor = vec4(colour, 1.0);
}
`,
  ),
  still: [
    // the golden bloom, coarsely stippled
    "radial-gradient(circle at 50% 46%, color-mix(in srgb, var(--ui-accent) 42%, transparent) 0%, color-mix(in srgb, var(--ui-accent) 18%, transparent) 34%, transparent 72%)",
    "repeating-linear-gradient(to bottom, transparent 0 2px, color-mix(in srgb, var(--ui-ground) 35%, transparent) 2px 3px)",
    "var(--ui-ground)",
  ].join(", "),
  reducedTime: 0.65,
};
