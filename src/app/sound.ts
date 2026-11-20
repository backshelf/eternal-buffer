import { createSound } from "watchpot/sound";

/**
 * The game's sounds: zzfx voices only, no recorded files. A cue is a list of layered voices (`watchpot` README ›
 * Sound); tune by ear in the dev panel's sound view or by editing the numbers. They are placeholders: the feel pass
 * designs this game's own, from packs of recordings (`node_modules/watchpot/docs/sound-packs.md`: `takes` on a cue, the
 * voices kept as the fallback).
 *
 * The mix: five buses exist already (`sfx`, `ui`, `music`, `ambience`, `voice`); `buy` and `press` play on `ui`, the
 * rest on `sfx`, and both send a little to `room`, a reverb that hears only what is sent to it (`sound-mix.md`, beside `sound-packs.md`).
 */
export const sound = createSound({
  cues: {
    buy: {
      bus: "ui",
      voices: [{ voice: { frequency: 520, attack: 0.005, sustain: 0.02, release: 0.08, wave: "triangle" } }],
    },
    ascend: {
      voices: [
        {
          voice: {
            frequency: 180,
            slide: 2,
            attack: 0.05,
            sustain: 0.4,
            release: 0.6,
            wave: "saw",
            filter: -900,
          },
        },
        {
          voice: { frequency: 360, slide: 2, attack: 0.05, sustain: 0.4, release: 0.6, wave: "sine" },
          at: 0.05,
        },
      ],
    },
    earned: {
      voices: [
        { voice: { frequency: 784, attack: 0.01, sustain: 0.06, release: 0.25, wave: "sine" } },
        { voice: { frequency: 1175, attack: 0.01, sustain: 0.08, release: 0.35, wave: "sine" }, at: 0.07 },
      ],
    },
    catch: {
      voices: [
        { voice: { frequency: 260, slide: 3, attack: 0.01, sustain: 0.05, release: 0.2, wave: "triangle" } },
        {
          voice: { frequency: 520, slide: 2, attack: 0.01, sustain: 0.05, release: 0.25, wave: "sine" },
          at: 0.06,
        },
      ],
    },
  },
  buses: {
    room: { level: -6, fx: [{ kind: "reverb", size: 0.5, decay: 2, damping: 0.5, mix: 1 }] },
    sfx: { sends: { room: 0.15 } },
    ui: { sends: { room: 0.08 } },
  },
  volume: 0.3,
});

export type Cue = Parameters<typeof sound.play>[0];
