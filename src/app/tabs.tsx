import { useMemo } from "react";
import { useClockNow } from "watchpot/react";
import type { NavTabsWords } from "watchpot/ui";
import { CHALLENGES } from "../content/challenges";
import { MOSAIC_PIECES } from "../content/mosaic";
import { RUN_NODES } from "../content/tree";
import { KEY_FAMILIES } from "../content/vimActs";
import { TAB_NAMES } from "../content/words";
import { trials } from "../game/challenges";
import type { GameState } from "../game/game";
import { crafting } from "../game/mosaic";
import { codex, volumes } from "../game/prestige";
import { upgrades } from "../game/tree";
import { AchievementsScreen } from "../screens/Achievements";
import { ChallengesScreen } from "../screens/Challenges";
import { ExpeditionsScreen } from "../screens/Expeditions";
import { MakeScreen } from "../screens/Make";
import { MosaicScreen } from "../screens/Mosaic";
import { PrestigeScreen } from "../screens/Prestige";
import { UpgradesScreen } from "../screens/Upgrades";
import type { ShellTab } from "../ui/Shell";
import { useGameState } from "./hooks";
import { TAB_ICONS } from "./icons";

/** The screens the game has, by id. */
export type Tab = "make" | "mosaic" | "expeditions" | "tree" | "prestige" | "challenges" | "achievements";

/** What a tab's count and lock add to its name, in the archive's words. */
export const TAB_WORDS: NavTabsWords = {
  locked: ", sealed for now",
  count: (count) => `, ${count} waiting`,
};

/** The seven tabs, in progressive discovery order, with their `:ex` command aliases. */
const SCREENS: readonly ShellTab<Tab>[] = [
  { id: "make", label: TAB_NAMES.make, exCmd: ":buf", icon: TAB_ICONS.make, Screen: MakeScreen },
  { id: "tree", label: TAB_NAMES.tree, exCmd: ":codex", icon: TAB_ICONS.tree, Screen: UpgradesScreen },
  {
    id: "expeditions",
    label: TAB_NAMES.expeditions,
    exCmd: ":exp",
    icon: TAB_ICONS.expeditions,
    Screen: ExpeditionsScreen,
  },
  { id: "mosaic", label: TAB_NAMES.mosaic, exCmd: ":mosaic", icon: TAB_ICONS.mosaic, Screen: MosaicScreen },
  {
    id: "prestige",
    label: TAB_NAMES.prestige,
    exCmd: ":vol",
    icon: TAB_ICONS.prestige,
    Screen: PrestigeScreen,
  },
  {
    id: "challenges",
    label: TAB_NAMES.challenges,
    exCmd: ":trials",
    icon: TAB_ICONS.challenges,
    Screen: ChallengesScreen,
  },
  {
    id: "achievements",
    label: TAB_NAMES.achievements,
    exCmd: ":log",
    icon: TAB_ICONS.achievements,
    Screen: AchievementsScreen,
  },
];

/** How many Keycap Families could be bought now: the free pair first, then whatever the wallet covers. */
const affordableKeycaps = (st: GameState) =>
  KEY_FAMILIES.reduce((n, family) => {
    if (st.vim.unlockedFamilies[family.id] === true) return n;
    if (!family.requires.every((required) => st.vim.unlockedFamilies[required] === true)) return n;
    const balance = st.wallet[family.cost.currency];
    return n + (family.cost.amount === 0 || balance.gte(family.cost.amount) ? 1 : 0);
  }, 0);

/** How many nodes have a rank the wallet covers. */
const affordableNodes = (st: GameState) =>
  RUN_NODES.reduce((n, node) => n + (upgrades.select.affordable(st, node.id) > 0 ? 1 : 0), 0);

/** What the Codex tab has waiting: a keycap to unlock or a rank to buy. */
const codexWaiting = (st: GameState) => affordableKeycaps(st) + affordableNodes(st);

/** How many pieces the bench could cut now: the Mosaic tab's count. */
const craftablePieces = (st: GameState) =>
  MOSAIC_PIECES.reduce((n, piece) => n + (crafting.select.craftable(st, piece.id) > 0 ? 1 : 0), 0);

/** How many trials can be entered now: the Trials tab's count. */
const openTrials = (st: GameState) =>
  CHALLENGES.reduce((n, challenge) => n + (trials.select.check(st, challenge.id) === null ? 1 : 0), 0);

/** Total Scribes owned across all tiers (one Wax-Sealed Moth starts free at the desk). */
const totalScribes = (st: GameState) =>
  Object.values(st.generators.owned).reduce((sum, count) => sum + count, 0);

/** Total Expeditions ever completed or currently active. */
const anyExpedition = (st: GameState) =>
  st.expeditions.active.length > 0 || Object.values(st.expeditions.done).some((count) => count > 0);

/**
 * Progressive disclosure: returns whether a tab has been earned/revealed for the current save.
 * Fresh saves start with ONLY the Buffer; each system opens as it becomes relevant, while
 * existing/veteran saves with progress automatically see every screen they have reached.
 */
export function isTabRevealed(st: GameState, id: Tab): boolean {
  if (id === "make") return true;
  const hasPrestiged = st.wallet.sealsEver.gte(1) || st.wallet.codicesEver.gte(1);
  if (id === "tree") {
    return hasPrestiged || st.vim.totalFoliosCleared >= 1 || st.wallet.earned.gte(20);
  }
  if (id === "expeditions") {
    return (
      hasPrestiged ||
      st.vim.totalFoliosCleared >= 2 ||
      totalScribes(st) >= 2 ||
      (st.vim.totalFoliosCleared >= 1 && st.wallet.ink.gte(3)) ||
      anyExpedition(st)
    );
  }
  if (id === "mosaic") {
    return (
      hasPrestiged ||
      st.vim.totalFoliosCleared >= 3 ||
      (st.vim.totalFoliosCleared >= 1 && st.wallet.ink.gte(10)) ||
      st.wallet.shards.gt(0) ||
      anyExpedition(st)
    );
  }
  if (id === "prestige") {
    return hasPrestiged || st.wallet.earned.gte(5_000);
  }
  if (id === "challenges") {
    return hasPrestiged || st.vim.highestAct >= 3;
  }
  if (id === "achievements") {
    return hasPrestiged || (st.vim.totalFoliosCleared >= 1 && Object.keys(st.achievements.earned).length > 0);
  }
  return true;
}

/**
 * The tab bar with progressive reveal and live waiting counts. Only revealed tabs appear in the
 * bufferline, so a fresh player begins with a calm blank desk and watches the archive open around them.
 */
export function useTabs(): readonly ShellTab<Tab>[] {
  const now = useClockNow(1000);
  const active = useGameState((st) => st.expeditions.active);
  const waiting = useGameState(codexWaiting);
  const pieces = useGameState(craftablePieces);
  const trialsOpen = useGameState(openTrials);
  const volumeReady = useGameState((st) => volumes.select.gain(st).gte(1));
  const rebindReady = useGameState((st) => codex.select.gain(st).gte(1));
  const fresh = useGameState((st) => st.achievements.fresh.length);
  const sealed = useGameState((st) => st.vim.highestAct < 3 && st.wallet.sealsEver.lt(1));

  // Individual booleans keep selector results primitive so Zustand never re-renders unnecessarily.
  const showCodex = useGameState((st) => isTabRevealed(st, "tree"));
  const showExp = useGameState((st) => isTabRevealed(st, "expeditions"));
  const showMosaic = useGameState((st) => isTabRevealed(st, "mosaic"));
  const showPrestige = useGameState((st) => isTabRevealed(st, "prestige"));
  const showTrials = useGameState((st) => isTabRevealed(st, "challenges"));
  const showAchievements = useGameState((st) => isTabRevealed(st, "achievements"));

  const ready = active.reduce((n, entry) => n + (entry.endsAt <= now ? 1 : 0), 0);
  const volumesReady = volumeReady ? 1 : 0;
  const codices = rebindReady ? 1 : 0;

  return useMemo(() => {
    const visible: Record<Tab, boolean> = {
      make: true,
      tree: showCodex,
      expeditions: showExp,
      mosaic: showMosaic,
      prestige: showPrestige,
      challenges: showTrials,
      achievements: showAchievements,
    };
    return SCREENS.filter((tab) => visible[tab.id]).map((tab): ShellTab<Tab> => {
      if (tab.id === "make") return { ...tab, count: volumesReady };
      if (tab.id === "mosaic") return { ...tab, count: pieces };
      if (tab.id === "expeditions") return { ...tab, count: ready };
      if (tab.id === "tree") return { ...tab, count: waiting };
      if (tab.id === "prestige") return { ...tab, count: volumesReady + codices };
      if (tab.id === "challenges") return { ...tab, count: trialsOpen, locked: sealed };
      return { ...tab, count: fresh };
    });
  }, [
    showCodex,
    showExp,
    showMosaic,
    showPrestige,
    showTrials,
    showAchievements,
    volumesReady,
    pieces,
    ready,
    waiting,
    codices,
    trialsOpen,
    sealed,
    fresh,
  ]);
}
