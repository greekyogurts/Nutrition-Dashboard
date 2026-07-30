import { describe, expect, it } from 'vitest';
import { normalizeBaselines, normalizeLog } from './baseline';
import { computeEnergy } from './energy';
import { BASELINES_RAW, BEN, LOG_RAW } from './fixtures';
import { DIETS, macroTargetsFor } from './macros';
import { microTargetsFor, watchedNutrients } from './micros';
import { LB_PER_KG, type Profile } from './profile';

const baselines = normalizeBaselines(BASELINES_RAW);
const log = normalizeLog(LOG_RAW);
const energyFor = (p: Profile | null) => computeEnergy({ profile: p, log, baselines });
const target = (p: Profile) => macroTargetsFor(p, energyFor(p));

describe('macroTargetsFor', () => {
  it('anchors protein to bodyweight, not a share of calories', () => {
    const m = target(BEN); // balanced: 1.6 g/kg, 174 lb
    expect(m.protein_g).toBe(Math.round((1.6 * 174) / LB_PER_KG)); // 126
    expect(m.derived).toBe(true);
  });

  it('reconciles percent-diet macros against the calorie target', () => {
    const p: Profile = { ...BEN, goal: 'maintain' };
    const m = target(p);
    const kcal = energyFor(p)!.target; // 2797
    expect(m.fat_g).toBe(Math.round((kcal * 0.3) / 9));
    const reconstructed = m.protein_g! * 4 + m.carbs_g! * 4 + m.fat_g! * 9;
    expect(Math.abs(reconstructed - kcal)).toBeLessThanOrEqual(4); // rounding only
  });

  it('treats the carb cap as a hard ceiling and lets fat absorb the rest', () => {
    const keto = target({ ...BEN, diet: 'keto' });
    expect(keto.carbs_g).toBe(30);
    // Fiber is set explicitly: the default 14g/1000kcal would demand ~39g
    // against a 30g net-carb cap, which is arithmetically unreachable.
    expect(keto.fiber_g).toBe(25);

    const carnivore = target({ ...BEN, diet: 'carnivore' });
    expect(carnivore.carbs_g).toBe(10);
    expect(carnivore.fiber_g).toBe(0);
  });

  it('takes custom protein as an explicit floor and fills carbs to the target', () => {
    const p: Profile = { ...BEN, goal: 'maintain', diet: 'custom', custom_protein_g: 200 };
    const m = target(p);
    const kcal = energyFor(p)!.target;
    expect(m.protein_g).toBe(200);
    expect(m.fat_g).toBe(Math.round((kcal * 0.3) / 9)); // fat auto-defaults to 30%
    const reconstructed = m.protein_g! * 4 + m.carbs_g! * 4 + m.fat_g! * 9;
    expect(Math.abs(reconstructed - kcal)).toBeLessThanOrEqual(4);
  });

  it('honours an explicit custom fat figure', () => {
    const p: Profile = {
      ...BEN, goal: 'maintain', diet: 'custom',
      custom_protein_g: 200, custom_fat_g: 70,
    };
    const m = target(p);
    expect(m.fat_g).toBe(70);
    expect(m.carbs_g).toBe(Math.round((energyFor(p)!.target - 200 * 4 - 70 * 9) / 4));
  });

  it('never returns a negative gram figure', () => {
    // An absurd protein floor would drive carbs negative if unclamped.
    const m = target({ ...BEN, diet: 'custom', custom_protein_g: 900 });
    expect(m.carbs_g).toBe(0);
  });

  it('returns all-null rather than a fabrication when data is missing', () => {
    const noEnergy = macroTargetsFor(BEN, null);
    expect(noEnergy).toMatchObject({ protein_g: null, carbs_g: null, derived: false });

    const noWeight = normalizeLog([{ log_date: '2026-07-29', tdee: 2797, burn_cal: 242 }]);
    const m = macroTargetsFor(BEN, computeEnergy({ profile: BEN, log: noWeight, baselines }));
    expect(m.derived).toBe(false);
    expect(m.protein_g).toBeNull();
  });

  it('falls back to balanced for an unknown diet key', () => {
    const unknown = target({ ...BEN, diet: 'paleo-carnivore-fusion' });
    expect(unknown).toEqual(target(BEN));
  });

  it('covers every diet in DIETS without falling through', () => {
    for (const key of Object.keys(DIETS)) {
      const m = target({ ...BEN, diet: key, custom_protein_g: 200 });
      expect(m.derived, key).toBe(true);
      expect(m.protein_g, key).not.toBeNull();
      expect(m.carbs_g, key).toBeGreaterThanOrEqual(0);
      expect(m.fat_g, key).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('microTargetsFor', () => {
  const at = (p: Profile | null) => {
    const list = microTargetsFor(p, new Date('2026-07-29'));
    return (name: string) => list.find((m) => m.name === name)!;
  };

  it('gives a woman of 30 the correct iron RDA — the original bug', () => {
    // The old fixed table used the male 8mg for everyone, so a woman logging
    // 8mg was shown "100% of target" when the honest answer was 44%.
    const f = at({ ...BEN, sex: 'female', birth_year: 1996 });
    expect(f('Iron').target).toBe(18);
    expect(Math.round((8 / f('Iron').target) * 100)).toBe(44);
  });

  it('drops iron back to 8mg post-menopause', () => {
    expect(at({ ...BEN, sex: 'female', birth_year: 1970 })('Iron').target).toBe(8);
  });

  it('varies the other sex-specific targets', () => {
    const f = at({ ...BEN, sex: 'female', birth_year: 1996 });
    const m = at({ ...BEN, sex: 'male', birth_year: 1996 });
    expect([f('Magnesium').target, m('Magnesium').target]).toEqual([320, 420]);
    expect([f('Zinc').target, m('Zinc').target]).toEqual([8, 11]);
    expect([f('Potassium').target, m('Potassium').target]).toEqual([2600, 3400]);
    expect([f('Vitamin A').target, m('Vitamin A').target]).toEqual([700, 900]);
    expect([f('Omega-3').target, m('Omega-3').target]).toEqual([1.1, 1.6]);
  });

  it('raises calcium and vitamin D with age', () => {
    expect(at({ ...BEN, birth_year: 1996 })('Calcium').target).toBe(1000);
    expect(at({ ...BEN, sex: 'female', birth_year: 1970 })('Calcium').target).toBe(1200);
    expect(at({ ...BEN, birth_year: 1950 })('Calcium').target).toBe(1200); // 76, senior
    expect(at({ ...BEN, birth_year: 1996 })('Vitamin D').target).toBe(15);
    expect(at({ ...BEN, birth_year: 1950 })('Vitamin D').target).toBe(20);
  });

  it('raises sodium only for carb-capped diets', () => {
    expect(at(BEN)('Sodium').target).toBe(2300);
    expect(at({ ...BEN, diet: 'keto' })('Sodium').target).toBe(5000);
    expect(at({ ...BEN, diet: 'carnivore' })('Sodium').target).toBe(5000);
  });

  it('marks the three no-RDA nutrients as ranges so they never read as red', () => {
    const list = microTargetsFor(BEN);
    const ranges = list.filter((m) => m.isRange).map((m) => m.name);
    expect(ranges).toEqual(['Sodium', 'Boron', 'Omega-3']);
    expect(list.filter((m) => !m.isRange).every((m) => m.targetLabel === 'RDA')).toBe(true);
  });

  it('keeps the male-default shape when no profile is set', () => {
    const none = at(null);
    expect(none('Iron').target).toBe(8);
    expect(microTargetsFor(null)).toHaveLength(15);
  });
});

describe('watchedNutrients', () => {
  it('flags what a restriction removes', () => {
    expect(watchedNutrients({ ...BEN, restrictions: ['gluten_free'] })).toEqual(['Folate', 'Iron']);
  });

  it('deduplicates across overlapping restrictions', () => {
    const w = watchedNutrients({ ...BEN, restrictions: ['vegan', 'gluten_free'] });
    expect(new Set(w).size).toBe(w.length);
    expect(w).toContain('Vitamin B12');
    expect(w).toContain('Folate');
  });

  it('is empty with no restrictions, and safe on junk input', () => {
    expect(watchedNutrients(BEN)).toEqual([]);
    expect(watchedNutrients(null)).toEqual([]);
    expect(watchedNutrients({ ...BEN, restrictions: ['not_a_restriction'] })).toEqual([]);
  });
});
