import { useState } from "react";
import { fmt } from "watchpot/core";
import type { AchievementRow, AchievementRowAside, AchievementTile, AchievementWords } from "watchpot/ui";
import { useGameState } from "../app/hooks";
import { tileMark } from "../app/icons";
import { ACHIEVEMENTS, POWER, ROW_TITLES, WALL_NAME, type When } from "../content/achievements";
import { GENERATORS } from "../content/generators";
import { CODEX_VERB, PRESTIGE_VERB } from "../content/prestige";
import { TREE_NAME } from "../content/tree";
import { ACTS } from "../content/vimActs";
import { CURRENCY, MAIN, TAB_NAMES } from "../content/words";
import { wall } from "../game/achievements";
import { AchievementWall } from "../ui/AchievementWall";
import { Title } from "../ui/Title";
import s from "./screens.module.css";

/** A producer's name by id, for "own" conditions. */
const PRODUCER = new Map<string, string>(GENERATORS.map((g): [string, string] => [g.id, g.name]));

/** An Act's numeral, for "reach" conditions. */
const NUMERAL = new Map<number, string>(ACTS.map((act): [number, string] => [act.id, act.numeral]));

/** What a condition asks, in words. Every `When` says its own line: the note under the flavour. */
function ask(w: When): string {
  const glyphs = CURRENCY[MAIN].plural.toLowerCase();
  if ("own" in w) return `Own ${w.count} × ${PRODUCER.get(w.own) ?? w.own}.`;
  if ("earned" in w) return `Rescue ${fmt(w.earned).text} ${glyphs} in one run.`;
  if ("runs" in w) return `${PRESTIGE_VERB} ${w.runs === 1 ? "once" : `${w.runs} times`}.`;
  if ("nodes" in w) return `Raise ${w.nodes} nodes of the ${TREE_NAME}.`;
  if ("folios" in w) return `Clear ${fmt(w.folios).text} folios.`;
  if ("cleanCuts" in w) return `Land ${fmt(w.cleanCuts).text} Clean Cuts.`;
  if ("flow" in w) return `Hold ${w.flow} stacks of Flow at once.`;
  if ("pairs" in w) return `Speak ${w.pairs} Grammar Codex pairs in real play.`;
  if ("act" in w) return `Reach Act ${NUMERAL.get(w.act) ?? w.act}.`;
  if ("mosaicPlaced" in w) return `Press ${w.mosaicPlaced} pieces into the Mosaic.`;
  if ("expeditions" in w) return `Bring home ${w.expeditions} Margin Expeditions.`;
  if ("tildeBond" in w) return `Raise Tilde's bond to ${w.tildeBond}.`;
  if ("tildePets" in w) return `Pet Tilde ${w.tildePets} times.`;
  if ("challenges" in w) return `Clear ${w.challenges} Vim Skill Trials.`;
  if ("codexRuns" in w) return `${CODEX_VERB} ${w.codexRuns === 1 ? "once" : `${w.codexRuns} times`}.`;
  return "A moment the archive keeps to itself.";
}

const ASK = new Map(ACHIEVEMENTS.map((a) => [a.id, ask(a.when)]));

/** What the wall says around its tiles. */
const WORDS: AchievementWords = {
  hiddenName: "???",
  hiddenLine: "???",
  earned: ", earned",
  locked: ", not yet",
};

/** A row's rail: its name, how full it is, and what a full one gives. */
function rowAside(aside: AchievementRowAside) {
  const secret = aside.index === ROW_TITLES.length - 1 && aside.earned === 0;
  const title = secret ? "???" : (ROW_TITLES[aside.index] ?? `Row ${aside.index + 1}`);
  return (
    <span className={s.rowAside}>
      <span className={s.rowTitle}>{title}</span>
      <span className={s.num}>
        {aside.earned} / {aside.total}
      </span>
      <span className={s.rowBonus}>×{POWER.row.toFixed(2)} Clarity a row</span>
    </span>
  );
}

/** The wall: every achievement in six rows of eight, with the row's own rail and what the earned ones give. */
export function AchievementsScreen() {
  const earned = useGameState((st) => st.achievements.earned);
  const [inspected, setInspected] = useState<AchievementTile | null>(null);
  const rows: AchievementRow[] = wall.def.board.rows(earned).map((row) => ({
    complete: row.complete,
    tiles: row.tiles.map((tile) => ({
      id: tile.achievement.id,
      name: tile.achievement.name,
      line: (
        <>
          {tile.achievement.line} <em>{ASK.get(tile.achievement.id)}</em>
        </>
      ),
      reward: `Clarity ×${POWER.each}`,
      earned: tile.earned,
      hidden: tile.hidden,
    })),
  }));
  const count = wall.def.board.count(earned);
  const full = wall.def.board.rowsComplete(earned);
  const secret = inspected ? Boolean(inspected.hidden) && !inspected.earned : false;
  return (
    <div className={s.screen}>
      <Title>{TAB_NAMES.achievements}</Title>
      <p className={`small ${s.muted}`}>
        {count} of {ACHIEVEMENTS.length} tiles struck · {full} of {ROW_TITLES.length} rows full · Clarity ×
        {fmt(wall.def.board.power(earned, POWER), { decimals: 2 }).text}
      </p>
      <div className={s.inspectBar} aria-live="polite">
        {inspected ? (
          secret ? (
            <>
              <span className={s.inspectName}>???</span>
              <span className={s.inspectLine}>A secret seal. Keep playing to uncover it.</span>
            </>
          ) : (
            <>
              <span className={s.inspectName}>
                {inspected.name} · {inspected.earned ? "Struck" : "Unstruck"}
              </span>
              <span className={s.inspectLine}>{inspected.line}</span>
              <span className={s.inspectReward}>{inspected.reward}</span>
            </>
          )
        ) : (
          <span className={s.inspectLine}>Click or hover any seal to inspect its condition and reward.</span>
        )}
      </div>
      <AchievementWall
        label={WALL_NAME}
        className={s.archiveWall}
        rows={rows}
        words={WORDS}
        icon={(tile) => tileMark(tile.earned, tile.hidden ?? false)}
        onActivate={setInspected}
        renderRowAside={rowAside}
      />
    </div>
  );
}
