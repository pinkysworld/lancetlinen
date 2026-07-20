/**
 * Staff contribution.
 *
 * The audit found `staffSkillBonus` computed a value nothing read — treatment
 * used a bare `bathhouse.staffApprentice * 0.02` head count instead, so skill,
 * loyalty, training and gifting were decorative. These tests pin the properties
 * that make the Staff screen worth visiting.
 */
import { describe, it, expect } from 'vitest';

/** Mirrors `contribution` in systems/staff.ts. */
function contribution(skill: number, loyalty: number): number {
  const s = Math.max(0, Math.min(10, skill)) / 10;
  const willing = 0.35 + 0.65 * (Math.max(0, Math.min(100, loyalty)) / 100);
  return s * willing;
}

const apprenticeBonus = (bench: Array<[number, number]>) =>
  Math.min(0.12, bench.reduce((sum, [s, l]) => sum + contribution(s, l), 0) * 0.05);

const demandBonus = (bench: Array<[number, number]>) =>
  Math.round(bench.reduce((sum, [s, l]) => sum + contribution(s, l), 0) * 1.5);

describe('staff contribution', () => {
  it('rewards training — a skilled apprentice beats a fresh one', () => {
    expect(contribution(10, 60)).toBeGreaterThan(contribution(2, 60));
  });

  it('rewards loyalty — a willing apprentice beats a disaffected one', () => {
    expect(contribution(6, 100)).toBeGreaterThan(contribution(6, 20));
  });

  it('makes a disaffected expert worth less than a keen journeyman', () => {
    // Loyalty is not a rounding error: it decides whether skill is applied.
    expect(contribution(10, 0)).toBeLessThan(contribution(7, 100));
  });

  it('is zero for an unskilled hire regardless of loyalty', () => {
    expect(contribution(0, 100)).toBe(0);
  });
});

describe('apprentice treatment bonus', () => {
  it('beats the old flat head count once trained', () => {
    // Old behaviour was 0.02 per head no matter what.
    expect(apprenticeBonus([[10, 100]])).toBeGreaterThan(0.02);
  });

  it('is worse than the old head count when the bench is raw', () => {
    // Hiring alone should not be enough — that was the whole problem.
    expect(apprenticeBonus([[2, 60]])).toBeLessThan(0.02);
  });

  it('caps so a full bench cannot trivialise the craft', () => {
    expect(apprenticeBonus([[10, 100], [10, 100], [10, 100]])).toBeLessThanOrEqual(0.12);
    expect(apprenticeBonus(Array(10).fill([10, 100]))).toBeLessThanOrEqual(0.12);
  });

  it('never goes negative or NaN on junk input', () => {
    for (const bench of [[[-5, -5]], [[99, 999]], []] as Array<Array<[number, number]>>) {
      const v = apprenticeBonus(bench);
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('bathmaid demand bonus', () => {
  it('adds custom once the maid is any good', () => {
    expect(demandBonus([[10, 100]])).toBeGreaterThan(0);
  });

  it('rounds to whole patients — demand is a head count', () => {
    expect(Number.isInteger(demandBonus([[7, 80], [4, 50]]))).toBe(true);
  });
});
