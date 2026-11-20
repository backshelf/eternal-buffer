/**
 * The sim: plays the game headless on the engine's auto-player (every feature's `moves`) and prints a timeline. By
 * default it plays `ACTIVE` from `src/content/pacing.ts`, a player at it around the clock, so every hour of the run is
 * a played hour; `--contract` judges the pacing bands at their played hours and exits 1 on a miss. `--sessions` plays
 * the session schedule instead (`SCHEDULE`, days of a person coming and going), a second look that is never judged.
 *
 * The player is a hand on the keyboard as well as a buyer: during every look the run plays one headless Clean Cut
 * (`vim.simulateActiveEdit()`) for each ~4 s of attended play since the last look, so the folios clear and the Flow
 * rises exactly as it would for someone actually typing between looks. `maxGapMin` watches the quiet stretches: the
 * longest run of played minutes in which nothing was bought and nothing opened.
 *
 *   bun run sim -- [--hours=12] [--seed=sim] [--contract]
 *   bun run sim -- --sessions [--days=7] [--seed=sim]
 */
import { type Decimal, ZERO } from "watchpot/core";
import {
  atMost,
  autoPlayer,
  byHour,
  check,
  createSimWorld,
  formatVerdicts,
  grid,
  judge,
  type LookAt,
  markdownTable,
  playDays,
  rngFor,
  type Schedule,
  sampler,
  simArgs,
  simStore,
  table,
} from "watchpot/sim";
import { ACTIVE, BANDS, CONTRACT_HOURS, SCHEDULE, SIM_DAYS, SIM_HOURS } from "../src/content/pacing";
import { type GameState, game } from "../src/game/game";
import { incomeOf } from "../src/game/income";
import { COLUMNS, type Row, type RunWatch, readRow } from "./row";

const HOUR = 3_600_000;
const MIN = 60_000;
/** One headless edit per ~4 s of attended play: the folio work a player does between looks. Keep in step with
 * `sim/fit.ts`, which prices the plan on the same cadence. */
const EDIT_EVERY_MS = 4_000;
/** A stretch of played minutes without a purchase or an unlock stops being lively somewhere around here. */
const MAX_GAP_MIN = 2;
const args = simArgs();
const player = args.get("player") ?? "auto";
if (player !== "auto") {
  console.error(
    `unknown player "${player}": the template ships the engine's auto-player only (--player=auto)`,
  );
  process.exit(2);
}
const seed = args.get("seed") ?? "sim";
const contract = args.has("contract");
const sessions = args.has("sessions");
const hours = Number(args.get("hours") ?? SIM_HOURS);
const days = Number(args.get("days") ?? SIM_DAYS);
if (!(hours > 0 && hours <= 24)) {
  console.error(`--hours takes the played hours, a day at most: --hours=12 (got "${args.get("hours")}")`);
  process.exit(2);
}
if (sessions && contract) {
  console.error("--contract judges played hours; a session run is never judged, so run them apart");
  process.exit(2);
}

/** A Monday, 08:00 local: the first look happens here. */
const START = new Date(2026, 0, 5, 8, 0, 0).getTime();
const started = performance.now();

const world = createSimWorld((now) => simStore(game, now, seed), START);
const state = () => world.store.getState() as unknown as GameState;
const auto = autoPlayer<GameState>(game, {
  balance: (s, currency) => (s.wallet as unknown as Record<string, Decimal>)[currency] ?? ZERO,
  objective: (s) => incomeOf(s).toNumber(),
});
/** The quiet-stretch record a row reads. */
const watch: RunWatch = { maxGapMin: 0 };
const take = () => readRow(state(), (world.now() - START) / HOUR, watch);
/**
 * The best kinds and ranks so far (a session run: that day): a row reports how far the play got, so a prestige just
 * before it (which empties both) does not read as play that got nowhere.
 */
const NONE = {
  kinds: 0,
  ranks: 0,
};
let best = NONE;
const climb = (r: Row) => {
  best = {
    kinds: Math.max(best.kinds, r.kinds),
    ranks: Math.max(best.ranks, r.ranks),
  };
  return r;
};
const marks = sessions
  ? [0.25, 0.5, 1, 2, 4]
  : [...new Set([0.25, 0.5, 1, 2, 4, 8, 10, 12, 16, ...CONTRACT_HOURS])].sort((a, b) => a - b);
const rows = sampler<Row>({
  marks: marks.map((h) => h * HOUR),
  start: START,
  take: () => ({ ...take(), ...best }),
  at: (r) => r.hours,
});

/**
 * What counts as a payoff: any purchase, or any of the firsts and resets a player would notice — a keycap family, an
 * Act tier, a scribe kind, a node's first rank, a bench piece, a binding or a rebind, a Marginalia tile.
 */
const payoffSignature = (s: GameState): string =>
  [
    Object.keys(s.vim.unlockedFamilies).length,
    s.vim.highestAct,
    Object.values(s.generators.owned).filter((n) => n > 0).length,
    Object.keys(s.upgrades.ranks).length + Object.keys(s.sealUpgrades.ranks).length,
    Object.keys(s.crafting.made).length,
    s.volumes.runs,
    s.codex.runs,
    Object.keys(s.achievements.earned).length,
  ].join("/");

let bought = 0;
let presses = 0;
let lastLookAt = START;
let lastPayoffAt = START;
const editsFor = (gapMs: number) => Math.max(0, Math.round(gapMs / EDIT_EVERY_MS));
const look = (at: LookAt) => {
  const now = world.now();
  // A session's first look is the player sitting down: the absence before it earned nothing from the hand.
  if (at.look === 0) {
    lastLookAt = now;
    lastPayoffAt = now;
  }
  const before = payoffSignature(state());
  const vim = state().vim;
  for (let i = 0; i < editsFor(now - lastLookAt); i += 1) vim.simulateActiveEdit();
  lastLookAt = now;
  presses += at.presses;
  const did = auto.look(world.store as never);
  bought += did.bought;
  if (did.bought > 0 || payoffSignature(state()) !== before) {
    lastPayoffAt = now;
  } else {
    watch.maxGapMin = Math.max(watch.maxGapMin, (now - lastPayoffAt) / MIN);
  }
};
// The active run is one sitting of `hours` from the first look: the schedule's day, cut to its length.
const schedule: Schedule = sessions ? SCHEDULE : { ...ACTIVE, sleepHour: ACTIVE.wakeHour + hours };
playDays({
  world,
  schedule,
  days: sessions ? days : 1,
  start: START,
  rng: rngFor(seed, player),
  look,
  afterLook: () => {
    climb(take());
    rows.look(world.now());
  },
  dayEnd: (day) => {
    rows.close({ ...climb(take()), ...best, ...(sessions ? { day } : {}) });
    best = NONE;
  },
});

const fixed = (n: number, d = 1) => n.toFixed(d);
const span = sessions ? `${days} days of sessions` : `${hours} played hours`;
console.log(
  `sim: ${player} player, seed ${seed}, ${span}, ${bought} purchases, ${presses} presses, ${fixed((performance.now() - started) / 1000)}s`,
);
console.log(
  markdownTable(
    ["day", "hours", ...COLUMNS.map(([heading]) => heading)],
    rows.rows.map((r) => [
      r.day === undefined ? "" : String(r.day),
      fixed(r.hours),
      ...COLUMNS.map(([, cell]) => cell(r)),
    ]),
  ),
);

if (contract) {
  // Every metric a band may name; `BANDS` holds bands for some of them.
  const metrics = {
    act: { name: "the Act reached", read: (r: Row) => r.act },
    kinds: { name: "Scribe kinds owned (the best so far)", read: (r: Row) => r.kinds },
    ranks: { name: "Upgrade ranks across both trees (the best so far)", read: (r: Row) => r.ranks },
    sealsRuns: { name: "`:w` Bind Volume resets", read: (r: Row) => r.sealsRuns },
    codexRuns: { name: "`:wq` Rebind Codex resets", read: (r: Row) => r.codexRuns },
    activeShare: { name: "the hand's share of the glyph income", read: (r: Row) => r.activeShare },
  };
  const CONTRACT = table(
    byHour((r: Row) => r.hours),
    metrics,
    grid(CONTRACT_HOURS, BANDS),
  );
  const verdicts = [...judge(rows.rows, CONTRACT)];
  // The band table is the arc; the quiet stretch is its texture: no look-to-look gap may run dead.
  verdicts.push(
    atMost("longest stretch without a meaningful payoff (min)", watch.maxGapMin, MAX_GAP_MIN),
    check(
      "Grammar pairs discovered by the headless hand",
      take().pairs,
      "0 (the editor logs pairs, not the sim)",
      true,
    ),
  );
  console.log(formatVerdicts(verdicts));
  if (verdicts.some((v) => !v.ok && !v.todo)) process.exit(1);
}
