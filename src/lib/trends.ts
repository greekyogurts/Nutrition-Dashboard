import { latestBaseline } from './baseline';
import { fmtDate } from './ranges';
import type { DailyLog, TdeeBaseline } from './types';

/** Correlation coefficient, -1..1. 0 with fewer than 2 points or no variance. */
export function pearson(xs: readonly number[], ys: readonly number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx2 = 0;
  let dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i]! - mx;
    const dy = ys[i]! - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  return denom ? num / denom : 0;
}

export interface ScatterPoint {
  x: number;
  y: number;
}

/**
 * Points for a correlation scatter between two DailyLog numeric fields —
 * the expanded view of what's a trend bar/line in the compact card. Matches
 * the vanilla's truthy filter (`r.hrv && r.rhr`), which excludes a
 * legitimate zero along with null/undefined; moot in practice since neither
 * field is ever really zero for a logged day.
 */
export function scatterPoints(
  rows: readonly DailyLog[],
  xKey: 'sleep_hours' | 'hrv' | 'rhr' | 'score',
  yKey: 'sleep_hours' | 'hrv' | 'rhr' | 'score',
): ScatterPoint[] {
  return rows
    .filter((r) => r[xKey] && r[yKey])
    .map((r) => ({ x: r[xKey]!, y: r[yKey]! }));
}

/** Generic "r = X across N days" phrasing, shared by the Sleep-vs-HRV and HRV-vs-RHR scatters. */
export function correlationCaption(points: readonly ScatterPoint[]): string {
  if (points.length < 3) return 'Not enough days in this range yet to compute a correlation.';
  const r = pearson(points.map((p) => p.x), points.map((p) => p.y));
  const strength = Math.abs(r) >= 0.5 ? 'a real relationship' : Math.abs(r) >= 0.3 ? 'a mild relationship' : 'little relationship';
  return `r = ${r.toFixed(2)} across ${points.length} days — ${strength} in this window.`;
}

export interface InsightCandidate {
  label: string;
  points: readonly ScatterPoint[];
}

/**
 * Picks whichever candidate correlation actually has the strongest signal
 * this range, rather than a callout hardcoded to one fixed pairing whether
 * or not it's the most interesting thing happening right now. Candidates
 * with fewer than 3 points can't support a correlation and are dropped
 * before comparing.
 */
export function strongestInsight(candidates: readonly InsightCandidate[]): string {
  const scored = candidates
    .filter((c) => c.points.length >= 3)
    .map((c) => ({ ...c, r: pearson(c.points.map((p) => p.x), c.points.map((p) => p.y)) }));

  if (!scored.length) {
    return 'Not enough overlapping data yet to surface a correlation — check back once a few more days are logged.';
  }

  const best = scored.reduce((a, b) => (Math.abs(b.r) > Math.abs(a.r) ? b : a));
  const strength = Math.abs(best.r) >= 0.5 ? 'a real relationship' : Math.abs(best.r) >= 0.3 ? 'a mild relationship' : 'little relationship';
  return `${best.label}: r = ${best.r.toFixed(2)} across ${best.points.length} days — ${strength} in this window.`;
}

/** "3 of 7 days have a weigh-in…", or '' when coverage is complete or the range is empty. */
export function weightCoverageNote(rows: readonly DailyLog[]): string {
  const weighInDays = rows.filter((r) => r.weight_lb != null).length;
  if (!rows.length || weighInDays >= rows.length) return '';
  return `${weighInDays} of ${rows.length} days have a weigh-in — sparse logging can make this look noisier than it is.`;
}

/**
 * Trailing N-day average deficit ending on dateStr, computed from the full
 * log (not just the visible range) so a day near the start of a short range
 * still gets real lookback context.
 */
export function rollingAvgDeficitAt(
  log: readonly DailyLog[],
  dateStr: string,
  windowDays: number,
): number | null {
  const idx = log.findIndex((r) => r.log_date === dateStr);
  if (idx === -1) return null;
  const window = log
    .slice(Math.max(0, idx - windowDays + 1), idx + 1)
    .filter((r) => r.is_complete && r.surplus_deficit != null);
  if (!window.length) return null;
  return window.reduce((s, r) => s + r.surplus_deficit!, 0) / window.length;
}

export function deficitWeightPoints(
  log: readonly DailyLog[],
  rows: readonly DailyLog[],
): ScatterPoint[] {
  const points: ScatterPoint[] = [];
  for (const r of rows) {
    if (r.weight_lb == null) continue;
    const avgDef = rollingAvgDeficitAt(log, r.log_date, 7);
    if (avgDef == null) continue;
    points.push({ x: Math.round(avgDef), y: r.weight_lb });
  }
  return points;
}

export function baselineCaption(baselines: readonly TdeeBaseline[]): string {
  const b = latestBaseline(baselines);
  if (!b) return 'No calibration recorded yet.';
  const calibrated = baselines.filter((r) => r.implied_baseline != null).length;
  return calibrated
    ? `Now ${b.baseline_cal.toLocaleString()} kcal, effective ${b.effective_date} — ${calibrated} calibration${calibrated === 1 ? '' : 's'} so far.`
    : `Seeded at ${b.baseline_cal.toLocaleString()} kcal — not yet calibrated against real weight change.`;
}

export interface BaselineWorking {
  meanIntake: number;
  rateLbPerDay: number;
  /** -rateLbPerDay * 3500: energy the body released from (or stored as) tissue. */
  energyFromTissue: number;
  /** meanIntake - rateLbPerDay * 3500. */
  totalDailyBurn: number;
  meanBurn: number;
  /** totalDailyBurn - meanBurn — the raw, undamped calibration result. */
  impliedBaseline: number;
  dampingK: number | null;
  priorBaseline: number | null;
  adoptedBaseline: number;
}

/**
 * Reconstructs the arithmetic behind one calibration row, so the number is
 * checkable rather than asserted — the same reasoning as openBaselineExpand.
 * Null when the row lacks a full calibration window (the seed row, or one
 * written without one), in which case there's nothing to reconstruct.
 */
export function baselineWorkingFor(b: TdeeBaseline): BaselineWorking | null {
  const hasWindow = b.window_start != null && b.window_end != null
    && b.rate_lb_per_day != null && b.mean_intake != null && b.mean_burn != null;
  if (!hasWindow) return null;
  const energyFromTissue = -b.rate_lb_per_day! * 3500;
  const totalDailyBurn = b.mean_intake! - b.rate_lb_per_day! * 3500;
  const impliedBaseline = totalDailyBurn - b.mean_burn!;
  return {
    meanIntake: b.mean_intake!,
    rateLbPerDay: b.rate_lb_per_day!,
    energyFromTissue,
    totalDailyBurn,
    meanBurn: b.mean_burn!,
    impliedBaseline,
    dampingK: b.damping_k,
    priorBaseline: b.prior_baseline,
    adoptedBaseline: b.baseline_cal,
  };
}

// ---------------------------------------------------------------------------
// Consistency heatmap — a fixed ~12-week lookback, not range-dependent
// ---------------------------------------------------------------------------

export type HeatmapLevel = 'none' | 'hm-1' | 'hm-2' | 'hm-3' | 'hm-4' | 'hm-surplus' | 'hm-future';

/** Shared by the grid cells and the legend swatches, so they can't drift apart. */
export const HEATMAP_COLORS: Record<HeatmapLevel, string> = {
  none: 'rgba(255,255,255,0.06)',
  'hm-1': 'rgba(48,209,88,0.28)',
  'hm-2': 'rgba(48,209,88,0.52)',
  'hm-3': 'rgba(48,209,88,0.76)',
  'hm-4': '#30d158',
  'hm-surplus': '#ff9f0a',
  'hm-future': 'transparent',
};

function deficitLevel(row: DailyLog | undefined): HeatmapLevel {
  if (!row || row.surplus_deficit == null) return 'none';
  const sd = row.surplus_deficit;
  if (sd >= 0) return 'hm-surplus';
  const mag = Math.abs(sd);
  if (mag < 250) return 'hm-1';
  if (mag < 600) return 'hm-2';
  if (mag < 1000) return 'hm-3';
  return 'hm-4';
}

export interface HeatmapCell {
  level: HeatmapLevel;
  label: string;
}

export interface HeatmapColumn {
  cells: HeatmapCell[];
  /** Short month name on the column where the month changes; '' otherwise. */
  monthLabel: string;
}

/**
 * ~12 weeks of daily deficit/surplus, one column per week (Sun-Sat), bounded
 * to whichever is later: 83 days back, or the first day ever logged — so a
 * short history doesn't pad the grid with weeks that predate tracking.
 */
export function buildHeatmap(log: readonly DailyLog[]): HeatmapColumn[] {
  if (!log.length) return [];
  const byDate = new Map(log.map((r) => [r.log_date, r]));
  const endDate = new Date(`${log[log.length - 1]!.log_date}T00:00:00`);
  const earliestTracked = new Date(`${log[0]!.log_date}T00:00:00`);
  const lookback = new Date(endDate);
  lookback.setDate(lookback.getDate() - 83);
  const start = lookback > earliestTracked ? lookback : earliestTracked;
  start.setDate(start.getDate() - start.getDay());

  const toKey = (d: Date) => d.toISOString().slice(0, 10);
  const columns: HeatmapColumn[] = [];
  const cursor = new Date(start);
  let lastMonth: number | null = null;

  while (cursor <= endDate) {
    const cells: HeatmapCell[] = [];
    for (let dow = 0; dow < 7; dow++) {
      if (cursor > endDate) {
        cells.push({ level: 'hm-future', label: '' });
      } else {
        const key = toKey(cursor);
        const row = byDate.get(key);
        const level = deficitLevel(row);
        const label = row?.surplus_deficit != null
          ? `${fmtDate(key)}: ${row.surplus_deficit >= 0 ? '+' : ''}${Math.round(row.surplus_deficit)} cal`
          : `${fmtDate(key)}: no data`;
        cells.push({ level, label });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    const colMonth = cursor.getMonth();
    const monthLabel = colMonth !== lastMonth ? cursor.toLocaleDateString('en-US', { month: 'short' }) : '';
    lastMonth = colMonth;
    columns.push({ cells, monthLabel });
  }
  return columns;
}
