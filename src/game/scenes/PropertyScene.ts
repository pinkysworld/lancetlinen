import Phaser from 'phaser';
import { t, locName, techName } from '../i18n';
import { getState, mutate, saveGame } from '../state';
import {
  buyCityLicense,
  buyProperty,
  canBuyProperty,
  getLocalHome,
  hireManager,
  hostGathering,
  propertiesIn,
  restAtHome,
  upgradeProperty,
} from '../systems/property';
import { mentorsInCity, mentorPrice, MENTOR_CITIES } from '../data/mentors';
import type { PropertyKind } from '../types';
import { GAME_WIDTH, GAME_HEIGHT } from '../types';
import { drawBackground, makeButton, bodyText, panel, titleText, hudText } from '../ui/theme';
import { audio } from '../audio/AudioManager';
import { MAP_NODE_MAP } from '../data/map';
import { sceneBackground, transitionTo } from '../ui/fx';
import { installSceneKeys } from '../ui/input';

export class PropertyScene extends Phaser.Scene {
  constructor() {
    super('Property');
  }

  create(): void {
    void audio.setContext('property');
    drawBackground(this, 'room');
    sceneBackground(this, 'art_home', { brightness: 0.5, topScrim: 70 });
    titleText(this, GAME_WIDTH / 2, 36, t('property_title'), '30px');
    const s = getState();
    hudText(this, 40, 70, `${locName(s.locationId)} · ${t('coin')}: ${s.coin}`);

    // Holdings list
    panel(this, 30, 100, 520, 280);
    bodyText(this, 50, 115, t('your_properties'), { fontSize: '18px', color: '#e8c547' });
    const all = s.properties ?? [];
    if (all.length === 0) {
      bodyText(this, 50, 160, '—', { fontSize: '15px', color: '#8a7a68' });
    } else {
      all.slice(0, 8).forEach((p, i) => {
        const mgr = p.hasManager ? ` · ${t('has_manager')}` : '';
        bodyText(
          this,
          50,
          150 + i * 28,
          `${locName(p.cityId)}: ${t(`prop_${p.kind}`)} Lv${p.level}${mgr}`,
          { fontSize: '14px' },
        );
      });
    }

    // Buy in current city
    panel(this, 570, 100, 680, 280);
    bodyText(this, 590, 115, `${t('property')} — ${locName(s.locationId)}`, {
      fontSize: '18px',
      color: '#e8c547',
    });

    const kinds: PropertyKind[] = ['stall', 'bathhouse', 'home', 'warehouse'];
    kinds.forEach((kind, i) => {
      const check = canBuyProperty(s, kind);
      const labels: Record<PropertyKind, string> = {
        stall: t('buy_stall'),
        bathhouse: t('buy_bathhouse'),
        home: t('buy_home'),
        warehouse: t('buy_warehouse'),
      };
      makeButton(
        this,
        900,
        165 + i * 48,
        labels[kind],
        () => {
          mutate((st) => buyProperty(st, kind));
          audio.sfx('coin');
          saveGame();
          this.scene.restart();
        },
        { width: 320, height: 40, fontSize: '15px', disabled: !check.ok },
      );
    });

    // License
    const node = MAP_NODE_MAP[s.locationId];
    if (node?.hasBathLicenseShop) {
      makeButton(
        this,
        280,
        420,
        t('buy_license'),
        () => {
          mutate((st) => buyCityLicense(st));
          audio.sfx('coin');
          saveGame();
          this.scene.restart();
        },
        { width: 280, height: 40, fontSize: '15px' },
      );
    }

    // Managers for local business
    const localBiz = propertiesIn(s, s.locationId).filter(
      (p) => p.kind === 'bathhouse' || p.kind === 'stall',
    );
    localBiz.forEach((p, i) => {
      if (p.hasManager) {
        bodyText(this, 50, 430 + i * 30, `${t(`prop_${p.kind}`)}: ${t('has_manager')}`, {
          fontSize: '14px',
          color: '#5a9a6e',
        });
      } else {
        makeButton(
          this,
          280,
          480 + i * 50,
          t('hire_manager'),
          () => {
            mutate((st) => hireManager(st, p.id));
            audio.sfx('coin');
            saveGame();
            this.scene.restart();
          },
          { width: 320, height: 40, fontSize: '15px', disabled: s.coin < 50 },
        );
      }
    });

    // Home life
    const home = getLocalHome(s);
    if (home) {
      panel(this, 570, 400, 680, 160);
      bodyText(this, 590, 415, `${t('prop_home')} · comfort ${home.comfort}`, {
        fontSize: '16px',
        color: '#e8c547',
      });
      makeButton(
        this,
        720,
        470,
        t('rest_home'),
        () => {
          mutate((st) => restAtHome(st));
          audio.sfx('door');
          saveGame();
          transitionTo(this, 'Hub');
        },
        { width: 200, height: 40, fontSize: '14px' },
      );
      makeButton(
        this,
        940,
        470,
        t('host_gathering'),
        () => {
          mutate((st) => hostGathering(st));
          audio.sfx('market');
          saveGame();
          this.scene.restart();
        },
        { width: 220, height: 40, fontSize: '14px', disabled: s.coin < 20 },
      );
      makeButton(
        this,
        1160,
        470,
        t('upgrade_comfort'),
        () => {
          mutate((st) => upgradeProperty(st, home.id, 'comfort'));
          saveGame();
          this.scene.restart();
        },
        { width: 160, height: 40, fontSize: '13px', disabled: s.coin < 30 },
      );
    }

    const goBack = () => {
      audio.sfx('page');
      transitionTo(this, 'Hub');
    };
    makeButton(this, GAME_WIDTH / 2, 660, t('back'), goBack);
    installSceneKeys(this, { onBack: goBack });
  }
}

export class MentorsScene extends Phaser.Scene {
  constructor() {
    super('Mentors');
  }

  create(): void {
    void audio.setContext('mentors');
    drawBackground(this, 'room');
    sceneBackground(this, 'bg_mentors', { brightness: 0.46, topScrim: 70 });
    titleText(this, GAME_WIDTH / 2, 40, t('masters_title'), '30px');
    const s = getState();
    const offers = mentorsInCity(s.locationId);
    hudText(this, 40, 80, `${locName(s.locationId)} · ${t('coin')}: ${s.coin} · ${t('reputation')}: ${Math.round(s.reputation[s.locationId] ?? 0)}`);

    // Panel sizes to its contents. A fixed 480px box holding one dash was the
    // ugliest screen in the game.
    const panelH = offers.length ? Math.min(480, 60 + offers.length * 52) : 190;
    panel(this, 60, 120, GAME_WIDTH - 120, panelH);

    if (offers.length === 0) {
      // Say *why* it is empty and where masters are actually found, rather
      // than leaving the player staring at a placeholder.
      const cities = MENTOR_CITIES.map((id) => locName(id)).join(' · ');
      bodyText(this, GAME_WIDTH / 2, 168, t('mentors_none_here'), {
        fontSize: '18px',
        color: '#e8d5a8',
        align: 'center',
        wordWrap: { width: GAME_WIDTH - 220 },
      }).setOrigin(0.5, 0);
      bodyText(this, GAME_WIDTH / 2, 214, t('mentors_none_hint', { cities }), {
        fontSize: '14px',
        color: '#a8c0c4',
        align: 'center',
        wordWrap: { width: GAME_WIDTH - 260 },
      }).setOrigin(0.5, 0);
      makeButton(this, GAME_WIDTH / 2, 350, t('travel'), () => transitionTo(this, 'TravelMap'), {
        width: 240,
        height: 44,
      });
    }

    offers.forEach((offer, i) => {
      const y = 150 + i * 52;
      const known = s.unlockedTechniques.includes(offer.techniqueId);
      const rep = s.reputation[s.locationId] ?? 0;
      const price = mentorPrice(s, offer);
      const blockedFlag = offer.storyFlag && !s.storyFlags[offer.storyFlag];
      const can =
        !known &&
        !blockedFlag &&
        rep >= offer.minRep &&
        s.coin >= price &&
        (offer.guildFavorCost === undefined || s.guildFavor >= offer.guildFavorCost);

      const descKey = offer.descKey.replace('mentor.', 'mentor_');
      bodyText(
        this,
        90,
        y,
        `${t(offer.mentorKey)}: ${techName(offer.techniqueId)} — ${t(descKey)}`,
        { fontSize: '14px', wordWrap: { width: 780 } },
      );

      if (known) {
        bodyText(this, 1000, y, t('already_known'), { fontSize: '14px', color: '#5a9a6e' });
      } else if (rep < offer.minRep) {
        bodyText(this, 1000, y, t('need_rep', { n: offer.minRep }), {
          fontSize: '13px',
          color: '#b33a3a',
        });
      } else {
        makeButton(
          this,
          1100,
          y + 10,
          t('learn_for', { cost: price }),
          () => {
            mutate((st) => {
              if (st.unlockedTechniques.includes(offer.techniqueId)) return;
              const p = mentorPrice(st, offer);
              if (st.coin < p) return;
              st.coin -= p;
              st.unlockedTechniques.push(offer.techniqueId);
              if (offer.guildFavorCost) st.guildFavor -= offer.guildFavorCost;
              if (offer.cityId === 'augsburg' && Math.random() < 0.5) {
                st.stats.tongue = Math.min(10, st.stats.tongue + 1);
              }
            });
            audio.sfx('bell');
            saveGame();
            this.scene.restart();
          },
          { width: 180, height: 34, fontSize: '13px', disabled: !can },
        );
      }
    });

    makeButton(this, GAME_WIDTH / 2, 640, t('back'), () => transitionTo(this, 'Hub'));
    installSceneKeys(this, { onBack: () => transitionTo(this, 'Hub') });
  }
}
