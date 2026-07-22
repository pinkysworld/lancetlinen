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
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
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
  MIN_TOUCH_CSS,
  compact,
  touchTargetHeight,
  worldScale,
} from '../src/game/ui/responsive';
import { GAME_WIDTH } from '../src/game/types';
import { DEFAULT_SETTINGS } from '../src/game/types';

const RESP = readFileSync(join(process.cwd(), 'src/game/ui/responsive.ts'), 'utf8');
const HUB = readFileSync(join(process.cwd(), 'src/game/scenes/HubScene.ts'), 'utf8');
const MENU = readFileSync(join(process.cwd(), 'src/game/scenes/MainMenuScene.ts'), 'utf8');
const GAME = readFileSync(join(process.cwd(), 'src/game/Game.ts'), 'utf8');
const TREAT = readFileSync(join(process.cwd(), 'src/game/scenes/TreatmentScene.ts'), 'utf8');
const DAY_SUMMARY = readFileSync(join(process.cwd(), 'src/game/scenes/DaySummaryScene.ts'), 'utf8');
const DIALOGUE = readFileSync(join(process.cwd(), 'src/game/scenes/DialogueScene.ts'), 'utf8');
const CHARACTER = readFileSync(join(process.cwd(), 'src/game/scenes/CharacterScene.ts'), 'utf8');
const MARKET = readFileSync(join(process.cwd(), 'src/game/scenes/MarketStudyScenes.ts'), 'utf8');
const SETTINGS_SCENE = readFileSync(
  join(process.cwd(), 'src/game/scenes/FeatureScenes.ts'),
  'utf8',
);
const CODEX = readFileSync(join(process.cwd(), 'src/game/scenes/EndingCodexScenes.ts'), 'utf8');
const LEXICON = readFileSync(join(process.cwd(), 'src/game/scenes/LexiconScene.ts'), 'utf8');

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
  beforeEach(() => {
    // Safari's troublesome landscape height: 844×320 CSS pixels.
    vi.stubGlobal('window', { innerWidth: 844, innerHeight: 320, ontouchstart: null });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('derives the world-space height from a 44px physical target', () => {
    expect(MIN_TOUCH_CSS).toBe(44);
    expect(touchTargetHeight() * worldScale()).toBeGreaterThanOrEqual(MIN_TOUCH_CSS);
    expect(primarySize().height).toBeGreaterThan(90);
  });

  it('gives all shared compact controls the same physical minimum', () => {
    expect(secondarySize().height * worldScale()).toBeGreaterThanOrEqual(MIN_TOUCH_CSS);
  });

  it('keeps an iPad landscape target at the same physical minimum', () => {
    vi.stubGlobal('window', { innerWidth: 1180, innerHeight: 820, ontouchstart: null });
    expect(compact()).toBe(true);
    expect(touchTargetHeight() * worldScale()).toBeGreaterThanOrEqual(MIN_TOUCH_CSS);
  });

  it('drops to two columns, so labels have room', () => {
    expect(RESP).toMatch(/return compact\(\) \? 2 : 3/);
  });

  it('keeps reading type above its physical floor', () => {
    expect(parseFloat(fontFor('body')) * worldScale()).toBeGreaterThanOrEqual(15);
    expect(parseFloat(fontFor('button')) * worldScale()).toBeGreaterThanOrEqual(15);
    expect(parseFloat(fontFor('small')) * worldScale()).toBeGreaterThanOrEqual(13);
  });

  it('paginates the phone menu rather than shrinking nine actions', () => {
    expect(MENU).toContain("compactPage: 'main' | 'more'");
    expect(MENU).toContain("t('menu_more')");
  });

  it('keeps Manual and Lexicon actions at the same physical tap floor', () => {
    expect(CODEX).toContain('const buttonH = isCompact ? touchTargetHeight() : 40');
    expect(LEXICON).toContain('const target = touchTargetHeight()');
    expect(LEXICON).toContain('entries.slice(this.page * 3, this.page * 3 + 3)');
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

describe('viewport recovery', () => {
  it('refits the Phaser backing canvas when Safari reveals a new usable width', () => {
    expect(GAME).toContain('const refitCanvasToViewport');
    expect(GAME).toContain('game.scale.resize(nextWidth, RENDER_HEIGHT)');
    expect(GAME).toContain("window.visualViewport?.addEventListener('resize', () =>");
    expect(GAME).toContain('refitCanvasToViewport();');
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

  it('keeps fullscreen explicit and capability-gated', () => {
    expect(GAME).not.toContain('requestFullscreenOnFirstTouch');
    expect(SETTINGS_SCENE).toContain('document.fullscreenEnabled');
    expect(SETTINGS_SCENE).toContain('Promise.resolve(requested).catch');
  });

  it('measures the viewport rather than trusting the user agent', () => {
    expect(RESP).toContain('worldScale() < 1.1');
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

  it('uses dedicated, 44px-minimum treatment pages on a phone', () => {
    expect(TREAT).toContain('this.renderCompact();');
    expect(TREAT).toContain('private renderCompactTechniques');
    expect(TREAT).toContain('const h = touchTargetHeight();');
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

  it('uses distinct compact layouts for the three previously desktop-only core scenes', () => {
    expect(DAY_SUMMARY).toContain('this.renderCompact(data)');
    expect(DIALOGUE).toContain('this.showCompactNode(id, node)');
    expect(CHARACTER).toContain('this.renderCompact(origin)');
  });
});
