/**
 * The Aderlaßmännchen — the bloodletting man.
 *
 * ## Why this exists
 *
 * The codex tells the player, under ATTESTED, that *"the bloodletting calendar
 * and the Aderlaßmännchen tied the vein you opened to the moon's sign"*. None
 * of it was implemented. `bloodlettingDayModifier` applied one flat multiplier
 * derived from the **sun's** sign, and the player never chose a vein at all.
 *
 * Three things were wrong with that:
 *
 *  1. The *Laßtafeln* key to the **moon**, which crosses a sign roughly every
 *     2.3 days, not the sun, which takes a month. A month-long "bad period"
 *     is a tax; a two-day one is something to plan around.
 *  2. The doctrine is **body-part specific** — the *homo signorum* diagrams
 *     assign each sign a region, head to foot, Aries to Pisces. Letting blood
 *     from a limb whose sign the moon occupied was what the tables warned
 *     against, not letting blood as such.
 *  3. Which vein you opened was the practitioner's actual decision, and it was
 *     governed by *derivation* (draw from near the trouble) versus *revulsion*
 *     (draw from far away, to pull the humour off). The game had no such
 *     choice, so its one blood art was one button.
 *
 * ## What is modelled
 *
 * The moon's sign per day; a small table of veins with the region each drains;
 * and the *dies aegyptiaci* — the Egyptian Days, two per month in the medieval
 * calendars, on which no blood was to be let at all. All three are shown to
 * the player rather than applied invisibly.
 */
import type { GameState } from '../types';
import { ZODIAC_ORDER, type ZodiacSign } from './history';

/* ------------------------------------------------------------------ *
 * The moon
 * ------------------------------------------------------------------ */

/**
 * Days the moon spends in one sign.
 *
 * A sidereal month is 27.32 days over twelve signs — 2.277 days each. The
 * game uses 2.3, close enough that a player counting days is never wrong by
 * more than a day across a season.
 */
export const DAYS_PER_MOON_SIGN = 2.3;

/**
 * Which sign the moon stands in today.
 *
 * Offset so day 1 is not Aries: the sun-based version started the year in
 * Aries on day 1, which put it about seventy days out, since the sun enters
 * Aries around 12–13 March.
 */
export function moonSign(state: GameState): ZodiacSign {
  const idx = Math.floor((state.day + 4) / DAYS_PER_MOON_SIGN) % 12;
  return ZODIAC_ORDER[idx]!;
}

/** How many days until the moon leaves the sign it is in. */
export function daysInSign(state: GameState): number {
  const here = moonSign(state);
  let n = 1;
  while (n < 5 && moonSign({ ...state, day: state.day + n }) === here) n += 1;
  return n;
}

/* ------------------------------------------------------------------ *
 * The man of signs
 * ------------------------------------------------------------------ */

/** Body regions, head to foot, in the order the signs run. */
export type BodyRegion =
  | 'head'
  | 'neck'
  | 'arms'
  | 'chest'
  | 'heart'
  | 'belly'
  | 'loins'
  | 'groin'
  | 'thighs'
  | 'knees'
  | 'shins'
  | 'feet';

/**
 * *Homo signorum*: Aries the head, Pisces the feet, and the rest in order
 * down the body. This ordering is stable across the surviving diagrams and
 * printed calendars; it is one of the few pieces of medieval astrological
 * medicine that is not contested.
 */
export const SIGN_REGION: Record<ZodiacSign, BodyRegion> = {
  aries: 'head',
  taurus: 'neck',
  gemini: 'arms',
  cancer: 'chest',
  leo: 'heart',
  virgo: 'belly',
  libra: 'loins',
  scorpio: 'groin',
  sagittarius: 'thighs',
  capricorn: 'knees',
  aquarius: 'shins',
  pisces: 'feet',
};

/* ------------------------------------------------------------------ *
 * The veins
 * ------------------------------------------------------------------ */

export interface Vein {
  id: string;
  /** Region the vein is held to draw from. */
  region: BodyRegion;
  /** Regions this vein was held to relieve, by derivation or revulsion. */
  serves: BodyRegion[];
  /** Hand needed to open it safely. */
  minHand: number;
}

/**
 * The veins a Bader actually opened.
 *
 * Arm veins dominate the sources; the *saphena* at the ankle and the
 * forehead vein are the standard alternatives. The jugular appears in the
 * literature but was uncommon in practice and is left out.
 *
 * `serves` encodes the doctrine, not convenience:
 *
 *  - **Cephalica** ("head vein"), at the thumb side of the elbow, was let for
 *    complaints of the head and face.
 *  - **Basilica** ("liver vein"), at the little-finger side, for the chest,
 *    liver and belly.
 *  - **Mediana** between them, the general-purpose vein.
 *  - **Saphena** at the ankle for the loins, womb and lower body — and by
 *    *revulsion* it was the vein for a nosebleed, drawing the blood downward
 *    and away from the head. That is why bleeding a nosebleed is not a bug.
 *  - **Frontalis** on the forehead, for the eyes and a heavy head.
 */
export const VEINS: Vein[] = [
  { id: 'cephalica', region: 'arms', serves: ['head', 'neck'], minHand: 2 },
  { id: 'basilica', region: 'arms', serves: ['chest', 'heart', 'belly'], minHand: 3 },
  { id: 'mediana', region: 'arms', serves: ['arms', 'chest', 'belly'], minHand: 2 },
  { id: 'saphena', region: 'feet', serves: ['loins', 'groin', 'thighs', 'head'], minHand: 4 },
  { id: 'frontalis', region: 'head', serves: ['head'], minHand: 5 },
];

export const VEIN_MAP: Record<string, Vein> = Object.fromEntries(
  VEINS.map((v) => [v.id, v]),
);

/* ------------------------------------------------------------------ *
 * Where the trouble sits
 * ------------------------------------------------------------------ */

/**
 * The afflicted region per complaint.
 *
 * Kept here rather than as a field on all sixty patient templates: the
 * mapping is a statement about the *doctrine*, not about the patient, and it
 * belongs beside the veins it is compared against. A template absent from
 * this table has no clear seat — a fever or a melancholy is of the whole
 * body — and `judgeVein` then neither rewards nor punishes the choice.
 */
export const COMPLAINT_REGION: Record<string, BodyRegion> = {
  // Head and face — the Bader's commonest work.
  toothache: 'head',
  rotten_molar: 'head',
  gumboil: 'head',
  thrush_mouth: 'head',
  bleeding_gums: 'head',
  loose_tooth: 'head',
  canker_sore: 'head',
  tartar_breath: 'head',
  child_tooth: 'head',
  cracked_tooth: 'head',
  barber_itch_chin: 'head',
  headache_sanguine: 'head',
  earache: 'head',
  ear_wax: 'head',
  eye_cloud: 'head',
  nosebleed: 'head',
  scald_head: 'head',
  head_stove: 'head',
  clergy_rheum: 'head',
  // Neck and throat.
  quinsy: 'neck',
  // Arms and hands.
  broken_arm: 'arms',
  whitlow: 'arms',
  gash_arm: 'arms',
  sprain: 'arms',
  // Chest.
  cold_phlegm: 'chest',
  // Belly and liver.
  jaundice: 'belly',
  flux_belly: 'belly',
  colic_stones: 'belly',
  costive: 'belly',
  dropsy: 'belly',
  // Loins and groin.
  the_stone: 'loins',
  hernia_rupture: 'groin',
  venereal_ulcer: 'groin',
  midwife_assist: 'loins',
  // Legs and feet.
  gout_merchant: 'feet',
  chilblains: 'feet',
  mortified_leg: 'shins',
  running_sore: 'shins',
};

export function complaintRegion(templateId: string): BodyRegion | null {
  return COMPLAINT_REGION[templateId] ?? null;
}

/* ------------------------------------------------------------------ *
 * The forbidden days
 * ------------------------------------------------------------------ */

/**
 * *Dies aegyptiaci* — the Egyptian Days.
 *
 * Two unlucky days in each month, listed in calendars from late antiquity
 * onward, on which bleeding and purging were forbidden outright. The exact
 * dates vary between manuscripts; two per thirty-day month is the shape they
 * all share, and that is what is modelled.
 */
export function isEgyptianDay(day: number): boolean {
  const d = ((day - 1) % 30) + 1;
  return d === 3 || d === 17;
}

/* ------------------------------------------------------------------ *
 * The verdict
 * ------------------------------------------------------------------ */

export interface VeinVerdict {
  /** Multiplier on the treatment's success chance. */
  mult: number;
  /** What to tell the player, and in what colour. */
  key: string;
  tone: 'good' | 'warn' | 'bad';
}

/**
 * Judge a choice of vein against the day and the complaint.
 *
 * Deliberately three separate judgements rather than one score, because the
 * player should be able to tell *which* rule they broke:
 *
 *  - an Egyptian Day forbids the whole procedure;
 *  - the moon in the vein's own region is the classic warning of the tables;
 *  - a vein that serves the afflicted part is the right choice, and is
 *    rewarded.
 */
export function judgeVein(
  state: GameState,
  veinId: string,
  afflicted: BodyRegion | null,
): VeinVerdict {
  const vein = VEIN_MAP[veinId];
  if (!vein) return { mult: 1, key: 'vein_none', tone: 'warn' };

  if (isEgyptianDay(state.day)) {
    return { mult: 0.72, key: 'vein_egyptian_day', tone: 'bad' };
  }

  const sign = moonSign(state);
  if (SIGN_REGION[sign] === vein.region) {
    // The moon stands in the very part you mean to open.
    return { mult: 0.8, key: 'vein_moon_in_part', tone: 'bad' };
  }

  if (afflicted && vein.serves.includes(afflicted)) {
    return { mult: 1.12, key: 'vein_well_chosen', tone: 'good' };
  }

  if (afflicted && !vein.serves.includes(afflicted)) {
    return { mult: 0.94, key: 'vein_ill_matched', tone: 'warn' };
  }

  return { mult: 1, key: 'vein_indifferent', tone: 'warn' };
}
