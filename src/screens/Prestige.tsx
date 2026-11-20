import { type Decimal, fmt, fmtPlayed } from "watchpot/core";
import { useGameState } from "../app/hooks";
import { playBindVolume } from "../app/sound";
import {
  BONUS_PER_UNIT,
  CODEX_MILESTONES,
  CODEX_NAME,
  CODEX_VERB,
  PRESTIGE_NAME,
  PRESTIGE_VERB,
  type PrestigeMilestone,
  VOLUME_MILESTONES,
} from "../content/prestige";
import { CURRENCY, MAIN, TAB_NAMES } from "../content/words";
import { codex, volumes } from "../game/prestige";
import { records } from "../game/records";
import { momentState } from "../shaders/pulses";
import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";
import { ProgressBar } from "../ui/ProgressBar";
import { Title } from "../ui/Title";
import s from "./screens.module.css";

/** A ledger figure, or a dash before the archive has one. */
const figure = (value: number | Decimal | undefined) => (value === undefined ? "—" : fmt(value).text);

/** A layer's permanent milestones: what each counts, and whether it has been reached. */
function Milestones({
  list,
  reached,
}: {
  list: readonly PrestigeMilestone[];
  reached: (id: string) => boolean;
}) {
  return (
    <ul className={s.milestones}>
      {list.map((milestone) => {
        const met = reached(milestone.id);
        return (
          <li key={milestone.id} className={s.milestone} data-reached={met ? "" : undefined}>
            <span className={s.check} aria-hidden="true">
              {met ? "[x]" : "[ ]"}
            </span>
            <span className={s.milestoneBody}>
              <span className={s.milestoneName}>{milestone.name}</span>
              <span className={`small ${s.muted}`}>{milestone.line}</span>
            </span>
            <span className={s.tag}>
              {milestone.at} {milestone.on === "total" ? "ever" : "best"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** The two prestige layers and the ledger of every run that has ended. */
export function PrestigeScreen() {
  const st = useGameState((x) => x);

  const seals = volumes.select.held(st);
  const sealBonus = seals.pow(0.85).mul(BONUS_PER_UNIT).add(1);
  const sealGain = volumes.select.gain(st);
  const sealRuns = st.volumes.runs;

  const codices = codex.select.held(st);
  const codexGain = codex.select.gain(st);
  const codexRuns = st.codex.runs;
  const codexOpen = st.wallet.sealsEver.gte(50) || st.vim.actTier >= 4;
  const toward = st.wallet.sealsEver.gte(250) ? 250 : st.wallet.sealsEver.toNumber();

  const bind = () => {
    if (st.volumes.bind()) playBindVolume();
  };
  const rebind = () => {
    if (!st.codex.rebind()) return;
    // `MomentOverlay` cues `playRebindCodex()` once when `momentState` opens.
    momentState.trigger();
  };

  return (
    <div className={s.screen}>
      <Title>{TAB_NAMES.prestige}</Title>
      <Panel heading={PRESTIGE_NAME} aside={`${fmt(seals).text} ${CURRENCY.seals.plural.toLowerCase()}`}>
        <p className={`small ${s.muted}`}>
          Every Seal held multiplies Clarity by 1 + 0.15 × seals^0.85. Held now: Clarity ×
          {fmt(sealBonus, { decimals: 2 }).text}.
        </p>
        <p className={`small ${s.muted}`}>
          {fmt(st.wallet.earned).text} {CURRENCY[MAIN].plural.toLowerCase()} rescued this run · {sealRuns}{" "}
          {sealRuns === 1 ? "volume" : "volumes"} bound so far
        </p>
        {st.volumes.pastPeak && <p className={s.peak}>Peak pace passed — ready to :w</p>}
        <div className={s.row}>
          <span className="body-strong">
            +{fmt(sealGain).text} {CURRENCY.seals.plural.toLowerCase()}
          </span>
          <Button variant="primary" disabled={sealGain.lt(1)} onClick={bind}>
            {PRESTIGE_VERB}
          </Button>
        </div>
        <Milestones list={VOLUME_MILESTONES} reached={(id) => volumes.select.reached(st, id)} />
        {!codexOpen && (
          <p className={`small ${s.muted}`}>
            {CODEX_NAME} stays shut until the archive has ever bound 50 Seals, or until Act IV opens the
            objects.
          </p>
        )}
      </Panel>
      {codexOpen && (
        <Panel heading={CODEX_NAME} aside={`${fmt(codices).text} ${CURRENCY.codices.plural.toLowerCase()}`}>
          <p className={`small ${s.muted}`}>
            A Codex is a whole epoch rebound: every Seal, every Glyph and every run goes back to the first
            page, and each Codex held adds +150% Clarity for good. {codexRuns}{" "}
            {codexRuns === 1 ? "rebind" : "rebinds"} so far.
          </p>
          <ProgressBar
            value={toward}
            max={250}
            label="Seals ever bound"
            valueText={`${fmt(st.wallet.sealsEver).text} / 250`}
          />
          <div className={s.row}>
            <span className="body-strong">
              +{fmt(codexGain).text} {CURRENCY.codices.plural.toLowerCase()}
            </span>
            <Button
              variant="primary"
              disabled={!st.wallet.sealsEver.gte(250) || codexGain.lt(1)}
              onClick={rebind}
            >
              {CODEX_VERB}
            </Button>
          </div>
          <Milestones list={CODEX_MILESTONES} reached={(id) => codex.select.reached(st, id)} />
        </Panel>
      )}
      <Panel heading="Archive Ledger" tone="sunken" aside={`${st.records.runs.length} runs`}>
        <dl className={s.ledger}>
          <div>
            <dt>Edits</dt>
            <dd>{figure(records.select.value(st, "life", "edits"))}</dd>
          </div>
          <div>
            <dt>Clean Cuts</dt>
            <dd>{figure(records.select.value(st, "life", "cleanCuts"))}</dd>
          </div>
          <div>
            <dt>Best Flow</dt>
            <dd>{figure(records.select.value(st, "life", "bestFlow"))}</dd>
          </div>
          <div>
            <dt>Folios cleared</dt>
            <dd>{figure(records.select.value(st, "life", "folios"))}</dd>
          </div>
          <div>
            <dt>Glyphs at peak</dt>
            <dd>{figure(records.select.value(st, "life", "glyphsPeak"))}</dd>
          </div>
        </dl>
        {st.records.runs.length === 0 ? (
          <p className={`small ${s.muted}`}>
            No run has ended yet. A :w closes a volume and writes its last line into this ledger.
          </p>
        ) : (
          <ol className={s.runs}>
            {st.records.runs
              .slice(-5)
              .reverse()
              .map((run, index) => (
                <li key={`${run.endedAt}:${index}`} className={s.run}>
                  <span className={s.num}>{fmtPlayed(run.lengthMs)}</span>
                  <span className={`small ${s.muted}`}>
                    {figure(run.values.cleanCuts)} clean cuts · {figure(run.values.folios)} folios ·{" "}
                    {figure(run.values.glyphsPeak)} glyphs
                  </span>
                </li>
              ))}
          </ol>
        )}
      </Panel>
    </div>
  );
}
