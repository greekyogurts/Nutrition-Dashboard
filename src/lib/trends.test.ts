import { describe, expect, it } from 'vitest';
import { normalizeBaselines } from './baseline';
import { BASELINES_RAW } from './fixtures';
import {
  baselineCaption, baselineWorkingFor, buildHeatmap, correlationCaption,
  deficitWeightPoints, pearson, rollingAvgDeficitAt, scatterPoints, strongestInsight, weightCoverageNote,
} from './trends';
import type { TdeeBaseline } from './types';
import type { DailyLog } from './types';

const day = (log_date: string, over: Partial<DailyLog> = {}): DailyLog => ({
  log_date, is_complete: true, calories: 2400, tdee: 2600, surplus_deficit: -200, burn_cal: 400,
  weight_lb: 174, protein_g: 150, carbs_g: 220, fat_g: 70, fiber_g: 30,
  sleep_hours: 7.5, score: 80, hrv: 55, rhr: 50, ...over,
});

describe('pearson', () => {
  it('is 1 for a perfect positive line and -1 for a perfect negative one', () => {
    expect(pearson([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1);
    expect(pearson([1, 2, 3, 4], [8, 6, 4, 2])).toBeCloseTo(-1);
  });

  it('is 0 with no variance or too few points', () => {
    expect(pearson([5, 5, 5], [1, 2, 3])).toBe(0);
    expect(pearson([1], [1])).toBe(0);
    expect(pearson([], [])).toBe(0);
  });
});

describe('strongestInsight', () => {
  it('picks the candidate with the largest |r|, not the first one', () => {
    const weak = [{ x: 1, y: 5 }, { x: 2, y: 5.2 }, { x: 3, y: 4.9 }];
    const strong = [{ x: 1, y: 2 }, { x: 2, y: 4 }, { x: 3, y: 6 }];
    const result = strongestInsight([
      { label: 'Weak Pair', points: weak },
      { label: 'Strong Pair', points: strong },
    ]);
    expect(result).toMatch(/^Strong Pair: r = 1\.00 across 3 days/);
  });

  it('prefers a strong negative correlation over a weaker positive one', () => {
    const positive = [{ x: 1, y: 5 }, { x: 2, y: 5.1 }, { x: 3, y: 5.3 }];
    const negative = [{ x: 1, y: 9 }, { x: 2, y: 6 }, { x: 3, y: 3 }];
    const result = strongestInsight([
      { label: 'Positive', points: positive },
      { label: 'Negative', points: negative },
    ]);
    expect(result).toMatch(/^Negative: r = -1\.00/);
  });

  it('drops candidates below the 3-point minimum before comparing', () => {
    const tooFew = [{ x: 1, y: 2 }, { x: 2, y: 4 }];
    const enough = [{ x: 1, y: 5 }, { x: 2, y: 5 }, { x: 3, y: 5 }];
    const result = strongestInsight([
      { label: 'Too Few', points: tooFew },
      { label: 'Enough', points: enough },
    ]);
    expect(result).toMatch(/^Enough:/);
  });

  it('asks for more data when no candidate qualifies', () => {
    expect(strongestInsight([{ label: 'A', points: [{ x: 1, y: 1 }] }])).toBe(
      'Not enough overlapping data yet to surface a correlation — check back once a few more days are logged.',
    );
    expect(strongestInsight([])).toBe(
      'Not enough overlapping data yet to surface a correlation — check back once a few more days are logged.',
    );
  });
});

describe('weightCoverageNote', () => {
  it('is empty when every day has a weigh-in', () => {
    expect(weightCoverageNote([day('2026-07-29'), day('2026-07-30')])).toBe('');
  });

  it('is empty with no rows', () => {
    expect(weightCoverageNote([])).toBe('');
  });

  it('names the sparse-logging count otherwise', () => {
    const rows = [day('2026-07-29'), day('2026-07-30', { weight_lb: null }), day('2026-07-31', { weight_lb: null })];
    expect(weightCoverageNote(rows)).toBe('1 of 3 days have a weigh-in — sparse logging can make this look noisier than it is.');
  });
});

describe('rollingAvgDeficitAt', () => {
  const log = [
    day('2026-07-25', { surplus_deficit: -100 }),
    day('2026-07-26', { surplus_deficit: -300 }),
    day('2026-07-27', { surplus_deficit: -200 }),
  ];

  it('averages the trailing window ending on the given date', () => {
    expect(rollingAvgDeficitAt(log, '2026-07-27', 2)).toBe(-250); // (-300 + -200) / 2
    expect(rollingAvgDeficitAt(log, '2026-07-27', 7)).toBeCloseTo(-200); // all 3 days, window shorter than 7
  });

  it('is null for a date not in the log', () => {
    expect(rollingAvgDeficitAt(log, '2026-08-01', 7)).toBeNull();
  });

  it('excludes incomplete days and days with no surplus_deficit from the window', () => {
    const withGaps = [
      day('2026-07-25', { surplus_deficit: -100, is_complete: false }),
      day('2026-07-26', { surplus_deficit: null }),
      day('2026-07-27', { surplus_deficit: -200 }),
    ];
    expect(rollingAvgDeficitAt(withGaps, '2026-07-27', 7)).toBe(-200);
  });

  it('is null when the whole window is incomplete or empty', () => {
    const allIncomplete = [day('2026-07-27', { is_complete: false })];
    expect(rollingAvgDeficitAt(allIncomplete, '2026-07-27', 7)).toBeNull();
  });
});

describe('deficitWeightPoints', () => {
  it('pairs each weigh-in with its trailing 7-day avg deficit', () => {
    const log = [
      day('2026-07-25', { weight_lb: 175, surplus_deficit: -300 }),
      day('2026-07-26', { weight_lb: null, surplus_deficit: -300 }),
      day('2026-07-27', { weight_lb: 174, surplus_deficit: -300 }),
    ];
    const points = deficitWeightPoints(log, log);
    expect(points).toHaveLength(2); // the null-weight day is skipped
    expect(points[0]).toEqual({ x: -300, y: 175 });
  });
});

describe('scatterPoints', () => {
  it('pairs the two named fields across rows', () => {
    const rows = [day('2026-07-28', { sleep_hours: 6, hrv: 48 }), day('2026-07-29', { sleep_hours: 8, hrv: 62 })];
    expect(scatterPoints(rows, 'sleep_hours', 'hrv')).toEqual([{ x: 6, y: 48 }, { x: 8, y: 62 }]);
  });

  it('excludes rows missing either field', () => {
    const rows = [day('2026-07-28', { hrv: null }), day('2026-07-29', { hrv: 55, rhr: 50 })];
    expect(scatterPoints(rows, 'hrv', 'rhr')).toEqual([{ x: 55, y: 50 }]);
  });
});

describe('correlationCaption', () => {
  it('asks for more days below the 3-point minimum', () => {
    expect(correlationCaption([{ x: 1, y: 1 }, { x: 2, y: 2 }])).toBe(
      'Not enough days in this range yet to compute a correlation.',
    );
  });

  it('grades the relationship strength at the 0.3 and 0.5 thresholds', () => {
    const strong = [{ x: 1, y: 2 }, { x: 2, y: 4 }, { x: 3, y: 6 }, { x: 4, y: 8 }];
    expect(correlationCaption(strong)).toMatch(/a real relationship/);

    const flat = [{ x: 1, y: 5 }, { x: 2, y: 5 }, { x: 3, y: 5 }];
    expect(correlationCaption(flat)).toMatch(/little relationship/);
  });
});

describe('baselineCaption', () => {
  it('describes the calibration count when at least one exists', () => {
    const baselines = normalizeBaselines(BASELINES_RAW);
    expect(baselineCaption(baselines)).toMatch(/^Now [\d,]+ kcal, effective \d{4}-\d{2}-\d{2} — \d+ calibrations? so far\.$/);
  });

  it('says not-yet-calibrated for a seed row with no implied baseline', () => {
    const seedOnly = normalizeBaselines([{ effective_date: '2026-01-01', baseline_cal: 2600 }]);
    expect(baselineCaption(seedOnly)).toMatch(/^Seeded at 2,600 kcal — not yet calibrated/);
  });

  it('has no calibration recorded with an empty list', () => {
    expect(baselineCaption([])).toBe('No calibration recorded yet.');
  });
});

describe('baselineWorkingFor', () => {
  const withWindow: TdeeBaseline = {
    effective_date: '2026-07-01', baseline_cal: 2525, prior_baseline: 2600, implied_baseline: 2450,
    damping_k: 0.5, window_start: '2026-06-15', window_end: '2026-06-30', window_days: 14,
    early_avg_lb: 176, late_avg_lb: 174.6, rate_lb_per_day: -0.1, mean_intake: 2400, mean_burn: 300, note: null,
  };

  it('reconstructs the implied-baseline arithmetic from mean intake, weight trend, and training burn', () => {
    const working = baselineWorkingFor(withWindow)!;
    expect(working.energyFromTissue).toBeCloseTo(350); // -(-0.1) * 3500
    expect(working.totalDailyBurn).toBeCloseTo(2750); // 2400 - (-0.1 * 3500)
    expect(working.impliedBaseline).toBeCloseTo(2450); // 2750 - 300
    expect(working.meanIntake).toBe(2400);
    expect(working.meanBurn).toBe(300);
    expect(working.dampingK).toBe(0.5);
    expect(working.priorBaseline).toBe(2600);
    expect(working.adoptedBaseline).toBe(2525);
  });

  it('is null for the seed row, which has no calibration window', () => {
    const seed: TdeeBaseline = {
      effective_date: '2026-01-01', baseline_cal: 2600, prior_baseline: null, implied_baseline: null,
      damping_k: null, window_start: null, window_end: null, window_days: null,
      early_avg_lb: null, late_avg_lb: null, rate_lb_per_day: null, mean_intake: null, mean_burn: null, note: 'seed',
    };
    expect(baselineWorkingFor(seed)).toBeNull();
  });

  it('is null when any single window field is missing', () => {
    expect(baselineWorkingFor({ ...withWindow, mean_burn: null })).toBeNull();
    expect(baselineWorkingFor({ ...withWindow, window_start: null })).toBeNull();
  });
});

describe('buildHeatmap', () => {
  it('is empty with no log', () => {
    expect(buildHeatmap([])).toEqual([]);
  });

  it('starts each grid on a Sunday and pads the final column with future cells', () => {
    // 2026-07-30 is a Thursday.
    const log = [day('2026-07-29', { surplus_deficit: -300 }), day('2026-07-30', { surplus_deficit: -300 })];
    const columns = buildHeatmap(log);
    const lastColumn = columns[columns.length - 1]!;
    // Thu is dow 4, so cells 5 and 6 (Fri, Sat) are future padding.
    expect(lastColumn.cells[5]!.level).toBe('hm-future');
    expect(lastColumn.cells[6]!.level).toBe('hm-future');
  });

  it('buckets deficit magnitude into the right level, and treats non-negative as surplus', () => {
    const log = [
      day('2026-07-27', { surplus_deficit: -100 }), // hm-1: < 250
      day('2026-07-28', { surplus_deficit: -500 }), // hm-2: < 600
      day('2026-07-29', { surplus_deficit: -800 }), // hm-3: < 1000
      day('2026-07-30', { surplus_deficit: -1200 }), // hm-4: >= 1000
      day('2026-07-31', { surplus_deficit: 150 }), // hm-surplus
    ];
    const cells = buildHeatmap(log).flatMap((c) => c.cells);
    const byLevel = (level: string) => cells.filter((c) => c.level === level).length;
    expect(byLevel('hm-1')).toBe(1);
    expect(byLevel('hm-2')).toBe(1);
    expect(byLevel('hm-3')).toBe(1);
    expect(byLevel('hm-4')).toBe(1);
    expect(byLevel('hm-surplus')).toBe(1);
  });

  it('marks days with no logged row as level "none"', () => {
    const log = [day('2026-07-25'), day('2026-07-31')]; // gap in between
    const cells = buildHeatmap(log).flatMap((c) => c.cells);
    expect(cells.some((c) => c.level === 'none')).toBe(true);
  });
});
