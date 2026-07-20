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

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenu');
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

    const g = this.add.graphics();
    g.fillStyle(COLORS.panel, 0.25);
    g.fillRect(0, 0, 24, GAME_HEIGHT);
    g.fillRect(GAME_WIDTH - 24, 0, 24, GAME_HEIGHT);
    g.fillStyle(COLORS.gold, 0.12);
    g.fillRect(20, 0, 3, GAME_HEIGHT);
    g.fillRect(GAME_WIDTH - 23, 0, 3, GAME_HEIGHT);

    // The logo is a wide painted wordmark. At 520x260 centred on y=108 its top
    // edge sat above the viewport and the initial "L" was clipped away.
    if (this.textures.exists('logo_title')) {
      this.add
        .image(GAME_WIDTH / 2, 132, 'logo_title')
        .setDisplaySize(440, 220)
        .setAlpha(0.98)
        .disableInteractive();
    } else {
      titleText(this, GAME_WIDTH / 2, 110, t('title'), '52px');
    }

    // One subtitle only. `subtitle` and the hard-coded "Holy Roman Empire ·
    // c. 1382" said the same thing twice, directly above one another.
    bodyText(this, GAME_WIDTH / 2, 258, t('subtitle'), {
      fontSize: '17px',
      color: '#c9b48a',
      wordWrap: { width: 900 },
      align: 'center',
    }).setOrigin(0.5);

    const meta = getSaveMeta();

    /* ── Primary actions ──────────────────────────────────────────────
     * Nine equally-weighted buttons read as a wall. The three that start
     * a session are full width; everything else drops to a secondary grid.
     */
    const PRIMARY_W = 340;
    let y = 312;
    makeButton(this, GAME_WIDTH / 2, y, t('menu_new'), () => void this.startNew(), {
      width: PRIMARY_W,
      height: 46,
    });
    y += 54;
    // The save detail is far too long for a button label — it used to stretch
    // this one to 520px while its neighbours sat at 220. It now reads as a
    // caption underneath instead.
    makeButton(this, GAME_WIDTH / 2, y, t('menu_continue'), () => void this.continueGame(), {
      disabled: !hasSave(),
      width: PRIMARY_W,
      height: 46,
    });
    y += 54;
    // Continue reads the autosave; this reaches the three manual slots.
    makeButton(this, GAME_WIDTH / 2, y, t('menu_load_slot'), () =>
      transitionTo(this, 'SaveSlots', { mode: 'load', from: 'MainMenu' }), {
      width: PRIMARY_W,
      height: 46,
    });

    y += 40;
    bodyText(
      this,
      GAME_WIDTH / 2,
      y,
      meta ? formatSaveMetaLine(meta, locName(meta.locationId)) : t('no_save'),
      { fontSize: '13px', color: meta ? '#a8c0c4' : '#8a7a68', align: 'center' },
    ).setOrigin(0.5);

    /* ── Secondary actions ────────────────────────────────────────────
     * A 3x2 grid, so six options cost two rows instead of six.
     */
    const SEC_W = 208;
    const COL = [GAME_WIDTH / 2 - SEC_W - 12, GAME_WIDTH / 2, GAME_WIDTH / 2 + SEC_W + 12];
    const secOpts = { width: SEC_W, height: 40, fontSize: '15px' };

    let row = y + 44;
    makeButton(this, COL[0]!, row, t('help_btn'), () => transitionTo(this, 'Help'), {
      ...secOpts,
      fill: 0x3d5a4a,
    });
    makeButton(this, COL[1]!, row, t('menu_codex'), () => transitionTo(this, 'Codex'), secOpts);
    makeButton(
      this,
      COL[2]!,
      row,
      t('menu_language_toggle', { lang: getLocale() === 'de' ? 'Deutsch' : 'English' }),
      () => this.toggleLang(),
      secOpts,
    );

    row += 48;
    makeButton(
      this,
      COL[0]!,
      row,
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
      secOpts,
    );
    makeButton(this, COL[1]!, row, t('menu_import'), () => this.doImport(), secOpts);
    makeButton(this, COL[2]!, row, t('credits_title'), () => transitionTo(this, 'Credits'), secOpts);

    // Footer. Both lines previously sat at fixed offsets from the bottom and
    // collided with the last two buttons of the old nine-high stack.
    bodyText(this, GAME_WIDTH / 2, GAME_HEIGHT - 46, t('menu_howto_blurb'), {
      fontSize: '13px',
      color: '#9a8878',
      wordWrap: { width: 860 },
      align: 'center',
    }).setOrigin(0.5);
    bodyText(this, GAME_WIDTH / 2, GAME_HEIGHT - 20, t('menu_quit_hint'), {
      fontSize: '12px',
      color: '#7a6a58',
    }).setOrigin(0.5);

    // No Esc target on the root menu; number keys and arrows still apply.
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

export class NameEntryScene extends Phaser.Scene {
  private name = 'Elias';

  constructor() {
    super('NameEntry');
  }

  create(): void {
    void audio.setContext('name_entry');
    drawBackground(this, 'menu');
    titleText(this, GAME_WIDTH / 2, 160, t('enter_name'), '32px');

    const display = bodyText(this, GAME_WIDTH / 2, 240, this.name, {
      fontSize: '36px',
      color: '#e8c547',
    }).setOrigin(0.5);

    const names = ['Elias', 'Greta', 'Hans', 'Clara', 'Otto', 'Agnes', 'Bader'];
    names.forEach((n, i) => {
      makeButton(
        this,
        200 + (i % 4) * 220,
        340 + Math.floor(i / 4) * 60,
        n,
        () => {
          this.name = n;
          display.setText(n);
        },
        { width: 180, height: 40, fontSize: '16px' },
      );
    });

    makeButton(this, GAME_WIDTH / 2, 520, t('start'), () => {
      const locale = getLocale();
      setState(createNewGame(this.name, locale));
      // First save of new game so Continue works even mid-intro
      // (optional) — user asked for manual save; auto after name is friendly
      void audio.setContext('dialogue');
      transitionTo(this, 'Dialogue', { dialogueId: 'intro_1' });
    });
    makeButton(this, GAME_WIDTH / 2, 580, t('back'), () => transitionTo(this, 'MainMenu'), {
      width: 160,
      height: 36,
      fontSize: '16px',
    });
    installSceneKeys(this, { onBack: () => transitionTo(this, 'MainMenu') });
  }
}
