/**
 * Domain types, split deliberately into RAW and normalized halves.
 *
 * PostgREST returns `numeric` columns as JSON strings — `damping_k: "0.5"`,
 * `rate_lb_per_day: "-0.1616"`, `weight_lb: "174.0"`. Left uncast those
 * silently poison arithmetic (`"0.5" * 2` is 1, but `"0.5" + 2` is "0.52")
 * and make Chart.js plot nothing at all with no error.
 *
 * Modelling the wire format separately from the normalized format makes that
 * class of bug a compile error rather than a runtime mystery: a `RawBaselineRow`
 * simply cannot be passed where a `TdeeBaseline` is expected.
 */

/** A numeric column as it actually arrives over the wire. */
export type WireNumber = number | string | null;

// ---------------------------------------------------------------------------
// daily_log
// ---------------------------------------------------------------------------

/** `daily_log` straight off the wire. */
export interface RawDailyLog {
  log_date: string;
  is_complete?: boolean | null;
  calories?: WireNumber;
  /** Authoritative when present — records what was believed that day. */
  tdee?: WireNumber;
  /** Generated column: `calories - tdee`. */
  surplus_deficit?: WireNumber;
  burn_cal?: WireNumber;
  weight_lb?: WireNumber;
  protein_g?: WireNumber;
  carbs_g?: WireNumber;
  fat_g?: WireNumber;
  fiber_g?: WireNumber;
  sleep_hours?: WireNumber;
  score?: WireNumber;
  hrv?: WireNumber;
  rhr?: WireNumber;
}

/** `daily_log` after normalization: every numeric is a real number or null. */
export interface DailyLog {
  log_date: string;
  is_complete: boolean;
  calories: number | null;
  tdee: number | null;
  surplus_deficit: number | null;
  burn_cal: number | null;
  weight_lb: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  sleep_hours: number | null;
  score: number | null;
  hrv: number | null;
  rhr: number | null;
}

// ---------------------------------------------------------------------------
// tdee_baseline
// ---------------------------------------------------------------------------

/** `tdee_baseline` straight off the wire. */
export interface RawTdeeBaseline {
  effective_date: string;
  baseline_cal: WireNumber;
  prior_baseline?: WireNumber;
  implied_baseline?: WireNumber;
  damping_k?: WireNumber;
  window_start?: string | null;
  window_end?: string | null;
  window_days?: WireNumber;
  early_avg_lb?: WireNumber;
  late_avg_lb?: WireNumber;
  rate_lb_per_day?: WireNumber;
  mean_intake?: WireNumber;
  mean_burn?: WireNumber;
  note?: string | null;
}

/**
 * A calibration record, normalized.
 *
 * `baseline_cal` is non-nullable because a row without one is meaningless and
 * gets dropped during normalization. Every analytics field stays nullable on
 * purpose: the seed row predates any calibration window, and collapsing those
 * nulls to 0 would draw a fictitious cliff to the axis on the trend chart.
 */
export interface TdeeBaseline {
  effective_date: string;
  baseline_cal: number;
  prior_baseline: number | null;
  implied_baseline: number | null;
  damping_k: number | null;
  window_start: string | null;
  window_end: string | null;
  window_days: number | null;
  early_avg_lb: number | null;
  late_avg_lb: number | null;
  rate_lb_per_day: number | null;
  mean_intake: number | null;
  mean_burn: number | null;
  note: string | null;
}

// ---------------------------------------------------------------------------
// Coercion helpers — the single boundary where wire values become numbers.
// ---------------------------------------------------------------------------

/** Wire value to number, or null. Empty strings and NaN both become null. */
export function num(v: WireNumber | undefined): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Wire value to a positive number, or null. Zero counts as absent. */
export function positive(v: WireNumber | undefined): number | null {
  const n = num(v);
  return n !== null && n > 0 ? n : null;
}
