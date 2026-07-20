/**
 * Music theory.
 *
 * These matter more than usual because the thing they protect cannot be
 * checked by looking at the code or by running the game in CI — it has to be
 * *heard*. Pinning the intervals is the only automated defence against the
 * score drifting back out of period.
 *
 * The specific regression: every theme was major pentatonic, and `market`
 * carried a C# and F#. Nothing in the build caught that.
 */
import { describe, it, expect } from 'vitest';
import {
  MODES,
  noteToFreq,
  noteToSemitone,
  semitoneToFreq,
  modeFreqs,
  droneFreqs,
  varyPhrase,
  phraseBeats,
  type Phrase,
} from '../src/game/audio/theory';

/** Semitones between two frequencies, rounded — for interval assertions. */
const interval = (a: number, b: number) => Math.round(12 * Math.log2(b / a));

describe('pitch', () => {
  it('anchors on A4 = 440', () => {
    expect(noteToFreq('A4')).toBeCloseTo(440, 6);
    expect(semitoneToFreq(0)).toBeCloseTo(440, 6);
  });

  it('halves a frequency per octave down', () => {
    expect(noteToFreq('A3')).toBeCloseTo(220, 6);
    expect(noteToFreq('A2')).toBeCloseTo(110, 6);
  });

  it('parses the pitches the themes are built on', () => {
    // Middle C, and the drone roots used by the score.
    expect(noteToFreq('C4')).toBeCloseTo(261.63, 1);
    expect(noteToFreq('D3')).toBeCloseTo(146.83, 1);
    expect(noteToFreq('G2')).toBeCloseTo(98.0, 1);
  });

  it('handles accidentals', () => {
    expect(noteToSemitone('A#4')).toBe(1);
    expect(noteToSemitone('Ab4')).toBe(-1);
    // Enharmonic equivalence.
    expect(noteToSemitone('C#4')).toBe(noteToSemitone('Db4'));
  });

  it('rejects nonsense rather than silently returning A4', () => {
    expect(() => noteToFreq('H4')).toThrow();
    expect(() => noteToFreq('')).toThrow();
  });
});

describe('church modes', () => {
  it('spans exactly seven degrees each', () => {
    for (const [name, steps] of Object.entries(MODES)) {
      expect(steps.length, name).toBe(7);
      expect(steps[0], name).toBe(0);
      expect(steps[6]!, name).toBeLessThan(12);
    }
  });

  it('gives Dorian a minor third and a major sixth', () => {
    // The major sixth is what separates Dorian from Aeolian, and it is the
    // reason Dorian sounds medieval rather than merely sad.
    expect(MODES.dorian[2]).toBe(3);
    expect(MODES.dorian[5]).toBe(9);
    expect(MODES.aeolian[5]).toBe(8);
  });

  it('gives Phrygian its flat second', () => {
    expect(MODES.phrygian[1]).toBe(1);
  });

  it('gives Mixolydian a major third and a flat seventh', () => {
    expect(MODES.mixolydian[2]).toBe(4);
    expect(MODES.mixolydian[6]).toBe(10);
    // That flat seventh is the whole difference from Ionian.
    expect(MODES.ionian[6]).toBe(11);
  });

  it('keeps every mode distinct', () => {
    const seen = Object.values(MODES).map((s) => s.join(','));
    expect(new Set(seen).size).toBe(seen.length);
  });
});

describe('building scales', () => {
  it('puts degree 7 an octave above degree 0', () => {
    const [low, high] = modeFreqs('D3', 'dorian', [0, 7]);
    expect(interval(low!, high!)).toBe(12);
  });

  it('handles negative degrees below the final', () => {
    const [below, root] = modeFreqs('D3', 'dorian', [-1, 0]);
    expect(below!).toBeLessThan(root!);
    // Degree -1 is the seventh of the mode below, a whole tone under D.
    expect(interval(below!, root!)).toBe(2);
  });

  it('produces no accidentals foreign to the mode', () => {
    // D Dorian is the white-note scale on D — no sharps, no flats.
    const freqs = modeFreqs('D3', 'dorian', [0, 1, 2, 3, 4, 5, 6]);
    const semis = freqs.map((f) => Math.round(12 * Math.log2(f / freqs[0]!)));
    expect(semis).toEqual([0, 2, 3, 5, 7, 9, 10]);
  });

  it('builds a drone as a bare fifth', () => {
    const [root, fifth] = droneFreqs('D2');
    expect(interval(root!, fifth!)).toBe(7);
  });

  it('adds the octave when asked', () => {
    const d = droneFreqs('D2', true);
    expect(d.length).toBe(3);
    expect(interval(d[0]!, d[2]!)).toBe(12);
  });
});

describe('period authenticity', () => {
  /**
   * The regression guard. A theme built through `modeFreqs` in a church mode
   * cannot produce the major-third-plus-major-sixth pentatonic that the old
   * hand-typed frequency lists all landed on.
   */
  it('does not produce a major pentatonic from Dorian', () => {
    const semis = MODES.dorian;
    const majorPentatonic = [0, 2, 4, 7, 9];
    expect(majorPentatonic.every((s) => semis.includes(s as never))).toBe(false);
  });

  it('keeps the period modes free of a leading tone', () => {
    // A major seventh resolving to the octave is the sound of later tonality.
    for (const name of ['dorian', 'phrygian', 'mixolydian', 'aeolian'] as const) {
      expect(MODES[name][6], name).not.toBe(11);
    }
  });
});

describe('phrase variation', () => {
  /** Deterministic sequence so the branches can be picked. */
  const fixed = (...vals: number[]) => {
    let i = 0;
    return () => vals[Math.min(i++, vals.length - 1)]!;
  };

  const base: Phrase = { degrees: [0, 2, 3, 2], beats: [1, 1, 1, 1] };

  it('often leaves the phrase alone, so the tune stays recognisable', () => {
    expect(varyPhrase(base, fixed(0.1))).toEqual(base);
  });

  it('transposes within the mode without changing the contour', () => {
    const out = varyPhrase(base, fixed(0.6, 0.1));
    const contour = (p: Phrase) => p.degrees.map((d, i) => d - p.degrees[i === 0 ? 0 : i - 1]!);
    expect(contour(out)).toEqual(contour(base));
    expect(out.degrees).not.toEqual(base.degrees);
  });

  it('preserves total length when transposing', () => {
    expect(phraseBeats(varyPhrase(base, fixed(0.6, 0.1)))).toBe(phraseBeats(base));
  });

  it('preserves total length when ornamenting', () => {
    // An ornament splits a note in two; the bar must not get longer.
    const out = varyPhrase(base, fixed(0.9, 0.0));
    expect(phraseBeats(out)).toBeCloseTo(phraseBeats(base), 6);
    expect(out.degrees.length).toBeGreaterThan(base.degrees.length);
  });

  it('always returns matching degree and beat counts', () => {
    for (const r of [0.1, 0.6, 0.9]) {
      const out = varyPhrase(base, fixed(r, 0.3));
      expect(out.degrees.length, `roll ${r}`).toBe(out.beats.length);
    }
  });

  it('never ornaments a note too short to split', () => {
    const short: Phrase = { degrees: [0, 1], beats: [0.5, 0.5] };
    const out = varyPhrase(short, fixed(0.9, 0.0));
    expect(out.degrees).toEqual(short.degrees);
  });
});
