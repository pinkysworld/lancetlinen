import type { GameState } from '../types';
import { addJournal } from './journal';
import { MAP_NODE_MAP } from '../data/map';

export interface CityEvent {
  id: string;
  textKey: string;
  weight: number;
  minAct?: number;
  cityTypes?: string[];
  effects?: Partial<{
    coin: number;
    ethics: number;
    rep: number;
    churchHeat: number;
    guildFavor: number;
    councilFavor: number;
    herbs: number;
    patientsBonus: number;
  }>;
  setFlag?: string;
  dialogueId?: string;
}

export const CITY_EVENTS: CityEvent[] = [
  {
    id: 'market_rush',
    textKey: 'event_market_rush',
    weight: 3,
    effects: { patientsBonus: 2, coin: 5 },
  },
  {
    id: 'pilgrim_wave',
    textKey: 'event_pilgrim_wave',
    weight: 2,
    cityTypes: ['city', 'town', 'monastery'],
    effects: { rep: 2, ethics: 2, patientsBonus: 1 },
  },
  {
    id: 'guild_inspection',
    textKey: 'event_guild_inspection',
    weight: 2,
    minAct: 2,
    cityTypes: ['city', 'town'],
    effects: { guildFavor: 3, coin: -8 },
  },
  {
    id: 'church_sermon',
    textKey: 'event_church_sermon',
    weight: 2,
    effects: { churchHeat: -5, ethics: 1 },
  },
  {
    id: 'noble_summons',
    textKey: 'event_noble_summons',
    weight: 1,
    minAct: 2,
    cityTypes: ['city'],
    effects: { coin: 25, rep: 4, patientsBonus: 0 },
    setFlag: 'noble_patient_pending',
  },
  {
    id: 'herb_find',
    textKey: 'event_herb_find',
    weight: 2,
    cityTypes: ['village', 'monastery', 'camp'],
    effects: { herbs: 4 },
  },
  {
    id: 'rival_rumor',
    textKey: 'event_rival_rumor',
    weight: 2,
    minAct: 2,
    effects: { rep: -3, guildFavor: -2 },
  },
  {
    id: 'festival_eve',
    textKey: 'event_festival_eve',
    weight: 1,
    effects: { patientsBonus: 3, coin: 10 },
    setFlag: 'festival_boost',
  },
  {
    id: 'thief_night',
    textKey: 'event_thief_night',
    weight: 1,
    effects: { coin: -12 },
  },
  {
    id: 'soldier_camp_order',
    textKey: 'event_soldier_order',
    weight: 1,
    cityTypes: ['camp', 'city'],
    minAct: 2,
    effects: { coin: 15, patientsBonus: 2 },
  },
  {
    id: 'wet_nurse_plea',
    textKey: 'event_wet_nurse',
    weight: 1,
    effects: { ethics: 5, coin: -3, rep: 2 },
  },
  {
    id: 'tax_collector',
    textKey: 'event_tax',
    weight: 2,
    cityTypes: ['city', 'town'],
    effects: { coin: -10, councilFavor: 2 },
  },
];

export const FESTIVALS: { id: string; weekday: number; season?: number; textKey: string; mult: number }[] = [
  { id: 'sunday_mass', weekday: 0, textKey: 'festival_sunday', mult: 0.7 },
  { id: 'midsummer', weekday: 3, season: 1, textKey: 'festival_midsummer', mult: 1.5 },
  { id: 'harvest', weekday: 5, season: 2, textKey: 'festival_harvest', mult: 1.4 },
  { id: 'advent_market', weekday: 6, season: 3, textKey: 'festival_advent', mult: 1.6 },
  { id: 'easter', weekday: 0, season: 0, textKey: 'festival_easter', mult: 1.3 },
];

function pickWeighted<T extends { weight: number }>(items: T[]): T | null {
  if (!items.length) return null;
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const it of items) {
    r -= it.weight;
    if (r <= 0) return it;
  }
  return items[items.length - 1] ?? null;
}

export function rollCityEvent(state: GameState): CityEvent | null {
  if (state.day - (state.lastCityEventDay ?? 0) < 2) return null;
  if (Math.random() > 0.45) return null;

  const node = MAP_NODE_MAP[state.locationId];
  const pool = CITY_EVENTS.filter((e) => {
    if (e.minAct && state.act < e.minAct) return false;
    if (e.cityTypes && node && !e.cityTypes.includes(node.type)) return false;
    if (e.id === 'rival_rumor' && !state.rivalActive) return false;
    return true;
  });
  const ev = pickWeighted(pool);
  if (!ev) return null;

  state.lastCityEventDay = state.day;
  applyEventEffects(state, ev);
  addJournal(state, ev.textKey, 'business');
  return ev;
}

function applyEventEffects(state: GameState, ev: CityEvent): void {
  const e = ev.effects;
  if (!e) return;
  if (e.coin) state.coin = Math.max(0, state.coin + e.coin);
  if (e.ethics) state.ethics = Math.max(0, Math.min(100, state.ethics + e.ethics));
  if (e.rep) {
    state.reputation[state.locationId] = Math.max(
      -50,
      Math.min(100, (state.reputation[state.locationId] ?? 0) + e.rep),
    );
  }
  if (e.churchHeat) state.churchHeat = Math.max(0, state.churchHeat + e.churchHeat);
  if (e.guildFavor) state.guildFavor += e.guildFavor;
  if (e.councilFavor) state.councilFavor += e.councilFavor;
  if (e.herbs) state.inventory.herbs += e.herbs;
  if (e.patientsBonus) {
    state.storyFlags['event_patients_bonus'] = Number(state.storyFlags['event_patients_bonus'] ?? 0) + e.patientsBonus;
  }
  if (ev.setFlag) state.storyFlags[ev.setFlag] = true;
}

export function activeFestival(state: GameState): (typeof FESTIVALS)[0] | null {
  for (const f of FESTIVALS) {
    if (f.weekday !== state.weekday) continue;
    if (f.season !== undefined && f.season !== state.season) continue;
    // Seasonal festivals need the right weekday AND season AND this window.
    // At 4 days in 28 most players saw only one or two of the five in a whole
    // run; widened so the calendar is actually visible.
    if (f.season !== undefined && state.day % 28 > 9) continue;
    return f;
  }
  return null;
}

export function festivalPatientMult(state: GameState): number {
  const f = activeFestival(state);
  if (!f) return 1;
  state.festivalActive = f.id;
  return f.mult;
}
