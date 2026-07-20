/**
 * Music theory for the procedural score.
 *
 * Deliberately free of Web Audio and Phaser, so it can be unit-tested under
 * Node — the same split as `systems/skillcurve.ts`.
 *
 * ## Why this module exists
 *
 * Every theme was previously written as a hand-typed list of frequencies, and
 * all of them came out as **major pentatonic**: `menu` was G-A-B-D-E over a G
 * drone, `market` was A-B-C#-E-F# over A. That scale is the sound of folk revival
 * and film shorthand for "rustic" — it is not the sound of 1382. The market
 * theme in particular carried a C# and an F#, which is a straightforwardly
 * modern tonality.
 *
 * Music in the Ars nova period is **modal**: the church modes, built on a
 * drone, with the characteristic degrees (Dorian's major sixth, Phrygian's
 * flat second, Mixolydian's flat seventh) doing the expressive work that
 * functional harmony does later. Getting this right costs nothing and is the
 * single largest audible step toward the period.
 *
 * Tuning is equal temperament, which is itself an anachronism — Pythagorean
 * tuning would be closer. That is a deliberate limit: just intonation on a
 * drone sounds *correct* to a medievalist and sour to everyone else, and the
 * modes carry the character on their own.
 */

/* ------------------------------------------------------------------ *
 * Pitch
 * ------------------------------------------------------------------ */

/** A4 = 440 Hz. Semitone offsets are relative to it. */
const A4 = 440;

/**
 * Frequency of a note given as semitones from A4.
 * `midiToFreq(0)` is A4, `midiToFreq(-12)` is A3.
 */
export function semitoneToFreq(semitonesFromA4: number): number {
  return A4 * Math.pow(2, semitonesFromA4 / 12);
}

/** Semitone offset from A4 for a scientific-pitch name such as `'G2'`. */
export function noteToSemitone(name: string): number {
  const m = /^([A-G])([#b]?)(-?\d+)$/.exec(name);
  if (!m) throw new Error(`Unparseable note: ${name}`);
  const [, letter, accidental, octaveStr] = m;
  const base: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let semi = base[letter!]!;
  if (accidental === '#') semi += 1;
  if (accidental === 'b') semi -= 1;
  const octave = Number(octaveStr);
  // MIDI 69 is A4; C4 is MIDI 60.
  const midi = (octave + 1) * 12 + semi;
  return midi - 69;
}

export function noteToFreq(name: string): number {
  return semitoneToFreq(noteToSemitone(name));
}

/* ------------------------------------------------------------------ *
 * Modes
 * ------------------------------------------------------------------ */

/**
 * The church modes, as semitone steps from the final (the mode's tonic).
 *
 * Ionian and Aeolian are included because they existed in practice long before
 * Glarean named them in 1547 — but they are not the default for this score.
 */
export const MODES = {
  /** Minor third, **major sixth**. The workhorse of secular medieval song. */
  dorian: [0, 2, 3, 5, 7, 9, 10],
  /** **Flat second.** Severe, penitential — plague, church scrutiny, death. */
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  /** Raised fourth. Bright but unstable; used sparingly. */
  lydian: [0, 2, 4, 6, 7, 9, 11],
  /** Major third, **flat seventh.** Open and processional. */
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  /** Natural minor. */
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  /** Major. Present here for completeness; avoid for period colour. */
  ionian: [0, 2, 4, 5, 7, 9, 11],
} as const;

export type ModeName = keyof typeof MODES;

/**
 * Build a run of frequencies in a mode.
 *
 * `degrees` are scale degrees, 0-based, and may exceed the octave (7 is the
 * octave above 0) or go negative.
 */
export function modeFreqs(root: string, mode: ModeName, degrees: number[]): number[] {
  const steps = MODES[mode];
  const rootSemi = noteToSemitone(root);
  return degrees.map((d) => {
    const octave = Math.floor(d / steps.length);
    const idx = ((d % steps.length) + steps.length) % steps.length;
    return semitoneToFreq(rootSemi + steps[idx]! + octave * 12);
  });
}

/** The drone: final plus its fifth, the standard medieval accompaniment. */
export function droneFreqs(root: string, includeOctave = false): number[] {
  const rootSemi = noteToSemitone(root);
  const out = [semitoneToFreq(rootSemi), semitoneToFreq(rootSemi + 7)];
  if (includeOctave) out.push(semitoneToFreq(rootSemi + 12));
  return out;
}

/* ------------------------------------------------------------------ *
 * Phrases
 * ------------------------------------------------------------------ */

/**
 * A melodic phrase as scale degrees and durations in beats.
 *
 * The previous generator was a random walk — 75% step to the next note in a
 * list, 25% jump anywhere — which produces no phrasing at all. Real melody
 * needs repetition to be recognisable and cadence to feel finished, so themes
 * now carry actual phrases and the generator varies them rather than
 * inventing note-by-note.
 */
export interface Phrase {
  /** Scale degrees, 0 = the mode's final. */
  degrees: number[];
  /** Duration of each degree in beats; same length as `degrees`. */
  beats: number[];
}

/**
 * Vary a phrase without destroying its identity.
 *
 * `rand` is injected so tests are deterministic.
 *
 * Three transformations, in increasing order of how much they disturb the
 * shape: leave it alone, shift it up or down a scale degree, or ornament one
 * note with a neighbour. Anything more aggressive stops sounding like the same
 * tune, which is the whole point of having a tune.
 */
export function varyPhrase(p: Phrase, rand: () => number): Phrase {
  const roll = rand();
  if (roll < 0.5) return p;

  if (roll < 0.8) {
    // Transpose within the mode — same contour, different height.
    const shift = rand() < 0.5 ? 1 : -1;
    return { degrees: p.degrees.map((d) => d + shift), beats: [...p.beats] };
  }

  // Ornament: split one note into two, the second a neighbour tone. This is
  // the closest thing here to a medieval performance practice.
  const i = Math.floor(rand() * p.degrees.length);
  const degrees: number[] = [];
  const beats: number[] = [];
  p.degrees.forEach((d, k) => {
    if (k === i && p.beats[k]! >= 1) {
      degrees.push(d, d + 1);
      beats.push(p.beats[k]! / 2, p.beats[k]! / 2);
    } else {
      degrees.push(d);
      beats.push(p.beats[k]!);
    }
  });
  return { degrees, beats };
}

/** Total length of a phrase in beats. */
export function phraseBeats(p: Phrase): number {
  return p.beats.reduce((a, b) => a + b, 0);
}
