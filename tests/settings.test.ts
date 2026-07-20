/**
 * Difficulty, and the gore text variants.
 *
 * These exist because of a specific failure: `incomeMult` and `goreVariantKey`
 * were both written, both correct, and both never called. A unit test of the
 * multiplier itself would have passed happily while the setting did nothing —
 * so almost everything here asserts on a **computed result** or on the **call
 * site**, never on the multiplier in isolation.
 *
 * `treatment.ts` pulls in Phaser (via `ui/art`) and cannot be imported under
 * Node, so its pay path is guarded at the source level, the way
 * `content.test.ts` guards the scenario table. That is weaker than a
 * behavioural test but it does catch the thing that actually went wrong:
 * the call disappearing, or drifting to the wrong side of a clamp.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { dailyOperatingCost } from '../src/game/systems/economy';
import { titlePayMult } from '../src/game/systems/politics';
import { updateSettings, pressureMult, incomeMult } from '../src/game/systems/settings';
import { createNewGame, mutate, getState } from '../src/game/state';
import type { Difficulty, GameState } from '../src/game/types';

const TREATMENT_SRC = readFileSync(
  join(process.cwd(), 'src/game/systems/treatment.ts'),
  'utf8',
);
const EN_SRC = readFileSync(join(process.cwd(), 'src/game/i18n/en.ts'), 'utf8');
const DE_SRC = readFileSync(join(process.cwd(), 'src/game/i18n/de.ts'), 'utf8');

const DIFFICULTIES: Difficulty[] = ['merciful', 'fair', 'harsh'];

/**
 * A staffed bathhouse in the player's current city.
 *
 * `dailyOperatingCost` reads `state.properties` via `getLocalBath`, not the
 * legacy `state.bathhouse` field — seeding the latter leaves it on the flat
 * no-premises path where there is nothing to scale.
 */
function seedBath(): void {
  mutate((s: GameState) => {
    s.properties = [
      {
        id: 'test_bath',
        cityId: s.locationId,
        kind: 'bathhouse',
        level: 3,
        staffApprentice: 2,
        staffBathMaid: 1,
        boiler: true,
        hasManager: false,
      } as unknown as GameState['properties'][number],
    ];
  });
}

beforeEach(() => {
  createNewGame('Test');
  updateSettings({ difficulty: 'fair' });
});

describe('difficulty presses on both sides', () => {
  it('orders the multipliers so harsh costs more and pays less', () => {
    const seen = DIFFICULTIES.map((d) => {
      updateSettings({ difficulty: d });
      return { d, pressure: pressureMult(), income: incomeMult() };
    });
    const [merciful, fair, harsh] = seen;
    expect(merciful!.pressure).toBeLessThan(fair!.pressure);
    expect(fair!.pressure).toBeLessThan(harsh!.pressure);
    expect(merciful!.income).toBeGreaterThan(fair!.income);
    expect(fair!.income).toBeGreaterThan(harsh!.income);
  });

  it('actually changes the daily operating cost', () => {
    // The regression: pressureMult existed and dailyOperatingCost ignored it.
    seedBath();
    const costs = DIFFICULTIES.map((d) => {
      updateSettings({ difficulty: d });
      return dailyOperatingCost(getState());
    });
    const [merciful, fair, harsh] = costs;
    expect(merciful!).toBeLessThan(fair!);
    expect(fair!).toBeLessThan(harsh!);
  });

  it('never makes the day free, however merciful', () => {
    seedBath();
    updateSettings({ difficulty: 'merciful' });
    expect(dailyOperatingCost(getState())).toBeGreaterThan(0);
  });
});

describe('treatment pay wiring', () => {
  /** The single expression that computes base pay. */
  const payExpr = (() => {
    const m = TREATMENT_SRC.match(/let pay = Math\.round\(([\s\S]*?)\);/);
    return m?.[1] ?? '';
  })();

  it('finds the pay computation at all', () => {
    expect(payExpr).not.toBe('');
  });

  it('scales base pay by difficulty', () => {
    // This is the assertion that was missing when incomeMult shipped unused.
    expect(payExpr).toContain('incomeMult()');
  });

  it('applies difficulty before the clamps, not after', () => {
    // A death must still pay 0 and a beggar must still cap at 4 on merciful.
    const payIdx = TREATMENT_SRC.indexOf('let pay = Math.round(');
    const deathIdx = TREATMENT_SRC.indexOf('pay = 0');
    const beggarIdx = TREATMENT_SRC.indexOf('pay = Math.min(pay, 4)');
    expect(deathIdx).toBeGreaterThan(payIdx);
    expect(beggarIdx).toBeGreaterThan(payIdx);
  });

  it('uses the shared title table rather than its own copy', () => {
    // treatment.ts used to inline the politics.ts table as a nested ternary.
    expect(payExpr).toContain('titleMult');
    expect(TREATMENT_SRC).toContain('titlePayMult(state)');
    expect(TREATMENT_SRC).not.toMatch(/state\.title === 'noble_surgeon'\s*\?/);
  });
});

describe('title pay table', () => {
  it('rises monotonically with rank', () => {
    const order = ['none', 'freeman', 'master_bader', 'honorable', 'noble_surgeon'];
    const values = order.map((title) => {
      mutate((s: GameState) => {
        s.title = title as GameState['title'];
      });
      return titlePayMult(getState());
    });
    for (let i = 1; i < values.length; i++) {
      expect(values[i]!).toBeGreaterThan(values[i - 1]!);
    }
  });

  it('leaves an untitled Bader unmultiplied', () => {
    mutate((s: GameState) => {
      s.title = 'none';
    });
    expect(titlePayMult(getState())).toBe(1);
  });
});

describe('gore text variants', () => {
  /** Every messageKey the treatment resolver can emit. */
  const messageKeys = [
    ...new Set(
      Array.from(TREATMENT_SRC.matchAll(/messageKey = '(\w+)'/g)).map((m) => m[1]!),
    ),
  ];

  it('finds the treatment outcome keys', () => {
    expect(messageKeys.length).toBeGreaterThanOrEqual(4);
  });

  it('has a _low variant for every outcome, in both locales', () => {
    // goreVariantKey appends `_low` unconditionally, so a missing variant
    // renders the raw key on screen. This is the check that was absent when
    // the gore setting silently did nothing to the text.
    const missing: string[] = [];
    for (const key of messageKeys) {
      if (!EN_SRC.includes(`${key}_low:`)) missing.push(`en:${key}_low`);
      if (!DE_SRC.includes(`${key}_low:`)) missing.push(`de:${key}_low`);
    }
    expect(missing).toEqual([]);
  });

  it('keeps the same interpolations as the base string', () => {
    // A variant that drops {{pay}} would render a literal placeholder-free
    // sentence and quietly lose information.
    const placeholders = (src: string, key: string): string[] => {
      const m = src.match(new RegExp(`\\b${key}: '([^']*)'`));
      return (m?.[1] ?? '').match(/\{\{\w+\}\}/g)?.sort() ?? [];
    };
    for (const src of [EN_SRC, DE_SRC]) {
      for (const key of messageKeys) {
        expect(placeholders(src, `${key}_low`), `${key}_low placeholders`).toEqual(
          placeholders(src, key),
        );
      }
    }
  });

  it('is wired into the scene that shows the outcome', () => {
    const scene = readFileSync(
      join(process.cwd(), 'src/game/scenes/TreatmentScene.ts'),
      'utf8',
    );
    expect(scene).toContain('goreVariantKey(r.messageKey)');
  });
});
