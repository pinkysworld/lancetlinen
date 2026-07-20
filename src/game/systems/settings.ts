/**
 * Settings that affect presentation rather than the simulation.
 *
 * Kept here so scenes read one helper instead of reaching into
 * `getState().settings` and re-deriving the same fallbacks. Several of these
 * were previously toggleable in the Settings screen and read nowhere — see
 * `goreLevel` and `textSpeed`, both of which now drive real behaviour.
 */
import { getState, mutate, saveGame } from '../state';
import { DEFAULT_SETTINGS, type Difficulty, type GameSettings, type GoreLevel } from '../types';
import { audio } from '../audio/AudioManager';

export function settings(): GameSettings {
  try {
    return { ...DEFAULT_SETTINGS, ...(getState().settings ?? {}) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** Update settings, persist, and apply anything with a live side effect. */
export function updateSettings(patch: Partial<GameSettings>): void {
  mutate((s) => {
    s.settings = { ...DEFAULT_SETTINGS, ...(s.settings ?? {}), ...patch };
  });
  applySettings();
  saveGame();
}

/** Push the current settings into the systems that consume them. */
export function applySettings(): void {
  const s = settings();
  audio.applyVolumeSettings({
    master: s.volMaster,
    music: s.volMusic,
    sfx: s.volSfx,
    ambience: s.volAmbience,
  });
}

/* ------------------------------------------------------------------ *
 * Text scale
 * ------------------------------------------------------------------ */

/**
 * Scale a CSS font size string by the user's text-scale setting.
 *
 * Accepts and returns the `'15px'` form the UI helpers already use, so call
 * sites need no other change.
 */
export function scaleFont(size: string): string {
  const scale = settings().textScale;
  if (!scale || scale === 1) return size;
  const n = parseFloat(size);
  if (Number.isNaN(n)) return size;
  return `${Math.round(n * scale)}px`;
}

/* ------------------------------------------------------------------ *
 * Colour-blind safe signalling
 * ------------------------------------------------------------------ */

export type Signal = 'good' | 'warn' | 'bad' | 'neutral';

/**
 * Glyph prefix for a state that would otherwise be signalled by colour alone.
 *
 * Roughly 8% of men have some form of red-green colour deficiency, and the
 * game leans hard on red/green for treatment outcomes, severity and ledger
 * deltas. Returns an empty string when the option is off, so the normal look
 * is unchanged.
 */
export function signalGlyph(kind: Signal): string {
  if (!settings().colorBlindSafe) return '';
  switch (kind) {
    case 'good':
      return '✓ ';
    case 'warn':
      return '! ';
    case 'bad':
      return '✕ ';
    default:
      return '';
  }
}

/** Severity pips, with shape variation when colour-blind mode is on. */
export function severityMarks(severity: number, max = 5): string {
  const filled = Math.max(0, Math.min(max, severity));
  if (!settings().colorBlindSafe) {
    return '●'.repeat(filled) + '○'.repeat(max - filled);
  }
  // Distinct shapes so the reading survives without hue.
  return '◆'.repeat(filled) + '·'.repeat(max - filled);
}

/* ------------------------------------------------------------------ *
 * Gore
 * ------------------------------------------------------------------ */

export function goreLevel(): GoreLevel {
  return settings().goreLevel;
}

/** Blood particles and screen-flash on failure are suppressed at low gore. */
export function showBloodEffects(): boolean {
  return goreLevel() !== 'low';
}

/**
 * Suffix selecting a gore variant of a treatment result string.
 *
 * `treatment_fail` becomes `treatment_fail_low` when the player has asked for
 * less blood; the i18n files carry the softened wording.
 */
export function goreVariantKey(baseKey: string): string {
  return goreLevel() === 'low' ? `${baseKey}_low` : baseKey;
}

/* ------------------------------------------------------------------ *
 * Text speed
 * ------------------------------------------------------------------ */

/**
 * Milliseconds per character for the dialogue reveal.
 * 3 (instant) returns 0 so the whole line appears at once.
 */
export function textRevealMs(): number {
  switch (settings().textSpeed) {
    case 1:
      return 34;
    case 3:
      return 0;
    default:
      return 16;
  }
}

/* ------------------------------------------------------------------ *
 * Difficulty
 * ------------------------------------------------------------------ */

export function difficulty(): Difficulty {
  return settings().difficulty;
}

/**
 * Multiplier on the things that press against the player: daily operating cost
 * (`dailyOperatingCost`), church fines and debt collection (`pressure.ts`), and
 * honour losses (`addHonour` — losses only, never gains).
 *
 * Deliberately does not touch treatment success: the medical craft should read
 * the same at every setting, so a merciful run is still the same *game*, just
 * a more forgiving town.
 */
export function pressureMult(): number {
  switch (difficulty()) {
    case 'merciful':
      return 0.6;
    case 'harsh':
      return 1.45;
    default:
      return 1;
  }
}

/**
 * Multiplier on income, so a merciful run also recovers faster.
 *
 * Applied to treatment pay (`treatment.ts`), remote property earnings
 * (`property.ts`) and office pay (`economy.ts`) — the three places coin is
 * credited.
 */
export function incomeMult(): number {
  switch (difficulty()) {
    case 'merciful':
      return 1.25;
    case 'harsh':
      return 0.9;
    default:
      return 1;
  }
}
