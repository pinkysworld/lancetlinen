/**
 * Horizontal slider for the options screen.
 *
 * Built on the same world-space rectangle + pointer pattern as `makeButton`,
 * so it behaves identically under the zoomed camera (see RENDER_SCALE) and on
 * touch. Comparisons use `pointer.worldX`, not `pointer.x`.
 */
import Phaser from 'phaser';
import { COLORS, bodyText } from './theme';
import { isTouchDevice } from '../mobile';
import { audio } from '../audio/AudioManager';

export interface SliderOpts {
  width?: number;
  /** Steps between min and max. 0..1 volumes default to 20 steps of 5%. */
  steps?: number;
  /** Formats the value for display. Defaults to a percentage. */
  format?: (v: number) => string;
}

/**
 * Draws a labelled slider and returns nothing — the caller owns the value via
 * `onChange`, which fires live as the handle is dragged.
 */
export function makeSlider(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  value: number,
  onChange: (v: number) => void,
  opts: SliderOpts = {},
): void {
  const w = opts.width ?? 300;
  const steps = opts.steps ?? 20;
  const fmt = opts.format ?? ((v: number) => `${Math.round(v * 100)}%`);
  const trackH = 8;
  const handleR = isTouchDevice() ? 16 : 12;

  bodyText(scene, x, y - 22, label, { fontSize: '15px', color: '#e8d5a8' }).setOrigin(0, 0.5);

  const readout = bodyText(scene, x + w, y - 22, fmt(value), {
    fontSize: '15px',
    color: '#c9a227',
  }).setOrigin(1, 0.5);

  const g = scene.add.graphics();
  let current = Math.max(0, Math.min(1, value));

  const paint = () => {
    g.clear();
    // Track
    g.fillStyle(COLORS.ink, 0.85);
    g.fillRoundedRect(x, y - trackH / 2, w, trackH, trackH / 2);
    // Filled portion
    g.fillStyle(COLORS.gold, 0.9);
    g.fillRoundedRect(x, y - trackH / 2, Math.max(trackH, w * current), trackH, trackH / 2);
    // Handle
    const hx = x + w * current;
    g.fillStyle(COLORS.goldBright, 1);
    g.fillCircle(hx, y, handleR);
    g.lineStyle(2, COLORS.ink, 0.8);
    g.strokeCircle(hx, y, handleR);
  };
  paint();

  const quantise = (raw: number) => Math.round(raw * steps) / steps;

  const setFromPointer = (worldX: number) => {
    const next = quantise(Math.max(0, Math.min(1, (worldX - x) / w)));
    if (next === current) return;
    current = next;
    paint();
    readout.setText(fmt(current));
    onChange(current);
  };

  // Hit area spans the full track and is tall enough to grab comfortably.
  const hit = scene.add
    .rectangle(x + w / 2, y, w + handleR * 2, Math.max(44, handleR * 3), 0xffffff, 0.001)
    .setInteractive({ useHandCursor: true })
    .setDepth(1000);

  let dragging = false;
  hit.on('pointerdown', (p: Phaser.Input.Pointer) => {
    dragging = true;
    setFromPointer(p.worldX);
  });
  hit.on('pointermove', (p: Phaser.Input.Pointer) => {
    if (dragging) setFromPointer(p.worldX);
  });
  const release = () => {
    if (!dragging) return;
    dragging = false;
    // One click on release rather than on every step, or dragging machine-guns.
    audio.sfx('click');
  };
  hit.on('pointerup', release);
  hit.on('pointerout', release);
}
