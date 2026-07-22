/**
 * The lexicon.
 *
 * The Codex was eight hand-positioned pages in a chain of `if` branches — no
 * way to add an entry without editing layout code, and no way for a player to
 * look something up. This replaces it with data: entries carry an id, a
 * category and a pair of i18n keys, and the scene renders whatever is here.
 *
 * ## What belongs in here
 *
 * Things the game *shows* the player and does not explain. A term on a button,
 * a rule they just ran into, a practice they are performing without knowing
 * why. The test of an entry is whether a player who read it would understand
 * the screen they were just on.
 *
 * ## On accuracy
 *
 * Every entry is written from the general scholarly picture of medicine and
 * urban life in the fourteenth-century Empire. Where the game simplifies or
 * invents, the entry says so — `HISTORY_AUDIT.md` tracks the known departures.
 * The point of the setting is that it is real; an entry that flatters the game
 * at the expense of the history defeats it.
 *
 * Dates are given where they are firm. Where scholarship is divided or the
 * practice varied by town, the entry says that rather than picking one and
 * sounding certain.
 */
import type { HistoricalSourceId } from './historicalSources';

export type LexiconCategory =
  | 'trade'
  | 'medicine'
  | 'city'
  | 'faith'
  | 'daily'
  | 'world';

export interface LexiconEntry {
  id: string;
  category: LexiconCategory;
  /** i18n key for the headword. */
  titleKey: string;
  /** i18n key for the body. Two or three paragraphs at most. */
  bodyKey: string;
  /**
   * Optional painting shown beside the text. Falls back to no image, so an
   * entry never depends on art that may not exist yet.
   */
  art?: string;
  /**
   * Marks an entry as describing something the game deliberately simplifies.
   * Rendered with a note, so the player knows where the game stops being a
   * reconstruction.
   */
  simplified?: boolean;
  /** What kind of historical claim the small article makes. */
  evidence: 'attested' | 'regional' | 'game_simplification';
  /** At least one bibliography entry supporting or delimiting the article. */
  sourceIds: HistoricalSourceId[];
}

export const LEXICON_CATEGORIES: LexiconCategory[] = [
  'trade',
  'medicine',
  'city',
  'faith',
  'daily',
  'world',
];

type RawLexiconEntry = Omit<LexiconEntry, 'evidence' | 'sourceIds'>;

const BASE_LEXICON: RawLexiconEntry[] = [
  /* ── The trade ─────────────────────────────────────────────────── */
  {
    id: 'bader',
    category: 'trade',
    titleKey: 'lex_bader',
    bodyKey: 'lex_bader_body',
    art: 'art_bath',
  },
  {
    id: 'wundarzt',
    category: 'trade',
    titleKey: 'lex_wundarzt',
    bodyKey: 'lex_wundarzt_body',
    art: 'art_tools',
  },
  {
    id: 'physicus',
    category: 'trade',
    titleKey: 'lex_physicus',
    bodyKey: 'lex_physicus_body',
  },
  {
    id: 'unehrlich',
    category: 'trade',
    titleKey: 'lex_unehrlich',
    bodyKey: 'lex_unehrlich_body',
  },
  {
    id: 'scharfrichter',
    category: 'trade',
    titleKey: 'lex_scharfrichter',
    bodyKey: 'lex_scharfrichter_body',
  },
  {
    id: 'wanderjahre',
    category: 'trade',
    titleKey: 'lex_wanderjahre',
    bodyKey: 'lex_wanderjahre_body',
  },
  {
    id: 'feldscher',
    category: 'trade',
    titleKey: 'lex_feldscher',
    bodyKey: 'lex_feldscher_body',
    art: 'bg_warcamp',
  },

  /* ── Medicine ──────────────────────────────────────────────────── */
  {
    id: 'humors',
    category: 'medicine',
    titleKey: 'lex_humors',
    bodyKey: 'lex_humors_body',
    art: 'art_humors',
  },
  {
    id: 'complexion',
    category: 'medicine',
    titleKey: 'lex_complexion',
    bodyKey: 'lex_complexion_body',
  },
  {
    id: 'bloodletting',
    category: 'medicine',
    titleKey: 'lex_bloodletting',
    bodyKey: 'lex_bloodletting_body',
  },
  {
    id: 'uroscopy',
    category: 'medicine',
    titleKey: 'lex_uroscopy',
    bodyKey: 'lex_uroscopy_body',
  },
  {
    id: 'pulse',
    category: 'medicine',
    titleKey: 'lex_pulse',
    bodyKey: 'lex_pulse_body',
    art: 'art_pulse',
  },
  {
    id: 'cupping',
    category: 'medicine',
    titleKey: 'lex_cupping',
    bodyKey: 'lex_cupping_body',
  },
  {
    id: 'cautery',
    category: 'medicine',
    titleKey: 'lex_cautery',
    bodyKey: 'lex_cautery_body',
  },
  {
    id: 'teeth',
    category: 'medicine',
    titleKey: 'lex_teeth',
    bodyKey: 'lex_teeth_body',
    art: 'art_dental',
  },
  {
    id: 'wound_drink',
    category: 'medicine',
    titleKey: 'lex_wound_drink',
    bodyKey: 'lex_wound_drink_body',
  },
  {
    id: 'plague',
    category: 'medicine',
    titleKey: 'lex_plague',
    bodyKey: 'lex_plague_body',
    art: 'bg_plague',
  },

  /* ── The city ──────────────────────────────────────────────────── */
  {
    id: 'zunft',
    category: 'city',
    titleKey: 'lex_zunft',
    bodyKey: 'lex_zunft_body',
    art: 'bg_guild',
  },
  {
    id: 'nurnberg_rat',
    category: 'city',
    titleKey: 'lex_nurnberg_rat',
    bodyKey: 'lex_nurnberg_rat_body',
    art: 'bg_nurnberg',
  },
  {
    id: 'badstube_rights',
    category: 'city',
    titleKey: 'lex_badstube_rights',
    bodyKey: 'lex_badstube_rights_body',
  },
  {
    id: 'coinage',
    category: 'city',
    titleKey: 'lex_coinage',
    bodyKey: 'lex_coinage_body',
    simplified: true,
  },
  {
    id: 'lombard',
    category: 'city',
    titleKey: 'lex_lombard',
    bodyKey: 'lex_lombard_body',
  },
  {
    id: 'marktrecht',
    category: 'city',
    titleKey: 'lex_marktrecht',
    bodyKey: 'lex_marktrecht_body',
    art: 'bg_market',
  },

  /* ── Faith ─────────────────────────────────────────────────────── */
  {
    id: 'church_surgery',
    category: 'faith',
    titleKey: 'lex_church_surgery',
    bodyKey: 'lex_church_surgery_body',
    art: 'bg_church',
  },
  {
    id: 'feast_days',
    category: 'faith',
    titleKey: 'lex_feast_days',
    bodyKey: 'lex_feast_days_body',
  },
  {
    id: 'astrology',
    category: 'faith',
    titleKey: 'lex_astrology',
    bodyKey: 'lex_astrology_body',
  },
  {
    id: 'monastic_care',
    category: 'faith',
    titleKey: 'lex_monastic_care',
    bodyKey: 'lex_monastic_care_body',
    art: 'bg_monastery',
  },

  /* ── Daily life ────────────────────────────────────────────────── */
  {
    id: 'bathhouse_life',
    category: 'daily',
    titleKey: 'lex_bathhouse_life',
    bodyKey: 'lex_bathhouse_life_body',
  },
  {
    id: 'soap_linen',
    category: 'daily',
    titleKey: 'lex_soap_linen',
    bodyKey: 'lex_soap_linen_body',
  },
  {
    id: 'women_trade',
    category: 'daily',
    titleKey: 'lex_women_trade',
    bodyKey: 'lex_women_trade_body',
  },
  {
    id: 'diet',
    category: 'daily',
    titleKey: 'lex_diet',
    bodyKey: 'lex_diet_body',
  },

  /* ── The wider world ───────────────────────────────────────────── */
  {
    id: 'year_1382',
    category: 'world',
    titleKey: 'lex_year_1382',
    bodyKey: 'lex_year_1382_body',
  },
  {
    id: 'empire',
    category: 'world',
    titleKey: 'lex_empire',
    bodyKey: 'lex_empire_body',
  },
  {
    id: 'schism',
    category: 'world',
    titleKey: 'lex_schism',
    bodyKey: 'lex_schism_body',
  },
  {
    id: 'towns',
    category: 'world',
    titleKey: 'lex_towns',
    bodyKey: 'lex_towns_body',
  },
];

const ADDITIONS: RawLexiconEntry[] = [
  { id: 'barber_surgeon', category: 'trade', titleKey: 'lex_barber_surgeon', bodyKey: 'lex_barber_surgeon_body' },
  { id: 'sworn_craft', category: 'trade', titleKey: 'lex_sworn_craft', bodyKey: 'lex_sworn_craft_body', simplified: true },
  { id: 'rugsherr', category: 'trade', titleKey: 'lex_rugsherr', bodyKey: 'lex_rugsherr_body', simplified: true },
  { id: 'journeyman', category: 'trade', titleKey: 'lex_journeyman', bodyKey: 'lex_journeyman_body' },
  { id: 'regimen', category: 'medicine', titleKey: 'lex_regimen', bodyKey: 'lex_regimen_body' },
  { id: 'miasma', category: 'faith', titleKey: 'lex_miasma', bodyKey: 'lex_miasma_body' },
  { id: 'lepraschau', category: 'medicine', titleKey: 'lex_lepraschau', bodyKey: 'lex_lepraschau_body' },
  { id: 'council', category: 'city', titleKey: 'lex_council', bodyKey: 'lex_council_body' },
  { id: 'craft_oath', category: 'city', titleKey: 'lex_craft_oath', bodyKey: 'lex_craft_oath_body', simplified: true },
  { id: 'pfennig_heller', category: 'city', titleKey: 'lex_pfennig_heller', bodyKey: 'lex_pfennig_heller_body', simplified: true },
  { id: 'bathmaid', category: 'city', titleKey: 'lex_bathmaid', bodyKey: 'lex_bathmaid_body' },
  { id: 'lender', category: 'city', titleKey: 'lex_lender', bodyKey: 'lex_lender_body', simplified: true },
  { id: 'hospital', category: 'faith', titleKey: 'lex_hospital', bodyKey: 'lex_hospital_body' },
  { id: 'alms', category: 'faith', titleKey: 'lex_alms', bodyKey: 'lex_alms_body' },
  { id: 'feast_ordinance', category: 'faith', titleKey: 'lex_feast_ordinance', bodyKey: 'lex_feast_ordinance_body' },
  { id: 'pilgrimage', category: 'faith', titleKey: 'lex_pilgrimage', bodyKey: 'lex_pilgrimage_body' },
  { id: 'linen', category: 'daily', titleKey: 'lex_linen', bodyKey: 'lex_linen_body' },
  { id: 'steam_bath', category: 'daily', titleKey: 'lex_steam_bath', bodyKey: 'lex_steam_bath_body' },
  { id: 'fumigation', category: 'daily', titleKey: 'lex_fumigation', bodyKey: 'lex_fumigation_body' },
  { id: 'household', category: 'daily', titleKey: 'lex_household', bodyKey: 'lex_household_body' },
  { id: 'midwife', category: 'daily', titleKey: 'lex_midwife', bodyKey: 'lex_midwife_body' },
  { id: 'imperial_roads', category: 'world', titleKey: 'lex_imperial_roads', bodyKey: 'lex_imperial_roads_body' },
  { id: 'fourteenth_century', category: 'world', titleKey: 'lex_fourteenth_century', bodyKey: 'lex_fourteenth_century_body' },
  { id: 'plague_memory', category: 'world', titleKey: 'lex_plague_memory', bodyKey: 'lex_plague_memory_body' },
  { id: 'source_limits', category: 'world', titleKey: 'lex_source_limits', bodyKey: 'lex_source_limits_body', simplified: true },
];

/** v1.2 articles use their specific bibliography rather than category fallbacks. */
const CORRESPONDENCE_ADDITIONS: LexiconEntry[] = [
  { id: 'fugger_1382', category: 'world', titleKey: 'lex_fugger_1382', bodyKey: 'lex_fugger_1382_body', evidence: 'attested', sourceIds: ['fugger_history'] },
  { id: 'medici_1397', category: 'city', titleKey: 'lex_medici_1397', bodyKey: 'lex_medici_1397_body', evidence: 'attested', sourceIds: ['medici_treccani'] },
  { id: 'tabriz_trade', category: 'world', titleKey: 'lex_tabriz_trade', bodyKey: 'lex_tabriz_trade_body', evidence: 'attested', sourceIds: ['met_trade'] },
  { id: 'borja_1492', category: 'world', titleKey: 'lex_borja_1492', bodyKey: 'lex_borja_1492_body', evidence: 'attested', sourceIds: ['vatican_borgia'] },
];

const SOURCE_BY_CATEGORY: Record<LexiconCategory, HistoricalSourceId> = {
  trade: 'wellcome_blood',
  medicine: 'wellcome_blood',
  city: 'gnm_daily_life',
  faith: 'wellcome_church',
  daily: 'gnm_daily_life',
  world: 'game_simplification',
};

/** All articles carry a marker and citation, including pre-v1.1 entries. */
export const LEXICON: LexiconEntry[] = [
  ...[...BASE_LEXICON, ...ADDITIONS].map((entry): LexiconEntry => ({
    ...entry,
    evidence: entry.simplified ? 'game_simplification' : 'attested',
    sourceIds: [SOURCE_BY_CATEGORY[entry.category]],
  })),
  ...CORRESPONDENCE_ADDITIONS,
];

export function lexiconByCategory(cat: LexiconCategory): LexiconEntry[] {
  return LEXICON.filter((e) => e.category === cat);
}

export function lexiconEntry(id: string): LexiconEntry | undefined {
  return LEXICON.find((e) => e.id === id);
}
