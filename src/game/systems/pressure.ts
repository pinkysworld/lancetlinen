/**
 * Late-game pressure.
 *
 * A content audit found that from roughly day 12 nothing can go wrong: the
 * treatment success chance sits at its 0.96 clamp, `churchHeat` accumulates but
 * only nudges one decay roll, and `debt` accrues 2% interest that is never
 * called in. The last third of a run was clicking through patients you cannot
 * fail for money you do not need.
 *
 * This module is the counterweight. Both pressures scale with the player's own
 * choices rather than with the calendar, so a careful Bader is never punished
 * arbitrarily — and a reckless one is.
 */
import type { GameState } from '../types';
import { addJournal } from './journal';
import { pressureMult } from './settings';

/* ------------------------------------------------------------------ *
 * Church scrutiny
 * ------------------------------------------------------------------ */

export const CHURCH_NOTICE = 40;
export const CHURCH_INQUIRY = 65;
export const CHURCH_INTERDICT = 80;

export type ChurchStage = 'none' | 'noticed' | 'inquiry' | 'interdict';

export function churchStage(state: GameState): ChurchStage {
  const heat = state.churchHeat ?? 0;
  if (heat >= CHURCH_INTERDICT) return 'interdict';
  if (heat >= CHURCH_INQUIRY) return 'inquiry';
  if (heat >= CHURCH_NOTICE) return 'noticed';
  return 'none';
}

/**
 * How much church displeasure suppresses the day's custom.
 *
 * Under interdict the pious simply stop coming — which is most of the town.
 */
export function churchDemandPenalty(state: GameState): number {
  switch (churchStage(state)) {
    case 'interdict':
      return 5;
    case 'inquiry':
      return 2;
    case 'noticed':
      return 1;
    default:
      return 0;
  }
}

/**
 * Daily consequence of church displeasure.
 *
 * An inquiry levies a fine the player must actually feel; an interdict bleeds
 * elite standing until the heat is brought down (alms at the Politics screen).
 */
export function applyChurchPressure(state: GameState): void {
  const stage = churchStage(state);
  if (stage === 'none') return;

  if (stage === 'inquiry' && Math.random() < 0.25) {
    const fine = Math.max(8, Math.round(state.coin * 0.08 * pressureMult()));
    state.coin = Math.max(0, state.coin - fine);
    state.repElite = Math.max(0, state.repElite - 2);
    addJournal(state, 'journal_church_fine', 'politics', { n: fine });
  }

  if (stage === 'interdict') {
    state.repElite = Math.max(0, state.repElite - 3);
    state.repFolk = Math.max(0, state.repFolk - 1);
    if (Math.random() < 0.3) {
      addJournal(state, 'journal_church_interdict', 'politics');
    }
  }
}

/* ------------------------------------------------------------------ *
 * Debt
 * ------------------------------------------------------------------ */

/** Above this the lender stops waiting politely. */
export const DEBT_CALL_IN = 150;

export interface DebtSeizure {
  coin: number;
  /** Property id taken, if it came to that. */
  propertyId: string | null;
}

/**
 * The lender collects.
 *
 * Debt previously compounded forever with no consequence, so borrowing was free
 * money. Past `DEBT_CALL_IN` the lender takes what he can reach: coin first,
 * then — if the player is badly short — a property.
 *
 * Returns what was taken so the day summary can report it, or null if nothing
 * happened.
 */
export function applyDebtCollection(state: GameState): DebtSeizure | null {
  if ((state.debt ?? 0) <= DEBT_CALL_IN) return null;
  // One demand in four days on average, so the player has time to react.
  if (Math.random() > 0.25) return null;

  const demand = Math.max(20, Math.round(state.debt * 0.2 * pressureMult()));
  const taken = Math.min(state.coin, demand);
  state.coin -= taken;
  state.debt = Math.max(0, state.debt - taken);

  let propertyId: string | null = null;
  const shortfall = demand - taken;

  // Only seize property when coin could not cover a meaningful share — losing a
  // bathhouse should feel like a consequence, not a random tax.
  if (shortfall > demand * 0.5 && (state.properties?.length ?? 0) > 1) {
    // Take the least valuable holding, and never the one they are standing in.
    const candidates = state.properties
      .filter((p) => p.cityId !== state.locationId)
      .sort((a, b) => a.level - b.level);
    const seized = candidates[0];
    if (seized) {
      propertyId = seized.id;
      state.properties = state.properties.filter((p) => p.id !== seized.id);
      state.debt = Math.max(0, state.debt - 80);
      addJournal(state, 'journal_debt_seizure', 'business');
    }
  }

  if (taken > 0 && !propertyId) {
    addJournal(state, 'journal_debt_demand', 'business', { n: taken });
  }

  return { coin: taken, propertyId };
}
