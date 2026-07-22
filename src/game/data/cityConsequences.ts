import type { CityConsequenceId } from '../types';

/**
 * Consequences that stay in their city. They deliberately model a local
 * arrangement, not a universal power-up a player carries across the map.
 */
export interface CityConsequenceDef {
  id: CityConsequenceId;
  cityId: string;
  sphere: 'trade' | 'council';
  titleKey: string;
  bodyKey: string;
  effectKey: string;
  coinCost: number;
  minAct: number;
  minLocalReputation: number;
  minCouncil?: number;
  requiresFlag?: string;
}

export const CITY_CONSEQUENCES: CityConsequenceDef[] = [
  {
    id: 'augsburg_linen_contract',
    cityId: 'augsburg',
    sphere: 'trade',
    titleKey: 'city_consequence_augsburg_title',
    bodyKey: 'city_consequence_augsburg_body',
    effectKey: 'city_consequence_augsburg_effect',
    coinCost: 20,
    minAct: 2,
    minLocalReputation: 15,
    requiresFlag: 'correspondence_augsburg_complete',
  },
  {
    id: 'nurnberg_sworn_inspection',
    cityId: 'nurnberg',
    sphere: 'council',
    titleKey: 'city_consequence_nurnberg_title',
    bodyKey: 'city_consequence_nurnberg_body',
    effectKey: 'city_consequence_nurnberg_effect',
    coinCost: 15,
    minAct: 2,
    minLocalReputation: 20,
    minCouncil: 10,
  },
];

export const CITY_CONSEQUENCE_BY_ID = Object.fromEntries(
  CITY_CONSEQUENCES.map((consequence) => [consequence.id, consequence]),
) as Record<CityConsequenceId, CityConsequenceDef>;
