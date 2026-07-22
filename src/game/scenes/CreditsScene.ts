/**
 * Credits and attribution.
 *
 * Required before shipping: the third-party licences have to be acknowledged
 * somewhere in the product, not only in the repository. Also surfaces the save
 * location on desktop, which is the first thing a player asks when they want to
 * back up or move a game.
 */
import Phaser from 'phaser';
import { t } from '../i18n';
import { GAME_HEIGHT, GAME_WIDTH } from '../types';
import { bodyText, drawBackground, makeButton, panel, titleText } from '../ui/theme';
import { transitionTo } from '../ui/fx';
import { installSceneKeys } from '../ui/input';
import { addManagementBackground } from '../ui/art';
import { audio } from '../audio/AudioManager';
import { getState } from '../state';
import { APP_RELEASE_LABEL } from '../appInfo';

declare global {
  interface Window {
    __lancetDesktop?: { savePath: () => Promise<string> };
  }
}

export class CreditsScene extends Phaser.Scene {
  constructor() {
    super('Credits');
  }

  create(): void {
    void audio.setContext('codex');
    drawBackground(this, 'dark');
    addManagementBackground(this, 'bg_settings');
    titleText(this, GAME_WIDTH / 2, 48, t('credits_title'), '30px');
    bodyText(this, GAME_WIDTH - 72, 48, APP_RELEASE_LABEL, {
      fontSize: '13px', color: '#c4a574', align: 'right',
    }).setOrigin(1, 0.5);

    panel(this, 140, 96, GAME_WIDTH - 280, 470);

    bodyText(this, 180, 124, t('credits_body'), {
      fontSize: '15px',
      color: '#e8d5a8',
      wordWrap: { width: GAME_WIDTH - 360 },
      lineSpacing: 4,
    });

    // Third-party notices. Phaser is MIT, i18next is MIT — both require the
    // notice to travel with the distributed product.
    bodyText(this, 180, 330, t('credits_thirdparty'), {
      fontSize: '13px',
      color: '#c4a574',
      wordWrap: { width: GAME_WIDTH - 360 },
      lineSpacing: 3,
    });

    // Save location: only meaningful on the packaged desktop build.
    const saveLine = bodyText(this, 180, 470, '', {
      fontSize: '13px',
      color: '#a8c0c4',
      wordWrap: { width: GAME_WIDTH - 360 },
    });
    const desktop = typeof window !== 'undefined' ? window.__lancetDesktop : undefined;
    if (desktop) {
      void desktop
        .savePath()
        .then((p) => saveLine.setText(t('credits_save_path', { path: p })))
        .catch(() => saveLine.setText(''));
    } else {
      saveLine.setText(t('credits_save_browser'));
    }

    const back = () => {
      const s = getState();
      transitionTo(this, s.day > 1 || s.storyFlags['intro_done'] ? 'Hub' : 'MainMenu');
    };
    makeButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 60, t('back'), back, {
      width: 240,
      back: true,
    });
    installSceneKeys(this, { onBack: back });
  }
}
