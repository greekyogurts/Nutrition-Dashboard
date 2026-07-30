import { describe, expect, it } from 'vitest';
import {
  baselineOn,
  latestBaseline,
  meanTdee,
  normalizeBaselines,
  normalizeLog,
  tdeeForRow,
} from './baseline';
import { BASELINES_RAW, LOG_RAW } from './fixtures';
import { KCAL_PER_LB } from './profile';

const baselines = normalizeBaselines(BASELINES_RAW);
const log = normalizeLog(LOG_RAW);

describe('normalizeBaselines', () => {
  it('coerces the string numerics PostgREST actually returns', () => {
    const cal = baselines[1]!;
    expect(cal.damping_k).toBe(0.5);
    expect(cal.rate_lb_per_day).toBeCloseTo(-0.1616, 10);
    expect(cal.early_avg_lb).toBe(178.63);
    expect(cal.late_avg_lb).toBe(176.04);
    // These are the actual types, not just the values — a string here would
    // silently break arithmetic downstream.
    expect(typeof cal.damping_k).toBe('number');
    expect(typeof cal.rate_lb_per_day).toBe('number');
  });

  it('keeps absent analytics as null rather than collapsing them to 0', () => {
    // The seed row predates any calibration window. Zeroing these would draw a
    // fictitious cliff to the axis on the trend chart.
    const seed = baselines[0]!;
    expect(seed.implied_baseline).toBeNull();
    expect(seed.rate_lb_per_day).toBeNull();
    expect(seed.window_start).toBeNull();
    expect(seed.window_days).toBeNull();
  });

  it('sorts ascending by effective_date regardless of input order', () => {
    const reversed = normalizeBaselines([...BASELINES_RAW].reverse());
    expect(reversed.map((b) => b.effective_date)).toEqual(['2026-06-13', '2026-07-29']);
  });

  it('drops rows that cannot be applied', () => {
    expect(normalizeBaselines([{ effective_date: '', baseline_cal: 2500 }])).toHaveLength(0);
    expect(normalizeBaselines([{ effective_date: '2026-01-01', baseline_cal: null }])).toHaveLength(0);
    expect(normalizeBaselines(null)).toEqual([]);
    expect(normalizeBaselines(undefined)).toEqual([]);
  });
});

describe('baselineOn', () => {
  it('applies a baseline from its effective_date forward', () => {
    expect(baselineOn(baselines, '2026-07-28')?.baseline_cal).toBe(2450);
    expect(baselineOn(baselines, '2026-07-29')?.baseline_cal).toBe(2555);
    expect(baselineOn(baselines, '2026-08-15')?.baseline_cal).toBe(2555);
  });

  it('is inclusive of the effective_date itself', () => {
    expect(baselineOn(baselines, '2026-06-13')?.baseline_cal).toBe(2450);
    expect(baselineOn(baselines, '2026-06-12')).toBeNull();
  });

  it('returns null before any calibration exists', () => {
    expect(baselineOn(baselines, '2020-01-01')).toBeNull();
    expect(baselineOn([], '2026-07-29')).toBeNull();
  });
});

describe('latestBaseline', () => {
  it('returns the most recent row', () => {
    expect(latestBaseline(baselines)?.baseline_cal).toBe(2555);
  });
  it('returns null for an empty table', () => {
    expect(latestBaseline([])).toBeNull();
  });
});

describe('tdeeForRow', () => {
  it('prefers a stored tdee — past rows record what was believed then', () => {
    // 2026-07-27 stored 3436. Recomputing from today's baseline would give
    // 2555 + 986 = 3541, which would rewrite history.
    expect(tdeeForRow({ log_date: '2026-07-27', tdee: 3436, burn_cal: 986 }, baselines)).toBe(3436);
  });

  it('derives from baseline + burn when no tdee is stored', () => {
    expect(tdeeForRow({ log_date: '2026-07-29', tdee: null, burn_cal: 242 }, baselines)).toBe(2797);
  });

  it('uses the baseline in force on THAT date, not the newest one', () => {
    // 2026-07-01 predates the recalibration, so it must use 2450, not 2555.
    expect(tdeeForRow({ log_date: '2026-07-01', tdee: null, burn_cal: 100 }, baselines)).toBe(2550);
  });

  it('treats a zero or missing burn as zero', () => {
    expect(tdeeForRow({ log_date: '2026-07-29', tdee: null, burn_cal: 0 }, baselines)).toBe(2555);
    expect(tdeeForRow({ log_date: '2026-07-29', tdee: null, burn_cal: null }, baselines)).toBe(2555);
  });

  it('returns null when neither a stored tdee nor a baseline exists', () => {
    expect(tdeeForRow({ log_date: '2020-01-01', tdee: null, burn_cal: 0 }, baselines)).toBeNull();
    expect(tdeeForRow(null, baselines)).toBeNull();
  });
});

describe('meanTdee', () => {
  it('averages per-day figures, which keeps uneven training weeks correct', () => {
    // The 7 complete days: 3056, 2985, 2841, 3252, 2450, 3436, 2450 → 2924.28
    const complete = log.filter((r) => r.is_complete);
    expect(meanTdee(complete, baselines)).toBe(2924);
  });

  it('skips days it cannot resolve rather than counting them as zero', () => {
    const rows = [
      ...log.filter((r) => r.log_date === '2026-07-26'), // tdee 2450
      { ...log[0]!, log_date: '2019-01-01', tdee: null, burn_cal: null }, // unresolvable
    ];
    expect(meanTdee(rows, baselines)).toBe(2450);
  });

  it('returns null when nothing resolves', () => {
    expect(meanTdee([], baselines)).toBeNull();
  });
});

describe('the calibration arithmetic the server performed', () => {
  it('reproduces implied 2660 from the recorded window', () => {
    const c = baselines[1]!;
    // Energy balance: what you ate but did not burn became body mass.
    const totalBurn = c.mean_intake! - c.rate_lb_per_day! * KCAL_PER_LB;
    expect(Math.round(totalBurn)).toBe(3053);
    // Subtract the training burn already accounted for to isolate the baseline.
    expect(Math.round(totalBurn - c.mean_burn!)).toBe(c.implied_baseline);
  });

  it('reproduces the damped adopted value of 2555', () => {
    const c = baselines[1]!;
    const adopted = c.prior_baseline! + c.damping_k! * (c.implied_baseline! - c.prior_baseline!);
    expect(Math.round(adopted)).toBe(c.baseline_cal);
  });
});
