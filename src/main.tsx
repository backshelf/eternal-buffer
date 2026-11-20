import { useState } from "react";
import { mountGame } from "watchpot/react";
import { CrashBoundary } from "watchpot/ui";
import { App } from "./app/App";
import s from "./app/app.module.css";
import { NAME } from "./content/words";
import { createGameStore } from "./game/store";
import { Button } from "./ui/Button";
import "./tokens.css";
import "./ui/theme.css";

// The one store, built at the root; hydration from the save is synchronous.
const store = createGameStore();

/**
 * What the archive shows when a render gives up: its own words, the save as text (read once, inside a `try`, since a
 * broken store may refuse), and the two ways on, a second attempt and a reload. The boundary sits under the store's
 * provider, so the game can still be asked for its save here.
 */
function Archivist({ onRetry }: { onRetry: () => void }) {
  const [save] = useState(() => {
    try {
      return store.getState().exportProfile();
    } catch {
      return "";
    }
  });
  return (
    <div className={s.crash} role="alert">
      <p className={s.crashTitle}>{NAME}</p>
      <p className={s.crashLine}>
        The manuscript slipped a page: something in the archive stopped mid-render. Every Glyph is still saved
        — copy the text below if you want to keep it — and the desk can be reopened.
      </p>
      <label className={s.crashLine} htmlFor="crash-save">
        The save, as text
      </label>
      <textarea
        id="crash-save"
        className={s.crashSave}
        rows={5}
        readOnly
        spellCheck={false}
        value={save === "" ? "The save could not be read." : save}
        onFocus={(event) => event.currentTarget.select()}
      />
      <div>
        <Button variant="primary" onClick={onRetry}>
          Try the page again
        </Button>{" "}
        <Button onClick={() => location.reload()}>Reload</Button>
      </div>
    </div>
  );
}

mountGame(
  store,
  <CrashBoundary
    fallback={({ retry }) => <Archivist onRetry={retry} />}
    onCrash={(error) => console.error("the archive:", error)}
  >
    <App />
  </CrashBoundary>,
);
