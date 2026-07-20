/**
 * Honour — *Ehrlichkeit*.
 *
 * The central social fact of the trade, and until now entirely absent. Baders
 * and barber-surgeons were widely counted among the *unehrliche Leute*: barred
 * from guilds, from giving testimony, from civic office, their children
 * sometimes refused apprenticeships. The trade petitioned against this for two
 * centuries; only the Reichspolizeiordnung of 1548 declared them honourable.
 *
 * In 1382 the question is live and **cannot be won outright** — the player can
 * only navigate it. That is deliberate: honour is capped below the point where
 * the town simply forgets what you are, and the highest bracket is "tolerated",
 * not "respected".
 *
 * Mechanically this is the spine that ties four previously separate menus
 * together. Guild entry, marriage into an artisan family and civic office all
 * gate on it, so the profitable choice and the respectable one pull apart.
 */
import type { GameState, PatientClass } from '../types';
import { addJournal } from './journal';
import { pressureMult } from './settings';

/** Honour runs 0..100 but is *practically* capped — see HONOUR_CEILING. */
export const HONOUR_MIN = 0;
export const HONOUR_MAX = 100;

/**
 * A Bader cannot become fully honourable in 1382.
 *
 * Reaching the ceiling represents being tolerated and quietly employed, not
 * accepted. The remaining gap is the point of the setting.
 */
export const HONOUR_CEILING = 82;

export const HONOUR_START = 30;

export type HonourRank = 'infamous' | 'dishonourable' | 'suspect' | 'tolerated' | 'respected';

const RANK_THRESHOLDS: Array<[HonourRank, number]> = [
  ['respected', 70],
  ['tolerated', 50],
  ['suspect', 30],
  ['dishonourable', 12],
  ['infamous', 0],
];

export function honour(state: GameState): number {
  return state.honour ?? HONOUR_START;
}

export function honourRank(state: GameState): HonourRank {
  const h = honour(state);
  for (const [rank, min] of RANK_THRESHOLDS) {
    if (h >= min) return rank;
  }
  return 'infamous';
}

export function honourRankKey(state: GameState): string {
  return `honour_${honourRank(state)}`;
}

/**
 * Adjust honour, clamped to the era's ceiling.
 *
 * `reasonKey` is journalled when the change is large enough to notice, so the
 * player can see *why* the town's opinion moved rather than watching a silent
 * number.
 */
export function addHonour(state: GameState, delta: number, reasonKey?: string): void {
  const before = honour(state);
  // Losses scale with difficulty; gains do not, so a merciful town forgives
  // faster without making a good name meaningless to earn.
  const scaled = delta < 0 ? delta * pressureMult() : delta;
  const next = Math.max(HONOUR_MIN, Math.min(HONOUR_CEILING, before + scaled));
  state.honour = next;

  const crossed = rankOf(before) !== rankOf(next);
  if (reasonKey && (Math.abs(delta) >= 3 || crossed)) {
    addJournal(state, reasonKey, 'politics');
  }
  if (crossed) {
    addJournal(state, 'journal_honour_changed', 'politics', {
      rank: `honour_${rankOf(next)}`,
    });
  }
}

function rankOf(value: number): HonourRank {
  for (const [rank, min] of RANK_THRESHOLDS) {
    if (value >= min) return rank;
  }
  return 'infamous';
}

/* ------------------------------------------------------------------ *
 * Sources of honour
 * ------------------------------------------------------------------ */

/**
 * Honour movement from a treatment.
 *
 * Killing a patient is the sharpest loss — a Bader with deaths behind him is
 * exactly what the guilds pointed at. Treating the poor for little is the
 * steadiest gain, which is what makes the charitable path viable but slow.
 */
export function honourFromTreatment(
  state: GameState,
  patientClass: PatientClass,
  kind: 'success' | 'partial' | 'fail' | 'death',
): void {
  if (kind === 'death') {
    const noble = patientClass === 'noble' || patientClass === 'clergy';
    addHonour(state, noble ? -8 : -4, 'journal_honour_death');
    return;
  }
  if (kind === 'fail') {
    addHonour(state, -1);
    return;
  }
  if (kind === 'success') {
    // Serving the poor well is what earns a name for honest dealing.
    const poor = patientClass === 'beggar' || patientClass === 'peasant';
    addHonour(state, poor ? 0.8 : 0.3);
  }
}

/** Working on a Sunday or a feast day was prohibited, and noticed. */
export function honourFromWorkingHolyDay(state: GameState): void {
  addHonour(state, -2, 'journal_honour_holy_day');
}

/** Alms and charity — the standard route back to respectability. */
export function honourFromCharity(state: GameState, generous = false): void {
  addHonour(state, generous ? 4 : 1.5, generous ? 'journal_honour_alms' : undefined);
}

/** Bribery, when it is discovered. */
export function honourFromScandal(state: GameState, severe = false): void {
  addHonour(state, severe ? -10 : -5, 'journal_honour_scandal');
}

/** Serving through a plague was the one thing that reliably redeemed the trade. */
export function honourFromPlagueService(state: GameState): void {
  addHonour(state, 3, 'journal_honour_plague');
}

/* ------------------------------------------------------------------ *
 * Gates
 * ------------------------------------------------------------------ */

export const GUILD_HONOUR_REQUIRED = 45;
export const OFFICE_HONOUR_REQUIRED = 60;
export const MARRIAGE_HONOUR_REQUIRED = 40;

export interface HonourGate {
  ok: boolean;
  required: number;
  current: number;
}

function gate(state: GameState, required: number): HonourGate {
  const current = honour(state);
  return { ok: current >= required, required, current };
}

/** Guilds refused the dishonourable outright. */
export function canJoinGuild(state: GameState): HonourGate {
  return gate(state, GUILD_HONOUR_REQUIRED);
}

/** Civic office was closed to a man of doubtful standing. */
export function canHoldOffice(state: GameState): HonourGate {
  return gate(state, OFFICE_HONOUR_REQUIRED);
}

/**
 * Marrying into an artisan family.
 *
 * Courtship previously could not fail — it was a progress bar with fixed costs
 * and fixed gains. An *unehrlich* suitor was refused, and that refusal is the
 * most personal way the setting's central problem reaches the player.
 */
export function canMarry(state: GameState): HonourGate {
  return gate(state, MARRIAGE_HONOUR_REQUIRED);
}

/**
 * Daily drift.
 *
 * Reputation for honest dealing decays slowly toward the trade's baseline —
 * the town's default assumption about a Bader — so honour has to be maintained
 * rather than banked once.
 */
export function tickHonour(state: GameState): void {
  const h = honour(state);
  const baseline = HONOUR_START;
  if (h > baseline) state.honour = Math.max(baseline, h - 0.15);
  else if (h < baseline) state.honour = Math.min(baseline, h + 0.05);
}
