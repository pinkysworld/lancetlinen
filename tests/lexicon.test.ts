/**
 * The lexicon.
 *
 * Its whole value is that a player can look something up and get an answer, so
 * the failure modes are: an entry whose text is missing (renders as a raw key),
 * an entry nothing links to, and a category that is empty.
 *
 * The old Codex was eight hand-positioned pages in a chain of `if` branches.
 * These tests exist so the data-driven replacement stays addable-to without
 * anyone having to open the scene.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  LEXICON,
  LEXICON_CATEGORIES,
  lexiconByCategory,
  lexiconEntry,
} from '../src/game/data/lexicon';

const EN = readFileSync(join(process.cwd(), 'src/game/i18n/en.ts'), 'utf8');
const DE = readFileSync(join(process.cwd(), 'src/game/i18n/de.ts'), 'utf8');

describe('structure', () => {
  it('has a substantial number of entries', () => {
    expect(LEXICON.length).toBeGreaterThanOrEqual(30);
  });

  it('gives every entry a unique id', () => {
    const ids = LEXICON.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('files every entry under a known category', () => {
    for (const e of LEXICON) {
      expect(LEXICON_CATEGORIES, `${e.id}`).toContain(e.category);
    }
  });

  it('leaves no category empty — an empty tab is a dead end', () => {
    for (const cat of LEXICON_CATEGORIES) {
      expect(lexiconByCategory(cat).length, cat).toBeGreaterThan(0);
    }
  });

  it('spreads entries rather than piling them into one category', () => {
    for (const cat of LEXICON_CATEGORIES) {
      expect(lexiconByCategory(cat).length, cat).toBeLessThanOrEqual(12);
    }
  });

  it('finds an entry by id', () => {
    expect(lexiconEntry('unehrlich')?.category).toBe('trade');
    expect(lexiconEntry('nonsense')).toBeUndefined();
  });
});

describe('text', () => {
  it('has a title and a body in both locales for every entry', () => {
    // A missing key renders the key itself on screen.
    const missing: string[] = [];
    for (const e of LEXICON) {
      for (const key of [e.titleKey, e.bodyKey]) {
        if (!EN.includes(`${key}:`)) missing.push(`en:${key}`);
        if (!DE.includes(`${key}:`)) missing.push(`de:${key}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('names every category in both locales', () => {
    for (const cat of LEXICON_CATEGORIES) {
      expect(EN, `en lacks lex_cat_${cat}`).toContain(`lex_cat_${cat}:`);
      expect(DE, `de lacks lex_cat_${cat}`).toContain(`lex_cat_${cat}:`);
    }
  });

  it('writes bodies long enough to be worth opening', () => {
    // A one-line entry is a label, not an article.
    const thin: string[] = [];
    for (const e of LEXICON) {
      const m = new RegExp(`\\b${e.bodyKey}: '([^']*)'`).exec(DE);
      if (!m || m[1]!.length < 180) thin.push(`${e.id} (${m?.[1]?.length ?? 0})`);
    }
    expect(thin).toEqual([]);
  });

  it('breaks longer articles into paragraphs', () => {
    // Solid blocks of 800 characters do not get read.
    const unbroken: string[] = [];
    for (const e of LEXICON) {
      const m = new RegExp(`\\b${e.bodyKey}: '([^']*)'`).exec(DE);
      const body = m?.[1] ?? '';
      if (body.length > 320 && !body.includes('\\n')) unbroken.push(e.id);
    }
    expect(unbroken).toEqual([]);
  });
});

describe('honesty about the history', () => {
  it('flags at least one entry as simplified', () => {
    // The game does simplify — coinage most obviously. Saying so in the
    // lexicon is the point of having one in a game that claims accuracy.
    expect(LEXICON.some((e) => e.simplified)).toBe(true);
  });

  it('covers the subject the game is actually about', () => {
    // Unehrlichkeit is the spine of the design; a lexicon without it would be
    // decoration.
    const ids = LEXICON.map((e) => e.id);
    for (const required of ['unehrlich', 'humors', 'bloodletting', 'zunft']) {
      expect(ids, `missing ${required}`).toContain(required);
    }
  });
});

describe('art references', () => {
  it('names only textures the preloader actually registers', () => {
    // A stale key silently shows no image — the entry still works, but the
    // reference is dead and should be caught.
    const preload = readFileSync(
      join(process.cwd(), 'src/game/scenes/PreloadScene.ts'),
      'utf8',
    );
    const missing = LEXICON.filter((e) => e.art && !preload.includes(`'${e.art}'`)).map(
      (e) => `${e.id} -> ${e.art}`,
    );
    expect(missing).toEqual([]);
  });
});
