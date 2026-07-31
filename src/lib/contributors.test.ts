import { describe, expect, it } from 'vitest';
import type { MealWire } from '../data/wire';
import { macroContributorsGrouped, macroContributorsSingleDay } from './contributors';

let nextId = 1;
const meal = (over: Partial<MealWire> = {}): MealWire => ({
  id: nextId++, log_date: '2026-07-29', logged_at: '2026-07-29T08:00:00Z',
  meal_type: 'Breakfast', description: 'Oatmeal', calories: 300,
  protein_g: 12, carbs_g: 50, fat_g: 6, fiber_g: 8, ...over,
});

describe('macroContributorsSingleDay', () => {
  it('sorts meals within the range by the requested macro, descending', () => {
    const meals = [
      meal({ meal_type: 'Breakfast', description: 'Oatmeal', protein_g: 12 }),
      meal({ meal_type: 'Dinner', description: 'Steak', protein_g: 45 }),
      meal({ meal_type: 'Lunch', description: 'Salad', protein_g: 20 }),
    ];
    const result = macroContributorsSingleDay(meals, ['2026-07-29'], 'protein');
    expect(result.map((c) => c.mealType)).toEqual(['Dinner', 'Lunch', 'Breakfast']);
    expect(result[0]).toEqual({ mealType: 'Dinner', description: 'Steak', grams: 45 });
  });

  it('sorts by a different macro when asked', () => {
    const meals = [meal({ meal_type: 'A', carbs_g: 10 }), meal({ meal_type: 'B', carbs_g: 90 })];
    expect(macroContributorsSingleDay(meals, ['2026-07-29'], 'carbs').map((c) => c.mealType)).toEqual(['B', 'A']);
  });

  it('excludes meals outside the requested dates', () => {
    const meals = [meal({ log_date: '2026-06-01' })];
    expect(macroContributorsSingleDay(meals, ['2026-07-29'], 'protein')).toEqual([]);
  });
});

describe('macroContributorsGrouped', () => {
  it('aggregates by description across days, ranked by total and capped at 8', () => {
    const meals = [
      meal({ log_date: '2026-07-27', description: 'Chicken Breast', protein_g: 40 }),
      meal({ log_date: '2026-07-28', description: 'Chicken Breast', protein_g: 40 }),
      meal({ log_date: '2026-07-29', description: 'Protein Shake', protein_g: 30 }),
    ];
    const result = macroContributorsGrouped(meals, ['2026-07-27', '2026-07-28', '2026-07-29'], 'protein');
    expect(result[0]).toEqual({ name: 'Chicken Breast', total: 80, count: 2, avg: 40 });
    expect(result[1]).toEqual({ name: 'Protein Shake', total: 30, count: 1, avg: 30 });
  });

  it('caps at the top 8 by total', () => {
    const meals = Array.from({ length: 12 }, (_, i) => meal({ description: `Food ${i}`, protein_g: i + 1 }));
    const result = macroContributorsGrouped(meals, ['2026-07-29'], 'protein');
    expect(result).toHaveLength(8);
    expect(result[0]!.name).toBe('Food 11'); // highest protein_g wins the top slot
  });

  it('falls back to meal_type when description is blank, and excludes out-of-range meals', () => {
    const meals = [
      meal({ description: '', meal_type: 'Snack', protein_g: 5, log_date: '2026-07-29' }),
      meal({ description: 'X', protein_g: 5, log_date: '2026-06-01' }),
    ];
    const result = macroContributorsGrouped(meals, ['2026-07-29'], 'protein');
    expect(result).toEqual([{ name: 'Snack', total: 5, count: 1, avg: 5 }]);
  });
});
