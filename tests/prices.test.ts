/**
 * Regional price formation.
 *
 * Before this, `marketPrices` ignored `state.locationId` entirely and
 * `applyTreatment` had no location term at all — herbs cost the same at a
 * Cistercian house with a physic garden as in the middle of Nürnberg, and a
 * noble's fee in Mühlbach equalled a noble's fee in an imperial city. The map
 * was economically flat, so travelling was a cost with no commercial reason.
 *
 * These tests pin the two things that make it real: the numbers actually
 * differ, and the difference is *visible* — a price gap the player cannot see
 * is noise, not depth.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { localFeeMult, localGoodsMult, marketNoteKey, priceProfile } from '../src/game/data/prices';
import { marketPrices } from '../src/game/systems/economy';
import { MAP_NODES } from '../src/game/data/map';
import { createNewGame } from '../src/game/state';
import type { GameState } from '../src/game/types';

const EN = readFileSync(join(process.cwd(), 'src/game/i18n/en.ts'), 'utf8');
const DE = readFileSync(join(process.cwd(), 'src/game/i18n/de.ts'), 'utf8');
const MARKET = readFileSync(join(process.cwd(), 'src/game/scenes/MarketStudyScenes.ts'), 'utf8');
const TREATMENT = readFileSync(join(process.cwd(), 'src/game/systems/treatment.ts'), 'utf8');

const at = (id: string): GameState => {
  const s = createNewGame('Preis', 'de');
  s.locationId = id;
  return s;
};

describe('every place on the map has a profile', () => {
  it('covers all nine nodes explicitly, not by fallback', () => {
    // The fallback exists so a new node is sane, not so the real ones can be
    // forgotten. A node quietly on defaults is an economically dead city.
    const plain = MAP_NODES.filter((n) => marketNoteKey(n.id) === 'market_note_plain');
    expect(plain.map((n) => n.id)).toEqual([]);
  });

  it('names every market note in both locales', () => {
    const missing: string[] = [];
    for (const n of MAP_NODES) {
      const key = marketNoteKey(n.id);
      if (!EN.includes(`${key}:`)) missing.push(`en:${key}`);
      if (!DE.includes(`${key}:`)) missing.push(`de:${key}`);
    }
    expect(missing).toEqual([]);
  });

  it('keeps every multiplier within a believable band', () => {
    // A 0.3x or 3x would let one city trivialise the economy.
    for (const n of MAP_NODES) {
      const p = priceProfile(n.id);
      expect(p.fee, `${n.id} fee`).toBeGreaterThanOrEqual(0.5);
      expect(p.fee, `${n.id} fee`).toBeLessThanOrEqual(1.5);
      for (const [item, mult] of Object.entries(p.goods)) {
        expect(mult, `${n.id}.${item}`).toBeGreaterThanOrEqual(0.5);
        expect(mult, `${n.id}.${item}`).toBeLessThanOrEqual(2);
      }
    }
  });
});

describe('the history the numbers claim', () => {
  // Each of these encodes something specific about the place, so a later
  // rebalance cannot quietly invert the reasoning.

  it('makes ironwork cheapest in Nürnberg, the Empire’s metal town', () => {
    const others = MAP_NODES.filter((n) => n.id !== 'nurnberg').map((n) =>
      localGoodsMult(n.id, 'ironTools'),
    );
    expect(localGoodsMult('nurnberg', 'ironTools')).toBeLessThan(Math.min(...others));
  });

  it('makes linen cheapest in Augsburg, the weaving town', () => {
    const others = MAP_NODES.filter((n) => n.id !== 'augsburg').map((n) =>
      localGoodsMult(n.id, 'linen'),
    );
    expect(localGoodsMult('augsburg', 'linen')).toBeLessThan(Math.min(...others));
  });

  it('makes herbs cheapest at the monastery, which keeps a physic garden', () => {
    const others = MAP_NODES.filter((n) => n.id !== 'monastery_ebrach').map((n) =>
      localGoodsMult(n.id, 'herbs'),
    );
    expect(localGoodsMult('monastery_ebrach', 'herbs')).toBeLessThan(Math.min(...others));
  });

  it('pays worst at the monastery, where the reward is not silver', () => {
    // Cistercian statutes restricted practising for gain.
    const fees = MAP_NODES.map((n) => localFeeMult(at(n.id)));
    expect(localFeeMult(at('monastery_ebrach'))).toBe(Math.min(...fees));
  });

  it('pays best in Nürnberg, and worst in the village', () => {
    expect(localFeeMult(at('nurnberg'))).toBeGreaterThan(localFeeMult(at('rothenburg')));
    expect(localFeeMult(at('small_village'))).toBeLessThan(localFeeMult(at('rothenburg')));
  });

  it('makes the war camp dear in everything a wound needs', () => {
    for (const item of ['linen', 'herbs', 'salve'] as const) {
      expect(localGoodsMult('war_camp', item), item).toBeGreaterThan(1.2);
    }
  });
});

describe('the prices actually move', () => {
  it('quotes different lists in different places', () => {
    const nurnberg = marketPrices(at('nurnberg'));
    const monastery = marketPrices(at('monastery_ebrach'));
    expect(monastery.herbs).toBeLessThan(nurnberg.herbs!);
    expect(nurnberg.ironTools).toBeLessThan(monastery.ironTools!);
  });

  it('never quotes a price below one coin', () => {
    // Round-to-zero would make an item free, and free herbs break the recipes.
    for (const n of MAP_NODES) {
      for (const [item, price] of Object.entries(marketPrices(at(n.id)))) {
        expect(price, `${n.id}.${item}`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('leaves a real arbitrage between the cheapest and dearest market', () => {
    // Buy where it is made, sell where it is not — the whole point of a map.
    const linen = MAP_NODES.map((n) => marketPrices(at(n.id)).linen!);
    expect(Math.max(...linen) / Math.min(...linen)).toBeGreaterThanOrEqual(1.5);
  });
});

describe('wired, not merely written', () => {
  it('multiplies the local fee into the treatment payout', () => {
    expect(TREATMENT).toContain('localFeeMult(state)');
    const pay = TREATMENT.slice(TREATMENT.indexOf('let pay = Math.round('));
    expect(pay).toContain('localFeeMult(state)');
  });

  it('shows the player what this market is good for', () => {
    expect(MARKET).toContain('marketNoteKey(s.locationId)');
  });
});
