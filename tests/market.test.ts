/**
 * Buying and selling.
 *
 * Selling did not exist. `cannot_afford_day` told the player "sell supplies or
 * travel" when they ran out of coin, and the market screen only ever offered
 * buying — so the game's own advice pointed at a feature that had never been
 * built, and travel costs coin too. Reported from play twice: "I have plenty
 * of supplies but cannot open."
 */
import { describe, it, expect } from 'vitest';
import {
  buySupplies,
  sellSupplies,
  sellPrice,
  marketPrices,
  dailyOperatingCost,
  isDestitute,
} from '../src/game/systems/economy';
import { createNewGame, getState, mutate, setState } from '../src/game/state';
import type { GameState } from '../src/game/types';

const fresh = (): GameState => {
  setState(createNewGame('Test'));
  return getState();
};

describe('sell price', () => {
  it('is below the asking price, so the market is not a coin pump', () => {
    for (const p of [1, 2, 5, 9, 20, 100]) {
      expect(sellPrice(p), `price ${p}`).toBeLessThan(p + 1);
      expect(sellPrice(p)).toBeLessThanOrEqual(Math.max(1, p / 2) + 0.5);
    }
  });

  it('never pays zero — a sale must always be worth making', () => {
    expect(sellPrice(1)).toBeGreaterThanOrEqual(1);
    expect(sellPrice(0)).toBeGreaterThanOrEqual(1);
  });

  it('cannot be arbitraged by buying and immediately reselling', () => {
    const s = fresh();
    const prices = marketPrices(s);
    const item = 'linen' as const;
    const before = s.coin;
    buySupplies(s, item, 5, prices[item]!);
    sellSupplies(s, item, 5, prices[item]!);
    expect(s.coin).toBeLessThan(before);
  });
});

describe('selling', () => {
  it('turns stock into coin', () => {
    const s = fresh();
    const prices = marketPrices(s);
    const coin = s.coin;
    const linen = s.inventory.linen;
    expect(sellSupplies(s, 'linen', 2, prices.linen!)).toBe(true);
    expect(s.inventory.linen).toBe(linen - 2);
    expect(s.coin).toBeGreaterThan(coin);
  });

  it('refuses to sell more than is held', () => {
    const s = fresh();
    const prices = marketPrices(s);
    const linen = s.inventory.linen;
    expect(sellSupplies(s, 'linen', linen + 1, prices.linen!)).toBe(false);
    expect(s.inventory.linen, 'stock must be untouched').toBe(linen);
  });

  it('never drives stock negative', () => {
    const s = fresh();
    const prices = marketPrices(s);
    for (let i = 0; i < 40; i++) sellSupplies(s, 'linen', 1, prices.linen!);
    expect(s.inventory.linen).toBeGreaterThanOrEqual(0);
  });
});

describe('the reported situation', () => {
  it('lets a player with stock and one coin trade their way to opening', () => {
    // Exactly what was reported: supplies on the shelf, a single coin, and no
    // way to open. Selling has to be enough to cover a day.
    const s = fresh();
    mutate((x) => {
      x.coin = 1;
    });
    expect(isDestitute(getState())).toBe(true);

    const prices = marketPrices(getState());
    mutate((x) => {
      for (const item of ['linen', 'herbs', 'soap'] as const) {
        sellSupplies(x, item, x.inventory[item], prices[item]!);
      }
    });

    const after = getState();
    expect(after.coin).toBeGreaterThanOrEqual(dailyOperatingCost(after));
    expect(isDestitute(after)).toBe(false);
  });
});
