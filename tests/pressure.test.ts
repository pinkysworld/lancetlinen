/**
 * Late-game pressure.
 *
 * The audit's sharpest finding was that nothing threatens the player after
 * roughly day 12 — `churchHeat` accumulated harmlessly and `debt` compounded
 * forever without ever being called in. These tests pin the properties that
 * make both bite, and — just as importantly — that neither can spiral into an
 * unrecoverable state.
 */
import { describe, it, expect } from 'vitest';
import {
  churchStage,
  churchDemandPenalty,
  applyChurchPressure,
  applyDebtCollection,
  CHURCH_NOTICE,
  CHURCH_INQUIRY,
  CHURCH_INTERDICT,
  DEBT_CALL_IN,
} from '../src/game/systems/pressure';
import type { GameState } from '../src/game/types';

/** Minimal state — only the fields these systems touch. */
function stub(over: Partial<GameState> = {}): GameState {
  return {
    churchHeat: 0,
    coin: 200,
    debt: 0,
    repElite: 50,
    repFolk: 50,
    locationId: 'nurnberg',
    properties: [],
    journal: [],
    ...over,
  } as unknown as GameState;
}

describe('church scrutiny', () => {
  it('escalates through the stages as heat rises', () => {
    expect(churchStage(stub({ churchHeat: 0 }))).toBe('none');
    expect(churchStage(stub({ churchHeat: CHURCH_NOTICE }))).toBe('noticed');
    expect(churchStage(stub({ churchHeat: CHURCH_INQUIRY }))).toBe('inquiry');
    expect(churchStage(stub({ churchHeat: CHURCH_INTERDICT }))).toBe('interdict');
  });

  it('suppresses custom more at each stage', () => {
    const none = churchDemandPenalty(stub({ churchHeat: 0 }));
    const noticed = churchDemandPenalty(stub({ churchHeat: CHURCH_NOTICE }));
    const inquiry = churchDemandPenalty(stub({ churchHeat: CHURCH_INQUIRY }));
    const interdict = churchDemandPenalty(stub({ churchHeat: CHURCH_INTERDICT }));
    expect(none).toBe(0);
    expect(noticed).toBeGreaterThan(none);
    expect(inquiry).toBeGreaterThan(noticed);
    expect(interdict).toBeGreaterThan(inquiry);
  });

  it('does nothing at all below the notice threshold', () => {
    const s = stub({ churchHeat: CHURCH_NOTICE - 1, coin: 100, repElite: 50 });
    for (let i = 0; i < 50; i++) applyChurchPressure(s);
    expect(s.coin).toBe(100);
    expect(s.repElite).toBe(50);
  });

  it('drains elite standing under interdict', () => {
    const s = stub({ churchHeat: CHURCH_INTERDICT, repElite: 50 });
    applyChurchPressure(s);
    expect(s.repElite).toBeLessThan(50);
  });

  it('never drives standing or coin negative', () => {
    const s = stub({ churchHeat: 100, coin: 0, repElite: 0, repFolk: 0 });
    for (let i = 0; i < 100; i++) applyChurchPressure(s);
    expect(s.coin).toBeGreaterThanOrEqual(0);
    expect(s.repElite).toBeGreaterThanOrEqual(0);
    expect(s.repFolk).toBeGreaterThanOrEqual(0);
  });
});

describe('debt collection', () => {
  it('leaves a modest debt alone', () => {
    const s = stub({ debt: DEBT_CALL_IN, coin: 500 });
    for (let i = 0; i < 50; i++) expect(applyDebtCollection(s)).toBeNull();
    expect(s.coin).toBe(500);
  });

  it('collects once the debt passes the call-in threshold', () => {
    const s = stub({ debt: 400, coin: 500 });
    let collected = false;
    for (let i = 0; i < 200 && !collected; i++) {
      if (applyDebtCollection(s)) collected = true;
    }
    expect(collected).toBe(true);
    expect(s.coin).toBeLessThan(500);
  });

  it('reduces the debt by what it takes — payments are not lost', () => {
    const s = stub({ debt: 400, coin: 1000 });
    const before = { coin: s.coin, debt: s.debt };
    let taken = 0;
    for (let i = 0; i < 200; i++) {
      const r = applyDebtCollection(s);
      if (r) taken += r.coin;
    }
    expect(taken).toBeGreaterThan(0);
    expect(before.coin - s.coin).toBe(taken);
    expect(s.debt).toBeLessThanOrEqual(before.debt);
  });

  it('never takes the holding the player is standing in', () => {
    const s = stub({
      debt: 900,
      coin: 0,
      locationId: 'nurnberg',
      properties: [
        { id: 'home', cityId: 'nurnberg', level: 1 },
        { id: 'away', cityId: 'bamberg', level: 1 },
      ],
    } as Partial<GameState>);
    for (let i = 0; i < 300; i++) applyDebtCollection(s);
    expect(s.properties.some((p) => p.id === 'home')).toBe(true);
  });

  it('never leaves the player with no holdings at all', () => {
    const s = stub({
      debt: 5000,
      coin: 0,
      locationId: 'road_camp',
      properties: [{ id: 'only', cityId: 'bamberg', level: 1 }],
    } as Partial<GameState>);
    for (let i = 0; i < 500; i++) applyDebtCollection(s);
    // A single remaining holding is protected, so the run stays playable.
    expect(s.properties.length).toBe(1);
  });

  it('never drives coin or debt negative', () => {
    const s = stub({ debt: 300, coin: 5 });
    for (let i = 0; i < 300; i++) applyDebtCollection(s);
    expect(s.coin).toBeGreaterThanOrEqual(0);
    expect(s.debt).toBeGreaterThanOrEqual(0);
  });
});
