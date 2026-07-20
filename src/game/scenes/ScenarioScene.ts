import Phaser from 'phaser';
import { t, techName } from '../i18n';
import { getState, mutate, saveGame } from '../state';
import { applyScenarioChoice, getScenario } from '../systems/scenarios';
import { GAME_WIDTH, GAME_HEIGHT } from '../types';
import { drawBackground, makeButton, bodyText, panel, titleText, woodPanel } from '../ui/theme';
import { audio } from '../audio/AudioManager';
import { sceneBackground, transitionTo } from '../ui/fx';
import { installSceneKeys } from '../ui/input';

/**
 * Multi-choice scenario set piece with painted background + outcome summary.
 */
export class ScenarioScene extends Phaser.Scene {
  private scenarioId = '';
  private outcomeMode = false;
  private outcomeLines: string[] = [];

  constructor() {
    super('Scenario');
  }

  init(data: { scenarioId?: string; outcome?: string[] }): void {
    this.scenarioId = data.scenarioId ?? '';
    this.outcomeLines = data.outcome ?? [];
    this.outcomeMode = !!data.outcome?.length;
  }

  create(): void {
    const sc = getScenario(this.scenarioId);
    if (!sc) {
      this.scene.start('Hub');
      return;
    }

    void audio.setContext('city_event');
    drawBackground(this, 'dark');

    // Scenarios are the game's dramatic beats — let the painting carry them.
    sceneBackground(this, sc.bgKey, { brightness: 0.72, topScrim: 90, bottomScrim: 80 });

    if (this.textures.exists('art_seal')) {
      this.add
        .image(GAME_WIDTH - 90, 90, 'art_seal')
        .setDisplaySize(100, 100)
        .setAlpha(0.85)
        .disableInteractive();
    }

    if (this.outcomeMode) {
      this.renderOutcome(sc.titleKey);
      return;
    }

    woodPanel(this, 100, 60, GAME_WIDTH - 200, 200, 0.94);
    titleText(this, GAME_WIDTH / 2, 95, t(sc.titleKey), '28px');
    bodyText(this, GAME_WIDTH / 2, 160, t(sc.bodyKey), {
      fontSize: '16px',
      wordWrap: { width: GAME_WIDTH - 280 },
      align: 'center',
      color: '#e8d5a8',
    }).setOrigin(0.5);

    woodPanel(this, 140, 290, GAME_WIDTH - 280, 360, 0.94);
    bodyText(this, 170, 310, t('scenario_choose'), { fontSize: '15px', color: '#e8c547' });

    sc.choices.forEach((ch, i) => {
      makeButton(
        this,
        GAME_WIDTH / 2,
        370 + i * 70,
        t(ch.textKey),
        () => {
          let lines: string[] = [];
          mutate((st) => {
            const out = applyScenarioChoice(st, sc.id, i);
            lines = out.effectLines;
          });
          audio.sfx(i === 0 ? 'success' : 'page');
          saveGame();
          this.scene.restart({ scenarioId: sc.id, outcome: lines.length ? lines : ['done'] });
        },
        { width: 720, height: 56, fontSize: '15px' },
      );
    });
  }

  private renderOutcome(titleKey: string): void {
    woodPanel(this, 160, 120, GAME_WIDTH - 320, 420, 0.96);
    titleText(this, GAME_WIDTH / 2, 170, t(titleKey), '26px');
    bodyText(this, GAME_WIDTH / 2, 220, t('scenario_result'), {
      fontSize: '16px',
      color: '#e8c547',
    }).setOrigin(0.5);

    const s = getState();
    const labels = this.outcomeLines.map((line) => this.formatLine(line)).filter(Boolean);
    labels.forEach((lab, i) => {
      bodyText(this, GAME_WIDTH / 2, 270 + i * 28, lab, {
        fontSize: '17px',
        color: lab.startsWith('−') || lab.includes('-') ? '#c07070' : '#8fbc8f',
      }).setOrigin(0.5);
    });

    bodyText(
      this,
      GAME_WIDTH / 2,
      440,
      `${t('rep_folk')}: ${Math.round(s.repFolk)} · ${t('rep_elite')}: ${Math.round(s.repElite)} · ${t('rep_fame')}: ${Math.round(s.repFame)}`,
      { fontSize: '14px', color: '#c4a574' },
    ).setOrigin(0.5);

    makeButton(
      this,
      GAME_WIDTH / 2,
      500,
      t('continue'),
      () => {
        transitionTo(this, 'Hub');
      },
      { width: 220, height: 52 },
    );
    installSceneKeys(this, { onBack: () => transitionTo(this, 'Hub') });
  }

  private formatLine(raw: string): string {
    if (raw === 'done') return t('scenario_result_ok');
    const [k, v] = raw.split(':');
    if (!k || v === undefined) return raw;
    const map: Record<string, string> = {
      coin: t('coin'),
      folk: t('rep_folk'),
      elite: t('rep_elite'),
      fame: t('rep_fame'),
      local: t('rep_local'),
      ethics: t('ethics'),
      guild: t('guild'),
      church: t('church'),
      council: t('council_short'),
      unlock: t('scenario_unlocked'),
    };
    const label = map[k] ?? k;
    if (k === 'unlock') return `${label}: ${techName(v)}`;
    return `${label} ${v}`;
  }
}
