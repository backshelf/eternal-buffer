// The Ex line: Vim's one row of honesty under the buffer — the mode, what you have typed of a command,
// what the console last said, and where the caret stands.
import { cx } from "watchpot/ui";
import { type BufferMode, useBufferStatus } from "./BufferEditor";
import s from "./ExLine.module.css";

/** The mode pill, in Vim's own punctuation. */
const PILL: Readonly<Record<BufferMode, string>> = {
  normal: "-- NORMAL --",
  insert: "-- INSERT --",
  visual: "-- VISUAL --",
  "visual-line": "-- VISUAL LINE --",
  "visual-block": "-- VISUAL BLOCK --",
  replace: "-- REPLACE --",
  command: "-- COMMAND --",
};

/** What the line says when nothing has happened yet. */
const RESTING = ": for the console · ? for a whisper";

export interface ExLineProps {
  /** A class of the screen's, for the row this sits in. */
  className?: string;
}

/**
 * The buffer's status line. It reads the buffer's published status, so it can be mounted anywhere beside
 * the editor and needs no props; its message is the one live region, so a screen reader hears the console
 * and not every cursor move.
 */
export function ExLine({ className }: ExLineProps) {
  const status = useBufferStatus();
  const pending = status.pending;
  return (
    <div className={cx(s.line, className)} data-mode={status.mode}>
      <span className={s.pill}>{PILL[status.mode]}</span>
      {pending !== "" && (
        <span className={s.pending} title="Keys typed so far">
          {pending}
        </span>
      )}
      {status.recording !== null && (
        <span className={s.recording}>recording @{status.recording === "" ? "…" : status.recording}</span>
      )}
      <p className={s.message} aria-live="polite">
        {status.message === "" ? <span className={s.resting}>{RESTING}</span> : status.message}
      </p>
      <span className={s.position} title={`line ${status.line}, column ${status.col}`}>
        {status.line}:{status.col}
      </span>
    </div>
  );
}
