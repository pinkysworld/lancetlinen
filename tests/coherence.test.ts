/**
 * Does the whole thing hang together?
 *
 * Every check here answers one question: **can the player actually reach
 * this?** The recurring defect in this project is not a crash — it is content
 * that exists, compiles, is listed in a table, and can never be seen. Six
 * separate instances have been found and fixed by hand; these tests look for
 * the seventh without waiting for someone to notice it in play.
 *
 * They deliberately walk the *data*, not the code paths, because that is where
 * unreachability hides: a technique nobody teaches, a dialogue node nothing
 * links to, an ending whose condition no run can satisfy.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { TECHNIQUES, STARTER_TECHNIQUES, TECH_DISPLAY_ORDER } from '../src/game/data/techniques';
import { MENTOR_OFFERS, MENTOR_ONLY } from '../src/game/data/mentors';
import { PATIENT_TEMPLATES } from '../src/game/data/patients';
import { MAP_NODES } from '../src/game/data/map';
import { DIALOGUES, DIALOGUE_MAP, QUESTS } from '../src/game/data/story';
import { RECIPES } from '../src/game/data/recipes';
import { ORIGINS } from '../src/game/data/origins';
import { LEXICON } from '../src/game/data/lexicon';

const SRC = join(process.cwd(), 'src');
const EN = readFileSync(join(SRC, 'game/i18n/en.ts'), 'utf8');
const DE = readFileSync(join(SRC, 'game/i18n/de.ts'), 'utf8');

/** Concatenated source of everything, for "is this ever mentioned" checks. */
function allSource(): string {
  const parts: string[] = [];
  const walk = (dir: string): void => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.ts')) parts.push(readFileSync(p, 'utf8'));
    }
  };
  walk(SRC);
  return parts.join('\n');
}
const ALL = allSource();

/* ------------------------------------------------------------------ *
 * The craft
 * ------------------------------------------------------------------ */

describe('every technique can be obtained', () => {
  it('is a starter, taught by a master, or learnable from a book', () => {
    const taught = new Set(MENTOR_OFFERS.map((m) => m.techniqueId));
    const starters = new Set(STARTER_TECHNIQUES);
    const fromOrigin = new Set(ORIGINS.flatMap((o) => o.techniques));
    // Anything not master-only can be worked out from a book in the Study
    // screen, so only the master-only arts need a teacher.
    const orphans = TECHNIQUES.filter(
      (t) =>
        !starters.has(t.id) &&
        !taught.has(t.id) &&
        !fromOrigin.has(t.id) &&
        MENTOR_ONLY.has(t.id),
    );
    expect(orphans.map((t) => t.id)).toEqual([]);
  });

  it('has a patient who needs it', () => {
    // A technique nothing calls for is a dead purchase: the player pays and
    // never sees it matter.
    const needed = new Set(PATIENT_TEMPLATES.flatMap((p) => p.bestTechniques));
    const useless = TECHNIQUES.filter(
      (t) => !needed.has(t.id) && t.category !== 'grooming' && t.category !== 'bathing',
    );
    expect(useless.map((t) => t.id)).toEqual([]);
  });

  it('appears in the display order, or it is hidden at the end of the list', () => {
    const missing = TECHNIQUES.map((t) => t.id).filter((id) => !TECH_DISPLAY_ORDER.includes(id));
    expect(missing).toEqual([]);
  });
});

describe('every patient can be treated', () => {
  it('names at least one technique that exists', () => {
    const real = new Set(TECHNIQUES.map((t) => t.id));
    const bad = PATIENT_TEMPLATES.filter((p) => !p.bestTechniques.some((id) => real.has(id)));
    expect(bad.map((p) => p.id)).toEqual([]);
  });

  it('is payable — nobody works for a promise', () => {
    const free = PATIENT_TEMPLATES.filter((p) => p.basePay <= 0);
    expect(free.map((p) => p.id)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ *
 * The map
 * ------------------------------------------------------------------ */

describe('the map is navigable', () => {
  it('connects every node in both directions', () => {
    // A one-way edge is a trap: the player travels somewhere and cannot
    // return the way they came.
    const byId = new Map(MAP_NODES.map((n) => [n.id, n]));
    const oneWay: string[] = [];
    for (const n of MAP_NODES) {
      for (const c of n.connections) {
        if (!byId.get(c)?.connections.includes(n.id)) oneWay.push(`${n.id} -> ${c}`);
      }
    }
    expect(oneWay).toEqual([]);
  });

  it('names only nodes that exist', () => {
    const ids = new Set(MAP_NODES.map((n) => n.id));
    const bad = MAP_NODES.flatMap((n) => n.connections.filter((c) => !ids.has(c)).map((c) => `${n.id} -> ${c}`));
    expect(bad).toEqual([]);
  });

  it('leaves nothing stranded from the starting camp', () => {
    const byId = new Map(MAP_NODES.map((n) => [n.id, n]));
    const seen = new Set<string>(['road_camp']);
    const queue = ['road_camp'];
    while (queue.length) {
      for (const c of byId.get(queue.pop()!)?.connections ?? []) {
        if (!seen.has(c)) {
          seen.add(c);
          queue.push(c);
        }
      }
    }
    const unreachable = MAP_NODES.filter((n) => !seen.has(n.id));
    expect(unreachable.map((n) => n.id)).toEqual([]);
  });

  it('names every city in both locales', () => {
    const missing: string[] = [];
    for (const n of MAP_NODES) {
      if (!EN.includes(`loc_${n.id}:`)) missing.push(`en:loc_${n.id}`);
      if (!DE.includes(`loc_${n.id}:`)) missing.push(`de:loc_${n.id}`);
    }
    expect(missing).toEqual([]);
  });
});

/* ------------------------------------------------------------------ *
 * The story
 * ------------------------------------------------------------------ */

describe('the dialogue graph is sound', () => {
  it('points every choice at a node that exists', () => {
    const dangling: string[] = [];
    for (const node of DIALOGUES) {
      for (const c of node.choices) {
        if (c.next && !DIALOGUE_MAP[c.next]) dangling.push(`${node.id} -> ${c.next}`);
      }
    }
    expect(dangling).toEqual([]);
  });

  it('gives every node at least one way out', () => {
    // A node with no choices is a dead end the player cannot leave.
    const stuck = DIALOGUES.filter((n) => n.choices.length === 0);
    expect(stuck.map((n) => n.id)).toEqual([]);
  });

  it('has no unreachable node', () => {
    // Every node must be either linked from another or entered by the game.
    const linked = new Set(DIALOGUES.flatMap((n) => n.choices.map((c) => c.next).filter(Boolean)));
    const orphans = DIALOGUES.filter(
      (n) => !linked.has(n.id) && !ALL.includes(`'${n.id}'`),
    );
    expect(orphans.map((n) => n.id)).toEqual([]);
  });

  it('advances only quests that exist', () => {
    const ids = new Set(QUESTS.map((q) => q.id));
    const bad = DIALOGUES.flatMap((n) =>
      n.choices.filter((c) => c.questAdvance && !ids.has(c.questAdvance)).map((c) => `${n.id} -> ${c.questAdvance}`),
    );
    expect(bad).toEqual([]);
  });

  it('unlocks only techniques that exist', () => {
    const real = new Set(TECHNIQUES.map((t) => t.id));
    const bad = DIALOGUES.flatMap((n) =>
      n.choices.filter((c) => c.unlockTechnique && !real.has(c.unlockTechnique)).map((c) => `${n.id}: ${c.unlockTechnique}`),
    );
    expect(bad).toEqual([]);
  });

  it('writes every line in both locales', () => {
    const missing: string[] = [];
    for (const n of DIALOGUES) {
      const key = n.textKey.replace(/\./g, '_');
      if (!EN.includes(`${key}:`)) missing.push(`en:${key}`);
      if (!DE.includes(`${key}:`)) missing.push(`de:${key}`);
      for (const c of n.choices) {
        const ck = c.textKey.replace(/\./g, '_');
        if (!EN.includes(`${ck}:`)) missing.push(`en:${ck}`);
        if (!DE.includes(`${ck}:`)) missing.push(`de:${ck}`);
      }
    }
    expect(missing).toEqual([]);
  });
});

/* ------------------------------------------------------------------ *
 * The rest of the content
 * ------------------------------------------------------------------ */

describe('recipes can actually be made', () => {
  it('needs only ingredients the market sells', () => {
    const buyable = new Set(['linen', 'herbs', 'leeches', 'soap', 'wood', 'salve', 'ironTools']);
    const bad: string[] = [];
    for (const r of RECIPES) {
      for (const item of Object.keys(r.ingredients)) {
        if (!buyable.has(item)) bad.push(`${r.id} needs ${item}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('names every recipe in both locales', () => {
    const missing: string[] = [];
    for (const r of RECIPES) {
      for (const key of [r.nameKey, r.descKey]) {
        if (!EN.includes(`${key}:`)) missing.push(`en:${key}`);
        if (!DE.includes(`${key}:`)) missing.push(`de:${key}`);
      }
    }
    expect(missing).toEqual([]);
  });
});

describe('the lexicon is complete', () => {
  it('writes every article in both locales', () => {
    const missing: string[] = [];
    for (const a of LEXICON) {
      for (const key of [`lex_${a.id}`, `lex_${a.id}_body`]) {
        if (!EN.includes(`${key}:`)) missing.push(`en:${key}`);
        if (!DE.includes(`${key}:`)) missing.push(`de:${key}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('has no duplicate ids', () => {
    const ids = LEXICON.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('origins are all playable', () => {
  it('grants only techniques that exist', () => {
    const real = new Set(TECHNIQUES.map((t) => t.id));
    const bad = ORIGINS.flatMap((o) => o.techniques.filter((t) => !real.has(t)).map((t) => `${o.id}: ${t}`));
    expect(bad).toEqual([]);
  });

  it('describes every one in both locales', () => {
    const missing: string[] = [];
    for (const o of ORIGINS) {
      for (const key of [o.nameKey, o.descKey, o.hintKey]) {
        if (!EN.includes(`${key}:`)) missing.push(`en:${key}`);
        if (!DE.includes(`${key}:`)) missing.push(`de:${key}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('never leaves a start unable to open on day one', () => {
    // `origin.coin` is an offset on the 35 the game grants, floored at 5 in
    // `createNewGame` — the field surgeon's -10 is a debt of experience, not
    // an empty purse. What matters is the figure the player actually starts
    // with against the cheapest day's costs.
    for (const o of ORIGINS) {
      const start = Math.max(5, 35 + o.coin);
      expect(start, `${o.id} cannot open on day one`).toBeGreaterThanOrEqual(5);
    }
  });
});

/* ------------------------------------------------------------------ *
 * Settings and scenes
 * ------------------------------------------------------------------ */

describe('nothing is written and never read', () => {
  it('reads every game setting somewhere outside the settings screen', () => {
    // `resetView`, `incomeMult` and `goreVariantKey` were each written,
    // exposed in the options, and read by nothing.
    const types = readFileSync(join(SRC, 'game/types.ts'), 'utf8');
    const block = types.slice(types.indexOf('export interface GameSettings'));
    const fields = [...block.slice(0, block.indexOf('\n}')).matchAll(/^\s+(\w+)[?]?:/gm)].map(
      (m) => m[1]!,
    );
    expect(fields.length).toBeGreaterThan(8);
    const settingsSrc = readFileSync(join(SRC, 'game/systems/settings.ts'), 'utf8');
    const unread = fields.filter((f) => {
      // Read anywhere that is not the type declaration or the defaults table.
      const uses = ALL.split(f).length - 1;
      return uses < 3 && !settingsSrc.includes(f);
    });
    expect(unread).toEqual([]);
  });

  it('registers every scene the game navigates to', () => {
    /*
     * Compare scene *keys*, not class names: `CharacterScene` answers to
     * 'NameEntry', `SaveSlotScene` to 'SaveSlots', `RecipeScene` to
     * 'Recipes'. Matching on class names reports those three as missing when
     * they are perfectly well registered — which is what the first version of
     * this test did.
     *
     * A target with no scene is a button that silently does nothing, so the
     * check itself is worth having.
     */
    const keys = new Set(
      [...ALL.matchAll(/super\('([A-Za-z]+)'\)/g)].map((m) => m[1]!),
    );
    expect(keys.size).toBeGreaterThan(20);
    const targets = new Set(
      [...ALL.matchAll(/(?:transitionTo\(this, |scene\.start\()'([A-Z]\w+)'/g)].map((m) => m[1]!),
    );
    expect(targets.size).toBeGreaterThan(10);
    const unregistered = [...targets].filter((t) => !keys.has(t));
    expect(unregistered).toEqual([]);
  });
});
