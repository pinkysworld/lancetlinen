/**
 * Why an action is refused — in words, with the numbers.
 *
 * ## The defect this exists to end
 *
 * Twenty call sites across the scenes did this:
 *
 * ```ts
 * mutate((st) => buyProperty(st, kind));   // returns boolean. Discarded.
 * ```
 *
 * Every gated action in the game returned a bare `false` and every caller
 * threw it away, so a refusal was indistinguishable from a broken button. The
 * bathhouse upgrade screen was the worst case: eight buttons, none ever
 * disabled, several unreachable — and one (`level1`) that had no branch in
 * `upgradeProperty` at all and so could never have worked.
 *
 * Reported from play as "in Nürnberg I cannot buy a bathhouse and I don't know
 * why", "no error message appears when I lack fame", and "how do I repay the
 * Lombard?".
 *
 * ## The shape
 *
 * A `Requirement` is either satisfied, or carries a key and the two numbers
 * that matter: what is needed and what the player has. The UI can then say
 * *"Fame 15 needed, you have 5"* rather than going quiet.
 *
 * The rule this module enforces by convention: **an action never re-states its
 * own gate.** `applyForOffice` asks `canApplyForOffice` and applies; the
 * conditions live in exactly one place. Mirrored guards are how
 * `staffSkillBonus` drifted away from `treatment.ts` once already.
 */

/** Satisfied, or refused with a reason the player can read. */
export type Requirement =
  | { ok: true }
  | { ok: false; reasonKey: string; need?: number; have?: number };

export const MET: Requirement = { ok: true };

/** Refused, with no numbers to quote — a state, not a threshold. */
export function refuse(reasonKey: string): Requirement {
  return { ok: false, reasonKey };
}

/** Refused because a value is short of a threshold. */
export function short(reasonKey: string, need: number, have: number): Requirement {
  return { ok: false, reasonKey, need, have };
}

/**
 * The first unmet requirement, or satisfied.
 *
 * Order matters: list the checks in the order the player should hear them, so
 * "you need a licence" is reported before "you cannot afford it". Being told
 * the price when the real obstacle is a missing licence sends the player off
 * to earn coin they did not need.
 */
export function firstUnmet(...checks: Requirement[]): Requirement {
  for (const c of checks) {
    if (!c.ok) return c;
  }
  return MET;
}

/** Convenience: require a value to reach a threshold. */
export function atLeast(reasonKey: string, have: number, need: number): Requirement {
  return have >= need ? MET : short(reasonKey, need, have);
}

/** Convenience: require a condition to hold, with no numbers. */
export function must(condition: boolean, reasonKey: string): Requirement {
  return condition ? MET : refuse(reasonKey);
}
