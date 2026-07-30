import { describe, expect, expectTypeOf, it } from 'vitest';
import { normalizeBaselines, normalizeLog } from '../lib/baseline';
import { BASELINES_RAW, LOG_RAW } from '../lib/fixtures';
import { fetchAllPages } from './fetch';
import type { DailyLogWire, TdeeBaselineWire } from './wire';

describe('wire types', () => {
  it('widens numeric columns to what PostgREST actually sends', () => {
    // These are the exact values production returns. If the wire types claimed
    // `number`, assigning these would be a type error — which is the whole point.
    const row: TdeeBaselineWire = {
      id: 2,
      effective_date: '2026-07-29',
      baseline_cal: 2555,
      burn_method: null,
      created_at: '2026-07-29T00:00:00Z',
      damping_k: '0.5',
      early_avg_lb: '178.63',
      late_avg_lb: '176.04',
      rate_lb_per_day: '-0.1616',
      implied_baseline: 2660,
      mean_burn: 393,
      mean_intake: 2487,
      note: null,
      prior_baseline: 2450,
      window_days: 23,
      window_end: '2026-07-28',
      window_start: '2026-07-06',
    };
    expect(row.damping_k).toBe('0.5');

    // …and integers stay integers, so the widening is targeted rather than blunt.
    expectTypeOf(row.baseline_cal).toEqualTypeOf<number>();
    expectTypeOf(row.window_days).toEqualTypeOf<number | null>();
    expectTypeOf(row.damping_k).toEqualTypeOf<string | number>();
    expectTypeOf(row.rate_lb_per_day).toEqualTypeOf<string | number | null>();
  });

  it('widens only the numeric columns on daily_log', () => {
    const row = {} as DailyLogWire;
    expectTypeOf(row.weight_lb).toEqualTypeOf<string | number | null>();
    expectTypeOf(row.sleep_hours).toEqualTypeOf<string | number>();
    // calories, tdee, burn_cal are integers in Postgres and arrive as numbers.
    expectTypeOf(row.calories).toEqualTypeOf<number>();
    expectTypeOf(row.tdee).toEqualTypeOf<number>();
    expectTypeOf(row.burn_cal).toEqualTypeOf<number | null>();
    expectTypeOf(row.is_complete).toEqualTypeOf<boolean>();
  });

  it('normalizers turn wire rows into real numbers', () => {
    const b = normalizeBaselines(BASELINES_RAW)[1]!;
    expect(typeof b.damping_k).toBe('number');
    expect(typeof b.rate_lb_per_day).toBe('number');

    const l = normalizeLog(LOG_RAW);
    expect(typeof l[l.length - 1]!.weight_lb).toBe('number');
    expect(l[l.length - 1]!.weight_lb).toBe(174);
  });

  it('demonstrates why this matters', () => {
    // The failure mode the widening prevents: string concatenation that
    // typechecks fine when the column is mistyped as a number.
    const wireValue = '174.0';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(((wireValue as any) + 1)).toBe('174.01');
    expect(Number(wireValue) + 1).toBe(175);
  });
});

describe('fetchAllPages', () => {
  it('stops on the first short page', async () => {
    const calls: Array<[number, number]> = [];
    const rows = await fetchAllPages(async (from, to) => {
      calls.push([from, to]);
      return from === 0 ? Array.from({ length: 3 }, (_, i) => i) : [];
    }, 3);
    // Page 1 was exactly full, so it must ask again rather than assume the end.
    expect(calls).toEqual([[0, 2], [3, 5]]);
    expect(rows).toEqual([0, 1, 2]);
  });

  it('requests contiguous, non-overlapping ranges', async () => {
    const calls: Array<[number, number]> = [];
    await fetchAllPages(async (from, to) => {
      calls.push([from, to]);
      return calls.length < 3 ? Array.from({ length: 1000 }, () => 0) : [];
    }, 1000);
    expect(calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });

  it('makes exactly one call when the first page is short', async () => {
    let n = 0;
    const rows = await fetchAllPages(async () => { n++; return [1, 2]; }, 1000);
    expect(n).toBe(1);
    expect(rows).toEqual([1, 2]);
  });

  it('handles an empty table', async () => {
    expect(await fetchAllPages(async () => [], 1000)).toEqual([]);
  });

  it('propagates errors rather than returning a partial result', async () => {
    await expect(
      fetchAllPages(async (from) => {
        if (from > 0) throw new Error('permission denied');
        return Array.from({ length: 2 }, () => 0);
      }, 2),
    ).rejects.toThrow('permission denied');
  });
});
