import type { MicronutrientWire } from '../data/wire';
import { dietFor } from './macros';
import { num } from './types';
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

export interface MicroStat extends MicroTarget {
  avg: number;
  pct: number;
  /** null for range-based nutrients, which have no optimal figure. */
  pctOptimal: number | null;
  foodAvg: number;
  suppAvg: number;
}

export interface MicroSummary {
  stats: MicroStat[];
  /**
   * Lowest-pct RDA nutrient. An unlogged nutrient reads as a real 0%, so this
   * is null only when `targets` has no RDA nutrients at all — check `hasData`
   * before trusting it as "worst logged". Range nutrients never qualify.
   */
  worst: { name: string; pct: number; index: number } | null;
  best: { name: string; pct: number } | null;
  /** Whether any micronutrient row fell inside the tracked date range. */
  hasData: boolean;
}

/**
 * Per-nutrient averages against target, plus the worst/best RDA performers.
 *
 * Averages over `dates` filtered to no earlier than the first logged
 * micronutrient row — otherwise "All Time" divides by every daily_log day
 * ever, including months before micros were tracked at all, diluting the
 * average toward zero.
 */
export function microStatsFor(
  micros: readonly MicronutrientWire[],
  dates: readonly string[],
  targets: readonly MicroTarget[],
): MicroSummary {
  const trackingStart = micros.length
    ? micros.reduce((min, m) => (m.log_date < min ? m.log_date : min), micros[0]!.log_date)
    : null;
  const trackedDates = trackingStart ? dates.filter((d) => d >= trackingStart) : dates;
  const dayCount = trackedDates.length || 1;
  const dateSet = new Set(trackedDates);
  const rows = micros.filter((m) => dateSet.has(m.log_date));

  let worst: MicroSummary['worst'] = null;
  let best: MicroSummary['best'] = null;

  const stats = targets.map((m, index) => {
    const nutrientRows = rows.filter((r) => r.nutrient === m.name);
    const sum = (rs: typeof nutrientRows) => rs.reduce((s, r) => s + (num(r.amount) ?? 0), 0);
    const avg = sum(nutrientRows) / dayCount;
    const foodAvg = sum(nutrientRows.filter((r) => r.source !== 'supplement')) / dayCount;
    const suppAvg = sum(nutrientRows.filter((r) => r.source === 'supplement')) / dayCount;
    const pct = m.target ? Math.round((avg / m.target) * 100) : 0;
    const pctOptimal = !m.isRange && m.optimal ? Math.round((avg / m.optimal) * 100) : null;

    // Only standard RDA nutrients count toward worst/best — range-based ones
    // don't have a deficiency floor to warn about.
    if (!m.isRange) {
      if (!worst || pct < worst.pct) worst = { name: m.name, pct, index };
      if (!best || pct > best.pct) best = { name: m.name, pct };
    }

    return { ...m, avg, pct, pctOptimal, foodAvg, suppAvg };
  });

  return { stats, worst, best, hasData: rows.length > 0 };
}

/** Bar colour: green ≥80% of RDA, amber ≥50%, red below. Range nutrients never go red. */
export function microBarColor(pct: number, isRange?: boolean): string {
  if (isRange) return pct >= 40 && pct <= 150 ? '#30d158' : '#ff9f0a';
  if (pct >= 80) return '#30d158';
  if (pct >= 50) return '#ff9f0a';
  return '#ff453a';
}

export interface MicroHistoryPoint {
  date: string;
  amount: number;
}

/**
 * Daily intake history for one nutrient, summed across food+supplement
 * entries on the same day. Fixed 30-entry lookback regardless of the
 * dashboard's current range selector — "history" is a different question
 * than "today's average," and shouldn't reset every time a different
 * time-range button is tapped.
 */
export function microHistorySeries(
  micros: readonly MicronutrientWire[],
  nutrientName: string,
): MicroHistoryPoint[] {
  const byDate = new Map<string, number>();
  for (const m of micros) {
    if (m.nutrient !== nutrientName) continue;
    byDate.set(m.log_date, (byDate.get(m.log_date) ?? 0) + (num(m.amount) ?? 0));
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .slice(-30)
    .map(([date, amount]) => ({ date, amount }));
}
