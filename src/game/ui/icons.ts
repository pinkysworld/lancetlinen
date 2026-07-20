/**
 * HUD icons.
 *
 * Vector shapes are drawn onto canvas textures at boot as always-available
 * fallbacks (`ico_*`). When painted `icon_*.png` files from ART_TODO load,
 * `statChip` / `chipRow` prefer those automatically.
 */
import Phaser from 'phaser';
import { COLORS } from './theme';
import { SERIF } from './fx';

export type IconId =
  | 'coin'
  | 'reputation'
  | 'ethics'
  | 'day'
  | 'linen'
  | 'herbs'
  | 'leeches'
  | 'soap'
  | 'salve'
  | 'wood';

const PREFIX = 'ico_';
const SIZE = 64;

type Ctx = CanvasRenderingContext2D;

const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

/** Each icon is drawn into a 64x64 cell with an 8px margin. */
const PAINTERS: Record<IconId, (ctx: Ctx) => void> = {
  coin: (ctx) => {
    ctx.fillStyle = hex(COLORS.gold);
    ctx.beginPath();
    ctx.arc(32, 32, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = hex(COLORS.ink);
    ctx.lineWidth = 3;
    ctx.stroke();
    // Struck cross, as on a medieval Groschen.
    ctx.beginPath();
    ctx.moveTo(32, 16);
    ctx.lineTo(32, 48);
    ctx.moveTo(16, 32);
    ctx.lineTo(48, 32);
    ctx.stroke();
  },

  reputation: (ctx) => {
    // Laurel wreath: two arcs of leaves.
    ctx.strokeStyle = hex(COLORS.greenBright);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(32, 34, 20, Math.PI * 0.75, Math.PI * 2.25);
    ctx.stroke();
    ctx.fillStyle = hex(COLORS.greenBright);
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * 0.8 + (i / 6) * Math.PI * 1.4;
      const lx = 32 + Math.cos(a) * 20;
      const ly = 34 + Math.sin(a) * 20;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(a + Math.PI / 2);
      ctx.beginPath();
      ctx.ellipse(0, 0, 6, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  },

  ethics: (ctx) => {
    // Balance scale.
    ctx.strokeStyle = hex(COLORS.parchment);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(32, 14);
    ctx.lineTo(32, 46);
    ctx.moveTo(14, 22);
    ctx.lineTo(50, 22);
    ctx.moveTo(32, 46);
    ctx.lineTo(22, 50);
    ctx.moveTo(32, 46);
    ctx.lineTo(42, 50);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(14, 30, 8, 0, Math.PI);
    ctx.arc(50, 30, 8, 0, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(14, 22);
    ctx.lineTo(14, 30);
    ctx.moveTo(50, 22);
    ctx.lineTo(50, 30);
    ctx.stroke();
  },

  day: (ctx) => {
    // Sun over a horizon.
    ctx.fillStyle = hex(COLORS.goldBright);
    ctx.beginPath();
    ctx.arc(32, 32, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = hex(COLORS.goldBright);
    ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(32 + Math.cos(a) * 17, 32 + Math.sin(a) * 17);
      ctx.lineTo(32 + Math.cos(a) * 23, 32 + Math.sin(a) * 23);
      ctx.stroke();
    }
  },

  linen: (ctx) => {
    // Folded cloth.
    ctx.fillStyle = hex(COLORS.white);
    ctx.beginPath();
    ctx.moveTo(12, 24);
    ctx.lineTo(52, 18);
    ctx.lineTo(52, 40);
    ctx.lineTo(12, 46);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = hex(COLORS.muted);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(12, 35);
    ctx.lineTo(52, 29);
    ctx.stroke();
  },

  herbs: (ctx) => {
    // Tied sprig.
    ctx.strokeStyle = hex(COLORS.green);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(32, 50);
    ctx.lineTo(32, 20);
    ctx.stroke();
    ctx.fillStyle = hex(COLORS.greenBright);
    for (let i = 0; i < 3; i++) {
      const y = 24 + i * 9;
      ctx.beginPath();
      ctx.ellipse(24, y, 8, 4, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(40, y + 4, 8, 4, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = hex(COLORS.parchmentDark);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(26, 46);
    ctx.lineTo(38, 46);
    ctx.stroke();
  },

  leeches: (ctx) => {
    // Stoppered jar.
    ctx.fillStyle = hex(COLORS.steam);
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.roundRect(18, 22, 28, 30, 5);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = hex(COLORS.parchment);
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = hex(COLORS.parchmentDark);
    ctx.beginPath();
    ctx.roundRect(22, 14, 20, 9, 3);
    ctx.fill();
    // Two leeches curled inside.
    ctx.strokeStyle = hex(COLORS.blood);
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(28, 40, 6, 0.4, Math.PI * 1.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(38, 44, 5, Math.PI, Math.PI * 2.4);
    ctx.stroke();
  },

  soap: (ctx) => {
    ctx.fillStyle = hex(COLORS.parchment);
    ctx.beginPath();
    ctx.roundRect(14, 24, 36, 20, 6);
    ctx.fill();
    ctx.strokeStyle = hex(COLORS.parchmentDark);
    ctx.lineWidth = 2;
    ctx.stroke();
    // Suds.
    ctx.fillStyle = hex(COLORS.white);
    ctx.beginPath();
    ctx.arc(22, 20, 5, 0, Math.PI * 2);
    ctx.arc(32, 16, 6, 0, Math.PI * 2);
    ctx.arc(42, 20, 4, 0, Math.PI * 2);
    ctx.fill();
  },

  salve: (ctx) => {
    // Lidded ointment pot.
    ctx.fillStyle = hex(COLORS.panelLight);
    ctx.beginPath();
    ctx.moveTo(18, 26);
    ctx.lineTo(46, 26);
    ctx.lineTo(43, 50);
    ctx.lineTo(21, 50);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = hex(COLORS.ink);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = hex(COLORS.parchmentDark);
    ctx.beginPath();
    ctx.roundRect(15, 18, 34, 9, 3);
    ctx.fill();
    ctx.stroke();
  },

  wood: (ctx) => {
    // Split log, end grain toward the viewer.
    ctx.fillStyle = hex(COLORS.panelLight);
    ctx.beginPath();
    ctx.ellipse(24, 32, 10, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = hex(COLORS.ink);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = hex(COLORS.panel);
    ctx.beginPath();
    ctx.moveTo(24, 18);
    ctx.lineTo(46, 18);
    ctx.lineTo(46, 46);
    ctx.lineTo(24, 46);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = hex(COLORS.parchmentDark);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(24, 32, 5, 8, 0, 0, Math.PI * 2);
    ctx.stroke();
  },
};

/** Generate every icon texture. Called once from `PreloadScene`. */
export function buildIconTextures(scene: Phaser.Scene): void {
  for (const id of Object.keys(PAINTERS) as IconId[]) {
    const key = PREFIX + id;
    if (scene.textures.exists(key)) continue;
    const tex = scene.textures.createCanvas(key, SIZE, SIZE);
    if (!tex) continue;
    const ctx = tex.getContext();
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    PAINTERS[id](ctx);
    tex.refresh();
  }
}

export function iconKey(id: IconId): string {
  return PREFIX + id;
}

export interface ChipOpts {
  /** Value colour; defaults to parchment. */
  color?: string;
  iconSize?: number;
  fontSize?: string;
  depth?: number;
}

/**
 * Icon + value chip, left-aligned at (x, y) which is the vertical centre.
 *
 * Returns the width consumed so callers can lay chips out in a row without
 * hard-coding offsets that drift when the numbers grow.
 */
export function statChip(
  scene: Phaser.Scene,
  x: number,
  y: number,
  id: IconId,
  value: string,
  opts: ChipOpts = {},
): number {
  const iconSize = opts.iconSize ?? 22;
  const depth = opts.depth ?? 0;

  // Painted art wins if it has been added (see ART_TODO.md); the drawn icon is
  // the always-present fallback.
  const key = [`icon_${id}`, iconKey(id)].find((k) => scene.textures.exists(k));

  if (key) {
    scene.add
      .image(x + iconSize / 2, y, key)
      .setDisplaySize(iconSize, iconSize)
      .setDepth(depth)
      .disableInteractive();
  }

  const label = scene.add
    .text(x + iconSize + 6, y, value, {
      fontFamily: SERIF,
      fontSize: opts.fontSize ?? '15px',
      color: opts.color ?? '#e8d5a8',
    })
    .setOrigin(0, 0.5)
    .setDepth(depth);

  return iconSize + 6 + label.width;
}

/**
 * Lay out a row of chips from `x`, returning the total width used.
 * Skips entries whose value is null so callers can drop chips conditionally.
 */
export function chipRow(
  scene: Phaser.Scene,
  x: number,
  y: number,
  entries: Array<{ id: IconId; value: string; color?: string } | null>,
  gap = 26,
  opts: ChipOpts = {},
): number {
  let cursor = x;
  for (const e of entries) {
    if (!e) continue;
    cursor += statChip(scene, cursor, y, e.id, e.value, { ...opts, color: e.color }) + gap;
  }
  return cursor - x - gap;
}
