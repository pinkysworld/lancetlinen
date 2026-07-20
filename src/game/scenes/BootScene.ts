import Phaser from 'phaser';
import { initI18n } from '../i18n';
import { getState } from '../state';
import { applySettings } from '../systems/settings';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    // Tiny procedural textures generated in Preload
  }

  async create(): Promise<void> {
    const locale = getState().locale ?? 'en';
    await initI18n(locale);
    applySettings();
    this.scene.start('Preload');
  }
}
