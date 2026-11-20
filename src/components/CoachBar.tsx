// The Coach Bar: live, interactive, non-intrusive guidance docked directly above the Vim buffer.
// Tells beginners (and players learning a newly unlocked key family) *what* the current red anomaly
// needs to become and *which* Vim keys do it cleanly, adapting live to Normal / Insert / Visual mode.
import { cx } from "watchpot/ui";
import { useGameState } from "../app/hooks";
import { KEY_GLOSS } from "../content/guide";
import { FAMILY_BY_ID, type KeyFamilyId } from "../content/vimActs";
import { type ActiveCoachTarget, useBufferStatus } from "./BufferEditor";
import s from "./CoachBar.module.css";

export interface CoachBarProps {
  className?: string;
}

/** Human-readable goal line for an anomaly so the player never has to guess a missing word. */
function goalCopy(target: ActiveCoachTarget): { verb: string; from?: string; to?: string } {
  if (target.clean === null) {
    return { verb: "Delete entire line", from: target.label === "PAW" ? "Tilde's pawprints" : "~BLIGHT~" };
  }
  if (target.kind === "broken-refrain") {
    return { verb: "Duplicate this line directly below it" };
  }
  if (target.kind === "sorted-canon") {
    return { verb: "Sort these lines alphabetically" };
  }
  if (target.kind === "register-splice") {
    return { verb: "Swap the two highlighted clauses into order" };
  }
  if (target.kind === "indent-block") {
    return { verb: "Indent the highlighted block right" };
  }
  if (target.kind === "missing-rune") {
    return { verb: "Replace", from: target.corrupt, to: target.clean };
  }
  return { verb: "Fix", from: target.corrupt, to: target.clean };
}

export function CoachBar({ className }: CoachBarProps) {
  const showCoach = useGameState((st) => st.settings.showCoach);
  const jkEscape = useGameState((st) => st.settings.jkEscape);
  const blind = useGameState((st) => st.trials.rules.includes("blindGutter"));
  const status = useBufferStatus();

  if (blind) return null;
  if (!showCoach && !status.isRite) return null;

  const target = status.activeTarget;
  const family = status.riteFamily ? FAMILY_BY_ID[status.riteFamily as KeyFamilyId] : undefined;
  const isInsert = status.mode === "insert" || status.mode === "replace";
  const goal = target ? goalCopy(target) : null;

  return (
    <section
      className={cx(s.coach, className)}
      data-rite={status.isRite ? "" : undefined}
      data-mode={status.mode}
      aria-label="Live mending coach"
    >
      {status.isRite && (
        <div className={s.riteHead}>
          <span className={s.riteTag}>INTERACTIVE LESSON</span>
          <span className={s.riteTitle}>{family ? family.name : status.folioTitle}</span>
          {status.totalAnomalies > 0 && (
            <span className={s.progress}>
              {status.resolvedCount} / {status.totalAnomalies} mended
            </span>
          )}
        </div>
      )}

      {status.isRite && family && family.keys.length > 0 && (
        <div className={s.newKeys}>
          {family.keys.slice(0, 6).map((key) => (
            <span key={key} className={s.keyDef} title={KEY_GLOSS[key] ?? family.chalkSummary}>
              <kbd className={s.kbd}>{key}</kbd>
              <span className={s.keyMeaning}>{KEY_GLOSS[key] ?? ""}</span>
            </span>
          ))}
        </div>
      )}

      {target && goal ? (
        <div className={s.targetRow}>
          <span className={s.lineBadge}>L{target.line}</span>
          <span className={s.goal}>
            <span className={s.goalVerb}>{goal.verb}</span>
            {goal.from && (
              <>
                {" "}
                <code className={s.rot}>{goal.from}</code>
              </>
            )}
            {goal.to && (
              <>
                {" "}
                <span className={s.arrow} aria-hidden="true">
                  →
                </span>{" "}
                <code className={s.clean}>{goal.to}</code>
              </>
            )}
          </span>
          <span className={s.keys}>
            {isInsert ? (
              <span className={s.insertCue}>
                INSERT mode — type the clean text, then press <kbd className={s.kbd}>Esc</kbd>
                {jkEscape && (
                  <>
                    {" "}
                    or <kbd className={s.kbd}>jk</kbd>
                  </>
                )}
              </span>
            ) : (
              <>
                <span className={s.keysLabel}>Try:</span>
                <code className={s.hintCode}>{target.optimalHint}</code>
              </>
            )}
          </span>
          {!status.isRite && status.totalAnomalies > 0 && (
            <span className={s.progress}>
              {status.resolvedCount}/{status.totalAnomalies}
            </span>
          )}
        </div>
      ) : (
        <div className={s.targetRow}>
          <span className={s.goalVerb}>Folio clear — turning to the next page…</span>
        </div>
      )}
    </section>
  );
}
