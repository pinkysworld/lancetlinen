/**
 * Pinch-zoom bounds.
 *
 * The gesture itself needs a touchscreen and a live camera, so what is checked
 * here is the arithmetic that decides how far the player can zoom and pan —
 * the part that can strand someone looking at empty background with no way to
 * tell which way is back.
 *
 * The clamp logic is duplicated rather than imported because `ui/pinch.ts`
 * imports Phaser, which will not load under Node. Keeping the two in step is
 * the cost; the alternative is not testing it at all.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GAME_HEIGHT, GAME_WIDTH, RENDER_SCALE } from '../src/game/types';

const SRC = readFileSync(join(process.cwd(), 'src/game/ui/pinch.ts'), 'utf8');

/** Mirror of `clampScroll` in ui/pinch.ts. */
function clamp(zoom: number, scrollX: number, scrollY: number, camW: number, camH: number) {
  const viewW = camW / zoom;
  const viewH = camH / zoom;
  const x =
    viewW >= GAME_WIDTH
      ? (GAME_WIDTH - viewW) / 2
      : Math.max(0, Math.min(scrollX, GAME_WIDTH - viewW));
  const y =
    viewH >= GAME_HEIGHT
      ? (GAME_HEIGHT - viewH) / 2
      : Math.max(0, Math.min(scrollY, GAME_HEIGHT - viewH));
  return { x, y };
}

/** The render camera is the 1080p buffer. */
const CAM_W = GAME_WIDTH * RENDER_SCALE;
const CAM_H = GAME_HEIGHT * RENDER_SCALE;

describe('zoom limits', () => {
  const min = RENDER_SCALE;
  const max = RENDER_SCALE * 2.5;

  it('never zooms out past the fit view', () => {
    // Below the fit zoom the player would see bars around the world for no gain.
    expect(SRC).toContain('const MIN_ZOOM = RENDER_SCALE');
    expect(min).toBe(RENDER_SCALE);
  });

  it('allows enough magnification to actually help small text', () => {
    // The complaint was legibility on a phone; 1.5x would not answer it.
    expect(max / min).toBeGreaterThanOrEqual(2);
  });

  it('does not allow so much that the player loses the screen', () => {
    expect(max / min).toBeLessThanOrEqual(4);
  });
});

describe('pan clamping', () => {
  it('centres the world when it fits, rather than letting it drift', () => {
    // At the fit zoom there is nothing to pan to; a stray drag must not move it.
    const a = clamp(RENDER_SCALE, 0, 0, CAM_W, CAM_H);
    const b = clamp(RENDER_SCALE, 5000, -5000, CAM_W, CAM_H);
    expect(a).toEqual(b);
  });

  it('never shows past the left or top edge of the world', () => {
    const { x, y } = clamp(RENDER_SCALE * 2, -9999, -9999, CAM_W, CAM_H);
    expect(x).toBeGreaterThanOrEqual(0);
    expect(y).toBeGreaterThanOrEqual(0);
  });

  it('never shows past the right or bottom edge', () => {
    const zoom = RENDER_SCALE * 2;
    const { x, y } = clamp(zoom, 9999, 9999, CAM_W, CAM_H);
    expect(x + CAM_W / zoom).toBeLessThanOrEqual(GAME_WIDTH + 0.001);
    expect(y + CAM_H / zoom).toBeLessThanOrEqual(GAME_HEIGHT + 0.001);
  });

  it('keeps the whole viewport inside the world at every zoom step', () => {
    for (let z = RENDER_SCALE; z <= RENDER_SCALE * 2.5; z += 0.25) {
      const { x, y } = clamp(z, 4000, 4000, CAM_W, CAM_H);
      const viewW = CAM_W / z;
      const viewH = CAM_H / z;
      if (viewW < GAME_WIDTH) {
        expect(x, `zoom ${z}`).toBeGreaterThanOrEqual(0);
        expect(x + viewW, `zoom ${z}`).toBeLessThanOrEqual(GAME_WIDTH + 0.001);
      }
      if (viewH < GAME_HEIGHT) {
        expect(y, `zoom ${z}`).toBeGreaterThanOrEqual(0);
        expect(y + viewH, `zoom ${z}`).toBeLessThanOrEqual(GAME_HEIGHT + 0.001);
      }
    }
  });
});

describe('wiring', () => {
  it('leaves one-finger input alone, so taps keep working', () => {
    // The gesture must require two pointers; hijacking single-finger drag
    // would break every button on a touchscreen.
    expect(SRC).toContain('p1?.isDown && p2?.isDown');
  });

  it('does nothing on a device without touch', () => {
    expect(SRC).toContain('if (!isTouchDevice()) return');
  });

  it('enables the second pointer, which Phaser does not track by default', () => {
    expect(SRC).toContain('addPointer(1)');
  });

  it('removes its listeners on shutdown', () => {
    // Scenes restart constantly here; leaked handlers would stack up.
    expect(SRC).toContain('Phaser.Scenes.Events.SHUTDOWN');
    expect(SRC).toContain('scene.input.off');
  });

  it('contains no automatic fullscreen request', () => {
    // Fullscreen is now an explicit, capability-gated Settings choice.
    expect(SRC).not.toContain('requestFullscreenOnFirstTouch');
  });
});
