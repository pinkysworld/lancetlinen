import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createNewGame, ensureFullState } from '../src/game/state';
import { resolveAct3Consequences } from '../src/game/systems/act3';
import { canSetHouseholdFocus, setHouseholdFocus } from '../src/game/systems/family';
import { canApplyForOffice, craftAuthority } from '../src/game/systems/politics';
import { MANUAL_CHAPTERS } from '../src/game/data/manual';
import { LEXICON } from '../src/game/data/lexicon';

describe('v1.3 save migration', () => {
  it('migrates a schema-2 state without losing legacy fields', () => {
    const legacy = createNewGame('Legacy');
    legacy.version = 2;
    legacy.coin = 73;
    delete legacy.carePlans;
    delete legacy.act3Consequences;
    delete legacy.houseRelations;
    delete legacy.correspondence;
    delete legacy.cityConsequences;
    legacy.staff = [{ id: 'old-1', name: 'Klara', role: 'bathmaid', propertyId: null, loyalty: 66, skill: 4, wage: 7, daysEmployed: 9 }];
    legacy.spouse = { name: 'suitor_anna', affection: 70, cityId: 'nurnberg', marriedDay: 2 };
    ensureFullState(legacy);
    expect(legacy.version).toBe(5);
    expect(legacy.coin).toBe(73);
    expect(legacy.carePlans).toEqual([]);
    expect(legacy.act3Consequences).toEqual([]);
    expect(legacy.houseRelations).toMatchObject({
      fugger_weavers: 0,
      florentine_correspondents: 0,
      levantine_caravan: 0,
    });
    expect(legacy.correspondence).toBeNull();
    expect(legacy.cityConsequences).toEqual([]);
    expect(legacy.staff[0]?.trait).toBeDefined();
    expect(legacy.spouse?.householdFocus).toBe('home');
  });
});

describe('household and act-3 consequences', () => {
  it('makes the focus a real gated, persistent choice', () => {
    const state = createNewGame('Family');
    expect(canSetHouseholdFocus(state, 'trade').ok).toBe(false);
    state.spouse = { name: 'suitor_anna', affection: 70, cityId: state.locationId, marriedDay: 1, householdFocus: 'home' };
    expect(canSetHouseholdFocus(state, 'trade').ok).toBe(true);
    expect(setHouseholdFocus(state, 'trade')).toBe(true);
    expect(state.spouse.householdFocus).toBe('trade');
  });

  it('records each eligible act-3 consequence once rather than re-rolling it', () => {
    const state = createNewGame('Consequences');
    state.act = 3;
    state.storyFlags['epidemic_done'] = true;
    state.storyFlags['rival_truce'] = true;
    state.debt = 30;
    state.lepraRight = 1;
    state.staff = [{ id: 'staff-1', name: 'Elsa', role: 'bathmaid', propertyId: null, loyalty: 65, skill: 4, wage: 7, daysEmployed: 6, trait: 'sociable' }];
    state.spouse = { name: 'suitor_anna', affection: 70, cityId: state.locationId, marriedDay: 1, householdFocus: 'kin' };
    resolveAct3Consequences(state);
    expect(state.act3Consequences).toHaveLength(6);
    const journals = state.journal.length;
    resolveAct3Consequences(state);
    expect(state.act3Consequences).toHaveLength(6);
    expect(state.journal).toHaveLength(journals);
  });
});

describe('Nuremberg craft rule', () => {
  it('uses council oversight and refuses the generic guild office', () => {
    const state = createNewGame('Nürnberg');
    state.locationId = 'nurnberg';
    state.coin = 999;
    state.honour = 100;
    state.repElite = 100;
    state.councilFavor = 100;
    state.guildFavor = 0;
    expect(craftAuthority(state)).toBe('council');
    expect(canApplyForOffice(state, 'quarter_warden').ok).toBe(true);
    expect(canApplyForOffice(state, 'guild_elder')).toMatchObject({ ok: false, reasonKey: 'req_nurnberg_craft' });
  });
});

describe('manual and bibliography surfaces', () => {
  it('keeps the twelve manual chapters and a sixty-term bilingual lexicon', () => {
    expect(MANUAL_CHAPTERS).toHaveLength(12);
    expect(LEXICON.length).toBeGreaterThanOrEqual(60);
    const manual = readFileSync(join(process.cwd(), 'docs/MANUAL.md'), 'utf8');
    const sources = readFileSync(join(process.cwd(), 'docs/HISTORICAL_SOURCES.md'), 'utf8');
    expect(manual).toContain('## 12.');
    expect(sources).toContain('Germanisches Nationalmuseum');
    expect(sources).toContain('Wellcome Collection');
  });
});
