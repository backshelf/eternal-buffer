// The Chalkboard: the interactive keycap strip under the buffer. Shows every key you own,
// depresses whichever cap you just pressed, explains any cap on hover/focus in plain English,
// and carries the archive's whisper line.
import { cx } from "watchpot/ui";
import { useGameState } from "../app/hooks";
import { KEY_GLOSS, visibleAct1Keys } from "../content/guide";
import { ACTS, type ActDef, FAMILY_BY_ID, KEY_FAMILIES, type KeyFamilyId } from "../content/vimActs";
import { Tooltip } from "../ui/Tooltip";
import { useBufferStatus } from "./BufferEditor";
import s from "./Chalkboard.module.css";

/** A family with many keys (`text-objects` has ten) shows its first few and counts the rest. */
const CAPS_PER_FAMILY = 6;

export interface ChalkboardProps {
  /** A class of the screen's, for the row this sits in. */
  className?: string;
  /** Drop the Act titles and the family names: the strip on a phone, or in a narrow rail. */
  compact?: boolean;
}

/** One Act's row of keycaps, each with a plain-English hover tooltip. */
function ActStrip({
  act,
  owned,
  lastKey,
  compact,
  act1Keys,
}: {
  act: ActDef;
  owned: (id: KeyFamilyId) => boolean;
  lastKey: string | null;
  compact: boolean;
  act1Keys: readonly string[];
}) {
  if (act.id === 1) {
    return (
      <div className={s.act}>
        <span className={s.actLabel}>
          <span className={s.actNumeral}>{act.numeral}</span>
          {compact ? null : <span className={s.actTitle}>{act.title}</span>}
        </span>
        <ul className={s.families}>
          <li className={s.family}>
            {act1Keys.map((key) => {
              const gloss = KEY_GLOSS[key] ?? "Core Vim key";
              return (
                <Tooltip key={`act1-${key}`} content={`${key} — ${gloss}`} side="top">
                  <span className={s.cap} data-pressed={key === lastKey || null}>
                    {key}
                  </span>
                </Tooltip>
              );
            })}
          </li>
        </ul>
      </div>
    );
  }
  const families = KEY_FAMILIES.filter((family) => family.act === act.id && owned(family.id));
  return (
    <div className={s.act}>
      <span className={s.actLabel}>
        <span className={s.actNumeral}>{act.numeral}</span>
        {compact ? null : <span className={s.actTitle}>{act.title}</span>}
      </span>
      <ul className={s.families}>
        {families.map((family) => {
          const extra = family.keys.length - CAPS_PER_FAMILY;
          const sameAsAct = family.name.toLowerCase() === act.title.toLowerCase();
          return (
            <li key={family.id} className={s.family}>
              {compact || sameAsAct ? null : <span className={s.familyName}>{family.name}</span>}
              {family.keys.slice(0, CAPS_PER_FAMILY).map((key) => {
                const gloss = KEY_GLOSS[key] ?? family.chalkSummary;
                return (
                  <Tooltip key={`${family.id}-${key}`} content={`${key} — ${gloss}`} side="top">
                    <span className={s.cap} data-pressed={key === lastKey || null}>
                      {key}
                    </span>
                  </Tooltip>
                );
              })}
              {extra > 0 && <span className={s.more}>+{extra}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * The keycap strip. Reads the buffer's published status for the pressed cap and the whisper, and the
 * store for what you own and which Act I keys have been interactively introduced so far.
 */
export function Chalkboard({ className, compact = false }: ChalkboardProps) {
  const status = useBufferStatus();
  const unlocked = useGameState((state) => state.vim.unlockedFamilies);
  const onboardingStep = useGameState((state) => state.vim.onboardingStep);
  const totalFolios = useGameState((state) => state.vim.totalFoliosCleared);
  const pendingRite = useGameState((state) => state.vim.pendingRiteFamily);
  const veteranMode = useGameState((state) => state.settings.veteranMode);
  const jkEscape = useGameState((state) => state.settings.jkEscape);
  const show = useGameState((state) => state.settings.showChalkboard);

  if (!show) return null;

  const owned = (id: KeyFamilyId) => unlocked[id] === true || FAMILY_BY_ID[id].cost.amount === 0;
  const act1Keys = visibleAct1Keys(onboardingStep, veteranMode, jkEscape);
  const started = ACTS.filter((act) =>
    KEY_FAMILIES.some((family) => family.act === act.id && owned(family.id)),
  );
  const sealed =
    totalFolios >= 3 || veteranMode
      ? ACTS.find((act) => started.every((open) => open.id !== act.id))
      : undefined;
  const sealedFamily = sealed ? KEY_FAMILIES.find((family) => family.act === sealed.id) : undefined;
  const owed = pendingRite ? FAMILY_BY_ID[pendingRite as KeyFamilyId] : undefined;

  return (
    <figure className={cx(s.board, className)} aria-label="Chalkboard">
      <div className={s.acts}>
        {started.map((act) => (
          <ActStrip
            key={act.id}
            act={act}
            owned={owned}
            lastKey={status.lastKey}
            compact={compact}
            act1Keys={act1Keys}
          />
        ))}
        {sealed && sealedFamily && (
          <Tooltip
            content={`Next Act: ${sealed.title} — unlock ${sealedFamily.name} in the Codex (:codex)`}
            side="top"
          >
            <div className={s.act} data-sealed="">
              <span className={s.actLabel}>
                <span className={s.actNumeral}>{sealed.numeral}</span>
                {compact ? null : <span className={s.actTitle}>next</span>}
              </span>
              <span className={s.teaser}>
                <span className={s.cap} data-locked="">
                  ?
                </span>
                {sealedFamily.name}
              </span>
            </div>
          </Tooltip>
        )}
      </div>
      {owed && !status.isRite && (
        <p className={s.nextRite}>
          Next interactive lesson · <span className={s.nextRiteFamily}>{owed.name}</span> —{" "}
          {owed.chalkSummary}
        </p>
      )}
      <p
        className={s.whisper}
        data-kind={status.whisper ? status.whisperKind : "idle"}
        data-whisper={status.press}
      >
        {status.whisper ??
          (onboardingStep < 3 && !veteranMode
            ? "Hover any keycap to see what it does · new keys appear as you reach each step"
            : started.length <= 1
              ? "Hover any keycap for its action · ? whispers a hint · : opens the command console"
              : "Hover any keycap for its action · ? whispers a hint · :codex / :exp / :mosaic / :help")}
      </p>
    </figure>
  );
}
