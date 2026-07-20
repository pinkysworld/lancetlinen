/**
 * Balance maths.
 *
 * These are the pure functions that decide how the game feels, and every round
 * of tuning so far has been checked by hand with throwaway scripts. Two real
 * regressions came out of that process — an inverted skill check and a demand
 * curve that pinned the late game to its cap — so both now have guards.
 */
import { describe, it, expect } from 'vitest';
import { greenZoneWidth, markerSpeed } from '../src/game/systems/skillcurve';
import { queueSizeFor } from '../src/game/systems/demand';

const params = (hand: number, risk = 0.1, severity = 2) => ({
  hand,
  risk,
  severity,
  techniqueLabel: 'test',
});

describe('skill check', () => {
  it('rewards skill with a wider target', () => {
    // The original bug: skill made the check HARDER. This must never return.
    expect(greenZoneWidth(params(10))).toBeGreaterThan(greenZoneWidth(params(1)));
  });

  it('rewards skill with a slower marker', () => {
    expect(markerSpeed(params(10))).toBeLessThan(markerSpeed(params(1)));
  });

  it('makes risky techniques harder at equal skill', () => {
    expect(greenZoneWidth(params(5, 0.6))).toBeLessThan(greenZoneWidth(params(5, 0.02)));
    expect(markerSpeed(params(5, 0.6))).toBeGreaterThan(markerSpeed(params(5, 0.02)));
  });

  it('makes sicker patients harder at equal skill', () => {
    expect(greenZoneWidth(params(5, 0.1, 5))).toBeLessThan(greenZoneWidth(params(5, 0.1, 1)));
  });

  it('never produces a target smaller than the marker or wider than a third', () => {
    for (const hand of [0, 1, 5, 10]) {
      for (const risk of [0, 0.25, 0.6, 1]) {
        for (const severity of [1, 3, 5]) {
          const z = greenZoneWidth(params(hand, risk, severity));
          expect(z).toBeGreaterThanOrEqual(0.07);
          expect(z).toBeLessThanOrEqual(0.34);
        }
      }
    }
  });

  it('keeps the marker moving at every difficulty', () => {
    for (const hand of [0, 5, 10]) {
      for (const risk of [0, 1]) {
        expect(markerSpeed(params(hand, risk, 5))).toBeGreaterThan(0);
      }
    }
  });
});

describe('waiting-room size', () => {
  it('grows with the day’s demand', () => {
    expect(queueSizeFor(1)).toBe(1);
    expect(queueSizeFor(3)).toBe(2);
    expect(queueSizeFor(7)).toBe(3);
    expect(queueSizeFor(11)).toBe(4);
    expect(queueSizeFor(14)).toBe(5);
  });

  it('never shows more than five or fewer than one', () => {
    for (let p = 0; p <= 40; p++) {
      const q = queueSizeFor(p);
      expect(q).toBeGreaterThanOrEqual(1);
      expect(q).toBeLessThanOrEqual(5);
    }
  });

  it('is monotonic — a busier day never shows a smaller crowd', () => {
    for (let p = 1; p < 40; p++) {
      expect(queueSizeFor(p + 1)).toBeGreaterThanOrEqual(queueSizeFor(p));
    }
  });
});
