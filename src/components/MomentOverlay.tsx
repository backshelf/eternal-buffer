import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { D, type Decimal, type DecimalSource, fmt } from "watchpot/core";
import { Count, readingMs, useReducedMotion } from "watchpot/kit";
import { ShaderCanvas, type ShaderHandle, shaderClockPin, useShaderTokens } from "watchpot/shader";
import { cx } from "watchpot/ui";
import { useGameState, useGameStore } from "../app/hooks";
import { playRebindCodex } from "../app/sound";
import { CURRENCY } from "../content/words";
import { codex } from "../game/prestige";
import { CODEX_MOMENT } from "../shaders/codexMoment";
import { momentState } from "../shaders/pulses";
import { Button } from "../ui/Button";
import s from "./MomentOverlay.module.css";

/** The Moment's whole timeline: four phases of `CODEX_MOMENT`, the sweep from 0 to 1. */
const MOMENT_MS = 4200;
/** Where the void opens and Tilde's pad trail starts printing tildes. */
const TRAIL_AT = 0.28;
/** Where the colophon blooms and the card is stamped. */
const COLOPHON_AT = 0.58;
/** The one frame a still or pinned Moment holds: the golden bloom with the brass plate under it. */
const STILL_AT = 0.68;
/** How many tildes she leaves behind her, and how long the pad takes across the void (0.28 to 0.58). */
const TRAIL = "~ ".repeat(40);
const TRAIL_MS = Math.round((COLOPHON_AT - TRAIL_AT) * MOMENT_MS);

/** The archive's line under the stamp. */
const COLOPHON_LINE =
  "The page is closed, the Codex is bound, and the next epoch is already waiting under the lamp.";
/** How long the still card holds: the line's own words, at the engine's reading pace. */
const COLOPHON_WORDS = COLOPHON_LINE.trim().split(/\s+/).length;

/** The last time the ceremony was cued, so a doubled mount in development never plays it twice. */
let cuedAt = 0;

function cue(): void {
  const now = Date.now();
  if (now - cuedAt < 800) return;
  cuedAt = now;
  playRebindCodex();
}

/** Props of `MomentOverlay`: the Codex the rebind paid, when the caller already has it, and the caller's class. */
export interface MomentOverlayProps {
  /**
   * The Codex gain to stamp on the colophon. Left out, the overlay works it out from the wallet — the balance after
   * the rebind against the balance the pass before it.
   */
  count?: DecimalSource;
  className?: string;
}

/**
 * The `:wq` Codex Rebind Moment: a full-viewport overlay over `CODEX_MOMENT`, its timeline run by hand from 0 to 1 over
 * 4.2s, Tilde's tildes padding across the void, then the CODEX REBOUND colophon with the rolled payout and a
 * Continue. `momentState` opens and closes it; it finishes itself at the end of the timeline. A pinned shader clock
 * holds the same instant for a deterministic screenshot, and reduced motion skips the sweep for the still colophon
 * with the Continue already there.
 */
export function MomentOverlay({ count, className }: MomentOverlayProps) {
  const active = useSyncExternalStore(momentState.subscribe, momentState.isActive, momentState.isActive);
  // Read here, not in the stage: the stage mounts after the Moment opens, and the gain is the wallet's change
  // *into* that opening.
  const gain = useCodexGain(count, active);
  useEffect(() => {
    if (active) cue();
  }, [active]);
  if (!active) return null;
  return <MomentStage count={gain} className={className} />;
}

/** The Moment itself: mounted only while `momentState` says it plays, so opening it starts the timeline over. */
function MomentStage({ count, className }: MomentOverlayProps) {
  const reduced = useReducedMotion();
  const scope = useRef<HTMLDivElement>(null);
  const canvas = useRef<ShaderHandle>(null);
  const palette = useShaderTokens(scope, ["--ui-ground", "--ui-ink", "--ui-accent"]);
  const gain = count === undefined ? D(0) : D(count);
  const epoch = useGameState((st) => st.codex.runs);
  const [phase, setPhase] = useState<0 | 1 | 2>(reduced ? 2 : 0);

  const dismiss = useCallback(() => {
    momentState.finish();
  }, []);

  // The timeline: u_progress goes to the canvas by handle, so the sweep costs no React render; only the two phase
  // changes (the pad trail and the colophon) re-render the card. A pinned shader clock is read as seconds into the
  // same 4.2s, so a still screenshot holds one exact instant; unpinning carries on from there.
  useEffect(() => {
    if (reduced) return;
    let frame = 0;
    let base = performance.now();
    const step = (now: number) => {
      const pin = shaderClockPin();
      let p: number;
      if (pin === null) {
        p = Math.min(1, Math.max(0, (now - base) / MOMENT_MS));
      } else {
        p = Math.min(1, Math.max(0, pin / (MOMENT_MS / 1000)));
        base = now - p * MOMENT_MS;
      }
      canvas.current?.setUniforms({ u_progress: p });
      setPhase(p >= COLOPHON_AT ? 2 : p >= TRAIL_AT ? 1 : 0);
      if (pin === null && p >= 1) {
        momentState.finish();
        return;
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [reduced]);

  // A still Moment has no timeline: the uniforms below hold the bloom frame, and the card closes itself after the time
  // its words need to read. Continue is there the whole while.
  useEffect(() => {
    if (!reduced) return;
    const hold = setTimeout(() => momentState.finish(), readingMs(COLOPHON_WORDS));
    return () => clearTimeout(hold);
  }, [reduced]);

  // The Moment is a dialog over everything: Escape leaves it, as a ceremony should allow.
  useEffect(() => {
    const hear = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    addEventListener("keydown", hear);
    return () => removeEventListener("keydown", hear);
  }, [dismiss]);

  return (
    <div
      ref={scope}
      className={cx(s.overlay, className)}
      role="dialog"
      aria-modal="true"
      aria-label="Codex Rebound"
      data-phase={phase}
    >
      {palette ? (
        <ShaderCanvas
          ref={canvas}
          className={s.canvas}
          fragment={CODEX_MOMENT.fragment}
          uniforms={{
            u_ground: palette["--ui-ground"],
            u_ink: palette["--ui-ink"],
            u_accent: palette["--ui-accent"],
            ...(reduced ? { u_progress: STILL_AT } : {}),
          }}
          reduced={reduced}
          reducedTime={CODEX_MOMENT.reducedTime}
          maxPixels={1_000_000}
          fps={30}
          still={<div className={s.still} style={{ background: CODEX_MOMENT.still }} />}
          onError={(log) => console.error(`codex moment shader: ${log}`)}
        />
      ) : (
        <div className={s.still} style={{ background: CODEX_MOMENT.still }} />
      )}

      {!reduced && phase === 1 && (
        <p className={s.trail} style={{ animationDuration: `${TRAIL_MS}ms` }} aria-hidden="true">
          {TRAIL}
        </p>
      )}

      {phase === 2 && (
        <div className={s.colophon} data-still={reduced ? "" : undefined}>
          <p className={s.kicker} aria-hidden="true">
            :wq
          </p>
          <p className={s.title}>CODEX REBOUND</p>
          <p className={s.epoch}>EPOCH {epoch}</p>
          <p className={s.gain}>
            <Count to={gain} ms={700} format={(value) => fmt(value).text} skip={reduced} />
            <span className={s.unit}> {CURRENCY.codices.plural} bound</span>
          </p>
          <p className={s.line}>{COLOPHON_LINE}</p>
          <Button variant="primary" onClick={dismiss}>
            Continue
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * The Codex the rebind paid: the count the caller handed in, or the wallet's codices after the rebind against the
 * balance the pass before it. A rebind credits a wallet that no reset touches, so the difference is the gain.
 */
function useCodexGain(count: DecimalSource | undefined, active: boolean): Decimal {
  const store = useGameStore();
  const [gain, setGain] = useState<Decimal>(() => D(0));
  const before = useRef<Decimal>(D(0));
  useEffect(() => {
    before.current = codex.select.held(store.getState());
    return store.subscribe((_next, prev) => {
      before.current = codex.select.held(prev);
    });
  }, [store]);
  useEffect(() => {
    if (!active || count !== undefined) return;
    const after = codex.select.held(store.getState());
    const paid = after.sub(before.current);
    setGain(paid.gt(0) ? paid : after);
  }, [active, store, count]);
  return count === undefined ? gain : D(count);
}
