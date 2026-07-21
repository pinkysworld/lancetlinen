import type {
  GameState,
  PatientClass,
  Humor,
  PatientInstance,
  TreatmentResult,
  TreatmentResultKind,
} from '../types';
import { TECHNIQUE_MAP } from '../data/techniques';
import {
  classPayMult,
  DENTAL_TEMPLATE_IDS,
  FIRST_NAMES_F,
  FIRST_NAMES_M,
  FEMALE_PORTRAITS,
  PATIENT_TEMPLATES,
  SURNAMES,
  PATRICIAN_SURNAMES,
  templateWeight,
} from '../data/patients';
import { bloodlettingDayModifier, seasonalHumorBias } from '../data/history';
import { classWeight, reputationPayMult, applyTreatmentReputation } from './reputation';
import { staffSkillBonus, staffSupplySaveChance } from './staff';
import { honourFromTreatment, honourFromPlagueService } from './honour';
import { bestRemedyFor, consumeRemedy, RECIPE_MAP } from '../data/recipes';
import { titlePayMult } from './politics';
import { incomeMult } from './settings';
import { pickPortraitKey } from '../ui/art';

let uidCounter = 0;

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function weightedPick<T>(items: T[], weightFn: (t: T) => number): T {
  let total = 0;
  const weights = items.map((it) => {
    const w = Math.max(0.01, weightFn(it));
    total += w;
    return w;
  });
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return items[i]!;
  }
  return items[items.length - 1]!;
}

/**
 * Surname pool for a patient's station.
 *
 * Nürnberg's patrician houses supplied the city's ruling families; a noble or
 * wealthy merchant carrying a craft surname like "Gerber" reads wrong, and a
 * peasant named "Holzschuher" reads worse.
 */
function surnameFor(cls: PatientClass): string {
  const patrician = cls === 'noble' || (cls === 'merchant' && Math.random() < 0.5);
  return patrician ? pick(PATRICIAN_SURNAMES) : pick(SURNAMES);
}

function randName(cls: PatientClass): { name: string; female: boolean } {
  const female = Math.random() < 0.45;
  const first = female ? pick(FIRST_NAMES_F) : pick(FIRST_NAMES_M);
  return { name: `${first} ${surnameFor(cls)}`, female };
}

export function generatePatient(state: GameState): PatientInstance {
  let pool = [...PATIENT_TEMPLATES];

  // Filter advanced / story patients
  pool = pool.filter((t) => {
    if (t.id === 'eye_cloud' && !state.unlockedTechniques.includes('cataract_couch')) {
      return state.totalTreated > 15 && Math.random() < 0.15;
    }
    if ((t.id === 'war_wound' || t.id === 'arrow_wound') && state.locationId !== 'war_camp') {
      return Math.random() < 0.08;
    }
    if (t.id === 'plague_like' && !state.epidemicActive) return false;
    if (t.id === 'noble_secret' && !state.storyFlags['bath_license']) return Math.random() < 0.05;
    if (t.id === 'fistula_case' && state.totalTreated < 12) return false;
    if (t.id === 'cataract' || t.id === 'eye_cloud') {
      /* handled above */
    }
    if (t.class === 'noble' && (state.reputation[state.locationId] ?? 0) < 15) return Math.random() < 0.1;
    // Gate techniques: rare advanced complaints less often without tools
    if (t.id === 'hernia_rupture' && !state.unlockedTechniques.includes('truss_hernia')) {
      return state.totalTreated > 10 && Math.random() < 0.25;
    }
    return true;
  });

  // Prefer easier patients early — but keep dental common (everyday Bader work)
  if (state.totalTreated < 5) {
    pool = pool.filter((t) => t.severity <= 2 || DENTAL_TEMPLATE_IDS.has(t.id));
  }

  // Seasonal humor bias: more patients with season's dominant humor
  const bias = seasonalHumorBias(state);
  if (Math.random() < 0.4) {
    const seasonal = pool.filter((t) => t.dominantHumor === bias);
    if (seasonal.length) pool = seasonal;
  }

  // Early game: extra chance of pure dental visit so tooth arts are visible
  if (state.totalTreated < 20 && Math.random() < 0.28) {
    const dental = pool.filter((t) => DENTAL_TEMPLATE_IDS.has(t.id));
    if (dental.length) pool = dental;
  }

  if (pool.length === 0) pool = PATIENT_TEMPLATES.filter((t) => t.severity <= 2);

  const loc = state.locationId;
  if (loc === 'monastery_ebrach') {
    pool = pool.filter(
      (t) => t.class === 'clergy' || t.class === 'peasant' || DENTAL_TEMPLATE_IDS.has(t.id) || Math.random() < 0.4,
    );
  }
  if (loc === 'war_camp') {
    pool = pool.filter(
      (t) =>
        t.class === 'soldier' ||
        t.id === 'war_wound' ||
        t.id === 'arrow_wound' ||
        t.id === 'cracked_tooth' ||
        Math.random() < 0.3,
    );
  }
  if (state.bathhouse.level === 0) {
    pool = pool.filter((t) => t.class !== 'noble' || Math.random() < 0.15);
  }

  if (pool.length === 0) pool = PATIENT_TEMPLATES.filter((t) => t.severity <= 2);

  const template = weightedPick(
    pool,
    (t) => classWeight(state, t.class) * templateWeight(t) * (DENTAL_TEMPLATE_IDS.has(t.id) && state.totalTreated < 25 ? 1.35 : 1),
  );
  uidCounter += 1;

  // Name and portrait must agree, so the sex is decided once here and carried
  // on the patient rather than re-rolled independently in the UI.
  const femaleIds = new Set(['groom_woman', 'midwife_assist', 'chilblains', 'child_fever']);
  let name: string;
  let female: boolean;
  // A template that pins its own portrait decides the sex — otherwise a fixed
  // `port_noble` (a woman) could still draw a man's name.
  const pinned = template.portraitKey;
  if (pinned) {
    female = FEMALE_PORTRAITS.has(pinned);
    name = `${pick(female ? FIRST_NAMES_F : FIRST_NAMES_M)} ${surnameFor(template.class)}`;
  } else if (femaleIds.has(template.id)) {
    name = `${pick(FIRST_NAMES_F)} ${surnameFor(template.class)}`;
    female = true;
  } else {
    const r = randName(template.class);
    name = r.name;
    female = r.female;
  }

  return {
    uid: `p-${uidCounter}-${Date.now()}`,
    templateId: template.id,
    name,
    female,
    class: template.class,
    complaintKey: template.complaintKey,
    dominantHumor: template.dominantHumor,
    severity: Math.min(5, template.severity + (Math.random() < 0.2 ? 1 : 0)),
    bestTechniques: [...template.bestTechniques],
    basePay: template.basePay,
    diagnosed: false,
    pulseRead: false,
    storyFlag: template.storyFlag,
    portraitKey:
      template.portraitKey ??
      pickPortraitKey(template.class, `p-${uidCounter}-${template.id}`),
  };
}

function hasCosts(state: GameState, costs: Partial<Record<string, number>>): boolean {
  for (const [k, v] of Object.entries(costs)) {
    const inv = state.inventory as unknown as Record<string, number>;
    if ((inv[k] ?? 0) < (v ?? 0)) return false;
  }
  return true;
}

function spendCosts(state: GameState, costs: Partial<Record<string, number>>): void {
  // A herb boy gathers and stretches stores, so some of what a treatment would
  // consume is saved. Rolled per item so the effect is felt, not calculated.
  const saveChance = staffSupplySaveChance(state);
  for (const [k, v] of Object.entries(costs)) {
    const inv = state.inventory as unknown as Record<string, number>;
    let spend = v ?? 0;
    for (let i = 0; i < spend; i++) {
      if (Math.random() < saveChance) spend -= 1;
    }
    inv[k] = (inv[k] ?? 0) - spend;
  }
}

export function canUseTechnique(state: GameState, techniqueId: string): { ok: boolean; reason?: string } {
  const tech = TECHNIQUE_MAP[techniqueId];
  if (!tech) return { ok: false, reason: 'unknown' };
  if (!state.unlockedTechniques.includes(techniqueId)) return { ok: false, reason: 'locked' };
  if (state.stats.hand < tech.minHand) return { ok: false, reason: 'skill' };
  if (!hasCosts(state, tech.costItems)) return { ok: false, reason: 'supplies' };
  return { ok: true };
}

export function applyTreatment(
  state: GameState,
  patient: PatientInstance,
  techniqueId: string,
  skillBonus: number, // 0-1 from mini-game
): TreatmentResult {
  const tech = TECHNIQUE_MAP[techniqueId];
  if (!tech) {
    return {
      kind: 'fail',
      pay: 0,
      reputationDelta: -2,
      ethicsDelta: 0,
      xp: 0,
      messageKey: 'treatment_unknown',
    };
  }

  spendCosts(state, tech.costItems);

  const isBest = patient.bestTechniques.includes(techniqueId);
  const humorMatch = tech.humorTargets.includes(patient.dominantHumor);
  const diagnosisBonus = patient.diagnosed ? 0.08 : 0;
  const pulseBonus = patient.pulseRead ? 0.04 : 0;
  const eyeBonus = state.stats.eye * 0.015;
  // Hand's direct contribution is trimmed because it now *also* pays off
  // through the skill check (wider target, slower marker). Between the two the
  // net value of Hand is about the same, but the minigame decides more.
  const handBonus = state.stats.hand * 0.014;
  const severityPenalty = patient.severity * 0.06;
  const boilerBonus = state.bathhouse.boiler && tech.category === 'bathing' ? 0.05 : 0;

  let chance =
    tech.baseSuccess +
    (isBest ? 0.18 : -0.08) +
    (humorMatch ? 0.1 : tech.humorTargets.length ? -0.05 : 0) +
    diagnosisBonus +
    pulseBonus +
    eyeBonus +
    handBonus +
    // The minigame is now difficulty-scaled and skill-scaled, so it carries
    // real weight instead of being a 15-point rounding error.
    skillBonus * 0.28 +
    boilerBonus -
    severityPenalty;

  // Historical bloodletting calendar (zodiac / season)
  let astroNote: string | undefined;
  if (tech.category === 'blood') {
    const astro = bloodlettingDayModifier(state);
    chance *= astro.mult;
    astroNote = astro.key;
    // Post-bleed rest was traditional — soul helps recovery outcomes
    chance += state.stats.soul * 0.008;
  }

  // Staff help
  // Apprentices at the table. Was a flat 0.02 per head, ignoring the skill and
  // loyalty the Staff screen lets you invest in; now those are what count.
  chance += staffSkillBonus(state);

  // A prepared remedy, if one applies and the player has stock. Consumed
  // whether the treatment succeeds or not — the salve is used either way.
  const remedy = bestRemedyFor(state, tech.category);
  let remedyUsed: string | undefined;
  if (remedy && consumeRemedy(state, remedy.id)) {
    chance += remedy.effect.successBonus ?? 0;
    remedyUsed = remedy.id;
  }

  chance = Math.max(0.08, Math.min(0.96, chance));

  const roll = Math.random();
  let kind: TreatmentResultKind;
  if (roll < chance) {
    kind = roll < chance * 0.55 ? 'success' : 'partial';
  } else if (roll > 1 - tech.risk * (1 - state.stats.soul * 0.05) * (patient.severity * 0.15)) {
    kind = patient.severity >= 4 && Math.random() < 0.35 ? 'death' : 'fail';
  } else {
    kind = 'fail';
  }

  // A remedy with `safety` pulls a death back to a mere failure. Wound drink
  // and theriac both carry it — the first because yarrow really does slow
  // bleeding, the second because it was believed to counter any poison.
  if (kind === 'death' && remedyUsed) {
    const safety = RECIPE_MAP[remedyUsed]?.effect.safety ?? 0;
    if (safety > 0 && Math.random() < safety) kind = 'fail';
  }

  // Death rarer with hygiene on plague
  if (kind === 'death' && techniqueId === 'hygiene_clean') {
    kind = Math.random() < 0.7 ? 'partial' : 'fail';
  }

  const payBase = patient.basePay * classPayMult(patient.class) * tech.payMult;
  const tongueBonus = 1 + state.stats.tongue * 0.03;
  const boothBonus = state.bathhouse.privateBooth && patient.class === 'noble' ? 1.3 : 1;
  // Title prestige multiplies fees. The table lives in politics.ts — this used
  // to carry its own copy, which is how staffSkillBonus drifted from treatment.
  const titleMult = titlePayMult(state);
  // Difficulty scales the base, so every clamp below still binds: a death pays
  // 0 and a beggar is capped at 4 even on the merciful setting.
  // A named preparation is worth more than a bare treatment — the patient can
  // see they were given something the Bader made.
  const remedyPay = remedyUsed ? (RECIPE_MAP[remedyUsed]?.effect.payMult ?? 1) : 1;
  let pay = Math.round(
    payBase *
      tongueBonus *
      boothBonus *
      titleMult *
      reputationPayMult(state, patient.class) *
      remedyPay *
      incomeMult(),
  );

  let reputationDelta = 0;
  let ethicsDelta = 0;
  let xp = tech.xp;
  let messageKey = 'treatment_partial';

  switch (kind) {
    case 'success':
      pay = Math.round(pay * 1.1);
      reputationDelta = 3 + (patient.class === 'noble' ? 3 : 0);
      ethicsDelta = patient.class === 'beggar' ? 4 : 1;
      xp = Math.round(xp * 1.2);
      messageKey = 'treatment_success';
      break;
    case 'partial':
      pay = Math.round(pay * 0.65);
      reputationDelta = 1;
      messageKey = 'treatment_partial';
      break;
    case 'fail':
      pay = Math.round(pay * 0.15);
      reputationDelta = -3;
      ethicsDelta = -1;
      xp = Math.round(xp * 0.4);
      messageKey = 'treatment_fail';
      break;
    case 'death':
      pay = 0;
      reputationDelta = patient.class === 'noble' ? -15 : -8;
      ethicsDelta = -5;
      xp = Math.round(xp * 0.2);
      messageKey = 'treatment_death';
      state.deathsOnHands += 1;
      if (patient.class === 'noble') state.churchHeat += 8;
      break;
  }

  // Charity option handled outside; beggars pay little
  if (patient.class === 'beggar') {
    pay = Math.min(pay, 4);
    ethicsDelta += 2;
  }

  // Epidemic cases
  if (patient.storyFlag === 'epidemic_case' && kind === 'success') {
    reputationDelta += 5;
    state.storyFlags['epidemic_saves'] = Number(state.storyFlags['epidemic_saves'] ?? 0) + 1;
    // Working a plague rather than leaving town was the one thing that
    // reliably redeemed the trade in the town's eyes.
    honourFromPlagueService(state);
  }

  // Multi-facet Bader reputation (folk / elite / fame + local)
  applyTreatmentReputation(state, patient.class, kind);
  // Honour moves with the outcome — deaths are what the guilds pointed at.
  honourFromTreatment(state, patient.class, kind);

  state.coin += pay;
  state.dayEarnings += pay;
  state.dayReputation += reputationDelta;
  state.totalTreated += 1;
  state.patientsToday += 1;
  state.ethics = Math.max(0, Math.min(100, state.ethics + ethicsDelta));
  // Local city rep still adjusted for display delta (facet system also writes local)
  state.reputation[state.locationId] = Math.max(
    -50,
    Math.min(100, (state.reputation[state.locationId] ?? 0) + reputationDelta * 0.35),
  );

  state.techniqueXp[techniqueId] = (state.techniqueXp[techniqueId] ?? 0) + xp;
  // Stat growth slow
  if (tech.category === 'wound' || tech.category === 'blood' || tech.category === 'advanced') {
    if (Math.random() < 0.12) state.stats.hand = Math.min(10, state.stats.hand + 1);
  }
  if (patient.diagnosed && Math.random() < 0.1) {
    state.stats.eye = Math.min(10, state.stats.eye + 1);
  }

  // Optional convalescence note after blood arts (historical rest after letting)
  if (tech.category === 'blood' && (kind === 'success' || kind === 'partial')) {
    state.storyFlags['recent_bloodletting'] = state.day;
  }

  return {
    kind,
    pay,
    reputationDelta,
    ethicsDelta,
    xp,
    messageKey,
    messageParams: {
      name: patient.name,
      pay,
      rep: reputationDelta,
      ...(astroNote ? { astro: astroNote } : {}),
    },
  };
}

/**
 * Galenic qualities of each humor.
 *
 * Blood is hot & moist, yellow bile hot & dry, phlegm cold & moist,
 * black bile cold & dry. The pulse reads these qualities, which is how a
 * period practitioner would actually have narrowed things down.
 */
const HUMOR_QUALITIES: Record<Humor, { hot: boolean; moist: boolean }> = {
  blood: { hot: true, moist: true },
  yellowBile: { hot: true, moist: false },
  phlegm: { hot: false, moist: true },
  blackBile: { hot: false, moist: false },
};

export interface DiagnosisResult {
  /** The humor the player believes they have found — may be wrong. */
  humor: Humor;
  /**
   * How much to trust it, derived from Eye alone.
   *
   * Deliberately *not* derived from whether this particular roll succeeded:
   * that would be a perfect tell and would make the reading useless as a
   * judgement call. It reflects the player's genuine long-run accuracy.
   */
  confidenceKey: 'confidence_certain' | 'confidence_fair' | 'confidence_guess';
}

export function diagnosePatient(state: GameState, patient: PatientInstance): DiagnosisResult {
  patient.diagnosed = true;
  const eye = state.stats.eye;
  const accuracy = 0.5 + eye * 0.05;

  const humors: Humor[] = ['blood', 'phlegm', 'yellowBile', 'blackBile'];
  const humor = Math.random() < accuracy ? patient.dominantHumor : pick(humors);

  const confidenceKey =
    eye >= 7 ? 'confidence_certain' : eye >= 4 ? 'confidence_fair' : 'confidence_guess';

  return { humor, confidenceKey };
}

/**
 * What the urine flask showed.
 *
 * Uroscopy was the single most recognisable act of learned medicine — so much
 * so that the matula, the clear glass flask, became the physician's symbol in
 * painting. The physician held it to the light and read colour, cloudiness,
 * sediment and smell against a chart of twenty or more shades.
 */
export interface UrineReading {
  /** i18n key describing what was seen in the flask. */
  qualityKey: string;
  /** Humours still consistent with it. */
  candidates: Humor[];
  /** True when the reading was misjudged — the player is not told. */
  misread: boolean;
}

export interface PulseReading {
  /** i18n key describing the beat itself. */
  qualityKey: string;
  /** Humors still consistent with what was felt. */
  candidates: Humor[];
}

/**
 * Feel the pulse.
 *
 * Previously this set a boolean and returned nothing, so the player learned
 * literally nothing from it. It now reports the beat's character and narrows
 * the humor down — always truthfully, but only partially: temperature is
 * always readable, moisture only for a practised Eye.
 */
export function readPulse(state: GameState, patient: PatientInstance): PulseReading {
  patient.pulseRead = true;

  const actual = HUMOR_QUALITIES[patient.dominantHumor];
  // A very skilled reader can feel the moisture too, which alone narrows the
  // humour to one. Below that the pulse gives the hot/cold axis and the urine
  // gives the moist/dry axis — which is how the two were used together.
  const readsMoisture = state.stats.eye >= 8;

  const candidates = (Object.keys(HUMOR_QUALITIES) as Humor[]).filter((h) => {
    const q = HUMOR_QUALITIES[h];
    if (q.hot !== actual.hot) return false;
    return readsMoisture ? q.moist === actual.moist : true;
  });

  const strength = patient.severity >= 4 ? 'weak' : patient.severity >= 2 ? 'steady' : 'firm';
  const temp = actual.hot ? 'hot' : 'cold';
  const qualityKey = readsMoisture
    ? `pulse_${temp}_${actual.moist ? 'moist' : 'dry'}_${strength}`
    : `pulse_${temp}_${strength}`;

  return { qualityKey, candidates };
}

/**
 * Read the urine.
 *
 * The complementary half of the pulse: where the beat gives hot against cold,
 * the flask gives moist against dry. Used together they name the humour;
 * either alone leaves two candidates. That is not a game contrivance — the two
 * were the standard pair, and a physician who had only one was working blind
 * on half the question.
 *
 * Unlike the pulse this can be **misread**. Uroscopy was interpreted against
 * charts of twenty-odd shades under whatever light was available, and getting
 * it wrong was ordinary. The player is not told when it happens; that is what
 * the Eye stat is for.
 */
export function readUrine(state: GameState, patient: PatientInstance): UrineReading {
  patient.urineRead = true;

  const actual = HUMOR_QUALITIES[patient.dominantHumor];
  // Judging colour by candlelight is genuinely hard. Even a sharp eye is
  // wrong sometimes, which is what makes a second opinion worth having.
  const accuracy = 0.55 + state.stats.eye * 0.045;
  const misread = Math.random() > accuracy;
  const seenMoist = misread ? !actual.moist : actual.moist;

  const candidates = (Object.keys(HUMOR_QUALITIES) as Humor[]).filter(
    (h) => HUMOR_QUALITIES[h].moist === seenMoist,
  );

  // Colour and sediment, described the way a period text would.
  const severe = patient.severity >= 4;
  const qualityKey = seenMoist
    ? severe
      ? 'urine_pale_thick'
      : 'urine_pale_clear'
    : severe
      ? 'urine_high_troubled'
      : 'urine_high_clear';

  return { qualityKey, candidates, misread };
}
