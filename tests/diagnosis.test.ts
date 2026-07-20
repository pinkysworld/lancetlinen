/**
 * Examination and belief.
 *
 * The treatment screen used to print the correct technique outright, which
 * collapsed the decision into "click the green one". The player now reasons
 * from what examination *reported* — which can be wrong. These tests pin the
 * properties that make that honest:
 *
 *  - the pulse never lies, but only narrows
 *  - the diagnosis can lie, and the Eye stat governs how often
 *  - a contradiction between the two is detectable by the player
 */
import { describe, it, expect } from 'vitest';
import type { Humor } from '../src/game/types';

/** Galenic qualities — mirrors HUMOR_QUALITIES in systems/treatment.ts. */
const QUALITIES: Record<Humor, { hot: boolean; moist: boolean }> = {
  blood: { hot: true, moist: true },
  yellowBile: { hot: true, moist: false },
  phlegm: { hot: false, moist: true },
  blackBile: { hot: false, moist: false },
};
const ALL = Object.keys(QUALITIES) as Humor[];

/** Mirrors readPulse's candidate narrowing. */
function pulseCandidates(actual: Humor, eye: number): Humor[] {
  const a = QUALITIES[actual];
  const readsMoisture = eye >= 5;
  return ALL.filter((h) => {
    const q = QUALITIES[h];
    if (q.hot !== a.hot) return false;
    return readsMoisture ? q.moist === a.moist : true;
  });
}

/** Mirrors TreatmentScene.beliefHumors(). */
function belief(diagnosed: Humor | null, candidates: Humor[] | null): Humor[] {
  if (diagnosed && candidates) {
    return candidates.includes(diagnosed) ? [diagnosed] : candidates;
  }
  if (diagnosed) return [diagnosed];
  if (candidates) return candidates;
  return [];
}

describe('pulse', () => {
  it('never rules out the true humor', () => {
    for (const actual of ALL) {
      for (const eye of [0, 4, 5, 10]) {
        expect(pulseCandidates(actual, eye)).toContain(actual);
      }
    }
  });

  it('narrows to two humors for an untrained eye, one for a practised eye', () => {
    for (const actual of ALL) {
      expect(pulseCandidates(actual, 4)).toHaveLength(2);
      expect(pulseCandidates(actual, 5)).toHaveLength(1);
    }
  });

  it('narrows on temperature, so the pair always shares hot/cold', () => {
    for (const actual of ALL) {
      const pair = pulseCandidates(actual, 0);
      const hot = pair.map((h) => QUALITIES[h].hot);
      expect(new Set(hot).size).toBe(1);
    }
  });
});

describe('belief', () => {
  it('is empty before the player examines anything', () => {
    expect(belief(null, null)).toEqual([]);
  });

  it('collapses to one humor when eye and pulse agree', () => {
    expect(belief('blood', pulseCandidates('blood', 5))).toEqual(['blood']);
  });

  it('falls back to the pulse when the diagnosis contradicts it', () => {
    // Diagnosed cold-dry, but the pulse felt hot: the pulse is truthful.
    const candidates = pulseCandidates('blood', 5); // ['blood']
    expect(belief('blackBile', candidates)).toEqual(candidates);
    expect(belief('blackBile', candidates)).not.toContain('blackBile');
  });

  it('still contains the true humor even when the diagnosis was wrong', () => {
    // This is what keeps a bad diagnosis recoverable rather than fatal.
    for (const actual of ALL) {
      const candidates = pulseCandidates(actual, 5);
      const wrong = ALL.find((h) => h !== actual)!;
      expect(belief(wrong, candidates)).toContain(actual);
    }
  });

  it('can be wrong when the player only examined and did not feel the pulse', () => {
    // No cross-check available — the Eye stat is doing all the work.
    expect(belief('phlegm', null)).toEqual(['phlegm']);
  });
});
