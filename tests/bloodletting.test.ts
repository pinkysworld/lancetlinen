/**
 * The Aderlaßmännchen, and what the trade taught you to look at.
 *
 * The codex has told the player since long before this existed that "the
 * bloodletting calendar and the Aderlaßmännchen tied the vein you opened to
 * the moon's sign". Nothing implemented it: one flat multiplier from the
 * **sun's** sign, and no vein choice at all.
 *
 * These tests hold the doctrine, not just the wiring — a later rebalance must
 * not be able to quietly invert the medicine.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DAYS_PER_MOON_SIGN,
  SIGN_REGION,
  VEINS,
  VEIN_MAP,
  complaintRegion,
  daysInSign,
  isEgyptianDay,
  judgeVein,
  moonSign,
} from '../src/game/data/bloodletting';
import { ZODIAC_ORDER } from '../src/game/data/history';
import { EXAMINATIONS, availableExaminations, canExamine } from '../src/game/data/examinations';
import { ORIGINS } from '../src/game/data/origins';
import { PATIENT_TEMPLATES } from '../src/game/data/patients';
import { createNewGame } from '../src/game/state';
import type { GameState } from '../src/game/types';

const EN = readFileSync(join(process.cwd(), 'src/game/i18n/en.ts'), 'utf8');
const DE = readFileSync(join(process.cwd(), 'src/game/i18n/de.ts'), 'utf8');
const TREATMENT = readFileSync(join(process.cwd(), 'src/game/systems/treatment.ts'), 'utf8');
const SCENE = readFileSync(join(process.cwd(), 'src/game/scenes/TreatmentScene.ts'), 'utf8');

const on = (day: number): GameState => {
  const s = createNewGame('Laß', 'de');
  s.day = day;
  return s;
};

describe('the moon, not the sun', () => {
  it('crosses a sign in about two and a third days', () => {
    // A sidereal month is 27.32 days over twelve signs. The old model used the
    // sun, which sits in one sign for a month — a month-long bad period is a
    // tax, a two-day one is something to plan around.
    expect(DAYS_PER_MOON_SIGN).toBeGreaterThan(2.2);
    expect(DAYS_PER_MOON_SIGN).toBeLessThan(2.4);
  });

  it('completes the whole circle inside a lunar month', () => {
    const seen = new Set<string>();
    for (let d = 1; d <= 28; d++) seen.add(moonSign(on(d)));
    expect(seen.size).toBe(12);
  });

  it('never claims more than three days left in a sign', () => {
    for (let d = 1; d <= 60; d++) {
      expect(daysInSign(on(d)), `day ${d}`).toBeLessThanOrEqual(3);
      expect(daysInSign(on(d)), `day ${d}`).toBeGreaterThanOrEqual(1);
    }
  });

  it('does not start the year in Aries, which was the old error', () => {
    // The sun enters Aries around 12–13 March, so an Aries day 1 was about
    // seventy days out.
    expect(moonSign(on(1))).not.toBe('aries');
  });
});

describe('the man of signs', () => {
  it('runs head to foot in the order of the signs', () => {
    // Aries the head, Pisces the feet — one of the few pieces of medieval
    // astrological medicine the sources agree on completely.
    expect(SIGN_REGION.aries).toBe('head');
    expect(SIGN_REGION.pisces).toBe('feet');
    const regions = ZODIAC_ORDER.map((z) => SIGN_REGION[z]);
    expect(new Set(regions).size).toBe(12);
  });
});

describe('the veins', () => {
  it('draws mostly from the arm, as the sources do', () => {
    const arm = VEINS.filter((v) => v.region === 'arms');
    expect(arm.length).toBeGreaterThanOrEqual(3);
  });

  it('keeps the cephalica for the head and the basilica for the trunk', () => {
    // The names are the doctrine: "head vein" and "liver vein".
    expect(VEIN_MAP['cephalica']!.serves).toContain('head');
    expect(VEIN_MAP['basilica']!.serves).toEqual(
      expect.arrayContaining(['chest', 'belly']),
    );
  });

  it('lets the saphena serve the head, which is revulsion and not a mistake', () => {
    // Drawing at the ankle to pull blood *away* from the head is why bleeding
    // a nosebleed is authentic rather than a bug — it reads as one otherwise.
    expect(VEIN_MAP['saphena']!.serves).toContain('head');
  });

  it('asks more of the hand for the harder veins', () => {
    expect(VEIN_MAP['frontalis']!.minHand).toBeGreaterThan(VEIN_MAP['cephalica']!.minHand);
    expect(VEIN_MAP['saphena']!.minHand).toBeGreaterThan(VEIN_MAP['mediana']!.minHand);
  });

  it('names every vein in both locales', () => {
    for (const v of VEINS) {
      expect(EN, `en lacks vein_${v.id}`).toContain(`vein_${v.id}:`);
      expect(DE, `de lacks vein_${v.id}`).toContain(`vein_${v.id}:`);
    }
  });
});

describe('the judgement', () => {
  it('forbids the Egyptian Days outright', () => {
    // Two unlucky days a month, listed in the calendars, on which no blood
    // was to be let at all.
    const days = Array.from({ length: 30 }, (_, i) => i + 1).filter(isEgyptianDay);
    expect(days).toHaveLength(2);
    const s = on(days[0]!);
    expect(judgeVein(s, 'cephalica', 'head').mult).toBeLessThan(1);
    expect(judgeVein(s, 'cephalica', 'head').key).toBe('vein_egyptian_day');
  });

  it('warns when the moon stands in the limb being opened', () => {
    // Find a day where the moon rules the arms, then try an arm vein.
    let found = false;
    for (let d = 1; d <= 30 && !found; d++) {
      const s = on(d);
      if (isEgyptianDay(d)) continue;
      if (SIGN_REGION[moonSign(s)] !== 'arms') continue;
      found = true;
      const v = judgeVein(s, 'cephalica', 'head');
      expect(v.key).toBe('vein_moon_in_part');
      expect(v.mult).toBeLessThan(1);
    }
    expect(found, 'no day found with the moon in the arms').toBe(true);
  });

  it('rewards a vein that serves the afflicted part', () => {
    for (let d = 1; d <= 30; d++) {
      const s = on(d);
      if (isEgyptianDay(d) || SIGN_REGION[moonSign(s)] === 'arms') continue;
      const v = judgeVein(s, 'cephalica', 'head');
      expect(v.key).toBe('vein_well_chosen');
      expect(v.mult).toBeGreaterThan(1);
      return;
    }
    throw new Error('no ordinary day found');
  });

  it('keeps every multiplier modest, so the calendar advises and never decides', () => {
    for (let d = 1; d <= 30; d++) {
      for (const v of VEINS) {
        const m = judgeVein(on(d), v.id, 'head').mult;
        expect(m, `day ${d} ${v.id}`).toBeGreaterThanOrEqual(0.7);
        expect(m, `day ${d} ${v.id}`).toBeLessThanOrEqual(1.15);
      }
    }
  });
});

describe('where the trouble sits', () => {
  it('names only templates that exist', () => {
    const real = new Set(PATIENT_TEMPLATES.map((p) => p.id));
    const bad = PATIENT_TEMPLATES.map((p) => p.id);
    void bad;
    const mapped = Object.keys(
      // read through the public accessor so the table stays private-ish
      Object.fromEntries(PATIENT_TEMPLATES.map((p) => [p.id, complaintRegion(p.id)])),
    ).filter((id) => complaintRegion(id) !== null);
    for (const id of mapped) expect(real, `${id} is not a template`).toContain(id);
    // And it must cover enough of them to matter.
    expect(mapped.length).toBeGreaterThan(25);
  });

  it('leaves whole-body complaints unseated', () => {
    // A fever or a melancholy has no limb; the choice of vein should then
    // neither be rewarded nor punished.
    expect(complaintRegion('fever_blood')).toBeNull();
    expect(complaintRegion('melancholy')).toBeNull();
  });
});

describe('examinations follow the training', () => {
  it('gives everyone sight and pulse, and nobody everything', () => {
    for (const o of ORIGINS) {
      const s = createNewGame('Prüfer', 'de');
      s.originId = o.id;
      const have = availableExaminations(s);
      expect(have, `${o.id} cannot look`).toContain('inspect');
      expect(have, `${o.id} cannot feel a pulse`).toContain('pulse');
      expect(have.length, `${o.id} starts with everything`).toBeLessThan(EXAMINATIONS.length);
    }
  });

  it('reserves uroscopy for the cloister-taught', () => {
    // The matula is the physician's attribute in painting; a bath-house
    // apprentice was not taught to read one.
    const scholar = createNewGame('Prüfer', 'de');
    scholar.originId = 'monastery_scholar';
    expect(canExamine(scholar, 'uroscopy').ok).toBe(true);

    const son = createNewGame('Prüfer', 'de');
    son.originId = 'bader_son';
    const r = canExamine(son, 'uroscopy');
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.reasonKey).toBe('req_untaught_uroscopy');
  });

  it('can be taught later, so the gap is a reason to travel', () => {
    const s = createNewGame('Prüfer', 'de');
    s.originId = 'bader_son';
    s.storyFlags['learned_uroscopy'] = true;
    expect(canExamine(s, 'uroscopy').ok).toBe(true);
  });

  it('gives every origin something the others lack', () => {
    const sets = ORIGINS.map((o) => {
      const s = createNewGame('Prüfer', 'de');
      s.originId = o.id;
      return { id: o.id, have: availableExaminations(s).join(',') };
    });
    // At least three distinct loadouts, or the choice does not read.
    expect(new Set(sets.map((x) => x.have)).size).toBeGreaterThanOrEqual(3);
  });

  it('explains every refusal in both locales', () => {
    for (const e of EXAMINATIONS) {
      const key = `req_untaught_${e.id}`;
      expect(EN, `en lacks ${key}`).toContain(`${key}:`);
      expect(DE, `de lacks ${key}`).toContain(`${key}:`);
    }
  });
});

describe('wired, not merely written', () => {
  it('multiplies the vein verdict into the success chance', () => {
    expect(TREATMENT).toContain('judgeVein(state, patient.vein');
    expect(TREATMENT).toMatch(/chance \*= verdict\.mult/);
  });

  it('lets the player pick a vein', () => {
    expect(SCENE).toContain('p.vein = veins[');
  });

  it('shows the moon and the forbidden day before the choice is made', () => {
    expect(SCENE).toContain("t('moon_in'");
    expect(SCENE).toContain('egyptian_day_warn');
  });

  it('greys uroscopy with its reason rather than hiding it', () => {
    expect(SCENE).toContain("canExamine(s, 'uroscopy')");
  });

  it('reports the tables’ verdict on the result screen', () => {
    expect(SCENE).toContain('r.veinNoteKey');
  });
});

describe('no origin is left without a way of reading a patient', () => {
  it('gives every one of the six a third examination', () => {
    // The journeyman had none: no starting technique and no examination
    // beyond the two everybody has, which made him strictly the weakest
    // choice on a screen that is supposed to offer six different games.
    for (const o of ORIGINS) {
      const s = createNewGame('Prüfer', 'de');
      s.originId = o.id;
      expect(availableExaminations(s).length, o.id).toBeGreaterThanOrEqual(3);
    }
  });
});
