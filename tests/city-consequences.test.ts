import { describe, expect, it } from 'vitest';
import { createNewGame, ensureFullState } from '../src/game/state';
import {
  canSecureCityConsequence,
  cityGoodsMultiplier,
  councilRequirementDiscount,
  hasCityConsequence,
  secureCityConsequence,
} from '../src/game/systems/cityConsequences';
import { marketPrices } from '../src/game/systems/economy';
import { canApplyForOffice } from '../src/game/systems/politics';

describe('city-bound consequences', () => {
  it('migrates a schema-4 save to an empty city-agreement record', () => {
    const legacy = createNewGame('Legacy city');
    legacy.version = 4;
    legacy.coin = 63;
    delete legacy.cityConsequences;
    ensureFullState(legacy);
    expect(legacy.version).toBe(8);
    expect(legacy.coin).toBe(63);
    expect(legacy.cityConsequences).toEqual([]);
  });

  it('requires the returned Augsburg letter, then keeps its linen benefit local', () => {
    const state = createNewGame('Augsburg contract');
    state.locationId = 'augsburg';
    state.act = 2;
    state.coin = 60;
    state.reputation.augsburg = 25;

    expect(canSecureCityConsequence(state, 'augsburg_linen_contract')).toMatchObject({
      ok: false,
      reasonKey: 'req_city_consequence_contact',
    });

    state.storyFlags['correspondence_augsburg_complete'] = true;
    const before = marketPrices(state).linen;
    expect(secureCityConsequence(state, 'augsburg_linen_contract')).toBe(true);
    expect(hasCityConsequence(state, 'augsburg_linen_contract')).toBe(true);
    expect(state.coin).toBe(40);
    expect(state.guildFavor).toBe(2);
    expect(state.prestige).toBe(2);
    expect(marketPrices(state).linen).toBeLessThan(before!);
    expect(cityGoodsMultiplier(state, 'augsburg', 'linen')).toBe(0.75);
    expect(cityGoodsMultiplier(state, 'nurnberg', 'linen')).toBe(1);
  });

  it('makes the Nürnberg inspection a local council consequence, not a guild bypass', () => {
    const state = createNewGame('Nürnberg inspection');
    state.locationId = 'nurnberg';
    state.act = 2;
    state.coin = 100;
    state.reputation.nurnberg = 25;
    state.totalTreated = 12;
    state.prestige = 8;
    state.honour = 100;
    state.repElite = 100;
    state.councilFavor = 10;

    expect(canApplyForOffice(state, 'quarter_warden')).toMatchObject({ ok: false, reasonKey: 'req_council' });
    expect(secureCityConsequence(state, 'nurnberg_sworn_inspection')).toBe(true);
    expect(state.councilFavor).toBe(13);
    expect(councilRequirementDiscount(state)).toBe(5);
    expect(canApplyForOffice(state, 'quarter_warden')).toMatchObject({ ok: true });

    state.locationId = 'augsburg';
    expect(councilRequirementDiscount(state)).toBe(0);
  });
});
