import type { GameState } from '../types';
import { addJournal } from './journal';
import { canMarry } from './honour';
import { atLeast, firstUnmet, must, refuse, type Requirement } from './requirements';
import { FIRST_NAMES_F, FIRST_NAMES_M } from '../data/patients';

export const SUITORS = [
  { id: 'greta_weber', nameKey: 'suitor_greta', cost: 20 },
  { id: 'anna_schmidt', nameKey: 'suitor_anna', cost: 30 },
  { id: 'clara_hoffmann', nameKey: 'suitor_clara', cost: 40 },
  { id: 'hans_muller', nameKey: 'suitor_hans', cost: 25 },
  { id: 'otto_fischer', nameKey: 'suitor_otto', cost: 35 },
];

export function ensureFamily(state: GameState): void {
  if (state.spouse === undefined) state.spouse = null;
  if (state.heir === undefined) state.heir = null;
  if (state.courtshipTarget === undefined) state.courtshipTarget = null;
  if (state.courtshipProgress === undefined) state.courtshipProgress = 0;
}

export const COURT_COSTS = { gift: 15, walk: 5, feast: 30, letter: 8 } as const;
export const MARRY_COST = 50;
export const GIFT_SPOUSE_COST = 20;
export const MOVE_SPOUSE_COST = 15;

export function canStartCourtship(state: GameState, suitorId: string): Requirement {
  ensureFamily(state);
  const s = SUITORS.find((x) => x.id === suitorId);
  if (!s) return refuse('req_unknown');
  return firstUnmet(
    must(!state.spouse, 'req_already_wed'),
    must(!state.courtshipTarget, 'req_already_courting'),
    atLeast('req_coin', state.coin, s.cost),
  );
}

export function startCourtship(state: GameState, suitorId: string): boolean {
  if (!canStartCourtship(state, suitorId).ok) return false;
  const s = SUITORS.find((x) => x.id === suitorId)!;
  state.coin -= s.cost;
  state.courtshipTarget = suitorId;
  state.courtshipProgress = 15;
  addJournal(state, 'journal_courtship_start', 'family', { name: s.nameKey });
  return true;
}

export function canCourtAction(
  state: GameState,
  action: keyof typeof COURT_COSTS,
): Requirement {
  ensureFamily(state);
  return firstUnmet(
    must(!state.spouse, 'req_already_wed'),
    must(!!state.courtshipTarget, 'req_no_courtship'),
    atLeast('req_coin', state.coin, COURT_COSTS[action]),
  );
}

export function courtAction(state: GameState, action: keyof typeof COURT_COSTS): boolean {
  if (!canCourtAction(state, action).ok) return false;
  const gains = { gift: 18, walk: 10, feast: 25, letter: 12 };
  state.coin -= COURT_COSTS[action];
  state.courtshipProgress = Math.min(100, state.courtshipProgress + gains[action] + Math.floor(state.stats.tongue * 1.5));
  if (state.courtshipProgress >= 100) {
    // Can marry
    state.storyFlags['can_marry'] = true;
  }
  return true;
}

/**
 * May the player marry?
 *
 * The honour gate is the one that matters and the one that was invisible: an
 * artisan family would not give a daughter to an *unehrlich* man, and the
 * screen said nothing about it. Reported as "the marry button does nothing".
 */
export function canMarryNow(state: GameState): Requirement {
  ensureFamily(state);
  return firstUnmet(
    must(!state.spouse, 'req_already_wed'),
    must(!!state.courtshipTarget, 'req_no_courtship'),
    atLeast('req_courtship', Math.round(state.courtshipProgress), 80),
    must(canMarry(state).ok, 'req_honour_marry'),
    atLeast('req_coin', state.coin, MARRY_COST),
  );
}

export function marry(state: GameState): boolean {
  if (!canMarryNow(state).ok) return false;
  const s = SUITORS.find((x) => x.id === state.courtshipTarget);
  if (!s) return false;
  state.coin -= MARRY_COST;
  state.spouse = {
    name: s.nameKey,
    affection: 70,
    cityId: state.locationId,
    marriedDay: state.day,
  };
  state.courtshipTarget = null;
  state.courtshipProgress = 0;
  state.prestige = (state.prestige ?? 0) + 15;
  state.reputation[state.locationId] = (state.reputation[state.locationId] ?? 0) + 5;
  addJournal(state, 'journal_married', 'family', { name: s.nameKey });
  state.storyFlags['can_marry'] = false;
  return true;
}

export function spouseDaily(state: GameState): void {
  ensureFamily(state);
  if (!state.spouse) return;
  // Affection drift
  if (state.locationId === state.spouse.cityId) {
    state.spouse.affection = Math.min(100, state.spouse.affection + 1);
  } else if (Math.random() < 0.3) {
    state.spouse.affection = Math.max(0, state.spouse.affection - 1);
  }
  // Home comfort bonus if spouse + home
  const home = state.properties?.find((p) => p.kind === 'home' && p.cityId === state.locationId);
  if (home && state.locationId === state.spouse.cityId) {
    home.comfort = Math.min(100, home.comfort + 0.5);
  }
  // Heir chance after marriage
  // Was 40 days at 4%/day — on a campaign that ends around day 20 the dynasty
  // ending was mathematically unreachable. Now attainable if the player marries
  // early and actually tends the marriage, but still a deliberate detour.
  if (!state.heir && state.spouse.affection >= 60 && state.day - state.spouse.marriedDay > 12) {
    if (Math.random() < 0.12) {
      const name =
        Math.random() < 0.5
          ? FIRST_NAMES_M[Math.floor(Math.random() * FIRST_NAMES_M.length)]!
          : FIRST_NAMES_F[Math.floor(Math.random() * FIRST_NAMES_F.length)]!;
      state.heir = { name, ageYears: 0, bornDay: state.day };
      addJournal(state, 'journal_heir_born', 'family', { name });
      state.prestige = (state.prestige ?? 0) + 10;
    }
  }
  if (state.heir) {
    // Age heir roughly every 90 days = +1 year for game pacing
    const days = state.day - state.heir.bornDay;
    state.heir.ageYears = Math.floor(days / 90);
  }
}

export function canGiftSpouse(state: GameState): Requirement {
  ensureFamily(state);
  return firstUnmet(
    must(!!state.spouse, 'req_no_spouse'),
    atLeast('req_coin', state.coin, GIFT_SPOUSE_COST),
  );
}

export function giftSpouse(state: GameState): boolean {
  if (!canGiftSpouse(state).ok) return false;
  state.coin -= GIFT_SPOUSE_COST;
  state.spouse!.affection = Math.min(100, state.spouse!.affection + 15);
  return true;
}

export function canMoveSpouseHere(state: GameState): Requirement {
  ensureFamily(state);
  return firstUnmet(
    must(!!state.spouse, 'req_no_spouse'),
    must(state.spouse?.cityId !== state.locationId, 'req_spouse_here'),
    atLeast('req_coin', state.coin, MOVE_SPOUSE_COST),
  );
}

export function moveSpouseHere(state: GameState): boolean {
  if (!canMoveSpouseHere(state).ok) return false;
  state.coin -= MOVE_SPOUSE_COST;
  state.spouse!.cityId = state.locationId;
  return true;
}
