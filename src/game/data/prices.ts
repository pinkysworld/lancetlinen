/**
 * What a place charges, and what it pays.
 *
 * ## Why this exists
 *
 * `marketPrices` quoted one price list for the whole map: herbs cost the same
 * at a Cistercian house with a physic garden as in the middle of Nürnberg, and
 * `applyTreatment` had no location term at all — a noble's fee in Mühlbach
 * equalled a noble's fee in an imperial city. Every settlement was
 * economically identical, so travelling was a cost with no commercial reason.
 *
 * ## The history the numbers come from
 *
 * These are not decorative. Each figure follows something specific about the
 * place in the 1380s:
 *
 * - **Nürnberg** was the Empire's metalworking town — wire-drawing, blades,
 *   fine instruments, the trade later summed up as *Nürnberger Tand*. Iron
 *   goods are cheap here and nowhere else. Its long-distance trade also made
 *   it expensive to live in: firewood and garden herbs came in from outside.
 * - **Augsburg** was a weaving town: *Barchent* (fustian, linen warp with
 *   cotton weft) was its staple long before the Fugger. Linen is cheapest here.
 * - **Ebrach** was Cistercian (founded 1127, the first house east of the
 *   Rhine). Monastic infirmaries kept physic gardens, and the order's statutes
 *   restricted practising for gain — so herbs are cheap and fees are poor,
 *   because what you get is alms and hospitality, not silver.
 * - **Mühlbach**, a village: food, wood and herbs are local and cheap;
 *   anything worked by a craftsman has to be carted in and costs more. Nobody
 *   there has much to pay a Bader with.
 * - **The war camp**: everything is scarce and dear, and men who have just
 *   been cut pay whatever is asked.
 * - **Würzburg** and **Bamberg** are episcopal cities — substantial, but
 *   neither a metal town nor a weaving town.
 *
 * Fees follow the same logic: the fee multiplier is what a place's custom will
 * bear, before the patient's own station (`classPayMult`) is applied.
 */
import type { GameState } from '../types';

/** Supply items that can carry a local price. Mirrors `marketPrices`. */
export type PricedItem =
  | 'linen'
  | 'herbs'
  | 'leeches'
  | 'soap'
  | 'wood'
  | 'salve'
  | 'ironTools';

export interface PriceProfile {
  /** Multiplier on treatment fees earned here. */
  fee: number;
  /** Per-item multipliers on supply prices. Absent means 1. */
  goods: Partial<Record<PricedItem, number>>;
  /**
   * The one thing worth saying about this market, shown in the market screen.
   * A price difference the player cannot see is not depth, only noise.
   */
  noteKey: string;
}

/**
 * Defaults for a settlement with no entry of its own, by node type.
 *
 * Keeps a new map node economically sane rather than silently neutral.
 */
const FALLBACK: PriceProfile = { fee: 1, goods: {}, noteKey: 'market_note_plain' };

const PROFILES: Record<string, PriceProfile> = {
  road_camp: {
    fee: 0.75,
    goods: { herbs: 0.9, wood: 0.7, ironTools: 1.4, soap: 1.3, salve: 1.25, linen: 1.2 },
    noteKey: 'market_note_road_camp',
  },
  small_village: {
    fee: 0.7,
    goods: { herbs: 0.7, wood: 0.6, leeches: 0.8, ironTools: 1.4, soap: 1.3, salve: 1.2 },
    noteKey: 'market_note_village',
  },
  monastery_ebrach: {
    fee: 0.6,
    goods: { herbs: 0.5, salve: 0.7, linen: 0.9, wood: 0.8, ironTools: 1.5, soap: 1.15 },
    noteKey: 'market_note_monastery',
  },
  rothenburg: {
    fee: 0.95,
    goods: { wood: 0.85, herbs: 0.9, linen: 1.05 },
    noteKey: 'market_note_rothenburg',
  },
  nurnberg: {
    fee: 1.25,
    goods: { ironTools: 0.7, soap: 0.85, linen: 0.9, herbs: 1.15, wood: 1.2 },
    noteKey: 'market_note_nurnberg',
  },
  bamberg: {
    fee: 1.0,
    goods: { linen: 0.95, herbs: 0.95, wood: 0.9 },
    noteKey: 'market_note_bamberg',
  },
  wurzburg: {
    fee: 1.05,
    goods: { salve: 0.9, herbs: 0.95, ironTools: 1.1 },
    noteKey: 'market_note_wurzburg',
  },
  augsburg: {
    fee: 1.2,
    goods: { linen: 0.75, soap: 0.9, ironTools: 0.95, herbs: 1.1, wood: 1.15 },
    noteKey: 'market_note_augsburg',
  },
  war_camp: {
    fee: 1.15,
    goods: { linen: 1.6, herbs: 1.5, leeches: 1.4, ironTools: 1.3, salve: 1.5, soap: 1.4 },
    noteKey: 'market_note_war_camp',
  },
};

export function priceProfile(nodeId: string): PriceProfile {
  return PROFILES[nodeId] ?? FALLBACK;
}

/** Local multiplier for one supply item. */
export function localGoodsMult(nodeId: string, item: PricedItem): number {
  return priceProfile(nodeId).goods[item] ?? 1;
}

/**
 * What local custom will pay for a treatment, before the patient's station.
 *
 * Applied on top of `classPayMult` and `reputationPayMult`, not instead of
 * them: a noble still pays more than a peasant everywhere, but both pay more
 * in Nürnberg than in Mühlbach.
 */
export function localFeeMult(state: GameState): number {
  return priceProfile(state.locationId).fee;
}

/** The line the market screen prints about where the player is standing. */
export function marketNoteKey(nodeId: string): string {
  return priceProfile(nodeId).noteKey;
}
