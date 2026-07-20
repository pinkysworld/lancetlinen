import Phaser from 'phaser';
import { t, techName, humorName, className, techDesc } from '../i18n';
import { getState, mutate, saveGame } from '../state';
import {
  applyTreatment,
  canUseTechnique,
  diagnosePatient,
  generatePatient,
  readPulse,
  type PulseReading,
} from '../systems/treatment';
import { TECHNIQUES, TECH_DISPLAY_ORDER, TECHNIQUE_MAP } from '../data/techniques';
import type { Humor, PatientInstance, TreatmentResult } from '../types';
import { GAME_WIDTH, GAME_HEIGHT } from '../types';
import { runSkillCheck } from '../ui/skillcheck';
import { installSceneKeys } from '../ui/input';
import {
  buttonRow,
  resetSceneButtons,
  drawBackground,
  makeButton,
  bodyText,
  panel,
  woodPanel,
  parchmentPanel,
  titleText,
  COLORS,
} from '../ui/theme';
import { audio } from '../audio/AudioManager';
import { getLocalBath } from '../systems/property';
import { removeFromQueue } from '../systems/queue';
import { severityMarks, signalGlyph, goreVariantKey } from '../systems/settings';
import { addPortrait, portraitKeyForPatient } from '../ui/art';
import { bloodlettingDayModifier } from '../data/history';
import { flowSteps, helpBar } from '../ui/help';
import {
  bloodBurst,
  emberParticles,
  flash,
  floatingNumber,
  panelIn,
  sceneBackground,
  shake,
  transitionTo,
} from '../ui/fx';

/**
 * Top of the technique list and the space it may occupy.
 *
 * `TECH_LIST_TOP` is the *minimum* top. The header above it (help hint plus an
 * optional astrology warning) wraps to different heights per language, so the
 * real top is computed at render time and the list flows below it — in German
 * the hint wrapped to two lines and the warning was drawn straight over it.
 */
const TECH_LIST_TOP = 142;
const TECH_LIST_BOTTOM = 600;

/**
 * Rows are sized from the real button height, and the page size follows.
 *
 * Previously this was a fixed 12 rows at a hard-coded 34px pitch while
 * `buttonHeight()` inflated each row's touch target to 48px — so on phones
 * every row overlapped its neighbours by 14px and mis-taps were constant.
 */
function techRowPitch(): number {
  return buttonRow(30, 6);
}

function techsPerPage(top: number = TECH_LIST_TOP): number {
  const usable = TECH_LIST_BOTTOM - top;
  return Math.max(4, Math.min(12, Math.floor(usable / techRowPitch())));
}

export class TreatmentScene extends Phaser.Scene {
  private patient!: PatientInstance;
  private phase: 'exam' | 'skill' | 'result' = 'exam';
  private selectedTech: string | null = null;
  private result: TreatmentResult | null = null;
  private diagnosedHumor: string | null = null;
  private diagnosisConfidenceKey: string | null = null;
  private pulse: PulseReading | null = null;
  private finishing = false;
  private techPage = 0;
  /** Display-list objects that survive a `render()` — see `buildStatic`. */
  private staticObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('Treatment');
  }

  create(data?: { patient?: PatientInstance }): void {
    const s = getState();
    // Normally the player picks someone from the waiting room. Falling back to
    // a fresh roll keeps the scene usable if it is entered directly (deep link,
    // a reload that cleared the queue, or a story hook).
    this.patient = data?.patient ?? generatePatient(s);
    this.phase = 'exam';
    this.selectedTech = null;
    this.result = null;
    this.diagnosedHumor = null;
    this.diagnosisConfidenceKey = null;
    this.pulse = null;
    this.finishing = false;
    this.techPage = 0;
    void audio.setContext('treatment');
    this.buildStatic();
    this.render();
  }

  /**
   * Background, ambience and decor — built once.
   *
   * Everything on the display list after this runs is treated as permanent;
   * `render()` only clears what was added afterwards. Previously `render()`
   * called `children.removeAll()` and re-added the background image on every
   * diagnose/pulse tap, which flickered visibly.
   */
  private buildStatic(): void {
    drawBackground(this, 'room');
    sceneBackground(this, 'art_bath', {
      fallbacks: ['bath_bg'],
      brightness: 0.7,
      topScrim: 90,
      bottomScrim: 70,
    });
    emberParticles(this, 110, GAME_HEIGHT - 90);
    if (this.textures.exists('art_tools')) {
      this.add
        .image(GAME_WIDTH - 140, GAME_HEIGHT - 100, 'art_tools')
        .setDisplaySize(240, 160)
        .setAlpha(0.5)
        .setDepth(-6)
        .disableInteractive();
    }
    this.staticObjects = [...this.children.list];
  }

  /** Destroy only the transient UI, leaving the static backdrop intact. */
  private clearDynamic(): void {
    const keep = new Set<Phaser.GameObjects.GameObject>(this.staticObjects);
    for (const obj of [...this.children.list]) {
      if (!keep.has(obj)) obj.destroy();
    }
    // The buttons we just destroyed must not linger in the keyboard registry.
    resetSceneButtons(this);
  }

  /**
   * The humors the player has reason to believe are at work.
   *
   * Deliberately built from what examination *reported*, not from the patient's
   * true humor — so a bad diagnosis misleads, which is the point of the Eye
   * stat. Empty until the player examines or feels the pulse.
   */
  private beliefHumors(): Humor[] {
    const pulseCandidates = this.pulse?.candidates ?? null;
    const diagnosed = this.diagnosedHumor as Humor | null;

    if (diagnosed && pulseCandidates) {
      // The pulse is always truthful but partial; the diagnosis may be wrong.
      // When they agree, the player has a firm single answer. When they
      // disagree, trust the pulse and flag the contradiction.
      return pulseCandidates.includes(diagnosed) ? [diagnosed] : pulseCandidates;
    }
    if (diagnosed) return [diagnosed];
    if (pulseCandidates) return pulseCandidates;
    return [];
  }

  /** True when the diagnosis names a humor the pulse has ruled out. */
  private diagnosisConflictsWithPulse(): boolean {
    const diagnosed = this.diagnosedHumor as Humor | null;
    const candidates = this.pulse?.candidates;
    return !!diagnosed && !!candidates && !candidates.includes(diagnosed);
  }

  /**
   * Whether a technique is worth trying given the player's current belief.
   *
   * Note this is *plausibility*, not correctness — several techniques target
   * the same humor, and only some are right for the complaint.
   */
  private isPlausible(techId: string): boolean {
    const belief = this.beliefHumors();
    if (!belief.length) return false;
    const targets = TECHNIQUE_MAP[techId]?.humorTargets ?? [];
    return targets.some((h) => belief.includes(h));
  }

  private render(): void {
    this.clearDynamic();

    if (this.phase === 'skill' && this.selectedTech) {
      this.renderSkillCheck();
      return;
    }
    if (this.phase === 'result' && this.result) {
      this.renderResult();
      return;
    }

    const p = this.patient;
    const s = getState();
    const astro = bloodlettingDayModifier(s);
    const stepActive: 1 | 2 | 3 = !this.patient.diagnosed && !this.patient.pulseRead ? 1 : 2;
    flowSteps(this, 40, 8, stepActive);

    woodPanel(this, 40, 42, 560, 290, 0.94);
    addPortrait(this, 130, 165, portraitKeyForPatient(p), { size: 118, seed: p.uid });
    titleText(this, 380, 58, p.name, '22px').setOrigin(0.5);

    // Humor line carries the diagnosis *and* how far to trust it, so the Eye
    // stat is visible to the player instead of silently skewing a hidden roll.
    const humorLine = this.diagnosedHumor
      ? `${humorName(this.diagnosedHumor)} (${t(this.diagnosisConfidenceKey ?? 'confidence_guess')})`
      : t('humor_unknown');

    bodyText(
      this,
      228,
      88,
      `${t('class')}: ${className(p.class)}\n${t('complaint')}: ${t(p.complaintKey.replace('complaint.', 'complaint_'))}\n${t('severity')}: ${severityMarks(p.severity)}\n${t('humor')}: ${humorLine}\n${p.diagnosed ? '✓ ' + t('diagnosed') : '· ' + t('tip_examine')}\n${p.pulseRead ? '✓ ' + t('pulse_done') : '· ' + t('tip_pulse')}\n${t('astro_label')}: ${t(astro.key.replace(/\./g, '_'))}`,
      { fontSize: '14px', wordWrap: { width: 360 } },
    );

    // What the pulse actually told us.
    if (this.pulse) {
      const narrowed = this.pulse.candidates.map((h) => humorName(h)).join(' / ');
      bodyText(this, 56, 296, `${t(this.pulse.qualityKey)} — ${t('pulse_suggests')}: ${narrowed}`, {
        fontSize: '13px',
        color: '#a8c0c4',
        wordWrap: { width: 528 },
      });
    }

    parchmentPanel(this, 40, 344, 560, 84);
    bodyText(this, 56, 355, t('treat_hint'), {
      fontSize: '14px',
      color: '#1f140c',
      wordWrap: { width: 528 },
    });
    // Report what the *examination* concluded, never the correct answer.
    //
    // This used to print `recommended_tech`, naming the right techniques
    // outright, which collapsed the whole diagnosis loop into "click the green
    // one". The player now reasons from the humor they believe they found.
    const belief = this.beliefHumors();
    if (belief.length) {
      const conflict = this.diagnosisConflictsWithPulse();
      bodyText(
        this,
        56,
        392,
        conflict
          ? t('belief_conflict')
          : t('belief_humors', { list: belief.map((h) => humorName(h)).join(' / ') }),
        {
          fontSize: '13px',
          color: conflict ? '#c9a227' : '#3d6b4f',
          wordWrap: { width: 528 },
        },
      );
    }

    makeButton(this, 140, 450, t('diagnose'), () => {
      mutate((st) => {
        const dx = diagnosePatient(st, this.patient);
        this.diagnosedHumor = dx.humor;
        this.diagnosisConfidenceKey = dx.confidenceKey;
      });
      audio.sfx('page');
      this.render();
    }, { width: 150, height: 42, fontSize: '14px' });

    makeButton(this, 300, 450, t('pulse'), () => {
      mutate((st) => {
        this.pulse = readPulse(st, this.patient);
      });
      audio.sfx('pulse');
      this.render();
    }, { width: 150, height: 42, fontSize: '14px' });

    makeButton(this, 460, 450, t('refuse'), () => {
      mutate((st) => {
        if (p.class === 'beggar') st.ethics = Math.max(0, st.ethics - 3);
        else st.reputation[st.locationId] = (st.reputation[st.locationId] ?? 0) - 1;
        st.storyFlags['patients_remaining'] = Math.max(
          0,
          Number(st.storyFlags['patients_remaining'] ?? 1) - 1,
        );
      });
      // Turned away for good — they must not reappear in the waiting room.
      removeFromQueue(p.uid);
      transitionTo(this, 'Bathhouse');
    }, { width: 120, height: 42, fontSize: '13px', fill: COLORS.blood });

    // Techniques list
    panel(this, 580, 42, 660, 620);
    bodyText(this, 600, 52, t('technique_pick'), { fontSize: '18px', color: '#e8c547' });
    // Flowing, not fixed: `technique_green_hint` wraps to two lines in German
    // and the warning below it was pinned 20px down, so the two overlapped.
    const hint = bodyText(this, 600, 78, t('technique_green_hint'), {
      fontSize: '12px',
      color: '#8a7a68',
      wordWrap: { width: 620 },
    });
    let headY = hint.y + hint.height + 4;
    if (astro.mult < 1) {
      const warn = bodyText(this, 600, headY, t('astro_blood_warn'), {
        fontSize: '12px',
        color: '#c9a227',
        wordWrap: { width: 620 },
      });
      headY = warn.y + warn.height + 4;
    }
    // Never let the list start higher than its designed top, so short English
    // strings do not pull the rows up into the panel heading.
    const listTop = Math.max(TECH_LIST_TOP, headY + 6);

    const orderIdx = (id: string) => {
      const i = TECH_DISPLAY_ORDER.indexOf(id);
      return i < 0 ? 999 : i;
    };
    const unlocked = TECHNIQUES.filter((tech) => s.unlockedTechniques.includes(tech.id)).sort(
      (a, b) => orderIdx(a.id) - orderIdx(b.id),
    );
    // Stable craft order. Sorting the *correct* techniques onto page one was
    // another way of handing the player the answer.
    const ordered = unlocked;
    const perPage = techsPerPage(listTop);
    const pitch = techRowPitch();
    const pages = Math.max(1, Math.ceil(ordered.length / perPage));
    if (this.techPage >= pages) this.techPage = 0;
    const slice = ordered.slice(
      this.techPage * perPage,
      this.techPage * perPage + perPage,
    );

    slice.forEach((tech, i) => {
      const check = canUseTechnique(s, tech.id);
      const y = listTop + i * pitch;
      // Marks a technique that *targets a humor the player believes is at
      // work* — not the correct answer. Several techniques share a humor, and
      // a wrong diagnosis marks the wrong ones.
      const plausible = this.isPlausible(tech.id);
      const label = `${plausible ? '★ ' : ''}${techName(tech.id)}${
        check.ok
          ? ''
          : check.reason === 'supplies'
            ? ` — ${t('need_supplies')}`
            : check.reason === 'skill'
              ? ` — ${t('need_skill')}`
              : ''
      }`;
      makeButton(
        this,
        910,
        y,
        label,
        () => {
          if (!check.ok) return;
          this.selectedTech = tech.id;
          this.phase = 'skill';
          if (tech.category === 'blood') void audio.setContext('treatment_blood');
          else if (tech.category === 'dental') void audio.setContext('treatment');
          else void audio.setContext('treatment');
          audio.sfx('click');
          this.render();
        },
        {
          width: 600,
          height: 30,
          fontSize: '13px',
          disabled: !check.ok,
          fill: plausible ? COLORS.green : tech.category === 'dental' ? 0x4a3a28 : COLORS.panelLight,
        },
      );
    });

    if (pages > 1) {
      // Sits just under the last row, whatever the page size worked out to be.
      const pagerY = listTop + slice.length * pitch + 14;
      bodyText(this, 910, pagerY, t('tech_page', { n: this.techPage + 1, m: pages }), {
        fontSize: '13px',
        color: '#a88',
      }).setOrigin(0.5);
      if (this.techPage > 0) {
        makeButton(
          this,
          780,
          pagerY + 34,
          '◀',
          () => {
            this.techPage -= 1;
            this.render();
          },
          { width: 70, height: 36, fontSize: '16px', noHotkey: true },
        );
      }
      if (this.techPage < pages - 1) {
        makeButton(
          this,
          1040,
          pagerY + 34,
          '▶',
          () => {
            this.techPage += 1;
            this.render();
          },
          { width: 70, height: 36, fontSize: '16px', noHotkey: true },
        );
      }
    }

    // Hover-style desc for recommended first unlocked
    // Show the first plausible technique's description, or simply the first
    // in the list — never the correct one.
    const focus = ordered.find((tech) => this.isPlausible(tech.id)) ?? ordered[0];
    if (focus) {
      bodyText(this, 600, 640, techDesc(focus.id), {
        fontSize: '12px',
        color: '#c4a574',
        wordWrap: { width: 620 },
      });
    }
    helpBar(this, 'help_treatment', GAME_HEIGHT - 14);

    // 1 Examine, 2 Pulse, 3 Refuse, then the techniques take 4-9.
    installSceneKeys(this);
  }

  private renderSkillCheck(): void {
    flowSteps(this, GAME_WIDTH / 2 - 255, 100, 3);
    const tech = TECHNIQUE_MAP[this.selectedTech!];
    runSkillCheck(
      this,
      {
        hand: getState().stats.hand,
        risk: tech?.risk ?? 0.1,
        severity: this.patient.severity,
        techniqueLabel: techName(this.selectedTech!),
        techniqueId: this.selectedTech ?? undefined,
      },
      (res) => this.finishTreatment(res.score),
    );
  }

  private finishTreatment(skillBonus: number): void {
    // Guard double-fire from track + button
    if (this.finishing || this.phase === 'result') return;
    this.finishing = true;
    mutate((s) => {
      const local = getLocalBath(s);
      if (local) {
        s.bathhouse.boiler = local.boiler;
        s.bathhouse.privateBooth = local.privateBooth;
        s.bathhouse.staffApprentice = local.staffApprentice;
        s.bathhouse.level = local.level;
      }
      this.result = applyTreatment(s, this.patient, this.selectedTech!, skillBonus);
      s.storyFlags['patients_remaining'] = Math.max(
        0,
        Number(s.storyFlags['patients_remaining'] ?? 1) - 1,
      );
    });
    // Seen and done with; the next person moves up into their place.
    removeFromQueue(this.patient.uid);
    const kind = this.result?.kind ?? 'fail';
    audio.sfxForTechnique(this.selectedTech ?? 'shave', kind);
    saveGame();
    this.phase = 'result';
    this.render();
  }

  private renderResult(): void {
    const r = this.result!;
    const box = panel(this, GAME_WIDTH / 2 - 320, 160, 640, 360);
    const heading = titleText(this, GAME_WIDTH / 2, 200, t('result'), '28px');
    panelIn(this, [box, heading]);

    // Physical feedback matched to the outcome. Blood and the red flash are
    // gated on the Gore setting; the shake is not, since it reads as impact
    // rather than gore.
    if (r.kind === 'death') {
      flash(this);
      shake(this, 0.01, 320);
      bloodBurst(this, GAME_WIDTH / 2, 320, 'death');
    } else if (r.kind === 'fail') {
      shake(this, 0.005, 200);
      bloodBurst(this, GAME_WIDTH / 2, 330, 'fail');
    }
    const color =
      r.kind === 'success'
        ? '#5a9a6e'
        : r.kind === 'partial'
          ? '#e8c547'
          : r.kind === 'death'
            ? '#b33a3a'
            : '#c4a574';
    // Prefix a glyph when colour-blind mode is on — outcome was signalled by
    // hue alone, which ~8% of men cannot rely on.
    const outcomeGlyph = signalGlyph(
      r.kind === 'success' ? 'good' : r.kind === 'partial' ? 'warn' : 'bad',
    );
    bodyText(
      this,
      GAME_WIDTH / 2,
      280,
      outcomeGlyph +
        t(goreVariantKey(r.messageKey), r.messageParams as Record<string, string | number>),
      { fontSize: '20px', color, wordWrap: { width: 560 }, align: 'center' },
    ).setOrigin(0.5);

    bodyText(
      this,
      GAME_WIDTH / 2,
      380,
      `${t('pay')}: ${r.pay} · XP: ${r.xp} · ${t('reputation')}: ${r.reputationDelta >= 0 ? '+' : ''}${r.reputationDelta}`,
      { fontSize: '16px', color: '#e8d5a8' },
    ).setOrigin(0.5);

    // Drift the deltas so the numbers register rather than just appearing.
    if (r.pay > 0) {
      floatingNumber(this, GAME_WIDTH / 2 - 150, 360, `+${r.pay}`, '#e8c547', 120);
    }
    if (r.reputationDelta !== 0) {
      floatingNumber(
        this,
        GAME_WIDTH / 2 + 150,
        360,
        `${r.reputationDelta > 0 ? '+' : ''}${r.reputationDelta}`,
        r.reputationDelta > 0 ? '#5a9a6e' : '#b33a3a',
        260,
      );
    }

    makeButton(this, GAME_WIDTH / 2, 460, t('continue'), () => {
      transitionTo(this, 'Bathhouse');
    }, { primary: true });

    // `render()` returns early for this phase, so the exam branch's call to
    // installSceneKeys never runs — bind here too or the result screen has no
    // keyboard at all.
    installSceneKeys(this, { onBack: () => transitionTo(this, 'Bathhouse') });
  }
}
