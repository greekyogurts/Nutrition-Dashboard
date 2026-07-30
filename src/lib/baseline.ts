import {
  num,
  positive,
  type DailyLog,
  type RawDailyLog,
  type RawTdeeBaseline,
  type TdeeBaseline,
} from './types';

/**
 * ADAPTIVE BASELINE TDEE
 *
 * Daily burn splits into two parts that behave completely differently:
 *
 *     TDEE = baseline + training burn
 *
 * BASELINE is BMR plus ordinary daily living — walking around, fidgeting,
 * digesting, standing up. It drifts slowly, over weeks, as bodyweight and habit
 * change. That slow drift is exactly what weight-trend arithmetic measures well.
 *
 * BURN is deliberate training, and it is wildly variable: 0 kcal on a rest day,
 * 986 on a hard one. Strava already reports it per day.
 *
 * Measuring TOTAL TDEE as one averaged number produces a figure only valid for
 * a day with average training — it overstates rest days and understates hard
 * ones by hundreds of calories. Splitting them fixes that: recalibrate the slow
 * part weekly, read the fast part per day.
 *
 * The recalibration runs server-side and lands in `tdee_baseline`, damped so the
 * baseline converges rather than chasing scale noise. This module only reads it.
 */

/** Normalize wire rows: coerce numerics, drop unusable rows, sort by date. */
export function normalizeBaselines(rows: readonly RawTdeeBaseline[] | null | undefined): TdeeBaseline[] {
  return (rows ?? [])
    .map((r) => ({
      effective_date: r.effective_date,
      baseline_cal: num(r.baseline_cal),
      prior_baseline: num(r.prior_baseline),
      implied_baseline: num(r.implied_baseline),
      damping_k: num(r.damping_k),
      window_start: r.window_start ?? null,
      window_end: r.window_end ?? null,
      window_days: num(r.window_days),
      early_avg_lb: num(r.early_avg_lb),
      late_avg_lb: num(r.late_avg_lb),
      rate_lb_per_day: num(r.rate_lb_per_day),
      mean_intake: num(r.mean_intake),
      mean_burn: num(r.mean_burn),
      note: r.note ?? null,
    }))
    // A row with no effective_date or no adopted value cannot be applied.
    .filter((r): r is TdeeBaseline => !!r.effective_date && r.baseline_cal !== null)
    .sort((a, b) => (a.effective_date < b.effective_date ? -1 : 1));
}

/** Normalize `daily_log` wire rows. Assumes ascending order from the query. */
export function normalizeLog(rows: readonly RawDailyLog[] | null | undefined): DailyLog[] {
  return (rows ?? [])
    .filter((r) => !!r.log_date)
    .map((r) => ({
      log_date: r.log_date,
      // Only an explicit `false` marks a day incomplete; absent means complete.
      is_complete: r.is_complete !== false,
      calories: num(r.calories),
      tdee: num(r.tdee),
      surplus_deficit: num(r.surplus_deficit),
      burn_cal: num(r.burn_cal),
      weight_lb: num(r.weight_lb),
      protein_g: num(r.protein_g),
      carbs_g: num(r.carbs_g),
      fat_g: num(r.fat_g),
      fiber_g: num(r.fiber_g),
      sleep_hours: num(r.sleep_hours),
      score: num(r.score),
      hrv: num(r.hrv),
      rhr: num(r.rhr),
    }));
}

/**
 * The baseline in force on a given date.
 *
 * A baseline applies from its `effective_date` forward, so the answer is the
 * latest row not after the date. Returns null for dates before any calibration.
 */
export function baselineOn(
  baselines: readonly TdeeBaseline[],
  dateStr: string,
): TdeeBaseline | null {
  let found: TdeeBaseline | null = null;
  for (const b of baselines) {
    if (b.effective_date <= dateStr) found = b;
    else break; // sorted ascending, so nothing later can qualify
  }
  return found;
}

export function latestBaseline(baselines: readonly TdeeBaseline[]): TdeeBaseline | null {
  return baselines.length ? (baselines[baselines.length - 1] ?? null) : null;
}

/**
 * TDEE for one logged day.
 *
 * A stored `tdee` wins: it records what was believed at the time, and past rows
 * are deliberately never rewritten. Only when absent is it rebuilt from the
 * baseline in force on that date plus that day's burn.
 */
export function tdeeForRow(
  row: Pick<DailyLog, 'log_date' | 'tdee' | 'burn_cal'> | null | undefined,
  baselines: readonly TdeeBaseline[],
): number | null {
  if (!row) return null;
  const stored = positive(row.tdee);
  if (stored !== null) return stored;
  const b = baselineOn(baselines, row.log_date);
  if (!b) return null;
  return b.baseline_cal + (row.burn_cal ?? 0);
}

/** Mean per-day TDEE across rows, skipping days that can't be resolved. */
export function meanTdee(
  rows: readonly DailyLog[],
  baselines: readonly TdeeBaseline[],
): number | null {
  const vals = rows.map((r) => tdeeForRow(r, baselines)).filter((v): v is number => v !== null);
  if (!vals.length) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}
