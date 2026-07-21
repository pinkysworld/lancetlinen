import type { GameState, Property, PropertyKind } from '../types';
import { MAP_NODE_MAP } from '../data/map';
import { incomeMult } from './settings';
import { atLeast, firstUnmet, must, refuse, type Requirement } from './requirements';

let propSeq = 1;

export function newProperty(cityId: string, kind: PropertyKind, level = 1): Property {
  propSeq += 1;
  return {
    id: `prop-${cityId}-${kind}-${propSeq}`,
    cityId,
    kind,
    level,
    boiler: false,
    privateBooth: false,
    apprenticeBunks: false,
    staffApprentice: 0,
    staffBathMaid: 0,
    hasManager: false,
    open: false,
    comfort: kind === 'home' ? 20 : 0,
    licensePaid: kind === 'bathhouse',
  };
}

export function propertiesIn(state: GameState, cityId: string): Property[] {
  return (state.properties ?? []).filter((p) => p.cityId === cityId);
}

export function hasKind(state: GameState, cityId: string, kind: PropertyKind): boolean {
  return propertiesIn(state, cityId).some((p) => p.kind === kind);
}

export function getLocalBath(state: GameState): Property | undefined {
  return propertiesIn(state, state.locationId).find(
    (p) => p.kind === 'bathhouse' || p.kind === 'stall',
  );
}

export function getLocalHome(state: GameState): Property | undefined {
  return propertiesIn(state, state.locationId).find((p) => p.kind === 'home');
}

/** Sync legacy bathhouse field from primary bath (Nürnberg preferred, else first) */
export function syncLegacyBathhouse(state: GameState): void {
  const baths = (state.properties ?? []).filter((p) => p.kind === 'bathhouse');
  const primary =
    baths.find((p) => p.cityId === 'nurnberg') ?? baths[0] ?? propertiesIn(state, state.locationId).find((p) => p.kind === 'stall');
  if (!primary) {
    state.bathhouse = {
      owned: false,
      level: 0,
      boiler: false,
      privateBooth: false,
      apprenticeBunks: false,
      staffApprentice: 0,
      staffBathMaid: 0,
      open: false,
    };
    return;
  }
  state.bathhouse = {
    owned: primary.kind === 'bathhouse',
    level: primary.level,
    boiler: primary.boiler,
    privateBooth: primary.privateBooth,
    apprenticeBunks: primary.apprenticeBunks,
    staffApprentice: primary.staffApprentice,
    staffBathMaid: primary.staffBathMaid,
    open: primary.open,
  };
}

export const PROPERTY_COSTS: Record<PropertyKind, number> = {
  stall: 40,
  bathhouse: 120,
  home: 90,
  warehouse: 70,
};

export function canBuyProperty(
  state: GameState,
  kind: PropertyKind,
): { ok: boolean; reason?: string; cost: number; need?: number; have?: number } {
  const cityId = state.locationId;
  const node = MAP_NODE_MAP[cityId];
  const cost = PROPERTY_COSTS[kind];
  if (!node) return { ok: false, reason: 'req_unknown', cost };
  if (node.type === 'camp' && kind !== 'stall') return { ok: false, reason: 'req_camp', cost };
  if (hasKind(state, cityId, kind)) return { ok: false, reason: 'req_already_have', cost };
  if (kind === 'bathhouse') {
    const licenseKey = `license_${cityId}`;
    if (!state.storyFlags[licenseKey] && !state.storyFlags['bath_license']) {
      // Nürnberg global license still works for Nürnberg
      if (!(cityId === 'nurnberg' && state.storyFlags['bath_license'])) {
        return { ok: false, reason: 'req_license', cost };
      }
    }
    if (!node.hasBathLicenseShop && cityId !== 'nurnberg') {
      // still allow if license flag set
      if (!state.storyFlags[licenseKey]) return { ok: false, reason: 'req_no_shop', cost };
    }
  }
  if (state.coin < cost) return { ok: false, reason: 'req_coin', cost, need: cost, have: state.coin };
  return { ok: true, cost };
}

/** The same answer in the shared `Requirement` shape, for the UI helpers. */
export function buyPropertyRequirement(state: GameState, kind: PropertyKind): Requirement {
  const c = canBuyProperty(state, kind);
  if (c.ok) return { ok: true };
  return c.reason === 'req_coin'
    ? { ok: false, reasonKey: 'req_coin', need: c.cost, have: state.coin }
    : refuse(c.reason ?? 'req_unknown');
}

export function buyProperty(state: GameState, kind: PropertyKind): boolean {
  const check = canBuyProperty(state, kind);
  if (!check.ok) return false;
  state.coin -= check.cost;
  const prop = newProperty(state.locationId, kind, kind === 'stall' ? 0 : 1);
  if (kind === 'bathhouse') {
    prop.licensePaid = true;
    state.guildRank = state.guildRank === 'apprentice' ? 'journeyman' : state.guildRank;
    state.guildFavor += 8;
    state.act = Math.max(state.act, 2);
    state.storyFlags['own_bath'] = true;
    if (state.locationId === 'nurnberg') state.storyFlags['bath_license'] = true;
  }
  if (!state.properties) state.properties = [];
  state.properties.push(prop);
  syncLegacyBathhouse(state);
  return true;
}

/** What the bath right costs here. Nürnberg's is dearer, as it would be. */
export function licenseCost(cityId: string): number {
  return cityId === 'nurnberg' ? 100 : 70;
}

export function canBuyCityLicense(state: GameState): Requirement {
  const cityId = state.locationId;
  const node = MAP_NODE_MAP[cityId];
  const key = `license_${cityId}`;
  return firstUnmet(
    must(!!node?.hasBathLicenseShop, 'req_no_shop'),
    must(
      !state.storyFlags[key] && !(cityId === 'nurnberg' && state.storyFlags['bath_license']),
      'req_already_have',
    ),
    atLeast('req_coin', state.coin, licenseCost(cityId)),
  );
}

export function buyCityLicense(state: GameState): boolean {
  if (!canBuyCityLicense(state).ok) return false;
  const cityId = state.locationId;
  const key = `license_${cityId}`;
  state.coin -= licenseCost(cityId);
  state.storyFlags[key] = true;
  if (cityId === 'nurnberg') state.storyFlags['bath_license'] = true;
  state.guildFavor += 5;
  return true;
}

export const MANAGER_COST = 50;

export function canHireManager(state: GameState, propertyId: string): Requirement {
  const p = (state.properties ?? []).find((x) => x.id === propertyId);
  if (!p) return refuse('req_no_premises');
  return firstUnmet(
    must(!p.hasManager, 'req_already_have'),
    must(p.kind === 'bathhouse' || p.kind === 'stall', 'req_not_a_business'),
    atLeast('req_coin', state.coin, MANAGER_COST),
  );
}

export function hireManager(state: GameState, propertyId: string): boolean {
  if (!canHireManager(state, propertyId).ok) return false;
  const p = (state.properties ?? []).find((x) => x.id === propertyId)!;
  state.coin -= MANAGER_COST;
  p.hasManager = true;
  return true;
}

/**
 * Cost and prerequisite of every upgrade, in one table.
 *
 * Split out of the switch below so the UI can say *why* an upgrade is barred
 * instead of presenting eight identical live buttons that quietly do nothing —
 * which is what the screen did, and what was reported from play.
 */
export const UPGRADE_SPECS: Record<
  string,
  { coin: number; minLevel: number; reasonKey: string; done?: (p: Property) => boolean }
> = {
  // This had no branch in the switch at all, so it fell through to `default:
  // return false` and could never be bought — the first button on the screen.
  level1: { coin: 120, minLevel: 0, reasonKey: 'req_needs_premises' },
  level2: { coin: 250, minLevel: 1, reasonKey: 'req_needs_level1' },
  level3: { coin: 500, minLevel: 2, reasonKey: 'req_needs_level2' },
  boiler: { coin: 80, minLevel: 1, reasonKey: 'req_needs_level1', done: (p) => p.boiler },
  privateBooth: {
    coin: 150,
    minLevel: 2,
    reasonKey: 'req_needs_level2',
    done: (p) => p.privateBooth,
  },
  apprenticeBunks: {
    coin: 100,
    minLevel: 1,
    reasonKey: 'req_needs_level1',
    done: (p) => p.apprenticeBunks,
  },
  hireApprentice: {
    coin: 40,
    minLevel: 1,
    reasonKey: 'req_needs_bunks',
    done: (p) => p.staffApprentice >= 2,
  },
  hireBathMaid: {
    coin: 50,
    minLevel: 1,
    reasonKey: 'req_needs_level1',
    done: (p) => p.staffBathMaid >= 1,
  },
  comfort: { coin: 30, minLevel: 0, reasonKey: 'req_needs_home', done: (p) => p.comfort >= 100 },
};

/** May this upgrade be bought, and if not, why not? */
export function canUpgradeProperty(
  state: GameState,
  propertyId: string,
  upgradeId: string,
): Requirement {
  const p = (state.properties ?? []).find((x) => x.id === propertyId);
  if (!p) return refuse('req_no_premises');
  const spec = UPGRADE_SPECS[upgradeId];
  if (!spec) return refuse('req_unknown');
  if (spec.done?.(p)) return refuse('req_already_have');
  if (upgradeId === 'comfort' && p.kind !== 'home') return refuse('req_needs_home');
  if (upgradeId === 'hireApprentice' && !p.apprenticeBunks) return refuse('req_needs_bunks');
  return firstUnmet(
    must(p.level >= spec.minLevel, spec.reasonKey),
    atLeast('req_coin', state.coin, spec.coin),
  );
}

export function upgradeProperty(state: GameState, propertyId: string, upgradeId: string): boolean {
  // The gate lives in `canUpgradeProperty` and nowhere else — restating it here
  // is how two copies of a rule drift apart.
  if (!canUpgradeProperty(state, propertyId, upgradeId).ok) return false;
  const p = (state.properties ?? []).find((x) => x.id === propertyId)!;
  state.coin -= UPGRADE_SPECS[upgradeId]!.coin;
  switch (upgradeId) {
    case 'level1':
      // Simple bathhouse rights: a stall becomes premises you can work from.
      p.level = 1;
      if (p.kind === 'stall') p.kind = 'bathhouse';
      break;
    case 'level2':
      p.level = 2;
      break;
    case 'level3':
      p.level = 3;
      state.guildRank = 'master';
      break;
    case 'boiler':
      p.boiler = true;
      break;
    case 'privateBooth':
      p.privateBooth = true;
      break;
    case 'apprenticeBunks':
      p.apprenticeBunks = true;
      break;
    case 'hireApprentice':
      p.staffApprentice += 1;
      break;
    case 'hireBathMaid':
      p.staffBathMaid += 1;
      break;
    case 'comfort':
      p.comfort = Math.min(100, p.comfort + 15);
      break;
    default:
      return false;
  }
  syncLegacyBathhouse(state);
  return true;
}

/** Passive income from remote managed businesses */
export function applyRemoteIncome(state: GameState): number {
  let total = 0;
  for (const p of state.properties ?? []) {
    if (p.cityId === state.locationId) continue;
    if (!p.hasManager) continue;
    if (p.kind !== 'bathhouse' && p.kind !== 'stall') continue;
    const rep = state.reputation[p.cityId] ?? 0;
    const base = p.kind === 'bathhouse' ? 8 + p.level * 6 : 4;
    const staff = p.staffApprentice * 2 + p.staffBathMaid * 3;
    const epidemic = state.epidemicActive ? 1.4 : 1;
    const income = Math.round((base + staff + rep * 0.15) * epidemic);
    const upkeep = 3 + p.staffApprentice * 4 + p.staffBathMaid * 5 + (p.hasManager ? 5 : 0);
    const net = Math.max(0, income - upkeep);
    total += net;
    // tiny rep growth remotely
    state.reputation[p.cityId] = Math.min(100, (state.reputation[p.cityId] ?? 0) + 0.2);
  }
  // Applied to the net before it is both banked and reported, so the day
  // summary's figure matches what actually reached the purse.
  total = Math.round(total * incomeMult());
  state.coin += total;
  state.remoteEarningsToday = total;
  return total;
}

export function restAtHome(state: GameState): boolean {
  if (!canRestAtHome(state).ok) return false;
  const home = getLocalHome(state)!;
  const boost = 1 + Math.floor(home.comfort / 25);
  state.stats.soul = Math.min(10, state.stats.soul + boost > state.stats.soul ? 1 : 0);
  // Always refresh a bit
  if (Math.random() < 0.5) state.stats.soul = Math.min(10, state.stats.soul + 1);
  if (Math.random() < 0.35) state.stats.hand = Math.min(10, state.stats.hand + 1);
  state.cart.horseHealth = Math.min(100, state.cart.horseHealth + 10);
  state.day += 1;
  state.weekday = (state.weekday + 1) % 7;
  return true;
}

export const GATHERING_COST = 20;

export function canRestAtHome(state: GameState): Requirement {
  return must(!!getLocalHome(state), 'req_no_home_here');
}

export function canHostGathering(state: GameState): Requirement {
  return firstUnmet(
    must(!!getLocalHome(state), 'req_no_home_here'),
    atLeast('req_coin', state.coin, GATHERING_COST),
  );
}

export function hostGathering(state: GameState): boolean {
  if (!canHostGathering(state).ok) return false;
  const home = getLocalHome(state)!;
  state.coin -= GATHERING_COST;
  state.reputation[state.locationId] = Math.min(
    100,
    (state.reputation[state.locationId] ?? 0) + 4 + Math.floor(home.comfort / 30),
  );
  state.ethics = Math.min(100, state.ethics + 1);
  return true;
}

/** Migrate old saves without properties array */
export function ensureProperties(state: GameState): void {
  if (!state.properties) state.properties = [];
  if (state.remoteEarningsToday === undefined) state.remoteEarningsToday = 0;
  if (state.bathhouse?.owned && !state.properties.some((p) => p.kind === 'bathhouse')) {
    const p = newProperty('nurnberg', 'bathhouse', state.bathhouse.level || 1);
    p.boiler = state.bathhouse.boiler;
    p.privateBooth = state.bathhouse.privateBooth;
    p.apprenticeBunks = state.bathhouse.apprenticeBunks;
    p.staffApprentice = state.bathhouse.staffApprentice;
    p.staffBathMaid = state.bathhouse.staffBathMaid;
    state.properties.push(p);
  }
}
