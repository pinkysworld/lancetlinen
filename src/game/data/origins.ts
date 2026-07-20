/**
 * Where the Bader came from.
 *
 * Character creation was a list of seven first names and nothing else — every
 * run started with identical stats, coin and standing, which is a large part of
 * why the content audit found no reason to play twice.
 *
 * Origin is the natural place to put that variance, because in 1382 where a
 * man came from *was* his standing. The trade drew people from very different
 * places, and the town's opinion of a Bader depended heavily on which.
 *
 * Every origin is historically attested:
 *
 * - **Bader's son** — the trade was largely hereditary, and so was its taint.
 * - **Feldscher** — army wound-surgeons, who saw more trauma in a season than
 *   a town Bader saw in a decade, and were regarded as butchers for it.
 * - **Monastery scholar** — monastic infirmaries preserved Galenic theory;
 *   literacy was rare and conferred real standing.
 * - **Wandering journeyman** — the *Wanderjahre* were normal practice; a
 *   travelled man knew people in several towns.
 * - **Bather's widow** — widows could and did continue a husband's trade, with
 *   guild permission that was granted grudgingly and often contested.
 * - **Executioner's kin** — the sharpest case. Scharfrichter were the most
 *   dishonourable people in the city *and* sought-after healers: they knew
 *   bone-setting and anatomy from their work, and townspeople quietly consulted
 *   them. It is the strongest skills-versus-honour trade in the game, and it is
 *   not an invention.
 *
 * The honour offsets are what tie this to the game's spine: an origin that
 * starts you skilled generally starts you disreputable, and the guild,
 * marriage and civic office all gate on honour (see `systems/honour.ts`).
 */
import type { Stats } from '../types';

export interface Origin {
  id: string;
  /** i18n key for the name of the origin. */
  nameKey: string;
  /** i18n key for the two-line flavour description. */
  descKey: string;
  /** i18n key for the one-line mechanical summary shown under the stats. */
  hintKey: string;
  /** Portrait texture key. Commissioned art — see `ART_TODO_5.md`. */
  portraitKey: string;
  /**
   * Existing portrait to use until the commissioned one exists.
   *
   * `addPortrait` already falls back, but it falls back to the same peasant
   * face for everything — six identical faces would look worse than six
   * approximate ones.
   */
  fallbackPortrait: string;
  /** Added to `defaultStats()`. */
  stats: Partial<Stats>;
  /** Added to the starting 35 coin. */
  coin: number;
  /** Added to `HONOUR_START` (30). The whole point of the system. */
  honour: number;
  /** Technique ids granted on top of `STARTER_TECHNIQUES`. */
  techniques: string[];
  /** Suggested given names, period-appropriate and fitting the origin. */
  names: string[];
}

export const ORIGINS: Origin[] = [
  {
    id: 'bader_son',
    nameKey: 'origin_bader_son',
    descKey: 'origin_bader_son_desc',
    hintKey: 'origin_bader_son_hint',
    portraitKey: 'port_origin_bader_son',
    fallbackPortrait: 'port_artisan',
    // Grew up in the bathhouse: steady hands, a good eye, and the back that
    // comes from years of hauling water and feeding the boiler. The back is
    // not decoration — without it the scholar dominated this origin outright,
    // being better in coin and standing at equal skill.
    stats: { hand: 1, eye: 1, back: 1 },
    coin: 5,
    honour: -2,
    techniques: ['cupping'],
    names: ['Elias', 'Hans', 'Otto', 'Kunz'],
  },
  {
    id: 'field_surgeon',
    nameKey: 'origin_field_surgeon',
    descKey: 'origin_field_surgeon_desc',
    hintKey: 'origin_field_surgeon_hint',
    portraitKey: 'port_origin_field_surgeon',
    fallbackPortrait: 'port_soldier',
    // Enormous practical skill, bought at the cost of a reputation for butchery.
    stats: { hand: 2, back: 1, soul: -1 },
    coin: -10,
    honour: -6,
    techniques: ['wound_dress', 'battlefield_pack'],
    names: ['Wolfram', 'Berthold', 'Dietrich', 'Kaspar'],
  },
  {
    id: 'monastery_scholar',
    nameKey: 'origin_monastery_scholar',
    descKey: 'origin_monastery_scholar_desc',
    hintKey: 'origin_monastery_scholar_hint',
    portraitKey: 'port_origin_monastery_scholar',
    fallbackPortrait: 'port_clergy',
    // Reads Latin and knows the humours; has never set a bone in his life.
    stats: { eye: 2, soul: 1, hand: -1 },
    coin: 15,
    honour: 9,
    techniques: ['herbal_draught'],
    names: ['Gregor', 'Anselm', 'Matthias', 'Konrad'],
  },
  {
    id: 'journeyman',
    nameKey: 'origin_journeyman',
    descKey: 'origin_journeyman_desc',
    hintKey: 'origin_journeyman_hint',
    portraitKey: 'port_origin_journeyman',
    fallbackPortrait: 'port_youth',
    // The Wanderjahre: knows the roads and how to talk to strangers.
    stats: { tongue: 2, back: 1 },
    coin: 0,
    honour: 2,
    techniques: [],
    names: ['Jost', 'Lienhart', 'Veit', 'Michel'],
  },
  {
    id: 'bath_widow',
    nameKey: 'origin_bath_widow',
    descKey: 'origin_bath_widow_desc',
    hintKey: 'origin_bath_widow_hint',
    portraitKey: 'port_origin_bath_widow',
    fallbackPortrait: 'port_woman',
    // Inherits the premises and the custom; must hold both against the guild.
    stats: { tongue: 1, eye: 1 },
    coin: 40,
    honour: -3,
    techniques: [],
    names: ['Greta', 'Agnes', 'Clara', 'Margarethe'],
  },
  {
    id: 'executioner_kin',
    nameKey: 'origin_executioner_kin',
    descKey: 'origin_executioner_kin_desc',
    hintKey: 'origin_executioner_kin_hint',
    portraitKey: 'port_origin_executioner_kin',
    fallbackPortrait: 'port_soldier2',
    // The hardest start, and the most interesting: real anatomical knowledge
    // and a name no honest household will say aloud.
    stats: { hand: 2, eye: 1, soul: 1 },
    coin: -15,
    honour: -14,
    techniques: ['fracture_set', 'wound_dress'],
    names: ['Meister Franz', 'Ruprecht', 'Barbara', 'Ursel'],
  },
];

export const ORIGIN_MAP: Record<string, Origin> = Object.fromEntries(
  ORIGINS.map((o) => [o.id, o]),
);

/** The origin a save was created with, or the hereditary default. */
export function originById(id: string | undefined): Origin {
  return (id && ORIGIN_MAP[id]) || ORIGINS[0]!;
}

/** Apply an origin's stat offsets, clamped so nothing drops below 1. */
export function applyOriginStats(base: Stats, origin: Origin): Stats {
  const out = { ...base };
  for (const key of Object.keys(out) as Array<keyof Stats>) {
    out[key] = Math.max(1, out[key] + (origin.stats[key] ?? 0));
  }
  return out;
}
