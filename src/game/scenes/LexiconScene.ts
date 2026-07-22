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
import { compact, fontFor, touchTargetHeight } from '../ui/responsive';
import { sourceById } from '../data/historicalSources';
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

    if (compact()) this.drawCompact();
    else {
      this.drawCategories();
      this.drawList();
      this.drawEntry();
    }

    if (!compact()) {
      makeButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 30, t('back'), () =>
        transitionTo(this, this.from), {
        width: 200, height: 36, fontSize: '15px', back: true,
      });
    }
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
    this.drawEvidence(entry, 610, entry.simplified ? 522 : 548, GAME_WIDTH - 680);
  }

  /** Phone view: cycle categories, page a short list, then read one full-width article. */
  private drawCompact(): void {
    const entries = lexiconByCategory(this.category);
    const pages = Math.max(1, Math.ceil(entries.length / 3));
    if (this.page >= pages) this.page = 0;
    const entry = LEXICON.find((item) => item.id === this.entryId);
    const target = touchTargetHeight();
    const returnToParent = () => transitionTo(this, this.from);
    makeButton(this, GAME_WIDTH - 110, 56, t('back'), returnToParent, {
      width: 190, height: Math.min(target, 86), fontSize: fontFor('small'), back: true,
    });

    if (entry) {
      panel(this, 50, 86, GAME_WIDTH - 100, 470);
      titleText(this, 82, 122, t(entry.titleKey), fontFor('heading')).setOrigin(0, 0.5);
      const article = bodyText(this, 82, 162, t(entry.bodyKey), {
        fontSize: fontFor('body'), color: '#e2d3b4', lineSpacing: 8,
        wordWrap: { width: GAME_WIDTH - 164 },
      });
      this.drawEvidence(entry, 82, Math.min(518, article.y + article.height + 14), GAME_WIDTH - 164);
      makeButton(this, GAME_WIDTH / 2, 650, t('back'), () =>
        this.scene.restart({ category: this.category, entryId: null, page: this.page, from: this.from }), {
        width: 460, height: target, fontSize: fontFor('button'), back: true,
      });
      return;
    }

    panel(this, 50, 86, GAME_WIDTH - 100, 470);
    const categoryIndex = LEXICON_CATEGORIES.indexOf(this.category);
    const selectCategory = (delta: number) => {
      const next = LEXICON_CATEGORIES[(categoryIndex + delta + LEXICON_CATEGORIES.length) % LEXICON_CATEGORIES.length]!;
      this.scene.restart({ category: next, entryId: null, page: 0, from: this.from });
    };
    makeButton(this, 170, 140, '◀', () => selectCategory(-1), {
      width: 180, height: target, fontSize: fontFor('button'), noHotkey: true,
    });
    makeButton(this, GAME_WIDTH / 2, 140, `${t(`lex_cat_${this.category}`)} (${entries.length})`, () => selectCategory(1), {
      width: 670, height: target, fontSize: fontFor('button'), noHotkey: true,
    });
    makeButton(this, GAME_WIDTH - 170, 140, '▶', () => selectCategory(1), {
      width: 180, height: target, fontSize: fontFor('button'), noHotkey: true,
    });
    entries.slice(this.page * 3, this.page * 3 + 3).forEach((item, index) => {
      makeButton(this, GAME_WIDTH / 2, 280 + index * (target + 14), t(item.titleKey), () =>
        this.scene.restart({ category: this.category, entryId: item.id, page: this.page, from: this.from }), {
          width: 920, height: target, fontSize: fontFor('button'), noHotkey: true,
        });
    });
    if (pages > 1) {
      makeButton(this, GAME_WIDTH / 2, 650, `${this.page + 1}/${pages} · ${t('codex_next')}`, () =>
        this.scene.restart({ category: this.category, entryId: null, page: (this.page + 1) % pages, from: this.from }), {
          width: 460, height: target, fontSize: fontFor('button'), noHotkey: true,
        });
    }
  }

  private drawEvidence(
    entry: (typeof LEXICON)[number],
    x: number,
    y: number,
    width: number,
  ): void {
    const source = sourceById(entry.sourceIds[0]!);
    bodyText(this, x, y, `${t(`lex_evidence_${entry.evidence}`)} · ${t('lex_source')}: ${source.title}`, {
      fontSize: '11px', color: entry.evidence === 'game_simplification' ? '#c9a06a' : '#92b99b',
      wordWrap: { width },
    });
  }
}
