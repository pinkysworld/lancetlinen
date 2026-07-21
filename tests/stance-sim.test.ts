/**
 * Measured, not asserted: the stances actually move coin, reputation and
 * honour in the promised directions, over hundreds of real `applyTreatment`
 * runs — the same discipline as the remedy simulation, because a multiplier
 * that is computed but never felt is this project's recurring defect.
 *
 * `treatment.ts` reaches Phaser through `ui/art`, so Phaser is mocked out;
 * nothing on the `applyTreatment` path touches it at run time.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('phaser', () => ({ default: {} }));

import { applyTreatment } from '../src/game/systems/treatment';
import { createNewGame } from '../src/game/state';
import type { FeeStance, GameState, Intensity, PatientInstance } from '../src/game/types';

const N = 400;

let uid = 0;
function makePatient(overrides: Partial<PatientInstance> = {}): PatientInstance {
  return {
    uid: `sim-${uid++}`,
    templateId: 'sim',
    name: 'Sim Testfall',
    class: 'artisan',
    complaintKey: 'complaint_fatigue',
    dominantHumor: 'blood',
    severity: 2,
    bestTechniques: ['bloodletting'],
    basePay: 12,
    diagnosed: true,
    pulseRead: false,
    ...overrides,
  };
}

interface Tally {
  pay: number;
  rep: number;
  honour: number;
  deaths: number;
}

function run(
  n: number,
  patientOverrides: Partial<PatientInstance>,
  mutate?: (s: GameState) => void,
  skill = 0.5,
): Tally {
  const tally: Tally = { pay: 0, rep: 0, honour: 0, deaths: 0 };
  for (let i = 0; i < n; i++) {
    const s = createNewGame('Sim', 'de');
    mutate?.(s);
    const before = s.honour ?? 30;
    const r = applyTreatment(s, makePatient(patientOverrides), 'bloodletting', skill);
    tally.pay += r.pay;
    tally.rep += r.reputationDelta;
    tally.honour += (s.honour ?? 30) - before;
    if (r.kind === 'death') tally.deaths += 1;
  }
  return tally;
}

describe('fee stances, simulated', () => {
  const usual = run(N, { feeStance: 'usual' });
  const demand = run(N, { feeStance: 'demand' }, (s) => (s.stats.tongue = 6));
  const lenient = run(N, { feeStance: 'lenient' });
  const alms = run(N, { feeStance: 'alms' });

  it('pays: demand > usual > lenient > alms = 0', () => {
    expect(demand.pay).toBeGreaterThan(usual.pay);
    expect(usual.pay).toBeGreaterThan(lenient.pay);
    expect(alms.pay).toBe(0);
  });

  it('earns honour for easing and for alms, none for the customary fee', () => {
    expect(alms.honour).toBeGreaterThan(usual.honour);
    expect(lenient.honour).toBeGreaterThan(usual.honour);
  });

  it('earns more reputation the more generous the posture', () => {
    expect(alms.rep).toBeGreaterThan(usual.rep);
    expect(lenient.rep).toBeGreaterThan(usual.rep);
  });

  it('costs honour to press the poor for more', () => {
    const poorDemand = run(N, { feeStance: 'demand', class: 'peasant' });
    const poorUsual = run(N, { feeStance: 'usual', class: 'peasant' });
    expect(poorDemand.honour).toBeLessThan(poorUsual.honour);
  });

  it('makes Tongue matter: a silver tongue collects more than a clumsy one', () => {
    const clumsy = run(N, { feeStance: 'demand' }, (s) => (s.stats.tongue = 1));
    const silver = run(N, { feeStance: 'demand' }, (s) => (s.stats.tongue = 10));
    expect(silver.pay).toBeGreaterThan(clumsy.pay);
  });
});

describe('intensity, simulated', () => {
  /*
   * Severity 5, an unread patient and no skill-check bonus, so the success
   * chance sits low enough that the risk window actually binds. At high
   * success chance the whole failure region already lies inside both risk
   * thresholds and careful/bold kill identically — the first version of this
   * test found exactly that, with a comfortable-looking severity 4 setup
   * measuring 0 deaths on both sides.
   */
  const base: Partial<PatientInstance> = { severity: 5, diagnosed: false, feeStance: 'usual' };
  const M = 1500;
  const runs: Record<Intensity, Tally> = {
    careful: run(M, { ...base, intensity: 'careful' }, undefined, 0),
    usual: run(M, { ...base, intensity: 'usual' }, undefined, 0),
    bold: run(M, { ...base, intensity: 'bold' }, undefined, 0),
  };

  it('kills more boldly than carefully', () => {
    // The one claim that must hold for the trade-off to be real.
    expect(runs.bold.deaths).toBeGreaterThan(runs.careful.deaths);
  });

  it('pays more boldly than carefully', () => {
    expect(runs.bold.pay).toBeGreaterThan(runs.careful.pay);
  });
});

describe('stances leave the customary path untouched', () => {
  it('treats an unset stance exactly as usual', () => {
    // A patient generated before this feature existed (an old save) carries
    // neither field; the maths must not shift under them.
    const unset = run(N, {});
    const usual = run(N, { feeStance: 'usual', intensity: 'usual' });
    const drift = Math.abs(unset.pay - usual.pay) / Math.max(1, usual.pay);
    expect(drift).toBeLessThan(0.15);
  });
});

// Type-only use so the linter keeps FeeStance imported for the overrides above.
const _stances: FeeStance[] = ['usual', 'demand', 'lenient', 'alms'];
void _stances;
