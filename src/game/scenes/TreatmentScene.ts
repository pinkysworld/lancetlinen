import Phaser from 'phaser';
import { t, techName, humorName, className, techDesc } from '../i18n';
import { getState, mutate, saveGame } from '../state';
import {
  applyTreatment,
  canUseTechnique,
  diagnosePatient,
  generatePatient,
  readPulse,
  readUrine,
  readPalpation,
  readTongue,
  type PalpationReading,
  type PulseReading,
  type TongueReading,
  type UrineReading,
} from '../systems/treatment';
import { TECHNIQUES, TECH_DISPLAY_ORDER, TECHNIQUE_MAP } from '../data/techniques';
import type { FeeStance, Humor, Intensity, PatientInstance, TreatmentResult } from '../types';
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
  playAmbientLoop,
  sceneBackground,
  shake,
  transitionTo,
} from '../ui/fx';
import { compact, fontFor, touchTargetHeight } from '../ui/responsive';
import { gatedButton } from '../ui/gated';
import { canExamine } from '../data/examinations';
import {
  VEINS,
  complaintRegion,
  daysInSign,
  isEgyptianDay,
  judgeVein,
  moonSign,
} from '../data/bloodletting';
import { REGIMENS, REGIMEN_MAP, canStartRegimen, startRegimen } from '../systems/regimen';

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
 * Cycle orders for the two pre-treatment choices. Literal key maps rather than
 * `'stance_' + id`, so the i18n scan can see every key that will be asked for.
 */
const STANCES: FeeStance[] = ['usual', 'demand', 'lenient', 'alms'];
const STANCE_KEYS: Record<FeeStance, string> = {
  usual: 'stance_usual',
  demand: 'stance_demand',
  lenient: 'stance_lenient',
  alms: 'stance_alms',
};
const INTENSITIES: Intensity[] = ['usual', 'careful', 'bold'];
const INTENSITY_KEYS: Record<Intensity, string> = {
  usual: 'intensity_usual',
  careful: 'intensity_careful',
  bold: 'intensity_bold',
};

/**
 * Rows are sized from the real button height, and the page size follows.
 *
 * Previously this was a fixed 12 rows at a hard-coded 34px pitch while
 * `buttonHeight()` inflated each row's touch target to 48px — so on phones
 * every row overlapped its neighbours by 14px and mis-taps were constant.
 */
function techRowPitch(): number {
  // Taller rows on a phone: fewer techniques per page, but each one hittable.
  // Paging through six readable rows beats missing one of twelve.
  return compact() ? buttonRow(52, 8) : buttonRow(30, 6);
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
  private urine: UrineReading | null = null;
  private palpation: PalpationReading | null = null;
  private tongue: TongueReading | null = null;
  private finishing = false;
  private techPage = 0;
  private compactPage: 'exams' | 'care' | 'techniques' | 'regimens' = 'exams';
  private treatmentPath: 'procedure' | 'regimen' = 'procedure';
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
    this.urine = null;
    this.palpation = null;
    this.tongue = null;
    this.finishing = false;
    this.techPage = 0;
    this.compactPage = 'exams';
    this.treatmentPath = 'procedure';
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
    sceneBackground(this, 'bg_sickroom_v11', {
      fallbacks: ['art_bath', 'bath_bg'],
      brightness: 0.7,
      topScrim: 90,
      bottomScrim: 70,
    });
    emberParticles(this, 110, GAME_HEIGHT - 90);
    playAmbientLoop(this, 'bath_steam', GAME_WIDTH - 160, GAME_HEIGHT - 130, 260, 146, -4);
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
    // Pulse gives the hot/cold axis, urine the moist/dry one. Together they
    // name a single humour; either alone leaves two. Intersect them first,
    // then fold in the (fallible) diagnosis.
    // The tongue reads the same hot/cold axis as the pulse, more crudely; it
    // only adds anything when the pulse has not been taken.
    const pulseC = this.pulse?.candidates ?? this.tongue?.candidates ?? null;
    const urineC = this.urine?.candidates ?? null;
    const pulseCandidates =
      pulseC && urineC
        ? pulseC.filter((h) => urineC.includes(h))
        : (pulseC ?? urineC);
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
    const pulseC = this.pulse?.candidates ?? null;
    const urineC = this.urine?.candidates ?? null;
    const candidates =
      pulseC && urineC ? pulseC.filter((h) => urineC.includes(h)) : (pulseC ?? urineC);
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

    if (compact()) {
      this.renderCompact();
      return;
    }

    const p = this.patient;
    const s = getState();
    const astro = bloodlettingDayModifier(s);
    const stepActive: 1 | 2 | 3 = !this.patient.diagnosed && !this.patient.pulseRead ? 1 : 2;
    flowSteps(this, 40, 8, stepActive);

    // The panel is drawn *after* its contents and pushed behind them, because
    // its height depends on how far the text runs. Adding uroscopy took the
    // status block from seven lines to eight and pushed the pulse and flask
    // readings out through the frame and under the parchment below — every
    // position here used to be a fixed number.
    const panelTop = 42;
    const portraitSize = 118;
    addPortrait(this, 130, 165, portraitKeyForPatient(p), { size: portraitSize, seed: p.uid });
    titleText(this, 380, 58, p.name, '22px').setOrigin(0.5);

    // Humor line carries the diagnosis *and* how far to trust it, so the Eye
    // stat is visible to the player instead of silently skewing a hidden roll.
    const humorLine = this.diagnosedHumor
      ? `${humorName(this.diagnosedHumor)} (${t(this.diagnosisConfidenceKey ?? 'confidence_guess')})`
      : t('humor_unknown');

    // On a phone the three "· do this next" prompts are dropped: the buttons
    // that do them sit directly below, and at compact type the eight-line block
    // was 258px tall and ran off the top of the panel.
    const done = compact()
      ? [p.diagnosed ? '✓' : '·', p.pulseRead ? '✓' : '·', p.urineRead ? '✓' : '·'].join(' ')
      : null;
    const statusLines = compact()
      ? [
          `${t('class')}: ${className(p.class)}`,
          t(p.complaintKey.replace('complaint.', 'complaint_')),
          `${t('severity')}: ${severityMarks(p.severity)}`,
          `${t('humor')}: ${humorLine}`,
          `${t('examined_marks')}: ${done}`,
        ]
      : [
          `${t('class')}: ${className(p.class)}`,
          `${t('complaint')}: ${t(p.complaintKey.replace('complaint.', 'complaint_'))}`,
          `${t('severity')}: ${severityMarks(p.severity)}`,
          `${t('humor')}: ${humorLine}`,
          p.diagnosed ? '✓ ' + t('diagnosed') : '· ' + t('tip_examine'),
          p.pulseRead ? '✓ ' + t('pulse_done') : '· ' + t('tip_pulse'),
          p.urineRead ? '✓ ' + t('urine_done') : '· ' + t('tip_urine'),
          `${t('astro_label')}: ${t(astro.key.replace(/\./g, '_'))}`,
        ];
    const statusText = bodyText(this, compact() ? 250 : 228, 88, statusLines.join('\n'), {
      fontSize: compact() ? fontFor('small') : fontFor('body'),
      wordWrap: { width: compact() ? 330 : 360 },
    });

    // Findings flow below the portrait and the status block, whichever runs
    // longer, and each pushes the next down by its own measured height.
    // The carved frame overhangs the picture. Findings must start below both
    // it and the translated status block; otherwise a long pulse line draws
    // through the upper panel in German.
    const portraitBottom = 165 + portraitSize * 0.72;
    let findY = Math.max(228, portraitBottom + 12, statusText.y + statusText.height + 10);

    if (this.pulse) {
      const narrowed = this.pulse.candidates.map((h) => humorName(h)).join(' / ');
      const line = bodyText(
        this,
        56,
        findY,
        `${t(this.pulse.qualityKey)} — ${t('pulse_suggests')}: ${narrowed}`,
        { fontSize: fontFor('small'), color: '#a8c0c4', wordWrap: { width: 528 } },
      );
      findY += line.height + 6;
    }

    if (this.palpation) {
      const where = this.palpation.region
        ? t(`region_${this.palpation.region}`)
        : t('region_unclear');
      const line = bodyText(
        this,
        56,
        findY,
        `${t(this.palpation.qualityKey)} — ${t(this.palpation.textKey, { where })}`,
        { fontSize: fontFor('small'), color: '#c4a574', wordWrap: { width: 528 } },
      );
      findY += line.height + 6;
    }

    if (this.tongue) {
      const narrowed = this.tongue.candidates.map((h) => humorName(h)).join(' / ');
      const line = bodyText(
        this,
        56,
        findY,
        `${t(this.tongue.qualityKey)} — ${t('pulse_suggests')}: ${narrowed}`,
        { fontSize: fontFor('small'), color: '#b0a08a', wordWrap: { width: 528 } },
      );
      findY += line.height + 6;
    }

    if (this.urine) {
      const narrowed = this.urine.candidates.map((h) => humorName(h)).join(' / ');
      const line = bodyText(
        this,
        56,
        findY,
        `${t(this.urine.qualityKey)} — ${t('urine_suggests')}: ${narrowed}`,
        { fontSize: fontFor('small'), color: '#c9b48a', wordWrap: { width: 528 } },
      );
      findY += line.height + 6;
    }

    // Now the frame can be sized to what it actually contains.
    const panelBottom = Math.max(332, findY + 6);
    woodPanel(this, 40, panelTop, 560, panelBottom - panelTop, 0.94).setDepth(-2);

    const hintTop = panelBottom + 12;
    parchmentPanel(this, 40, hintTop, 560, 84).setDepth(-2);
    bodyText(this, 56, hintTop + 11, t('treat_hint'), {
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
        hintTop + 48,
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

    // Below the parchment, never above 450 — a short hint must not pull the
    // controls up into the body text.
    const examRowY = Math.max(450, hintTop + 106);
    // Four 124px buttons in a row are 67 real pixels wide on a phone. Two rows
    // of two at nearly double the width are reachable with a thumb.
    const exW = compact() ? 258 : 124;
    const exH = compact() ? 62 : 42;
    const exFont = compact() ? fontFor('button') : '13px';
    const exX = compact() ? [176, 452, 176, 452] : [112, 244, 376, 508];
    const exY = compact()
      ? [examRowY, examRowY, examRowY + exH + 10, examRowY + exH + 10]
      : [examRowY, examRowY, examRowY, examRowY];
    makeButton(this, exX[0]!, exY[0]!, t('diagnose'), () => {
      mutate((st) => {
        const dx = diagnosePatient(st, this.patient);
        this.diagnosedHumor = dx.humor;
        this.diagnosisConfidenceKey = dx.confidenceKey;
      });
      audio.sfx('page');
      this.render();
    }, { width: exW, height: exH, fontSize: exFont });

    makeButton(this, exX[1]!, exY[1]!, t('pulse'), () => {
      mutate((st) => {
        this.pulse = readPulse(st, this.patient);
      });
      audio.sfx('pulse');
      this.render();
    }, { width: exW, height: exH, fontSize: exFont });

    // Uroscopy: the complementary axis. Cheap in coin, costly in the one
    // resource the day is actually made of — there are only so many patients.
    // Uroscopy was the signature act of *learned* medicine — a bath-house
    // apprentice was not taught to read a flask. Greyed with the reason rather
    // than hidden, so the player learns the art exists and can be taught.
    const uroReq = this.urine
      ? ({ ok: false, reasonKey: 'req_already_have' } as const)
      : canExamine(s, 'uroscopy');
    gatedButton(this, exX[2]!, exY[2]!, t('uroscopy'), uroReq, () => {
      mutate((st) => {
        this.urine = readUrine(st, this.patient);
      });
      audio.sfx('splash');
      this.render();
    }, { width: exW, height: exH, fontSize: exFont });

    makeButton(this, exX[3]!, exY[3]!, t('refuse'), () => {
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
    }, { width: exW, height: exH, fontSize: exFont, fill: COLORS.blood });

    /* ── Fee and hand — the decisions that make a patient a negotiation ──
     * Fees were haggled, not fixed, and treating the poor for nothing was the
     * standard route back to respectability. Both are cycle buttons: tap to
     * step through, chosen per patient, read by `applyTreatment`. No hotkeys,
     * so the technique keys (4–9) stay where the help text says they are.
     */
    const stance = p.feeStance ?? 'usual';
    const intensity = p.intensity ?? 'usual';
    // Two 258px buttons centred at 176 and 452 span 47–581, inside the 40–600
    // panel — the four exam columns (112/244/…) would overlap at this width.
    const cycX = [176, 452];
    const cycY = compact() ? exY[2]! + exH + 10 : examRowY + 52;
    const cycH = compact() ? 56 : 36;
    makeButton(
      this,
      cycX[0]!,
      cycY,
      `${t('fee_stance_label')}: ${t(STANCE_KEYS[stance])} ▸`,
      () => {
        p.feeStance = STANCES[(STANCES.indexOf(stance) + 1) % STANCES.length]!;
        audio.sfx('click');
        this.render();
      },
      {
        width: 258,
        height: cycH,
        fontSize: exFont,
        noHotkey: true,
        fill: stance === 'alms' ? COLORS.green : stance === 'demand' ? 0x5a4420 : COLORS.panelLight,
      },
    );
    makeButton(
      this,
      cycX[1]!,
      cycY,
      `${t('intensity_label')}: ${t(INTENSITY_KEYS[intensity])} ▸`,
      () => {
        p.intensity = INTENSITIES[(INTENSITIES.indexOf(intensity) + 1) % INTENSITIES.length]!;
        audio.sfx('click');
        this.render();
      },
      {
        width: 258,
        height: cycH,
        fontSize: exFont,
        noHotkey: true,
        fill: intensity === 'bold' ? 0x5a3020 : COLORS.panelLight,
      },
    );

    /* ── The taught examinations ──────────────────────────────────────
     * Palpation and the tongue. Gated on training like uroscopy, and greyed
     * with the reason rather than hidden, so a player who cannot do them
     * learns they exist and can be taught.
     */
    const taughtY = cycY + (compact() ? cycH + 10 : 34);
    if (!compact()) {
      gatedButton(
        this,
        cycX[0]!,
        taughtY,
        t('palpate'),
        this.palpation ? ({ ok: false, reasonKey: 'req_already_have' } as const) : canExamine(s, 'palpate'),
        () => {
          mutate((st) => {
            this.palpation = readPalpation(st, this.patient);
          });
          audio.sfx('pulse');
          this.render();
        },
        { width: 258, height: 32, fontSize: '13px', noHotkey: true },
      );
      gatedButton(
        this,
        cycX[1]!,
        taughtY,
        t('tongue_look'),
        this.tongue ? ({ ok: false, reasonKey: 'req_already_have' } as const) : canExamine(s, 'tongue'),
        () => {
          mutate((st) => {
            this.tongue = readTongue(st, this.patient);
          });
          audio.sfx('page');
          this.render();
        },
        { width: 258, height: 32, fontSize: '13px', noHotkey: true },
      );
    }

    /* ── The Aderlaßmännchen ──────────────────────────────────────────
     * Which vein, judged against the moon's sign and the seat of the
     * complaint. The codex has claimed this mechanic exists since long before
     * it did. Shown whenever the player knows any blood art, because the
     * choice has to be made *before* picking the technique.
     */
    const knowsBloodArt = TECHNIQUES.some(
      (tc) => tc.category === 'blood' && s.unlockedTechniques.includes(tc.id),
    );
    if (knowsBloodArt && !compact()) {
      const sign = moonSign(s);
      // The seat of the trouble is only known if the hand found it. Without
      // palpation the player is choosing a vein blind — which is exactly the
      // advantage a field surgeon has over a scholar at the bleeding bowl.
      const region = this.palpation?.region ?? null;
      bodyText(
        this,
        56,
        taughtY + 26,
        `${t('moon_in', { sign: t(`zodiac_${sign}`), n: daysInSign(s) })}${
          isEgyptianDay(s.day) ? ` · ${t('egyptian_day_warn')}` : ''
        }`,
        {
          fontSize: '12px',
          color: isEgyptianDay(s.day) ? '#b33a3a' : '#a8c0c4',
          wordWrap: { width: 520 },
        },
      );
      const veins = VEINS.filter((v) => s.stats.hand >= v.minHand);
      const current = p.vein ?? veins[0]?.id ?? null;
      if (current) {
        const verdict = judgeVein(s, current, region);
        makeButton(
          this,
          176,
          taughtY + 58,
          `${t('vein_label')}: ${t(`vein_${current}`)} ▸`,
          () => {
            const i = veins.findIndex((v) => v.id === current);
            p.vein = veins[(i + 1) % veins.length]!.id;
            audio.sfx('click');
            this.render();
          },
          {
            width: 258,
            height: 36,
            fontSize: '13px',
            noHotkey: true,
            fill:
              verdict.tone === 'good'
                ? COLORS.green
                : verdict.tone === 'bad'
                  ? COLORS.blood
                  : COLORS.panelLight,
          },
        );
        bodyText(this, 320, taughtY + 50, t(verdict.key), {
          fontSize: '12px',
          color:
            verdict.tone === 'good' ? '#5a9a6e' : verdict.tone === 'bad' ? '#c9a227' : '#a88',
          wordWrap: { width: 270 },
        });
      }
    }

    // Procedures and deferred regimens share the right panel. The player can
    // always return to the hand-work list; a regimen is a different choice,
    // not an extra hidden technique that happens to resolve tomorrow.
    panel(this, 580, 42, 660, 620);
    makeButton(this, 728, 68, t('treatment_procedure'), () => {
      this.treatmentPath = 'procedure';
      this.render();
    }, { width: 236, height: 34, fontSize: '13px', fill: this.treatmentPath === 'procedure' ? COLORS.green : COLORS.panelLight, noHotkey: true });
    makeButton(this, 1084, 68, t('regimen_title'), () => {
      this.treatmentPath = 'regimen';
      this.render();
    }, { width: 236, height: 34, fontSize: '13px', fill: this.treatmentPath === 'regimen' ? COLORS.green : COLORS.panelLight, noHotkey: true });

    if (this.treatmentPath === 'regimen') {
      this.renderRegimenPanel(s, 600, 116, 620);
      helpBar(this, 'help_treatment', GAME_HEIGHT - 14);
      installSceneKeys(this);
      return;
    }

    bodyText(this, 600, 104, t('technique_pick'), { fontSize: '18px', color: '#e8c547' });
    // Flowing, not fixed: `technique_green_hint` wraps to two lines in German
    // and the warning below it was pinned 20px down, so the two overlapped.
    const hint = bodyText(this, 600, 128, t('technique_green_hint'), {
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
    const unlocked = TECHNIQUES.filter((tech) => tech.id !== 'hygiene_clean' && s.unlockedTechniques.includes(tech.id)).sort(
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

  private renderRegimenPanel(
    state: ReturnType<typeof getState>,
    x: number,
    top: number,
    width: number,
  ): void {
    bodyText(this, x, top, t('regimen_intro'), {
      fontSize: '13px', color: '#c4a574', wordWrap: { width }, lineSpacing: 2,
    });
    REGIMENS.forEach((regimen, index) => {
      const y = top + 100 + index * 148;
      const req = canStartRegimen(state, this.patient, regimen.id);
      titleText(this, x, y, t(regimen.labelKey), '17px').setOrigin(0, 0.5);
      bodyText(this, x, y + 18, t(regimen.bodyKey), {
        fontSize: '12px', color: '#a8c0c4', wordWrap: { width: 380 }, lineSpacing: 2,
      });
      gatedButton(this, 1080, y + 26, t('regimen_schedule'), req, () => this.finishRegimen(regimen.id), {
        width: 250, height: 42, fontSize: '13px', noHotkey: true,
      });
    });
    bodyText(this, x, 624, t('regimen_disclaimer'), {
      fontSize: '12px', color: '#c9a227', wordWrap: { width }, lineSpacing: 2,
    });
  }

  private finishRegimen(regimenId: keyof typeof REGIMEN_MAP): void {
    if (this.finishing || this.phase === 'result') return;
    this.finishing = true;
    let started = false;
    mutate((state) => {
      const plan = startRegimen(state, this.patient, regimenId);
      if (!plan) return;
      started = true;
      state.storyFlags['patients_remaining'] = Math.max(
        0,
        Number(state.storyFlags['patients_remaining'] ?? 1) - 1,
      );
      state.patientsToday += 1;
      state.totalTreated += 1;
      this.result = {
        kind: 'partial',
        pay: 0,
        reputationDelta: 0,
        ethicsDelta: 0,
        xp: 0,
        messageKey: 'regimen_started',
        messageParams: { name: this.patient.name, regimen: t(REGIMEN_MAP[regimenId].labelKey) },
      };
    });
    if (!started) {
      this.finishing = false;
      this.render();
      return;
    }
    removeFromQueue(this.patient.uid);
    audio.sfx('page');
    saveGame();
    this.phase = 'result';
    this.render();
  }

  /**
   * Phone treatment flow. The desktop screen is a two-panel workbench, but
   * fitting its examination controls and its technique list into 320 CSS
   * pixels made the real controls only 27px tall. Paging preserves every
   * decision while giving each tap target the same 44px physical minimum as
   * the rest of the compact game.
   */
  private renderCompact(): void {
    const p = this.patient;
    const s = getState();
    const h = touchTargetHeight();
    const twoCol = { width: 520, height: h, fontSize: fontFor('button'), noHotkey: true };
    const full = { width: 1080, height: h, fontSize: fontFor('button'), noHotkey: true };
    const statusHumor = this.diagnosedHumor
      ? humorName(this.diagnosedHumor)
      : t('humor_unknown');

    woodPanel(this, 40, 16, GAME_WIDTH - 80, 130, 0.94).setDepth(-2);
    addPortrait(this, 120, 81, portraitKeyForPatient(p), { size: 88, seed: p.uid });
    titleText(this, 245, 43, p.name, fontFor('heading')).setOrigin(0, 0.5);
    bodyText(this, 245, 72, `${className(p.class)} · ${t(p.complaintKey.replace('complaint.', 'complaint_'))}`, {
      fontSize: fontFor('small'), color: '#e8d5a8', wordWrap: { width: 900 },
    }).setOrigin(0, 0.5);
    bodyText(this, 245, 108, `${t('severity')}: ${severityMarks(p.severity)} · ${t('humor')}: ${statusHumor}`, {
      fontSize: fontFor('small'), color: '#a8c0c4', wordWrap: { width: 900 },
    }).setOrigin(0, 0.5);

    if (this.compactPage === 'techniques') {
      this.renderCompactTechniques(s, h, full, twoCol);
      return;
    }
    if (this.compactPage === 'regimens') {
      this.renderCompactRegimens(s, full, twoCol);
      return;
    }

    if (this.compactPage === 'exams') {
      makeButton(this, 350, 230, t('diagnose'), () => {
        mutate((st) => {
          const dx = diagnosePatient(st, this.patient);
          this.diagnosedHumor = dx.humor;
          this.diagnosisConfidenceKey = dx.confidenceKey;
        });
        audio.sfx('page');
        this.render();
      }, twoCol);
      makeButton(this, 930, 230, t('pulse'), () => {
        mutate((st) => {
          this.pulse = readPulse(st, this.patient);
        });
        audio.sfx('pulse');
        this.render();
      }, twoCol);

      const uroReq = this.urine
        ? ({ ok: false, reasonKey: 'req_already_have' } as const)
        : canExamine(s, 'uroscopy');
      gatedButton(this, 350, 344, t('uroscopy'), uroReq, () => {
        mutate((st) => {
          this.urine = readUrine(st, this.patient);
        });
        audio.sfx('splash');
        this.render();
      }, twoCol);
      makeButton(this, 930, 344, t('refuse'), () => {
        mutate((st) => {
          if (p.class === 'beggar') st.ethics = Math.max(0, st.ethics - 3);
          else st.reputation[st.locationId] = (st.reputation[st.locationId] ?? 0) - 1;
          st.storyFlags['patients_remaining'] = Math.max(
            0,
            Number(st.storyFlags['patients_remaining'] ?? 1) - 1,
          );
        });
        removeFromQueue(p.uid);
        transitionTo(this, 'Bathhouse');
      }, { ...twoCol, fill: COLORS.blood });

      makeButton(this, 350, 458, t('fee_stance_label'), () => {
        this.compactPage = 'care';
        this.render();
      }, twoCol);
      makeButton(this, 930, 458, t('technique_pick'), () => {
        this.compactPage = 'techniques';
        this.render();
      }, { ...twoCol, primary: true });
      makeButton(this, GAME_WIDTH / 2, 574, t('regimen_title'), () => {
        this.compactPage = 'regimens';
        this.render();
      }, full);
    } else {
      const stance = p.feeStance ?? 'usual';
      const intensity = p.intensity ?? 'usual';
      const sign = moonSign(s);
      const veins = VEINS.filter((v) => s.stats.hand >= v.minHand);
      const current = p.vein ?? veins[0]?.id ?? null;
      const region = this.palpation?.region ?? null;
      const verdict = current ? judgeVein(s, current, region) : null;

      bodyText(this, GAME_WIDTH / 2, 172, `${t('moon_in', { sign: t(`zodiac_${sign}`), n: daysInSign(s) })}${
        isEgyptianDay(s.day) ? ` · ${t('egyptian_day_warn')}` : ''
      }`, {
        fontSize: fontFor('small'),
        color: isEgyptianDay(s.day) ? '#b33a3a' : '#a8c0c4',
        wordWrap: { width: GAME_WIDTH - 160 }, align: 'center',
      }).setOrigin(0.5);
      makeButton(this, 350, 250, `${t('fee_stance_label')}: ${t(STANCE_KEYS[stance])} ▸`, () => {
        p.feeStance = STANCES[(STANCES.indexOf(stance) + 1) % STANCES.length]!;
        audio.sfx('click');
        this.render();
      }, { ...twoCol, fill: stance === 'alms' ? COLORS.green : stance === 'demand' ? 0x5a4420 : COLORS.panelLight });
      makeButton(this, 930, 250, `${t('intensity_label')}: ${t(INTENSITY_KEYS[intensity])} ▸`, () => {
        p.intensity = INTENSITIES[(INTENSITIES.indexOf(intensity) + 1) % INTENSITIES.length]!;
        audio.sfx('click');
        this.render();
      }, { ...twoCol, fill: intensity === 'bold' ? 0x5a3020 : COLORS.panelLight });

      if (current && verdict) {
        makeButton(this, GAME_WIDTH / 2, 364, `${t('vein_label')}: ${t(`vein_${current}`)} ▸`, () => {
          const index = veins.findIndex((v) => v.id === current);
          p.vein = veins[(index + 1) % veins.length]!.id;
          audio.sfx('click');
          this.render();
        }, {
          ...full,
          fill: verdict.tone === 'good' ? COLORS.green : verdict.tone === 'bad' ? COLORS.blood : COLORS.panelLight,
        });
        bodyText(this, GAME_WIDTH / 2, 430, t(verdict.key), {
          fontSize: fontFor('small'),
          color: verdict.tone === 'good' ? '#5a9a6e' : verdict.tone === 'bad' ? '#c9a227' : '#a88',
          wordWrap: { width: GAME_WIDTH - 160 }, align: 'center',
        }).setOrigin(0.5);
      }

      makeButton(this, 350, 528, t('back'), () => {
        this.compactPage = 'exams';
        this.render();
      }, twoCol);
      makeButton(this, 930, 528, t('technique_pick'), () => {
        this.compactPage = 'techniques';
        this.render();
      }, { ...twoCol, primary: true });
    }

    installSceneKeys(this, { onBack: () => transitionTo(this, 'Bathhouse') });
  }

  private renderCompactTechniques(
    s: ReturnType<typeof getState>,
    h: number,
    full: { width: number; height: number; fontSize: string; noHotkey: boolean },
    twoCol: { width: number; height: number; fontSize: string; noHotkey: boolean },
  ): void {
    const orderIdx = (id: string) => {
      const i = TECH_DISPLAY_ORDER.indexOf(id);
      return i < 0 ? 999 : i;
    };
    const ordered = TECHNIQUES.filter((tech) => tech.id !== 'hygiene_clean' && s.unlockedTechniques.includes(tech.id)).sort(
      (a, b) => orderIdx(a.id) - orderIdx(b.id),
    );
    const perPage = 3;
    const pages = Math.max(1, Math.ceil(ordered.length / perPage));
    if (this.techPage >= pages) this.techPage = 0;
    const slice = ordered.slice(this.techPage * perPage, this.techPage * perPage + perPage);

    bodyText(this, GAME_WIDTH / 2, 166, `${t('technique_pick')} · ${t('tech_page', { n: this.techPage + 1, m: pages })}`, {
      fontSize: fontFor('small'), color: '#e8c547', align: 'center',
    }).setOrigin(0.5);
    slice.forEach((tech, index) => {
      const check = canUseTechnique(s, tech.id);
      const plausible = this.isPlausible(tech.id);
      const label = `${plausible ? '★ ' : ''}${techName(tech.id)}${
        check.ok ? '' : check.reason === 'supplies' ? ` — ${t('need_supplies')}` : ` — ${t('need_skill')}`
      }`;
      makeButton(this, GAME_WIDTH / 2, 238 + index * (h + 12), label, () => {
        if (!check.ok) return;
        this.selectedTech = tech.id;
        this.phase = 'skill';
        if (tech.category === 'blood') void audio.setContext('treatment_blood');
        else void audio.setContext('treatment');
        audio.sfx('click');
        this.render();
      }, {
        ...full,
        disabled: !check.ok,
        fill: plausible ? COLORS.green : tech.category === 'dental' ? 0x4a3a28 : COLORS.panelLight,
      });
    });

    const navY = 590;
    makeButton(this, 350, navY, this.techPage > 0 ? '◀' : t('back'), () => {
      if (this.techPage > 0) this.techPage -= 1;
      else this.compactPage = 'exams';
      this.render();
    }, twoCol);
    makeButton(this, 930, navY, this.techPage < pages - 1 ? '▶' : t('back'), () => {
      if (this.techPage < pages - 1) this.techPage += 1;
      else this.compactPage = 'exams';
      this.render();
    }, twoCol);
    installSceneKeys(this, { onBack: () => {
      this.compactPage = 'exams';
      this.render();
    } });
  }

  private renderCompactRegimens(
    state: ReturnType<typeof getState>,
    full: { width: number; height: number; fontSize: string; noHotkey: boolean },
    twoCol: { width: number; height: number; fontSize: string; noHotkey: boolean },
  ): void {
    bodyText(this, GAME_WIDTH / 2, 166, t('regimen_intro'), {
      fontSize: fontFor('small'), color: '#c4a574', wordWrap: { width: GAME_WIDTH - 160 }, align: 'center',
    }).setOrigin(0.5);
    REGIMENS.forEach((regimen, index) => {
      const req = canStartRegimen(state, this.patient, regimen.id);
      const y = 260 + index * 94;
      gatedButton(this, GAME_WIDTH / 2, y, t(regimen.labelKey), req, () => this.finishRegimen(regimen.id), full);
      bodyText(this, GAME_WIDTH / 2, y + 36, t(regimen.bodyKey), {
        fontSize: fontFor('small'), color: '#a8c0c4', wordWrap: { width: GAME_WIDTH - 180 }, align: 'center',
      }).setOrigin(0.5, 0);
    });
    bodyText(this, GAME_WIDTH / 2, 532, t('regimen_disclaimer'), {
      fontSize: fontFor('small'), color: '#c9a227', wordWrap: { width: GAME_WIDTH - 180 }, align: 'center',
    }).setOrigin(0.5, 0);
    makeButton(this, GAME_WIDTH / 2, 624, t('back'), () => {
      this.compactPage = 'exams';
      this.render();
    }, full);
    installSceneKeys(this, { onBack: () => {
      this.compactPage = 'exams';
      this.render();
    } });
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

    /*
     * The two aftermath lines, flowed rather than pinned.
     *
     * They were at fixed y=408 and y=430 — and drawn in the wrong order, the
     * vein note above the fee note it was meant to follow. With the Continue
     * button at 460 the three crowded into 52px and read as one smear.
     *
     * `noteY` advances by what each line actually measured, so one line sits
     * where one line belongs and two never touch.
     */
    let noteY = 404;
    const aftermath: Array<{ key: string; size: string; color: string }> = [];
    // Fee first: it is the consequence of a decision the player made.
    if (r.stanceNoteKey) {
      aftermath.push({ key: r.stanceNoteKey, size: '14px', color: '#c9b48a' });
    }
    // Then what the bloodletting tables made of the vein.
    if (r.veinNoteKey) {
      aftermath.push({ key: r.veinNoteKey, size: '13px', color: '#a8c0c4' });
    }
    for (const line of aftermath) {
      const txt = bodyText(this, GAME_WIDTH / 2, noteY, t(line.key), {
        fontSize: line.size,
        color: line.color,
        wordWrap: { width: 560 },
        align: 'center',
      }).setOrigin(0.5, 0);
      noteY += txt.height + 6;
    }

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

    // Below whatever the aftermath lines took, never above its designed place.
    makeButton(this, GAME_WIDTH / 2, Math.max(462, noteY + 26), t('continue'), () => {
      transitionTo(this, 'Bathhouse');
    }, { primary: true });

    // `render()` returns early for this phase, so the exam branch's call to
    // installSceneKeys never runs — bind here too or the result screen has no
    // keyboard at all.
    installSceneKeys(this, { onBack: () => transitionTo(this, 'Bathhouse') });
  }
}
