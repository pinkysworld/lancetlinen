/**
 * Persistence backend.
 *
 * `state.ts` used to call `localStorage` directly, which is wrong for a
 * packaged desktop build: Electron's renderer localStorage lives inside the
 * Chromium profile, so saves are invisible to the user, awkward to back up,
 * and cannot be synced by Steam Cloud.
 *
 * This indirection lets the desktop shell inject a file-backed store via
 * `window.__lancetStorage` (see `electron/preload.cjs`) while the web build
 * keeps using localStorage unchanged.
 *
 * The interface is deliberately synchronous to match the existing save/load
 * call sites; the Electron bridge writes through `fs` synchronously, which is
 * fine for a handful of KB.
 */

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

declare global {
  interface Window {
    /** Injected by the Electron preload script when running packaged. */
    __lancetStorage?: KeyValueStore;
  }
}

/** In-memory fallback so the game still runs where storage is unavailable. */
function memoryStore(): KeyValueStore {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

let cached: KeyValueStore | null = null;

/**
 * The active store.
 *
 * Order: an Electron-injected store, then localStorage, then memory. The
 * localStorage probe is a real write because Safari private mode exposes the
 * API but throws on use.
 */
export function storage(): KeyValueStore {
  if (cached) return cached;

  if (typeof window !== 'undefined' && window.__lancetStorage) {
    cached = window.__lancetStorage;
    return cached;
  }

  try {
    const probe = '__lancet_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    cached = localStorage;
  } catch {
    cached = memoryStore();
  }
  return cached;
}

/** True when saves are going somewhere the player can actually find. */
export function isPersistent(): boolean {
  const s = storage();
  return s !== undefined && typeof window !== 'undefined'
    ? !!window.__lancetStorage || s === (globalThis as { localStorage?: unknown }).localStorage
    : false;
}

/** Only for tests — forces re-detection. */
export function resetStorageForTests(store?: KeyValueStore): void {
  cached = store ?? null;
}
