import Phaser from 'phaser';
import { COLORS } from '../ui/theme';
import { buildIconTextures } from '../ui/icons';
import { GAME_HEIGHT, GAME_WIDTH } from '../types';

/**
 * Assets needed before the player can do anything: the menu, the first
 * bathhouse, the map, panel textures and the commonest portraits.
 *
 * The other ~20 files stream in afterwards. Loading all 35 up front meant
 * staring at a progress bar while ~13MB arrived, most of it for screens the
 * player would not reach for many minutes.
 */
const ART_CORE: [string, string][] = [
  ['art_menu', 'assets/menu_bg.webp'],
  ['art_bath', 'assets/bath_bg.webp'],
  ['art_map', 'assets/map_bg.webp'],
  ['art_home', 'assets/home_bg.webp'],
  ['art_tools', 'assets/art_tools.webp'],
  ['ui_wood', 'assets/ui_wood.webp'],
  ['ui_wood_panel', 'assets/ui_wood_panel.webp'],
  ['ui_parchment', 'assets/ui_parchment.webp'],
  ['ui_icons', 'assets/ui_icons.png'],
  ['logo_title', 'assets/logo_title.png'],
  ['ui_frame_portrait', 'assets/ui_frame_portrait.png'],
  ['icon_coin', 'assets/icon_coin.png'],
  ['icon_reputation', 'assets/icon_reputation.png'],
  ['icon_ethics', 'assets/icon_ethics.png'],
  ['icon_linen', 'assets/icon_linen.png'],
  ['icon_herbs', 'assets/icon_herbs.png'],
  ['icon_leeches', 'assets/icon_leeches.png'],
  ['icon_soap', 'assets/icon_soap.png'],
  ['icon_salve', 'assets/icon_salve.png'],
  ['icon_wood', 'assets/icon_wood.png'],
  ['icon_ironTools', 'assets/icon_ironTools.png'],
  ['bg_road', 'assets/bg_road.webp'],
  ['bg_market', 'assets/bg_market.webp'],
  ['port_berthold', 'assets/port_berthold.webp'],
  ['port_peasant', 'assets/port_peasant.webp'],
  // Origin portraits — needed on the first New Game screen (character creation)
  ['port_origin_bader_son', 'assets/port_origin_bader_son.webp'],
  ['port_origin_field_surgeon', 'assets/port_origin_field_surgeon.webp'],
  ['port_origin_monastery_scholar', 'assets/port_origin_monastery_scholar.webp'],
  ['port_origin_journeyman', 'assets/port_origin_journeyman.webp'],
  ['port_origin_bath_widow', 'assets/port_origin_bath_widow.webp'],
  ['port_origin_executioner_kin', 'assets/port_origin_executioner_kin.webp'],
];

/**
 * Streamed in the background once the menu is up.
 *
 * Every consumer guards with `textures.exists()` (see `addDecorImage`,
 * `sceneBackground`, `addPortrait`), so a screen reached before its art has
 * arrived falls back cleanly rather than erroring.
 */
const ART_DEFERRED: [string, string][] = [
  ['art_portrait', 'assets/portrait_player.webp'],
  ['bg_nurnberg', 'assets/bg_nurnberg.webp'],
  ['bg_monastery', 'assets/bg_monastery.webp'],
  ['bg_warcamp', 'assets/bg_warcamp.webp'],
  ['bg_guild', 'assets/bg_guild.webp'],
  ['art_humors', 'assets/art_humors.webp'],
  ['port_adelheid', 'assets/port_adelheid.webp'],
  ['port_krafft', 'assets/port_krafft.webp'],
  ['port_noble', 'assets/port_noble.webp'],
  ['port_soldier', 'assets/port_soldier.webp'],
  ['port_merchant', 'assets/port_merchant.webp'],
  ['port_dental', 'assets/port_dental.webp'],
  ['port_woman', 'assets/port_woman.webp'],
  ['port_sick', 'assets/port_sick.webp'],
  ['port_artisan', 'assets/port_artisan.webp'],
  ['port_clergy', 'assets/port_clergy.webp'],
  ['port_youth', 'assets/port_youth.webp'],
  // Round-2 portrait variants
  ['port_peasant2', 'assets/port_peasant2.webp'],
  ['port_peasant3', 'assets/port_peasant3.webp'],
  ['port_peasant4', 'assets/port_peasant4.webp'],
  ['port_artisan2', 'assets/port_artisan2.webp'],
  ['port_artisan3', 'assets/port_artisan3.webp'],
  ['port_merchant2', 'assets/port_merchant2.webp'],
  ['port_soldier2', 'assets/port_soldier2.webp'],
  ['port_soldier3', 'assets/port_soldier3.webp'],
  ['port_clergy2', 'assets/port_clergy2.webp'],
  ['port_noble2', 'assets/port_noble2.webp'],
  ['port_beggar1', 'assets/port_beggar1.webp'],
  ['port_beggar2', 'assets/port_beggar2.webp'],
  // Round-2 city BGs
  ['bg_bamberg', 'assets/bg_bamberg.webp'],
  ['bg_wurzburg', 'assets/bg_wurzburg.webp'],
  ['bg_augsburg', 'assets/bg_augsburg.webp'],
  ['bg_rothenburg', 'assets/bg_rothenburg.webp'],
  // Round-2 management BGs
  ['bg_journal', 'assets/bg_journal.webp'],
  ['bg_staff', 'assets/bg_staff.webp'],
  ['bg_family', 'assets/bg_family.webp'],
  ['bg_politics', 'assets/bg_politics.webp'],
  ['bg_mentors', 'assets/bg_mentors.webp'],
  ['bg_settings', 'assets/bg_settings.webp'],
  ['bg_study', 'assets/bg_study.webp'],
  ['bg_upgrades', 'assets/bg_upgrades.webp'],
  ['bg_noble_house', 'assets/bg_noble_house.webp'],
  ['bg_plague', 'assets/bg_plague.webp'],
  ['bg_festival', 'assets/bg_festival.webp'],
  ['art_seal', 'assets/art_seal.webp'],
  ['bg_wedding', 'assets/bg_wedding.webp'],
  ['bg_church', 'assets/bg_church.webp'],
  ['bg_rival', 'assets/bg_rival.webp'],
  ['art_pulse', 'assets/art_pulse.webp'],
  ['art_dental', 'assets/art_dental.webp'],
  // Round 6 — NPC faces and the council chamber (see ART_TODO_6.md). The
  // files may not exist yet; the loader tolerates 404s and every consumer
  // guards with `textures.exists`, falling back to same-sex stand-ins.
  ['port_gregor', 'assets/port_gregor.webp'],
  ['port_ortlieb', 'assets/port_ortlieb.webp'],
  ['port_guard', 'assets/port_guard.webp'],
  ['bg_council', 'assets/bg_council.webp'],
  ['bg_lazar', 'assets/bg_lazar.webp'],
];

/** Generate canvas textures so the game is playable without external art. */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    this.cameras.main.setBackgroundColor(COLORS.bg);

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.add
      .text(cx, cy - 62, 'Lancet & Linen', {
        fontFamily: 'Palatino Linotype, Book Antiqua, Palatino, Georgia, serif',
        fontSize: '40px',
        color: '#e8c547',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add
      .text(cx, cy - 22, 'Holy Roman Empire · c. 1382', {
        fontFamily: 'Palatino Linotype, Book Antiqua, Palatino, Georgia, serif',
        fontSize: '15px',
        color: '#8a7a68',
      })
      .setOrigin(0.5);

    // Framed track, so the bar reads as part of the game's furniture.
    const trackW = 420;
    const frame = this.add.graphics();
    frame.fillStyle(COLORS.ink, 0.85);
    frame.fillRoundedRect(cx - trackW / 2, cy + 16, trackW, 22, 5);
    frame.lineStyle(2, COLORS.gold, 0.75);
    frame.strokeRoundedRect(cx - trackW / 2, cy + 16, trackW, 22, 5);

    const bar = this.add
      .rectangle(cx - trackW / 2 + 4, cy + 27, 4, 14, COLORS.gold)
      .setOrigin(0, 0.5);

    const pct = this.add
      .text(cx, cy + 58, '', {
        fontFamily: 'Palatino Linotype, Book Antiqua, Palatino, Georgia, serif',
        fontSize: '13px',
        color: '#c4a574',
      })
      .setOrigin(0.5);

    this.load.on('progress', (p: number) => {
      bar.width = Math.max(4, (trackW - 8) * p);
      pct.setText(`${Math.round(p * 100)}%`);
    });

    for (const [key, path] of ART_CORE) {
      this.load.image(key, path);
    }
  }

  create(): void {
    this.generateTextures();

    // Hand control over as soon as the core art is in. `launch` (not `start`)
    // keeps this scene alive so its loader can keep streaming the rest.
    this.scene.launch('MainMenu');
    this.streamDeferred();
  }

  /** Fetch the remaining art in the background, then retire this scene. */
  private streamDeferred(): void {
    this.children.removeAll();
    this.cameras.main.setAlpha(0);

    const missing = ART_DEFERRED.filter(([key]) => !this.textures.exists(key));
    if (!missing.length) {
      this.scene.stop();
      return;
    }

    for (const [key, path] of missing) {
      this.load.image(key, path);
    }
    this.load.once(Phaser.Loader.Events.COMPLETE, () => this.scene.stop());
    this.load.start();
  }

  private generateTextures(): void {
    buildIconTextures(this);
    this.makeCircleTex('portrait_player', 96, 0x8b5a3c, 0xc9a227);
    this.makeCircleTex('portrait_patient', 96, 0x6b4a3a, 0xa88);
    this.makeCircleTex('portrait_npc', 96, 0x4a3a5c, 0xc9a227);
    // Only for keys with no other source. The nine painted `icon_*` PNGs load
    // from disk, and `buildIconTextures` above supplies drawn `ico_*` vectors
    // as their fallback — filling `icon_*` with flat discs here would shadow
    // those vectors whenever a PNG failed to load, which is strictly worse.
    this.makeIcon('icon_heart', 32, 0xb33a3a, '♥');
    this.makeIcon('icon_cart', 48, 0x8b6914, '▮');

    if (!this.textures.exists('bath_bg')) {
      const bath = this.textures.createCanvas('bath_bg', 1280, 720);
      if (bath) {
        const ctx = bath.getContext();
        const grd = ctx.createLinearGradient(0, 0, 0, 720);
        grd.addColorStop(0, '#3d2818');
        grd.addColorStop(0.5, '#5a3a22');
        grd.addColorStop(1, '#2a1a10');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, 1280, 720);
        ctx.fillStyle = '#2a1810';
        for (let i = 0; i < 8; i++) ctx.fillRect(i * 170, 0, 18, 720);
        ctx.fillStyle = '#8b5a2b';
        ctx.beginPath();
        ctx.ellipse(640, 480, 220, 80, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e8d5a8';
        ctx.fillRect(175, 140, 28, 90);
        bath.refresh();
      }
    }

    if (!this.textures.exists('map_bg')) {
      const map = this.textures.createCanvas('map_bg', 1280, 720);
      if (map) {
        const ctx = map.getContext();
        ctx.fillStyle = '#c4a574';
        ctx.fillRect(0, 0, 1280, 720);
        map.refresh();
      }
    }
  }

  private makeCircleTex(key: string, size: number, fill: number, ring: number): void {
    if (this.textures.exists(key)) return;
    const t = this.textures.createCanvas(key, size, size);
    if (!t) return;
    const ctx = t.getContext();
    const r = size / 2;
    ctx.fillStyle = `#${fill.toString(16).padStart(6, '0')}`;
    ctx.beginPath();
    ctx.arc(r, r, r - 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `#${ring.toString(16).padStart(6, '0')}`;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#1a120c';
    ctx.beginPath();
    ctx.arc(r - 10, r - 6, 4, 0, Math.PI * 2);
    ctx.arc(r + 10, r - 6, 4, 0, Math.PI * 2);
    ctx.fill();
    t.refresh();
  }

  private makeIcon(key: string, size: number, color: number, _glyph: string): void {
    if (this.textures.exists(key)) return;
    const t = this.textures.createCanvas(key, size, size);
    if (!t) return;
    const ctx = t.getContext();
    ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    t.refresh();
  }
}
