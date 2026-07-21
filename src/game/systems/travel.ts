import type { GameState } from '../types';
import { MAP_NODE_MAP, neighbors } from '../data/map';
import { applyArrivalFameSpillover, banditChanceMult } from './reputation';
import { atLeast, firstUnmet, must, type Requirement } from './requirements';
import { seasonalTravelWear } from '../data/seasons';

export type EncounterKind =
  | 'none'
  | 'bandits'
  | 'pilgrims'
  | 'sick_village'
  | 'toll'
  | 'weather'
  | 'herbs'
  | 'story';

export interface TravelResult {
  success: boolean;
  days: number;
  encounter: EncounterKind;
  messageKey: string;
  coinDelta?: number;
  herbGain?: number;
  horseDamage?: number;
}

export function canTravel(state: GameState, toId: string): { ok: boolean; reason?: string } {
  if (state.locationId === toId) return { ok: false, reason: 'here' };
  if (!neighbors(state.locationId).includes(toId)) return { ok: false, reason: 'not_connected' };
  if (state.cart.horseHealth < 15) return { ok: false, reason: 'horse' };
  if (state.cart.cartCondition < 10) return { ok: false, reason: 'cart' };
  const node = MAP_NODE_MAP[toId];
  if (!node) return { ok: false, reason: 'unknown' };
  if (toId === 'war_camp' && !state.storyFlags['war_contract'] && state.act < 3) {
    return { ok: false, reason: 'locked' };
  }
  return { ok: true };
}

export function travelTo(state: GameState, toId: string): TravelResult {
  const check = canTravel(state, toId);
  if (!check.ok) {
    return { success: false, days: 0, encounter: 'none', messageKey: `travel_${check.reason}` };
  }

  const node = MAP_NODE_MAP[toId]!;
  const from = MAP_NODE_MAP[state.locationId]!;
  const dist = Math.hypot(node.x - from.x, node.y - from.y);
  const days = Math.max(1, Math.round(dist / 180));

  // Mud, short days and snow. Winter bites the cart and the horse rather than
  // the purse — those are the things the player has to keep mended.
  const wear = seasonalTravelWear(state);
  state.cart.horseHealth = Math.max(0, state.cart.horseHealth - Math.round((5 + days * 2) * wear));
  state.cart.cartCondition = Math.max(0, state.cart.cartCondition - Math.round(3 * wear));
  state.day += days;
  state.weekday = (state.weekday + days) % 7;
  state.locationId = toId;
  state.patientsToday = 0;
  state.dayEarnings = 0;
  state.dayReputation = 0;
  applyArrivalFameSpillover(state, toId);

  // Story auto-triggers
  if (toId === 'nurnberg' && !state.storyFlags['in_nurnberg']) {
    return {
      success: true,
      days,
      encounter: 'story',
      messageKey: 'travel_arrive_nurnberg',
    };
  }
  if (toId === 'war_camp' && state.storyFlags['war_contract']) {
    state.storyFlags['at_war_camp'] = true;
  }

  // Random encounters — fame reduces bandit risk on imperial roads
  const roll = Math.random();
  const banditThreshold = 0.12 * banditChanceMult(state);
  if (roll < banditThreshold) {
    const loss = 5 + Math.floor(Math.random() * 15);
    state.coin = Math.max(0, state.coin - loss);
    state.cart.horseHealth = Math.max(0, state.cart.horseHealth - 10);
    return {
      success: true,
      days,
      encounter: 'bandits',
      messageKey: 'travel_bandits',
      coinDelta: -loss,
      horseDamage: 10,
    };
  }
  if (roll < 0.22) {
    state.inventory.herbs += 3;
    return {
      success: true,
      days,
      encounter: 'herbs',
      messageKey: 'travel_herbs',
      herbGain: 3,
    };
  }
  if (roll < 0.32) {
    const toll = 3 + Math.floor(Math.random() * 6);
    state.coin = Math.max(0, state.coin - toll);
    return {
      success: true,
      days,
      encounter: 'toll',
      messageKey: 'travel_toll',
      coinDelta: -toll,
    };
  }
  if (roll < 0.4) {
    state.cart.horseHealth = Math.max(0, state.cart.horseHealth - 8);
    return {
      success: true,
      days,
      encounter: 'weather',
      messageKey: 'travel_weather',
      horseDamage: 8,
    };
  }
  if (roll < 0.48) {
    state.ethics = Math.min(100, state.ethics + 3);
    state.reputation[toId] = (state.reputation[toId] ?? 0) + 2;
    return {
      success: true,
      days,
      encounter: 'pilgrims',
      messageKey: 'travel_pilgrims',
    };
  }

  return {
    success: true,
    days,
    encounter: 'none',
    messageKey: 'travel_uneventful',
  };
}

export const CART_REPAIR_COST = 15;

/**
 * The iron-tool requirement is the one nobody could see: the button greyed on
 * coin alone, so a player with 500 coin and no tools had no idea why.
 */
export function canRepairCart(state: GameState): Requirement {
  return firstUnmet(
    must(state.cart.cartCondition < 100, 'req_cart_sound'),
    atLeast('req_iron_tools', state.inventory.ironTools, 1),
    atLeast('req_coin', state.coin, CART_REPAIR_COST),
  );
}

export function repairCart(state: GameState): boolean {
  if (!canRepairCart(state).ok) return false;
  state.coin -= CART_REPAIR_COST;
  state.inventory.ironTools -= 1;
  state.cart.cartCondition = Math.min(100, state.cart.cartCondition + 40);
  return true;
}

export function restHorse(state: GameState): void {
  state.cart.horseHealth = Math.min(100, state.cart.horseHealth + 20);
  state.day += 1;
  state.weekday = (state.weekday + 1) % 7;
}
