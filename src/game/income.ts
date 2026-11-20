import { type Decimal, ZERO } from "watchpot/core";
import { MAIN } from "../content/words";
import type { Stats } from "./stats";

/** What the income is read from: the stats and the core's state. */
export interface IncomeSources {
  readonly stats: Stats;
  readonly generators: { readonly perSecond: Readonly<Record<string, Decimal>> };
}

/** What the core makes of the main currency a second now, every stat applied. */
export function incomeOf(s: IncomeSources): Decimal {
  let total = ZERO;
  total = total.add(s.generators.perSecond[MAIN] ?? ZERO);
  return total;
}
