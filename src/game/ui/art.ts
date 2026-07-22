import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../types';
import { getState } from '../state';
import { sceneBackground, type BackgroundOpts } from './fx';
import type { HouseholdFocus, PatientClass, StaffRole } from '../types';

/** Location → painted background key */
export function bgKeyForLocation(locationId: string): string {
  switch (locationId) {
    case 'nurnberg':
      return 'bg_nurnberg';
    case 'monastery_ebrach':
      return 'bg_monastery';
    case 'war_camp':
      return 'bg_warcamp';
    case 'rothenburg':
      return 'bg_rothenburg';
    case 'bamberg':
      return 'bg_bamberg';
    case 'wurzburg':
      return 'bg_wurzburg';
    case 'augsburg':
      return 'bg_augsburg';
    case 'small_village':
      return 'bg_market';
    case 'road_camp':
      return 'bg_road';
    default:
      return 'art_bath';
  }
}

/** Portrait pools per class — first entry is the original single face */
/**
 * Portrait pools, split by sex.
 *
 * They used to be one list per class, so a patient named from the male list
 * could be handed a female face — "Claus Gerber" drawing `port_artisan2`, who
 * is plainly a woman. Ten of the 25 portraits are female, so it was common.
 *
 * `soldier` has no female pool: town militia and campaign soldiery were men,
 * and inventing a woman-at-arms to fill the table would be worse than falling
 * back to the peasant faces, which is what `poolFor` does.
 */
const CLASS_PORTRAIT_POOLS: Record<PatientClass, { m: string[]; f: string[] }> = {
  peasant: {
    m: ['port_peasant', 'port_peasant3'],
    f: ['port_peasant2', 'port_peasant4', 'port_woman'],
  },
  artisan: { m: ['port_artisan', 'port_artisan3'], f: ['port_artisan2'] },
  merchant: { m: ['port_merchant'], f: ['port_merchant2'] },
  soldier: { m: ['port_soldier', 'port_soldier2', 'port_soldier3'], f: [] },
  clergy: { m: ['port_clergy'], f: ['port_clergy2', 'port_adelheid'] },
  noble: { m: ['port_merchant'], f: ['port_noble', 'port_noble2'] },
  beggar: { m: ['port_beggar1', 'port_sick'], f: ['port_beggar2'] },
};

/** Falls back to the other sex, then to peasants, rather than returning []. */
function poolFor(cls: PatientClass, female: boolean): string[] {
  const p = CLASS_PORTRAIT_POOLS[cls] ?? CLASS_PORTRAIT_POOLS.peasant;
  const want = female ? p.f : p.m;
  if (want.length) return want;
  const other = female ? p.m : p.f;
  if (other.length) return other;
  const peas = CLASS_PORTRAIT_POOLS.peasant;
  return female ? peas.f : peas.m;
}

/** Stable pick so the same patient keeps the same face if re-rendered */
export function pickPortraitKey(
  patientClass: PatientClass,
  seed: string,
  female = false,
): string {
  const pool = poolFor(patientClass, female);
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return pool[h % pool.length]!;
}

/**
 * Paint the current location's background.
 *
 * Previously this drew the art at alpha 0.5 under a full-screen black rectangle,
 * which crushed the paintings. Now the art renders near full strength and we
 * darken only where text actually sits (see `sceneBackground`).
 */
export function addLocationBackground(scene: Phaser.Scene, opts: BackgroundOpts = {}): void {
  const s = getState();
  const key = bgKeyForLocation(s.locationId);
  sceneBackground(scene, key, {
    fallbacks: ['art_bath', 'bath_bg'],
    brightness: 0.82,
    topScrim: 120,
    bottomScrim: 90,
    depth: -12,
    ...opts,
  });
}

/**
 * Management-screen backdrop: painted art at low brightness under panels.
 * Falls back silently if the texture has not streamed in yet.
 */
/**
 * Backdrop for the management screens (Journal, Staff, Politics…).
 *
 * Darker than a gameplay background because panels and dense text sit on top,
 * but routed through `sceneBackground` so it still cover-fits and keeps its
 * contrast. Stacking `alpha 0.38` under a `0.42` black rectangle — as this did
 * — leaves roughly 22% of the painting visible, which is indistinguishable
 * from no background at all.
 */
export function addManagementBackground(scene: Phaser.Scene, key: string): void {
  sceneBackground(scene, key, {
    brightness: 0.46,
    depth: -12,
    topScrim: 70,
  });
}

/** Staff role → v1.1 portrait key (falls back via `addPortrait`). */
export function portraitKeyForStaffRole(role: StaffRole): string {
  switch (role) {
    case 'apprentice':
      return 'portrait_staff_apprentice_v11';
    case 'bathmaid':
      return 'portrait_staff_bathmaid_v11';
    case 'manager':
      return 'portrait_staff_manager_v11';
    case 'herb_boy':
      return 'portrait_staff_herbboy_v11';
    case 'nightwatch':
      return 'portrait_staff_nightwatch_v11';
    default:
      return 'portrait_staff_apprentice_v11';
  }
}

/** Household focus / elder → v1.1 family portrait. */
export function portraitKeyForHouseholdFocus(focus: HouseholdFocus | 'elder'): string {
  switch (focus) {
    case 'trade':
      return 'portrait_family_trade_v11';
    case 'kin':
      return 'portrait_family_kin_v11';
    case 'elder':
      return 'portrait_family_elder_v11';
    case 'home':
    default:
      return 'portrait_family_home_v11';
  }
}

/**
 * NPC portrait keys, with the dedicated art first and an honest stand-in
 * second.
 *
 * The first-choice keys (`port_gregor`, `port_ortlieb`, `port_guard`) are on
 * the ART_TODO_6 list; `addPortrait` falls back through `textures.exists`, so
 * until the files arrive the stand-ins render.
 *
 * Father Gregor's stand-in used to be `port_adelheid` — a monk with a woman's
 * face, the same defect class as "Claus Gerber" among the patients, and found
 * the same way: by checking the mapping against `FEMALE_PORTRAITS` instead of
 * trusting it.
 */
export function portraitKeyForNpc(speakerKey: string): string {
  const k = speakerKey.replace('npc.', 'npc_');
  if (k.includes('berthold')) return 'port_berthold';
  if (k.includes('adelheid')) return 'port_adelheid';
  if (k.includes('krafft')) return 'port_krafft';
  if (k.includes('ortlieb')) return 'port_ortlieb';
  if (k.includes('guard') || k.includes('captain')) return 'port_guard';
  if (k.includes('gregor') || k.includes('monk')) return 'port_gregor';
  return 'port_berthold';
}

/** Stand-ins until the dedicated NPC art arrives — all of the right sex. */
export const NPC_PORTRAIT_FALLBACKS: Record<string, string> = {
  port_gregor: 'port_clergy',
  port_ortlieb: 'port_merchant',
  port_guard: 'port_soldier',
};

export function portraitKeyForPatientClass(c: PatientClass, female = false): string {
  return poolFor(c, female)[0] ?? 'port_peasant';
}

/** Prefer template-specific portrait, then complaint specialty, then class variant pool */
export function portraitKeyForPatient(patient: {
  class: PatientClass;
  portraitKey?: string;
  complaintKey?: string;
  templateId?: string;
  uid?: string;
  female?: boolean;
}): string {
  if (patient.portraitKey) return patient.portraitKey;
  const c = patient.complaintKey ?? '';
  if (
    c.includes('tooth') ||
    c.includes('gum') ||
    c.includes('molar') ||
    c.includes('thrush') ||
    c.includes('canker') ||
    c.includes('quinsy') ||
    c.includes('tartar') ||
    c.includes('mouth')
  ) {
    return 'port_dental';
  }
  if (c.includes('fever') || c.includes('plague') || c.includes('jaundice') || c.includes('flux')) {
    return 'port_sick';
  }
  const seed = patient.uid ?? patient.templateId ?? patient.class;
  return pickPortraitKey(patient.class, seed, patient.female ?? false);
}

/**
 * Face crop box, as a fraction of the source image.
 *
 * The painted portraits are 1024x1024 with the head in the upper-middle. Drawing
 * the whole canvas into a 100px square produced an unreadable torso thumbnail,
 * so we zoom to the head and clip the rest away.
 */
const FACE_CROP = { cx: 0.5, cy: 0.34, w: 0.56 };

export interface PortraitOpts {
  size?: number;
  /** Draw the gold ring + shadow. Off for dense list rows. */
  frame?: boolean;
  /** Skip the face crop for art that is already a headshot. */
  crop?: boolean;
  depth?: number;
  /**
   * Stable per-subject string (a patient uid) used to choose between portrait
   * variants. Same seed always yields the same face, so a patient does not
   * change appearance when the scene re-renders.
   */
  seed?: string;
}

/** Cheap deterministic string hash — only needs to be stable, not uniform. */
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Resolve a base portrait key to one of its numbered variants.
 *
 * `port_peasant` will use `port_peasant2`, `port_peasant3`… when those files
 * are present. With 54 patient templates sharing 8 faces, variants are the
 * cheapest way to cut the repetition — and this needs no code change when the
 * art arrives, only the files (see ART_TODO_2.md).
 */
export function resolvePortraitVariant(
  scene: Phaser.Scene,
  baseKey: string,
  seed?: string,
): string {
  const variants = [baseKey];
  for (let n = 2; n <= 6; n++) {
    const k = `${baseKey}${n}`;
    if (!scene.textures.exists(k)) break;
    variants.push(k);
  }
  if (variants.length === 1 || !seed) return baseKey;
  return variants[hashString(seed) % variants.length]!;
}

/**
 * Portrait, cropped to the face, circle-masked and framed.
 *
 * Returns the image so callers can tween or tint it.
 */
export function addPortrait(
  scene: Phaser.Scene,
  x: number,
  y: number,
  key: string,
  opts: PortraitOpts | number = {},
): Phaser.GameObjects.Image | null {
  // Back-compat: older call sites passed a bare pixel size.
  const o: PortraitOpts = typeof opts === 'number' ? { size: opts } : opts;
  const size = o.size ?? 150;
  const doCrop = o.crop !== false;
  const doFrame = o.frame !== false;
  const depth = o.depth ?? 0;

  const wanted = resolvePortraitVariant(scene, key, o.seed);
  // The NPC stand-in comes before the generic peasant: until Grok delivers
  // `port_gregor`, Father Gregor should at least be *a monk*, not a farmhand.
  const tryKeys = [
    wanted,
    key,
    NPC_PORTRAIT_FALLBACKS[key] ?? '',
    'port_peasant',
    'art_portrait',
    'portrait_patient',
  ].filter(Boolean);
  const use = tryKeys.find((k) => scene.textures.exists(k));

  if (!use) {
    // Most portraits stream in after the menu (see ART_DEFERRED). Without this
    // a patient reached in the first seconds would show no face at all, for
    // good — same failure `sceneBackground` had.
    const onArrive = () => {
      if (!scene.scene.isActive()) return;
      addPortrait(scene, x, y, key, o);
    };
    scene.textures.once(`addtexture-${key}`, onArrive);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      scene.textures.off(`addtexture-${key}`, onArrive),
    );
    return null;
  }

  const img = scene.add.image(x, y, use).setDepth(depth + 1);
  img.disableInteractive();

  if (doCrop) {
    // `setCrop` rather than a geometry mask: Phaser 4 geometry masks did not
    // clip these images reliably, and cropping needs no extra display object.
    const src = scene.textures.get(use).getSourceImage();
    const sw = (src as { width: number }).width || 1;
    const sh = (src as { height: number }).height || 1;

    const side = Math.min(FACE_CROP.w * sw, sh);
    const cropX = Math.max(0, FACE_CROP.cx * sw - side / 2);
    const cropY = Math.max(0, Math.min(sh - side, FACE_CROP.cy * sh - side / 2));

    // Scale the whole frame so that the crop window alone measures `size`,
    // then offset the image so the crop centre lands on (x, y).
    const scale = size / side;
    img.setDisplaySize(sw * scale, sh * scale);
    img.setCrop(cropX, cropY, side, side);
    img.x = x + (sw / 2 - (cropX + side / 2)) * scale;
    img.y = y + (sh / 2 - (cropY + side / 2)) * scale;
  } else {
    img.setDisplaySize(size, size);
  }

  if (doFrame) {
    const half = size / 2;
    // Shadow below, frame above, so the border reads as a frame rather than
    // being overpainted by the portrait.
    const shadow = scene.add.graphics().setDepth(depth);
    shadow.fillStyle(0x0a0705, 0.45);
    shadow.fillRoundedRect(x - half + 4, y - half + 5, size, size, 6);

    if (scene.textures.exists('ui_frame_portrait')) {
      // Carved wooden frame with transparent centre (ART_TODO)
      const framePad = size * 0.22;
      const frameSize = size + framePad * 2;
      const frameImg = scene.add
        .image(x, y, 'ui_frame_portrait')
        .setDisplaySize(frameSize, frameSize)
        .setDepth(depth + 2);
      frameImg.disableInteractive();
    } else {
      const frame = scene.add.graphics().setDepth(depth + 2);
      frame.lineStyle(3, 0xc9a227, 0.9);
      frame.strokeRoundedRect(x - half, y - half, size, size, 6);
      frame.lineStyle(1, 0x1f140c, 0.5);
      frame.strokeRoundedRect(x - half - 3, y - half - 3, size + 6, size + 6, 8);
    }
  }

  return img;
}
