/**
 * Name and portrait must agree.
 *
 * The bug: "Claus Gerber", an artisan, was shown `port_artisan2` — a woman.
 * `randName` rolled a sex to pick the given name and then threw that
 * information away, so the portrait was chosen by class alone. Ten of the 25
 * patient portraits are female, so roughly half of male patients could draw a
 * woman's face.
 *
 * `treatment.ts` imports Phaser (via `ui/art`) and cannot run under Node, so
 * generation is checked at the source level. The data tables — which are where
 * a new portrait or template would break the pairing — are checked directly.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  FEMALE_PORTRAITS,
  FIRST_NAMES_F,
  FIRST_NAMES_M,
  PATIENT_TEMPLATES,
} from '../src/game/data/patients';

const ART_SRC = readFileSync(join(process.cwd(), 'src/game/ui/art.ts'), 'utf8');
const TREATMENT_SRC = readFileSync(join(process.cwd(), 'src/game/systems/treatment.ts'), 'utf8');

describe('name lists', () => {
  it('keeps the male and female lists disjoint', () => {
    // An overlapping name would make the sex of a patient ambiguous.
    const overlap = FIRST_NAMES_M.filter((n) => FIRST_NAMES_F.includes(n));
    expect(overlap).toEqual([]);
  });

  it('offers enough of each to avoid obvious repetition', () => {
    expect(FIRST_NAMES_M.length).toBeGreaterThanOrEqual(8);
    expect(FIRST_NAMES_F.length).toBeGreaterThanOrEqual(8);
  });
});

describe('portrait pools', () => {
  /** Every portrait key named in the pools table. */
  const pooled = [...ART_SRC.matchAll(/'(port_[a-z0-9_]+)'/g)].map((m) => m[1]!);

  it('splits every class pool into m and f', () => {
    const table = ART_SRC.slice(
      ART_SRC.indexOf('const CLASS_PORTRAIT_POOLS'),
      ART_SRC.indexOf('/** Falls back to the other sex'),
    );
    for (const cls of ['peasant', 'artisan', 'merchant', 'soldier', 'clergy', 'noble', 'beggar']) {
      const row = new RegExp(`${cls}:\\s*\\{[^}]*m:[^}]*f:[^}]*\\}`, 's');
      expect(row.test(table), `${cls} pool is not split by sex`).toBe(true);
    }
  });

  it('never lists a female portrait in a male pool', () => {
    // The actual regression, stated directly.
    const table = ART_SRC.slice(
      ART_SRC.indexOf('const CLASS_PORTRAIT_POOLS'),
      ART_SRC.indexOf('/** Falls back to the other sex'),
    );
    const wrong: string[] = [];
    for (const m of table.matchAll(/m:\s*\[([^\]]*)\]/g)) {
      for (const k of m[1]!.matchAll(/'(port_[a-z0-9_]+)'/g)) {
        if (FEMALE_PORTRAITS.has(k[1]!)) wrong.push(k[1]!);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('never lists a male portrait in a female pool', () => {
    const table = ART_SRC.slice(
      ART_SRC.indexOf('const CLASS_PORTRAIT_POOLS'),
      ART_SRC.indexOf('/** Falls back to the other sex'),
    );
    const wrong: string[] = [];
    for (const m of table.matchAll(/f:\s*\[([^\]]*)\]/g)) {
      for (const k of m[1]!.matchAll(/'(port_[a-z0-9_]+)'/g)) {
        if (!FEMALE_PORTRAITS.has(k[1]!)) wrong.push(k[1]!);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('lists only portraits that the pools actually reference', () => {
    // A key in FEMALE_PORTRAITS that no pool uses is dead data that will drift.
    for (const key of FEMALE_PORTRAITS) {
      expect(pooled, `${key} is unused`).toContain(key);
    }
  });
});

describe('templates that pin a portrait', () => {
  const pinned = PATIENT_TEMPLATES.filter((t) => t.portraitKey);

  it('has some, or this test is watching nothing', () => {
    expect(pinned.length).toBeGreaterThan(0);
  });

  it('lets the pinned portrait decide the sex, not a separate roll', () => {
    // Without this, a template pinning `port_noble` (a woman) could still be
    // handed a man's name.
    expect(TREATMENT_SRC).toContain('FEMALE_PORTRAITS.has(pinned)');
  });

  it('carries the sex onto the patient so the UI cannot re-roll it', () => {
    expect(TREATMENT_SRC).toMatch(/name,\s*\n\s*female,/);
  });

  it('passes the sex through when choosing a pooled portrait', () => {
    expect(ART_SRC).toContain('patient.female ?? false');
  });
});

describe('generation, not just the tables', () => {
  /**
   * The earlier fix checked the pool tables and the call site in `ui/art.ts`,
   * and missed the one in `generatePatient` — which pins a portrait onto the
   * instance and was calling `pickPortraitKey` without the sex, taking the
   * default `false`. So a woman's name could still be handed a man's face,
   * reported from play as "Niklas Binder" over a woman's portrait.
   *
   * Source-level, because `treatment.ts` imports Phaser and will not load
   * under Node.
   */
  it('passes the sex through when pinning a portrait at generation', () => {
    expect(TREATMENT_SRC).toMatch(
      /pickPortraitKey\(\s*template\.class,[\s\S]{0,140}?\bfemale\s*\)/,
    );
  });

  it('has exactly one place that pins a portrait, so there is one thing to keep right', () => {
    const calls = TREATMENT_SRC.match(/pickPortraitKey\(/g) ?? [];
    expect(calls.length).toBe(1);
  });
});
