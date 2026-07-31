import type { MealWire } from '../data/wire';

/**
 * "What contributed to this macro" — the Overview card's macro-tile
 * tap-to-expand. Ported from openMacroExpand, which branches on whether the
 * selected range is a single day (a per-meal list) or several (grouped by
 * description, since the schema's finest grain for "what food" is the meal's
 * free-text description).
 */
export type MacroKey = 'protein' | 'carbs' | 'fat';

const FIELD: Record<MacroKey, 'protein_g' | 'carbs_g' | 'fat_g'> = {
  protein: 'protein_g',
  carbs: 'carbs_g',
  fat: 'fat_g',
};

export interface MacroContributorSingle {
  mealType: string;
  description: string;
  grams: number;
}

export function macroContributorsSingleDay(
  meals: readonly MealWire[],
  dates: readonly string[],
  macroKey: MacroKey,
): MacroContributorSingle[] {
  const dateSet = new Set(dates);
  const field = FIELD[macroKey];
  return meals
    .filter((m) => dateSet.has(m.log_date))
    .map((m) => ({ mealType: m.meal_type || 'Meal', description: m.description || '', grams: m[field] }))
    .sort((a, b) => b.grams - a.grams);
}

export interface MacroContributorGrouped {
  name: string;
  total: number;
  count: number;
  avg: number;
}

/** Top 8 by total grams — the closest reliable proxy to "most common food items" the schema supports. */
export function macroContributorsGrouped(
  meals: readonly MealWire[],
  dates: readonly string[],
  macroKey: MacroKey,
): MacroContributorGrouped[] {
  const dateSet = new Set(dates);
  const field = FIELD[macroKey];
  const byDesc = new Map<string, { total: number; count: number }>();
  for (const m of meals) {
    if (!dateSet.has(m.log_date)) continue;
    const key = (m.description || m.meal_type || 'Meal').trim();
    const cur = byDesc.get(key) ?? { total: 0, count: 0 };
    cur.total += m[field];
    cur.count += 1;
    byDesc.set(key, cur);
  }
  return [...byDesc.entries()]
    .map(([name, v]) => ({ name, total: v.total, count: v.count, avg: v.total / v.count }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);
}
