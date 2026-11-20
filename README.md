# The Eternal Buffer

You are a midnight archivist mending an infinite, glitching manuscript of reality in a glowing modal editor. Motions
carve clean signal from rot, operators stitch broken folios, and a stray cat named Tilde naps on your statusline.

The buffer is a real Vim: CodeMirror 6 with `@replit/codemirror-vim`, `imap jk <Esc>` from the first minute, and a
seven-Act curriculum that opens Keycap Families (motions, operators, text objects, macros, the Ex console) as you
mend. Every anomaly you clear is paid by how cleanly you cleared it, so a `f` + `;` snipe earns far more than a
dozen `l`s. The desk keeps earning while you read: ten Scribes brew Ink for the Plugin Mosaic and the Margin
Expeditions, expeditions come back offline, and `:w` binds a Volume while `:wq` rebinds the Codex and plays the
game's one big moment. It is an idle game that wants your hands on the keyboard: active play always out-earns a
desk left alone.

An idle game on the watchpot engine (1.0.0-rc.12). Built for long sittings: two or three a day, most of an hour
each, the tab often left open.

Most of this game's code was written by an AI model (Claude, through OpenCode) working from a plan and a spec that a
person reviewed; the design, the pacing and every call about what the game should feel like are the person's.

Needs Bun 1.4.3 or later (`bun check` typechecks).

## Commands

```sh
bun install
bun run dev        # http://localhost:3000 (PORT=<n> for another); #dev opens the dev panel and the :wq replay
bun run verify     # typecheck and lint
bun test           # the suite
bun run gates      # typecheck, lint, the build; gates:full adds the pacing contract
bun run sim -- --contract     # twelve played hours on the auto-player, judged against the pacing bands
bun run sim -- --sessions     # a week of a person coming and going, never judged
bun sim/fit.ts     # price the Keycap Families at the plan's gates; --check fails on drift
bun run tokens     # after editing design/tokens.json
bun run lint:fix   # format
```

## Where things are

- `src/content/` the data: the words (`words.ts`), the economy and pacing, the Vim curriculum (`vimActs.ts`), the
  folios, and one file per system (Mosaic, Expeditions, trials, achievements, ticker, Easter eggs, `fitTable.ts`).
- `src/game/` the features on the engine's factories (`wallet`, `settings`, `stats`, `vim`, the two prestige layers,
  the board, missions, trials, the wall, visitors, records, the Scribes), `income.ts` (the active-first rates),
  `game.ts` (`defineGame`, the feature order and the save) and the store.
- `src/vim/` the DOM-free Vim core: the gate, the Grammar Codex classifier and the folio generator, played the same
  way by the page, the sim and the tests.
- `src/components/` the hero editor and its furniture: `BufferEditor`, `ExLine`, `Chalkboard`, `TildeBar`,
  `MomentOverlay`, `AwayModal`, each with its CSS module.
- `src/app/` the page: `App.tsx` over the `Shell`, the seven tabs, the header, the settings and Vim reference sheets,
  the icons, the sounds, the archive's feel, the visitor and the news, and `hooks.ts`.
- `src/screens/` one screen per tab; the Buffer is composed in `Make.tsx` around the hero editor.
- `src/ui/` the game's own components over the engine's headless `watchpot/ui`, each with its CSS module, and
  `theme.css` (the `--ui-*` token contract); `src/ui/README.md` lists every token.
- `src/shaders/` the four GLSL surfaces and their CSS stills: the archive room, the buffer's cursor halo, the tile
  foil and the `:wq` Moment.
- `design/tokens.json` the palette and type, compiled to `src/tokens.css` by `bun run tokens` (commit both).
- `sim/` the headless sim (`run.ts`), the auto-player's plan (`plan.ts`), the fit (`fit.ts`) and what it reads off a
  row (`row.ts`).
- `test/` the suite, written on the engine's test kit (`watchpot/test`).

The engine's guide is its `README.md` and `docs/` (`node_modules/watchpot/`). To move to a newer engine, change the
tag on `watchpot` in `package.json` and run `bun install`.
