/**
 * The steady-hand minigame.
 *
 * Replaces the original inline timing bar, which had two problems:
 *
 *  1. **Skill was inverted.** Marker speed was `0.012 + hand * 0.001`, so a
 *     higher Hand stat made the marker move *faster* — training your character
 *     made the minigame harder. Skill now slows the marker and widens the
 *     target instead.
 *  2. **Difficulty was constant.** The green zone was a hard-coded 16% of the
 *     track for every technique and every patient. It now narrows with the
 *     technique's risk and the patient's severity, so a deep wound on a dying
 *     man is visibly harder than a shave.
 *
 * Returns a 0..1 accuracy score, with a narrow "perfect" band worth full marks.
 */
import Phaser from 'phaser';
import { GAME_WIDTH } from '../types';
import { COLORS, makeButton, bodyText, panel, titleText } from './theme';
import { bindKey } from './input';
import { SERIF, reduceMotion } from './fx';
import { t } from '../i18n';
import { greenZoneWidth, markerSpeed, type SkillCheckParams } from '../systems/skillcurve';
import { audio } from '../audio/AudioManager';

// Re-exported so existing importers keep working.
export { greenZoneWidth, markerSpeed };
export type { SkillCheckParams };

export interface SkillCheckResult {
  /** 0..1, feeds `applyTreatment`'s skillBonus. */
  score: number;
  perfect: boolean;
}

/**
 * Build the minigame UI into `scene`. Calls `onDone` exactly once.
 *
 * The caller owns teardown (TreatmentScene clears its dynamic layer), so this
 * only cleans up the timer and key binding.
 */
export function runSkillCheck(
  scene: Phaser.Scene,
  params: SkillCheckParams,
  onDone: (result: SkillCheckResult) => void,
): void {
  const zone = greenZoneWidth(params);
  const speed = markerSpeed(params);
  const greenStart = 0.5 - zone / 2;
  const perfectW = Math.max(0.02, zone * 0.28);
  const perfectStart = 0.5 - perfectW / 2;

  // Optional technique-specific still (pulse hands / dental tools)
  let backdrop: string | null = null;
  if (params.techniqueId) {
    const id = params.techniqueId;
    if (
      id.includes('tooth') ||
      id.includes('mouth') ||
      id.includes('gum') ||
      id.includes('tartar') ||
      id === 'cauterize_mouth' ||
      id === 'scale_tartar' ||
      id === 'gum_lance'
    ) {
      backdrop = 'art_dental';
    } else if (
      id === 'bloodletting' ||
      id === 'leeches' ||
      id === 'cupping' ||
      id === 'scarify' ||
      id === 'wound_dress' ||
      id === 'abscess_lance'
    ) {
      backdrop = 'art_pulse';
    }
  }
  if (backdrop && scene.textures.exists(backdrop)) {
    scene.add
      .image(GAME_WIDTH / 2, 360, backdrop)
      .setDisplaySize(GAME_WIDTH * 0.55, 420)
      .setAlpha(0.35)
      .disableInteractive();
  }

  panel(scene, GAME_WIDTH / 2 - 300, 160, 600, 340);
  titleText(scene, GAME_WIDTH / 2, 195, t('skill_check'), '22px');
  bodyText(scene, GAME_WIDTH / 2, 235, params.techniqueLabel, {
    fontSize: '18px',
    color: '#e8d5a8',
  }).setOrigin(0.5);
  bodyText(scene, GAME_WIDTH / 2, 265, t('skill_check_help'), {
    fontSize: '14px',
    color: '#c4a574',
    wordWrap: { width: 520 },
    align: 'center',
  }).setOrigin(0.5);

  const trackX = GAME_WIDTH / 2 - 200;
  const trackY = 340;
  const trackW = 400;

  const g = scene.add.graphics();
  g.fillStyle(COLORS.ink, 0.85);
  g.fillRoundedRect(trackX, trackY, trackW, 26, 6);
  g.fillStyle(COLORS.greenBright, 0.85);
  g.fillRoundedRect(trackX + trackW * greenStart, trackY, trackW * zone, 26, 4);
  g.fillStyle(COLORS.goldBright, 0.9);
  g.fillRoundedRect(trackX + trackW * perfectStart, trackY, trackW * perfectW, 26, 3);

  const marker = scene.add.rectangle(trackX, trackY + 13, 7, 36, COLORS.white);
  marker.setStrokeStyle(2, COLORS.ink, 0.8);

  let dir = 1;
  let pos = 0;
  let done = false;

  const timer = scene.time.addEvent({
    delay: 16,
    loop: true,
    callback: () => {
      pos += dir * speed;
      if (pos >= 1) {
        pos = 1;
        dir = -1;
      } else if (pos <= 0) {
        pos = 0;
        dir = 1;
      }
      marker.x = trackX + pos * trackW;
    },
  });

  // One commit path, shared by button, track tap and keyboard — the original
  // duplicated this logic three times and guarded double-fire after the fact.
  const commit = () => {
    if (done) return;
    done = true;
    timer.remove(false);
    disposeKey();

    const inGreen = pos >= greenStart && pos <= greenStart + zone;
    const inPerfect = pos >= perfectStart && pos <= perfectStart + perfectW;
    // Outside the green, fall off smoothly with distance from centre.
    const dist = Math.abs(pos - 0.5);
    const score = inPerfect ? 1 : inGreen ? 0.8 : Math.max(0, 1 - dist * 2.6);

    audio.sfx(inGreen ? 'click' : 'page');
    if (!reduceMotion()) {
      scene.tweens.add({
        targets: marker,
        scaleY: { from: 1.6, to: 1 },
        duration: 160,
        ease: 'Quad.easeOut',
      });
    }
    onDone({ score, perfect: inPerfect });
  };

  makeButton(scene, GAME_WIDTH / 2, 440, t('click_now'), commit, {
    width: 320,
    height: 56,
    fontSize: '20px',
    primary: true,
  });

  // The track itself is also a target — easier on touch than the button alone.
  scene.add
    .rectangle(GAME_WIDTH / 2, trackY + 13, trackW + 40, 60, 0xffffff, 0.001)
    .setInteractive({ useHandCursor: true })
    .on('pointerdown', commit);

  const disposeKey = bindKey(scene, [' ', 'Spacebar', 'Enter'], commit);

  scene.add
    .text(GAME_WIDTH / 2, 480, t('skill_check_key'), {
      fontFamily: SERIF,
      fontSize: '13px',
      color: '#8a7a68',
    })
    .setOrigin(0.5);
}
