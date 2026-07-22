/**
 * Character creation.
 *
 * This replaces a screen that was seven first names in a row and nothing else:
 * no portrait, no stats, no consequence, and — because it called
 * `drawBackground` rather than `sceneBackground` — no painting either, just the
 * procedural gradient. Every run began identically.
 *
 * The screen now leads with **origin**, because that is where the variance
 * lives (see `data/origins.ts`), and shows the trade openly: skill against
 * standing. The name is chosen second, from a period-appropriate list that
 * changes with the origin.
 */
import Phaser from 'phaser';
import { t, getLocale, techName } from '../i18n';
import { createNewGame, setState } from '../state';
import { makeButton, titleText, bodyText, panel, drawBackground } from '../ui/theme';
import { GAME_HEIGHT, GAME_WIDTH } from '../types';
import { audio } from '../audio/AudioManager';
import { transitionTo, sceneBackground } from '../ui/fx';
import { installSceneKeys } from '../ui/input';
import { addPortrait } from '../ui/art';
import { ORIGINS, applyOriginStats } from '../data/origins';
import { defaultStats } from '../state';
import { HONOUR_START } from '../systems/honour';
import { compact, fontFor, touchTargetHeight } from '../ui/responsive';

/** Card geometry, kept here so the two layout passes cannot drift apart. */
const CARD_W = 388;
const CARD_H = 132;
const COL_X = [GAME_WIDTH / 2 - CARD_W - 16, GAME_WIDTH / 2, GAME_WIDTH / 2 + CARD_W + 16];
const ROW_Y = [188, 330];

export class CharacterScene extends Phaser.Scene {
  private originIdx = 0;
  private name = ORIGINS[0]!.names[0]!;

  constructor() {
    super('NameEntry');
  }

  create(): void {
    void audio.setContext('name_entry');
    drawBackground(this, 'menu');
    sceneBackground(this, 'art_menu', {
      fallbacks: ['menu_bg'],
      brightness: 0.5, // dimmer than the menu: this screen is dense with text
      topScrim: 90,
      bottomScrim: 140,
      depth: -20,
    });

    const origin = ORIGINS[this.originIdx]!;

    if (compact()) {
      this.renderCompact(origin);
      installSceneKeys(this, { onBack: () => transitionTo(this, 'MainMenu') });
      return;
    }

    titleText(this, GAME_WIDTH / 2, 46, t('choose_origin'), '28px');

    ORIGINS.forEach((o, i) => {
      this.drawCard(o, i, COL_X[i % 3]!, ROW_Y[Math.floor(i / 3)]!);
    });

    /* ── Detail of the selected origin ─────────────────────────────── */
    const detailY = 424;
    panel(this, GAME_WIDTH / 2 - 470, detailY, 940, 96);
    bodyText(this, GAME_WIDTH / 2, detailY + 26, t(origin.descKey), {
      fontSize: '14px',
      color: '#d8c9a8',
      align: 'center',
      wordWrap: { width: 900 },
    }).setOrigin(0.5, 0);
    bodyText(this, GAME_WIDTH / 2, detailY + 76, t(origin.hintKey), {
      fontSize: '13px',
      color: '#e8c547',
      align: 'center',
    }).setOrigin(0.5, 0);

    /* ── Name ──────────────────────────────────────────────────────── */
    // The origin's name list changes with it, so a widow is not offered Wolfram.
    if (!origin.names.includes(this.name)) this.name = origin.names[0]!;

    bodyText(this, GAME_WIDTH / 2 - 300, 546, `${t('origin_name_label')}:`, {
      fontSize: '15px',
      color: '#a8c0c4',
    }).setOrigin(1, 0.5);

    origin.names.forEach((n, i) => {
      const selected = n === this.name;
      makeButton(
        this,
        GAME_WIDTH / 2 - 210 + i * 150,
        546,
        n,
        () => {
          this.name = n;
          this.scene.restart({ originIdx: this.originIdx, name: n });
        },
        {
          width: 140,
          height: 38,
          fontSize: '15px',
          fill: selected ? 0x6d5a2f : undefined,
        },
      );
    });

    // Six cards plus four names exhaust the 1-9 number keys, so the most
    // important button on the screen would otherwise have no shortcut at all.
    // `primary` binds it to Enter.
    makeButton(this, GAME_WIDTH / 2, 620, t('start'), () => this.begin(), {
      width: 300,
      height: 46,
      primary: true,
    });
    makeButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 34, t('back'), () =>
      transitionTo(this, 'MainMenu'), {
      width: 180,
      height: 34,
      fontSize: '15px',
      back: true,
    });

    installSceneKeys(this, { onBack: () => transitionTo(this, 'MainMenu') });
  }

  init(data: { originIdx?: number; name?: string }): void {
    if (typeof data?.originIdx === 'number') this.originIdx = data.originIdx;
    if (data?.name) this.name = data.name;
  }

  /**
   * One origin card: portrait, name, the five stats, and the two numbers that
   * carry the actual decision — purse and standing.
   */
  private drawCard(
    origin: (typeof ORIGINS)[number],
    idx: number,
    cx: number,
    cy: number,
  ): void {
    const selected = idx === this.originIdx;

    // The button is the hit target and the frame; everything else sits on top.
    makeButton(this, cx, cy, '', () => this.scene.restart({ originIdx: idx }), {
      width: CARD_W,
      height: CARD_H,
      fill: selected ? 0x6d5a2f : undefined,
    });

    const left = cx - CARD_W / 2;
    // Commissioned portraits do not exist yet; until they do this falls back to
    // a distinct existing face per origin rather than six identical ones.
    const portrait = this.textures.exists(origin.portraitKey)
      ? origin.portraitKey
      : origin.fallbackPortrait;
    addPortrait(this, left + 62, cy, portrait, { size: 92, depth: 5 });

    const textX = left + 146;
    bodyText(this, textX, cy - 44, t(origin.nameKey), {
      fontSize: '17px',
      color: selected ? '#f0d98a' : '#e8d5a8',
    })
      .setOrigin(0, 0.5)
      .setDepth(6);

    const stats = applyOriginStats(defaultStats(), origin);
    bodyText(this, textX, cy - 16, t('origin_stats', stats as unknown as Record<string, number>), {
      fontSize: '12px',
      color: '#a8c0c4',
    })
      .setOrigin(0, 0.5)
      .setDepth(6);

    // Signed, because the sign is the whole point of the comparison.
    const purse = 35 + origin.coin;
    const standing = HONOUR_START + origin.honour;
    bodyText(
      this,
      textX,
      cy + 10,
      `${t('origin_purse')} ${purse}   ${t('origin_standing')} ${standing}`,
      { fontSize: '12px', color: origin.honour < 0 ? '#c98a6a' : '#8aa87a' },
    )
      .setOrigin(0, 0.5)
      .setDepth(6);

    const knows = origin.techniques.length
      ? origin.techniques.map((id) => techName(id)).join(', ')
      : t('origin_knows_none');
    bodyText(this, textX, cy + 36, `${t('origin_knows')}: ${knows}`, {
      fontSize: '11px',
      color: '#9a8878',
      wordWrap: { width: CARD_W - 164 },
    })
      .setOrigin(0, 0.5)
      .setDepth(6);
  }

  /** One chosen origin at a time; six miniature dossiers are not phone UI. */
  private renderCompact(origin: (typeof ORIGINS)[number]): void {
    const h = touchTargetHeight();
    const originCount = ORIGINS.length;
    const choose = (delta: number) => {
      const idx = (this.originIdx + delta + originCount) % originCount;
      this.scene.restart({ originIdx: idx, name: ORIGINS[idx]!.names[0] });
    };

    titleText(this, GAME_WIDTH / 2, 34, t('choose_origin'), fontFor('title'));
    makeButton(this, 120, 76, t('back'), () => transitionTo(this, 'MainMenu'), {
      width: 190, height: h, fontSize: fontFor('button'), back: true,
    });

    panel(this, 170, 138, 940, 178);
    makeButton(this, 92, 226, '‹', () => choose(-1), {
      width: 120, height: h, fontSize: fontFor('title'), noHotkey: true,
    });
    makeButton(this, 1188, 226, '›', () => choose(1), {
      width: 120, height: h, fontSize: fontFor('title'), noHotkey: true,
    });

    const portrait = this.textures.exists(origin.portraitKey)
      ? origin.portraitKey
      : origin.fallbackPortrait;
    addPortrait(this, 300, 227, portrait, { size: 148, depth: 5 });
    const stats = applyOriginStats(defaultStats(), origin);
    const purse = 35 + origin.coin;
    const standing = HONOUR_START + origin.honour;
    bodyText(this, 410, 166, t(origin.nameKey), {
      fontSize: fontFor('heading'), color: '#f0d98a', wordWrap: { width: 620 },
    }).setOrigin(0, 0.5);
    bodyText(this, 410, 204, t('origin_stats', stats as unknown as Record<string, number>), {
      fontSize: fontFor('small'), color: '#a8c0c4', wordWrap: { width: 620 },
    }).setOrigin(0, 0.5);
    bodyText(this, 410, 238, `${t('origin_purse')} ${purse}   ${t('origin_standing')} ${standing}`, {
      fontSize: fontFor('small'), color: origin.honour < 0 ? '#c98a6a' : '#8aa87a', wordWrap: { width: 620 },
    }).setOrigin(0, 0.5);
    const knows = origin.techniques.length
      ? origin.techniques.map((id) => techName(id)).join(', ')
      : t('origin_knows_none');
    bodyText(this, 410, 272, `${t('origin_knows')}: ${knows}`, {
      fontSize: fontFor('small'), color: '#9a8878', wordWrap: { width: 620 },
    }).setOrigin(0, 0.5);

    panel(this, 120, 326, 1040, 82, 0.82);
    bodyText(this, GAME_WIDTH / 2, 336, t(origin.descKey), {
      fontSize: fontFor('small'), color: '#d8c9a8', align: 'center', wordWrap: { width: 1000 },
    }).setOrigin(0.5, 0);

    if (!origin.names.includes(this.name)) this.name = origin.names[0]!;
    origin.names.forEach((n, i) => {
      const selected = n === this.name;
      makeButton(this, i % 2 === 0 ? 390 : 890, 470 + Math.floor(i / 2) * (h + 7), n, () => {
        this.scene.restart({ originIdx: this.originIdx, name: n });
      }, {
        width: 400, height: h, fontSize: fontFor('button'), fill: selected ? 0x6d5a2f : undefined,
      });
    });
    makeButton(this, GAME_WIDTH / 2, 670, t('start'), () => this.begin(), {
      width: 520, height: h, fontSize: fontFor('button'), primary: true,
    });
  }

  private begin(): void {
    const origin = ORIGINS[this.originIdx]!;
    setState(createNewGame(this.name, getLocale(), origin.id));
    void audio.setContext('dialogue');
    transitionTo(this, 'Dialogue', { dialogueId: 'intro_1' });
  }
}
