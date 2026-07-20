import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../types';
import { installSceneKeys } from './input';
import { makeButton, bodyText, titleText, COLORS, pushButtonLayer, popButtonLayer } from './theme';

/** Simple centered toast message (auto-destroys). */
export function showToast(
  scene: Phaser.Scene,
  message: string,
  color = '#5a9a6e',
  ms = 2800,
): void {
  const bg = scene.add
    .rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 70, Math.min(900, message.length * 9 + 40), 48, 0x1a120c, 0.92)
    .setStrokeStyle(2, COLORS.gold)
    .setDepth(5000);
  const txt = bodyText(scene, GAME_WIDTH / 2, GAME_HEIGHT - 70, message, {
    fontSize: '15px',
    color,
    wordWrap: { width: 860 },
    align: 'center',
  })
    .setOrigin(0.5)
    .setDepth(5001);
  scene.time.delayedCall(ms, () => {
    bg.destroy();
    txt.destroy();
  });
}

export interface ConfirmOpts {
  title: string;
  body: string;
  yes: string;
  no: string;
  onYes: () => void;
  onNo?: () => void;
}

/** Blocking-style confirm overlay (Phaser UI). */
export function showConfirm(scene: Phaser.Scene, opts: ConfirmOpts): void {
  // Shadow the scene's buttons so number keys and Esc address the dialog, not
  // whatever is behind the veil.
  pushButtonLayer(scene);
  const depth = 6000;
  const veil = scene.add
    .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65)
    .setDepth(depth)
    .setInteractive(); // block clicks behind
  const box = scene.add.graphics().setDepth(depth + 1);
  box.fillStyle(COLORS.panel, 0.98);
  box.fillRoundedRect(GAME_WIDTH / 2 - 300, GAME_HEIGHT / 2 - 140, 600, 280, 12);
  box.lineStyle(3, COLORS.gold, 0.9);
  box.strokeRoundedRect(GAME_WIDTH / 2 - 300, GAME_HEIGHT / 2 - 140, 600, 280, 12);

  const title = titleText(scene, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 100, opts.title, '26px').setDepth(depth + 2);
  const body = bodyText(scene, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, opts.body, {
    fontSize: '16px',
    wordWrap: { width: 520 },
    align: 'center',
    color: '#e8d5a8',
  })
    .setOrigin(0.5)
    .setDepth(depth + 2);

  const cleanup = () => {
    veil.destroy();
    box.destroy();
    title.destroy();
    body.destroy();
    yes.destroy();
    no.destroy();
    // Restore the scene's own buttons and keyboard bindings.
    popButtonLayer(scene);
    installSceneKeys(scene, { chips: false });
  };

  const yes = makeButton(
    scene,
    GAME_WIDTH / 2 - 120,
    GAME_HEIGHT / 2 + 80,
    opts.yes,
    () => {
      cleanup();
      opts.onYes();
    },
    { width: 200, height: 48, primary: true },
  );
  yes.setDepth(depth + 2);

  const no = makeButton(
    scene,
    GAME_WIDTH / 2 + 120,
    GAME_HEIGHT / 2 + 80,
    opts.no,
    () => {
      cleanup();
      opts.onNo?.();
    },
    { width: 200, height: 48, fill: COLORS.blood, back: true },
  );
  no.setDepth(depth + 2);

  // Enter confirms, Esc cancels — bound to the modal layer only.
  installSceneKeys(scene, { chips: false });
}

/** Download text file (desktop) + try clipboard. */
export function downloadText(filename: string, text: string): boolean {
  try {
    void navigator.clipboard?.writeText(text);
  } catch {
    /* clipboard optional */
  }
  try {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch {
    // Fallback: prompt so mobile users can copy
    try {
      window.prompt('Copy save data:', text);
      return true;
    } catch {
      return false;
    }
  }
}

export function promptImport(): string | null {
  try {
    return window.prompt('Paste save JSON:') ?? null;
  } catch {
    return null;
  }
}
