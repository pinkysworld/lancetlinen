import type { GameState, Property, PropertyKind } from '../types';
import { MAP_NODE_MAP } from '../data/map';
import { incomeMult } from './settings';

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
): { ok: boolean; reason?: string; cost: number } {
  const cityId = state.locationId;
  const node = MAP_NODE_MAP[cityId];
  const cost = PROPERTY_COSTS[kind];
  if (!node) return { ok: false, reason: 'unknown', cost };
  if (node.type === 'camp' && kind !== 'stall') return { ok: false, reason: 'camp', cost };
  if (hasKind(state, cityId, kind)) return { ok: false, reason: 'owned', cost };
  if (kind === 'bathhouse') {
    const licenseKey = `license_${cityId}`;
    if (!state.storyFlags[licenseKey] && !state.storyFlags['bath_license']) {
      // Nürnberg global license still works for Nürnberg
      if (!(cityId === 'nurnberg' && state.storyFlags['bath_license'])) {
        return { ok: false, reason: 'license', cost };
      }
    }
    if (!node.hasBathLicenseShop && cityId !== 'nurnberg') {
      // still allow if license flag set
      if (!state.storyFlags[licenseKey]) return { ok: false, reason: 'no_shop', cost };
    }
  }
  if (state.coin < cost) return { ok: false, reason: 'coin', cost };
  return { ok: true, cost };
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

export function buyCityLicense(state: GameState): boolean {
  const cityId = state.locationId;
  const node = MAP_NODE_MAP[cityId];
  if (!node?.hasBathLicenseShop) return false;
  const key = `license_${cityId}`;
  if (state.storyFlags[key] || (cityId === 'nurnberg' && state.storyFlags['bath_license'])) return false;
  const cost = cityId === 'nurnberg' ? 100 : 70;
  if (state.coin < cost) return false;
  state.coin -= cost;
  state.storyFlags[key] = true;
  if (cityId === 'nurnberg') state.storyFlags['bath_license'] = true;
  state.guildFavor += 5;
  return true;
}

export function hireManager(state: GameState, propertyId: string): boolean {
  const p = (state.properties ?? []).find((x) => x.id === propertyId);
  if (!p || p.hasManager || state.coin < 50) return false;
  if (p.kind !== 'bathhouse' && p.kind !== 'stall') return false;
  state.coin -= 50;
  p.hasManager = true;
  return true;
}

export function upgradeProperty(state: GameState, propertyId: string, upgradeId: string): boolean {
  const p = (state.properties ?? []).find((x) => x.id === propertyId);
  if (!p) return false;
  switch (upgradeId) {
    case 'level2':
      if (p.level < 1 || state.coin < 250) return false;
      state.coin -= 250;
      p.level = 2;
      break;
    case 'level3':
      if (p.level < 2 || state.coin < 500) return false;
      state.coin -= 500;
      p.level = 3;
      state.guildRank = 'master';
      break;
    case 'boiler':
      if (p.boiler || p.level < 1 || state.coin < 80) return false;
      state.coin -= 80;
      p.boiler = true;
      break;
    case 'privateBooth':
      if (p.privateBooth || p.level < 2 || state.coin < 150) return false;
      state.coin -= 150;
      p.privateBooth = true;
      break;
    case 'apprenticeBunks':
      if (p.apprenticeBunks || p.level < 1 || state.coin < 100) return false;
      state.coin -= 100;
      p.apprenticeBunks = true;
      break;
    case 'hireApprentice':
      if (!p.apprenticeBunks || state.coin < 40 || p.staffApprentice >= 2) return false;
      state.coin -= 40;
      p.staffApprentice += 1;
      break;
    case 'hireBathMaid':
      if (p.level < 1 || state.coin < 50 || p.staffBathMaid >= 1) return false;
      state.coin -= 50;
      p.staffBathMaid += 1;
      break;
    case 'comfort':
      if (p.kind !== 'home' || state.coin < 30 || p.comfort >= 100) return false;
      state.coin -= 30;
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
  const home = getLocalHome(state);
  if (!home) return false;
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

export function hostGathering(state: GameState): boolean {
  const home = getLocalHome(state);
  if (!home || state.coin < 20) return false;
  state.coin -= 20;
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
