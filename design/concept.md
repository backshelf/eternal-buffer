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
