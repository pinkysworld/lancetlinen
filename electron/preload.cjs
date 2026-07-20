/**
 * Preload bridge.
 *
 * Exposes a synchronous key-value store on `window.__lancetStorage`, matching
 * the `KeyValueStore` interface in `src/game/systems/storage.ts`. The game's
 * save/load paths are synchronous, so this uses `ipcRenderer.sendSync` rather
 * than the async `invoke` API.
 *
 * `contextIsolation` stays on and Node stays out of the renderer — only these
 * four functions cross the boundary.
 */
const { contextBridge, ipcRenderer } = require('electron');

/** Mirror of the store, so reads never block on IPC. */
let cache = null;

function ensureCache() {
  if (cache === null) {
    cache = ipcRenderer.sendSync('store:all') ?? {};
  }
  return cache;
}

contextBridge.exposeInMainWorld('__lancetStorage', {
  getItem(key) {
    const store = ensureCache();
    return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
  },
  setItem(key, value) {
    ensureCache()[key] = String(value);
    // Fire-and-forget: the cache is authoritative for reads, and the main
    // process serialises writes.
    void ipcRenderer.invoke('store:set', key, String(value));
  },
  removeItem(key) {
    delete ensureCache()[key];
    void ipcRenderer.invoke('store:remove', key);
  },
});

contextBridge.exposeInMainWorld('__lancetDesktop', {
  /** Where saves live — surfaced on the credits screen. */
  savePath: () => ipcRenderer.invoke('store:path'),
});

/**
 * Steam surface. Present even when Steam is not: `available()` resolves false
 * and the rest become no-ops, so the game never branches on the storefront.
 */
contextBridge.exposeInMainWorld('__lancetSteam', {
  available: () => ipcRenderer.invoke('steam:available'),
  unlock: (apiName) => ipcRenderer.invoke('steam:unlock', String(apiName)),
  isUnlocked: (apiName) => ipcRenderer.invoke('steam:unlocked', String(apiName)),
  playerName: () => ipcRenderer.invoke('steam:player'),
});
