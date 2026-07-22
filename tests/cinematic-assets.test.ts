import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const cinematic = [
  'market-morning.jpg', 'bathhouse.jpg', 'sickroom.jpg',
  'council-choice.jpg', 'household-evening.jpg', 'road-to-augsburg.jpg',
];

describe('cinematic Grok delivery', () => {
  it('ships all six static scene alternatives and both completed trailer clips', () => {
    for (const file of cinematic) {
      const path = join(root, 'public/assets/cinematic', file);
      expect(existsSync(path), file).toBe(true);
      expect(statSync(path).size, file).toBeGreaterThan(20_000);
    }
    for (const file of ['bathhouse-opening.mp4', 'road-to-augsburg.mp4']) {
      const path = join(root, 'public/trailer', file);
      expect(existsSync(path), file).toBe(true);
      expect(statSync(path).size, file).toBeGreaterThan(1_000_000);
    }
  });

  it('streams stills after the menu and never preloads trailer video', () => {
    const preload = readFileSync(join(root, 'src/game/scenes/PreloadScene.ts'), 'utf8');
    for (const key of [
      'bg_cinematic_market', 'bg_cinematic_bath', 'bg_cinematic_sickroom',
      'bg_cinematic_council', 'bg_cinematic_household', 'bg_cinematic_road',
    ]) expect(preload).toContain(key);
    expect(preload).not.toContain('.mp4');
  });

  it('keeps city and household art tied to the appropriate scene', () => {
    const civic = readFileSync(join(root, 'src/game/scenes/CivicScene.ts'), 'utf8');
    const family = readFileSync(join(root, 'src/game/scenes/FeatureScenes.ts'), 'utf8');
    expect(civic).toContain("locationId === 'nurnberg'");
    expect(civic).toContain('bg_cinematic_council');
    expect(family).toContain('bg_cinematic_household');
  });
});
