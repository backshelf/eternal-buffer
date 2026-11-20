import type { ReactNode } from "react";
import { cx } from "watchpot/ui";
import s from "./CurrencyPill.module.css";

/** Props of `CurrencyPill`: which currency, its glyph, its balance and its word. */
export interface CurrencyPillProps {
  /** `data-pill`: what the kit's currency flight lands on (`[data-pill="<id>"]`) and bumps (`data-bump`). */
  id: string;
  glyph?: ReactNode;
  /** The balance, formatted ("12.4K"), or a live ticker in its place. */
  amount: ReactNode;
  /** The currency's word, said after the balance to assistive tech. */
  word: string;
  className?: string;
}

/** A balance in the header: the glyph, the figure in the number face, and a readable label on desktop. */
export function CurrencyPill({ id, glyph, amount, word, className }: CurrencyPillProps) {
  return (
    <span
      className={cx(s.pill, className)}
      data-pill={id}
      title={typeof amount === "string" || typeof amount === "number" ? `${amount} ${word}` : word}
    >
      {glyph && (
        <span className={s.glyph} aria-hidden="true">
          {glyph}
        </span>
      )}
      <span className={s.amount}>{amount}</span>
      <span className={s.word}>{word}</span>
    </span>
  );
}
