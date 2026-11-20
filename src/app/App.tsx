import { useCallback, useEffect, useMemo, useState } from "react";
import type { Decimal } from "watchpot/core";
import { DevPanel } from "watchpot/devtools";
import { MarkLayer } from "watchpot/kit";
import { useGameRuntime } from "watchpot/react";
import { pinShaderClock, ShaderPool } from "watchpot/shader";
import type { SheetRegistry } from "watchpot/ui";
import { AwayModal } from "../components/AwayModal";
import { FOCUS_BUFFER_EVENT, HELP_EVENT, NAV_EVENT, publishStatus } from "../components/BufferEditor";
import { MomentOverlay } from "../components/MomentOverlay";
import { WelcomeOverlay } from "../components/WelcomeOverlay";
import { LATE_RATE } from "../content/economy";
import { NAME } from "../content/words";
import { incomeOf } from "../game/income";
import type { GameStore } from "../game/store";
import { BACKDROP } from "../shaders/backdrop";
import { cleanCutPulse, momentState } from "../shaders/pulses";
import { Backdrop } from "../ui/Backdrop";
import { Button } from "../ui/Button";
import { Shell } from "../ui/Shell";
import { AboutSheet, HelpSheet } from "./AboutSheet";
import s from "./app.module.css";
import { ArchiveShows, EarnedToasts } from "./Earned";
import { marks, wireArchiveWatch } from "./feel";
import { Header } from "./Header";
import { useGameState, useGameStore } from "./hooks";
import { sound } from "./sound";
import { isTabRevealed, TAB_WORDS, type Tab, useTabs } from "./tabs";
import { VisitorLayer } from "./Visitor";

/** The global sheets, by kind. A new sheet adds its kind here and its line to the registry. */
export type Sheet = { kind: "about" } | { kind: "help" };

/** Whether this build is a development one: Bun folds the constant, so a production bundle drops the dev tools. */
const DEV = process.env.NODE_ENV !== "production";

/** What a development build leaves on the console: the archive's own handles. */
declare global {
  interface Window {
    __eternalBuffer?: {
      /** Holds every shader on the page at one instant, for a repeatable screenshot. */
      pinShaderClock: typeof pinShaderClock;
      /** Plays the `:wq` Codex Rebound Moment. */
      replayMoment: () => boolean;
      /** The one store, for reading the state while it runs. */
      store: GameStore;
    };
  }
}

/** How well the run is going, 0..1: the income on a log scale up to `LATE_RATE`, in steps of a hundredth. */
const heatOf = (income: Decimal) =>
  Math.round(Math.min(1, income.add(1).log10().toNumber() / Math.log10(LATE_RATE)) * 100) / 100;

/** How deep the archive is, 0..1: the Codices ever bound, on a log scale, once the golden octave should wake. */
const depthOf = (codices: Decimal) =>
  Math.round(Math.min(1, codices.add(1).log10().toNumber() / 4) * 100) / 100;

/** The Flow's share of its cap, 0..1, in steps of a hundredth: what thickens the backdrop's phosphor. */
const flowShare = (flow: number, cap: number) =>
  cap > 0 ? Math.round(Math.min(1, flow / cap) * 100) / 100 : 0;

/** The page's hash, kept current as it changes: `#dev` opens the developer's panel. */
function useHash() {
  const [hash, setHash] = useState(() => location.hash);
  useEffect(() => {
    const read = () => setHash(location.hash);
    addEventListener("hashchange", read);
    return () => removeEventListener("hashchange", read);
  }, []);
  return hash;
}

/**
 * The game page: the shell over the game's tabs, the header, the backdrop, the moment and its overlays. In a
 * development build `#dev` opens the engine's dev panel beside a replay of the `:wq` Moment; `DevPanel` draws
 * nothing in a production one.
 */
export function App() {
  const store = useGameStore();
  const hash = useHash();
  const tabs = useTabs();
  const [tab, setTab] = useState<Tab>("make");
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const motion = useGameState((st) => st.settings.motion);
  const soundOn = useGameState((st) => st.settings.sound);
  const tint = useGameState((st) => st.settings.tintPreset);
  const heat = useGameState((st) => heatOf(incomeOf(st)));
  const depth = useGameState((st) => depthOf(st.wallet.codicesEver));
  const flow = useGameState((st) => flowShare(st.vim.flow, st.vim.flowCap));
  const { taken, reduced } = useGameRuntime(store, {
    motion,
    scheme: "system",
    sound: { engine: sound, on: soundOn },
  });

  // The sheets: one per kind, made once. A sheet opened from another (`about` › `help`) swaps kinds.
  const sheets = useMemo<SheetRegistry<Sheet>>(
    () => ({
      about: (_sheet, close) => <AboutSheet onClose={close} onHelp={() => setSheet({ kind: "help" })} />,
      help: (_sheet, close) => <HelpSheet onClose={close} />,
    }),
    [],
  );

  // The archive's own news: an Act opening, a trial returned from, a pair learned, an egg found.
  useEffect(() => wireArchiveWatch(store), [store]);

  // A tint is the palette's, not the component's: `:colorscheme` and the settings write it on the root element.
  // Mirroring it onto the root class list wakes `useShaderTokens`'s observer so every WebGL2 shader repaints too.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.tint = tint;
    root.classList.remove("tint-amber", "tint-jade", "tint-paper", "tint-midnight");
    root.classList.add(`tint-${tint}`);
  }, [tint]);

  // The reference sheet, from `:help` (and from the `?` button). `:help 42` is the egg, not a page.
  useEffect(() => {
    const hear = (event: Event) => {
      const topic = (event as CustomEvent<{ topic: string | null }>).detail?.topic ?? null;
      if (topic === "42") return;
      setSheet({ kind: "help" });
    };
    window.addEventListener(HELP_EVENT, hear);
    return () => window.removeEventListener(HELP_EVENT, hear);
  }, []);

  // The console handles a development build keeps: the shader pin and the Moment's replay.
  useEffect(() => {
    if (!DEV) return;
    window.__eternalBuffer = {
      pinShaderClock,
      replayMoment: () => momentState.trigger(),
      store,
    };
    return () => {
      delete window.__eternalBuffer;
    };
  }, [store]);

  /**
   * A tab press. Leaving the Buffer for the Mosaic, the Expeditions or the Codex is a breather, not a lapse in
   * practice: the Flow is held for twenty seconds of game time so a look at the board never wipes the streak.
   */
  const selectTab = useCallback(
    (next: Tab) => {
      if (tab === "make" && next !== "make") {
        const state = store.getState();
        state.vim.setGrace(state.gameNow() + 20_000);
      }
      setTab(next);
      if (next === "make") {
        window.setTimeout(() => window.dispatchEvent(new Event(FOCUS_BUFFER_EVENT)), 30);
      }
    },
    [store, tab],
  );

  // Vim `:ex` screen navigation (`:buf`, `:codex`, `:exp`, `:mosaic`, `:vol`, `:trials`, `:log`).
  useEffect(() => {
    const onNav = (event: Event) => {
      const target = (event as CustomEvent<{ target?: string }>).detail?.target;
      if (!target || target === "scribes") return;
      const valid: readonly Tab[] = [
        "make",
        "tree",
        "expeditions",
        "mosaic",
        "prestige",
        "challenges",
        "achievements",
      ];
      if (!(valid as readonly string[]).includes(target)) return;
      const next = target as Tab;
      const live = store.getState();
      if (!isTabRevealed(live, next) && !live.settings.veteranMode) {
        publishStatus({ message: `:${target} is still sealed — keep mending folios to open it.` });
        return;
      }
      selectTab(next);
    };
    window.addEventListener(NAV_EVENT, onNav);
    return () => window.removeEventListener(NAV_EVENT, onNav);
  }, [store, selectTab]);

  const backdrop = BACKDROP && (
    <Backdrop
      fragment={BACKDROP.fragment}
      still={BACKDROP.still}
      reducedTime={BACKDROP.reducedTime}
      heat={heat}
      flow={flow}
      depth={depth}
      pulse={cleanCutPulse}
    />
  );

  return (
    <ShaderPool maxLive={12} reduced={reduced}>
      <Shell<Tab, Sheet>
        label={NAME}
        tabs={tabs}
        tab={tab}
        onSelectTab={selectTab}
        tabWords={TAB_WORDS}
        sheets={sheets}
        sheet={sheet}
        onCloseSheet={() => setSheet(null)}
        header={() => (
          <Header onHelp={() => setSheet({ kind: "help" })} onAbout={() => setSheet({ kind: "about" })} />
        )}
        backdrop={backdrop}
        overlays={
          <>
            <WelcomeOverlay />
            <VisitorLayer />
            <EarnedToasts />
            <ArchiveShows />
            <AwayModal />
            <MarkLayer marks={marks} />
          </>
        }
      >
        <MomentOverlay />
        {DEV && hash === "#dev" && (
          <div className={s.devDock}>
            <Button onClick={() => momentState.trigger()}>Replay :wq Moment</Button>
          </div>
        )}
        {hash === "#dev" && (
          <DevPanel
            onClose={() => {
              location.hash = "";
            }}
          />
        )}
        {taken && (
          <div role="alert" className={s.taken}>
            {NAME} is open in another tab. Play there, or close it and reload this one.
          </div>
        )}
      </Shell>
    </ShaderPool>
  );
}
