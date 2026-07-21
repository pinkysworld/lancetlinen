/** City masters who teach techniques for coin / favor */
import type { GameState } from '../types';
import { mentorCostMult } from '../systems/reputation';

export interface MentorOffer {
  cityId: string;
  mentorKey: string; // i18n npc key
  techniqueId: string;
  cost: number;
  minRep: number;
  guildFavorCost?: number;
  storyFlag?: string;
  descKey: string;
}

export const MENTOR_OFFERS: MentorOffer[] = [
  {
    cityId: 'monastery_ebrach',
    mentorKey: 'npc_monk',
    techniqueId: 'poultice',
    cost: 15,
    minRep: 0,
    descKey: 'mentor.poultice',
  },
  {
    cityId: 'monastery_ebrach',
    mentorKey: 'npc_monk',
    techniqueId: 'herbal_draught',
    cost: 35,
    minRep: 5,
    descKey: 'mentor.draught',
  },
  {
    cityId: 'rothenburg',
    mentorKey: 'npc_bath_master',
    techniqueId: 'sweat_bath',
    cost: 25,
    minRep: 5,
    descKey: 'mentor.sweat',
  },
  /*
   * A cupping offer at Bamberg stood here, and is gone: it became a dead
   * purchase the moment cupping was made a starter art — 40 coin for something
   * already in hand, with nothing in the study screen to say so.
   *
   * The man who taught it has also been renamed. He was `npc_clergy_surgeon`,
   * "Cathedral surgeon" / "Domchirurg", and he taught scarification and
   * trepanning — which Lateran IV (1215) c.18 forbade to anyone in major
   * orders, contradicting the game's own codex entry on that very canon.
   *
   * Stripping his offers would have been the wrong repair. Cathedral chapters
   * really did contract *lay* wound surgeons, precisely because canon law shut
   * the clergy out of cutting. He is now the `npc_chapter_woundarzt` — the
   * chapter's Domstiftswundarzt — so the arts he teaches are legitimate, and
   * the reason they had to hire him outside the cloister is itself the history
   * the player meets.
   */
  {
    cityId: 'augsburg',
    mentorKey: 'npc_merchant_leech',
    techniqueId: 'leeches',
    cost: 45,
    minRep: 10,
    descKey: 'mentor.leeches',
  },
  {
    cityId: 'nurnberg',
    mentorKey: 'npc_guild_master',
    techniqueId: 'abscess_lance',
    cost: 55,
    minRep: 15,
    guildFavorCost: 5,
    descKey: 'mentor.lance',
  },
  {
    cityId: 'nurnberg',
    mentorKey: 'npc_guild_master',
    techniqueId: 'gum_lance',
    cost: 35,
    minRep: 5,
    descKey: 'mentor.gum',
  },
  {
    cityId: 'nurnberg',
    mentorKey: 'npc_guild_master',
    techniqueId: 'scale_tartar',
    cost: 25,
    minRep: 3,
    descKey: 'mentor.tartar',
  },
  {
    cityId: 'augsburg',
    mentorKey: 'npc_merchant_leech',
    techniqueId: 'cauterize_mouth',
    cost: 55,
    minRep: 12,
    descKey: 'mentor.cauterize_mouth',
  },
  {
    cityId: 'bamberg',
    mentorKey: 'npc_chapter_woundarzt',
    techniqueId: 'scarify',
    cost: 30,
    minRep: 5,
    descKey: 'mentor.scarify',
  },
  {
    cityId: 'rothenburg',
    mentorKey: 'npc_bath_master',
    techniqueId: 'ear_clean',
    cost: 15,
    minRep: 0,
    descKey: 'mentor.ear',
  },
  {
    cityId: 'rothenburg',
    mentorKey: 'npc_bath_master',
    techniqueId: 'wart_cut',
    cost: 18,
    minRep: 0,
    descKey: 'mentor.wart',
  },
  {
    cityId: 'wurzburg',
    mentorKey: 'npc_scribe',
    techniqueId: 'cataract_couch',
    cost: 120,
    minRep: 20,
    descKey: 'mentor.cataract',
  },
  {
    cityId: 'wurzburg',
    mentorKey: 'npc_scribe',
    techniqueId: 'fracture_set',
    cost: 80,
    minRep: 12,
    descKey: 'mentor.fracture',
  },
  {
    cityId: 'wurzburg',
    mentorKey: 'npc_scribe',
    techniqueId: 'fistula_dress',
    cost: 90,
    minRep: 18,
    descKey: 'mentor.fistula',
  },
  {
    cityId: 'augsburg',
    mentorKey: 'npc_merchant_leech',
    techniqueId: 'cauterize',
    cost: 70,
    minRep: 15,
    descKey: 'mentor.cauterize',
  },
  {
    cityId: 'bamberg',
    mentorKey: 'npc_chapter_woundarzt',
    techniqueId: 'purge_draught',
    cost: 35,
    minRep: 8,
    descKey: 'mentor.purge',
  },
  {
    cityId: 'small_village',
    mentorKey: 'npc_wise_woman',
    techniqueId: 'truss_hernia',
    cost: 50,
    minRep: 5,
    descKey: 'mentor.truss',
  },
  {
    cityId: 'war_camp',
    mentorKey: 'npc_field_barber',
    techniqueId: 'battlefield_pack',
    cost: 60,
    minRep: 0,
    storyFlag: 'war_contract',
    descKey: 'mentor.battlefield',
  },
  {
    cityId: 'small_village',
    mentorKey: 'npc_wise_woman',
    techniqueId: 'poultice',
    cost: 10,
    minRep: 0,
    descKey: 'mentor.village_herb',
  },
  /* ── Round 6: the wound-surgeon's craft ─────────────────────────────
   * The four in MENTOR_ONLY below appear here and nowhere else. A man who
   * taught himself to cut for the stone from a book killed his patient, and
   * the trade knew it — these were passed hand to hand or not at all.
   */
  {
    cityId: 'nurnberg',
    mentorKey: 'npc_krafft',
    techniqueId: 'suture',
    cost: 70,
    minRep: 10,
    descKey: 'mentor.suture',
  },
  {
    cityId: 'monastery_ebrach',
    mentorKey: 'npc_monk',
    techniqueId: 'clyster',
    cost: 35,
    minRep: 0,
    descKey: 'mentor.clyster',
  },
  {
    cityId: 'bamberg',
    mentorKey: 'npc_bath_master',
    techniqueId: 'seton',
    cost: 48,
    minRep: 5,
    descKey: 'mentor.seton',
  },
  {
    cityId: 'rothenburg',
    mentorKey: 'npc_wise_woman',
    techniqueId: 'staunch_nose',
    cost: 26,
    minRep: 0,
    descKey: 'mentor.staunch_nose',
  },
  {
    cityId: 'war_camp',
    mentorKey: 'npc_field_barber',
    techniqueId: 'arrow_draw',
    cost: 110,
    minRep: 8,
    descKey: 'mentor.arrow_draw',
  },
  {
    cityId: 'war_camp',
    mentorKey: 'npc_field_barber',
    techniqueId: 'amputate',
    cost: 200,
    minRep: 20,
    descKey: 'mentor.amputate',
  },
  {
    cityId: 'augsburg',
    mentorKey: 'npc_merchant_leech',
    techniqueId: 'lithotomy',
    cost: 190,
    minRep: 22,
    descKey: 'mentor.lithotomy',
  },
  {
    cityId: 'wurzburg',
    mentorKey: 'npc_chapter_woundarzt',
    techniqueId: 'trepan',
    cost: 230,
    minRep: 26,
    descKey: 'mentor.trepan',
  },

];

export function mentorsInCity(cityId: string): MentorOffer[] {
  return MENTOR_OFFERS.filter((m) => m.cityId === cityId);
}

/** Every city that teaches something — used to point a lost player somewhere. */
export const MENTOR_CITIES: string[] = [...new Set(MENTOR_OFFERS.map((m) => m.cityId))];

/** Effective mentor price after fame discount */
export function mentorPrice(state: GameState, offer: MentorOffer): number {
  return Math.max(5, Math.round(offer.cost * mentorCostMult(state)));
}

/**
 * Multiplier applied when a Bader works an art out for himself instead of
 * paying a master.
 *
 * The Study screen used to sell every technique at its flat `unlockCost`,
 * which made all 20 mentor offers across 7 cities pointless and removed the
 * main reason to travel. Self-teaching is still possible — hard-gating it could
 * strand a player short of coin — but a master is far cheaper.
 */
export const SELF_TAUGHT_MULTIPLIER = 2.5;

/** Cities where a given art can be learned from a master. */
export function mentorCitiesFor(techniqueId: string): string[] {
  return [
    ...new Set(
      MENTOR_OFFERS.filter((m) => m.techniqueId === techniqueId).map((m) => m.cityId),
    ),
  ];
}

/**
 * Arts that cannot be had from a book at any price.
 *
 * The Study screen sold all 29 techniques for flat coin, which made 20 mentor
 * offers across 7 cities pointless — there was never a reason to travel. These
 * four are the answer: they are dangerous enough that the trade passed them
 * hand to hand, and the game now requires the same.
 */
export const MENTOR_ONLY = new Set(['arrow_draw', 'lithotomy', 'trepan', 'amputate']);

/** True when an art must be learned from a master rather than studied. */
export function isMentorOnly(techniqueId: string): boolean {
  return MENTOR_ONLY.has(techniqueId);
}

/** True when some master teaches this art — i.e. travelling would be cheaper. */
export function isMentorTaught(techniqueId: string): boolean {
  return MENTOR_OFFERS.some((m) => m.techniqueId === techniqueId);
}
