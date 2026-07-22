import { describe, expect, it } from 'vitest';
import { createNewGame } from '../src/game/state';
import type { PatientInstance } from '../src/game/types';
import {
  canStartRegimen,
  resolveDueRegimens,
  startRegimen,
} from '../src/game/systems/regimen';

function patient(templateId: string): PatientInstance {
  return {
    uid: `test-${templateId}`,
    templateId,
    name: 'Anna Test',
    class: 'peasant',
    complaintKey: 'complaint_plague',
    dominantHumor: 'blackBile',
    severity: 3,
    bestTechniques: [],
    basePay: 10,
    diagnosed: true,
    pulseRead: true,
  };
}

describe('historically framed regimens', () => {
  it('requires the learned pest regimen and commits its supplies to a follow-up', () => {
    const s = createNewGame('Test');
    s.day = 8;
    s.stats.eye = 4;
    s.stats.tongue = 3;
    const plague = patient('plague_like');
    expect(canStartRegimen(s, plague, 'pest_regimen')).toMatchObject({ ok: false, reasonKey: 'req_regimen_learning' });

    s.unlockedTechniques.push('hygiene_clean');
    const before = { herbs: s.inventory.herbs, soap: s.inventory.soap, linen: s.inventory.linen };
    const plan = startRegimen(s, plague, 'pest_regimen');
    expect(plan).toMatchObject({ regimenId: 'pest_regimen', dueDay: 9, fit: true });
    expect(s.inventory).toMatchObject({ herbs: before.herbs - 1, soap: before.soap - 1, linen: before.linen - 1 });
    expect(s.carePlans).toHaveLength(1);
  });

  it('does not resolve a course before the next day and journals a deterministic outcome after it', () => {
    const s = createNewGame('Test');
    s.day = 3;
    s.stats.eye = 5;
    s.stats.tongue = 5;
    const course = startRegimen(s, patient('fever_blood'), 'rest_diet');
    expect(course).not.toBeNull();
    expect(resolveDueRegimens(s)).toEqual([]);

    s.day = 4;
    const resolved = resolveDueRegimens(s);
    expect(resolved).toHaveLength(1);
    expect(['steadier', 'unchanged', 'worse']).toContain(resolved[0]?.outcome);
    expect(s.carePlans).toEqual([]);
    expect(s.journal[0]?.textKey).toMatch(/^journal_regimen_(steadier|unchanged|worse)$/);
  });

  it('never offers the pest regimen for an ordinary fever', () => {
    const s = createNewGame('Test');
    s.unlockedTechniques.push('hygiene_clean');
    s.stats.eye = 6;
    s.stats.tongue = 6;
    expect(canStartRegimen(s, patient('fever_blood'), 'pest_regimen')).toMatchObject({
      ok: false,
      reasonKey: 'req_regimen_unsuited',
    });
  });
});
