import { newKeys, type WatchRule, watchChanges } from "watchpot/core";
import { type CueTier, createDirector, createGestures, createMarks, readingMs } from "watchpot/kit";
import { ACTS, type ActId } from "../content/vimActs";
import type { GameState } from "../game/game";
import type { GameStore } from "../game/store";

/**
 * The archive's feel: who did it (`hand`), where it landed (`marks`), what plays when (`director`), and the one
 * watcher that turns the store's changes into the archive's own events (`wireArchiveWatch`).
 *
 * The rule the page lives by: every deliberate press is answered where it happened, and a background tick is not.
 * The gesture tracker says whose change it was, the marks layer answers there, and the director rations the shows so
 * a machine's win never buries the player's. Nothing here renders: the components that draw the director's stage and
 * the mark layer mount it, in `src/app/`.
 */

/** The player's own hand: a store change inside one of these is the player's, not the machine's. */
export const hand = createGestures();

/** The marks layer's pool. A press leaves one at the point it landed; the oldest goes first past twenty. */
export const marks = createMarks({ max: 20 });

/** One thing the archive got: an Act opening, a trial returned from, a Grammar pair learned, an egg found. */
export type ArchiveShow =
  | { kind: "act-unlock"; act: ActId; numeral: string; title: string }
  | { kind: "challenge-done"; id: string; completions: number }
  | { kind: "codex-pair"; id: string }
  | { kind: "easter-egg"; id: string };

/**
 * What plays when. An Act or a trial is a stage show; a Grammar pair or an egg is a sticker that coalesces with any
 * others of its kind, so a folio full of pairs is one line and not nine.
 */
export const director = createDirector<ArchiveShow>({
  mine: () => hand.recent(),
  coalesceMs: 360,
  maxQueue: 3,
});

/** How each show is pushed: its tier, and for a `big` one how long its words need on the stage. */
const SHOWN: Record<ArchiveShow["kind"], { tier: CueTier; readMs?: number }> = {
  "act-unlock": { tier: "big", readMs: readingMs(9) },
  "challenge-done": { tier: "big", readMs: readingMs(7) },
  "codex-pair": { tier: "small" },
  "easter-egg": { tier: "small" },
};

/**
 * A state that arrived rather than happened: a load, an import or a fresh profile. Every permanent record it touches
 * goes backwards, and the run's serial restarts, so a save coming back is never read as nine Acts at once.
 */
const jumped = (next: GameState, prev: GameState): boolean =>
  next.vim.folioSerial < prev.vim.folioSerial ||
  next.vim.highestAct < prev.vim.highestAct ||
  next.vim.totalFoliosCleared < prev.vim.totalFoliosCleared ||
  next.vim.totalAnomaliesCleared < prev.vim.totalAnomaliesCleared ||
  Object.keys(prev.vim.discoveredPairs).some((id) => next.vim.discoveredPairs[id] !== true) ||
  Object.keys(prev.vim.easterEggsFound).some((id) => next.vim.easterEggsFound[id] !== true) ||
  Object.entries(prev.trials.completions).some(([id, n]) => (next.trials.completions[id] ?? 0) < n);

/** The archive's news, one rule a kind. A settled change (a load, the first two seconds) is never news. */
const RULES: WatchRule<GameState, ArchiveShow>[] = [
  // An Act opens: the Act's own numeral and title, for each Act the tier climbed through.
  (next, prev, emit, tools) => {
    if (tools.settling) return;
    for (const act of ACTS) {
      if (act.id > prev.vim.highestAct && act.id <= next.vim.highestAct) {
        emit({ kind: "act-unlock", act: act.id, numeral: act.numeral, title: act.title });
      }
    }
  },

  // A Grammar Codex pair: the first sighting of a record key, which is when it is discovered.
  (next, prev, emit, tools) => {
    if (tools.settling) return;
    for (const id of newKeys(prev.vim.discoveredPairs, next.vim.discoveredPairs)) {
      emit({ kind: "codex-pair", id });
    }
  },

  // An Easter egg: the same first-sighting rule, on the eggs.
  (next, prev, emit, tools) => {
    if (tools.settling) return;
    for (const id of newKeys(prev.vim.easterEggsFound, next.vim.easterEggsFound)) {
      emit({ kind: "easter-egg", id });
    }
  },

  // A trial returned from: a completion count that rose, with the count it rose to.
  (next, prev, emit, tools) => {
    if (tools.settling) return;
    for (const [id, completions] of Object.entries(next.trials.completions)) {
      if (completions > (prev.trials.completions[id] ?? 0)) emit({ kind: "challenge-done", id, completions });
    }
  },
];

/**
 * Watches the store and pushes the archive's shows through `director`, until the returned unsubscribe. The
 * achievements wall keeps its own toasts (`EarnedToasts`), so nothing here names them: this is the Act, the trial, the
 * pair and the egg, and nothing else.
 *
 * A load is silent twice over: the watch's own settling window swallows the boot, `jumped` starts a fresh one for an
 * import or a profile swap, and a rule that runs inside one emits nothing.
 */
export function wireArchiveWatch(store: GameStore): () => void {
  const watch = watchChanges(store, {
    rules: RULES,
    jumped,
    on: (show) => {
      const shown = SHOWN[show.kind];
      director.push({ tier: shown.tier, kind: show.kind, data: show, first: true, readMs: shown.readMs });
    },
  });
  return () => watch.stop();
}
