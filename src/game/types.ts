/** Core type definitions for Lancet & Linen — full feature set */

export type Humor = 'blood' | 'phlegm' | 'yellowBile' | 'blackBile';
export type PatientClass = 'beggar' | 'peasant' | 'artisan' | 'merchant' | 'soldier' | 'noble' | 'clergy';
export type TechniqueCategory =
  | 'grooming'
  | 'bathing'
  | 'blood'
  | 'dental'
  | 'wound'
  | 'herb'
  | 'advanced';
export type SettlementType = 'city' | 'town' | 'village' | 'monastery' | 'camp' | 'crossroads';
export type GuildRank = 'none' | 'apprentice' | 'journeyman' | 'master';
export type EndingId =
  | 'master_bath'
  | 'council_surgeon'
  | 'wandering_healer'
  | 'dynasty'
  | 'ruined'
  | null;
export type Locale = 'en' | 'de';
export type PropertyKind = 'stall' | 'bathhouse' | 'home' | 'warehouse';
export type StaffRole = 'apprentice' | 'bathmaid' | 'manager' | 'herb_boy' | 'nightwatch';
/** A personal strength. It supplements a role; it never replaces it. */
export type StaffTrait = 'careful' | 'sociable' | 'thrifty' | 'steadfast';
/** The partner's chosen, visible priority for the household. */
export type HouseholdFocus = 'home' | 'trade' | 'kin';
/** Last-act consequences are saved rather than re-rolled on later visits. */
export type Act3ConsequenceId =
  | 'epidemic_memory'
  | 'rival_reckoning'
  | 'debt_shadow'
  | 'lepra_reputation'
  | 'staff_compact'
  | 'family_network';
export type OfficeId = 'none' | 'quarter_warden' | 'guild_elder' | 'city_surgeon' | 'council_seat';
export type TitleId = 'citizen' | 'freeman' | 'master_bader' | 'honorable' | 'noble_surgeon';
export type GoreLevel = 'low' | 'medium' | 'high';
/**
 * How hard the economy and the town press on the player.
 * `merciful` is for players here for the history and the writing.
 */
export type Difficulty = 'merciful' | 'fair' | 'harsh';
/**
 * Compact (phone) layout.
 *
 * `auto` measures the viewport, which is right almost always — but detection
 * can be wrong on an unusual device or an embedded browser, and being stuck
 * with an unreadable layout and no way out is worse than an extra setting.
 */
export type CompactMode = 'auto' | 'on' | 'off';
/** Historically framed follow-up plans, resolved when the next day opens. */
export type RegimenId = 'pest_regimen' | 'rest_diet' | 'bath_linen';

export interface Stats {
  hand: number;
  eye: number;
  tongue: number;
  back: number;
  soul: number;
}

export interface Technique {
  id: string;
  category: TechniqueCategory;
  humorTargets: Humor[];
  baseSuccess: number;
  risk: number;
  costItems: Partial<Record<string, number>>;
  minHand: number;
  unlockCost: number;
  payMult: number;
  xp: number;
}

export interface PatientTemplate {
  id: string;
  class: PatientClass;
  complaintKey: string;
  dominantHumor: Humor;
  severity: number;
  bestTechniques: string[];
  basePay: number;
  storyFlag?: string;
  /** Optional painted portrait texture key */
  portraitKey?: string;
  /** Relative spawn weight (default 1) */
  weight?: number;
}

/**
 * The fee posture struck before treating.
 *
 * Fees were negotiated, not fixed — and treating the poor without charge was
 * the standard route back to respectability for a dishonourable trade.
 */
export type FeeStance = 'demand' | 'usual' | 'lenient' | 'alms';

/**
 * How boldly the hand works.
 *
 * The bold cut paid better and killed more often; the careful one was slower,
 * cheaper and safer. Only techniques that carry real risk read this.
 */
export type Intensity = 'careful' | 'usual' | 'bold';

export interface PatientInstance {
  uid: string;
  templateId: string;
  name: string;
  class: PatientClass;
  complaintKey: string;
  dominantHumor: Humor;
  severity: number;
  bestTechniques: string[];
  basePay: number;
  diagnosed: boolean;
  pulseRead: boolean;
  /** Whether the urine flask has been read — see `readUrine`. */
  urineRead?: boolean;
  /** Whether the body has been felt — see `readPalpation`. */
  palpated?: boolean;
  /** Whether the tongue has been read — see `readTongue`. */
  tongueRead?: boolean;
  storyFlag?: string;
  portraitKey?: string;
  /**
   * Set when the name was drawn from the female list.
   *
   * Without it the portrait pools were picked by class alone, so "Claus
   * Gerber" could be handed `port_artisan2` — a woman. Ten of the 25 patient
   * portraits are female, so this happened often.
   */
  female?: boolean;
  /** Fee posture chosen before treatment — see `FeeStance`. */
  feeStance?: FeeStance;
  /** How boldly to work — see `Intensity`. */
  intensity?: Intensity;
  /** Vein chosen for a blood art — see `data/bloodletting.ts`. */
  vein?: string;
}

export type TreatmentResultKind = 'success' | 'partial' | 'fail' | 'death';

export interface TreatmentResult {
  kind: TreatmentResultKind;
  pay: number;
  reputationDelta: number;
  ethicsDelta: number;
  xp: number;
  messageKey: string;
  messageParams?: Record<string, string | number>;
  /**
   * What became of the fee posture — "they agreed", "they haggled you down",
   * "treated as alms". Shown as its own line so the player learns whether
   * demanding worked, which is what makes the Tongue stat legible.
   */
  stanceNoteKey?: string;
  /** What the bloodletting tables made of the vein chosen. */
  veinNoteKey?: string;
}

export interface Inventory {
  linen: number;
  herbs: number;
  leeches: number;
  soap: number;
  wood: number;
  salve: number;
  ironTools: number;
}

export interface BathhouseState {
  owned: boolean;
  level: number;
  boiler: boolean;
  privateBooth: boolean;
  apprenticeBunks: boolean;
  staffApprentice: number;
  staffBathMaid: number;
  open: boolean;
}

export interface Property {
  id: string;
  cityId: string;
  kind: PropertyKind;
  level: number;
  boiler: boolean;
  privateBooth: boolean;
  apprenticeBunks: boolean;
  staffApprentice: number;
  staffBathMaid: number;
  hasManager: boolean;
  open: boolean;
  comfort: number;
  licensePaid: boolean;
}

export interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
  propertyId: string | null; // null = household / traveling
  loyalty: number; // 0-100
  skill: number; // 1-10
  wage: number;
  daysEmployed: number;
  /** Added in save schema 3; legacy staff receive a deterministic default. */
  trait?: StaffTrait;
}

/** A deferred, non-invasive course of care. It records a game outcome, never a diagnosis. */
export interface CarePlan {
  id: string;
  regimenId: RegimenId;
  patientUid: string;
  patientName: string;
  patientClass: PatientClass;
  templateId: string;
  complaintKey: string;
  dueDay: number;
  fit: boolean;
}

export interface SpouseState {
  name: string;
  affection: number; // 0-100
  cityId: string;
  marriedDay: number;
  /** Household, trade, or kin network; legacy marriages default to household. */
  householdFocus?: HouseholdFocus;
}

export interface HeirState {
  name: string;
  ageYears: number;
  bornDay: number;
}

export interface JournalEntry {
  id: string;
  day: number;
  year: number;
  textKey: string;
  params?: Record<string, string | number>;
  category: 'story' | 'business' | 'travel' | 'family' | 'politics' | 'tutorial';
}

export interface CartState {
  horseHealth: number;
  cartCondition: number;
  capacity: number;
}

export interface MapNode {
  id: string;
  type: SettlementType;
  x: number;
  y: number;
  connections: string[];
  marketDay: number;
  hasBathLicenseShop: boolean;
  travelCost: number;
}

export interface QuestState {
  id: string;
  stage: number;
  completed: boolean;
  failed: boolean;
}

export interface GameSettings {
  goreLevel: GoreLevel;
  /** 1 = slow, 2 = normal, 3 = instant. Drives the dialogue reveal. */
  textSpeed: number;
  showTutorialTips: boolean;
  reduceParticles: boolean;
  /** Volumes, 0..1. */
  volMaster: number;
  volMusic: number;
  volSfx: number;
  volAmbience: number;
  /**
   * Adds glyphs alongside colour so state is not signalled by hue alone
   * (severity dots, treatment outcomes, ledger deltas).
   */
  colorBlindSafe: boolean;
  /** UI text scale multiplier, 0.9–1.3. */
  textScale: number;
  fullscreen: boolean;
  /** Key overrides: action id -> KeyboardEvent.key. */
  keyBinds: Record<string, string>;
  difficulty: Difficulty;
  compactMode: CompactMode;
}

export interface GameState {
  version: number;
  playerName: string;
  /** Which `data/origins.ts` entry the run was created with. */
  originId?: string;
  locale: Locale;
  day: number;
  weekday: number;
  season: number;
  year: number;
  locationId: string;
  coin: number;
  debt: number;
  ethics: number;
  guildRank: GuildRank;
  guildFavor: number;
  churchHeat: number;
  councilFavor: number;
  stats: Stats;
  techniqueXp: Record<string, number>;
  unlockedTechniques: string[];
  inventory: Inventory;
  /**
   * Prepared remedies, keyed by recipe id — see `data/recipes.ts`.
   *
   * Its own record rather than fields on `Inventory` so that adding a recipe
   * needs no save migration; absent on saves that predate the system.
   */
  remedies?: Record<string, number>;
  bathhouse: BathhouseState;
  properties: Property[];
  cart: CartState;
  reputation: Record<string, number>;
  storyFlags: Record<string, boolean | number | string>;
  quests: QuestState[];
  patientsToday: number;
  dayEarnings: number;
  dayReputation: number;
  remoteEarningsToday: number;
  act: number;
  ending: EndingId;
  tutorialStep: number;
  deathsOnHands: number;
  /** Patients treated for nothing, by the alms fee stance. The epilogue reads it. */
  almsGiven?: number;
  /** Lepraschau verdicts that held / that did not. The epilogue reads them. */
  lepraRight?: number;
  lepraWrong?: number;
  totalTreated: number;
  rivalActive: boolean;
  epidemicActive: boolean;
  freePlay: boolean;
  audioMuted: boolean;
  // Full-feature expansions
  staff: StaffMember[];
  /** Follow-up plans created by the Regimen path. Absent on legacy saves. */
  carePlans?: CarePlan[];
  /** Permanent, journalled repercussions that have already happened in act 3. */
  act3Consequences?: Act3ConsequenceId[];
  spouse: SpouseState | null;
  heir: HeirState | null;
  office: OfficeId;
  title: TitleId;
  journal: JournalEntry[];
  settings: GameSettings;
  festivalActive: string | null;
  lastCityEventDay: number;
  courtshipTarget: string | null; // npc key
  courtshipProgress: number;
  titlesOwned: TitleId[];
  prestige: number;
  /** Folk trust (commoners) 0-100 */
  repFolk: number;
  /** Elite favour (nobles/merchants) 0-100 */
  repElite: number;
  /** Empire-wide fame 0-100 */
  repFame: number;
  /**
   * Honour (*Ehrlichkeit*) 0-100, practically capped at HONOUR_CEILING.
   * Whether the town counts a Bader an honest man — see systems/honour.ts.
   */
  honour: number;
}

/**
 * Single source of truth for setting defaults.
 *
 * `ensureFullState` spreads this under a loaded save, so adding a setting here
 * is all that is needed for old saves to pick it up.
 */
export const DEFAULT_SETTINGS: GameSettings = {
  goreLevel: 'medium',
  textSpeed: 2,
  showTutorialTips: true,
  reduceParticles: false,
  volMaster: 0.72,
  volMusic: 0.32,
  volSfx: 0.55,
  volAmbience: 0.18,
  colorBlindSafe: false,
  textScale: 1,
  fullscreen: false,
  keyBinds: {},
  difficulty: 'fair',
  compactMode: 'auto',
};

export const SAVE_KEY = 'lancet-linen-save-v2';
export const LEGACY_SAVE_KEY = 'der-bader-save-v1';
/**
 * Design space. Every scene coordinate is expressed in these units.
 * Deliberately unchanged at 720p — see RENDER_SCALE.
 */
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

/**
 * Drawing-buffer multiplier: 1280x720 world rendered into a 1920x1080 buffer.
 *
 * Source art is 1920x1080 / 1536², so at 1.5 it lands 1:1 on physical pixels.
 * Raising this past the art's own resolution buys nothing but fill rate.
 */
export const RENDER_SCALE = 1.5;

/** Drawing-buffer size. Phaser's canvas is created at these dimensions. */
export const RENDER_WIDTH = GAME_WIDTH * RENDER_SCALE;
export const RENDER_HEIGHT = GAME_HEIGHT * RENDER_SCALE;
