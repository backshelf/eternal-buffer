import { defineSettings as playerSettings } from "watchpot/core";
import type { GameRuntimeOptions } from "watchpot/react";

/**
 * The player's choices, under `settings`.
 *
 * `sound` and `motion` drive the page; the rest drive the editor. `jkEscape` is the day-one `imap jk <Esc>`,
 * `veteranMode` unlocks every keycap at once while the Acts are still earned, and `arrowShame` decides what an
 * arrow key does once the training wheels rust off ("shame" still moves, "block" refuses, "off" forgives).
 */
export interface Settings {
  sound: boolean;
  motion: GameRuntimeOptions["motion"];
  /** Leave Insert with `jk`, the way the muscle memory already does. */
  jkEscape: boolean;
  /** Skip the keycap locks: for a player who already knows Vim. */
  veteranMode: boolean;
  /** What the arrow keys do after they rust. */
  arrowShame: "shame" | "block" | "off";
  /** Show the Chalkboard under the buffer. */
  showChalkboard: boolean;
  /** Number the lines relative to the cursor. */
  relativeNumbers: boolean;
  /** Show any line numbers at all. */
  showLineNumbers: boolean;
  /** Which vellum the page is printed on. */
  tintPreset: "amber" | "jade" | "paper" | "midnight";
  /** Draw the touch keypad under the editor, for a phone. */
  touchKeypad: boolean;
  /** Whether the player has dismissed the opening desk arrival plate. */
  welcomed: boolean;
  /** Show the live Target Coach strip above the buffer. */
  showCoach: boolean;
}

/**
 * The settings, under `settings`: kept through a prestige, changed with `change(patch)`. A save from before them
 * loads with these defaults (the loader fills a missing key), so they need no migration.
 */
export const settings = playerSettings({
  key: "settings",
  initial: (): Settings => ({
    sound: true,
    motion: "system",
    jkEscape: false,
    veteranMode: false,
    arrowShame: "shame",
    showChalkboard: true,
    relativeNumbers: false,
    showLineNumbers: true,
    tintPreset: "amber",
    touchKeypad: false,
    welcomed: false,
    showCoach: true,
  }),
});
