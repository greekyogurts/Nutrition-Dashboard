import { dietFor } from './macros';
import { profileAge, type Profile } from './profile';

/**
 * MICRONUTRIENT REFERENCE — derived from sex and age.
 *
 * This originally shipped a single fixed table of adult-MALE RDAs. For a woman
 * that silently misreported several nutrients — most seriously Iron (8mg male vs
 * 18mg for women 19–50), so someone logging 8mg was shown "100% of target" while
 * actually sitting at 44%. Magnesium, Zinc, Potassium, Vitamin A/C/K and Omega-3
 * were wrong too, just less dangerously.
 */

export interface MicroTarget {
  name: string;
  unit: string;
  target: number;
  targetLabel: string;
  /** Above the RDA but plausibly beneficial. Absent where there's no basis. */
  optimal?: number;
  /**
   * No official RDA (Sodium, Boron, Omega-3). These get a green/amber scale only,
   * never red — being under a guidance range isn't a deficiency risk the way
   * missing an RDA is.
   */
  isRange?: boolean;
}

/**
 * Restrictions are NOT macro profiles — they're orthogonal. You can be keto AND
 * gluten free. So rather than changing macro splits, each restriction flags the
 * micronutrients it puts at risk, which is the thing that actually matters.
 */
export const RESTRICTIONS: Record<string, { label: string; watch: string[]; why: string }> = {
  gluten_free: {
    label: 'Gluten free',
    watch: ['Folate', 'Iron'],
    why: 'fortified wheat products are a main US source of folate and iron',
  },
  dairy_free: {
    label: 'Dairy free',
    watch: ['Calcium', 'Vitamin D'],
    why: 'dairy is the dominant source of both in most diets',
  },
  vegetarian: {
    label: 'Vegetarian',
    watch: ['Vitamin B12', 'Iron', 'Zinc', 'Omega-3'],
    why: 'these are most bioavailable from animal foods',
  },
  vegan: {
    label: 'Vegan',
    watch: ['Vitamin B12', 'Iron', 'Zinc', 'Calcium', 'Vitamin D', 'Omega-3'],
    why: 'B12 in particular has no reliable plant source',
  },
};

export function microTargetsFor(p: Profile | null, now = new Date()): MicroTarget[] {
  // An unset profile keeps the previous male-default behaviour so nothing shifts
  // underfoot; the UI surfaces a "set up your profile" nudge in that case.
  const female = p?.sex === 'female';
  const age = profileAge(p, now) ?? 35;
  const older = age >= 51;
  const senior = age >= 71;
  const diet = dietFor(p);
  // Carb-capped diets genuinely need more sodium — low insulin drives sodium
  // excretion — so keto/carnivore raise it deliberately. Everyone else gets the
  // CDRR limit of 2300mg.
  const sodiumTarget = diet.kind === 'carbCap' ? diet.sodiumTarget : 2300;

  return [
    { name: 'Vitamin A', unit: 'mcg', target: female ? 700 : 900, optimal: female ? 700 : 900, targetLabel: 'RDA' },
    { name: 'Vitamin C', unit: 'mg', target: female ? 75 : 90, optimal: 200, targetLabel: 'RDA' },
    { name: 'Vitamin D', unit: 'mcg', target: senior ? 20 : 15, optimal: 50, targetLabel: 'RDA' },
    { name: 'Vitamin E', unit: 'mg', target: 15, optimal: 20, targetLabel: 'RDA' },
    { name: 'Vitamin K', unit: 'mcg', target: female ? 90 : 120, optimal: female ? 120 : 180, targetLabel: 'RDA' },
    { name: 'Vitamin B12', unit: 'mcg', target: 2.4, optimal: 5, targetLabel: 'RDA' },
    { name: 'Folate', unit: 'mcg', target: 400, optimal: 600, targetLabel: 'RDA' },
    {
      name: 'Calcium', unit: 'mg',
      target: (female && older) || senior ? 1200 : 1000,
      optimal: 1200, targetLabel: 'RDA',
    },
    {
      name: 'Iron', unit: 'mg',
      target: female && !older ? 18 : 8,
      optimal: female && !older ? 18 : 8, targetLabel: 'RDA',
    },
    { name: 'Magnesium', unit: 'mg', target: female ? 320 : 420, optimal: female ? 400 : 500, targetLabel: 'RDA' },
    { name: 'Potassium', unit: 'mg', target: female ? 2600 : 3400, optimal: female ? 3000 : 4700, targetLabel: 'RDA' },
    { name: 'Zinc', unit: 'mg', target: female ? 8 : 11, optimal: female ? 12 : 15, targetLabel: 'RDA' },
    { name: 'Sodium', unit: 'mg', target: sodiumTarget, targetLabel: 'Target Range', isRange: true },
    { name: 'Boron', unit: 'mg', target: 12, targetLabel: 'Target Range', isRange: true },
    { name: 'Omega-3', unit: 'g', target: female ? 1.1 : 1.6, targetLabel: 'Target Range', isRange: true },
  ];
}

/** Nutrients the user's declared restrictions put at elevated risk. */
export function watchedNutrients(p: Profile | null): string[] {
  if (!p || !Array.isArray(p.restrictions)) return [];
  const set = new Set<string>();
  for (const key of p.restrictions) {
    for (const n of RESTRICTIONS[key]?.watch ?? []) set.add(n);
  }
  return [...set];
}
