import Phaser from 'phaser';
import { t, locName } from '../i18n';
import { getState, mutate, saveGame } from '../state';
import { canTravel, travelTo } from '../systems/travel';
import { MAP_NODES, MAP_NODE_MAP } from '../data/map';
import { GAME_WIDTH, GAME_HEIGHT } from '../types';
import { drawBackground, makeButton, bodyText, panel, titleText, COLORS, addDecorImage } from '../ui/theme';
import { audio } from '../audio/AudioManager';
import { ads, ADS_ENABLED } from '../ads/AdService';
import { isTouchDevice } from '../mobile';
import { transitionTo } from '../ui/fx';
import { installSceneKeys } from '../ui/input';

export class TravelMapScene extends Phaser.Scene {
  constructor() {
    super('TravelMap');
  }

  create(): void {
    void audio.setContext('travel_map');
    drawBackground(this, 'map');
    if (this.textures.exists('art_map')) {
      this.add
        .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'art_map')
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
        .setAlpha(0.9)
        .disableInteractive();
    } else {
      addDecorImage(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, 'art_map', GAME_WIDTH, GAME_HEIGHT, 0.9);
    }

    titleText(this, GAME_WIDTH / 2, 40, t('travel'), '32px');
    const s = getState();
    bodyText(
      this,
      GAME_WIDTH / 2,
      75,
      `${t('location')}: ${locName(s.locationId)} · ${t('horse')}: ${s.cart.horseHealth}%`,
      {
        fontSize: '16px',
        color: '#2a1c14',
      },
    ).setOrigin(0.5);

    const g = this.add.graphics();
    g.lineStyle(3, 0x5c3d24, 0.7);
    for (const node of MAP_NODES) {
      for (const c of node.connections) {
        const other = MAP_NODE_MAP[c];
        if (!other || c < node.id) continue;
        g.lineBetween(node.x, node.y + 40, other.x, other.y + 40);
      }
    }

    const touch = isTouchDevice();
    const radius = touch ? 28 : 16;

    for (const node of MAP_NODES) {
      const here = node.id === s.locationId;
      const reach = canTravel(s, node.id).ok || here;
      const color = here ? COLORS.gold : reach ? COLORS.green : COLORS.muted;
      const r = here ? radius + 4 : radius;
      const circle = this.add.circle(node.x, node.y + 40, r, color, 0.95);
      circle.setStrokeStyle(2, 0x1f140c);
      const label = this.add
        .text(node.x, node.y + 70 + (touch ? 8 : 0), locName(node.id), {
          fontFamily: 'Georgia, serif',
          fontSize: touch ? '15px' : '13px',
          color: '#1f140c',
          backgroundColor: '#e8d5a8cc',
          padding: { x: 6, y: 4 },
        })
        .setOrigin(0.5);

      if (!here && reach) {
        // Large invisible hit pad for fingers
        const hit = this.add
          .circle(node.x, node.y + 40, Math.max(r + 12, 36), 0xffffff, 0.001)
          .setInteractive({ useHandCursor: true });
        hit.on('pointerdown', () => this.doTravel(node.id));
        label.setInteractive({ useHandCursor: true });
        label.on('pointerdown', () => this.doTravel(node.id));
      }
    }

    panel(this, 40, GAME_HEIGHT - 110, GAME_WIDTH - 80, 90, 0.92);
    bodyText(this, 60, GAME_HEIGHT - 95, t('travel_help'), {
      fontSize: '14px',
      wordWrap: { width: 980 },
      color: '#e8d5a8',
    });
    bodyText(this, 60, GAME_HEIGHT - 55, t('travel_help2'), {
      fontSize: '13px',
      wordWrap: { width: 980 },
      color: '#a88',
    });

    makeButton(this, GAME_WIDTH - 120, GAME_HEIGHT - 55, t('back'), () => transitionTo(this, 'Hub'), {
      width: 140,
      height: 40,
      fontSize: '15px',
    });
    installSceneKeys(this, { onBack: () => transitionTo(this, 'Hub') });
  }

  private doTravel(toId: string): void {
    let messageKey = '';
    let days = 0;
    let encounter = 'none';
    mutate((s) => {
      const res = travelTo(s, toId);
      messageKey = res.messageKey;
      days = res.days;
      encounter = res.encounter;
    });
    audio.sfx('cart');
    audio.sfx('horse');
    // Web-portal builds only; dropped entirely from the desktop bundle.
    if (ADS_ENABLED) void ads.showInterstitial('travel');
    saveGame();
    transitionTo(this, 'TravelResult', { messageKey, days, encounter, toId });
  }
}

export class TravelResultScene extends Phaser.Scene {
  constructor() {
    super('TravelResult');
  }

  create(data: { messageKey: string; days: number; encounter: string; toId: string }): void {
    void audio.setContext('travel_result');
    drawBackground(this, 'dark');
    panel(this, GAME_WIDTH / 2 - 300, 180, 600, 320);
    titleText(this, GAME_WIDTH / 2, 220, t('encounter'), '28px');
    bodyText(this, GAME_WIDTH / 2, 280, t('arrive', { days: data.days }), {
      fontSize: '18px',
      color: '#e8d5a8',
    }).setOrigin(0.5);
    bodyText(this, GAME_WIDTH / 2, 340, t(data.messageKey), {
      fontSize: '18px',
      color: '#c4a574',
      wordWrap: { width: 520 },
      align: 'center',
    }).setOrigin(0.5);
    bodyText(this, GAME_WIDTH / 2, 400, locName(data.toId), {
      fontSize: '20px',
      color: '#e8c547',
    }).setOrigin(0.5);

    makeButton(this, GAME_WIDTH / 2, 460, t('continue'), () => {
      transitionTo(this, 'Hub');
    });
    installSceneKeys(this, { onBack: () => transitionTo(this, 'Hub') });
  }
}
