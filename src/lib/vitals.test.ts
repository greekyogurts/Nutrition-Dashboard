import { describe, expect, it } from 'vitest';
import type { MealItemWire, PlantLogWire } from '../data/wire';
import { plantStatsFor, yogurtStatsFor } from './vitals';

let nextId = 1;
const mealItem = (over: Partial<MealItemWire> = {}): MealItemWire => ({
  id: nextId++, log_date: '2026-07-29', food_name: 'Greek Yogurt (plain)', meal_id: null,
  preset_id: null, quantity_desc: null, is_estimate: false, created_at: '2026-07-29T00:00:00Z',
  quantity_g: 170, protein_g: 17, carbs_g: 6, fat_g: 0, fiber_g: 0, calories: 100, ...over,
});

const plantRow = (over: Partial<PlantLogWire> = {}): PlantLogWire => ({
  id: nextId++, log_date: '2026-07-29', plant_name: 'Spinach', source_food: 'Salad',
  created_at: '2026-07-29T00:00:00Z', ...over,
});

describe('yogurtStatsFor', () => {
  it('sums grams and protein across yogurt items only, matched by name substring', () => {
    const items = [
      mealItem({ food_name: 'Greek Yogurt (plain)', quantity_g: 170, protein_g: 17 }),
      mealItem({ food_name: 'Chicken Breast', quantity_g: 200, protein_g: 40 }),
    ];
    const stats = yogurtStatsFor(items, ['2026-07-29']);
    expect(stats.totalG).toBe(170);
    expect(stats.totalProtein).toBe(17);
  });

  it('matches case-insensitively', () => {
    const items = [mealItem({ food_name: 'GREEK YOGURT', quantity_g: 100, protein_g: 10 })];
    expect(yogurtStatsFor(items, ['2026-07-29']).totalG).toBe(100);
  });

  it('averages grams only over days it was actually logged, not every day in range', () => {
    const items = [mealItem({ log_date: '2026-07-29', quantity_g: 340, protein_g: 34 })];
    const stats = yogurtStatsFor(items, ['2026-07-28', '2026-07-29', '2026-07-30']);
    expect(stats.loggedDays).toBe(1);
    expect(stats.avgG).toBe(340); // 340 / 1, not / 3
    expect(stats.totalDays).toBe(3);
  });

  it('converts total grams to 32oz tubs', () => {
    const TUB_G = 32 * 28.3495;
    const items = [mealItem({ quantity_g: TUB_G * 2, protein_g: 90 })];
    expect(yogurtStatsFor(items, ['2026-07-29']).tubs).toBeCloseTo(2);
  });

  it('is all-zero with nothing logged, and totalDays falls back to 1 with an empty range', () => {
    const stats = yogurtStatsFor([], []);
    expect(stats).toEqual({ totalG: 0, avgG: 0, totalProtein: 0, tubs: 0, loggedDays: 0, totalDays: 1 });
  });

  it('excludes items outside the requested dates', () => {
    const items = [mealItem({ log_date: '2026-06-01', quantity_g: 170, protein_g: 17 })];
    expect(yogurtStatsFor(items, ['2026-07-29']).totalG).toBe(0);
  });
});

describe('plantStatsFor', () => {
  it('counts distinct plants and total logs separately', () => {
    const rows = [
      plantRow({ plant_name: 'Spinach' }),
      plantRow({ plant_name: 'Spinach' }),
      plantRow({ plant_name: 'Kale' }),
    ];
    const stats = plantStatsFor(rows, ['2026-07-29']);
    expect(stats.distinct).toBe(2);
    expect(stats.totalLogs).toBe(3);
    expect(stats.counts).toEqual({ Spinach: 2, Kale: 1 });
  });

  it('is empty with nothing logged in range', () => {
    expect(plantStatsFor([], ['2026-07-29'])).toEqual({ distinct: 0, counts: {}, totalLogs: 0 });
  });

  it('excludes rows outside the requested dates', () => {
    const rows = [plantRow({ log_date: '2026-06-01' })];
    expect(plantStatsFor(rows, ['2026-07-29']).totalLogs).toBe(0);
  });
});
