import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../types';
import { bodyText, panel, makeButton, COLORS, titleText, pushButtonLayer, popButtonLayer } from './theme';
import { t } from '../i18n';
import { installSceneKeys } from './input';
import type { NextStep } from '../systems/guidance';

/** Persistent bottom help bar */
export function helpBar(scene: Phaser.Scene, textKey: string, y = GAME_HEIGHT - 28): void {
  bodyText(scene, GAME_WIDTH / 2, y, t(textKey), {
    fontSize: '13px',
    color: '#a88',
    wordWrap: { width: GAME_WIDTH - 80 },
    align: 'center',
  }).setOrigin(0.5);
}

/** “Next step” advisor card */
export function nextStepCard(
  scene: Phaser.Scene,
  step: NextStep,
  x: number,
  y: number,
  w = 400,
  h = 100,
): void {
  panel(scene, x, y, w, h, 0.92);
  bodyText(scene, x + 14, y + 10, `★ ${t(step.titleKey)}`, {
    fontSize: '15px',
    color: '#e8c547',
  });
  bodyText(scene, x + 14, y + 36, t(step.bodyKey), {
    fontSize: '13px',
    color: '#e8d5a8',
    wordWrap: { width: w - 28 },
  });
}

/** Section label above button groups */
export function sectionLabel(scene: Phaser.Scene, x: number, y: number, key: string): void {
  bodyText(scene, x, y, t(key), {
    fontSize: '13px',
    color: '#c4a574',
  }).setOrigin(0.5);
}

/** Column centres and row positions inside a `groupCard`. */
export interface CardGrid {
  col: (i: number) => number;
  row: (i: number) => number;
  colWidth: number;
}

/**
 * Labelled panel holding a grid of buttons.
 *
 * The Hub previously stacked 18 buttons in a flat run with section captions
 * drawn a few pixels above each row — close enough that the buttons painted
 * straight over the captions. Grouping them into cards gives the captions
 * their own space and makes the screen scannable.
 */
export function groupCard(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  labelKey: string,
  cols = 2,
  rowPitch = 46,
): CardGrid {
  panel(scene, x, y, w, h, 0.82);
  bodyText(scene, x + w / 2, y + 14, t(labelKey), {
    fontSize: '13px',
    color: '#e8c547',
  }).setOrigin(0.5);

  const pad = 16;
  const gap = 12;
  const colWidth = (w - pad * 2 - gap * (cols - 1)) / cols;
  return {
    colWidth,
    col: (i: number) => x + pad + colWidth / 2 + i * (colWidth + gap),
    row: (i: number) => y + 52 + i * rowPitch,
  };
}

/** Highlight primary CTA with gold fill */
export function primaryFill(isPrimary: boolean): number | undefined {
  return isPrimary ? 0x6b4a1e : undefined;
}

/** Small info modal — How to play snippet */
export function showInfoModal(scene: Phaser.Scene, titleKey: string, bodyKey: string): void {
  // Shadow the scene's buttons so keys address the modal, not the screen behind.
  pushButtonLayer(scene);
  const depth = 7000;
  const veil = scene.add
    .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7)
    .setDepth(depth)
    .setInteractive();
  const box = scene.add.graphics().setDepth(depth + 1);
  box.fillStyle(COLORS.panel, 0.98);
  box.fillRoundedRect(GAME_WIDTH / 2 - 340, GAME_HEIGHT / 2 - 200, 680, 400, 12);
  box.lineStyle(3, COLORS.gold, 0.9);
  box.strokeRoundedRect(GAME_WIDTH / 2 - 340, GAME_HEIGHT / 2 - 200, 680, 400, 12);

  const title = titleText(scene, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 160, t(titleKey), '26px').setDepth(
    depth + 2,
  );
  const body = bodyText(scene, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, t(bodyKey), {
    fontSize: '16px',
    wordWrap: { width: 600 },
    align: 'center',
    color: '#e8d5a8',
  })
    .setOrigin(0.5)
    .setDepth(depth + 2);

  const close = makeButton(
    scene,
    GAME_WIDTH / 2,
    GAME_HEIGHT / 2 + 140,
    t('got_it'),
    () => {
      veil.destroy();
      box.destroy();
      title.destroy();
      body.destroy();
      close.destroy();
      popButtonLayer(scene);
      installSceneKeys(scene, { chips: false });
    },
    { width: 200, height: 48, primary: true, back: true },
  );
  close.setDepth(depth + 2);

  installSceneKeys(scene, { chips: false });
}

/** Flow chips for treatment: 1 Examine → 2 Technique → 3 Steady hand */
export function flowSteps(
  scene: Phaser.Scene,
  x: number,
  y: number,
  active: 1 | 2 | 3,
): void {
  const steps = [
    { n: 1, key: 'flow_examine' },
    { n: 2, key: 'flow_choose' },
    { n: 3, key: 'flow_steady' },
  ];
  steps.forEach((s, i) => {
    const on = s.n === active;
    const lx = x + i * 170;
    const g = scene.add.graphics();
    g.fillStyle(on ? COLORS.gold : COLORS.panelLight, on ? 0.9 : 0.7);
    g.fillRoundedRect(lx, y, 155, 28, 6);
    bodyText(scene, lx + 77, y + 14, `${s.n}. ${t(s.key)}`, {
      fontSize: '12px',
      color: on ? '#1a120c' : '#e8d5a8',
    }).setOrigin(0.5);
  });
}
