import type { Act3ConsequenceId, GameState } from '../types';
import { addJournal } from './journal';

/**
 * Act 3 is a reckoning, not six more random errands. Each item is recorded
 * once in the save and reacts to something the player has already done.
 */
export function ensureAct3Consequences(state: GameState): void {
  if (!state.act3Consequences) state.act3Consequences = [];
}

function has(state: GameState, id: Act3ConsequenceId): boolean {
  ensureAct3Consequences(state);
  return state.act3Consequences!.includes(id);
}

function remember(state: GameState, id: Act3ConsequenceId, key: string): void {
  if (has(state, id)) return;
  state.act3Consequences!.push(id);
  addJournal(state, key, 'story');
}

/** Apply every consequence whose established condition is now true. */
export function resolveAct3Consequences(state: GameState): void {
  ensureAct3Consequences(state);
  if (state.act < 3) return;

  if (state.storyFlags['epidemic_done'] && !has(state, 'epidemic_memory')) {
    // A public record of service makes the next civic step less arbitrary.
    state.councilFavor += 2;
    state.repFolk = Math.min(100, (state.repFolk ?? 0) + 3);
    remember(state, 'epidemic_memory', 'journal_act3_epidemic_memory');
  }

  if (
    (state.storyFlags['rival_exposed'] || state.storyFlags['rival_truce'] || state.storyFlags['rival_mud']) &&
    !has(state, 'rival_reckoning')
  ) {
    if (state.storyFlags['rival_truce']) {
      state.guildFavor += 3;
      state.ethics = Math.min(100, state.ethics + 1);
    } else if (state.storyFlags['rival_mud']) {
      state.churchHeat += 2;
    } else {
      state.repFame = Math.min(100, (state.repFame ?? 0) + 2);
    }
    remember(state, 'rival_reckoning', 'journal_act3_rival_reckoning');
  }

  if (state.debt > 0 && !has(state, 'debt_shadow')) {
    state.prestige = Math.max(0, (state.prestige ?? 0) - 2);
    remember(state, 'debt_shadow', 'journal_act3_debt_shadow');
  }

  if (((state.lepraRight ?? 0) + (state.lepraWrong ?? 0)) > 0 && !has(state, 'lepra_reputation')) {
    if ((state.lepraRight ?? 0) >= (state.lepraWrong ?? 0)) {
      state.councilFavor += 2;
    } else {
      state.repElite = Math.max(0, (state.repElite ?? 0) - 2);
    }
    remember(state, 'lepra_reputation', 'journal_act3_lepra_reputation');
  }

  if ((state.staff?.length ?? 0) > 0 && !has(state, 'staff_compact')) {
    // One mature household event opens the rare story-gated birth assistance.
    state.staff[0]!.loyalty = Math.min(100, state.staff[0]!.loyalty + 4);
    state.storyFlags['midwife_referral'] = true;
    remember(state, 'staff_compact', 'journal_act3_staff_compact');
  }

  if (state.spouse && !has(state, 'family_network')) {
    state.spouse.affection = Math.min(100, state.spouse.affection + 3);
    state.storyFlags['family_network_open'] = true;
    remember(state, 'family_network', 'journal_act3_family_network');
  }
}
