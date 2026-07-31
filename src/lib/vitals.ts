import type { MealItemWire, PlantLogWire } from '../data/wire';
import { num } from './types';

/**
 * The Greek Yogurt and Plant Diversity vitals — ported from the vanilla's
 * Card 1, which folded them in alongside Sleep/HRV/RHR rather than giving
 * them their own card. Both are simple range-filtered aggregations over
 * tables (`meal_items`, `plants_log`) that nothing else in the dashboard
 * reads.
 */

export interface YogurtStats {
  totalG: number;
  avgG: number;
  totalProtein: number;
  tubs: number;
  loggedDays: number;
  totalDays: number;
}

/** A standard 32 oz tub, in grams. */
const TUB_G = 32 * 28.3495;

/** Matches on food name containing "greek yogurt" — there's no dedicated food category to key off. */
export function yogurtStatsFor(mealItems: readonly MealItemWire[], dates: readonly string[]): YogurtStats {
  const dateSet = new Set(dates);
  const items = mealItems.filter(
    (m) => dateSet.has(m.log_date) && m.food_name.toLowerCase().includes('greek yogurt'),
  );
  const totalG = items.reduce((s, m) => s + (num(m.quantity_g) ?? 0), 0);
  const totalProtein = items.reduce((s, m) => s + (num(m.protein_g) ?? 0), 0);
  const loggedDays = new Set(items.map((m) => m.log_date)).size;
  const avgG = loggedDays ? totalG / loggedDays : 0;
  const tubs = totalG / TUB_G;
  return { totalG, avgG, totalProtein, tubs, loggedDays, totalDays: dates.length || 1 };
}

export interface PlantStats {
  /** Count of botanically distinct plants. */
  distinct: number;
  /** Times each plant was logged, most-logged first when displayed. */
  counts: Record<string, number>;
  totalLogs: number;
}

export function plantStatsFor(plants: readonly PlantLogWire[], dates: readonly string[]): PlantStats {
  const dateSet = new Set(dates);
  const rows = plants.filter((p) => dateSet.has(p.log_date));
  const counts: Record<string, number> = {};
  for (const p of rows) {
    const name = p.plant_name || 'Unknown';
    counts[name] = (counts[name] ?? 0) + 1;
  }
  return { distinct: Object.keys(counts).length, counts, totalLogs: rows.length };
}
