import { afterEach, describe, expect, it, vi } from 'vitest';

// Queue generation uses the portrait selector, whose renderer helpers import
// Phaser. These logic tests deliberately exercise the queue without a canvas.
vi.mock('phaser', () => ({ default: {} }));

import { createNewGame, exportSave, hasSave, importSave, saveGame, setState } from '../src/game/state';
import type { GameState } from '../src/game/types';
import { activeFestival, rollCityEvent } from '../src/game/systems/events';
import { addJournal } from '../src/game/systems/journal';
import { canMarryNow, courtAction, marry, startCourtship } from '../src/game/systems/family';
import { getNextStep } from '../src/game/systems/guidance';
import { atLeast, firstUnmet, must } from '../src/game/systems/requirements';
import { clearQueue, getQueue, poolRemaining } from '../src/game/systems/queue';
import { resetStorageForTests, type KeyValueStore } from '../src/game/systems/storage';

const fresh = (): GameState => createNewGame('Test');

afterEach(() => {
  vi.restoreAllMocks();
  resetStorageForTests();
  clearQueue();
});

describe('city events and calendar support', () => {
  it('applies one eligible event, journals it, and honours its cooldown', () => {
    const s = fresh();
    s.day = 3;
    s.lastCityEventDay = 0;
    const before = s.coin;
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const event = rollCityEvent(s);
    expect(event?.id).toBe('market_rush');
    expect(s.coin).toBe(before + 5);
    expect(s.journal[0]?.textKey).toBe('event_market_rush');
    expect(rollCityEvent(s)).toBeNull();
  });

  it('only activates festivals in their documented calendar window', () => {
    const s = fresh();
    s.weekday = 3;
    s.season = 1;
    s.day = 3;
    expect(activeFestival(s)?.id).toBe('midsummer');
    s.day = 12;
    expect(activeFestival(s)).toBeNull();
  });
});

describe('family, requirements, and guidance', () => {
  it('turns courtship into a gated marriage with a visible reason', () => {
    const s = fresh();
    s.coin = 200;
    s.honour = 80;
    expect(startCourtship(s, 'greta_weber')).toBe(true);
    // Courtship is deliberately paced by days: repeated clicks on one
    // afternoon are refused, while a sequence of real visits remains viable.
    while (s.courtshipProgress < 80) {
      expect(courtAction(s, 'gift')).toBe(true);
      s.day += 1;
    }
    expect(canMarryNow(s).ok).toBe(true);
    expect(marry(s)).toBe(true);
    expect(s.spouse?.name).toBe('suitor_greta');
    expect(s.courtshipTarget).toBeNull();
  });

  it('reports the first unmet requirement rather than a later, misleading one', () => {
    expect(firstUnmet(must(false, 'req_license'), atLeast('req_coin', 2, 20))).toEqual({
      ok: false, reasonKey: 'req_license',
    });
  });

  it('gives a new player a concrete first action', () => {
    const s = fresh();
    expect(getNextStep(s)).toMatchObject({ action: 'story', bodyKey: 'guide_intro' });
    s.storyFlags['intro_done'] = true;
    expect(getNextStep(s)).toMatchObject({ action: 'open', bodyKey: 'guide_first_patient' });
  });
});

describe('journal, queue, and persistence safeguards', () => {
  it('normalizes journal keys and retains only the newest 80 entries', () => {
    const s = fresh();
    for (let i = 0; i < 82; i += 1) addJournal(s, `story.entry_${i}`, 'story');
    expect(s.journal).toHaveLength(80);
    expect(s.journal[0]?.textKey).toBe('story_entry_81');
    expect(s.journal.at(-1)?.textKey).toBe('story_entry_2');
  });

  it('never surfaces queued patients when none remain, including corrupt counters', () => {
    const s = fresh();
    s.storyFlags['patients_remaining'] = -4;
    expect(poolRemaining(s)).toBe(0);
    expect(getQueue(s)).toEqual([]);
    clearQueue();
    s.storyFlags['patients_remaining'] = 0;
    expect(getQueue(s)).toEqual([]);
  });

  it('round-trips a manual save through the storage abstraction', () => {
    const values = new Map<string, string>();
    const store: KeyValueStore = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => void values.set(key, value),
      removeItem: (key) => void values.delete(key),
    };
    resetStorageForTests(store);
    const s = fresh();
    s.coin = 77;
    setState(s);
    expect(saveGame(1).ok).toBe(true);
    expect(hasSave(1)).toBe(true);
    const backup = exportSave();
    expect(backup).not.toBeNull();
    expect(importSave(backup!)).toMatchObject({ ok: true });
  });
});
