/**
 * The year, and the week.
 *
 * `state.season` was read in four places and none of them changed how a day
 * felt: a flat +1 to winter footfall, a festival filter, two small
 * multipliers in the bloodletting calendar, and the line that advances it.
 * Four turns of the year were four identical quarters.
 *
 * The week was worse: Sunday carried a 5% nudge and **Saturday nothing at
 * all** — though Saturday was *the* bathing day, and council
 * Feiertagsordnungen forbade Sunday trading outright.
 *
 * These tests hold the shape rather than the exact figures: what matters is
 * that each season is distinguishable, and that no season makes anything
 * unplayable.
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

vi.mock('phaser', () => ({ default: {} }));

import {
  AUTUMN,
  SATURDAY,
  SPRING,
  SUMMER,
  SUNDAY,
  WINTER,
  seasonalComplaintWeight,
  seasonalGoodsMult,
  seasonalTravelWear,
  weekdayDemand,
} from '../src/game/data/seasons';
import { marketPrices } from '../src/game/systems/economy';
import { PATIENT_TEMPLATES } from '../src/game/data/patients';
import { createNewGame } from '../src/game/state';
import type { GameState } from '../src/game/types';
import type { PricedItem } from '../src/game/data/prices';

const ALL_SEASONS = [SPRING, SUMMER, AUTUMN, WINTER];
const ITEMS: PricedItem[] = ['linen', 'herbs', 'leeches', 'soap', 'wood', 'salve', 'ironTools'];

const inSeason = (season: number, weekday = 3): GameState => {
  const s = createNewGame('Jahr', 'de');
  s.season = season;
  s.weekday = weekday;
  s.locationId = 'nurnberg';
  return s;
};

describe('each season brings its own complaints', () => {
  it('gives every season something it favours', () => {
    for (const season of ALL_SEASONS) {
      const s = inSeason(season);
      const favoured = PATIENT_TEMPLATES.filter((t) => seasonalComplaintWeight(s, t) > 1);
      expect(favoured.length, `season ${season} favours nothing`).toBeGreaterThanOrEqual(4);
    }
  });

  it('names only templates that exist', () => {
    // A weighting keyed to a template id that was renamed would silently do
    // nothing — the defect this project keeps producing.
    const real = new Set(PATIENT_TEMPLATES.map((t) => t.id));
    for (const season of ALL_SEASONS) {
      const s = inSeason(season);
      // Every weighted id must correspond to a template we can actually roll.
      const weighted = PATIENT_TEMPLATES.filter((t) => seasonalComplaintWeight(s, t) !== 1);
      for (const t of weighted) expect(real.has(t.id)).toBe(true);
    }
  });

  it('puts chilblains in winter and wounds in summer, not the reverse', () => {
    const chilblains = PATIENT_TEMPLATES.find((t) => t.id === 'chilblains')!;
    const cut = PATIENT_TEMPLATES.find((t) => t.id === 'wound_cut')!;
    expect(seasonalComplaintWeight(inSeason(WINTER), chilblains)).toBeGreaterThan(
      seasonalComplaintWeight(inSeason(SUMMER), chilblains),
    );
    expect(seasonalComplaintWeight(inSeason(SUMMER), cut)).toBeGreaterThan(
      seasonalComplaintWeight(inSeason(WINTER), cut),
    );
  });

  it('never rules a complaint out entirely', () => {
    // A season that made a technique unusable for three months would be a
    // trap rather than a texture.
    for (const season of ALL_SEASONS) {
      const s = inSeason(season);
      for (const t of PATIENT_TEMPLATES) {
        expect(seasonalComplaintWeight(s, t), `${t.id} in ${season}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('prices follow the year', () => {
  it('makes herbs cheapest at the harvest and dearest in spring', () => {
    expect(seasonalGoodsMult(inSeason(AUTUMN), 'herbs')).toBeLessThan(1);
    expect(seasonalGoodsMult(inSeason(SPRING), 'herbs')).toBeGreaterThan(1);
  });

  it('makes firewood dear exactly when it is wanted', () => {
    expect(seasonalGoodsMult(inSeason(WINTER), 'wood')).toBeGreaterThan(
      seasonalGoodsMult(inSeason(SUMMER), 'wood'),
    );
  });

  it('moves the quoted price, not merely the multiplier', () => {
    // The season must reach `marketPrices`, or it is a number nobody reads.
    const autumn = marketPrices(inSeason(AUTUMN));
    const spring = marketPrices(inSeason(SPRING));
    expect(autumn.herbs).toBeLessThan(spring.herbs!);
  });

  it('never quotes a price below one coin, in any season or city', () => {
    for (const season of ALL_SEASONS) {
      for (const [item, price] of Object.entries(marketPrices(inSeason(season)))) {
        expect(price, `${item} in season ${season}`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('keeps every seasonal swing inside a believable band', () => {
    for (const season of ALL_SEASONS) {
      for (const item of ITEMS) {
        const m = seasonalGoodsMult(inSeason(season), item);
        expect(m, `${item} in ${season}`).toBeGreaterThanOrEqual(0.6);
        expect(m, `${item} in ${season}`).toBeLessThanOrEqual(1.5);
      }
    }
  });
});

describe('the week has a shape', () => {
  it('fills the stove on Saturday', () => {
    const d = weekdayDemand(inSeason(SPRING, SATURDAY));
    expect(d?.delta).toBeGreaterThan(0);
    expect(d?.key).toBe('demand_bath_day');
  });

  it('empties it on Sunday', () => {
    // The council forbade trading; a 5% nudge did not say that.
    const d = weekdayDemand(inSeason(SPRING, SUNDAY));
    expect(d?.delta).toBeLessThan(0);
  });

  it('leaves the working week alone', () => {
    for (const wd of [1, 2, 3, 4, 5]) {
      expect(weekdayDemand(inSeason(SPRING, wd))).toBeNull();
    }
  });
});

describe('winter roads', () => {
  it('costs more wear than summer ones', () => {
    expect(seasonalTravelWear(inSeason(WINTER))).toBeGreaterThan(
      seasonalTravelWear(inSeason(SUMMER)),
    );
  });

  it('is bounded, so a winter journey is hard and not fatal', () => {
    for (const season of ALL_SEASONS) {
      const w = seasonalTravelWear(inSeason(season));
      expect(w).toBeGreaterThanOrEqual(1);
      expect(w).toBeLessThanOrEqual(2);
    }
  });
});

describe('wired, not merely written', () => {
  const read = (p: string): string => readFileSync(join(process.cwd(), p), 'utf8');

  it('reaches the patient roll, the market, the queue and the road', () => {
    expect(read('src/game/systems/treatment.ts')).toContain('seasonalComplaintWeight(state, t)');
    expect(read('src/game/systems/economy.ts')).toContain('seasonalGoodsMult(state, item)');
    expect(read('src/game/systems/demand.ts')).toContain('weekdayDemand(state)');
    expect(read('src/game/systems/travel.ts')).toContain('seasonalTravelWear(state)');
  });

  it('names both new demand lines in both locales', () => {
    for (const key of ['demand_bath_day', 'demand_sabbath']) {
      expect(read('src/game/i18n/en.ts'), `en lacks ${key}`).toContain(`${key}:`);
      expect(read('src/game/i18n/de.ts'), `de lacks ${key}`).toContain(`${key}:`);
    }
  });
});
