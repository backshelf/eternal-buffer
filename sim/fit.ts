/**
 * The fit: prices `sim/plan.ts` on the real game, in one pass of played time.
 *
 *   bun sim/fit.ts            prices the plan, proves the table, prints the module to commit
 *   bun sim/fit.ts --check    fails when the content's prices have drifted from the committed table
 *
 * Every gate is a priced Keycap Family. The game's own code reads each family's price from
 * `KEY_FAMILIES.cost.amount` in `src/content/vimActs.ts` — the engine's pattern of reading a live `fitTable` from
 * the feature would need `src/game/*` edits this task does not own — so the fit plays through a table that mirrors
 * every write into that content: shut gates cost more than anything held, and the price the fit sets is payable at
 * once, through the store's real moves and the real `unlockFamily`. The table (`PRICES` in
 * `src/content/fitTable.ts`) is still the live table the engine watches: every write drops the auto-player's cached
 * move lists, exactly as the kit documents.
 *
 * The pilot is the contract's own player: a look every 15 s (`ACTIVE` in `src/content/pacing.ts`) with one headless
 * Clean Cut per ~4 s of the gap, buying on the objective `incomeOf`. After the pass the finished table is proved
 * (`proveFit`): replayed between its snapshots on the same steps, it must arrive at each exactly, which holds only
 * because every price is `priceAbove` the most ever held — nothing could be paid before its minute. Then the script
 * prints the table module to commit into `src/content/fitTable.ts` and the same figures into
 * `KEY_FAMILIES` in `src/content/vimActs.ts`.
 */
import { type Decimal, ZERO } from "watchpot/core";
import {
  autoPlayer,
  createSimWorld,
  type FitGate,
  type FitRun,
  type FitTable,
  fitTableSource,
  fmtClock,
  formatFit,
  type HoldingsMemory,
  holdings,
  markdownTable,
  priceAbove,
  proveFit,
  resumeSimWorld,
  runFit,
  type SimSnapshot,
  shortDecimal,
  simArgs,
  simStore,
} from "watchpot/sim";
import { FIT, PRICES } from "../src/content/fitTable";
import { FAMILY_BY_ID, KEY_FAMILIES } from "../src/content/vimActs";
import { type GameState, game } from "../src/game/game";
import { incomeOf } from "../src/game/income";
import { EDIT_EVERY_MS, playPilotEdit, playPilotSideSystems } from "./pilot";
import { type GateKey, LAST_MINUTE, MARKS, PLAN, PLAN_ORDER } from "./plan";

const MIN = 60_000;
/** The contract's look cadence (`ACTIVE` in `src/content/pacing.ts` is a look every 15 s) at a 1 s step. */
export const LOOK_EVERY_STEPS = 15;
/** The same cadence in played ms: the stride's rhythm, which a resumed stretch keeps counting globally. */
const LOOK_MS = LOOK_EVERY_STEPS * 1000;
/** A price nothing held can pay: what a shut gate's content cost carries while the fit plays. */
const BLOCKED_AMOUNT = 1e300;
/** How far past the last gate the fit will play before giving up on a mark. */
const SLACK_MIN = 90;
/** A snapshot every this many played minutes, for the proof. */
const SNAPSHOT_EVERY_MIN = 30;

/** A Monday, 08:00 local: the same first look the contract's run takes. */
export const START = new Date(2026, 0, 5, 8, 0, 0).getTime();

/** What each gate is paid in: only these three currencies carry family prices. */
export type Ref = "glyphs" | "seals" | "codices";
const REF_OF = new Map<GateKey, Ref>(
  PLAN.map(({ key }) => {
    const currency = FAMILY_BY_ID[key].cost.currency as Ref;
    if (currency !== "glyphs" && currency !== "seals" && currency !== "codices") {
      throw new Error(`fit: gate "${key}" is priced in "${currency}", which the holdings do not watch`);
    }
    return [key, currency];
  }),
);
const GATE_KEYS = new Set<GateKey>(REF_OF.keys());
for (const family of KEY_FAMILIES) {
  if (family.cost.amount > 0 && !GATE_KEYS.has(family.id)) {
    throw new Error(`fit: family "${family.id}" is priced but the plan does not gate it`);
  }
}

/** Every gate's content cost, from the live table: a gate it does not hold costs more than anything ever will. */
export function applyTable(): void {
  for (const family of KEY_FAMILIES) {
    if (!GATE_KEYS.has(family.id)) continue;
    const figure = PRICES.figure(family.id);
    family.cost.amount = figure === undefined ? BLOCKED_AMOUNT : Number(figure);
  }
}

/** The table handed to `runFit`: the live table, with every write mirrored into the content. */
export const table: FitTable<GateKey> = {
  get: (key) => PRICES.get(key),
  figure: (key) => PRICES.figure(key),
  has: (key) => PRICES.has(key),
  set: (key, figure) => {
    PRICES.set(key, figure);
    applyTable();
  },
  version: () => PRICES.version(),
  data: () => PRICES.data(),
  load: (data) => {
    PRICES.load(data);
    applyTable();
  },
};

/** What the run keeps besides the world and the player: the holdings and the marks it watched land. */
export interface Extra {
  readonly have: HoldingsMemory;
  readonly events: Readonly<Record<string, number>>;
}

/** The marks this run watches for, as played ms. */
function watchMarks(s: GameState, played: number, events: Record<string, number>): void {
  const mark = (key: string, hit: boolean) => {
    if (hit && events[key] === undefined) events[key] = played;
  };
  mark("first-bind", s.volumes.runs >= 1);
  mark("first-rebind", s.codex.runs >= 1);
  mark("act-six", s.vim.unlockedFamilies["dot-echo"] === true);
  mark("mosaic-six", s.wallet.codicesEver.gte(3));
  mark("act-seven", s.vim.unlockedFamilies["ex-power"] === true);
  mark("endgame", s.vim.unlockedFamilies["vimrc-forge"] === true);
}

/**
 * One run of the game, fresh or from a snapshot: the world, the auto-player and the holdings. The fit, the proof and
 * any later tool all play through this, on the same steps and the same look, so the fit's run is the proof's replay.
 */
export function gameRun(from?: SimSnapshot<Extra>, seed = "sim") {
  // The content prices mirror the live table as it stands now: the replay of a finished table plays every price from
  // its first step, which is the point of the proof.
  applyTable();
  const store = (now: () => number) => simStore(game, now, seed);
  const world = from ? resumeSimWorld(store, from.world) : createSimWorld(store, START);
  const player = autoPlayer<GameState>(game, {
    balance: (s, currency) => (s.wallet as unknown as Record<string, Decimal>)[currency] ?? ZERO,
    objective: (s) => incomeOf(s).toNumber(),
    memory: from?.player,
  });
  const state = () => world.store.getState() as unknown as GameState;
  const have = holdings<Ref>(["glyphs", "seals", "codices"], (ref) => state().wallet[ref], {
    from: from?.extra?.have,
  });
  const events: Record<string, number> = { ...(from?.extra?.events ?? {}) };
  let played = from?.atMs ?? 0;
  // A carried-on run's first look is the one the fit played at or after the snapshot's moment, and the fit's looks
  // are a strict every-15 s rhythm counted from zero: the previous one sits one cadence back from it. Start the
  // edit gap there, or the stretch skips the burst of edits that look was owed.
  let lastLook = from ? Math.ceil(from.atMs / LOOK_MS) * LOOK_MS - LOOK_MS : played;
  const editsFor = (gapMs: number) => Math.max(0, Math.round(gapMs / EDIT_EVERY_MS));
  const run: FitRun<Extra> = {
    step: (dt) => {
      world.play(dt);
      played += dt;
    },
    look: () => {
      const edits = editsFor(played - lastLook);
      lastLook = played;
      for (let i = 0; i < edits; i += 1) playPilotEdit(world.store as never);
      // The hand's pay lands here, in a burst, before the pilot spends it: sample the high-water mark the steps
      // alone would never see (the proof needs every price above anything ever held, not above anything sampled
      // only after a step). Then sample again: a free move — a binding, a claim — can pay mid-look too.
      have.sample();
      const did = player.look(world.store as never);
      playPilotSideSystems(world.store as never, world.now());
      have.sample();
      return did;
    },
    playedMs: () => played,
    afterStep: () => {
      have.sample();
      watchMarks(state(), played, events);
    },
    capture: () => ({
      world: world.snapshot(),
      player: player.remember(),
      extra: { have: have.remember(), events: { ...events } },
    }),
  };
  return { run, state, player, have, events };
}

/** Each gate, priced above anything the pilot could ever hold before its minute: the most held, plus the largest
 * single payout its layer has ever made (a binding pays mid-look, between the sampler's eyes, and the look's next
 * purchase round can spend it at once — the bar must cover that transient too). Glyph gates need no payout term:
 * nothing credits glyphs inside a look except the hand's edits, which the run samples on the spot. */
export function gatesFor(
  have: { peak: (ref: Ref) => Decimal },
  bestOf: (ref: Ref) => Decimal,
): readonly FitGate[] {
  return PLAN.map(({ key, minute }) => ({
    key,
    atMs: minute * MIN,
    price: () => {
      const ref = REF_OF.get(key) as Ref;
      const peak = have.peak(ref);
      const best = bestOf(ref);
      return `${priceAbove(peak.add(best))} (above ${shortDecimal(peak)} ${ref} held + ${shortDecimal(best)} best payout)`;
    },
  }));
}

/** The plan's named moments against the minutes they landed at. */
function marksReport(events: Readonly<Record<string, number>>): string {
  return markdownTable(
    ["mark", "plan", "landed", "off by", "what lands here"],
    MARKS.map(({ key, minute, line }) => {
      const at = events[key];
      const off = at === undefined ? "not yet" : `${Math.round((at - minute * MIN) / MIN)} min`;
      return [key, fmtClock(minute * MIN), at === undefined ? "never" : fmtClock(at), off, line];
    }),
  );
}

/** Gates whose committed figure no longer matches the price the game actually charges. */
function driftedGates(): GateKey[] {
  return PLAN.filter(({ key }) => {
    const figure = FIT[key];
    return figure === undefined || Number(figure) !== FAMILY_BY_ID[key].cost.amount;
  }).map(({ key }) => key);
}

const fixed = (n: number, d = 1): string => n.toFixed(d);

/** Fits the plan, proves the table, and prints what to commit. Exits non-zero when either fails. */
function main(): void {
  const args = simArgs();
  const seed = args.get("seed") ?? "sim";
  const started = performance.now();

  const drifted = driftedGates();
  if (args.has("check")) {
    if (drifted.length > 0) {
      console.error(
        `fit: the content and the committed table have drifted — ${drifted
          .map(
            (key) =>
              `${key}: ${FAMILY_BY_ID[key].cost.amount} in the content, ${FIT[key] ?? "none"} committed`,
          )
          .join("; ")}`,
      );
      process.exit(1);
    }
    console.log(`fit: the committed table matches every gate's price in the content (${PLAN.length} gates)`);
    process.exit(0);
  }
  if (drifted.length > 0) {
    console.warn(
      `fit: warning, the content has drifted from the committed table (${drifted.join(", ")}) — the fit prices the plan afresh; commit its module and the same figures into the content`,
    );
  }

  const r = gameRun(undefined, seed);
  /** The largest payout each prestige layer has ever made: the mid-look transient a shut gate must still cover. */
  const bestOf = (ref: Ref): Decimal => {
    if (ref === "seals") return r.state().volumes.best;
    if (ref === "codices") return r.state().codex.best;
    return ZERO;
  };
  // The fit is done when every gate is priced, but it plays on past the last gate so the plan's marks (the prestige
  // landings the gates exist for) can land inside the run and be reported.
  const doneAt = (LAST_MINUTE + 40) * MIN;
  const result = runFit({
    ...r.run,
    table,
    gates: gatesFor(r.have, bestOf),
    done: () => playedEnough() && PLAN.every(({ key }) => PRICES.has(key)),
    limitMs: (LAST_MINUTE + SLACK_MIN) * MIN,
    quality: "exact",
    lookEvery: LOOK_EVERY_STEPS,
    snapshotEveryMs: SNAPSHOT_EVERY_MIN * MIN,
  });
  function playedEnough(): boolean {
    return r.run.playedMs() >= doneAt;
  }

  console.log(
    `fit: ${fmtClock(result.playedMs)} played, ${fixed((performance.now() - started) / 1000)}s so far, gates ${result.gates.filter((g) => g.openedMs !== undefined).length}/${PLAN.length} priced`,
  );
  console.log(formatFit(result));
  console.log(marksReport(r.events));

  const never = result.gates.filter((g) => g.openedMs === undefined).map((g) => g.key);
  if (!result.finished) {
    console.error(
      `fit: the run did not finish (never opened: ${never.join(", ") || "none"}). Nothing proved.`,
    );
    process.exit(1);
  }

  const proof = proveFit({ marks: result.snapshots, replay: (from) => gameRun(from, seed).run });
  console.log(
    `proof: ${proof.stretches} stretches, ${proof.failed.length === 0 ? "the replay is the fit's run again" : proof.failed.join("\n")}`,
  );
  if (proof.failed.length > 0) process.exit(1);

  console.log(
    fitTableSource(PRICES, {
      header:
        "Written by `bun sim/fit.ts` from `sim/plan.ts`. Never edit by hand: change the plan and fit again.\n\nThis module is the fit's record. The game itself reads each family's price from `KEY_FAMILIES` in\n`src/content/vimActs.ts` (the sim and the store play those numbers), so the table here and the content there\nmust never drift: `bun sim/fit.ts --check` fails when they have, and a fit that lands on different prices\nprints a fresh module to commit back into both.",
      planImport: "../../sim/plan",
      keyType: "GateKey",
      order: PLAN_ORDER,
    }),
  );
  console.log("\nexport const PRICES = fitTable<GateKey>(FIT);");
  console.error(
    `fit: commit the table above into src/content/fitTable.ts and the same figures into KEY_FAMILIES in src/content/vimActs.ts (${fixed((performance.now() - started) / 1000)}s)`,
  );
}

if (import.meta.main) main();
