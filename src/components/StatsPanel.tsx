import { useId } from "react";
import { fmtCount, fmtPercent } from "watchpot/core";
import { cx } from "watchpot/ui";
import { useGameState } from "../app/hooks";
import { EASTER_EGGS } from "../content/easterEggs";
import { GRAMMAR_CODEX } from "../content/vimActs";
import s from "./StatsPanel.module.css";

/** How many cells one Top Keys bar holds. */
const BAR_CELLS = 12;
/** How many keys the chart shows before the record gets a scrollbar or a lie. */
const TOP_KEYS = 8;
/** What the chart says before the first folio is mended. */
const EMPTY_KEYS = "Start mending folios to track your keystrokes.";

/** Props of `StatsPanel`: only the caller's class; every figure is read off the store. */
export interface StatsPanelProps {
  className?: string;
}

/**
 * The player's own Vim record: a borderless two-column table of the permanents the desk keeps (Clean Cut rate,
 * the streak bests, folios and anomalies mended, the Codex and Errata tallies, Tilde's Bond), then an ASCII bar
 * chart of the eight keys they press most. Every number is selected as a primitive or a stable record and worked
 * out in render, so no selector ever hands React a fresh object.
 */
export function StatsPanel({ className }: StatsPanelProps) {
  const titleId = useId();
  const metricsId = useId();
  const keysId = useId();

  const totalCleanCuts = useGameState((st) => st.vim.totalCleanCuts);
  const totalAnomaliesCleared = useGameState((st) => st.vim.totalAnomaliesCleared);
  const totalFoliosCleared = useGameState((st) => st.vim.totalFoliosCleared);
  const bestCleanStreak = useGameState((st) => st.vim.bestCleanStreak);
  const bestFlow = useGameState((st) => st.vim.bestFlow);
  const contractsCompleted = useGameState((st) => st.vim.contractsCompleted);
  const tildeBond = useGameState((st) => st.vim.tildeBond);
  const discoveredPairs = useGameState((st) => st.vim.discoveredPairs);
  const easterEggsFound = useGameState((st) => st.vim.easterEggsFound);
  const keyCounts = useGameState((st) => st.vim.keyCounts);

  const cleanCutRate =
    totalAnomaliesCleared > 0 ? Math.round((totalCleanCuts / totalAnomaliesCleared) * 100) : 0;
  const pairsFound = Object.keys(discoveredPairs).length;
  const eggsFound = Object.keys(easterEggsFound).length;

  const metrics: ReadonlyArray<{ label: string; value: string }> = [
    { label: "Clean Cut rate", value: fmtPercent(cleanCutRate) },
    { label: "Best Clean Streak", value: fmtCount(bestCleanStreak) },
    { label: "Best Flow", value: fmtCount(bestFlow) },
    { label: "Folios Mended", value: fmtCount(totalFoliosCleared) },
    { label: "Grammar Pairs", value: `${fmtCount(pairsFound)} / ${fmtCount(GRAMMAR_CODEX.length)}` },
    { label: "Errata Slips Completed", value: fmtCount(contractsCompleted) },
    { label: "Easter Eggs", value: `${fmtCount(eggsFound)} / ${fmtCount(EASTER_EGGS.length)}` },
    { label: "Tilde Bond", value: fmtCount(tildeBond) },
  ];

  // Most-pressed first, ties broken by the key's own name so the chart never reshuffles under the same save.
  const topKeys = Object.entries(keyCounts)
    .sort(([aKey, aCount], [bKey, bCount]) => {
      if (aCount !== bCount) return bCount - aCount;
      if (aKey === bKey) return 0;
      return aKey < bKey ? -1 : 1;
    })
    .slice(0, TOP_KEYS);
  const peak = topKeys[0]?.[1] ?? 0;

  return (
    <section className={cx(s.panel, className)} aria-labelledby={titleId}>
      <h2 id={titleId} className={s.title}>
        Vim Mastery
      </h2>

      <section className={s.block} aria-labelledby={metricsId}>
        <h3 id={metricsId} className={s.subtitle}>
          Mastery
        </h3>
        <dl className={s.metrics}>
          {metrics.map((metric) => (
            <div key={metric.label} className={s.metric}>
              <dt className={s.label}>{metric.label}</dt>
              <dd className={s.value}>{metric.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={s.block} aria-labelledby={keysId}>
        <h3 id={keysId} className={s.subtitle}>
          Top Keys
        </h3>
        {topKeys.length === 0 ? (
          <p className={s.empty}>{EMPTY_KEYS}</p>
        ) : (
          <ul className={s.bars}>
            {topKeys.map(([key, count]) => {
              // The peak fills every cell, and any key that has been pressed lights at least one.
              const lit =
                peak > 0 && count > 0
                  ? Math.min(BAR_CELLS, Math.max(1, Math.round((count / peak) * BAR_CELLS)))
                  : 0;
              return (
                <li key={key} className={s.barRow} data-key={key} data-lit={lit}>
                  <span className={s.keycap}>{key}</span>
                  <span className={s.bar} aria-hidden="true">
                    <span className={s.lit}>{"█".repeat(lit)}</span>
                    <span className={s.rest}>{"░".repeat(BAR_CELLS - lit)}</span>
                  </span>
                  <span className={s.count}>{fmtCount(count)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </section>
  );
}
