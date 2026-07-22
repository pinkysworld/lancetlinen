import Phaser from 'phaser';
import { t } from '../i18n';
import { getState, mutate, saveGame, setFlag } from '../state';
import { applyChoice, getDialogue } from '../systems/story';
import { GAME_WIDTH, GAME_HEIGHT } from '../types';
import { drawBackground, makeButton, bodyText, panel, titleText, resetSceneButtons } from '../ui/theme';
import { audio } from '../audio/AudioManager';
import { addLocationBackground, addPortrait, portraitKeyForNpc } from '../ui/art';
import { transitionTo } from '../ui/fx';
import { installSceneKeys } from '../ui/input';
import { textRevealMs } from '../systems/settings';
import { compact, fontFor, touchTargetHeight } from '../ui/responsive';

export class DialogueScene extends Phaser.Scene {
  private dialogueId = 'intro_1';
  private revealTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super('Dialogue');
  }

  init(data: { dialogueId?: string }): void {
    this.dialogueId = data.dialogueId ?? 'intro_1';
  }

  create(): void {
    this.showNode(this.dialogueId);
  }

  /**
   * Typewriter reveal honouring the Text speed setting.
   *
   * The setting existed in the options screen from the start but was read
   * nowhere. At "instant" this is a no-op, so nothing is slowed down for
   * players who do not want it.
   */
  private revealText(target: Phaser.GameObjects.Text, full: string): void {
    const perChar = textRevealMs();
    if (perChar <= 0) return;

    // Cancel any reveal still running from the previous node.
    this.revealTimer?.remove(false);
    target.setText('');

    let i = 0;
    this.revealTimer = this.time.addEvent({
      delay: perChar,
      loop: true,
      callback: () => {
        // Step several characters per tick at fast speeds so long passages do
        // not outlast the player's patience.
        i = Math.min(full.length, i + (perChar <= 16 ? 2 : 1));
        target.setText(full.slice(0, i));
        if (i >= full.length) {
          this.revealTimer?.remove(false);
          this.revealTimer = null;
        }
      },
    });
  }

  /** Finish the reveal immediately — any input should skip it. */
  private completeReveal(): void {
    this.revealTimer?.remove(false);
    this.revealTimer = null;
  }

  private showNode(id: string): void {
    this.completeReveal();
    this.children.removeAll();
    // The buttons just removed must not linger in the keyboard registry, or
    // number keys fire callbacks captured from the *previous* node and the
    // conversation appears to stick. (Same failure TreatmentScene had.)
    resetSceneButtons(this);
    audio.sfx('page');
    const tense =
      id.includes('krafft') || id.includes('epidemic') || id.includes('war') || id.includes('gregor');
    void audio.setContext(tense ? 'dialogue_tense' : 'dialogue');
    drawBackground(this, 'dark');
    // Was drawing the key `bath_bg`, which is the *procedural fallback canvas*
    // generated in PreloadScene — not the painted bathhouse (that is `art_bath`).
    // Every conversation in the game showed a crude gradient. Use the current
    // location instead, so dialogue feels situated where the player is standing.
    addLocationBackground(this, { brightness: 0.4, topScrim: 0, bottomScrim: 0 });

    const node = getDialogue(id);
    if (!node) {
      this.scene.start('Hub');
      return;
    }

    if (compact()) {
      this.showCompactNode(id, node);
      return;
    }

    panel(this, 80, 80, GAME_WIDTH - 160, 200);
    // Portrait sits in its own left column; the speech block starts clear of it
    // so the opening words are not hidden behind the frame.
    addPortrait(this, 176, 180, portraitKeyForNpc(node.speakerKey), { size: 124 });

    const textX = 288;
    titleText(this, textX, 104, t(node.speakerKey.replace('npc.', 'npc_')), '24px').setOrigin(0);

    const speech = t(node.textKey.replace('story.', 'story_'));
    const speechText = bodyText(this, textX, 144, speech, {
      fontSize: '18px',
      wordWrap: { width: GAME_WIDTH - textX - 110 },
      color: '#f5ecd7',
    });
    this.revealText(speechText, speech);

    panel(this, 80, 320, GAME_WIDTH - 160, 340);
    node.choices.forEach((choice, i) => {
      makeButton(
        this,
        GAME_WIDTH / 2,
        380 + i * 60,
        t(choice.textKey.replace('choice.', 'choice_')),
        () => this.choose(id, choice),
        { width: 520, height: 48, fontSize: '16px' },
      );
    });

    // Number keys pick a reply; no Esc, since a dialogue must be answered.
    installSceneKeys(this);
  }

  /** The same dialogue state change serves both desktop and compact views. */
  private choose(id: string, choice: Parameters<typeof applyChoice>[1]): void {
    let next: string | null = null;
    mutate((s) => {
      next = applyChoice(s, choice);
      if (id === 'intro_1' || id.startsWith('intro')) s.storyFlags['intro_started'] = true;
      if (id === 'epidemic_start') delete s.storyFlags['epidemic_pending_dialogue'];
    });
    saveGame();
    if (next) {
      this.showNode(next);
    } else {
      if (id === 'intro_3' || getState().storyFlags['intro_done']) setFlag('intro_done', true);
      transitionTo(this, getState().ending && !getState().freePlay ? 'Ending' : 'Hub');
    }
  }

  /** A single readable speaker card and roomy answer targets for phones. */
  private showCompactNode(id: string, node: NonNullable<ReturnType<typeof getDialogue>>): void {
    const h = touchTargetHeight();
    panel(this, 56, 36, GAME_WIDTH - 112, 286);
    addPortrait(this, 156, 178, portraitKeyForNpc(node.speakerKey), { size: 164 });
    const textX = 280;
    titleText(this, textX, 76, t(node.speakerKey.replace('npc.', 'npc_')), fontFor('heading')).setOrigin(0);
    const speech = t(node.textKey.replace('story.', 'story_'));
    const speechText = bodyText(this, textX, 126, speech, {
      fontSize: fontFor('body'), wordWrap: { width: GAME_WIDTH - textX - 104 }, color: '#f5ecd7',
    });
    this.revealText(speechText, speech);

    panel(this, 56, 348, GAME_WIDTH - 112, 330);
    node.choices.forEach((choice, i) => {
      makeButton(this, GAME_WIDTH / 2, 388 + i * (h + 16), t(choice.textKey.replace('choice.', 'choice_')),
        () => this.choose(id, choice), {
          width: GAME_WIDTH - 220, height: h, fontSize: fontFor('button'),
        });
    });
    installSceneKeys(this);
  }
}
