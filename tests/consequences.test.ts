/**
 * The game remembers.
 *
 * Three additions with one purpose: nothing the player does should vanish
 * without an echo. The missed leper returns, the ending reads the run, and
 * Krafft gets a last word. Each was a loose thread found by measurement —
 * `lepra_missed` was counted and read by nothing (this project's recurring
 * defect, this time written by me the day before), and the five endings were
 * one identical sentence per run.
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

vi.mock('phaser', () => ({ default: {} }));

import { SCENARIOS, applyScenarioChoice, getScenario } from '../src/game/systems/scenarios';
import { epilogueLines, applyChoice, pendingStoryDialogue } from '../src/game/systems/story';
import { DIALOGUE_MAP } from '../src/game/data/story';
import { resolveLepraschau, makeLepraCase } from '../src/game/systems/lepraschau';
import { createNewGame } from '../src/game/state';
import type { GameState } from '../src/game/types';

const EN = readFileSync(join(process.cwd(), 'src/game/i18n/en.ts'), 'utf8');
const DE = readFileSync(join(process.cwd(), 'src/game/i18n/de.ts'), 'utf8');

const fresh = (): GameState => createNewGame('Chronist', 'de');

/* ------------------------------------------------------------------ *
 * A1 — the man you cleared comes back
 * ------------------------------------------------------------------ */

describe('the missed case returns', () => {
  const sc = getScenario('lepra_return')!;

  it('exists and waits on the counter the Lepraschau writes', () => {
    // `requireFlag` passes on truthiness; the counter is a number, so any
    // missed case arms it. This is the read side `lepra_missed` never had.
    expect(sc).toBeDefined();
    expect(sc.requireFlag).toBe('lepra_missed');
  });

  it('is armed by exactly the verdict that misses a sick man', () => {
    const s = fresh();
    resolveLepraschau(s, makeLepraCase('X', true), 'clean');
    expect(Number(s.storyFlags['lepra_missed'])).toBe(1);
    resolveLepraschau(s, makeLepraCase('Y', false), 'leprous');
    expect(Number(s.storyFlags['lepra_missed'])).toBe(1); // wrong, but not missed
  });

  it('settles the counter when the player acts, either way', () => {
    for (const choiceIndex of [0, 1]) {
      const s = fresh();
      s.storyFlags['lepra_missed'] = 1;
      applyScenarioChoice(s, 'lepra_return', choiceIndex);
      expect(Number(s.storyFlags['lepra_missed']), `choice ${choiceIndex}`).toBe(0);
    }
  });

  it('keeps the counter when the player looks away', () => {
    const s = fresh();
    s.storyFlags['lepra_missed'] = 1;
    applyScenarioChoice(s, 'lepra_return', 2);
    expect(Number(s.storyFlags['lepra_missed'])).toBe(1);
  });

  it('makes the second refusal the one the town talks about', () => {
    const s = fresh();
    s.storyFlags['lepra_missed'] = 2;
    const before = s.repFolk;
    applyScenarioChoice(s, 'lepra_return', 2); // first: marked, quiet
    const afterFirst = s.repFolk;
    s.storyFlags['scenario_day'] = -1; // release the daily throttle
    applyScenarioChoice(s, 'lepra_return', 2); // second: public
    expect(afterFirst).toBe(before);
    expect(s.repFolk).toBeLessThan(afterFirst);
  });

  it('weighs the two honest ways out differently', () => {
    // Calling the council owns the error publicly (honour down, council up);
    // the quiet walk is decent and outside your authority (honour up, church
    // heat up). Neither is clean — that is the point.
    const publicFix = fresh();
    publicFix.storyFlags['lepra_missed'] = 1;
    applyScenarioChoice(publicFix, 'lepra_return', 0);
    const quiet = fresh();
    quiet.storyFlags['lepra_missed'] = 1;
    applyScenarioChoice(quiet, 'lepra_return', 1);
    expect(publicFix.honour!).toBeLessThan(quiet.honour!);
    expect(quiet.churchHeat).toBeGreaterThan(publicFix.churchHeat);
    expect(publicFix.councilFavor).toBeGreaterThan(quiet.councilFavor);
  });

  it('names every line of it in both locales', () => {
    const keys = [sc.titleKey, sc.bodyKey, ...sc.choices.map((c) => c.textKey)];
    const missing: string[] = [];
    for (const k of keys) {
      if (!EN.includes(`${k}:`)) missing.push(`en:${k}`);
      if (!DE.includes(`${k}:`)) missing.push(`de:${k}`);
    }
    expect(missing).toEqual([]);
  });
});

/* ------------------------------------------------------------------ *
 * A2 — the ending reads the run
 * ------------------------------------------------------------------ */

describe('the epilogue reads the run', () => {
  it('gives a clean healer and a butcher different last pages', () => {
    const clean = fresh();
    clean.totalTreated = 30;
    clean.deathsOnHands = 0;
    const butcher = fresh();
    butcher.totalTreated = 30;
    butcher.deathsOnHands = 8;
    expect(epilogueLines(clean)).toContain('epilogue_no_deaths');
    expect(epilogueLines(butcher)).toContain('epilogue_many_deaths');
    expect(epilogueLines(clean)).not.toEqual(epilogueLines(butcher));
  });

  it('remembers alms, plague service and the examination record', () => {
    const s = fresh();
    s.almsGiven = 6;
    s.storyFlags['epidemic_saves'] = 4;
    s.lepraRight = 3;
    const lines = epilogueLines(s);
    expect(lines).toContain('epilogue_alms');
    expect(lines).toContain('epilogue_plague_service');
    expect(lines).toContain('epilogue_lepra_sound');
  });

  it('remembers how the rivalry ended, one line, first outcome wins', () => {
    const s = fresh();
    s.storyFlags['rival_truce'] = true;
    expect(epilogueLines(s)).toContain('epilogue_rival_truce');
    expect(epilogueLines(s)).not.toContain('epilogue_rival_mud');
  });

  it('always finds something to say about a finished run', () => {
    // A run that reaches an ending has, at minimum, an honour standing.
    const s = fresh();
    s.honour = 75;
    expect(epilogueLines(s).length).toBeGreaterThan(0);
  });

  it('writes every possible line in both locales', () => {
    // Collect the keys from the source so a new line cannot ship untranslated.
    const src = readFileSync(join(process.cwd(), 'src/game/systems/story.ts'), 'utf8');
    const keys = [...src.matchAll(/'(epilogue_[a-z_]+)'/g)].map((m) => m[1]!);
    expect(keys.length).toBeGreaterThanOrEqual(10);
    const missing: string[] = [];
    for (const k of new Set(keys)) {
      if (!EN.includes(`${k}:`)) missing.push(`en:${k}`);
      if (!DE.includes(`${k}:`)) missing.push(`de:${k}`);
    }
    expect(missing).toEqual([]);
  });

  it('is actually shown by the ending scene', () => {
    const scene = readFileSync(join(process.cwd(), 'src/game/scenes/EndingCodexScenes.ts'), 'utf8');
    expect(scene).toContain('epilogueLines(s)');
  });
});

/* ------------------------------------------------------------------ *
 * A3 — Krafft's last word
 * ------------------------------------------------------------------ */

describe('Krafft gets a last word', () => {
  const arm = (flag: string): GameState => {
    const s = fresh();
    s.storyFlags['intro_done'] = true;
    s.storyFlags['intro_started'] = true;
    s.storyFlags[flag] = true;
    s.storyFlags['rival_outcome_day'] = 5;
    s.day = 9;
    return s;
  };

  it('fires days after each outcome, not the same evening', () => {
    for (const [flag, node] of [
      ['rival_exposed', 'krafft_after_exposed'],
      ['rival_truce', 'krafft_after_truce'],
      ['rival_mud', 'krafft_after_mud'],
    ] as const) {
      const s = arm(flag);
      expect(pendingStoryDialogue(s), flag).toBe(node);
      s.day = 6; // too soon
      expect(pendingStoryDialogue(s), `${flag} too soon`).not.toBe(node);
    }
  });

  it('fires once: the closing flag silences it', () => {
    const s = arm('rival_truce');
    const node = DIALOGUE_MAP['krafft_after_truce']!;
    applyChoice(s, node.choices[0]!);
    expect(pendingStoryDialogue(s)).not.toBe('krafft_after_truce');
  });

  it('retires the rival when the exposed man leaves', () => {
    const s = arm('rival_exposed');
    s.rivalActive = true;
    applyChoice(s, DIALOGUE_MAP['krafft_after_exposed']!.choices[0]!);
    expect(s.rivalActive).toBe(false);
  });

  it('does not retire him after a mere truce', () => {
    const s = arm('rival_truce');
    s.rivalActive = true;
    applyChoice(s, DIALOGUE_MAP['krafft_after_truce']!.choices[0]!);
    expect(s.rivalActive).toBe(true);
  });
});

/* ------------------------------------------------------------------ *
 * The scenario table stays sound
 * ------------------------------------------------------------------ */

describe('scenario table hygiene', () => {
  it('names every scenario line in both locales', () => {
    const missing: string[] = [];
    for (const sc of SCENARIOS) {
      for (const k of [sc.titleKey, sc.bodyKey, ...sc.choices.map((c) => c.textKey)]) {
        if (!EN.includes(`${k}:`)) missing.push(`en:${k}`);
        if (!DE.includes(`${k}:`)) missing.push(`de:${k}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
