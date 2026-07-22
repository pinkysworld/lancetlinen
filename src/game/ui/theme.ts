import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../types';
import { audio } from '../audio/AudioManager';
import { buttonHeight, buttonWidth, isTouchDevice, TOUCH_MIN } from '../mobile';
import { scaleFont } from '../systems/settings';
import { viewRect } from './viewport';

export const COLORS = {
  bg: 0x1a120c,
  bgMid: 0x2a1c14,
  panel: 0x3d2918,
  panelLight: 0x5c3d24,
  parchment: 0xe8d5a8,
  parchmentDark: 0xc4a574,
  ink: 0x1f140c,
  inkSoft: 0x3a2a1c,
  gold: 0xc9a227,
  goldBright: 0xe8c547,
  blood: 0x8b2e2e,
  bloodBright: 0xb33a3a,
  steam: 0xa8c0c4,
  green: 0x3d6b4f,
  greenBright: 0x5a9a6e,
  danger: 0xa33,
  white: 0xf5ecd7,
  muted: 0x8a7a68,
};

export function drawBackground(scene: Phaser.Scene, variant: 'menu' | 'room' | 'map' | 'dark' = 'room'): void {
  const g = scene.add.graphics();
  g.setDepth(-20);
  // Cover what is actually on screen, not the design rect. On a wide device
  // the canvas is wider than 1280 and a 1280-wide fill left dark margins
  // inside the canvas — the very bars this was meant to remove.
  const V = viewRect();
  if (variant === 'menu') {
    g.fillGradientStyle(0x1a120c, 0x1a120c, 0x3d2010, 0x2a1810, 1);
    g.fillRect(V.x, V.y, V.width, V.height);
    for (let i = 0; i < 8; i++) {
      g.fillStyle(0xc9a227, 0.03);
      g.fillCircle(200 + i * 120, 100 + (i % 3) * 80, 40 + i * 10);
    }
  } else if (variant === 'map') {
    g.fillStyle(0x1e2a1c, 1);
    g.fillRect(V.x, V.y, V.width, V.height);
  } else if (variant === 'dark') {
    g.fillStyle(0x0e0a08, 1);
    g.fillRect(V.x, V.y, V.width, V.height);
  } else {
    g.fillGradientStyle(0x2a1a10, 0x2a1a10, 0x4a3020, 0x3a2418, 1);
    g.fillRect(V.x, V.y, V.width, V.height);
    g.fillStyle(0x5c3d24, 0.35);
    g.fillRect(V.x, GAME_HEIGHT - 120, V.width, 120);
  }
}

export function panel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  alpha = 0.92,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(COLORS.panel, alpha);
  g.fillRoundedRect(x, y, w, h, 10);
  g.lineStyle(3, COLORS.gold, 0.85);
  g.strokeRoundedRect(x, y, w, h, 10);
  return g;
}

export function parchmentPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(COLORS.parchment, 0.95);
  g.fillRoundedRect(x, y, w, h, 8);
  g.lineStyle(2, COLORS.ink, 0.5);
  g.strokeRoundedRect(x, y, w, h, 8);
  // Grain overlay when painted vellum is loaded
  if (scene.textures.exists('ui_parchment')) {
    const img = scene.add
      .image(x + w / 2, y + h / 2, 'ui_parchment')
      .setDisplaySize(w - 4, h - 4)
      .setAlpha(0.55);
    img.disableInteractive();
  }
  return g;
}

/** Painted inventory / HUD icon if present, else null */
export function addHudIcon(
  scene: Phaser.Scene,
  x: number,
  y: number,
  key: string,
  size = 28,
): Phaser.GameObjects.Image | null {
  const tryKeys = [key, key.startsWith('icon_') ? key : `icon_${key}`];
  for (const k of tryKeys) {
    if (scene.textures.exists(k)) {
      const img = scene.add.image(x, y, k).setDisplaySize(size, size);
      img.disableInteractive();
      return img;
    }
  }
  return null;
}

/**
 * Panel with optional wood texture overlay (falls back to solid panel).
 * Improves visual richness on hub/scenario/codex without cluttering gameplay.
 */
export function woodPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  alpha = 0.94,
): Phaser.GameObjects.Graphics {
  const g = panel(scene, x, y, w, h, alpha);
  const key = scene.textures.exists('ui_wood_panel')
    ? 'ui_wood_panel'
    : scene.textures.exists('ui_wood')
      ? 'ui_wood'
      : null;
  if (key) {
    const img = scene.add
      .image(x + w / 2, y + h / 2, key)
      .setDisplaySize(w - 6, h - 6)
      .setAlpha(0.22);
    img.disableInteractive();
    // keep below text; panel graphics already drawn
  }
  return g;
}

export interface ButtonOpts {
  width?: number;
  height?: number;
  fontSize?: string;
  fill?: number;
  textColor?: string;
  disabled?: boolean;
  /** Marks this as the scene's Back action, bound to Esc. */
  back?: boolean;
  /** Marks this as the scene's default action, bound to Enter. */
  primary?: boolean;
  /** Exclude from number-key assignment (dense lists, pagination arrows). */
  noHotkey?: boolean;
  /**
   * Never grow the button to fit its label; shrink the type instead, and let
   * the tail be clipped if even that is not enough.
   *
   * Growing is right when the label *is* the content and the button stands
   * alone. It is wrong for `gatedButton`, which appends a refusal to a label
   * sized by the layout around it: a 124px exam button that grew to hold "Die
   * Harnschau hat Euch niemand gelehrt." covered its neighbours entirely.
   */
  keepHeight?: boolean;
}

/**
 * A button registered for keyboard control.
 * Populated by `makeButton`, consumed by `ui/input.ts`.
 */
export interface ButtonEntry {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  disabled: boolean;
  back: boolean;
  primary: boolean;
  noHotkey: boolean;
  activate: () => void;
  setHover: (on: boolean) => void;
  /**
   * The label object, so the number chip can move out of its way.
   *
   * The chip is painted from the completed registry, *after* every button
   * exists — at which point the label has already been centred and fitted to
   * the full width. Without a handle on it the chip lands on top of the first
   * few characters, which is what made "1Geschenk" and "2Schulen" unreadable.
   */
  reserveChipGutter?: (px: number) => void;
}

/**
 * Button registry, as a stack of layers.
 *
 * A scene's own buttons live in layer 0. A modal overlay (`showConfirm`,
 * `showInfoModal`) pushes a new layer so that keyboard control only ever sees
 * the topmost one — otherwise a number key pressed over a confirm dialog fires
 * a button on the screen *behind* it, which is exactly what happened before
 * this was layered.
 */
const registries = new WeakMap<Phaser.Scene, ButtonEntry[][]>();

function layers(scene: Phaser.Scene): ButtonEntry[][] {
  let stack = registries.get(scene);
  if (!stack) {
    stack = [[]];
    registries.set(scene, stack);
    // Must not leak across restarts, or stale entries fire callbacks against
    // destroyed game objects.
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => registries.delete(scene));
  }
  return stack;
}

/** Buttons on the active (topmost) layer, in creation order. */
export function sceneButtons(scene: Phaser.Scene): ButtonEntry[] {
  const stack = registries.get(scene);
  return stack?.[stack.length - 1] ?? [];
}

/**
 * Drop every registered button on the active layer.
 *
 * Scenes that rebuild their UI in place (TreatmentScene, DialogueScene) must
 * call this before each rebuild, or the registry accumulates entries pointing
 * at destroyed objects and the number keys fire stale callbacks.
 */
export function resetSceneButtons(scene: Phaser.Scene): void {
  const stack = registries.get(scene);
  stack?.[stack.length - 1]?.splice(0);
}

/** Begin a modal layer. Buttons registered from now on shadow those beneath. */
export function pushButtonLayer(scene: Phaser.Scene): void {
  layers(scene).push([]);
}

/** End the current modal layer, restoring the one beneath. */
export function popButtonLayer(scene: Phaser.Scene): void {
  const stack = registries.get(scene);
  // Never pop layer 0 — that is the scene's own UI.
  if (stack && stack.length > 1) stack.pop();
}

function registerButton(scene: Phaser.Scene, entry: ButtonEntry): void {
  const stack = layers(scene);
  stack[stack.length - 1]!.push(entry);
}

/** Row pitch that guarantees stacked buttons never overlap their hit areas. */
export function buttonRow(desiredHeight = 34, gap = 6): number {
  return buttonHeight(desiredHeight) + gap;
}

/**
 * Full-face clickable buttons.
 * Uses world-space Rectangle hit target + pointerdown (better for mobile touch).
 */
export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  opts: ButtonOpts = {},
): Phaser.GameObjects.Container {
  const touch = isTouchDevice();
  const w = buttonWidth(opts.width ?? 220);
  let h = buttonHeight(opts.height ?? 44);
  const disabled = opts.disabled ?? false;
  const fill = disabled ? COLORS.muted : (opts.fill ?? COLORS.panelLight);
  const fontSize = scaleFont(opts.fontSize ?? (touch ? '17px' : '18px'));

  const g = scene.add.graphics();
  const paint = (hover: boolean) => {
    // A click may transition/restart the scene synchronously. Phaser still
    // completes the pointer event afterwards, so hover cleanup must never try
    // to redraw a Graphics object the transition already destroyed.
    if (!g.active) return;
    g.clear();
    if (hover && !disabled) {
      g.fillStyle(COLORS.gold, 0.45);
      g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);
      g.lineStyle(3, COLORS.goldBright, 1);
    } else {
      g.fillStyle(fill, 1);
      g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);
      g.lineStyle(2, disabled ? 0x666666 : COLORS.gold, 0.95);
    }
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);
  };
  paint(false);

  // Long labels used to overflow the face: `wordWrap` broke them onto a second
  // line but nothing adjusted the button, so "Wagen reparieren (15 Münzen,
  // 1 Eisenwerkzeug)" spilled out of the top and bottom edges.
  //
  // Shrink the type until it fits rather than growing the button, because most
  // buttons sit in grids and rows where a changing height would break the
  // layout around them. German is the binding case — it runs roughly 30%
  // longer than English for the same string.
  const text = scene.add
    .text(x, y, label, {
      fontFamily: 'Palatino Linotype, Book Antiqua, Palatino, Georgia, serif',
      fontSize,
      color: opts.textColor ?? '#f5ecd7',
      align: 'center',
      wordWrap: { width: w - 16 },
    })
    .setOrigin(0.5);

  const setLabelColor = (color: string): void => {
    if (text.active) text.setColor(color);
  };

  const startPx = parseFloat(fontSize) || 18;
  /** Assigned below; `fitLabel` may be called again once it exists. */
  let hitArea: Phaser.GameObjects.Rectangle | undefined;

  /**
   * Fit the label into the face, optionally leaving a gutter on the left.
   *
   * `gutter` is the room the number chip needs. The label is re-centred in
   * what remains, so it neither sits under the chip nor drifts off the right
   * edge — a chip-bearing button loses width on one side only.
   */
  const fitLabel = (gutter = 0): void => {
    if (!label) return;
    const avail = w - 16 - gutter;
    text.setFontSize(startPx);
    text.setWordWrapWidth(avail);
    text.setX(x + gutter / 2);
    // 11px is the floor: below that the serif face stops being readable at
    // 1080p.
    for (let px = startPx; text.height > h - 8 && px > 11; px -= 1) {
      text.setFontSize(px);
      text.setWordWrapWidth(avail);
    }
    // Shrinking alone is not enough for a genuinely long label in a small
    // button — "Mehr Hand-Geschick nötig" wraps to three lines in a 120x28
    // button and still overflowed at the 11px floor, spilling over the rows
    // above and below. Grow the face to match rather than let text escape it.
    //
    // Unless the caller forbids it: see `keepHeight`. A button whose size the
    // surrounding layout depends on must clip rather than shove its
    // neighbours off the screen.
    if (text.height > h - 8) {
      if (opts.keepHeight) {
        text.setCrop(0, 0, avail, h - 8);
        return;
      }
      h = Math.ceil(text.height) + 10;
      paint(false);
      // May run a second time, after the hit area already exists, when the
      // number chip claims its gutter and the label re-wraps taller.
      hitArea?.setSize(w, h);
    }
  };
  fitLabel();

  // Hit area matches the painted face exactly.
  //
  // It used to be inflated by 6px per side (and floored at TOUCH_MIN), which
  // made stacked rows overlap each other's tap targets — the technique list
  // painted 30px rows at 34px pitch but claimed 60px of touch area apiece.
  // `buttonHeight()` already enforces the 48px minimum, so no padding is needed.
  const hit = scene.add
    .rectangle(x, y, w, h, 0xffffff, 0.001)
    .setOrigin(0.5)
    .setDepth(1000);
  hitArea = hit;

  if (!disabled) {
    hit.setInteractive({ useHandCursor: true });
    let pressed = false;
    hit.on('pointerover', () => {
      paint(true);
      setLabelColor('#fff8e0');
    });
    hit.on('pointerout', () => {
      paint(false);
      setLabelColor(opts.textColor ?? '#f5ecd7');
      pressed = false;
    });
    // pointerdown is more reliable on iOS than pointerup alone
    hit.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pressed = true;
      paint(true);
      // Capture this pointer so drag-off still can cancel
      pointer.event?.preventDefault?.();
    });
    hit.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!pressed) {
        paint(false);
        setLabelColor(opts.textColor ?? '#f5ecd7');
        return;
      }
      pressed = false;

      // Release must still be over the button, so dragging off cancels.
      //
      // Compare in WORLD space: the camera is zoomed (see RENDER_SCALE), so
      // `pointer.x/y` is buffer-space and `getBounds()` is world-space — they
      // differ by 1.5x. The previous version compared the two directly, which
      // made this check meaningless and drag-to-cancel silently inoperative.
      const b = hit.getBounds();
      const pad = touch ? 16 : 8;
      const inside =
        pointer.worldX >= b.left - pad &&
        pointer.worldX <= b.right + pad &&
        pointer.worldY >= b.top - pad &&
        pointer.worldY <= b.bottom + pad;

      if (inside) {
        void audio.unlock();
        audio.sfx('click');
        onClick();
      }
      paint(false);
      setLabelColor(opts.textColor ?? '#f5ecd7');
    });
  }

  const activate = () => {
    // Registry callbacks may be invoked by a modal or a future keyboard path.
    // A disabled face must remain a hard semantic gate, not just muted paint.
    if (disabled) return;
    void audio.unlock();
    audio.sfx('click');
    onClick();
  };

  registerButton(scene, {
    x,
    y,
    w,
    h,
    label,
    disabled,
    back: opts.back ?? false,
    primary: opts.primary ?? false,
    noHotkey: opts.noHotkey ?? false,
    activate,
    setHover: (on: boolean) => {
      paint(on);
      setLabelColor(on ? '#fff8e0' : (opts.textColor ?? '#f5ecd7'));
    },
    reserveChipGutter: (px: number) => fitLabel(px),
  });

  const c = scene.add.container(0, 0, [g, text, hit]);
  c.setSize(GAME_WIDTH, GAME_HEIGHT);
  return c;
}

export function bodyText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  content: string,
  style: Phaser.Types.GameObjects.Text.TextStyle = {},
): Phaser.GameObjects.Text {
  const base = (style.fontSize as string | undefined) ?? (isTouchDevice() ? '15px' : '16px');
  return scene.add.text(x, y, content, {
    fontFamily: 'Palatino Linotype, Book Antiqua, Palatino, Georgia, serif',
    color: '#f5ecd7',
    wordWrap: { width: 600 },
    ...style,
    // Applied last so the accessibility text-scale setting wins over per-call
    // sizes — otherwise scaling would miss most of the UI.
    fontSize: scaleFont(base),
  });
}

export function titleText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  content: string,
  size = '42px',
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, content, {
      fontFamily: 'Palatino Linotype, Book Antiqua, Palatino, Georgia, serif',
      fontSize: scaleFont(size),
      color: '#e8c547',
      fontStyle: 'bold',
    })
    .setOrigin(0.5);
}

export function hudText(scene: Phaser.Scene, x: number, y: number, content: string): Phaser.GameObjects.Text {
  return scene.add.text(x, y, content, {
    fontFamily: 'Palatino Linotype, Book Antiqua, Palatino, Georgia, serif',
    fontSize: scaleFont(isTouchDevice() ? '14px' : '15px'),
    color: '#e8d5a8',
  });
}

export function addDecorImage(
  scene: Phaser.Scene,
  x: number,
  y: number,
  key: string,
  displayW: number,
  displayH: number,
  alpha = 1,
): Phaser.GameObjects.Image | null {
  if (!scene.textures.exists(key)) return null;
  const img = scene.add.image(x, y, key).setDisplaySize(displayW, displayH).setAlpha(alpha);
  img.disableInteractive();
  img.setDepth(-10);
  return img;
}
