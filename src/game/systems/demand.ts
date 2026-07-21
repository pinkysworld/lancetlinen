/**
 * How many patients come to the tub today, and how many wait at once.
 *
 * Replaces the old one-liner (`3 + level*2 + floor(rep/15)`), which ignored
 * where you were standing, who trusted you, and what was happening in the town.
 * A festival day in Nürnberg with a full Badestube should not draw the same
 * crowd as a wet Tuesday at a roadside camp.
 *
 * Every contribution is reported in `factors` so the bathhouse can show the
 * player *why* it was busy or dead — the numbers are not hidden.
 */
import type { GameState, SettlementType } from '../types';
import { MAP_NODE_MAP } from '../data/map';
import { getLocalBath } from './property';
import { activeFestival, festivalPatientMult } from './events';
import { weekdayDemand } from '../data/seasons';
import { staffDemandBonus } from './staff';
import { churchDemandPenalty } from './pressure';

export interface DemandFactor {
  /** i18n key describing the cause. */
  key: string;
  delta: number;
}

export interface Demand {
  /** Total patients who will present today. */
  patients: number;
  /** How many are visible in the waiting room at one time. */
  queueSize: number;
  factors: DemandFactor[];
}

/**
 * Baseline footfall by settlement size.
 *
 * Tuned so the whole game has headroom: a day-one camp draws 1, a mid-game
 * town bathhouse around 7, and only a maxed Badestube in a city on market day
 * reaches the cap. An earlier pass had a town already hitting 12, which pinned
 * the late game to the ceiling and made festivals and plague invisible.
 */
const SETTLEMENT_BASE: Record<SettlementType, number> = {
  city: 5,
  town: 3,
  monastery: 2,
  village: 2,
  crossroads: 1,
  camp: 1,
};

const MIN_PATIENTS = 1;
const MAX_PATIENTS = 14;

export function computeDemand(state: GameState): Demand {
  const factors: DemandFactor[] = [];
  const add = (key: string, delta: number) => {
    if (delta !== 0) factors.push({ key, delta });
  };

  const node = MAP_NODE_MAP[state.locationId];
  const settlement: SettlementType = node?.type ?? 'village';

  let total = SETTLEMENT_BASE[settlement];
  add(`demand_settlement_${settlement}`, total);

  // Premises: a proper Badestube with a hot boiler draws a crowd a stall cannot.
  const bath = getLocalBath(state);
  if (bath) {
    const premises = bath.kind === 'bathhouse' ? 1 + bath.level : bath.level;
    add('demand_premises', premises);
    total += premises;
  }

  // Local standing.
  const rep = state.reputation[state.locationId] ?? 0;
  const repDelta = Math.floor(rep / 25);
  add('demand_reputation', repDelta);
  total += repDelta;

  // Folk trust brings the commoners who make up most of the queue.
  const folkDelta = Math.floor((state.repFolk ?? 0) / 45);
  add('demand_folk', folkDelta);
  total += folkDelta;

  // Bathmaids draw custom in their own right.
  const maids = staffDemandBonus(state);
  if (maids) {
    add('demand_bathmaid', maids);
    total += maids;
  }

  // Market day fills the square.
  if (node && node.marketDay === state.weekday) {
    add('demand_market_day', 2);
    total += 2;
  }

  // Festivals.
  if (activeFestival(state)) {
    const mult = festivalPatientMult(state);
    const festDelta = Math.max(1, Math.round(total * (mult - 1)));
    add('demand_festival', festDelta);
    total += festDelta;
  }

  // Plague: many more come, and they are sicker.
  if (state.epidemicActive) {
    add('demand_epidemic', 3);
    total += 3;
  }

  // Winter drives chilblains, fevers and bad chests indoors to the bath.
  if (state.season === 3) {
    add('demand_winter', 1);
    total += 1;
  }

  // Saturday was the bathing day; Sunday the council forbade trading. The
  // week had a shape and the game did not show it.
  const day = weekdayDemand(state);
  if (day) {
    add(day.key, day.delta);
    total += day.delta;
  }

  // A rival's sabotage, or a reputation for killing people, thins the crowd.
  if (state.storyFlags['sabotage_today']) {
    add('demand_sabotage', -2);
    total -= 2;
  }
  // The pious stop coming when the church is displeased.
  const church = churchDemandPenalty(state);
  if (church) {
    add('demand_church', -church);
    total -= church;
  }

  const deathPenalty = Math.min(3, Math.floor((state.deathsOnHands ?? 0) / 3));
  if (deathPenalty > 0) {
    add('demand_deaths', -deathPenalty);
    total -= deathPenalty;
  }

  // Legacy one-off bonus from city events.
  const eventBonus = Number(state.storyFlags['event_patients_bonus'] ?? 0);
  if (eventBonus) {
    add('demand_event', eventBonus);
    total += eventBonus;
  }

  const patients = Math.max(MIN_PATIENTS, Math.min(MAX_PATIENTS, total));

  return { patients, queueSize: queueSizeFor(patients), factors };
}

/**
 * How many wait visibly at once.
 *
 * A busy day means a real crowd to triage; a quiet one means you take whoever
 * turns up. Capped at 5 so the row still fits and stays readable.
 */
export function queueSizeFor(patients: number): number {
  return Math.max(1, Math.min(5, 1 + Math.floor(patients / 3)));
}

/** One-line summary of the three largest influences, for the bathhouse header. */
export function topFactors(demand: Demand, count = 3): DemandFactor[] {
  return [...demand.factors]
    .filter((f) => f.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, count);
}
