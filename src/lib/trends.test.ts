import { describe, expect, it } from 'vitest';
import { normalizeBaselines } from './baseline';
import { BASELINES_RAW } from './fixtures';
import {
  baselineCaption, buildHeatmap, deficitWeightCaption, deficitWeightPoints, pearson,
  rollingAvgDeficitAt, sleepScoreInsight, weightCoverageNote,
} from './trends';
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

describe('sleepScoreInsight', () => {
  it('reports a real relationship when duration and score co-vary', () => {
    const rows = [
      day('2026-07-25', { sleep_hours: 5, score: 60 }),
      day('2026-07-26', { sleep_hours: 6, score: 70 }),
      day('2026-07-27', { sleep_hours: 8, score: 90 }),
    ];
    expect(sleepScoreInsight(rows)).toMatch(/duration is genuinely moving your score/);
  });

  it('says other factors may matter more when correlation is weak', () => {
    const rows = [
      day('2026-07-25', { sleep_hours: 7, score: 80 }),
      day('2026-07-26', { sleep_hours: 7, score: 60 }),
      day('2026-07-27', { sleep_hours: 7, score: 90 }),
    ];
    expect(sleepScoreInsight(rows)).toMatch(/other factors like timing/);
  });

  it('asks for more days below the 3-pair minimum', () => {
    const rows = [day('2026-07-29', { sleep_hours: 7, score: 80 })];
    expect(sleepScoreInsight(rows)).toBe('Not enough days in this range yet to compute a sleep/score correlation.');
  });

  it('excludes rows missing either value from the pair count', () => {
    const rows = [
      day('2026-07-25', { sleep_hours: 7, score: 80 }),
      day('2026-07-26', { sleep_hours: null, score: 70 }),
      day('2026-07-27', { sleep_hours: 8, score: null }),
    ];
    expect(sleepScoreInsight(rows)).toBe('Not enough days in this range yet to compute a sleep/score correlation.');
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

describe('deficitWeightPoints / deficitWeightCaption', () => {
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

  it('reports the caption thresholds: needs-more-data, sustained deficit, and no relationship', () => {
    expect(deficitWeightCaption([{ x: -300, y: 174 }, { x: -100, y: 175 }])).toBe(
      'Needs a week of overlapping deficit and weigh-in data to compute this.',
    );

    // r < 0: x (deficit) rising while y (weight) falls.
    const negativeCorrelation = [{ x: -400, y: 178 }, { x: -200, y: 174 }, { x: -50, y: 170 }];
    expect(deficitWeightCaption(negativeCorrelation)).toMatch(/sustained deficit is tracking with lower weight/);

    const surplusTracksUpWeight = [{ x: 400, y: 178 }, { x: 200, y: 176 }, { x: 50, y: 174 }];
    expect(deficitWeightCaption(surplusTracksUpWeight)).toMatch(/higher surplus is tracking with higher weight/);

    const flat = [{ x: -100, y: 174 }, { x: 100, y: 174 }, { x: -50, y: 174 }];
    expect(deficitWeightCaption(flat)).toMatch(/no clear relationship/);
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
