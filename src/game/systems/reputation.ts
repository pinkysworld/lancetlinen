/**
 * Bader reputation — historically multi-layered:
 * - Local city standing (state.reputation[city]) — gossip within the walls
 * - Folk trust (commoners, servants, peasants) — charity, fair fees, street skill
 * - Elite favour (nobles, rich merchants, council) — private calls, titles, pay
 * - Fame (whispered name beyond one town) — masters, travel, empire prestige
 *
 * Historical note (HRE ~1350–1450): Baders were essential but often ranked
 * below university physicians; guild membership, clean linen, and not killing
 * the wrong patient mattered more than academic theory. A ruined name in one
 * city could force travel; fame on the road opened doors elsewhere.
 *
 * High folk → more poor patients, ethics glow, staff loyalty
 * High elite → nobles, better pay, offices, private work
 * Fame → masters cheaper, fewer bandits, spillover into new towns
 * Deaths / scandals hit folk+elite; charity raises folk; nobles raise elite
 */
import type { GameState, PatientClass } from '../types';
import { addJournal } from './journal';

export function ensureReputation(state: GameState): void {
  if (state.repFolk === undefined) state.repFolk = 40;
  if (state.repElite === undefined) state.repElite = 15;
  if (state.repFame === undefined) state.repFame = 5;
}

export type LocalRank =
  | 'disgraced'
  | 'unknown'
  | 'known'
  | 'respected'
  | 'renowned'
  | 'legend';

/**
 * "Living legend" is a late-career distinction, not the next step after a
 * few prosperous weeks.  The campaign's master examination opens around 35
 * treated patients; a name at this level needs a much longer, public record
 * in the same city.
 */
export const LOCAL_LEGEND_REPUTATION = 90;

export function localRank(rep: number): LocalRank {
  if (rep < -15) return 'disgraced';
  if (rep < 12) return 'unknown';
  if (rep < 30) return 'known';
  if (rep < 50) return 'respected';
  if (rep < LOCAL_LEGEND_REPUTATION) return 'renowned';
  return 'legend';
}

export function localRankKey(rep: number): string {
  return `rep_rank_${localRank(rep)}`;
}

/**
 * Diminishing returns on a good name.
 *
 * Folk trust starts at 40 and rose a flat +1 or +2 per common patient treated
 * well. Against a campaign that ends at 35 treated it therefore hit its
 * ceiling of 100 around two-thirds of the way through and stopped meaning
 * anything — reported from play as "it grows very fast and 100 seems to be
 * the top". Imperial fame, at +0.3 to +0.8, had the opposite problem and
 * barely moved.
 *
 * A gain is now scaled by how much room is left above it. Going from unknown
 * to well-liked is quick; going from well-liked to beloved is the work of a
 * career. Losses are never scaled — a death costs what it costs, and being
 * cushioned from disgrace by a good name is exactly the wrong lesson for a
 * trade this precarious.
 *
 * The 0.15 floor keeps the ceiling reachable rather than asymptotic, so a
 * long, careful game can still arrive at 100.
 */
function gainFactor(current: number): number {
  return Math.max(0.15, 1 - current / 100);
}

/**
 * A town remembers a run of good work, but every additional patient cannot
 * add the same amount of standing forever.  Local standing was the one facet
 * that still rose flatly, and it was also being increased a second time from
 * the outcome display in `applyTreatment`.  That made "Living legend" a
 * mid-career badge rather than a durable end-game achievement.
 *
 * The first thirty points remain brisk: a newcomer should become known by
 * doing competent work.  From there the returns taper to a 20% floor, so
 * renowned practitioners still progress, but need roughly a long free-play
 * career, high-stakes events, or civic work to become a legend.
 */
function localGainFactor(current: number): number {
  if (current <= 30) return 1;
  return Math.max(0.2, 1 - (current - 30) / 90);
}

/** Apply a facet change: gains taper near the ceiling, losses do not. */
function addFacet(current: number, delta: number, lo = 0, hi = 100): number {
  const scaled = delta > 0 ? delta * gainFactor(current) : delta;
  return clamp(current + scaled, lo, hi);
}

/** Apply a local-standing change; only positive gossip is tapered. */
function addLocalStanding(current: number, delta: number): number {
  const scaled = delta > 0 ? delta * localGainFactor(current) : delta;
  return clamp(current + scaled, -50, 100);
}

export function addFacetRep(
  state: GameState,
  delta: { folk?: number; elite?: number; fame?: number; local?: number },
  cityId?: string,
): void {
  ensureReputation(state);
  const beforeLocal = state.reputation[cityId ?? state.locationId] ?? 0;
  if (delta.folk) state.repFolk = addFacet(state.repFolk, delta.folk);
  if (delta.elite) state.repElite = addFacet(state.repElite, delta.elite);
  if (delta.fame) state.repFame = addFacet(state.repFame, delta.fame);
  if (delta.local) {
    const id = cityId ?? state.locationId;
    state.reputation[id] = addLocalStanding(state.reputation[id] ?? 0, delta.local);
    maybeRankJournal(state, beforeLocal, state.reputation[id] ?? 0);
  }
}

function maybeRankJournal(state: GameState, before: number, after: number): void {
  const rb = localRank(before);
  const ra = localRank(after);
  if (rb === ra) return;
  // Only journal meaningful upgrades or disgrace
  if (after > before) {
    addJournal(state, `journal_rep_rise_${ra}`, 'business');
  } else if (ra === 'disgraced' || ra === 'unknown') {
    addJournal(state, `journal_rep_fall_${ra}`, 'business');
  }
}

function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

/** After treatment: update multi-facet rep from patient class + outcome */
export function applyTreatmentReputation(
  state: GameState,
  patientClass: PatientClass,
  kind: 'success' | 'partial' | 'fail' | 'death',
): void {
  ensureReputation(state);
  const common = patientClass === 'beggar' || patientClass === 'peasant' || patientClass === 'artisan';
  const elite =
    patientClass === 'noble' || patientClass === 'merchant' || patientClass === 'clergy';

  if (kind === 'success') {
    if (common) addFacetRep(state, { folk: patientClass === 'beggar' ? 2 : 1, local: 1, fame: 0.3 });
    if (elite) addFacetRep(state, { elite: patientClass === 'noble' ? 3 : 1, local: 2, fame: 0.8 });
    if (patientClass === 'soldier') addFacetRep(state, { folk: 1, fame: 0.5, local: 1 });
  } else if (kind === 'partial') {
    if (common) addFacetRep(state, { folk: 0.3, local: 0.5 });
    if (elite) addFacetRep(state, { elite: 0.5, local: 0.5 });
  } else if (kind === 'fail') {
    if (common) addFacetRep(state, { folk: -1, local: -1 });
    if (elite) addFacetRep(state, { elite: -2, local: -2 });
  } else if (kind === 'death') {
    addFacetRep(state, {
      folk: common ? -4 : -1,
      elite: elite ? -6 : -2,
      fame: -1,
      local: patientClass === 'noble' ? -12 : -5,
    });
    if (patientClass === 'noble') {
      addJournal(state, 'journal_rep_noble_death', 'business');
    }
  }
}

/** Charity / free treat */
export function applyCharityRep(state: GameState): void {
  addFacetRep(state, { folk: 3, fame: 0.5, local: 1 });
}

/** Rival smear or public scandal */
export function applyScandalRep(state: GameState, severity: 'mild' | 'harsh' = 'mild'): void {
  if (severity === 'harsh') {
    addFacetRep(state, { folk: -8, elite: -5, fame: -2, local: -6 });
  } else {
    addFacetRep(state, { folk: -4, elite: -2, fame: -1, local: -3 });
  }
}

/**
 * End-of-day tick: fame slowly fades if unused; disgrace heals slowly with good ethics;
 * inactive local standing softens toward neutral very slowly.
 */
export function tickReputation(state: GameState): void {
  ensureReputation(state);
  // Fame is hard-won and slowly evaporates without fresh deeds
  if (state.repFame > 8 && state.patientsToday === 0 && Math.random() < 0.35) {
    state.repFame = clamp(state.repFame - 0.15, 0, 100);
  }
  // Strong ethics gently lifts folk; low ethics bleeds trust
  if (state.ethics >= 70 && Math.random() < 0.2) {
    state.repFolk = clamp(state.repFolk + 0.25, 0, 100);
  } else if (state.ethics < 25 && Math.random() < 0.25) {
    state.repFolk = clamp(state.repFolk - 0.4, 0, 100);
  }
  // Church heat cools elite favour
  if (state.churchHeat > 40 && Math.random() < 0.2) {
    state.repElite = clamp(state.repElite - 0.5, 0, 100);
  }
  // Deaths on hands haunt fame
  if (state.deathsOnHands >= 3 && Math.random() < 0.15) {
    state.repFame = clamp(state.repFame - 0.3, 0, 100);
  }
}

/**
 * Arrive in a city: empire fame seeds a little local standing if unknown.
 * Historical: a known field surgeon or bath-master was not a stranger forever.
 */
export function applyArrivalFameSpillover(state: GameState, cityId: string): void {
  ensureReputation(state);
  const local = state.reputation[cityId] ?? 0;
  if (local >= 10) return;
  if (state.repFame < 20) return;
  const seed = Math.min(12, Math.floor(state.repFame / 8));
  if (seed <= 0) return;
  const before = local;
  state.reputation[cityId] = clamp(local + seed, -50, 100);
  if (before < 5 && seed >= 3) {
    addJournal(state, 'journal_rep_fame_arrival', 'travel');
  }
}

/** Bandit encounter chance multiplier (fame = known road name, escorts more careful) */
export function banditChanceMult(state: GameState): number {
  ensureReputation(state);
  return Math.max(0.35, 1 - state.repFame * 0.006);
}

/** Patient spawn weights from standing */
export function classWeight(state: GameState, c: PatientClass): number {
  ensureReputation(state);
  const local = state.reputation[state.locationId] ?? 0;
  let w = 1;
  switch (c) {
    case 'beggar':
      w = 1.2 + state.repFolk / 80;
      if (local < 0) w *= 1.3;
      break;
    case 'peasant':
      w = 1.4 + state.repFolk / 100;
      break;
    case 'artisan':
      w = 1.1 + (state.repFolk + local) / 150;
      break;
    case 'merchant':
      w = 0.6 + state.repElite / 80 + Math.max(0, local) / 100;
      break;
    case 'noble':
      w = 0.15 + state.repElite / 60 + Math.max(0, local - 20) / 80;
      if (local < 15) w *= 0.25;
      if (localRank(local) === 'disgraced') w *= 0.05;
      break;
    case 'soldier':
      w = 0.7 + state.repFame / 100;
      break;
    case 'clergy':
      w = 0.5 + state.repElite / 120 - state.churchHeat / 200;
      break;
  }
  return Math.max(0.05, w);
}

/** Pay multiplier from elite fame + local renown */
export function reputationPayMult(state: GameState, patientClass: PatientClass): number {
  ensureReputation(state);
  const local = state.reputation[state.locationId] ?? 0;
  let m = 1 + Math.max(0, local) * 0.004;
  if (patientClass === 'noble' || patientClass === 'merchant') {
    m *= 1 + state.repElite * 0.005;
  }
  if (patientClass === 'beggar') {
    m *= 0.9; // still little coin
  }
  m *= 1 + state.repFame * 0.002;
  // Disgrace: even successes pay poorly — people haggle or refuse full fee
  if (local < -10) m *= 0.75;
  return m;
}

/** Mentor discount from fame */
export function mentorCostMult(state: GameState): number {
  ensureReputation(state);
  return Math.max(0.55, 1 - state.repFame * 0.004);
}

/** Staff hiring loyalty bonus from folk standing */
export function folkLoyaltyBonus(state: GameState): number {
  ensureReputation(state);
  return Math.floor(state.repFolk / 20);
}

/** Elite threshold for political offices (historical: favour of council & guild) */
export function eliteForOffice(office: string): number {
  switch (office) {
    case 'quarter_warden':
      return 20;
    case 'guild_elder':
      return 30;
    case 'city_surgeon':
      return 45;
    case 'council_seat':
      return 55;
    default:
      return 0;
  }
}

export function fameForTitle(title: string): number {
  switch (title) {
    case 'freeman':
      return 5;
    case 'master_bader':
      return 15;
    case 'honorable':
      return 30;
    case 'noble_surgeon':
      return 50;
    default:
      return 0;
  }
}

export function reputationSummaryKeys(state: GameState): {
  localKey: string;
  folk: number;
  elite: number;
  fame: number;
  local: number;
} {
  ensureReputation(state);
  const local = state.reputation[state.locationId] ?? 0;
  return {
    localKey: localRankKey(local),
    folk: Math.round(state.repFolk),
    elite: Math.round(state.repElite),
    fame: Math.round(state.repFame),
    local: Math.round(local),
  };
}

/** Human-readable effect lines for scenario UI */
export function describeRepEffects(effects: {
  coin?: number;
  ethics?: number;
  folk?: number;
  elite?: number;
  fame?: number;
  local?: number;
  guildFavor?: number;
  churchHeat?: number;
}): string[] {
  const lines: string[] = [];
  if (effects.coin) lines.push(`coin:${effects.coin > 0 ? '+' : ''}${effects.coin}`);
  if (effects.folk) lines.push(`folk:${effects.folk > 0 ? '+' : ''}${Math.round(effects.folk)}`);
  if (effects.elite) lines.push(`elite:${effects.elite > 0 ? '+' : ''}${Math.round(effects.elite)}`);
  if (effects.fame) lines.push(`fame:${effects.fame > 0 ? '+' : ''}${Math.round(effects.fame)}`);
  if (effects.local) lines.push(`local:${effects.local > 0 ? '+' : ''}${Math.round(effects.local)}`);
  if (effects.ethics) lines.push(`ethics:${effects.ethics > 0 ? '+' : ''}${effects.ethics}`);
  if (effects.guildFavor) lines.push(`guild:${effects.guildFavor > 0 ? '+' : ''}${effects.guildFavor}`);
  if (effects.churchHeat) lines.push(`church:${effects.churchHeat > 0 ? '+' : ''}${effects.churchHeat}`);
  return lines;
}
