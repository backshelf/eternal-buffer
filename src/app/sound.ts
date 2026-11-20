import { createSound, type Layer, type VoiceHandle } from "watchpot/sound";

/**
 * The game's sounds: zzfx voices only, no recorded files. Every cue is a tuned stack of layers, written for the
 * engine's worklet core (`watchpot` README › Sound); tune by ear in the dev panel's sound desk.
 *
 * The mix is the spec's five buses. `keys` carries the mechanical thock, warmed by a low shelf and a little
 * saturation; `chimes` carries the bells and sends a quarter of itself into the room; `sfx` is the ceremony; `ui` is
 * the page's own clicks. `room` is a return only: nothing plays on it, the other buses send into it.
 *
 * Ten hours is a long session, so every cue sits under a conversation: the thocks are short and soft enough to type
 * through, and the loudest thing in the table is a prestige moment.
 */

/** What a play may say here, as the engine types it for this table. */
type PlayOptions = NonNullable<Parameters<typeof sound.play>[1]>;

/**
 * The wax-seal thud and warm open fifth a `:w` binds. `ascend` is the scaffold's older name for the same cue, still
 * played by the Prestige screen.
 */
const BIND_VOLUME: readonly Layer[] = [
  // the seal pressed into wax: a resonant low thud
  {
    voice: {
      wave: "sine",
      frequency: 62,
      attack: 0.002,
      decay: 0.06,
      sustain: 0.03,
      sustainVolume: 0.5,
      release: 0.16,
      slide: -1,
      volume: 0.26,
      randomness: 0.01,
      filter: -700,
    },
  },
  {
    at: 0,
    voice: {
      wave: "noise",
      frequency: 1400,
      attack: 0.002,
      sustain: 0.01,
      release: 0.06,
      volume: 0.04,
      filter: -3500,
    },
  },
  // the warm fifth rising under it: G3, D4, G4
  {
    at: 0.02,
    voice: {
      wave: "triangle",
      frequency: 196,
      attack: 0.02,
      sustain: 0.28,
      release: 0.5,
      volume: 0.09,
      filter: -2200,
    },
  },
  {
    at: 0.04,
    voice: {
      wave: "triangle",
      frequency: 294,
      attack: 0.03,
      sustain: 0.26,
      release: 0.5,
      volume: 0.075,
      filter: -2600,
    },
  },
  {
    at: 0.06,
    voice: { wave: "sine", frequency: 392, attack: 0.03, sustain: 0.24, release: 0.55, volume: 0.06 },
  },
];

export const sound = createSound({
  // The five buses, exactly as the sound spec sets them. `room` is a reverb nothing plays on; the rest send to it.
  buses: {
    room: { level: -8, fx: [{ kind: "reverb", size: 0.42, decay: 1.4, damping: 0.65, mix: 1 }] },
    keys: {
      level: -2,
      fx: [
        { kind: "eq", lowFreq: 180, lowGain: 4, highFreq: 5500, highGain: -2 },
        { kind: "saturator", drive: 3, mix: 0.35 },
      ],
      sends: { room: 0.08 },
    },
    chimes: {
      level: -3,
      fx: [{ kind: "delay", time: 0.14, feedback: 0.22, filter: 4200, mix: 0.18 }],
      sends: { room: 0.24 },
    },
    sfx: { level: -2, sends: { room: 0.18 } },
    ui: { level: -4, sends: { room: 0.06 } },
  },

  cues: {
    // --- The keyboard -------------------------------------------------------------------------------------
    // A warm woody PBT thock: a 145 Hz body under a breath of switch click. `priority: -1` lets a swarm of these
    // yield to any chime that lands under it.
    keyMotion: {
      bus: "keys",
      cooldownMs: 28,
      vary: { cents: 55, db: 1.8 },
      priority: -1,
      voices: [
        {
          voice: {
            wave: "sine",
            frequency: 145,
            attack: 0.002,
            decay: 0.03,
            sustain: 0.012,
            sustainVolume: 0.45,
            release: 0.07,
            slide: -1.4,
            volume: 0.3,
            randomness: 0.01,
            filter: -3400,
          },
        },
        {
          voice: {
            wave: "triangle",
            frequency: 1820,
            attack: 0.001,
            decay: 0.006,
            sustain: 0.003,
            sustainVolume: 0.2,
            release: 0.022,
            volume: 0.1,
            randomness: 0.02,
            filter: -9000,
          },
        },
        {
          voice: {
            wave: "noise",
            frequency: 2600,
            attack: 0.001,
            sustain: 0.002,
            release: 0.012,
            volume: 0.045,
            filter: -7000,
          },
        },
      ],
    },

    // A deeper clack for `d c y p`: 115 Hz of housing resonance, a 240 Hz knock, a crisp 2.4 kHz transient.
    keyOp: {
      bus: "keys",
      cooldownMs: 26,
      vary: { cents: 40, db: 1.5 },
      priority: -1,
      voices: [
        {
          voice: {
            wave: "sine",
            frequency: 115,
            attack: 0.002,
            decay: 0.045,
            sustain: 0.01,
            sustainVolume: 0.5,
            release: 0.085,
            slide: -1.1,
            volume: 0.34,
            randomness: 0.01,
            filter: -2600,
          },
        },
        {
          voice: {
            wave: "triangle",
            frequency: 238,
            attack: 0.002,
            decay: 0.02,
            sustain: 0.008,
            sustainVolume: 0.25,
            release: 0.05,
            volume: 0.1,
            filter: -1800,
          },
        },
        {
          voice: {
            wave: "triangle",
            frequency: 2400,
            attack: 0.001,
            decay: 0.005,
            sustain: 0.002,
            sustainVolume: 0.15,
            release: 0.022,
            volume: 0.115,
            randomness: 0.02,
            filter: -9500,
          },
        },
        {
          voice: {
            wave: "noise",
            frequency: 3200,
            attack: 0.001,
            sustain: 0.002,
            release: 0.014,
            volume: 0.05,
            filter: -8000,
          },
        },
      ],
    },

    // Insert mode: a light crisp typewriter tap, the highest jitter in the table so `jjjjjj` never machines.
    keyInsert: {
      bus: "keys",
      cooldownMs: 24,
      vary: { cents: 70, db: 2 },
      priority: -1,
      voices: [
        {
          voice: {
            wave: "triangle",
            frequency: 940,
            attack: 0.001,
            decay: 0.008,
            sustain: 0.004,
            sustainVolume: 0.3,
            release: 0.03,
            volume: 0.14,
            randomness: 0.03,
            filter: -7200,
          },
        },
        {
          voice: {
            wave: "sine",
            frequency: 420,
            attack: 0.001,
            sustain: 0.006,
            release: 0.035,
            volume: 0.12,
            randomness: 0.02,
            filter: -2600,
          },
        },
        {
          voice: {
            wave: "noise",
            frequency: 4200,
            attack: 0.001,
            sustain: 0.001,
            release: 0.009,
            volume: 0.035,
            filter: -9000,
          },
        },
      ],
    },

    // Back to Normal: two hollow toks, the second a touch lower, so `jk` sounds like a decision.
    keyEsc: {
      bus: "keys",
      cooldownMs: 45,
      vary: { cents: 25, db: 1 },
      voices: [
        {
          voice: {
            wave: "triangle",
            frequency: 260,
            attack: 0.001,
            decay: 0.02,
            sustain: 0.01,
            sustainVolume: 0.3,
            release: 0.06,
            slide: -0.8,
            volume: 0.22,
            filter: -2200,
          },
        },
        {
          voice: {
            wave: "sine",
            frequency: 390,
            attack: 0.001,
            decay: 0.015,
            sustain: 0.008,
            sustainVolume: 0.2,
            release: 0.05,
            volume: 0.1,
            filter: -3000,
          },
        },
        {
          at: 0.052,
          voice: {
            wave: "triangle",
            frequency: 205,
            attack: 0.001,
            decay: 0.018,
            sustain: 0.008,
            sustainVolume: 0.25,
            release: 0.055,
            slide: -0.6,
            volume: 0.17,
            filter: -1900,
          },
        },
        {
          at: 0.052,
          voice: {
            wave: "noise",
            frequency: 1800,
            attack: 0.001,
            sustain: 0.002,
            release: 0.014,
            volume: 0.035,
            filter: -5000,
          },
        },
      ],
    },

    // A keycap that will not move: a dull wooden knock, no transient to reach for.
    keyLocked: {
      bus: "ui",
      cooldownMs: 90,
      vary: { cents: 20, db: 1 },
      voices: [
        {
          voice: {
            wave: "sine",
            frequency: 96,
            attack: 0.002,
            decay: 0.03,
            sustain: 0.01,
            sustainVolume: 0.4,
            release: 0.06,
            slide: -0.5,
            volume: 0.2,
            filter: -700,
          },
        },
        {
          voice: {
            wave: "noise",
            frequency: 320,
            attack: 0.002,
            sustain: 0.004,
            release: 0.03,
            volume: 0.06,
            filter: -900,
          },
        },
      ],
    },

    // A rusted arrow key: a low saw creaking upwards with an 11 Hz wobble. Comical, and over before it is annoying.
    arrowRust: {
      bus: "ui",
      cooldownMs: 160,
      vary: { cents: 35, db: 1.5 },
      voices: [
        {
          voice: {
            wave: "saw",
            frequency: 122,
            attack: 0.006,
            sustain: 0.09,
            sustainVolume: 0.5,
            release: 0.16,
            slide: 1.6,
            modulation: 11,
            volume: 0.09,
            randomness: 0.02,
            filter: -1500,
          },
        },
        {
          voice: {
            wave: "triangle",
            frequency: 244,
            attack: 0.008,
            sustain: 0.06,
            release: 0.1,
            slide: 2.2,
            volume: 0.045,
            filter: -2400,
          },
        },
      ],
    },

    // --- The chimes ----------------------------------------------------------------------------------------
    // The Clean Cut: a crystalline bell-boop that climbs the Flow streak's pentatonic ladder. A5 is the rung, and
    // the top of the ladder is a C7 shimmer.
    cleanCut: {
      bus: "chimes",
      ladder: [1, 1.122, 1.26, 1.498, 1.682, 2.0, 2.245, 2.52],
      vary: { cents: 12, db: 1 },
      priority: 1,
      voices: [
        {
          voice: {
            wave: "sine",
            frequency: 880,
            attack: 0.001,
            decay: 0.05,
            sustain: 0.05,
            sustainVolume: 0.35,
            release: 0.3,
            volume: 0.14,
          },
        },
        {
          at: 0.012,
          voice: {
            wave: "sine",
            frequency: 1320,
            attack: 0.001,
            decay: 0.04,
            sustain: 0.03,
            sustainVolume: 0.2,
            release: 0.2,
            volume: 0.08,
          },
        },
        {
          at: 0.02,
          voice: { wave: "sine", frequency: 2640, attack: 0.001, sustain: 0.02, release: 0.12, volume: 0.04 },
        },
        {
          voice: {
            wave: "triangle",
            frequency: 440,
            attack: 0.001,
            sustain: 0.02,
            release: 0.08,
            volume: 0.05,
          },
        },
      ],
    },

    // Anything resolved that was not a Clean Cut: a warm two-note blip, no sparkle, so par still means something.
    mend: {
      bus: "chimes",
      vary: { cents: 18, db: 1 },
      voices: [
        {
          voice: {
            wave: "sine",
            frequency: 660,
            attack: 0.006,
            sustain: 0.05,
            sustainVolume: 0.7,
            release: 0.22,
            slide: 0.6,
            volume: 0.1,
          },
        },
        {
          at: 0.045,
          voice: {
            wave: "triangle",
            frequency: 990,
            attack: 0.008,
            sustain: 0.03,
            release: 0.16,
            volume: 0.045,
          },
        },
      ],
    },

    // A folio done: C-E-G up a bell arpeggio with a paper-turn whisper underneath it.
    folioClear: {
      bus: "chimes",
      priority: 1,
      voices: [
        {
          voice: {
            wave: "sine",
            frequency: 523.25,
            attack: 0.004,
            decay: 0.06,
            sustain: 0.06,
            sustainVolume: 0.5,
            release: 0.5,
            volume: 0.13,
          },
        },
        {
          at: 0.09,
          voice: {
            wave: "sine",
            frequency: 659.25,
            attack: 0.004,
            decay: 0.06,
            sustain: 0.06,
            sustainVolume: 0.5,
            release: 0.55,
            volume: 0.12,
          },
        },
        {
          at: 0.18,
          voice: { wave: "sine", frequency: 783.99, attack: 0.006, sustain: 0.1, release: 0.7, volume: 0.14 },
        },
        {
          at: 0.3,
          voice: {
            wave: "sine",
            frequency: 1046.5,
            attack: 0.006,
            sustain: 0.08,
            release: 0.6,
            volume: 0.07,
          },
        },
        {
          at: 0.06,
          voice: {
            wave: "noise",
            frequency: 5200,
            attack: 0.02,
            sustain: 0.05,
            release: 0.28,
            volume: 0.035,
            filter: -6000,
          },
        },
      ],
    },

    // A new keycap family: brass under a bell, a four-note climb, and a shimmer to open on. The loudest cue but one.
    actUnlock: {
      bus: "sfx",
      priority: 2,
      voices: [
        {
          voice: {
            wave: "saw",
            frequency: 130.81,
            attack: 0.09,
            sustain: 0.5,
            sustainVolume: 0.7,
            release: 0.7,
            volume: 0.1,
            filter: -1500,
          },
        },
        {
          at: 0.06,
          voice: {
            wave: "saw",
            frequency: 164.81,
            attack: 0.1,
            sustain: 0.45,
            release: 0.7,
            volume: 0.07,
            filter: -1800,
          },
        },
        {
          voice: {
            wave: "triangle",
            frequency: 261.63,
            attack: 0.02,
            sustain: 0.18,
            release: 0.35,
            volume: 0.12,
          },
        },
        {
          at: 0.11,
          voice: {
            wave: "triangle",
            frequency: 329.63,
            attack: 0.02,
            sustain: 0.18,
            release: 0.35,
            volume: 0.11,
          },
        },
        {
          at: 0.22,
          voice: { wave: "triangle", frequency: 392, attack: 0.02, sustain: 0.2, release: 0.4, volume: 0.11 },
        },
        {
          at: 0.33,
          voice: {
            wave: "triangle",
            frequency: 523.25,
            attack: 0.02,
            sustain: 0.3,
            release: 0.6,
            volume: 0.13,
          },
        },
        {
          at: 0.36,
          voice: { wave: "sine", frequency: 1046.5, attack: 0.01, sustain: 0.12, release: 0.9, volume: 0.06 },
        },
        {
          at: 0.4,
          voice: {
            wave: "sine",
            frequency: 1567.98,
            attack: 0.01,
            sustain: 0.08,
            release: 0.8,
            volume: 0.035,
          },
        },
      ],
    },

    // --- The page ------------------------------------------------------------------------------------------
    // A crisp archival stamp: a bright 880 Hz tick over a short 220 Hz thump and a breath of paper.
    buy: {
      bus: "ui",
      cooldownMs: 60,
      vary: { cents: 15, db: 1 },
      voices: [
        {
          voice: {
            wave: "triangle",
            frequency: 880,
            attack: 0.001,
            decay: 0.01,
            sustain: 0.004,
            sustainVolume: 0.2,
            release: 0.03,
            volume: 0.16,
            filter: -6000,
          },
        },
        {
          voice: {
            wave: "sine",
            frequency: 220,
            attack: 0.002,
            decay: 0.02,
            sustain: 0.008,
            sustainVolume: 0.3,
            release: 0.06,
            volume: 0.14,
            filter: -1800,
          },
        },
        {
          voice: {
            wave: "noise",
            frequency: 3000,
            attack: 0.001,
            sustain: 0.002,
            release: 0.016,
            volume: 0.05,
            filter: -9000,
          },
        },
      ],
    },

    // A keycap going down on the mosaic board: heavy magnet, 72 Hz body, a sharp 1.2 kHz seat.
    tilePlace: {
      bus: "ui",
      cooldownMs: 70,
      vary: { cents: 30, db: 1.5 },
      voices: [
        {
          voice: {
            wave: "sine",
            frequency: 72,
            attack: 0.002,
            decay: 0.05,
            sustain: 0.02,
            sustainVolume: 0.4,
            release: 0.1,
            slide: -1.2,
            volume: 0.24,
            randomness: 0.01,
            filter: -900,
          },
        },
        {
          voice: {
            wave: "triangle",
            frequency: 1180,
            attack: 0.001,
            decay: 0.008,
            sustain: 0.003,
            sustainVolume: 0.15,
            release: 0.03,
            volume: 0.1,
            filter: -8000,
          },
        },
        {
          voice: {
            wave: "noise",
            frequency: 2400,
            attack: 0.001,
            sustain: 0.004,
            release: 0.02,
            volume: 0.05,
            filter: -6500,
          },
        },
      ],
    },

    // Tilde's purr: 55 Hz with its harmonics, each frequency-modulated at its own rate so it roughens into a rumble.
    tildePurr: {
      bus: "sfx",
      priority: 1,
      voices: [
        {
          voice: {
            wave: "sine",
            frequency: 55,
            attack: 0.05,
            sustain: 0.55,
            sustainVolume: 0.75,
            release: 0.45,
            modulation: 21,
            volume: 0.2,
            filter: -800,
          },
        },
        {
          voice: {
            wave: "triangle",
            frequency: 110,
            attack: 0.06,
            sustain: 0.5,
            release: 0.4,
            modulation: 17,
            volume: 0.06,
            filter: -1200,
          },
        },
        {
          voice: {
            wave: "sine",
            frequency: 165,
            attack: 0.09,
            sustain: 0.42,
            release: 0.4,
            modulation: 13,
            volume: 0.035,
            filter: -1600,
          },
        },
      ],
    },

    // A moth caught: a fluttering climb through the high register, and a wingbeat of noise behind it.
    catch: {
      bus: "sfx",
      vary: { cents: 20, db: 1.2 },
      voices: [
        {
          voice: { wave: "sine", frequency: 1568, attack: 0.001, sustain: 0.01, release: 0.12, volume: 0.08 },
        },
        {
          at: 0.035,
          voice: {
            wave: "sine",
            frequency: 1975.53,
            attack: 0.001,
            sustain: 0.01,
            release: 0.13,
            volume: 0.075,
          },
        },
        {
          at: 0.07,
          voice: {
            wave: "sine",
            frequency: 2349.32,
            attack: 0.001,
            sustain: 0.01,
            release: 0.15,
            volume: 0.07,
          },
        },
        {
          at: 0.105,
          voice: {
            wave: "sine",
            frequency: 3135.96,
            attack: 0.001,
            sustain: 0.012,
            release: 0.2,
            volume: 0.06,
          },
        },
        {
          at: 0.13,
          voice: {
            wave: "noise",
            frequency: 6200,
            attack: 0.01,
            sustain: 0.03,
            release: 0.18,
            volume: 0.03,
            filter: -10000,
          },
        },
      ],
    },

    // A tile of the Marginalia wall lighting up: a bright G5 with its D6 and G6 over it.
    earned: {
      bus: "chimes",
      vary: { cents: 15, db: 1 },
      priority: 1,
      voices: [
        { voice: { wave: "sine", frequency: 784, attack: 0.004, sustain: 0.06, release: 0.3, volume: 0.13 } },
        {
          at: 0.07,
          voice: { wave: "sine", frequency: 1175, attack: 0.004, sustain: 0.08, release: 0.4, volume: 0.12 },
        },
        {
          at: 0.07,
          voice: { wave: "sine", frequency: 1568, attack: 0.004, sustain: 0.05, release: 0.3, volume: 0.04 },
        },
      ],
    },

    // `:w`: the seal thud and its warm fifth. `ascend` is the scaffold's name for the same thing, kept for old calls.
    bindVolume: { bus: "sfx", priority: 2, voices: BIND_VOLUME },
    ascend: { bus: "sfx", priority: 2, voices: BIND_VOLUME },

    // `:wq`: four seconds of ceremony — a bell, a phosphor sweep falling away, and a deep chord rising from under it.
    rebindCodex: {
      bus: "sfx",
      priority: 3,
      voices: [
        {
          voice: {
            wave: "sine",
            frequency: 880,
            attack: 0.004,
            sustain: 0.25,
            sustainVolume: 0.6,
            release: 2.4,
            volume: 0.12,
          },
        },
        {
          at: 0.01,
          voice: { wave: "sine", frequency: 1320, attack: 0.004, sustain: 0.2, release: 2.2, volume: 0.05 },
        },
        {
          at: 0.02,
          voice: { wave: "sine", frequency: 1760, attack: 0.004, sustain: 0.18, release: 2, volume: 0.03 },
        },
        {
          at: 0.15,
          voice: {
            wave: "saw",
            frequency: 2400,
            attack: 0.02,
            sustain: 1.1,
            release: 0.7,
            slide: -3.8,
            volume: 0.055,
            randomness: 0,
            filter: -4200,
          },
        },
        {
          at: 0.15,
          voice: {
            wave: "sine",
            frequency: 2400,
            attack: 0.02,
            sustain: 1.1,
            release: 0.7,
            slide: -3.8,
            volume: 0.04,
          },
        },
        {
          at: 1.9,
          voice: {
            wave: "saw",
            frequency: 65.41,
            attack: 0.12,
            sustain: 1.2,
            sustainVolume: 0.8,
            release: 0.9,
            slide: 0.087,
            volume: 0.12,
            filter: -1600,
          },
        },
        {
          at: 2,
          voice: {
            wave: "saw",
            frequency: 98,
            attack: 0.14,
            sustain: 1.1,
            release: 0.85,
            slide: 0.13,
            volume: 0.07,
            filter: -1900,
          },
        },
        {
          at: 2.15,
          voice: {
            wave: "triangle",
            frequency: 130.81,
            attack: 0.16,
            sustain: 1,
            release: 0.8,
            slide: 0.175,
            volume: 0.09,
            filter: -2400,
          },
        },
        {
          at: 3,
          voice: { wave: "sine", frequency: 523.25, attack: 0.1, sustain: 0.4, release: 0.7, volume: 0.06 },
        },
      ],
    },
  },

  volume: 0.34,
  // The player's own hand is where it landed, as written: no distance, no extra room, no pull towards the middle.
  presence: { mine: { db: 0, sendDb: 0, distance: 0 } },
});

/** A cue's name, as `sound.play` takes it. Kept for anything that names a cue by type. */
export type Cue = Parameters<typeof sound.play>[0];

/**
 * Whether sound is on, as the page's setting last said. `sound.ts` never reads the store: the page sets this once at
 * mount and on every change of `settings.sound`, and every wrapper below asks it before playing.
 */
let turnedOn = true;

/** Says whether the page's sound setting is on. */
export function setSoundEnabled(on: boolean): void {
  turnedOn = on;
}

/** Whether the page's sound setting is on. */
export function isSoundEnabled(): boolean {
  return turnedOn;
}

/** Every wrapper's play: a no-op while the page's setting is off. */
function play(cue: Cue, options?: PlayOptions): VoiceHandle | null {
  return turnedOn ? sound.play(cue, options) : null;
}

/** The player's arms on the keys: which cue a press is. */
export type KeyThock = "motion" | "op" | "insert" | "esc" | "locked" | "rust";

const THOCK: Record<KeyThock, Cue> = {
  motion: "keyMotion",
  op: "keyOp",
  insert: "keyInsert",
  esc: "keyEsc",
  locked: "keyLocked",
  rust: "arrowRust",
};

/**
 * One key press under the fingers. The cues are left unmarked (`mine`), so the typing cue's own `cooldownMs` holds a
 * held `jjjjjj` to one thock a frame instead of a machine-gun; a call that knows it is the player's may pass
 * `{ mine: true }` and trade that cooldown for presence.
 */
export function playKeyThock(kind: KeyThock, options?: PlayOptions): VoiceHandle | null {
  return play(THOCK[kind], options);
}

/** How a resolved anomaly sounded: at par, within three keys of it, or over. */
export type EditGrade = "clean" | "tidy" | "mended";

/**
 * A resolved anomaly: a Clean Cut climbs the pentatonic ladder by the Flow streak it landed at, and anything else is
 * the warm `mend`, three dB softer when the edit ran well over par.
 */
export function playEditFeedback(
  grade: EditGrade,
  flowStep: number,
  options?: PlayOptions,
): VoiceHandle | null {
  if (grade === "clean") return play("cleanCut", { ...options, step: Math.max(0, Math.floor(flowStep)) });
  return play("mend", { ...options, db: (options?.db ?? 0) + (grade === "mended" ? -3 : 0) });
}

/** The folio is clear. */
export function playFolioClear(options?: PlayOptions): VoiceHandle | null {
  return play("folioClear", options);
}

/** A new Act's keycap family is open. */
export function playActUnlock(options?: PlayOptions): VoiceHandle | null {
  return play("actUnlock", options);
}

/** Tilde is being petted. */
export function playTildePurr(options?: PlayOptions): VoiceHandle | null {
  return play("tildePurr", options);
}

/** A keycap tile snaps into the mosaic. */
export function playTilePlace(options?: PlayOptions): VoiceHandle | null {
  return play("tilePlace", options);
}

/** `:w`, a Volume bound. */
export function playBindVolume(options?: PlayOptions): VoiceHandle | null {
  return play("bindVolume", options);
}

/** `:wq`, the Codex rebound. */
export function playRebindCodex(options?: PlayOptions): VoiceHandle | null {
  return play("rebindCodex", options);
}

/** Anything bought. */
export function playBuy(options?: PlayOptions): VoiceHandle | null {
  return play("buy", options);
}

/** The Margin Moth caught. */
export function playCatch(options?: PlayOptions): VoiceHandle | null {
  return play("catch", options);
}

/** A tile of the wall earned. */
export function playEarned(options?: PlayOptions): VoiceHandle | null {
  return play("earned", options);
}
