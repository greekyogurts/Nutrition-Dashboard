import { latestBaseline } from './baseline';
import { currentWeightLb, goalFor, type Profile } from './profile';
import { positive, type DailyLog, type TdeeBaseline } from './types';

/** Where the TDEE figure came from, so the UI can be honest about it. */
export type EnergySource = 'calibrated' | 'logged';

export interface Energy {
  /** Total daily energy expenditure: baseline + today's burn. */
  tdee: number;
  /** TDEE adjusted by the profile's goal — what to actually eat. */
  target: number;
  /** The slow-moving part, when a calibration exists. */
  baselineCal: number | null;
  /** Today's training burn. */
  burn: number;
  baselineRow: TdeeBaseline | null;
  source: EnergySource;
  /** From the latest logged weigh-in, never from the profile. */
  weightLb: number | null;
}

export interface EnergyInput {
  profile: Profile | null;
  log: readonly DailyLog[];
  baselines: readonly TdeeBaseline[];
}

/**
 * Resolve the day's energy picture.
 *
 * There is deliberately no BMR formula here. Height, body fat % and an activity
 * multiplier existed solely to feed Mifflin-St Jeor / Katch-McArdle, and the
 * whole point of measuring a baseline against real weight change is that it
 * replaces that guess. Asking for three inputs to compute a number nothing reads
 * is worse than not asking.
 *
 * Returns null when there is neither a calibration nor a logged TDEE — null being
 * the honest answer, since no field the user could fill would change it.
 */
export function computeEnergy({ profile, log, baselines }: EnergyInput): Energy | null {
  const cal = latestBaseline(baselines);
  const todayRow = log.length ? log[log.length - 1] : undefined;
  const burn = todayRow?.burn_cal ?? 0;
  const loggedTdee = positive(todayRow?.tdee ?? null);

  let tdee: number;
  let source: EnergySource;
  if (cal) {
    tdee = cal.baseline_cal + burn;
    source = 'calibrated';
  } else if (loggedTdee !== null) {
    // No calibration row yet, but the day carries a stored TDEE.
    tdee = loggedTdee;
    source = 'logged';
  } else {
    return null;
  }

  const goal = goalFor(profile);
  return {
    tdee: Math.round(tdee),
    target: Math.round(tdee + goal.kcalDelta),
    baselineCal: cal ? cal.baseline_cal : null,
    burn,
    baselineRow: cal,
    source,
    weightLb: currentWeightLb(log),
  };
}
