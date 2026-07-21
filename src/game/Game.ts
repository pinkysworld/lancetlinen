import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, RENDER_HEIGHT, RENDER_SCALE, RENDER_WIDTH } from './types';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { CharacterScene } from './scenes/CharacterScene';
import { LexiconScene } from './scenes/LexiconScene';
import { RecipeScene } from './scenes/RecipeScene';
import { HubScene, BathhouseScene } from './scenes/HubScene';
import { TreatmentScene } from './scenes/TreatmentScene';
import { TravelMapScene, TravelResultScene } from './scenes/TravelScene';
import { DialogueScene } from './scenes/DialogueScene';
import { MarketScene, StudyScene, UpgradesScene } from './scenes/MarketStudyScenes';
import { EndingScene, CodexScene } from './scenes/EndingCodexScenes';
import { PropertyScene, MentorsScene } from './scenes/PropertyScene';
import {
  JournalScene,
  StaffScene,
  FamilyScene,
  PoliticsScene,
  SettingsScene,
  CityEventScene,
} from './scenes/FeatureScenes';
import { HelpScene } from './scenes/HelpScene';
import { DaySummaryScene } from './scenes/DaySummaryScene';
import { KeybindsScene } from './scenes/KeybindsScene';
import { SaveSlotScene } from './scenes/SaveSlotScene';
import { CreditsScene } from './scenes/CreditsScene';
import { ScenarioScene } from './scenes/ScenarioScene';
import { LepraschauScene } from './scenes/LepraschauScene';
import { isTouchDevice } from './mobile';
import { targetAspect } from './ui/viewport';
import { fadeInScene } from './ui/fx';
import { installPinchZoom, requestFullscreenOnFirstTouch } from './ui/pinch';

export function createGame(parent: string | HTMLElement): Phaser.Game {
  const touch = isTouchDevice();

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    /*
     * Buffer height is fixed at 1080; the width takes the *device's* shape.
     *
     * With a hard 1920x1080 buffer, Scale.FIT letterboxed everything that was
     * not 16:9 — an iPad in Safari is nearer 2.8:1 once the tab strip and
     * toolbar are off, and the game sat in a box in the middle of a dark
     * field. Widening the canvas instead means FIT has nothing to bar off.
     *
     * The 1280x720 design band stays centred (see `applyRenderScale`), so no
     * existing layout moves and nothing is cropped — the extra width is filled
     * by the backgrounds, which cover `viewRect()` rather than the design rect.
     */
    width: Math.round(RENDER_HEIGHT * targetAspect()),
    height: RENDER_HEIGHT,
    parent,
    backgroundColor: '#1a120c',
    // Prefer crisp UI on phones; disable if pixel artifacts appear
    roundPixels: true,
    antialias: true,
    // Multi-touch for skill checks / overlapping UI
    input: {
      activePointers: touch ? 3 : 1,
      // Smooth scroll-wheel not needed; keep defaults
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      // NB: `scale.zoom` does NOT work here — Scale.FIT computes its own factor
      // and leaves the drawing buffer at width×height. Buffer resolution is
      // raised via RENDER_* above and the per-scene camera zoom below instead.
      //
      // Expand to fill letterbox edges on notched devices when possible
      expandParent: true,
      // Re-fit on rotate / split-screen
      fullscreenTarget: typeof parent === 'string' ? parent : undefined,
    },
    // Pause when tab hidden (saves battery on mobile)
    disableContextMenu: true,
    scene: [
      BootScene,
      PreloadScene,
      MainMenuScene,
      CharacterScene,
      DialogueScene,
      HubScene,
      BathhouseScene,
      TreatmentScene,
      TravelMapScene,
      TravelResultScene,
      MarketScene,
      StudyScene,
      UpgradesScene,
      PropertyScene,
      MentorsScene,
      JournalScene,
      StaffScene,
      FamilyScene,
      PoliticsScene,
      SettingsScene,
      CityEventScene,
      HelpScene,
      DaySummaryScene,
      KeybindsScene,
      CreditsScene,
      SaveSlotScene,
      ScenarioScene,
      EndingScene,
      CodexScene,
      LexiconScene,
      RecipeScene,
      LepraschauScene,
    ],
  };

  const game = new Phaser.Game(config);

  /**
   * Map the 1280x720 design space onto the 1920x1080 buffer.
   *
   * Zooming the camera rather than rewriting coordinates keeps ~570 hard-coded
   * positions across the scene files working untouched, while the extra buffer
   * resolution is what actually makes the 1080p art render sharp.
   *
   * Must run on every scene, including ones started later, so it is attached
   * alongside the existing fade-in hook.
   */
  const applyRenderScale = (scene: Phaser.Scene) => {
    const cam = scene.cameras?.main;
    if (!cam) return;
    cam.setZoom(RENDER_SCALE);
    cam.centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
  };

  /**
   * Attach per-scene hooks once the game is READY.
   *
   * `game.scene.scenes` is still empty when the Phaser.Game constructor
   * returns — scenes are instantiated from the pending queue during boot. An
   * earlier version looped here directly and silently attached zero listeners,
   * which is why scene fade-ins never actually ran.
   */
  game.events.once(Phaser.Core.Events.READY, () => {
    for (const scene of game.scene.scenes) {
      // START fires before preload(), so anything drawn during loading is
      // already correctly scaled — applying only at CREATE left the Preload
      // progress bar rendering unzoomed in the corner.
      scene.events.on(Phaser.Scenes.Events.START, () => applyRenderScale(scene));
      scene.events.on(Phaser.Scenes.Events.CREATE, () => {
        // Re-apply: a scene that touched its own camera during create would
        // otherwise be left at the wrong zoom.
        applyRenderScale(scene);
        // Fade in after the camera is positioned, or the fade covers the wrong
        // region on the first frame.
        fadeInScene(scene);
        // Phones only. Must come after the render scale, since it treats the
        // current zoom as the floor.
        installPinchZoom(scene);
      });
    }
  });

  /*
   * Re-shape on rotate, not merely re-fit.
   *
   * The canvas takes the device's aspect at boot; turning the device or
   * opening a split view changes that aspect, and `scale.refresh()` alone
   * would keep the old canvas shape and start letterboxing again. Resizing
   * the game surface first is what keeps the screen filled.
   */
  let lastAspect = targetAspect();
  const refreshScale = () => {
    try {
      const aspect = targetAspect();
      // Only resize when the shape genuinely moved: `resize` rebuilds render
      // targets, and Safari fires this handler on every toolbar slide.
      if (Math.abs(aspect - lastAspect) > 0.01) {
        lastAspect = aspect;
        game.scale.resize(Math.round(RENDER_HEIGHT * aspect), RENDER_HEIGHT);
        // Every scene's camera must be re-centred on the design band, or the
        // world drifts to the left of the wider canvas.
        for (const scene of game.scene.scenes) applyRenderScale(scene);
      }
      game.scale.refresh();
    } catch {
      /* game may be destroying */
    }
  };
  window.addEventListener('orientationchange', () => {
    setTimeout(refreshScale, 200);
    setTimeout(refreshScale, 500);
  });
  window.addEventListener('resize', () => {
    setTimeout(refreshScale, 50);
  });
  window.visualViewport?.addEventListener('resize', () => {
    setTimeout(refreshScale, 50);
  });

  requestFullscreenOnFirstTouch(game);

  return game;
}
