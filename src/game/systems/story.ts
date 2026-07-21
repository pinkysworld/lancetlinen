import type { EndingId, GameState } from '../types';
import { DIALOGUE_MAP, type DialogueChoice, type DialogueNode, QUESTS } from '../data/story';
import { TECHNIQUE_MAP } from '../data/techniques';
import { addJournal } from './journal';
import { honour, OFFICE_HONOUR_REQUIRED } from './honour';

export function getDialogue(id: string): DialogueNode | undefined {
  return DIALOGUE_MAP[id];
}

export function applyChoice(state: GameState, choice: DialogueChoice): string | null {
  if (choice.effects) {
    for (const [k, v] of Object.entries(choice.effects)) {
      if (k === 'coin' && typeof v === 'number') state.coin = Math.max(0, state.coin + v);
      else if (k === 'debt' && typeof v === 'number') state.debt += v;
      else if (k === 'ethics' && typeof v === 'number')
        state.ethics = Math.max(0, Math.min(100, state.ethics + v));
      else if (k === 'guildFavor' && typeof v === 'number') state.guildFavor += v;
      else if (k === 'churchHeat' && typeof v === 'number')
        state.churchHeat = Math.max(0, state.churchHeat + v);
      else if (k === 'councilFavor' && typeof v === 'number') state.councilFavor += v;
      else if (k === 'tutorialStep' && typeof v === 'number') state.tutorialStep = v;
    }
  }
  if (choice.setFlag) {
    state.storyFlags[choice.setFlag] = true;
    if (choice.setFlag === 'rival_war') state.rivalActive = true;
    // The aftermath dialogues fire "days later", which needs a day to count
    // from — the outcome flags alone carry no time.
    if (
      choice.setFlag === 'rival_exposed' ||
      choice.setFlag === 'rival_truce' ||
      choice.setFlag === 'rival_mud'
    ) {
      state.storyFlags['rival_outcome_day'] = state.day;
    }
    // Closing the exposed rival's aftermath is also his departure: the
    // rivalry ends with him. Keyed to the flag the interrupt checks, so a
    // single setFlag both silences the interrupt and retires the rival.
    if (choice.setFlag === 'krafft_after_done' && state.storyFlags['rival_exposed']) {
      state.rivalActive = false;
    }
    if (choice.setFlag === 'epidemic_fighting' || choice.setFlag === 'epidemic_hid') {
      state.epidemicActive = true;
    }
    if (
      choice.setFlag === 'path_bath' ||
      choice.setFlag === 'path_council' ||
      choice.setFlag === 'path_wander'
    ) {
      resolveEnding(state);
    }
    // Only journal flags that have dedicated copy (avoid missing-string spam)
    const journalFlags = new Set([
      'has_cart',
      'intro_done',
      'in_nurnberg',
      'bath_license',
      'rival_war',
      'epidemic_fighting',
      'path_bath',
      'path_council',
      'path_wander',
    ]);
    if (journalFlags.has(choice.setFlag)) {
      addJournal(state, `journal_flag_${choice.setFlag}`, 'story');
    }
  }
  if (choice.unlockTechnique) {
    if (!state.unlockedTechniques.includes(choice.unlockTechnique)) {
      state.unlockedTechniques.push(choice.unlockTechnique);
    }
  }
  if (choice.questAdvance) {
    advanceQuest(state, choice.questAdvance);
  }
  return choice.next ?? null;
}

export function advanceQuest(state: GameState, questId: string): void {
  let q = state.quests.find((x) => x.id === questId);
  if (!q) {
    q = { id: questId, stage: 0, completed: false, failed: false };
    state.quests.push(q);
  }
  const def = QUESTS.find((x) => x.id === questId);
  q.stage += 1;
  if (def && q.stage >= def.stages) {
    q.completed = true;
    onQuestComplete(state, questId);
  }
}

function onQuestComplete(state: GameState, questId: string): void {
  if (questId === 'prologue') {
    state.storyFlags['prologue_done'] = true;
    ensureQuest(state, 'first_city');
    addJournal(state, 'journal_quest_prologue', 'story');
  }
  if (questId === 'first_city') {
    ensureQuest(state, 'bath_rights');
    state.act = 2;
  }
  if (questId === 'bath_rights') {
    ensureQuest(state, 'rival_krafft');
    ensureQuest(state, 'family_line');
    ensureQuest(state, 'politics');
    state.rivalActive = true;
  }
  if (questId === 'rival_krafft') {
    ensureQuest(state, 'epidemic');
  }
  if (questId === 'epidemic') {
    state.epidemicActive = false;
    state.storyFlags['epidemic_done'] = true;
    state.act = 3;
    ensureQuest(state, 'war_contract');
    ensureQuest(state, 'meister');
  }
  if (questId === 'meister') {
    resolveEnding(state);
  }
  if (questId === 'war_contract') {
    state.storyFlags['war_done'] = true;
    if (!state.unlockedTechniques.includes('battlefield_pack')) {
      state.unlockedTechniques.push('battlefield_pack');
    }
  }
  if (questId === 'family_line') {
    state.storyFlags['family_quest_done'] = true;
  }
  if (questId === 'politics') {
    state.storyFlags['politics_quest_done'] = true;
  }
}

function ensureQuest(state: GameState, id: string): void {
  if (!state.quests.find((q) => q.id === id)) {
    state.quests.push({ id, stage: 0, completed: false, failed: false });
  }
}

/**
 * Which life the Bader ended up living.
 *
 * The player's `path_*` choice at the master's examination is a statement of
 * intent — but honour has to back it up. Previously all three "success"
 * endings were a single three-way button press with no requirements, so they
 * were interchangeable paragraphs rather than outcomes.
 *
 * The endings now sit on the tension the whole game is about:
 *
 *   council_surgeon  — they accepted you. Needs real honour.
 *   master_bath      — rich, and still unehrlich. Needs a great house.
 *   wandering_healer — the road. Where you land if the town never took you.
 *   dynasty          — the narrow path: honour, means, and a child to inherit.
 */
export function resolveEnding(state: GameState): EndingId {
  // Collapse: bankrupt, amoral, a butcher, or run out of standing entirely.
  if (
    state.coin < 0 ||
    state.ethics < 15 ||
    state.deathsOnHands > 12 ||
    honour(state) < 12
  ) {
    state.ending = 'ruined';
    return 'ruined';
  }

  const h = honour(state);
  const wealthy = state.bathhouse.level >= 2 || (state.properties?.length ?? 0) >= 2;
  const settled = !!state.spouse;

  // The narrow path — everything at once, and an heir to carry the name.
  if (settled && state.heir && h >= OFFICE_HONOUR_REQUIRED && wealthy) {
    state.ending = 'dynasty';
    state.guildRank = 'master';
    state.freePlay = true;
    return 'dynasty';
  }

  const wants = state.storyFlags['path_council']
    ? 'council'
    : state.storyFlags['path_bath']
      ? 'bath'
      : state.storyFlags['path_wander']
        ? 'wander'
        : null;

  // A seat needs honour the trade rarely earns. Wanting it is not enough.
  if (wants === 'council' && h >= OFFICE_HONOUR_REQUIRED) {
    state.ending = 'council_surgeon';
    state.guildRank = 'master';
  } else if (wants === 'bath' && wealthy) {
    state.ending = 'master_bath';
    state.guildRank = 'master';
  } else if (wants === 'wander') {
    state.ending = 'wandering_healer';
  } else if (h >= OFFICE_HONOUR_REQUIRED && state.councilFavor >= 20) {
    // No stated path: let the life speak for itself.
    state.ending = 'council_surgeon';
    state.guildRank = 'master';
  } else if (wealthy) {
    state.ending = 'master_bath';
    state.guildRank = 'master';
  } else {
    // Reached for a seat without the standing, or never settled at all.
    state.ending = 'wandering_healer';
  }

  state.freePlay = true;
  return state.ending;
}

export function pendingStoryDialogue(state: GameState): string | null {
  if (!state.storyFlags['intro_done'] && !state.storyFlags['intro_started']) {
    return 'intro_1';
  }
  /*
   * Krafft's aftermath. The rivalry had three endings and every one of them
   * simply stopped — the flag was set and the man vanished mid-sentence.
   * Days later he gets a last word, one per outcome: the exposed man leaves,
   * the reconciled one sends a patient, the slanderer needles on.
   */
  const rivalOutcomeDay = Number(state.storyFlags['rival_outcome_day'] ?? 0);
  if (rivalOutcomeDay && state.day >= rivalOutcomeDay + 3 && !state.storyFlags['krafft_after_done']) {
    if (state.storyFlags['rival_exposed']) return 'krafft_after_exposed';
    if (state.storyFlags['rival_truce']) return 'krafft_after_truce';
    if (state.storyFlags['rival_mud']) return 'krafft_after_mud';
  }
  if (
    state.locationId === 'small_village' &&
    state.storyFlags['intro_done'] &&
    !state.storyFlags['adelheid_friend'] &&
    !state.storyFlags['adelheid_known'] &&
    !state.storyFlags['adelheid_cold'] &&
    state.totalTreated >= 2
  ) {
    return 'adelheid_meet';
  }
  if (state.locationId === 'nurnberg' && !state.storyFlags['in_nurnberg']) {
    return 'nurnberg_gate';
  }
  if (
    state.locationId === 'nurnberg' &&
    state.storyFlags['in_nurnberg'] &&
    !state.storyFlags['bath_license'] &&
    state.totalTreated >= 8 &&
    state.coin >= 40
  ) {
    return 'ortlieb_license';
  }
  if (
    (state.bathhouse.owned || state.properties?.some((p) => p.kind === 'bathhouse')) &&
    !state.storyFlags['rival_war'] &&
    !state.storyFlags['rival_truce'] &&
    state.totalTreated >= 15
  ) {
    return 'krafft_threat';
  }
  if (
    state.storyFlags['rival_war'] &&
    !state.storyFlags['rival_exposed'] &&
    !state.storyFlags['rival_mud'] &&
    state.totalTreated >= 22 &&
    state.locationId === 'nurnberg'
  ) {
    return 'krafft_escalate';
  }
  if (state.storyFlags['epidemic_pending_dialogue']) {
    return 'epidemic_start';
  }
  if (
    (state.storyFlags['adelheid_friend'] || state.storyFlags['adelheid_known']) &&
    !state.storyFlags['adelheid_ally'] &&
    !state.storyFlags['adelheid_distant'] &&
    state.totalTreated >= 18 &&
    (state.locationId === 'nurnberg' || state.locationId === 'small_village')
  ) {
    return 'adelheid_return';
  }
  if (
    state.act >= 2 &&
    state.totalTreated >= 20 &&
    !state.storyFlags['open_to_courtship'] &&
    !state.storyFlags['refuse_match'] &&
    state.locationId === 'nurnberg'
  ) {
    return 'family_matchmaker';
  }
  if (
    state.act >= 2 &&
    state.councilFavor >= 10 &&
    !state.storyFlags['politics_path'] &&
    !state.storyFlags['craft_path'] &&
    state.locationId === 'nurnberg'
  ) {
    return 'council_offer';
  }
  if (state.heir && !state.storyFlags['heir_blessed'] && state.locationId === 'monastery_ebrach') {
    return 'heir_blessing';
  }
  if (
    state.act >= 3 &&
    !state.storyFlags['war_contract'] &&
    !state.storyFlags['war_refused'] &&
    state.locationId === 'augsburg'
  ) {
    return 'war_offer';
  }
  if (
    state.act >= 3 &&
    state.bathhouse.level >= 2 &&
    state.totalTreated >= 35 &&
    !state.storyFlags['path_bath'] &&
    !state.storyFlags['path_council'] &&
    !state.storyFlags['path_wander'] &&
    !state.ending
  ) {
    return 'meister_exam';
  }
  if (
    state.churchHeat >= 20 &&
    !state.storyFlags['gregor_warned'] &&
    state.locationId === 'nurnberg'
  ) {
    state.storyFlags['gregor_warned'] = true;
    return 'gregor_warning';
  }
  return null;
}

export function learnTechniqueFromBook(state: GameState, id: string): boolean {
  const tech = TECHNIQUE_MAP[id];
  if (!tech || state.unlockedTechniques.includes(id)) return false;
  if (state.coin < tech.unlockCost) return false;
  state.coin -= tech.unlockCost;
  state.unlockedTechniques.push(id);
  return true;
}

/**
 * Close out any quest whose goal has actually been met.
 *
 * Quests could previously only be completed by picking a dialogue choice that
 * carried `questAdvance`. Everything the player did in the world — buying the
 * bath right, walking through Nürnberg's gates, settling with Krafft — left
 * the task sitting on the hub strip, so the list of things still to do slowly
 * filled up with things already done. Reported from play.
 *
 * Idempotent, so it is safe to call from the day tick and from the hub. The
 * quest chain still runs through `onQuestComplete`, which is why this marks
 * the quest rather than merely hiding it: completing `bath_rights` is what
 * opens the rival, family and politics threads.
 */
export function syncQuests(state: GameState): boolean {
  let changed = false;
  // Guarded loop: `onQuestComplete` can push new quests, and one of those may
  // itself already be satisfied. Bounded so a mistaken predicate pair cannot
  // spin forever.
  for (let pass = 0; pass < 4; pass++) {
    let passChanged = false;
    for (const q of [...state.quests]) {
      if (q.completed || q.failed) continue;
      const def = QUESTS.find((d) => d.id === q.id);
      if (!def?.done?.(state)) continue;
      q.completed = true;
      q.stage = Math.max(q.stage, def.stages);
      onQuestComplete(state, q.id);
      passChanged = true;
      changed = true;
    }
    if (!passChanged) break;
  }
  return changed;
}

export function activeQuests(state: GameState) {
  return state.quests.filter((q) => !q.completed && !q.failed);
}

/** Map quest id → i18n key (titleKey uses quest.x while UI used quest_${id}) */
export function questTitleKey(questId: string): string {
  const def = QUESTS.find((q) => q.id === questId);
  if (def?.titleKey) return def.titleKey.replace(/\./g, '_');
  return `quest_${questId}`;
}

export function questGuideKey(questId: string): string {
  // guidance strings use short names matching titleKey suffix
  const def = QUESTS.find((q) => q.id === questId);
  if (def?.titleKey?.startsWith('quest.')) {
    return `guide_quest_${def.titleKey.slice(6)}`;
  }
  return `guide_quest_${questId}`;
}

export function tutorialTipKey(state: GameState): string | null {
  if (!state.settings?.showTutorialTips) return null;
  switch (state.tutorialStep) {
    case 0:
    case 1:
      return 'tutorial_tip_open';
    case 2:
      return 'tutorial_tip_travel';
    case 3:
      return 'tutorial_tip_property';
    case 4:
      return 'tutorial_tip_masters';
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ *
 * The epilogue
 * ------------------------------------------------------------------ */

/**
 * How the town remembers you.
 *
 * The five endings each had one sentence, identical for every run that
 * reached them — the game counts a great deal by now (alms, verdicts, deaths,
 * the rival, the marriage, the plague) and the epilogue read none of it.
 *
 * Each line is chosen from a real counter, so two players with the same
 * ending read different last pages. Order is roughly: how you practised, how
 * you judged, whom you fought, whom you kept. Capped in the scene, not here —
 * the scene knows how much room it has.
 */
export function epilogueLines(state: GameState): string[] {
  const lines: string[] = [];

  // The dead do not go unmentioned, and neither does a clean record.
  if (state.deathsOnHands === 0 && state.totalTreated >= 20) {
    lines.push('epilogue_no_deaths');
  } else if (state.deathsOnHands >= 6) {
    lines.push('epilogue_many_deaths');
  }

  if ((state.almsGiven ?? 0) >= 5) lines.push('epilogue_alms');

  const saves = Number(state.storyFlags['epidemic_saves'] ?? 0);
  if (saves >= 3) lines.push('epilogue_plague_service');

  if ((state.lepraRight ?? 0) >= 2 && (state.lepraWrong ?? 0) === 0) {
    lines.push('epilogue_lepra_sound');
  } else if ((state.lepraWrong ?? 0) >= 2) {
    lines.push('epilogue_lepra_doubted');
  }

  if (state.storyFlags['rival_exposed']) lines.push('epilogue_rival_exposed');
  else if (state.storyFlags['rival_truce']) lines.push('epilogue_rival_truce');
  else if (state.storyFlags['rival_mud']) lines.push('epilogue_rival_mud');

  if (state.spouse && state.heir) lines.push('epilogue_family_line');
  else if (state.spouse) lines.push('epilogue_married');

  if (honour(state) >= 70) lines.push('epilogue_honour_high');
  else if (honour(state) < 25) lines.push('epilogue_honour_low');

  return lines;
}
