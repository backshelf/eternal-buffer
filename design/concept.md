# The Eternal Buffer

The game's concept as the scaffold took it down. The answers themselves are in `answers.json` beside this file.

## Fiction

You are a midnight archivist mending an infinite, glitching manuscript of reality in a glowing modal editor. Motions carve clean signal from rot, operators stitch broken folios, and a stray cat named Tilde naps on your statusline.

**Voice.** Warm, dryly witty, bookish-weird. Nocturnal archivist meets antique Unix terminal. Short sentences with tactile physical details and cheeky Vim lore.

**Who plays.** Someone who enjoys active keyboard-driven incrementals over long desk sittings and wants to build real Vim muscle memory slowly and delightfully.

## Loop

- **Buffer.** 8 generators make glyphs: Wax-Sealed Moth, Margin Quill, Tallow Candle, Lead Typesetter, Bellows Press, Index Automaton, Phosphor Loom, Null Archivist.
- **Codex.** An upgrade tree (Keycap Codex) of 12 nodes, bought with glyphs.
- **Volumes.** :w Bind Volume resets the run for Seals, each one raising clarity for good.
- **Marginalia.** A wall of 16 (Marginalia), eight to a row; each earned raises clarity, a full row more.
- **Margin Moth.** Turns up every few minutes and stays a few seconds; caught, it starts Phosphor Rush: clarity ×3 for 60 seconds.

Stats: Clarity (output), Night Watch (offline share), Seal Yield (prestige gain).

## Session

Built for long sittings: two or three a day, most of an hour each, the tab often left open. The pacing contract is `src/content/pacing.ts`.

## Look

- Palette: ground `#110f0d`, ink `#ebe3d0`, signal `#e59a28`.
- Type: Cardo (display), Work Sans (interface), Martian Mono (numbers), from Google Fonts.
- **The surface.** An amber phosphor monitor printing onto coarse Bayer-dithered soot: a warm 4x4 ordered-dither light pool breathes around your Vim cursor, ripples outward on Clean Cuts, thickens with Flow, and casts dot-screen light behind every ASCII panel. (scaffolded on the `print` starter in `src/shaders/`, to be replaced.)
- **The moment.** Typing :wq to Rebind the Codex for the first time literally writes-and-quits the buffer: every line collapses into Bayer-dithered amber dust under a sweeping raster curtain, Tilde pads across the blank void leaving a glowing ~ trail, and the archive reboots into a richer dual-split strata.

## The Shape

Seven Acts of a Vim curriculum, each unlocking a family of real keys: Footwork (`hjkl`, `x`, `i`/`Esc`), Strides & Snipes (`w b e`, `0 $ ^`, `f t`, `gg G`, counts), Verbs & Composition (`d c y`, `o r ~ J`), Objects & Visual (`iw i" i(`, `v`/`Ctrl-v`, `% > <`), Lantern & Substitute (`/ ? n`, `{ } m`, `:%s`), Echoes & Choreography (`.`, registers, `q`/`@`), and The Ex-Console (`:g`, `:v`, `:norm`, `:sort`, `:vsplit`, `.vimrc`). A key family, once unlocked, is never taken back by any prestige.

The loop is a Living Folio: ten to sixteen lines of corrupted manuscript with two to six anomalies. Walk to an anomaly and repair it in the editor; a repair at or under its par pays a Clean Cut, feeds Flow, and records the Grammar pair if the idiom is new. Clear the folio for a burst, then roll the next.

## The Surface

An amber CRT vellum: soot ground, bone ink, phosphor amber signal, zero radius, box-drawing frames and Bayer-dithered stipple. Cardo for display, Work Sans for interface, Martian Mono for the buffer, keycaps and every number. Four custom WebGL2 shaders carry it: a dithered archive backdrop that breathes with heat, flow and depth; a cursor-halo under the hero buffer that rings on every Clean Cut; a tile foil behind mosaic cells and affordable keycaps; and the full-page `:wq` Codex Rebind moment.

## The Invention

The Vim itself is the game. Real CodeMirror 6 with `@replit/codemirror-vim`, `imap jk <Esc>` from the first minute, a progressive key gate that locks what you have not learned yet and whispers the Act that unlocks it, arrow keys that rust after three training anomalies, adaptive hints that appear on four seconds of idle and retire after five clean uses, and a Chalkboard of physical keycaps that depress as you type. Payouts reward idiomatic grammar: par keystrokes pay a Clean Cut, discovered operator-motion pairs multiply Clarity for good, and the endgame is macros and `:g` sweeping whole folios.

## The Pacing Plan

Ten played hours is the floor; the main arc runs twelve to sixteen, and a completionist run about eighteen to twenty. Act II near half an hour, the first `:w Bind Volume` around an hour and a half, Act IV by four hours, Act V by six, the first `:wq Rebind Codex` around seven, Act VII around ten. Active Vim always pays more than idle Scribes: the Scribes brew Ink, the currency the break-from-typing systems spend, plus a glyph trickle capped at fifteen to forty percent of active play. No active stretch waits more than about two minutes for its next meaningful payoff.
