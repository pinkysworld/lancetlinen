/**
 * The wound-surgeon's craft, and uroscopy.
 *
 * Eight new techniques, eight new complaints, eight mentor offers and a third
 * examination method. The failure modes are all *referential* — a technique
 * nothing needs, a mentor in a city that does not exist, a complaint with no
 * text — and none of them throw. They just quietly do nothing, which is the
 * defect class this project keeps producing.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TECHNIQUES, TECH_DISPLAY_ORDER, TECHNIQUE_MAP } from '../src/game/data/techniques';
import { PATIENT_TEMPLATES } from '../src/game/data/patients';
import { MENTOR_OFFERS, MENTOR_ONLY, isMentorOnly } from '../src/game/data/mentors';
import { MAP_NODES } from '../src/game/data/map';

const EN = readFileSync(join(process.cwd(), 'src/game/i18n/en.ts'), 'utf8');
const DE = readFileSync(join(process.cwd(), 'src/game/i18n/de.ts'), 'utf8');
const TREATMENT = readFileSync(join(process.cwd(), 'src/game/systems/treatment.ts'), 'utf8');
const SCENE = readFileSync(join(process.cwd(), 'src/game/scenes/TreatmentScene.ts'), 'utf8');
const STUDY = readFileSync(join(process.cwd(), 'src/game/scenes/MarketStudyScenes.ts'), 'utf8');

const NEW_TECHS = [
  'clyster',
  'suture',
  'seton',
  'staunch_nose',
  'arrow_draw',
  'lithotomy',
  'trepan',
  'amputate',
];

describe('the new techniques', () => {
  it('all exist', () => {
    for (const id of NEW_TECHS) {
      expect(TECHNIQUE_MAP[id], `${id} missing`).toBeDefined();
    }
  });

  it('gives every technique in the game a name and description in both locales', () => {
    const missing: string[] = [];
    for (const tech of TECHNIQUES) {
      // The description key is `tech_desc_<id>`, not `tech_<id>_desc` —
      // getting that backwards is why eight new descriptions would have
      // silently rendered as raw keys.
      for (const key of [`tech_${tech.id}`, `tech_desc_${tech.id}`]) {
        if (!EN.includes(`${key}:`)) missing.push(`en:${key}`);
        if (!DE.includes(`${key}:`)) missing.push(`de:${key}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('lists every technique in the display order', () => {
    // A technique missing from the order sorts to the end of the last page and
    // is effectively hidden.
    const missing = TECHNIQUES.map((t) => t.id).filter(
      (id) => !TECH_DISPLAY_ORDER.includes(id),
    );
    expect(missing).toEqual([]);
  });

  it('has no duplicate ids', () => {
    const ids = TECHNIQUES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('scales risk with reward', () => {
    // The dangerous operations must pay, or nobody would ever attempt them.
    for (const id of ['lithotomy', 'trepan', 'amputate']) {
      const tech = TECHNIQUE_MAP[id]!;
      expect(tech.risk, id).toBeGreaterThan(0.35);
      expect(tech.payMult, id).toBeGreaterThan(2.5);
      expect(tech.minHand, id).toBeGreaterThanOrEqual(7);
    }
  });

  it('keeps the everyday techniques safe and cheap', () => {
    for (const id of ['staunch_nose', 'clyster']) {
      const tech = TECHNIQUE_MAP[id]!;
      expect(tech.risk, id).toBeLessThan(0.1);
      expect(tech.minHand, id).toBeLessThanOrEqual(2);
    }
  });

  it('costs only items that exist in the inventory', () => {
    const real = new Set(['linen', 'herbs', 'leeches', 'soap', 'wood', 'salve', 'ironTools']);
    for (const tech of TECHNIQUES) {
      for (const item of Object.keys(tech.costItems)) {
        expect(real, `${tech.id} needs ${item}`).toContain(item);
      }
    }
  });
});

describe('every technique has a patient who needs it', () => {
  it('leaves no new technique without a case', () => {
    // A technique nothing calls for is a dead purchase — the player pays for
    // it and never sees it matter.
    const needed = new Set(PATIENT_TEMPLATES.flatMap((p) => p.bestTechniques));
    const orphans = NEW_TECHS.filter((id) => !needed.has(id));
    expect(orphans).toEqual([]);
  });

  it('names every complaint in both locales', () => {
    const missing: string[] = [];
    for (const p of PATIENT_TEMPLATES) {
      const key = p.complaintKey.replace('complaint.', 'complaint_');
      if (!EN.includes(`${key}:`)) missing.push(`en:${key}`);
      if (!DE.includes(`${key}:`)) missing.push(`de:${key}`);
    }
    expect(missing).toEqual([]);
  });

  it('has no duplicate patient ids', () => {
    const ids = PATIENT_TEMPLATES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('only ever names techniques that exist', () => {
    const real = new Set(TECHNIQUES.map((t) => t.id));
    const bad: string[] = [];
    for (const p of PATIENT_TEMPLATES) {
      for (const id of p.bestTechniques) {
        if (!real.has(id)) bad.push(`${p.id} -> ${id}`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('mentors', () => {
  it('teaches in cities that exist', () => {
    const cities = new Set(MAP_NODES.map((n) => n.id));
    for (const m of MENTOR_OFFERS) {
      expect(cities, `${m.techniqueId} in ${m.cityId}`).toContain(m.cityId);
    }
  });

  it('names mentors that exist in both locales', () => {
    for (const m of MENTOR_OFFERS) {
      expect(EN, `en lacks ${m.mentorKey}`).toContain(`${m.mentorKey}:`);
      expect(DE, `de lacks ${m.mentorKey}`).toContain(`${m.mentorKey}:`);
    }
  });

  it('teaches only techniques that exist', () => {
    const real = new Set(TECHNIQUES.map((t) => t.id));
    for (const m of MENTOR_OFFERS) {
      expect(real, `mentor teaches ${m.techniqueId}`).toContain(m.techniqueId);
    }
  });

  it('describes every offer in both locales', () => {
    for (const m of MENTOR_OFFERS) {
      const key = m.descKey.replace(/\./g, '_');
      expect(EN, `en lacks ${key}`).toContain(`${key}:`);
      expect(DE, `de lacks ${key}`).toContain(`${key}:`);
    }
  });
});

describe('the master-only gate', () => {
  it('makes every mentor-only art actually available from a mentor', () => {
    // Otherwise it is unlearnable — the worst possible outcome, and silent.
    const taught = new Set(MENTOR_OFFERS.map((m) => m.techniqueId));
    for (const id of MENTOR_ONLY) {
      expect(taught, `${id} is gated but nobody teaches it`).toContain(id);
    }
  });

  it('gates only the genuinely dangerous arts', () => {
    for (const id of MENTOR_ONLY) {
      expect(TECHNIQUE_MAP[id]!.risk, id).toBeGreaterThan(0.25);
    }
  });

  it('is enforced in the study screen, not merely declared', () => {
    // `MENTOR_ONLY` existing but nothing reading it would be the same defect
    // as `resetView`, `incomeMult` and `goreVariantKey` before it.
    expect(STUDY).toContain('isMentorOnly(tech.id)');
    expect(STUDY).toContain('disabled: bookProof');
  });

  it('reports mentor-only status correctly', () => {
    expect(isMentorOnly('trepan')).toBe(true);
    expect(isMentorOnly('shave')).toBe(false);
  });
});

describe('uroscopy', () => {
  it('exists as a third examination', () => {
    expect(TREATMENT).toContain('export function readUrine');
  });

  it('reads the moist/dry axis, complementing the pulse', () => {
    // The pulse gives hot/cold. If uroscopy gave the same axis it would be
    // redundant and the two would never narrow to one humour.
    expect(TREATMENT).toContain('HUMOR_QUALITIES[h].moist === seenMoist');
  });

  it('can be misread, unlike the pulse', () => {
    expect(TREATMENT).toContain('misread');
  });

  it('narrows the belief when combined with the pulse', () => {
    expect(SCENE).toContain('pulseC.filter((h) => urineC.includes(h))');
  });

  it('is reachable from the treatment screen', () => {
    expect(SCENE).toContain("t('uroscopy')");
    expect(SCENE).toContain('readUrine(st, this.patient)');
  });

  it('names all four flask readings in both locales', () => {
    for (const key of [
      'urine_pale_clear',
      'urine_pale_thick',
      'urine_high_clear',
      'urine_high_troubled',
    ]) {
      expect(EN, `en lacks ${key}`).toContain(`${key}:`);
      expect(DE, `de lacks ${key}`).toContain(`${key}:`);
    }
  });
});
