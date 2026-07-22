import type { CityConsequenceId, GameState } from '../types';
import { CITY_CONSEQUENCES, CITY_CONSEQUENCE_BY_ID, type CityConsequenceDef } from '../data/cityConsequences';
import { addJournal } from './journal';
import { atLeast, firstUnmet, must, refuse, type Requirement } from './requirements';

/** Give old saves an empty, deterministic city-agreement record. */
export function ensureCityConsequences(state: GameState): void {
  if (!state.cityConsequences) state.cityConsequences = [];
}

export function hasCityConsequence(state: GameState, id: CityConsequenceId): boolean {
  ensureCityConsequences(state);
  return state.cityConsequences!.includes(id);
}

export function consequencesHere(state: GameState): CityConsequenceDef[] {
  return CITY_CONSEQUENCES.filter((consequence) => consequence.cityId === state.locationId);
}

/** One source of truth for both the muted button and its state mutation. */
export function canSecureCityConsequence(
  state: GameState,
  id: CityConsequenceId,
): Requirement {
  ensureCityConsequences(state);
  const consequence = CITY_CONSEQUENCE_BY_ID[id];
  if (!consequence) return refuse('req_city_consequence_unknown');
  return firstUnmet(
    must(state.locationId === consequence.cityId, 'req_city_consequence_location'),
    must(!hasCityConsequence(state, id), 'req_city_consequence_done'),
    atLeast('req_correspondence_act', state.act, consequence.minAct),
    atLeast('req_local_reputation', state.reputation[consequence.cityId] ?? 0, consequence.minLocalReputation),
    atLeast('req_council', state.councilFavor, consequence.minCouncil ?? 0),
    must(!consequence.requiresFlag || state.storyFlags[consequence.requiresFlag] === true, 'req_city_consequence_contact'),
    atLeast('req_coin', state.coin, consequence.coinCost),
  );
}

/**
 * Secure the local agreement once. Effects are intentionally bounded and only
 * alter the city that negotiated them; no remote income or map teleportation.
 */
export function secureCityConsequence(state: GameState, id: CityConsequenceId): boolean {
  const consequence = CITY_CONSEQUENCE_BY_ID[id];
  if (!consequence || !canSecureCityConsequence(state, id).ok) return false;
  state.coin -= consequence.coinCost;
  state.cityConsequences!.push(id);

  if (id === 'augsburg_linen_contract') {
    state.guildFavor += 2;
    state.prestige = Math.min(100, (state.prestige ?? 0) + 2);
  } else {
    state.councilFavor += 3;
    state.prestige = Math.min(100, (state.prestige ?? 0) + 1);
  }
  addJournal(state, `journal_city_consequence_${id}`, consequence.sphere === 'trade' ? 'business' : 'politics');
  return true;
}

/** Augsburg's negotiated linen price applies only while buying in Augsburg. */
export function cityGoodsMultiplier(state: GameState, cityId: string, item: string): number {
  return cityId === 'augsburg' && item === 'linen' && hasCityConsequence(state, 'augsburg_linen_contract')
    ? 0.75
    : 1;
}

/** A completed Nürnberg inspection reduces only local council-office hurdles. */
export function councilRequirementDiscount(state: GameState): number {
  return state.locationId === 'nurnberg' && hasCityConsequence(state, 'nurnberg_sworn_inspection') ? 5 : 0;
}
