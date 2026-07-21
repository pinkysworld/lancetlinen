/**
 * How much world is actually on screen.
 *
 * ## The problem
 *
 * The game draws 16:9 and `Phaser.Scale.FIT` preserves that, so on any screen
 * that is not 16:9 the canvas is letterboxed. On an iPad in Safari the usable
 * viewport measures roughly 2.8:1 once the tab strip and toolbar are taken
 * off, and the game sat in a box in the middle of a large dark field.
 * Reported from play as "zoom works but it stays in this box — the whole
 * screen would be better".
 *
 * ## The approach
 *
 * Not `Scale.ENVELOP`, which fills the screen by cropping — the UI runs to the
 * edges of the design space and would lose its corners. Not `Scale.RESIZE`
 * either, which hands the scenes an arbitrary size and would mean rewriting
 * roughly 570 hard-coded coordinates.
 *
 * Instead: **widen the canvas to the device's shape and keep the 1280×720
 * design band centred in it.** Every existing layout still lands exactly where
 * it did; the extra width to left and right is filled by the backgrounds,
 * which now cover the visible rect rather than the design rect. Nothing is
 * cropped, nothing moves, and the bars are gone.
 *
 * The height is what stays fixed at 720 world units, because that is the axis
 * every layout is tight against.
 */
import { GAME_HEIGHT, GAME_WIDTH } from '../types';

/**
 * Widest shape we will stretch the canvas to.
 *
 * Past this the design band becomes an island in a very long field and the
 * backgrounds are stretched further than the source art bears. A phone in
 * landscape is about 2.17:1, so this covers real devices with room to spare
 * and still refuses the pathological case of a 32:9 desktop window.
 */
export const MAX_ASPECT = 3.0;

/** Narrowest — the design ratio itself. Never letterbox *inside* the canvas. */
export const MIN_ASPECT = GAME_WIDTH / GAME_HEIGHT;

/**
 * The canvas aspect to request for the current window.
 *
 * Called once at boot and again on rotate. Falls back to the design ratio
 * where there is no window at all (tests, headless).
 */
export function targetAspect(): number {
  if (typeof window === 'undefined') return MIN_ASPECT;
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (!w || !h) return MIN_ASPECT;
  return Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, w / h));
}

/**
 * Visible world width, in design units.
 *
 * 1280 on a 16:9 screen, up to 1728 at the widest. The design band is always
 * the middle 1280 of it.
 */
export function viewWidth(): number {
  // Rounded to an even number so `(GAME_WIDTH - viewWidth) / 2` is exact.
  // With plain rounding the two margins could differ by a pixel, which puts
  // the design band half a pixel off centre — invisible, but it means every
  // hard-coded coordinate is very slightly wrong, and that is not a property
  // worth giving up to save an arithmetic step.
  return 2 * Math.round((GAME_HEIGHT * targetAspect()) / 2);
}

/** World x of the left edge of the screen. Zero or negative. */
export function viewLeft(): number {
  return Math.round((GAME_WIDTH - viewWidth()) / 2);
}

/** World x of the right edge. */
export function viewRight(): number {
  return viewLeft() + viewWidth();
}

/**
 * The whole visible rect, for anything that must reach the edges — chiefly the
 * backgrounds. UI keeps working in `GAME_WIDTH`/`GAME_HEIGHT` and stays
 * centred, which is the point of the split.
 */
export function viewRect(): { x: number; y: number; width: number; height: number } {
  return { x: viewLeft(), y: 0, width: viewWidth(), height: GAME_HEIGHT };
}
