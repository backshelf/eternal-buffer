import { useRef } from "react";
import { useReducedMotion } from "watchpot/kit";
import {
  type Pulse,
  ShaderCanvas,
  type ShaderHandle,
  usePulseUniform,
  useShaderTokens,
} from "watchpot/shader";
import { cx } from "watchpot/ui";
import s from "./Backdrop.module.css";

/** A pulse that never fires: what the canvas reads as `u_pulse` when the page has no Clean Cut to show. */
const STILL_PULSE: Pulse = {
  bump: () => {},
  value: () => 0,
  subscribe: () => () => {},
};

/** Props of `Backdrop`: the fragment and its still, the run's heat, Flow and depth, and its moment. */
export interface BackdropProps {
  /**
   * GLSL ES 3.00 after the engine's `SHADER_HEAD`, declaring `u_ground`, `u_ink`, `u_accent` (vec4) and `u_heat`
   * (float): the game's own, from `src/shaders/`.
   */
  fragment: string;
  /** A CSS `background` of the same idea, shown without WebGL2 or when the fragment fails. */
  still: string;
  /** 0..1: how well the run is going. */
  heat?: number;
  /** 0..1: the live Vim Flow, which thickens the phosphor and lets the raster fault. */
  flow?: number;
  /** 0..1: how deep the archive is (Codex Rebinds), which wakes the golden second octave. */
  depth?: number;
  /** A `createPulse` the page bumps on a Clean Cut: feeds `u_pulse` a frame at a time, with no render. */
  pulse?: Pulse;
  /** The most frames drawn a second: a backdrop only has weather to show. Default 24. */
  fps?: number;
  /** The `u_time` held under reduced motion. */
  reducedTime?: number;
  className?: string;
}

/**
 * A living backdrop fixed behind the page, on `ShaderCanvas`: its palette is the theme's `--ui-ground`, `--ui-ink`
 * and `--ui-accent` (read by `useShaderTokens`, so a scheme change recolours it), it holds one frame under reduced
 * motion, it draws only while the page shows, and without WebGL2 it is the CSS still. A fragment that fails says why
 * in the console, at its own line numbers.
 */
export function Backdrop({
  fragment,
  still,
  heat = 0,
  flow = 0,
  depth = 0,
  pulse,
  fps = 24,
  reducedTime = 12,
  className,
}: BackdropProps) {
  const scope = useRef<HTMLDivElement>(null);
  const canvas = useRef<ShaderHandle>(null);
  const reduced = useReducedMotion();
  const palette = useShaderTokens(scope, ["--ui-ground", "--ui-ink", "--ui-accent"]);
  // Unconditional: a page without a pulse still reads a (permanently flat) one, so the hook order never changes.
  usePulseUniform(canvas, pulse ?? STILL_PULSE);
  const fallback = <div className={s.still} style={{ background: still }} />;
  return (
    <div ref={scope} className={cx(s.backdrop, className)} aria-hidden="true">
      {palette ? (
        <ShaderCanvas
          ref={canvas}
          className={s.canvas}
          fragment={fragment}
          uniforms={{
            u_ground: palette["--ui-ground"],
            u_ink: palette["--ui-ink"],
            u_accent: palette["--ui-accent"],
            u_heat: heat,
            u_flow: Math.min(1, Math.max(0, flow)),
            u_depth: Math.min(1, Math.max(0, depth)),
          }}
          fps={fps}
          reduced={reduced}
          reducedTime={reducedTime}
          maxPixels={1_000_000}
          still={fallback}
          onError={(log) => console.error(`backdrop shader: ${log}`)}
        />
      ) : (
        fallback
      )}
    </div>
  );
}
