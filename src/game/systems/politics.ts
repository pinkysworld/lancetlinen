import type { GameState, OfficeCandidacy, OfficeId, TitleId } from '../types';
import { addJournal } from './journal';
import { canHoldOffice, honourFromScandal, honourFromCharity } from './honour';
import { ensureReputation, eliteForOffice, fameForTitle } from './reputation';
import { atLeast, firstUnmet, must, type Requirement } from './requirements';
import { councilRequirementDiscount } from './cityConsequences';

export const OFFICE_COST: Record<Exclude<OfficeId, 'none'>, { coin: number; council: number; guild: number }> = {
  quarter_warden: { coin: 80, council: 15, guild: 5 },
  guild_elder: { coin: 120, council: 10, guild: 25 },
  city_surgeon: { coin: 200, council: 30, guild: 20 },
  council_seat: { coin: 350, council: 40, guild: 15 },
};

/**
 * A Bader cannot buy civic authority at a counter. The money is a filing,
 * oath and patronage expense split between the petition and the eventual
 * appointment, while the decision itself happens after the council has met.
 */
export const OFFICE_APPLICATION_FEE: Record<Exclude<OfficeId, 'none'>, number> = {
  quarter_warden: 20,
  guild_elder: 30,
  city_surgeon: 50,
  council_seat: 80,
};

export const OFFICE_DECISION_DAYS: Record<Exclude<OfficeId, 'none'>, number> = {
  quarter_warden: 3,
  guild_elder: 4,
  city_surgeon: 5,
  council_seat: 6,
};

/** Career evidence beyond coin and favour; values are deliberate pacing gates. */
export const OFFICE_CAREER_REQUIREMENTS: Record<Exclude<OfficeId, 'none'>, {
  local: number;
  treated: number;
  prestige: number;
}> = {
  quarter_warden: { local: 25, treated: 12, prestige: 8 },
  guild_elder: { local: 35, treated: 24, prestige: 16 },
  city_surgeon: { local: 50, treated: 35, prestige: 28 },
  council_seat: { local: 65, treated: 50, prestige: 45 },
};

export const OFFICE_ACTION_COOLDOWN_DAYS = 7;

export const TITLE_COST: Record<Exclude<TitleId, 'citizen'>, { coin: number; prestige: number }> = {
  freeman: { coin: 50, prestige: 5 },
  master_bader: { coin: 150, prestige: 15 },
  honorable: { coin: 250, prestige: 25 },
  noble_surgeon: { coin: 500, prestige: 40 },
};

export function ensurePolitics(state: GameState): void {
  if (!state.office) state.office = 'none';
  if (!state.title) state.title = 'citizen';
  if (!state.titlesOwned) state.titlesOwned = ['citizen'];
  if (state.prestige === undefined) state.prestige = 0;
  if (state.officeCandidacy === undefined) state.officeCandidacy = null;
  if (!state.officeActionLastDay) state.officeActionLastDay = {};
}

/** Rank order of civic offices; you climb, you do not skip or step back. */
const OFFICE_ORDER: OfficeId[] = [
  'none',
  'quarter_warden',
  'guild_elder',
  'city_surgeon',
  'council_seat',
];

/** Nürnberg's council regulated craft through sworn work and inspection; it
 * is not modelled as a generic guild ladder. Other towns retain that ladder. */
export function craftAuthority(state: GameState): 'council' | 'guild' {
  return state.locationId === 'nurnberg' ? 'council' : 'guild';
}

function officeOrderFor(state: GameState): OfficeId[] {
  return craftAuthority(state) === 'council'
    ? ['none', 'quarter_warden', 'city_surgeon', 'council_seat']
    : OFFICE_ORDER;
}

/**
 * May the player stand for this office, and if not, which condition fails?
 *
 * Six separate conditions used to be six identical `return false`s, so the
 * screen could only say "denied" — the player had no way to learn whether they
 * were short of coin, of council favour, or of honour. The order is the order
 * the player should hear it in: standing first, then the specific favours,
 * then price, because being quoted a price you can meet when the real
 * obstacle is your reputation sends you off to earn coin you did not need.
 */
function canBeConsideredForOffice(
  state: GameState,
  office: Exclude<OfficeId, 'none'>,
): Requirement {
  ensurePolitics(state);
  ensureReputation(state);
  const cost = OFFICE_COST[office];
  const career = OFFICE_CAREER_REQUIREMENTS[office];
  const order = officeOrderFor(state);
  return firstUnmet(
    must(!(craftAuthority(state) === 'council' && office === 'guild_elder'), 'req_nurnberg_craft'),
    must(
      order.indexOf(office) > order.indexOf(state.office),
      'req_office_rank',
    ),
    // Civic office was closed to a man of doubtful standing. This is the point
    // where the honour axis bites hardest: coin alone will not buy a seat.
    must(canHoldOffice(state).ok, 'req_honour'),
    atLeast('req_local_reputation', state.reputation[state.locationId] ?? 0, career.local),
    atLeast('req_treated', state.totalTreated, career.treated),
    atLeast('req_prestige', state.prestige ?? 0, career.prestige),
    // Offices were not handed to disgraced cutters.
    atLeast('req_elite', state.repElite, eliteForOffice(office)),
    atLeast('req_council', state.councilFavor, Math.max(0, cost.council - councilRequirementDiscount(state))),
    // In Nürnberg the council's sworn-work rule replaces a guild-favour gate.
    // The higher council threshold below remains the public accountability.
    atLeast('req_guild', state.guildFavor, craftAuthority(state) === 'council' ? 0 : cost.guild),
    atLeast('req_coin', state.coin, OFFICE_APPLICATION_FEE[office]),
  );
}

/** May the player file a request for a later council/guild appointment? */
export function canApplyForOffice(
  state: GameState,
  office: Exclude<OfficeId, 'none'>,
): Requirement {
  ensurePolitics(state);
  return firstUnmet(
    must(!state.officeCandidacy, 'req_office_candidacy_active'),
    canBeConsideredForOffice(state, office),
  );
}

/** File an appointment request; it never grants the office immediately. */
export function applyForOffice(state: GameState, office: Exclude<OfficeId, 'none'>): boolean {
  if (!canApplyForOffice(state, office).ok) return false;
  const fee = OFFICE_APPLICATION_FEE[office];
  const dueDay = state.day + OFFICE_DECISION_DAYS[office];
  state.coin -= fee;
  state.officeCandidacy = {
    office,
    cityId: state.locationId,
    filedDay: state.day,
    dueDay,
    feePaid: fee,
  };
  addJournal(state, 'journal_office_petition', 'politics', {
    office: `office_${office}`,
    day: dueDay,
  });
  return true;
}

/** Remaining payment is due only if the council/guild actually confirms it. */
function confirmationCost(candidacy: OfficeCandidacy): number {
  return Math.max(0, OFFICE_COST[candidacy.office].coin - candidacy.feePaid);
}

/** Resolve an outstanding appointment once its stated council day has arrived. */
export function resolveDueOfficeCandidacy(state: GameState): 'appointed' | 'refused' | null {
  ensurePolitics(state);
  const candidacy = state.officeCandidacy;
  if (!candidacy || state.day < candidacy.dueDay) return null;

  const selection = canBeConsideredForOffice(state, candidacy.office);
  const remaining = confirmationCost(candidacy);
  const stayedInCity = state.locationId === candidacy.cityId;
  if (!selection.ok || !stayedInCity || state.coin < remaining) {
    state.officeCandidacy = null;
    addJournal(state, 'journal_office_refused', 'politics', {
      office: `office_${candidacy.office}`,
    });
    return 'refused';
  }

  state.coin -= remaining;
  state.office = candidacy.office;
  state.prestige = Math.min(100, (state.prestige ?? 0) + 8);
  state.councilFavor += 3;
  state.repElite = Math.min(100, state.repElite + 2);
  state.repFame = Math.min(100, state.repFame + 1);
  state.officeCandidacy = null;
  addJournal(state, `journal_office_${candidacy.office}`, 'politics');
  return 'appointed';
}

export function officeActionKey(office: OfficeId): string | null {
  switch (office) {
    case 'quarter_warden': return 'office_action_quarter_warden';
    case 'guild_elder': return 'office_action_guild_elder';
    case 'city_surgeon': return 'office_action_city_surgeon';
    case 'council_seat': return 'office_action_council_seat';
    default: return null;
  }
}

/** One useful, bounded duty per office week, not a new repeatable money button. */
export function canUseOfficeAction(state: GameState): Requirement {
  ensurePolitics(state);
  if (state.office === 'none') return { ok: false, reasonKey: 'req_no_office' };
  const last = state.officeActionLastDay?.[state.office] ?? -OFFICE_ACTION_COOLDOWN_DAYS;
  const readyDay = last + OFFICE_ACTION_COOLDOWN_DAYS;
  return firstUnmet(
    atLeast('req_office_action_wait', state.day, readyDay),
    must(
      state.office !== 'city_surgeon' || (state.inventory.linen >= 2 && state.inventory.salve >= 1),
      'req_office_action_supplies',
    ),
  );
}

export function useOfficeAction(state: GameState): boolean {
  if (!canUseOfficeAction(state).ok || state.office === 'none') return false;
  const office = state.office;
  state.officeActionLastDay![office] = state.day;
  switch (office) {
    case 'quarter_warden':
      state.guildFavor += 2;
      state.councilFavor += 1;
      state.reputation[state.locationId] = Math.min(100, (state.reputation[state.locationId] ?? 0) + 1);
      break;
    case 'guild_elder':
      state.guildFavor += 4;
      state.repElite = Math.min(100, state.repElite + 1);
      break;
    case 'city_surgeon':
      state.inventory.linen -= 2;
      state.inventory.salve -= 1;
      state.coin += 28;
      state.repElite = Math.min(100, state.repElite + 2);
      state.reputation[state.locationId] = Math.min(100, (state.reputation[state.locationId] ?? 0) + 2);
      break;
    case 'council_seat':
      state.councilFavor += 4;
      state.prestige = Math.min(100, (state.prestige ?? 0) + 2);
      state.repElite = Math.min(100, state.repElite + 1);
      break;
  }
  addJournal(state, `journal_${officeActionKey(office)}`, 'politics');
  return true;
}

/**
 * May the player take this title?
 *
 * The fame threshold is the one the player kept running into blind: the screen
 * printed "Fame from 15" but never their own figure, and a refusal produced a
 * bare "denied".
 */
export function canBuyTitle(state: GameState, title: Exclude<TitleId, 'citizen'>): Requirement {
  ensurePolitics(state);
  ensureReputation(state);
  const cost = TITLE_COST[title];
  return firstUnmet(
    must(!state.titlesOwned.includes(title), 'req_already_have'),
    must(
      title !== 'master_bader' ||
        state.guildRank === 'master' ||
        state.guildRank === 'journeyman',
      'req_guild_rank',
    ),
    atLeast('req_fame', state.repFame, fameForTitle(title)),
    atLeast('req_coin', state.coin, cost.coin),
  );
}

export function buyTitle(state: GameState, title: Exclude<TitleId, 'citizen'>): boolean {
  if (!canBuyTitle(state, title).ok) return false;
  const cost = TITLE_COST[title];
  state.coin -= cost.coin;
  state.titlesOwned.push(title);
  state.title = title;
  state.prestige += cost.prestige;
  state.repFame = Math.min(100, state.repFame + 2);
  addJournal(state, `journal_title_${title}`, 'politics');
  return true;
}

export const BRIBE_COST = 40;
export const DONATION_COST = 25;

export function canBribeCouncil(state: GameState): Requirement {
  return atLeast('req_coin', state.coin, BRIBE_COST);
}

export function canDonateChurch(state: GameState): Requirement {
  return atLeast('req_coin', state.coin, DONATION_COST);
}

export function bribeCouncil(state: GameState): boolean {
  if (!canBribeCouncil(state).ok) return false;
  state.coin -= BRIBE_COST;
  state.councilFavor += 8;
  state.ethics = Math.max(0, state.ethics - 4);
  state.churchHeat += 2;
  // Bribes are discovered often enough to matter.
  if (Math.random() < 0.35) honourFromScandal(state);
  return true;
}

export function donateChurch(state: GameState): boolean {
  if (!canDonateChurch(state).ok) return false;
  state.coin -= DONATION_COST;
  state.churchHeat = Math.max(0, state.churchHeat - 12);
  // Alms were the standard route back toward respectability.
  honourFromCharity(state, true);
  state.ethics = Math.min(100, state.ethics + 3);
  state.prestige += 2;
  // Public piety lifts folk trust a little
  ensureReputation(state);
  state.repFolk = Math.min(100, state.repFolk + 1);
  return true;
}

export function officeIncomeBonus(state: GameState): number {
  ensurePolitics(state);
  switch (state.office) {
    case 'quarter_warden':
      return 3;
    case 'guild_elder':
      return 5;
    case 'city_surgeon':
      return 10;
    case 'council_seat':
      return 15;
    default:
      return 0;
  }
}

export function titlePayMult(state: GameState): number {
  ensurePolitics(state);
  switch (state.title) {
    case 'freeman':
      return 1.05;
    case 'master_bader':
      return 1.12;
    case 'honorable':
      return 1.18;
    case 'noble_surgeon':
      return 1.3;
    default:
      return 1;
  }
}
