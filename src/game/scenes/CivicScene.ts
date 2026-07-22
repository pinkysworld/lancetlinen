import Phaser from 'phaser';
import { t, locName } from '../i18n';
import { getState, mutate, saveGame } from '../state';
import { consequencesHere, canSecureCityConsequence, secureCityConsequence } from '../systems/cityConsequences';
import { GAME_WIDTH } from '../types';
import { drawBackground, makeButton, bodyText, panel, titleText, hudText } from '../ui/theme';
import { explain, gatedButton } from '../ui/gated';
import { addLocationBackground } from '../ui/art';
import { sceneBackground, transitionTo } from '../ui/fx';
import { installSceneKeys } from '../ui/input';
import { compact, fontFor, primarySize, secondarySize } from '../ui/responsive';
import { audio } from '../audio/AudioManager';
import { showToast } from '../ui/dialogs';

/**
 * Local trade and council consequences.
 *
 * This stays separate from long-distance correspondence: the player must be
 * in the named city, meet its public threshold and accept a bounded local
 * arrangement. It makes a city matter after arrival instead of treating the
 * map as a sequence of interchangeable shops.
 */
export class CivicScene extends Phaser.Scene {
  constructor() {
    super('Civic');
  }

  create(): void {
    void audio.setContext('politics');
    drawBackground(this, 'room');
    // The new council painting belongs only to Nürnberg. Augsburg keeps its
    // location art, so a city-specific consequence does not erase locality.
    if (getState().locationId === 'nurnberg' && this.textures.exists('bg_cinematic_council')) {
      sceneBackground(this, 'bg_cinematic_council', { brightness: 0.56, topScrim: 92 });
    } else {
      addLocationBackground(this, { brightness: 0.56, topScrim: 92 });
    }
    if (compact()) this.renderCompact();
    else this.renderDesktop();
    installSceneKeys(this, { onBack: () => transitionTo(this, 'Hub') });
  }

  private renderDesktop(): void {
    const state = getState();
    const here = consequencesHere(state);
    titleText(this, GAME_WIDTH / 2, 42, t('city_consequences_title'), '30px');
    hudText(this, 40, 80, `${locName(state.locationId)} · ${t('coin')}: ${state.coin} · ${t('rep_local')}: ${Math.round(state.reputation[state.locationId] ?? 0)}`);

    if (!here.length) {
      panel(this, 160, 150, 960, 300, 0.94);
      bodyText(this, GAME_WIDTH / 2, 250, t('city_consequences_none'), {
        fontSize: '19px', color: '#e8d5a8', align: 'center', wordWrap: { width: 760 },
      }).setOrigin(0.5);
    } else {
      const consequence = here[0]!;
      const req = canSecureCityConsequence(state, consequence.id);
      panel(this, 140, 126, 1000, 400, 0.95);
      titleText(this, GAME_WIDTH / 2, 162, t(consequence.titleKey), '23px');
      bodyText(this, 190, 212, t(consequence.bodyKey), {
        fontSize: '16px', color: '#e8d5a8', wordWrap: { width: 900 }, lineSpacing: 4,
      });
      bodyText(this, 190, 338, t(consequence.effectKey), {
        fontSize: '15px', color: '#a8c0c4', wordWrap: { width: 900 }, lineSpacing: 3,
      });
      gatedButton(this, GAME_WIDTH / 2, 438, t('city_consequence_secure', { coin: consequence.coinCost }), req, () => {
        mutate((next) => { secureCityConsequence(next, consequence.id); });
        audio.sfx(consequence.sphere === 'trade' ? 'market' : 'guild');
        saveGame();
        showToast(this, t('city_consequence_secured', { name: t(consequence.titleKey) }), '#5a9a6e');
        this.scene.restart();
      }, { width: 560, height: 50, primary: true });
      if (!req.ok) {
        bodyText(this, GAME_WIDTH / 2, 474, explain(req), {
          fontSize: '13px', color: '#c4a574', align: 'center', wordWrap: { width: 560 },
        }).setOrigin(0.5, 0);
      }
    }

    makeButton(this, GAME_WIDTH / 2, 640, t('back'), () => transitionTo(this, 'Hub'), { width: 240, back: true });
  }

  private renderCompact(): void {
    const state = getState();
    const here = consequencesHere(state);
    const primary = primarySize();
    const secondary = secondarySize();
    const cx = GAME_WIDTH / 2;
    titleText(this, cx, 44, t('city_consequences_title'), fontFor('title'));
    bodyText(this, cx, 82, `${locName(state.locationId)} · ${t('coin')}: ${state.coin}`, {
      fontSize: fontFor('heading'), color: '#e8d5a8', align: 'center',
    }).setOrigin(0.5);

    if (!here.length) {
      panel(this, 60, 124, GAME_WIDTH - 120, 330, 0.96);
      bodyText(this, cx, 270, t('city_consequences_none'), {
        fontSize: fontFor('body'), color: '#e8d5a8', align: 'center', wordWrap: { width: 920 },
      }).setOrigin(0.5);
    } else {
      const consequence = here[0]!;
      const req = canSecureCityConsequence(state, consequence.id);
      panel(this, 60, 118, GAME_WIDTH - 120, 450, 0.96);
      titleText(this, cx, 152, t(consequence.titleKey), fontFor('heading'));
      const description = bodyText(this, 92, 196, t(consequence.bodyKey), {
        fontSize: fontFor('small'), color: '#e8d5a8', wordWrap: { width: GAME_WIDTH - 184 }, lineSpacing: 3,
      });
      const effect = bodyText(this, 92, Math.max(322, description.y + description.height + 16), t(consequence.effectKey), {
        fontSize: fontFor('small'), color: '#a8c0c4', wordWrap: { width: GAME_WIDTH - 184 }, lineSpacing: 2,
      });
      // The gated label itself carries the short refusal reason. A separate
      // paragraph here would collide with the 44-CSS-pixel Back row on the
      // shortest Safari viewport.
      const actionY = effect.y + effect.height + primary.height / 2 + 12;
      gatedButton(this, cx, actionY, t('city_consequence_secure', { coin: consequence.coinCost }), req, () => {
        mutate((next) => { secureCityConsequence(next, consequence.id); });
        audio.sfx(consequence.sphere === 'trade' ? 'market' : 'guild');
        saveGame();
        showToast(this, t('city_consequence_secured', { name: t(consequence.titleKey) }), '#5a9a6e');
        this.scene.restart();
      }, { ...primary, width: 760, fontSize: fontFor('button'), primary: true });
      if (!req.ok) {
        const reason = bodyText(this, cx, actionY + primary.height / 2 + 12, explain(req), {
          fontSize: fontFor('small'), color: '#c4a574', wordWrap: { width: 960 }, align: 'center',
        }).setOrigin(0.5, 0);
        // Do not replace one overlap with another on the shortest viewport.
        // The gated face still carries its concise reason if this paragraph
        // would reach the Back target.
        if (reason.y + reason.height > 582) reason.destroy();
      }
    }

    makeButton(this, cx, 640, t('back'), () => transitionTo(this, 'Hub'), {
      ...secondary, width: 380, back: true, noHotkey: true,
    });
  }
}
