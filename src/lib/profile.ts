import type { DailyLog } from './types';

export const LB_PER_KG = 2.20462;
/** Conventional energy density of body mass change. */
export const KCAL_PER_LB = 3500;

/** Goal presets: the delta applied to TDEE to get a daily calorie target. */
export const GOALS = {
  lose: { label: 'Lose weight', note: '≈1 lb/week', kcalDelta: -500 },
  maintain: { label: 'Maintain', note: 'hold steady', kcalDelta: 0 },
  gain: { label: 'Gain weight', note: 'lean bulk', kcalDelta: 300 },
} as const;

export type GoalKey = keyof typeof GOALS;

/**
 * Everything the dashboard stores about the user.
 *
 * Height, body fat % and activity level are deliberately absent: their only
 * consumer was the Mifflin-St Jeor / Katch-McArdle BMR estimate, which the
 * calibrated baseline replaced. Weight is absent too — it comes from the log,
 * because a value typed in once used to override every later weigh-in and
 * silently anchored the protein target to a stale figure.
 */
export interface Profile {
  name: string | null;
  sex: 'male' | 'female' | null;
  birth_year: number | null;
  goal: GoalKey;
  diet: string;
  custom_protein_g: number | null;
  custom_fat_g: number | null;
  restrictions: string[];
}

/**
 * Namespaced per user: two family members signing into the same browser must
 * not inherit each other's name, goal or macro targets. The bare key is the
 * pre-multi-user one and is still read once, to migrate the existing profile
 * to whoever claims the legacy data.
 */
export const LEGACY_PROFILE_KEY = 'healthDashboard.profile.v1';

export function profileKey(userId: string | null): string {
  return userId ? `${LEGACY_PROFILE_KEY}.${userId}` : LEGACY_PROFILE_KEY;
}

/** Age in whole years, or null when birth year is unset. */
export function profileAge(p: Profile | null, now = new Date()): number | null {
  if (!p?.birth_year) return null;
  return now.getFullYear() - p.birth_year;
}

/**
 * Bodyweight from the most recent logged weigh-in.
 *
 * Reads the log and nothing else. The profile deliberately has no weight field
 * to override it — see the Profile doc comment.
 */
export function currentWeightLb(log: readonly DailyLog[]): number | null {
  for (let i = log.length - 1; i >= 0; i--) {
    const w = log[i]?.weight_lb;
    if (w !== null && w !== undefined && w > 0) return w;
  }
  return null;
}

export function goalFor(p: Profile | null) {
  return (p && GOALS[p.goal]) || GOALS.maintain;
}
