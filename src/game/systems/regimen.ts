/**
 * Deferred care plans.
 *
 * These model the regimen literature around a medieval bath-house: fresh
 * linen, rest, diet and the management of supposedly corrupt air. They are
 * deliberately not represented as modern diagnoses or guaranteed cures.
 */
import type { CarePlan, GameState, Inventory, PatientInstance, RegimenId } from '../types';
import { addJournal } from './journal';
import { atLeast, firstUnmet, must, type Requirement } from './requirements';

export interface RegimenDefinition {
  id: RegimenId;
  labelKey: string;
  bodyKey: string;
  costItems: Partial<Inventory>;
  minEye: number;
  minTongue: number;
  templateIds: string[];
  needsPestArt?: boolean;
}

export const REGIMENS: RegimenDefinition[] = [
  {
    id: 'pest_regimen',
    labelKey: 'regimen_pest_title',
    bodyKey: 'regimen_pest_body',
    costItems: { herbs: 1, soap: 1, linen: 1 },
    minEye: 3,
    minTongue: 2,
    templateIds: ['plague_like'],
    needsPestArt: true,
  },
  {
    id: 'rest_diet',
    labelKey: 'regimen_rest_title',
    bodyKey: 'regimen_rest_body',
    costItems: { herbs: 1, linen: 1 },
    minEye: 2,
    minTongue: 2,
    templateIds: ['fever_blood', 'child_fever', 'flux', 'melancholy', 'cold_phlegm'],
  },
  {
    id: 'bath_linen',
    labelKey: 'regimen_bath_title',
    bodyKey: 'regimen_bath_body',
    costItems: { soap: 1, linen: 1, wood: 1 },
    minEye: 1,
    minTongue: 1,
    templateIds: ['barber_itch_chin', 'scabies', 'ringworm', 'sores'],
  },
];

export const REGIMEN_MAP = Object.fromEntries(REGIMENS.map((r) => [r.id, r])) as Record<RegimenId, RegimenDefinition>;

function hasItems(state: GameState, costs: Partial<Inventory>): boolean {
  return Object.entries(costs).every(([key, value]) =>
    state.inventory[key as keyof Inventory] >= (value ?? 0),
  );
}

function spendItems(state: GameState, costs: Partial<Inventory>): void {
  for (const [key, value] of Object.entries(costs)) {
    const item = key as keyof Inventory;
    state.inventory[item] = Math.max(0, state.inventory[item] - (value ?? 0));
  }
}

export function canStartRegimen(
  state: GameState,
  patient: PatientInstance,
  regimenId: RegimenId,
): Requirement {
  const regimen = REGIMEN_MAP[regimenId];
  if (!regimen) return { ok: false, reasonKey: 'req_unknown' };
  return firstUnmet(
    must(regimen.templateIds.includes(patient.templateId), 'req_regimen_unsuited'),
    must(!regimen.needsPestArt || state.unlockedTechniques.includes('hygiene_clean'), 'req_regimen_learning'),
    atLeast('req_eye', state.stats.eye, regimen.minEye),
    atLeast('req_tongue', state.stats.tongue, regimen.minTongue),
    must(hasItems(state, regimen.costItems), 'req_regimen_supplies'),
  );
}

/** Starts a plan without saving. The caller owns the patient queue and UI flow. */
export function startRegimen(
  state: GameState,
  patient: PatientInstance,
  regimenId: RegimenId,
): CarePlan | null {
  const req = canStartRegimen(state, patient, regimenId);
  if (!req.ok) return null;
  const regimen = REGIMEN_MAP[regimenId];
  spendItems(state, regimen.costItems);
  const plan: CarePlan = {
    id: `care-${state.day}-${patient.uid}-${regimenId}`,
    regimenId,
    patientUid: patient.uid,
    patientName: patient.name,
    patientClass: patient.class,
    templateId: patient.templateId,
    complaintKey: patient.complaintKey,
    dueDay: state.day + 1,
    fit: regimen.templateIds.includes(patient.templateId),
  };
  state.carePlans ??= [];
  state.carePlans.push(plan);
  state.storyFlags['regimen_started_today'] = regimenId;
  addJournal(state, 'journal_regimen_started', 'business', { name: patient.name });
  return plan;
}

/** Stable pseudo-roll: test runs and save imports resolve the same plan alike. */
function planRoll(plan: CarePlan): number {
  let hash = 2166136261;
  const input = `${plan.id}:${plan.dueDay}`;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0xffffffff;
}

export interface RegimenResolution {
  plan: CarePlan;
  outcome: 'steadier' | 'unchanged' | 'worse';
}

/** Resolve only when the next day's doors are opened. */
export function resolveDueRegimens(state: GameState): RegimenResolution[] {
  const due = (state.carePlans ?? []).filter((plan) => plan.dueDay <= state.day);
  if (!due.length) return [];
  const outcomes = due.map((plan) => {
    const chance = Math.min(0.86, (plan.fit ? 0.5 : 0.2) + state.stats.eye * 0.035 + state.stats.tongue * 0.02);
    const roll = planRoll(plan);
    const outcome: RegimenResolution['outcome'] = roll < chance ? 'steadier' : roll > 0.92 ? 'worse' : 'unchanged';
    if (outcome === 'steadier') {
      state.reputation[state.locationId] = (state.reputation[state.locationId] ?? 0) + 1;
      state.ethics = Math.min(100, state.ethics + 1);
      addJournal(state, 'journal_regimen_steadier', 'business', { name: plan.patientName });
    } else if (outcome === 'worse') {
      state.reputation[state.locationId] = (state.reputation[state.locationId] ?? 0) - 1;
      addJournal(state, 'journal_regimen_worse', 'business', { name: plan.patientName });
    } else {
      addJournal(state, 'journal_regimen_unchanged', 'business', { name: plan.patientName });
    }
    return { plan, outcome };
  });
  state.carePlans = (state.carePlans ?? []).filter((plan) => plan.dueDay > state.day);
  state.storyFlags['regimen_resolved'] = outcomes.map((x) => `${x.plan.regimenId}:${x.outcome}`).join(',');
  return outcomes;
}
