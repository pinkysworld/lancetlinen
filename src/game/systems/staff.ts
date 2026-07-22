import type { GameState, StaffMember, StaffRole, StaffTrait } from '../types';
import { FIRST_NAMES_F, FIRST_NAMES_M, SURNAMES } from '../data/patients';
import { folkLoyaltyBonus } from './reputation';
import { atLeast, firstUnmet, must, refuse, type Requirement } from './requirements';
import { addJournal } from './journal';

let staffSeq = 0;

function pickName(): string {
  const female = Math.random() < 0.5;
  const first = female
    ? FIRST_NAMES_F[Math.floor(Math.random() * FIRST_NAMES_F.length)]!
    : FIRST_NAMES_M[Math.floor(Math.random() * FIRST_NAMES_M.length)]!;
  const last = SURNAMES[Math.floor(Math.random() * SURNAMES.length)]!;
  return `${first} ${last}`;
}

const ROLE_WAGE: Record<StaffRole, number> = {
  apprentice: 5,
  bathmaid: 7,
  manager: 12,
  herb_boy: 4,
  nightwatch: 6,
};

export const STAFF_TRAITS: StaffTrait[] = ['careful', 'sociable', 'thrifty', 'steadfast'];

function traitFor(seed: string): StaffTrait {
  let total = 0;
  for (const char of seed) total += char.charCodeAt(0);
  return STAFF_TRAITS[total % STAFF_TRAITS.length]!;
}

export function ensureStaff(state: GameState): void {
  if (!state.staff) state.staff = [];
  for (const member of state.staff) {
    if (!member.trait) member.trait = traitFor(member.id || `${member.name}-${member.role}`);
  }
}

export function hireStaff(
  state: GameState,
  role: StaffRole,
  propertyId: string | null,
): StaffMember | null {
  ensureStaff(state);
  const cost = ROLE_WAGE[role] * 4; // hiring fee
  if (state.coin < cost) return null;
  // Caps
  const sameRole = state.staff.filter((s) => s.role === role && s.propertyId === propertyId);
  if (role === 'manager' && sameRole.length >= 1) return null;
  if (role === 'apprentice' && sameRole.length >= 3) return null;
  if (role === 'bathmaid' && sameRole.length >= 2) return null;
  if (role === 'herb_boy' && sameRole.length >= 1) return null;
  if (role === 'nightwatch' && sameRole.length >= 1) return null;

  state.coin -= cost;
  staffSeq += 1;
  const member: StaffMember = {
    id: `staff-${staffSeq}-${Date.now()}`,
    name: pickName(),
    role,
    propertyId,
    loyalty: Math.min(100, 55 + Math.floor(Math.random() * 20) + folkLoyaltyBonus(state)),
    skill: 2 + Math.floor(Math.random() * 3),
    wage: ROLE_WAGE[role],
    daysEmployed: 0,
    trait: STAFF_TRAITS[(staffSeq - 1) % STAFF_TRAITS.length]!,
  };
  state.staff.push(member);

  // Sync property counters
  if (propertyId) {
    const p = state.properties.find((x) => x.id === propertyId);
    if (p) {
      if (role === 'apprentice') p.staffApprentice = Math.min(3, p.staffApprentice + 1);
      if (role === 'bathmaid') p.staffBathMaid = Math.min(2, p.staffBathMaid + 1);
      if (role === 'manager') p.hasManager = true;
    }
  }
  return member;
}

export function fireStaff(state: GameState, staffId: string): boolean {
  ensureStaff(state);
  const idx = state.staff.findIndex((s) => s.id === staffId);
  if (idx < 0) return false;
  const m = state.staff[idx]!;
  if (m.propertyId) {
    const p = state.properties.find((x) => x.id === m.propertyId);
    if (p) {
      if (m.role === 'apprentice') p.staffApprentice = Math.max(0, p.staffApprentice - 1);
      if (m.role === 'bathmaid') p.staffBathMaid = Math.max(0, p.staffBathMaid - 1);
      if (m.role === 'manager') p.hasManager = false;
    }
  }
  state.staff.splice(idx, 1);
  return true;
}

export function payStaffWages(state: GameState): number {
  ensureStaff(state);
  let total = 0;
  for (const m of state.staff) {
    total += m.wage;
    m.daysEmployed += 1;
    // Loyalty drift
    if (Math.random() < 0.1) m.loyalty = Math.min(100, m.loyalty + 1);
    if (state.ethics < 30 && Math.random() < 0.15) m.loyalty = Math.max(0, m.loyalty - 3);
  }
  // Quit if loyalty too low
  state.staff = state.staff.filter((m) => {
    if (m.loyalty > 15) return true;
    if (m.propertyId) {
      const p = state.properties.find((x) => x.id === m.propertyId);
      if (p) {
        if (m.role === 'apprentice') p.staffApprentice = Math.max(0, p.staffApprentice - 1);
        if (m.role === 'bathmaid') p.staffBathMaid = Math.max(0, p.staffBathMaid - 1);
        if (m.role === 'manager') p.hasManager = false;
      }
    }
    state.storyFlags['staff_quit_today'] = m.name;
    return false;
  });
  if (state.coin >= total) {
    state.coin -= total;
    return total;
  }
  // Partial pay hurts loyalty
  state.coin = 0;
  for (const m of state.staff) m.loyalty = Math.max(0, m.loyalty - 8);
  return total;
}

/**
 * Staff of a given role working the player's current city.
 *
 * Household staff (`propertyId === null`) travel with the Bader and count
 * everywhere; property staff only count where they are posted.
 */
function localStaff(state: GameState, role: StaffRole): StaffMember[] {
  ensureStaff(state);
  const localIds = new Set(
    (state.properties ?? []).filter((p) => p.cityId === state.locationId).map((p) => p.id),
  );
  return state.staff.filter(
    (s) => s.role === role && (s.propertyId === null || localIds.has(s.propertyId)),
  );
}

/**
 * How much a member actually contributes, 0..1.
 *
 * Skill is what they can do; loyalty is whether they bother. A disaffected
 * apprentice is close to useless, which is what makes gifts and training worth
 * the coin.
 */
function contribution(m: StaffMember): number {
  const skill = Math.max(0, Math.min(10, m.skill)) / 10;
  const willing = 0.35 + 0.65 * (Math.max(0, Math.min(100, m.loyalty)) / 100);
  return skill * willing;
}

/**
 * Apprentices assisting at the table — added to the treatment success chance.
 *
 * This function previously existed but **nothing called it**: treatment used an
 * unrelated `bathhouse.staffApprentice * 0.02`, a bare head count. That made
 * skill, loyalty, training and gifting decorative. It is now the real path.
 *
 * Capped so a full bench cannot trivialise the craft.
 */
export function staffSkillBonus(state: GameState): number {
  const total = localStaff(state, 'apprentice').reduce((sum, m) => sum + contribution(m), 0);
  const careful = localStaff(state, 'apprentice').filter((m) => m.trait === 'careful').length;
  return Math.min(0.14, total * 0.05 + careful * 0.01);
}

/** Bathmaids draw custom — the Reiberin was the Stube's public face. */
export function staffDemandBonus(state: GameState): number {
  const total = localStaff(state, 'bathmaid').reduce((sum, m) => sum + contribution(m), 0);
  const sociable = localStaff(state, 'bathmaid').filter((m) => m.trait === 'sociable').length;
  return Math.round(total * 1.5) + sociable;
}

/** A herb boy gathers and stretches stores: chance to not consume an item. */
export function staffSupplySaveChance(state: GameState): number {
  const total = localStaff(state, 'herb_boy').reduce((sum, m) => sum + contribution(m), 0);
  const thrifty = localStaff(state, 'herb_boy').filter((m) => m.trait === 'thrifty').length;
  return Math.min(0.45, total * 0.4 + thrifty * 0.08);
}

/** A nightwatch deters the rival's sabotage. */
export function staffSabotageResist(state: GameState): number {
  const total = localStaff(state, 'nightwatch').reduce((sum, m) => sum + contribution(m), 0);
  const steadfast = localStaff(state, 'nightwatch').filter((m) => m.trait === 'steadfast').length;
  return Math.min(0.9, total * 0.85 + steadfast * 0.12);
}

/** A staff event may happen no more than once in seven game days. */
export function resolveStaffEvent(state: GameState): void {
  ensureStaff(state);
  if (!state.staff.length) return;
  const last = Number(state.storyFlags['staff_event_day'] ?? -7);
  if (state.day - last < 7) return;
  const member = state.staff[state.day % state.staff.length]!;
  state.storyFlags['staff_event_day'] = state.day;
  if (member.loyalty >= 50) {
    member.loyalty = Math.min(100, member.loyalty + 3);
    addJournal(state, 'journal_staff_event_steady', 'business', { name: member.name });
  } else {
    member.loyalty = Math.min(100, member.loyalty + 6);
    addJournal(state, 'journal_staff_event_need', 'business', { name: member.name });
  }
}

export const GIFT_STAFF_COST = 10;
export const TRAIN_STAFF_COST = 25;

export function canGiftStaff(state: GameState, staffId: string): Requirement {
  const m = state.staff.find((s) => s.id === staffId);
  if (!m) return refuse('req_unknown');
  return firstUnmet(
    must(m.loyalty < 100, 'req_loyalty_full'),
    atLeast('req_coin', state.coin, GIFT_STAFF_COST),
  );
}

export function giftStaff(state: GameState, staffId: string): boolean {
  if (!canGiftStaff(state, staffId).ok) return false;
  const m = state.staff.find((s) => s.id === staffId)!;
  state.coin -= GIFT_STAFF_COST;
  m.loyalty = Math.min(100, m.loyalty + 12);
  return true;
}

export function canTrainStaff(state: GameState, staffId: string): Requirement {
  const m = state.staff.find((s) => s.id === staffId);
  if (!m) return refuse('req_unknown');
  return firstUnmet(
    must(m.skill < 10, 'req_skill_full'),
    atLeast('req_coin', state.coin, TRAIN_STAFF_COST),
  );
}

export function trainStaff(state: GameState, staffId: string): boolean {
  if (!canTrainStaff(state, staffId).ok) return false;
  const m = state.staff.find((s) => s.id === staffId)!;
  state.coin -= TRAIN_STAFF_COST;
  m.skill = Math.min(10, m.skill + 1);
  m.loyalty = Math.min(100, m.loyalty + 5);
  return true;
}
