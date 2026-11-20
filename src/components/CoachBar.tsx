// The Coach Bar: live, reactive, keystroke-by-keystroke interactive guidance docked flush above the Vim buffer.
// During Act I's interactive onboarding (Folios 0-2), it tracks the exact cursor position, mode, and line text
// to light up the single next keycap to press — teaching by doing, never by lecturing.
import { cx } from "watchpot/ui";
import { useGameState } from "../app/hooks";
import { FIRST_LESSON_FOLIO, FOLIO_1_APPEND_LESSON, FOLIO_2_EDGE_LESSON } from "../content/guide";
import { FAMILY_BY_ID, type KeyFamilyId } from "../content/vimActs";
import { type ActiveCoachTarget, type BufferStatus, useBufferStatus } from "./BufferEditor";
import s from "./CoachBar.module.css";

export interface CoachBarProps {
  className?: string;
}

interface LiveStep {
  key: string;
  action: string;
  sub?: string;
  tone?: "normal" | "insert" | "unlock";
}

/** Computes the exact reactive next keypress for Act I's interactive onboarding beats. */
function reactiveStepFor(
  status: BufferStatus,
  target: ActiveCoachTarget,
  onboardingStep: number,
  jkEscape: boolean,
): LiveStep | null {
  const isInsert = status.mode === "insert" || status.mode === "replace";
  const escLabel = jkEscape ? "Esc / jk" : "Esc";

  // Helper: guide cursor to a specific 1-based (line, col).
  const walkTo = (goalLine: number, goalCol: number, label: string): LiveStep | null => {
    if (status.line < goalLine) {
      const diff = goalLine - status.line;
      return {
        key: "j",
        action: `Press j to move down to line ${goalLine}`,
        sub: diff > 1 ? `${diff} lines down` : "h left · j down · k up · l right",
      };
    }
    if (status.line > goalLine) {
      return { key: "k", action: `Press k to move up to line ${goalLine}` };
    }
    if (status.col < goalCol) {
      const diff = goalCol - status.col;
      return {
        key: "l",
        action: `Press l to step right onto ${label}`,
        sub: `${diff} ${diff === 1 ? "step" : "steps"} right`,
      };
    }
    if (status.col > goalCol) {
      const diff = status.col - goalCol;
      return {
        key: "h",
        action: `Press h to step left onto ${label}`,
        sub: `${diff} ${diff === 1 ? "step" : "steps"} left`,
      };
    }
    return null;
  };

  // --- Folio 0: hjkl -> x -> i + type + Esc ---
  if (status.folioTitle === FIRST_LESSON_FOLIO.title) {
    if (target.id === "folio-0-first-lesson:0") {
      if (isInsert) return { key: escLabel, action: "Press Esc to return to Normal mode", tone: "insert" };
      const rotIdx = target.lineText.indexOf("Ø");
      const goalCol = rotIdx >= 0 ? rotIdx + 1 : target.col;
      const move = walkTo(target.line, goalCol, "Ø");
      if (move) return move;
      return {
        key: "x",
        action: "x unlocked! Press x to delete Ø and rescue your first Glyphs",
        tone: "unlock",
      };
    }
    if (target.id === "folio-0-first-lesson:1") {
      const hasBracket =
        target.lineText.includes("[") || target.lineText.includes("_") || target.lineText.includes("]");
      if (isInsert) {
        if (target.lineText.includes("cat")) {
          return { key: escLabel, action: "Nice! Press Esc to leave Insert mode", tone: "insert" };
        }
        return {
          key: "cat",
          action: "INSERT mode — type cat, then press Esc",
          sub: "You can type normally while the border is jade",
          tone: "insert",
        };
      }
      if (hasBracket) {
        const firstIdx = Math.min(
          ...[
            target.lineText.indexOf("["),
            target.lineText.indexOf("_"),
            target.lineText.indexOf("]"),
          ].filter((i) => i >= 0),
        );
        const move = walkTo(target.line, firstIdx + 1, "the red [_]");
        if (move) return move;
        const left = [
          target.lineText.includes("["),
          target.lineText.includes("_"),
          target.lineText.includes("]"),
        ].filter(Boolean).length;
        return {
          key: "x",
          action: `Press x to cut the red bracket (${left} ${left === 1 ? "char" : "chars"} left)`,
        };
      }
      if (onboardingStep >= 2) {
        return {
          key: "i",
          action: "i unlocked! Press i to enter Insert mode and type cat",
          tone: "unlock",
        };
      }
      return { key: "i", action: "Press i to enter Insert mode, type cat, then Esc", tone: "unlock" };
    }
    if (target.id === "folio-0-first-lesson:2") {
      if (isInsert) {
        return {
          key: "d → Esc",
          action: "INSERT mode — type d (to make cedar), then press Esc",
          tone: "insert",
        };
      }
      const hashIdx = target.lineText.indexOf("#");
      if (hashIdx >= 0) {
        const move = walkTo(target.line, hashIdx + 1, "#");
        if (move) return move;
        return { key: "x", action: "Press x to cut #" };
      }
      return { key: "i", action: "Press i, type d to complete cedar, then Esc" };
    }
  }

  // --- Folio 1: a (append after cursor) & u (undo) ---
  if (status.folioTitle === FOLIO_1_APPEND_LESSON.title && target.id === "folio-1-append-lesson:0") {
    if (isInsert) {
      return {
        key: "p → Esc",
        action: "INSERT mode — type p (to make lamp), then press Esc",
        tone: "insert",
      };
    }
    const mIdx = target.lineText.indexOf("lam");
    const goalCol = mIdx >= 0 ? mIdx + 3 : target.col + 2; // land on 'm'
    const move = walkTo(target.line, goalCol, "m in lam");
    if (move) return move;
    return {
      key: "a",
      action: "Press a to insert AFTER m, type p, then Esc",
      sub: "a = append after cursor · u = undo anytime",
      tone: "unlock",
    };
  }

  // --- Folio 2: I (start of line) & A (end of line) ---
  if (status.folioTitle === FOLIO_2_EDGE_LESSON.title) {
    if (target.id === "folio-2-edge-lesson:0") {
      if (isInsert) {
        return { key: "A  → Esc", action: 'INSERT mode — type "A " at the start, then Esc', tone: "insert" };
      }
      if (status.line !== target.line) {
        return {
          key: status.line < target.line ? "j" : "k",
          action: `Move to line ${target.line} (any column works!)`,
        };
      }
      return {
        key: "I",
        action: 'Press Shift+i (I) to jump to line start, type "A ", then Esc',
        tone: "unlock",
      };
    }
    if (target.id === "folio-2-edge-lesson:1") {
      if (isInsert) {
        return { key: "w. → Esc", action: 'INSERT mode — type "w." at the end, then Esc', tone: "insert" };
      }
      if (status.line !== target.line) {
        return {
          key: status.line < target.line ? "j" : "k",
          action: `Move to line ${target.line} (any column works!)`,
        };
      }
      return {
        key: "A",
        action: 'Press Shift+a (A) to jump to line end, type "w.", then Esc',
        tone: "unlock",
      };
    }
  }

  return null;
}

/** Human-readable goal line for an anomaly so the player never has to guess a missing word. */
function goalCopy(target: ActiveCoachTarget): { verb: string; from?: string; to?: string } {
  if (target.clean === null) {
    return { verb: "Delete line", from: target.label === "PAW" ? "Tilde's pawprints" : "~BLIGHT~" };
  }
  if (target.kind === "broken-refrain") return { verb: "Duplicate this line directly below it" };
  if (target.kind === "sorted-canon") return { verb: "Sort these lines alphabetically" };
  if (target.kind === "register-splice") return { verb: "Swap the two highlighted lines into order" };
  if (target.kind === "indent-block") return { verb: "Align the indented line left" };
  if (target.kind === "missing-rune") return { verb: "Replace", from: target.corrupt, to: target.clean };
  return { verb: "Fix", from: target.corrupt, to: target.clean };
}

export function CoachBar({ className }: CoachBarProps) {
  const showCoach = useGameState((st) => st.settings.showCoach);
  const jkEscape = useGameState((st) => st.settings.jkEscape);
  const veteran = useGameState((st) => st.settings.veteranMode);
  const onboardingStep = useGameState((st) => st.vim.onboardingStep);
  const blind = useGameState((st) => st.trials.rules.includes("blindGutter"));
  const status = useBufferStatus();

  if (blind) return null;
  if (!showCoach && !status.isRite) return null;

  const target = status.activeTarget;
  const family = status.riteFamily ? FAMILY_BY_ID[status.riteFamily as KeyFamilyId] : undefined;
  const isInsert = status.mode === "insert" || status.mode === "replace";
  const goal = target ? goalCopy(target) : null;
  const liveStep = !veteran && target ? reactiveStepFor(status, target, onboardingStep, jkEscape) : null;

  return (
    <section
      className={cx(s.coach, className)}
      data-rite={status.isRite ? "" : undefined}
      data-mode={status.mode}
      data-tone={liveStep?.tone ?? (isInsert ? "insert" : "normal")}
      aria-label="Live mending coach"
    >
      {liveStep ? (
        <div className={s.liveBeat}>
          <kbd className={s.activeKey}>{liveStep.key}</kbd>
          <div className={s.liveText}>
            <span className={s.liveAction}>{liveStep.action}</span>
            {liveStep.sub && <span className={s.liveSub}>{liveStep.sub}</span>}
          </div>
          {status.totalAnomalies > 0 && (
            <span className={s.progress}>
              {status.resolvedCount}/{status.totalAnomalies}
            </span>
          )}
        </div>
      ) : (
        <>
          {status.isRite && (
            <div className={s.riteHead}>
              <span className={s.riteTag}>LESSON</span>
              <span className={s.riteTitle}>{family ? family.name : status.folioTitle}</span>
              {status.riteBanner && <span className={s.riteNote}>{status.riteBanner}</span>}
              {status.totalAnomalies > 0 && (
                <span className={s.progress}>
                  {status.resolvedCount}/{status.totalAnomalies}
                </span>
              )}
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
                    INSERT — type clean text, then <kbd className={s.kbd}>Esc</kbd>
                    {jkEscape && (
                      <>
                        {" "}
                        or <kbd className={s.kbd}>jk</kbd>
                      </>
                    )}
                  </span>
                ) : (
                  <>
                    <span className={s.keysLabel}>Try</span>
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
        </>
      )}
    </section>
  );
}
