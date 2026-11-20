// In-voice arrival plate for a brand-new desk (`!welcomed` and zero edits).
// Short, tactile, Midnight Archivist voice — lets the player choose Guided (Folio 0 lesson) or Veteran.
import { useGameState, useGameStore } from "../app/hooks";
import { NAME } from "../content/words";
import { Button } from "../ui/Button";
import { FOCUS_BUFFER_EVENT } from "./BufferEditor";
import s from "./WelcomeOverlay.module.css";

export function WelcomeOverlay() {
  const store = useGameStore();
  const welcomed = useGameState((st) => st.settings.welcomed);
  const folios = useGameState((st) => st.vim.totalFoliosCleared);
  const anomalies = useGameState((st) => st.vim.totalAnomaliesCleared);

  // Returning saves with any recorded work never see the arrival plate.
  if (welcomed || folios > 0 || anomalies > 0) return null;

  const enter = (veteran: boolean) => {
    store.getState().settings.change({ welcomed: true, veteranMode: veteran });
    window.setTimeout(() => window.dispatchEvent(new Event(FOCUS_BUFFER_EVENT)), 30);
  };

  return (
    <div className={s.scrim} role="dialog" aria-modal="true" aria-labelledby="arrival-title">
      <div className={s.plate}>
        <p className={s.stamp}>00:00 · DESK 7 · MIDNIGHT SHIFT</p>
        <h1 id="arrival-title" className={s.title}>
          {NAME}
        </h1>
        <p className={s.body}>
          The manuscript is rotting in the margin. Red static bleeds across the vellum; every clean edit
          rescues Glyphs from the page.
        </p>
        <p className={s.bodyMuted}>
          A cursor is already blinking on line one. Tilde naps on the statusline and says nothing, which is
          her way of approving.
        </p>
        <div className={s.choices}>
          <button type="button" className={s.choice} data-primary="" onClick={() => enter(false)}>
            <span className={s.choiceTitle}>Sit at the desk</span>
            <span className={s.choiceSub}>
              Guided from <kbd className={s.kbd}>h</kbd> <kbd className={s.kbd}>j</kbd>{" "}
              <kbd className={s.kbd}>k</kbd> <kbd className={s.kbd}>l</kbd>, <kbd className={s.kbd}>x</kbd>,
              and <kbd className={s.kbd}>i</kbd>. Every new Vim key opens with a short hands-on lesson.
            </span>
          </button>
          <button type="button" className={s.choice} onClick={() => enter(true)}>
            <span className={s.choiceTitle}>Open every key</span>
            <span className={s.choiceSub}>
              Veteran mode — for hands that already know Vim. All bindings unlocked from line one.
            </span>
          </button>
        </div>
        <div className={s.foot}>
          <span className={s.footNote}>You can switch modes anytime in Settings or via :help.</span>
          <Button variant="ghost" onClick={() => enter(false)}>
            Enter →
          </Button>
        </div>
      </div>
    </div>
  );
}
