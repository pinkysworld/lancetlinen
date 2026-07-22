import { describe, expect, it } from 'vitest';
import { createNewGame, ensureFullState } from '../src/game/state';
import {
  canCourtAction,
  canGiftSpouse,
  canMarryNow,
  courtAction,
  giftSpouse,
  startCourtship,
} from '../src/game/systems/family';
import { HONOUR_CEILING, MARRIAGE_HONOUR_REQUIRED, OFFICE_HONOUR_REQUIRED } from '../src/game/systems/honour';

describe('family pacing', () => {
  it('permits one courtship gesture per day and requires several days even with social skill', () => {
    const state = createNewGame('Measured courtship');
    state.coin = 500;
    state.honour = 50;
    state.stats.tongue = 10;
    expect(startCourtship(state, 'greta_weber')).toBe(true);

    expect(courtAction(state, 'feast')).toBe(true);
    expect(canCourtAction(state, 'letter')).toMatchObject({ ok: false, reasonKey: 'req_courtship_wait' });
    expect(courtAction(state, 'letter')).toBe(false);

    // A lavish feast is the fastest option, but three separate days still do
    // not reach the 80-point marriage threshold.
    state.day += 1;
    expect(courtAction(state, 'feast')).toBe(true);
    state.day += 1;
    expect(courtAction(state, 'feast')).toBe(true);
    expect(state.courtshipProgress).toBeLessThan(80);
    expect(canMarryNow(state).ok).toBe(false);

    state.day += 1;
    expect(courtAction(state, 'feast')).toBe(true);
    expect(canMarryNow(state).ok).toBe(true);
  });

  it('limits household gifts to one local, modest gesture per day', () => {
    const state = createNewGame('Measured marriage');
    state.coin = 100;
    state.spouse = {
      name: 'suitor_anna', affection: 70, cityId: state.locationId, marriedDay: state.day, householdFocus: 'home',
    };
    expect(giftSpouse(state)).toBe(true);
    expect(state.spouse.affection).toBe(77);
    expect(canGiftSpouse(state)).toMatchObject({ ok: false, reasonKey: 'req_spouse_gift_wait' });
    state.day += 1;
    expect(giftSpouse(state)).toBe(true);

    state.spouse.cityId = 'nurnberg';
    expect(canGiftSpouse(state)).toMatchObject({ ok: false, reasonKey: 'req_spouse_away' });
  });

  it('migrates daily pacing fields without changing the historical social ladder', () => {
    const legacy = createNewGame('Legacy household');
    legacy.version = 5;
    delete legacy.courtshipLastActionDay;
    delete legacy.spouseLastGiftDay;
    ensureFullState(legacy);
    expect(legacy.version).toBe(6);
    expect(legacy.courtshipLastActionDay).toBe(0);
    expect(legacy.spouseLastGiftDay).toBe(0);
    expect(MARRIAGE_HONOUR_REQUIRED).toBeLessThan(OFFICE_HONOUR_REQUIRED);
    expect(OFFICE_HONOUR_REQUIRED).toBeLessThan(HONOUR_CEILING);
  });
});
