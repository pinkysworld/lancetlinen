import type { GameState, Locale, Stats, Inventory } from './types';
import { DEFAULT_SETTINGS, SAVE_KEY, LEGACY_SAVE_KEY } from './types';
import { storage } from './systems/storage';
import { STARTER_TECHNIQUES } from './data/techniques';

/** Ensure old saves gain core dental arts (historical Bader starter skills) */
function ensureStarterTechniques(s: { unlockedTechniques: string[] }): void {
  for (const id of STARTER_TECHNIQUES) {
    if (!s.unlockedTechniques.includes(id)) s.unlockedTechniques.push(id);
  }
}
import { QUESTS } from './data/story';
import { ensureProperties } from './systems/property';
import { ensureStaff } from './systems/staff';
import { ensureFamily } from './systems/family';
import { ensurePolitics } from './systems/politics';
import { ensureJournal } from './systems/journal';
import { ensureReputation } from './systems/reputation';
import { getLocale, t } from './i18n';
import { ORIGINS, originById, applyOriginStats } from './data/origins';

export function defaultStats(): Stats {
  return { hand: 3, eye: 3, tongue: 2, back: 3, soul: 3 };
}

export function defaultInventory(): Inventory {
  return {
    linen: 8,
    herbs: 6,
    leeches: 4,
    soap: 6,
    wood: 10,
    salve: 3,
    ironTools: 2,
  };
}

export function createNewGame(
  playerName: string,
  locale: Locale = 'en',
  originId = ORIGINS[0]!.id,
): GameState {
  // Where the Bader came from sets the opening hand: stats, purse, standing and
  // a technique or two. Previously every run started identical.
  const origin = originById(originId);
  return {
    version: 2,
    playerName: playerName || 'Bader',
    originId: origin.id,
    locale,
    day: 1,
    weekday: 0,
    season: 0,
    year: 1382,
    locationId: 'road_camp',
    coin: Math.max(5, 35 + origin.coin),
    debt: 0,
    ethics: 50,
    guildRank: 'apprentice',
    guildFavor: 0,
    churchHeat: 0,
    councilFavor: 0,
    stats: applyOriginStats(defaultStats(), origin),
    techniqueXp: {},
    // Deduped: an origin may grant something already in the starter set.
    unlockedTechniques: [...new Set([...STARTER_TECHNIQUES, ...origin.techniques])],
    inventory: defaultInventory(),
    bathhouse: {
      owned: false,
      level: 0,
      boiler: false,
      privateBooth: false,
      apprenticeBunks: false,
      staffApprentice: 0,
      staffBathMaid: 0,
      open: false,
    },
    properties: [],
    cart: {
      horseHealth: 80,
      cartCondition: 70,
      capacity: 20,
    },
    reputation: {
      road_camp: 10,
      small_village: 5,
      nurnberg: 0,
      rothenburg: 0,
      bamberg: 0,
      wurzburg: 0,
      augsburg: 0,
      monastery_ebrach: 5,
      war_camp: 0,
    },
    storyFlags: {},
    quests: QUESTS.filter((q) => q.autoStart).map((q) => ({
      id: q.id,
      stage: 0,
      completed: false,
      failed: false,
    })),
    patientsToday: 0,
    dayEarnings: 0,
    dayReputation: 0,
    remoteEarningsToday: 0,
    act: 1,
    ending: null,
    tutorialStep: 0,
    deathsOnHands: 0,
    totalTreated: 0,
    rivalActive: false,
    epidemicActive: false,
    freePlay: false,
    audioMuted: false,
    staff: [],
    spouse: null,
    heir: null,
    office: 'none',
    title: 'citizen',
    journal: [],
    settings: { ...DEFAULT_SETTINGS },
    festivalActive: null,
    lastCityEventDay: 0,
    courtshipTarget: null,
    courtshipProgress: 0,
    titlesOwned: ['citizen'],
    prestige: 0,
    repFolk: 40,
    repElite: 15,
    repFame: 5,
    // The spine: a skilled origin generally starts disreputable.
    honour: Math.max(4, Math.min(60, 30 + origin.honour)),
  };
}

/** Migrate old saves to full feature state */
export function ensureFullState(s: GameState): void {
  ensureProperties(s);
  ensureStaff(s);
  ensureFamily(s);
  ensurePolitics(s);
  ensureJournal(s);
  ensureReputation(s);
  ensureStarterTechniques(s);
  // Merge rather than replace: older saves keep the settings they had and gain
  // defaults for anything added since.
  s.settings = { ...DEFAULT_SETTINGS, ...(s.settings ?? {}) };
  if (!s.settings.keyBinds) s.settings.keyBinds = {};
  if (s.prestige === undefined) s.prestige = 0;
  // Older saves predate the honour axis; start them at the trade's baseline.
  if (s.honour === undefined) s.honour = 30;
  if (s.lastCityEventDay === undefined) s.lastCityEventDay = 0;
  if (s.festivalActive === undefined) s.festivalActive = null;
  if (!s.titlesOwned) s.titlesOwned = ['citizen'];
}

let state: GameState = createNewGame('Bader');

export function getState(): GameState {
  return state;
}

export function setState(next: GameState): void {
  ensureFullState(next);
  state = next;
}

export function updateState(partial: Partial<GameState>): GameState {
  state = { ...state, ...partial };
  return state;
}

export function mutate(fn: (s: GameState) => void): GameState {
  const clone = structuredClone(state);
  fn(clone);
  ensureFullState(clone);
  state = clone;
  return state;
}

// ─── Save / Load ─────────────────────────────────────────────

export interface SaveMeta {
  savedAt: string; // ISO
  playerName: string;
  day: number;
  year: number;
  locationId: string;
  act: number;
  coin: number;
}

export interface SaveResult {
  ok: boolean;
  error?: 'quota' | 'private' | 'unknown' | 'empty' | 'invalid';
  meta?: SaveMeta;
}

export interface SaveBlob {
  meta: SaveMeta;
  state: GameState;
}

function buildMeta(s: GameState): SaveMeta {
  return {
    savedAt: new Date().toISOString(),
    playerName: s.playerName,
    day: s.day,
    year: s.year,
    locationId: s.locationId,
    act: s.act,
    coin: s.coin,
  };
}

function normalizeState(parsed: GameState): GameState {
  if (parsed.audioMuted === undefined) parsed.audioMuted = false;
  if (parsed.remoteEarningsToday === undefined) parsed.remoteEarningsToday = 0;
  if (!parsed.properties) parsed.properties = [];
  ensureFullState(parsed);
  return parsed;
}

/**
 * Save slots.
 *
 * Slot 0 is the autosave — the ~37 `saveGame()` call sites throughout the game
 * write there, unchanged. Slots 1-3 are manual. A single slot with pervasive
 * autosaving meant a bad decision was persisted instantly with no way back,
 * which is punishing in a sim where a run is several hours.
 *
 * Slot 0 deliberately keeps the original key so saves made before slots existed
 * still load.
 */
export const AUTOSAVE_SLOT = 0;
export const MANUAL_SLOTS = [1, 2, 3] as const;
export const ALL_SLOTS = [AUTOSAVE_SLOT, ...MANUAL_SLOTS] as const;

export function slotKey(slot: number): string {
  return slot === AUTOSAVE_SLOT ? SAVE_KEY : `${SAVE_KEY}-s${slot}`;
}

function readRaw(slot: number = AUTOSAVE_SLOT): string | null {
  try {
    const own = storage().getItem(slotKey(slot));
    if (own) return own;
    // Only the autosave slot inherits the pre-slots legacy key.
    return slot === AUTOSAVE_SLOT ? storage().getItem(LEGACY_SAVE_KEY) : null;
  } catch {
    return null;
  }
}

function parseBlob(raw: string): SaveBlob | null {
  try {
    const data = JSON.parse(raw) as SaveBlob | GameState;
    // New format: { meta, state }
    if (data && typeof data === 'object' && 'state' in data && (data as SaveBlob).state) {
      const blob = data as SaveBlob;
      if (!blob.state.version) return null;
      blob.state = normalizeState(blob.state);
      if (!blob.meta) blob.meta = buildMeta(blob.state);
      return blob;
    }
    // Legacy: bare GameState
    const gs = data as GameState;
    if (!gs.version) return null;
    const stateNorm = normalizeState(gs);
    return { meta: buildMeta(stateNorm), state: stateNorm };
  } catch {
    return null;
  }
}

/** Manual or auto save. Returns success + meta for UI. */
export function saveGame(slot: number = AUTOSAVE_SLOT): SaveResult {
  try {
    const meta = buildMeta(state);
    const blob: SaveBlob = { meta, state };
    storage().setItem(slotKey(slot), JSON.stringify(blob));
    // Clean legacy key once migrated
    try {
      storage().removeItem(LEGACY_SAVE_KEY);
    } catch {
      /* ignore */
    }
    return { ok: true, meta };
  } catch (e) {
    const name = e instanceof DOMException ? e.name : '';
    if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      return { ok: false, error: 'quota' };
    }
    // Safari private often throws SecurityError
    if (name === 'SecurityError') {
      return { ok: false, error: 'private' };
    }
    return { ok: false, error: 'unknown' };
  }
}

export function loadGame(slot: number = AUTOSAVE_SLOT): GameState | null {
  const raw = readRaw(slot);
  if (!raw) return null;
  const blob = parseBlob(raw);
  if (!blob) return null;
  state = blob.state;
  return state;
}

export function hasSave(slot: number = AUTOSAVE_SLOT): boolean {
  return !!readRaw(slot);
}

export function getSaveMeta(slot: number = AUTOSAVE_SLOT): SaveMeta | null {
  const raw = readRaw(slot);
  if (!raw) return null;
  const blob = parseBlob(raw);
  return blob?.meta ?? null;
}

/** Every slot with its metadata, for the save/load screen. */
export function listSaves(): Array<{ slot: number; meta: SaveMeta | null }> {
  return ALL_SLOTS.map((slot) => ({ slot, meta: getSaveMeta(slot) }));
}

export function deleteSave(slot: number): void {
  try {
    storage().removeItem(slotKey(slot));
  } catch {
    /* ignore */
  }
}

export function clearSave(): void {
  try {
    storage().removeItem(SAVE_KEY);
    storage().removeItem(LEGACY_SAVE_KEY);
  } catch {
    /* ignore */
  }
}

/** Full JSON string for backup / transfer */
export function exportSave(): string | null {
  try {
    const meta = buildMeta(state);
    const blob: SaveBlob = { meta, state };
    // Prefer disk copy if already saved; else current RAM state
    const raw = readRaw();
    if (raw) {
      const existing = parseBlob(raw);
      if (existing) return JSON.stringify(existing, null, 2);
    }
    return JSON.stringify(blob, null, 2);
  } catch {
    return null;
  }
}

export function importSave(json: string): SaveResult {
  if (!json || !json.trim()) return { ok: false, error: 'empty' };
  const blob = parseBlob(json.trim());
  if (!blob) return { ok: false, error: 'invalid' };
  state = blob.state;
  // Persist imported
  const res = saveGame();
  if (!res.ok) return res;
  return { ok: true, meta: res.meta ?? blob.meta };
}

export function formatSaveMetaLine(meta: SaveMeta, locLabel: string): string {
  const when = (() => {
    try {
      const d = new Date(meta.savedAt);
      // Follow the *game's* locale, not the browser's — an English UI was
      // showing "20. Juli" on a German system.
      return d.toLocaleString(getLocale(), {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return meta.savedAt.slice(0, 16);
    }
  })();
  return `${meta.playerName} · ${t('day', { n: meta.day })} · ${locLabel} · ${when}`;
}

export function rep(locationId?: string): number {
  const id = locationId ?? state.locationId;
  return state.reputation[id] ?? 0;
}

export function addRep(delta: number, locationId?: string): void {
  mutate((s) => {
    const id = locationId ?? s.locationId;
    s.reputation[id] = Math.max(-50, Math.min(100, (s.reputation[id] ?? 0) + delta));
  });
}

export function addCoin(n: number): void {
  mutate((s) => {
    s.coin = Math.max(0, s.coin + n);
  });
}

export function flag(key: string): boolean | number | string | undefined {
  return state.storyFlags[key];
}

export function setFlag(key: string, value: boolean | number | string = true): void {
  mutate((s) => {
    s.storyFlags[key] = value;
  });
}
