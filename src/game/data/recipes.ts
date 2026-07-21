/**
 * Preparing remedies.
 *
 * The game had exactly one recipe — `craftSalve`, two herbs and a linen into
 * two salve — which is not a system, it is a button. A Bader's day genuinely
 * involved compounding: the apothecary's trade and the barber-surgeon's
 * overlapped constantly, and most practitioners made their own plasters,
 * washes and drinks rather than buying them.
 *
 * ## Historical basis
 *
 * Every recipe here is a preparation actually used in the Latin West before
 * 1400. Where a preparation is famous but later, it is left out — the
 * four-thieves vinegar everyone associates with plague doctors is seventeenth
 * century and has no business here.
 *
 * The ingredient lists are simplified. Real receipts run to dozens of items
 * and vary by manuscript; what is kept is the character of the preparation and
 * one or two things that identify it.
 *
 * ## How it hangs together
 *
 * Recipes consume stock from the inventory plus coin for what a Bader would
 * have bought in rather than kept — honey, wine, spices, and in one case
 * opium. They produce *remedies*, held in their own record so that adding one
 * needs no save migration.
 *
 * Quality is decided by Eye (judging the mixture) and Hand (the making), so
 * the stats already in the game carry it. A poor batch still works, just less.
 */
import type { GameState, Inventory, Stats, TechniqueCategory } from '../types';

/** What a recipe takes from the shelf. */
export type Ingredients = Partial<Record<keyof Inventory, number>>;

export interface Recipe {
  id: string;
  nameKey: string;
  /** Two or three sentences: what it is, and what it was used for. */
  descKey: string;
  ingredients: Ingredients;
  /** Coin for what is bought in — honey, wine, spices. */
  coin: number;
  /** Units produced by one successful batch. */
  yield: number;
  /** Minimum Eye to attempt it at all. Judging a mixture is the hard part. */
  minEye: number;
  /** Which stat governs the quality roll. */
  governs: keyof Stats;
  /**
   * What the remedy does when used. Read by `treatment.ts`; a remedy with no
   * effect would be decoration.
   */
  effect: RemedyEffect;
}

export interface RemedyEffect {
  /** Added to the treatment success chance, before clamping. */
  successBonus?: number;
  /** Multiplier on pay — a patient pays more for a named preparation. */
  payMult?: number;
  /** Reduces the chance a failure becomes a death. */
  safety?: number;
  /**
   * Only applies to techniques in this category; omit for any.
   * Must match a `category` in `data/techniques.ts` — grooming, bathing,
   * blood, dental, wound, herb, advanced.
   */
  forCategory?: TechniqueCategory;
}

export const RECIPES: Recipe[] = [
  {
    id: 'wound_drink',
    nameKey: 'rec_wound_drink',
    descKey: 'rec_wound_drink_desc',
    // Yarrow, sanicle and bugle steeped in wine — the standard vulnerary.
    ingredients: { herbs: 3 },
    coin: 4,
    yield: 3,
    minEye: 2,
    governs: 'eye',
    effect: { successBonus: 0.06, safety: 0.15, forCategory: 'wound' },
  },
  {
    id: 'populeon',
    nameKey: 'rec_populeon',
    descKey: 'rec_populeon_desc',
    // Unguentum populeon: poplar buds in lard, a cooling salve.
    ingredients: { herbs: 2, salve: 1 },
    coin: 3,
    yield: 3,
    minEye: 2,
    governs: 'hand',
    effect: { successBonus: 0.05, payMult: 1.1 },
  },
  {
    id: 'oxymel',
    nameKey: 'rec_oxymel',
    descKey: 'rec_oxymel_desc',
    // Vinegar and honey. Galenic, and held to cut phlegm.
    ingredients: { herbs: 1 },
    coin: 6,
    yield: 4,
    minEye: 2,
    governs: 'eye',
    effect: { successBonus: 0.07, forCategory: 'herb' },
  },
  {
    id: 'draw_plaster',
    nameKey: 'rec_draw_plaster',
    descKey: 'rec_draw_plaster_desc',
    // Pitch and resin spread on linen, to draw an abscess to a head.
    ingredients: { linen: 2, salve: 1, wood: 1 },
    coin: 5,
    yield: 3,
    minEye: 3,
    governs: 'hand',
    effect: { successBonus: 0.09, forCategory: 'wound' },
  },
  {
    id: 'sage_wash',
    nameKey: 'rec_sage_wash',
    descKey: 'rec_sage_wash_desc',
    // Sage and vinegar, for the mouth. Simple, cheap, and genuinely useful.
    ingredients: { herbs: 2 },
    coin: 2,
    yield: 4,
    minEye: 1,
    governs: 'eye',
    effect: { successBonus: 0.08, forCategory: 'dental' },
  },
  {
    id: 'aqua_vitae',
    nameKey: 'rec_aqua_vitae',
    descKey: 'rec_aqua_vitae_desc',
    // Distilled spirit. New in this period and treated as a potent medicine.
    ingredients: { herbs: 2, wood: 2 },
    coin: 14,
    yield: 2,
    minEye: 4,
    governs: 'hand',
    effect: { successBonus: 0.1, payMult: 1.25, safety: 0.1 },
  },
  {
    id: 'rose_water',
    nameKey: 'rec_rose_water',
    descKey: 'rec_rose_water_desc',
    // Rose water for the eyes, and for washing a wound before dressing.
    ingredients: { herbs: 2, soap: 1 },
    coin: 7,
    yield: 3,
    minEye: 3,
    governs: 'eye',
    effect: { successBonus: 0.06, payMult: 1.15 },
  },
  {
    id: 'theriac',
    nameKey: 'rec_theriac',
    descKey: 'rec_theriac_desc',
    // Theriaca: the great compound antidote, dozens of ingredients including
    // opium, aged for months. Venice and Nürnberg both made it publicly and
    // under oath. Expensive, prestigious, and the closest thing the period had
    // to a cure-all.
    ingredients: { herbs: 6, salve: 2 },
    coin: 40,
    yield: 2,
    minEye: 6,
    governs: 'eye',
    effect: { successBonus: 0.14, payMult: 1.5, safety: 0.2 },
  },
];

export const RECIPE_MAP: Record<string, Recipe> = Object.fromEntries(
  RECIPES.map((r) => [r.id, r]),
);

/* ------------------------------------------------------------------ *
 * Stock
 * ------------------------------------------------------------------ */

/** How many of a remedy the player holds. Absent on saves predating this. */
export function remedyCount(state: GameState, id: string): number {
  return state.remedies?.[id] ?? 0;
}

export function addRemedy(state: GameState, id: string, n: number): void {
  if (!state.remedies) state.remedies = {};
  state.remedies[id] = (state.remedies[id] ?? 0) + n;
}

export function consumeRemedy(state: GameState, id: string): boolean {
  if (remedyCount(state, id) < 1) return false;
  state.remedies![id] = remedyCount(state, id) - 1;
  return true;
}

/* ------------------------------------------------------------------ *
 * Making
 * ------------------------------------------------------------------ */

export type CraftFailure = 'skill' | 'ingredients' | 'coin';

export interface CraftResult {
  ok: boolean;
  reason?: CraftFailure;
  /** Units produced. Below the recipe's yield on a poor batch. */
  made?: number;
  /** 0..1. Shown to the player so the stat investment is visible. */
  quality?: number;
}

/** Why a recipe cannot be attempted right now, or null if it can. */
export function craftBlocker(state: GameState, recipe: Recipe): CraftFailure | null {
  if (state.stats.eye < recipe.minEye) return 'skill';
  for (const [item, n] of Object.entries(recipe.ingredients)) {
    if (state.inventory[item as keyof Inventory] < (n ?? 0)) return 'ingredients';
  }
  if (state.coin < recipe.coin) return 'coin';
  return null;
}

/**
 * Make a batch.
 *
 * Never fails outright once started: a badly judged batch yields less rather
 * than nothing, because losing scarce ingredients to a dice roll is punishing
 * without being interesting. The stat that governs decides how much comes out.
 */
export function craft(state: GameState, recipeId: string, rand = Math.random): CraftResult {
  const recipe = RECIPE_MAP[recipeId];
  if (!recipe) return { ok: false, reason: 'skill' };

  const blocker = craftBlocker(state, recipe);
  if (blocker) return { ok: false, reason: blocker };

  for (const [item, n] of Object.entries(recipe.ingredients)) {
    state.inventory[item as keyof Inventory] -= n ?? 0;
  }
  state.coin -= recipe.coin;

  // Skill sets the floor, the roll sets the rest. A stat of 10 still leaves a
  // little variance, because compounding by eye is not a solved problem.
  const skill = Math.max(0, Math.min(10, state.stats[recipe.governs])) / 10;
  const quality = Math.max(0.35, Math.min(1, skill * 0.75 + rand() * 0.35));
  const made = Math.max(1, Math.round(recipe.yield * quality));

  addRemedy(state, recipe.id, made);
  return { ok: true, made, quality };
}

/* ------------------------------------------------------------------ *
 * Use
 * ------------------------------------------------------------------ */

/**
 * Best remedy the player holds for a technique, or null.
 *
 * Picks the strongest applicable one rather than asking, because a prompt
 * before every treatment would be tiresome. Category-specific remedies are
 * preferred over general ones at equal strength — using theriac on a tooth
 * would be a waste.
 */
export function bestRemedyFor(
  state: GameState,
  category: TechniqueCategory,
): Recipe | null {
  const held = RECIPES.filter((r) => remedyCount(state, r.id) > 0).filter(
    (r) => !r.effect.forCategory || r.effect.forCategory === category,
  );
  if (!held.length) return null;
  return held.sort((a, b) => {
    const specific = Number(!!b.effect.forCategory) - Number(!!a.effect.forCategory);
    if (specific !== 0) return specific;
    return (b.effect.successBonus ?? 0) - (a.effect.successBonus ?? 0);
  })[0]!;
}
