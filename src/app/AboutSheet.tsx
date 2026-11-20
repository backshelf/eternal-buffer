import { type ReactNode, useId, useState } from "react";
import { ACTS, FAMILY_BY_ID, KEY_FAMILIES, type KeyFamilyId } from "../content/vimActs";
import { NAME, PREMISE } from "../content/words";
import { Button } from "../ui/Button";
import { ConfirmButton, Sheet } from "../ui/Sheet";
import s from "./app.module.css";
import { useGameState, useGameStore } from "./hooks";

/** The three things an arrow key may do once the training wheels rust off, in the sheet's words. */
const ARROWS = [
  { value: "shame", label: "Shame" },
  { value: "block", label: "Block" },
  { value: "off", label: "Off" },
] as const;

/** A titled group of settings: a heading, then its controls. */
function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={s.group} aria-label={title}>
      <h3 className={s.groupTitle}>{title}</h3>
      {children}
    </section>
  );
}

/** Props of `AboutSheet`: the close, and the way on to the Vim reference. */
export interface AboutSheetProps {
  onClose(): void;
  /** Switches this sheet for the Vim reference. */
  onHelp(): void;
}

/**
 * The about sheet, which holds the settings: the premise; sound and motion; the editor's own switches; the save as
 * text, out and in; and starting over (two presses, so it is never an accident). The sheet is a true modal: Escape
 * closes it, Tab stays inside, and focus goes back to what opened it.
 */
export function AboutSheet({ onClose, onHelp }: AboutSheetProps) {
  const store = useGameStore();
  const set = useGameState((st) => st.settings);
  const [text, setText] = useState("");
  const [said, setSaid] = useState("");
  const boxId = useId();

  const { change } = store.getState().settings;
  const copySave = async () => {
    let save: string;
    try {
      save = store.getState().exportProfile();
    } catch {
      setSaid("The save is not ready yet. Try again in a moment.");
      return;
    }
    setText(save);
    try {
      await navigator.clipboard.writeText(save);
      setSaid("Save copied.");
    } catch {
      setSaid("The clipboard said no. The save is in the box: copy it from there.");
    }
  };
  const readSave = () => {
    try {
      store.getState().importProfile(text.trim());
      setSaid("Save loaded.");
    } catch {
      setSaid("That save could not be read. Nothing changed.");
    }
  };
  const startOver = () => {
    store.getState().resetProfile();
    onClose();
  };

  return (
    <Sheet
      title={`About ${NAME}`}
      description={PREMISE}
      onClose={onClose}
      actions={
        <>
          <ConfirmButton onConfirm={startOver}>
            {(armed) => (armed ? "Press again to start over" : "Start over")}
          </ConfirmButton>
          <Button onClick={onHelp}>Vim reference</Button>
          <Button variant="primary" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      <Group title="The desk">
        <label className={s.toggle}>
          <input
            type="checkbox"
            checked={set.sound}
            onChange={(e) => change({ sound: e.currentTarget.checked })}
          />
          <span>Sound</span>
        </label>
        <label className={s.toggle}>
          <input
            type="checkbox"
            checked={set.motion === "reduced"}
            onChange={(e) => change({ motion: e.currentTarget.checked ? "reduced" : "system" })}
          />
          <span>Still the motion</span>
        </label>
      </Group>

      <Group title="The editor">
        <label className={s.toggle}>
          <input
            type="checkbox"
            checked={set.jkEscape}
            onChange={(e) => change({ jkEscape: e.currentTarget.checked })}
          />
          <span>
            <code className={s.code}>jk</code> leaves Insert mode
          </span>
        </label>
        <label className={s.toggle}>
          <input
            type="checkbox"
            checked={set.veteranMode}
            onChange={(e) => change({ veteranMode: e.currentTarget.checked })}
          />
          <span>Veteran mode: every Vim key from the first folio</span>
        </label>
        <fieldset className={s.fieldset}>
          <legend className={s.label}>Arrow keys, once they rust</legend>
          {ARROWS.map((arrow) => (
            <label key={arrow.value} className={s.radio}>
              <input
                type="radio"
                name="arrowShame"
                value={arrow.value}
                checked={set.arrowShame === arrow.value}
                onChange={() => change({ arrowShame: arrow.value })}
              />
              <span>{arrow.label}</span>
            </label>
          ))}
        </fieldset>
        <label className={s.toggle}>
          <input
            type="checkbox"
            checked={set.showChalkboard}
            onChange={(e) => change({ showChalkboard: e.currentTarget.checked })}
          />
          <span>Show the Chalkboard keycaps</span>
        </label>
        <label className={s.toggle}>
          <input
            type="checkbox"
            checked={set.showLineNumbers}
            onChange={(e) => change({ showLineNumbers: e.currentTarget.checked })}
          />
          <span>Line numbers</span>
        </label>
        <label className={s.toggle}>
          <input
            type="checkbox"
            checked={set.relativeNumbers}
            disabled={!set.showLineNumbers}
            onChange={(e) => change({ relativeNumbers: e.currentTarget.checked })}
          />
          <span>Relative line numbers</span>
        </label>
        <label className={s.toggle}>
          <input
            type="checkbox"
            checked={set.touchKeypad}
            onChange={(e) => change({ touchKeypad: e.currentTarget.checked })}
          />
          <span>Touch Vim keypad under the buffer</span>
        </label>
      </Group>

      <Group title="The save">
        <label className={s.label} htmlFor={boxId}>
          Save as text
        </label>
        <textarea
          id={boxId}
          className={s.saveBox}
          rows={3}
          spellCheck={false}
          placeholder="Paste a save here, then read it."
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
        />
        <div className={s.row}>
          <Button onClick={copySave}>Copy save</Button>
          <Button onClick={readSave} disabled={!text.trim()}>
            Read save
          </Button>
        </div>
        <p role="status" className={s.status}>
          {said}
        </p>
      </Group>
    </Sheet>
  );
}

/** One Act's keycaps, as the reference lists them. */
function ReferenceAct({
  act,
  unlocked,
}: {
  act: (typeof ACTS)[number];
  unlocked: (id: KeyFamilyId) => boolean;
}) {
  const families = KEY_FAMILIES.filter((family) => family.act === act.id && unlocked(family.id));
  if (families.length === 0) return null;
  return (
    <section className={s.refAct} aria-label={`Act ${act.numeral}: ${act.title}`}>
      <h3 className={s.refActTitle}>
        ACT {act.numeral} · {act.title.toUpperCase()}
      </h3>
      <dl className={s.refList}>
        {families.map((family) => (
          <div key={family.id} className={s.refItem}>
            <dt className={s.refName}>
              <span className={s.refKeys}>{family.keys.join(" ")}</span>
              {family.name}
            </dt>
            <dd className={s.refLine}>{family.chalkSummary}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * The Vim reference: every keycap family the archive has opened, under its Act, with the keys and the chalk line.
 * It is the same sheet the `?` button, `:help`, and the settings' Vim reference button open, so there is one place
 * the player's hands are written down.
 */
export function HelpSheet({ onClose }: { onClose(): void }) {
  const unlocked = useGameState((st) => st.vim.unlockedFamilies);
  const actTier = useGameState((st) => st.vim.highestAct);
  // The two families every archivist is handed at the door are free, so they read as owned from minute one.
  const owned = (id: KeyFamilyId) => unlocked[id] === true || FAMILY_BY_ID[id].cost.amount === 0;
  const known = KEY_FAMILIES.filter((family) => owned(family.id)).length;
  const sealed = KEY_FAMILIES.length - known;
  return (
    <Sheet
      title="Vim reference"
      description="The keys the archive has opened for you, one family at a time."
      onClose={onClose}
      actions={
        <Button variant="primary" onClick={onClose}>
          Back to the buffer
        </Button>
      }
    >
      <p className={s.refNote}>
        <code className={s.code}>?</code> in Normal mode whispers the idiom you need.{" "}
        <code className={s.code}>:help</code> opens this page. <code className={s.code}>jk</code> leaves
        Insert mode, as does <code className={s.code}>Esc</code>.
      </p>
      {ACTS.filter((act) => act.id <= actTier).map((act) => (
        <ReferenceAct key={act.id} act={act} unlocked={owned} />
      ))}
      {sealed > 0 && (
        <p className={s.refNote}>
          {sealed} {sealed === 1 ? "family is" : "families are"} still sealed. A new Act opens as the last one
          is practised, or early through the Volumes' <code className={s.code}>:w</code>.
        </p>
      )}
    </Sheet>
  );
}
