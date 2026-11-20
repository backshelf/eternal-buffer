import { fmt } from "watchpot/core";
import { useGameState } from "../app/hooks";
import { sound } from "../app/sound";
import { CODEX_NAME, CODEX_VERB, PRESTIGE_NAME, PRESTIGE_VERB } from "../content/prestige";
import { CURRENCY, MAIN, TAB_NAMES } from "../content/words";
import { codex, volumes } from "../game/prestige";
import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";
import { Title } from "../ui/Title";
import s from "./screens.module.css";

/** What a layer's panel says under its figure: the run it counts and whether it is worth pressing. */
const stateLine = (runs: number, pastPeak: boolean) =>
  `${runs} bound so far${pastPeak ? " · the page is past its peak" : ""}`;

/** The two prestige layers: what each is worth, what the archive holds, and the reset. */
export function PrestigeScreen() {
  const earned = useGameState((st) => fmt(st.wallet.earned).text);
  const seals = useGameState((st) => fmt(volumes.select.held(st)).text);
  const sealGain = useGameState((st) => volumes.select.gain(st).toNumber());
  const sealRuns = useGameState((st) => st.volumes.runs);
  const pastPeak = useGameState((st) => st.volumes.pastPeak);
  const bind = useGameState((st) => st.volumes.bind);

  const codices = useGameState((st) => fmt(codex.select.held(st)).text);
  const codexGain = useGameState((st) => codex.select.gain(st).toNumber());
  const codexRuns = useGameState((st) => st.codex.runs);
  const codexOpen = useGameState((st) => st.wallet.sealsEver.gte(250));
  const rebind = useGameState((st) => st.codex.rebind);

  return (
    <div className={s.screen}>
      <Title>{TAB_NAMES.prestige}</Title>
      <Panel heading={PRESTIGE_NAME} aside={`${seals} ${CURRENCY.seals.plural.toLowerCase()}`}>
        <p className={`small ${s.muted}`}>
          {earned} {CURRENCY[MAIN].plural.toLowerCase()} this run · {stateLine(sealRuns, pastPeak)}
        </p>
        <div className={s.row}>
          <span className="body-strong">
            +{fmt(sealGain).text} {CURRENCY.seals.plural.toLowerCase()}
          </span>
          <Button variant="primary" disabled={sealGain < 1} onClick={() => bind() && sound.play("ascend")}>
            {PRESTIGE_VERB}
          </Button>
        </div>
      </Panel>
      <Panel heading={CODEX_NAME} aside={`${codices} ${CURRENCY.codices.plural.toLowerCase()}`}>
        <p className={`small ${s.muted}`}>
          {codexOpen
            ? `${codexRuns} rebound so far · one rebind starts the whole epoch over`
            : "Opens once the archive has bound 250 Seals."}
        </p>
        <div className={s.row}>
          <span className="body-strong">
            +{fmt(codexGain).text} {CURRENCY.codices.plural.toLowerCase()}
          </span>
          <Button
            variant="secondary"
            disabled={!codexOpen || codexGain < 1}
            onClick={() => rebind() && sound.play("ascend")}
          >
            {CODEX_VERB}
          </Button>
        </div>
      </Panel>
    </div>
  );
}
