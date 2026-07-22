import Phaser from 'phaser';
import { t } from '../i18n';
import { GAME_HEIGHT, GAME_WIDTH } from '../types';
import { drawBackground, makeButton, bodyText, panel, titleText } from '../ui/theme';
import { APP_RELEASE_LABEL } from '../appInfo';
import { sceneBackground, transitionTo } from '../ui/fx';
import { installSceneKeys } from '../ui/input';
import { compact, fontFor, touchTargetHeight } from '../ui/responsive';

const RELEASES = [
  { version: 'v1.3.1', titleKey: 'release_131_title', bodyKey: 'release_131_body' },
  { version: 'v1.3.0', titleKey: 'release_130_title', bodyKey: 'release_130_body' },
] as const;

/**
 * Player-facing changes, kept in the game instead of only in a store post.
 *
 * The menu intentionally shows the current and immediately prior release:
 * that is enough context for a returning player without turning the first
 * screen into a changelog archive.
 */
export class ReleaseNotesScene extends Phaser.Scene {
  private page = 0;

  constructor() {
    super('ReleaseNotes');
  }

  init(data?: { page?: number }): void {
    this.page = Math.max(0, Math.min(RELEASES.length - 1, data?.page ?? 0));
  }

  create(): void {
    drawBackground(this, 'room');
    sceneBackground(this, 'art_menu', { brightness: 0.5, topScrim: 90, bottomScrim: 80 });
    const isCompact = compact();
    const release = RELEASES[this.page]!;
    const top = isCompact ? 82 : 70;
    const height = isCompact ? 470 : 490;

    titleText(this, GAME_WIDTH / 2, isCompact ? 38 : 40, `${t('release_notes_title')} · ${APP_RELEASE_LABEL}`, isCompact ? fontFor('title') : '30px');
    panel(this, 70, top, GAME_WIDTH - 140, height);
    titleText(this, 105, top + 42, t(release.titleKey), isCompact ? fontFor('heading') : '24px').setOrigin(0, 0.5);
    bodyText(this, 105, top + 82, t(release.bodyKey), {
      fontSize: isCompact ? fontFor('body') : '17px',
      wordWrap: { width: GAME_WIDTH - 210 },
      lineSpacing: isCompact ? 8 : 6,
      color: '#e8d5a8',
    });
    bodyText(this, 105, top + height - 42, `${this.page + 1}/${RELEASES.length} · ${this.page === 0 ? APP_RELEASE_LABEL : t('release_notes_previous')}`, {
      fontSize: isCompact ? fontFor('small') : '13px', color: '#a8c0c4',
    });

    const buttonH = isCompact ? touchTargetHeight() : 42;
    const buttonY = isCompact ? 650 : GAME_HEIGHT - 52;
    makeButton(this, isCompact ? 230 : 260, buttonY, t('codex_prev'), () => {
      this.scene.restart({ page: Math.max(0, this.page - 1) });
    }, { width: isCompact ? 300 : 180, height: buttonH, disabled: this.page === 0, noHotkey: true });
    makeButton(this, isCompact ? 1050 : 1020, buttonY, t('codex_next'), () => {
      this.scene.restart({ page: Math.min(RELEASES.length - 1, this.page + 1) });
    }, { width: isCompact ? 300 : 180, height: buttonH, disabled: this.page === RELEASES.length - 1, noHotkey: true });
    makeButton(this, GAME_WIDTH / 2, buttonY, t('back'), () => transitionTo(this, 'MainMenu'), {
      width: isCompact ? 360 : 190,
      height: buttonH,
      back: true,
    });
    installSceneKeys(this, { onBack: () => transitionTo(this, 'MainMenu') });
  }
}
