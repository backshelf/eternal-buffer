import { defineRecords } from "watchpot/core";

/**
 * The archive's own ledger, on the engine's `records`: counts that add up and peaks that keep their highest, each kept
 * for this run and for the whole life of the profile. The game notes what it counts where it happens
 * (`records.draft.add` / `.note`); the Marginalia screen reads it back.
 */
export const records = defineRecords({
  key: "records",
  track: {
    edits: { kind: "sum", scope: ["run", "life"] },
    cleanCuts: { kind: "sum", scope: ["run", "life"] },
    folios: { kind: "sum", scope: ["run", "life"] },
    bestFlow: { kind: "max", scope: ["run", "life"] },
    glyphsPeak: { kind: "max", scope: ["run", "life"], decimal: true },
  },
});
