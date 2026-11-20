import {
  type BoardCells,
  type BoardScore,
  type Decimal,
  defineBoard,
  defineCrafting,
  type Effect,
  fillBoard,
  reach,
} from "watchpot/core";
import { MOSAIC_GRID, MOSAIC_PIECES } from "../content/mosaic";
import type { StatId } from "../content/words";
import { wallet } from "./wallet";

/** What the board and its bench read beyond their own slices. */
export interface MosaicReads {
  /** The bench's count per piece: a craft of a piece is a piece held. */
  crafting: { made: Record<string, Decimal> };
  /** The two ever-totals that widen the grid. */
  wallet: { sealsEver: Decimal; codicesEver: Decimal };
  /** The Act whose keycaps must be under your hands before the bench opens a recipe. */
  vim: { actTier: number };
}

/** The Act whose keycaps open a deeper recipe, reached by its state's type so `vim` need not be named here. */
type ActReads = { vim: { actTier: number } };

/** The one piece every profile owns before the bench cuts anything: the board is interactive from the first night. */
const FREE_PIECE = "cap-hjkl";

/** The first Act: a recipe with no `minAct` of its own opens with the bench. */
const FIRST_ACT = 1;

/** 25 Seals ever widens the open grid to 5x5; 3 Codices ever opens the whole 6x6. */
const OPEN_FIVE = 25;
const OPEN_SIX = 3;

/** How much one point of each stat is worth to the auto-arrange, with a point of Clarity as the measure. */
const STAT_VALUE: Record<StatId, number> = {
  output: 1,
  tempo: 0.6,
  inkRate: 0.5,
  gain: 0.4,
  codexGain: 0.4,
  offline: 0.8,
};

/** One effect's worth: a multiplier's gain over 1, or the amount an add gives. Content amounts are numbers here. */
function effectGain(effect: Effect<StatId>): number {
  if (effect.mul !== undefined) return (typeof effect.mul === "number" ? effect.mul : 1) - 1;
  return typeof effect.add === "number" ? effect.add : 0;
}

/** How good a layout is: every stat it gives, weighted by what that stat is worth. Higher is better. */
export const score: BoardScore<Effect<StatId>> = (contributions) =>
  contributions.reduce((sum, { effect }) => sum + effectGain(effect) * STAT_VALUE[effect.stat], 0);

/**
 * How many of a piece the player holds: what the bench cut, plus the free cap. Crafted pieces are counted in
 * `crafting.made`, so a piece costs its recipe and never a currency of its own.
 */
export function held(s: Pick<MosaicReads, "crafting">, piece: string): number {
  const cut = Math.floor(s.crafting.made[piece]?.toNumber() ?? 0);
  return cut + (piece === FREE_PIECE ? 1 : 0);
}

/**
 * Which cells are open: the inner 4x4 from the start, the 5x5 at 25 Seals ever, the whole 6x6 at 3 Codices ever.
 * Off the grid is closed however far the board has grown.
 */
export function open(s: Pick<MosaicReads, "wallet">, x: number, y: number): boolean {
  if (x < 0 || x >= MOSAIC_GRID.width || y < 0 || y >= MOSAIC_GRID.height) return false;
  if (s.wallet.codicesEver.gte(OPEN_SIX)) return true;
  if (s.wallet.sealsEver.gte(OPEN_FIVE)) return x <= 4 && y <= 4;
  return x >= 1 && x <= 4 && y >= 1 && y <= 4;
}

/**
 * The bench: one recipe per piece, priced in ink and seal shards. A recipe gives no currency of its own: its count
 * is `crafting.made[id]`, which `held` reads, and the later pieces wait on their Act.
 */
export const crafting = defineCrafting({
  key: "crafting",
  wallet,
  reach: () => [reach<ActReads>()],
  list: MOSAIC_PIECES.map((p) => ({
    id: p.id,
    inputs: p.recipe.inputs,
    costGrowth: p.recipe.costGrowth,
    limit: p.limit,
    outputs: {},
    takesMs: p.recipe.takesMs,
    unlocked: (s: ActReads) => (p.recipe.minAct ?? FIRST_ACT) <= s.vim.actTier,
  })),
  reset: { depth: 2 },
});

/**
 * The grid itself. Every synergy lives in the content's pieces; this feature only says which cells are open and how
 * many of a piece are held. `:wq` clears the layout with the rest of the bench.
 */
export const mosaic = defineBoard({
  key: "mosaic",
  width: MOSAIC_GRID.width,
  height: MOSAIC_GRID.height,
  pieces: MOSAIC_PIECES,
  reach: () => [crafting, wallet, reach<ActReads>()],
  held: (s, piece) => held(s, piece),
  open: (s, x, y) => open(s, x, y),
  reset: { depth: 2 },
});

/**
 * A good layout, found greedily by `fillBoard`: the pieces the bench has cut, laid where they give the most stats.
 * Pure over the game state, so the screen only has to call `mosaic.lay(cells)` with what it returns.
 */
export function autoArrangeMosaic(state: Parameters<typeof mosaic.select.limits>[0]): BoardCells {
  let pieces = 0;
  for (const piece of MOSAIC_PIECES) pieces += held(state, piece.id);
  if (pieces <= 0) return {};
  return fillBoard(mosaic.def.board, {
    score,
    held: (piece) => held(state, piece),
    open: (x, y) => open(state, x, y),
  });
}
