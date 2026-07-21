import type { GameState, OfficeId, TitleId } from '../types';
import { addJournal } from './journal';
import { canHoldOffice, honourFromScandal, honourFromCharity } from './honour';
import { ensureReputation, eliteForOffice, fameForTitle } from './reputation';
import { atLeast, firstUnmet, must, type Requirement } from './requirements';

export const OFFICE_COST: Record<Exclude<OfficeId, 'none'>, { coin: number; council: number; guild: number }> = {
  quarter_warden: { coin: 80, council: 15, guild: 5 },
  guild_elder: { coin: 120, council: 10, guild: 25 },
  city_surgeon: { coin: 200, council: 30, guild: 20 },
  council_seat: { coin: 350, council: 40, guild: 15 },
};

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
}

/** Rank order of civic offices; you climb, you do not skip or step back. */
const OFFICE_ORDER: OfficeId[] = [
  'none',
  'quarter_warden',
  'guild_elder',
  'city_surgeon',
  'council_seat',
];

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
export function canApplyForOffice(
  state: GameState,
  office: Exclude<OfficeId, 'none'>,
): Requirement {
  ensurePolitics(state);
  ensureReputation(state);
  const cost = OFFICE_COST[office];
  return firstUnmet(
    must(
      OFFICE_ORDER.indexOf(office) > OFFICE_ORDER.indexOf(state.office),
      'req_office_rank',
    ),
    // Civic office was closed to a man of doubtful standing. This is the point
    // where the honour axis bites hardest: coin alone will not buy a seat.
    must(canHoldOffice(state).ok, 'req_honour'),
    // Offices were not handed to disgraced cutters.
    atLeast('req_elite', state.repElite, eliteForOffice(office)),
    atLeast('req_council', state.councilFavor, cost.council),
    atLeast('req_guild', state.guildFavor, cost.guild),
    atLeast('req_coin', state.coin, cost.coin),
  );
}

export function applyForOffice(state: GameState, office: Exclude<OfficeId, 'none'>): boolean {
  if (!canApplyForOffice(state, office).ok) return false;
  const cost = OFFICE_COST[office];

  state.coin -= cost.coin;
  state.office = office;
  state.prestige += 10;
  state.councilFavor += 5;
  state.repElite = Math.min(100, state.repElite + 2);
  state.repFame = Math.min(100, state.repFame + 1);
  addJournal(state, `journal_office_${office}`, 'politics');
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
