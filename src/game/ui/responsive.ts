/**
 * Compact layout, for phones.
 *
 * ## The measurement this exists to answer
 *
 * The world is 1280x720 and Phaser FIT-scales it. On an iPhone held landscape
 * with Safari's bars showing — roughly 844x320 of usable viewport — that scale
 * is **0.54**, so a 13px label renders at 7 real pixels. Measured, not
 * estimated. Pinch-zoom fixes the reading but not the reaching: the player has
 * to zoom, pan, tap, zoom out, repeat.
 *
 * ## Why not a second set of scenes
 *
 * ~130 hard-coded coordinates across 20 scenes. Duplicating them would double
 * the surface area of every future change and guarantee the two drift apart —
 * this project has already produced five bugs of the "written but never
 * reached" kind, and a parallel layout tree is a factory for them.
 *
 * Instead: one query, `compact()`, and helpers that return *different numbers*
 * for the same anchor. A scene asks "how wide is a primary button" rather than
 * writing 340, and gets an answer that suits the device. Scenes that have not
 * been converted are unaffected.
 *
 * ## What compact mode actually changes
 *
 * Fewer things on screen, each one bigger. Not a rescale — a phone screen at
 * arm's length has roughly a third of the usable information density of a
 * monitor, so the compact layouts drop secondary information rather than
 * shrinking it.
 */
import { GAME_HEIGHT, GAME_WIDTH } from '../types';
import { isTouchDevice } from '../mobile';
import { settings } from '../systems/settings';

/** Apple's comfortable touch target, expressed in real CSS pixels. */
export const MIN_TOUCH_CSS = 44;

/**
 * Convert a physical CSS-pixel minimum into the current world coordinate
 * system. At 844×320, for example, one world unit is only 0.44 CSS pixels.
 */
export function worldForCss(cssPixels: number): number {
  return Math.ceil(cssPixels / Math.max(worldScale(), 0.1));
}

/** Minimum button height in world units when compact mode is active. */
export function touchTargetHeight(): number {
  return compact() ? Math.max(46, worldForCss(MIN_TOUCH_CSS)) : 46;
}

/**
 * Is this a screen that needs the compact treatment?
 *
 * Touch alone is not the test — a tablet in landscape has plenty of room and
 * reads the standard layout fine. What matters is how many real pixels one
 * world unit gets, which is what actually decided legibility in the
 * measurements above.
 *
 * Re-evaluated on every call rather than cached, because orientation changes
 * and Safari's bars appearing or hiding both move this line.
 */
export function compact(): boolean {
  if (typeof window === 'undefined') return false;

  // An explicit choice always wins. Detection is good but not infallible, and
  // a player stuck with an unreadable layout needs a way out that does not
  // depend on me having guessed their device correctly.
  const mode = settings().compactMode;
  if (mode === 'on') return true;
  if (mode === 'off') return false;

  if (!isTouchDevice()) return false;
  // A 40–46 world-unit desktop button falls below Apple's 44px target on an
  // iPad whose canvas is even slightly FIT-scaled. Compact mode keeps every
  // touch target real-size-first there too; non-touch desktop browsers retain
  // the denser layout.
  return worldScale() < 1.1;
}

/** Real CSS pixels per world unit, as Phaser's FIT scaling will apply them. */
export function worldScale(): number {
  if (typeof window === 'undefined') return 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (!w || !h) return 1;
  return Math.min(w / GAME_WIDTH, h / GAME_HEIGHT);
}

/* ------------------------------------------------------------------ *
 * Type
 * ------------------------------------------------------------------ */

/**
 * Font size for a role, in world units.
 *
 * Compact sizes are *larger* in world units, which is the whole point: the
 * world is being scaled down, so a label must be bigger in world space to
 * arrive at the same size on glass.
 */
export type TextRole = 'title' | 'heading' | 'body' | 'small' | 'button';

export function fontFor(role: TextRole): string {
  if (!compact()) {
    switch (role) {
      case 'title': return '28px';
      case 'heading': return '18px';
      case 'body': return '14px';
      case 'small': return '12px';
      case 'button': return '15px';
    }
  }

  // These are minima in both world and physical space. Keeping the physical
  // floor is the important part: a 21px world-space button label used to be
  // 9px on Safari with its landscape browser bars visible.
  const cssFloor: Record<TextRole, number> = {
    title: 22,
    heading: 17,
    body: 15,
    small: 13,
    button: 15,
  };
  const worldFloor: Record<TextRole, number> = {
    title: 36,
    heading: 28,
    body: 26,
    small: 22,
    button: 26,
  };
  return `${Math.max(worldFloor[role], worldForCss(cssFloor[role]))}px`;
}

/* ------------------------------------------------------------------ *
 * Controls
 * ------------------------------------------------------------------ */

/** Primary action button size. */
export function primarySize(): { width: number; height: number } {
  return compact() ? { width: 680, height: touchTargetHeight() } : { width: 340, height: 46 };
}

/** Secondary / grid button size. */
export function secondarySize(): { width: number; height: number } {
  return compact() ? { width: 520, height: touchTargetHeight() } : { width: 208, height: 40 };
}

/** How many buttons fit across a row. */
export function gridColumns(): number {
  return compact() ? 2 : 3;
}

/** Vertical pitch between stacked rows. */
export function rowPitch(): number {
  return compact() ? touchTargetHeight() + 14 : 48;
}

/* ------------------------------------------------------------------ *
 * Structure
 * ------------------------------------------------------------------ */

/** Gutter from the canvas edge. Wider on a phone, for thumbs and notches. */
export function gutter(): number {
  return compact() ? 60 : 40;
}

/** Usable width between gutters. */
export function contentW(): number {
  return GAME_WIDTH - gutter() * 2;
}

/** Column centres for the current grid width. */
export function gridColumnsX(): number[] {
  const n = gridColumns();
  const w = contentW();
  const colW = w / n;
  return Array.from({ length: n }, (_, i) => gutter() + colW / 2 + i * colW);
}

/**
 * How many list rows fit between two y bounds.
 *
 * Compact rows are taller, so a list that showed twelve entries on a monitor
 * shows five on a phone — which is correct. Paging through five readable rows
 * beats squinting at twelve.
 */
export function rowsThatFit(top: number, bottom: number): number {
  return Math.max(2, Math.floor((bottom - top) / rowPitch()));
}

/** Centre of the canvas, for convenience. */
export const CENTRE_X = GAME_WIDTH / 2;
export const CENTRE_Y = GAME_HEIGHT / 2;
