/**
 * Character origins.
 *
 * These guard two things that are easy to get wrong and impossible to notice
 * in review:
 *
 * 1. **Referential integrity.** Origins grant techniques by id. Two of the six
 *    originally referenced `wound_dressing` and `bone_setting`, neither of
 *    which exists — the real ids are `wound_dress` and `fracture_set`. Nothing
 *    would have thrown; the player would simply never have received them. Same
 *    class of defect as the unreachable `dynasty` ending.
 * 2. **The honour trade actually biting.** The design claim is that a skilled
 *    origin starts disreputable. If that stops being true the whole system
 *    collapses into "pick the best one".
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ORIGINS, originById, applyOriginStats } from '../src/game/data/origins';
import { createNewGame, defaultStats } from '../src/game/state';
import { honour, HONOUR_START, MARRIAGE_HONOUR_REQUIRED } from '../src/game/systems/honour';

const TECH_SRC = readFileSync(join(process.cwd(), 'src/game/data/techniques.ts'), 'utf8');
const EN_SRC = readFileSync(join(process.cwd(), 'src/game/i18n/en.ts'), 'utf8');
const DE_SRC = readFileSync(join(process.cwd(), 'src/game/i18n/de.ts'), 'utf8');

const techniqueIds = new Set(
  [...TECH_SRC.matchAll(/id: '([a-z_]+)'/g)].map((m) => m[1]!),
);

describe('referential integrity', () => {
  it('grants only techniques that exist', () => {
    // The regression: two invented ids that would have silently granted nothing.
    const bad: string[] = [];
    for (const o of ORIGINS) {
      for (const t of o.techniques) {
        if (!techniqueIds.has(t)) bad.push(`${o.id} -> ${t}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('names every origin in both locales', () => {
    const missing: string[] = [];
    for (const o of ORIGINS) {
      for (const key of [o.nameKey, o.descKey, o.hintKey]) {
        if (!EN_SRC.includes(`${key}:`)) missing.push(`en:${key}`);
        if (!DE_SRC.includes(`${key}:`)) missing.push(`de:${key}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('has unique ids and portrait keys', () => {
    expect(new Set(ORIGINS.map((o) => o.id)).size).toBe(ORIGINS.length);
    expect(new Set(ORIGINS.map((o) => o.portraitKey)).size).toBe(ORIGINS.length);
  });

  it('offers period names for each origin', () => {
    for (const o of ORIGINS) {
      expect(o.names.length, o.id).toBeGreaterThanOrEqual(3);
    }
  });

  it('falls back to a real origin for an unknown or missing id', () => {
    // Old saves predate `originId` entirely.
    expect(originById(undefined).id).toBe(ORIGINS[0]!.id);
    expect(originById('nonsense').id).toBe(ORIGINS[0]!.id);
  });
});

describe('the honour trade', () => {
  /** Total stat points an origin adds. */
  const power = (o: (typeof ORIGINS)[number]) =>
    Object.values(o.stats).reduce((a, b) => a + b, 0);

  it('makes the most skilled origin the least honourable', () => {
    const best = [...ORIGINS].sort((a, b) => power(b) - power(a))[0]!;
    const leastHonourable = [...ORIGINS].sort((a, b) => a.honour - b.honour)[0]!;
    expect(best.id).toBe(leastHonourable.id);
  });

  it('makes the most honourable origin pay for it in skill', () => {
    const mostHonourable = [...ORIGINS].sort((a, b) => b.honour - a.honour)[0]!;
    const median = [...ORIGINS].map(power).sort((a, b) => a - b)[Math.floor(ORIGINS.length / 2)]!;
    expect(power(mostHonourable)).toBeLessThanOrEqual(median);
  });

  it('leaves no origin strictly better than another', () => {
    // A dominated option is a wasted option.
    for (const a of ORIGINS) {
      for (const b of ORIGINS) {
        if (a.id === b.id) continue;
        const dominates =
          power(a) >= power(b) &&
          a.coin >= b.coin &&
          a.honour >= b.honour &&
          a.techniques.length >= b.techniques.length &&
          (power(a) > power(b) || a.coin > b.coin || a.honour > b.honour);
        expect(dominates, `${a.id} dominates ${b.id}`).toBe(false);
      }
    }
  });

  it('keeps every origin inside the honour ranks', () => {
    for (const o of ORIGINS) {
      const h = HONOUR_START + o.honour;
      expect(h, o.id).toBeGreaterThan(0);
      expect(h, o.id).toBeLessThan(70);
    }
  });

  it('starts no origin already able to marry', () => {
    // Marriage is meant to be earned; a free pass would skip the system.
    for (const o of ORIGINS) {
      expect(HONOUR_START + o.honour, o.id).toBeLessThan(MARRIAGE_HONOUR_REQUIRED);
    }
  });
});

describe('applied to a new game', () => {
  it('never leaves a stat below 1', () => {
    // The scholar and the field surgeon both carry negative offsets.
    for (const o of ORIGINS) {
      const s = applyOriginStats(defaultStats(), o);
      for (const [k, v] of Object.entries(s)) {
        expect(v, `${o.id}.${k}`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('never starts the player broke', () => {
    for (const o of ORIGINS) {
      expect(createNewGame('Test', 'en', o.id).coin, o.id).toBeGreaterThan(0);
    }
  });

  it('actually differentiates the runs', () => {
    // The point of the whole feature: two origins must not produce the same start.
    const seen = ORIGINS.map((o) => {
      const s = createNewGame('Test', 'en', o.id);
      return JSON.stringify([s.stats, s.coin, s.honour, s.unlockedTechniques.length]);
    });
    expect(new Set(seen).size).toBe(ORIGINS.length);
  });

  it('records the origin so the save can show it later', () => {
    expect(createNewGame('Test', 'en', 'executioner_kin').originId).toBe('executioner_kin');
  });

  it('grants the origin techniques on top of the starter set', () => {
    const plain = createNewGame('Test', 'en', 'journeyman').unlockedTechniques;
    const surgeon = createNewGame('Test', 'en', 'field_surgeon').unlockedTechniques;
    expect(surgeon.length).toBeGreaterThan(plain.length);
    expect(surgeon).toContain('wound_dress');
  });

  it('does not duplicate a technique already in the starter set', () => {
    for (const o of ORIGINS) {
      const list = createNewGame('Test', 'en', o.id).unlockedTechniques;
      expect(new Set(list).size, o.id).toBe(list.length);
    }
  });

  it('applies the honour offset', () => {
    const kin = createNewGame('Test', 'en', 'executioner_kin');
    const scholar = createNewGame('Test', 'en', 'monastery_scholar');
    expect(honour(kin)).toBeLessThan(honour(scholar));
    expect(honour(kin)).toBeGreaterThan(0);
  });

  it('still works with no origin given, for old callers', () => {
    const s = createNewGame('Test');
    expect(s.originId).toBe(ORIGINS[0]!.id);
    expect(s.coin).toBeGreaterThan(0);
  });
});
