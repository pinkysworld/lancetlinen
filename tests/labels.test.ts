/**
 * Label legibility, across every scene.
 *
 * Reported from play: "Ruhm, Ehre etc. sind schlecht lesbar durch fehlende
 * Leerzeichen" — the office buttons read `Elitengunst≥20`, and costs printed
 * as `80c`, a shorthand that means nothing to a player.
 *
 * Fixing the two sites found was not the point; the point was that nothing
 * stopped the next one being written. These tests scan the scene sources for
 * the shapes that produce unreadable labels, so a new one fails the build
 * rather than shipping.
 *
 * They are lint rules expressed as tests. That is deliberate: the game builds
 * its labels by string interpolation at dozens of sites, and there is no
 * runtime hook that could see them all.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SCENE_DIR = join(process.cwd(), 'src/game/scenes');
const scenes = readdirSync(SCENE_DIR)
  .filter((f) => f.endsWith('.ts'))
  .map((f) => ({ file: f, src: readFileSync(join(SCENE_DIR, f), 'utf8') }));

const I18N = ['en', 'de'].map((l) => ({
  locale: l,
  src: readFileSync(join(process.cwd(), `src/game/i18n/${l}.ts`), 'utf8'),
}));

/** Report `file:line` for every match, so a failure says where to look. */
function findAll(re: RegExp): string[] {
  const hits: string[] = [];
  for (const { file, src } of scenes) {
    src.split('\n').forEach((line, i) => {
      // Comments describe the bugs; they are not the bugs.
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
      const m = line.match(re);
      if (m) hits.push(`${file}:${i + 1}  ${m[0].trim()}`);
    });
  }
  return hits;
}

describe('comparison symbols', () => {
  it('never glues a comparison to the word before it', () => {
    // `Elitengunst≥20` — the exact reported defect.
    expect(findAll(/[\wäöüÄÖÜß}](≥|≤|<=|>=)/)).toEqual([]);
  });

  it('never glues a comparison to the value after it', () => {
    expect(findAll(/(≥|≤)\$\{/)).toEqual([]);
  });
});

describe('units and currency', () => {
  it('never abbreviates a cost as a bare letter after the number', () => {
    // `${price}c` renders as "80c". Use `coin_amount` so it reads as words in
    // both languages — German especially, where "c" means nothing.
    expect(findAll(/\$\{[\w.()]+\}c(?![\w])/)).toEqual([]);
  });

  it('never glues a word straight onto an interpolated value', () => {
    // Catches `${n}Tage` and similar. Punctuation and `/` are fine.
    expect(findAll(/\$\{[^}]+\}[A-Za-zÄÖÜäöüß]{2,}/)).toEqual([]);
  });
});

/*
 * There was a rule here forbidding `${a}${b}`. It was removed.
 *
 * Whether two adjacent interpolations need a separator cannot be decided from
 * the source: `${n >= 0 ? '+' : ''}${n}` is correct ("+5"), and so is
 * `${level}${mgr}` when `mgr` is built as ` · Verwalter`. The rule flagged
 * both and found no real defect. A lint rule that cannot distinguish a bug
 * from correct code trains people to ignore it, so it is better not to have
 * one — the rules below are the ones that only fire on genuine problems.
 */

describe('short unit suffixes', () => {
  it('never abbreviates a level as Lv, which reads as noise beside a number', () => {
    // Same family as `80c`: a bare Latin abbreviation glued to a value.
    expect(findAll(/\bLv\$\{/)).toEqual([]);
  });
});

describe('the i18n tables', () => {
  it('has no comparison symbol without surrounding space', () => {
    const bad: string[] = [];
    for (const { locale, src } of I18N) {
      src.split('\n').forEach((line, i) => {
        if (/[\wäöüÄÖÜß](≥|≤)|(≥|≤)[\wäöüÄÖÜß]/.test(line)) {
          bad.push(`${locale}.ts:${i + 1}`);
        }
      });
    }
    expect(bad).toEqual([]);
  });

  it('defines the shared currency and wage phrasings', () => {
    // These exist so cost labels are never hand-assembled again.
    for (const { locale, src } of I18N) {
      expect(src, `${locale} lacks coin_amount`).toContain('coin_amount:');
      expect(src, `${locale} lacks wage_per_day`).toContain('wage_per_day:');
    }
  });

  it('keeps both locales the same size', () => {
    // A key present in one language only shows up as a raw key on screen.
    const counts = I18N.map(({ src }) => (src.match(/^\s{2}\w+:/gm) ?? []).length);
    expect(Math.abs(counts[0]! - counts[1]!)).toBeLessThanOrEqual(1);
  });
});

describe('button labels stay short enough to read', () => {
  /**
   * Long labels are not forbidden — `makeButton` shrinks the type and grows the
   * face — but a label past this length is a sentence, and sentences do not
   * belong on buttons. German runs ~30% longer than English, so it binds.
   */
  it('keeps every literal button label under 60 characters', () => {
    const long: string[] = [];
    for (const { locale, src } of I18N) {
      for (const m of src.matchAll(/^\s{2}(\w+): '([^']{60,})'/gm)) {
        const key = m[1]!;
        // Only keys that plausibly label a control. Body copy — anything
        // ending in _desc, _hint, _blurb, _body — is prose and exempt.
        const isProse = /_(desc|hint|blurb|body|stats|help|tip|note)$/.test(key);
        if (!isProse && /^(btn_|menu_|nav_|action_)/.test(key)) {
          long.push(`${locale}:${key} (${m[2]!.length})`);
        }
      }
    }
    expect(long).toEqual([]);
  });
});
