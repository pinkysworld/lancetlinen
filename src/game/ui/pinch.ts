/**
 * Pinch-zoom and pan, for phones.
 *
 * The game draws a fixed 16:9 world. On a phone in landscape that leaves the
 * whole screen readable in principle, but the type is small — a 12px label at
 * 1280 world units on a 6" screen is genuinely hard to read, which is what was
 * reported.
 *
 * ## Why the camera and not CSS
 *
 * Scaling the canvas element with a CSS transform would be one line and would
 * break every button. Hit-testing in `ui/theme.ts` compares `pointer.worldX`
 * against world-space bounds; Phaser derives those from the camera, and it
 * knows nothing about a CSS transform sitting on top. Zooming the camera keeps
 * input and rendering in the same coordinate space, so a button stays where it
 * looks.
 *
 * ## Interaction
 *
 * - Two fingers: pinch to zoom, drag to pan.
 * - One finger: untouched, so taps still work exactly as before.
 * - Double-tap with two fingers, or the reset call: back to fit.
 *
 * Pan is clamped so the world edge can never be dragged into the middle of the
 * screen — at zoom 1 there is nothing to pan to, and the clamp holds it still.
 */
import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, RENDER_SCALE } from '../types';
import { isTouchDevice } from '../mobile';

/** Never below the fit zoom — there is no reason to see less than the world. */
const MIN_ZOOM = RENDER_SCALE;
/** Roughly 2.5x the world. Past that the visible area is too small to navigate. */
const MAX_ZOOM = RENDER_SCALE * 2.5;

interface PinchState {
  /** Distance between the two fingers when the gesture began. */
  startDist: number;
  startZoom: number;
  /** Midpoint of the two fingers, in screen space. */
  startMidX: number;
  startMidY: number;
  startScrollX: number;
  startScrollY: number;
}

/**
 * Keep the camera inside the world.
 *
 * Without this the player can drag the map off-screen and be left looking at
 * empty background with no way to tell which direction home is.
 */
function clampScroll(cam: Phaser.Cameras.Scene2D.Camera): void {
  // At a given zoom the camera shows this much of the world.
  const viewW = cam.width / cam.zoom;
  const viewH = cam.height / cam.zoom;

  // When the view is wider than the world there is nothing to pan: centre it.
  if (viewW >= GAME_WIDTH) {
    cam.scrollX = (GAME_WIDTH - viewW) / 2;
  } else {
    cam.scrollX = Phaser.Math.Clamp(cam.scrollX, 0, GAME_WIDTH - viewW);
  }
  if (viewH >= GAME_HEIGHT) {
    cam.scrollY = (GAME_HEIGHT - viewH) / 2;
  } else {
    cam.scrollY = Phaser.Math.Clamp(cam.scrollY, 0, GAME_HEIGHT - viewH);
  }
}

/** Return the camera to the fit view. */
export function resetView(scene: Phaser.Scene): void {
  const cam = scene.cameras?.main;
  if (!cam) return;
  cam.setZoom(MIN_ZOOM);
  cam.centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
}

/**
 * Attach pinch-zoom to a scene.
 *
 * No-op on anything without a touchscreen: a mouse wheel zoom would fight the
 * scroll wheel in list screens, and there is no need for it on a desktop where
 * the whole world is already legible.
 */
export function installPinchZoom(scene: Phaser.Scene): void {
  if (!isTouchDevice()) return;
  const cam = scene.cameras?.main;
  if (!cam) return;

  let pinch: PinchState | null = null;

  const twoPointers = (): [Phaser.Input.Pointer, Phaser.Input.Pointer] | null => {
    const p1 = scene.input.pointer1;
    const p2 = scene.input.pointer2;
    return p1?.isDown && p2?.isDown ? [p1, p2] : null;
  };

  const onMove = () => {
    const pair = twoPointers();
    if (!pair) {
      pinch = null;
      return;
    }
    const [p1, p2] = pair;
    const dist = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;

    if (!pinch) {
      pinch = {
        startDist: Math.max(1, dist),
        startZoom: cam.zoom,
        startMidX: midX,
        startMidY: midY,
        startScrollX: cam.scrollX,
        startScrollY: cam.scrollY,
      };
      return;
    }

    // Zoom about the gesture, not the screen centre, so the thing under the
    // fingers stays under the fingers.
    const target = Phaser.Math.Clamp(
      (pinch.startZoom * dist) / pinch.startDist,
      MIN_ZOOM,
      MAX_ZOOM,
    );
    cam.setZoom(target);

    // Pan by how far the midpoint travelled, converted to world units at the
    // *current* zoom.
    cam.scrollX = pinch.startScrollX - (midX - pinch.startMidX) / target;
    cam.scrollY = pinch.startScrollY - (midY - pinch.startMidY) / target;
    clampScroll(cam);
  };

  const onUp = () => {
    if (!twoPointers()) pinch = null;
  };

  scene.input.on(Phaser.Input.Events.POINTER_MOVE, onMove);
  scene.input.on(Phaser.Input.Events.POINTER_UP, onUp);

  // Two pointers must be enabled explicitly; Phaser tracks one by default and
  // `pointer2` would stay undefined.
  scene.input.addPointer(1);

  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.input.off(Phaser.Input.Events.POINTER_MOVE, onMove);
    scene.input.off(Phaser.Input.Events.POINTER_UP, onUp);
  });
}

/**
 * Ask for fullscreen on the first touch.
 *
 * Safari on iOS keeps its address and tab bars, which on a phone in landscape
 * eats a third of the height. Fullscreen has to come from a user gesture, so
 * it is requested on the first tap and never again — repeatedly prompting a
 * player who declined would be obnoxious.
 *
 * Fails silently: iPhone Safari does not support the Fullscreen API on
 * arbitrary elements at all, so this helps on iPad and Android and does
 * nothing on iPhone.
 */
export function requestFullscreenOnFirstTouch(game: Phaser.Game): void {
  if (!isTouchDevice()) return;
  let asked = false;
  const ask = () => {
    if (asked) return;
    asked = true;
    window.removeEventListener('pointerdown', ask);
    try {
      if (!game.scale.isFullscreen) game.scale.startFullscreen();
    } catch {
      /* Unsupported (iPhone Safari) or refused — the game works either way. */
    }
  };
  window.addEventListener('pointerdown', ask, { once: true });
}
