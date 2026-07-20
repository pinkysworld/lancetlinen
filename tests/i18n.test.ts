/**
 * Localisation parity.
 *
 * Replaces the ad-hoc audit script that has been run by hand after every
 * change. A missing key renders as the raw key on screen — which shipped once
 * already (`flow_examine` and friends showed literally as "flow_examine").
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { en } from '../src/game/i18n/en';
import { de } from '../src/game/i18n/de';

const SRC = join(process.cwd(), 'src');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const p = join(dir, entry);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : [];
  });
}

/** Keys referenced as a plain literal, e.g. t('coin'). */
function literalKeysUsed(): Set<string> {
  const keys = new Set<string>();
  for (const file of walk(SRC)) {
    if (file.includes(`${'i18n'}`)) continue;
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/\bt\(\s*'([^']+)'/g)) keys.add(m[1]!);
  }
  return keys;
}

/**
 * Keys the code builds at runtime, which the regex above cannot see.
 * Listed explicitly so a missing one still fails the suite.
 */
const GENERATED_KEYS: string[] = [
  ...['hot', 'cold'].flatMap((temp) => [
    ...['weak', 'steady', 'firm'].map((s) => `pulse_${temp}_${s}`),
    ...['moist', 'dry'].flatMap((m) => ['weak', 'steady', 'firm'].map((s) => `pulse_${temp}_${m}_${s}`)),
  ]),
  'confidence_certain',
  'confidence_fair',
  'confidence_guess',
  ...['city', 'town', 'village', 'monastery', 'camp', 'crossroads'].map((x) => `demand_settlement_${x}`),
  ...['low', 'medium', 'high'].map((g) => `gore_${g}`),
  ...[1, 2, 3].map((n) => `text_speed_${n}`),
  ...['back', 'confirm', 'help', 'next', 'prev'].map((a) => `action_${a}`),
  ...['none', 'apprentice', 'journeyman', 'master'].map((r) => `rank_${r}`),
];

describe('i18n', () => {
  it('has the same key set in both locales', () => {
    const enKeys = new Set(Object.keys(en));
    const deKeys = new Set(Object.keys(de));
    const onlyEn = [...enKeys].filter((k) => !deKeys.has(k));
    const onlyDe = [...deKeys].filter((k) => !enKeys.has(k));
    expect({ onlyEn, onlyDe }).toEqual({ onlyEn: [], onlyDe: [] });
  });

  it('defines every key the code asks for', () => {
    const used = [...literalKeysUsed(), ...GENERATED_KEYS];
    const missingEn = used.filter((k) => !(k in en));
    const missingDe = used.filter((k) => !(k in de));
    expect({ missingEn, missingDe }).toEqual({ missingEn: [], missingDe: [] });
  });

  it('has no empty strings', () => {
    const blankEn = Object.entries(en).filter(([, v]) => typeof v === 'string' && !v.trim());
    const blankDe = Object.entries(de).filter(([, v]) => typeof v === 'string' && !v.trim());
    expect({ blankEn, blankDe }).toEqual({ blankEn: [], blankDe: [] });
  });

  it('keeps interpolation placeholders consistent between locales', () => {
    const placeholders = (s: string) => (s.match(/\{\{(\w+)\}\}/g) ?? []).sort().join(',');
    const mismatched: string[] = [];
    for (const [key, enVal] of Object.entries(en)) {
      const deVal = (de as Record<string, unknown>)[key];
      if (typeof enVal !== 'string' || typeof deVal !== 'string') continue;
      // A translation that drops a {{placeholder}} renders a broken sentence.
      if (placeholders(enVal) !== placeholders(deVal)) mismatched.push(key);
    }
    expect(mismatched).toEqual([]);
  });
});
