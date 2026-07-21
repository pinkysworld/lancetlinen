/**
 * The Lepraschau — the examination for leprosy.
 *
 * ## Why this is here
 *
 * `HISTORY_AUDIT.md` named it the single best missing addition, and it is: the
 * *Lepraschau* was frequently a Bader's duty, ordered by the council, and it
 * is the one thing the trade did that was not treatment at all. It was a
 * **judgement**. A man was brought before you, you looked at him, and you said
 * whether he might stay among people or must go to the leper house outside the
 * walls and be dead in law while living.
 *
 * That makes it the only place in the game where the player is asked to be
 * *right* rather than skilful — and where being wrong in one direction costs
 * an innocent his life among men, and in the other lets a sick man stay.
 *
 * ## What the examiners actually looked for
 *
 * The medieval *signa leprae* are well documented, and the good ones are
 * genuinely diagnostic of what we now call Hansen's disease:
 *
 *  - **loss of sensation** in the skin, tested by pricking — the single most
 *    reliable sign then and now;
 *  - **hoarseness**, the voice gone rough as the larynx is involved;
 *  - **loss of the eyebrows**, and the thickened, lion-like face;
 *  - nodules, and ulcers that do not hurt.
 *
 * And the bad ones, which were also used: dark urine, a "heavy" look, blood
 * that granulated in water. Those carried real authority and no information —
 * which is exactly the interesting part, because the player cannot tell which
 * is which except by learning.
 *
 * So: **five signs, three of them meaningful, two of them noise.** The player
 * gathers what their training allows and decides. A Bader who knows how to
 * palpate can test sensation, which is the sign that actually settles it.
 */
import type { GameState } from '../types';
import { addFacetRep } from './reputation';
import { addHonour } from './honour';
import { addJournal } from './journal';
import { canExamine } from '../data/examinations';

/* ------------------------------------------------------------------ *
 * The signs
 * ------------------------------------------------------------------ */

export interface LepraSign {
  id: string;
  /**
   * Whether the sign is real evidence.
   *
   * The false ones are not filler: they are what the period actually used
   * alongside the true ones, and telling them apart is the skill.
   */
  diagnostic: boolean;
  /** Examination that reveals it — the player must have been taught it. */
  needs: 'inspect' | 'palpate' | 'tongue' | 'uroscopy';
}

export const LEPRA_SIGNS: LepraSign[] = [
  // The true signs.
  { id: 'insensitive', diagnostic: true, needs: 'palpate' },
  { id: 'hoarse', diagnostic: true, needs: 'inspect' },
  { id: 'browless', diagnostic: true, needs: 'inspect' },
  // The signs the period trusted and should not have.
  { id: 'dark_urine', diagnostic: false, needs: 'uroscopy' },
  { id: 'heavy_look', diagnostic: false, needs: 'tongue' },
];

export type LepraVerdict = 'clean' | 'leprous' | 'defer';

export interface LepraCase {
  /** The name of the person brought before you. */
  name: string;
  /** The truth. Never shown; only the signs are. */
  afflicted: boolean;
  /** Which signs this person actually presents. */
  present: string[];
}

/**
 * Build a case.
 *
 * An afflicted man shows most of the true signs; a healthy one shows none of
 * them, but may well show the false ones — that is the trap, and it is the
 * historical one. Someone with a hoarse voice and dark water was condemned on
 * exactly this reasoning.
 */
export function makeLepraCase(name: string, afflicted: boolean, roll = Math.random): LepraCase {
  const present: string[] = [];
  for (const sign of LEPRA_SIGNS) {
    if (sign.diagnostic) {
      // An early case does not show everything.
      if (afflicted && roll() < 0.75) present.push(sign.id);
    } else {
      // The misleading signs are as common in the healthy as in the sick.
      if (roll() < 0.45) present.push(sign.id);
    }
  }
  return { name, afflicted, present };
}

/** Signs the player's training lets them look for at all. */
export function readableSigns(state: GameState): LepraSign[] {
  return LEPRA_SIGNS.filter((s) => canExamine(state, s.needs).ok);
}

/**
 * What this Bader can actually see of this case.
 *
 * A player who was never taught to palpate cannot test sensation, and so
 * cannot reach the one sign that settles it — they must judge on appearance
 * and hearsay, which is precisely the position most examiners were in.
 */
export function visibleSigns(state: GameState, c: LepraCase): string[] {
  const can = new Set(readableSigns(state).map((s) => s.id));
  return c.present.filter((id) => can.has(id));
}

/* ------------------------------------------------------------------ *
 * The judgement
 * ------------------------------------------------------------------ */

export interface LepraOutcome {
  /** Was the verdict correct? `null` when the player deferred. */
  correct: boolean | null;
  messageKey: string;
  coin: number;
}

/** The council's fee for sitting in judgement. Paid whatever you decide. */
export const LEPRASCHAU_FEE = 18;

/**
 * Resolve a verdict.
 *
 * The asymmetry is deliberate and is the whole point of the mechanic. Sending
 * a healthy man to the leper house is the heavier error: it was a civil death,
 * and when it came out the examiner was blamed. Letting a sick man stay is
 * quieter and worse for the town, and it surfaces later.
 *
 * Deferring is always available, costs the fee, and is not free of judgement
 * either — a Bader who will not say is a Bader the council stops asking.
 */
export function resolveLepraschau(
  state: GameState,
  c: LepraCase,
  verdict: LepraVerdict,
): LepraOutcome {
  state.coin += LEPRASCHAU_FEE;

  if (verdict === 'defer') {
    state.councilFavor = Math.max(0, state.councilFavor - 2);
    addJournal(state, 'journal_lepra_defer', 'politics', { name: c.name });
    return { correct: null, messageKey: 'lepra_deferred', coin: LEPRASCHAU_FEE };
  }

  const correct = (verdict === 'leprous') === c.afflicted;

  if (correct) {
    state.councilFavor += 4;
    addFacetRep(state, { elite: 2, local: 2, fame: 0.6 });
    addHonour(state, 1.5);
    addJournal(state, 'journal_lepra_right', 'politics', { name: c.name });
    return {
      correct: true,
      messageKey: verdict === 'leprous' ? 'lepra_right_sent' : 'lepra_right_cleared',
      coin: LEPRASCHAU_FEE,
    };
  }

  if (verdict === 'leprous') {
    // A healthy man sent out. The heavier error, and the one people remember.
    state.councilFavor = Math.max(0, state.councilFavor - 3);
    addFacetRep(state, { folk: -6, local: -4, elite: -2 });
    addHonour(state, -4, 'journal_lepra_wrong_sent');
    addJournal(state, 'journal_lepra_wrong_sent', 'politics', { name: c.name });
    return { correct: false, messageKey: 'lepra_wrong_sent', coin: LEPRASCHAU_FEE };
  }

  // A sick man left among people. Quieter, and it comes back.
  state.storyFlags['lepra_missed'] = Number(state.storyFlags['lepra_missed'] ?? 0) + 1;
  state.councilFavor = Math.max(0, state.councilFavor - 2);
  addFacetRep(state, { elite: -3, local: -2 });
  addJournal(state, 'journal_lepra_wrong_cleared', 'politics', { name: c.name });
  return { correct: false, messageKey: 'lepra_wrong_cleared', coin: LEPRASCHAU_FEE };
}

/**
 * Is the player trusted with this at all?
 *
 * The council did not call a stranger. Some standing with them is the price of
 * being asked, which also keeps the duty out of the opening hours of the game
 * when the player has no way to judge.
 */
export function canBeCalledToLepraschau(state: GameState): boolean {
  return state.councilFavor >= 8 && state.totalTreated >= 10;
}
