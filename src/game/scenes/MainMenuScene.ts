import Phaser from 'phaser';
import { t, setLocale, getLocale, locName } from '../i18n';
import {
  createNewGame,
  hasSave,
  loadGame,
  setState,
  getState,
  mutate,
  getSaveMeta,
  formatSaveMetaLine,
  importSave,
} from '../state';
import { drawBackground, makeButton, titleText, bodyText, COLORS } from '../ui/theme';
import { showConfirm, showToast, promptImport } from '../ui/dialogs';
import { GAME_HEIGHT, GAME_WIDTH, type Locale } from '../types';
import { audio } from '../audio/AudioManager';
import { applySettings } from '../systems/settings';
import { transitionTo, sceneBackground } from '../ui/fx';
import { installSceneKeys } from '../ui/input';
import { isTouchDevice } from '../mobile';
import { compact, fontFor, gridColumnsX, primarySize, secondarySize } from '../ui/responsive';
import { viewRect } from '../ui/viewport';
import { APP_RELEASE_LABEL } from '../appInfo';

export class MainMenuScene extends Phaser.Scene {
  private compactPage: 'main' | 'more' = 'main';

  constructor() {
    super('MainMenu');
  }

  init(data?: { compactPage?: 'main' | 'more' }): void {
    this.compactPage = data?.compactPage ?? 'main';
  }

  create(): void {
    void audio.setContext('main_menu');
    drawBackground(this, 'menu');
    // Was `addDecorImage(…, 0.55)` under a full-screen 0.45 black rectangle,
    // which left roughly 30% of the painting — the same stacked-alpha pattern
    // already fixed in `addManagementBackground`. `sceneBackground` dims via
    // tint (which preserves contrast) and darkens only the top and bottom
    // bands, where the title and footer text actually sit. The middle, where
    // the buttons carry their own fill, stays bright.
    sceneBackground(this, 'art_menu', {
      fallbacks: ['menu_bg'],
      brightness: 0.72,
      topScrim: 150,
      bottomScrim: 110,
      depth: -20,
    });

    // Decorative edge posts. Anchored to the *visible* edges, not to 0 and
    // 1280: on a wide canvas the design band no longer reaches the screen
    // edge, and these drew two vertical seams across the middle of the
    // painting instead of framing it.
    const V = viewRect();
    const g = this.add.graphics();
    g.fillStyle(COLORS.panel, 0.25);
    g.fillRect(V.x, 0, 24, GAME_HEIGHT);
    g.fillRect(V.x + V.width - 24, 0, 24, GAME_HEIGHT);
    g.fillStyle(COLORS.gold, 0.12);
    g.fillRect(V.x + 20, 0, 3, GAME_HEIGHT);
    g.fillRect(V.x + V.width - 23, 0, 3, GAME_HEIGHT);

    if (compact()) {
      this.renderCompact();
      return;
    }

    // The logo is a wide painted wordmark. At 520x260 centred on y=108 its top
    // edge sat above the viewport and the initial "L" was clipped away.
    if (this.textures.exists('logo_title')) {
      // Compact: a smaller wordmark higher up, because the buttons below it
      // need to be twice the size they are on a monitor.
      const logoH = compact() ? 132 : 220;
      this.add
        .image(GAME_WIDTH / 2, compact() ? 84 : 132, 'logo_title')
        .setDisplaySize(logoH * 2, logoH)
        .setAlpha(0.98)
        .disableInteractive();
    } else {
      titleText(this, GAME_WIDTH / 2, 110, t('title'), '52px');
    }

    // One subtitle only. `subtitle` and the hard-coded "Holy Roman Empire ·
    // c. 1382" said the same thing twice, directly above one another.
    bodyText(this, GAME_WIDTH / 2, compact() ? 168 : 258, t('subtitle'), {
      fontSize: fontFor('heading'),
      color: '#c9b48a',
      wordWrap: { width: 900 },
      align: 'center',
    }).setOrigin(0.5);

    const meta = getSaveMeta();

    /* ── Primary actions ──────────────────────────────────────────────
     * Nine equally-weighted buttons read as a wall. The three that start
     * a session are full width; everything else drops to a secondary grid.
     */
    const prim = primarySize();
    const isCompact = false;
    // On a phone the logo and subtitle are given less room so the three
    // session buttons — the only ones that matter on a small screen — can be
    // large enough to hit without aiming.
    let y = isCompact ? 226 : 312;
    makeButton(this, GAME_WIDTH / 2, y, t('menu_new'), () => void this.startNew(), prim);
    y += prim.height + 12;
    // The save detail is far too long for a button label — it used to stretch
    // this one to 520px while its neighbours sat at 220. It now reads as a
    // caption underneath instead.
    makeButton(this, GAME_WIDTH / 2, y, t('menu_continue'), () => void this.continueGame(), {
      ...prim,
      disabled: !hasSave(),
    });
    y += prim.height + 12;
    // Continue reads the autosave; this reaches the three manual slots.
    makeButton(this, GAME_WIDTH / 2, y, t('menu_load_slot'), () =>
      transitionTo(this, 'SaveSlots', { mode: 'load', from: 'MainMenu' }), prim);

    y += prim.height / 2 + 24;
    bodyText(
      this,
      GAME_WIDTH / 2,
      y,
      meta ? formatSaveMetaLine(meta, locName(meta.locationId)) : t('no_save'),
      { fontSize: fontFor('small'), color: meta ? '#a8c0c4' : '#8a7a68', align: 'center' },
    ).setOrigin(0.5);

    /* ── Secondary actions ────────────────────────────────────────────
     * A 3x2 grid, so six options cost two rows instead of six.
     */
    const sec = secondarySize();
    const COL = gridColumnsX();
    const secOpts = { ...sec, fontSize: fontFor('button') };

    // Flowed through the grid rather than placed by hand. Assigning columns
    // manually and then advancing the row separately put three buttons on the
    // same line in the two-column layout, stacked on top of each other.
    const secondary: Array<[string, () => void, number?]> = [
      [t('help_btn'), () => transitionTo(this, 'Help'), 0x3d5a4a],
      [t('manual_lexicon_title'), () => transitionTo(this, 'Codex')],
      [
        t('menu_language_toggle', { lang: getLocale() === 'de' ? 'Deutsch' : 'English' }),
        () => this.toggleLang(),
      ],
      [
        audio.isMuted ? t('menu_unmute') : t('menu_mute'),
        () => {
          void audio.unlock().then(() => {
            const muted = audio.toggleMute();
            mutate((s) => {
              s.audioMuted = muted;
            });
            this.scene.restart();
          });
        },
      ],
      [t('menu_import'), () => this.doImport()],
      [t('credits_title'), () => transitionTo(this, 'Credits')],
    ];

    const rowTop = y + (isCompact ? 46 : 44);
    secondary.forEach(([label, onClick, fill], i) => {
      const col = i % COL.length;
      const line = Math.floor(i / COL.length);
      makeButton(this, COL[col]!, rowTop + line * (sec.height + 10), label, onClick, {
        ...secOpts,
        ...(fill ? { fill } : {}),
      });
    });

    // Footer. Both lines previously sat at fixed offsets from the bottom and
    // collided with the last two buttons of the old nine-high stack.
    // The how-to blurb is dropped on a phone: it is three lines of guidance
    // competing for space the controls need, and "How to play" is right there.
    if (!isCompact) {
      bodyText(this, GAME_WIDTH / 2, GAME_HEIGHT - 46, t('menu_howto_blurb'), {
        fontSize: '13px',
        color: '#9a8878',
        wordWrap: { width: 860 },
        align: 'center',
      }).setOrigin(0.5);
    }
    // On a phone the quit hint is wrong (there is no tab to close) and the
    // zoom gesture is undiscoverable, so swap one for the other.
    bodyText(
      this,
      GAME_WIDTH / 2,
      GAME_HEIGHT - 24,
      isTouchDevice() ? t('touch_zoom_hint') : t('menu_quit_hint'),
      { fontSize: '12px', color: '#7a6a58' },
    ).setOrigin(0.5);
    bodyText(this, GAME_WIDTH / 2, GAME_HEIGHT - 8, `© Michél Nguyen · minh.systems · ${APP_RELEASE_LABEL}`, {
      fontSize: '11px',
      color: '#6b5d4d',
    }).setOrigin(0.5);

    // No Esc target on the root menu; number keys and arrows still apply.
    installSceneKeys(this);
  }

  /** Phone menus trade density for real, finger-sized actions. */
  private renderCompact(): void {
    const primary = primarySize();
    const primaryOpts = { ...primary, fontSize: fontFor('button') };

    if (this.compactPage === 'more') {
      titleText(this, GAME_WIDTH / 2, 54, t('title'), fontFor('title'));
      bodyText(this, GAME_WIDTH / 2, 98, t('subtitle'), {
        fontSize: fontFor('small'), color: '#c9b48a', align: 'center', wordWrap: { width: 980 },
      }).setOrigin(0.5);

      const secondary = secondarySize();
      const opts = { ...secondary, fontSize: fontFor('button') };
      const x = [340, 940];
      const choices: Array<[string, () => void, number?]> = [
        [t('help_btn'), () => transitionTo(this, 'Help'), 0x3d5a4a],
        [t('manual_lexicon_title'), () => transitionTo(this, 'Codex')],
        [t('menu_language_toggle', { lang: getLocale() === 'de' ? 'Deutsch' : 'English' }), () => this.toggleLang()],
        [audio.isMuted ? t('menu_unmute') : t('menu_mute'), () => {
          void audio.unlock().then(() => {
            const muted = audio.toggleMute();
            mutate((s) => { s.audioMuted = muted; });
            this.scene.restart({ compactPage: 'more' });
          });
        }],
        [t('menu_import'), () => this.doImport()],
        [t('credits_title'), () => transitionTo(this, 'Credits')],
      ];
      choices.forEach(([label, onClick, fill], i) => {
        makeButton(this, x[i % 2]!, 184 + Math.floor(i / 2) * (secondary.height + 16), label, onClick, {
          ...opts, ...(fill ? { fill } : {}),
        });
      });
      makeButton(this, GAME_WIDTH / 2, 610, t('back'), () => this.scene.restart({ compactPage: 'main' }), {
        ...primaryOpts, back: true,
      });
      installSceneKeys(this, { onBack: () => this.scene.restart({ compactPage: 'main' }) });
      return;
    }

    titleText(this, GAME_WIDTH / 2, 48, t('title'), fontFor('title'));
    bodyText(this, GAME_WIDTH / 2, 98, t('subtitle'), {
      fontSize: fontFor('small'), color: '#c9b48a', align: 'center', wordWrap: { width: 980 },
    }).setOrigin(0.5);

    let y = 184;
    makeButton(this, GAME_WIDTH / 2, y, t('menu_new'), () => void this.startNew(), primaryOpts);
    y += primary.height + 16;
    makeButton(this, GAME_WIDTH / 2, y, t('menu_continue'), () => void this.continueGame(), {
      ...primaryOpts, disabled: !hasSave(),
    });
    y += primary.height + 16;
    makeButton(this, GAME_WIDTH / 2, y, t('menu_load_slot'), () =>
      transitionTo(this, 'SaveSlots', { mode: 'load', from: 'MainMenu' }), primaryOpts);
    makeButton(this, GAME_WIDTH / 2, 610, t('menu_more'), () => this.scene.restart({ compactPage: 'more' }), primaryOpts);
    bodyText(this, GAME_WIDTH / 2, GAME_HEIGHT - 26, t('touch_zoom_hint'), {
      fontSize: fontFor('small'), color: '#7a6a58', align: 'center', wordWrap: { width: 1040 },
    }).setOrigin(0.5);
    installSceneKeys(this);
  }

  private toggleLang(): void {
    const next: Locale = getLocale() === 'en' ? 'de' : 'en';
    setLocale(next);
    const s = getState();
    s.locale = next;
    setState(s);
    this.scene.restart();
  }

  private async startNew(): Promise<void> {
    await audio.unlock();
    if (getState().audioMuted) audio.setMuted(true);
    else await audio.setContext('main_menu');

    if (hasSave()) {
      showConfirm(this, {
        title: t('overwrite_title'),
        body: t('overwrite_body'),
        yes: t('overwrite_yes'),
        no: t('overwrite_no'),
        onYes: () => transitionTo(this, 'NameEntry'),
      });
      return;
    }
    transitionTo(this, 'NameEntry');
  }

  private async continueGame(): Promise<void> {
    await audio.unlock();
    const s = loadGame();
    if (!s) {
      showToast(this, t('load_fail'), '#b33a3a');
      return;
    }
    setLocale(s.locale);
    audio.setMuted(!!s.audioMuted);
    // Volumes live in the save, so push them into the mixer on load.
    applySettings();
    if (!s.audioMuted) await audio.setContext('hub');
    if (s.ending && !s.freePlay) {
      transitionTo(this, 'Ending');
    } else {
      transitionTo(this, 'Hub');
    }
  }

  private doImport(): void {
    const json = promptImport();
    if (json === null) return;
    const res = importSave(json);
    if (!res.ok) {
      showToast(this, t('import_fail'), '#b33a3a');
      return;
    }
    showToast(this, t('import_ok'), '#5a9a6e');
    void this.continueGame();
  }
}
