// The Margin Moth and the timed blessings it carries, plus the ones Tilde hands out herself.
import { type BuffStack, type Effect, MINUTE_MS, type SpawnWait } from "watchpot/core";
import type { StatId } from "./words";

/** What turns up, and its line. */
export const VISITOR = { name: "Margin Moth", line: "Tilde bats a glowing moth loose from the gutter." };
/** The old single-buff shape, kept for the screens that still read it: the moth's first, best outcome. */
export const BUFF = { id: "phosphor-rush", name: "Phosphor Rush", mult: 3, seconds: 60 };
/** At least three minutes apart, at most eight; most come late. */
export const WAIT: SpawnWait = {
  minMs: 3 * MINUTE_MS,
  maxMs: 8 * MINUTE_MS,
  ramp: { power: 4, stepMs: 1000 / 30 },
};
/** How long one stays to be caught. */
export const LIFE_MS = 16_000;

/** Every timed blessing the moth and the cat can give. */
export type VisitorBuffId = "phosphor-rush" | "ink-deluge" | "tilde-stash" | "tilde-purr" | "tilde-approval";

/** A timed blessing as the content knows it: the buffs feature takes it as a rule with these effects. */
export interface VisitorBuffDef {
  id: VisitorBuffId;
  name: string;
  /** Its line, for the chip that shows it running. */
  line: string;
  durationMs: number;
  /** A second catch while it runs: refresh restarts the clock. */
  stack: BuffStack;
  maxStacks?: number;
  effects: (stacks: number, strength: number | undefined) => readonly Effect<StatId>[];
}

/** All five: three the moth carries, two the cat gives. */
export const VISITOR_BUFFS: readonly VisitorBuffDef[] = [
  {
    id: "phosphor-rush",
    name: "Phosphor Rush",
    line: "Moth dust settles on every word you write and the page sharpens to a point.",
    durationMs: 60_000,
    stack: "refresh",
    effects: () => [{ stat: "output", mul: 3 }],
  },
  {
    id: "ink-deluge",
    name: "Ink Deluge",
    line: "Somewhere above the gutter a seam opens and pours black light down the margin.",
    durationMs: 45_000,
    stack: "refresh",
    effects: () => [{ stat: "inkRate", mul: 4 }],
  },
  {
    id: "tilde-stash",
    name: "Tilde's Stash",
    line: "She was keeping these. She has decided, loudly, that you may have them.",
    durationMs: 45_000,
    stack: "refresh",
    effects: () => [{ stat: "tempo", mul: 2 }],
  },
  {
    id: "tilde-purr",
    name: "Tilde's Purr",
    line: "A low rumble under the statusline that gets into your hands and stays there.",
    durationMs: 20_000,
    stack: "refresh",
    effects: () => [{ stat: "tempo", add: 0.15 }],
  },
  {
    id: "tilde-approval",
    name: "Cat's Approval",
    line: "She has judged you adequate. The archive notices, and the archive is not generous.",
    durationMs: 60_000,
    stack: "refresh",
    effects: () => [{ stat: "output", mul: 1.5 }],
  },
];

/** One weighted outcome of a catch; its id names the blessing the game starts. */
export interface VisitorOutcomeDef {
  id: VisitorBuffId;
  weight: number;
}

/**
 * The moth's three outcomes, 100 points between them: the rush is the common one, the deluge nearly as common, and
 * Tilde's stash the rare gift.
 */
export const VISITOR_OUTCOMES: readonly VisitorOutcomeDef[] = [
  { id: "phosphor-rush", weight: 45 },
  { id: "ink-deluge", weight: 40 },
  { id: "tilde-stash", weight: 15 },
];
