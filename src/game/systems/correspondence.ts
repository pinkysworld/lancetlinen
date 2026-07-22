import type {
  CorrespondenceMission,
  CorrespondenceRouteId,
  GameState,
  HouseId,
} from '../types';
import { CORRESPONDENCE_ROUTES, HOUSE_BY_ID, ROUTE_BY_ID, type CorrespondenceRoute } from '../data/houses';
import { addJournal } from './journal';
import { atLeast, firstUnmet, must, refuse, type Requirement } from './requirements';

/** Give every legacy save all contacts at neutral standing, without rerolling it. */
export function ensureCorrespondence(state: GameState): void {
  if (!state.houseRelations) state.houseRelations = {};
  for (const house of Object.values(HOUSE_BY_ID)) {
    const current = state.houseRelations[house.id];
    if (current === undefined) state.houseRelations[house.id] = 0;
  }
  if (state.correspondence === undefined) state.correspondence = null;
}

export function houseRelation(state: GameState, houseId: HouseId): number {
  ensureCorrespondence(state);
  return state.houseRelations?.[houseId] ?? 0;
}

export function activeCorrespondence(state: GameState): CorrespondenceMission | null {
  ensureCorrespondence(state);
  return state.correspondence ?? null;
}

function routeOrRefusal(id: CorrespondenceRouteId): CorrespondenceRoute | null {
  return ROUTE_BY_ID[id] ?? null;
}

/** One gate for UI and state mutation; a disabled route cannot still be started. */
export function canStartCorrespondence(state: GameState, id: CorrespondenceRouteId): Requirement {
  ensureCorrespondence(state);
  const route = routeOrRefusal(id);
  if (!route) return refuse('req_correspondence_unknown');
  return firstUnmet(
    must(!state.correspondence, 'req_correspondence_active'),
    atLeast('req_correspondence_day', state.day, route.minDay),
    atLeast('req_correspondence_act', state.act, route.minAct),
    atLeast('req_tongue', state.stats.tongue, route.minTongue),
    must(!route.requiresFlag || state.storyFlags[route.requiresFlag] === true, 'req_correspondence_contact'),
    atLeast('req_linen', state.inventory.linen, route.linenCost),
    atLeast('req_coin', state.coin, route.coinCost),
  );
}

/** Send a paid letter/courier; no effects arrive before its due day. */
export function startCorrespondence(
  state: GameState,
  id: CorrespondenceRouteId,
): CorrespondenceMission | null {
  const route = routeOrRefusal(id);
  if (!route || !canStartCorrespondence(state, id).ok) return null;
  state.coin -= route.coinCost;
  state.inventory.linen -= route.linenCost;
  const mission: CorrespondenceMission = {
    routeId: route.id,
    houseId: route.houseId,
    startedDay: state.day,
    dueDay: state.day + route.days,
  };
  state.correspondence = mission;
  addJournal(state, 'journal_correspondence_sent', 'travel', { route: route.titleKey, days: route.days });
  return mission;
}

export interface CorrespondenceResult {
  routeId: CorrespondenceRouteId;
  houseId: HouseId;
}

function deepenRelation(state: GameState, houseId: HouseId): void {
  ensureCorrespondence(state);
  state.houseRelations![houseId] = Math.min(3, houseRelation(state, houseId) + 1);
}

/**
 * Resolve at most one return. Outcomes are route-specific and deterministic:
 * the player sees what the network produced, never an unexplained dice roll.
 */
export function resolveDueCorrespondence(state: GameState): CorrespondenceResult | null {
  const mission = activeCorrespondence(state);
  if (!mission || state.day < mission.dueDay) return null;
  const relation = houseRelation(state, mission.houseId);
  state.correspondence = null;
  deepenRelation(state, mission.houseId);

  switch (mission.routeId) {
    case 'augsburg_cloth':
      state.coin += 10 + relation * 2;
      state.inventory.linen += 2;
      state.repElite = Math.min(100, (state.repElite ?? 0) + 1);
      addJournal(state, 'journal_correspondence_augsburg', 'travel');
      break;
    case 'florentine_letters':
      state.stats.tongue = Math.min(8, state.stats.tongue + 1);
      state.councilFavor += 1;
      state.prestige = Math.min(100, (state.prestige ?? 0) + 1);
      state.storyFlags['correspondence_florence_complete'] = true;
      addJournal(state, 'journal_correspondence_florence', 'travel');
      break;
    case 'tabriz_letter':
      state.inventory.herbs += 2;
      state.repFame = Math.min(100, (state.repFame ?? 0) + 3);
      state.prestige = Math.min(100, (state.prestige ?? 0) + 2);
      state.storyFlags['correspondence_tabriz_complete'] = true;
      addJournal(state, 'journal_correspondence_tabriz', 'travel');
      break;
  }
  return { routeId: mission.routeId, houseId: mission.houseId };
}

export { CORRESPONDENCE_ROUTES };
