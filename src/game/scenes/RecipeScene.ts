/**
 * The workbench.
 *
 * Replaces the single "brew salve" button that stood in for compounding. Each
 * row is a recipe from `data/recipes.ts` with what it needs, what it yields,
 * and why it was made — the description carries the history, since a player
 * who wants to know what oxymel *is* should not have to leave the screen.
 */
import Phaser from 'phaser';
import { t } from '../i18n';
import { getState, mutate, saveGame } from '../state';
import { GAME_HEIGHT, GAME_WIDTH } from '../types';
import { bodyText, drawBackground, makeButton, panel, titleText, hudText } from '../ui/theme';
import { transitionTo, sceneBackground } from '../ui/fx';
import { installSceneKeys } from '../ui/input';
import { audio } from '../audio/AudioManager';
import { showToast } from '../ui/dialogs';
import { RECIPES, craft, craftBlocker, remedyCount } from '../data/recipes';

export class RecipeScene extends Phaser.Scene {
  private from = 'Study';

  constructor() {
    super('Recipes');
  }

  init(data: { from?: string }): void {
    if (data?.from) this.from = data.from;
  }

  create(): void {
    void audio.setContext('study');
    drawBackground(this, 'room');
    sceneBackground(this, 'bg_study', {
      fallbacks: ['bg_monastery'],
      brightness: 0.42,
      topScrim: 70,
      bottomScrim: 60,
    });

    titleText(this, GAME_WIDTH / 2, 36, t('recipes_title'), '28px');
    bodyText(this, GAME_WIDTH / 2, 64, t('recipes_intro'), {
      fontSize: '13px',
      color: '#a8967c',
    }).setOrigin(0.5);

    const s = getState();
    hudText(this, 48, 88, `${t('coin')}: ${s.coin}`);

    panel(this, 40, 108, GAME_WIDTH - 80, 500);

    RECIPES.forEach((r, i) => {
      const y = 138 + i * 58;
      const blocker = craftBlocker(s, r);
      const have = remedyCount(s, r.id);

      bodyText(this, 66, y - 12, t(r.nameKey), {
        fontSize: '16px',
        color: blocker ? '#8a7a68' : '#e8d5a8',
      });

      // Ingredients spelled out rather than abbreviated — the whole point of
      // the screen is that the player learns what goes into these.
      const needs = Object.entries(r.ingredients)
        .map(([item, n]) => `${n}× ${t(`inv_${item}`)}`)
        .join(', ');
      bodyText(
        this,
        66,
        y + 10,
        `${t('recipe_needs')}: ${needs} · ${t('coin_amount', { n: r.coin })}  —  ` +
          `${t('recipe_makes')} ${r.yield} · ${t('recipe_have')} ${have}`,
        { fontSize: '12px', color: '#9a8878', wordWrap: { width: 630 } },
      );

      // The description is the history; it is why this screen is worth having.
      // Right edge of this column must clear the button column at x≈1150,
      // or the history text runs underneath it and is unreadable.
      bodyText(this, 720, y - 14, t(r.descKey), {
        fontSize: '10px',
        color: '#8a7a68',
        wordWrap: { width: 340 },
        lineSpacing: 1,
      });

      const label = blocker
        ? blocker === 'skill'
          ? t('recipe_no_skill')
          : blocker === 'coin'
            ? t('recipe_no_coin')
            : t('recipe_no_stock')
        : t('recipe_craft');

      makeButton(this, GAME_WIDTH - 130, y, label, () => this.prepare(r.id), {
        width: 150,
        height: 34,
        fontSize: '13px',
        disabled: !!blocker,
        // Eight rows plus back would swamp the number keys.
        noHotkey: true,
      });
    });

    makeButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 34, t('back'), () =>
      transitionTo(this, this.from), {
      width: 200,
      height: 38,
      fontSize: '15px',
      back: true,
    });
    installSceneKeys(this, { onBack: () => transitionTo(this, this.from) });
  }

  /** Named `prepare`, not `make`: Phaser.Scene already has a `make`. */
  private prepare(id: string): void {
    let made = 0;
    let quality = 0;
    mutate((st) => {
      const res = craft(st, id);
      made = res.made ?? 0;
      quality = res.quality ?? 0;
    });
    if (made > 0) {
      audio.sfx('page');
      saveGame();
      showToast(
        this,
        t('recipe_made', { n: made, q: Math.round(quality * 100) }),
        '#5a9a6e',
        1800,
      );
    }
    this.scene.restart({ from: this.from });
  }
}
