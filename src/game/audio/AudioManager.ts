/**
 * Procedural medieval-ish score & SFX via Web Audio API.
 * Themes change with scene/scenario; ambience layers match location mood.
 */

export type SfxId =
  | 'click'
  | 'coin'
  | 'success'
  | 'fail'
  | 'death'
  | 'partial'
  | 'splash'
  | 'steam'
  | 'door'
  | 'cart'
  | 'horse'
  | 'page'
  | 'hover'
  | 'market'
  | 'razor'
  | 'lancet'
  | 'leech'
  | 'cupping'
  | 'bell'
  | 'church'
  | 'guild'
  | 'fire'
  | 'wood'
  | 'crowd'
  | 'marry'
  | 'save'
  | 'load'
  | 'night'
  | 'wound'
  | 'pulse';

export type MusicId =
  | 'menu'
  | 'bath'
  | 'road'
  | 'tense'
  | 'market'
  | 'monastery'
  | 'war'
  | 'politics'
  | 'family'
  | 'dialogue'
  | 'travel_result'
  | 'ending'
  | 'night'
  | 'none';

export type AmbienceId = 'steam' | 'crowd' | 'wind' | 'fire' | 'camp' | 'none';

/** Scene / situation → music + ambience */
export type AudioContextId =
  | 'main_menu'
  | 'name_entry'
  | 'hub'
  | 'hub_epidemic'
  | 'hub_festival'
  | 'hub_monastery'
  | 'hub_war'
  | 'bathhouse'
  | 'treatment'
  | 'treatment_blood'
  | 'travel_map'
  | 'travel_result'
  | 'market'
  | 'dialogue'
  | 'dialogue_tense'
  | 'property'
  | 'study'
  | 'mentors'
  | 'journal'
  | 'staff'
  | 'family'
  | 'politics'
  | 'settings'
  | 'codex'
  | 'ending'
  | 'city_event';

interface ThemeSpec {
  // Drone fundamentals (Hz)
  drones: number[];
  droneTypes: OscillatorType[];
  droneVol: number[];
  // Melody pool (Hz)
  notes: number[];
  noteInterval: [number, number]; // min/max ms between plucks
  noteVol: number;
  noteType: OscillatorType;
  noteDur: number;
  // LFO on master
  lfoRate: number;
  lfoDepth: number;
  // Optional soft fifth/pad
  padFifth: boolean;
  // Percussive tick (war/road)
  pulseRate?: number;
  pulseFreq?: number;
  pulseVol?: number;
  // Filter for darkness
  lowpass?: number;
}

const THEMES: Record<Exclude<MusicId, 'none'>, ThemeSpec> = {
  // Modal-ish lute drone, calm title
  menu: {
    drones: [98, 147],
    droneTypes: ['sine', 'triangle'],
    droneVol: [0.22, 0.1],
    notes: [196, 220, 247, 294, 330, 294, 247, 220],
    noteInterval: [900, 1600],
    noteVol: 0.11,
    noteType: 'triangle',
    noteDur: 0.45,
    lfoRate: 0.08,
    lfoDepth: 0.03,
    padFifth: true,
    lowpass: 2200,
  },
  // Warm bathhouse — steam + soft major-ish
  bath: {
    drones: [87, 130.8],
    droneTypes: ['sine', 'sine'],
    droneVol: [0.2, 0.08],
    notes: [174, 196, 220, 261, 294, 261, 220],
    noteInterval: [1100, 2000],
    noteVol: 0.09,
    noteType: 'sine',
    noteDur: 0.55,
    lfoRate: 0.12,
    lfoDepth: 0.045,
    padFifth: true,
    lowpass: 1800,
  },
  // Road cart — walking bass feel
  road: {
    drones: [73, 110],
    droneTypes: ['triangle', 'sine'],
    droneVol: [0.18, 0.07],
    notes: [146, 164, 174, 196, 174, 164],
    noteInterval: [700, 1100],
    noteVol: 0.1,
    noteType: 'triangle',
    noteDur: 0.28,
    lfoRate: 0.2,
    lfoDepth: 0.03,
    padFifth: false,
    pulseRate: 1.6,
    pulseFreq: 70,
    pulseVol: 0.06,
    lowpass: 1600,
  },
  // Epidemic / danger
  tense: {
    drones: [55, 58, 82],
    droneTypes: ['sawtooth', 'sine', 'triangle'],
    droneVol: [0.06, 0.14, 0.08],
    notes: [110, 116, 123, 104],
    noteInterval: [500, 900],
    noteVol: 0.08,
    noteType: 'sawtooth',
    noteDur: 0.35,
    lfoRate: 2.8,
    lfoDepth: 0.07,
    padFifth: false,
    lowpass: 900,
  },
  // Market bustle
  market: {
    drones: [110, 165],
    droneTypes: ['triangle', 'sine'],
    droneVol: [0.14, 0.08],
    notes: [220, 247, 277, 330, 370, 330, 277],
    noteInterval: [450, 800],
    noteVol: 0.1,
    noteType: 'triangle',
    noteDur: 0.22,
    lfoRate: 0.25,
    lfoDepth: 0.04,
    padFifth: true,
    pulseRate: 2.2,
    pulseFreq: 90,
    pulseVol: 0.04,
    lowpass: 2800,
  },
  // Monastery sparse / open fifths
  monastery: {
    drones: [87, 130.8, 174],
    droneTypes: ['sine', 'sine', 'sine'],
    droneVol: [0.18, 0.12, 0.05],
    notes: [174, 196, 220, 261, 220],
    noteInterval: [1800, 3200],
    noteVol: 0.07,
    noteType: 'sine',
    noteDur: 1.1,
    lfoRate: 0.05,
    lfoDepth: 0.025,
    padFifth: true,
    lowpass: 1400,
  },
  // War camp drums + low drone
  war: {
    drones: [65, 98],
    droneTypes: ['sawtooth', 'triangle'],
    droneVol: [0.08, 0.12],
    notes: [130, 146, 123, 110],
    noteInterval: [900, 1400],
    noteVol: 0.07,
    noteType: 'triangle',
    noteDur: 0.3,
    lfoRate: 0.4,
    lfoDepth: 0.03,
    padFifth: false,
    pulseRate: 2.0,
    pulseFreq: 55,
    pulseVol: 0.12,
    lowpass: 1200,
  },
  // Formal council / guild
  politics: {
    drones: [98, 123, 147],
    droneTypes: ['sine', 'triangle', 'sine'],
    droneVol: [0.16, 0.08, 0.05],
    notes: [196, 233, 262, 294, 262, 233],
    noteInterval: [1000, 1800],
    noteVol: 0.09,
    noteType: 'triangle',
    noteDur: 0.5,
    lfoRate: 0.1,
    lfoDepth: 0.03,
    padFifth: true,
    lowpass: 2000,
  },
  // Gentle household
  family: {
    drones: [116, 174],
    droneTypes: ['sine', 'sine'],
    droneVol: [0.16, 0.09],
    notes: [233, 262, 294, 349, 392, 349, 294],
    noteInterval: [1000, 1700],
    noteVol: 0.1,
    noteType: 'sine',
    noteDur: 0.5,
    lfoRate: 0.09,
    lfoDepth: 0.035,
    padFifth: true,
    lowpass: 2400,
  },
  // Soft under dialogue
  dialogue: {
    drones: [92, 138],
    droneTypes: ['sine', 'triangle'],
    droneVol: [0.14, 0.06],
    notes: [185, 208, 233, 277],
    noteInterval: [1600, 2800],
    noteVol: 0.055,
    noteType: 'sine',
    noteDur: 0.7,
    lfoRate: 0.07,
    lfoDepth: 0.03,
    padFifth: false,
    lowpass: 1500,
  },
  travel_result: {
    drones: [82, 123],
    droneTypes: ['triangle', 'sine'],
    droneVol: [0.15, 0.07],
    notes: [164, 185, 196, 220],
    noteInterval: [800, 1300],
    noteVol: 0.08,
    noteType: 'triangle',
    noteDur: 0.4,
    lfoRate: 0.15,
    lfoDepth: 0.03,
    padFifth: false,
    lowpass: 1700,
  },
  ending: {
    drones: [98, 147, 196],
    droneTypes: ['sine', 'sine', 'triangle'],
    droneVol: [0.2, 0.12, 0.06],
    notes: [196, 220, 247, 294, 330, 392, 330, 294],
    noteInterval: [700, 1200],
    noteVol: 0.12,
    noteType: 'triangle',
    noteDur: 0.6,
    lfoRate: 0.1,
    lfoDepth: 0.04,
    padFifth: true,
    lowpass: 2600,
  },
  night: {
    drones: [73, 110],
    droneTypes: ['sine', 'sine'],
    droneVol: [0.16, 0.07],
    notes: [147, 165, 185, 196],
    noteInterval: [2000, 3500],
    noteVol: 0.05,
    noteType: 'sine',
    noteDur: 0.9,
    lfoRate: 0.06,
    lfoDepth: 0.04,
    padFifth: false,
    lowpass: 1000,
  },
};

const CONTEXT_MAP: Record<AudioContextId, { music: MusicId; ambience: AmbienceId }> = {
  main_menu: { music: 'menu', ambience: 'none' },
  name_entry: { music: 'menu', ambience: 'none' },
  hub: { music: 'bath', ambience: 'steam' },
  hub_epidemic: { music: 'tense', ambience: 'wind' },
  hub_festival: { music: 'market', ambience: 'crowd' },
  hub_monastery: { music: 'monastery', ambience: 'none' },
  hub_war: { music: 'war', ambience: 'camp' },
  bathhouse: { music: 'bath', ambience: 'steam' },
  treatment: { music: 'bath', ambience: 'steam' },
  treatment_blood: { music: 'tense', ambience: 'steam' },
  travel_map: { music: 'road', ambience: 'wind' },
  travel_result: { music: 'travel_result', ambience: 'wind' },
  market: { music: 'market', ambience: 'crowd' },
  dialogue: { music: 'dialogue', ambience: 'none' },
  dialogue_tense: { music: 'tense', ambience: 'none' },
  property: { music: 'family', ambience: 'fire' },
  study: { music: 'monastery', ambience: 'none' },
  mentors: { music: 'monastery', ambience: 'none' },
  journal: { music: 'dialogue', ambience: 'none' },
  staff: { music: 'bath', ambience: 'steam' },
  family: { music: 'family', ambience: 'fire' },
  politics: { music: 'politics', ambience: 'none' },
  settings: { music: 'menu', ambience: 'none' },
  codex: { music: 'monastery', ambience: 'none' },
  ending: { music: 'ending', ambience: 'none' },
  city_event: { music: 'dialogue', ambience: 'crowd' },
};

/** Volume values are always 0..1. */
function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

class AudioManager {
  private ctx: AudioContext | null = null;
  private unlocked = false;
  private master = 0.72;
  private musicVol = 0.32;
  private sfxVol = 0.55;
  private ambVol = 0.18;
  private muted = false;
  private musicNodes: { stop: () => void } | null = null;
  private ambNodes: { stop: () => void } | null = null;
  private currentMusic: MusicId = 'none';
  private currentAmb: AmbienceId = 'none';
  private currentContext: AudioContextId | null = null;
  private _visBound = false;

  get isMuted(): boolean {
    return this.muted;
  }

  get contextId(): AudioContextId | null {
    return this.currentContext;
  }

  async unlock(): Promise<void> {
    try {
      if (!this.ctx) {
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new Ctx();
      }
      if (this.ctx.state === 'suspended') {
        // Never let audio block the UI. Chrome leaves this promise pending
        // indefinitely when it doesn't consider the interaction a user gesture,
        // which would otherwise freeze any caller that awaits unlock() before
        // navigating (e.g. the main menu's New Journey / Continue buttons).
        await Promise.race([
          this.ctx.resume(),
          new Promise((resolve) => setTimeout(resolve, 350)),
        ]);
      }
      this.unlocked = this.ctx.state === 'running';
      if (!this._visBound) {
        this._visBound = true;
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible' && this.ctx?.state === 'suspended') {
            void this.ctx.resume();
          }
        });
      }
    } catch {
      this.unlocked = false;
    }
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (m) {
      this.stopMusic();
      this.stopAmbience();
    } else if (this.currentContext) {
      void this.setContext(this.currentContext, true);
    } else if (this.currentMusic !== 'none') {
      void this.music(this.currentMusic);
    }
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  setMaster(v: number): void {
    this.master = clamp01(v);
    // Gain is baked in when a node is built, so a live track has to be rebuilt
    // for a volume change to be audible.
    this.refreshBeds();
  }

  setMusicVolume(v: number): void {
    this.musicVol = clamp01(v);
    this.refreshBeds();
  }

  setSfxVolume(v: number): void {
    // Applied at the next sfx() call — nothing to rebuild.
    this.sfxVol = clamp01(v);
  }

  setAmbienceVolume(v: number): void {
    this.ambVol = clamp01(v);
    this.refreshBeds();
  }

  get masterVolume(): number {
    return this.master;
  }
  get musicVolume(): number {
    return this.musicVol;
  }
  get sfxVolume(): number {
    return this.sfxVol;
  }
  get ambienceVolume(): number {
    return this.ambVol;
  }

  /** Rebuild the currently playing music/ambience so new gains take effect. */
  private refreshBeds(): void {
    if (this.muted || !this.unlocked) return;
    if (this.currentContext) {
      void this.setContext(this.currentContext, true);
    } else if (this.currentMusic !== 'none') {
      void this.music(this.currentMusic);
    }
  }

  /** Apply persisted settings. Call once after state load. */
  applyVolumeSettings(v: {
    master?: number;
    music?: number;
    sfx?: number;
    ambience?: number;
  }): void {
    if (v.master !== undefined) this.master = clamp01(v.master);
    if (v.music !== undefined) this.musicVol = clamp01(v.music);
    if (v.sfx !== undefined) this.sfxVol = clamp01(v.sfx);
    if (v.ambience !== undefined) this.ambVol = clamp01(v.ambience);
    this.refreshBeds();
  }

  private gMusic(): number {
    if (this.muted || !this.unlocked || !this.ctx) return 0;
    return this.musicVol * this.master;
  }

  private gSfx(): number {
    if (this.muted || !this.unlocked || !this.ctx) return 0;
    return this.sfxVol * this.master;
  }

  private gAmb(): number {
    if (this.muted || !this.unlocked || !this.ctx) return 0;
    return this.ambVol * this.master;
  }

  /** Switch music + ambience for a game screen. No-ops if same context. */
  async setContext(id: AudioContextId, force = false): Promise<void> {
    if (!force && this.currentContext === id) return;
    this.currentContext = id;
    const map = CONTEXT_MAP[id];
    await this.unlock();
    await this.music(map.music);
    this.ambience(map.ambience);
  }

  /** Pick hub variant from game state */
  async setHubContext(opts: {
    epidemic?: boolean;
    festival?: boolean;
    locationId?: string;
  }): Promise<void> {
    if (opts.epidemic) return this.setContext('hub_epidemic');
    if (opts.locationId === 'monastery_ebrach') return this.setContext('hub_monastery');
    if (opts.locationId === 'war_camp') return this.setContext('hub_war');
    if (opts.festival) return this.setContext('hub_festival');
    return this.setContext('hub');
  }

  // ─── SFX ─────────────────────────────────────────────────

  sfx(id: SfxId): void {
    if (!this.ctx || this.muted) return;
    void this.unlock();
    const g = this.gSfx();
    if (g <= 0) return;

    switch (id) {
      case 'click':
        this.beep(720, 0.035, g * 0.18, 'triangle');
        this.noise(0.025, g * 0.06, 2000);
        break;
      case 'coin':
        this.beep(988, 0.05, g * 0.28, 'triangle');
        this.beep(1319, 0.09, g * 0.2, 'triangle', 0.04);
        this.beep(1568, 0.06, g * 0.12, 'sine', 0.09);
        break;
      case 'success':
        this.beep(392, 0.1, g * 0.22, 'sine');
        this.beep(494, 0.12, g * 0.2, 'sine', 0.1);
        this.beep(587, 0.16, g * 0.18, 'triangle', 0.2);
        this.beep(784, 0.22, g * 0.14, 'sine', 0.32);
        break;
      case 'partial':
        this.beep(330, 0.12, g * 0.2, 'triangle');
        this.beep(392, 0.14, g * 0.15, 'sine', 0.1);
        this.noise(0.08, g * 0.08, 600);
        break;
      case 'fail':
        this.beep(185, 0.18, g * 0.22, 'sawtooth');
        this.beep(147, 0.22, g * 0.18, 'triangle', 0.08);
        break;
      case 'death':
        this.beep(98, 0.45, g * 0.28, 'sawtooth');
        this.beep(73, 0.55, g * 0.22, 'sine', 0.12);
        this.noise(0.35, g * 0.1, 200);
        break;
      case 'splash':
        this.noise(0.12, g * 0.22, 600);
        this.noise(0.08, g * 0.12, 1200, 0.04);
        this.beep(180, 0.06, g * 0.08, 'sine');
        break;
      case 'steam':
        this.noise(0.4, g * 0.12, 1800);
        this.noise(0.35, g * 0.08, 3200, 0.05);
        break;
      case 'door':
        this.beep(140, 0.07, g * 0.2, 'square');
        this.beep(95, 0.12, g * 0.18, 'triangle', 0.05);
        this.noise(0.06, g * 0.1, 400);
        break;
      case 'cart':
        this.noise(0.2, g * 0.14, 300);
        this.beep(85, 0.15, g * 0.12, 'triangle');
        this.noise(0.12, g * 0.08, 500, 0.08);
        this.beep(70, 0.1, g * 0.08, 'triangle', 0.12);
        break;
      case 'horse':
        this.beep(200, 0.08, g * 0.14, 'sawtooth');
        this.beep(145, 0.14, g * 0.12, 'sawtooth', 0.07);
        this.noise(0.08, g * 0.08, 800, 0.05);
        break;
      case 'page':
        this.noise(0.05, g * 0.14, 2500);
        this.noise(0.04, g * 0.08, 4000, 0.03);
        break;
      case 'hover':
        this.beep(540, 0.018, g * 0.06, 'sine');
        break;
      case 'market':
        this.beep(330, 0.04, g * 0.08, 'triangle');
        this.beep(392, 0.04, g * 0.07, 'triangle', 0.05);
        this.beep(440, 0.04, g * 0.06, 'triangle', 0.1);
        this.noise(0.15, g * 0.05, 1000);
        break;
      case 'razor':
        this.noise(0.07, g * 0.14, 4500);
        this.beep(1800, 0.03, g * 0.08, 'square');
        this.noise(0.04, g * 0.08, 6000, 0.04);
        break;
      case 'lancet':
        this.beep(2400, 0.02, g * 0.12, 'square');
        this.noise(0.04, g * 0.1, 3000);
        this.beep(400, 0.08, g * 0.1, 'sine', 0.03);
        break;
      case 'leech':
        this.noise(0.15, g * 0.1, 400);
        this.beep(120, 0.2, g * 0.08, 'sine');
        this.beep(90, 0.15, g * 0.06, 'triangle', 0.1);
        break;
      case 'cupping':
        this.beep(160, 0.15, g * 0.12, 'sine');
        this.noise(0.2, g * 0.1, 200);
        this.beep(200, 0.1, g * 0.08, 'sine', 0.12);
        break;
      case 'bell':
        this.beep(784, 0.4, g * 0.2, 'sine');
        this.beep(1176, 0.35, g * 0.1, 'sine', 0.02);
        this.beep(1568, 0.25, g * 0.06, 'sine', 0.04);
        break;
      case 'church':
        this.beep(196, 0.6, g * 0.18, 'sine');
        this.beep(247, 0.55, g * 0.12, 'sine', 0.05);
        this.beep(294, 0.5, g * 0.08, 'sine', 0.1);
        break;
      case 'guild':
        this.beep(220, 0.1, g * 0.15, 'square');
        this.beep(165, 0.15, g * 0.12, 'triangle', 0.08);
        this.noise(0.05, g * 0.08, 800);
        break;
      case 'fire':
        this.noise(0.3, g * 0.1, 800);
        this.noise(0.25, g * 0.06, 2000, 0.05);
        break;
      case 'wood':
        this.noise(0.06, g * 0.14, 600);
        this.beep(110, 0.08, g * 0.1, 'triangle');
        break;
      case 'crowd':
        this.noise(0.25, g * 0.08, 500);
        this.beep(200, 0.1, g * 0.04, 'triangle');
        this.beep(260, 0.08, g * 0.03, 'triangle', 0.1);
        break;
      case 'marry':
        this.beep(392, 0.15, g * 0.2, 'sine');
        this.beep(523, 0.18, g * 0.18, 'sine', 0.12);
        this.beep(659, 0.25, g * 0.16, 'triangle', 0.28);
        this.beep(784, 0.35, g * 0.12, 'sine', 0.45);
        break;
      case 'save':
        this.beep(523, 0.08, g * 0.15, 'triangle');
        this.beep(659, 0.1, g * 0.12, 'sine', 0.07);
        break;
      case 'load':
        this.beep(392, 0.08, g * 0.14, 'sine');
        this.beep(330, 0.1, g * 0.12, 'triangle', 0.08);
        break;
      case 'night':
        this.beep(110, 0.4, g * 0.1, 'sine');
        this.noise(0.3, g * 0.05, 300);
        break;
      case 'wound':
        this.noise(0.1, g * 0.12, 1500);
        this.beep(180, 0.12, g * 0.1, 'sawtooth');
        break;
      case 'pulse':
        this.beep(80, 0.06, g * 0.14, 'sine');
        this.beep(80, 0.06, g * 0.1, 'sine', 0.18);
        break;
      default:
        this.beep(440, 0.05, g * 0.15, 'sine');
    }
  }

  /** Technique-aware treatment SFX */
  sfxForTechnique(techId: string, outcome: 'success' | 'partial' | 'fail' | 'death'): void {
    if (techId === 'shave' || techId === 'haircut') this.sfx('razor');
    else if (techId === 'bloodletting') this.sfx('lancet');
    else if (techId === 'leeches') this.sfx('leech');
    else if (techId === 'cupping') this.sfx('cupping');
    else if (techId === 'bath_wash' || techId === 'sweat_bath') this.sfx('splash');
    else if (techId.includes('wound') || techId.includes('battlefield') || techId.includes('abscess'))
      this.sfx('wound');
    else if (techId.includes('herb') || techId.includes('poultice') || techId.includes('draught'))
      this.sfx('steam');
    else this.sfx('click');

    if (outcome === 'success') this.sfx('success');
    else if (outcome === 'partial') this.sfx('partial');
    else if (outcome === 'death') this.sfx('death');
    else this.sfx('fail');
  }

  // ─── Low-level synth ─────────────────────────────────────

  private beep(
    freq: number,
    dur: number,
    vol: number,
    type: OscillatorType,
    delay = 0,
  ): void {
    if (!this.ctx || vol <= 0) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = Math.min(4000, freq * 4);
    osc.type = type;
    osc.frequency.value = freq;
    const t0 = this.ctx.currentTime + delay;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  private noise(dur: number, vol: number, hpFreq: number, delay = 0): void {
    if (!this.ctx || vol <= 0) return;
    const bufferSize = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // Soft noise (less harsh)
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = hpFreq;
    filter.Q.value = 0.7;
    const gain = this.ctx.createGain();
    const t0 = this.ctx.currentTime + delay;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(t0);
  }

  // ─── Music ───────────────────────────────────────────────

  stopMusic(): void {
    if (this.musicNodes) {
      this.musicNodes.stop();
      this.musicNodes = null;
    }
  }

  async music(id: MusicId): Promise<void> {
    if (id === this.currentMusic && this.musicNodes) return;
    this.currentMusic = id;
    this.stopMusic();
    if (id === 'none') return;
    await this.unlock();
    if (!this.ctx || this.muted) return;

    const vol = this.gMusic();
    if (vol <= 0) return;

    const spec = THEMES[id];
    const ctx = this.ctx;
    const master = ctx.createGain();
    master.gain.value = 0;
    // Fade in
    master.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.6);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = spec.lowpass ?? 2000;
    filter.Q.value = 0.5;
    master.connect(filter);
    filter.connect(ctx.destination);

    const oscillators: OscillatorNode[] = [];
    const gains: GainNode[] = [];

    spec.drones.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = spec.droneTypes[i] ?? 'sine';
      osc.frequency.value = freq;
      // Slight detune for richness
      osc.detune.value = (i - 1) * 4;
      g.gain.value = (spec.droneVol[i] ?? 0.1) * 0.9;
      osc.connect(g);
      g.connect(master);
      osc.start();
      oscillators.push(osc);
      gains.push(g);
    });

    if (spec.padFifth && spec.drones[0]) {
      const pad = ctx.createOscillator();
      const pg = ctx.createGain();
      pad.type = 'sine';
      pad.frequency.value = spec.drones[0] * 1.5;
      pg.gain.value = 0.04;
      pad.connect(pg);
      pg.connect(master);
      pad.start();
      oscillators.push(pad);
      gains.push(pg);
    }

    // Master LFO
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = spec.lfoRate;
    lfoGain.gain.value = spec.lfoDepth * vol;
    lfo.connect(lfoGain);
    lfoGain.connect(master.gain);
    lfo.start();
    oscillators.push(lfo);

    // Percussive pulse (road / war)
    let pulseTimer: number | null = null;
    if (spec.pulseRate && spec.pulseFreq) {
      const beat = () => {
        if (this.muted || this.currentMusic !== id) return;
        this.beep(spec.pulseFreq!, 0.06, this.gMusic() * (spec.pulseVol ?? 0.05), 'triangle');
        this.noise(0.04, this.gMusic() * (spec.pulseVol ?? 0.05) * 0.5, 200);
        pulseTimer = window.setTimeout(beat, 1000 / (spec.pulseRate ?? 1));
      };
      pulseTimer = window.setTimeout(beat, 400);
    }

    // Melodic plucks — sequential through motif with variation
    let noteIdx = 0;
    let pluckTimer: number | null = null;
    const pluck = () => {
      if (this.muted || this.currentMusic !== id) return;
      const notes = spec.notes;
      // Mostly walk the motif, occasional jump
      if (Math.random() < 0.75) noteIdx = (noteIdx + 1) % notes.length;
      else noteIdx = Math.floor(Math.random() * notes.length);
      const n = notes[noteIdx]!;
      // Soft attack pluck
      this.beep(n, spec.noteDur, this.gMusic() * spec.noteVol, spec.noteType);
      // Quiet octave double sometimes
      if (Math.random() < 0.25) {
        this.beep(n * 2, spec.noteDur * 0.6, this.gMusic() * spec.noteVol * 0.35, 'sine', 0.02);
      }
      const wait =
        spec.noteInterval[0] + Math.random() * (spec.noteInterval[1] - spec.noteInterval[0]);
      pluckTimer = window.setTimeout(pluck, wait);
    };
    pluckTimer = window.setTimeout(pluck, 500 + Math.random() * 400);

    this.musicNodes = {
      stop: () => {
        // Fade out
        try {
          master.gain.cancelScheduledValues(ctx.currentTime);
          master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
          master.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        } catch {
          /* ignore */
        }
        const stopAt = ctx.currentTime + 0.4;
        for (const osc of oscillators) {
          try {
            osc.stop(stopAt);
          } catch {
            /* already */
          }
        }
        if (pluckTimer) clearTimeout(pluckTimer);
        if (pulseTimer) clearTimeout(pulseTimer);
        window.setTimeout(() => {
          try {
            master.disconnect();
            filter.disconnect();
          } catch {
            /* ignore */
          }
        }, 450);
      },
    };
  }

  // ─── Ambience loops ──────────────────────────────────────

  stopAmbience(): void {
    if (this.ambNodes) {
      this.ambNodes.stop();
      this.ambNodes = null;
    }
    this.currentAmb = 'none';
  }

  ambience(id: AmbienceId): void {
    if (id === this.currentAmb && this.ambNodes) return;
    this.stopAmbience();
    this.currentAmb = id;
    if (id === 'none' || !this.ctx || this.muted) return;
    const vol = this.gAmb();
    if (vol <= 0) return;

    const ctx = this.ctx;
    const master = ctx.createGain();
    master.gain.value = 0;
    master.gain.linearRampToValueAtTime(vol, ctx.currentTime + 1.2);
    master.connect(ctx.destination);

    const timers: number[] = [];
    const sources: AudioNode[] = [];

    const schedule = (fn: () => void, ms: number) => {
      const id = window.setTimeout(fn, ms);
      timers.push(id);
      return id;
    };

    if (id === 'steam') {
      const loop = () => {
        if (this.currentAmb !== 'steam' || this.muted) return;
        this.noise(0.5 + Math.random() * 0.4, this.gAmb() * 0.35, 2000 + Math.random() * 1500);
        this.noise(0.3, this.gAmb() * 0.15, 3500, 0.1);
        schedule(loop, 800 + Math.random() * 1200);
      };
      schedule(loop, 200);
    } else if (id === 'crowd') {
      const loop = () => {
        if (this.currentAmb !== 'crowd' || this.muted) return;
        this.noise(0.35, this.gAmb() * 0.25, 600 + Math.random() * 400);
        if (Math.random() < 0.4) this.beep(200 + Math.random() * 200, 0.08, this.gAmb() * 0.08, 'triangle');
        schedule(loop, 400 + Math.random() * 600);
      };
      schedule(loop, 100);
    } else if (id === 'wind') {
      const loop = () => {
        if (this.currentAmb !== 'wind' || this.muted) return;
        this.noise(0.8 + Math.random() * 0.5, this.gAmb() * 0.3, 400 + Math.random() * 300);
        schedule(loop, 600 + Math.random() * 800);
      };
      schedule(loop, 150);
    } else if (id === 'fire') {
      const loop = () => {
        if (this.currentAmb !== 'fire' || this.muted) return;
        this.noise(0.2, this.gAmb() * 0.28, 900 + Math.random() * 800);
        this.noise(0.12, this.gAmb() * 0.12, 2000, 0.05);
        schedule(loop, 250 + Math.random() * 350);
      };
      schedule(loop, 100);
    } else if (id === 'camp') {
      const loop = () => {
        if (this.currentAmb !== 'camp' || this.muted) return;
        this.noise(0.3, this.gAmb() * 0.2, 500);
        if (Math.random() < 0.3) this.beep(90 + Math.random() * 40, 0.1, this.gAmb() * 0.1, 'triangle');
        schedule(loop, 500 + Math.random() * 700);
      };
      schedule(loop, 200);
    }

    this.ambNodes = {
      stop: () => {
        try {
          master.gain.cancelScheduledValues(ctx.currentTime);
          master.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        } catch {
          /* ignore */
        }
        for (const t of timers) clearTimeout(t);
        for (const s of sources) {
          try {
            (s as OscillatorNode).stop?.();
          } catch {
            /* ignore */
          }
        }
        window.setTimeout(() => {
          try {
            master.disconnect();
          } catch {
            /* ignore */
          }
        }, 500);
      },
    };
  }
}

export const audio = new AudioManager();
