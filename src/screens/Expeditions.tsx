import { type Decimal, fmt, fmtCounted, fmtWait, missionLeftMs, missionReady } from "watchpot/core";
import { useClockNow } from "watchpot/react";
import { drawnShare, VisuallyHidden } from "watchpot/ui";
import { useGameState, useGameStore } from "../app/hooks";
import { glyphOf } from "../app/icons";
import { playBuy, playEarned } from "../app/sound";
import { EXPEDITIONS, type ExpeditionContentDef } from "../content/expeditions";
import { ACT_BY_ID, type ActId } from "../content/vimActs";
import { CURRENCY } from "../content/words";
import { expeditions } from "../game/expeditions";
import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";
import { Title } from "../ui/Title";
import s from "./Expeditions.module.css";
import screens from "./screens.module.css";

/** How many cells the ASCII meter is cut into, lit ones followed by dotted ones. */
const METER_BLOCKS = 8;
/** The two milestones that widen the stair, named as the game names them. */
const SLOT_AT_SEALS = 10;
const SLOT_AT_CODICES = 2;

/** An expedition as the list knows it, by id. */
const EXPEDITION_BY_ID = new Map<string, ExpeditionContentDef>(EXPEDITIONS.map((run) => [run.id, run]));

/** A `[▓▓▓▓░░░░]` meter: the drawn share of a run, split into lit and dim spans so the blocks read cleanly. */
function Meter({ done }: { done: number }) {
  const lit = Math.round(drawnShare(done, 0, 1, METER_BLOCKS) * METER_BLOCKS);
  return (
    <span className={s.meter} aria-hidden="true">
      [<span className={s.meterLit}>{"█".repeat(lit)}</span>
      <span className={s.meterDim}>{"░".repeat(METER_BLOCKS - lit)}</span>]
    </span>
  );
}

/** A rolled amount as the list prints it: a range, a single figure, and nothing at all for a run that gives none. */
function rewardText(content: ExpeditionContentDef): string {
  const [low, high] = content.shardsRange;
  const [few, many] = content.treatsRange;
  const parts: string[] = [];
  if (high > 0) {
    parts.push(
      low === high ? fmtCounted(low, ["Shard", "Shards"]) : `${fmt(low).text}–${fmt(high).text} Shards`,
    );
  }
  if (many > 0) {
    parts.push(
      few === many ? fmtCounted(few, ["Treat", "Treats"]) : `${fmt(few).text}–${fmt(many).text} Treats`,
    );
  }
  if (content.inkRebate !== undefined && content.inkRebate > 0) {
    parts.push(`+${fmt(content.inkRebate).text} Ink back`);
  }
  return parts.join(" · ");
}

/** What one errand's page entry is waiting on, in the game's words, or null when it is open. */
function lockOf(
  content: ExpeditionContentDef,
  reads: { actTier: number; tildeBond: number; codicesEver: Decimal },
): string | null {
  if (content.minAct !== undefined && content.minAct > reads.actTier) {
    const act = ACT_BY_ID[content.minAct as ActId];
    return `Act ${act?.numeral ?? content.minAct}`;
  }
  if (content.minCodices !== undefined && reads.codicesEver.lt(content.minCodices)) {
    return `${content.minCodices} Codices`;
  }
  if (content.minTildeBond !== undefined && reads.tildeBond < content.minTildeBond) {
    return `Tilde, Bond ${content.minTildeBond}`;
  }
  return null;
}

/**
 * Margin Expeditions: the errands that run while nobody is typing. Two to four are away at once, each timed on game
 * time so it comes back during an absence, each priced in ink and paid in shards, treats and sometimes ink back. The
 * reward is rolled at the start and shown here, so a return never surprises anyone.
 */
export function ExpeditionsScreen() {
  const store = useGameStore();
  const st = useGameState((state) => state);
  const now = useClockNow(500);
  const runs = st.expeditions.active;
  const slots = expeditions.select.slots(st);
  const rows = Math.max(slots, runs.length);
  const seals = st.wallet.sealsEver;
  const codices = st.wallet.codicesEver;
  const nextThreshold =
    slots < 3 ? (
      <span>
        Next slot at {SLOT_AT_SEALS} Seals (from :w Volumes): {fmt(seals).text} of {fmt(SLOT_AT_SEALS).text}
      </span>
    ) : slots < 4 ? (
      <span>
        Next slot at {SLOT_AT_CODICES} Codices (from :wq): {fmt(codices).text} of {fmt(SLOT_AT_CODICES).text}
      </span>
    ) : (
      <span>Every slot is open. Four errands can be away at once.</span>
    );

  const introBeat = !st.settings.veteranMode && st.vim.seenBeats.expeditions !== true;
  const openList = EXPEDITIONS.filter(
    (c) => lockOf(c, { actTier: st.vim.actTier, tildeBond: st.vim.tildeBond, codicesEver: codices }) === null,
  );
  const nextLocked = EXPEDITIONS.find(
    (c) => lockOf(c, { actTier: st.vim.actTier, tildeBond: st.vim.tildeBond, codicesEver: codices }) !== null,
  );
  const shownErrands = st.settings.veteranMode
    ? EXPEDITIONS
    : nextLocked
      ? [...openList, nextLocked]
      : openList;

  return (
    <div className={s.screen}>
      <Title>Expeditions</Title>
      {introBeat ? (
        <p className={screens.roomLead}>
          Send Scribes&apos; <strong>Ink</strong> on timed errands — they keep running while you&apos;re away
          — for <strong>Shards</strong> and <strong>Treats</strong>. Dispatch your first errand below.
        </p>
      ) : (
        <p className={s.standing}>
          Timed errands into the archive&apos;s unindexed parts. They run offline too and bring back Shards
          &amp; Treats.
        </p>
      )}

      <Panel
        heading="Active Errands"
        aside={
          <span>
            {runs.length} of {slots} away
          </span>
        }
      >
        <p className={s.threshold}>{nextThreshold}</p>
        <ul className={s.runs}>
          {Array.from({ length: rows }, (_, index) => {
            const entry = runs[index];
            const content = entry ? EXPEDITION_BY_ID.get(entry.mission) : undefined;
            if (!entry || !content) {
              return (
                <li key={`slot-${index}`} className={s.run} data-state="idle">
                  <span className={s.runHead}>
                    <span className={s.runName}>An empty slot</span>
                    <Meter done={0} />
                  </span>
                  <span className={s.runMeta}>
                    <span className={s.meta}>Nothing away. Send something down the stair.</span>
                  </span>
                </li>
              );
            }
            const left = missionLeftMs(entry, now);
            const ready = missionReady(entry, now);
            const total = Math.max(1, entry.endsAt - entry.startedAt);
            const done = (total - left) / total;
            const reward = entry.reward;
            return (
              <li key={entry.id} className={s.run} data-state={ready ? "ready" : "away"}>
                <span className={s.runHead}>
                  <span className={s.runName}>{content.name}</span>
                  <Meter done={done} />
                </span>
                <span className={s.runMeta}>
                  <span className={s.meta}>{ready ? "Back at the stair" : `Back in ${fmtWait(left)}`}</span>
                  <span className={s.reward}>
                    {glyphOf(CURRENCY.shards.glyph, 12)}
                    <span className={s.figure}>{fmt(reward.shards).text}</span>
                    <VisuallyHidden> {CURRENCY.shards.plural}</VisuallyHidden>
                    {reward.treats > 0 && (
                      <>
                        {glyphOf(CURRENCY.treats.glyph, 12)}
                        <span className={s.figure}>{fmt(reward.treats).text}</span>
                        <VisuallyHidden> {CURRENCY.treats.plural}</VisuallyHidden>
                      </>
                    )}
                    {reward.rebate > 0 && (
                      <>
                        {glyphOf(CURRENCY.ink.glyph, 12)}
                        <span className={s.figure}>{fmt(reward.rebate).text}</span>
                        <VisuallyHidden> {CURRENCY.ink.plural} back</VisuallyHidden>
                      </>
                    )}
                  </span>
                </span>
                <Button
                  variant={ready ? "primary" : "secondary"}
                  className={s.claim}
                  disabled={!ready}
                  onClick={() => {
                    if (!store.getState().expeditions.claim(entry.id)) return;
                    playEarned();
                  }}
                >
                  {ready ? "Claim" : "Away"}
                </Button>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel heading="Available Errands" aside={<span>{openList.length} open</span>}>
        <ul className={s.stair}>
          {shownErrands.map((content) => {
            const lock = lockOf(content, {
              actTier: st.vim.actTier,
              tildeBond: st.vim.tildeBond,
              codicesEver: codices,
            });
            const short = content.costInk > 0 && st.wallet.ink.lt(content.costInk);
            const full = expeditions.select.freeSlots(st) === 0;
            const why = lock ?? (full ? "No slot free" : short ? "Not enough Ink" : null);
            const done = st.expeditions.done[content.id] ?? 0;
            return (
              <li key={content.id} className={s.errand} data-locked={lock ? "" : undefined}>
                <div className={s.errandText}>
                  <p className={s.errandHead}>
                    <span className={s.name}>{content.name}</span>
                    <span className={s.duration}>{fmtWait(content.durationMs)}</span>
                    {done > 0 && <span className={s.done}>{done === 1 ? "1 run" : `${done} runs`}</span>}
                  </p>
                  <p className={s.line}>{content.line}</p>
                  <p className={s.figures}>
                    <span className={s.reward}>{rewardText(content)}</span>
                    {content.costInk > 0 ? (
                      <span className={s.cost}>
                        {glyphOf(CURRENCY.ink.glyph, 12)}
                        <span className={s.figure}>{fmt(content.costInk).text}</span>
                        <VisuallyHidden> {CURRENCY.ink.plural}</VisuallyHidden>
                      </span>
                    ) : (
                      <span className={s.free}>No Ink</span>
                    )}
                  </p>
                </div>
                <div className={s.errandAction}>
                  <Button
                    className={s.dispatch}
                    disabled={why !== null}
                    onClick={() => {
                      if (store.getState().expeditions.start(content.id) !== null) return;
                      playBuy();
                      if (st.vim.seenBeats.expeditions !== true)
                        store.getState().vim.completeBeat("expeditions");
                    }}
                  >
                    Dispatch
                  </Button>
                  <span className={s.why}>{why}</span>
                </div>
              </li>
            );
          })}
        </ul>
        <p className={s.footnote}>
          The shards these bring back are what the bench charges for its later pieces, and the treats go to
          Tilde, who has strong opinions about the dairy at the bottom of the margin.
        </p>
      </Panel>
    </div>
  );
}
