export interface UpgradeDef {
  id: string;
  cost: number;
  requiresLevel?: number;
  requiresFlag?: string;
}

export const BATH_UPGRADES: UpgradeDef[] = [
  { id: 'level1', cost: 120 }, // basic Badestube rights
  { id: 'level2', cost: 250, requiresLevel: 1 },
  { id: 'level3', cost: 500, requiresLevel: 2 },
  { id: 'boiler', cost: 80, requiresLevel: 1 },
  { id: 'privateBooth', cost: 150, requiresLevel: 2 },
  { id: 'apprenticeBunks', cost: 100, requiresLevel: 1 },
  { id: 'hireApprentice', cost: 40, requiresLevel: 1 },
  { id: 'hireBathMaid', cost: 50, requiresLevel: 1 },
];

export const DAILY_BASE_COST = 8;
export const WOOD_PER_DAY = 3;
export const STAFF_WAGE = 6;
