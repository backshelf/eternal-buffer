import { useCallback, useEffect, useRef, useState } from "react";
import { fmt } from "watchpot/core";
import { useReducedMotion } from "watchpot/kit";
import { useClockNow } from "watchpot/react";
import { cx, VisuallyHidden } from "watchpot/ui";
import { useGameState, useGameStore } from "../app/hooks";
import { glyphOf } from "../app/icons";
import { playTildePurr } from "../app/sound";
import { TICKER_LINES } from "../content/ticker";
import {
  TILDE_BOND_STEP,
  TILDE_COSMETICS,
  TILDE_FRAMES,
  TILDE_QUIPS,
  type TildeMood,
  tildeTreatCost,
} from "../content/tilde";
import { CURRENCY } from "../content/words";
import { VISITOR_KIND } from "../game/visitor";
import { momentState } from "../shaders/pulses";
import { Button } from "../ui/Button";
import s from "./TildeBar.module.css";

/** How long a pet leaves her purring at the player, whatever else is happening on the page. */
const PURR_MS = 3200;
/** How long a quip holds the statusline before the next one from the Act's pool. */
const QUIP_MS = 15_000;
/** How long her heart hangs over the statusline. */
const HEART_MS = 2400;
/** How long she stays pleased after a Folio closes, or after every fifth clean one. */
const CELEBRATE_MS = 2500;
/** How long she stays startled by the `:wq` Rebind. */
const STARTLE_MS = 3000;
/** Every fifth clean Folio in a row is worth being pleased about. */
const CLEAN_STREAK_STEP = 5;

/** The two moods she only holds for a moment: a mended page, or the archive rebinding under her. */
type FlashMood = "celebrate" | "startle";

/** What each mood looks like said aloud, for the cat's hidden line. */
const MOOD_WORDS: Record<TildeMood, string> = {
  nap: "asleep on the statusline",
  alert: "watching your Flow",
  purr: "purring",
  moth: "batting at the Margin Moth",
  typing: "watching the cursor",
  celebrate: "pleased with the mended folio",
  startle: "startled by the rebind",
};

/** Props of `TildeBar`: only the caller's class; everything else is on the store. */
export interface TildeBarProps {
  className?: string;
}

/**
 * Tilde's statusline: her animated ASCII frame and whatever Bond has dressed her in, her Bond, the Pet, Treat and
 * Style buttons, and a quip that alternates between her own opinions and the Act's ticker. She naps at rest, sits up
 * when Flow is middling, watches the cursor when it is high, purrs for a few seconds after a press, is briefly
 * pleased by a mended page, and is briefly startled by the `:wq` Rebind. One frame is held under reduced motion, and
 * the heart that answers a press only fades there.
 */
export function TildeBar({ className }: TildeBarProps) {
  const store = useGameStore();
  const reduced = useReducedMotion();
  const bond = useGameState((st) => st.vim.tildeBond);
  const flow = useGameState((st) => st.vim.flow);
  const flowCap = useGameState((st) => st.vim.flowCap);
  const act = useGameState((st) => st.vim.highestAct);
  const foliosCleared = useGameState((st) => st.vim.totalFoliosCleared);
  const cleanStreak = useGameState((st) => st.vim.currentCleanStreak);
  const cosmeticId = useGameState((st) => st.vim.tildeCosmetic);
  const veteran = useGameState((st) => st.settings.veteranMode);
  const treatsCount = useGameState((st) => st.wallet.treats);
  const treats = fmt(treatsCount).text;
  const live = useGameState((st) => st.visitors.kinds[VISITOR_KIND]?.live ?? null);
  const now = useClockNow(500);

  const [purring, setPurring] = useState(false);
  const [heart, setHeart] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [flash, setFlash] = useState<FlashMood | null>(null);
  const purrTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (purrTimer.current !== null) clearTimeout(purrTimer.current);
      if (heartTimer.current !== null) clearTimeout(heartTimer.current);
      if (noteTimer.current !== null) clearTimeout(noteTimer.current);
      if (flashTimer.current !== null) clearTimeout(flashTimer.current);
    },
    [],
  );

  /** Holds one of her momentary moods for a few seconds, then lets the ordinary one come back. */
  const flashFor = useCallback((mood: FlashMood, ms: number) => {
    setFlash(mood);
    if (flashTimer.current !== null) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), ms);
  }, []);

  // A Folio closed: she notices the pile getting shorter.
  const clearedBefore = useRef<number | null>(null);
  useEffect(() => {
    const before = clearedBefore.current;
    clearedBefore.current = foliosCleared;
    if (before === null || foliosCleared <= before) return;
    flashFor("celebrate", CELEBRATE_MS);
  }, [foliosCleared, flashFor]);

  // Every fifth clean Folio in a row, likewise.
  const streakBefore = useRef<number | null>(null);
  useEffect(() => {
    const before = streakBefore.current;
    streakBefore.current = cleanStreak;
    if (before === null || cleanStreak <= before) return;
    if (cleanStreak % CLEAN_STREAK_STEP !== 0) return;
    flashFor("celebrate", CELEBRATE_MS);
  }, [cleanStreak, flashFor]);

  // The archive rebinding under her nose: the one thing on the page she is allowed to be loud about.
  useEffect(
    () =>
      momentState.subscribe((active) => {
        if (active) flashFor("startle", STARTLE_MS);
      }),
    [flashFor],
  );

  const mothLive = live !== null && live.diesAt > now;
  const flowRatio = flowCap > 0 ? flow / flowCap : 0;
  // The player's own press answers first, then the Moment or the mended page, then the moth, then the Flow.
  let mood: TildeMood = "nap";
  if (flow > 0 && flowRatio >= 0.4) mood = "alert";
  if (flowRatio > 0.6) mood = "typing";
  if (mothLive) mood = "moth";
  if (flash !== null) mood = flash;
  if (purring) mood = "purr";
  const frames = TILDE_FRAMES[mood];

  const [frameStep, setFrameStep] = useState(0);
  useEffect(() => {
    if (reduced || frames.length < 2) return;
    const tick = setInterval(() => setFrameStep((n) => n + 1), 1300);
    return () => clearInterval(tick);
  }, [reduced, frames.length]);
  const frame = reduced ? frames[0] : frames[frameStep % frames.length];

  // Her own opinions and the Act's ticker, alternating, so the whole of her repertoire surfaces over a session.
  const actLines = TICKER_LINES[act] ?? TICKER_LINES[1] ?? [];
  const [quipStep, setQuipStep] = useState(0);
  useEffect(() => {
    const tick = setInterval(() => setQuipStep((n) => n + 1), QUIP_MS);
    return () => clearInterval(tick);
  }, []);
  const quip =
    quipStep % 2 === 0
      ? (TILDE_QUIPS[Math.floor(quipStep / 2) % TILDE_QUIPS.length] ?? "")
      : (actLines[Math.floor(quipStep / 2) % actLines.length] ?? "");

  const equipped = TILDE_COSMETICS.find((entry) => entry.id === cosmeticId);
  const badge = equipped?.badge ?? "";
  const unlocked = TILDE_COSMETICS.filter((entry) => entry.minBond <= bond);

  const cost = tildeTreatCost(bond);

  /** Says something quietly in the ticker's place, then lets the quips come back. */
  const say = (line: string | null) => {
    setNote(line);
    if (noteTimer.current !== null) clearTimeout(noteTimer.current);
    if (line !== null) noteTimer.current = setTimeout(() => setNote(null), 5200);
  };

  /** Her purr, her heart, and her few seconds of purring: the answer to either press that worked. */
  const delight = () => {
    playTildePurr();
    setPurring(true);
    if (purrTimer.current !== null) clearTimeout(purrTimer.current);
    purrTimer.current = setTimeout(() => setPurring(false), PURR_MS);
    setHeart((n) => n + 1);
    if (heartTimer.current !== null) clearTimeout(heartTimer.current);
    heartTimer.current = setTimeout(() => setHeart(0), HEART_MS);
    say(null);
  };

  const pet = () => {
    if (!store.getState().vim.petTilde().ok) {
      say("She is timing this one. Give her half a minute.");
      return;
    }
    delight();
  };

  const feed = () => {
    if (!store.getState().vim.feedTilde()) {
      say(
        `She wants ${cost} ${cost === 1 ? CURRENCY.treats.name : CURRENCY.treats.plural} for the next bond.`,
      );
      return;
    }
    delight();
  };

  /** Dresses her in the next thing Bond has opened, and says so. */
  const restyle = () => {
    if (unlocked.length === 0) return;
    const worn = unlocked.findIndex((entry) => entry.id === cosmeticId);
    const next = unlocked[(worn + 1) % unlocked.length];
    if (next === undefined) return;
    if (!store.getState().vim.setTildeCosmetic(next.id)) return;
    say(next.id === "none" ? "She puts it all away." : `She puts on the ${next.name}.`);
  };

  // Tilde wakes up on the statusline once the player finishes their opening lesson (Folio 0).
  if (foliosCleared === 0 && !veteran) return null;

  const showTreats = bond > 0 || treatsCount.gt(0);
  const firstTreatReady = bond === 0 && treatsCount.gte(cost);

  return (
    <div className={cx(s.bar, className)} data-mood={mood}>
      <span className={s.cat}>
        <span className={s.mood} aria-hidden="true" />
        <span className={s.frame} aria-hidden="true">
          {frame ?? "~ (=^-ω-^=)"}
        </span>
        {badge !== "" && (
          <span className={s.cosmetic} aria-hidden="true">
            {badge}
          </span>
        )}
        <VisuallyHidden>
          {equipped === undefined || equipped.id === "none"
            ? `Tilde is ${MOOD_WORDS[mood]}.`
            : `Tilde is ${MOOD_WORDS[mood]}, wearing the ${equipped.name}.`}
        </VisuallyHidden>
      </span>
      {showTreats && (
        <span className={s.bond} title="Permanent +10% Glyph Clarity & Ink Flow per Bond level">
          BOND {bond} <span className={s.bonus}>(+{Math.round(bond * TILDE_BOND_STEP * 100)}%)</span>
        </span>
      )}
      <span className={s.actions}>
        <Button onClick={pet}>Pet</Button>
        {showTreats && (
          <Button
            variant={firstTreatReady ? "primary" : "secondary"}
            onClick={feed}
            disabled={treatsCount.lt(cost)}
            title={
              treatsCount.lt(cost)
                ? "No Treats left — earn Treats from Errata Slips or Expeditions"
                : "Feed Tilde 1 Treat for permanent +10% Clarity & Ink"
            }
            cost={cost}
            glyph={glyphOf("treat", 12)}
            unit={CURRENCY.treats.plural}
          >
            Treat
          </Button>
        )}
        {bond >= 1 && (
          <Button variant="ghost" onClick={restyle} title="Cycle Tilde's accessory">
            Style
          </Button>
        )}
      </span>
      <p className={s.quip}>
        {note ??
          (firstTreatReady ? "You found a Treat — feed Tilde for permanent +10% Clarity & Ink!" : quip)}
      </p>
      {showTreats && (
        <span className={s.purse}>
          {treats} {CURRENCY.treats.plural}
        </span>
      )}
      <VisuallyHidden>{note !== null && <span role="status">{note}</span>}</VisuallyHidden>
      {heart > 0 && (
        <span key={heart} className={s.heart} data-still={reduced ? "" : undefined} aria-hidden="true">
          ♥
        </span>
      )}
    </div>
  );
}
