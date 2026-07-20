import type { PatientClass, PatientTemplate, Humor } from '../types';

/**
 * Period Franconian given names.
 *
 * `Klaus` and `Rupert` were modern/Salzburg forms and have become `Claus` and
 * `Ruprecht`. `Sebolt` is added — Nürnberg's own patron saint, a conspicuous
 * omission in a Nürnberg-centred game.
 */
/**
 * Portraits that depict a woman.
 *
 * Kept beside the name lists because the two have to agree: a template that
 * pins `portraitKey: 'port_noble'` must not then be handed a man's name. Lives
 * here rather than in `ui/art.ts` so `treatment.ts` can read it without
 * pulling in Phaser.
 */
export const FEMALE_PORTRAITS = new Set([
  'port_peasant2',
  'port_peasant4',
  'port_woman',
  'port_artisan2',
  'port_merchant2',
  'port_clergy2',
  'port_adelheid',
  'port_noble',
  'port_noble2',
  'port_beggar2',
]);

export const FIRST_NAMES_M = [
  'Hans', 'Peter', 'Claus', 'Otto', 'Dietrich', 'Ulrich', 'Fritz', 'Conrad',
  'Georg', 'Martin', 'Jakob', 'Thomas', 'Simon', 'Niklas',
  'Heinrich', 'Ludwig', 'Bertram', 'Albrecht', 'Ruprecht', 'Veit', 'Lorenz',
  'Sebolt', 'Cunz', 'Götz', 'Endres', 'Erhard',
];

/**
 * `Brigitte` is removed: St Birgitta of Sweden was canonised in 1391, after
 * the game's date, and her cult spread in Germany only in the 15th century.
 * `Sabine` was vanishingly rare in medieval Germany. `Greta` and `Cäcilie`
 * are given their period forms.
 */
export const FIRST_NAMES_F = [
  'Anna', 'Gret', 'Martha', 'Elsbeth', 'Katharina', 'Magdalena', 'Barbara',
  'Ursula', 'Agnes', 'Clara', 'Hedwig', 'Elisabeth', 'Dorothea', 'Irmgard',
  'Margarete', 'Kunigunde', 'Mechthild', 'Guda', 'Walburga', 'Cecilia',
  'Osanna',
];

/**
 * Surnames were the modern Germany-wide top-20 list. Corrected to Franconian
 * forms — `Schmid` not `Schmidt`, `Beck` not `Becker`, `Hafner` not `Töpfer`,
 * `Schultheiss` not `Richter` — and seeded with attested Nürnberg patrician
 * houses for the noble and merchant classes.
 */
export const SURNAMES = [
  'Müller', 'Schmid', 'Weber', 'Fischer', 'Wagner', 'Beck', 'Hofmann',
  'Schäfer', 'Koch', 'Bauer', 'Schultheiss', 'Klein', 'Wolf', 'Schwarz',
  'Zimmermann', 'Krämer', 'Metzger', 'Binder', 'Gerber', 'Bader', 'Scherer',
  'Knappe', 'Seiler', 'Hafner', 'Färber', 'Maurer',
];

/** Nürnberg patrician houses — weighted toward noble and merchant patients. */
export const PATRICIAN_SURNAMES = [
  'Stromer', 'Holzschuher', 'Tucher', 'Behaim', 'Groland',
  'Ebner', 'Muffel', 'Haller', 'Kress', 'Pfinzing', 'Volckamer',
];

/**
 * Patient pool — medieval complaints a Bader would see.
 * portraitKey optional: texture for TreatmentScene.
 * weight: relative spawn weight (default 1).
 */
export const PATIENT_TEMPLATES: PatientTemplate[] = [
  // ── Dental / oral (core — historically very common) ───────
  {
    id: 'toothache',
    class: 'artisan',
    complaintKey: 'complaint.toothache',
    dominantHumor: 'yellowBile',
    severity: 2,
    bestTechniques: ['tooth_pull', 'tooth_ease', 'poultice'],
    basePay: 18,
    portraitKey: 'port_dental',
    weight: 2.2,
  },
  {
    id: 'rotten_molar',
    class: 'peasant',
    complaintKey: 'complaint.rotten_molar',
    dominantHumor: 'yellowBile',
    severity: 3,
    bestTechniques: ['tooth_pull', 'gum_lance', 'cauterize_mouth'],
    basePay: 16,
    portraitKey: 'port_dental',
    weight: 1.8,
  },
  {
    id: 'gumboil',
    class: 'artisan',
    complaintKey: 'complaint.gumboil',
    dominantHumor: 'yellowBile',
    severity: 3,
    bestTechniques: ['gum_lance', 'mouth_wash', 'poultice'],
    basePay: 20,
    portraitKey: 'port_dental',
    weight: 1.5,
  },
  {
    id: 'thrush_mouth',
    class: 'peasant',
    complaintKey: 'complaint.thrush',
    dominantHumor: 'phlegm',
    severity: 2,
    bestTechniques: ['mouth_wash', 'herbal_draught', 'hygiene_clean'],
    basePay: 12,
    portraitKey: 'port_sick',
    weight: 1.3,
  },
  {
    id: 'bleeding_gums',
    class: 'merchant',
    complaintKey: 'complaint.bleeding_gums',
    dominantHumor: 'blood',
    severity: 2,
    bestTechniques: ['mouth_wash', 'scale_tartar', 'tooth_ease'],
    basePay: 22,
    portraitKey: 'port_dental',
    weight: 1.2,
  },
  {
    id: 'loose_tooth',
    class: 'peasant',
    complaintKey: 'complaint.loose_tooth',
    dominantHumor: 'phlegm',
    severity: 2,
    bestTechniques: ['tooth_pull', 'mouth_wash', 'tooth_ease'],
    basePay: 14,
    portraitKey: 'port_dental',
    weight: 1.4,
  },
  {
    id: 'quinsy',
    class: 'artisan',
    complaintKey: 'complaint.quinsy',
    dominantHumor: 'yellowBile',
    severity: 4,
    bestTechniques: ['abscess_lance', 'mouth_wash', 'bloodletting'],
    basePay: 26,
    portraitKey: 'port_sick',
    weight: 0.9,
  },
  {
    id: 'canker_sore',
    class: 'merchant',
    complaintKey: 'complaint.canker',
    dominantHumor: 'yellowBile',
    severity: 1,
    bestTechniques: ['mouth_wash', 'tooth_ease', 'poultice'],
    basePay: 15,
    portraitKey: 'port_merchant',
    weight: 1.1,
  },
  {
    id: 'tartar_breath',
    class: 'noble',
    complaintKey: 'complaint.tartar',
    dominantHumor: 'phlegm',
    severity: 1,
    bestTechniques: ['scale_tartar', 'mouth_wash', 'shave'],
    basePay: 40,
    portraitKey: 'port_noble',
    weight: 0.8,
  },
  {
    id: 'child_tooth',
    class: 'peasant',
    complaintKey: 'complaint.child_tooth',
    dominantHumor: 'yellowBile',
    severity: 2,
    bestTechniques: ['tooth_ease', 'mouth_wash', 'poultice'],
    basePay: 8,
    portraitKey: 'port_youth',
    weight: 1.2,
  },
  {
    id: 'cracked_tooth',
    class: 'soldier',
    complaintKey: 'complaint.cracked_tooth',
    dominantHumor: 'yellowBile',
    severity: 3,
    bestTechniques: ['tooth_pull', 'tooth_ease', 'wound_dress'],
    basePay: 18,
    portraitKey: 'port_dental',
    weight: 1.0,
  },
  {
    id: 'barber_itch_chin',
    class: 'artisan',
    complaintKey: 'complaint.barber_itch',
    dominantHumor: 'yellowBile',
    severity: 2,
    bestTechniques: ['mouth_wash', 'poultice', 'hygiene_clean'],
    basePay: 14,
    portraitKey: 'port_artisan',
    weight: 0.9,
  },

  // ── Fevers, humors, internal ──────────────────────────────
  {
    id: 'fever_blood',
    class: 'peasant',
    complaintKey: 'complaint.fever',
    dominantHumor: 'blood',
    severity: 3,
    bestTechniques: ['bloodletting', 'leeches', 'hygiene_clean'],
    basePay: 14,
    portraitKey: 'port_sick',
    weight: 1.6,
  },
  {
    id: 'melancholy',
    class: 'merchant',
    complaintKey: 'complaint.melancholy',
    dominantHumor: 'blackBile',
    severity: 2,
    bestTechniques: ['sweat_bath', 'cupping', 'herbal_draught'],
    basePay: 22,
    portraitKey: 'port_merchant',
    weight: 1.0,
  },
  {
    id: 'cold_phlegm',
    class: 'peasant',
    complaintKey: 'complaint.cold',
    dominantHumor: 'phlegm',
    severity: 1,
    bestTechniques: ['bath_wash', 'sweat_bath', 'poultice'],
    basePay: 10,
    portraitKey: 'port_peasant',
    weight: 1.8,
  },
  {
    id: 'headache_sanguine',
    class: 'merchant',
    complaintKey: 'complaint.headache',
    dominantHumor: 'blood',
    severity: 2,
    bestTechniques: ['bloodletting', 'leeches', 'scarify'],
    basePay: 18,
    portraitKey: 'port_merchant',
    weight: 1.3,
  },
  {
    id: 'jaundice',
    class: 'peasant',
    complaintKey: 'complaint.jaundice',
    dominantHumor: 'yellowBile',
    severity: 3,
    bestTechniques: ['purge_draught', 'bloodletting', 'herbal_draught'],
    basePay: 16,
    portraitKey: 'port_sick',
    weight: 0.8,
  },
  {
    id: 'dropsy',
    class: 'merchant',
    complaintKey: 'complaint.dropsy',
    dominantHumor: 'phlegm',
    severity: 4,
    bestTechniques: ['scarify', 'herbal_draught', 'purge_draught'],
    basePay: 30,
    portraitKey: 'port_sick',
    weight: 0.6,
  },
  {
    id: 'flux_belly',
    class: 'peasant',
    complaintKey: 'complaint.flux',
    dominantHumor: 'yellowBile',
    severity: 3,
    bestTechniques: ['herbal_draught', 'hygiene_clean', 'poultice'],
    basePay: 12,
    portraitKey: 'port_sick',
    weight: 1.0,
  },
  {
    id: 'colic_stones',
    class: 'artisan',
    complaintKey: 'complaint.colic',
    dominantHumor: 'blackBile',
    severity: 3,
    bestTechniques: ['herbal_draught', 'purge_draught', 'sweat_bath'],
    basePay: 20,
    portraitKey: 'port_artisan',
    weight: 0.9,
  },
  {
    id: 'gout_merchant',
    class: 'merchant',
    complaintKey: 'complaint.gout',
    dominantHumor: 'yellowBile',
    severity: 2,
    bestTechniques: ['bloodletting', 'poultice', 'sweat_bath'],
    basePay: 28,
    portraitKey: 'port_merchant',
    weight: 1.0,
  },
  {
    id: 'child_fever',
    class: 'peasant',
    complaintKey: 'complaint.child_fever',
    dominantHumor: 'blood',
    severity: 3,
    bestTechniques: ['poultice', 'herbal_draught', 'hygiene_clean'],
    basePay: 8,
    portraitKey: 'port_youth',
    weight: 1.0,
  },

  // ── Wounds & trauma ───────────────────────────────────────
  {
    id: 'wound_cut',
    class: 'soldier',
    complaintKey: 'complaint.wound',
    dominantHumor: 'blood',
    severity: 3,
    bestTechniques: ['wound_dress', 'battlefield_pack'],
    basePay: 20,
    portraitKey: 'port_soldier',
    weight: 1.2,
  },
  {
    id: 'abscess',
    class: 'artisan',
    complaintKey: 'complaint.abscess',
    dominantHumor: 'yellowBile',
    severity: 3,
    bestTechniques: ['abscess_lance', 'poultice', 'cauterize'],
    basePay: 24,
    portraitKey: 'port_artisan',
    weight: 1.1,
  },
  {
    id: 'broken_arm',
    class: 'peasant',
    complaintKey: 'complaint.fracture',
    dominantHumor: 'blood',
    severity: 4,
    bestTechniques: ['fracture_set', 'wound_dress'],
    basePay: 28,
    portraitKey: 'port_peasant',
    weight: 0.7,
  },
  {
    id: 'war_wound',
    class: 'soldier',
    complaintKey: 'complaint.war_wound',
    dominantHumor: 'blood',
    severity: 5,
    bestTechniques: ['battlefield_pack', 'wound_dress'],
    basePay: 40,
    portraitKey: 'port_soldier',
    weight: 0.5,
  },
  {
    id: 'arrow_wound',
    class: 'soldier',
    complaintKey: 'complaint.arrow',
    dominantHumor: 'blood',
    severity: 4,
    bestTechniques: ['battlefield_pack', 'wound_dress', 'abscess_lance'],
    basePay: 32,
    portraitKey: 'port_soldier',
    weight: 0.6,
  },
  {
    id: 'burn_smith',
    class: 'artisan',
    complaintKey: 'complaint.burn',
    dominantHumor: 'blood',
    severity: 3,
    bestTechniques: ['wound_dress', 'poultice', 'hygiene_clean'],
    basePay: 22,
    portraitKey: 'port_artisan',
    weight: 0.9,
  },
  {
    id: 'whitlow',
    class: 'artisan',
    complaintKey: 'complaint.whitlow',
    dominantHumor: 'yellowBile',
    severity: 2,
    bestTechniques: ['abscess_lance', 'poultice', 'wound_dress'],
    basePay: 16,
    portraitKey: 'port_artisan',
    weight: 1.0,
  },
  {
    id: 'sprain',
    class: 'peasant',
    complaintKey: 'complaint.sprain',
    dominantHumor: 'phlegm',
    severity: 2,
    bestTechniques: ['poultice', 'wound_dress', 'bath_wash'],
    basePay: 12,
    portraitKey: 'port_peasant',
    weight: 1.1,
  },
  {
    id: 'hernia_rupture',
    class: 'peasant',
    complaintKey: 'complaint.hernia',
    dominantHumor: 'phlegm',
    severity: 3,
    bestTechniques: ['truss_hernia', 'poultice', 'herbal_draught'],
    basePay: 24,
    portraitKey: 'port_peasant',
    weight: 0.7,
  },

  // ── Skin & scalp ──────────────────────────────────────────
  {
    id: 'lice',
    class: 'beggar',
    complaintKey: 'complaint.lice',
    dominantHumor: 'phlegm',
    severity: 1,
    bestTechniques: ['bath_wash', 'haircut'],
    basePay: 4,
    portraitKey: 'port_peasant',
    weight: 1.4,
  },
  {
    id: 'boils',
    class: 'artisan',
    complaintKey: 'complaint.boils',
    dominantHumor: 'yellowBile',
    severity: 2,
    bestTechniques: ['cupping', 'poultice', 'abscess_lance'],
    basePay: 15,
    portraitKey: 'port_artisan',
    weight: 1.2,
  },
  {
    id: 'scabies_itch',
    class: 'beggar',
    complaintKey: 'complaint.scabies',
    dominantHumor: 'blackBile',
    severity: 2,
    bestTechniques: ['bath_wash', 'poultice', 'hygiene_clean'],
    basePay: 5,
    portraitKey: 'port_sick',
    weight: 1.3,
  },
  {
    id: 'ringworm',
    class: 'peasant',
    complaintKey: 'complaint.ringworm',
    dominantHumor: 'blackBile',
    severity: 2,
    bestTechniques: ['poultice', 'bath_wash', 'cauterize'],
    basePay: 10,
    portraitKey: 'port_sick',
    weight: 1.0,
  },
  {
    id: 'scald_head',
    class: 'beggar',
    complaintKey: 'complaint.scald',
    dominantHumor: 'blackBile',
    severity: 2,
    bestTechniques: ['bath_wash', 'poultice', 'haircut'],
    basePay: 5,
    portraitKey: 'port_peasant',
    weight: 1.0,
  },
  {
    id: 'erysipelas',
    class: 'artisan',
    complaintKey: 'complaint.erysipelas',
    dominantHumor: 'blood',
    severity: 4,
    bestTechniques: ['bloodletting', 'poultice', 'hygiene_clean'],
    basePay: 22,
    portraitKey: 'port_sick',
    weight: 0.7,
  },
  {
    id: 'warts_corns',
    class: 'peasant',
    complaintKey: 'complaint.warts',
    dominantHumor: 'blackBile',
    severity: 1,
    bestTechniques: ['wart_cut', 'cauterize', 'poultice'],
    basePay: 11,
    portraitKey: 'port_peasant',
    weight: 1.2,
  },
  {
    id: 'carbuncle',
    class: 'artisan',
    complaintKey: 'complaint.carbuncle',
    dominantHumor: 'yellowBile',
    severity: 4,
    bestTechniques: ['abscess_lance', 'cauterize', 'poultice'],
    basePay: 28,
    portraitKey: 'port_artisan',
    weight: 0.6,
  },
  {
    id: 'beggar_sores',
    class: 'beggar',
    complaintKey: 'complaint.sores',
    dominantHumor: 'blackBile',
    severity: 2,
    bestTechniques: ['wound_dress', 'poultice', 'hygiene_clean'],
    basePay: 3,
    portraitKey: 'port_sick',
    weight: 1.2,
  },
  {
    id: 'fistula_case',
    class: 'merchant',
    complaintKey: 'complaint.fistula',
    dominantHumor: 'yellowBile',
    severity: 4,
    bestTechniques: ['fistula_dress', 'cauterize', 'poultice'],
    basePay: 45,
    portraitKey: 'port_merchant',
    weight: 0.4,
  },
  {
    id: 'chilblains',
    class: 'peasant',
    complaintKey: 'complaint.chilblains',
    dominantHumor: 'phlegm',
    severity: 1,
    bestTechniques: ['poultice', 'bath_wash', 'wound_dress'],
    basePay: 9,
    portraitKey: 'port_woman',
    weight: 1.0,
  },

  // ── Head, ear, eye ────────────────────────────────────────
  {
    id: 'earache',
    class: 'peasant',
    complaintKey: 'complaint.earache',
    dominantHumor: 'phlegm',
    severity: 2,
    bestTechniques: ['ear_clean', 'poultice', 'herbal_draught'],
    basePay: 12,
    portraitKey: 'port_peasant',
    weight: 1.3,
  },
  {
    id: 'ear_wax',
    class: 'merchant',
    complaintKey: 'complaint.ear_wax',
    dominantHumor: 'phlegm',
    severity: 1,
    bestTechniques: ['ear_clean', 'bath_wash'],
    basePay: 14,
    portraitKey: 'port_merchant',
    weight: 1.1,
  },
  {
    id: 'eye_cloud',
    class: 'merchant',
    complaintKey: 'complaint.cataract',
    dominantHumor: 'phlegm',
    severity: 4,
    bestTechniques: ['cataract_couch'],
    basePay: 50,
    portraitKey: 'port_merchant',
    weight: 0.35,
  },
  {
    id: 'nosebleed',
    class: 'artisan',
    complaintKey: 'complaint.nosebleed',
    dominantHumor: 'blood',
    severity: 2,
    bestTechniques: ['wound_dress', 'leeches', 'bloodletting'],
    basePay: 12,
    portraitKey: 'port_artisan',
    weight: 1.0,
  },
  {
    id: 'clergy_rheum',
    class: 'clergy',
    complaintKey: 'complaint.rheum',
    dominantHumor: 'phlegm',
    severity: 2,
    bestTechniques: ['cupping', 'sweat_bath', 'herbal_draught'],
    basePay: 20,
    portraitKey: 'port_clergy',
    weight: 1.0,
  },

  // ── Grooming / social ─────────────────────────────────────
  {
    id: 'groom_noble',
    class: 'noble',
    complaintKey: 'complaint.groom',
    dominantHumor: 'blood',
    severity: 1,
    bestTechniques: ['shave', 'haircut', 'beard_trim', 'bath_wash'],
    basePay: 35,
    portraitKey: 'port_noble',
    weight: 0.9,
  },
  {
    id: 'groom_merchant',
    class: 'merchant',
    complaintKey: 'complaint.groom',
    dominantHumor: 'phlegm',
    severity: 1,
    bestTechniques: ['shave', 'haircut', 'beard_trim'],
    basePay: 16,
    portraitKey: 'port_merchant',
    weight: 1.3,
  },
  {
    id: 'groom_woman',
    class: 'peasant',
    complaintKey: 'complaint.groom_wash',
    dominantHumor: 'phlegm',
    severity: 1,
    bestTechniques: ['bath_wash', 'haircut', 'mouth_wash'],
    basePay: 10,
    portraitKey: 'port_woman',
    weight: 1.2,
  },

  // ── Story / special ───────────────────────────────────────
  {
    id: 'plague_like',
    class: 'peasant',
    complaintKey: 'complaint.plague',
    dominantHumor: 'blackBile',
    severity: 5,
    bestTechniques: ['hygiene_clean', 'herbal_draught', 'poultice'],
    basePay: 12,
    storyFlag: 'epidemic_case',
    portraitKey: 'port_sick',
    weight: 0.3,
  },
  {
    id: 'noble_secret',
    class: 'noble',
    complaintKey: 'complaint.secret_illness',
    dominantHumor: 'yellowBile',
    severity: 3,
    bestTechniques: ['bloodletting', 'leeches', 'herbal_draught'],
    basePay: 60,
    storyFlag: 'noble_secret',
    portraitKey: 'port_noble',
    weight: 0.4,
  },
  {
    id: 'midwife_assist',
    class: 'peasant',
    complaintKey: 'complaint.midwife',
    dominantHumor: 'phlegm',
    severity: 4,
    bestTechniques: ['herbal_draught', 'hygiene_clean', 'poultice'],
    basePay: 18,
    portraitKey: 'port_woman',
    weight: 0.5,
  },
  {
    id: 'venereal_ulcer',
    class: 'soldier',
    complaintKey: 'complaint.foul_ulcer',
    dominantHumor: 'yellowBile',
    severity: 3,
    bestTechniques: ['cauterize', 'poultice', 'hygiene_clean'],
    basePay: 25,
    portraitKey: 'port_soldier',
    weight: 0.5,
  },
];

const CLASS_PAY: Record<PatientClass, number> = {
  beggar: 0.4,
  peasant: 0.8,
  artisan: 1.0,
  merchant: 1.4,
  soldier: 1.1,
  noble: 2.2,
  clergy: 1.0,
};

export function classPayMult(c: PatientClass): number {
  return CLASS_PAY[c];
}

export function humorColor(h: Humor): number {
  switch (h) {
    case 'blood':
      return 0xb33a3a;
    case 'phlegm':
      return 0x7a9e9f;
    case 'yellowBile':
      return 0xc9a227;
    case 'blackBile':
      return 0x3d3a45;
  }
}

/** Dental/oral template ids — boosted early so players meet the tooth-drawer craft */
export const DENTAL_TEMPLATE_IDS = new Set([
  'toothache',
  'rotten_molar',
  'gumboil',
  'thrush_mouth',
  'bleeding_gums',
  'loose_tooth',
  'quinsy',
  'canker_sore',
  'tartar_breath',
  'child_tooth',
  'cracked_tooth',
  'barber_itch_chin',
]);

export function templateWeight(t: PatientTemplate): number {
  return t.weight ?? 1;
}
