/**
 * Refusals must speak.
 *
 * The single most-reported problem in playtesting was not a crash — it was
 * buttons that did nothing and said nothing. Twenty call sites ran an action
 * that returns `boolean` and discarded the result, so a refusal looked exactly
 * like a broken game:
 *
 *   - "in Nürnberg I cannot buy a bathhouse and I don't know why"
 *     (`canBuyProperty` returned `reason: 'license'` and the scene dropped it)
 *   - "no error appears when I lack fame"
 *     (`buyTitle` had four gates and one shared "denied" toast)
 *   - the bathhouse upgrade screen: eight live-looking buttons, several
 *     unreachable, and one that had no branch in `upgradeProperty` at all
 *
 * These tests pin both halves: the gates report *which* condition failed with
 * numbers attached, and the actions never restate a gate they delegate.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createNewGame } from '../src/game/state';
import {
  canApplyForOffice,
  canBuyTitle,
  applyForOffice,
  buyTitle,
} from '../src/game/systems/politics';
import {
  canUpgradeProperty,
  upgradeProperty,
  newProperty,
  UPGRADE_SPECS,
} from '../src/game/systems/property';
import { canRepayDebt, repayDebt } from '../src/game/systems/economy';
import type { GameState } from '../src/game/types';

const EN = readFileSync(join(process.cwd(), 'src/game/i18n/en.ts'), 'utf8');
const DE = readFileSync(join(process.cwd(), 'src/game/i18n/de.ts'), 'utf8');
const GATED = readFileSync(join(process.cwd(), 'src/game/ui/gated.ts'), 'utf8');

const fresh = (): GameState => createNewGame('Prüfer', 'de');

describe('a refusal names its cause', () => {
  it('tells a pauper it is the coin, not something else', () => {
    const s = fresh();
    s.repFame = 100;
    s.coin = 0;
    const r = canBuyTitle(s, 'freeman');
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.reasonKey).toBe('req_coin');
  });

  it('tells an unknown Bader it is the fame, and by how much', () => {
    const s = fresh();
    s.coin = 9999;
    s.repFame = 5;
    const r = canBuyTitle(s, 'honorable');
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('unreachable');
    expect(r.reasonKey).toBe('req_fame');
    // The numbers are the whole point: "denied" teaches nothing, "30 needed,
    // you have 5" tells the player what to go and do.
    expect(r.need).toBe(30);
    expect(r.have).toBe(5);
  });

  it('reports standing before price, so nobody chases coin they do not need', () => {
    const s = fresh();
    s.coin = 0; // also short of coin
    s.honour = 0; // but honour is the real obstacle
    const r = canApplyForOffice(s, 'quarter_warden');
    expect(r.ok === false && r.reasonKey).toBe('req_honour');
  });

  it('has a sentence for every reason it can return, in both locales', () => {
    // A reason key with no string renders as the raw key — the failure mode
    // this project produced with `tech_desc_<id>` once already.
    const keys = new Set<string>();
    for (const src of [
      readFileSync(join(process.cwd(), 'src/game/systems/politics.ts'), 'utf8'),
      readFileSync(join(process.cwd(), 'src/game/systems/property.ts'), 'utf8'),
      readFileSync(join(process.cwd(), 'src/game/systems/economy.ts'), 'utf8'),
    ]) {
      for (const m of src.matchAll(/'(req_[a-z_]+)'/g)) keys.add(m[1]!);
    }
    expect(keys.size).toBeGreaterThan(8);
    const missing: string[] = [];
    for (const key of keys) {
      if (!EN.includes(`${key}:`)) missing.push(`en:${key}`);
      if (!DE.includes(`${key}:`)) missing.push(`de:${key}`);
    }
    expect(missing).toEqual([]);
  });
});

describe('actions delegate to their gate', () => {
  // A gate restated inside the action is two copies of one rule, and they
  // drift — `staffSkillBonus` and `treatment.ts` already proved that here.

  it('lets no office through that the check refuses', () => {
    const s = fresh();
    s.coin = 99999;
    expect(canApplyForOffice(s, 'council_seat').ok).toBe(false);
    expect(applyForOffice(s, 'council_seat')).toBe(false);
    expect(s.coin).toBe(99999); // and charged nothing
  });

  it('lets no title through that the check refuses', () => {
    const s = fresh();
    s.coin = 99999;
    s.repFame = 0;
    expect(buyTitle(s, 'noble_surgeon')).toBe(false);
    expect(s.coin).toBe(99999);
  });
});

describe('bathhouse upgrades', () => {
  it('can actually buy simple bath rights', () => {
    // `level1` was offered on screen but had no branch in `upgradeProperty`,
    // so it fell to `default: return false`. The top button on that screen
    // could never have worked.
    const s = fresh();
    const stall = newProperty('nurnberg', 'stall', 0);
    s.properties = [stall];
    s.coin = 500;
    expect(canUpgradeProperty(s, stall.id, 'level1').ok).toBe(true);
    expect(upgradeProperty(s, stall.id, 'level1')).toBe(true);
    expect(stall.level).toBe(1);
    expect(s.coin).toBe(380);
  });

  it('explains a level requirement rather than failing mutely', () => {
    const s = fresh();
    const stall = newProperty('nurnberg', 'stall', 0);
    s.properties = [stall];
    s.coin = 5000;
    const r = canUpgradeProperty(s, stall.id, 'level3');
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.reasonKey).toBe('req_needs_level2');
  });

  it('charges exactly what the spec says, once', () => {
    for (const [id, spec] of Object.entries(UPGRADE_SPECS)) {
      if (id === 'comfort') continue; // homes only
      const s = fresh();
      const p = newProperty('nurnberg', 'bathhouse', 2);
      p.apprenticeBunks = true;
      s.properties = [p];
      s.coin = 10000;
      if (!canUpgradeProperty(s, p.id, id).ok) continue;
      upgradeProperty(s, p.id, id);
      expect(10000 - s.coin, id).toBe(spec.coin);
    }
  });

  it('refuses what is already owned instead of taking the money again', () => {
    const s = fresh();
    const p = newProperty('nurnberg', 'bathhouse', 2);
    p.boiler = true;
    s.properties = [p];
    s.coin = 500;
    expect(canUpgradeProperty(s, p.id, 'boiler').ok).toBe(false);
    expect(upgradeProperty(s, p.id, 'boiler')).toBe(false);
    expect(s.coin).toBe(500);
  });
});

describe('the Lombard can be paid back', () => {
  // There was no voluntary repayment anywhere in the codebase. Debt only ever
  // fell when `applyDebtCollection` seized coin — or a property.

  it('takes coin off the debt', () => {
    const s = fresh();
    s.debt = 100;
    s.coin = 60;
    expect(repayDebt(s, 60)).toBe(60);
    expect(s.debt).toBe(40);
    expect(s.coin).toBe(0);
  });

  it('never pays more than is owed, nor more than is held', () => {
    const s = fresh();
    s.debt = 20;
    s.coin = 500;
    expect(repayDebt(s, 999)).toBe(20);
    expect(s.debt).toBe(0);
    expect(s.coin).toBe(480);
  });

  it('returns a little standing when the debt is cleared', () => {
    const s = fresh();
    const before = s.honour ?? 30;
    s.debt = 10;
    s.coin = 10;
    repayDebt(s, 10);
    expect(s.honour!).toBeGreaterThan(before);
  });

  it('says so when there is nothing to repay', () => {
    const s = fresh();
    s.debt = 0;
    expect(canRepayDebt(s).ok).toBe(false);
    expect(canRepayDebt(s)).toMatchObject({ reasonKey: 'req_no_debt' });
  });
});

describe('the UI helper', () => {
  it('quotes the player’s own figure, not only the threshold', () => {
    expect(GATED).toContain('req_short_of');
    expect(GATED).toContain('have: req.have');
  });

  it('cannot run the action when the requirement is unmet', () => {
    // The helper owns the check so a caller cannot forget it — which is the
    // mistake that produced all twenty silent failures.
    expect(GATED).toMatch(/if \(!req\.ok\) \{[\s\S]*?return;[\s\S]*?\}\s*onClick\(\);/);
  });
});
