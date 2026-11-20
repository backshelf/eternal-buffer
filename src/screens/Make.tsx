import { useState } from "react";
import { D, fmt } from "watchpot/core";
import { useClockNow, usePageLayout } from "watchpot/react";
import { type BuyMode, VisuallyHidden } from "watchpot/ui";
import { useGameState } from "../app/hooks";
import { BoostChip } from "../app/Visitor";
import { BufferEditor } from "../components/BufferEditor";
import { Chalkboard } from "../components/Chalkboard";
import { ExLine } from "../components/ExLine";
import { TildeBar } from "../components/TildeBar";
import { CHALLENGES } from "../content/challenges";
import { FLOW_PER_STACK } from "../content/economy";
import { ACTS } from "../content/vimActs";
import { VISITOR_BUFFS } from "../content/visitor";
import { CURRENCY, MAIN } from "../content/words";
import { activeVimRateOf, inkRateOf } from "../game/income";
import { volumeGain } from "../game/prestige";
import { BuyAmount } from "../ui/BuyAmount";
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
 * The Buffer: the game's hero. A strip names the folio, the Act, the trial and the live Flow; the editor, the Ex
 * line, the Chalkboard and Tilde take the width; a margin rail holds the blessings, the quick-buy and the `:w`
 * readiness. A narrow page stacks the rail under the buffer, folded into a `<details>` so the editor keeps the screen.
 */
export function MakeScreen() {
  const { wide } = usePageLayout();
  const now = useClockNow(250);
  // The whole state: the balance and the Flow move every tick, and the rates are worked out from it (a fresh
  // Decimal, which a selector must never return).
  const st = useGameState((x) => x);
  const [mode, setMode] = useState<Mode>(1);

  const words = CURRENCY[MAIN];
  const active = activeVimRateOf(st);
  const ink = inkRateOf(st);
  // Flow's share of the payout: one stack, times the run's Flow Tempo. Read here, never returned from a selector.
  const mult = D(1).add(D(st.vim.flow * FLOW_PER_STACK).mul(st.stats.tempo));
  const lit = st.vim.flowCap > 0 ? Math.round((st.vim.flow / st.vim.flowCap) * FLOW_SEGMENTS) : 0;
  const gauge = "█".repeat(Math.max(0, Math.min(FLOW_SEGMENTS, lit)));
  const hollow = "░".repeat(Math.max(0, FLOW_SEGMENTS - lit));

  const act = ACTS.find((entry) => entry.id === st.vim.highestAct);
  const trial = st.trials.active === null ? null : CHALLENGES.find((c) => c.id === st.trials.active);
  const write = volumeGain(st);
  const ready = write.gte(1);
  const humming = VISITOR_BUFFS.some((buff) => (st.boosts.active[buff.id]?.until ?? 0) > now);

  const rail = (
    <div className={s.railBody}>
      <div className={s.railBlock}>
        <p className={s.railHead}>Blessings</p>
        <BoostChip />
        {humming ? null : <p className={s.railQuiet}>Nothing is humming over the desk just now.</p>}
      </div>
      <div className={s.railBlock}>
        <p className={s.railHead}>The bind</p>
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
            ? "Type :w at the console to bind this volume and keep every key you know."
            : "Earn more this run; the bind pays once it is worth a whole Seal."}
        </p>
      </div>
      <div className={s.railBlock}>
        <div className={s.scribeHead}>
          <p className={s.railHead}>Scribes</p>
          <BuyAmount options={MODES} value={mode} onChange={setMode} label="How many Scribes to buy" />
        </div>
        <GeneratorList mode={mode} />
      </div>
    </div>
  );

  return (
    <div className={s.screen} data-wide={wide ? "" : undefined}>
      <header className={s.strip}>
        <p className={s.folio}>
          Folio {st.vim.folioSerial} <span className={s.folioTail}>· the mending desk</span>
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
        <p className={s.rates}>
          <span className={s.rateMain}>+{fmt(active, { decimals: 1 }).text}</span> {words.plural}/s active ·{" "}
          <span className={s.rateInk}>+{fmt(ink, { decimals: 1 }).text}</span> Ink/s
        </p>
      </header>

      <section className={s.hero} aria-label="The buffer">
        <div className={s.editor}>
          <BufferEditor />
          <ExLine />
          <Chalkboard />
          <TildeBar />
        </div>
        {wide ? (
          <aside className={s.rail} aria-label="Margin: blessings and Scribes">
            {rail}
          </aside>
        ) : (
          <details className={s.rail} open>
            <summary className={s.railSummary}>Margin · blessings &amp; Scribes</summary>
            {rail}
          </details>
        )}
      </section>
    </div>
  );
}
