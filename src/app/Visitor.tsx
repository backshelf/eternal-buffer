import type { CSSProperties } from "react";
import { nextFloat, seedRng } from "watchpot/core";
import { useClockNow } from "watchpot/react";
import { LIFE_MS, VISITOR, VISITOR_BUFFS, VISITOR_OUTCOMES, type VisitorBuffDef } from "../content/visitor";
import { STAT } from "../content/words";
import { VISITOR_KIND } from "../game/visitor";
import { Arrival } from "../ui/Arrival";
import { BuffChip } from "../ui/BuffChip";
import { useGameState, useGameStore } from "./hooks";
import { playCatch } from "./sound";

/** The moth itself: three lines of ASCII, the one soft creature in a page of rules and right angles. */
const MOTH = ["  /\\  /\\", " ( oo oo )", "  \\/  \\/"].join("\n");

/** What the moth carries, in its own voice, for the arrival's label. */
const CARRIES = VISITOR_OUTCOMES.map(
  (outcome) => VISITOR_BUFFS.find((buff) => buff.id === outcome.id)?.name ?? outcome.id,
);

/** The mark's face: the archive's phosphor, monospaced, a breath of glow. It is only here, so it is only styled here. */
const MOTH_FACE: CSSProperties = {
  display: "block",
  color: "var(--ui-accent)",
  fontFamily: "var(--ui-font-num)",
  fontSize: 9,
  lineHeight: 1.1,
  whiteSpace: "pre",
  textShadow: "0 0 8px color-mix(in srgb, var(--ui-accent) 45%, transparent)",
};

/** The stack of chips: no stylesheet of its own, a grid of one column. */
const CHIPS: CSSProperties = { display: "grid", gap: 6 };

/** Where an arrival sits: in the outer margins (left, right, or top band) so it never blocks the buffer. */
const placeOf = (id: string) => {
  const [zone, r1] = nextFloat(seedRng(id));
  const [a, r2] = nextFloat(r1);
  const [b] = nextFloat(r2);
  if (zone < 0.35) return { x: 0.04 + a * 0.09, y: 0.16 + b * 0.68 };
  if (zone < 0.7) return { x: 0.87 + a * 0.09, y: 0.16 + b * 0.68 };
  return { x: 0.22 + a * 0.56, y: 0.06 + b * 0.07 };
};

/** What a buff is worth, said the way the ledger says it: a multiple or a share of one stat. */
function effectWords(buff: VisitorBuffDef): string {
  return buff
    .effects(1, undefined)
    .map((effect) =>
      effect.mul !== undefined
        ? `${STAT[effect.stat]} ×${effect.mul}`
        : `${STAT[effect.stat]} +${Math.round(Number(effect.add) * 100)}%`,
    )
    .join(" · ");
}

/** The visitor over the page while one is here: press it to catch it, and hear what it carries. */
export function VisitorLayer() {
  const store = useGameStore();
  const live = useGameState((st) => st.visitors.kinds[VISITOR_KIND]?.live ?? null);
  const now = useClockNow(250);
  if (!live || now >= live.diesAt) return null;
  return (
    <Arrival
      at={placeOf(live.id)}
      life={(live.diesAt - now) / LIFE_MS}
      label={`${VISITOR.name}: ${VISITOR.line} Catch it for ${CARRIES.join(", ")}.`}
      onCatch={() => {
        if (store.getState().visitors.catch(VISITOR_KIND) !== null) playCatch();
      }}
    >
      <span style={MOTH_FACE} aria-hidden="true">
        {MOTH}
      </span>
    </Arrival>
  );
}

/**
 * Every blessing running right now, the moth's three and Tilde's two among them: its name, what it does, and the time
 * it has left, one chip each. The caller owns the clock; this reads it four times a second.
 */
export function BoostChip() {
  const active = useGameState((st) => st.boosts.active);
  const now = useClockNow(250);
  const up = VISITOR_BUFFS.flatMap((buff) => {
    const entry = active[buff.id];
    return entry !== undefined && entry.until > now ? [{ buff, entry }] : [];
  });
  if (up.length === 0) return null;
  return (
    <div style={CHIPS}>
      {up.map(({ buff, entry }) => (
        <BuffChip
          key={buff.id}
          name={buff.name}
          effect={effectWords(buff)}
          secondsLeft={(entry.until - now) / 1000}
          seconds={buff.durationMs / 1000}
        />
      ))}
    </div>
  );
}
