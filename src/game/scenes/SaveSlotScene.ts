/**
 * Save slots.
 *
 * The game autosaves at 37 call sites into a single key, which means a bad
 * decision is written to disk before the player has finished regretting it.
 * `state.ts` gained three manual slots alongside the autosave; this is the
 * screen that makes them reachable.
 *
 * One scene serves both saving and loading — the row action differs, the
 * listing does not. Launch with `scene.start('SaveSlots', { mode })`.
 */
import Phaser from 'phaser';
import { t, locName } from '../i18n';
import { GAME_WIDTH } from '../types';
import { bodyText, drawBackground, makeButton, panel, titleText } from '../ui/theme';
import { transitionTo } from '../ui/fx';
import { installSceneKeys } from '../ui/input';
import { addManagementBackground } from '../ui/art';
import { audio } from '../audio/AudioManager';
import { showToast, showConfirm } from '../ui/dialogs';
import { Stack } from '../ui/layout';
import {
  AUTOSAVE_SLOT,
  MANUAL_SLOTS,
  deleteSave,
  formatSaveMetaLine,
  listSaves,
  loadGame,
  saveGame,
  type SaveMeta,
} from '../state';

export type SaveSlotMode = 'save' | 'load';

interface SaveSlotData {
  mode?: SaveSlotMode;
  /** Scene to return to; defaults to the main menu. */
  from?: string;
}

export class SaveSlotScene extends Phaser.Scene {
  private mode: SaveSlotMode = 'load';
  private from = 'MainMenu';

  constructor() {
    super('SaveSlots');
  }

  init(data: SaveSlotData): void {
    this.mode = data?.mode ?? 'load';
    this.from = data?.from ?? 'MainMenu';
  }

  create(): void {
    void audio.setContext('settings');
    drawBackground(this, 'dark');
    addManagementBackground(this, 'bg_settings');
    titleText(this, GAME_WIDTH / 2, 48, t(this.mode === 'save' ? 'slots_save_title' : 'slots_load_title'), '30px');

    const slots = listSaves();
    const panelX = GAME_WIDTH / 2 - 340;
    panel(this, panelX, 100, 680, 72 + slots.length * 72);

    const rows = new Stack(132, 16);
    for (const { slot, meta } of slots) {
      this.drawSlot(panelX, rows.next(56), slot, meta);
    }

    const footer = 150 + slots.length * 72;
    makeButton(this, GAME_WIDTH / 2, footer, t('back'), () => this.leave(), {
      width: 260,
      height: 42,
      fontSize: '15px',
      back: true,
    });

    installSceneKeys(this, { onBack: () => this.leave() });
  }

  private leave(): void {
    transitionTo(this, this.from);
  }

  private drawSlot(x: number, y: number, slot: number, meta: SaveMeta | null): void {
    const isAuto = slot === AUTOSAVE_SLOT;
    const label = isAuto ? t('slot_auto') : t('slot_n', { n: String(slot) });

    bodyText(this, x + 28, y - 10, label, { fontSize: '16px', color: '#e8d5a8' }).setOrigin(0, 0.5);
    bodyText(this, x + 28, y + 12, meta ? this.describe(meta) : t('slot_empty'), {
      fontSize: '13px',
      color: meta ? '#a8c0c4' : '#6c7f83',
    }).setOrigin(0, 0.5);

    // The autosave is written by the game, never by the player — offering
    // "save here" would let them overwrite their own safety net by hand.
    const canWrite = this.mode === 'save' && !isAuto;
    const canRead = this.mode === 'load' && !!meta;

    if (canWrite) {
      makeButton(this, x + 500, y, t(meta ? 'slot_overwrite' : 'slot_write'), () => this.write(slot, meta), {
        width: 150,
        height: 38,
        fontSize: '14px',
      });
    } else if (canRead) {
      makeButton(this, x + 500, y, t('slot_load'), () => this.read(slot), {
        width: 150,
        height: 38,
        fontSize: '14px',
      });
    }

    if (meta && !isAuto) {
      makeButton(this, x + 620, y, t('slot_delete'), () => this.erase(slot), {
        width: 80,
        height: 38,
        fontSize: '13px',
        back: true,
      });
    }
  }

  private describe(meta: SaveMeta): string {
    return formatSaveMetaLine(meta, locName(meta.locationId));
  }

  private write(slot: number, existing: SaveMeta | null): void {
    const commit = () => {
      const res = saveGame(slot);
      audio.sfx('coin');
      showToast(this, t(res.ok ? 'slot_saved' : 'slot_save_failed'), res.ok ? '#5a9a6e' : '#b33a3a', 1600);
      if (res.ok) this.scene.restart({ mode: this.mode, from: this.from });
    };
    if (existing) {
      showConfirm(this, {
        title: t('slot_overwrite'),
        body: t('slot_confirm_overwrite'),
        yes: t('slot_overwrite_yes'),
        no: t('slot_no'),
        onYes: commit,
      });
    } else {
      commit();
    }
  }

  private read(slot: number): void {
    const loaded = loadGame(slot);
    if (!loaded) {
      showToast(this, t('slot_load_failed'), '#b33a3a', 1600);
      return;
    }
    audio.sfx('click');
    transitionTo(this, 'Hub');
  }

  private erase(slot: number): void {
    showConfirm(this, {
      title: t('slot_delete'),
      body: t('slot_confirm_delete'),
      yes: t('slot_delete_yes'),
      no: t('slot_no'),
      onYes: () => {
        deleteSave(slot);
        audio.sfx('click');
        this.scene.restart({ mode: this.mode, from: this.from });
      },
    });
  }
}

/** Re-exported so callers do not need to reach into `state.ts` for the range. */
export { MANUAL_SLOTS };
