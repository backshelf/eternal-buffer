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
import { Panel } from "../ui/Panel";
import s from "./screens.module.css";

/** An Act's numeral, for a scribe that has not taken work yet. */
const NUMERAL = new Map<number, string>(ACTS.map((act): [number, string] => [act.id, act.numeral]));

/**
 * The Scribes: ten of them, each brewing Ink a second and trickling a little Glyph, with the Flow Resonance that the
 * whole drawer answers to, its milestones and the price of the chosen amount. Every figure is read off the engine's
 * `producers.select`; only the glyph trickle is the game's own sum, from `income.ts`.
 */
export function GeneratorList({ mode }: { mode: BuyMode }) {
  const st = useGameState((x) => x);
  const words = CURRENCY[MAIN];
  const rules = producers.select;
  const resonance = st.vim.flowCap > 0 ? 1 + 0.5 * (st.vim.flow / st.vim.flowCap) : 1;
  const ink = inkRateOf(st);
  const trickle = idleGlyphRateOf(st);
  return (
    <div className={s.scribes}>
      <p className={`small ${s.muted}`}>
        {fmt(ink, { decimals: 1 }).text} Ink a second · {fmt(trickle, { decimals: 1 }).text} Glyphs a second ·
        Flow Resonance ×{resonance.toFixed(2)}
        {st.trials.rules.includes("noScribes") ? " · the Scribes are muted for this trial" : ""}
      </p>
      <ul className={s.grid}>
        {GENERATORS.map((g) => {
          const owned = rules.owned(st, g.id);
          const locked = !rules.open(st, g.id);
          const affordable = rules.affordable(st, g.id);
          const want = buyCount(mode, { affordable, untilNext: rules.untilMilestone(st, g.id) ?? 0 });
          const count = Math.max(1, want);
          const ok = !locked && want > 0 && affordable >= want;
          const mine = st.stats.output.mul(g.glyphTrickle * owned * resonance);
          const buy = () => {
            const bought = mode === "max" ? st.generators.buyMax(g.id) > 0 : st.generators.buy(g.id, count);
            if (bought) playBuy();
          };
          return (
            <li key={g.id} className={s.scribe}>
              <Panel
                heading={g.name}
                level={3}
                tone={locked ? "sunken" : "surface"}
                aside={<span className={s.num}>{owned}</span>}
              >
                <p className="small">{g.line}</p>
                <div className={s.rates}>
                  <span className={s.num}>
                    {locked ? "—" : `+${fmt(rules.rate(st, g.id), { decimals: 2 }).text}`} Ink/s
                  </span>
                  <span className={`small ${s.muted}`}>
                    {owned > 0 ? `+${fmt(mine, { decimals: 2 }).text} Glyphs/s` : "no trickle yet"}
                  </span>
                </div>
                <div className={s.pips} aria-hidden="true">
                  {g.milestones.map((milestone) => (
                    <span
                      key={milestone.at}
                      className={s.pip}
                      data-lit={owned >= milestone.at ? "" : undefined}
                    />
                  ))}
                </div>
                <p className={`small ${s.muted}`}>
                  Milestones at {g.milestones.map((milestone) => milestone.at).join(" · ")} owned
                </p>
                <div className={s.row}>
                  <span className={`small ${s.muted}`}>
                    {locked
                      ? `Opens in Act ${NUMERAL.get(g.minAct ?? 1) ?? g.minAct}`
                      : owned === 1
                        ? "One at the desk"
                        : `${owned} at the desk`}
                  </span>
                  <Button
                    variant={ok ? "primary" : "secondary"}
                    disabled={!ok}
                    cost={fmt(rules.price(st, g.id, count)).text}
                    glyph={glyphOf(words.glyph)}
                    unit={words.plural}
                    onClick={buy}
                  >
                    {count > 1 ? `Get ${count}` : "Get"}
                  </Button>
                </div>
              </Panel>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
