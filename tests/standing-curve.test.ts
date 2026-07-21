/**
 * Where a career actually ends up.
 *
 * Two complaints from play, opposite in direction:
 *
 *  - "folk trust seems to grow very fast and 100 is the top" — it started at
 *    40 and rose a flat +1 or +2 per common patient, so against a campaign
 *    that ends at 35 treated it hit the ceiling around two-thirds through and
 *    then meant nothing.
 *  - imperial fame had the reverse problem: +0.3 to +0.8, from a start of 5,
 *    which put the `honorable` title (30) and `noble_surgeon` (50) out of
 *    reach of a whole campaign.
 *
 * Rather than tune by feel, this simulates a plausible run and asserts where
 * each facet lands. The numbers are wide bands, not exact values — the point
 * is that no facet saturates early and none is unreachable.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('phaser', () => ({ default: {} }));

import { applyTreatmentReputation } from '../src/game/systems/reputation';
import { fameForTitle } from '../src/game/systems/reputation';
import { createNewGame } from '../src/game/state';
import type { GameState, PatientClass } from '../src/game/types';

/** The campaign ends around here — see `story.ts`. */
const CAMPAIGN_TREATED = 35;

/**
 * A run in which the player is good at the job.
 *
 * Mostly common folk with a scattering of the well-off, four successes in
 * five. Deliberately generous: if a facet does not saturate *here* it will
 * not saturate in an ordinary game either.
 */
function goodCareer(treated: number): GameState {
  const s = createNewGame('Karriere', 'de');
  const classes: PatientClass[] = [
    'peasant', 'artisan', 'peasant', 'beggar', 'artisan',
    'merchant', 'peasant', 'artisan', 'clergy', 'noble',
  ];
  for (let i = 0; i < treated; i++) {
    const cls = classes[i % classes.length]!;
    applyTreatmentReputation(s, cls, i % 5 === 4 ? 'partial' : 'success');
  }
  return s;
}

describe('folk trust no longer saturates', () => {
  it('is still well short of the ceiling at the end of a good campaign', () => {
    const s = goodCareer(CAMPAIGN_TREATED);
    // It should have risen a long way — the player earned it — without
    // arriving at a number that can no longer move.
    expect(s.repFolk).toBeGreaterThan(50);
    expect(s.repFolk).toBeLessThan(90);
  });

  it('does not reach 100 even on a run twice the length', () => {
    const s = goodCareer(CAMPAIGN_TREATED * 2);
    expect(s.repFolk).toBeLessThan(100);
  });

  it('still rises quickly while the name is unknown', () => {
    // The taper must not make the early game feel inert.
    const early = goodCareer(8);
    expect(early.repFolk).toBeGreaterThan(createNewGame('x', 'de').repFolk + 2);
  });
});

describe('losses are not cushioned by a good name', () => {
  it('costs a well-liked Bader as much as an unknown one', () => {
    // Being sheltered from disgrace by past success is the wrong lesson for a
    // trade this precarious, so only gains taper.
    const known = goodCareer(30);
    const unknown = createNewGame('Neu', 'de');
    const beforeKnown = known.repFolk;
    const beforeUnknown = unknown.repFolk;
    applyTreatmentReputation(known, 'peasant', 'death');
    applyTreatmentReputation(unknown, 'peasant', 'death');
    expect(beforeKnown - known.repFolk).toBeCloseTo(beforeUnknown - unknown.repFolk, 5);
  });
});

describe('the title ladder is climbable', () => {
  it('puts at least the middle rungs within a campaign', () => {
    const s = goodCareer(CAMPAIGN_TREATED);
    // `freeman` (5) and `master_bader` (15) must be reachable by playing well;
    // otherwise the politics screen is a display of things you cannot have.
    expect(s.repFame).toBeGreaterThanOrEqual(fameForTitle('master_bader'));
  });

  it('keeps the top rung as a stretch, not a formality', () => {
    const s = goodCareer(CAMPAIGN_TREATED);
    expect(s.repFame).toBeLessThan(fameForTitle('noble_surgeon'));
  });
});
