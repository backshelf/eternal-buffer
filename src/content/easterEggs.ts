// Every Vim and Unix joke the archive will let you find. Twenty-five of them, wired from the Ex
// console or from a gesture the editor watches for.
//
// Plain data: no DOM, no store, no React. `BufferEditor` looks them up by `trigger` and hands the
// `toast` to the Chalkboard; `src/game/vim.ts` records the `id` in `easterEggsFound`.
export interface EasterEggDef {
  id: string;
  /** The exact Ex command or gesture. Ex triggers keep their leading `:`. */
  trigger: string;
  /** The Chalkboard line, in the Midnight Archivist's voice. */
  toast: string;
  /** A secret Marginalia tile, when the spec gives this egg one. */
  achievementId?: string;
  /** Treats pressed into your palm for being clever. */
  bonusTreats?: number;
}

export const EASTER_EGGS: EasterEggDef[] = [
  {
    id: "no-write-since",
    trigger: ":q",
    toast: "E37: No write since last epoch. (Try :w to Bind Volume, or keep mending.)",
    achievementId: "trapped-in-vim",
  },
  {
    id: "exit-deleted",
    trigger: ":q!",
    toast: "Nice try. The exit was deleted with dd in 1991.",
    bonusTreats: 1,
  },
  {
    id: "quit-all-refused",
    trigger: ":qa!",
    toast: "There is only one buffer here, and it is the universe. It will not close politely.",
  },
  {
    id: "enthusiastic-rebind",
    trigger: ":wq!",
    toast: "Enthusiastic! Performing ceremonial Rebind...",
  },
  {
    id: "zz-save",
    trigger: "ZZ",
    toast: "The old shorthand still works. Bound and closed, the way 1976 intended.",
  },
  {
    id: "zq-refused",
    trigger: "ZQ",
    toast: "Refusing to quit without saving your precious Glyphs.",
  },
  {
    id: "codex-drawer",
    trigger: ":help",
    toast: "The Vim Reference Codex is open. It is longer than the night.",
  },
  {
    id: "meaning-of-42",
    trigger: ":help 42",
    toast: "42 — The meaning of life, the universe, and why you still use hjkl.",
    achievementId: "meaning-of-42",
  },
  {
    id: "bram-smile",
    trigger: ":smile",
    toast: "Tilde purrs. Somebody in Amsterdam typed this first, and the archive remembers.",
    achievementId: "bram-smile",
  },
  {
    id: "standard-editor",
    trigger: ":ed",
    toast: "?",
  },
  {
    id: "rm-rf-denied",
    trigger: ":!rm -rf /",
    toast: "Permission denied: Tilde is sitting on /dev/null.",
    achievementId: "rm-rf-denied",
  },
  {
    id: "phosphor-cycle",
    trigger: ":colorscheme",
    toast: "Amber, jade, paper, midnight. The vellum changes; the rot does not.",
  },
  {
    id: "gutter-numbers",
    trigger: ":set number",
    toast: "Line numbers rise in the gutter. The margins are honest again.",
  },
  {
    id: "gutter-hidden",
    trigger: ":set nonu",
    toast: "Numbers hidden. You will count with your legs now, as the elders did.",
  },
  {
    id: "pet-from-ex",
    trigger: ":pet",
    toast: "Tilde is petted from the command line. It does not ask how you got here.",
  },
  {
    id: "treat-from-ex",
    trigger: ":treat",
    toast: "A treat, delivered by Ex. Tilde accepts without opening one eye.",
  },
  {
    id: "wrong-church",
    trigger: ":emacs",
    toast: "M-x butterfly not found. Please consult a wrist specialist.",
    achievementId: "wrong-church",
  },
  {
    id: "nano-exit",
    trigger: ":nano",
    toast: "^X Exit? We don't do that here.",
  },
  {
    id: "electron-vellum",
    trigger: ":vscode",
    toast: "Electron would consume 4 GB of this manuscript's vellum.",
  },
  {
    id: "esc-panic",
    trigger: "Escape mashed 5 times inside 2 seconds",
    toast: "You are ALREADY in Normal mode. Take a breath.",
    achievementId: "esc-panic",
  },
  {
    id: "rusty-arrows",
    trigger: "Arrow keys pressed 10 times after rusting",
    toast: "Your arrow keys have turned to amber dust.",
  },
  {
    id: "whole-buffer",
    trigger: "ggVG",
    toast: "You stare into the whole folio. The folio stares back.",
  },
  {
    id: "zz-zen",
    trigger: "zz",
    toast: "Centered. Deep breath. Tilde approves.",
  },
  {
    id: "oldest-change",
    trigger: "u pressed 5 times on an already-clean buffer",
    toast: "Already at oldest change (circa 1976, Bill Joy's terminal).",
  },
  {
    id: "cat-whisperer",
    trigger: ":42",
    toast: "Tilde grants you honorary feline status.",
    achievementId: "cat-whisperer",
  },
];

export const EGG_BY_ID: Record<string, EasterEggDef> = Object.fromEntries(
  EASTER_EGGS.map((egg) => [egg.id, egg]),
);
