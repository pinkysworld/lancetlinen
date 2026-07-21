/**
 * The Lepraschau, as the player meets it.
 *
 * Deliberately not a treatment screen: nothing is cured here. The player looks
 * at what their training lets them see, and says a word that decides where a
 * man lives. The three buttons carry no numbers and no hint of which is right,
 * because the whole mechanic is that you do not know.
 */
import Phaser from 'phaser';
import { t } from '../i18n';
import { getState, mutate, saveGame } from '../state';
import {
  LEPRASCHAU_FEE,
  makeLepraCase,
  readableSigns,
  resolveLepraschau,
  visibleSigns,
  type LepraCase,
  type LepraVerdict,
} from '../systems/lepraschau';
import { FIRST_NAMES_M, SURNAMES } from '../data/patients';
import { GAME_HEIGHT, GAME_WIDTH } from '../types';
import { bodyText, drawBackground, makeButton, panel, titleText, COLORS } from '../ui/theme';
import { addPortrait } from '../ui/art';
import { sceneBackground, transitionTo } from '../ui/fx';
import { installSceneKeys } from '../ui/input';
import { audio } from '../audio/AudioManager';
import { compact, fontFor } from '../ui/responsive';

export class LepraschauScene extends Phaser.Scene {
  private lepraCase!: LepraCase;
  private outcomeKey: string | null = null;

  constructor() {
    super('Lepraschau');
  }

  create(data?: { afflicted?: boolean }): void {
    const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]!;
    // Roughly one in three of those denounced was actually ill. The rest were
    // brought by neighbours over a rash, a debt or a grudge.
    const afflicted = data?.afflicted ?? Math.random() < 0.34;
    this.lepraCase = makeLepraCase(`${pick(FIRST_NAMES_M)} ${pick(SURNAMES)}`, afflicted);
    this.outcomeKey = null;
    void audio.setContext('politics');
    this.render();
  }

  private render(): void {
    this.children.removeAll();
    drawBackground(this, 'room');
    sceneBackground(this, 'bg_council', {
      fallbacks: ['bg_politics', 'bg_journal'],
      brightness: 0.5,
      topScrim: 90,
    });
    titleText(this, GAME_WIDTH / 2, 46, t('lepra_title'), compact() ? '30px' : '32px');

    const s = getState();
    const w = compact() ? GAME_WIDTH - 80 : 900;
    panel(this, (GAME_WIDTH - w) / 2, 90, w, compact() ? 470 : 430);

    addPortrait(this, GAME_WIDTH / 2 - w / 2 + 90, 190, 'port_sick', {
      size: compact() ? 100 : 120,
      seed: this.lepraCase.name,
    });

    const left = GAME_WIDTH / 2 - w / 2 + 170;
    bodyText(this, left, 120, t('lepra_body', { name: this.lepraCase.name }), {
      fontSize: fontFor('body'),
      wordWrap: { width: w - 210 },
    });

    if (this.outcomeKey) {
      this.renderOutcome(left, w);
      return;
    }

    /*
     * What this Bader can see. Signs he was never taught to test for are not
     * listed as "absent" — they are not listed at all, because he has no way
     * of knowing. That is the difference between a negative finding and an
     * unexamined one, and it is the reason to learn palpation.
     */
    const seen = visibleSigns(s, this.lepraCase);
    let y = 260;
    if (seen.length === 0) {
      bodyText(this, left, y, t('lepra_no_signs'), {
        fontSize: fontFor('small'),
        color: '#a8c0c4',
        wordWrap: { width: w - 210 },
      });
      y += 30;
    } else {
      for (const id of seen) {
        const line = bodyText(this, left, y, `· ${t(`lepra_sign_${id}`)}`, {
          fontSize: fontFor('small'),
          color: '#e8d5a8',
          wordWrap: { width: w - 210 },
        });
        y += line.height + 6;
      }
    }

    // Name what the player cannot examine, so the gap is visible and has a cure.
    const canRead = readableSigns(s).length;
    if (canRead < 5) {
      bodyText(this, left, y + 4, t('lepra_untrained'), {
        fontSize: '12px',
        color: '#8a7a68',
        wordWrap: { width: w - 210 },
      });
    }

    const btnY = compact() ? 470 : 430;
    const bw = compact() ? 300 : 260;
    const verdicts: Array<[LepraVerdict, string, number | undefined]> = [
      ['clean', t('lepra_choice_clean'), COLORS.green],
      ['leprous', t('lepra_choice_leprous'), COLORS.blood],
      ['defer', t('lepra_choice_defer'), undefined],
    ];
    verdicts.forEach(([verdict, label, fill], i) => {
      const x = compact() ? GAME_WIDTH / 2 : GAME_WIDTH / 2 + (i - 1) * (bw + 20);
      const yy = compact() ? btnY + i * 62 : btnY;
      makeButton(this, x, yy, label, () => this.decide(verdict), {
        width: bw,
        height: compact() ? 56 : 48,
        fontSize: fontFor('button'),
        ...(fill ? { fill } : {}),
      });
    });

    installSceneKeys(this);
  }

  private decide(verdict: LepraVerdict): void {
    mutate((st) => {
      const out = resolveLepraschau(st, this.lepraCase, verdict);
      this.outcomeKey = out.messageKey;
      st.storyFlags['lepra_recent'] = st.day;
    });
    audio.sfx(verdict === 'leprous' ? 'fail' : 'bell');
    saveGame();
    this.render();
  }

  private renderOutcome(left: number, w: number): void {
    bodyText(this, left, 270, t(this.outcomeKey!), {
      fontSize: fontFor('body'),
      color: '#e8d5a8',
      wordWrap: { width: w - 210 },
    });
    bodyText(this, left, 360, t('coin_amount', { n: LEPRASCHAU_FEE }), {
      fontSize: fontFor('small'),
      color: '#e8c547',
    });
    makeButton(this, GAME_WIDTH / 2, compact() ? 500 : 470, t('continue'), () =>
      transitionTo(this, 'Hub'), { primary: true, width: compact() ? 320 : 260 });
    installSceneKeys(this, { onBack: () => transitionTo(this, 'Hub') });
  }
}

/** Kept for the hub's story-interrupt check. */
export const LEPRASCHAU_SCENE_KEY = 'Lepraschau';
void GAME_HEIGHT;
