/**
 * The lexicon.
 *
 * Two panes: categories on the left, entries in the middle, the chosen entry
 * on the right. Data comes from `data/lexicon.ts`, so adding an article means
 * adding an entry and two strings — no layout code.
 *
 * This is separate from the Codex, which remains a short guided tour of the
 * rules. The lexicon is for looking things up.
 */
import Phaser from 'phaser';
import { t } from '../i18n';
import { GAME_HEIGHT, GAME_WIDTH } from '../types';
import { bodyText, drawBackground, makeButton, panel, titleText } from '../ui/theme';
import { transitionTo, sceneBackground } from '../ui/fx';
import { installSceneKeys } from '../ui/input';
import { audio } from '../audio/AudioManager';
import {
  LEXICON,
  LEXICON_CATEGORIES,
  lexiconByCategory,
  type LexiconCategory,
} from '../data/lexicon';

/** Entries per page in the middle column. */
const PER_PAGE = 9;

export class LexiconScene extends Phaser.Scene {
  private category: LexiconCategory = 'trade';
  private entryId: string | null = null;
  private page = 0;
  private from = 'Hub';

  constructor() {
    super('Lexicon');
  }

  init(data: { category?: LexiconCategory; entryId?: string; page?: number; from?: string }): void {
    if (data?.category) this.category = data.category;
    if (data?.entryId !== undefined) this.entryId = data.entryId;
    if (typeof data?.page === 'number') this.page = data.page;
    if (data?.from) this.from = data.from;
  }

  create(): void {
    void audio.setContext('codex');
    drawBackground(this, 'room');
    sceneBackground(this, 'bg_journal', {
      fallbacks: ['bg_guild'],
      brightness: 0.4,
      topScrim: 70,
      bottomScrim: 60,
    });

    titleText(this, GAME_WIDTH / 2, 34, t('lexicon_title'), '28px');
    bodyText(this, GAME_WIDTH / 2, 62, t('lexicon_intro'), {
      fontSize: '13px',
      color: '#a8967c',
    }).setOrigin(0.5);

    this.drawCategories();
    this.drawList();
    this.drawEntry();

    makeButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 30, t('back'), () =>
      transitionTo(this, this.from), {
      width: 200,
      height: 36,
      fontSize: '15px',
      back: true,
    });
    installSceneKeys(this, { onBack: () => transitionTo(this, this.from) });
  }

  /** Left column: the six categories. */
  private drawCategories(): void {
    panel(this, 30, 88, 220, 500);
    LEXICON_CATEGORIES.forEach((cat, i) => {
      const selected = cat === this.category;
      makeButton(
        this,
        140,
        120 + i * 46,
        `${t(`lex_cat_${cat}`)} (${lexiconByCategory(cat).length})`,
        () => this.scene.restart({ category: cat, entryId: null, page: 0, from: this.from }),
        {
          width: 196,
          height: 38,
          fontSize: '14px',
          fill: selected ? 0x6d5a2f : undefined,
        },
      );
    });
  }

  /** Middle column: entries in the chosen category. */
  private drawList(): void {
    const entries = lexiconByCategory(this.category);
    const pages = Math.max(1, Math.ceil(entries.length / PER_PAGE));
    if (this.page >= pages) this.page = 0;
    const slice = entries.slice(this.page * PER_PAGE, (this.page + 1) * PER_PAGE);

    panel(this, 266, 88, 300, 500);
    slice.forEach((e, i) => {
      const selected = e.id === this.entryId;
      makeButton(
        this,
        416,
        118 + i * 44,
        t(e.titleKey),
        () => this.scene.restart({
          category: this.category,
          entryId: e.id,
          page: this.page,
          from: this.from,
        }),
        {
          width: 276,
          height: 36,
          fontSize: '14px',
          fill: selected ? 0x6d5a2f : undefined,
          // Nine rows plus categories would swamp the 1-9 keys.
          noHotkey: true,
        },
      );
    });

    if (pages > 1) {
      makeButton(this, 416, 556, `${this.page + 1} / ${pages}`, () =>
        this.scene.restart({
          category: this.category,
          entryId: this.entryId,
          page: (this.page + 1) % pages,
          from: this.from,
        }), { width: 140, height: 32, fontSize: '13px', noHotkey: true });
    }
  }

  /** Right pane: the article itself. */
  private drawEntry(): void {
    panel(this, 582, 88, GAME_WIDTH - 612, 500);

    const entry = LEXICON.find((e) => e.id === this.entryId);
    if (!entry) {
      bodyText(this, 610, 130, t('lexicon_intro'), {
        fontSize: '15px',
        color: '#8a7a68',
        wordWrap: { width: GAME_WIDTH - 670 },
      });
      return;
    }

    titleText(this, 610, 112, t(entry.titleKey), '22px').setOrigin(0, 0.5);

    // Art is optional and may stream in late; the text never depends on it.
    const hasArt = !!entry.art && this.textures.exists(entry.art);
    if (hasArt) {
      this.add
        .image(GAME_WIDTH - 190, 480, entry.art!)
        .setDisplaySize(240, 160)
        .setAlpha(0.85)
        .disableInteractive();
    }

    bodyText(this, 610, 146, t(entry.bodyKey), {
      fontSize: '14px',
      color: '#e2d3b4',
      lineSpacing: 5,
      wordWrap: { width: GAME_WIDTH - 680 },
    });

    if (entry.simplified) {
      bodyText(this, 610, 548, t('lexicon_simplified'), {
        fontSize: '12px',
        color: '#c9a06a',
        wordWrap: { width: GAME_WIDTH - 680 },
      });
    }
  }
}
