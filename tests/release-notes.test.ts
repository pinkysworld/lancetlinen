import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

describe('player-facing release notes', () => {
  it('keeps the current release number, menu button and in-game scene aligned', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string };
    const menu = readFileSync(join(root, 'src/game/scenes/MainMenuScene.ts'), 'utf8');
    const game = readFileSync(join(root, 'src/game/Game.ts'), 'utf8');
    const notes = readFileSync(join(root, 'src/game/scenes/ReleaseNotesScene.ts'), 'utf8');
    expect(pkg.version).toBe('1.3.1');
    expect(menu).toContain("transitionTo(this, 'ReleaseNotes')");
    expect(game).toContain('ReleaseNotesScene');
    expect(notes).toContain("version: 'v1.3.1'");
  });

  it('documents the current and preceding player-visible releases', () => {
    const notes = readFileSync(join(root, 'docs/RELEASE_NOTES.md'), 'utf8');
    expect(notes).toContain('## v1.3.1');
    expect(notes).toContain('## v1.3.0');
  });
});
