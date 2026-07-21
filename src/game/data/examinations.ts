/**
 * What a Bader can *look at*, and who taught him to.
 *
 * ## The gap this fills
 *
 * The player had three examinations — sight, pulse, urine — and every
 * character had all three from the first day regardless of where they came
 * from. So the six origins differed only in starting numbers, and the choice
 * on the character screen made no difference to how a patient was read.
 *
 * That is backwards for the period. Uroscopy was the signature act of
 * *learned* medicine — the matula, the glass flask, is the physician's
 * attribute in painting — and a bath-house apprentice would not have been
 * taught to read one. Palpation of the belly is a wound-surgeon's habit.
 * Inspection of the tongue and complexion is the folk healer's.
 *
 * ## The shape
 *
 * Each examination declares who begins with it and what else can grant it —
 * a mentor, a rank, a story flag. `availableExaminations` answers the only
 * question the UI asks. Nothing here is hidden: an examination the player
 * cannot yet perform is shown greyed with the reason, through the same
 * `Requirement` machinery as everything else, because a button that silently
 * is not there teaches nothing.
 */
import type { GameState } from '../types';
import { atLeast, firstUnmet, must, type Requirement } from '../systems/requirements';

export type ExaminationId = 'inspect' | 'pulse' | 'uroscopy' | 'palpate' | 'tongue';

export interface Examination {
  id: ExaminationId;
  /** Origins that begin knowing it. Empty means nobody starts with it. */
  origins: string[];
  /** Eye needed before the reading is worth anything at all. */
  minEye: number;
  /** Story flag that also grants it, if any. */
  grantFlag?: string;
  /** Which quality axis it reads — used to keep the set non-redundant. */
  reads: 'hot' | 'moist' | 'seat' | 'humor';
}

/**
 * The five.
 *
 * `inspect` and `pulse` are universal: looking at a patient and feeling the
 * wrist are what anyone in the trade did. The other three are taught.
 */
export const EXAMINATIONS: Examination[] = [
  {
    id: 'inspect',
    origins: ['bader_son', 'field_surgeon', 'monastery_scholar', 'journeyman', 'bath_widow', 'executioner_kin'],
    minEye: 0,
    reads: 'humor',
  },
  {
    id: 'pulse',
    origins: ['bader_son', 'field_surgeon', 'monastery_scholar', 'journeyman', 'bath_widow', 'executioner_kin'],
    minEye: 0,
    reads: 'hot',
  },
  {
    /*
     * The learned art. Only the cloister-taught begin with it; everyone else
     * must be shown by a master. This is the single biggest reason to seek
     * one out, and it is why the monastery scholar plays differently rather
     * than merely starting with different numbers.
     */
    id: 'uroscopy',
    origins: ['monastery_scholar'],
    minEye: 2,
    grantFlag: 'learned_uroscopy',
    reads: 'moist',
  },
  {
    /*
     * Feeling for the hardness, heat and tenderness of the belly and the
     * wound margin. The field surgeon's habit, and the executioner's kin knew
     * bodies too — for reasons the town preferred not to dwell on.
     */
    id: 'palpate',
    origins: ['field_surgeon', 'executioner_kin'],
    minEye: 0,
    grantFlag: 'learned_palpation',
    reads: 'seat',
  },
  {
    /*
     * Tongue, complexion and the smell of the breath. No book behind it; the
     * bath-house and the wise woman's kitchen taught it, and it is quick —
     * it costs nothing but tells less.
     */
    id: 'tongue',
    // The journeyman is here because the Wanderjahre were spent working in
    // other men's bath-houses across the Empire — he starts with no technique
    // of his own and would otherwise be the one origin with no way of reading
    // a patient beyond the two everybody has.
    origins: ['bath_widow', 'bader_son', 'journeyman'],
    minEye: 0,
    grantFlag: 'learned_tongue',
    reads: 'humor',
  },
];

export const EXAMINATION_MAP: Record<string, Examination> = Object.fromEntries(
  EXAMINATIONS.map((e) => [e.id, e]),
);

/**
 * May the player perform this examination, and if not, why not?
 *
 * Returns a `Requirement` like every other gate in the game, so the treatment
 * screen can grey the button and name the obstacle instead of hiding it. A
 * player who cannot read urine should learn that uroscopy exists and that a
 * master can teach it — that is a reason to travel, not a missing feature.
 */
export function canExamine(state: GameState, id: ExaminationId): Requirement {
  const ex = EXAMINATION_MAP[id];
  if (!ex) return { ok: false, reasonKey: 'req_unknown' };
  const taught =
    ex.origins.includes(state.originId ?? '') ||
    (ex.grantFlag ? !!state.storyFlags[ex.grantFlag] : false);
  return firstUnmet(
    must(taught, `req_untaught_${id}`),
    atLeast('req_eye', state.stats.eye, ex.minEye),
  );
}

/** Everything the player can actually do to a patient right now. */
export function availableExaminations(state: GameState): ExaminationId[] {
  return EXAMINATIONS.filter((e) => canExamine(state, e.id).ok).map((e) => e.id);
}

/** Where an untaught examination can be learned, for the refusal text. */
export const EXAMINATION_TEACHERS: Record<string, string> = {
  uroscopy: 'monastery_ebrach',
  palpate: 'war_camp',
  tongue: 'small_village',
};
