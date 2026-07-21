/**
 * Compact (phone) layout.
 *
 * The measurement that prompted this: on an iPhone in landscape with Safari's
 * bars showing (~844x320 usable), the 1280x720 world FIT-scales to **0.44**,
 * so a 13px label renders at under 6 real pixels. Pinch-zoom made that
 * readable but not usable — zoom, pan, tap, zoom out, repeat.
 *
 * These tests pin the arithmetic and the wiring. The layouts themselves were
 * verified by measuring every element's bounding box in the browser at
 * 844x320; what cannot be done here is prove a scene fits, because that needs
 * Phaser and a real canvas.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  fontFor,
  gridColumns,
  gridColumnsX,
  primarySize,
  secondarySize,
  rowPitch,
  rowsThatFit,
  contentW,
  gutter,
} from '../src/game/ui/responsive';
import { GAME_WIDTH } from '../src/game/types';
import { DEFAULT_SETTINGS } from '../src/game/types';

const RESP = readFileSync(join(process.cwd(), 'src/game/ui/responsive.ts'), 'utf8');
const HUB = readFileSync(join(process.cwd(), 'src/game/scenes/HubScene.ts'), 'utf8');
const MENU = readFileSync(join(process.cwd(), 'src/game/scenes/MainMenuScene.ts'), 'utf8');
const TREAT = readFileSync(join(process.cwd(), 'src/game/scenes/TreatmentScene.ts'), 'utf8');
const MARKET = readFileSync(join(process.cwd(), 'src/game/scenes/MarketStudyScenes.ts'), 'utf8');
const SETTINGS_SCENE = readFileSync(
  join(process.cwd(), 'src/game/scenes/FeatureScenes.ts'),
  'utf8',
);

/**
 * Under Node there is no window, so `compact()` is false and every helper
 * returns its desktop value. That is what these defaults exercise; the compact
 * branch is checked by reading the source, which is honest about what it can
 * prove.
 */
describe('desktop defaults are unchanged', () => {
  it('keeps the primary button at the size the desktop layouts assume', () => {
    expect(primarySize()).toEqual({ width: 340, height: 46 });
  });

  it('keeps three columns', () => {
    expect(gridColumns()).toBe(3);
    expect(gridColumnsX()).toHaveLength(3);
  });

  it('keeps the existing gutter and content width', () => {
    expect(gutter()).toBe(40);
    expect(contentW()).toBe(GAME_WIDTH - 80);
  });

  it('returns the sizes the scenes used before this existed', () => {
    expect(fontFor('body')).toBe('14px');
    expect(fontFor('button')).toBe('15px');
  });
});

describe('the compact branch', () => {
  /** Pull a literal out of the source, since compact() cannot be true here. */
  const compactValue = (fn: string, key: string): number => {
    const body = RESP.slice(RESP.indexOf(`export function ${fn}(`));
    const m = new RegExp(`compact\\(\\) \\? \\{[^}]*${key}: (\\d+)`).exec(body);
    return Number(m?.[1] ?? 0);
  };

  it('makes primary buttons much larger than desktop', () => {
    const h = compactValue('primarySize', 'height');
    expect(h).toBeGreaterThan(primarySize().height * 1.4);
  });

  it('keeps every compact control above the 48px touch minimum', () => {
    // Apple's HIG floor. Below it, mis-taps become the normal case.
    expect(compactValue('primarySize', 'height')).toBeGreaterThanOrEqual(48);
    expect(compactValue('secondarySize', 'height')).toBeGreaterThanOrEqual(48);
  });

  it('drops to two columns, so labels have room', () => {
    expect(RESP).toMatch(/return compact\(\) \? 2 : 3/);
  });

  it('uses larger type in world units, because the world is scaled down', () => {
    // Counter-intuitive but correct: bigger in world space to arrive at the
    // same size on glass.
    for (const role of ['body', 'button', 'small'] as const) {
      const m = new RegExp(`case '${role}':[\\s\\S]{0,60}?c \\? '(\\d+)px' : '(\\d+)px'`).exec(RESP);
      expect(Number(m![1]), role).toBeGreaterThan(Number(m![2]));
    }
  });

  it('fits three primary and three secondary rows inside the world height', () => {
    // The layout that has to hold: menu header, three session buttons, and
    // three rows of the secondary grid.
    const prim = compactValue('primarySize', 'height');
    const sec = compactValue('secondarySize', 'height');
    const header = 226; // where the primary stack starts in compact mode
    const total = header + prim * 3 + 12 * 2 + 46 + sec * 3 + 10 * 2;
    expect(total).toBeLessThanOrEqual(720);
  });
});

describe('row fitting', () => {
  it('never returns fewer than two rows', () => {
    expect(rowsThatFit(0, 10)).toBeGreaterThanOrEqual(2);
  });

  it('fits fewer rows as the pitch grows', () => {
    expect(rowsThatFit(100, 600)).toBe(Math.floor(500 / rowPitch()));
  });
});

describe('the override setting', () => {
  it('defaults to automatic detection', () => {
    expect(DEFAULT_SETTINGS.compactMode).toBe('auto');
  });

  it('lets an explicit choice win over detection', () => {
    // Detection cannot be right on every device, and being stuck with an
    // unreadable layout with no way out is worse than an extra option.
    expect(RESP).toContain("if (mode === 'on') return true");
    expect(RESP).toContain("if (mode === 'off') return false");
  });

  it('is reachable from the settings screen', () => {
    // A setting nothing exposes is the defect this project keeps producing.
    expect(SETTINGS_SCENE).toContain("t('compact_mode')");
    expect(SETTINGS_SCENE).toContain('compactMode:');
  });

  it('measures the viewport rather than trusting the user agent', () => {
    expect(RESP).toContain('worldScale() < 0.72');
  });
});

describe('scenes are actually wired to it', () => {
  it('converts the main menu', () => {
    expect(MENU).toContain('primarySize()');
    expect(MENU).toContain('gridColumnsX()');
  });

  it('gives the hub a separate compact branch', () => {
    expect(HUB).toContain('renderCompact');
  });

  it('takes that branch before any desktop furniture is drawn', () => {
    // Placing the check further down drew both layouts on top of each other —
    // the HUD, advisor card and quest strip had already been added.
    const branch = HUB.indexOf('this.renderCompact(');
    const hud = HUB.indexOf('woodPanel(this, 30, 20');
    expect(branch).toBeGreaterThan(0);
    expect(branch).toBeLessThan(hud);
  });

  it('scales the technique list rows in treatment', () => {
    expect(TREAT).toContain('compact() ? buttonRow(52, 8)');
  });

  it('shortens the treatment status block on a phone', () => {
    // Eight lines at compact type measured 258px and ran off the panel.
    expect(TREAT).toContain('const statusLines = compact()');
  });

  it('drops the +5 buy button in the market, keeping the essential two', () => {
    // `gatedButton` since the buy buttons learned to say "you need 20 coin
    // and have 9" instead of silently doing nothing.
    expect(MARKET).toContain('if (!compact()) gatedButton(');
  });
});
