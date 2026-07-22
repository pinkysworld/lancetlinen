import { describe, expect, it } from 'vitest';
import { createNewGame, ensureFullState } from '../src/game/state';
import {
  GIFT_STAFF_COST,
  STAFF_TRAINING_DAYS,
  TRAIN_STAFF_COST,
  canGiftStaff,
  canTrainStaff,
  giftStaff,
  resolveDueStaffTraining,
  staffSkillBonus,
  trainStaff,
} from '../src/game/systems/staff';

function staffedState() {
  const state = createNewGame('Werkstatt', 'de');
  state.coin = 200;
  state.staff = [{
    id: 'elsa',
    name: 'Elsa',
    role: 'apprentice',
    propertyId: null,
    loyalty: 65,
    skill: 4,
    wage: 5,
    daysEmployed: 3,
    trait: 'careful',
  }];
  return state;
}

describe('staff pacing', () => {
  it('migrates existing staff without changing their skill or employment record', () => {
    const state = staffedState();
    state.version = 6;
    ensureFullState(state);
    expect(state.version).toBe(7);
    expect(state.staff[0]).toMatchObject({ skill: 4, daysEmployed: 3, lastGiftDay: 0 });
  });

  it('charges and schedules supervised training instead of improving immediately', () => {
    const state = staffedState();
    const member = state.staff[0]!;
    const beforeBonus = staffSkillBonus(state);
    expect(trainStaff(state, member.id)).toBe(true);
    expect(state.coin).toBe(200 - TRAIN_STAFF_COST);
    expect(member.skill).toBe(4);
    expect(member.trainingDueDay).toBe(state.day + STAFF_TRAINING_DAYS);
    expect(staffSkillBonus(state)).toBeLessThan(beforeBonus);
    expect(canTrainStaff(state, member.id)).toMatchObject({ ok: false, reasonKey: 'req_staff_training_active' });

    state.day = member.trainingDueDay! - 1;
    expect(resolveDueStaffTraining(state)).toBe(0);
    expect(member.skill).toBe(4);
    state.day += 1;
    expect(resolveDueStaffTraining(state)).toBe(1);
    expect(member).toMatchObject({ skill: 5, trainingDueDay: undefined });
  });

  it('requires a short working relationship and only one gift per day', () => {
    const state = staffedState();
    const member = state.staff[0]!;
    member.daysEmployed = 2;
    expect(canTrainStaff(state, member.id)).toMatchObject({
      ok: false,
      reasonKey: 'req_staff_employment',
    });
    member.daysEmployed = 3;
    expect(giftStaff(state, member.id)).toBe(true);
    expect(state.coin).toBe(200 - GIFT_STAFF_COST);
    expect(canGiftStaff(state, member.id)).toMatchObject({ ok: false, reasonKey: 'req_staff_gift_wait' });
    state.day += 1;
    expect(canGiftStaff(state, member.id).ok).toBe(true);
  });
});
