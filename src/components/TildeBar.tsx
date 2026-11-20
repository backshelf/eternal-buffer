import { useEffect, useRef, useState } from "react";
import { fmt } from "watchpot/core";
import { useReducedMotion } from "watchpot/kit";
import { useClockNow } from "watchpot/react";
import { cx, VisuallyHidden } from "watchpot/ui";
import { useGameState, useGameStore } from "../app/hooks";
import { glyphOf } from "../app/icons";
import { playTildePurr } from "../app/sound";
import { TICKER_LINES } from "../content/ticker";
import { TILDE_BOND_STEP, TILDE_FRAMES, type TildeMood, tildeTreatCost } from "../content/tilde";
import { CURRENCY } from "../content/words";
import { VISITOR_KIND } from "../game/visitor";
import { Button } from "../ui/Button";
import s from "./TildeBar.module.css";

/** How long a pet leaves her purring at the player, whatever else is happening on the page. */
const PURR_MS = 3200;
/** How long a quip holds the statusline before the next one from the Act's pool. */
const QUIP_MS = 15_000;
/** How long her heart hangs over the statusline. */
const HEART_MS = 2400;

/** What each mood looks like said aloud, for the cat's hidden line. */
const MOOD_WORDS: Record<TildeMood, string> = {
  nap: "asleep on the statusline",
  alert: "cheering your Flow",
  purr: "purring",
  moth: "batting at the Margin Moth",
  typing: "watching the cursor",
};

/** Props of `TildeBar`: only the caller's class; everything else is on the store. */
export interface TildeBarProps {
  className?: string;
}

/**
 * Tilde's statusline: her animated ASCII frame, her Bond, the Pet and Treat buttons, and the Act's ticker quip, framed
 * in the archive's own corner marks. She naps at rest, purrs for a few seconds after a press, sits up for a live
 * Margin Moth, and watches the cursor at high Flow. One frame is held under reduced motion, and the heart that
 * answers a press only fades there.
 */
export function TildeBar({ className }: TildeBarProps) {
  const store = useGameStore();
  const reduced = useReducedMotion();
  const bond = useGameState((st) => st.vim.tildeBond);
  const flow = useGameState((st) => st.vim.flow);
  const flowCap = useGameState((st) => st.vim.flowCap);
  const act = useGameState((st) => st.vim.highestAct);
  const treats = useGameState((st) => fmt(st.wallet.treats).text);
  const live = useGameState((st) => st.visitors.kinds[VISITOR_KIND]?.live ?? null);
  const now = useClockNow(500);

  const [purring, setPurring] = useState(false);
  const [heart, setHeart] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const purrTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (purrTimer.current !== null) clearTimeout(purrTimer.current);
      if (heartTimer.current !== null) clearTimeout(heartTimer.current);
      if (noteTimer.current !== null) clearTimeout(noteTimer.current);
    },
    [],
  );

  const mothLive = live !== null && live.diesAt > now;
  const typing = flowCap > 0 && flow / flowCap > 0.6;
  // The player's own press answers first, then the moth she is on, then the Flow she has noticed.
  const mood: TildeMood = purring ? "purr" : mothLive ? "moth" : typing ? "typing" : "nap";
  const frames = TILDE_FRAMES[mood];

  const [frameStep, setFrameStep] = useState(0);
  useEffect(() => {
    if (reduced || frames.length < 2) return;
    const tick = setInterval(() => setFrameStep((n) => n + 1), 1300);
    return () => clearInterval(tick);
  }, [reduced, frames.length]);
  const frame = reduced ? frames[0] : frames[frameStep % frames.length];

  const lines = TICKER_LINES[act] ?? TICKER_LINES[1] ?? [];
  const [quipStep, setQuipStep] = useState(0);
  useEffect(() => {
    const tick = setInterval(() => setQuipStep((n) => n + 1), QUIP_MS);
    return () => clearInterval(tick);
  }, []);
  const quip = lines.length > 0 ? (lines[quipStep % lines.length] ?? "") : "";

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

  return (
    <div className={cx(s.bar, className)} data-mood={mood}>
      <span className={s.footLeft} aria-hidden="true">
        └
      </span>
      <span className={s.footRight} aria-hidden="true">
        ┘
      </span>
      <span className={s.cat}>
        <span className={s.mood} aria-hidden="true" />
        <span className={s.frame} aria-hidden="true">
          {frame ?? "~ (=^-ω-^=)"}
        </span>
        <VisuallyHidden>{`Tilde is ${MOOD_WORDS[mood]}.`}</VisuallyHidden>
      </span>
      <span className={s.bond}>
        BOND {bond} <span className={s.bonus}>(+{Math.round(bond * TILDE_BOND_STEP * 100)}%)</span>
      </span>
      <span className={s.actions}>
        <Button onClick={pet}>Pet</Button>
        <Button onClick={feed} cost={cost} glyph={glyphOf("treat", 12)} unit={CURRENCY.treats.plural}>
          Treat
        </Button>
      </span>
      <p className={s.quip}>{note ?? quip}</p>
      <span className={s.purse}>
        {treats} {CURRENCY.treats.plural}
      </span>
      <VisuallyHidden>{note !== null && <span role="status">{note}</span>}</VisuallyHidden>
      {heart > 0 && (
        <span key={heart} className={s.heart} data-still={reduced ? "" : undefined} aria-hidden="true">
          ♥
        </span>
      )}
    </div>
  );
}
