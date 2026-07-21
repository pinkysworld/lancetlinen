/**
 * A task leaves the list when it is done.
 *
 * A quest could only be completed by picking a dialogue choice carrying
 * `questAdvance`. Nothing the player did in the world closed one, so the hub
 * strip kept showing "the right to the stove" after the licence was bought and
 * "the gates of Nürnberg" while standing inside them. The list of things still
 * to do slowly became a list of things already done.
 *
 * The trap on the other side is worse: a completion predicate that reads a
 * flag nothing sets would leave the quest open forever. This project has done
 * exactly that once — `PLAGUE_YEAR` read `served_epidemic`, which existed
 * nowhere — so the first test here checks the predicates against the flags the
 * game actually writes.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { QUESTS } from '../src/game/data/story';
import { activeQuests, syncQuests } from '../src/game/systems/story';
import { createNewGame } from '../src/game/state';
import { newProperty } from '../src/game/systems/property';
import type { GameState } from '../src/game/types';

const SRC = join(process.cwd(), 'src');

/** Every story flag the game ever assigns. */
function flagsActuallySet(): Set<string> {
  const found = new Set<string>();
  const walk = (dir: string): void => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.ts')) {
        const src = readFileSync(p, 'utf8');
        for (const m of src.matchAll(/storyFlags\['([a-z_]+)'\]\s*=/g)) found.add(m[1]!);
        for (const m of src.matchAll(/setFlag: '([a-z_]+)'/g)) found.add(m[1]!);
      }
    }
  };
  walk(SRC);
  return found;
}

const fresh = (): GameState => createNewGame('Chronist', 'de');

describe('every quest can actually finish', () => {
  it('gives each one a goal in the world', () => {
    const without = QUESTS.filter((q) => !q.done);
    expect(without.map((q) => q.id)).toEqual([]);
  });

  it('never waits on a flag nothing sets', () => {
    // The predicates are read as source, because a flag typo cannot be caught
    // by calling them — a missing flag simply reads `undefined` and the quest
    // stays open for the rest of the game.
    const real = flagsActuallySet();
    const story = readFileSync(join(SRC, 'game/data/story.ts'), 'utf8');
    const questBlock = story.slice(story.indexOf('export const QUESTS'));
    const referenced = [...questBlock.matchAll(/storyFlags\['([a-z_]+)'\]/g)].map((m) => m[1]!);
    expect(referenced.length).toBeGreaterThan(6);
    const phantom = [...new Set(referenced)].filter((f) => !real.has(f));
    expect(phantom).toEqual([]);
  });
});

describe('the goals are the ones the player would expect', () => {
  it('closes the prologue once the cart is taken and the camp left', () => {
    const s = fresh();
    s.storyFlags['has_cart'] = true;
    s.locationId = 'nurnberg';
    syncQuests(s);
    expect(activeQuests(s).map((q) => q.id)).not.toContain('prologue');
  });

  it('closes the gates of Nürnberg on arriving there', () => {
    const s = fresh();
    s.quests.push({ id: 'first_city', stage: 0, completed: false, failed: false });
    s.locationId = 'nurnberg';
    syncQuests(s);
    expect(activeQuests(s).map((q) => q.id)).not.toContain('first_city');
  });

  it('closes the bath right when the bathhouse is standing', () => {
    const s = fresh();
    s.quests.push({ id: 'bath_rights', stage: 0, completed: false, failed: false });
    s.properties = [newProperty('nurnberg', 'bathhouse', 1)];
    syncQuests(s);
    expect(activeQuests(s).map((q) => q.id)).not.toContain('bath_rights');
  });

  it('leaves a quest open while its goal is unmet', () => {
    const s = fresh();
    s.quests.push({ id: 'bath_rights', stage: 0, completed: false, failed: false });
    syncQuests(s);
    expect(activeQuests(s).map((q) => q.id)).toContain('bath_rights');
  });
});

describe('closing one quest still opens the next', () => {
  it('runs the chain, not merely the hiding', () => {
    // `bath_rights` is what opens the rival, family and politics threads. If
    // this only hid the finished quest the campaign would stall.
    const s = fresh();
    s.quests.push({ id: 'bath_rights', stage: 0, completed: false, failed: false });
    s.storyFlags['bath_license'] = true;
    syncQuests(s);
    const open = activeQuests(s).map((q) => q.id);
    expect(open).toEqual(expect.arrayContaining(['rival_krafft', 'family_line', 'politics']));
  });

  it('settles in one call even when a chained quest is already satisfied', () => {
    // Buying the licence *and* already holding an office: politics opens and
    // must close in the same pass, or it appears for one frame and vanishes.
    const s = fresh();
    s.quests.push({ id: 'bath_rights', stage: 0, completed: false, failed: false });
    s.storyFlags['bath_license'] = true;
    s.office = 'quarter_warden';
    syncQuests(s);
    expect(activeQuests(s).map((q) => q.id)).not.toContain('politics');
  });
});

describe('it is safe to call as often as the hub redraws', () => {
  it('changes nothing on a second pass', () => {
    const s = fresh();
    s.storyFlags['has_cart'] = true;
    s.locationId = 'nurnberg';
    syncQuests(s);
    const after = JSON.stringify(s.quests);
    expect(syncQuests(s)).toBe(false);
    expect(JSON.stringify(s.quests)).toBe(after);
  });
});

describe('wired', () => {
  it('runs at the end of the day and when the hub opens', () => {
    const econ = readFileSync(join(SRC, 'game/systems/economy.ts'), 'utf8');
    const hub = readFileSync(join(SRC, 'game/scenes/HubScene.ts'), 'utf8');
    expect(econ).toContain('syncQuests(state)');
    expect(hub).toContain('syncQuests(st)');
  });
});
