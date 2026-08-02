import type { RawDailyLog, RawTdeeBaseline } from './types';
import type { Profile } from './profile';

/**
 * Real rows from the production Supabase project, copied verbatim — including
 * the string numerics PostgREST actually returns (`damping_k: '0.5'`,
 * `rate_lb_per_day: '-0.1616'`, `weight_lb: '174.0'`).
 *
 * Tests run against these rather than tidy invented data so they pin the
 * behaviour that ships, not an idealised version of it.
 */

export const BASELINES_RAW: RawTdeeBaseline[] = [
  {
    effective_date: '2026-06-13',
    baseline_cal: 2450,
    prior_baseline: null,
    implied_baseline: null,
    damping_k: '0.5',
    window_start: null,
    window_end: null,
    window_days: null,
    early_avg_lb: null,
    late_avg_lb: null,
    rate_lb_per_day: null,
    mean_intake: null,
    mean_burn: null,
    note: 'Seed: original hardcoded formula-derived baseline, never calibrated',
  },
  {
    effective_date: '2026-07-29',
    baseline_cal: 2555,
    prior_baseline: 2450,
    implied_baseline: 2660,
    damping_k: '0.5',
    window_start: '2026-07-06',
    window_end: '2026-07-28',
    window_days: 23,
    early_avg_lb: '178.63',
    late_avg_lb: '176.04',
    rate_lb_per_day: '-0.1616',
    mean_intake: 2487,
    mean_burn: 393,
    note:
      'First calibration. 23 continuous weighted complete days, no gaps. ' +
      'Implied 2660 (+210 vs assumed); damped k=0.5 to 2555 (+105, within 150 cap). ' +
      'Caveat: Strava burn is gross not net, biasing implied_baseline downward.',
  },
];

export const LOG_RAW: RawDailyLog[] = [
  { log_date: '2026-07-22', calories: 3008, tdee: 3056, surplus_deficit: -48, burn_cal: 606, weight_lb: '175.2', is_complete: true },
  { log_date: '2026-07-23', calories: 2488, tdee: 2985, surplus_deficit: -497, burn_cal: 535, weight_lb: '179.6', is_complete: true },
  { log_date: '2026-07-24', calories: 2488, tdee: 2841, surplus_deficit: -353, burn_cal: 391, weight_lb: '175.4', is_complete: true },
  { log_date: '2026-07-25', calories: 2800, tdee: 3252, surplus_deficit: -452, burn_cal: 802, weight_lb: '175.8', is_complete: true },
  { log_date: '2026-07-26', calories: 2370, tdee: 2450, surplus_deficit: -80, burn_cal: 0, weight_lb: '174', is_complete: true },
  { log_date: '2026-07-27', calories: 3715, tdee: 3436, surplus_deficit: 279, burn_cal: 986, weight_lb: '176.2', is_complete: true },
  { log_date: '2026-07-28', calories: 2650, tdee: 2450, surplus_deficit: 200, burn_cal: 0, weight_lb: '176.1', is_complete: true },
  // Today: in progress, hence is_complete false.
  { log_date: '2026-07-29', calories: 1240, tdee: 2797, surplus_deficit: -1557, burn_cal: 242, weight_lb: '174.0', is_complete: false },
];

export const BEN: Profile = {
  title: "Ben's Health Dashboard",
  subtitle: null,
  avatar_data_url: null,
  sex: 'male',
  birth_year: 1994,
  goal: 'lose',
  diet: 'balanced',
  custom_protein_g: null,
  custom_fat_g: null,
  restrictions: [],
};

/** A profile saved before height/weight/activity/bodyfat were removed. */
export const LEGACY_PROFILE = {
  ...BEN,
  height_cm: 180,
  weight_lb: 999,
  activity_level: 'sedentary',
  body_fat_pct: 30,
} as Profile & Record<string, unknown>;
