import { createGame } from './game/Game';
import { audio } from './game/audio/AudioManager';
import { installMobileDomGuards } from './game/mobile';
import { syncAchievements } from './game/systems/achievements';
import { createNewGame, getState, setState } from './game/state';
import type { GameState, PatientInstance } from './game/types';
import { startRegimen } from './game/systems/regimen';
import { startCorrespondence } from './game/systems/correspondence';
import { sceneButtons } from './game/ui/theme';

const parent = document.getElementById('game-container');
if (!parent) {
  throw new Error('Missing #game-container');
}

installMobileDomGuards(parent);

// Unlock Web Audio on first gesture (required on iOS Safari)
const unlockOnce = () => {
  void audio.unlock();
  window.removeEventListener('pointerdown', unlockOnce);
  window.removeEventListener('touchstart', unlockOnce);
};
window.addEventListener('pointerdown', unlockOnce, { once: true });
window.addEventListener('touchstart', unlockOnce, { once: true, passive: true });

// Seed the local achievement record from Steam so a returning player is not
// re-notified about what they already earned. No-ops without the desktop build.
void syncAchievements();

const game = createGame(parent);

// Dev-only browser-test bridge. Some desktop launchers set NODE_ENV=production
// even while Vite itself serves `--mode development`; include that real dev
// mode as well. Production builds replace both branches with false, so this
// control surface never ships to players.
const ENABLE_DEV_TEST_BRIDGE = import.meta.env.DEV || import.meta.env.MODE === 'development';
if (ENABLE_DEV_TEST_BRIDGE) {
  const testWindow = window as unknown as {
    __game: typeof game;
    render_game_to_text: () => string;
    advanceTime: (ms: number) => Promise<void>;
    loadTestPreset: (preset: TestPreset) => void;
  };
  type TestPreset =
    | 'hub-broke'
    | 'treatment-max-findings'
    | 'debt-empty'
    | 'debt-payable'
    | 'act3-household'
    | 'staff-training'
    | 'regimen-follow-up'
    | 'correspondence-active'
    | 'city-agreement';
  const fixedPatient = (templateId: string, complaintKey: string): PatientInstance => ({
    uid: `test-${templateId}`,
    templateId,
    name: 'Testperson',
    class: 'peasant',
    complaintKey,
    dominantHumor: 'phlegm',
    severity: 3,
    bestTechniques: ['bloodletting', 'herbal_draught', 'bath_wash'],
    basePay: 20,
    diagnosed: true,
    pulseRead: true,
    urineRead: true,
    palpated: true,
    tongueRead: true,
  });
  /**
   * Browser presets must replace the visible scene, not layer a test scene on
   * top of the asynchronous Preload/MainMenu hand-off. `game.scene.start()`
   * from the game manager does not know which scene should be retired.
   */
  const startTestScene = (scene: string, data?: Record<string, unknown>) => {
    for (const active of game.scene.getScenes(true)) {
      if (active.scene.key !== 'Preload' && active.scene.key !== scene) {
        game.scene.stop(active.scene.key);
      }
    }
    game.scene.start(scene, data);
  };
  const presetState = (): GameState => {
    const state = createNewGame('Browser Test');
    state.storyFlags['intro_done'] = true;
    state.locationId = 'nurnberg';
    state.bathhouse.owned = true;
    state.bathhouse.level = 1;
    return state;
  };
  testWindow.__game = game;
  testWindow.render_game_to_text = () => {
    const state = getState();
    const active = game.scene.getScenes(true);
    const scene = active[active.length - 1];
    return JSON.stringify({
      coordinates: 'world origin top-left; x right, y down',
      scene: scene?.scene.key ?? null,
      day: state.day,
      location: state.locationId,
      coin: state.coin,
      debt: state.debt,
      act: state.act,
      carePlans: state.carePlans?.map((plan) => ({ regimen: plan.regimenId, dueDay: plan.dueDay })) ?? [],
      act3Consequences: state.act3Consequences ?? [],
      correspondence: state.correspondence ?? null,
      houseRelations: state.houseRelations ?? {},
      cityConsequences: state.cityConsequences ?? [],
      treated: state.totalTreated,
      ending: state.ending,
      staff: state.staff.map((member) => ({
        name: member.name,
        role: member.role,
        skill: member.skill,
        loyalty: member.loyalty,
        trainingDueDay: member.trainingDueDay ?? null,
        lastGiftDay: member.lastGiftDay ?? 0,
      })),
      controls: scene ? sceneButtons(scene).map((button) => ({
        label: button.label, x: button.x, y: button.y, width: button.w, height: button.h, disabled: button.disabled,
      })) : [],
    });
  };
  testWindow.advanceTime = async (ms: number) => {
    const frame = 1000 / 60;
    const steps = Math.max(1, Math.round(ms / frame));
    const step = (game as unknown as { step: (time: number, delta: number) => void }).step;
    for (let i = 0; i < steps; i += 1) step.call(game, performance.now(), frame);
  };
  // Presets only replace in-memory state. They never call saveGame and are
  // deliberately unavailable from production builds.
  testWindow.loadTestPreset = (preset) => {
    const state = presetState();
    let scene = 'Hub';
    let data: Record<string, unknown> | undefined;
    switch (preset) {
      case 'hub-broke':
        state.coin = 0;
        break;
      case 'treatment-max-findings':
        state.stats = { hand: 8, eye: 8, tongue: 8, back: 8, soul: 8 };
        state.unlockedTechniques = ['bloodletting', 'herbal_draught', 'bath_wash', 'hygiene_clean'];
        scene = 'Treatment';
        data = { patient: fixedPatient('winter_cough', 'complaint.cough') };
        break;
      case 'debt-empty':
        state.debt = 57;
        state.coin = 0;
        scene = 'Politics';
        break;
      case 'debt-payable':
        state.debt = 57;
        state.coin = 80;
        scene = 'Politics';
        break;
      case 'act3-household':
        state.act = 3;
        state.storyFlags['epidemic_done'] = true;
        state.spouse = { name: 'suitor_anna', affection: 76, cityId: 'nurnberg', marriedDay: 4, householdFocus: 'kin' };
        state.staff = [{ id: 'test-staff', name: 'Elsa Weber', role: 'bathmaid', propertyId: null, loyalty: 70, skill: 4, wage: 7, daysEmployed: 8, trait: 'sociable' }];
        scene = 'Family';
        break;
      case 'staff-training':
        state.coin = 140;
        state.staff = [{
          id: 'training-staff',
          name: 'Elsa Weber',
          role: 'apprentice',
          propertyId: null,
          loyalty: 70,
          skill: 4,
          wage: 5,
          daysEmployed: 6,
          trait: 'careful',
        }];
        scene = 'Staff';
        break;
      case 'regimen-follow-up': {
        state.unlockedTechniques.push('hygiene_clean');
        const patient = fixedPatient('plague_like', 'complaint.plague');
        patient.dominantHumor = 'blackBile';
        startRegimen(state, patient, 'pest_regimen');
        break;
      }
      case 'correspondence-active':
        state.day = 20;
        state.act = 3;
        state.coin = 99;
        state.stats.tongue = 6;
        state.storyFlags['correspondence_florence_complete'] = true;
        startCorrespondence(state, 'tabriz_letter');
        scene = 'Correspondence';
        break;
      case 'city-agreement':
        state.day = 14;
        state.act = 2;
        state.locationId = 'augsburg';
        state.coin = 99;
        state.reputation.augsburg = 30;
        state.storyFlags['correspondence_augsburg_complete'] = true;
        scene = 'Civic';
        break;
    }
    setState(state);
    startTestScene(scene, data);
  };

  // A local-only URL entrance makes the same deterministic presets usable in
  // Safari/WebKit simulators, where page-evaluation bridges are intentionally
  // not exposed by the browser UI. The whole block is stripped from production.
  const presetFromUrl = new URLSearchParams(window.location.search).get('testPreset');
  const allowedPresets: TestPreset[] = [
    'hub-broke', 'treatment-max-findings', 'debt-empty', 'debt-payable',
    'act3-household', 'staff-training', 'regimen-follow-up', 'correspondence-active', 'city-agreement',
  ];
  if (presetFromUrl && allowedPresets.includes(presetFromUrl as TestPreset)) {
    const loadAfterMenu = () => {
      // Core assets are ready only after Preload launches the menu. Waiting
      // here avoids a race where the menu is launched over the test scene.
      if (!game.scene.isActive('MainMenu')) {
        window.setTimeout(loadAfterMenu, 40);
        return;
      }
      testWindow.loadTestPreset(presetFromUrl as TestPreset);
    };
    loadAfterMenu();
  }
}
