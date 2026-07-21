/**
 * Fee stance and intensity — the per-patient decisions.
 *
 * Before this, the player's only choice per patient was the technique; the
 * fee was computed from seven factors the player influenced none of, and
 * `honourFromCharity` — the mechanic the whole honour axis points at — was
 * reachable only from a politics menu button, never from the work itself.
 *
 * `treatment.ts` imports Phaser via `ui/art` and cannot load under Node, so
 * wiring is checked at the source level (the project's established pattern),
 * and the arithmetic is checked against a mirror of the formulas.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const TREATMENT = readFileSync(join(process.cwd(), 'src/game/systems/treatment.ts'), 'utf8');
const SCENE = readFileSync(join(process.cwd(), 'src/game/scenes/TreatmentScene.ts'), 'utf8');
const EN = readFileSync(join(process.cwd(), 'src/game/i18n/en.ts'), 'utf8');
const DE = readFileSync(join(process.cwd(), 'src/game/i18n/de.ts'), 'utf8');

describe('the stances are wired, not merely declared', () => {
  // The defect class this project keeps producing: code written but never
  // reached. Each check pins one link of the chain from button to payout.

  it('lets the scene set both choices on the patient', () => {
    expect(SCENE).toContain('p.feeStance = STANCES[');
    expect(SCENE).toContain('p.intensity = INTENSITIES[');
  });

  it('reads both choices in applyTreatment', () => {
    expect(TREATMENT).toContain("patient.feeStance ?? 'usual'");
    expect(TREATMENT).toContain("patient.intensity ?? 'usual'");
  });

  it('multiplies the stance and intensity into the actual pay product', () => {
    // Being computed but not multiplied in is exactly how incomeMult sat dead.
    const pay = TREATMENT.slice(TREATMENT.indexOf('let pay = Math.round('));
    expect(pay).toContain('stancePayMult');
    expect(pay).toContain('intensityPayMult');
  });

  it('multiplies intensity into the risk term', () => {
    expect(TREATMENT).toMatch(/tech\.risk \* riskMult/);
  });

  it('shows the outcome of the gamble to the player', () => {
    // Without this line the Tongue check is an invisible roll.
    expect(SCENE).toContain('r.stanceNoteKey');
  });
});

describe('charity is earned at the table, not only bought in a menu', () => {
  it('gives honourFromCharity a second caller', () => {
    // Until now the only call site was politics.ts — donateChurch. The
    // historically central route, treating the poor for nothing, did not exist.
    const callers = ['systems/treatment.ts', 'systems/politics.ts'].filter((f) =>
      readFileSync(join(process.cwd(), 'src/game', f), 'utf8').includes('honourFromCharity('),
    );
    expect(callers).toEqual(['systems/treatment.ts', 'systems/politics.ts']);
  });

  it('zeroes the pay when treating for alms', () => {
    expect(TREATMENT).toMatch(/stance === 'alms'[\s\S]{0,80}pay = 0/);
  });

  it('counts alms to the poor as the generous kind', () => {
    // honourFromCharity(state, poor): full weight only when the patient is
    // actually poor — treating a merchant free of charge merely puzzled him.
    expect(TREATMENT).toContain('honourFromCharity(state, poor)');
  });
});

describe('the arithmetic holds the promised trade-offs', () => {
  /** Pull a numeric literal out of the treatment source. */
  const num = (re: RegExp): number => {
    const m = re.exec(TREATMENT);
    expect(m, String(re)).not.toBeNull();
    return Number(m![1]);
  };

  it('makes the bold hand pay more and risk more', () => {
    const risk = num(/riskMult = [^;]*'bold' \? ([\d.]+)/);
    const pay = num(/intensityPayMult = [^;]*'bold' \? ([\d.]+)/);
    expect(risk).toBeGreaterThan(1);
    expect(pay).toBeGreaterThan(1);
  });

  it('makes the careful hand safer and cheaper', () => {
    const risk = num(/riskMult = [^;]*'careful' \? ([\d.]+)/);
    const pay = num(/intensityPayMult = [^;]*'careful' \? ([\d.]+)/);
    expect(risk).toBeLessThan(1);
    expect(pay).toBeLessThan(1);
  });

  it('caps the demand check below certainty at maximum Tongue', () => {
    // 0.35 + tongue * 0.06 at tongue 10 is 0.95 — even a silver tongue can
    // meet a patient who will not be moved. A guaranteed +35% is not a choice.
    const base = num(/Math\.random\(\) < (0\.\d+) \+ state\.stats\.tongue/);
    const per = num(/state\.stats\.tongue \* (0\.\d+)/);
    expect(base + 10 * per).toBeLessThanOrEqual(0.96);
    // And at tongue 1 it must still be a live gamble, not a guaranteed refusal.
    expect(base + 1 * per).toBeGreaterThanOrEqual(0.3);
  });

  it('doubles the reputation loss when a demanded fee ends badly', () => {
    expect(TREATMENT).toMatch(
      /stance === 'demand' && \(kind === 'fail' \|\| kind === 'death'\)[\s\S]{0,60}reputationDelta \*= 2/,
    );
  });
});

describe('locales', () => {
  it('names every stance, intensity and note in both languages', () => {
    const keys = [
      'fee_stance_label',
      'stance_usual',
      'stance_demand',
      'stance_lenient',
      'stance_alms',
      'intensity_label',
      'intensity_usual',
      'intensity_careful',
      'intensity_bold',
      'stance_demand_ok',
      'stance_demand_fail',
      'stance_lenient_note',
      'stance_alms_done',
    ];
    const missing: string[] = [];
    for (const key of keys) {
      if (!EN.includes(`${key}:`)) missing.push(`en:${key}`);
      if (!DE.includes(`${key}:`)) missing.push(`de:${key}`);
    }
    expect(missing).toEqual([]);
  });

  it('asks only for keys the literal maps can prove exist', () => {
    // `t('stance_' + x)` would defeat every i18n scan in this suite; the
    // scene must go through the literal-key maps instead.
    expect(SCENE).toContain('STANCE_KEYS[stance]');
    expect(SCENE).toContain('INTENSITY_KEYS[intensity]');
    expect(SCENE).not.toMatch(/t\('stance_' \+/);
  });
});
