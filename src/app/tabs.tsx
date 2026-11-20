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

/** The seven tabs, in order, before anything live is read off them. */
const SCREENS: readonly ShellTab<Tab>[] = [
  { id: "make", label: TAB_NAMES.make, icon: TAB_ICONS.make, Screen: MakeScreen },
  { id: "mosaic", label: TAB_NAMES.mosaic, icon: TAB_ICONS.mosaic, Screen: MosaicScreen },
  { id: "expeditions", label: TAB_NAMES.expeditions, icon: TAB_ICONS.expeditions, Screen: ExpeditionsScreen },
  { id: "tree", label: TAB_NAMES.tree, icon: TAB_ICONS.tree, Screen: UpgradesScreen },
  { id: "prestige", label: TAB_NAMES.prestige, icon: TAB_ICONS.prestige, Screen: PrestigeScreen },
  { id: "challenges", label: TAB_NAMES.challenges, icon: TAB_ICONS.challenges, Screen: ChallengesScreen },
  {
    id: "achievements",
    label: TAB_NAMES.achievements,
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

/**
 * The tab bar with what is waiting behind each screen. Each count is a figure off the state or read in render
 * (never a fresh object out of a selector), and the list is rebuilt only when a count changes, so the shell's
 * screen table stays put while the game ticks.
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
  const ready = active.reduce((n, entry) => n + (entry.endsAt <= now ? 1 : 0), 0);
  const volumesReady = volumeReady ? 1 : 0;
  const codices = rebindReady ? 1 : 0;

  return useMemo(
    () =>
      SCREENS.map((tab): ShellTab<Tab> => {
        if (tab.id === "make") return { ...tab, count: volumesReady };
        if (tab.id === "mosaic") return { ...tab, count: pieces };
        if (tab.id === "expeditions") return { ...tab, count: ready };
        if (tab.id === "tree") return { ...tab, count: waiting };
        if (tab.id === "prestige") return { ...tab, count: volumesReady + codices };
        if (tab.id === "challenges") return { ...tab, count: trialsOpen, locked: sealed };
        return { ...tab, count: fresh };
      }),
    [volumesReady, pieces, ready, waiting, codices, trialsOpen, sealed, fresh],
  );
}
