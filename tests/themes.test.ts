/**
 * The themes themselves.
 *
 * I cannot hear the result, and neither can CI — so everything checkable has
 * to be checked structurally. These tests exist to catch the class of mistake
 * that produced the original problem: a theme that is technically valid, and
 * musically wrong.
 *
 * They deliberately assert on *audible consequences* (what pitch comes out,
 * how long a phrase lasts, whether a mode is period-appropriate) rather than
 * on the shape of the data.
 */
import { describe, it, expect } from 'vitest';
import { THEMES, type ThemeSpec } from '../src/game/audio/themes';
import { MODES, noteToSemitone, semitoneToFreq, phraseBeats } from '../src/game/audio/theory';

const entries = Object.entries(THEMES) as Array<[string, ThemeSpec]>;

/** Every pitch a theme's melody can produce, in Hz. */
function melodyPitches(spec: ThemeSpec): number[] {
  const steps = MODES[spec.mode];
  const rootSemi = noteToSemitone(spec.root) + spec.melodyOctave * 12;
  const out: number[] = [];
  for (const phrase of spec.phrases) {
    // Ornamentation can add a degree above any note, so include +1.
    for (const deg of phrase.degrees.flatMap((d) => [d, d + 1])) {
      const octave = Math.floor(deg / steps.length);
      const idx = ((deg % steps.length) + steps.length) % steps.length;
      out.push(semitoneToFreq(rootSemi + steps[idx]! + octave * 12));
    }
  }
  return out;
}

describe('theme coverage', () => {
  it('defines every music id the game can request', () => {
    // A missing theme would throw at runtime inside `music()`.
    expect(entries.length).toBe(14);
  });

  it('gives every theme phrases to play', () => {
    for (const [name, spec] of entries) {
      expect(spec.phrases.length, name).toBeGreaterThan(0);
      for (const p of spec.phrases) {
        expect(p.degrees.length, name).toBe(p.beats.length);
        expect(phraseBeats(p), name).toBeGreaterThan(0);
      }
    }
  });
});

describe('period authenticity', () => {
  it('uses no Ionian — major is the sound of a later century', () => {
    // This is the regression. Every theme used to be major pentatonic.
    for (const [name, spec] of entries) {
      expect(spec.mode, `${name} is in a major mode`).not.toBe('ionian');
    }
  });

  it('leans on the modes that actually carry the period', () => {
    const modes = entries.map(([, s]) => s.mode);
    const periodModes = modes.filter((m) =>
      ['dorian', 'phrygian', 'mixolydian'].includes(m),
    );
    // Aeolian is permitted for night and interiors, but must not dominate.
    expect(periodModes.length).toBeGreaterThanOrEqual(modes.length - 3);
  });

  it('produces no leading tone below the final in any theme', () => {
    // A semitone resolving upward into the tonic is the giveaway of tonality.
    for (const [name, spec] of entries) {
      const steps = MODES[spec.mode];
      expect(steps[6], `${name} has a leading tone`).not.toBe(11);
    }
  });

  it('picks a severe mode for the grim contexts', () => {
    // Plague and war should not sound warm.
    expect(THEMES.tense.mode).toBe('phrygian');
    expect(THEMES.war.mode).toBe('phrygian');
  });
});

describe('audible ranges', () => {
  it('keeps every melody pitch in a sane register', () => {
    // Too low turns to mud under the drone; too high is piercing over hours.
    for (const [name, spec] of entries) {
      for (const f of melodyPitches(spec)) {
        expect(f, `${name} melody at ${Math.round(f)} Hz`).toBeGreaterThan(90);
        expect(f, `${name} melody at ${Math.round(f)} Hz`).toBeLessThan(2000);
      }
    }
  });

  it('keeps the melody above its own drone', () => {
    for (const [name, spec] of entries) {
      const droneRoot = semitoneToFreq(noteToSemitone(spec.root));
      const lowest = Math.min(...melodyPitches(spec));
      expect(lowest, `${name} melody dips into the drone`).toBeGreaterThan(droneRoot);
    }
  });

  it('uses tempi slow enough to loop for hours', () => {
    for (const [name, spec] of entries) {
      expect(spec.bpm, name).toBeGreaterThanOrEqual(40);
      expect(spec.bpm, name).toBeLessThanOrEqual(96);
    }
  });
});

describe('mix', () => {
  it('keeps the melody quieter than the drone bed', () => {
    // The melody is the thing that grates when it is too loud on a long loop.
    for (const [name, spec] of entries) {
      expect(spec.melodyVol, name).toBeLessThan(spec.droneVol);
    }
  });

  it('holds every level low enough to sit under dialogue', () => {
    for (const [name, spec] of entries) {
      expect(spec.droneVol, name).toBeLessThanOrEqual(0.25);
      expect(spec.melodyVol, name).toBeLessThanOrEqual(0.15);
    }
  });

  it('makes the dialogue theme the sparsest of all', () => {
    // It plays under text the player is reading.
    const others = entries.filter(([n]) => n !== 'dialogue').map(([, s]) => s.melodyVol);
    expect(THEMES.dialogue.melodyVol).toBeLessThanOrEqual(Math.min(...others));
    expect(THEMES.dialogue.restBars[0]).toBeGreaterThanOrEqual(2);
  });

  it('gives stone rooms more reverb than the open road', () => {
    expect(THEMES.monastery.reverb).toBeGreaterThan(THEMES.road.reverb);
    expect(THEMES.bath.reverb).toBeGreaterThan(THEMES.road.reverb);
    for (const [name, spec] of entries) {
      expect(spec.reverb, name).toBeGreaterThanOrEqual(0);
      expect(spec.reverb, name).toBeLessThanOrEqual(0.7);
    }
  });

  it('darkens the lowpass for the grim themes', () => {
    expect(THEMES.tense.lowpass).toBeLessThan(THEMES.menu.lowpass);
    expect(THEMES.war.lowpass).toBeLessThan(THEMES.market.lowpass);
  });
});

describe('rests', () => {
  it('orders every rest range low-to-high', () => {
    // Reversed bounds would make the scheduler's Math.random pick negative.
    for (const [name, spec] of entries) {
      expect(spec.restBars[0], name).toBeLessThanOrEqual(spec.restBars[1]);
      expect(spec.restBars[0], name).toBeGreaterThanOrEqual(0);
    }
  });

  it('leaves silence in the sparse themes', () => {
    for (const name of ['monastery', 'night', 'dialogue'] as const) {
      expect(THEMES[name].restBars[1], name).toBeGreaterThanOrEqual(3);
    }
  });
});
