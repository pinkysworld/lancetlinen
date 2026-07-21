/**
 * Structured scenarios — multi-choice set pieces with art + stakes.
 * Distinct from random street events: rare, memorable, reputation-heavy.
 *
 * Historical anchors (HRE Bader culture):
 * - House calls for elite patients (discretion vs fame)
 * - Plague triage ethics
 * - Festival / fair contracts
 * - Guild inspection & dues
 * - Battlefield surgery
 * - Charity queues (piety + marketing)
 * - Brautbad (wedding bath) — classic Badestube income
 * - Church scrutiny of cutting & letting practices
 * - Rival smear (trade reputation wars)
 * - Road courier rescue (fame on the imperial roads)
 */
import type { GameState } from '../types';
import { addFacetRep, applyCharityRep, applyScandalRep } from './reputation';
import { addHonour } from './honour';
import { addJournal } from './journal';

export interface ScenarioChoice {
  textKey: string;
  effects?: {
    coin?: number;
    ethics?: number;
    folk?: number;
    elite?: number;
    fame?: number;
    local?: number;
    guildFavor?: number;
    churchHeat?: number;
    councilFavor?: number;
    unlockTechnique?: string;
  };
  setFlag?: string;
  /** Special post-effects */
  special?:
    | 'charity'
    | 'scandal_mild'
    | 'scandal_harsh'
    | 'lepra_second_look'
    | 'lepra_quiet_word'
    | 'lepra_look_away';
}

export interface ScenarioDef {
  id: string;
  titleKey: string;
  bodyKey: string;
  bgKey: string; // texture key
  minTreated: number;
  minAct?: number;
  once?: boolean;
  requireFlag?: string;
  blockFlag?: string;
  requireRival?: boolean;
  locationIds?: string[];
  choices: ScenarioChoice[];
}

export const SCENARIOS: ScenarioDef[] = [
  {
    id: 'noble_house_call',
    titleKey: 'scenario_noble_title',
    bodyKey: 'scenario_noble_body',
    bgKey: 'bg_noble_house',
    minTreated: 14,
    minAct: 2,
    once: true,
    locationIds: ['nurnberg', 'augsburg', 'bamberg', 'wurzburg'],
    choices: [
      {
        textKey: 'scenario_noble_discreet',
        effects: { coin: 80, elite: 8, fame: 2, local: 3, ethics: 2 },
        setFlag: 'noble_house_done',
      },
      {
        textKey: 'scenario_noble_public',
        effects: { coin: 40, elite: 3, fame: 6, folk: -2, local: 2 },
        setFlag: 'noble_house_done',
      },
      {
        textKey: 'scenario_noble_refuse',
        effects: { elite: -5, ethics: -1 },
        setFlag: 'noble_house_done',
      },
    ],
  },
  {
    id: 'plague_night',
    titleKey: 'scenario_plague_title',
    bodyKey: 'scenario_plague_body',
    bgKey: 'bg_plague',
    minTreated: 28,
    minAct: 2,
    once: true,
    requireFlag: 'epidemic_fighting',
    choices: [
      {
        textKey: 'scenario_plague_triage',
        effects: {
          ethics: 12,
          folk: 10,
          fame: 5,
          local: 6,
          coin: -20,
          unlockTechnique: 'hygiene_clean',
        },
        setFlag: 'plague_night_done',
      },
      {
        textKey: 'scenario_plague_rich_only',
        effects: { coin: 50, elite: 5, folk: -12, ethics: -10, local: -4 },
        setFlag: 'plague_night_done',
      },
      {
        textKey: 'scenario_plague_flee',
        effects: { ethics: -8, folk: -5, fame: -3, local: -6 },
        setFlag: 'plague_night_done',
      },
    ],
  },
  {
    id: 'festival_contract',
    titleKey: 'scenario_fest_title',
    bodyKey: 'scenario_fest_body',
    bgKey: 'bg_festival',
    minTreated: 8,
    once: false,
    choices: [
      {
        textKey: 'scenario_fest_accept',
        effects: { coin: 35, folk: 4, fame: 2, local: 3 },
        setFlag: 'festival_contract_recent',
      },
      {
        textKey: 'scenario_fest_premium',
        effects: { coin: 60, elite: 3, folk: -1, local: 2 },
        setFlag: 'festival_contract_recent',
      },
      {
        textKey: 'scenario_fest_decline',
        effects: { folk: -2 },
        setFlag: 'festival_contract_recent',
      },
    ],
  },
  {
    id: 'guild_inspection',
    titleKey: 'scenario_guild_title',
    bodyKey: 'scenario_guild_body',
    bgKey: 'bg_guild',
    minTreated: 22,
    minAct: 2,
    once: true,
    locationIds: ['nurnberg', 'augsburg', 'rothenburg'],
    choices: [
      {
        textKey: 'scenario_guild_honest',
        effects: { coin: -25, guildFavor: 15, ethics: 5, fame: 1, local: 2 },
        setFlag: 'guild_inspection_done',
      },
      {
        textKey: 'scenario_guild_bribe',
        effects: { coin: -50, guildFavor: 8, ethics: -6, elite: 1 },
        setFlag: 'guild_inspection_done',
      },
      {
        textKey: 'scenario_guild_defy',
        effects: { guildFavor: -12, fame: 3, ethics: 2, churchHeat: 3 },
        setFlag: 'guild_inspection_done',
      },
    ],
  },
  {
    id: 'battlefield_day',
    titleKey: 'scenario_battle_title',
    bodyKey: 'scenario_battle_body',
    bgKey: 'bg_warcamp',
    minTreated: 24,
    minAct: 3,
    once: true,
    locationIds: ['war_camp'],
    requireFlag: 'war_contract',
    choices: [
      {
        textKey: 'scenario_battle_field',
        effects: {
          coin: 70,
          fame: 8,
          folk: 3,
          ethics: 4,
          unlockTechnique: 'battlefield_pack',
        },
        setFlag: 'battlefield_day_done',
      },
      {
        textKey: 'scenario_battle_officers',
        effects: { coin: 100, elite: 6, fame: 3, folk: -2 },
        setFlag: 'battlefield_day_done',
      },
    ],
  },
  {
    id: 'charity_queue',
    titleKey: 'scenario_charity_title',
    bodyKey: 'scenario_charity_body',
    bgKey: 'bg_market',
    minTreated: 5,
    once: false,
    choices: [
      {
        textKey: 'scenario_charity_free',
        effects: { coin: -10, ethics: 8, folk: 6, fame: 1, local: 2 },
        setFlag: 'charity_recent',
        special: 'charity',
      },
      {
        textKey: 'scenario_charity_half',
        effects: { coin: 5, ethics: 3, folk: 3, local: 1 },
        setFlag: 'charity_recent',
      },
      {
        textKey: 'scenario_charity_send',
        effects: { ethics: -4, folk: -5, local: -2 },
        setFlag: 'charity_recent',
      },
    ],
  },
  // ── New historically grounded scenarios ──────────────────────────
  {
    id: 'wedding_bath',
    titleKey: 'scenario_wedding_title',
    bodyKey: 'scenario_wedding_body',
    bgKey: 'bg_wedding',
    minTreated: 6,
    once: false,
    locationIds: ['nurnberg', 'augsburg', 'bamberg', 'wurzburg', 'rothenburg'],
    choices: [
      {
        textKey: 'scenario_wedding_full',
        effects: { coin: 55, folk: 3, elite: 4, fame: 2, local: 3 },
        setFlag: 'wedding_bath_recent',
      },
      {
        textKey: 'scenario_wedding_modest',
        effects: { coin: 25, folk: 5, ethics: 2, local: 2 },
        setFlag: 'wedding_bath_recent',
      },
      {
        textKey: 'scenario_wedding_refuse',
        effects: { folk: -3, elite: -2, local: -1 },
        setFlag: 'wedding_bath_recent',
      },
    ],
  },
  {
    id: 'church_scrutiny',
    titleKey: 'scenario_church_title',
    bodyKey: 'scenario_church_body',
    bgKey: 'bg_church',
    minTreated: 26,
    minAct: 2,
    once: true,
    locationIds: ['nurnberg', 'bamberg', 'wurzburg', 'monastery_ebrach'],
    choices: [
      {
        textKey: 'scenario_church_humble',
        effects: { coin: -15, ethics: 6, churchHeat: -15, elite: 2, folk: 2 },
        setFlag: 'church_scrutiny_done',
      },
      {
        textKey: 'scenario_church_learned',
        effects: { fame: 4, elite: 3, churchHeat: -5, ethics: 2 },
        setFlag: 'church_scrutiny_done',
      },
      {
        textKey: 'scenario_church_defiant',
        effects: { churchHeat: 12, fame: 2, ethics: -3, elite: -4, folk: 1 },
        setFlag: 'church_scrutiny_done',
      },
    ],
  },
  {
    id: 'rival_smear',
    titleKey: 'scenario_rival_title',
    bodyKey: 'scenario_rival_body',
    bgKey: 'bg_rival',
    minTreated: 16,
    once: false,
    requireRival: true,
    choices: [
      {
        textKey: 'scenario_rival_expose',
        effects: { coin: -20, ethics: 3, folk: 4, fame: 2, local: 3 },
        setFlag: 'rival_smear_recent',
      },
      {
        textKey: 'scenario_rival_ignore',
        effects: { folk: -3, local: -2 },
        setFlag: 'rival_smear_recent',
        special: 'scandal_mild',
      },
      {
        textKey: 'scenario_rival_mud',
        effects: { coin: -10, ethics: -8, elite: -2, folk: 1, fame: -1 },
        setFlag: 'rival_smear_recent',
      },
    ],
  },
  {
    id: 'road_courier',
    titleKey: 'scenario_road_title',
    bodyKey: 'scenario_road_body',
    bgKey: 'bg_road',
    minTreated: 11,
    once: true,
    minAct: 2,
    locationIds: ['road_camp', 'small_village', 'rothenburg'],
    choices: [
      {
        textKey: 'scenario_road_save',
        effects: {
          coin: 40,
          fame: 7,
          elite: 5,
          ethics: 4,
          councilFavor: 8,
          unlockTechnique: 'wound_dress',
        },
        setFlag: 'road_courier_done',
      },
      {
        textKey: 'scenario_road_loot',
        effects: { coin: 90, ethics: -12, elite: -6, fame: -3, churchHeat: 5 },
        setFlag: 'road_courier_done',
      },
      {
        textKey: 'scenario_road_pass',
        effects: { ethics: -2 },
        setFlag: 'road_courier_done',
      },
    ],
  },
  {
    id: 'apprentice_exam',
    titleKey: 'scenario_exam_title',
    bodyKey: 'scenario_exam_body',
    bgKey: 'bg_guild',
    minTreated: 30,
    minAct: 2,
    once: true,
    locationIds: ['nurnberg', 'augsburg'],
    choices: [
      {
        textKey: 'scenario_exam_fair',
        effects: { guildFavor: 10, ethics: 5, fame: 2, folk: 2, local: 2 },
        setFlag: 'apprentice_exam_done',
      },
      {
        textKey: 'scenario_exam_harsh',
        effects: { guildFavor: 6, elite: 2, folk: -3, ethics: -2 },
        setFlag: 'apprentice_exam_done',
      },
      {
        textKey: 'scenario_exam_favor',
        effects: { coin: 30, guildFavor: -5, ethics: -6, elite: 1 },
        setFlag: 'apprentice_exam_done',
      },
    ],
  },
  {
    /*
     * The man you cleared comes back.
     *
     * `resolveLepraschau` counts a missed case in `lepra_missed` and promised
     * — in a comment — that it comes back. For a day, nothing read the
     * counter: the exact "written but never reached" defect this project
     * keeps producing, caught by grep the morning after it was written.
     *
     * Weeks later the man stands in the lane again, visibly worse, and the
     * neighbours who denounced him the first time are watching you. All
     * three ways out are period-true, and none is clean.
     */
    id: 'lepra_return',
    titleKey: 'scenario_lepra_return_title',
    bodyKey: 'scenario_lepra_return_body',
    bgKey: 'bg_lazar',
    minTreated: 10,
    requireFlag: 'lepra_missed',
    choices: [
      {
        // Call the council and judge him again: the error is repaired and
        // publicly owned. The council values the correction more than it
        // minds the mistake; the town hears you were wrong.
        textKey: 'scenario_lepra_second_look',
        effects: { councilFavor: 3, local: -1 },
        special: 'lepra_second_look',
      },
      {
        // A quiet word, no council: you walk him to the lazar house yourself.
        // Decent, and entirely outside your authority.
        textKey: 'scenario_lepra_quiet_word',
        effects: { churchHeat: 4, folk: 1 },
        special: 'lepra_quiet_word',
      },
      {
        // Look away. The counter stays; the second time, the town starts
        // saying aloud who declared him clean.
        textKey: 'scenario_lepra_look_away',
        effects: {},
        special: 'lepra_look_away',
      },
    ],
  },
];


export function pendingScenario(state: GameState): ScenarioDef | null {
  const day = state.day;
  // Throttle one scenario per day
  if (state.storyFlags['scenario_day'] === day) return null;
  if (state.totalTreated < 3) return null;

  // Weighted shuffle-ish: prefer unique once-scenarios when eligible
  const candidates: ScenarioDef[] = [];

  for (const sc of SCENARIOS) {
    if (sc.once && state.storyFlags[`${sc.id}_done`]) continue;
    if (sc.blockFlag && state.storyFlags[sc.blockFlag]) continue;
    if (sc.requireFlag && !state.storyFlags[sc.requireFlag]) continue;
    if (sc.requireRival && !state.rivalActive) continue;
    if (sc.minTreated && state.totalTreated < sc.minTreated) continue;
    if (sc.minAct && state.act < sc.minAct) continue;
    if (sc.locationIds && !sc.locationIds.includes(state.locationId)) continue;

    // Recurring scenarios: day cooldowns
    if (sc.id === 'festival_contract') {
      if (!(state.festivalActive || state.weekday === 1 || state.weekday === 3)) continue;
      if (state.storyFlags['festival_contract_recent'] === day) continue;
      if (Math.random() < 0.35) candidates.push(sc);
      continue;
    }
    if (sc.id === 'charity_queue') {
      if (state.storyFlags['charity_recent'] === day) continue;
      if (state.repFolk !== undefined && state.repFolk > 70 && Math.random() < 0.12) {
        // high folk: fewer desperate queues
      } else if (Math.random() < 0.2) {
        candidates.push(sc);
      }
      continue;
    }
    if (sc.id === 'wedding_bath') {
      if (state.storyFlags['wedding_bath_recent'] === day) continue;
      // more common on market/wedding-ish weekdays
      if (state.weekday === 0 || state.weekday === 5 || state.weekday === 6) {
        if (Math.random() < 0.28) candidates.push(sc);
      } else if (Math.random() < 0.1) {
        candidates.push(sc);
      }
      continue;
    }
    if (sc.id === 'lepra_return') {
      // Not the very next morning — the man needs time to worsen — and not
      // guaranteed, so it lands as a consequence rather than a scheduled tax.
      if (state.storyFlags['lepra_return_recent'] === day) continue;
      if (Number(state.storyFlags['lepra_recent'] ?? 0) >= day - 2) continue;
      if (Math.random() < 0.3) candidates.push(sc);
      continue;
    }
    if (sc.id === 'rival_smear') {
      if (state.storyFlags['rival_smear_recent'] === day) continue;
      if (Math.random() < 0.25) candidates.push(sc);
      continue;
    }

    // one-shot scenarios
    if (sc.once && Math.random() < 0.42) candidates.push(sc);
  }

  if (!candidates.length) return null;
  return candidates[Math.floor(Math.random() * candidates.length)]!;
}

export interface ScenarioOutcome {
  effectLines: string[];
  unlocked?: string;
}

export function applyScenarioChoice(
  state: GameState,
  scenarioId: string,
  choiceIndex: number,
): ScenarioOutcome {
  const sc = SCENARIOS.find((s) => s.id === scenarioId);
  if (!sc) return { effectLines: [] };
  const choice = sc.choices[choiceIndex];
  if (!choice) return { effectLines: [] };

  const e = choice.effects ?? {};
  if (e.coin) state.coin = Math.max(0, state.coin + e.coin);
  if (e.ethics) state.ethics = Math.max(0, Math.min(100, state.ethics + e.ethics));
  if (e.guildFavor) state.guildFavor += e.guildFavor;
  if (e.churchHeat) state.churchHeat = Math.max(0, state.churchHeat + e.churchHeat);
  if (e.councilFavor) state.councilFavor += e.councilFavor;
  let unlocked: string | undefined;
  if (e.unlockTechnique && !state.unlockedTechniques.includes(e.unlockTechnique)) {
    state.unlockedTechniques.push(e.unlockTechnique);
    unlocked = e.unlockTechnique;
  }
  addFacetRep(state, {
    folk: e.folk,
    elite: e.elite,
    fame: e.fame,
    local: e.local,
  });

  if (choice.special === 'charity') applyCharityRep(state);
  if (choice.special === 'lepra_second_look') {
    // The judgement is corrected and the correction is yours to own.
    state.storyFlags['lepra_missed'] = Math.max(0, Number(state.storyFlags['lepra_missed'] ?? 1) - 1);
    addHonour(state, -1);
  }
  if (choice.special === 'lepra_quiet_word') {
    state.storyFlags['lepra_missed'] = Math.max(0, Number(state.storyFlags['lepra_missed'] ?? 1) - 1);
    addHonour(state, 1);
  }
  if (choice.special === 'lepra_look_away') {
    // The counter stays. The second refusal is the one the town talks about.
    if (state.storyFlags['lepra_looked_away']) {
      addFacetRep(state, { folk: -6, local: -3 });
      addJournal(state, 'journal_lepra_town_knows', 'politics');
    }
    state.storyFlags['lepra_looked_away'] = true;
  }
  if (choice.special === 'scandal_mild') applyScandalRep(state, 'mild');
  if (choice.special === 'scandal_harsh') applyScandalRep(state, 'harsh');

  if (choice.setFlag) {
    if (choice.setFlag.endsWith('_recent')) {
      state.storyFlags[choice.setFlag] = state.day;
    } else {
      state.storyFlags[choice.setFlag] = true;
    }
  }
  if (sc.once) state.storyFlags[`${sc.id}_done`] = true;
  state.storyFlags['scenario_day'] = state.day;
  addJournal(state, `journal_scenario_${scenarioId}`, 'story');

  const effectLines = formatEffectLines(e);
  if (unlocked) effectLines.push(`unlock:${unlocked}`);
  return { effectLines, unlocked };
}

function formatEffectLines(e: NonNullable<ScenarioChoice['effects']>): string[] {
  const lines: string[] = [];
  const push = (k: string, v: number | undefined) => {
    if (v === undefined || v === 0) return;
    lines.push(`${k}:${v > 0 ? '+' : ''}${typeof v === 'number' && !Number.isInteger(v) ? Math.round(v) : v}`);
  };
  push('coin', e.coin);
  push('folk', e.folk);
  push('elite', e.elite);
  push('fame', e.fame);
  push('local', e.local);
  push('ethics', e.ethics);
  push('guild', e.guildFavor);
  push('church', e.churchHeat);
  push('council', e.councilFavor);
  return lines;
}

export function getScenario(id: string): ScenarioDef | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
