import { type Decimal, definePrestige, type PrestigeMilestoneDef, powerGain, reach } from "watchpot/core";
import {
  CODEX_GAIN,
  CODEX_MILESTONES,
  type PrestigeMilestone,
  VOLUME_GAIN,
  VOLUME_MILESTONES,
} from "../content/prestige";
import { wallet } from "./wallet";

/** What the prestige gain is read from: the run's earnings and the gain stat. */
interface GainReads {
  readonly wallet: { readonly earned: Decimal };
  readonly stats: { readonly gain: Decimal };
}

/** What the codex gain is read from: Seals paid this epoch and the codex yield. */
interface CodexReads {
  readonly volumes: { readonly lifetime: Decimal };
  readonly stats: { readonly codexGain: Decimal };
}

/**
 * What a volume pays now: the run's Glyphs on `VOLUME_GAIN`, times the gain stat. Both layers' curves are pure, so a
 * button's preview, the reset and the reset pace all agree.
 */
export const volumeGain = (s: GainReads) =>
  powerGain(s.wallet.earned, { ...VOLUME_GAIN, mult: s.stats.gain });

/** What a codex pays now: the Seals bound this epoch on `CODEX_GAIN`, times the codex yield. */
export const codexGain = (s: CodexReads) =>
  powerGain(s.volumes.lifetime, { ...CODEX_GAIN, mult: s.stats.codexGain });

/**
 * A milestone as the engine takes it: `{ id, at, on, name, text }`. The content's `line` is the archive's sentence,
 * and its `effect` is left here for the game to apply where the effect belongs.
 */
const milestonesOf = (list: readonly PrestigeMilestone[]): PrestigeMilestoneDef[] =>
  list.map((m) => ({ id: m.id, at: m.at, on: m.on, name: m.name, text: m.line }));

/**
 * What a reset is worth to the auto-player: taken only once it pays at least one and at least doubles what the layer
 * holds, and valued at the gain itself.
 */
const worthOf = (gain: Decimal, held: Decimal) =>
  gain.gte(1) && gain.gte(held.mul(2)) ? gain.toNumber() : 0;

/**
 * The first layer on the engine's `prestige`: `:w Bind Volume` pays Seals into the wallet and starts the run over.
 * `depth: 1` resets the run alone; `reset: { depth: 2 }` lets a codex rebind start the volume count over too, while
 * the milestones on it — a best Seal payout — stay for good.
 */
export const volumes = definePrestige({
  key: "volumes",
  action: "bind",
  depth: 1,
  reach: () => [wallet, reach<{ stats: { gain: Decimal } }>()],
  payInto: { wallet, currency: "seals" },
  reset: { depth: 2 },
  milestones: milestonesOf(VOLUME_MILESTONES),
  gain: (s) => volumeGain(s),
  worth: (s) => worthOf(volumeGain(s), s.wallet.seals),
});

/**
 * The second layer, above the first: `:wq Rebind Codex` pays Codices into the wallet and starts the whole epoch over,
 * `volumes` among it. It opens once the archive has ever bound 250 Seals and a rebind would pay at least one codex.
 * Its milestones count the codices ever bound (a lifetime, since a rebind is meant to be repeated) and never go back.
 */
export const codex = definePrestige({
  key: "codex",
  action: "rebind",
  depth: 2,
  reach: () => [wallet, volumes, reach<{ stats: { codexGain: Decimal } }>()],
  payInto: { wallet, currency: "codices" },
  milestones: milestonesOf(CODEX_MILESTONES),
  gain: (s) => codexGain(s),
  canReset: (s) => s.wallet.sealsEver.gte(250) && codexGain(s).gte(1),
  worth: (s) => worthOf(codexGain(s), s.wallet.codices),
});
