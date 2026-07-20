import type { GameState, OfficeId, TitleId } from '../types';
import { addJournal } from './journal';
import { canHoldOffice, honourFromScandal, honourFromCharity } from './honour';
import { ensureReputation, eliteForOffice, fameForTitle } from './reputation';

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

export function applyForOffice(state: GameState, office: Exclude<OfficeId, 'none'>): boolean {
  ensurePolitics(state);
  ensureReputation(state);
  const cost = OFFICE_COST[office];
  if (state.coin < cost.coin) return false;
  if (state.councilFavor < cost.council) return false;
  if (state.guildFavor < cost.guild) return false;
  // Elite favour required — offices were not sold to disgraced cutters
  if (state.repElite < eliteForOffice(office)) return false;
  // Civic office was closed to a man of doubtful standing. This is the point
  // where the honour axis bites hardest: coin alone will not buy a seat.
  if (!canHoldOffice(state).ok) return false;
  // Rank order
  const order: OfficeId[] = ['none', 'quarter_warden', 'guild_elder', 'city_surgeon', 'council_seat'];
  if (order.indexOf(office) <= order.indexOf(state.office)) return false;

  state.coin -= cost.coin;
  state.office = office;
  state.prestige += 10;
  state.councilFavor += 5;
  state.repElite = Math.min(100, state.repElite + 2);
  state.repFame = Math.min(100, state.repFame + 1);
  addJournal(state, `journal_office_${office}`, 'politics');
  return true;
}

export function buyTitle(state: GameState, title: Exclude<TitleId, 'citizen'>): boolean {
  ensurePolitics(state);
  ensureReputation(state);
  if (state.titlesOwned.includes(title)) return false;
  const cost = TITLE_COST[title];
  if (state.coin < cost.coin) return false;
  if (title === 'master_bader' && state.guildRank !== 'master' && state.guildRank !== 'journeyman') {
    return false;
  }
  if (state.repFame < fameForTitle(title)) return false;
  state.coin -= cost.coin;
  state.titlesOwned.push(title);
  state.title = title;
  state.prestige += cost.prestige;
  state.repFame = Math.min(100, state.repFame + 2);
  addJournal(state, `journal_title_${title}`, 'politics');
  return true;
}

export function bribeCouncil(state: GameState): boolean {
  if (state.coin < 40) return false;
  state.coin -= 40;
  state.councilFavor += 8;
  state.ethics = Math.max(0, state.ethics - 4);
  state.churchHeat += 2;
  // Bribes are discovered often enough to matter.
  if (Math.random() < 0.35) honourFromScandal(state);
  return true;
}

export function donateChurch(state: GameState): boolean {
  if (state.coin < 25) return false;
  state.coin -= 25;
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
