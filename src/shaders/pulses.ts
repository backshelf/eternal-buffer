import { createPulse } from "watchpot/shader";

/**
 * A Clean Cut's light: jumps to 1 the frame the cut lands and falls back over 550ms. `usePulseUniform` feeds it to
 * a canvas as `u_pulse` (a dithered ring crossing the buffer, a ripple across the archive room), a frame at a
 * time, with no React render.
 */
export const cleanCutPulse = createPulse(550, () => performance.now());

/** A folio cleared: a wider, softer wash over the buffer, 900ms. */
export const folioClearPulse = createPulse(900, () => performance.now());

/**
 * What the cursor bridge drives: the Vim cursor's place in the editor box (0..1, y up from the foot) and the
 * mode's colour as straight (non-premultiplied) RGBA, pushed to the canvas's `u_cursor` and `u_modeColor` through
 * its handle — every cursor move, never a React render. Wave 6 implements this against `ShaderHandle`;
 * `BufferEditor` (T16) holds the reference.
 */
export interface CursorUniformTarget {
  setCursor(nx: number, ny: number, modeColor: [number, number, number, number]): void;
}

/** Hears the Moment open and close. */
export type MomentListener = (active: boolean) => void;

/** The `:wq` Moment's state, as a pub/sub: `:wq` or `#dev` triggers it, whoever renders it subscribes. */
export interface MomentState {
  /** Opens the Moment; false, with no event, if one is already playing. */
  trigger(): boolean;
  /** Closes it; false if none is playing. */
  finish(): boolean;
  /** Hears `true` on open and `false` on close; returns the unsubscribe. */
  subscribe(hear: MomentListener): () => void;
  /** Whether the Moment is playing now. */
  isActive(): boolean;
}

function createMomentState(): MomentState {
  let active = false;
  const listeners = new Set<MomentListener>();
  return {
    trigger: () => {
      if (active) {
        return false;
      }
      active = true;
      for (const hear of listeners) {
        hear(true);
      }
      return true;
    },
    finish: () => {
      if (!active) {
        return false;
      }
      active = false;
      for (const hear of listeners) {
        hear(false);
      }
      return true;
    },
    subscribe: (hear) => {
      listeners.add(hear);
      return () => {
        listeners.delete(hear);
      };
    },
    isActive: () => active,
  };
}

/** The Moment's state: `MomentOverlay` (T17) subscribes and drives `u_progress` over its 4.2s timeline. */
export const momentState: MomentState = createMomentState();
