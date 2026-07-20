import { createGame } from './game/Game';
import { audio } from './game/audio/AudioManager';
import { installMobileDomGuards } from './game/mobile';
import { syncAchievements } from './game/systems/achievements';

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

// Dev-only handle for debugging from the console (stripped from prod builds).
if (import.meta.env.DEV) {
  (window as unknown as { __game: unknown }).__game = game;
}
