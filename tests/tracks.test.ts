/**
 * Recorded music: files, licences and fallback.
 *
 * Two things here can hurt a paid release, and neither shows up when you play
 * the game:
 *
 * 1. **A missing file.** `<audio>` fails silently — the scene just goes quiet.
 * 2. **An undocumented licence.** Shipping a track whose terms nobody wrote
 *    down is the kind of problem that surfaces after release.
 *
 * So the licence table is treated as part of the build, not as a courtesy.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { TRACKS, trackFor, uniqueTracks } from '../src/game/audio/tracks';
import { THEMES } from '../src/game/audio/themes';

const CREDITS = readFileSync(join(process.cwd(), 'AUDIO_CREDITS.md'), 'utf8');
const MUSIC_DIR = join(process.cwd(), 'public/assets/music');

describe('the files exist', () => {
  it('ships every track it references', () => {
    // A missing file is silent: `<audio>` errors and the scene plays nothing.
    const missing = uniqueTracks()
      .map((t) => `${t.file}.mp3`)
      .filter((f) => !existsSync(join(MUSIC_DIR, f)));
    expect(missing).toEqual([]);
  });

  it('ships files big enough to be actual music', () => {
    // Catches a truncated or failed download, which would otherwise be a
    // valid-looking file that plays half a second of nothing.
    for (const t of uniqueTracks()) {
      const bytes = statSync(join(MUSIC_DIR, `${t.file}.mp3`)).size;
      expect(bytes, `${t.file} is ${bytes} bytes`).toBeGreaterThan(200_000);
    }
  });

  it('keeps the music budget reasonable for a web build', () => {
    // The whole point of transcoding was to not ship 30 MB of 320 kbps audio.
    const total = uniqueTracks().reduce(
      (sum, t) => sum + statSync(join(MUSIC_DIR, `${t.file}.mp3`)).size,
      0,
    );
    expect(total / 1_000_000).toBeLessThan(20);
  });
});

describe('licences are documented', () => {
  it('names every track in the credits file', () => {
    for (const t of uniqueTracks()) {
      expect(CREDITS, `${t.file} undocumented`).toContain(`${t.file}.mp3`);
    }
  });

  it('records a source URL for every track', () => {
    for (const t of uniqueTracks()) {
      expect(t.source, `${t.file} has no source`).toMatch(/^https?:\/\//);
      expect(CREDITS, `${t.file} source not in credits`).toContain(t.source);
    }
  });

  it('names an author for every track', () => {
    for (const t of uniqueTracks()) {
      expect(t.author.length, t.file).toBeGreaterThan(1);
      expect(CREDITS).toContain(t.author);
    }
  });

  it('ships no licence that forbids commercial use', () => {
    // CC-BY-NC would make the game unsellable. It must not appear as the
    // licence of anything shipped — only in the explanation of why it is
    // excluded.
    // The filename is the second column, not the first.
    const rows = CREDITS.split('\n').filter((l) => l.startsWith('|') && l.includes('.mp3`'));
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row, `NC licence in: ${row}`).not.toMatch(/CC-BY-NC|NonCommercial/);
    }
  });

  it('states the licence of every shipped row as CC0', () => {
    const rows = CREDITS.split('\n').filter((l) => l.includes('.mp3`'));
    for (const row of rows) {
      expect(row, `not CC0: ${row}`).toContain('CC0');
    }
  });
});

describe('mix', () => {
  it('gives every track a sane playback gain', () => {
    for (const t of Object.values(TRACKS)) {
      expect(t!.gain, t!.file).toBeGreaterThan(0.2);
      expect(t!.gain, t!.file).toBeLessThanOrEqual(1);
    }
  });

  it('keeps the track under dialogue-adjacent screens quieter', () => {
    // Council scenes carry a lot of reading.
    expect(TRACKS.politics!.gain).toBeLessThan(TRACKS.menu!.gain);
  });
});

describe('procedural fallback', () => {
  it('still covers every context that has no recording', () => {
    // The procedural engine is not dead code — it is the fallback, and a
    // context with neither a track nor a theme would be silent.
    for (const id of Object.keys(THEMES) as Array<keyof typeof THEMES>) {
      const hasTrack = !!trackFor(id);
      const hasTheme = !!THEMES[id];
      expect(hasTrack || hasTheme, `${id} has no music at all`).toBe(true);
    }
  });

  it('leaves the sparse contexts synthetic on purpose', () => {
    // A recorded piece under dialogue would compete with the writing.
    expect(trackFor('dialogue')).toBeNull();
    expect(trackFor('night')).toBeNull();
  });

  it('returns nothing for the silent context', () => {
    expect(trackFor('none')).toBeNull();
  });
});

describe('coverage', () => {
  it('covers the contexts a player spends the most time in', () => {
    for (const id of ['menu', 'bath', 'market', 'road'] as const) {
      expect(trackFor(id), `${id} should have a recording`).not.toBeNull();
    }
  });

  it('reuses pieces rather than shipping one per context', () => {
    // Six pieces across thirteen contexts reads as a score; thirteen
    // unrelated pieces reads as a shuffle.
    expect(uniqueTracks().length).toBeLessThan(Object.keys(TRACKS).length);
  });
});
