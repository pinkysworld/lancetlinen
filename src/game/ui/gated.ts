/**
 * Buttons that say why they are refusing.
 *
 * The treatment screen already had the right idea — it appends "— need
 * supplies" or "— too unskilled" to a technique it cannot perform. Everywhere
 * else in the game a refused action was silent: the button either looked live
 * and did nothing, or went grey with no explanation.
 *
 * `gatedButton` generalises the treatment screen's pattern. Give it a
 * `Requirement` and it will:
 *
 *  - append a short reason to the label, so the obstacle is visible without
 *    interacting;
 *  - grey the button, so it does not look broken;
 *  - and, when tapped anyway, raise a toast with the full sentence including
 *    the numbers — "Fame 15 needed, you have 5".
 *
 * The numbers are the part that was missing everywhere. "Denied" teaches the
 * player nothing; "you have 5 of the 15 needed" tells them what to go and do.
 */
import type Phaser from 'phaser';
import { t } from '../i18n';
import { makeButton, type ButtonOpts } from './theme';
import { showToast } from './dialogs';
import type { Requirement } from '../systems/requirements';

/**
 * The full sentence, with figures where the requirement has them.
 *
 * `req_coin` with need 250 / have 109 becomes "You need 250 coin and have
 * 109." A requirement with no numbers falls back to its own sentence.
 */
export function explain(req: Requirement): string {
  if (req.ok) return '';
  if (req.need !== undefined && req.have !== undefined) {
    return t('req_short_of', {
      what: t(req.reasonKey),
      need: req.need,
      have: req.have,
    });
  }
  return t(req.reasonKey);
}

/** The compressed form that fits on a button face. */
export function shortReason(req: Requirement): string {
  if (req.ok) return '';
  return req.need !== undefined ? `${t(req.reasonKey)} ${req.need}` : t(req.reasonKey);
}

/**
 * A button that is honest about why it will not act.
 *
 * `onClick` runs only when the requirement is met, so callers cannot forget
 * to check — the previous convention was `mutate((st) => doThing(st))` with
 * the boolean result discarded, which is exactly how twenty actions came to
 * fail in silence.
 */
export function gatedButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  req: Requirement,
  onClick: () => void,
  opts: ButtonOpts = {},
): void {
  const full = req.ok ? label : `${label} — ${shortReason(req)}`;
  makeButton(
    scene,
    x,
    y,
    full,
    () => {
      if (!req.ok) {
        // Reachable via the keyboard even when greyed, and worth answering:
        // the short form on the face omits the player's own figure.
        showToast(scene, explain(req), '#b33a3a', 2800);
        return;
      }
      onClick();
    },
    { ...opts, disabled: !req.ok },
  );
}
