/**
 * Difficulty curve for the steady-hand minigame.
 *
 * Deliberately free of Phaser so it can be unit-tested directly — `ui/skillcheck.ts`
 * owns the presentation and imports these.
 *
 * Two properties matter and are asserted in `tests/balance.test.ts`:
 *  - **Skill must help.** The original implementation had `speed = 0.012 +
 *    hand * 0.001`, so training your character made the check *harder*.
 *  - **Difficulty must scale.** The green zone was a fixed 16% of the track for
 *    every technique and patient, so a shave and a cataract couching felt the
 *    same.
 */

export interface SkillCheckParams {
  /** Player Hand stat, 0-10. */
  hand: number;
  /** Technique risk, 0..1 — higher is harder. */
  risk: number;
  /** Patient severity, 1-5. */
  severity: number;
  /** Label shown above the track. */
  techniqueLabel: string;
  /** Optional technique id — selects a painted backdrop when one exists. */
  techniqueId?: string;
}

/** Green-zone width as a fraction of the track. */
export function greenZoneWidth(p: SkillCheckParams): number {
  const skill = Math.max(0, Math.min(10, p.hand)) / 10;
  // 10% base, up to +14% from skill, shrunk by technique risk and severity.
  const base = 0.1 + skill * 0.14;
  const penalty = p.risk * 0.18 + (p.severity - 1) * 0.012;
  // Floor of 7%: below that the target is narrower than the marker is wide and
  // the check stops being a test of skill.
  return Math.max(0.07, Math.min(0.34, base - penalty));
}

/** Marker travel per tick. Lower is easier — so skill reduces it. */
export function markerSpeed(p: SkillCheckParams): number {
  const skill = Math.max(0, Math.min(10, p.hand)) / 10;
  const base = 0.019 - skill * 0.008; // steadier hands, slower sweep
  const harder = p.risk * 0.006 + (p.severity - 1) * 0.0008;
  return Math.max(0.005, base + harder);
}
