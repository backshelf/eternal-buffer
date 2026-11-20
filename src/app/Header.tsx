import { fmt } from "watchpot/core";
import { CURRENCY, type Currency, NAME, STAT, WORDS } from "../content/words";
import { stats } from "../game/stats";
import { Button } from "../ui/Button";
import { CurrencyPill } from "../ui/CurrencyPill";
import { Tooltip } from "../ui/Tooltip";
import s from "./app.module.css";
import { useGameState } from "./hooks";
import { glyphOf } from "./icons";

/** The balances always in the header: the run's own two. */
const ALWAYS: readonly Currency[] = ["glyphs", "ink"];

/** One line of the Clarity breakdown: where the multiplier came from, and what it gave. */
function Breakdown({ rows }: { rows: ReturnType<typeof stats.select.parts> }) {
  return (
    <span className={s.breakdown}>
      <span className={s.breakdownHead}>{STAT.output}</span>
      {rows.length === 0 && <span className={s.breakdownRow}>Nothing raises it yet.</span>}
      {rows.map((row, index) => (
        <span key={`${index}:${row.label}`} className={s.breakdownRow} data-muted={row.muted ?? undefined}>
          <span className={s.breakdownLabel}>{row.label}</span>
          <span className={s.breakdownValue}>
            {row.op === "add"
              ? `+${fmt(row.value, { decimals: 2 }).text}`
              : `×${fmt(row.value, { decimals: 2 }).text}`}
            {row.times > 1 ? ` (${row.times}×)` : ""}
          </span>
        </span>
      ))}
    </span>
  );
}

/** Props of the header: the two sheets it can open. */
export interface HeaderProps {
  /** The Vim reference sheet, from the `?`. */
  onHelp(): void;
  /** The settings sheet. */
  onAbout(): void;
}

/**
 * The header: the game's name in `Cardo`, an ASCII rule, a cell per balance, the Clarity breakdown behind its
 * figure, and the two sheets. A reading a screen does not need is not taken here: the pills read the wallet, the
 * breakdown is worked out when the header renders, and nothing watches the clock.
 */
export function Header({ onHelp, onAbout }: HeaderProps) {
  const wallet = useGameState((st) => st.wallet);
  const clarity = useGameState((st) => fmt(st.stats.output, { decimals: 2 }).text);
  // The deeper currencies are earned late: they appear once there is something to count.
  const shown = WORDS.currencies.filter((c) => ALWAYS.includes(c) || wallet[c].gt(0));
  // A breakdown is only worked out when the header has something to show it for, and a fresh state is what it reads.
  const state = useGameState((st) => st);
  const rows = stats.select.parts(state, "output");
  return (
    <header className={s.header}>
      <p className={s.name}>{NAME}</p>
      <span className={s.rule} aria-hidden="true">
        ├──────────┤
      </span>
      <div className={s.pills}>
        {shown.map((c) => (
          <CurrencyPill
            key={c}
            id={c}
            glyph={glyphOf(CURRENCY[c].glyph)}
            word={CURRENCY[c].plural}
            amount={fmt(wallet[c]).text}
          />
        ))}
        <Tooltip content={<Breakdown rows={rows} />} side="bottom">
          <button type="button" className={s.clarity}>
            {STAT.output} ×{clarity}
          </button>
        </Tooltip>
      </div>
      <div className={s.headActions}>
        <Button variant="ghost" onClick={onHelp}>
          ? Help
        </Button>
        <Button variant="ghost" onClick={onAbout}>
          Settings
        </Button>
      </div>
    </header>
  );
}
