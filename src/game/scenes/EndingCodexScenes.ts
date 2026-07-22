import Phaser from 'phaser';
import { t } from '../i18n';
import { getState, mutate } from '../state';
import { GAME_WIDTH, GAME_HEIGHT } from '../types';
import { drawBackground, makeButton, bodyText, panel, titleText } from '../ui/theme';
import { audio } from '../audio/AudioManager';
import { sceneBackground, transitionTo } from '../ui/fx';
import { epilogueLines } from '../systems/story';
import { installSceneKeys } from '../ui/input';
import { MANUAL_CHAPTERS } from '../data/manual';
import { sourceById } from '../data/historicalSources';
import { compact, fontFor, touchTargetHeight } from '../ui/responsive';

export class EndingScene extends Phaser.Scene {
  constructor() {
    super('Ending');
  }

  create(): void {
    const s = getState();
    void audio.setContext('ending');
    audio.sfx('bell');
    drawBackground(this, 'dark');
    // The ending is the last thing a player sees — let the painting carry it.
    sceneBackground(this, 'art_menu', { brightness: 0.55, topScrim: 90 });
    titleText(this, GAME_WIDTH / 2, 120, t('ending_title'), '40px');

    const key =
      s.ending === 'master_bath'
        ? 'ending_master_bath'
        : s.ending === 'council_surgeon'
          ? 'ending_council_surgeon'
          : s.ending === 'wandering_healer'
            ? 'ending_wandering_healer'
            : s.ending === 'dynasty'
              ? 'ending_dynasty'
              : 'ending_ruined';

    panel(this, 140, 180, GAME_WIDTH - 280, 300);
    bodyText(this, GAME_WIDTH / 2, 230, t(key), {
      fontSize: '20px',
      wordWrap: { width: 800 },
      align: 'center',
      color: '#e8d5a8',
    }).setOrigin(0.5);

    /*
     * How the town remembers you.
     *
     * The ending paragraph was identical for every run that reached it, while
     * the game counted alms, verdicts, deaths, the rival and the marriage
     * without the epilogue ever reading any of it. Three lines at most — an
     * epitaph, not a ledger; the full accounting is the line of figures below.
     */
    const remembered = epilogueLines(s).slice(0, 3);
    let ey = 300;
    for (const lineKey of remembered) {
      const line = bodyText(this, GAME_WIDTH / 2, ey, t(lineKey), {
        fontSize: '15px',
        color: '#c9b48a',
        wordWrap: { width: 760 },
        align: 'center',
      }).setOrigin(0.5, 0);
      ey += line.height + 8;
    }

    bodyText(
      this,
      GAME_WIDTH / 2,
      Math.max(430, ey + 18),
      `${s.playerName} · ${t('day', { n: s.day })} · ${t('coin')}: ${s.coin} · ${t('ethics')}: ${s.ethics}\n${t('prestige')}: ${s.prestige ?? 0} · ${t('total_treated', { n: s.totalTreated })}`,
      { fontSize: '15px', color: '#c4a574', align: 'center' },
    ).setOrigin(0.5);

    makeButton(this, GAME_WIDTH / 2 - 140, 540, t('free_play'), () => {
      mutate((st) => {
        st.freePlay = true;
      });
      transitionTo(this, 'Hub');
    }, { width: 240 });

    makeButton(this, GAME_WIDTH / 2 + 140, 520, t('menu_new'), () => {
      transitionTo(this, 'MainMenu');
    }, { width: 200 });
  }
}

export class CodexScene extends Phaser.Scene {
  private page = 0;

  constructor() {
    super('Codex');
  }

  init(data: { page?: number }): void {
    this.page = data.page ?? 0;
  }

  create(): void {
    void audio.setContext('codex');
    drawBackground(this, 'room');
    sceneBackground(this, 'bg_guild', { brightness: 0.44, topScrim: 60 });
    titleText(this, GAME_WIDTH / 2, 36, t('manual_lexicon_title'), '30px');

    const s = getState();
    const chapter = MANUAL_CHAPTERS[this.page % MANUAL_CHAPTERS.length]!;
    const isCompact = compact();

    panel(this, 50, isCompact ? 86 : 70, GAME_WIDTH - 100, isCompact ? 454 : 520);
    titleText(this, 80, isCompact ? 120 : 104, t(chapter.titleKey), isCompact ? fontFor('heading') : '23px').setOrigin(0, 0.5);
    bodyText(this, 80, isCompact ? 162 : 138, t(chapter.bodyKey), {
      fontSize: isCompact ? fontFor('body') : '15px', wordWrap: { width: GAME_WIDTH - 160 }, lineSpacing: isCompact ? 8 : 5,
    });
    bodyText(this, 80, isCompact ? 474 : 520, `${t('lex_source')}: ${chapter.sourceIds.map((id) => sourceById(id).title).join(' · ')}`, {
      fontSize: isCompact ? fontFor('small') : '12px', color: '#92b99b', wordWrap: { width: GAME_WIDTH - 160 },
    });

    const buttonH = isCompact ? touchTargetHeight() : 40;
    const navY = isCompact ? 650 : GAME_HEIGHT - 55;
    makeButton(this, isCompact ? 220 : 200, navY, t('codex_prev'), () => {
      this.scene.restart({ page: (this.page + MANUAL_CHAPTERS.length - 1) % MANUAL_CHAPTERS.length });
    }, { width: isCompact ? 300 : 140, height: buttonH, fontSize: isCompact ? fontFor('button') : undefined });
    if (!isCompact) {
      makeButton(this, GAME_WIDTH / 2 - 120, GAME_HEIGHT - 55, `${this.page + 1}/${MANUAL_CHAPTERS.length}`, () => {}, {
        width: 100, height: 40, disabled: true,
      });
    }
    makeButton(this, isCompact ? 1060 : GAME_WIDTH - 200, navY, t('codex_next'), () => {
      this.scene.restart({ page: (this.page + 1) % MANUAL_CHAPTERS.length });
    }, { width: isCompact ? 300 : 140, height: buttonH, fontSize: isCompact ? fontFor('button') : undefined });
    makeButton(this, isCompact ? GAME_WIDTH / 2 : GAME_WIDTH / 2 + 40, navY, isCompact ? `${t('lexicon_title')} · ${this.page + 1}/${MANUAL_CHAPTERS.length}` : t('lexicon_title'), () => {
      transitionTo(this, 'Lexicon', { from: 'Codex' });
    }, { width: isCompact ? 380 : 170, height: buttonH, fontSize: isCompact ? fontFor('button') : '13px' });
    const goBack = () => {
      if (s.day > 1 || s.storyFlags['intro_done']) transitionTo(this, 'Hub');
      else transitionTo(this, 'MainMenu');
    };
    makeButton(this, isCompact ? GAME_WIDTH - 105 : GAME_WIDTH - 80, isCompact ? 56 : 40, t('back'), goBack, {
      width: isCompact ? 190 : 100,
      height: isCompact ? Math.min(touchTargetHeight(), 86) : 36,
      fontSize: isCompact ? fontFor('small') : '14px',
    });
    installSceneKeys(this, { onBack: goBack });
  }
}
