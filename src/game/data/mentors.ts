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
  {
    cityId: 'bamberg',
    mentorKey: 'npc_clergy_surgeon',
    techniqueId: 'cupping',
    cost: 40,
    minRep: 8,
    descKey: 'mentor.cupping',
  },
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
    mentorKey: 'npc_clergy_surgeon',
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
    mentorKey: 'npc_clergy_surgeon',
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

/** True when some master teaches this art — i.e. travelling would be cheaper. */
export function isMentorTaught(techniqueId: string): boolean {
  return MENTOR_OFFERS.some((m) => m.techniqueId === techniqueId);
}
