import { fmt } from "watchpot/core";
import { type BuyMode, buyCount } from "watchpot/ui";
import { useGameState } from "../app/hooks";
import { glyphOf } from "../app/icons";
import { playBuy } from "../app/sound";
import { GENERATORS } from "../content/generators";
import { ACTS } from "../content/vimActs";
import { CURRENCY, MAIN } from "../content/words";
import { producers } from "../game/generators";
import { idleGlyphRateOf, inkRateOf } from "../game/income";
import { Button } from "../ui/Button";
import s from "./Generators.module.css";

const NUMERAL = new Map<number, string>(ACTS.map((act): [number, string] => [act.id, act.numeral]));

/**
 * The Margin Desk Scribes:
 * - On first arrival (0 Scribes owned & `!seenBeats.scribes`), shows ONLY the Wax-Sealed Moth with a clear
 *   interactive spotlight prompt so the player learns by hiring their first Scribe (no 10-card wall!).
 * - Afterwards, progressively reveals unlocked Scribes one tier ahead of what you own, plus at most one
 *   quiet upcoming Act teaser — keeping the right wing calm, scannable, and never overwhelming.
 */
export function GeneratorList({ mode }: { mode: BuyMode }) {
  const st = useGameState((x) => x);
  const words = CURRENCY[MAIN];
  const rules = producers.select;
  const resonance = st.vim.flowCap > 0 ? 1 + 0.5 * (st.vim.flow / st.vim.flowCap) : 1;
  const ink = inkRateOf(st);
  const trickle = idleGlyphRateOf(st);

  const totalOwned = GENERATORS.reduce((sum, g) => sum + rules.owned(st, g.id), 0);
  const introSpotlight = !st.settings.veteranMode && totalOwned === 0 && st.vim.seenBeats.scribes !== true;

  // Determine which Scribes to render: owned + unlocked up to 1 tier past the highest owned (or first 1 in intro).
  const highestOwnedIdx = GENERATORS.reduce((best, g, idx) => (rules.owned(st, g.id) > 0 ? idx : best), -1);
  const visible = introSpotlight
    ? GENERATORS.slice(0, 1)
    : GENERATORS.filter((g, idx) => {
        if (rules.owned(st, g.id) > 0) return true;
        if (!rules.open(st, g.id)) return false;
        return idx <= Math.max(1, highestOwnedIdx + 1);
      });
  const nextLocked = introSpotlight ? undefined : GENERATORS.find((g) => !rules.open(st, g.id));

  return (
    <div className={s.scribes}>
      {introSpotlight ? (
        <p className={s.spotlight}>
          Hire your first Scribe: they brew <strong>Ink</strong> and trickle bonus <strong>Glyphs</strong>{" "}
          while you mend.
        </p>
      ) : (
        <p className={s.summary}>
          +{fmt(ink, { decimals: 1 }).text} Ink/s · +{fmt(trickle, { decimals: 1 }).text} Glyphs/s
          {resonance > 1.01 ? ` · Flow ×${resonance.toFixed(2)}` : ""}
          {st.trials.rules.includes("noScribes") ? " · muted in trial" : ""}
        </p>
      )}

      <ul className={s.list}>
        {visible.map((g) => {
          const owned = rules.owned(st, g.id);
          const affordable = rules.affordable(st, g.id);
          const want = introSpotlight
            ? 1
            : buyCount(mode, { affordable, untilNext: rules.untilMilestone(st, g.id) ?? 0 });
          const count = Math.max(1, want);
          const ok = want > 0 && affordable >= want;
          const mine = st.stats.output.mul(g.glyphTrickle * owned * resonance);
          const buy = () => {
            const bought =
              mode === "max" && !introSpotlight
                ? st.generators.buyMax(g.id) > 0
                : st.generators.buy(g.id, count);
            if (!bought) return;
            playBuy();
            if (st.vim.seenBeats.scribes !== true) st.vim.completeBeat("scribes");
          };
          return (
            <li key={g.id} className={s.card} data-spotlight={introSpotlight ? "" : undefined}>
              <div className={s.head}>
                <span className={s.name}>{g.name}</span>
                <span className={s.owned}>{owned}</span>
              </div>
              <p className={s.line}>{g.line}</p>
              <div className={s.meta}>
                <span className={s.rateInk}>
                  +{fmt(owned > 0 ? rules.rate(st, g.id) : g.inkRate, { decimals: 2 }).text} Ink/s
                </span>
                <span className={s.rateGlyph}>
                  +{fmt(owned > 0 ? mine : g.glyphTrickle, { decimals: 2 }).text} Glyphs/s
                </span>
              </div>
              {owned > 0 && (
                <div className={s.pips} aria-hidden="true" title="Milestones at 10, 25, 50, 100 owned">
                  {g.milestones.map((m) => (
                    <span key={m.at} className={s.pip} data-lit={owned >= m.at ? "" : undefined} />
                  ))}
                </div>
              )}
              <div className={s.foot}>
                <Button
                  variant={ok ? "primary" : "secondary"}
                  disabled={!ok}
                  cost={fmt(rules.price(st, g.id, count)).text}
                  glyph={glyphOf(words.glyph)}
                  unit={words.plural}
                  onClick={buy}
                >
                  {introSpotlight ? "Hire first Scribe" : count > 1 ? `Hire ${count}` : "Hire"}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {nextLocked && (
        <p className={s.teaser}>
          Next Scribe ({nextLocked.name}) opens in Act{" "}
          {NUMERAL.get(nextLocked.minAct ?? 2) ?? nextLocked.minAct}.
        </p>
      )}
    </div>
  );
}
