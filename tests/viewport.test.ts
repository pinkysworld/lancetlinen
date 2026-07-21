/**
 * Filling the screen without moving anything.
 *
 * The game draws 16:9 and `Scale.FIT` preserved that, so anything not 16:9 was
 * letterboxed. An iPad in Safari measures roughly 2.8:1 once the tab strip and
 * toolbar are off, and the game sat in a box in the middle of a dark field —
 * reported as "zoom works but it stays in this box, the whole screen would be
 * better".
 *
 * The canvas now takes the device's shape while the 1280×720 design band stays
 * centred in it. These tests pin the two properties that make that safe: the
 * band never moves, and nothing that must reach the edge is still measured
 * against the design width.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  MAX_ASPECT,
  MIN_ASPECT,
  targetAspect,
  viewLeft,
  viewRect,
  viewRight,
  viewWidth,
} from '../src/game/ui/viewport';
import { GAME_HEIGHT, GAME_WIDTH } from '../src/game/types';

/** Pretend to be a screen of the given size. */
function withWindow(w: number, h: number): void {
  (globalThis as { window?: unknown }).window = { innerWidth: w, innerHeight: h };
}

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

describe('the canvas takes the screen’s shape', () => {
  it('is exactly the design ratio on a 16:9 screen', () => {
    withWindow(1280, 720);
    expect(targetAspect()).toBeCloseTo(MIN_ASPECT, 5);
    expect(viewWidth()).toBe(GAME_WIDTH);
    expect(viewLeft()).toBe(0);
  });

  it('widens on a phone in landscape', () => {
    // 844x390 is an iPhone held sideways with Safari's bars showing.
    withWindow(844, 390);
    expect(viewWidth()).toBeGreaterThan(GAME_WIDTH);
    expect(targetAspect()).toBeCloseTo(844 / 390, 3);
  });

  it('widens on an iPad in Safari, which is what prompted this', () => {
    withWindow(1000, 355);
    expect(targetAspect()).toBeCloseTo(1000 / 355, 3);
    // And that is inside the clamp, so the bars are actually gone.
    expect(targetAspect()).toBeLessThanOrEqual(MAX_ASPECT);
  });

  it('never narrows below the design ratio', () => {
    // A portrait phone would otherwise crop the design band horizontally.
    // (The page shows a rotate prompt there, but the maths must still hold.)
    withWindow(390, 844);
    expect(viewWidth()).toBe(GAME_WIDTH);
    expect(viewLeft()).toBe(0);
  });

  it('refuses to stretch a pathological window past the clamp', () => {
    withWindow(5120, 400); // 12.8:1
    expect(targetAspect()).toBe(MAX_ASPECT);
  });

  it('falls back to the design ratio with no window at all', () => {
    // Headless: tests, and the Node-side build.
    expect(targetAspect()).toBeCloseTo(MIN_ASPECT, 5);
  });
});

describe('the design band never moves', () => {
  it('stays centred at every aspect', () => {
    for (const [w, h] of [
      [1280, 720],
      [844, 390],
      [1000, 355],
      [1920, 1080],
      [2560, 1080],
    ] as const) {
      withWindow(w, h);
      const r = viewRect();
      // Equal margin either side of the 1280-wide band is what keeps every
      // hard-coded coordinate in the scenes valid.
      const leftMargin = 0 - r.x;
      const rightMargin = r.x + r.width - GAME_WIDTH;
      expect(leftMargin, `${w}x${h}`).toBe(rightMargin);
      expect(r.height).toBe(GAME_HEIGHT);
    }
  });

  it('always contains the design band', () => {
    withWindow(2560, 1080);
    expect(viewLeft()).toBeLessThanOrEqual(0);
    expect(viewRight()).toBeGreaterThanOrEqual(GAME_WIDTH);
  });
});

const read = (p: string): string => readFileSync(join(process.cwd(), p), 'utf8');

describe('everything that must reach the edge does', () => {

  it('draws scene backgrounds against the view, not the design width', () => {
    const fx = read('src/game/ui/fx.ts');
    // Cover-fit must use the visible width or the painting sits inset with
    // dark margins — the very bars this was meant to remove, just inside the
    // canvas instead of outside it.
    expect(fx).toContain('Math.max(V.width / sw, GAME_HEIGHT / sh)');
  });

  it('fills the flat backgrounds against the view', () => {
    const theme = read('src/game/ui/theme.ts');
    const fn = theme.slice(theme.indexOf('export function drawBackground'));
    const body = fn.slice(0, fn.indexOf('\n}'));
    expect(body).toContain('const V = viewRect()');
    expect(body).not.toMatch(/fillRect\(0, 0, GAME_WIDTH/);
  });

  it('covers the whole screen when a modal dims it', () => {
    // A dim that stopped at 1280 would leave live-looking UI beside the
    // dialogue on a wide screen.
    expect(read('src/game/ui/dialogs.ts')).toContain('viewRect().width');
  });

  it('anchors the menu’s edge posts to the screen edge', () => {
    // At x=0 and x=1256 they drew two vertical seams across the middle of the
    // painting instead of framing it.
    const menu = read('src/game/scenes/MainMenuScene.ts');
    expect(menu).toContain('g.fillRect(V.x, 0, 24, GAME_HEIGHT)');
    expect(menu).not.toContain('g.fillRect(GAME_WIDTH - 24, 0, 24, GAME_HEIGHT)');
  });
});

describe('the canvas is re-shaped on rotate, not merely re-fitted', () => {
  it('resizes the game surface when the aspect actually changes', () => {
    const game = read('src/game/Game.ts');
    expect(game).toContain('game.scale.resize(Math.round(RENDER_HEIGHT * aspect)');
    // And only then: Safari fires resize on every toolbar slide, and a
    // needless resize rebuilds every render target.
    expect(game).toContain('Math.abs(aspect - lastAspect) > 0.01');
    // The cameras must be re-centred, or the world drifts left of the canvas.
    expect(game).toMatch(/game\.scene\.scenes\) applyRenderScale\(scene\)/);
  });
});
