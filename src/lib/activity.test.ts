import { describe, expect, it } from 'vitest';
import type { ActivityWire } from '../data/wire';
import {
  activityStatsFor, burnSeries, hrSeries, recentActivities, relativeDay,
  sportColor, sportLabel, typeBreakdown, volumeSeries,
} from './activity';

let nextId = 1;
const activity = (over: Partial<ActivityWire> = {}): ActivityWire => ({
  id: nextId++, log_date: '2026-07-29', sport_type: 'Run', name: 'Morning Run',
  duration_min: 30, calories: 300, avg_hr: 140, avg_watts: null, distance_mi: 3,
  elevation_gain_ft: null, max_hr: null, relative_effort: null, source: 'strava',
  created_at: '2026-07-29T00:00:00Z', ...over,
});

describe('activityStatsFor', () => {
  it('counts workouts, averages HR, and sums calories burned', () => {
    const rows = [activity({ avg_hr: 140, calories: 300 }), activity({ avg_hr: 160, calories: 500 })];
    expect(activityStatsFor(rows)).toEqual({ workouts: 2, avgHR: 150, burn: 800 });
  });

  it('is zero, not NaN, with no rows', () => {
    expect(activityStatsFor([])).toEqual({ workouts: 0, avgHR: 0, burn: 0 });
  });

  it('coerces a wire-string HR the same as a number (avg_hr is numeric on the wire; calories is a plain int)', () => {
    const rows = [activity({ avg_hr: '140', calories: 300 })];
    expect(activityStatsFor(rows)).toEqual({ workouts: 1, avgHR: 140, burn: 300 });
  });
});

describe('hrSeries', () => {
  it('excludes activities without a recorded HR rather than charting them as zero', () => {
    const rows = [activity({ avg_hr: 140 }), activity({ avg_hr: null }), activity({ avg_hr: '' })];
    expect(hrSeries(rows)).toHaveLength(1);
  });

  it('colors each point by sport type, falling back to grey for unknown sports', () => {
    const rows = [activity({ sport_type: 'Ride', avg_hr: 130 }), activity({ sport_type: 'Yoga', avg_hr: 90 })];
    const series = hrSeries(rows);
    expect(series[0]!.color).toBe('#ff453a');
    expect(series[1]!.color).toBe('#98989d');
  });
});

describe('volumeSeries', () => {
  it('sums duration per date per sport, one dataset per sport type', () => {
    const rows = [
      activity({ log_date: '2026-07-28', sport_type: 'Run', duration_min: 30 }),
      activity({ log_date: '2026-07-28', sport_type: 'Ride', duration_min: 45 }),
      activity({ log_date: '2026-07-29', sport_type: 'Run', duration_min: 20 }),
    ];
    const { dates, datasets } = volumeSeries(rows);
    expect(dates).toEqual(['2026-07-28', '2026-07-29']);
    const run = datasets.find((d) => d.sportType === 'Run')!;
    expect(run.data).toEqual([30, 20]);
    const ride = datasets.find((d) => d.sportType === 'Ride')!;
    expect(ride.data).toEqual([45, 0]);
  });
});

describe('typeBreakdown', () => {
  it('totals minutes per sport across the whole range', () => {
    const rows = [
      activity({ sport_type: 'Run', duration_min: 30 }),
      activity({ sport_type: 'Run', duration_min: 20 }),
      activity({ sport_type: 'Walk', duration_min: 15 }),
    ];
    const slices = typeBreakdown(rows);
    expect(slices.find((s) => s.sportType === 'Run')!.minutes).toBe(50);
    expect(slices.find((s) => s.sportType === 'Walk')!.minutes).toBe(15);
  });
});

describe('burnSeries', () => {
  it('sums calories across same-day activities', () => {
    const rows = [
      activity({ log_date: '2026-07-28', calories: 300 }),
      activity({ log_date: '2026-07-28', calories: 200 }),
      activity({ log_date: '2026-07-29', calories: 400 }),
    ];
    expect(burnSeries(rows)).toEqual([
      { date: '2026-07-28', calories: 500 },
      { date: '2026-07-29', calories: 400 },
    ]);
  });
});

describe('relativeDay', () => {
  it('labels today, yesterday, and further-back days relative to the latest logged date', () => {
    expect(relativeDay('2026-07-29', '2026-07-29')).toEqual({ kind: 'today' });
    expect(relativeDay('2026-07-28', '2026-07-29')).toEqual({ kind: 'yesterday' });
    expect(relativeDay('2026-07-20', '2026-07-29')).toEqual({ kind: 'daysAgo', days: 9 });
  });

  it('falls back to a plain date with no logged history', () => {
    expect(relativeDay('2026-07-29', null)).toEqual({ kind: 'date' });
  });
});

describe('recentActivities', () => {
  it('returns the most recent N regardless of range, newest first', () => {
    const rows = [
      activity({ id: 1, log_date: '2026-07-20' }),
      activity({ id: 2, log_date: '2026-07-29' }),
      activity({ id: 3, log_date: '2026-07-25' }),
      activity({ id: 4, log_date: '2026-07-15' }),
    ];
    expect(recentActivities(rows, 3).map((a) => a.id)).toEqual([2, 3, 1]);
  });
});

describe('sportColor / sportLabel', () => {
  it('has display names for the four known sports and passes through unknown ones', () => {
    expect(sportLabel('Ride')).toBe('Peloton / Ride');
    expect(sportLabel('Yoga')).toBe('Yoga');
    expect(sportColor('WeightTraining')).toBe('#30d158');
  });
});
