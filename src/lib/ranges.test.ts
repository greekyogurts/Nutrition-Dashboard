import { describe, expect, it } from 'vitest';
import { normalizeLog } from './baseline';
import { LOG_RAW } from './fixtures';
import { avgOf, contextRows, getRangeDates, isSingleDay, rowsForRange, viewLabel } from './ranges';

const log = normalizeLog(LOG_RAW);

describe('getRangeDates', () => {
  it("'today' is the latest logged day even if it is incomplete", () => {
    // 2026-07-29 is in progress. A day in progress is still the day you want.
    expect(getRangeDates(log, { range: 'today' })).toEqual(['2026-07-29']);
  });

  it('multi-day ranges exclude incomplete days', () => {
    // A half-logged day would drag every average down.
    const week = getRangeDates(log, { range: 'last7' });
    expect(week).not.toContain('2026-07-29');
    expect(week).toHaveLength(7);
    expect(week[0]).toBe('2026-07-22');
    expect(week[6]).toBe('2026-07-28');
  });

  it("'30day' takes the last 30 complete days, or all of them if fewer", () => {
    expect(getRangeDates(log, { range: '30day' })).toHaveLength(7);
  });

  it("'ytd' keeps only the latest year present", () => {
    const mixed = normalizeLog([
      { log_date: '2025-12-30', is_complete: true },
      { log_date: '2026-01-02', is_complete: true },
      { log_date: '2026-07-28', is_complete: true },
    ]);
    expect(getRangeDates(mixed, { range: 'ytd' })).toEqual(['2026-01-02', '2026-07-28']);
  });

  it("'custom' needs a date", () => {
    expect(getRangeDates(log, { range: 'custom', customDate: '2026-07-25' })).toEqual(['2026-07-25']);
    expect(getRangeDates(log, { range: 'custom' })).toEqual([]);
    expect(getRangeDates(log, { range: 'custom', customDate: null })).toEqual([]);
  });

  it('is safe on an empty log', () => {
    for (const range of ['today', 'last7', '30day', 'ytd', 'all'] as const) {
      expect(getRangeDates([], { range })).toEqual([]);
    }
  });
});

describe('rowsForRange', () => {
  it("'today' returns just the latest row", () => {
    const rows = rowsForRange(log, { range: 'today' });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.log_date).toBe('2026-07-29');
    expect(rows[0]!.is_complete).toBe(false);
  });

  it("'all' returns every complete row", () => {
    const rows = rowsForRange(log, { range: 'all' });
    expect(rows).toHaveLength(7);
    expect(rows.every((r) => r.is_complete)).toBe(true);
  });

  it("'custom' matches an exact date, complete or not", () => {
    expect(rowsForRange(log, { range: 'custom', customDate: '2026-07-29' })).toHaveLength(1);
    expect(rowsForRange(log, { range: 'custom', customDate: '1999-01-01' })).toHaveLength(0);
  });
});

describe('contextRows', () => {
  it('gives a single day the trailing week — one point is not a trend', () => {
    const rows = contextRows(log, { range: 'today' });
    expect(rows).toHaveLength(7);
    expect(rows.every((r) => r.is_complete)).toBe(true);
  });

  it('for a custom date, uses the week leading up to it', () => {
    const rows = contextRows(log, { range: 'custom', customDate: '2026-07-24' });
    expect(rows.map((r) => r.log_date)).toEqual(['2026-07-22', '2026-07-23', '2026-07-24']);
  });

  it('for a multi-day range, is just the range', () => {
    expect(contextRows(log, { range: 'all' })).toEqual(rowsForRange(log, { range: 'all' }));
  });
});

describe('avgOf', () => {
  it('averages a field across rows', () => {
    const rows = rowsForRange(log, { range: 'all' });
    // calories: 3008+2488+2488+2800+2370+3715+2650 = 19519 / 7
    expect(avgOf(rows, 'calories')).toBeCloseTo(19519 / 7, 6);
  });

  it('excludes missing values rather than counting them as zero', () => {
    // DELIBERATE divergence from the vanilla avgOf, which does
    // `Number(r[key] || 0)` and keeps the row in the divisor. Averaging weight
    // over days with no weigh-in should not pull the mean toward zero.
    const sparse = normalizeLog([
      { log_date: '2026-01-01', weight_lb: '180' },
      { log_date: '2026-01-02' },
      { log_date: '2026-01-03', weight_lb: '182' },
    ]);
    expect(avgOf(sparse, 'weight_lb')).toBe(181);
    // The old behaviour would have produced (180 + 0 + 182) / 3 = 120.67.
  });

  it('returns 0 for no rows or no values', () => {
    expect(avgOf([], 'calories')).toBe(0);
    expect(avgOf(normalizeLog([{ log_date: '2026-01-01' }]), 'weight_lb')).toBe(0);
  });
});

describe('viewLabel', () => {
  it('labels a range with its span', () => {
    expect(viewLabel(log, { range: 'last7' })).toBe('7-Day Avg (Jul 22–Jul 28)');
  });
  it('labels today plainly', () => {
    expect(viewLabel(log, { range: 'today' })).toBe('Today');
  });
  it('labels a custom date with the date itself', () => {
    expect(viewLabel(log, { range: 'custom', customDate: '2026-07-25' })).toBe('Jul 25');
  });
  it('falls back to the bare label with no data', () => {
    expect(viewLabel([], { range: 'last7' })).toBe('7-Day Avg');
  });
});

describe('isSingleDay', () => {
  it('is true only for today and custom', () => {
    expect(isSingleDay('today')).toBe(true);
    expect(isSingleDay('custom')).toBe(true);
    expect(isSingleDay('last7')).toBe(false);
    expect(isSingleDay('all')).toBe(false);
  });
});
