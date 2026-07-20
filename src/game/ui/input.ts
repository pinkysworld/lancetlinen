/**
 * Keyboard control layer.
 *
 * The game shipped with no keyboard support at all — every action required a
 * mouse or a finger. This binds the scene's existing buttons (registered by
 * `makeButton`) to keys, so the whole game is playable from the keyboard:
 *
 *   Esc / Backspace  back out of the current screen
 *   1 – 9            activate the nth button
 *   Enter            the screen's primary action
 *   Arrows / Tab     move the focus ring
 *   Space            confirm the focused button (and the skill check)
 *   ?                open help
 *
 * Call `installSceneKeys(this)` at the END of a scene's `create()`, once all
 * buttons exist — the number chips are drawn from the completed registry.
 */
import Phaser from 'phaser';
import { COLORS, sceneButtons, type ButtonEntry } from './theme';
import { isTouchDevice } from '../mobile';
import { settings } from '../systems/settings';
import { SERIF } from './fx';

/**
 * Rebindable actions.
 *
 * Number keys 1-9 are deliberately *not* rebindable — they are positional
 * shortcuts onto whatever the screen shows, not named actions.
 */
export const BINDABLE_ACTIONS = ['back', 'confirm', 'help', 'next', 'prev'] as const;
export type BindableAction = (typeof BINDABLE_ACTIONS)[number];

export const DEFAULT_BINDS: Record<BindableAction, string> = {
  back: 'Escape',
  confirm: 'Enter',
  help: '?',
  next: 'ArrowDown',
  prev: 'ArrowUp',
};

/** Effective binding for an action, honouring the player's overrides. */
export function boundKey(action: BindableAction): string {
  try {
    return settings().keyBinds?.[action] || DEFAULT_BINDS[action];
  } catch {
    return DEFAULT_BINDS[action];
  }
}

/** Human-readable name for a key, for the rebinding screen. */
export function keyLabel(key: string): string {
  switch (key) {
    case ' ':
      return 'Space';
    case 'ArrowUp':
      return '↑';
    case 'ArrowDown':
      return '↓';
    case 'ArrowLeft':
      return '←';
    case 'ArrowRight':
      return '→';
    case 'Escape':
      return 'Esc';
    default:
      return key.length === 1 ? key.toUpperCase() : key;
  }
}

export interface SceneKeysOpts {
  /** Esc handler. Defaults to the button flagged `back: true`. */
  onBack?: () => void;
  /** Enter handler. Defaults to the button flagged `primary: true`. */
  onPrimary?: () => void;
  /** Draw the little number chips. Off for dense list screens. */
  chips?: boolean;
  /** Suppress the focus ring (e.g. during a minigame). */
  focusRing?: boolean;
}

/** Buttons eligible for a number key, in registration order. */
function hotkeyable(scene: Phaser.Scene): ButtonEntry[] {
  return sceneButtons(scene).filter((b) => !b.disabled && !b.noHotkey);
}

export function installSceneKeys(scene: Phaser.Scene, opts: SceneKeysOpts = {}): void {
  const kb = scene.input?.keyboard;
  if (!kb) return;

  // Scenes that rebuild in place call this on every pass; drop the previous
  // pass's binding so handlers don't stack up and fire N times per keypress.
  kb.removeAllListeners('keydown');

  const all = sceneButtons(scene);
  const numbered = hotkeyable(scene).slice(0, 9);

  const backBtn = all.find((b) => b.back && !b.disabled);
  const primaryBtn = all.find((b) => b.primary && !b.disabled);

  // ---- number chips -------------------------------------------------
  // Desktop only: on touch they are noise, and there is no keyboard anyway.
  if (opts.chips !== false && !isTouchDevice()) {
    numbered.forEach((b, i) => {
      const cx = b.x - b.w / 2 + 13;
      const g = scene.add.graphics().setDepth(1001);
      g.fillStyle(COLORS.ink, 0.5);
      g.fillRoundedRect(cx - 9, b.y - 9, 18, 18, 4);
      scene.add
        .text(cx, b.y, String(i + 1), {
          fontFamily: SERIF,
          fontSize: '11px',
          color: '#e8d5a8',
        })
        .setOrigin(0.5)
        .setDepth(1002);
    });
  }

  // ---- focus ring ---------------------------------------------------
  let focus = -1;
  const ring = scene.add.graphics().setDepth(1003);

  const drawRing = () => {
    ring.clear();
    if (opts.focusRing === false) return;
    const b = numbered[focus];
    if (!b) return;
    ring.lineStyle(3, COLORS.goldBright, 0.95);
    ring.strokeRoundedRect(b.x - b.w / 2 - 4, b.y - b.h / 2 - 4, b.w + 8, b.h + 8, 10);
  };

  const moveFocus = (delta: number) => {
    if (!numbered.length) return;
    if (focus >= 0) numbered[focus]?.setHover(false);
    focus = (focus + delta + numbered.length) % numbered.length;
    numbered[focus]?.setHover(true);
    drawRing();
  };

  // ---- bindings -----------------------------------------------------
  const back = opts.onBack ?? (backBtn ? () => backBtn.activate() : null);
  const primary = opts.onPrimary ?? (primaryBtn ? () => primaryBtn.activate() : null);

  kb.on('keydown', (ev: KeyboardEvent) => {
    // Never swallow browser shortcuts or typing in a real input field.
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;

    const key = ev.key;

    // Player-rebindable actions take precedence over the built-in defaults.
    if (key === boundKey('back') || key === 'Backspace') {
      if (back) {
        ev.preventDefault();
        back();
      }
      return;
    }

    if (key === boundKey('confirm')) {
      const target = focus >= 0 ? numbered[focus] : null;
      if (target) {
        ev.preventDefault();
        target.activate();
      } else if (primary) {
        ev.preventDefault();
        primary();
      }
      return;
    }

    if (key === ' ' || key === 'Spacebar') {
      const target = focus >= 0 ? numbered[focus] : null;
      if (target) {
        ev.preventDefault();
        target.activate();
      }
      return;
    }

    if (key === boundKey('next') || key === 'ArrowRight' || key === 'Tab') {
      ev.preventDefault();
      moveFocus(1);
      return;
    }
    if (key === boundKey('prev') || key === 'ArrowLeft') {
      ev.preventDefault();
      moveFocus(-1);
      return;
    }

    if (key >= '1' && key <= '9') {
      const idx = Number(key) - 1;
      const target = numbered[idx];
      if (target) {
        ev.preventDefault();
        target.activate();
      }
    }
  });

  // Phaser keeps DOM key listeners alive across scene changes otherwise.
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => kb.removeAllListeners('keydown'));
}

/**
 * Single-key binding for transient UI (modals, the skill check) that is not
 * part of the scene's button registry.
 *
 * Returns a disposer; callers that tear the UI down before scene shutdown
 * should call it so the binding does not outlive the widget it drives.
 */
export function bindKey(
  scene: Phaser.Scene,
  keys: string[],
  handler: () => void,
): () => void {
  const kb = scene.input?.keyboard;
  if (!kb) return () => {};
  const onKey = (ev: KeyboardEvent) => {
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    if (keys.includes(ev.key)) {
      ev.preventDefault();
      handler();
    }
  };
  kb.on('keydown', onKey);
  const dispose = () => kb.off('keydown', onKey);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, dispose);
  return dispose;
}
