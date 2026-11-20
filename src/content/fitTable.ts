// Written by `bun sim/fit.ts` from `sim/plan.ts`. Never edit by hand: change the plan and fit again.
//
// This module is the fit's record. The game itself reads each family's price from `KEY_FAMILIES` in
// `src/content/vimActs.ts` (the sim and the store play those numbers), so the table here and the content there must
// never drift: `bun sim/fit.ts --check` fails when they have, and a fit that lands on different prices prints a
// fresh module to commit back into both.
import { fitTable } from "watchpot/sim";
import type { GateKey } from "../../sim/plan";

/** The fitted price of every gate, as the fit wrote it. A gate left out reads as `BLOCKED` in `PRICES`. */
export const FIT: Partial<Record<GateKey, string>> = {
  "word-stride": "52000",
  "line-edge": "67000",
  "char-snipe": "140000",
  "file-jump": "260000",
  counts: "440000",
  "op-delete": "510000",
  "op-change": "590000",
  "op-yank": "1.3e6",
  "line-craft": "1.3e6",
  "text-objects": "6",
  "visual-modes": "6",
  "bracket-indent": "10",
  "search-jump": "10",
  "para-marks": "13",
  substitute: "13",
  "dot-echo": "1",
  registers: "1",
  macros: "1",
  "ex-power": "1",
  "dual-split": "1",
  "vimrc-forge": "1",
};

/** The live table the fit plays through: every write lands here first (`sim/fit.ts` mirrors it into the content). */
export const PRICES = fitTable<GateKey>(FIT);
