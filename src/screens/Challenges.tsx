import { fmt } from "watchpot/core";
import { VisuallyHidden } from "watchpot/ui";
import { useGameState } from "../app/hooks";
import { playBindVolume } from "../app/sound";
import { CHALLENGES, type ChallengeContentDef } from "../content/challenges";
import { TAB_NAMES } from "../content/words";
import { trials } from "../game/challenges";
import type { GameState } from "../game/game";
import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";
import { ProgressBar } from "../ui/ProgressBar";
import { Title } from "../ui/Title";
import t from "./Challenges.module.css";
import s from "./screens.module.css";

/** What still holds a trial shut, in the archive's words. */
function lockOf(st: GameState, challenge: ChallengeContentDef): string | null {
  if (st.wallet.sealsEver.lt(challenge.minSeals)) {
    return `Opens at ${challenge.minSeals} Seals ever bound`;
  }
  if (st.wallet.codicesEver.lt(challenge.minCodices)) {
    return `Opens at ${challenge.minCodices} Codices rebound`;
  }
  return null;
}

/** The six Vim Skill Trials: the restriction, the goal, the reward, and the door in and out. */
export function ChallengesScreen() {
  const st = useGameState((x) => x);
  const active = st.trials.active === null ? null : CHALLENGES.find((c) => c.id === st.trials.active);
  const activeGoal = active?.goalGlyphs ?? 1;
  const activeDone = st.wallet.earned.gte(activeGoal) ? activeGoal : st.wallet.earned.toNumber();

  const enter = (id: string) => {
    if (st.trials.enter(id) === null) playBindVolume();
  };
  const leave = () => {
    if (st.trials.exit()) playBindVolume();
  };

  return (
    <div className={s.screen}>
      <Title>{TAB_NAMES.challenges}</Title>
      <p className={`small ${s.muted}`}>
        A trial is a run with a rule taken away and a multiplier left behind. Entering resets the run, and the
        reward stays for good however many times you bind a volume after it.
      </p>
      {active && (
        <Panel heading="Trial in progress" aside={active.name}>
          <p className={t.restriction}>{active.restrictionText}</p>
          <p className={`small ${s.muted}`}>{active.rewardText}</p>
          <ProgressBar
            value={activeDone}
            max={activeGoal}
            label="Glyphs this run"
            valueText={`${fmt(st.wallet.earned).text} / ${fmt(activeGoal).text}`}
          />
          <div className={t.foot}>
            <span className={`small ${s.muted}`}>
              Clearing the goal counts the completion and closes the run at once.
            </span>
            <Button variant="danger" onClick={leave}>
              Exit Trial
            </Button>
          </div>
        </Panel>
      )}
      <ul className={t.cards}>
        {CHALLENGES.map((challenge) => {
          const done = st.trials.completions[challenge.id] ?? 0;
          const blocked = trials.select.check(st, challenge.id);
          const underWay = st.trials.active === challenge.id;
          const lock = blocked === "locked" ? lockOf(st, challenge) : null;
          const reason =
            blocked === null
              ? "Enter when you are ready"
              : blocked === "maxed"
                ? "Every completion is in"
                : blocked === "busy"
                  ? underWay
                    ? "Under way now"
                    : "Another trial is under way"
                  : (lock ?? "Not open yet");
          const goal = challenge.goalGlyphs;
          const value = underWay ? (st.wallet.earned.gte(goal) ? goal : st.wallet.earned.toNumber()) : 0;
          return (
            <li
              key={challenge.id}
              className={t.card}
              data-state={blocked === null || underWay ? "open" : "locked"}
            >
              <div className={t.head}>
                <h3 className={t.name}>{challenge.name}</h3>
                <span className={t.pips} aria-hidden="true">
                  {Array.from({ length: challenge.maxCompletions }, (_, pip) => (
                    <span key={pip} className={t.pip} data-lit={pip < done ? "" : undefined} />
                  ))}
                </span>
                <VisuallyHidden>
                  {done} of {challenge.maxCompletions} completions
                </VisuallyHidden>
              </div>
              <p className="small">{challenge.line}</p>
              <p className={t.restriction}>{challenge.restrictionText}</p>
              <p className={`small ${t.reward}`}>{challenge.rewardText}</p>
              <ProgressBar
                value={value}
                max={goal}
                label="Glyphs this run"
                valueText={`${fmt(value).text} / ${fmt(goal).text}`}
                thin
              />
              <div className={t.foot}>
                <span className={`small ${t.reason}`}>
                  {fmt(goal).text} Glyphs in one run · {reason}
                </span>
                {underWay ? (
                  <span className={t.underWay}>Under way</span>
                ) : (
                  <Button
                    variant={blocked === null ? "primary" : "secondary"}
                    disabled={blocked !== null}
                    onClick={() => enter(challenge.id)}
                  >
                    {blocked === "maxed" ? "All done" : blocked === null ? "Enter Trial" : "Locked"}
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
