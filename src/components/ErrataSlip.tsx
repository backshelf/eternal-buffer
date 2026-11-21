// The Errata Slip: the one piece of short work the desk hands out at a time.
//
// It is not a card. It is a compact hairline strip in the right rail, above the Scribes: the ERRATA
// tag and reward on the micro-header line, the full readable objective below it, and the progress bar
// with Claim/Skip on the foot. The slip itself is rolled by the Vim feature, so this component never
// invents work — it only draws the slip already on the desk, asks for one once the desk is open, and
// presses the two actions.
import { useEffect } from "react";
import { cx, VisuallyHidden } from "watchpot/ui";
import { useGameState, useGameStore } from "../app/hooks";
import { glyphOf } from "../app/icons";
import { playEarned } from "../app/sound";
import { CURRENCY } from "../content/words";
import { Button } from "../ui/Button";
import s from "./ErrataSlip.module.css";

/** How many cells the strip's bar is cut into. */
const BAR_CELLS = 6;

/** Props of `ErrataSlip`: only the caller's class; everything else is on the store. */
export interface ErrataSlipProps {
  className?: string;
}

/**
 * The active Errata Slip as a compact hairline strip. It stays out of the way through the 0:00 lesson,
 * draws the first slip once Folio 0 is cleared, and turns its left rule to the accent when the work is
 * done. Claim pays the slip and rolls the next; Skip throws it away for the next. Neither ever pays
 * twice: the store refuses an unfinished slip, and a finished one is replaced the moment it is claimed.
 */
export function ErrataSlip({ className }: ErrataSlipProps) {
  const store = useGameStore();
  const active = useGameState((st) => st.vim.activeContract);
  const foliosCleared = useGameState((st) => st.vim.totalFoliosCleared);
  const veteran = useGameState((st) => st.settings.veteranMode);

  // The slip is short work, not part of the lesson: the desk stays quiet until the first Folio is closed.
  const revealed = foliosCleared > 0 || veteran;

  useEffect(() => {
    if (!revealed || active !== null) return;
    store.getState().vim.ensureContract();
  }, [revealed, active, store]);

  if (!revealed || active === null) return null;

  const word = CURRENCY[active.rewardCurrency];
  const reward = `+${active.rewardAmount} ${active.rewardAmount === 1 ? word.name : word.plural}`;
  const filled =
    active.target > 0
      ? Math.max(0, Math.min(BAR_CELLS, Math.round((active.progress / active.target) * BAR_CELLS)))
      : 0;

  /** Pays the finished slip, then rolls the one after it. An unfinished slip pays nothing. */
  const claim = () => {
    if (store.getState().vim.claimContract()) playEarned();
  };

  /** Throws the slip away for the next one, paying nothing. */
  const skip = () => {
    store.getState().vim.skipContract();
  };

  return (
    <section
      className={cx(s.slip, className)}
      aria-label="Errata slip"
      data-ready={active.completed ? "" : undefined}
    >
      <div className={s.head}>
        <span className={s.tag}>ERRATA</span>
        <span className={s.reward}>
          {glyphOf(word.glyph, 12)}
          <span className={s.rewardText}>{reward}</span>
        </span>
      </div>
      <p className={s.title}>{active.title}</p>
      <div className={s.foot}>
        <span className={s.meter} aria-hidden="true">
          <span className={s.meterLit}>{"█".repeat(filled)}</span>
          <span className={s.meterDim}>{"░".repeat(BAR_CELLS - filled)}</span>
        </span>
        <span className={s.count}>
          {active.progress}/{active.target}
        </span>
        <span className={s.action}>
          {active.completed ? (
            <Button className={s.button} variant="primary" onClick={claim}>
              Claim
            </Button>
          ) : (
            <Button className={s.button} variant="ghost" onClick={skip}>
              Skip
            </Button>
          )}
        </span>
      </div>
      <VisuallyHidden>
        {active.completed && <span role="status">{`Errata slip complete: ${active.title}.`}</span>}
      </VisuallyHidden>
    </section>
  );
}
