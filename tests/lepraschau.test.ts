/**
 * The Lepraschau.
 *
 * `HISTORY_AUDIT.md` named it the best missing addition, and it is the one
 * thing the trade did that was not treatment at all: a judgement, ordered by
 * the council, on whether a man might stay among people.
 *
 * The design claim these tests hold: **the player cannot be certain, and the
 * two ways of being wrong are not the same weight.** If either half failed —
 * if the signs gave the answer away, or if a wrong verdict cost nothing — the
 * mechanic would be a coin flip with a story attached.
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

vi.mock('phaser', () => ({ default: {} }));

import {
  LEPRASCHAU_FEE,
  LEPRA_SIGNS,
  canBeCalledToLepraschau,
  makeLepraCase,
  readableSigns,
  resolveLepraschau,
  visibleSigns,
} from '../src/game/systems/lepraschau';
import { createNewGame } from '../src/game/state';
import type { GameState } from '../src/game/types';

const EN = readFileSync(join(process.cwd(), 'src/game/i18n/en.ts'), 'utf8');
const DE = readFileSync(join(process.cwd(), 'src/game/i18n/de.ts'), 'utf8');
const HUB = readFileSync(join(process.cwd(), 'src/game/scenes/HubScene.ts'), 'utf8');
const GAME = readFileSync(join(process.cwd(), 'src/game/Game.ts'), 'utf8');

const examiner = (origin = 'field_surgeon'): GameState => {
  const s = createNewGame('Beschauer', 'de');
  s.originId = origin;
  s.councilFavor = 20;
  s.totalTreated = 20;
  return s;
};

describe('the signs are the period’s, true ones and false', () => {
  it('mixes signs that mean something with signs that do not', () => {
    // Loss of sensation, hoarseness and lost brows are genuinely diagnostic.
    // Dark urine and a "heavy look" carried real authority and no
    // information — telling them apart is the skill being asked for.
    const good = LEPRA_SIGNS.filter((s) => s.diagnostic);
    const bad = LEPRA_SIGNS.filter((s) => !s.diagnostic);
    expect(good.length).toBeGreaterThanOrEqual(3);
    expect(bad.length).toBeGreaterThanOrEqual(2);
  });

  it('puts the decisive sign behind palpation', () => {
    // Testing sensation with a needle is the one sign that settles it, and it
    // is a thing you must have been taught to do.
    const decisive = LEPRA_SIGNS.find((s) => s.id === 'insensitive')!;
    expect(decisive.diagnostic).toBe(true);
    expect(decisive.needs).toBe('palpate');
  });

  it('names every sign in both locales', () => {
    for (const s of LEPRA_SIGNS) {
      expect(EN, `en lacks lepra_sign_${s.id}`).toContain(`lepra_sign_${s.id}:`);
      expect(DE, `de lacks lepra_sign_${s.id}`).toContain(`lepra_sign_${s.id}:`);
    }
  });
});

describe('the case cannot be read off', () => {
  const always = (): number => 0; // every roll succeeds
  const never = (): number => 0.99;

  it('shows the true signs only on someone actually afflicted', () => {
    const sick = makeLepraCase('A', true, always);
    const well = makeLepraCase('B', true, never);
    void well;
    const healthy = makeLepraCase('C', false, always);
    const diagnostic = new Set(LEPRA_SIGNS.filter((s) => s.diagnostic).map((s) => s.id));
    expect(sick.present.some((id) => diagnostic.has(id))).toBe(true);
    expect(healthy.present.some((id) => diagnostic.has(id))).toBe(false);
  });

  it('lets a healthy man show the misleading signs', () => {
    // This is the trap, and it is the historical one: a hoarse voice and dark
    // water put people out of the walls.
    const healthy = makeLepraCase('C', false, always);
    expect(healthy.present.length).toBeGreaterThan(0);
  });

  it('does not show every sign even on a real case', () => {
    // An early case is not obvious, which is what makes the judgement one.
    let partial = 0;
    for (let i = 0; i < 200; i++) {
      const c = makeLepraCase('X', true);
      const diagnostic = LEPRA_SIGNS.filter((s) => s.diagnostic).map((s) => s.id);
      if (diagnostic.some((id) => !c.present.includes(id))) partial++;
    }
    expect(partial).toBeGreaterThan(20);
  });
});

describe('training decides what can be seen', () => {
  it('lets a field surgeon test sensation and a bath-house son not', () => {
    const surgeon = examiner('field_surgeon');
    const son = examiner('bader_son');
    expect(readableSigns(surgeon).map((s) => s.id)).toContain('insensitive');
    expect(readableSigns(son).map((s) => s.id)).not.toContain('insensitive');
  });

  it('hides a sign the examiner was never taught to look for', () => {
    const son = examiner('bader_son');
    const c = { name: 'X', afflicted: true, present: ['insensitive', 'hoarse'] };
    // He can hear the voice; he cannot test the skin.
    expect(visibleSigns(son, c)).toEqual(['hoarse']);
  });

  it('never lets anyone see all five, whatever their origin', () => {
    for (const o of ['bader_son', 'field_surgeon', 'monastery_scholar', 'journeyman', 'bath_widow', 'executioner_kin']) {
      expect(readableSigns(examiner(o)).length, o).toBeLessThan(LEPRA_SIGNS.length);
    }
  });
});

describe('the two ways of being wrong are not the same', () => {
  it('pays the council’s fee whatever is decided', () => {
    for (const v of ['clean', 'leprous', 'defer'] as const) {
      const s = examiner();
      const before = s.coin;
      resolveLepraschau(s, makeLepraCase('X', true), v);
      expect(s.coin - before, v).toBe(LEPRASCHAU_FEE);
    }
  });

  it('rewards a judgement that holds', () => {
    const s = examiner();
    const before = { council: s.councilFavor, honour: s.honour ?? 30 };
    const out = resolveLepraschau(s, makeLepraCase('X', true), 'leprous');
    expect(out.correct).toBe(true);
    expect(s.councilFavor).toBeGreaterThan(before.council);
    expect(s.honour!).toBeGreaterThan(before.honour);
  });

  it('costs more to expel a sound man than to miss a sick one', () => {
    // Sending a healthy man to the lazar house was a civil death, and when it
    // came out the examiner was blamed. Missing a case is quieter.
    const expelled = examiner();
    resolveLepraschau(expelled, makeLepraCase('X', false), 'leprous');
    const missed = examiner();
    resolveLepraschau(missed, makeLepraCase('Y', true), 'clean');
    expect(expelled.honour!).toBeLessThan(missed.honour!);
    expect(expelled.repFolk).toBeLessThan(missed.repFolk);
  });

  it('remembers a missed case, so it can come back', () => {
    const s = examiner();
    resolveLepraschau(s, makeLepraCase('Y', true), 'clean');
    expect(Number(s.storyFlags['lepra_missed'] ?? 0)).toBe(1);
  });

  it('makes refusing to judge cost something too', () => {
    // A Bader who will not say is a Bader the council stops asking.
    const s = examiner();
    const before = s.councilFavor;
    const out = resolveLepraschau(s, makeLepraCase('X', true), 'defer');
    expect(out.correct).toBeNull();
    expect(s.councilFavor).toBeLessThan(before);
  });
});

describe('the summons is earned', () => {
  it('does not call a stranger', () => {
    const green = createNewGame('Neu', 'de');
    expect(canBeCalledToLepraschau(green)).toBe(false);
  });

  it('calls a Bader the council knows', () => {
    expect(canBeCalledToLepraschau(examiner())).toBe(true);
  });
});

describe('wired, not merely written', () => {
  it('registers the scene', () => {
    expect(GAME).toContain('LepraschauScene');
  });

  it('is actually reachable from the hub', () => {
    // A duty nothing summons is the defect this project keeps producing.
    expect(HUB).toContain('canBeCalledToLepraschau(s)');
    expect(HUB).toContain("this.scene.start('Lepraschau')");
  });

  it('only happens where there is a council to send for you', () => {
    expect(HUB).toContain('hasBathLicenseShop');
  });

  it('writes every outcome line in both locales', () => {
    const keys = [
      'lepra_title', 'lepra_body', 'lepra_no_signs', 'lepra_untrained',
      'lepra_choice_clean', 'lepra_choice_leprous', 'lepra_choice_defer',
      'lepra_right_sent', 'lepra_right_cleared',
      'lepra_wrong_sent', 'lepra_wrong_cleared', 'lepra_deferred',
    ];
    const missing: string[] = [];
    for (const k of keys) {
      if (!EN.includes(`${k}:`)) missing.push(`en:${k}`);
      if (!DE.includes(`${k}:`)) missing.push(`de:${k}`);
    }
    expect(missing).toEqual([]);
  });
});
