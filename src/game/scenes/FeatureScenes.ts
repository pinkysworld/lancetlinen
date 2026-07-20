import Phaser from 'phaser';
import { t, techName, locName } from '../i18n';
import { getState, mutate, saveGame } from '../state';
import {
  hireStaff,
  fireStaff,
  giftStaff,
  trainStaff,
  ensureStaff,
} from '../systems/staff';
import type { StaffRole } from '../types';
import {
  startCourtship,
  courtAction,
  marry,
  giftSpouse,
  moveSpouseHere,
  SUITORS,
} from '../systems/family';
import {
  applyForOffice,
  buyTitle,
  bribeCouncil,
  donateChurch,
  OFFICE_COST,
  TITLE_COST,
} from '../systems/politics';
import type { OfficeId, TitleId } from '../types';
import { GAME_WIDTH, GAME_HEIGHT } from '../types';
import { drawBackground, makeButton, bodyText, panel, titleText, hudText, COLORS } from '../ui/theme';
import { showToast } from '../ui/dialogs';
import { audio } from '../audio/AudioManager';
import { activeQuests, questTitleKey } from '../systems/story';
import { activeFestival, rollCityEvent } from '../systems/events';
import {
  reputationSummaryKeys,
  eliteForOffice,
  fameForTitle,
  ensureReputation,
} from '../systems/reputation';
import { transitionTo } from '../ui/fx';
import { installSceneKeys } from '../ui/input';
import { addManagementBackground } from '../ui/art';
import { honour, honourRankKey } from '../systems/honour';
import { settings, updateSettings } from '../systems/settings';
import { Stack } from '../ui/layout';
import { makeSlider } from '../ui/slider';

/** Scrollable-ish text list for dense content (mobile-friendly paging) */
function pagedList(
  scene: Phaser.Scene,
  lines: string[],
  x: number,
  y: number,
  pageSize: number,
  page: number,
): number {
  const start = page * pageSize;
  const slice = lines.slice(start, start + pageSize);
  slice.forEach((line, i) => {
    bodyText(scene, x, y + i * 22, line, { fontSize: '14px', wordWrap: { width: 700 } });
  });
  return Math.ceil(lines.length / pageSize);
}

export class JournalScene extends Phaser.Scene {
  private page = 0;
  constructor() {
    super('Journal');
  }
  init(data: { page?: number }): void {
    this.page = data.page ?? 0;
  }
  create(): void {
    void audio.setContext('journal');
    drawBackground(this, 'room');
    addManagementBackground(this, 'bg_journal');
    titleText(this, GAME_WIDTH / 2, 36, t('journal_title'), '30px');
    const s = getState();
    const quests = activeQuests(s);
    panel(this, 40, 70, 500, 160);
    bodyText(this, 55, 80, t('quests') + ':', { fontSize: '18px', color: '#e8c547' });
    if (!quests.length) {
      bodyText(this, 55, 115, '—', { fontSize: '14px' });
    } else {
      quests.slice(0, 5).forEach((q, i) => {
        bodyText(this, 55, 110 + i * 22, `• ${t(questTitleKey(q.id))} (${q.stage})`, {
          fontSize: '14px',
        });
      });
    }

    panel(this, 560, 70, 680, 160);
    bodyText(this, 575, 80, t('status') + ':', { fontSize: '18px', color: '#e8c547' });
    const rs = reputationSummaryKeys(s);
    if (this.textures.exists('art_seal')) {
      this.add.image(1180, 140, 'art_seal').setDisplaySize(70, 70).setAlpha(0.9).disableInteractive();
    }
    bodyText(
      this,
      575,
      108,
      `${t('title_label')}: ${t(`title_${s.title ?? 'citizen'}`)} · ${t('office')}: ${t(`office_${s.office ?? 'none'}`)}\n${t('rep_local')}: ${rs.local} (${t(rs.localKey)}) · ${t('prestige')}: ${s.prestige ?? 0}\n${t('rep_folk')}: ${rs.folk} · ${t('rep_elite')}: ${rs.elite} · ${t('rep_fame')}: ${rs.fame}\n${t('honour')}: ${Math.round(honour(s))} — ${t(honourRankKey(s))}\n${t('guild')}: ${s.guildFavor} · ${t('church')}: ${s.churchHeat} · ${t('council')}: ${s.councilFavor}`,
      { fontSize: '13px', wordWrap: { width: 580 } },
    );

    const entries = s.journal ?? [];
    const lines = entries.map(
      (e) => `D${e.day}: ${t(e.textKey.replace(/\./g, '_'), e.params as Record<string, string | number>)}`,
    );

    // Size the chronicle to what it holds. A fixed 380px panel was ~60% empty
    // on day one and read as a screen that had failed to load.
    const shown = Math.min(lines.length, 12);
    const chronicleH = Math.max(110, Math.min(380, 62 + shown * 26));
    panel(this, 40, 250, GAME_WIDTH - 80, chronicleH);
    bodyText(this, 55, 260, t('journal_log'), { fontSize: '18px', color: '#e8c547' });

    if (!lines.length) {
      bodyText(this, 55, 300, t('journal_empty'), {
        fontSize: '15px',
        color: '#a8c0c4',
        wordWrap: { width: GAME_WIDTH - 140 },
      });
    } else {
      const pages = pagedList(this, lines, 55, 295, 12, this.page);
      if (this.page > 0) {
        makeButton(this, 200, 640, '◀', () => this.scene.restart({ page: this.page - 1 }), {
          width: 80,
          height: 40,
        });
      }
      if (this.page < pages - 1) {
        makeButton(this, 320, 640, '▶', () => this.scene.restart({ page: this.page + 1 }), {
          width: 80,
          height: 40,
        });
      }
    }
    makeButton(this, GAME_WIDTH - 120, 640, t('back'), () => transitionTo(this, 'Hub'), {
      width: 160,
    });
    installSceneKeys(this, { onBack: () => transitionTo(this, 'Hub') });
  }
}

export class StaffScene extends Phaser.Scene {
  constructor() {
    super('Staff');
  }
  create(): void {
    void audio.setContext('staff');
    drawBackground(this, 'room');
    addManagementBackground(this, 'bg_staff');
    titleText(this, GAME_WIDTH / 2, 36, t('staff_title'), '30px');
    const s = getState();
    ensureStaff(s);
    hudText(this, 40, 70, `${t('coin')}: ${s.coin} · ${t('staff')}: ${s.staff.length}`);

    panel(this, 40, 100, 700, 480);
    if (!s.staff.length) {
      bodyText(this, 60, 130, t('staff_none'), { fontSize: '16px' });
    } else {
      s.staff.slice(0, 10).forEach((m, i) => {
        const y = 120 + i * 44;
        bodyText(
          this,
          60,
          y,
          `${m.name} · ${t(`role_${m.role}`)} · ${t('loyalty')}: ${m.loyalty} · ${t('skill')}: ${m.skill} · ${t('wage_per_day', { n: m.wage })}`,
          { fontSize: '13px', wordWrap: { width: 420 } },
        );
        makeButton(
          this,
          560,
          y + 10,
          t('gift'),
          () => {
            mutate((st) => giftStaff(st, m.id));
            saveGame();
            this.scene.restart();
          },
          { width: 70, height: 32, fontSize: '12px' },
        );
        makeButton(
          this,
          640,
          y + 10,
          t('train'),
          () => {
            mutate((st) => trainStaff(st, m.id));
            saveGame();
            this.scene.restart();
          },
          { width: 70, height: 32, fontSize: '12px' },
        );
      });
    }

    panel(this, 760, 100, 480, 480);
    bodyText(this, 780, 120, t('hire'), { fontSize: '18px', color: '#e8c547' });
    // Each role does something distinct now, so say what.
    bodyText(this, 780, 148, t('staff_role_help'), {
      fontSize: '12px',
      color: '#a8c0c4',
      wordWrap: { width: 440 },
      lineSpacing: 2,
    });
    const roles: StaffRole[] = ['apprentice', 'bathmaid', 'manager', 'herb_boy', 'nightwatch'];
    const propId = s.properties.find((p) => p.cityId === s.locationId && (p.kind === 'bathhouse' || p.kind === 'stall'))?.id ?? null;
    roles.forEach((role, i) => {
      makeButton(
        this,
        1000,
        250 + i * 55,
        `${t(`role_${role}`)}`,
        () => {
          mutate((st) => {
            const m = hireStaff(st, role, propId);
            if (m) showToast(this, `${m.name}`, '#5a9a6e');
          });
          audio.sfx('coin');
          saveGame();
          this.scene.restart();
        },
        { width: 280, height: 44 },
      );
    });

    makeButton(this, GAME_WIDTH / 2, 640, t('back'), () => transitionTo(this, 'Hub'));
    installSceneKeys(this, { onBack: () => transitionTo(this, 'Hub') });
  }
}

export class FamilyScene extends Phaser.Scene {
  constructor() {
    super('Family');
  }
  create(): void {
    void audio.setContext('family');
    drawBackground(this, 'room');
    addManagementBackground(this, 'bg_family');
    titleText(this, GAME_WIDTH / 2, 40, t('family_title'), '30px');
    const s = getState();
    hudText(this, 40, 80, `${t('coin')}: ${s.coin}`);

    panel(this, 60, 120, 560, 400);
    if (s.spouse) {
      bodyText(
        this,
        80,
        140,
        `${t('spouse')}: ${t(s.spouse.name)}\n${t('affection')}: ${s.spouse.affection}\n${t('location')}: ${locName(s.spouse.cityId)}`,
        { fontSize: '16px', wordWrap: { width: 500 } },
      );
      makeButton(this, 200, 320, t('gift_spouse'), () => {
        mutate((st) => giftSpouse(st));
        saveGame();
        this.scene.restart();
      }, { width: 200 });
      makeButton(this, 420, 320, t('move_spouse'), () => {
        mutate((st) => moveSpouseHere(st));
        saveGame();
        this.scene.restart();
      }, { width: 200 });
      if (s.heir) {
        bodyText(this, 80, 400, `${t('heir')}: ${s.heir.name} (${s.heir.ageYears}y)`, {
          fontSize: '16px',
          color: '#e8c547',
        });
      }
    } else if (s.courtshipTarget) {
      bodyText(
        this,
        80,
        140,
        `${t('courting')}: ${t(SUITORS.find((x) => x.id === s.courtshipTarget)?.nameKey ?? '')}\n${t('progress')}: ${s.courtshipProgress}%`,
        { fontSize: '16px' },
      );
      (['gift', 'walk', 'feast', 'letter'] as const).forEach((a, i) => {
        makeButton(
          this,
          180 + (i % 2) * 220,
          280 + Math.floor(i / 2) * 55,
          t(`court_${a}`),
          () => {
            mutate((st) => courtAction(st, a));
            saveGame();
            this.scene.restart();
          },
          { width: 200 },
        );
      });
      if (s.courtshipProgress >= 80) {
        makeButton(this, 300, 420, t('marry'), () => {
          mutate((st) => marry(st));
          audio.sfx('marry');
          saveGame();
          this.scene.restart();
        }, { width: 240, fill: COLORS.green });
      }
    } else {
      bodyText(this, 80, 140, t('family_intro'), { fontSize: '15px', wordWrap: { width: 500 } });
      SUITORS.forEach((su, i) => {
        makeButton(
          this,
          300,
          220 + i * 48,
          `${t(su.nameKey)} — ${t('coin_amount', { n: su.cost })}`,
          () => {
            mutate((st) => startCourtship(st, su.id));
            saveGame();
            this.scene.restart();
          },
          { width: 280, height: 40, fontSize: '14px', disabled: !s.storyFlags['open_to_courtship'] && s.act < 2 },
        );
      });
    }

    makeButton(this, GAME_WIDTH / 2, 640, t('back'), () => transitionTo(this, 'Hub'));
    installSceneKeys(this, { onBack: () => transitionTo(this, 'Hub') });
  }
}

export class PoliticsScene extends Phaser.Scene {
  constructor() {
    super('Politics');
  }
  create(): void {
    void audio.setContext('politics');
    drawBackground(this, 'room');
    if (this.textures.exists('bg_politics')) {
      addManagementBackground(this, 'bg_politics');
    } else {
      addManagementBackground(this, 'bg_guild');
    }
    titleText(this, GAME_WIDTH / 2, 36, t('politics_title'), '30px');
    const s = getState();
    ensureReputation(s);
    const rs = reputationSummaryKeys(s);
    hudText(
      this,
      40,
      70,
      `${t('coin')}: ${s.coin} · ${t('council')}: ${s.councilFavor} · ${t('guild')}: ${s.guildFavor} · ${t('prestige')}: ${s.prestige ?? 0}`,
    );
    hudText(
      this,
      40,
      90,
      `${t('rep_elite')}: ${rs.elite} · ${t('rep_fame')}: ${rs.fame} · ${t('rep_local')}: ${rs.local} (${t(rs.localKey)})`,
    );

    panel(this, 40, 120, 600, 470);
    bodyText(this, 60, 135, t('offices'), { fontSize: '18px', color: '#e8c547' });
    bodyText(this, 60, 168, `${t('current')}: ${t(`office_${s.office ?? 'none'}`)}`, {
      fontSize: '15px',
    });
    bodyText(this, 60, 192, t('politics_need_elite'), { fontSize: '12px', color: '#a88' });
    (Object.keys(OFFICE_COST) as Exclude<OfficeId, 'none'>[]).forEach((off, i) => {
      const c = OFFICE_COST[off];
      const needE = eliteForOffice(off);
      makeButton(
        this,
        300,
        240 + i * 55,
        `${t(`office_${off}`)} — ${t('coin_amount', { n: c.coin })} · ${t('rep_elite')} ab ${needE}`,
        () => {
          let ok = false;
          mutate((st) => {
            ok = applyForOffice(st, off);
          });
          if (ok) {
            audio.sfx('guild');
            showToast(this, t('office_gained'));
          } else {
            audio.sfx('fail');
            showToast(this, t('office_denied'));
          }
          saveGame();
          this.scene.restart();
        },
        { width: 420, height: 44, fontSize: '13px' },
      );
    });

    panel(this, 660, 120, 580, 470);
    bodyText(this, 680, 135, t('titles'), { fontSize: '18px', color: '#e8c547' });
    bodyText(this, 680, 168, `${t('current')}: ${t(`title_${s.title ?? 'citizen'}`)}`, {
      fontSize: '15px',
    });
    bodyText(this, 680, 192, t('politics_need_fame'), { fontSize: '12px', color: '#a88' });
    (Object.keys(TITLE_COST) as Exclude<TitleId, 'citizen'>[]).forEach((title, i) => {
      const c = TITLE_COST[title];
      const needF = fameForTitle(title);
      makeButton(
        this,
        940,
        240 + i * 55,
        `${t(`title_${title}`)} — ${t('coin_amount', { n: c.coin })} · ${t('rep_fame')} ab ${needF}`,
        () => {
          let ok = false;
          mutate((st) => {
            ok = buyTitle(st, title);
          });
          if (ok) {
            audio.sfx('bell');
            showToast(this, t('title_gained'));
          } else {
            audio.sfx('fail');
            showToast(this, t('title_denied'));
          }
          saveGame();
          this.scene.restart();
        },
        { width: 360, height: 44, fontSize: '13px' },
      );
    });
    makeButton(this, 850, 480, t('bribe_council'), () => {
      mutate((st) => bribeCouncil(st));
      audio.sfx('coin');
      saveGame();
      this.scene.restart();
    }, { width: 240 });
    makeButton(this, 1100, 480, t('donate_church'), () => {
      mutate((st) => donateChurch(st));
      audio.sfx('church');
      saveGame();
      this.scene.restart();
    }, { width: 240 });

    makeButton(this, GAME_WIDTH / 2, 640, t('back'), () => transitionTo(this, 'Hub'));
    installSceneKeys(this, { onBack: () => transitionTo(this, 'Hub') });
  }
}

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super('Settings');
  }

  create(): void {
    void audio.setContext('settings');
    drawBackground(this, 'dark');
    addManagementBackground(this, 'bg_settings');
    titleText(this, GAME_WIDTH / 2, 44, t('settings_title'), '32px');

    const cfg = settings();
    const lc = 90;
    const rc = 700;

    // -- Audio --------------------------------------------------------
    bodyText(this, lc, 96, t('settings_audio'), { fontSize: '17px', color: '#e8c547' });
    const vol = new Stack(140, 34);
    makeSlider(this, lc, vol.next(22), t('vol_master'), cfg.volMaster,
      (v) => updateSettings({ volMaster: v }));
    makeSlider(this, lc, vol.next(22), t('vol_music'), cfg.volMusic,
      (v) => updateSettings({ volMusic: v }));
    makeSlider(this, lc, vol.next(22), t('vol_sfx'), cfg.volSfx,
      (v) => updateSettings({ volSfx: v }));
    makeSlider(this, lc, vol.next(22), t('vol_ambience'), cfg.volAmbience,
      (v) => updateSettings({ volAmbience: v }));

    // -- Display ------------------------------------------------------
    bodyText(this, lc, 360, t('settings_display'), { fontSize: '17px', color: '#e8c547' });
    const disp = new Stack(392, 10);
    makeButton(this, lc + 150, disp.next(42),
      this.scale.isFullscreen ? t('fullscreen_off') : t('fullscreen_on'),
      () => this.toggleFullscreen(), { width: 300, height: 42, fontSize: '15px' });
    makeButton(this, lc + 150, disp.next(42),
      `${t('text_scale')}: ${Math.round(cfg.textScale * 100)}%`,
      () => {
        const steps = [0.9, 1, 1.15, 1.3];
        const i = steps.findIndex((v) => Math.abs(v - cfg.textScale) < 0.01);
        updateSettings({ textScale: steps[(i + 1) % steps.length]! });
        this.scene.restart();
      }, { width: 300, height: 42, fontSize: '15px' });
    makeButton(this, lc + 150, disp.next(42),
      cfg.reduceParticles ? t('particles_off') : t('particles_on'),
      () => { updateSettings({ reduceParticles: !cfg.reduceParticles }); this.scene.restart(); },
      { width: 300, height: 42, fontSize: '15px' });
    makeButton(this, lc + 150, disp.next(42),
      `${t('difficulty')}: ${t(`difficulty_${cfg.difficulty}`)}`,
      () => {
        const order = ['merciful', 'fair', 'harsh'] as const;
        const i = order.indexOf(cfg.difficulty);
        updateSettings({ difficulty: order[(i + 1) % order.length]! });
        this.scene.restart();
      }, { width: 300, height: 42, fontSize: '15px' });

    // -- Accessibility ------------------------------------------------
    bodyText(this, rc, 96, t('settings_access'), { fontSize: '17px', color: '#e8c547' });
    const acc = new Stack(126, 10);
    makeButton(this, rc + 150, acc.next(42),
      cfg.colorBlindSafe ? t('colorblind_on') : t('colorblind_off'),
      () => { updateSettings({ colorBlindSafe: !cfg.colorBlindSafe }); this.scene.restart(); },
      { width: 300, height: 42, fontSize: '15px' });
    makeButton(this, rc + 150, acc.next(42),
      `${t('gore')}: ${t(`gore_${cfg.goreLevel}`)}`,
      () => {
        const order = ['low', 'medium', 'high'] as const;
        const i = order.indexOf(cfg.goreLevel);
        updateSettings({ goreLevel: order[(i + 1) % 3]! });
        this.scene.restart();
      }, { width: 300, height: 42, fontSize: '15px' });
    makeButton(this, rc + 150, acc.next(42),
      `${t('text_speed')}: ${t(`text_speed_${cfg.textSpeed}`)}`,
      () => { updateSettings({ textSpeed: (cfg.textSpeed % 3) + 1 }); this.scene.restart(); },
      { width: 300, height: 42, fontSize: '15px' });
    makeButton(this, rc + 150, acc.next(42),
      cfg.showTutorialTips ? t('tutorial_on') : t('tutorial_off'),
      () => { updateSettings({ showTutorialTips: !cfg.showTutorialTips }); this.scene.restart(); },
      { width: 300, height: 42, fontSize: '15px' });

    // -- Controls -----------------------------------------------------
    bodyText(this, rc, 360, t('settings_controls'), { fontSize: '17px', color: '#e8c547' });
    bodyText(this, rc, 392, t('controls_help'), {
      fontSize: '13px', color: '#a8c0c4', wordWrap: { width: 320 },
    });
    makeButton(this, rc + 150, 486, t('rebind_keys'), () => transitionTo(this, 'Keybinds'), {
      width: 300, height: 42, fontSize: '15px',
    });
    makeButton(this, rc + 150, 534, t('menu_save_slot'), () =>
      transitionTo(this, 'SaveSlots', { mode: 'save', from: 'Settings' }), {
      width: 300, height: 42, fontSize: '15px',
    });

    makeButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 46, t('back'), () => transitionTo(this, 'Hub'), {
      width: 240, back: true,
    });
    installSceneKeys(this, { onBack: () => transitionTo(this, 'Hub') });
  }

  /**
   * Fullscreen must be requested from inside a user gesture, so it lives in the
   * button callback rather than being restored from settings on boot.
   */
  private toggleFullscreen(): void {
    try {
      if (this.scale.isFullscreen) {
        this.scale.stopFullscreen();
        updateSettings({ fullscreen: false });
      } else {
        this.scale.startFullscreen();
        updateSettings({ fullscreen: true });
      }
    } catch {
      // Browsers refuse outside a gesture, or in an iframe without
      // allowfullscreen. Nothing useful to do here.
    }
    this.scene.restart();
  }
}

export class CityEventScene extends Phaser.Scene {
  constructor() {
    super('CityEvent');
  }
  create(data: { textKey: string }): void {
    void audio.setContext('city_event');
    audio.sfx('crowd');
    drawBackground(this, 'dark');
    // A city event happens in the streets; it was showing bare gradient.
    addManagementBackground(this, 'bg_market');
    panel(this, GAME_WIDTH / 2 - 320, 160, 640, 340);
    titleText(this, GAME_WIDTH / 2, 200, t('city_event'), '28px');
    bodyText(this, GAME_WIDTH / 2, 300, t(data.textKey.replace(/\./g, '_')), {
      fontSize: '18px',
      wordWrap: { width: 560 },
      align: 'center',
      color: '#e8d5a8',
    }).setOrigin(0.5);
    makeButton(this, GAME_WIDTH / 2, 420, t('continue'), () => transitionTo(this, 'Hub'));
    installSceneKeys(this, { onBack: () => transitionTo(this, 'Hub') });
  }
}

/** Call from Hub after pending story: maybe city event */
export function tryHubCityEvent(scene: Phaser.Scene): boolean {
  let evKey: string | null = null;
  mutate((st) => {
    const fest = activeFestival(st);
    if (fest) st.festivalActive = fest.id;
    const ev = rollCityEvent(st);
    if (ev) evKey = ev.textKey;
  });
  if (evKey) {
    scene.scene.start('CityEvent', { textKey: evKey });
    return true;
  }
  return false;
}
