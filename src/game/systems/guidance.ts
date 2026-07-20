/**
 * Contextual “what should I do next?” guidance for usability.
 */
import type { GameState } from '../types';
import { getLocalBath } from './property';
import { mentorsInCity } from '../data/mentors';
import { activeQuests, questGuideKey } from './story';
import { MAP_NODE_MAP } from '../data/map';

export interface NextStep {
  titleKey: string;
  bodyKey: string;
  /** Suggested hub action id for highlighting */
  action:
    | 'open'
    | 'travel'
    | 'market'
    | 'property'
    | 'masters'
    | 'study'
    | 'journal'
    | 'save'
    | 'story'
    | 'family'
    | 'politics'
    | 'none';
}

export function getNextStep(state: GameState): NextStep {
  // Early tutorial path
  if (!state.storyFlags['intro_done']) {
    return { titleKey: 'guide_title_story', bodyKey: 'guide_intro', action: 'story' };
  }

  if (state.totalTreated < 1) {
    return { titleKey: 'guide_title_work', bodyKey: 'guide_first_patient', action: 'open' };
  }

  if (state.totalTreated < 3 && state.day <= 2) {
    return { titleKey: 'guide_title_work', bodyKey: 'guide_keep_treating', action: 'open' };
  }

  if (state.coin < 8) {
    return { titleKey: 'guide_title_money', bodyKey: 'guide_need_coin', action: 'open' };
  }

  // Supplies low
  const inv = state.inventory;
  if (inv.linen < 2 || inv.soap < 2 || inv.wood < 2) {
    return { titleKey: 'guide_title_supplies', bodyKey: 'guide_buy_supplies', action: 'market' };
  }

  // No property yet — encourage stall after some treatments
  const props = state.properties ?? [];
  if (props.length === 0 && state.totalTreated >= 3) {
    if (state.locationId === 'road_camp' || state.locationId === 'small_village') {
      return { titleKey: 'guide_title_home', bodyKey: 'guide_buy_stall', action: 'property' };
    }
    return { titleKey: 'guide_title_travel', bodyKey: 'guide_go_village', action: 'travel' };
  }

  // License path for bath
  if (
    !state.storyFlags['bath_license'] &&
    !state.storyFlags[`license_${state.locationId}`] &&
    state.totalTreated >= 6 &&
    state.locationId !== 'nurnberg'
  ) {
    return { titleKey: 'guide_title_city', bodyKey: 'guide_go_nurnberg', action: 'travel' };
  }

  if (
    state.locationId === 'nurnberg' &&
    !state.storyFlags['bath_license'] &&
    state.totalTreated >= 6
  ) {
    return { titleKey: 'guide_title_license', bodyKey: 'guide_get_license', action: 'story' };
  }

  if (state.storyFlags['bath_license'] && !props.some((p) => p.kind === 'bathhouse')) {
    return { titleKey: 'guide_title_bath', bodyKey: 'guide_buy_bath', action: 'property' };
  }

  // Learn techniques
  const offers = mentorsInCity(state.locationId).filter(
    (o) => !state.unlockedTechniques.includes(o.techniqueId),
  );
  if (offers.length && state.coin >= (offers[0]?.cost ?? 99) && state.totalTreated >= 4) {
    return { titleKey: 'guide_title_learn', bodyKey: 'guide_seek_master', action: 'masters' };
  }

  // Horse care
  if (state.cart.horseHealth < 35) {
    return { titleKey: 'guide_title_horse', bodyKey: 'guide_rest_horse', action: 'study' };
  }

  // Active quest hint
  const q = activeQuests(state)[0];
  if (q) {
    return {
      titleKey: 'guide_title_quest',
      bodyKey: questGuideKey(q.id),
      action: q.id.includes('first') || q.id.includes('bath') ? 'travel' : 'open',
    };
  }

  // Default: earn and grow
  const local = getLocalBath(state);
  if (!local) {
    return { titleKey: 'guide_title_work', bodyKey: 'guide_open_or_travel', action: 'open' };
  }

  if (state.day % 3 === 0) {
    return { titleKey: 'guide_title_save', bodyKey: 'guide_remember_save', action: 'save' };
  }

  const node = MAP_NODE_MAP[state.locationId];
  if (node && node.marketDay === state.weekday) {
    return { titleKey: 'guide_title_market', bodyKey: 'guide_market_day', action: 'market' };
  }

  return { titleKey: 'guide_title_work', bodyKey: 'guide_daily_loop', action: 'open' };
}

/** Short help blurb for each major screen */
export function screenHelpKey(screen: string): string {
  return `help_${screen}`;
}
