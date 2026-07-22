import { describe, expect, it } from 'vitest';
import { createNewGame } from '../src/game/state';
import { applyMorningCosts } from '../src/game/systems/economy';
import {
  OFFICE_APPLICATION_FEE,
  OFFICE_DECISION_DAYS,
  applyForOffice,
  canApplyForOffice,
  canUseOfficeAction,
  useOfficeAction,
} from '../src/game/systems/politics';

function qualifiedQuarterCandidate() {
  const state = createNewGame('Ratstest');
  state.locationId = 'augsburg';
  state.coin = 200;
  state.honour = 80;
  state.reputation.augsburg = 30;
  state.totalTreated = 14;
  state.prestige = 10;
  state.repElite = 30;
  state.councilFavor = 20;
  state.guildFavor = 8;
  return state;
}

describe('office petitions and duties', () => {
  it('files a paid petition and appoints only on the stated council day', () => {
    const state = qualifiedQuarterCandidate();
    expect(canApplyForOffice(state, 'quarter_warden')).toMatchObject({ ok: true });
    expect(applyForOffice(state, 'quarter_warden')).toBe(true);
    expect(state.office).toBe('none');
    expect(state.coin).toBe(200 - OFFICE_APPLICATION_FEE.quarter_warden);
    expect(state.officeCandidacy).toMatchObject({
      office: 'quarter_warden',
      dueDay: 1 + OFFICE_DECISION_DAYS.quarter_warden,
    });

    state.day = state.officeCandidacy!.dueDay - 1;
    applyMorningCosts(state);
    expect(state.office).toBe('none');
    state.day += 1;
    applyMorningCosts(state);
    expect(state.office).toBe('quarter_warden');
    expect(state.officeCandidacy).toBeNull();
    expect(state.coin).toBeLessThan(200 - OFFICE_APPLICATION_FEE.quarter_warden);
  });

  it('makes office service useful but limits it to one duty every seven days', () => {
    const state = qualifiedQuarterCandidate();
    state.office = 'quarter_warden';
    const guildBefore = state.guildFavor;
    expect(useOfficeAction(state)).toBe(true);
    expect(state.guildFavor).toBe(guildBefore + 2);
    expect(canUseOfficeAction(state)).toMatchObject({ ok: false, reasonKey: 'req_office_action_wait' });
    state.day += 7;
    expect(canUseOfficeAction(state)).toMatchObject({ ok: true });
  });
});
