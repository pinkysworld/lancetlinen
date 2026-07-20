/**
 * Day-summary arithmetic.
 *
 * The ledger initially reported "Net after costs: +0" on a day that earned 36
 * coin, because it differenced the purse *after* fees and morning costs had
 * already been applied — so it only ever measured the overnight settlement.
 * The reported net must reconcile with the actual change in the purse.
 */
import { describe, it, expect } from 'vitest';

/** Mirrors the calculation in `scenes/DaySummaryScene.ts`. */
function ledger(input: {
  earned: number;
  morningCost: number;
  coinBefore: number;
  coinAfter: number;
}) {
  const overnight = input.coinAfter - input.coinBefore;
  const costs = input.morningCost - Math.min(0, overnight);
  const net = input.earned - input.morningCost + overnight;
  return { overnight, costs, net };
}

/** Plays a day forward to get the true purse movement, independently. */
function simulateDay(opts: {
  startPurse: number;
  morningCost: number;
  fees: number;
  wages: number;
  remoteIncome: number;
}) {
  const afterOpening = opts.startPurse - opts.morningCost;
  const coinBefore = afterOpening + opts.fees; // close of trading
  const coinAfter = coinBefore - opts.wages + opts.remoteIncome;
  return { coinBefore, coinAfter, trueDelta: coinAfter - opts.startPurse };
}

describe('day ledger', () => {
  it('reported net equals the real change in the purse', () => {
    const cases = [
      { startPurse: 50, morningCost: 3, fees: 36, wages: 5, remoteIncome: 2 },
      { startPurse: 200, morningCost: 24, fees: 0, wages: 18, remoteIncome: 0 },
      { startPurse: 80, morningCost: 3, fees: 0, wages: 0, remoteIncome: 0 },
      { startPurse: 500, morningCost: 40, fees: 210, wages: 60, remoteIncome: 35 },
    ];
    for (const c of cases) {
      const sim = simulateDay(c);
      const rep = ledger({
        earned: c.fees,
        morningCost: c.morningCost,
        coinBefore: sim.coinBefore,
        coinAfter: sim.coinAfter,
      });
      expect(rep.net).toBe(sim.trueDelta);
    }
  });

  it('reports a loss on a day with no patients', () => {
    const sim = simulateDay({ startPurse: 80, morningCost: 3, fees: 0, wages: 0, remoteIncome: 0 });
    const rep = ledger({ earned: 0, morningCost: 3, coinBefore: sim.coinBefore, coinAfter: sim.coinAfter });
    expect(rep.net).toBe(-3);
    expect(rep.costs).toBe(3);
  });

  it('counts overnight wages as costs, not as a negative income', () => {
    const sim = simulateDay({ startPurse: 100, morningCost: 5, fees: 20, wages: 12, remoteIncome: 0 });
    const rep = ledger({ earned: 20, morningCost: 5, coinBefore: sim.coinBefore, coinAfter: sim.coinAfter });
    expect(rep.costs).toBe(17); // 5 opening + 12 wages
    expect(rep.net).toBe(3);
  });
});
