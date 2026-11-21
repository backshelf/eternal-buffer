import type { UniformKind } from "watchpot/shader";
import { BAYER, compose, GLOW, IGN, MOSAIC, OKLAB, SDF, uniformDecls } from "watchpot/shader";
import type { Surface } from "./surface";

/**
 * The uniforms the cursor halo declares: the palette, the mode's colour, the cursor, the run's weather, and the
 * glow's intensity (`u_glowIntensity`: 0 off, 0.55 subtle, 1 warm).
 */
export const BUFFER_GLOW_UNIFORMS = {
  u_ground: "vec4",
  u_ink: "vec4",
  u_accent: "vec4",
  u_modeColor: "vec4",
  u_cursor: "vec2",
  u_pulse: "float",
  u_flow: "float",
  u_glowIntensity: "float",
} as const satisfies Record<string, UniformKind>;

/**
 * The hero buffer's cursor halo: a warm 4x4 ordered-dither phosphor light pool that breathes around the Vim
 * cursor (`u_cursor`, 0..1 in the editor box) and takes the mode's tint (`u_modeColor`). Every Clean Cut rings
 * out: `u_pulse` sends a crisp dithered shockwave ring expanding from the cursor as it decays. Flow thickens the
 * tube — a broad warm haze at the edges that grows with `u_flow`. The pool is flat per 3px cell, so the light
 * steps in dots like a real low-res phosphor, and the output is premultiplied: transparent away from the cursor.
 *
 * The glow never washes out the editor's text: on a dark ground the pool and core darken toward `u_ground` and the
 * alpha behind the words is capped, on a light vellum the same parts become a soft warm paper-lamp tint at a
 * fainter cap still, and `u_glowIntensity` (0 off, 0.55 subtle, 1 warm) scales the whole halo to nothing at 0.
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
  float intensity = clamp(u_glowIntensity, 0.0, 1.0);
  // the ground's luminance picks the recipe: a dark tube darkens its glow so the editor's text stays
  // crisp through it, a light vellum blends a soft warm paper-lamp tint instead
  float isLight = smoothstep(0.42, 0.58, dot(u_ground.rgb, vec3(0.2126, 0.7152, 0.0722)));

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

  // colour: on a dark tube the pool and core darken toward the ground (never the ink) so white text
  // reads crisp through them; on a light vellum both soften into the paper-lamp's warm tint
  vec3 darkPool = oklabMix(u_ground.rgb, oklabMix(u_accent.rgb, u_modeColor.rgb, 0.55), 0.62);
  vec3 darkCore = oklabMix(u_ground.rgb, u_modeColor.rgb, 0.72);
  vec3 lampTint = oklabMix(u_ground.rgb, u_modeColor.rgb, 0.45);
  vec3 poolCol = mix(darkPool, lampTint, isLight);
  vec3 coreCol = mix(darkCore, lampTint, isLight);
  vec3 edgeCol = oklabMix(u_ground.rgb, u_accent.rgb, 0.4);
  vec3 colour = mix(poolCol, coreCol, coreOn * 0.5);
  colour = mix(colour, edgeCol, clamp(edgeOn * 1.6, 0.0, 1.0) * 0.6);

  // premultiplied: transparent away from the cursor, light where the phosphor is on. The glow that sits
  // behind the text is capped — 0.42 on a dark tube, 0.28 on a light vellum — so the words stay crisp;
  // the Clean Cut ring rides on top as it passes, and u_glowIntensity fades the whole halo to nothing at 0
  float darkGlow = clamp(on * 0.24 + coreOn * 0.16 + edgeOn * 0.10, 0.0, 0.42);
  float lightGlow = clamp(on * 0.16 + coreOn * 0.08 + edgeOn * 0.04, 0.0, 0.28);
  float alpha = clamp(mix(darkGlow, lightGlow, isLight) + mix(0.38, 0.28, isLight) * ringOn * pulse, 0.0, 1.0) * intensity;
  colour += vec3(interleavedGradientNoise(px) - 0.5) * 0.02;
  fragColor = vec4(colour * alpha, alpha);
}
`,
  ),
  still:
    "radial-gradient(circle at 50% 52%, color-mix(in srgb, var(--ui-accent) 18%, transparent) 0%, color-mix(in srgb, var(--ui-accent) 12%, transparent) 30%, transparent 68%)",
  reducedTime: 8,
};
