import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({ default: {} }));

import { createNewGame } from '../src/game/state';
import {
  TECHNIQUE_MASTERY_XP,
  techniqueMasteryBonus,
  techniqueMasteryLevel,
} from '../src/game/systems/treatment';

describe('technique mastery', () => {
  it('turns stored XP into small, bounded familiarity', () => {
    const s = createNewGame('Erfahrung', 'de');
    expect(techniqueMasteryLevel(s, 'bloodletting')).toBe(0);
    expect(techniqueMasteryBonus(s, 'bloodletting')).toBe(0);

    s.techniqueXp.bloodletting = TECHNIQUE_MASTERY_XP[1];
    expect(techniqueMasteryLevel(s, 'bloodletting')).toBe(1);
    expect(techniqueMasteryBonus(s, 'bloodletting')).toBeCloseTo(0.01);

    s.techniqueXp.bloodletting = TECHNIQUE_MASTERY_XP[2];
    expect(techniqueMasteryLevel(s, 'bloodletting')).toBe(2);
    expect(techniqueMasteryBonus(s, 'bloodletting')).toBeCloseTo(0.025);

    s.techniqueXp.bloodletting = TECHNIQUE_MASTERY_XP[3] + 500;
    expect(techniqueMasteryLevel(s, 'bloodletting')).toBe(3);
    expect(techniqueMasteryBonus(s, 'bloodletting')).toBeCloseTo(0.04);
  });

  it('keeps practice tied to the specific technique', () => {
    const s = createNewGame('Erfahrung', 'de');
    s.techniqueXp.bloodletting = TECHNIQUE_MASTERY_XP[3];
    expect(techniqueMasteryLevel(s, 'bloodletting')).toBe(3);
    expect(techniqueMasteryLevel(s, 'tooth_pull')).toBe(0);
  });
});
