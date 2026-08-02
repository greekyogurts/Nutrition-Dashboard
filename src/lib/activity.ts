import type { ActivityWire } from '../data/wire';
import { num } from './types';

export const SPORT_COLORS: Record<string, string> = {
  Run: '#41b2b2', Ride: '#ed5350', WeightTraining: '#33d977', Walk: '#b28fef',
};
export const SPORT_LABELS: Record<string, string> = {
  Run: 'Run', Ride: 'Peloton / Ride', WeightTraining: 'Weight Training', Walk: 'Walk',
};

export function sportColor(type: string): string {
  return SPORT_COLORS[type] ?? '#98989d';
}

export function sportLabel(type: string): string {
  return SPORT_LABELS[type] ?? type;
}

export interface ActivityStats {
  workouts: number;
  avgHR: number;
  burn: number;
}

export function activityStatsFor(rows: readonly ActivityWire[]): ActivityStats {
  const workouts = rows.length;
  const avgHR = workouts
    ? Math.round(rows.reduce((s, a) => s + (num(a.avg_hr) ?? 0), 0) / workouts)
    : 0;
  const burn = Math.round(rows.reduce((s, a) => s + (num(a.calories) ?? 0), 0));
  return { workouts, avgHR, burn };
}

export interface HrPoint {
  date: string;
  value: number;
  color: string;
}

/**
 * Activities without a recorded HR were being charted as Math.round(undefined
 * || 0) = 0, an invisible bar that still claims a category slot. Excluding
 * them entirely keeps the bars packed with no dead columns.
 */
export function hrSeries(rows: readonly ActivityWire[]): HrPoint[] {
  return rows
    .filter((a) => num(a.avg_hr) !== null)
    .map((a) => ({ date: a.log_date, value: Math.round(num(a.avg_hr)!), color: sportColor(a.sport_type) }));
}

export interface VolumeDataset {
  sportType: string;
  label: string;
  color: string;
  data: number[];
}

export interface VolumeSeries {
  dates: string[];
  datasets: VolumeDataset[];
}

export function volumeSeries(rows: readonly ActivityWire[]): VolumeSeries {
  const dates = [...new Set(rows.map((a) => a.log_date))].sort();
  const sportTypes = [...new Set(rows.map((a) => a.sport_type))];
  const datasets = sportTypes.map((sportType) => ({
    sportType,
    label: sportLabel(sportType),
    color: sportColor(sportType),
    data: dates.map((d) => rows
      .filter((a) => a.log_date === d && a.sport_type === sportType)
      .reduce((s, a) => s + (num(a.duration_min) ?? 0), 0)),
  }));
  return { dates, datasets };
}

export interface BreakdownSlice {
  sportType: string;
  label: string;
  color: string;
  minutes: number;
}

export function typeBreakdown(rows: readonly ActivityWire[]): BreakdownSlice[] {
  const sportTypes = [...new Set(rows.map((a) => a.sport_type))];
  return sportTypes.map((sportType) => ({
    sportType,
    label: sportLabel(sportType),
    color: sportColor(sportType),
    minutes: Math.round(
      rows.filter((a) => a.sport_type === sportType).reduce((s, a) => s + (num(a.duration_min) ?? 0), 0),
    ),
  }));
}

export interface BurnPoint {
  date: string;
  calories: number;
}

export function burnSeries(rows: readonly ActivityWire[]): BurnPoint[] {
  const dates = [...new Set(rows.map((a) => a.log_date))].sort();
  return dates.map((date) => ({
    date,
    calories: rows.filter((a) => a.log_date === date).reduce((s, a) => s + (num(a.calories) ?? 0), 0),
  }));
}

export type RelativeDay =
  | { kind: 'today' }
  | { kind: 'yesterday' }
  | { kind: 'daysAgo'; days: number }
  | { kind: 'date' };

/** How to phrase a log date relative to the most recent logged day. */
export function relativeDay(date: string, latestDate: string | null): RelativeDay {
  if (!latestDate) return { kind: 'date' };
  const diff = Math.round((new Date(latestDate).getTime() - new Date(date).getTime()) / 86_400_000);
  if (diff === 0) return { kind: 'today' };
  if (diff === 1) return { kind: 'yesterday' };
  if (diff > 1) return { kind: 'daysAgo', days: diff };
  return { kind: 'date' };
}

/** Most recent activities regardless of the selected range — "Always latest". */
export function recentActivities(all: readonly ActivityWire[], count = 3): ActivityWire[] {
  return [...all].sort((a, b) => (a.log_date < b.log_date ? 1 : -1)).slice(0, count);
}
