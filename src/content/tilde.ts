// Tilde, the statusline cat: her faces, her opinions, and what petting and feeding her are worth.

/** How she is holding herself. The screen picks the frames; nothing here reads a clock. */
export type TildeMood = "nap" | "alert" | "purr" | "moth" | "typing";

/**
 * Her faces, in crisp monospace. Every frame within a mood is the same number of cells wide, so the statusline does
 * not twitch as she breathes.
 */
export const TILDE_FRAMES: Record<TildeMood, readonly string[]> = {
  /** Idle: asleep on the statusline, tail over the line number. */
  nap: ["~ (=^-ω-^=) zZ", "~ (=^._.^=) zz", "~ (=^-.-^=) zZ"],
  /** Flow is high and she has noticed. */
  alert: ["~ (=^◉ω◉^=) ♪", "~ (=^@ω@^=) ♪"],
  /** Petted. She will allow this to continue for now. */
  purr: ["~ (=^◡ω◡^=) ♥", "~ (=^uωu^=) ♥"],
  /** A Margin Moth is live and she is on it. */
  moth: ["~ (=^･ω･^=)ﾉ ✦", "~ (=^･ω･^=)ﾉ ·"],
  /** You are typing. She is watching the cursor, not you. */
  typing: ["~ (=^oωo^=) ▮", "~ (=^oωo^=) ▯"],
};

/** Her small opinions, drawn in order and without repeats. Dry, fond, and faintly superior. */
export const TILDE_QUIPS: readonly string[] = [
  "I have read the entire archive. The ending is a semicolon.",
  "You type like a man being chased.",
  "The gutter is mine now. I have marked it.",
  "I am not sleeping. I am indexing.",
  "Every folio you mend, a moth dies. Mostly of boredom.",
  "Your :wq is a formality. I know you are coming back.",
  "Delete what you like. I keep the copies.",
  "The cursor blinks because it is waiting for you. We all are.",
  "Touch that mouse again and I will sit on it.",
  "I counted your errors. Twice. The third count is for accuracy.",
  "Rot is only bad editing with good marketing.",
  "You smell like warm dust and ambition.",
  "The statusline is the only honest part of this editor.",
  "I have slept through worse centuries than this one.",
  "Wax, phosphor, and a cat. That is a complete archive.",
  "Do not use the arrow keys. I am not angry, only disappointed.",
  "A macro is a habit that pays. You have habits. Only some pay.",
  "I purr at your par. Do not read into it.",
  "The moth is not a reward. It is a test, and you are failing slowly.",
  "I have eaten worse footnotes than this one. Bring me a better one.",
  "Somewhere in the archive is a line you will never fix. I have made peace with it.",
  "Your Flow is loud. I can hear it from the shelf.",
  "Every cat needs a throne. Mine is a statusline.",
  "If you prestige again, move the cushion first.",
  "You may pet me. Once. I am timing it.",
  "I have judged your last edit and I will not be taking questions.",
  "Nothing in here is broken. It is merely filed under the wrong century.",
];

/** How long a pet leaves her purring, and how long before she allows another. */
export const TILDE_PET_COOLDOWN_MS = 30_000;

/** How long a treat's approval lasts. */
export const TILDE_TREAT_BUFF_MS = 60_000;

/** Each Bond level: +10% Clarity and +10% Ink Flow, kept forever. */
export const TILDE_BOND_STEP = 0.1;

/** How many treats the next Bond level asks for; the first is always affordable. */
export function tildeTreatCost(bondLevel: number): number {
  return Math.max(1, Math.floor(1 + bondLevel * 0.6));
}
