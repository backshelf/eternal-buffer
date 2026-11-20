import { TAB_NAMES } from "../content/words";
import { AchievementsScreen } from "../screens/Achievements";
import { MakeScreen } from "../screens/Make";
import { PrestigeScreen } from "../screens/Prestige";
import { UpgradesScreen } from "../screens/Upgrades";
import type { ShellTab } from "../ui/Shell";
import { TAB_ICONS } from "./icons";

/** The screens the game has, by id. */
export type Tab = "make" | "tree" | "prestige" | "achievements";

/** The tab bar, in order: one tab per screen the game has. */
export const TABS: readonly ShellTab<Tab>[] = [
  { id: "make", label: TAB_NAMES.make, icon: TAB_ICONS.make, Screen: MakeScreen },
  { id: "tree", label: TAB_NAMES.tree, icon: TAB_ICONS.tree, Screen: UpgradesScreen },
  { id: "prestige", label: TAB_NAMES.prestige, icon: TAB_ICONS.prestige, Screen: PrestigeScreen },
  {
    id: "achievements",
    label: TAB_NAMES.achievements,
    icon: TAB_ICONS.achievements,
    Screen: AchievementsScreen,
  },
];
