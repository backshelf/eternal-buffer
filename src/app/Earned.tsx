import { type CSSProperties, useEffect, useRef, useState } from "react";
import { type StagedCue, useCueBatches, useStage } from "watchpot/kit";
import { createToasts } from "watchpot/ui";
import { ACHIEVEMENTS, WALL_NAME } from "../content/achievements";
import { CHALLENGES } from "../content/challenges";
import { EGG_BY_ID } from "../content/easterEggs";
import { GRAMMAR_CODEX } from "../content/vimActs";
import { Button } from "../ui/Button";
import { Toasts } from "../ui/Toasts";
import { type ArchiveShow, director } from "./feel";
import { useGameState, useGameStore } from "./hooks";
import { playEarned } from "./sound";

const BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

/** The Grammar Codex by pair id, for naming a learned pair on a sticker. */
const PAIR_BY_ID = new Map(GRAMMAR_CODEX.map((pair) => [pair.id, pair]));

/** The trials by id, for naming one returned from. */
const CHALLENGE_BY_ID = new Map(CHALLENGES.map((challenge) => [challenge.id, challenge]));

/** Says each achievement as it is earned (the wall's `fresh` queue), then clears it from the queue. */
export function EarnedToasts() {
  const store = useGameStore();
  const fresh = useGameState((st) => st.achievements.fresh);
  const [toasts] = useState(() => createToasts({ duration: 5000 }));
  useEffect(() => {
    if (fresh.length === 0) return;
    for (const id of fresh) {
      const a = BY_ID.get(id);
      if (a) toasts.push({ id, title: a.name, body: a.line, tone: "success" });
    }
    playEarned();
    store.getState().achievements.acknowledge(fresh);
  }, [fresh, store, toasts]);
  return <Toasts store={toasts} label={WALL_NAME} dismissLabel="Dismiss" />;
}

/**
 * The archive's own news, as `director` rations it: an Act opening or a trial returned from takes the stage as a
 * banner with its Continue, and Grammar pairs and Easter eggs coalesce into one sticker per batch. The wall's
 * achievements keep their own toasts (`EarnedToasts`); this is the Act, the trial, the pair and the egg.
 */
export function ArchiveShows() {
  const [toasts] = useState(() => createToasts({ duration: 6000 }));
  const seq = useRef(0);

  useCueBatches(director, (batch) => {
    const shows = batch.cues.map((cue) => cue.data);
    if (shows.length === 0) return;
    seq.current += 1;
    const id = `archive-${seq.current}`;
    if (batch.kind === "codex-pair") {
      const lines = shows.flatMap((show) => (show.kind === "codex-pair" ? [pairLine(show.id)] : []));
      toasts.push({
        id,
        title: shows.length === 1 ? "A Grammar pair learned" : `${shows.length} Grammar pairs learned`,
        body: lines.join(" · "),
        tone: "success",
      });
    } else if (batch.kind === "easter-egg") {
      const lines = shows.flatMap((show) =>
        show.kind === "easter-egg" ? [EGG_BY_ID[show.id]?.toast ?? show.id] : [],
      );
      toasts.push({
        id,
        title: shows.length === 1 ? "An Easter egg found" : `${shows.length} Easter eggs found`,
        body: lines.join(" · "),
        tone: "success",
      });
    }
    playEarned();
  });

  const show = useStage(director);
  const big =
    show !== null && (show.data.kind === "act-unlock" || show.data.kind === "challenge-done") ? show : null;

  return (
    <>
      {big !== null && <BigShow key={big.id} show={big} />}
      <Toasts store={toasts} label="The archive's news" dismissLabel="Dismiss" />
    </>
  );
}

/** One Grammar pair as a sticker says it: its keys, then its name. */
function pairLine(id: string): string {
  const pair = PAIR_BY_ID.get(id);
  return pair ? `${pair.keys} — ${pair.name}` : id;
}

/** What a big show says: its kicker, its heading, and the line under it. */
function bigWords(show: StagedCue<ArchiveShow>): { kicker: string; title: string; line: string } {
  if (show.data.kind === "act-unlock") {
    return {
      kicker: `ACT ${show.data.numeral}`,
      title: show.data.title,
      line: "A new keycap family is open. The chalkboard has room for it.",
    };
  }
  if (show.data.kind === "challenge-done") {
    const trial = CHALLENGE_BY_ID.get(show.data.id);
    return {
      kicker: "TRIAL RETURNED",
      title: trial?.name ?? show.data.id,
      line: `${show.data.completions} cleared. ${trial?.rewardText ?? "Its discipline stays with you."}`,
    };
  }
  return { kicker: "THE ARCHIVE", title: "Something happened", line: "" };
}

/**
 * A big show on the director's stage. It leaves when the player presses Continue, or by itself once the read hold and
 * a comfortable beat have passed, so the stage never blocks the next show. Static by construction: there is no motion
 * to still, so reduced motion changes nothing here.
 */
function BigShow({ show }: { show: StagedCue<ArchiveShow> }) {
  useEffect(() => {
    playEarned();
    const leave = setTimeout(() => director.done(show.id), show.readMs + 2500);
    return () => clearTimeout(leave);
  }, [show.id, show.readMs]);
  const words = bigWords(show);
  return (
    <section style={BANNER} role="status" aria-live="polite">
      <div style={WORDS}>
        <p style={KICKER}>{words.kicker}</p>
        <p style={TITLE}>{words.title}</p>
        <p style={LINE}>{words.line}</p>
      </div>
      <Button variant="primary" onClick={() => director.done(show.id)}>
        Continue
      </Button>
    </section>
  );
}

/*
 * The banner's face, inline because this file owns no stylesheet: the archive's surface, one accent hairline, its
 * stipple and the two corner marks the whole page uses. No motion is declared, so nothing has to be stilled.
 */
const BANNER: CSSProperties = {
  position: "fixed",
  left: "50%",
  bottom: 24,
  zIndex: 35,
  translate: "-50% 0",
  display: "flex",
  alignItems: "center",
  gap: 16,
  boxSizing: "border-box",
  width: "min(480px, calc(100% - 32px))",
  padding: "12px 16px",
  border: "1px solid color-mix(in srgb, var(--ui-accent) 55%, var(--ui-line))",
  backgroundColor: "var(--ui-surface)",
  backgroundImage: "var(--dither-4)",
  boxShadow: "0 0 30px color-mix(in srgb, var(--ui-accent) 16%, transparent)",
  color: "var(--ui-ink)",
};
const WORDS: CSSProperties = { display: "grid", flex: "1 1 auto", gap: 2, minWidth: 0 };
const KICKER: CSSProperties = {
  margin: 0,
  color: "var(--ui-accent)",
  fontFamily: "var(--ui-font-num)",
  fontSize: 10,
  letterSpacing: "0.18em",
};
const TITLE: CSSProperties = {
  margin: 0,
  fontFamily: "var(--ui-font-display)",
  fontSize: 20,
  fontWeight: 700,
  lineHeight: 1.1,
};
const LINE: CSSProperties = {
  margin: 0,
  color: "var(--ui-ink-muted)",
  fontFamily: "var(--ui-font)",
  fontSize: 12,
  lineHeight: 1.4,
};
