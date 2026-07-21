import type { GameState } from '../types';
export interface DialogueChoice {
  textKey: string;
  next?: string;
  effects?: Record<string, number | boolean | string>;
  setFlag?: string;
  unlockTechnique?: string;
  questAdvance?: string;
}

export interface DialogueNode {
  id: string;
  speakerKey: string;
  textKey: string;
  choices: DialogueChoice[];
}

export interface QuestDef {
  id: string;
  act: number;
  titleKey: string;
  stages: number;
  autoStart?: boolean;
  /**
   * True once the goal is achieved *in the world*, whatever the dialogue did.
   *
   * A quest used to complete only when a dialogue choice carrying
   * `questAdvance` was picked, so "the bath right" stayed on the task list
   * after the player had bought the licence and opened the bathhouse, and
   * "the gates of Nürnberg" stayed on it while standing in Nürnberg. The
   * strip became a list of things already done.
   *
   * These predicates read only flags and state the game actually sets — see
   * the note in `syncQuests`. Inventing a flag here would put the quest in
   * the opposite trap: never completing at all.
   */
  done?: (state: GameState) => boolean;
}

export const QUESTS: QuestDef[] = [
  {
    id: 'prologue',
    act: 1,
    titleKey: 'quest.prologue',
    stages: 3,
    autoStart: true,
    // Berthold's cart: taken, and the road camp left behind.
    done: (s) => !!s.storyFlags['has_cart'] && s.locationId !== 'road_camp',
  },
  {
    id: 'first_city',
    act: 1,
    titleKey: 'quest.first_city',
    stages: 2,
    // The gates of Nürnberg: you are through them.
    done: (s) => !!s.storyFlags['in_nurnberg'] || s.locationId === 'nurnberg',
  },
  {
    id: 'bath_rights',
    act: 2,
    titleKey: 'quest.bath_rights',
    stages: 3,
    // The right to the stove: the licence bought, or the premises standing.
    done: (s) =>
      !!s.storyFlags['bath_license'] ||
      !!s.storyFlags['own_bath'] ||
      (s.properties ?? []).some((p) => p.kind === 'bathhouse'),
  },
  {
    id: 'rival_krafft',
    act: 2,
    titleKey: 'quest.rival',
    stages: 3,
    // However it ended — exposed, shamed or settled with.
    done: (s) =>
      !!s.storyFlags['rival_exposed'] ||
      !!s.storyFlags['rival_truce'] ||
      !!s.storyFlags['rival_mud'],
  },
  {
    id: 'epidemic',
    act: 2,
    titleKey: 'quest.epidemic',
    stages: 2,
    done: (s) => !!s.storyFlags['epidemic_done'],
  },
  {
    id: 'war_contract',
    act: 3,
    titleKey: 'quest.war',
    stages: 2,
    done: (s) => !!s.storyFlags['war_done'] || !!s.storyFlags['war_refused'],
  },
  {
    id: 'meister',
    act: 3,
    titleKey: 'quest.meister',
    stages: 2,
    // The master's examination is the campaign's end; the ending decides it.
    done: (s) => !!s.ending,
  },
  {
    id: 'family_line',
    act: 2,
    titleKey: 'quest.family',
    stages: 2,
    done: (s) => !!s.storyFlags['family_quest_done'] || !!s.spouse || !!s.storyFlags['refuse_match'],
  },
  {
    id: 'politics',
    act: 2,
    titleKey: 'quest.politics',
    stages: 2,
    done: (s) => !!s.storyFlags['politics_quest_done'] || (s.office ?? 'none') !== 'none',
  },
];

export const DIALOGUES: DialogueNode[] = [
  {
    id: 'intro_1',
    speakerKey: 'npc.berthold',
    textKey: 'story.intro_1',
    choices: [{ textKey: 'choice.continue', next: 'intro_2' }],
  },
  {
    id: 'intro_2',
    speakerKey: 'npc.berthold',
    textKey: 'story.intro_2',
    choices: [
      {
        textKey: 'choice.take_cart',
        next: 'intro_3',
        effects: { coin: 15 },
        setFlag: 'has_cart',
      },
    ],
  },
  {
    id: 'intro_3',
    speakerKey: 'npc.berthold',
    textKey: 'story.intro_3',
    choices: [
      {
        textKey: 'choice.begin_road',
        effects: { tutorialStep: 1 },
        setFlag: 'intro_done',
        questAdvance: 'prologue',
      },
    ],
  },
  {
    id: 'adelheid_meet',
    speakerKey: 'npc.adelheid',
    textKey: 'story.adelheid_meet',
    choices: [
      {
        textKey: 'choice.treat_free',
        effects: { ethics: 8, coin: -5 },
        setFlag: 'adelheid_friend',
      },
      {
        textKey: 'choice.charge_fair',
        effects: { ethics: 2, coin: 8 },
        setFlag: 'adelheid_known',
      },
      {
        textKey: 'choice.refuse_poor',
        effects: { ethics: -10, churchHeat: 5 },
        setFlag: 'adelheid_cold',
      },
    ],
  },
  {
    id: 'nurnberg_gate',
    speakerKey: 'npc.guard',
    textKey: 'story.nurnberg_gate',
    choices: [
      {
        textKey: 'choice.pay_toll',
        effects: { coin: -10 },
        setFlag: 'in_nurnberg',
        questAdvance: 'first_city',
      },
      {
        textKey: 'choice.bribe',
        effects: { coin: -5, ethics: -3 },
        setFlag: 'in_nurnberg',
        questAdvance: 'first_city',
      },
    ],
  },
  {
    id: 'ortlieb_license',
    speakerKey: 'npc.ortlieb',
    textKey: 'story.ortlieb_license',
    choices: [
      {
        textKey: 'choice.buy_license',
        effects: { coin: -100, guildFavor: 10 },
        setFlag: 'bath_license',
        questAdvance: 'bath_rights',
      },
      {
        textKey: 'choice.promise_favor',
        effects: { debt: 80, councilFavor: 15 },
        setFlag: 'bath_license',
        questAdvance: 'bath_rights',
      },
    ],
  },
  {
    id: 'krafft_threat',
    speakerKey: 'npc.krafft',
    textKey: 'story.krafft_threat',
    choices: [
      {
        textKey: 'choice.defy_rival',
        effects: { guildFavor: -5 },
        setFlag: 'rival_war',
        questAdvance: 'rival_krafft',
      },
      {
        textKey: 'choice.appease_rival',
        effects: { coin: -30, ethics: -5 },
        setFlag: 'rival_truce',
        questAdvance: 'rival_krafft',
      },
    ],
  },
  {
    id: 'epidemic_start',
    speakerKey: 'npc.adelheid',
    textKey: 'story.epidemic_start',
    choices: [
      {
        textKey: 'choice.open_triage',
        effects: { ethics: 10 },
        setFlag: 'epidemic_fighting',
        unlockTechnique: 'hygiene_clean',
        questAdvance: 'epidemic',
      },
      {
        textKey: 'choice.close_doors',
        effects: { ethics: -15, coin: 20 },
        setFlag: 'epidemic_hid',
        questAdvance: 'epidemic',
      },
    ],
  },
  {
    id: 'war_offer',
    speakerKey: 'npc.captain',
    textKey: 'story.war_offer',
    choices: [
      {
        textKey: 'choice.accept_war',
        effects: { coin: 40 },
        setFlag: 'war_contract',
        unlockTechnique: 'battlefield_pack',
        questAdvance: 'war_contract',
      },
      {
        textKey: 'choice.refuse_war',
        effects: { ethics: 5, councilFavor: -10 },
        setFlag: 'war_refused',
      },
    ],
  },
  {
    id: 'meister_exam',
    speakerKey: 'npc.ortlieb',
    textKey: 'story.meister_exam',
    choices: [
      {
        textKey: 'choice.path_bath',
        setFlag: 'path_bath',
        effects: { guildFavor: 20 },
        questAdvance: 'meister',
      },
      {
        textKey: 'choice.path_council',
        setFlag: 'path_council',
        effects: { councilFavor: 25 },
        questAdvance: 'meister',
      },
      {
        textKey: 'choice.path_wander',
        setFlag: 'path_wander',
        effects: { ethics: 15 },
        questAdvance: 'meister',
      },
    ],
  },
  {
    id: 'gregor_warning',
    speakerKey: 'npc.gregor',
    textKey: 'story.gregor_warning',
    choices: [
      {
        textKey: 'choice.humble',
        effects: { churchHeat: -10, ethics: 5 },
      },
      {
        textKey: 'choice.defiant',
        effects: { churchHeat: 15, ethics: -5 },
      },
    ],
  },
  {
    id: 'adelheid_return',
    speakerKey: 'npc.adelheid',
    textKey: 'story.adelheid_return',
    choices: [
      {
        textKey: 'choice.help_hospital',
        effects: { ethics: 10, coin: -15, guildFavor: 5 },
        setFlag: 'adelheid_ally',
      },
      {
        textKey: 'choice.busy_work',
        effects: { ethics: -3 },
        setFlag: 'adelheid_distant',
      },
    ],
  },
  {
    id: 'krafft_escalate',
    speakerKey: 'npc.krafft',
    textKey: 'story.krafft_escalate',
    choices: [
      {
        textKey: 'choice.expose_rival',
        effects: { guildFavor: 10, ethics: 5, coin: -20 },
        setFlag: 'rival_exposed',
        questAdvance: 'rival_krafft',
      },
      {
        textKey: 'choice.sabotage_back',
        effects: { ethics: -12, coin: -10, guildFavor: -5 },
        setFlag: 'rival_mud',
        questAdvance: 'rival_krafft',
      },
    ],
  },
  {
    id: 'family_matchmaker',
    speakerKey: 'npc.ortlieb',
    textKey: 'story.family_matchmaker',
    choices: [
      {
        textKey: 'choice.open_to_marriage',
        effects: { councilFavor: 5 },
        setFlag: 'open_to_courtship',
        questAdvance: 'family_line',
      },
      {
        textKey: 'choice.refuse_match',
        effects: { ethics: 2 },
        setFlag: 'refuse_match',
      },
    ],
  },
  {
    id: 'council_offer',
    speakerKey: 'npc.ortlieb',
    textKey: 'story.council_offer',
    choices: [
      {
        textKey: 'choice.seek_office',
        effects: { councilFavor: 10 },
        setFlag: 'politics_path',
        questAdvance: 'politics',
      },
      {
        textKey: 'choice.stay_craft',
        effects: { guildFavor: 8 },
        setFlag: 'craft_path',
      },
    ],
  },
  {
    id: 'heir_blessing',
    speakerKey: 'npc.adelheid',
    textKey: 'story.heir_blessing',
    choices: [
      {
        textKey: 'choice.thank_nun',
        effects: { ethics: 5, churchHeat: -5 },
        setFlag: 'heir_blessed',
      },
    ],
  },
];

export const DIALOGUE_MAP = Object.fromEntries(DIALOGUES.map((d) => [d.id, d]));
