/**
 * Honour — the axis the game now turns on.
 *
 * The design intent these tests protect:
 *  - a Bader cannot become fully honourable in 1382; the ceiling is the point
 *  - deaths are the sharpest loss, charity the steadiest gain
 *  - the gates actually close, so the profitable path and the respectable one
 *    genuinely diverge
 */
import { describe, it, expect } from 'vitest';
import {
  addHonour,
  honour,
  honourRank,
  honourFromTreatment,
  honourFromCharity,
  honourFromScandal,
  honourFromWorkingHolyDay,
  tickHonour,
  canJoinGuild,
  canHoldOffice,
  canMarry,
  HONOUR_CEILING,
  HONOUR_START,
  GUILD_HONOUR_REQUIRED,
  OFFICE_HONOUR_REQUIRED,
  MARRIAGE_HONOUR_REQUIRED,
} from '../src/game/systems/honour';
import type { GameState } from '../src/game/types';

const stub = (h = HONOUR_START): GameState =>
  ({ honour: h, journal: [], day: 1, year: 1382 }) as unknown as GameState;

describe('honour bounds', () => {
  it('cannot be won outright — the era caps it', () => {
    const s = stub();
    for (let i = 0; i < 500; i++) addHonour(s, 10);
    expect(honour(s)).toBe(HONOUR_CEILING);
    expect(HONOUR_CEILING).toBeLessThan(100);
  });

  it('never falls below zero', () => {
    const s = stub();
    for (let i = 0; i < 500; i++) addHonour(s, -10);
    expect(honour(s)).toBe(0);
  });

  it('tops out at "respected" — never beyond', () => {
    const s = stub(HONOUR_CEILING);
    expect(honourRank(s)).toBe('respected');
  });

  it('starts a new Bader as suspect, not neutral', () => {
    // The trade's default reputation is the premise of the whole system.
    expect(honourRank(stub(HONOUR_START))).toBe('suspect');
  });
});

describe('sources', () => {
  it('punishes a death far more than a failure', () => {
    const died = stub(60);
    const failed = stub(60);
    honourFromTreatment(died, 'peasant', 'death');
    honourFromTreatment(failed, 'peasant', 'fail');
    expect(honour(died)).toBeLessThan(honour(failed));
  });

  it('punishes a noble death hardest of all', () => {
    const noble = stub(60);
    const peasant = stub(60);
    honourFromTreatment(noble, 'noble', 'death');
    honourFromTreatment(peasant, 'peasant', 'death');
    expect(honour(noble)).toBeLessThan(honour(peasant));
  });

  it('rewards serving the poor more than serving the rich', () => {
    const poor = stub(50);
    const rich = stub(50);
    honourFromTreatment(poor, 'beggar', 'success');
    honourFromTreatment(rich, 'noble', 'success');
    expect(honour(poor)).toBeGreaterThan(honour(rich));
  });

  it('makes recovery slow — one death costs many charitable acts', () => {
    const s = stub(60);
    honourFromTreatment(s, 'noble', 'death');
    const afterDeath = honour(s);
    honourFromCharity(s); // an ordinary act of charity
    expect(honour(s) - afterDeath).toBeLessThan(60 - afterDeath);
  });

  it('penalises trading on a holy day and discovered bribery', () => {
    const holy = stub(50);
    honourFromWorkingHolyDay(holy);
    expect(honour(holy)).toBeLessThan(50);

    const bribed = stub(50);
    honourFromScandal(bribed);
    expect(honour(bribed)).toBeLessThan(honour(holy));
  });
});

describe('drift', () => {
  it('decays a good name back toward the trade’s baseline', () => {
    const s = stub(HONOUR_CEILING);
    for (let i = 0; i < 400; i++) tickHonour(s);
    expect(honour(s)).toBe(HONOUR_START);
  });

  it('recovers a ruined name toward the baseline, but slowly', () => {
    const s = stub(0);
    for (let i = 0; i < 50; i++) tickHonour(s);
    expect(honour(s)).toBeGreaterThan(0);
    expect(honour(s)).toBeLessThan(HONOUR_START);
  });

  it('settles exactly at the baseline rather than oscillating', () => {
    const s = stub(HONOUR_START);
    for (let i = 0; i < 100; i++) tickHonour(s);
    expect(honour(s)).toBe(HONOUR_START);
  });
});

describe('gates', () => {
  it('closes the guild, office and marriage to a new Bader', () => {
    const s = stub(HONOUR_START);
    expect(canJoinGuild(s).ok).toBe(false);
    expect(canHoldOffice(s).ok).toBe(false);
    expect(canMarry(s).ok).toBe(false);
  });

  it('opens marriage before the guild, and the guild before office', () => {
    // The ladder should be climbable in a sensible order.
    expect(MARRIAGE_HONOUR_REQUIRED).toBeLessThan(GUILD_HONOUR_REQUIRED);
    expect(GUILD_HONOUR_REQUIRED).toBeLessThan(OFFICE_HONOUR_REQUIRED);
  });

  it('leaves office reachable — the ceiling must clear the highest gate', () => {
    expect(HONOUR_CEILING).toBeGreaterThan(OFFICE_HONOUR_REQUIRED);
    expect(canHoldOffice(stub(HONOUR_CEILING)).ok).toBe(true);
  });

  it('reports how far short the player is', () => {
    const g = canHoldOffice(stub(20));
    expect(g.ok).toBe(false);
    expect(g.required - g.current).toBe(OFFICE_HONOUR_REQUIRED - 20);
  });
});
