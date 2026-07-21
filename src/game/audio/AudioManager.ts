/**
 * Procedural medieval-ish score & SFX via Web Audio API.
 * Themes change with scene/scenario; ambience layers match location mood.
 */

import { THEMES, type MusicId } from './themes';
import { trackFor, type Track } from './tracks';
export type { MusicId } from './themes';
import {
  MODES,
  droneFreqs,
  noteToSemitone,
  semitoneToFreq,
  varyPhrase,
  type ModeName,
} from './theory';

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
  /** Impulse responses are expensive to build; keyed by room size. */
  private irCache = new Map<number, AudioBuffer>();
  /** Incremented per music() call; stale calls abort. See the guard there. */
  private musicGeneration = 0;
  /** The streaming <audio> element for the current recorded track, if any. */
  private trackEl: HTMLAudioElement | null = null;
  /** Gain of the track currently playing, before volume settings. */
  private trackGain = 1;
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
      this.stopTrack();
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
    // A streaming track only needs its volume set; rebuilding it would restart
    // the piece from the beginning on every slider nudge.
    if (this.trackEl) {
      this.refreshTrackVolume();
      return;
    }
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

  /**
   * Play a recorded track, crossfading out whatever was playing.
   *
   * Uses an `<audio>` element rather than Phaser's loader: Phaser decodes into
   * memory, and fifteen megabytes of music decoded to PCM is roughly 150 MB,
   * which is unreasonable on a phone. This streams and loops natively.
   */
  private playTrack(track: Track, vol: number): void {
    this.stopTrack();
    const el = new Audio(`assets/music/${track.file}.mp3`);
    el.loop = true;
    el.preload = 'auto';
    el.volume = 0;
    this.trackEl = el;
    this.trackGain = track.gain;

    // Autoplay is blocked until a gesture; that is expected and not an error.
    void el.play().catch(() => {
      /* Will start on the next call after the player has interacted. */
    });

    // Fade in by hand — <audio> has no ramp, and jumping to full volume on a
    // scene change is jarring.
    const target = vol * track.gain;
    const steps = 12;
    let i = 0;
    const fade = window.setInterval(() => {
      i++;
      if (!this.trackEl || this.trackEl !== el) {
        window.clearInterval(fade);
        return;
      }
      el.volume = Math.min(1, Math.max(0, (target * i) / steps));
      if (i >= steps) window.clearInterval(fade);
    }, 40);
  }

  private stopTrack(): void {
    const el = this.trackEl;
    if (!el) return;
    this.trackEl = null;
    // Fade out then release, so a scene change does not cut the music dead.
    let v = el.volume;
    const fade = window.setInterval(() => {
      v -= 0.12;
      if (v <= 0) {
        window.clearInterval(fade);
        el.pause();
        el.src = '';
        return;
      }
      el.volume = Math.max(0, v);
    }, 40);
  }

  /** Push a volume change into a track that is already playing. */
  private refreshTrackVolume(): void {
    if (this.trackEl) {
      this.trackEl.volume = Math.min(1, Math.max(0, this.gMusic() * this.trackGain));
    }
  }

  /**
   * Start a theme.
   *
   * The previous implementation drove the melody from `setTimeout` with a
   * randomised gap of 900-1600 ms and walked a note list at random. That
   * produces no pulse and no phrasing — the ear hears scattered tones rather
   * than music, which was the main reason the score sounded poor.
   *
   * This schedules against `ctx.currentTime` on a lookahead window, so notes
   * land on a real beat grid regardless of main-thread jitter, and draws its
   * material from the theme's phrases rather than from a random walk.
   */
  async music(id: MusicId): Promise<void> {
    if (id === this.currentMusic && this.musicNodes) return;

    // Generation guard. `await this.unlock()` below opens a window in which a
    // second call can arrive: both run `stopMusic()` while `musicNodes` is
    // still null, then both assign — and the first graph is overwritten while
    // its oscillators are still running, with nothing left holding a reference
    // to stop them. Two quick scene changes were enough to strand a drone
    // forever, and they accumulate in unrelated keys until the score is mud.
    const gen = ++this.musicGeneration;
    this.currentMusic = id;
    this.stopMusic();
    if (id === 'none') return;
    await this.unlock();
    if (gen !== this.musicGeneration) return;
    if (!this.ctx || this.muted) return;

    const vol = this.gMusic();
    if (vol <= 0) return;

    // A recorded track wins where one exists. Contexts without one fall
    // through to the procedural engine below — `dialogue` and `night` are
    // deliberately left synthetic, because a sparse drone under dialogue is
    // exactly what that wants.
    const track = trackFor(id);
    if (track) {
      this.playTrack(track, vol);
      this.musicNodes = { stop: () => this.stopTrack() };
      return;
    }
    this.stopTrack();

    const spec = THEMES[id];
    const ctx = this.ctx;

    // ── Signal chain ──────────────────────────────────────────────────
    // Everything in the theme runs through `bus`. The old code connected the
    // drones here but sent the melody straight to `ctx.destination`, so the
    // theme's lowpass, its LFO and — worst — its fade-out never applied to the
    // notes. Scene changes left plucks ringing over the next screen.
    const bus = ctx.createGain();
    bus.gain.value = 0;
    bus.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.8);

    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = spec.lowpass;
    tone.Q.value = 0.4;
    bus.connect(tone);

    // Reverb, so the score is not bone dry. A nave gets far more than a road.
    const dry = ctx.createGain();
    dry.gain.value = 1 - spec.reverb * 0.5;
    tone.connect(dry);
    dry.connect(ctx.destination);

    const convolver = ctx.createConvolver();
    convolver.buffer = this.impulseResponse(spec.reverb);
    const wet = ctx.createGain();
    wet.gain.value = spec.reverb;
    tone.connect(convolver);
    convolver.connect(wet);
    wet.connect(ctx.destination);

    const oscillators: OscillatorNode[] = [];

    // ── Drone ─────────────────────────────────────────────────────────
    const drones = droneFreqs(spec.root, spec.droneOctave);
    drones.forEach((freq, i) => {
      // Two oscillators per drone voice, slightly apart, so it beats gently
      // instead of sitting dead still.
      for (const cents of [-4, 4]) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = i === 0 ? 'sawtooth' : 'triangle';
        osc.frequency.value = freq;
        osc.detune.value = cents;
        g.gain.value = (spec.droneVol / drones.length) * (i === 0 ? 1 : 0.55);
        osc.connect(g);
        g.connect(bus);
        osc.start();
        oscillators.push(osc);
      }
    });

    // Slow breath on the whole bed.
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = vol * 0.05;
    lfo.connect(lfoGain);
    lfoGain.connect(bus.gain);
    lfo.start();
    oscillators.push(lfo);

    // ── Lookahead scheduler ───────────────────────────────────────────
    const secPerBeat = 60 / spec.bpm;
    const rootSemi = noteToSemitone(spec.root) + spec.melodyOctave * 12;
    let nextTime = ctx.currentTime + 0.9; // let the drone establish first
    let phraseIdx = 0;
    let beatCount = 0;

    const scheduleAhead = () => {
      if (this.muted || this.currentMusic !== id) return;
      // Fill the next second of music. Anything already scheduled in the audio
      // clock keeps its timing even if this callback runs late.
      while (nextTime < ctx.currentTime + 1.0) {
        const phrase = varyPhrase(
          spec.phrases[phraseIdx % spec.phrases.length]!,
          Math.random,
        );
        phraseIdx++;

        let t = nextTime;
        phrase.degrees.forEach((deg, i) => {
          const beats = phrase.beats[i]!;
          const freq = this.degreeToFreq(rootSemi, spec.mode, deg);
          this.pluck(freq, beats * secPerBeat, this.gMusic() * spec.melodyVol, bus, t);
          // A quiet octave above on longer notes, like a citole's course.
          if (beats >= 2 && Math.random() < 0.3) {
            this.pluck(freq * 2, beats * secPerBeat * 0.5,
              this.gMusic() * spec.melodyVol * 0.25, bus, t + 0.03);
          }
          t += beats * secPerBeat;
        });

        // Rest, rounded to whole bars so the pulse survives the silence.
        const restBars =
          spec.restBars[0] +
          Math.floor(Math.random() * (spec.restBars[1] - spec.restBars[0] + 1));
        nextTime = t + restBars * spec.beatsPerBar * secPerBeat;
      }

      // Drum, on its own grid.
      if (spec.drum) {
        const d = spec.drum;
        while (beatCount * secPerBeat < nextTime - ctx.currentTime + 1.0) {
          const at = ctx.currentTime + beatCount * secPerBeat;
          if (at > ctx.currentTime && beatCount % d.everyBeats === 0) {
            this.drumHit(d.freq, this.gMusic() * d.vol, bus, at);
          }
          beatCount++;
        }
      }
    };

    scheduleAhead();
    const timer = window.setInterval(scheduleAhead, 250);

    const nodes = {
      stop: () => {
        window.clearInterval(timer);
        try {
          bus.gain.cancelScheduledValues(ctx.currentTime);
          bus.gain.setValueAtTime(bus.gain.value, ctx.currentTime);
          bus.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        } catch {
          /* ignore */
        }
        const stopAt = ctx.currentTime + 0.55;
        for (const osc of oscillators) {
          try {
            osc.stop(stopAt);
          } catch {
            /* already stopped */
          }
        }
        window.setTimeout(() => {
          for (const n of [bus, tone, dry, convolver, wet]) {
            try {
              n.disconnect();
            } catch {
              /* ignore */
            }
          }
        }, 700);
      },
    };

    // Building the graph is synchronous, but `unlock()` above was not — check
    // once more before publishing, and tear down immediately if this call has
    // already been superseded. Without this the drone would outlive its owner.
    if (gen !== this.musicGeneration) {
      nodes.stop();
      return;
    }
    this.musicNodes = nodes;
  }

  /** Frequency of a scale degree above a root, in a mode. */
  private degreeToFreq(rootSemi: number, mode: ModeName, degree: number): number {
    const steps = MODES[mode];
    const octave = Math.floor(degree / steps.length);
    const idx = ((degree % steps.length) + steps.length) % steps.length;
    return semitoneToFreq(rootSemi + steps[idx]! + octave * 12);
  }

  /**
   * A plucked string, rather than the flat `beep` every note used to be.
   *
   * Three things make it read as an instrument: two detuned oscillators, a
   * fast attack with a long decay, and a filter that closes as the note dies —
   * which is what a real plucked string does as its higher partials fade.
   */
  private pluck(
    freq: number,
    dur: number,
    vol: number,
    dest: AudioNode,
    at: number,
  ): void {
    if (!this.ctx || vol <= 0) return;
    const ctx = this.ctx;
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(Math.min(7000, freq * 7), at);
    f.frequency.exponentialRampToValueAtTime(Math.max(200, freq * 1.6), at + dur * 0.8);
    f.Q.value = 1.1;

    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);

    for (const [type, cents, mix] of [
      ['triangle', -5, 1],
      ['sawtooth', 5, 0.28],
    ] as const) {
      const osc = ctx.createOscillator();
      const og = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      osc.detune.value = cents;
      og.gain.value = mix;
      osc.connect(og);
      og.connect(f);
      osc.start(at);
      osc.stop(at + dur + 0.05);
    }
    f.connect(g);
    g.connect(dest);
  }

  /** Soft tabor / cart thud. Pitch drops as it decays, like a struck skin. */
  private drumHit(freq: number, vol: number, dest: AudioNode, at: number): void {
    if (!this.ctx || vol <= 0) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, at);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.6, at + 0.12);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
    osc.connect(g);
    g.connect(dest);
    osc.start(at);
    osc.stop(at + 0.3);
  }

  /**
   * Synthetic impulse response — exponentially decaying noise.
   *
   * Cached per room size, because building one allocates a couple of seconds
   * of stereo audio and themes change often.
   */
  private impulseResponse(amount: number): AudioBuffer | null {
    if (!this.ctx) return null;
    const key = Math.round(amount * 10);
    const cached = this.irCache.get(key);
    if (cached) return cached;

    const ctx = this.ctx;
    const seconds = 0.8 + amount * 2.4;
    const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        // Steeper decay for small rooms; the tail is what sells a big space.
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2 + (1 - amount) * 2);
      }
    }
    this.irCache.set(key, buf);
    return buf;
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
