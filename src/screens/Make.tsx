import { useState } from "react";
import { fmt } from "watchpot/core";
import type { BuyMode } from "watchpot/ui";
import { useGameState } from "../app/hooks";
import { glyphOf } from "../app/icons";
import { BoostChip } from "../app/Visitor";
import { CURRENCY, MAIN, STAT, TAB_NAMES } from "../content/words";
import { incomeOf } from "../game/income";
import { BuyAmount } from "../ui/BuyAmount";
import { Counter } from "../ui/Counter";
import { Title } from "../ui/Title";
import { GeneratorList } from "./Generators";
import s from "./screens.module.css";

/** The buy modes the lists offer: one, ten, or as many as the balance covers. */
const MODES = [
  { value: 1, label: "×1" },
  { value: 10, label: "×10" },
  { value: "max", label: "Max" },
] as const satisfies readonly { value: BuyMode; label: string }[];
type Mode = (typeof MODES)[number]["value"];

/** The main screen: the balance and its rate, what raises it now, the thing pressed, and the core's list. */
export function MakeScreen() {
  // The whole state: the balance moves every tick anyway, and the income is worked out from it (a fresh Decimal,
  // which a selector must never return).
  const st = useGameState((x) => x);
  const balance = st.wallet[MAIN];
  const income = incomeOf(st);
  const output = st.stats.output;
  const [mode, setMode] = useState<Mode>(1);
  const words = CURRENCY[MAIN];
  const shown = fmt(balance);
  return (
    <div className={s.screen}>
      <Title>{TAB_NAMES.make}</Title>
      <Counter
        glyph={glyphOf(words.glyph)}
        label={words.plural}
        mantissa={shown.mantissa}
        suffix={shown.suffix}
        rate={`+${fmt(income, { decimals: 1 }).text} a second`}
      />
      <p className={`small ${s.muted}`}>
        {STAT.output} ×{fmt(output, { decimals: 2 }).text}
      </p>
      <BoostChip />
      <BuyAmount options={MODES} value={mode} onChange={setMode} label="How many to buy" />
      <GeneratorList mode={mode} />
    </div>
  );
}
