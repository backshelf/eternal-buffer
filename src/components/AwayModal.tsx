import { AWAY_REPORT_MIN_MS, D, fmt } from "watchpot/core";
import { type AwayGain, awayGains, useAwayReport } from "watchpot/react";
import { glyphOf } from "../app/icons";
import { awaySummaryLine } from "../content/ticker";
import { CURRENCY, type Currency } from "../content/words";
import type { GameState } from "../game/game";
import { Button } from "../ui/Button";
import { Sheet } from "../ui/Sheet";
import s from "./AwayModal.module.css";

/** What the journal keeps of a return: how long the desk was empty and every figure that went up. */
interface Journal {
  ms: number;
  gains: readonly AwayGain[];
}

/** The four figures the journal reports, in the order it reads them. */
const REPORTED: Readonly<Record<string, Currency>> = {
  glyphs: "glyphs",
  ink: "ink",
  shards: "shards",
  treats: "treats",
};

/**
 * The Midnight Archivist's journal: what the archive kept doing while the desk was empty, in the game's own line and
 * the figures that went up. `useAwayReport` hears the return, so it only opens on a real absence (past the engine's
 * report threshold) that actually paid something; Escape and the sheet's scrim close it.
 */
export function AwayModal() {
  const { report, dismiss } = useAwayReport<GameState, Journal>((away) => {
    const gains = awayGains(away.before, away.after, {
      glyphs: (st) => st.wallet.glyphs,
      ink: (st) => st.wallet.ink,
      shards: (st) => st.wallet.shards,
      treats: (st) => st.wallet.treats,
    });
    if (away.ms < AWAY_REPORT_MIN_MS || gains.length === 0) return null;
    return { ms: away.ms, gains };
  });

  if (report === null) return null;

  const paid = (id: Currency) => report.gains.find((gain) => gain.id === id)?.gain;
  const summary = awaySummaryLine(report.ms, fmt(paid("glyphs") ?? D(0)).text, fmt(paid("ink") ?? D(0)).text);

  return (
    <Sheet
      title="The Midnight Archivist's Journal"
      description="What the archive did while the desk was empty."
      onClose={dismiss}
      actions={
        <Button variant="primary" onClick={dismiss}>
          Back to the desk
        </Button>
      }
    >
      <p className={s.summary}>{summary}</p>
      <ul className={s.gains}>
        {report.gains.map((gain) => {
          const id = REPORTED[gain.id];
          if (id === undefined) return null;
          const words = CURRENCY[id];
          return (
            <li key={gain.id} className={s.gain}>
              <span className={s.glyph} aria-hidden="true">
                {glyphOf(words.glyph, 14)}
              </span>
              <span className={s.figure}>{fmt(gain.gain).text}</span>
              <span className={s.name}>{words.plural}</span>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
