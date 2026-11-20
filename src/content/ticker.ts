import { fmtPlayed } from "watchpot/core";

/**
 * What the statusline whispers, one pool per Act. Act I is a stub candle and a page that will not sit still; by Act
 * VII the console answers back. A screen picks a line from the pool of the Act the player has reached.
 */
export const TICKER_LINES: Record<number, readonly string[]> = {
  1: [
    "The candle is a stub, and the manuscript still glitches.",
    "Rot in the gutter. Walk to it. Strike it out.",
    "hjkl: four directions, no mouse, no mercy.",
    "Insert the missing rune, then jk before the page notices.",
    "Tilde has claimed the statusline. She has already slept on it.",
    "One page at a time. The archive is not going anywhere.",
  ],
  2: [
    "Stride by words; the line is longer than your patience.",
    "f, then ; — one keystroke to a margin nobody could reach.",
    "gg for the summit, G for the abyss, and meet yourself in the middle.",
    "Counts turn patience into arithmetic.",
    "The gutter hums a semicolon at you. Ignore it.",
    "Every snipe you miss teaches the next one.",
  ],
  3: [
    "Delete is a sentence. Change is a verb. Yank is a promise.",
    "dd takes a whole rotten line and asks for nothing in return.",
    "A Seal in the drawer, a fresh act in the ledger.",
    "The Scribes brew ink below you; you carve signal above.",
    "Bind Volume when the lamp burns low, not when the page is empty.",
    "Composition is what happens when the keys stop being letters.",
  ],
  4: [
    "Quote, bracket, word: reach inside and pull the rot out whole.",
    "Ctrl-v walks a table column like a knife through wax.",
    "% jumps the brace, and the block remembers how to balance.",
    "Visual mode is not a smudge. It is a decision you can see.",
    "The margins dither where you cut cleanly.",
    "Tilde watches the block cursor blink and forgives it.",
  ],
  5: [
    "/rot, then n, then n: the lantern walks you to every curse.",
    "A mark set at dusk is a promise kept at three in the morning.",
    ":%s cleans all five sigils in one held breath.",
    "Search is memory. Substitute is correction. Both are surgical.",
    "The night's second act begins when the lamp finds the rot.",
    "Everything scattered wants to be one word again.",
  ],
  6: [
    "The dot repeats what you did well, and what you did badly.",
    "q, then a letter, then a small dance; @ plays it back.",
    "Six identical lines: mend one, echo it five times.",
    "Echo stacks shimmer like heat over the phonograph.",
    "Codices in the drawer, the rebind behind you, the page still going.",
    "A macro is just a habit with a name and a register.",
  ],
  7: [
    ":g/BLIGHT/d and the whole blighted rank falls in one order.",
    ":sort makes the ledger honest whether it wanted to be or not.",
    "Two splits, one Flow, twin cursors breathing together.",
    "Your .vimrc is a small theology, written one line at a time.",
    "The console is not a menu. It is the archive's ear.",
    "Every act ends in margin. There is always more margin.",
  ],
};

/**
 * The journal entry waiting on the desk after time away. `glyphs` and `ink` arrive already formatted by the caller,
 * because the game's notation lives in one place and this line only has to read well.
 */
export function awaySummaryLine(awayMs: number, glyphs: string, ink: string): string {
  const ms = Number.isFinite(awayMs) ? Math.max(0, awayMs) : 0;
  const away = fmtPlayed(ms);
  if (ms < 10_000) {
    return `Back before the wick caught. ${glyphs} Glyphs and ${ink} Ink waited in the tray.`;
  }
  if (ms < 90_000) {
    return `Away ${away}: barely long enough for Tilde to resettle. The Scribes set aside ${glyphs} Glyphs and ${ink} Ink.`;
  }
  if (ms < 20 * 60_000) {
    return `Away ${away}. The margin cooled, the moth came back twice, and ${glyphs} Glyphs and ${ink} Ink were laid out for your return.`;
  }
  if (ms < 2 * 3_600_000) {
    return `Away ${away}. Half a shelf went quiet while the Scribes kept their pens moving: ${glyphs} Glyphs and ${ink} Ink in the tray.`;
  }
  if (ms < 8 * 3_600_000) {
    return `Away ${away}. The lamp burned through an evening without you, Tilde slept through all of it, and ${glyphs} Glyphs and ${ink} Ink accrued unanswered.`;
  }
  return `Away ${away}. A whole night of margin passed: dust in the gutter, pawprints on the lower line, and ${glyphs} Glyphs and ${ink} Ink still keeping the watch.`;
}
