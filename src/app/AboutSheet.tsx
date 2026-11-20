import { type ReactNode, useId, useState } from "react";
import { Tabs } from "watchpot/ui";
import { ARCHIVE_GLOSSARY, EX_NAV_COMMANDS, KEY_GLOSS, visibleAct1Keys } from "../content/guide";
import { ACTS, FAMILY_BY_ID, KEY_FAMILIES, type KeyFamilyId } from "../content/vimActs";
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
 * The Settings sheet (`:set` configuration): clean, zero boilerplate prose. Controls sound, motion,
 * editor behaviour, live Coach bar, save export/import, and profile reset.
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
      title=":set · Desk Settings"
      onClose={onClose}
      actions={
        <>
          <ConfirmButton onConfirm={startOver}>
            {(armed) => (armed ? "Press again to wipe save" : "Reset save")}
          </ConfirmButton>
          <Button onClick={onHelp}>? Help &amp; Glossary</Button>
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </>
      }
    >
      <Group title="Desk &amp; Audio">
        <label className={s.toggle}>
          <input
            type="checkbox"
            checked={set.sound}
            onChange={(e) => change({ sound: e.currentTarget.checked })}
          />
          <span>Mechanical key &amp; chime audio</span>
        </label>
        <label className={s.toggle}>
          <input
            type="checkbox"
            checked={set.motion === "reduced"}
            onChange={(e) => change({ motion: e.currentTarget.checked ? "reduced" : "system" })}
          />
          <span>Reduced motion (freeze shaders &amp; animations)</span>
        </label>
      </Group>

      <Group title="Editor &amp; Teaching">
        <label className={s.toggle}>
          <input
            type="checkbox"
            checked={set.showCoach}
            onChange={(e) => change({ showCoach: e.currentTarget.checked })}
          />
          <span>Show live Target Coach bar above buffer</span>
        </label>
        <label className={s.toggle}>
          <input
            type="checkbox"
            checked={set.showChalkboard}
            onChange={(e) => change({ showChalkboard: e.currentTarget.checked })}
          />
          <span>Show Chalkboard keycap strip</span>
        </label>
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
          <span>Veteran mode (all Vim keys unlocked from line one)</span>
        </label>
        <fieldset className={s.fieldset}>
          <legend className={s.label}>Arrow keys after training</legend>
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
          <span>Relative line numbers (:set rnu)</span>
        </label>
        <label className={s.toggle}>
          <input
            type="checkbox"
            checked={set.touchKeypad}
            onChange={(e) => change({ touchKeypad: e.currentTarget.checked })}
          />
          <span>Touch Vim keypad under buffer</span>
        </label>
      </Group>

      <Group title="Save Transfer">
        <label className={s.label} htmlFor={boxId}>
          Save string
        </label>
        <textarea
          id={boxId}
          className={s.saveBox}
          rows={3}
          spellCheck={false}
          placeholder="Paste an exported save string here, then click Load."
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
        />
        <div className={s.row}>
          <Button onClick={copySave}>Copy save</Button>
          <Button onClick={readSave} disabled={!text.trim()}>
            Load save
          </Button>
        </div>
        <p role="status" className={s.status}>
          {said}
        </p>
      </Group>
    </Sheet>
  );
}

/** One Act's keycaps, with plain-English key-by-key definitions. */
function ReferenceAct({
  act,
  unlocked,
  jkEscape,
  onboardingStep,
  veteranMode,
}: {
  act: (typeof ACTS)[number];
  unlocked: (id: KeyFamilyId) => boolean;
  jkEscape: boolean;
  onboardingStep: number;
  veteranMode: boolean;
}) {
  if (act.id === 1) {
    const keys = visibleAct1Keys(onboardingStep, veteranMode, jkEscape);
    return (
      <section className={s.refAct} aria-label={`Act ${act.numeral}: ${act.title}`}>
        <h3 className={s.refActTitle}>
          ACT {act.numeral} · {act.title.toUpperCase()}
        </h3>
        <div className={s.refFamilyBlock}>
          <p className={s.refName}>Core Keys</p>
          <dl className={s.helpKeyGrid}>
            {keys.map((key) => (
              <div key={key} className={s.helpKeyRow}>
                <dt className={s.helpKeyCap}>{key}</dt>
                <dd className={s.helpKeyDesc}>{KEY_GLOSS[key] ?? "Core Vim key"}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    );
  }
  const families = KEY_FAMILIES.filter((family) => family.act === act.id && unlocked(family.id));
  if (families.length === 0) return null;
  return (
    <section className={s.refAct} aria-label={`Act ${act.numeral}: ${act.title}`}>
      <h3 className={s.refActTitle}>
        ACT {act.numeral} · {act.title.toUpperCase()}
      </h3>
      {families.map((family) => (
        <div key={family.id} className={s.refFamilyBlock}>
          <p className={s.refName}>{family.name}</p>
          <dl className={s.helpKeyGrid}>
            {family.keys
              .filter((key) => key !== "jk" || jkEscape)
              .map((key) => (
                <div key={key} className={s.helpKeyRow}>
                  <dt className={s.helpKeyCap}>{key}</dt>
                  <dd className={s.helpKeyDesc}>{KEY_GLOSS[key] ?? family.chalkSummary}</dd>
                </div>
              ))}
          </dl>
        </div>
      ))}
    </section>
  );
}

/**
 * The Help sheet (`? Help` / `:help`): plain-English Vim Keys + `:ex` console commands + Archive Glossary.
 */
export function HelpSheet({ onClose }: { onClose(): void }) {
  const unlocked = useGameState((st) => st.vim.unlockedFamilies);
  const actTier = useGameState((st) => st.vim.highestAct);
  const onboardingStep = useGameState((st) => st.vim.onboardingStep);
  const veteranMode = useGameState((st) => st.settings.veteranMode);
  const jkEscape = useGameState((st) => st.settings.jkEscape);
  const owned = (id: KeyFamilyId) => unlocked[id] === true || FAMILY_BY_ID[id].cost.amount === 0;
  const known = KEY_FAMILIES.filter((family) => owned(family.id)).length;
  const sealed = KEY_FAMILIES.length - known;

  return (
    <Sheet
      title=":help · Reference & Glossary"
      onClose={onClose}
      actions={
        <Button variant="primary" onClick={onClose}>
          Back to buffer
        </Button>
      }
    >
      <Tabs.Root defaultValue="keys" activation="manual" controls="selected">
        <Tabs.List className={s.helpTabs} aria-label="Help sections">
          <Tabs.Tab value="keys" className={s.helpTab}>
            Vim Keys ({known}/{KEY_FAMILIES.length})
          </Tabs.Tab>
          <Tabs.Tab value="commands" className={s.helpTab}>
            :ex Commands
          </Tabs.Tab>
          <Tabs.Tab value="glossary" className={s.helpTab}>
            Glossary
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="keys" className={s.helpPanel}>
          <p className={s.refNote}>
            Press <code className={s.code}>?</code> in Normal mode for a hint on the current red rot.{" "}
            <code className={s.code}>Esc</code> (or <code className={s.code}>Ctrl-[</code>) exits Insert mode.
          </p>
          {ACTS.filter((act) => act.id <= actTier).map((act) => (
            <ReferenceAct
              key={act.id}
              act={act}
              unlocked={owned}
              jkEscape={jkEscape}
              onboardingStep={onboardingStep}
              veteranMode={veteranMode}
            />
          ))}
          {sealed > 0 && (
            <p className={s.refNote}>
              {sealed} {sealed === 1 ? "key family is" : "key families are"} still sealed. Unlock new families
              in the Codex (<code className={s.code}>:codex</code>) — each opens with a hands-on interactive
              lesson.
            </p>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="commands" className={s.helpPanel}>
          <p className={s.refNote}>
            Press <code className={s.code}>:</code> in Normal mode to open the console, type a command, and
            press <code className={s.code}>Enter</code>. You can also click any Room in the left wing.
          </p>
          <dl className={s.helpKeyGrid}>
            {EX_NAV_COMMANDS.map((item) => (
              <div key={item.cmd} className={s.helpKeyRow}>
                <dt className={s.helpKeyCap}>
                  {item.cmd}
                  {item.aliases ? ` (${item.aliases})` : ""}
                </dt>
                <dd className={s.helpKeyDesc}>{item.desc}</dd>
              </div>
            ))}
          </dl>
        </Tabs.Panel>

        <Tabs.Panel value="glossary" className={s.helpPanel}>
          <dl className={s.glossaryList}>
            {ARCHIVE_GLOSSARY.map((entry) => (
              <div key={entry.term} className={s.glossaryItem}>
                <dt className={s.glossaryTerm}>{entry.term}</dt>
                <dd className={s.glossaryDesc}>{entry.summary}</dd>
              </div>
            ))}
          </dl>
        </Tabs.Panel>
      </Tabs.Root>
    </Sheet>
  );
}
