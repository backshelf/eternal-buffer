import type { UniformKind } from "watchpot/shader";
import { BAYER, compose, GLOW, IGN, MOSAIC, OKLAB, SDF, uniformDecls } from "watchpot/shader";
import type { Surface } from "./surface";

/** The uniforms the cursor halo declares: the palette, the mode's colour, the cursor, and the run's weather. */
export const BUFFER_GLOW_UNIFORMS = {
  u_ground: "vec4",
  u_ink: "vec4",
  u_accent: "vec4",
  u_modeColor: "vec4",
  u_cursor: "vec2",
  u_pulse: "float",
  u_flow: "float",
} as const satisfies Record<string, UniformKind>;

/**
 * The hero buffer's cursor halo: a warm 4x4 ordered-dither phosphor light pool that breathes around the Vim
 * cursor (`u_cursor`, 0..1 in the editor box) and takes the mode's tint (`u_modeColor`). Every Clean Cut rings
 * out: `u_pulse` sends a crisp dithered shockwave ring expanding from the cursor as it decays. Flow thickens the
 * tube — a broad warm haze at the edges that grows with `u_flow`. The pool is flat per 3px cell, so the light
 * steps in dots like a real low-res phosphor, and the output is premultiplied: transparent away from the cursor.
 */
export const BUFFER_GLOW: Surface = {
  fragment: compose(
    BAYER,
    GLOW,
    IGN,
    MOSAIC,
    OKLAB,
    SDF,
    uniformDecls(BUFFER_GLOW_UNIFORMS),
    `
// centered-uv coordinates of a point given in CSS pixels: the space the cursor's light lives in.
vec2 cuAt(vec2 q) {
  vec2 res = u_resolution;
  return (q * max(u_pixelRatio, 1.0) - 0.5 * res) / min(res.x, res.y);
}

void main() {
  vec2 px = floor(gl_FragCoord.xy / max(u_pixelRatio, 1.0));
  float flow = clamp(u_flow, 0.0, 1.0);
  float pulse = clamp(u_pulse, 0.0, 1.0);
  float mode = clamp(u_modeColor.a, 0.0, 1.0);

  // the cursor in the same square-pixel space as cuAt (y up from the editor box's foot)
  vec2 cur = (u_cursor - 0.5) * u_resolution / min(u_resolution.x, u_resolution.y);

  // the pool: flat across each 3px cell, printed as a 4x4 ordered dither, breathing
  vec2 cell = mosaicCentre(px, 3.0);
  vec2 at = cuAt(cell) - cur;
  float dist = length(at);
  float breath = 0.62 + 0.06 * sin(u_time * 1.1);
  float pool = glowExp(dist, 3.1 + 2.3 * flow) * breath * mode;
  float on = step(bayer4(cell), clamp(pool, 0.0, 1.0));

  // the cursor's own phosphor core, the mode's colour run hot
  float core = glow(sdCircle(at, 0.045), 0.035) * mode;
  float coreOn = step(bayer4(px), clamp(core, 0.0, 1.0));

  // the Clean Cut shockwave: a crisp dithered ring expanding from the cursor as the pulse decays
  float ringR = 0.06 + 0.46 * (1.0 - pulse);
  float ring = glow(sdRing(at, ringR, 0.035 + 0.05 * pulse), 0.05) * pulse;
  float ringOn = step(bayer4(floor(px / 2.0)), clamp(ring, 0.0, 1.0));

  // the warm edge: a broad amber haze, always the tube's colour, thickening with Flow
  float edge = glow(dist, 0.55 + 0.3 * flow) * (0.1 + 0.38 * flow);
  float edgeOn = step(bayer8(floor(px / 4.0)), clamp(edge, 0.0, 1.0));

  // colour: the pool takes the mode's tint, the hot core whitens like an overdriven phosphor
  vec3 poolCol = oklabMix(u_accent.rgb, u_modeColor.rgb, 0.62);
  vec3 coreCol = oklabMix(u_modeColor.rgb, u_ink.rgb, 0.25);
  vec3 edgeCol = oklabMix(u_ground.rgb, u_accent.rgb, 0.4);
  vec3 colour = mix(poolCol, coreCol, coreOn * 0.5);
  colour = mix(colour, edgeCol, clamp(edgeOn * 1.6, 0.0, 1.0) * 0.6);

  // premultiplied: transparent away from the cursor, light where the phosphor is on
  float alpha = clamp(on * 0.4 + coreOn * 0.36 + ringOn * 0.55 * pulse + edgeOn * 0.16, 0.0, 1.0);
  colour += vec3(interleavedGradientNoise(px) - 0.5) * 0.02;
  fragColor = vec4(colour * alpha, alpha);
}
`,
  ),
  still:
    "radial-gradient(circle at 50% 52%, color-mix(in srgb, var(--ui-accent) 30%, transparent) 0%, color-mix(in srgb, var(--ui-accent) 12%, transparent) 30%, transparent 68%)",
  reducedTime: 8,
};
