import { useCallback, useEffect, useState } from "react";
import type { Decimal } from "watchpot/core";
import { DevPanel } from "watchpot/devtools";
import { MarkLayer } from "watchpot/kit";
import { useGameRuntime } from "watchpot/react";
import { pinShaderClock, ShaderPool } from "watchpot/shader";
import { AwayModal } from "../components/AwayModal";
import { FOCUS_BUFFER_EVENT, HELP_EVENT, NAV_EVENT, publishStatus } from "../components/BufferEditor";
import { MomentOverlay } from "../components/MomentOverlay";
import { LATE_RATE } from "../content/economy";
import { THEME_BY_ID } from "../content/themes";
import { NAME } from "../content/words";
import { incomeOf } from "../game/income";
import type { GameStore } from "../game/store";
import { BACKDROP } from "../shaders/backdrop";
import { cleanCutPulse, momentState } from "../shaders/pulses";
import { Backdrop } from "../ui/Backdrop";
import { Button } from "../ui/Button";
import { PageRootContext } from "../ui/pageRoot";
import { AboutSheet, HelpSheet, type HelpTab } from "./AboutSheet";
import s from "./app.module.css";
import { ArchiveShows, EarnedToasts } from "./Earned";
import { marks, wireArchiveWatch } from "./feel";
import { useGameState, useGameStore } from "./hooks";
import { setSoundVolumes, sound } from "./sound";
import { isTabRevealed, type Tab, useTabs } from "./tabs";
import { VisitorLayer } from "./Visitor";
import { Workstation } from "./Workstation";

/** The global sheets, by kind; a help sheet may open straight onto one of its tabs. */
export type Sheet = { kind: "about" } | { kind: "help"; tab?: HelpTab };

/** Whether this build is a development one: Bun folds the constant, so a production bundle drops the dev tools. */
const DEV = process.env.NODE_ENV !== "production";

declare global {
  interface Window {
    __eternalBuffer?: {
      pinShaderClock: typeof pinShaderClock;
      replayMoment: () => boolean;
      store: GameStore;
    };
  }
}

const heatOf = (income: Decimal) =>
  Math.round(Math.min(1, income.add(1).log10().toNumber() / Math.log10(LATE_RATE)) * 100) / 100;

const depthOf = (codices: Decimal) =>
  Math.round(Math.min(1, codices.add(1).log10().toNumber() / 4) * 100) / 100;

const flowShare = (flow: number, cap: number) =>
  cap > 0 ? Math.round(Math.min(1, flow / cap) * 100) / 100 : 0;

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
 * The game page: mounts the bespoke 3-zone TUI Workstation over the archive's WebGL2 backdrop, with
 * secondary rooms opening as overlay panes and Help/Settings as sheets. No template header bar and no
 * blocking welcome modal — a brand-new player lands straight in the live centered Vim buffer.
 */
export function App() {
  const store = useGameStore();
  const hash = useHash();
  const tabs = useTabs();
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [room, setRoom] = useState<Tab>("make");
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const motion = useGameState((st) => st.settings.motion);
  const soundOn = useGameState((st) => st.settings.sound);
  const tint = useGameState((st) => st.settings.tintPreset);
  const volumeMaster = useGameState((st) => st.settings.volumeMaster);
  const volumeKeys = useGameState((st) => st.settings.volumeKeys);
  const volumeChimes = useGameState((st) => st.settings.volumeChimes);
  const heat = useGameState((st) => heatOf(incomeOf(st)));
  const depth = useGameState((st) => depthOf(st.wallet.codicesEver));
  const flow = useGameState((st) => flowShare(st.vim.flow, st.vim.flowCap));

  // The vellum the save names — or Midnight Amber when it names one this build has never heard of.
  const activeTheme = THEME_BY_ID[tint] ?? THEME_BY_ID.amber;

  const { taken, reduced } = useGameRuntime(store, {
    motion,
    scheme: activeTheme.scheme,
    sound: { engine: sound, on: soundOn },
  });

  useEffect(() => wireArchiveWatch(store), [store]);

  useEffect(() => {
    const rootEl = document.documentElement;
    rootEl.dataset.tint = activeTheme.id;
    rootEl.style.colorScheme = activeTheme.scheme;
  }, [activeTheme]);

  // The settings' three faders, pushed into the mix the moment they change.
  useEffect(() => {
    setSoundVolumes({ master: volumeMaster, keys: volumeKeys, chimes: volumeChimes });
  }, [volumeMaster, volumeKeys, volumeChimes]);

  useEffect(() => {
    const hear = (event: Event) => {
      const detail = (event as CustomEvent<{ topic?: string | null; tab?: HelpTab }>).detail;
      if (detail?.topic === "42") return;
      setSheet({ kind: "help", tab: detail?.tab });
    };
    window.addEventListener(HELP_EVENT, hear);
    return () => window.removeEventListener(HELP_EVENT, hear);
  }, []);

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

  const selectRoom = useCallback(
    (next: Tab) => {
      if (room === "make" && next !== "make") {
        const state = store.getState();
        state.vim.setGrace(state.gameNow() + 20_000);
      }
      setRoom(next);
      if (next === "make") {
        window.setTimeout(() => window.dispatchEvent(new Event(FOCUS_BUFFER_EVENT)), 30);
      }
    },
    [store, room],
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
      selectRoom(next);
    };
    window.addEventListener(NAV_EVENT, onNav);
    return () => window.removeEventListener(NAV_EVENT, onNav);
  }, [store, selectRoom]);

  return (
    <ShaderPool maxLive={12} reduced={reduced}>
      <PageRootContext.Provider value={root}>
        <div ref={setRoot} className={s.pageRoot}>
          {BACKDROP && (
            <Backdrop
              fragment={BACKDROP.fragment}
              still={BACKDROP.still}
              reducedTime={BACKDROP.reducedTime}
              heat={heat}
              flow={flow}
              depth={depth}
              pulse={cleanCutPulse}
            />
          )}

          <Workstation
            tabs={tabs}
            activeRoom={room}
            onSelectRoom={selectRoom}
            onHelp={() => setSheet({ kind: "help" })}
            onSettings={() => setSheet({ kind: "about" })}
            sheetOpen={sheet !== null}
          />

          <VisitorLayer />
          <EarnedToasts />
          <ArchiveShows />
          <AwayModal />
          <MarkLayer marks={marks} />
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
        </div>

        {sheet?.kind === "about" && (
          <AboutSheet onClose={() => setSheet(null)} onHelp={() => setSheet({ kind: "help" })} />
        )}
        {sheet?.kind === "help" && <HelpSheet onClose={() => setSheet(null)} initialTab={sheet.tab} />}
      </PageRootContext.Provider>
    </ShaderPool>
  );
}
