/**
 * Historical flavor for late-medieval German Bader practice.
 * Wired into bloodletting calendar, codex, and treatment modifiers.
 */

import type { Humor, GameState } from '../types';

/** Medieval zodiac month approx by day-of-year-ish (game day % 360 → month) */
export type ZodiacSign =
  | 'aries'
  | 'taurus'
  | 'gemini'
  | 'cancer'
  | 'leo'
  | 'virgo'
  | 'libra'
  | 'scorpio'
  | 'sagittarius'
  | 'capricorn'
  | 'aquarius'
  | 'pisces';

/** Body regions linked to signs — bloodletting “forbidden” when sign rules that part (simplified) */
export const ZODIAC_ORDER: ZodiacSign[] = [
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
];

export function currentZodiac(state: GameState): ZodiacSign {
  // 30-day “months” across year cycle
  const month = Math.floor(((state.day - 1) % 360) / 30) % 12;
  return ZODIAC_ORDER[month]!;
}

/**
 * Traditional advice: avoid opening veins when the moon/sign “governs”
 * the body part — we simplify to: blood arts slightly worse on “critical”
 * days (weekday + season), better mid-week market days.
 */
export function bloodlettingDayModifier(state: GameState): {
  mult: number;
  key: string;
  zodiac: ZodiacSign;
} {
  const zodiac = currentZodiac(state);
  // Critical signs for head/chest bloodletting caution
  const critical: ZodiacSign[] = ['aries', 'leo', 'scorpio'];
  let mult = 1;
  let key = 'astro_neutral';

  if (critical.includes(zodiac)) {
    mult = 0.88;
    key = 'astro_caution';
  } else if (zodiac === 'libra' || zodiac === 'virgo') {
    mult = 1.08;
    key = 'astro_favorable';
  }

  // Spring bloodletting was often preferred after winter humors
  if (state.season === 0) mult *= 1.05;
  // Midsummer heat: excess blood theory
  if (state.season === 1 && state.weekday >= 2 && state.weekday <= 4) mult *= 1.03;
  // Sunday: church pressure, quieter trade
  if (state.weekday === 0) mult *= 0.95;

  return { mult, key, zodiac };
}

/** Humor seasonal prevalence (Galenic seasonal regimen lite) */
export function seasonalHumorBias(state: GameState): Humor {
  switch (state.season) {
    case 0:
      return 'blood'; // spring sanguine
    case 1:
      return 'yellowBile'; // summer choleric
    case 2:
      return 'blackBile'; // autumn melancholy
    default:
      return 'phlegm'; // winter phlegmatic
  }
}

export const CODEX_LORE_KEYS = [
  'lore_bader_role',
  'lore_church_1163',
  'lore_humors',
  'lore_bloodletting',
  'lore_cupping_leech',
  'lore_badestube',
  'lore_guild',
  'lore_zodiac',
  'lore_convalescence',
  'lore_women_bader',
] as const;

export type CodexLoreKey = (typeof CODEX_LORE_KEYS)[number];
