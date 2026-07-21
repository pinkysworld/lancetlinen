/**
 * The year, and the week.
 *
 * ## What was wrong
 *
 * `state.season` was read in four places: a flat +1 to winter footfall, a
 * festival filter, two small multipliers in the bloodletting calendar, and the
 * line that advances it. Four turns of the year were therefore four identical
 * quarters — the calendar was displayed but never felt.
 *
 * The week was worse. Sunday carried a ×0.95 nudge, and **Saturday carried
 * nothing at all** — although Saturday was *the* bathing day of the medieval
 * week, the eve of the Sabbath, when a household washed and the Badestube was
 * full. Council *Feiertagsordnungen* meanwhile forbade Sunday trading
 * outright; the game let you open for a 5% penalty.
 *
 * ## What is modelled
 *
 * Three things, all of them things the player can plan around and see:
 *
 *  - **What ails people** shifts with the season, which is Galenic doctrine
 *    and also simply true: chilblains and bad chests in winter, wounds and
 *    fevers in the heat, melancholy as the light goes.
 *  - **What things cost**: herbs are cheap at the harvest and dear in spring
 *    when last year's are gone; firewood is dear when it is needed.
 *  - **When people come**: Saturday fills the stove, Sunday empties it.
 */
import type { GameState, PatientTemplate } from '../types';
import type { PricedItem } from './prices';

/** 0 spring · 1 summer · 2 autumn · 3 winter — as `economy.ts` advances it. */
export const SPRING = 0;
export const SUMMER = 1;
export const AUTUMN = 2;
export const WINTER = 3;

/* ------------------------------------------------------------------ *
 * What ails people
 * ------------------------------------------------------------------ */

/**
 * Complaints the season brings, by patient template id.
 *
 * A weighting, not a filter: a broken arm happens in February too. The
 * multiplier makes the waiting room *feel* like the time of year without ever
 * making a technique unusable for three months, which would be a trap rather
 * than a texture.
 */
const SEASONAL_COMPLAINTS: Record<number, Record<string, number>> = {
  [SPRING]: {
    // Spring bleeding was the great annual purge — and the year's stores are
    // gone, so the poor arrive thin and sickly.
    fever_blood: 1.6,
    headache_sanguine: 1.5,
    boils: 1.3,
    scabies_itch: 1.3,
  },
  [SUMMER]: {
    // Field work, brawls, and the campaigning season.
    wound_cut: 1.7,
    gash_arm: 1.6,
    abscess: 1.4,
    burn_smith: 1.4,
    child_fever: 1.3,
    running_sore: 1.3,
  },
  [AUTUMN]: {
    // Slaughter time, and the light going.
    melancholy: 1.8,
    broken_arm: 1.3,
    flux_belly: 1.4,
    jaundice: 1.3,
  },
  [WINTER]: {
    chilblains: 2.2,
    cold_phlegm: 1.8,
    earache: 1.4,
    quinsy: 1.5,
    clergy_rheum: 1.4,
  },
};

/**
 * How much likelier this complaint is at this time of year.
 *
 * Returns 1 for anything the season has no opinion about, which is most of
 * them — a toothache is a toothache in any month.
 */
export function seasonalComplaintWeight(state: GameState, template: PatientTemplate): number {
  return SEASONAL_COMPLAINTS[state.season]?.[template.id] ?? 1;
}

/* ------------------------------------------------------------------ *
 * What things cost
 * ------------------------------------------------------------------ */

/**
 * Seasonal multiplier on a supply, on top of the local price profile.
 *
 * Herbs follow the growing year: gathered and dried through summer, cheapest
 * at the harvest, dearest in the spring when the old stock is spent and
 * nothing new has come up. Firewood is dear exactly when it is wanted.
 */
export function seasonalGoodsMult(state: GameState, item: PricedItem): number {
  switch (item) {
    case 'herbs':
      return state.season === AUTUMN ? 0.7 : state.season === SPRING ? 1.35 : 1;
    case 'wood':
      return state.season === WINTER ? 1.4 : state.season === SUMMER ? 0.85 : 1;
    case 'leeches':
      // Leeches are gathered from warm standing water; in winter they are had
      // only from someone's tub, and priced accordingly.
      return state.season === WINTER ? 1.3 : 1;
    case 'linen':
      // Flax is retted and spun over winter, so cloth comes to market cheap
      // in spring.
      return state.season === SPRING ? 0.9 : 1;
    default:
      return 1;
  }
}

/* ------------------------------------------------------------------ *
 * When people come
 * ------------------------------------------------------------------ */

/** Sunday is 0, as `economy.ts` counts weekdays. */
export const SUNDAY = 0;
export const SATURDAY = 6;

/**
 * Extra custom the day brings, and the line to show for it.
 *
 * Saturday was the bathing day: the week's work done, the Sabbath coming, and
 * the whole household through the tub. Sunday the council forbade trading —
 * whoever opened did quiet business with a wary eye on the street, which is
 * modelled as a real loss of custom rather than the old 5% shrug. The honour
 * cost of opening on Sunday is separate and already applied in `economy.ts`.
 */
export function weekdayDemand(state: GameState): { delta: number; key: string } | null {
  if (state.weekday === SATURDAY) return { delta: 3, key: 'demand_bath_day' };
  if (state.weekday === SUNDAY) return { delta: -3, key: 'demand_sabbath' };
  return null;
}

/**
 * Winter roads.
 *
 * Mud, short days and snow. A multiplier on the wear a journey costs rather
 * than on its price, so it bites the cart and the horse — the things the
 * player has to keep mended — instead of quietly taxing the purse.
 */
export function seasonalTravelWear(state: GameState): number {
  return state.season === WINTER ? 1.6 : state.season === AUTUMN ? 1.2 : 1;
}

/* ------------------------------------------------------------------ *
 * Tomorrow
 * ------------------------------------------------------------------ */

/**
 * What tomorrow holds, for planning.
 *
 * The year and the week got their shape (above), but the player only learned
 * what kind of day it was on the morning of it. "Do not open the vein today,
 * tomorrow the sign is favourable" is only a decision if tomorrow is visible
 * tonight — so the day summary and the hub print these notes.
 *
 * Each note is an i18n key plus optional params, chosen from the same
 * functions that will actually govern tomorrow. No separate prediction logic:
 * the notes are computed by asking the real rules about `day + 1`, so they
 * cannot drift from what the morning then does.
 */
import { isEgyptianDay, moonSign } from './bloodletting';
import { MAP_NODE_MAP } from './map';

export interface DayNote {
  key: string;
  params?: Record<string, string | number>;
}

export function tomorrowNotes(state: GameState): DayNote[] {
  // Season length is 30 days (`economy.ts` advances it at day % 30 === 0);
  // build tomorrow's state the same way the tick will.
  const tomorrow: GameState = {
    ...state,
    day: state.day + 1,
    weekday: (state.weekday + 1) % 7,
    season: (state.day + 1) % 30 === 0 ? (state.season + 1) % 4 : state.season,
  };

  const notes: DayNote[] = [];

  const wd = weekdayDemand(tomorrow);
  if (wd) notes.push({ key: `note_${wd.key}` });

  const node = MAP_NODE_MAP[state.locationId];
  if (node && node.marketDay === tomorrow.weekday) {
    notes.push({ key: 'note_market_day' });
  }

  if (isEgyptianDay(tomorrow.day)) {
    notes.push({ key: 'note_egyptian_day' });
  } else if (moonSign(tomorrow) !== moonSign(state)) {
    // Only worth a line when the sign actually changes overnight.
    notes.push({ key: 'note_moon_moves', params: { sign: `zodiac_${moonSign(tomorrow)}` } });
  }

  if (tomorrow.season !== state.season) {
    notes.push({ key: `note_season_${tomorrow.season}` });
  }

  return notes;
}
