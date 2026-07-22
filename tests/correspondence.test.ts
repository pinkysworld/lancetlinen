import { describe, expect, it } from 'vitest';
import { createNewGame, ensureFullState } from '../src/game/state';
import {
  activeCorrespondence,
  canStartCorrespondence,
  resolveDueCorrespondence,
  startCorrespondence,
} from '../src/game/systems/correspondence';

describe('houses and correspondence', () => {
  it('migrates a schema-3 save to neutral house contacts without losing its purse', () => {
    const legacy = createNewGame('Legacy correspondent');
    legacy.version = 3;
    legacy.coin = 71;
    delete legacy.houseRelations;
    delete legacy.correspondence;
    ensureFullState(legacy);
    expect(legacy.version).toBe(5);
    expect(legacy.coin).toBe(71);
    expect(legacy.houseRelations).toMatchObject({
      fugger_weavers: 0,
      florentine_correspondents: 0,
      levantine_caravan: 0,
    });
    expect(legacy.correspondence).toBeNull();
  });

  it('charges a letter once and resolves the Augsburg return only on its due day', () => {
    const state = createNewGame('Letters');
    state.day = 4;
    state.coin = 30;
    state.inventory.linen = 4;
    const mission = startCorrespondence(state, 'augsburg_cloth');
    expect(mission).toMatchObject({ routeId: 'augsburg_cloth', startedDay: 4, dueDay: 11 });
    expect(state.coin).toBe(18);
    expect(state.inventory.linen).toBe(3);
    expect(canStartCorrespondence(state, 'florentine_letters')).toMatchObject({
      ok: false,
      reasonKey: 'req_correspondence_active',
    });

    state.day = 10;
    expect(resolveDueCorrespondence(state)).toBeNull();
    state.day = 11;
    expect(resolveDueCorrespondence(state)).toMatchObject({ routeId: 'augsburg_cloth' });
    expect(activeCorrespondence(state)).toBeNull();
    expect(state.coin).toBe(28);
    expect(state.inventory.linen).toBe(5);
    expect(state.houseRelations?.fugger_weavers).toBe(1);
    expect(state.journal[0]?.textKey).toBe('journal_correspondence_augsburg');
  });

  it('requires the earlier Florence contact before the delayed Tabriz courier and records its bounded outcome', () => {
    const state = createNewGame('Eastern letter');
    state.day = 20;
    state.act = 3;
    state.coin = 99;
    state.inventory.linen = 8;
    state.stats.tongue = 6;
    expect(canStartCorrespondence(state, 'tabriz_letter')).toMatchObject({
      ok: false,
      reasonKey: 'req_correspondence_contact',
    });

    state.storyFlags['correspondence_florence_complete'] = true;
    const mission = startCorrespondence(state, 'tabriz_letter');
    expect(mission?.dueDay).toBe(40);
    state.day = 40;
    expect(resolveDueCorrespondence(state)).toMatchObject({ routeId: 'tabriz_letter' });
    expect(state.inventory.herbs).toBe(8);
    expect(state.repFame).toBe(8);
    expect(state.prestige).toBe(2);
    expect(state.storyFlags['correspondence_tabriz_complete']).toBe(true);
  });
});
