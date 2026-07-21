/**
 * Compounding.
 *
 * Replaces `craftSalve`, which was two herbs and a linen into two salve and
 * nothing else. The risks in a system like this are: a recipe that consumes
 * ingredients and produces nothing, a remedy with no effect (decoration), and
 * an economy where making and selling is more profitable than practising.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  RECIPES,
  RECIPE_MAP,
  craft,
  craftBlocker,
  addRemedy,
  remedyCount,
  consumeRemedy,
  bestRemedyFor,
} from '../src/game/data/recipes';
import { createNewGame } from '../src/game/state';
import type { GameState } from '../src/game/types';

const EN = readFileSync(join(process.cwd(), 'src/game/i18n/en.ts'), 'utf8');
const DE = readFileSync(join(process.cwd(), 'src/game/i18n/de.ts'), 'utf8');
const TECH = readFileSync(join(process.cwd(), 'src/game/data/techniques.ts'), 'utf8');
const TREATMENT = readFileSync(
  join(process.cwd(), 'src/game/systems/treatment.ts'),
  'utf8',
);

/** A well-supplied Bader, so ingredient shortfall is not the variable. */
function stocked(): GameState {
  const s = createNewGame('Test');
  s.coin = 500;
  s.stats.eye = 8;
  s.stats.hand = 8;
  for (const k of Object.keys(s.inventory) as Array<keyof typeof s.inventory>) {
    s.inventory[k] = 40;
  }
  return s;
}

describe('the recipe table', () => {
  it('offers a real spread, not one token recipe', () => {
    expect(RECIPES.length).toBeGreaterThanOrEqual(6);
  });

  it('gives every recipe a unique id', () => {
    const ids = RECIPES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('names and describes every recipe in both locales', () => {
    const missing: string[] = [];
    for (const r of RECIPES) {
      for (const key of [r.nameKey, r.descKey]) {
        if (!EN.includes(`${key}:`)) missing.push(`en:${key}`);
        if (!DE.includes(`${key}:`)) missing.push(`de:${key}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('targets only categories that techniques actually use', () => {
    // An invented category would make the remedy silently never apply — the
    // same defect class as the unreachable achievement.
    const real = new Set(
      [...TECH.matchAll(/category: '(\w+)'/g)].map((m) => m[1]!),
    );
    for (const r of RECIPES) {
      const cat = r.effect.forCategory;
      if (cat) expect(real, `${r.id} targets ${cat}`).toContain(cat);
    }
  });

  it('gives every remedy at least one effect', () => {
    for (const r of RECIPES) {
      const e = r.effect;
      const any = (e.successBonus ?? 0) + (e.payMult ?? 1) - 1 + (e.safety ?? 0);
      expect(any, `${r.id} does nothing`).toBeGreaterThan(0);
    }
  });

  it('needs ingredients for every recipe — none are made from thin air', () => {
    for (const r of RECIPES) {
      const total = Object.values(r.ingredients).reduce((a, b) => a + (b ?? 0), 0);
      expect(total, r.id).toBeGreaterThan(0);
    }
  });
});

describe('balance', () => {
  it('makes the strongest remedy the hardest to prepare', () => {
    const byPower = [...RECIPES].sort(
      (a, b) => (b.effect.successBonus ?? 0) - (a.effect.successBonus ?? 0),
    );
    const strongest = byPower[0]!;
    const cheapest = [...RECIPES].sort((a, b) => a.coin - b.coin)[0]!;
    expect(strongest.id).not.toBe(cheapest.id);
    expect(strongest.minEye).toBeGreaterThanOrEqual(4);
  });

  it('keeps every bonus small enough not to trivialise treatment', () => {
    // Success chance clamps at 0.96; a remedy must help, not decide.
    for (const r of RECIPES) {
      expect(r.effect.successBonus ?? 0, r.id).toBeLessThanOrEqual(0.15);
    }
  });

  it('scales cost with power', () => {
    const cheap = RECIPES.filter((r) => r.coin <= 5);
    const dear = RECIPES.filter((r) => r.coin >= 14);
    const avg = (rs: typeof RECIPES) =>
      rs.reduce((a, r) => a + (r.effect.successBonus ?? 0), 0) / rs.length;
    expect(avg(dear)).toBeGreaterThan(avg(cheap));
  });
});

describe('preparing', () => {
  it('produces stock and takes payment', () => {
    const s = stocked();
    const coin = s.coin;
    const herbs = s.inventory.herbs;
    const res = craft(s, 'sage_wash', () => 0.5);
    expect(res.ok).toBe(true);
    expect(res.made!).toBeGreaterThan(0);
    expect(remedyCount(s, 'sage_wash')).toBe(res.made);
    expect(s.coin).toBeLessThan(coin);
    expect(s.inventory.herbs).toBeLessThan(herbs);
  });

  it('never consumes ingredients without producing something', () => {
    // The worst outcome in a crafting system: paying and getting nothing.
    const s = stocked();
    for (const r of RECIPES) {
      const before = remedyCount(s, r.id);
      const res = craft(s, r.id, () => 0);
      if (res.ok) expect(remedyCount(s, r.id), r.id).toBeGreaterThan(before);
    }
  });

  it('refuses when the Eye is too untrained, without taking anything', () => {
    const s = stocked();
    s.stats.eye = 1;
    const coin = s.coin;
    const res = craft(s, 'theriac');
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('skill');
    expect(s.coin, 'must not charge for a refused batch').toBe(coin);
  });

  it('refuses when ingredients are short, without taking coin', () => {
    const s = stocked();
    s.inventory.herbs = 0;
    const coin = s.coin;
    const res = craft(s, 'wound_drink');
    expect(res.reason).toBe('ingredients');
    expect(s.coin).toBe(coin);
  });

  it('refuses when the purse is empty, without taking ingredients', () => {
    const s = stocked();
    s.coin = 0;
    const herbs = s.inventory.herbs;
    const res = craft(s, 'theriac');
    expect(res.reason).toBe('coin');
    expect(s.inventory.herbs).toBe(herbs);
  });

  it('rewards skill with a better yield', () => {
    const poor = stocked();
    poor.stats.eye = 2;
    const good = stocked();
    good.stats.eye = 10;
    const a = craft(poor, 'oxymel', () => 0.5);
    const b = craft(good, 'oxymel', () => 0.5);
    expect(b.quality!).toBeGreaterThan(a.quality!);
  });

  it('reports why a recipe is unavailable', () => {
    const s = stocked();
    expect(craftBlocker(s, RECIPE_MAP.sage_wash!)).toBeNull();
    s.stats.eye = 1;
    expect(craftBlocker(s, RECIPE_MAP.theriac!)).toBe('skill');
  });
});

describe('stock', () => {
  it('starts empty and survives an old save with no remedies field', () => {
    const s = createNewGame('Test');
    expect(remedyCount(s, 'theriac')).toBe(0);
    expect(consumeRemedy(s, 'theriac')).toBe(false);
  });

  it('never goes negative', () => {
    const s = createNewGame('Test');
    addRemedy(s, 'oxymel', 1);
    expect(consumeRemedy(s, 'oxymel')).toBe(true);
    expect(consumeRemedy(s, 'oxymel')).toBe(false);
    expect(remedyCount(s, 'oxymel')).toBe(0);
  });
});

describe('choosing a remedy', () => {
  it('returns nothing when the shelf is bare', () => {
    expect(bestRemedyFor(createNewGame('Test'), 'wound')).toBeNull();
  });

  it('prefers the remedy made for the job over a general one', () => {
    // Using theriac on a tooth would be a waste of the most expensive thing
    // the player can make.
    const s = createNewGame('Test');
    addRemedy(s, 'theriac', 1);
    addRemedy(s, 'sage_wash', 1);
    expect(bestRemedyFor(s, 'dental')?.id).toBe('sage_wash');
  });

  it('does not offer a wound remedy for a tooth', () => {
    const s = createNewGame('Test');
    addRemedy(s, 'wound_drink', 1);
    expect(bestRemedyFor(s, 'dental')).toBeNull();
  });

  it('falls back to a general remedy when nothing specific is held', () => {
    const s = createNewGame('Test');
    addRemedy(s, 'theriac', 1);
    expect(bestRemedyFor(s, 'dental')?.id).toBe('theriac');
  });
});

describe('remedies actually reach treatment', () => {
  // Written as source checks because treatment.ts imports Phaser via ui/art
  // and cannot be loaded under Node.
  it('applies the success bonus', () => {
    expect(TREATMENT).toContain('remedy.effect.successBonus');
  });

  it('consumes the remedy, win or lose', () => {
    expect(TREATMENT).toContain('consumeRemedy(state, remedy.id)');
  });

  it('lets safety pull a death back to a failure', () => {
    expect(TREATMENT).toContain('effect.safety');
  });

  it('pays more for a named preparation', () => {
    expect(TREATMENT).toContain('remedyPay');
  });
});
