import type { DailyLog } from './types';

export type RangeKey = 'today' | 'custom' | 'last7' | '30day' | 'ytd' | 'all';

export interface RangeSelection {
  range: RangeKey;
  /** Only meaningful when range is 'custom'. */
  customDate?: string | null;
}

export const RANGE_LABELS: Record<Exclude<RangeKey, 'custom'>, string> = {
  today: 'Today',
  last7: '7-Day Avg',
  '30day': '30-Day Avg',
  ytd: 'Year to Date',
  all: 'All Time',
};

/** A single day shows one figure; a multi-day range shows an average. */
export function isSingleDay(range: RangeKey): boolean {
  return range === 'today' || range === 'custom';
}

function completeDatesAsc(log: readonly DailyLog[]): string[] {
  return log.filter((r) => r.is_complete).map((r) => r.log_date).sort();
}

/**
 * Dates covered by a range.
 *
 * 'today' means the latest logged day, complete or not — a day in progress is
 * still the day you want to see. Every multi-day range excludes incomplete days,
 * since a half-logged day would drag every average down.
 */
export function getRangeDates(log: readonly DailyLog[], sel: RangeSelection): string[] {
  const { range, customDate } = sel;
  if (range === 'today') {
    const last = log[log.length - 1];
    return last ? [last.log_date] : [];
  }
  if (range === 'custom') return customDate ? [customDate] : [];

  const dates = completeDatesAsc(log);
  if (range === 'last7') return dates.slice(-7);
  if (range === '30day') return dates.slice(-30);
  if (range === 'ytd') {
    const year = dates[dates.length - 1]?.slice(0, 4);
    return year ? dates.filter((d) => d.slice(0, 4) === year) : [];
  }
  return dates;
}

/** Rows covered by a range. */
export function rowsForRange(log: readonly DailyLog[], sel: RangeSelection): DailyLog[] {
  const { range, customDate } = sel;
  if (range === 'today') {
    const last = log[log.length - 1];
    return last ? [last] : [];
  }
  if (range === 'custom') {
    return customDate ? log.filter((r) => r.log_date === customDate) : [];
  }
  const dates = new Set(getRangeDates(log, sel));
  return log.filter((r) => dates.has(r.log_date) && r.is_complete);
}

/**
 * Trailing 7-day context for charts when a single day is selected — one point
 * isn't a trend, so show the week leading up to it.
 */
export function contextRows(log: readonly DailyLog[], sel: RangeSelection): DailyLog[] {
  const complete = log.filter((r) => r.is_complete);
  if (sel.range === 'today') return complete.slice(-7);
  if (sel.range === 'custom' && sel.customDate) {
    const cutoff = sel.customDate;
    return complete.filter((r) => r.log_date <= cutoff).slice(-7);
  }
  return rowsForRange(log, sel);
}

/** Mean of a numeric field across rows, treating null as absent (not zero). */
export function avgOf(rows: readonly DailyLog[], key: keyof DailyLog): number {
  const vals = rows
    .map((r) => r[key])
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/** "Jul 29" — the short date format used throughout the UI. */
export function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function viewLabel(log: readonly DailyLog[], sel: RangeSelection): string {
  // 'custom' with no date selected is a real state — the date picker is open but
  // empty — so it needs its own branch rather than falling through to the
  // label table, which has no entry for it.
  if (sel.range === 'custom') return sel.customDate ? fmtDate(sel.customDate) : 'Today';
  if (sel.range === 'today') return 'Today';
  const base = RANGE_LABELS[sel.range];
  const dates = getRangeDates(log, sel);
  if (!dates.length) return base;
  const start = fmtDate(dates[0]!);
  const end = fmtDate(dates[dates.length - 1]!);
  return dates.length > 1 ? `${base} (${start}–${end})` : `${base} (${start})`;
}
