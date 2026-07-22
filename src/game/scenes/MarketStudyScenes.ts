import Phaser from 'phaser';
import { t, techName, techDesc, locName } from '../i18n';
import { getState, mutate, saveGame } from '../state';
import {
  buySupplies,
  sellSupplies,
  canBuySupplies,
  canSellSupplies,
  sellPrice,
  craftSalve,
  marketPrices,
  unlockTechnique,
  upgradeBath,
} from '../systems/economy';
import { canRepairCart, repairCart, restHorse } from '../systems/travel';
import { buyProperty, canUpgradeProperty, getLocalBath, buyPropertyRequirement } from '../systems/property';
import { TECHNIQUES } from '../data/techniques';
import { mentorCitiesFor, isMentorOnly, SELF_TAUGHT_MULTIPLIER } from '../data/mentors';
import { marketNoteKey } from '../data/prices';
import { gatedButton } from '../ui/gated';
import { GAME_WIDTH, GAME_HEIGHT } from '../types';
import { drawBackground, makeButton, bodyText, panel, titleText, hudText, addHudIcon } from '../ui/theme';
import { audio } from '../audio/AudioManager';
import { sceneBackground, transitionTo } from '../ui/fx';
import { installSceneKeys } from '../ui/input';
import { addManagementBackground } from '../ui/art';
import { compact, fontFor } from '../ui/responsive';
// audio contexts: market / study / property

export class MarketScene extends Phaser.Scene {
  constructor() {
    super('Market');
  }

  create(): void {
    void audio.setContext('market');
    audio.sfx('market');
    drawBackground(this, 'room');
    sceneBackground(this, 'bg_cinematic_market', {
      fallbacks: ['bg_market'], brightness: 0.52, topScrim: 80,
    });
    titleText(this, GAME_WIDTH / 2, 50, t('market'), '32px');
    const s = getState();
    const prices = marketPrices(s);
    addHudIcon(this, 40, 100, 'icon_coin', 28);
    hudText(this, 60, 90, `${t('coin')}: ${s.coin}`);

    // Name what this market is good for. Prices now vary by settlement, and a
    // difference the player cannot see is not depth — it is just noise in the
    // numbers. This is the line that turns it into a reason to travel.
    bodyText(this, 240, 92, t(marketNoteKey(s.locationId)), {
      fontSize: compact() ? fontFor('small') : '14px',
      color: '#c9b48a',
      wordWrap: { width: GAME_WIDTH - 300 },
    });

    panel(this, 80, 130, GAME_WIDTH - 160, compact() ? 540 : 480);
    const items = Object.keys(prices) as (keyof typeof prices)[];
    items.forEach((item, i) => {
      const y = 160 + i * (compact() ? 66 : 48);
      const inv = s.inventory[item as keyof typeof s.inventory] ?? 0;
      addHudIcon(this, 105, y + 10, `icon_${item}`, 26);
      bodyText(
        this,
        130,
        y,
        `${t(`inv_${item}`)}: ${inv}  —  ${t('buy')} ${prices[item]} · ${t('sell')} ${sellPrice(prices[item]!)}`,
        { fontSize: compact() ? fontFor('small') : '15px' },
      );
      gatedButton(
        this,
        compact() ? 880 : 806,
        y + 10,
        `${t('buy')} +1`,
        canBuySupplies(s, 1, prices[item]!),
        () => {
          mutate((st) => {
            buySupplies(st, item as keyof typeof st.inventory, 1, prices[item]!);
          });
          saveGame();
          this.scene.restart();
        },
        { width: compact() ? 150 : 132, height: compact() ? 56 : 32, fontSize: compact() ? fontFor('button') : '14px', noHotkey: true },
      );
      if (!compact()) gatedButton(
        this,
        946,
        y + 10,
        `${t('buy')} +5`,
        canBuySupplies(s, 5, prices[item]!),
        () => {
          mutate((st) => {
            buySupplies(st, item as keyof typeof st.inventory, 5, prices[item]!);
          });
          saveGame();
          this.scene.restart();
        },
        { width: compact() ? 150 : 132, height: compact() ? 56 : 32, fontSize: compact() ? fontFor('button') : '14px', noHotkey: true },
      );
      // Selling was never implemented, yet `cannot_afford_day` told the player
      // to do exactly this when they ran out of coin. Disabled rather than
      // hidden when the shelf is empty, so the option is visibly there.
      gatedButton(
        this,
        compact() ? 1060 : 1086,
        y + 10,
        `${t('sell')} +1`,
        canSellSupplies(s, item as keyof typeof s.inventory, 1),
        () => {
          mutate((st) => {
            sellSupplies(st, item as keyof typeof st.inventory, 1, prices[item]!);
          });
          saveGame();
          this.scene.restart();
        },
        { width: compact() ? 150 : 132, height: compact() ? 56 : 32, fontSize: compact() ? fontFor('button') : '14px', fill: 0x5a4a2f, noHotkey: true },
      );
    });

    makeButton(this, GAME_WIDTH / 2, compact() ? 690 : 660, t('back'), () => transitionTo(this, 'Hub'), compact() ? { width: 320, height: 56, fontSize: fontFor('button') } : {});
    installSceneKeys(this, { onBack: () => transitionTo(this, 'Hub') });
  }
}

export class StudyScene extends Phaser.Scene {
  constructor() {
    super('Study');
  }

  create(): void {
    void audio.setContext('study');
    drawBackground(this, 'room');
    // Study is reading and practice — the monastery library reads right.
    addManagementBackground(this, 'bg_study');
    titleText(this, GAME_WIDTH / 2, 40, t('study'), '32px');
    const s = getState();
    hudText(this, 50, 80, `${t('coin')}: ${s.coin}`);

    // The single "brew salve" button became a whole bench — see RecipeScene.
    makeButton(this, 300, 130, t('recipes_title'), () =>
      transitionTo(this, 'Recipes', { from: 'Study' }), {
      width: 400, height: 44, fontSize: '15px',
    });

    makeButton(this, 700, 130, t('rest_horse'), () => {
      mutate((st) => restHorse(st));
      saveGame();
      this.scene.restart();
    }, { width: 280 });

    // Repairing needs an iron tool as well as coin, and the button greyed on
    // coin alone — so a player with a full purse and no tools saw no reason.
    gatedButton(this, 1000, 130, t('repair_cart'), canRepairCart(s), () => {
      mutate((st) => repairCart(st));
      saveGame();
      this.scene.restart();
    }, { width: 220, height: 44, fontSize: '14px' });

    panel(this, 40, 180, GAME_WIDTH - 80, 420);
    bodyText(this, 60, 195, t('unlock'), { fontSize: '20px', color: '#e8c547' });

    bodyText(this, 60, 222, t('study_self_taught_help'), {
      fontSize: '13px',
      color: '#a8c0c4',
      wordWrap: { width: 1100 },
    });

    const locked = TECHNIQUES.filter((tech) => !s.unlockedTechniques.includes(tech.id));
    locked.slice(0, 9).forEach((tech, i) => {
      const y = 264 + i * 34;

      // Working an art out alone costs far more than paying a master. Naming
      // where it is taught turns the Study screen into a travel prompt rather
      // than a shop that makes travel pointless.
      const price = Math.round(tech.unlockCost * SELF_TAUGHT_MULTIPLIER);
      const cities = mentorCitiesFor(tech.id).map((c) => locName(c));
      const where = cities.length ? t('study_taught_at', { cities: cities.join(', ') }) : '';
      const canAfford = s.coin >= price;
      const hasHand = s.stats.hand >= tech.minHand;
      // Four arts cannot be had from a book at any price — see MENTOR_ONLY.
      // Without this the Study screen sold everything and the mentors across
      // seven cities were decoration.
      const bookProof = isMentorOnly(tech.id);

      const priceLabel = bookProof
        ? t('master_only_note')
        : t('coin_amount', { n: price });
      bodyText(this, 60, y, `${techName(tech.id)} — ${priceLabel} · ${techDesc(tech.id)}`, {
        fontSize: '14px',
        wordWrap: { width: 700 },
      });
      if (where) {
        bodyText(this, 780, y, where, {
          fontSize: '12px',
          color: hasHand ? '#5a9a6e' : '#8a7a68',
          wordWrap: { width: 240 },
        });
      }
      makeButton(
        this,
        1140,
        y + 8,
        // Short form: the full sentence wraps to three lines in a 120px
        // button and pushed into the rows above and below.
        bookProof ? t('master_only') : hasHand ? t('unlock') : t('need_skill_short'),
        () => {
          mutate((st) => unlockTechnique(st, tech.id, price));
          audio.sfx('page');
          saveGame();
          this.scene.restart();
        },
        {
          width: 120,
          height: 28,
          fontSize: '12px',
          disabled: bookProof || !canAfford || !hasHand,
          noHotkey: true,
        },
      );
    });

    if (locked.length === 0) {
      bodyText(this, 60, 250, t('owned'), { fontSize: '18px' });
    }

    makeButton(this, GAME_WIDTH / 2, 640, t('back'), () => transitionTo(this, 'Hub'));
    installSceneKeys(this, { onBack: () => transitionTo(this, 'Hub') });
  }
}

export class UpgradesScene extends Phaser.Scene {
  constructor() {
    super('Upgrades');
  }

  create(): void {
    void audio.setContext('property');
    drawBackground(this, 'room');
    // Upgrades are work on the bathhouse itself.
    addManagementBackground(this, 'bg_upgrades');
    titleText(this, GAME_WIDTH / 2, 50, t('upgrades'), '32px');
    const s = getState();
    const local = getLocalBath(s);
    hudText(
      this,
      50,
      100,
      `${t('coin')}: ${s.coin} · ${local ? `${t(`prop_${local.kind}`)} ${t('level_n', { n: local.level })}` : t('stall_mode')}`,
    );

    if (!local) {
      bodyText(this, GAME_WIDTH / 2, 220, t('buy_stall') + ' / ' + t('property'), {
        fontSize: '18px',
        wordWrap: { width: 700 },
        align: 'center',
      }).setOrigin(0.5);
      gatedButton(this, GAME_WIDTH / 2, 300, t('buy_stall'), buyPropertyRequirement(s, 'stall'), () => {
        mutate((st) => buyProperty(st, 'stall'));
        audio.sfx('coin');
        saveGame();
        this.scene.restart();
      }, { width: 320 });
      makeButton(this, GAME_WIDTH / 2, 360, t('property'), () => transitionTo(this, 'Property'), {
        width: 320,
      });
    } else {
      const ups = [
        ['level1', t('upgrade_level1')],
        ['level2', t('upgrade_level2')],
        ['level3', t('upgrade_level3')],
        ['boiler', t('upgrade_boiler')],
        ['privateBooth', t('upgrade_privateBooth')],
        ['apprenticeBunks', t('upgrade_apprenticeBunks')],
        ['hireApprentice', t('upgrade_hireApprentice')],
        ['hireBathMaid', t('upgrade_hireBathMaid')],
      ] as const;
      // Every one of these was a live-looking button that ran `upgradeBath`
      // and discarded the result. Several were unreachable at the player's
      // level and one — `level1` — had no branch in `upgradeProperty` at all,
      // so the top button on this screen could never have done anything.
      ups.forEach(([id, label], i) => {
        gatedButton(
          this,
          GAME_WIDTH / 2,
          160 + i * 52,
          label,
          canUpgradeProperty(s, local.id, id),
          () => {
            mutate((st) => upgradeBath(st, id));
            audio.sfx('coin');
            saveGame();
            this.scene.restart();
          },
          { width: 400 },
        );
      });
    }

    makeButton(this, GAME_WIDTH / 2, 640, t('back'), () => transitionTo(this, 'Hub'));
    installSceneKeys(this, { onBack: () => transitionTo(this, 'Hub') });
  }
}
