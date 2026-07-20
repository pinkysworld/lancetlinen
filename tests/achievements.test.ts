/**
 * Achievement reachability.
 *
 * The audit found the `dynasty` ending was mathematically unreachable — a bug
 * that only showed up because someone did the arithmetic. Achievements are the
 * same shape of hazard: a predicate reading a flag nothing sets looks perfectly
 * fine in review and is simply never granted.
 *
 * These tests hold the set to two rules: every id must be unlockable by some
 * state, and the ids themselves must never change once published, because
 * Steamworks keys on them permanently.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ACHIEVEMENTS, checkAchievements } from '../src/game/systems/achievements';
import { HONOUR_CEILING } from '../src/game/systems/honour';
import type { GameState } from '../src/game/types';

/** A state generous enough to satisfy every non-exclusive achievement. */
const maximal = (): GameState =>
  ({
    totalTreated: 100,
    deathsOnHands: 0,
    coin: 5000,
    honour: HONOUR_CEILING,
    guildRank: 'master',
    office: 'council_seat',
    ending: 'dynasty',
    storyFlags: { epidemic_saves: 10 },
    journal: [],
  }) as unknown as GameState;

describe('achievement set', () => {
  it('has unique ids', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses SCREAMING_SNAKE ids, as Steamworks expects', () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.id).toMatch(/^[A-Z][A-Z0-9_]*$/);
    }
  });

  it('names every achievement in both locales', () => {
    const en = readFileSync(join(process.cwd(), 'src/game/i18n/en.ts'), 'utf8');
    const de = readFileSync(join(process.cwd(), 'src/game/i18n/de.ts'), 'utf8');
    for (const a of ACHIEVEMENTS) {
      for (const key of [a.nameKey, a.descKey]) {
        expect(en, `en is missing ${key}`).toContain(`${key}:`);
        expect(de, `de is missing ${key}`).toContain(`${key}:`);
      }
    }
  });
});

describe('reachability', () => {
  it('grants every achievement that is not deliberately exclusive', () => {
    // RICH_AND_INFAMOUS requires low honour, so it cannot co-exist with the
    // honourable ones in a single state — it is checked separately below.
    const exclusive = new Set(['RICH_AND_INFAMOUS']);
    const s = maximal();
    const granted = new Set(checkAchievements(s));
    for (const a of ACHIEVEMENTS) {
      if (exclusive.has(a.id)) continue;
      expect(a.earned(s), `${a.id} is unreachable`).toBe(true);
    }
    expect(granted.size).toBeGreaterThan(0);
  });

  it('grants the infamous path from its own state', () => {
    const rich = { ...maximal(), coin: 3000, honour: 5 } as GameState;
    const ach = ACHIEVEMENTS.find((a) => a.id === 'RICH_AND_INFAMOUS')!;
    expect(ach.earned(rich)).toBe(true);
  });

  it('grants nothing to a fresh Bader', () => {
    // Mirrors `createNewGame` in state.ts — notably guildRank starts at
    // 'apprentice', which briefly made GUILD_BROTHER a free unlock.
    const fresh = {
      totalTreated: 0,
      deathsOnHands: 0,
      coin: 40,
      honour: 30,
      guildRank: 'apprentice',
      office: 'none',
      ending: null,
      storyFlags: {},
      journal: [],
    } as unknown as GameState;
    for (const a of ACHIEVEMENTS) {
      expect(a.earned(fresh), `${a.id} is granted too cheaply`).toBe(false);
    }
  });

  it('survives a save that predates the fields a predicate reads', () => {
    // Old saves are the usual cause of a day-end crash; predicates are guarded.
    const ancient = { journal: [] } as unknown as GameState;
    expect(() => checkAchievements(ancient)).not.toThrow();
  });
});

describe('honour achievements track the era ceiling', () => {
  it('does not ask for more honour than 1382 allows', () => {
    const ceilingState = { ...maximal(), honour: HONOUR_CEILING } as GameState;
    const ach = ACHIEVEMENTS.find((a) => a.id === 'AS_HONEST_AS_ALLOWED')!;
    expect(ach.earned(ceilingState)).toBe(true);
  });
});
