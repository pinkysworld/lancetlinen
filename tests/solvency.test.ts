/**
 * The player must always have a move.
 *
 * Reported from play: "I have plenty of supplies but no coin and so cannot
 * open." That is not a display bug — opening requires the day's operating cost
 * in coin, travelling also costs, and a player with an empty purse and nothing
 * worth selling had no legal action left. In a game with no fail state and no
 * death, that is a softlock.
 *
 * The Lombard is the guaranteed exit. These tests pin that it is always
 * available and always *bad*, because a generous one would remove the economy.
 */
import { describe, it, expect } from 'vitest';
import {
  dailyOperatingCost,
  isDestitute,
  takeLoan,
  LOAN_PRINCIPAL,
  LOAN_DEBT,
} from '../src/game/systems/economy';
import { createNewGame, getState, mutate, setState } from '../src/game/state';
import { updateSettings } from '../src/game/systems/settings';
import { honour } from '../src/game/systems/honour';
import { DEBT_CALL_IN } from '../src/game/systems/pressure';
import type { GameState } from '../src/game/types';

const broke = (coin = 0): GameState => {
  setState(createNewGame('Test'));
  mutate((s) => {
    s.coin = coin;
  });
  return getState();
};

describe('detecting destitution', () => {
  it('reports a player who cannot cover the day', () => {
    expect(isDestitute(broke(0))).toBe(true);
  });

  it('does not report a player who can', () => {
    const s = broke(0);
    mutate((x) => {
      x.coin = dailyOperatingCost(x) + 1;
    });
    expect(isDestitute(getState())).toBe(false);
  });

  it('tracks the difficulty setting', () => {
    // Harsh raises operating costs, so the threshold has to move with it.
    setState(createNewGame('Test'));
    updateSettings({ difficulty: 'merciful' });
    const cheap = dailyOperatingCost(getState());
    updateSettings({ difficulty: 'harsh' });
    const dear = dailyOperatingCost(getState());
    expect(dear).toBeGreaterThan(cheap);

    mutate((s) => {
      s.coin = cheap;
    });
    expect(isDestitute(getState()), 'harsh should still count as destitute').toBe(true);
    updateSettings({ difficulty: 'fair' });
  });
});

describe('the loan always restores a move', () => {
  it('leaves the player able to open', () => {
    // The whole point: after borrowing, the day is affordable again.
    const s = broke(0);
    takeLoan(s);
    expect(isDestitute(s)).toBe(false);
  });

  it('covers several days, not just one', () => {
    // A loan that buys one day would strand the player again immediately.
    const s = broke(0);
    takeLoan(s);
    expect(s.coin).toBeGreaterThanOrEqual(dailyOperatingCost(s) * 3);
  });

  it('works even on the harshest setting', () => {
    setState(createNewGame('Test'));
    updateSettings({ difficulty: 'harsh' });
    mutate((x) => {
      x.coin = 0;
    });
    takeLoan(getState());
    expect(isDestitute(getState())).toBe(false);
    updateSettings({ difficulty: 'fair' });
  });
});

describe('the loan is a bad deal, as intended', () => {
  it('charges more debt than it hands over', () => {
    expect(LOAN_DEBT).toBeGreaterThan(LOAN_PRINCIPAL);
  });

  it('costs standing — everyone knows who borrows', () => {
    const s = broke(0);
    const before = honour(s);
    takeLoan(s);
    expect(honour(s)).toBeLessThan(before);
  });

  it('reaches the collector within a few loans', () => {
    // Repeated borrowing has to lead somewhere, or it is free money.
    const s = broke(0);
    let n = 0;
    while ((s.debt ?? 0) <= DEBT_CALL_IN && n < 20) {
      takeLoan(s);
      n++;
    }
    expect(n).toBeLessThanOrEqual(4);
    expect(s.debt).toBeGreaterThan(DEBT_CALL_IN);
  });

  it('records the borrowing in the journal', () => {
    const s = broke(0);
    const before = s.journal.length;
    takeLoan(s);
    expect(s.journal.length).toBeGreaterThan(before);
  });
});
