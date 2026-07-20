import Phaser from 'phaser';
import { t } from '../i18n';
import { getState } from '../state';
import { GAME_WIDTH, GAME_HEIGHT } from '../types';
import { drawBackground, makeButton, bodyText, panel, titleText } from '../ui/theme';
import { addManagementBackground } from '../ui/art';
import { audio } from '../audio/AudioManager';
import { transitionTo } from '../ui/fx';
import { installSceneKeys } from '../ui/input';

/**
 * Full “How to play” guide — multi-page, EN/DE via i18n.
 */
export class HelpScene extends Phaser.Scene {
  private page = 0;
  private readonly pages = ['basics', 'treat', 'money', 'travel', 'grow', 'rep', 'save'] as const;

  constructor() {
    super('Help');
  }

  init(data: { page?: number }): void {
    this.page = data.page ?? 0;
  }

  create(): void {
    void audio.setContext('codex');
    drawBackground(this, 'dark');
    addManagementBackground(this, 'bg_settings');
    titleText(this, GAME_WIDTH / 2, 40, t('help_title'), '32px');

    const id = this.pages[this.page % this.pages.length]!;
    panel(this, 80, 80, GAME_WIDTH - 160, 500);

    bodyText(this, 110, 100, t(`help_page_${id}_title`), {
      fontSize: '22px',
      color: '#e8c547',
    });
    bodyText(this, 110, 150, t(`help_page_${id}_body`), {
      fontSize: '16px',
      wordWrap: { width: GAME_WIDTH - 240 },
      color: '#e8d5a8',
      lineSpacing: 6,
    });

    bodyText(
      this,
      GAME_WIDTH / 2,
      560,
      `${this.page + 1} / ${this.pages.length}`,
      { fontSize: '14px', color: '#8a7a68' },
    ).setOrigin(0.5);

    makeButton(this, 220, 620, t('codex_prev'), () => {
      this.scene.restart({ page: (this.page + this.pages.length - 1) % this.pages.length });
    }, { width: 140 });
    makeButton(this, GAME_WIDTH - 220, 620, t('codex_next'), () => {
      this.scene.restart({ page: (this.page + 1) % this.pages.length });
    }, { width: 140 });
    const goBack = () => {
      const s = getState();
      if (s.day > 1 || s.storyFlags['intro_done']) transitionTo(this, 'Hub');
      else transitionTo(this, 'MainMenu');
    };
    makeButton(this, GAME_WIDTH / 2, 620, t('back'), goBack, { width: 160 });
    installSceneKeys(this, { onBack: goBack });
  }
}
