# AGENTS.md

The Eternal Buffer: a Vim-teaching idle game. You mend a glitching manuscript through a real modal editor
(CodeMirror 6 + `@replit/codemirror-vim`), and the desk keeps working in Ink while you are away. Bun, TypeScript,
React 19, on the watchpot engine.

## Before writing code

- Look in the engine first. Its guide and a recipe per system are in `node_modules/watchpot/README.md` and
  `node_modules/watchpot/docs/`. Don't hand-write what it exports (prices, buy-max, achievements, timers, focus
  traps, sheets, shaders).
- Never edit `node_modules/watchpot`, and never copy engine source into this game. If the engine lacks something,
  build it in this game.

## Commands

- `bun run dev`: the game at http://localhost:3000 (`PORT=3001` for another port). Hot reload is off: refresh after
  a change. `#dev` opens the engine's dev panel with the replay of the `:wq` Moment.
- `bun run verify`: typecheck (`bun check`) and lint (Biome). Run before every commit.
- `bun run gates`: verify plus a production build. `bun run gates:full` adds the 12-hour pacing contract.
- `bun test`: the suite (economy, folio generation, Vim gate and feature, side systems, shaders, plain parity).
- `bun run sim -- --contract`: the pacing sim, judged against `src/content/pacing.ts`. Run it once after changing
  numbers, not in a loop.
- `bun sim/fit.ts`: prices the Keycap Families at the pacing plan's gates, proves the table, and prints the module
  to commit into `src/content/fitTable.ts`. `--check` fails when the content has drifted from it.
- `bun run tokens`: recompile `src/tokens.css` after editing `design/tokens.json`.

## Where things go

- `src/content/`: the words (`words.ts`), the economy and pacing, and one file per system: the Vim curriculum
  (`vimActs.ts`), folios, the Mosaic, Expeditions, trials, achievements, ticker lines, Easter eggs, `fitTable.ts`.
- `src/game/`: the features on the engine's factories (`wallet`, `settings`, `stats`, `vim`, the two prestige
  layers, the board, missions, trials, the wall, visitors, records, the Scribes), plus `income.ts` (the active-first
  rates), `game.ts` (`defineGame`: the feature order and the save) and `store.ts`.
- `src/vim/`: the DOM-free Vim core (`gate.ts`, `grammar.ts`, `folio.ts`), the half the sim plays without a browser.
- `src/components/`: the hero editor and its furniture (`BufferEditor`, `ExLine`, `Chalkboard`, `TildeBar`,
  `MomentOverlay`, `AwayModal`), each with its own CSS module.
- `src/app/`: the page — `App.tsx` over the `Shell`, the seven tabs (`tabs.tsx`), the header, the settings and the
  Vim reference sheets, the icons, the sounds, the archive's feel (`feel.ts`), the visitor and the news, and
  `hooks.ts` (`useGameState`, `useGameView`, `useGameStore`).
- `src/screens/`: one screen per tab; `src/screens/Make.tsx` composes the hero buffer with its margin rail.
- `src/ui/`: this game's own components over the engine's headless `watchpot/ui`, each with its CSS module, plus
  `theme.css` (the `--ui-*` contract). Restyle freely. `src/ui/README.md` lists every token.
- `src/shaders/`: the four surfaces (`print`, `bufferGlow`, `tileFoil`, `codexMoment`), the pulses, and the CSS stills.
- `design/tokens.json`: the palette and type, compiled to `src/tokens.css` (commit both).
- `sim/`: the headless sim (`run.ts`), the auto-player's plan (`plan.ts`), the fit (`fit.ts`) and what is read off a
  row (`row.ts`).
- `test/`: the suite, on the engine's test kit (`watchpot/test`).

## Engine rules that bite

- Never compare Decimals with `<`, `>` or `===`: use `.lt()`, `.gte()`, `.eq()`.
- Game logic never reads the clock: use `api.now()` or the step's `ctx`. Only the store's `now` reads the wall, and
  the page reads game time through `useClockNow` / `useTickNow`.
- A store selector never returns a fresh object or Decimal (it re-renders forever): select state, compute in render.
- Changing the shape of saved state bumps `save.version` in `src/game/game.ts` with a migration step.
- `motion/react` owns `transform` and `opacity` on what it animates. Every surface honours reduced motion.
- The page styles from `--ui-*` tokens only (no hex), uses no rounded corners, and frames with box-drawing ASCII.
- `?` in the buffer whispers a hint and `:help` opens the reference sheet; neither may take focus from a control.
