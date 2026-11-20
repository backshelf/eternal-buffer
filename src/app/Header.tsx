import { fmt } from "watchpot/core";
import { CURRENCY_HELP } from "../content/guide";
import { CURRENCY, type Currency, NAME, STAT, WORDS } from "../content/words";
import { stats } from "../game/stats";
import { Button } from "../ui/Button";
import { CurrencyPill } from "../ui/CurrencyPill";
import { Tooltip } from "../ui/Tooltip";
import s from "./app.module.css";
import { useGameState } from "./hooks";
import { glyphOf } from "./icons";

/** Tooltip body for a currency pill: plain-English summary of where it comes from and what it buys. */
function CurrencyHelp({ currency }: { currency: Currency }) {
  const info = CURRENCY_HELP[currency];
  return (
    <span className={s.breakdown}>
      <span className={s.breakdownHead}>{info.title}</span>
      <span className={s.tipLine}>{info.summary}</span>
      <span className={s.tipMuted}>{info.detail}</span>
    </span>
  );
}

/** One line of the Clarity breakdown: plain-English intro, then each contributing source. */
function Breakdown({ rows }: { rows: ReturnType<typeof stats.select.parts> }) {
  return (
    <span className={s.breakdown}>
      <span className={s.breakdownHead}>{STAT.output}</span>
      <span className={s.tipMuted}>Global multiplier on every Glyph you earn.</span>
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
  /** The Vim reference & glossary sheet, from `? Help` or `:help`. */
  onHelp(): void;
  /** The settings sheet. */
  onAbout(): void;
}

/**
 * The header: whisper-quiet at 0:00 (just title, ? Help, Settings), progressively revealing labeled
 * currency pills with plain-English tooltips and Clarity as the player earns them.
 */
export function Header({ onHelp, onAbout }: HeaderProps) {
  const wallet = useGameState((st) => st.wallet);
  const folios = useGameState((st) => st.vim.totalFoliosCleared);
  const clarity = useGameState((st) => fmt(st.stats.output, { decimals: 2 }).text);
  const state = useGameState((st) => st);
  const rows = stats.select.parts(state, "output");

  // Reveal currencies as the player touches them so 0:00 never shows a row of cryptic zeroes.
  const shown = WORDS.currencies.filter((c) => {
    if (c === "glyphs") return folios > 0 || wallet.glyphs.gt(0) || wallet.earned.gt(0);
    if (c === "ink") return folios > 0 || wallet.ink.gt(0);
    return wallet[c].gt(0);
  });
  const showClarity = folios > 0 || state.stats.output.gt(1.001);

  return (
    <header className={s.header}>
      <p className={s.name}>{NAME}</p>
      {shown.length > 0 && (
        <div className={s.pills}>
          {shown.map((c) => (
            <Tooltip key={c} content={<CurrencyHelp currency={c} />} side="bottom">
              <span className={s.pillTrigger}>
                <CurrencyPill
                  id={c}
                  glyph={glyphOf(CURRENCY[c].glyph)}
                  word={CURRENCY[c].plural}
                  amount={fmt(wallet[c]).text}
                />
              </span>
            </Tooltip>
          ))}
          {showClarity && (
            <Tooltip content={<Breakdown rows={rows} />} side="bottom">
              <button type="button" className={s.clarity}>
                {STAT.output} ×{clarity}
              </button>
            </Tooltip>
          )}
        </div>
      )}
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
