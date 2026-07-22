import Phaser from 'phaser';
import { t } from '../i18n';
import { getState, mutate, saveGame } from '../state';
import { CORRESPONDENCE_ROUTES, HOUSE_BY_ID } from '../data/houses';
import {
  activeCorrespondence,
  canStartCorrespondence,
  houseRelation,
  startCorrespondence,
} from '../systems/correspondence';
import { GAME_HEIGHT, GAME_WIDTH } from '../types';
import { drawBackground, makeButton, bodyText, panel, titleText, hudText, COLORS } from '../ui/theme';
import { explain, gatedButton } from '../ui/gated';
import { addManagementBackground } from '../ui/art';
import { transitionTo } from '../ui/fx';
import { installSceneKeys } from '../ui/input';
import { compact, fontFor, primarySize, secondarySize } from '../ui/responsive';
import { audio } from '../audio/AudioManager';
import { showToast } from '../ui/dialogs';

/**
 * Merchant contacts and delayed correspondence.
 *
 * This is deliberately a letter/courier screen, not a map pretending a Bader
 * crossed Eurasia. It keeps the 1382 world connected while making the time,
 * stock and social prerequisites visible.
 */
export class CorrespondenceScene extends Phaser.Scene {
  private compactRoute = 0;

  constructor() {
    super('Correspondence');
  }

  init(data?: { route?: number }): void {
    this.compactRoute = Math.max(0, Math.min(CORRESPONDENCE_ROUTES.length - 1, data?.route ?? 0));
  }

  create(): void {
    void audio.setContext('travel_result');
    drawBackground(this, 'dark');
    addManagementBackground(this, 'bg_road');
    const state = getState();
    const active = activeCorrespondence(state);
    if (compact()) {
      this.renderCompact(active);
    } else {
      this.renderDesktop(active);
    }
    installSceneKeys(this, { onBack: () => transitionTo(this, 'Hub') });
  }

  private renderDesktop(active: ReturnType<typeof activeCorrespondence>): void {
    const state = getState();
    titleText(this, GAME_WIDTH / 2, 38, t('correspondence_title'), '30px');
    hudText(this, 40, 72, `${t('coin')}: ${state.coin} · ${t('inv_linen')}: ${state.inventory.linen}`);
    bodyText(this, GAME_WIDTH / 2, 72, t('correspondence_intro'), {
      fontSize: '13px', color: '#c4a574', align: 'center', wordWrap: { width: 700 },
    }).setOrigin(0.5, 0);

    if (active) {
      this.renderActive(150, 190, 980, 240, active, false);
      makeButton(this, GAME_WIDTH / 2, 560, t('back'), () => transitionTo(this, 'Hub'), {
        width: 240, back: true,
      });
      return;
    }

    CORRESPONDENCE_ROUTES.forEach((route, i) => {
      const x = 30 + i * 420;
      const house = HOUSE_BY_ID[route.houseId];
      const req = canStartCorrespondence(state, route.id);
      panel(this, x, 120, 390, 450, 0.94);
      titleText(this, x + 195, 148, t(route.titleKey), '20px');
      bodyText(this, x + 22, 184, t(house.titleKey), { fontSize: '14px', color: '#e8c547' });
      bodyText(this, x + 22, 210, t(house.bodyKey), {
        fontSize: '12px', color: '#c4a574', wordWrap: { width: 344 },
      });
      bodyText(this, x + 22, 290, t(route.bodyKey), {
        fontSize: '14px', color: '#e8d5a8', wordWrap: { width: 344 }, lineSpacing: 2,
      });
      bodyText(this, x + 22, 405, t('correspondence_route_meta', {
        days: route.days, coin: route.coinCost, linen: route.linenCost,
      }), { fontSize: '13px', color: '#a8c0c4', wordWrap: { width: 344 } });
      bodyText(this, x + 22, 438, t('house_relation', { n: houseRelation(state, route.houseId) }), {
        fontSize: '13px', color: '#c9a227',
      });
      gatedButton(this, x + 195, 500, t('correspondence_send'), req, () => this.send(route.id), {
        width: 330, height: 48, primary: i === 0, fill: req.ok ? COLORS.green : undefined,
      });
      if (!req.ok) {
        bodyText(this, x + 195, 533, explain(req), {
          fontSize: '11px', color: '#c4a574', wordWrap: { width: 336 }, align: 'center',
        }).setOrigin(0.5, 0);
      }
    });
    makeButton(this, GAME_WIDTH / 2, 640, t('back'), () => transitionTo(this, 'Hub'), {
      width: 240, back: true,
    });
  }

  private renderCompact(active: ReturnType<typeof activeCorrespondence>): void {
    const state = getState();
    const primary = primarySize();
    const secondary = secondarySize();
    const cx = GAME_WIDTH / 2;
    titleText(this, cx, 44, t('correspondence_title'), fontFor('title'));
    bodyText(this, cx, 82, `${t('coin')}: ${state.coin} · ${t('inv_linen')}: ${state.inventory.linen}`, {
      fontSize: fontFor('heading'), color: '#e8d5a8', align: 'center',
    }).setOrigin(0.5);

    if (active) {
      this.renderActive(60, 126, GAME_WIDTH - 120, 390, active, true);
      makeButton(this, cx, 640, t('back'), () => transitionTo(this, 'Hub'), {
        ...primary, width: 520, back: true, noHotkey: true,
      });
      return;
    }

    const route = CORRESPONDENCE_ROUTES[this.compactRoute]!;
    const house = HOUSE_BY_ID[route.houseId];
    const req = canStartCorrespondence(state, route.id);
    panel(this, 60, 122, GAME_WIDTH - 120, 360, 0.96);
    titleText(this, cx, 158, t(route.titleKey), fontFor('heading'));
    bodyText(this, 92, 196, t(house.titleKey), { fontSize: fontFor('body'), color: '#e8c547' });
    bodyText(this, 92, 222, t(route.bodyKey), {
      fontSize: fontFor('body'), color: '#e8d5a8', wordWrap: { width: GAME_WIDTH - 184 }, lineSpacing: 4,
    });
    bodyText(this, 92, 336, t('correspondence_route_meta', {
      days: route.days, coin: route.coinCost, linen: route.linenCost,
    }), { fontSize: fontFor('small'), color: '#a8c0c4', wordWrap: { width: GAME_WIDTH - 184 } });
    // The current trust is deliberate desktop information; on a phone the
    // route, price and refusal reason are the actionable information. Dropping
    // that one line leaves a full touch row for paging and Back below it.
    gatedButton(this, cx, 414, t('correspondence_send'), req, () => this.send(route.id), {
      ...primary, width: 760, fontSize: fontFor('button'), primary: true,
    });
    // On a 320px-tall Safari viewport a full explanatory sentence can be two
    // real lines high. The gated face already carries its actionable short
    // reason (including any required value); keeping a second paragraph here
    // would overlap the 44-CSS-pixel paging row below it.
    makeButton(this, 210, 558, '◀', () => this.scene.restart({ route: (this.compactRoute + CORRESPONDENCE_ROUTES.length - 1) % CORRESPONDENCE_ROUTES.length }), {
      ...secondary, width: 230, noHotkey: true,
    });
    bodyText(this, cx, 558, `${this.compactRoute + 1}/${CORRESPONDENCE_ROUTES.length}`, {
      fontSize: fontFor('body'), color: '#e8d5a8', align: 'center',
    }).setOrigin(0.5);
    makeButton(this, GAME_WIDTH - 210, 558, '▶', () => this.scene.restart({ route: (this.compactRoute + 1) % CORRESPONDENCE_ROUTES.length }), {
      ...secondary, width: 230, noHotkey: true,
    });
    makeButton(this, cx, 668, t('back'), () => transitionTo(this, 'Hub'), {
      ...secondary, width: 360, back: true, noHotkey: true,
    });
  }

  private renderActive(
    x: number,
    y: number,
    w: number,
    h: number,
    active: NonNullable<ReturnType<typeof activeCorrespondence>>,
    isCompact: boolean,
  ): void {
    const route = CORRESPONDENCE_ROUTES.find((candidate) => candidate.id === active.routeId)!;
    const house = HOUSE_BY_ID[active.houseId];
    panel(this, x, y, w, h, 0.96);
    titleText(this, x + w / 2, y + 44, t('correspondence_active'), isCompact ? fontFor('heading') : '24px');
    bodyText(this, x + 32, y + 92, `${t(route.titleKey)} · ${t(house.titleKey)}`, {
      fontSize: isCompact ? fontFor('body') : '17px', color: '#e8c547', wordWrap: { width: w - 64 },
    });
    bodyText(this, x + 32, y + 144, t('correspondence_returns', { day: active.dueDay, days: Math.max(0, active.dueDay - getState().day) }), {
      fontSize: isCompact ? fontFor('body') : '16px', color: '#e8d5a8', wordWrap: { width: w - 64 },
    });
    bodyText(this, x + 32, y + 206, t('correspondence_active_note'), {
      fontSize: isCompact ? fontFor('small') : '14px', color: '#a8c0c4', wordWrap: { width: w - 64 }, lineSpacing: 3,
    });
  }

  private send(routeId: (typeof CORRESPONDENCE_ROUTES)[number]['id']): void {
    mutate((state) => {
      startCorrespondence(state, routeId);
    });
    // `mutate` clones the state, so read the committed mission rather than
    // relying on control-flow analysis across its callback.
    const mission = activeCorrespondence(getState());
    if (!mission) return;
    audio.sfx('coin');
    saveGame();
    showToast(this, t('correspondence_sent_toast', { day: mission.dueDay }), '#5a9a6e', 2400);
    this.scene.restart();
  }
}
