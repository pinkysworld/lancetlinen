/**
 * Tomorrow, tonight.
 *
 * Block 3 gave the year and the week a shape, but the player only learned
 * what kind of day it was on the morning of it. "Do not open the vein today,
 * tomorrow the sign is favourable" is a decision only if tomorrow is visible
 * the evening before.
 *
 * The notes are computed by asking the *real* rules about `day + 1` rather
 * than by a parallel prediction, so they cannot drift from what the morning
 * then actually does. These tests hold that equivalence.
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

vi.mock('phaser', () => ({ default: {} }));

import { SATURDAY, SUNDAY, tomorrowNotes, weekdayDemand } from '../src/game/data/seasons';
import { isEgyptianDay, moonSign } from '../src/game/data/bloodletting';
import { MAP_NODE_MAP } from '../src/game/data/map';
import { createNewGame } from '../src/game/state';
import type { GameState } from '../src/game/types';

const EN = readFileSync(join(process.cwd(), 'src/game/i18n/en.ts'), 'utf8');
const DE = readFileSync(join(process.cwd(), 'src/game/i18n/de.ts'), 'utf8');

const on = (day: number, weekday: number, locationId = 'nurnberg'): GameState => {
  const s = createNewGame('Vorschau', 'de');
  s.day = day;
  s.weekday = weekday;
  s.locationId = locationId;
  return s;
};

const keys = (s: GameState): string[] => tomorrowNotes(s).map((n) => n.key);

describe('it announces the day that is coming', () => {
  it('calls Saturday the bathing day, from Friday', () => {
    expect(keys(on(10, SATURDAY - 1))).toContain('note_demand_bath_day');
  });

  it('calls Sunday out, from Saturday', () => {
    expect(keys(on(10, SATURDAY))).toContain('note_demand_sabbath');
  });

  it('says nothing about an ordinary weekday', () => {
    // Tuesday into Wednesday: no bathing day, no Sabbath.
    const k = keys(on(10, 2));
    expect(k).not.toContain('note_demand_bath_day');
    expect(k).not.toContain('note_demand_sabbath');
  });

  it('warns of an Egyptian day before it arrives', () => {
    // Day 3 and 17 of each 30-day month; announce from the day before.
    const s = on(2, 3);
    expect(isEgyptianDay(3)).toBe(true);
    expect(keys(s)).toContain('note_egyptian_day');
  });

  it('announces the market day of the city you are standing in', () => {
    const node = MAP_NODE_MAP['nurnberg']!;
    // Set today to the day before Nürnberg's market day.
    const s = on(10, (node.marketDay + 6) % 7);
    expect(keys(s)).toContain('note_market_day');
  });

  it('does not announce another city’s market day', () => {
    const nurnberg = MAP_NODE_MAP['nurnberg']!;
    const s = on(10, (nurnberg.marketDay + 6) % 7, 'road_camp');
    // The camp has no market at all (`marketDay: -1`).
    expect(keys(s)).not.toContain('note_market_day');
  });
});

describe('it agrees with what the morning will do', () => {
  it('never claims a bathing day the rules will not give', () => {
    for (let wd = 0; wd < 7; wd++) {
      const s = on(10, wd);
      const said = keys(s).includes('note_demand_bath_day');
      const willBe =
        weekdayDemand({ ...s, weekday: (wd + 1) % 7 })?.key === 'demand_bath_day';
      expect(said, `weekday ${wd}`).toBe(willBe);
    }
  });

  it('names the sign the moon will actually be in', () => {
    for (let d = 1; d <= 30; d++) {
      const s = on(d, 3);
      const note = tomorrowNotes(s).find((n) => n.key === 'note_moon_moves');
      if (!note) continue;
      const tomorrow = { ...s, day: d + 1 };
      expect(note.params?.sign, `day ${d}`).toBe(`zodiac_${moonSign(tomorrow)}`);
    }
  });

  it('mentions the moon only when the sign actually changes overnight', () => {
    for (let d = 1; d <= 30; d++) {
      const s = on(d, 3);
      if (isEgyptianDay(d + 1)) continue; // the warning takes precedence
      const moved = moonSign({ ...s, day: d + 1 }) !== moonSign(s);
      expect(keys(s).includes('note_moon_moves'), `day ${d}`).toBe(moved);
    }
  });
});

describe('the turn of the year', () => {
  it('announces a new season on the eve of it', () => {
    // `economy.ts` advances the season when `day % 30 === 0`.
    const s = on(29, 3);
    expect(keys(s).some((k) => k.startsWith('note_season_'))).toBe(true);
  });

  it('does not announce one on an ordinary evening', () => {
    expect(keys(on(12, 3)).some((k) => k.startsWith('note_season_'))).toBe(false);
  });

  it('survives the last day of a year without throwing', () => {
    // Day 359→360 crosses both the season and the year counters.
    for (const d of [29, 59, 119, 359, 360]) {
      expect(() => tomorrowNotes(on(d, 3))).not.toThrow();
    }
  });
});

describe('every note has words', () => {
  it('writes each one in both locales', () => {
    const src = readFileSync(join(process.cwd(), 'src/game/data/seasons.ts'), 'utf8');
    const found = new Set([
      ...[...src.matchAll(/key: '(note_[a-z_0-9]+)'/g)].map((m) => m[1]!),
      // The two built from `weekdayDemand`, and the four seasons.
      'note_demand_bath_day',
      'note_demand_sabbath',
      'note_season_0',
      'note_season_1',
      'note_season_2',
      'note_season_3',
      'tomorrow_label',
    ]);
    const missing: string[] = [];
    for (const k of found) {
      if (!EN.includes(`${k}:`)) missing.push(`en:${k}`);
      if (!DE.includes(`${k}:`)) missing.push(`de:${k}`);
    }
    expect(missing).toEqual([]);
  });
});

describe('wired, not merely written', () => {
  const read = (p: string): string => readFileSync(join(process.cwd(), p), 'utf8');

  it('is printed where the player decides what to do next', () => {
    expect(read('src/game/scenes/DaySummaryScene.ts')).toContain('tomorrowNotes(getState())');
    expect(read('src/game/scenes/HubScene.ts')).toContain('tomorrowNotes(s)');
  });
});
