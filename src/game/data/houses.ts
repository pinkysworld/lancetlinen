import type { CorrespondenceRouteId, HouseId } from '../types';

/**
 * Contacts are deliberately modest in 1382. They are not the later Fugger,
 * Medici or Borgia powers projected backwards into the campaign.
 */
export interface HouseDefinition {
  id: HouseId;
  titleKey: string;
  bodyKey: string;
}

export interface CorrespondenceRoute {
  id: CorrespondenceRouteId;
  houseId: HouseId;
  titleKey: string;
  bodyKey: string;
  days: number;
  coinCost: number;
  linenCost: number;
  minDay: number;
  minAct: number;
  minTongue: number;
  /** A completed earlier exchange, rather than a fabricated personal journey. */
  requiresFlag?: string;
}

export const HOUSES: HouseDefinition[] = [
  {
    id: 'fugger_weavers',
    titleKey: 'house_fugger_weavers',
    bodyKey: 'house_fugger_weavers_body',
  },
  {
    id: 'florentine_correspondents',
    titleKey: 'house_florentine_correspondents',
    bodyKey: 'house_florentine_correspondents_body',
  },
  {
    id: 'levantine_caravan',
    titleKey: 'house_levantine_caravan',
    bodyKey: 'house_levantine_caravan_body',
  },
];

/**
 * The route names describe what can plausibly move through a Bader's network:
 * letters, samples, copied material and a merchant courier — not a magical
 * player trip across continents.
 */
export const CORRESPONDENCE_ROUTES: CorrespondenceRoute[] = [
  {
    id: 'augsburg_cloth',
    houseId: 'fugger_weavers',
    titleKey: 'route_augsburg_cloth',
    bodyKey: 'route_augsburg_cloth_body',
    days: 7,
    coinCost: 12,
    linenCost: 1,
    minDay: 4,
    minAct: 1,
    minTongue: 2,
  },
  {
    id: 'florentine_letters',
    houseId: 'florentine_correspondents',
    titleKey: 'route_florentine_letters',
    bodyKey: 'route_florentine_letters_body',
    days: 10,
    coinCost: 18,
    linenCost: 1,
    minDay: 8,
    minAct: 2,
    minTongue: 3,
  },
  {
    id: 'tabriz_letter',
    houseId: 'levantine_caravan',
    titleKey: 'route_tabriz_letter',
    bodyKey: 'route_tabriz_letter_body',
    days: 20,
    coinCost: 36,
    linenCost: 2,
    minDay: 16,
    minAct: 3,
    minTongue: 4,
    requiresFlag: 'correspondence_florence_complete',
  },
];

export const HOUSE_BY_ID = Object.fromEntries(HOUSES.map((house) => [house.id, house])) as Record<HouseId, HouseDefinition>;
export const ROUTE_BY_ID = Object.fromEntries(CORRESPONDENCE_ROUTES.map((route) => [route.id, route])) as Record<CorrespondenceRouteId, CorrespondenceRoute>;
