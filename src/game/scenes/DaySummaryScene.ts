/**
 * End-of-day ledger.
 *
 * Closing the day used to drop the player straight back on the Hub with no
 * feedback at all — you could work a full day and never see what it earned.
 * This shows the takings, costs and standing before handing back control.
 */
import Phaser from 'phaser';
import { t } from '../i18n';
import { GAME_HEIGHT, GAME_WIDTH } from '../types';
import { bodyText, makeButton, panel, titleText, woodPanel } from '../ui/theme';
import { floatingNumber, panelIn, sceneBackground, transitionTo } from '../ui/fx';
import { installSceneKeys } from '../ui/input';
import { audio } from '../audio/AudioManager';

export interface DaySummaryData {
  day: number;
  treated: number;
  earned: number;
  reputation: number;
  /** Purse at close of trading, before overnight settlement. */
  coinBefore: number;
  /** Purse after wages, upkeep and remote income. */
  coinAfter: number;
  /** Opening costs, already deducted before trading began. */
  morningCost: number;
}

export class DaySummaryScene extends Phaser.Scene {
  constructor() {
    super('DaySummary');
  }

  create(data: DaySummaryData): void {
    void audio.setContext('hub');
    sceneBackground(this, 'art_home', {
      fallbacks: ['art_bath', 'bath_bg'],
      brightness: 0.5,
      topScrim: 60,
    });

    const boxW = 640;
    const boxX = GAME_WIDTH / 2 - boxW / 2;
    const box = woodPanel(this, boxX, 130, boxW, 400, 0.95);
    const heading = titleText(this, GAME_WIDTH / 2, 175, t('day_summary_title', { n: data.day }), '30px');
    panelIn(this, [box, heading]);

    // Every coin that moved today: opening costs (already paid), fees taken,
    // and the overnight settlement of wages, upkeep and remote income.
    // Naively differencing the purse would report only the last of those.
    const overnight = data.coinAfter - data.coinBefore;
    const costs = data.morningCost - Math.min(0, overnight);
    const net = data.earned - data.morningCost + overnight;

    const rows: [string, string, string][] = [
      [t('day_summary_treated'), String(data.treated), '#e8d5a8'],
      [t('day_summary_earned'), `+${data.earned}`, '#5a9a6e'],
      [t('day_summary_costs'), `-${costs}`, costs > 0 ? '#b33a3a' : '#c4a574'],
      [
        t('day_summary_net'),
        `${net >= 0 ? '+' : ''}${net}`,
        net >= 0 ? '#5a9a6e' : '#b33a3a',
      ],
      [
        t('day_summary_reputation'),
        `${data.reputation >= 0 ? '+' : ''}${data.reputation}`,
        data.reputation >= 0 ? '#5a9a6e' : '#b33a3a',
      ],
      [t('day_summary_purse'), String(data.coinAfter), '#e8c547'],
    ];

    const rowTop = 232;
    const rowPitch = 42;
    const rowY = (i: number) => rowTop + i * rowPitch;

    rows.forEach(([label, value, color], i) => {
      const y = rowY(i);
      bodyText(this, boxX + 48, y, label, { fontSize: '17px', color: '#c4a574' }).setOrigin(0, 0.5);
      bodyText(this, boxX + boxW - 48, y, value, { fontSize: '19px', color }).setOrigin(1, 0.5);
    });

    // Drift the two figures that actually change the player's position.
    if (data.earned > 0) {
      floatingNumber(this, boxX + boxW - 120, rowY(1), `+${data.earned}`, '#e8c547', 250);
    }
    if (data.reputation !== 0) {
      floatingNumber(
        this,
        boxX + boxW - 120,
        rowY(4),
        `${data.reputation > 0 ? '+' : ''}${data.reputation}`,
        data.reputation > 0 ? '#5a9a6e' : '#b33a3a',
        450,
      );
    }

    if (data.treated === 0) {
      panel(this, boxX + 40, 466, boxW - 80, 46, 0.7);
      bodyText(this, GAME_WIDTH / 2, 489, t('day_summary_idle'), {
        fontSize: '14px',
        color: '#a8c0c4',
        wordWrap: { width: boxW - 110 },
        align: 'center',
      }).setOrigin(0.5);
    }

    makeButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 110, t('continue'), () => transitionTo(this, 'Hub'), {
      width: 260,
      height: 50,
      primary: true,
    });

    installSceneKeys(this, { onBack: () => transitionTo(this, 'Hub') });
  }
}
