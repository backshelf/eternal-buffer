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
  "word-stride": "100000",
  "line-edge": "830000",
  "char-snipe": "2.3e6",
  "file-jump": "4.1e6",
  counts: "1.9e7",
  "op-delete": "4e7",
  "op-change": "5.1e7",
  "op-yank": "1.3e8",
  "line-craft": "1.9e8",
  "text-objects": "6",
  "visual-modes": "6",
  "bracket-indent": "6",
  "search-jump": "10",
  "para-marks": "10",
  substitute: "10",
  "dot-echo": "1",
  registers: "7",
  macros: "14",
  "ex-power": "65",
  "dual-split": "110",
  "vimrc-forge": "150",
};

/** The live table the fit plays through: every write lands here first (`sim/fit.ts` mirrors it into the content). */
export const PRICES = fitTable<GateKey>(FIT);
