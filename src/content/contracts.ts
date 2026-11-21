// Errata Slips: the desk's short work, handed out one slip at a time.
//
// A slip is drawn from its serial alone. Same serial and act, same slip — no clock, no RNG, no
// `Math.random`, so a claimant can be shown the sheet twice and the second showing matches the
// first. Slips are quiet side work: they are not Vim moves, so the pacing sim never sees them.

/** What a slip can ask the reader to do. */
export type ContractKind =
  | "clean-cuts"
  | "folio-clear"
  | "no-hjkl-folio"
  | "flow-reach"
  | "pet-tilde"
  | "anomaly-clear";

/** One slip the desk is holding open for the reader. */
export interface ActiveContractState {
  readonly id: string;
  readonly serial: number;
  readonly kind: ContractKind;
  readonly title: string;
  readonly target: number;
  readonly progress: number;
  readonly rewardCurrency: "treats" | "shards";
  readonly rewardAmount: number;
  readonly completed: boolean;
}

/** One row of the slip table: the words, the work, and what the desk pays for it. */
interface ContractBlueprint {
  readonly kind: ContractKind;
  readonly title: string;
  /** The work asked for on the Act that first hands the slip out. */
  readonly target: number;
  /** Extra units of work per Act past `minAct`. Zero means the ask never grows. */
  readonly growth: number;
  /** The ask never climbs past this, whatever the Act. */
  readonly ceiling: number;
  /** The first Act that may hand this slip out. */
  readonly minAct: number;
  readonly rewardCurrency: "treats" | "shards";
  readonly rewardAmount: number;
}

/**
 * Every Act I reader can pet the cat, so this row is also the last-resort slip when a filter
 * leaves the table empty.
 */
const PET_TILDE_SLIP: ContractBlueprint = {
  kind: "pet-tilde",
  title: "Pet the Cat Once",
  target: 1,
  growth: 0,
  ceiling: 1,
  minAct: 1,
  rewardCurrency: "treats",
  rewardAmount: 1,
};

/**
 * Twelve slips, four of them available from the first Act. Work stays bite-sized — three pages,
 * not thirty — and the only shard slips are the ones that ask for real Vim discipline.
 */
const BLUEPRINTS: readonly ContractBlueprint[] = [
  {
    kind: "clean-cuts",
    title: "Three Clean Cuts, Pinned",
    target: 3,
    growth: 0,
    ceiling: 3,
    minAct: 1,
    rewardCurrency: "treats",
    rewardAmount: 2,
  },
  {
    kind: "clean-cuts",
    title: "Cut Until the Margin Holds",
    target: 4,
    growth: 0,
    ceiling: 4,
    minAct: 2,
    rewardCurrency: "treats",
    rewardAmount: 2,
  },
  {
    kind: "clean-cuts",
    title: "A Margin of Five Clean Cuts",
    target: 5,
    growth: 0,
    ceiling: 5,
    minAct: 5,
    rewardCurrency: "treats",
    rewardAmount: 3,
  },
  {
    kind: "folio-clear",
    title: "Two Folios, Closed",
    target: 2,
    growth: 0,
    ceiling: 2,
    minAct: 1,
    rewardCurrency: "treats",
    rewardAmount: 2,
  },
  {
    kind: "folio-clear",
    title: "Three Folios, No Exceptions",
    target: 3,
    growth: 0,
    ceiling: 3,
    minAct: 3,
    rewardCurrency: "treats",
    rewardAmount: 3,
  },
  {
    kind: "no-hjkl-folio",
    title: "One Folio, No HJKL",
    target: 1,
    growth: 0,
    ceiling: 1,
    minAct: 2,
    rewardCurrency: "shards",
    rewardAmount: 1,
  },
  {
    kind: "flow-reach",
    title: "Hold Flow at Eight",
    target: 8,
    growth: 1,
    ceiling: 12,
    minAct: 2,
    rewardCurrency: "treats",
    rewardAmount: 2,
  },
  {
    kind: "flow-reach",
    title: "Flow Without a Stutter",
    target: 12,
    growth: 1,
    ceiling: 15,
    minAct: 4,
    rewardCurrency: "treats",
    rewardAmount: 3,
  },
  PET_TILDE_SLIP,
  {
    kind: "pet-tilde",
    title: "Leave the Cat Purring",
    target: 2,
    growth: 0,
    ceiling: 2,
    minAct: 3,
    rewardCurrency: "treats",
    rewardAmount: 2,
  },
  {
    kind: "anomaly-clear",
    title: "Six Anomalies, Mended",
    target: 6,
    growth: 1,
    ceiling: 10,
    minAct: 1,
    rewardCurrency: "treats",
    rewardAmount: 2,
  },
  {
    kind: "anomaly-clear",
    title: "Ten Anomalies, Signed Off",
    target: 10,
    growth: 0,
    ceiling: 10,
    minAct: 3,
    rewardCurrency: "shards",
    rewardAmount: 1,
  },
];

/** FNV-1a over the serial's digits: pure, stable, and indifferent to the clock. */
function hashSerial(serial: number): number {
  const material = `slip:${serial}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < material.length; i += 1) {
    hash ^= material.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

/** How much work the slip asks for on a given Act: the base, grown gently, never past its ceiling. */
function scaledTarget(row: ContractBlueprint, actTier: number): number {
  const steps = Math.max(0, actTier - row.minAct);
  return Math.min(row.ceiling, row.target + steps * row.growth);
}

/**
 * Roll the slip for a serial. Deterministic in `(serial, actTier)`: the hash picks the row from the
 * rows that Act may hand out, and the target grows a little with the Act. Always starts at no
 * progress and unfinished.
 */
export function rollContract(serial: number, actTier: number): ActiveContractState {
  const safeSerial = Number.isFinite(serial) ? Math.trunc(serial) : 0;
  const tier = Number.isFinite(actTier) ? Math.max(1, Math.trunc(actTier)) : 1;
  const eligible = BLUEPRINTS.filter((row) => row.minAct <= tier);
  const pool = eligible.length > 0 ? eligible : [PET_TILDE_SLIP];
  const row = pool[hashSerial(safeSerial) % pool.length] ?? PET_TILDE_SLIP;

  return {
    id: `errata-${safeSerial}`,
    serial: safeSerial,
    kind: row.kind,
    title: row.title,
    target: scaledTarget(row, tier),
    progress: 0,
    rewardCurrency: row.rewardCurrency,
    rewardAmount: row.rewardAmount,
    completed: false,
  };
}
