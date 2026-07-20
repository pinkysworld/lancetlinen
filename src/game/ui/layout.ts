/**
 * Layout anchors and grids.
 *
 * The game renders to a fixed 1280x720 design canvas that Phaser FIT-scales to
 * the viewport, so "responsive" here means *authoring* responsively rather than
 * reflowing at runtime: positions expressed as anchors and grids instead of the
 * magic numbers that were scattered through every scene.
 *
 * Two things this actually buys us:
 *  - Rows and columns are computed from a single pitch, so a change of button
 *    height can never silently overlap the next row (the bug that made the
 *    technique list unusable on touch).
 *  - `safeInset()` keeps HUD furniture clear of notches and home indicators,
 *    which FIT scaling alone does not handle.
 */
import { GAME_HEIGHT, GAME_WIDTH } from '../types';
import { isNarrowScreen } from '../mobile';

export const CANVAS = { w: GAME_WIDTH, h: GAME_HEIGHT } as const;

/** Standard gutter between panels and the canvas edge. */
export const GUTTER = 40;

export const CX = GAME_WIDTH / 2;
export const CY = GAME_HEIGHT / 2;

/**
 * Extra padding for device cutouts.
 *
 * The CSS `env(safe-area-inset-*)` values apply to the page, not the scaled
 * canvas, so anything hugging the canvas edge can still sit under a notch on a
 * landscape phone. Nudging inward costs nothing on desktop.
 */
export function safeInset(): number {
  return isNarrowScreen() ? 16 : 0;
}

export const left = (offset = GUTTER): number => offset + safeInset();
export const right = (offset = GUTTER): number => GAME_WIDTH - offset - safeInset();
export const top = (offset = GUTTER): number => offset + safeInset();
export const bottom = (offset = GUTTER): number => GAME_HEIGHT - offset - safeInset();

/** Width available between the left and right gutters. */
export function contentWidth(gutter = GUTTER): number {
  return right(gutter) - left(gutter);
}

/**
 * Evenly spaced column centres across a span.
 *
 * `columns(3, 40, 1200)` → the centres of three equal columns filling that span.
 */
export function columns(count: number, x: number, width: number, gap = 20): number[] {
  const colW = (width - gap * (count - 1)) / count;
  return Array.from({ length: count }, (_, i) => x + colW / 2 + i * (colW + gap));
}

/** Width of one column produced by `columns()` with the same arguments. */
export function columnWidth(count: number, width: number, gap = 20): number {
  return (width - gap * (count - 1)) / count;
}

/**
 * Vertical cursor for stacking content.
 *
 * Replaces the `let by = 340; ... by += 52;` pattern, where every offset was
 * relative to a running total and one wrong increment silently overlapped the
 * next element.
 */
export class Stack {
  private y: number;
  private readonly gap: number;

  constructor(startY: number, gap = 12) {
    this.y = startY;
    this.gap = gap;
  }

  /** Reserve `height` and return the *centre* line of that band. */
  next(height: number): number {
    const centre = this.y + height / 2;
    this.y += height + this.gap;
    return centre;
  }

  /** Reserve `height` and return the *top* of that band. */
  nextTop(height: number): number {
    const t = this.y;
    this.y += height + this.gap;
    return t;
  }

  /** Add bare space without reserving a band. */
  skip(amount: number): void {
    this.y += amount;
  }

  /** Current cursor position. */
  get cursor(): number {
    return this.y;
  }

  /** Whether `height` still fits above `limit`. */
  fits(height: number, limit = bottom()): boolean {
    return this.y + height <= limit;
  }
}

/**
 * Rows that never overlap.
 *
 * Pass the real painted height; the pitch always exceeds it, so stacked hit
 * areas stay disjoint.
 */
export function rows(startY: number, itemHeight: number, gap = 6): (i: number) => number {
  const pitch = itemHeight + gap;
  return (i: number) => startY + i * pitch;
}

/** How many rows of `itemHeight` fit in a span. */
export function rowsThatFit(span: number, itemHeight: number, gap = 6): number {
  return Math.max(0, Math.floor((span + gap) / (itemHeight + gap)));
}
