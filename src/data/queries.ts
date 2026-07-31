import { useQueries, type UseQueryOptions } from '@tanstack/react-query';
import { normalizeBaselines, normalizeLog } from '../lib/baseline';
import type { DailyLog, TdeeBaseline } from '../lib/types';
import {
  fetchActivities,
  fetchBaselines,
  fetchDailyLog,
  fetchLabResults,
  fetchMealItems,
  fetchMeals,
  fetchMicronutrients,
  fetchPlants,
  fetchSupplements,
} from './fetch';
import type {
  ActivityWire,
  LabResultWire,
  MealItemWire,
  MealWire,
  MicronutrientWire,
  PlantLogWire,
  SupplementWire,
} from './wire';

/**
 * Query layer.
 *
 * This replaces the hand-rolled loading banner / error banner / spinning-refresh
 * bookkeeping in the vanilla dashboard. React Query owns loading, error, retry
 * and cache invalidation, so the UI reads state rather than maintaining it.
 *
 * Normalization happens in `select`, which React Query memoizes per query — so
 * wire rows are coerced once when data changes, not on every render.
 */

export const queryKeys = {
  dailyLog: ['daily_log'] as const,
  baselines: ['tdee_baseline'] as const,
  activities: ['activities'] as const,
  micronutrients: ['micronutrients'] as const,
  meals: ['meals'] as const,
  mealItems: ['meal_items'] as const,
  plants: ['plants_log'] as const,
  supplements: ['supplements'] as const,
  labResults: ['lab_results'] as const,
};

/**
 * The log is appended to roughly once a day and never changes retroactively, so
 * a long stale time avoids refetching ten tables every time a component mounts.
 * Pull-to-refresh and the refresh button invalidate explicitly.
 */
const STATIC_DATA: Partial<UseQueryOptions> = {
  staleTime: 5 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
  refetchOnWindowFocus: false,
};

export interface DashboardData {
  log: DailyLog[];
  baselines: TdeeBaseline[];
  activities: ActivityWire[];
  micronutrients: MicronutrientWire[];
  meals: MealWire[];
  mealItems: MealItemWire[];
  plants: PlantLogWire[];
  supplements: SupplementWire[];
  labResults: LabResultWire[];
  isLoading: boolean;
  /** True while any query is fetching, including background refetches after the initial load. */
  isFetching: boolean;
  /** First error across all queries, or null. */
  error: Error | null;
  refetch: () => void;
}

/**
 * Everything the dashboard needs, in one hook.
 *
 * `useQueries` runs them in parallel — the same shape as the old Promise.all —
 * but unlike Promise.all a single failure does not discard the other nine
 * results. Each query settles independently, so a broken table costs one
 * feature rather than the whole page.
 */
export function useDashboardData(): DashboardData {
  const results = useQueries({
    queries: [
      { queryKey: queryKeys.dailyLog, queryFn: fetchDailyLog, select: normalizeLog, ...STATIC_DATA },
      { queryKey: queryKeys.baselines, queryFn: fetchBaselines, select: normalizeBaselines, ...STATIC_DATA },
      { queryKey: queryKeys.activities, queryFn: fetchActivities, ...STATIC_DATA },
      { queryKey: queryKeys.micronutrients, queryFn: fetchMicronutrients, ...STATIC_DATA },
      { queryKey: queryKeys.meals, queryFn: fetchMeals, ...STATIC_DATA },
      { queryKey: queryKeys.mealItems, queryFn: fetchMealItems, ...STATIC_DATA },
      { queryKey: queryKeys.plants, queryFn: fetchPlants, ...STATIC_DATA },
      { queryKey: queryKeys.supplements, queryFn: fetchSupplements, ...STATIC_DATA },
      { queryKey: queryKeys.labResults, queryFn: fetchLabResults, ...STATIC_DATA },
    ] as never,
  });

  const [log, baselines, activities, micros, meals, mealItems, plants, supplements, labs] = results;

  return {
    log: (log?.data as DailyLog[]) ?? [],
    baselines: (baselines?.data as TdeeBaseline[]) ?? [],
    activities: (activities?.data as ActivityWire[]) ?? [],
    micronutrients: (micros?.data as MicronutrientWire[]) ?? [],
    meals: (meals?.data as MealWire[]) ?? [],
    mealItems: (mealItems?.data as MealItemWire[]) ?? [],
    plants: (plants?.data as PlantLogWire[]) ?? [],
    supplements: (supplements?.data as SupplementWire[]) ?? [],
    labResults: (labs?.data as LabResultWire[]) ?? [],
    // The core tables gate the loading state; the optional ones never block it.
    isLoading: !!log?.isLoading,
    isFetching: results.some((r) => r?.isFetching),
    error: (results.find((r) => r?.error)?.error as Error | undefined) ?? null,
    refetch: () => results.forEach((r) => void r?.refetch?.()),
  };
}
