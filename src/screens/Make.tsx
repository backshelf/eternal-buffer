import { useEffect, useState } from "react";
import { D, fmt } from "watchpot/core";
import { useClockNow, usePageLayout } from "watchpot/react";
import { type BuyMode, VisuallyHidden } from "watchpot/ui";
import { useGameState } from "../app/hooks";
import { BoostChip } from "../app/Visitor";
import { BufferEditor, NAV_EVENT } from "../components/BufferEditor";
import { Chalkboard } from "../components/Chalkboard";
import { CoachBar } from "../components/CoachBar";
import { ExLine } from "../components/ExLine";
import { TildeBar } from "../components/TildeBar";
import { CHALLENGES } from "../content/challenges";
import { FLOW_PER_STACK } from "../content/economy";
import { ACTS } from "../content/vimActs";
import { VISITOR_BUFFS } from "../content/visitor";
import { CURRENCY, MAIN } from "../content/words";
import { activeVimRateOf, inkRateOf } from "../game/income";
import { volumeGain } from "../game/prestige";
import { Button } from "../ui/Button";
import { BuyAmount } from "../ui/BuyAmount";
import { Tooltip } from "../ui/Tooltip";
import { GeneratorList } from "./Generators";
import s from "./Make.module.css";

/** The buy modes the Scribe list offers: one, ten, or as many as the balance covers. */
const MODES = [
  { value: 1, label: "×1" },
  { value: 10, label: "×10" },
  { value: "max", label: "Max" },
] as const satisfies readonly { value: BuyMode; label: string }[];
type Mode = (typeof MODES)[number]["value"];

/** How many cells the Flow gauge is cut into. */
const FLOW_SEGMENTS = 12;

/**
 * The Buffer: the game's hero workstation.
 * At 0:00 (before Folio 0 is cleared), ONLY the centered buffer fills the calm blank canvas.
 * Once the first folio is mended, the collapsible Margin Desk (Scribes, active Blessings, and later `:w` Bind)
 * unlocks alongside the full-height editor and can be toggled by clicking or typing `:scribes`.
 */
export function MakeScreen() {
  const { wide } = usePageLayout();
  const now = useClockNow(250);
  const st = useGameState((x) => x);
  const [mode, setMode] = useState<Mode>(1);
  const [dockOpen, setDockOpen] = useState(true);

  useEffect(() => {
    const onNav = (event: Event) => {
      const target = (event as CustomEvent<{ target?: string }>).detail?.target;
      if (target === "scribes") setDockOpen((open) => !open);
    };
    window.addEventListener(NAV_EVENT, onNav);
    return () => window.removeEventListener(NAV_EVENT, onNav);
  }, []);

  const words = CURRENCY[MAIN];
  const active = activeVimRateOf(st);
  const ink = inkRateOf(st);
  const mult = D(1).add(D(st.vim.flow * FLOW_PER_STACK).mul(st.stats.tempo));
  const lit = st.vim.flowCap > 0 ? Math.round((st.vim.flow / st.vim.flowCap) * FLOW_SEGMENTS) : 0;
  const gauge = "█".repeat(Math.max(0, Math.min(FLOW_SEGMENTS, lit)));
  const hollow = "░".repeat(Math.max(0, FLOW_SEGMENTS - lit));

  const act = ACTS.find((entry) => entry.id === st.vim.highestAct);
  const trial = st.trials.active === null ? null : CHALLENGES.find((c) => c.id === st.trials.active);
  const write = volumeGain(st);
  const ready = write.gte(1);
  const humming = VISITOR_BUFFS.some((buff) => (st.boosts.active[buff.id]?.until ?? 0) > now);

  const scribesOwned = Object.values(st.generators.owned).reduce((sum, count) => sum + count, 0);
  const deskUnlocked =
    st.vim.totalFoliosCleared >= 1 ||
    scribesOwned >= 2 ||
    st.wallet.sealsEver.gte(1) ||
    st.settings.veteranMode;
  const bindRevealed = st.wallet.earned.gte(5_000) || st.wallet.sealsEver.gte(1);
  const showRates = deskUnlocked || st.vim.totalAnomaliesCleared > 0;

  const rail = (
    <div className={s.railBody}>
      {humming && (
        <div className={s.railBlock}>
          <p className={s.railHead}>Active Blessings</p>
          <BoostChip />
        </div>
      )}
      {bindRevealed && (
        <div className={s.railBlock}>
          <p className={s.railHead}>The Bind (:w Prestige)</p>
          <p className={s.bind} data-ready={ready ? "" : undefined}>
            <span className={s.bindCommand}>:w</span>
            {ready ? (
              <>
                {" "}
                ready · <span className={s.bindGain}>+{fmt(write).text} Seals</span>
              </>
            ) : (
              <> — {fmt(write, { decimals: 2 }).text} of a Seal</>
            )}
          </p>
          <p className={s.railQuiet}>
            {ready
              ? "Type :w in the buffer (or open Volumes) to reset this run for permanent Seals. You keep all unlocked Vim keys."
              : "Rescue 50K+ Glyphs this run to bind a Volume into permanent Seals."}
          </p>
        </div>
      )}
      <div className={s.railBlock}>
        <div className={s.scribeHead}>
          <p className={s.railHead}>Scribes</p>
          <BuyAmount options={MODES} value={mode} onChange={setMode} label="How many Scribes to buy" />
        </div>
        <p className={s.railQuiet}>
          Passive desk helpers that brew Ink (for Expeditions &amp; Mosaic) plus a small trickle of Glyphs.
        </p>
        <GeneratorList mode={mode} />
      </div>
    </div>
  );

  const showSideDock = deskUnlocked && wide && dockOpen;

  return (
    <div
      className={s.screen}
      data-wide={wide ? "" : undefined}
      data-solo={!deskUnlocked ? "" : undefined}
      data-dock={showSideDock ? "open" : "closed"}
    >
      <header className={s.strip}>
        <p className={s.folio}>
          Folio {st.vim.folioSerial}{" "}
          <span className={s.folioTail}>
            ·{" "}
            {st.vim.totalFoliosCleared === 0 && !st.settings.veteranMode
              ? "first mending"
              : "the mending desk"}
          </span>
        </p>
        <p className={s.act}>
          <span className={s.actBadge}>
            ACT {act?.numeral ?? "I"} · {(act?.title ?? "Footwork").toUpperCase()}
          </span>
          {trial && (
            <span className={s.trial}>
              TRIAL · {trial.name}
              <VisuallyHidden> under way</VisuallyHidden>
            </span>
          )}
        </p>
        {showRates && (
          <Tooltip
            content="Flow stacks build as you mend anomalies cleanly, multiplying both active Glyphs and Scribe output. Decays slowly when idle."
            side="bottom"
          >
            <p className={s.flow} data-live={st.vim.flow > 0 ? "" : undefined}>
              <span className={s.flowWord}>FLOW</span>
              <span className={s.flowMult}>×{fmt(mult, { decimals: 2 }).text}</span>
              <span className={s.flowBar} aria-hidden="true">
                {gauge}
                {hollow}
              </span>
              <VisuallyHidden>
                {st.vim.flow} of {st.vim.flowCap} Flow stacks
              </VisuallyHidden>
            </p>
          </Tooltip>
        )}
        {showRates && (
          <p className={s.rates}>
            <span className={s.rateMain}>+{fmt(active, { decimals: 1 }).text}</span> {words.plural}/s
            {deskUnlocked && (
              <>
                {" · "}
                <span className={s.rateInk}>+{fmt(ink, { decimals: 1 }).text}</span> Ink/s
              </>
            )}
          </p>
        )}
        {deskUnlocked && wide && (
          <div className={s.dockToggle}>
            <Button variant="ghost" onClick={() => setDockOpen((open) => !open)}>
              {dockOpen ? "Hide Desk" : "Scribes :scribes"}
            </Button>
          </div>
        )}
      </header>

      <section className={s.hero} aria-label="The buffer">
        <div className={s.editor}>
          <CoachBar />
          <BufferEditor className={s.bufferPlate} />
          <ExLine />
          <Chalkboard />
          <TildeBar />
        </div>
        {showSideDock && (
          <aside className={s.rail} aria-label="Margin: blessings and Scribes">
            {rail}
          </aside>
        )}
        {deskUnlocked && !wide && (
          <details className={s.rail} open>
            <summary className={s.railSummary}>Margin · Scribes &amp; Desk</summary>
            {rail}
          </details>
        )}
      </section>
    </div>
  );
}
