import Phaser from 'phaser';
import { t, locName, className } from '../i18n';
import {
  getState,
  saveGame,
  loadGame,
  mutate,
  exportSave,
  hasSave,
} from '../state';
import {
  applyMorningCosts,
  dailyOperatingCost,
  endDay,
  isDestitute,
  takeLoan,
} from '../systems/economy';
import {
  pendingStoryDialogue,
  activeQuests,
  syncQuests,
  tutorialTipKey,
  questTitleKey,
  questGuideKey,
} from '../systems/story';
import { getLocalBath } from '../systems/property';
import { drawBackground, makeButton, bodyText, titleText, panel, woodPanel, hudText, COLORS, addDecorImage, addHudIcon } from '../ui/theme';
import { showToast, showConfirm, downloadText } from '../ui/dialogs';
import { GAME_WIDTH, GAME_HEIGHT } from '../types';
import { MAP_NODE_MAP } from '../data/map';
import { audio } from '../audio/AudioManager';
import { ads, ADS_ENABLED } from '../ads/AdService';
import { mentorsInCity } from '../data/mentors';
import { tryHubCityEvent } from './FeatureScenes';
import { activeFestival } from '../systems/events';
import { addLocationBackground, addPortrait, portraitKeyForPatient } from '../ui/art';
import { getNextStep } from '../systems/guidance';
import { nextStepCard, sectionLabel, primaryFill, helpBar, groupCard } from '../ui/help';
import { pendingScenario } from '../systems/scenarios';
import { reputationSummaryKeys } from '../systems/reputation';
import { emberParticles, sceneBackground, steamParticles, transitionTo } from '../ui/fx';
import { installSceneKeys } from '../ui/input';
import { columns } from '../ui/layout';
import { computeDemand, topFactors } from '../systems/demand';
import { getQueue, clearQueue } from '../systems/queue';
import { severityMarks } from '../systems/settings';
import { honour, honourRankKey } from '../systems/honour';
import { chipRow } from '../ui/icons';
import { compact, fontFor, gridColumnsX, primarySize, secondarySize } from '../ui/responsive';

export class HubScene extends Phaser.Scene {
  constructor() {
    super('Hub');
  }

  create(): void {
    // Close out anything finished since the last look. Without this the task
    // strip kept showing "the bath right" after the licence was bought and
    // "the gates of Nürnberg" while standing inside them — a quest only ever
    // completed by picking a dialogue choice, never by doing the thing.
    mutate((st) => {
      syncQuests(st);
    });
    const s = getState();

    // Story interrupts
    const pending = pendingStoryDialogue(s);
    if (pending) {
      if (pending === 'epidemic_start') {
        mutate((st) => {
          delete st.storyFlags['epidemic_pending_dialogue'];
        });
      }
      if (pending === 'intro_1') {
        mutate((st) => {
          st.storyFlags['intro_started'] = true;
        });
      }
      this.scene.start('Dialogue', { dialogueId: pending });
      return;
    }

    if (s.ending && !s.freePlay) {
      this.scene.start('Ending');
      return;
    }

    // Structured scenarios (noble house, plague night, etc.) before minor street events
    if (s.storyFlags['intro_done'] && s.totalTreated >= 3 && s.tutorialStep >= 2) {
      const sc = pendingScenario(s);
      if (sc) {
        this.scene.start('Scenario', { scenarioId: sc.id });
        return;
      }
    }

    // Random city events — only after player knows the basics
    if (
      s.storyFlags['intro_done'] &&
      s.totalTreated >= 2 &&
      s.tutorialStep >= 2 &&
      !s.storyFlags['skip_event_once']
    ) {
      if (tryHubCityEvent(this)) return;
    } else if (s.storyFlags['skip_event_once']) {
      mutate((st) => {
        delete st.storyFlags['skip_event_once'];
      });
    }

    void audio.setHubContext({
      epidemic: s.epidemicActive,
      festival: !!activeFestival(s),
      locationId: s.locationId,
    });

    drawBackground(this, 'room');
    addLocationBackground(this);
    emberParticles(this, 70, GAME_HEIGHT - 60);

    // Phone layout takes over here, before any of the desktop furniture is
    // built. Placing this check further down drew both layouts on top of one
    // another — the compact branch ran, but the HUD, advisor card, quest strip
    // and stat legend had already been added above it.
    if (compact()) {
      this.renderCompact(s, getNextStep(s), GAME_WIDTH / 2);
      return;
    }

    woodPanel(this, 30, 20, GAME_WIDTH - 60, 90, 0.94);
    const rankKey = `rank_${s.guildRank}`;
    const holdings = (s.properties ?? []).length;
    hudText(
      this,
      50,
      35,
      `${s.playerName} · ${t(rankKey)} · ${t('day', { n: s.day })} · ${t(`season_${s.season}`)} ${t('year', { y: s.year })} · ${t('property')}: ${holdings}`,
    );
    const rs = reputationSummaryKeys(s);

    // Icon chips replace two dense runs of "label: value" text. `chipRow`
    // measures as it goes, so nothing needs hand-tuned x offsets.
    chipRow(this, 50, 64, [
      { id: 'coin', value: String(s.coin), color: '#e8c547' },
      { id: 'reputation', value: `${rs.local} (${t(rs.localKey)})` },
      { id: 'ethics', value: String(s.ethics) },
    ]);

    hudText(
      this,
      50,
      84,
      `${t('rep_folk')}: ${rs.folk}   ${t('rep_elite')}: ${rs.elite}   ${t('rep_fame')}: ${rs.fame}   ${t('honour')}: ${Math.round(honour(s))} (${t(honourRankKey(s))})   ${t('location')}: ${locName(s.locationId)}`,
    );

    // Debt and remote income sit at the right-hand end of the same row.
    // They used to be drawn at y=82, directly on top of the y=78 line.
    let notice = GAME_WIDTH - 60;
    if (s.remoteEarningsToday > 0) {
      const txt = hudText(this, 0, 84, t('remote_income', { n: s.remoteEarningsToday }));
      txt.setColor('#5a9a6e').setOrigin(1, 0).setX(notice);
      notice -= txt.width + 24;
    }
    if (s.debt > 0) {
      hudText(this, 0, 84, `${t('debt')}: ${s.debt}`)
        .setColor('#b33a3a')
        .setOrigin(1, 0)
        .setX(notice);
    }

    const localBath = getLocalBath(s);
    const mode = localBath
      ? localBath.kind === 'bathhouse'
        ? t('bath_mode')
        : t('stall_mode')
      : t('stall_mode');
    titleText(this, GAME_WIDTH / 2, 150, mode, '36px');

    // Today's notices, stacked.
    //
    // These were three fixed y values — market day at 185, festival at 178,
    // sabotage at 210 — so any two at once drew on top of each other. A market
    // day that is also a feast day is common, and it printed as one illegible
    // smear. Collect them and lay them out in order instead.
    const node = MAP_NODE_MAP[s.locationId];
    const fest = activeFestival(s);
    const notices: Array<{ text: string; color: string }> = [];
    if (fest) {
      notices.push({
        text: t('festival_today', { name: t(fest.textKey.replace(/\./g, '_')) }),
        color: '#e8c547',
      });
    }
    if (node && node.marketDay === s.weekday) {
      notices.push({ text: t('market_today'), color: '#e8c547' });
    }
    if (s.storyFlags['sabotage_today']) {
      notices.push({ text: t('sabotage'), color: '#b33a3a' });
    }
    // One line, not a stack. There are only ~40px between the premises title at
    // y=150 and the advisor card at y=200, so stacking three notices ran them
    // straight through both. Joined with a separator they always fit, and the
    // colour of the most urgent one carries.
    if (notices.length) {
      const urgent = notices.find((n) => n.color === '#b33a3a');
      // y=191, not 182: the title ends at 171 and the cards start at 210. At
      // 182 the gap measured 3px, which the title's drop shadow closed
      // entirely — it read as an overlap even though the boxes did not touch.
      bodyText(this, GAME_WIDTH / 2, 191, notices.map((n) => n.text).join('  ·  '), {
        fontSize: notices.length > 1 ? '13px' : '15px',
        color: urgent ? urgent.color : '#e8c547',
        align: 'center',
        wordWrap: { width: 900 },
      }).setOrigin(0.5, 0.5);
    }

    // ★ Next step advisor — primary usability aid
    const step = getNextStep(s);
    nextStepCard(this, step, 40, 200, 420, 95);

    // Quest strip
    const quests = activeQuests(s);
    panel(this, 480, 200, 360, 95, 0.9);
    bodyText(this, 495, 210, t('quests'), { fontSize: '14px', color: '#e8c547' });
    if (!quests.length) {
      bodyText(this, 495, 240, t('quests_none'), { fontSize: '13px', color: '#8a7a68', wordWrap: { width: 330 } });
    } else {
      // Each quest is its own hit target. The strip used to be one static text
      // block, so the obvious thing to do — click the task to find out what it
      // wants — did nothing at all. `questGuideKey` already had the guidance
      // text; nothing was showing it.
      quests.slice(0, 3).forEach((q, i) => {
        const rowY = 232 + i * 20;
        const label = bodyText(this, 495, rowY, `• ${t(questTitleKey(q.id))}`, {
          fontSize: '13px',
          color: '#e8d5a8',
          wordWrap: { width: 320 },
        });
        const hit = this.add
          .rectangle(495 + 160, rowY + 7, 330, 19, 0xffffff, 0.001)
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true });
        hit.on('pointerover', () => label.setColor('#fff8e0'));
        hit.on('pointerout', () => label.setColor('#e8d5a8'));
        hit.on('pointerup', () => this.showQuest(q.id));
      });
    }

    // Stats + legend
    panel(this, 860, 200, 380, 95, 0.9);
    bodyText(
      this,
      875,
      210,
      `${t('stats_legend')}\nHand ${s.stats.hand} · Eye ${s.stats.eye} · Tongue ${s.stats.tongue}\nBack ${s.stats.back} · Soul ${s.stats.soul} · ${t('horse')} ${s.cart.horseHealth}%`,
      { fontSize: '12px', wordWrap: { width: 350 } },
    );

    const tip = tutorialTipKey(s);
    if (tip) {
      // Kept clear of the "— Work —" caption at y=322.
      bodyText(this, GAME_WIDTH / 2, 302, t(tip.replace(/\./g, '_')), {
        fontSize: '13px',
        color: '#a8c0c4',
        wordWrap: { width: 1000 },
      }).setOrigin(0.5);
    }

    const cx = GAME_WIDTH / 2;

    // ── Primary action ────────────────────────────────────────────────
    // Given its own band above the cards so the advisor's recommendation
    // reads as the obvious thing to do.
    sectionLabel(this, cx, 322, 'section_work');
    const broke = isDestitute(s);
    // The price belongs on the button. Without it the player clicks a bare
    // "Open the shop", is told they cannot afford it, and has no way to find
    // out what it would have cost or how far short they are — reported three
    // separate times as "I have supplies and coin but cannot open".
    makeButton(
      this,
      cx,
      358,
      `${t('open_bath')}\n${t('open_bath_cost', { n: dailyOperatingCost(s) })}`,
      () => this.openBusiness(),
      {
        width: broke ? 200 : 320,
        height: 52,
        fill: primaryFill(step.action === 'open'),
        primary: true,
      },
    );

    // Only shown when the player genuinely cannot open. Opening needs the day's
    // costs in coin, and travelling costs too — without this a player with an
    // empty purse and nothing to sell had no move left at all.
    if (broke) {
      makeButton(this, cx + 190, 358, t('take_loan'), () => this.borrow(), {
        width: 220,
        height: 52,
        fill: 0x6b4a2f,
        fontSize: '15px',
      });
    }

    // ── Three grouped cards ───────────────────────────────────────────
    const cardY = 396;
    const cardH = 196;
    const btn = { width: 170, height: 40, fontSize: '15px' };

    const town = groupCard(this, 40, cardY, 380, cardH, 'section_town');
    makeButton(this, town.col(0), town.row(0), t('travel'), () => transitionTo(this, 'TravelMap'), {
      ...btn,
      fill: primaryFill(step.action === 'travel'),
    });
    makeButton(this, town.col(1), town.row(0), t('market'), () => transitionTo(this, 'Market'), {
      ...btn,
      fill: primaryFill(step.action === 'market'),
    });
    makeButton(this, town.col(0), town.row(1), t('property'), () => transitionTo(this, 'Property'), {
      ...btn,
      fill: primaryFill(step.action === 'property'),
    });
    makeButton(this, town.col(1), town.row(1), t('seek_master'), () => transitionTo(this, 'Mentors'), {
      ...btn,
      disabled: mentorsInCity(s.locationId).length === 0,
      fill: primaryFill(step.action === 'masters'),
    });

    const life = groupCard(this, 440, cardY, 380, cardH, 'section_life');
    makeButton(this, life.col(0), life.row(0), t('nav_journal'), () => transitionTo(this, 'Journal'), btn);
    makeButton(this, life.col(1), life.row(0), t('nav_staff'), () => transitionTo(this, 'Staff'), btn);
    makeButton(this, life.col(0), life.row(1), t('nav_family'), () => transitionTo(this, 'Family'), btn);
    makeButton(this, life.col(1), life.row(1), t('nav_politics'), () => transitionTo(this, 'Politics'), btn);
    makeButton(this, life.col(0), life.row(2), t('study'), () => transitionTo(this, 'Study'), {
      ...btn,
      fill: primaryFill(step.action === 'study'),
    });
    makeButton(this, life.col(1), life.row(2), t('upgrades'), () => transitionTo(this, 'Upgrades'), btn);

    const sys = groupCard(this, 840, cardY, 400, cardH, 'section_system');
    const sysBtn = { ...btn, width: 176, fontSize: '14px' };
    makeButton(this, sys.col(0), sys.row(0), t('save'), () => this.manualSave(), {
      ...sysBtn,
      fill: primaryFill(step.action === 'save'),
    });
    makeButton(this, sys.col(1), sys.row(0), t('load'), () => this.manualLoad(), {
      ...sysBtn,
      disabled: !hasSave(),
    });
    makeButton(this, sys.col(0), sys.row(1), t('export_save'), () => this.doExport(), {
      ...sysBtn,
      fontSize: '13px',
    });
    makeButton(this, sys.col(1), sys.row(1), t('help_btn'), () => transitionTo(this, 'Help'), {
      ...sysBtn,
      fill: 0x3d5a4a,
    });
    makeButton(this, sys.col(0), sys.row(2), t('nav_settings'), () => transitionTo(this, 'Settings'), sysBtn);
    makeButton(this, sys.col(1), sys.row(2), t('menu_codex'), () => transitionTo(this, 'Codex'), sysBtn);

    if (s.freePlay) {
      bodyText(this, cx, GAME_HEIGHT - 36, t('free_play'), {
        fontSize: '13px',
        color: '#e8c547',
      }).setOrigin(0.5);
    } else {
      helpBar(this, 'help_hub', GAME_HEIGHT - 18);
    }

    // The Hub is the root screen — Esc opens Help rather than backing out.
    installSceneKeys(this, { onBack: () => transitionTo(this, 'Help') });
  }

  /**
   * Phone layout.
   *
   * Deliberately fewer things: the advisor card, the stat legend and the
   * group framing are all dropped. What survives is the one action the day
   * turns on and a list of places to go — which is what the Hub is for.
   */
  private renderCompact(
    s: ReturnType<typeof getState>,
    step: ReturnType<typeof getNextStep>,
    cx: number,
  ): void {
    const prim = primarySize();
    const sec = secondarySize();
    const COL = gridColumnsX();
    const secOpts = { ...sec, fontSize: fontFor('button'), noHotkey: true };

    bodyText(this, cx, 96, `${t('coin')}: ${s.coin} · ${t('day', { n: s.day })}`, {
      fontSize: fontFor('heading'),
      color: '#e8d5a8',
      align: 'center',
    }).setOrigin(0.5);

    // The advisor's one-line nudge, since the full card is gone.
    bodyText(this, cx, 132, t(step.bodyKey), {
      fontSize: fontFor('small'),
      color: '#a8c0c4',
      align: 'center',
      wordWrap: { width: 900 },
    }).setOrigin(0.5);

    const broke = isDestitute(s);
    makeButton(
      this,
      broke ? cx - 170 : cx,
      190,
      `${t('open_bath')}\n${t('open_bath_cost', { n: dailyOperatingCost(s) })}`,
      () => this.openBusiness(),
      {
        ...prim,
        width: broke ? 380 : prim.width,
        fill: primaryFill(step.action === 'open'),
        primary: true,
      },
    );
    if (broke) {
      makeButton(this, cx + 230, 190, t('take_loan'), () => this.borrow(), {
        ...sec,
        width: 240,
        height: prim.height,
        fontSize: fontFor('button'),
        fill: 0x6b4a2f,
      });
    }

    // Ordered by how often a player actually needs them.
    const dests: Array<[string, () => void]> = [
      [t('market'), () => transitionTo(this, 'Market')],
      [t('travel'), () => transitionTo(this, 'TravelMap')],
      [t('study'), () => transitionTo(this, 'Study')],
      [t('upgrades'), () => transitionTo(this, 'Upgrades')],
      [t('nav_journal'), () => transitionTo(this, 'Journal')],
      [t('property'), () => transitionTo(this, 'Property')],
      [t('seek_master'), () => transitionTo(this, 'Mentors')],
      [t('nav_staff'), () => transitionTo(this, 'Staff')],
      [t('nav_family'), () => transitionTo(this, 'Family')],
      [t('nav_politics'), () => transitionTo(this, 'Politics')],
      [t('save'), () => this.manualSave()],
      [t('nav_settings'), () => transitionTo(this, 'Settings')],
    ];

    const rowTop = 268;
    dests.forEach(([label, onClick], i) => {
      const col = i % COL.length;
      const line = Math.floor(i / COL.length);
      makeButton(this, COL[col]!, rowTop + line * (sec.height + 8), label, onClick, secOpts);
    });

    installSceneKeys(this, { onBack: () => transitionTo(this, 'Help') });
  }

  private manualSave(): void {
    const res = saveGame();
    if (res.ok && res.meta) {
      const when = (() => {
        try {
          return new Date(res.meta!.savedAt).toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
          });
        } catch {
          return '';
        }
      })();
      showToast(
        this,
        t('save_ok_detail', {
          day: res.meta.day,
          loc: locName(res.meta.locationId),
          when,
        }),
        '#5a9a6e',
      );
      audio.sfx('save');
    } else if (res.error === 'quota') {
      showToast(this, t('save_fail_quota'), '#b33a3a');
    } else if (res.error === 'private') {
      showToast(this, t('save_fail_private'), '#b33a3a');
    } else {
      showToast(this, t('save_fail_unknown'), '#b33a3a');
    }
  }

  private manualLoad(): void {
    if (!hasSave()) {
      showToast(this, t('load_fail'), '#b33a3a');
      return;
    }
    showConfirm(this, {
      title: t('load'),
      body: t('load_confirm'),
      yes: t('load_yes'),
      no: t('load_no'),
      onYes: () => {
        const s = loadGame();
        if (!s) {
          showToast(this, t('load_fail'), '#b33a3a');
          return;
        }
        audio.sfx('load');
        showToast(this, t('load_ok'), '#5a9a6e', 1500);
        transitionTo(this, 'Hub');
      },
    });
  }

  private doExport(): void {
    // Ensure latest RAM state is what we export: save first if possible
    saveGame();
    const json = exportSave();
    if (!json) {
      showToast(this, t('export_fail'), '#b33a3a');
      return;
    }
    const ok = downloadText(`lancet-linen-save-day${getState().day}.json`, json);
    showToast(this, ok ? t('export_ok') : t('export_fail'), ok ? '#5a9a6e' : '#b33a3a');
  }

  /**
   * Borrow from the Lombard.
   *
   * Deliberately a poor deal — see `takeLoan`. It exists so the player always
   * has a move, not because it is a good one.
   */
  private borrow(): void {
    const res = { coin: 0, debt: 0 };
    mutate((s) => Object.assign(res, takeLoan(s)));
    audio.sfx('coin');
    showToast(this, t('loan_taken', { coin: res.coin, debt: res.debt }), '#c9a06a', 2600);
    this.scene.restart();
  }

  /**
   * What a task actually asks of the player.
   *
   * `questGuideKey` has carried this text all along; the hub only ever printed
   * the title, and the strip was not clickable.
   */
  private showQuest(questId: string): void {
    audio.sfx('page');
    showConfirm(this, {
      title: t(questTitleKey(questId)),
      body: t(questGuideKey(questId)),
      yes: t('close'),
      no: t('nav_journal'),
      onYes: () => {},
      onNo: () => transitionTo(this, 'Journal'),
    });
  }

  private openBusiness(): void {
    mutate((s) => {
      const result = applyMorningCosts(s);
      s.storyFlags['last_morning_ok'] = result.ok;
      s.storyFlags['last_morning_cost'] = result.cost;
      s.storyFlags['last_morning_wood'] = result.wood;
      if (result.ok) {
        s.bathhouse.open = true;
        // Footfall now comes from the demand model — settlement size, premises,
        // standing, market day, festivals, season and local trouble.
        const demand = computeDemand(s);
        s.storyFlags['patients_remaining'] = demand.patients;
        s.storyFlags['demand_today'] = demand.patients;
        clearQueue();
      }
    });
    audio.sfx('door');
    audio.sfx('steam');
    const s = getState();
    if (!s.storyFlags['last_morning_ok']) {
      // brief feedback then stay on hub
      // State the arithmetic. "Sell supplies or travel" with no figures gave
      // the player nothing to act on and read as a bug when they could see
      // coin in their purse.
      const need = Number(s.storyFlags['last_morning_cost'] ?? 0);
      const msg = this.add
        .text(
          GAME_WIDTH / 2,
          GAME_HEIGHT / 2,
          `${t('cannot_afford_day')}\n${t('cannot_afford_detail', { need, have: s.coin })}`,
          {
            fontFamily: 'Georgia, serif',
            fontSize: '20px',
            color: '#b33a3a',
            backgroundColor: '#1a120cee',
            padding: { x: 16, y: 12 },
            wordWrap: { width: 500 },
            align: 'center',
          },
        )
        .setOrigin(0.5)
        .setDepth(100);
      // 2.2s was too short to read two lines; the restart also wiped it early.
      this.time.delayedCall(3600, () => {
        msg.destroy();
        this.scene.restart();
      });
      return;
    }
    transitionTo(this, 'Bathhouse');
  }
}

/** Top of the waiting-room cards; the rest of the bathhouse lays out around it. */
const CARD_TOP = 196;

export class BathhouseScene extends Phaser.Scene {
  constructor() {
    super('Bathhouse');
  }

  create(): void {
    const s = getState();
    void audio.setContext('bathhouse');
    drawBackground(this, 'room');
    sceneBackground(this, 'art_bath', {
      fallbacks: ['bath_bg'],
      brightness: 0.84,
      topScrim: 105,
      bottomScrim: 80,
    });
    emberParticles(this, 150, GAME_HEIGHT - 120);
    steamParticles(this);

    panel(this, 30, 20, GAME_WIDTH - 60, 70);
    hudText(
      this,
      50,
      40,
      `${t('day', { n: s.day })} · ${t('coin')}: ${s.coin} · ${t('reputation')}: ${Math.round(s.reputation[s.locationId] ?? 0)} · ${t('patients_left', { n: Number(s.storyFlags['patients_remaining'] ?? 0) })}`,
    );

    bodyText(
      this,
      GAME_WIDTH / 2,
      120,
      t('morning_cost', {
        cost: Number(s.storyFlags['last_morning_cost'] ?? 0),
        wood: Number(s.storyFlags['last_morning_wood'] ?? 0),
      }),
      { fontSize: '16px', color: '#c4a574' },
    ).setOrigin(0.5);

    const remaining = Number(s.storyFlags['patients_remaining'] ?? 0);

    // Why is it busy (or dead)? The demand model's biggest contributors, so the
    // player can connect where they stand and what they've built to the queue.
    const factors = topFactors(computeDemand(s), 3)
      .map((f) => `${t(f.key)} ${f.delta > 0 ? '+' : ''}${f.delta}`)
      .join('   ');
    bodyText(this, GAME_WIDTH / 2, 152, `${t('demand_title')}: ${factors}`, {
      fontSize: '13px',
      color: '#a8c0c4',
      wordWrap: { width: 900 },
      align: 'center',
    }).setOrigin(0.5);

    if (remaining <= 0) {
      bodyText(this, GAME_WIDTH / 2, 280, t('no_patients'), {
        fontSize: '20px',
        wordWrap: { width: 700 },
        align: 'center',
      }).setOrigin(0.5);
      bodyText(this, GAME_WIDTH / 2, 340, t('bath_done_hint'), {
        fontSize: '15px',
        color: '#a8c0c4',
        wordWrap: { width: 700 },
        align: 'center',
      }).setOrigin(0.5);
      makeButton(this, GAME_WIDTH / 2, 420, t('close_day'), () => this.endDay(), {
        width: 280,
        height: 50,
        fill: 0x6b4a1e,
      });
      makeButton(this, GAME_WIDTH / 2, 490, t('travel'), () => {
        mutate((st) => {
          st.bathhouse.open = false;
        });
        transitionTo(this, 'TravelMap');
      }, { width: 240 });
      return;
    }

    this.renderWaitingRoom(remaining);

    makeButton(this, GAME_WIDTH / 2, 466, t('close_day'), () => this.endDay(), {
      width: 220,
      fill: COLORS.blood,
      noHotkey: true,
    });

    // Supplies sit mid-screen over a busy painting, so they need their own
    // backing panel — the edge scrims do nothing for text this far in.
    panel(this, 190, 506, GAME_WIDTH - 380, 88, 0.88);
    bodyText(
      this,
      GAME_WIDTH / 2,
      532,
      `${t('inventory')}: ${t('inv_linen')} ${s.inventory.linen} · ${t('inv_herbs')} ${s.inventory.herbs} · ${t('inv_leeches')} ${s.inventory.leeches} · ${t('inv_soap')} ${s.inventory.soap} · ${t('inv_salve')} ${s.inventory.salve}`,
      { fontSize: '14px', color: '#e8d5a8', wordWrap: { width: 860 }, align: 'center' },
    ).setOrigin(0.5);
    bodyText(this, GAME_WIDTH / 2, 566, t('inv_help'), {
      fontSize: '13px',
      color: '#a8c0c4',
      wordWrap: { width: 800 },
      align: 'center',
    }).setOrigin(0.5);

    installSceneKeys(this);
  }

  /**
   * The people waiting their turn.
   *
   * Size varies with the day's demand (see `queueSizeFor`), so a festival in
   * Nürnberg presents a real crowd to triage while a quiet camp offers one
   * person and no choice at all.
   */
  private renderWaitingRoom(remaining: number): void {
    const s = getState();
    const queue = getQueue(s);
    if (!queue.length) return;

    const cardW = 178;
    const cardH = 190;
    const top = CARD_TOP;
    const centres = columns(queue.length, GAME_WIDTH / 2 - (queue.length * 196) / 2, queue.length * 196, 18);

    bodyText(this, GAME_WIDTH / 2, 176, t('waiting_room', { n: queue.length, total: remaining }), {
      fontSize: '15px',
      color: '#e8c547',
    }).setOrigin(0.5);

    queue.forEach((p, i) => {
      const cx = centres[i]!;

      panel(this, cx - cardW / 2, top, cardW, cardH, 0.9);
      // The carved frame overhangs the portrait by ~22% a side, so the name
      // has to clear `size * 1.44 / 2` below the portrait centre, not `size/2`.
      addPortrait(this, cx, top + 62, portraitKeyForPatient(p), { size: 84, depth: 2, seed: p.uid });

      bodyText(this, cx, top + 136, p.name, {
        fontSize: '13px',
        color: '#e8d5a8',
        align: 'center',
        wordWrap: { width: cardW - 16 },
      }).setOrigin(0.5);

      // Station and severity are the triage information — enough to judge risk
      // and reward without having examined them yet.
      bodyText(this, cx, top + 156, className(p.class), {
        fontSize: '12px',
        color: '#c4a574',
      }).setOrigin(0.5);

      const sev = severityMarks(p.severity);
      bodyText(this, cx, top + 174, sev, {
        fontSize: '13px',
        color: p.severity >= 4 ? '#b33a3a' : p.severity >= 3 ? '#e8c547' : '#5a9a6e',
      }).setOrigin(0.5);

      makeButton(this, cx, top + cardH + 24, t('treat'), () => {
        // The pool is decremented by TreatmentScene once the session resolves,
        // so a failed navigation cannot burn a patient slot.
        transitionTo(this, 'Treatment', { patient: p });
      }, { width: cardW - 8, height: 38, fontSize: '14px' });
    });
  }

  /**
   * Close the day and show what it earned.
   *
   * The figures are captured *before* `endDay` runs, since it resets the
   * daily counters as part of rolling the calendar over.
   */
  private endDay(): void {
    const before = getState();
    const summary = {
      day: before.day,
      treated: before.patientsToday,
      earned: before.dayEarnings,
      reputation: before.dayReputation,
      coinBefore: before.coin,
      // Charged at "Open for business", so it is already out of the purse by
      // the time we get here and must be added back in explicitly.
      morningCost: Number(before.storyFlags['last_morning_cost'] ?? 0),
    };

    mutate((s) => {
      endDay(s);
      if (s.tutorialStep < 2) s.tutorialStep = 2;
    });
    audio.sfx('coin');
    // Web-portal builds only; dropped entirely from the desktop bundle.
    if (ADS_ENABLED) void ads.showInterstitial('day_end');
    saveGame();
    transitionTo(this, 'DaySummary', { ...summary, coinAfter: getState().coin });
  }
}
