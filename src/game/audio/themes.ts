/**
 * The themes, rewritten modally.
 *
 * Previously each theme was a hand-typed list of frequencies, and every one of
 * them landed on **major pentatonic** — `menu` was G-A-B-D-E, `market` was
 * A-B-C#-E-F#. That is the sound of folk revival, not of 1382, and the market
 * theme's C#/F# is plainly modern.
 *
 * Each theme now declares a final, a church mode and actual phrases. Mode
 * choice is the main expressive lever:
 *
 *   - **Dorian** (minor third, *major* sixth) — the workhorse of secular song.
 *     Warm but not sweet. Bath, family, market, road.
 *   - **Phrygian** (flat second) — severe and penitential. Plague, war,
 *     the endgame's darker turns.
 *   - **Mixolydian** (major third, flat seventh) — open, processional, no
 *     leading tone pulling home. Menu, endings, monastery.
 *   - **Aeolian** — kept for night and for the quieter interiors.
 *
 * Tempi are slow throughout. Medieval secular music was not, but this is
 * background score for a management game and has to survive hours of looping.
 */
import type { ModeName, Phrase } from './theory';

export type MusicId =
  | 'menu'
  | 'bath'
  | 'road'
  | 'tense'
  | 'market'
  | 'festival'
  | 'monastery'
  | 'war'
  | 'politics'
  | 'family'
  | 'dialogue'
  | 'travel_result'
  | 'ending'
  | 'night'
  | 'none';

export interface ThemeSpec {
  /** Scientific pitch of the drone's root, e.g. `'D2'`. */
  root: string;
  mode: ModeName;
  /** Beats per minute. The scheduler quantises everything to this. */
  bpm: number;
  /** Beats per bar — 6 gives the compound feel common in the period. */
  beatsPerBar: number;
  /** Melodic material. The generator cycles and varies these. */
  phrases: Phrase[];
  /** Add the octave above the drone's root and fifth. */
  droneOctave?: boolean;
  droneVol: number;
  /** Which octave the melody sits in, relative to the drone root. */
  melodyOctave: number;
  melodyVol: number;
  /** Bars of rest between phrases — silence is part of the music. */
  restBars: [number, number];
  /** Low drum on the bar, for travel and war. */
  drum?: { freq: number; vol: number; everyBeats: number };
  /** Master lowpass, for darkness. */
  lowpass: number;
  /** Reverb send, 0..1. Stone rooms get more. */
  reverb: number;
}

/* Common phrase shapes, reused across themes so the score feels of a piece. */

/** Rise to the fifth and fall back — the most idiomatic medieval contour. */
const ARCH: Phrase = { degrees: [0, 2, 4, 2, 0], beats: [1, 1, 2, 1, 3] };
/** A gentle turn around the final. */
const TURN: Phrase = { degrees: [0, 1, 0, -1, 0], beats: [1, 1, 1, 1, 2] };
/** Reach for the octave and settle — used where a theme needs to open out. */
const REACH: Phrase = { degrees: [0, 4, 7, 4, 2, 0], beats: [1, 1, 2, 1, 1, 2] };
/** Descent to the final; reads as a cadence. */
const CADENCE: Phrase = { degrees: [4, 3, 2, 1, 0], beats: [1, 1, 1, 1, 4] };

export const THEMES: Record<Exclude<MusicId, 'none'>, ThemeSpec> = {
  /** Title. Mixolydian: open and inviting, with no leading tone to date it. */
  menu: {
    root: 'G2',
    mode: 'mixolydian',
    bpm: 56,
    beatsPerBar: 6,
    phrases: [ARCH, REACH, TURN],
    droneOctave: true,
    droneVol: 0.2,
    melodyOctave: 2,
    melodyVol: 0.13,
    restBars: [1, 2],
    lowpass: 2600,
    reverb: 0.32,
  },

  /** Bathhouse. Dorian, slow, the major sixth keeping it warm rather than sad. */
  bath: {
    root: 'F2',
    mode: 'dorian',
    bpm: 48,
    beatsPerBar: 6,
    phrases: [TURN, ARCH],
    droneVol: 0.2,
    melodyOctave: 2,
    melodyVol: 0.11,
    restBars: [1, 3],
    lowpass: 1900,
    reverb: 0.45, // wet stone
  },

  /** The road. Dorian with a cart-step drum on the beat. */
  road: {
    root: 'D2',
    mode: 'dorian',
    bpm: 72,
    beatsPerBar: 4,
    phrases: [ARCH, CADENCE],
    droneVol: 0.17,
    melodyOctave: 2,
    melodyVol: 0.11,
    restBars: [0, 1],
    drum: { freq: 62, vol: 0.07, everyBeats: 2 },
    lowpass: 1700,
    reverb: 0.18, // outdoors, little reflection
  },

  /** Epidemic and danger. Phrygian — the flat second does the work. */
  tense: {
    root: 'E2',
    mode: 'phrygian',
    bpm: 44,
    beatsPerBar: 4,
    phrases: [
      { degrees: [0, 1, 0], beats: [2, 2, 4] },
      { degrees: [0, 1, 2, 1, 0], beats: [1, 1, 2, 1, 3] },
    ],
    droneVol: 0.18,
    melodyOctave: 1,
    melodyVol: 0.09,
    restBars: [1, 2],
    lowpass: 950,
    reverb: 0.3,
  },

  /** Market. Dorian, quicker, a light tabor pulse. */
  market: {
    root: 'A2',
    mode: 'dorian',
    bpm: 88,
    beatsPerBar: 6,
    phrases: [REACH, ARCH, { degrees: [4, 5, 4, 2, 0], beats: [1, 1, 1, 1, 2] }],
    droneVol: 0.14,
    melodyOctave: 2,
    melodyVol: 0.11,
    restBars: [0, 1],
    drum: { freq: 88, vol: 0.05, everyBeats: 3 },
    lowpass: 3000,
    reverb: 0.2,
  },

  /** Festival fallback: brighter than the market, but still modal and acoustic. */
  festival: {
    root: 'D3',
    mode: 'mixolydian',
    bpm: 92,
    beatsPerBar: 6,
    phrases: [REACH, ARCH, TURN],
    droneVol: 0.12,
    melodyOctave: 2,
    melodyVol: 0.1,
    restBars: [0, 1],
    drum: { freq: 92, vol: 0.05, everyBeats: 3 },
    lowpass: 3100,
    reverb: 0.16,
  },

  /** Monastery. Mixolydian, very slow, wide open fifths — closest to chant. */
  monastery: {
    root: 'F2',
    mode: 'mixolydian',
    bpm: 40,
    beatsPerBar: 4,
    phrases: [
      { degrees: [0, 1, 2, 1], beats: [3, 1, 3, 1] },
      { degrees: [2, 1, 0], beats: [3, 2, 5] },
    ],
    droneOctave: true,
    droneVol: 0.2,
    melodyOctave: 2,
    melodyVol: 0.09,
    restBars: [2, 4],
    lowpass: 1500,
    reverb: 0.62, // a nave
  },

  /** War camp. Phrygian with a slow drum. */
  war: {
    root: 'C2',
    mode: 'phrygian',
    bpm: 60,
    beatsPerBar: 4,
    phrases: [CADENCE, { degrees: [0, 1, 0, -2], beats: [2, 1, 2, 3] }],
    droneVol: 0.19,
    melodyOctave: 1,
    melodyVol: 0.1,
    restBars: [1, 2],
    drum: { freq: 52, vol: 0.09, everyBeats: 4 },
    lowpass: 1250,
    reverb: 0.22,
  },

  /** Council and guild. Aeolian, measured, faintly formal. */
  politics: {
    root: 'G2',
    mode: 'aeolian',
    bpm: 52,
    beatsPerBar: 4,
    phrases: [TURN, CADENCE],
    droneVol: 0.17,
    melodyOctave: 2,
    melodyVol: 0.1,
    restBars: [1, 2],
    lowpass: 2100,
    reverb: 0.38,
  },

  /** Hearth and family. Dorian, the warmest setting in the score. */
  family: {
    root: 'Bb2',
    mode: 'dorian',
    bpm: 54,
    beatsPerBar: 6,
    phrases: [ARCH, TURN, REACH],
    droneVol: 0.16,
    melodyOctave: 2,
    melodyVol: 0.11,
    restBars: [1, 2],
    lowpass: 2400,
    reverb: 0.3,
  },

  /** Under conversation. Sparse by design — it must not compete with reading. */
  dialogue: {
    root: 'F#2',
    mode: 'dorian',
    bpm: 46,
    beatsPerBar: 4,
    phrases: [{ degrees: [0, 2, 0], beats: [3, 3, 6] }],
    droneVol: 0.15,
    melodyOctave: 2,
    melodyVol: 0.07,
    restBars: [3, 5],
    lowpass: 1600,
    reverb: 0.35,
  },

  /** Arrival after travel. */
  travel_result: {
    root: 'E2',
    mode: 'dorian',
    bpm: 64,
    beatsPerBar: 4,
    phrases: [ARCH, CADENCE],
    droneVol: 0.16,
    melodyOctave: 2,
    melodyVol: 0.1,
    restBars: [0, 1],
    lowpass: 1800,
    reverb: 0.28,
  },

  /** Endings. Mixolydian, the fullest drone, reaching to the octave. */
  ending: {
    root: 'G2',
    mode: 'mixolydian',
    bpm: 50,
    beatsPerBar: 6,
    phrases: [REACH, ARCH, CADENCE],
    droneOctave: true,
    droneVol: 0.21,
    melodyOctave: 2,
    melodyVol: 0.12,
    restBars: [1, 2],
    lowpass: 2800,
    reverb: 0.5,
  },

  /** Night. Aeolian, very sparse and low. */
  night: {
    root: 'D2',
    mode: 'aeolian',
    bpm: 42,
    beatsPerBar: 4,
    phrases: [{ degrees: [0, -1, 0], beats: [4, 2, 6] }, TURN],
    droneVol: 0.15,
    melodyOctave: 2,
    melodyVol: 0.07,
    restBars: [3, 6],
    lowpass: 1100,
    reverb: 0.4,
  },
};
