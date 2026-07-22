import { createGame } from './game/Game';
import { audio } from './game/audio/AudioManager';
import { installMobileDomGuards } from './game/mobile';
import { syncAchievements } from './game/systems/achievements';
import { createNewGame, getState, setState } from './game/state';
import type { GameState, PatientInstance } from './game/types';
import { startRegimen } from './game/systems/regimen';
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

// Dev-only browser-test bridge. It never ships in the production bundle, but
// lets the game client inspect the same active controls that a player sees.
if (import.meta.env.DEV) {
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
    | 'regimen-follow-up';
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
      treated: state.totalTreated,
      ending: state.ending,
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
      case 'regimen-follow-up': {
        state.unlockedTechniques.push('hygiene_clean');
        const patient = fixedPatient('plague_like', 'complaint.plague');
        patient.dominantHumor = 'blackBile';
        startRegimen(state, patient, 'pest_regimen');
        break;
      }
    }
    setState(state);
    game.scene.start(scene, data);
  };
}
