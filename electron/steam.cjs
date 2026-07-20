/**
 * Steamworks bridge.
 *
 * Uses `steamworks.js` rather than `greenworks`: greenworks was last published
 * in 2022 and does not build against current Electron, steamworks.js is
 * maintained and ships prebuilt binaries.
 *
 * The module is an **optional** dependency and is loaded defensively, because
 * the game must run in three situations where Steam is absent:
 *   - the browser build, which never loads this file at all
 *   - a local Electron dev run with no Steam client
 *   - a DRM-free build (itch.io and similar)
 *
 * In all of those `init()` returns false and every call below is a no-op, so
 * nothing in the game needs to branch on whether Steam is present.
 *
 * NOTE: `STEAM_APP_ID` is a placeholder until the app is registered in
 * Steamworks. 480 is Valve's public "Spacewar" test appid — it lets the overlay
 * and API come up during development but must be replaced before shipping, and
 * achievements set against it are meaningless.
 */
const STEAM_APP_ID = Number(process.env.STEAM_APP_ID ?? 480);

let client = null;
let ready = false;

/**
 * Bring up the Steam API.
 *
 * Returns false rather than throwing, so an absent module, an absent Steam
 * client, or a bad appid all degrade to "no Steam features" instead of
 * preventing the game from starting.
 */
function init() {
  if (ready) return true;
  try {
    // Required lazily: a top-level require would crash the whole main process
    // in builds where the optional dependency was not installed.
    const steamworks = require('steamworks.js');
    client = steamworks.init(STEAM_APP_ID);
    ready = !!client;
    return ready;
  } catch (err) {
    console.warn('[steam] unavailable:', err?.message ?? err);
    client = null;
    ready = false;
    return false;
  }
}

function isAvailable() {
  return ready;
}

/**
 * Unlock an achievement.
 *
 * Steam itself ignores a repeat unlock, so callers may fire this every time the
 * condition holds rather than tracking "already granted" state.
 */
function unlock(apiName) {
  if (!ready) return false;
  try {
    client.achievement.activate(apiName);
    return true;
  } catch (err) {
    console.warn('[steam] achievement failed:', apiName, err?.message ?? err);
    return false;
  }
}

function isUnlocked(apiName) {
  if (!ready) return false;
  try {
    return client.achievement.isActivated(apiName);
  } catch {
    return false;
  }
}

/** The signed-in player's Steam display name, for the credits screen. */
function playerName() {
  if (!ready) return null;
  try {
    return client.localplayer.getName();
  } catch {
    return null;
  }
}

/**
 * Register IPC handlers so the renderer can reach the above through the
 * preload bridge.
 */
function registerIpc(ipcMain) {
  ipcMain.handle('steam:available', () => isAvailable());
  ipcMain.handle('steam:unlock', (_e, apiName) => unlock(String(apiName)));
  ipcMain.handle('steam:unlocked', (_e, apiName) => isUnlocked(String(apiName)));
  ipcMain.handle('steam:player', () => playerName());
}

module.exports = { init, isAvailable, unlock, isUnlocked, playerName, registerIpc, STEAM_APP_ID };
