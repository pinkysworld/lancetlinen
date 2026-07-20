import Phaser from 'phaser';
import { t, techName } from '../i18n';
import { getState, mutate } from '../state';
import { TECHNIQUES } from '../data/techniques';
import { CODEX_LORE_KEYS } from '../data/history';
import { bloodlettingDayModifier, currentZodiac } from '../data/history';
import { GAME_WIDTH, GAME_HEIGHT } from '../types';
import { drawBackground, makeButton, bodyText, panel, titleText } from '../ui/theme';
import { audio } from '../audio/AudioManager';
import { sceneBackground, transitionTo } from '../ui/fx';
import { installSceneKeys } from '../ui/input';

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

    panel(this, 140, 200, GAME_WIDTH - 280, 220);
    bodyText(this, GAME_WIDTH / 2, 280, t(key), {
      fontSize: '22px',
      wordWrap: { width: 800 },
      align: 'center',
      color: '#e8d5a8',
    }).setOrigin(0.5);

    bodyText(
      this,
      GAME_WIDTH / 2,
      400,
      `${s.playerName} · ${t('day', { n: s.day })} · ${t('coin')}: ${s.coin} · ${t('ethics')}: ${s.ethics}\n${t('prestige')}: ${s.prestige ?? 0} · ${t('total_treated', { n: s.totalTreated })}`,
      { fontSize: '16px', color: '#c4a574', align: 'center' },
    ).setOrigin(0.5);

    makeButton(this, GAME_WIDTH / 2 - 140, 520, t('free_play'), () => {
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
    titleText(this, GAME_WIDTH / 2, 36, t('codex_title'), '30px');

    const s = getState();
    const pages = [
      'overview',
      'humors',
      'blood',
      'lore',
      'techniques',
      'astro',
      'honour',
      'sources',
    ] as const;
    const mode = pages[this.page % pages.length]!;

    panel(this, 50, 70, GAME_WIDTH - 100, 520);

    if (mode === 'overview') {
      bodyText(this, 80, 95, t('codex_bader'), { fontSize: '16px', wordWrap: { width: 720 } });
      bodyText(this, 80, 220, t('lore_church_1163'), { fontSize: '15px', wordWrap: { width: 720 } });
      bodyText(this, 80, 360, t('lore_badestube'), { fontSize: '15px', wordWrap: { width: 720 } });
      if (this.textures.exists('art_tools')) {
        this.add.image(GAME_WIDTH - 200, 320, 'art_tools').setDisplaySize(280, 200).setAlpha(0.9).disableInteractive();
      }
    } else if (mode === 'humors') {
      bodyText(this, 80, 95, t('codex_humors'), { fontSize: '16px', wordWrap: { width: 560 } });
      bodyText(this, 80, 220, t('lore_humors'), { fontSize: '15px', wordWrap: { width: 560 } });
      if (this.textures.exists('art_humors')) {
        this.add.image(GAME_WIDTH - 260, 340, 'art_humors').setDisplaySize(380, 300).disableInteractive();
      }
    } else if (mode === 'blood') {
      bodyText(this, 80, 95, t('lore_bloodletting'), { fontSize: '16px', wordWrap: { width: 1100 } });
      bodyText(this, 80, 250, t('lore_cupping_leech'), { fontSize: '15px', wordWrap: { width: 1100 } });
      bodyText(this, 80, 400, t('lore_convalescence'), { fontSize: '15px', wordWrap: { width: 1100 } });
    } else if (mode === 'lore') {
      bodyText(this, 80, 95, t('lore_guild'), { fontSize: '15px', wordWrap: { width: 1100 } });
      bodyText(this, 80, 240, t('lore_women_bader'), { fontSize: '15px', wordWrap: { width: 1100 } });
      bodyText(this, 80, 380, t('lore_bader_role'), { fontSize: '15px', wordWrap: { width: 1100 } });
    } else if (mode === 'techniques') {
      const known = TECHNIQUES.filter((tech) => s.unlockedTechniques.includes(tech.id))
        .map((tech) => techName(tech.id))
        .join(', ');
      bodyText(this, 80, 100, `${t('technique')}:\n${known || '—'}`, {
        fontSize: '16px',
        wordWrap: { width: 1100 },
        color: '#e8c547',
      });
      bodyText(this, 80, 320, t('lore_zodiac'), { fontSize: '15px', wordWrap: { width: 1100 } });
    } else if (mode === 'honour') {
      // The trade's central social fact, and the axis the whole game turns on.
      titleText(this, GAME_WIDTH / 2, 92, t('codex_honour_title'), '22px');
      bodyText(this, 80, 122, t('codex_honour_body'), {
        fontSize: '14px',
        wordWrap: { width: 1100 },
        lineSpacing: 3,
      });
    } else if (mode === 'sources') {
      // What is attested versus what is dramatised. This is the page that makes
      // the research visible rather than merely claimed.
      bodyText(this, 80, 95, t('codex_sources_intro'), {
        fontSize: '15px',
        wordWrap: { width: 1100 },
      });
      bodyText(this, 80, 182, t('codex_sources_attested'), {
        fontSize: '14px',
        color: '#5a9a6e',
        wordWrap: { width: 1100 },
        lineSpacing: 2,
      });
      bodyText(this, 80, 398, t('codex_sources_dramatised'), {
        fontSize: '14px',
        color: '#c9a227',
        wordWrap: { width: 1100 },
        lineSpacing: 2,
      });
    } else {
      const z = currentZodiac(s);
      const astro = bloodlettingDayModifier(s);
      bodyText(
        this,
        80,
        110,
        `${t('astro_today')}\n${t(`zodiac_${z}`)} — ${t(astro.key.replace(/\./g, '_'))}\n\n${t('lore_zodiac')}`,
        { fontSize: '17px', wordWrap: { width: 1100 } },
      );
    }

    makeButton(this, 200, GAME_HEIGHT - 55, t('codex_prev'), () => {
      this.scene.restart({ page: (this.page + pages.length - 1) % pages.length });
    }, { width: 140, height: 40 });
    makeButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 55, `${this.page + 1}/${pages.length}`, () => {}, {
      width: 100,
      height: 40,
      disabled: true,
    });
    makeButton(this, GAME_WIDTH - 200, GAME_HEIGHT - 55, t('codex_next'), () => {
      this.scene.restart({ page: (this.page + 1) % pages.length });
    }, { width: 140, height: 40 });
    const goBack = () => {
      if (s.day > 1 || s.storyFlags['intro_done']) transitionTo(this, 'Hub');
      else transitionTo(this, 'MainMenu');
    };
    makeButton(this, GAME_WIDTH - 80, 40, t('back'), goBack, {
      width: 100,
      height: 36,
      fontSize: '14px',
    });
    installSceneKeys(this, { onBack: goBack });
  }
}
