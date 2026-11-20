// The Chalkboard: the keycap strip under the buffer. It shows what you own, what is still sealed, which cap
// you just pressed, the Practice Rite you are in, and the whisper the archive is willing to give you.
import { cx } from "watchpot/ui";
import { useGameState } from "../app/hooks";
import { ACTS, type ActDef, FAMILY_BY_ID, KEY_FAMILIES, type KeyFamilyId } from "../content/vimActs";
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

/** One Act's row of keycaps, as the Chalkboard draws it. */
function ActStrip({
  act,
  owned,
  lastKey,
  compact,
}: {
  act: ActDef;
  owned: (id: KeyFamilyId) => boolean;
  lastKey: string | null;
  compact: boolean;
}) {
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
              {family.keys.slice(0, CAPS_PER_FAMILY).map((key) => (
                <span key={`${family.id}-${key}`} className={s.cap} data-pressed={key === lastKey || null}>
                  {key}
                </span>
              ))}
              {extra > 0 && <span className={s.more}>+{extra}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * The keycap strip. It reads the buffer's published status for the pressed cap and the whisper, and the
 * store for what you own, so the screen mounts it with no props at all.
 */
export function Chalkboard({ className, compact = false }: ChalkboardProps) {
  const status = useBufferStatus();
  const unlocked = useGameState((state) => state.vim.unlockedFamilies);
  const pendingRite = useGameState((state) => state.vim.pendingRiteFamily);
  const show = useGameState((state) => state.settings.showChalkboard);

  if (!show) return null;

  // The two families every archivist is handed at the door are free, so they read as owned from minute one.
  const owned = (id: KeyFamilyId) => unlocked[id] === true || FAMILY_BY_ID[id].cost.amount === 0;
  const started = ACTS.filter((act) =>
    KEY_FAMILIES.some((family) => family.act === act.id && owned(family.id)),
  );
  const sealed = ACTS.find((act) => started.every((open) => open.id !== act.id));
  const sealedFamily = sealed ? KEY_FAMILIES.find((family) => family.act === sealed.id) : undefined;
  const owed = pendingRite ? FAMILY_BY_ID[pendingRite as KeyFamilyId] : undefined;

  return (
    <figure className={cx(s.board, className)} aria-label="Chalkboard">
      {status.riteBanner !== null && (
        <figcaption className={s.ribbon}>
          <span className={s.ribbonMark}>PRACTICE RITE</span> {status.riteBanner}
        </figcaption>
      )}
      <div className={s.acts}>
        {started.map((act) => (
          <ActStrip key={act.id} act={act} owned={owned} lastKey={status.lastKey} compact={compact} />
        ))}
        {sealed && sealedFamily && (
          <div className={s.act} data-sealed="">
            <span className={s.actLabel}>
              <span className={s.actNumeral}>{sealed.numeral}</span>
              {compact ? null : <span className={s.actTitle}>sealed</span>}
            </span>
            <span className={s.teaser}>
              <span className={s.cap} data-locked="">
                ?
              </span>
              {sealedFamily.name}
            </span>
          </div>
        )}
      </div>
      {owed && (
        <p className={s.nextRite}>
          Next rite · <span className={s.nextRiteFamily}>{owed.name}</span> — {owed.chalkSummary}
        </p>
      )}
      <p
        className={s.whisper}
        data-kind={status.whisper ? status.whisperKind : "idle"}
        data-whisper={status.press}
      >
        {status.whisper ??
          (started.length <= 1
            ? "Move to red rot with h j k l · x cuts a char · i enters Insert (jk or Esc exits) · ? whispers a hint"
            : "Press ? in Normal mode for a whisper · : for the Ex console")}
      </p>
    </figure>
  );
}
