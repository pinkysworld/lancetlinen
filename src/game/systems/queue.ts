/**
 * The waiting room.
 *
 * Patients used to be generated one at a time inside `TreatmentScene`, so the
 * player never chose who to treat — "Next patient" produced whoever the RNG
 * happened to roll. Holding a small queue turns each pick into a triage
 * decision: the noble pays well but a death costs 15 reputation, the beggar
 * pays almost nothing but builds ethics, and the dying man may be beyond you.
 *
 * Kept in module state rather than `GameState` on purpose — it is derived,
 * regenerable, and putting patient objects in the save would change the save
 * schema for something that does not need to survive a reload. Losing the queue
 * on refresh just reseeds it from the same pool.
 */
import type { GameState, PatientInstance } from '../types';
import { generatePatient } from './treatment';
import { queueSizeFor } from './demand';

let queue: PatientInstance[] = [];
/** Which day/location the current queue belongs to, so we can detect staleness. */
let stamp = '';

function stampFor(state: GameState): string {
  return `${state.day}:${state.locationId}`;
}

/** Patients still to come today, including those already waiting. */
export function poolRemaining(state: GameState): number {
  return Math.max(0, Number(state.storyFlags['patients_remaining'] ?? 0));
}

/**
 * The patients currently visible in the waiting room.
 *
 * Tops the queue up to the day's queue size, bounded by how many patients are
 * actually left — the last customer of the day should appear alone, not as one
 * of five.
 */
export function getQueue(state: GameState): PatientInstance[] {
  const current = stampFor(state);
  if (current !== stamp) {
    queue = [];
    stamp = current;
  }

  const remaining = poolRemaining(state);
  if (remaining <= 0) {
    queue = [];
    return queue;
  }

  const want = Math.min(queueSizeFor(remaining), remaining);
  while (queue.length < want) {
    queue.push(generatePatient(state));
  }
  if (queue.length > want) {
    queue.length = want;
  }
  return queue;
}

/** Remove a patient once they have been seen, sent away, or refused. */
export function removeFromQueue(uid: string): void {
  queue = queue.filter((p) => p.uid !== uid);
}

/** Drop everything — new day, new town, or a fresh game. */
export function clearQueue(): void {
  queue = [];
  stamp = '';
}
