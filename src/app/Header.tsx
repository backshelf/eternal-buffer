import { fmt } from "watchpot/core";
import { CURRENCY, type Currency, NAME, WORDS } from "../content/words";
import { Button } from "../ui/Button";
import { CurrencyPill } from "../ui/CurrencyPill";
import s from "./app.module.css";
import { useGameState } from "./hooks";
import { glyphOf } from "./icons";

/** The balances always in the header: the run's own two. */
const ALWAYS: readonly Currency[] = ["glyphs", "ink"];

/** The header: the game's name, a cell per balance, and the button that opens the about sheet. */
export function Header({ onAbout }: { onAbout(): void }) {
  const wallet = useGameState((st) => st.wallet);
  // The deeper currencies are earned late: they appear once there is something to count.
  const shown = WORDS.currencies.filter((c) => ALWAYS.includes(c) || wallet[c].gt(0));
  return (
    <header className={s.header}>
      <p className={s.name}>{NAME}</p>
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
      </div>
      <Button variant="ghost" onClick={onAbout}>
        About
      </Button>
    </header>
  );
}
