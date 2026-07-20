/**
 * Key rebinding.
 *
 * Steam players expect to remap controls; the game previously had fixed keys.
 * Only named actions are rebindable — the 1-9 shortcuts are positional
 * references to whatever the current screen shows, not actions in their own
 * right, so remapping them would be meaningless.
 */
import Phaser from 'phaser';
import { t } from '../i18n';
import { GAME_WIDTH } from '../types';
import { bodyText, drawBackground, makeButton, panel, titleText } from '../ui/theme';
import { transitionTo } from '../ui/fx';
import { installSceneKeys, BINDABLE_ACTIONS, boundKey, keyLabel } from '../ui/input';
import { settings, updateSettings } from '../systems/settings';
import { addManagementBackground } from '../ui/art';
import { audio } from '../audio/AudioManager';
import { showToast } from '../ui/dialogs';
import { Stack } from '../ui/layout';

/** Keys we refuse to bind, because losing them can strand the player. */
const RESERVED = new Set(['Tab', 'F5', 'F11', 'F12', 'Meta', 'Control', 'Alt', 'Shift']);

export class KeybindsScene extends Phaser.Scene {
  /** Action currently awaiting a keypress, or null when idle. */
  private capturing: string | null = null;
  private captureDispose: (() => void) | null = null;

  constructor() {
    super('Keybinds');
  }

  create(): void {
    void audio.setContext('settings');
    this.capturing = null;
    drawBackground(this, 'dark');
    addManagementBackground(this, 'bg_settings');
    titleText(this, GAME_WIDTH / 2, 48, t('rebind_title'), '30px');

    bodyText(this, GAME_WIDTH / 2, 92, t('rebind_help'), {
      fontSize: '14px',
      color: '#a8c0c4',
      align: 'center',
      wordWrap: { width: 760 },
    }).setOrigin(0.5);

    const panelX = GAME_WIDTH / 2 - 320;
    panel(this, panelX, 130, 640, 60 + BINDABLE_ACTIONS.length * 54);

    const rows = new Stack(158, 12);
    BINDABLE_ACTIONS.forEach((action) => {
      const y = rows.next(42);
      bodyText(this, panelX + 32, y, t(`action_${action}`), {
        fontSize: '16px',
        color: '#e8d5a8',
      }).setOrigin(0, 0.5);

      const isCapturing = this.capturing === action;
      makeButton(
        this,
        panelX + 480,
        y,
        isCapturing ? t('rebind_press') : keyLabel(boundKey(action)),
        () => this.beginCapture(action),
        { width: 240, height: 40, fontSize: '15px' },
      );
    });

    const footer = 170 + BINDABLE_ACTIONS.length * 54;
    makeButton(this, GAME_WIDTH / 2 - 130, footer, t('rebind_reset'), () => {
      updateSettings({ keyBinds: {} });
      showToast(this, t('rebind_reset_done'), '#5a9a6e', 1600);
      this.scene.restart();
    }, { width: 240, height: 42, fontSize: '15px' });

    makeButton(this, GAME_WIDTH / 2 + 130, footer, t('back'), () => transitionTo(this, 'Settings'), {
      width: 240,
      height: 42,
      fontSize: '15px',
      back: true,
    });

    installSceneKeys(this, { onBack: () => transitionTo(this, 'Settings') });
  }

  /**
   * Listen for the next keypress and assign it.
   *
   * Bound directly to the DOM rather than through `installSceneKeys`, because
   * the whole point is to intercept keys *before* the normal bindings consume
   * them — Esc in particular.
   */
  private beginCapture(action: string): void {
    if (this.capturing) return;
    this.capturing = action;
    this.scene.restart();

    // Restart wipes listeners, so arm the capture on the fresh scene instead.
    this.events.once(Phaser.Scenes.Events.CREATE, () => {
      const onKey = (ev: KeyboardEvent) => {
        ev.preventDefault();
        ev.stopPropagation();
        this.captureDispose?.();
        this.captureDispose = null;

        const key = ev.key;
        if (RESERVED.has(key)) {
          showToast(this, t('rebind_reserved', { key: keyLabel(key) }), '#b33a3a');
          this.capturing = null;
          this.scene.restart();
          return;
        }

        // Swap rather than duplicate: if the key already drives another action,
        // that action inherits the one being replaced.
        const binds = { ...settings().keyBinds };
        const previous = boundKey(action as never);
        for (const other of BINDABLE_ACTIONS) {
          if (other !== action && boundKey(other) === key) binds[other] = previous;
        }
        binds[action] = key;

        updateSettings({ keyBinds: binds });
        audio.sfx('click');
        this.capturing = null;
        this.scene.restart();
      };

      window.addEventListener('keydown', onKey, { capture: true });
      this.captureDispose = () => window.removeEventListener('keydown', onKey, { capture: true });
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.captureDispose?.());
    });
  }
}

