/**
 * The blood arts, in the order the trade actually ranked them.
 *
 * The game had this backwards: venesection was given away free while
 * *Schröpfen* — dry cupping — cost 50 coin and demanded Hand 3. In a real
 * Badestube cupping was the daily service, warm glass on skin, frequently the
 * *Bademagd's* work rather than the master's. Opening a vein was the act that
 * took judgement: which vein, and on which day of the calendar.
 *
 * Beyond the ordering, these tests guard the failure this project keeps
 * producing — an offer or an unlock that leads nowhere.
 */
import { describe, it, expect } from 'vitest';
import { TECHNIQUE_MAP, STARTER_TECHNIQUES, TECHNIQUES } from '../src/game/data/techniques';
import { MENTOR_OFFERS } from '../src/game/data/mentors';

const cupping = TECHNIQUE_MAP['cupping']!;
const bloodletting = TECHNIQUE_MAP['bloodletting']!;

describe('cupping is the everyday service', () => {
  it('starts unlocked, like the rest of the daily craft', () => {
    expect(STARTER_TECHNIQUES).toContain('cupping');
    expect(cupping.unlockCost).toBe(0);
  });

  it('asks almost nothing of the hand', () => {
    expect(cupping.minHand).toBeLessThanOrEqual(bloodletting.minHand);
  });

  it('is the safest of the blood arts, because no blade is involved', () => {
    const bloodArts = TECHNIQUES.filter((t) => t.category === 'blood');
    expect(bloodArts.length).toBeGreaterThan(2);
    for (const art of bloodArts) {
      if (art.id === 'cupping') continue;
      expect(cupping.risk, `cupping vs ${art.id}`).toBeLessThanOrEqual(art.risk);
    }
  });

  it('pays less than opening a vein, being the lesser service', () => {
    // Otherwise the free, safe art would dominate the paid, risky one and
    // bloodletting would never be chosen again.
    expect(cupping.payMult).toBeLessThan(bloodletting.payMult);
  });
});

describe('no mentor sells what the player already owns', () => {
  it('never teaches a starter technique', () => {
    // The cupping offer at Bamberg became exactly this the moment cupping was
    // unlocked from the start: 40 coin for nothing, with no warning anywhere.
    const dead = MENTOR_OFFERS.filter((m) => STARTER_TECHNIQUES.includes(m.techniqueId));
    expect(dead.map((m) => `${m.cityId}:${m.techniqueId}`)).toEqual([]);
  });
});

describe('the church does not shed blood', () => {
  it('keeps clerical mentors to arts that draw none', () => {
    // Lateran IV (1215) c.18 barred those in major orders from shedding
    // blood. A cathedral cleric teaching the cup contradicted the game's own
    // codex entry on exactly that canon.
    const bloody = new Set(
      TECHNIQUES.filter((t) => t.category === 'blood' || t.category === 'advanced').map((t) => t.id),
    );
    const offenders = MENTOR_OFFERS.filter(
      (m) => m.mentorKey.includes('clergy') && bloody.has(m.techniqueId),
    );
    expect(offenders.map((m) => `${m.mentorKey} teaches ${m.techniqueId}`)).toEqual([]);
  });
});
