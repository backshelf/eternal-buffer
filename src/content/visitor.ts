// Written by the scaffold from the game's answers. It is the game's now: edit it freely.
import { MINUTE_MS, type SpawnWait } from "watchpot/core";

/** What turns up, and its line. */
export const VISITOR = { name: "Margin Moth", line: "Tilde bats a glowing moth loose from the gutter." };
/** What catching it starts: output ×`mult` for `seconds`. */
export const BUFF = { id: "phosphor-rush", name: "Phosphor Rush", mult: 3, seconds: 60 };
/** At least three minutes apart, at most nine; most come late. */
export const WAIT: SpawnWait = {
  minMs: 3 * MINUTE_MS,
  maxMs: 9 * MINUTE_MS,
  ramp: { power: 4, stepMs: 1000 / 30 },
};
/** How long one stays to be caught. */
export const LIFE_MS = 12_000;
