/**
 * Visual effects layer for Lancet & Linen.
 *
 * Two jobs:
 *  1. Present the painted art properly — cover-fit, vignette, and *local*
 *     scrims instead of blanket darkening, so the paintings stay paintings.
 *  2. Give the game motion — scene fades, floating numbers, hearth embers.
 *
 * Everything motion-related honours `settings.reduceParticles`, which until now
 * was a setting that controlled nothing.
 */
import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../types';
import { viewRect } from './viewport';
import { getState } from '../state';
import { goreLevel, showBloodEffects } from '../systems/settings';

export const SERIF = 'Palatino Linotype, Book Antiqua, Palatino, Georgia, serif';

const VIGNETTE_KEY = '__fx_vignette';
const DOT_KEY = '__fx_dot';

/** Scene-fade colour — matches COLORS.bg so fades read as dusk, not as a black cut. */
const FADE_RGB: [number, number, number] = [0x1a, 0x12, 0x0c];

export function reduceMotion(): boolean {
  try {
    return getState().settings?.reduceParticles === true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ *
 * Generated textures
 * ------------------------------------------------------------------ */

/** Radial darkening overlay, generated once and reused by every scene. */
function ensureVignette(scene: Phaser.Scene): string | null {
  if (scene.textures.exists(VIGNETTE_KEY)) return VIGNETTE_KEY;
  const w = 512;
  const h = 288;
  const tex = scene.textures.createCanvas(VIGNETTE_KEY, w, h);
  if (!tex) return null;
  const ctx = tex.getContext();
  // Corners fall outside r1; canvas extends the final stop, which is what we want.
  const grd = ctx.createRadialGradient(w / 2, h / 2, h * 0.24, w / 2, h / 2, h * 0.8);
  grd.addColorStop(0, 'rgba(0,0,0,0)');
  grd.addColorStop(0.55, 'rgba(10,6,4,0.16)');
  grd.addColorStop(1, 'rgba(10,6,4,0.7)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
  tex.refresh();
  return VIGNETTE_KEY;
}

/** Soft white dot — tinted per emitter for embers, steam and dust. */
function ensureDot(scene: Phaser.Scene): string | null {
  if (scene.textures.exists(DOT_KEY)) return DOT_KEY;
  const size = 32;
  const tex = scene.textures.createCanvas(DOT_KEY, size, size);
  if (!tex) return null;
  const ctx = tex.getContext();
  const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.4, 'rgba(255,255,255,0.55)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  tex.refresh();
  return DOT_KEY;
}

/* ------------------------------------------------------------------ *
 * Backgrounds
 * ------------------------------------------------------------------ */

export interface BackgroundOpts {
  /** Extra keys to try if the primary key is missing. */
  fallbacks?: string[];
  /**
   * Multiplicative brightness on the art itself, 0..1. Default 0.86.
   * Multiplying preserves contrast; stacking a black rectangle does not.
   */
  brightness?: number;
  vignette?: boolean;
  /** Gradient scrim height at the top, in px — only where HUD text sits. */
  topScrim?: number;
  /** Gradient scrim height at the bottom, in px. */
  bottomScrim?: number;
  depth?: number;
}

/**
 * Cover-fit a painted background, then darken *selectively*.
 *
 * Replaces the previous `setDisplaySize(W,H).setAlpha(0.4)` + full-screen black
 * rectangle pattern, which flattened the art into brown mush.
 */
export function sceneBackground(
  scene: Phaser.Scene,
  key: string,
  opts: BackgroundOpts = {},
): Phaser.GameObjects.Image | null {
  const candidates = [key, ...(opts.fallbacks ?? [])];
  const use = candidates.find((k) => scene.textures.exists(k));

  if (!use) {
    // Most backgrounds stream in after the menu appears (see ART_DEFERRED), so
    // a screen reached in the first seconds would otherwise be left permanently
    // blank — the guard degraded gracefully but never retried. Draw it as soon
    // as the texture lands instead.
    const onArrive = () => {
      // The scene may have been left in the meantime.
      if (!scene.scene.isActive()) return;
      sceneBackground(scene, key, opts);
    };
    scene.textures.once(`addtexture-${key}`, onArrive);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      scene.textures.off(`addtexture-${key}`, onArrive),
    );
    return null;
  }

  const depth = opts.depth ?? -20;
  const brightness = opts.brightness ?? 0.86;

  // Centre on the *visible* rect, not the design rect, and cover its width —
  // otherwise a wide canvas showed the painting inset with dark margins.
  const V = viewRect();
  const img = scene.add.image(V.x + V.width / 2, GAME_HEIGHT / 2, use).setDepth(depth);
  img.disableInteractive();

  // Cover-fit: fill the frame without distorting the painting's aspect ratio.
  const src = scene.textures.get(use).getSourceImage();
  const sw = (src as { width: number }).width || GAME_WIDTH;
  const sh = (src as { height: number }).height || GAME_HEIGHT;
  const scale = Math.max(V.width / sw, GAME_HEIGHT / sh);
  img.setScale(scale);

  if (brightness < 1) {
    const v = Math.max(0, Math.min(255, Math.round(255 * brightness)));
    img.setTint((v << 16) | (v << 8) | v);
  }

  if (opts.vignette !== false) {
    const vk = ensureVignette(scene);
    if (vk) {
      scene.add
        .image(V.x + V.width / 2, GAME_HEIGHT / 2, vk)
        .setDisplaySize(V.width, GAME_HEIGHT)
        .setDepth(depth + 1)
        .disableInteractive();
    }
  }

  if (opts.topScrim || opts.bottomScrim) {
    const g = scene.add.graphics().setDepth(depth + 2);
    if (opts.topScrim) {
      g.fillGradientStyle(0x0a0705, 0x0a0705, 0x0a0705, 0x0a0705, 0.88, 0.88, 0, 0);
      g.fillRect(V.x, 0, V.width, opts.topScrim);
    }
    if (opts.bottomScrim) {
      g.fillGradientStyle(0x0a0705, 0x0a0705, 0x0a0705, 0x0a0705, 0, 0, 0.88, 0.88);
      g.fillRect(V.x, GAME_HEIGHT - opts.bottomScrim, V.width, opts.bottomScrim);
    }
  }

  return img;
}

/** Standalone vignette for scenes that draw their own background. */
export function addVignette(scene: Phaser.Scene, depth = -8): void {
  const vk = ensureVignette(scene);
  if (!vk) return;
  const V = viewRect();
  scene.add
    .image(V.x + V.width / 2, GAME_HEIGHT / 2, vk)
    .setDisplaySize(V.width, GAME_HEIGHT)
    .setDepth(depth)
    .disableInteractive();
}

/* ------------------------------------------------------------------ *
 * Scene transitions
 * ------------------------------------------------------------------ */

/** Guards against a double-tap firing two overlapping transitions. */
const inFlight = new WeakSet<Phaser.Scene>();

/**
 * Fade out, then start the next scene. Drop-in replacement for
 * `this.scene.start(key, data)`.
 */
export function transitionTo(
  scene: Phaser.Scene,
  key: string,
  data?: object,
  duration = 200,
): void {
  if (reduceMotion()) {
    scene.scene.start(key, data);
    return;
  }
  if (inFlight.has(scene)) return;
  inFlight.add(scene);

  const cam = scene.cameras.main;
  cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
    inFlight.delete(scene);
    scene.scene.start(key, data);
  });
  // Safety net: if the camera is torn down mid-fade the event never lands.
  scene.time.delayedCall(duration + 260, () => {
    if (inFlight.has(scene)) {
      inFlight.delete(scene);
      scene.scene.start(key, data);
    }
  });
  cam.fadeOut(duration, ...FADE_RGB);
}

/** Restart the current scene through a fade. */
export function transitionRestart(scene: Phaser.Scene, duration = 200): void {
  if (reduceMotion()) {
    scene.scene.restart();
    return;
  }
  if (inFlight.has(scene)) return;
  inFlight.add(scene);
  const cam = scene.cameras.main;
  cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
    inFlight.delete(scene);
    scene.scene.restart();
  });
  cam.fadeOut(duration, ...FADE_RGB);
}

/**
 * Fade a scene in. Wired globally in Game.ts, so scenes needn't call it.
 *
 * Skips when a fade-out is already in flight: a scene that calls
 * `transitionTo` synchronously from `create()` would otherwise have its
 * fade-out cancelled here, and `FADE_OUT_COMPLETE` would never fire.
 */
export function fadeInScene(scene: Phaser.Scene, duration = 240): void {
  if (reduceMotion()) return;
  if (inFlight.has(scene)) return;
  try {
    scene.cameras.main?.fadeIn(duration, ...FADE_RGB);
  } catch {
    /* camera may not exist yet on a torn-down scene */
  }
}

/* ------------------------------------------------------------------ *
 * Feedback
 * ------------------------------------------------------------------ */

/** Drifting "+12" style number for coin / reputation deltas. */
export function floatingNumber(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  color = '#e8c547',
  delay = 0,
): void {
  const txt = scene.add
    .text(x, y, label, { fontFamily: SERIF, fontSize: '24px', color, fontStyle: 'bold' })
    .setOrigin(0.5)
    .setDepth(4500);
  txt.setStroke('#1a120c', 5);

  if (reduceMotion()) {
    scene.time.delayedCall(1000 + delay, () => txt.destroy());
    return;
  }
  txt.setAlpha(0);
  scene.tweens.add({
    targets: txt,
    y: y - 58,
    alpha: { from: 0, to: 1 },
    duration: 260,
    delay,
    ease: 'Cubic.easeOut',
    onComplete: () => {
      scene.tweens.add({
        targets: txt,
        alpha: 0,
        y: y - 84,
        duration: 620,
        delay: 340,
        onComplete: () => txt.destroy(),
      });
    },
  });
}

/** Soft fade-in for panels and modals. Alpha only — Graphics scale about world origin. */
export function panelIn(
  scene: Phaser.Scene,
  targets: Phaser.GameObjects.GameObject | Phaser.GameObjects.GameObject[],
  duration = 190,
): void {
  if (reduceMotion()) return;
  const list = Array.isArray(targets) ? targets : [targets];
  if (!list.length) return;
  scene.tweens.add({ targets: list, alpha: { from: 0, to: 1 }, duration, ease: 'Quad.easeOut' });
}

/** Brief shake — used on treatment failure and death. */
export function shake(scene: Phaser.Scene, intensity = 0.006, duration = 220): void {
  if (reduceMotion()) return;
  scene.cameras.main?.shake(duration, intensity);
}

/** Red flash — used on death results. */
export function flash(scene: Phaser.Scene, color: [number, number, number] = [140, 30, 30]): void {
  if (reduceMotion()) return;
  // The red full-screen flash reads as blood, so the Gore setting governs it.
  if (!showBloodEffects()) return;
  scene.cameras.main?.flash(260, ...color);
}

/* ------------------------------------------------------------------ *
 * Ambient particles
 * ------------------------------------------------------------------ */

/** Hearth embers drifting up the left edge — bathhouse and treatment rooms. */
export function emberParticles(
  scene: Phaser.Scene,
  x = 140,
  y = GAME_HEIGHT - 110,
): Phaser.GameObjects.Particles.ParticleEmitter | null {
  if (reduceMotion()) return null;
  const key = ensureDot(scene);
  if (!key) return null;
  const emitter = scene.add.particles(x, y, key, {
    speedY: { min: -46, max: -16 },
    speedX: { min: -12, max: 14 },
    scale: { start: 0.32, end: 0 },
    alpha: { start: 0.85, end: 0 },
    lifespan: { min: 1600, max: 3200 },
    frequency: 260,
    tint: [0xe8a23a, 0xc9622a, 0xe8c547],
    blendMode: 'ADD',
  });
  emitter.setDepth(-5);
  return emitter;
}

/** Slow steam curling above the tub. */
export function steamParticles(
  scene: Phaser.Scene,
  x = GAME_WIDTH / 2,
  y = GAME_HEIGHT - 190,
): Phaser.GameObjects.Particles.ParticleEmitter | null {
  if (reduceMotion()) return null;
  const key = ensureDot(scene);
  if (!key) return null;
  const emitter = scene.add.particles(x, y, key, {
    speedY: { min: -26, max: -9 },
    speedX: { min: -16, max: 16 },
    scale: { start: 0.5, end: 2.1 },
    alpha: { start: 0.16, end: 0 },
    lifespan: { min: 2600, max: 4600 },
    frequency: 460,
    tint: 0xa8c0c4,
  });
  emitter.setDepth(-5);
  return emitter;
}

/**
 * Four-frame ambient still loop (hearth / steam / fumigation).
 *
 * Plays at 3 fps only when `reduceParticles` is off. Missing frames or reduced
 * motion → frame 01 as a static image (or nothing if that is missing too).
 * See ART_WORK_V1.1.md. Uses Image + timer (not Sprite.anims) so each frame
 * can be a separate texture file.
 */
export function playAmbientLoop(
  scene: Phaser.Scene,
  loopId: 'hearth' | 'bath_steam' | 'fumigation',
  x: number,
  y: number,
  displayW = 280,
  displayH = 158,
  depth = -4,
): Phaser.GameObjects.Image | null {
  const prefix = `loop_${loopId}_`;
  const frameKeys = [1, 2, 3, 4].map((n) => `${prefix}${String(n).padStart(2, '0')}`);
  const present = frameKeys.filter((k) => scene.textures.exists(k));
  if (!present.length) return null;

  const img = scene.add
    .image(x, y, present[0]!)
    .setDisplaySize(displayW, displayH)
    .setAlpha(0.55)
    .setDepth(depth)
    .disableInteractive();

  if (reduceMotion() || present.length < 2) return img;

  let idx = 0;
  const timer = scene.time.addEvent({
    delay: Math.round(1000 / 3),
    loop: true,
    callback: () => {
      if (!img.active) {
        timer.remove(false);
        return;
      }
      idx = (idx + 1) % present.length;
      img.setTexture(present[idx]!);
      img.setDisplaySize(displayW, displayH);
    },
  });
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => timer.remove(false));
  return img;
}

/**
 * Blood spatter on a bad outcome.
 *
 * Gated on the Gore setting, which until now was toggleable in the options
 * screen and read nowhere:
 *   low    — nothing at all
 *   medium — a short, modest burst
 *   high   — heavier, longer-lived, with drips
 */
export function bloodBurst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  severity: 'fail' | 'death' = 'fail',
): void {
  if (reduceMotion()) return;
  const gore = goreLevel();
  if (gore === 'low') return;

  const key = ensureDot(scene);
  if (!key) return;

  const heavy = gore === 'high';
  const count = severity === 'death' ? (heavy ? 34 : 16) : heavy ? 18 : 9;

  const emitter = scene.add.particles(x, y, key, {
    speed: { min: 40, max: heavy ? 260 : 150 },
    angle: { min: 200, max: 340 },
    gravityY: 420,
    scale: { start: heavy ? 0.5 : 0.34, end: 0.05 },
    alpha: { start: 0.9, end: 0 },
    lifespan: { min: 420, max: heavy ? 1100 : 700 },
    tint: [0x8b2e2e, 0x6b1f1f, 0xb33a3a],
    blendMode: 'NORMAL',
    emitting: false,
  });
  emitter.setDepth(4200);
  emitter.explode(count);

  // Particle emitters are not swept up automatically once they stop.
  scene.time.delayedCall(1600, () => emitter.destroy());
}

/** Drifting dust motes — the road and map screens. */
export function dustParticles(scene: Phaser.Scene): Phaser.GameObjects.Particles.ParticleEmitter | null {
  if (reduceMotion()) return null;
  const key = ensureDot(scene);
  if (!key) return null;
  const emitter = scene.add.particles(0, 0, key, {
    x: { min: 0, max: GAME_WIDTH },
    y: { min: 0, max: GAME_HEIGHT },
    speedY: { min: -8, max: 8 },
    speedX: { min: -18, max: 18 },
    scale: { start: 0.18, end: 0 },
    alpha: { start: 0.28, end: 0 },
    lifespan: { min: 3400, max: 6000 },
    frequency: 620,
    tint: 0xe8d5a8,
  });
  emitter.setDepth(-5);
  return emitter;
}
