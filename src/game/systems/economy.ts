import type { GameState } from '../types';
import { DAILY_BASE_COST, STAFF_WAGE, WOOD_PER_DAY } from '../data/upgrades';
import { TECHNIQUE_MAP } from '../data/techniques';
import {
  applyRemoteIncome,
  buyProperty,
  getLocalBath,
  syncLegacyBathhouse,
  upgradeProperty,
} from './property';
import { payStaffWages, staffSabotageResist } from './staff';
import { applyChurchPressure, applyDebtCollection } from './pressure';
import { tickHonour, honourFromWorkingHolyDay, addHonour } from './honour';
import { checkAchievements } from './achievements';
import { incomeMult, pressureMult } from './settings';
import { spouseDaily } from './family';
import { officeIncomeBonus } from './politics';
import { festivalPatientMult } from './events';
import { addJournal } from './journal';
import { tickReputation } from './reputation';

export function dailyOperatingCost(state: GameState): number {
  const local = getLocalBath(state);
  if (!local) {
    // No premises — bare lodging. Still scaled, so difficulty does not quietly
    // stop applying to a player who has just lost their bathhouse.
    return Math.max(1, Math.round(3 * pressureMult()));
  }
  let cost = local.kind === 'stall' ? 4 : DAILY_BASE_COST;
  cost += local.staffApprentice * STAFF_WAGE;
  cost += local.staffBathMaid * (STAFF_WAGE + 2);
  if (local.level >= 2) cost += 5;
  if (local.level >= 3) cost += 10;
  if (local.boiler) cost += 2;
  const otherBaths = (state.properties ?? []).filter(
    (p) => p.kind === 'bathhouse' && p.cityId !== state.locationId,
  );
  cost += otherBaths.length * 4;
  // Scaled here rather than at the deduction site so every caller — the morning
  // charge and any UI that previews the day's costs — quotes the same figure.
  return Math.round(cost * pressureMult());
}

export function applyMorningCosts(state: GameState): { cost: number; wood: number; ok: boolean } {
  const cost = dailyOperatingCost(state);
  const local = getLocalBath(state);
  const wood = local && local.kind === 'bathhouse' ? WOOD_PER_DAY : 1;
  if (state.coin < cost) {
    return { cost, wood, ok: false };
  }
  state.coin -= cost;
  state.inventory.wood = Math.max(0, state.inventory.wood - wood);
  if (state.debt > 0) {
    const interest = Math.ceil(state.debt * 0.02);
    state.debt += interest;
  }
  // Sunday and feast-day trading was prohibited by council Feiertagsordnungen;
  // a Bader who opened anyway was noticed.
  if (state.weekday === 0) honourFromWorkingHolyDay(state);

  if (local) local.open = true;
  syncLegacyBathhouse(state);
  // Festival / event patient bonus applied when opening
  const fest = festivalPatientMult(state);
  if (fest > 1) {
    state.storyFlags['event_patients_bonus'] =
      Number(state.storyFlags['event_patients_bonus'] ?? 0) + Math.floor(fest);
  }
  return { cost, wood, ok: true };
}

export function endDay(state: GameState): void {
  applyRemoteIncome(state);
  const wages = payStaffWages(state);
  if (wages > 0) {
    /* wages already deducted */
  }
  const officePay = Math.round(officeIncomeBonus(state) * incomeMult());
  if (officePay > 0) state.coin += officePay;

  // Late-game pressure: church scrutiny and the lender collecting. Without
  // these nothing threatens the player after roughly day 12.
  applyChurchPressure(state);
  applyDebtCollection(state);

  spouseDaily(state);
  festivalPatientMult(state);
  tickReputation(state);
  tickHonour(state);
  // Evaluated once a day against the whole state rather than fired from the
  // dozens of places that could satisfy a condition.
  checkAchievements(state);

  state.day += 1;
  state.weekday = (state.weekday + 1) % 7;
  if (state.day % 30 === 0) {
    state.season = (state.season + 1) % 4;
    if (state.season === 0) state.year += 1;
  }
  state.patientsToday = 0;
  state.dayEarnings = 0;
  state.dayReputation = 0;
  state.bathhouse.open = false;
  for (const p of state.properties ?? []) p.open = false;
  delete state.storyFlags['event_patients_bonus'];
  delete state.storyFlags['festival_boost'];
  delete state.storyFlags['staff_quit_today'];
  state.festivalActive = null;

  if (state.cart.horseHealth < 100) state.cart.horseHealth = Math.min(100, state.cart.horseHealth + 5);

  if (state.rivalActive && state.storyFlags['rival_war'] && Math.random() < 0.2) {
    // A nightwatch is the whole reason to keep one on the payroll: they catch
    // the rival's man before he reaches the woodpile.
    if (Math.random() < staffSabotageResist(state)) {
      delete state.storyFlags['sabotage_today'];
      addJournal(state, 'journal_sabotage_foiled', 'business');
    } else {
      state.inventory.wood = Math.max(0, state.inventory.wood - 3);
      state.storyFlags['sabotage_today'] = true;
      addJournal(state, 'journal_sabotage', 'business');
    }
  } else {
    delete state.storyFlags['sabotage_today'];
  }

  if (
    state.act >= 2 &&
    state.totalTreated >= 25 &&
    !state.storyFlags['epidemic_done'] &&
    !state.epidemicActive &&
    Math.random() < 0.15
  ) {
    state.epidemicActive = true;
    state.storyFlags['epidemic_pending_dialogue'] = true;
    addJournal(state, 'journal_epidemic_starts', 'story');
  }

  // Tutorial progression auto-hints via flags
  if (state.tutorialStep === 1 && state.totalTreated >= 1) state.tutorialStep = 2;
  if (state.tutorialStep === 2 && state.day >= 3) state.tutorialStep = 3;
  if (state.tutorialStep === 3 && (state.properties?.length ?? 0) > 0) state.tutorialStep = 4;
}

export function buySupplies(
  state: GameState,
  item: keyof GameState['inventory'],
  amount: number,
  unitPrice: number,
): boolean {
  const total = amount * unitPrice;
  if (state.coin < total) return false;
  state.coin -= total;
  state.inventory[item] += amount;
  return true;
}

export function craftSalve(state: GameState): boolean {
  if (state.inventory.herbs < 2 || state.inventory.linen < 1) return false;
  state.inventory.herbs -= 2;
  state.inventory.linen -= 1;
  state.inventory.salve += 2;
  return true;
}

/**
 * Learn a technique, charging for it.
 *
 * `costOverride` lets the Study screen charge the self-taught premium (see
 * SELF_TAUGHT_MULTIPLIER) without the caller also deducting coin — doing both
 * would charge the player twice.
 */
export function unlockTechnique(state: GameState, id: string, costOverride?: number): boolean {
  const tech = TECHNIQUE_MAP[id];
  if (!tech) return false;
  if (state.unlockedTechniques.includes(id)) return false;
  const cost = costOverride ?? tech.unlockCost;
  if (state.coin < cost) return false;
  state.coin -= cost;
  state.unlockedTechniques.push(id);
  return true;
}

export function tryBuyBathhouse(state: GameState): boolean {
  return buyProperty(state, 'bathhouse');
}

export function upgradeBath(state: GameState, upgradeId: string): boolean {
  const local = getLocalBath(state);
  if (!local) return false;
  return upgradeProperty(state, local.id, upgradeId);
}

export function marketPrices(state: GameState): Record<string, number> {
  const epidemic = state.epidemicActive ? 1.5 : 1;
  const season = state.season;
  return {
    linen: Math.round(4 * epidemic),
    herbs: Math.round((3 + (season === 3 ? 2 : 0)) * epidemic),
    leeches: Math.round(5 * epidemic),
    soap: 3,
    wood: season === 3 ? 4 : 2,
    salve: 8,
    ironTools: 12,
  };
}

/* ------------------------------------------------------------------ *
 * The moneylender
 * ------------------------------------------------------------------ */

/** Loan size. Enough for several days' costs, not enough to coast on. */
export const LOAN_PRINCIPAL = 40;
/** Debt added per loan. The gap is the interest, taken up front. */
export const LOAN_DEBT = 55;

/**
 * Can the player still act at all?
 *
 * Opening the bathhouse requires the day's operating cost in coin. With no
 * coin the player cannot open, cannot earn, and — because travelling also
 * costs — could be stuck for good. Selling stock is the intended way out, but
 * a player with an empty store and an empty purse had none, which is a
 * softlock in a game with no fail state.
 */
export function isDestitute(state: GameState): boolean {
  return state.coin < dailyOperatingCost(state);
}

/**
 * Borrow from the Lombard.
 *
 * Italian moneylenders — Lombards and Cahorsins — operated across the Empire
 * in this period and lent at rates the Church condemned and the towns
 * tolerated. This is deliberately a bad deal: the debt exceeds the principal
 * immediately, `applyDebtCollection` in `pressure.ts` will come for it once it
 * passes `DEBT_CALL_IN`, and taking it costs a little standing, because
 * everyone knows who borrows from the Lombard.
 *
 * It exists to guarantee the player always has *a* move, not to be a good one.
 */
export function takeLoan(state: GameState): { coin: number; debt: number } {
  state.coin += LOAN_PRINCIPAL;
  state.debt = (state.debt ?? 0) + LOAN_DEBT;
  addHonour(state, -1.5, 'journal_loan_taken');
  addJournal(state, 'journal_loan', 'business', { n: LOAN_PRINCIPAL });
  return { coin: LOAN_PRINCIPAL, debt: LOAN_DEBT };
}
