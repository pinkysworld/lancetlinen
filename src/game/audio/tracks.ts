/**
 * Recorded music.
 *
 * The score was synthesised at runtime. That was defensible — it shipped with
 * no audio files at all — but it was reported twice as static and poor, and it
 * is: a drone with plucked notes over it does not become a piece of music
 * however carefully the mode is chosen.
 *
 * These are real recordings. Every one is **CC0** (public domain dedication),
 * which is the only licence that is unambiguously safe for a paid release —
 * CC-BY would work with attribution, CC-BY-NC would not work at all. Sources
 * and licences are recorded in `AUDIO_CREDITS.md`.
 *
 * ## Why HTML5 Audio and not Phaser's loader
 *
 * Phaser decodes audio into memory. Fifteen megabytes of music decoded to raw
 * PCM is roughly 150 MB, which is unreasonable on a phone. An `<audio>`
 * element streams, loops natively, and starts playing before the file has
 * finished arriving.
 *
 * ## Fallback
 *
 * A context with no recording falls through to the procedural engine, which
 * therefore stays. That is not dead code: `dialogue`, `night` and the tense
 * themes are deliberately left synthetic, because sparse drone under dialogue
 * is exactly what that wants and no CC0 recording fits it better.
 */
import type { MusicId } from './themes';

export interface Track {
  /** File under `public/assets/music/`, without extension. */
  file: string;
  /** Where it came from and under what licence. Mirrored in AUDIO_CREDITS.md. */
  source: string;
  author: string;
  /** Playback gain, 0..1, to even out level differences between recordings. */
  gain: number;
}

/**
 * Which recording plays for which context.
 *
 * Several contexts share a track. The score has distinct pieces where the
 * game changes emotional register (festival, travel aftermath, danger and war)
 * while retaining a small enough palette to sound coherent rather than random.
 */
export const TRACKS: Partial<Record<Exclude<MusicId, 'none'>, Track>> = {
  menu: {
    file: 'mus_menu',
    source: 'https://opengameart.org/content/medieval-the-bards-tale',
    author: 'RandomMind',
    gain: 0.7,
  },
  market: {
    file: 'mus_market',
    source: 'https://opengameart.org/content/medieval-market-day',
    author: 'RandomMind',
    gain: 0.62,
  },
  festival: {
    file: 'mus_festival_pub',
    source: 'https://opengameart.org/content/crowded-pub',
    author: 'Bobjt',
    gain: 0.46,
  },
  road: {
    file: 'mus_road',
    source: 'https://opengameart.org/content/medieval-exploration',
    author: 'RandomMind',
    gain: 0.66,
  },
  travel_result: {
    file: 'mus_travel_grasslands',
    source: 'https://opengameart.org/content/grasslands-theme',
    author: 'DST',
    gain: 0.5,
  },
  bath: {
    file: 'mus_bath',
    source: 'https://opengameart.org/content/medieval-harvest-season',
    author: 'RandomMind',
    gain: 0.6,
  },
  family: {
    file: 'mus_bath',
    source: 'https://opengameart.org/content/medieval-harvest-season',
    author: 'RandomMind',
    gain: 0.55,
  },
  ending: {
    file: 'mus_festival',
    source: 'https://opengameart.org/content/medieval-minstrel-dance',
    author: 'RandomMind',
    gain: 0.68,
  },
  // A vocal setting of a 12th–13th century composition. The one piece here
  // that is genuinely of the period rather than written to evoke it, so it
  // carries the monastery and the endgame's graver turns.
  monastery: {
    file: 'mus_chant',
    source: 'https://opengameart.org/content/breves-dies-hominis',
    author: 'Magdalen Kadel',
    gain: 0.72,
  },
  politics: {
    file: 'mus_chant',
    source: 'https://opengameart.org/content/breves-dies-hominis',
    author: 'Magdalen Kadel',
    gain: 0.5,
  },
  tense: {
    file: 'mus_tense_lament',
    source: 'https://opengameart.org/content/laments-of-the-war',
    author: 'Cethiel',
    // Under plague, difficult procedures and serious dialogue: never compete
    // with the written decision, but avoid the old exposed oscillator drone.
    gain: 0.28,
  },
  war: {
    file: 'mus_war_battle',
    source: 'https://opengameart.org/content/medieval-battle',
    author: 'RandomMind',
    gain: 0.38,
  },
};

export function trackFor(id: MusicId): Track | null {
  if (id === 'none') return null;
  return TRACKS[id] ?? null;
}

/** Distinct files, for the credits screen and for preloading hints. */
export function uniqueTracks(): Track[] {
  const seen = new Set<string>();
  const out: Track[] = [];
  for (const t of Object.values(TRACKS)) {
    if (t && !seen.has(t.file)) {
      seen.add(t.file);
      out.push(t);
    }
  }
  return out;
}
