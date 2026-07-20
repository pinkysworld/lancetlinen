/**
 * Content pacing.
 *
 * The audit found every one of the 11 scenarios gated below 20 patients treated
 * while the campaign needs 35 — so the structured content was exhausted before
 * the story ended and the back half of a run was empty. These tests keep the
 * spread honest as scenarios are added.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = readFileSync(join(process.cwd(), 'src/game/systems/scenarios.ts'), 'utf8');

/** Campaign gate: the master's examination needs this many treated. */
const CAMPAIGN_END = 35;

function scenarioGates(): Array<{ id: string; minTreated: number; once: boolean }> {
  const out: Array<{ id: string; minTreated: number; once: boolean }> = [];
  const re = /id: '(\w+)',(?:.|\n)*?minTreated: (\d+),(?:.|\n)*?once: (true|false)/g;
  for (const m of SRC.matchAll(re)) {
    out.push({ id: m[1]!, minTreated: Number(m[2]), once: m[3] === 'true' });
  }
  return out;
}

describe('scenario pacing', () => {
  const gates = scenarioGates();

  it('finds the scenario set', () => {
    expect(gates.length).toBeGreaterThanOrEqual(10);
  });

  it('has scenarios in the second half of the campaign', () => {
    // This was the actual bug: zero scenarios fired past the midpoint.
    const late = gates.filter((g) => g.minTreated >= CAMPAIGN_END / 2);
    expect(late.length).toBeGreaterThanOrEqual(4);
  });

  it('has something waiting near the end of the campaign', () => {
    const veryLate = gates.filter((g) => g.minTreated >= CAMPAIGN_END * 0.75);
    expect(veryLate.length).toBeGreaterThanOrEqual(2);
  });

  it('still opens with something early, so the system teaches itself', () => {
    expect(gates.some((g) => g.minTreated <= 6)).toBe(true);
  });

  it('gates every scenario below the campaign end — none are unreachable', () => {
    const unreachable = gates.filter((g) => g.minTreated >= CAMPAIGN_END);
    expect(unreachable).toEqual([]);
  });

  it('spreads gates rather than clustering them', () => {
    const values = gates.map((g) => g.minTreated).sort((a, b) => a - b);
    const spread = values[values.length - 1]! - values[0]!;
    expect(spread).toBeGreaterThanOrEqual(20);
  });
});
