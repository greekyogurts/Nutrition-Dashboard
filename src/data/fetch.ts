import { supabase } from './client';
import type {
  ActivityWire,
  DailyLogWire,
  LabResultWire,
  MealItemWire,
  MealWire,
  MicronutrientWire,
  PlantLogWire,
  SupplementWire,
  TdeeBaselineWire,
} from './wire';

/**
 * PostgREST caps a response at 1000 rows regardless of what you ask for, so
 * anything that grows daily has to be paged. The vanilla dashboard did this with
 * Range headers; supabase-js exposes the same thing as `.range(from, to)`.
 */
export const PAGE_SIZE = 1000;

/**
 * Page until a short page comes back.
 *
 * Takes the page-fetching function rather than a table name so the loop itself
 * is testable without a network or a database — the pagination logic is the part
 * that has an off-by-one in it, not the query.
 */
export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => Promise<readonly T[]>,
  pageSize: number = PAGE_SIZE,
): Promise<T[]> {
  const all: T[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await fetchPage(offset, offset + pageSize - 1);
    all.push(...page);
    // A short page means we've reached the end. An exactly-full page is
    // ambiguous, so we go round again and expect an empty one.
    if (page.length < pageSize) break;
  }
  return all;
}

type Order = { column: string; ascending?: boolean };

/** One paged, ordered select over a table or view. */
async function selectAll<T>(table: string, order: Order): Promise<T[]> {
  return fetchAllPages<T>(async (from, to) => {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order(order.column, { ascending: order.ascending ?? true })
      .range(from, to);
    if (error) throw new Error(`Failed to load ${table}: ${error.message}`);
    return (data ?? []) as T[];
  });
}

/**
 * Non-essential tables go through this so one unreadable table degrades a single
 * feature rather than blanking the dashboard. `tdee_baseline` is the case in
 * point: it is newer than the others, its RLS policy is separate, and everything
 * except the calibration chart works without it because `daily_log.tdee` is
 * written server-side and stays authoritative.
 */
async function selectAllOptional<T>(table: string, order: Order): Promise<T[]> {
  try {
    return await selectAll<T>(table, order);
  } catch (err) {
    console.warn(`Optional table ${table} unavailable:`, (err as Error).message);
    return [];
  }
}

export const fetchDailyLog = () =>
  selectAll<DailyLogWire>('daily_log', { column: 'log_date' });

export const fetchBaselines = () =>
  selectAllOptional<TdeeBaselineWire>('tdee_baseline', { column: 'effective_date' });

export const fetchActivities = () =>
  selectAll<ActivityWire>('activities', { column: 'log_date' });

export const fetchMicronutrients = () =>
  selectAll<MicronutrientWire>('micronutrients', { column: 'log_date' });

export const fetchMeals = () => selectAll<MealWire>('meals', { column: 'logged_at' });

export const fetchMealItems = () =>
  selectAll<MealItemWire>('meal_items', { column: 'log_date' });

export const fetchPlants = () => selectAll<PlantLogWire>('plants_log', { column: 'log_date' });

export const fetchSupplements = () =>
  selectAll<SupplementWire>('supplements', { column: 'sort_order' });

export const fetchLabResults = () =>
  selectAll<LabResultWire>('lab_results', { column: 'sort_order' });
