import type { ReactNode } from 'react';
import { Bar, Line, Scatter } from 'react-chartjs-2';
import '../lib/chartSetup';
import {
  contextRows, fmtDate, type RangeSelection, viewLabel,
} from '../lib/ranges';
import {
  baselineCaption, buildHeatmap, deficitWeightCaption, deficitWeightPoints,
  HEATMAP_COLORS, sleepScoreInsight, weightCoverageNote,
} from '../lib/trends';
import type { DailyLog, TdeeBaseline } from '../lib/types';

interface Props {
  log: DailyLog[];
  baselines: TdeeBaseline[];
  selection: RangeSelection;
}

const WINDOW_CAPTIONS: Record<RangeSelection['range'], string> = {
  today: 'Trailing 7 days',
  custom: 'Trailing 7 days ending on this date',
  last7: 'Last 7 days',
  '30day': 'Last 30 days',
  ytd: 'Year to date',
  all: 'All time',
};

const hiddenAxes = { x: { display: false }, y: { display: false } };

function ChartPanel(
  { label, note, children }: { label: string; note?: string | undefined; children: ReactNode },
) {
  return (
    <div className="glass-card p-4 mb-4">
      <div className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-2">{label}</div>
      <div className="h-32">{children}</div>
      {note && <div className="text-[10px] opacity-40 mt-2">{note}</div>}
    </div>
  );
}

export function TrendsCard({ log, baselines, selection }: Props) {
  const rows = contextRows(log, selection);
  const labels = rows.map((r) => fmtDate(r.log_date));

  const deficitWeight = deficitWeightPoints(log, rows);
  const heatmap = buildHeatmap(log);

  return (
    <section className="glass-card p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="card-eyebrow">Trend Charts</h2>
        <span className="text-[10px] font-bold uppercase tracking-widest text-neon-blue">
          {viewLabel(log, selection)}
        </span>
      </div>
      <p className="text-[11px] opacity-40 mb-6">{WINDOW_CAPTIONS[selection.range]}</p>

      <ChartPanel label="Weight" note={weightCoverageNote(rows) || undefined}>
        <Line
          data={{
            labels,
            datasets: [{
              data: rows.map((r) => r.weight_lb),
              borderColor: '#00d2ff', backgroundColor: 'rgba(0,210,255,0.08)',
              fill: true, tension: 0.35, pointRadius: 0, borderWidth: 2, spanGaps: true,
            }],
          }}
          options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: hiddenAxes }}
        />
      </ChartPanel>

      <ChartPanel label="Calories vs TDEE">
        <Line
          data={{
            labels,
            datasets: [
              {
                data: rows.map((r) => r.calories ?? 0), borderColor: '#00d2ff', backgroundColor: 'transparent',
                tension: 0.3, pointRadius: 0, borderWidth: 2,
              },
              {
                data: rows.map((r) => r.tdee ?? 0), borderColor: 'rgba(255,255,255,0.4)', backgroundColor: 'transparent',
                tension: 0.3, pointRadius: 0, borderWidth: 2, borderDash: [4, 3],
              },
            ],
          }}
          options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: hiddenAxes }}
        />
      </ChartPanel>

      <ChartPanel label="Surplus / (Deficit)">
        <Bar
          data={{
            labels,
            datasets: [{
              data: rows.map((r) => Math.round(r.surplus_deficit ?? 0)),
              backgroundColor: rows.map((r) => ((r.surplus_deficit ?? 0) < 0 ? '#30d158' : '#ff9f0a')),
              borderRadius: 4,
            }],
          }}
          options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: hiddenAxes }}
        />
      </ChartPanel>

      <ChartPanel label="Deficit vs Weight" note={deficitWeightCaption(deficitWeight)}>
        <Scatter
          data={{
            datasets: [{
              data: deficitWeight,
              backgroundColor: deficitWeight.map((p) => (p.x < 0 ? '#30d158' : '#ff9f0a')),
              pointRadius: 3,
            }],
          }}
          options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: hiddenAxes }}
        />
      </ChartPanel>

      <ChartPanel label="Baseline Calibration" note={baselineCaption(baselines)}>
        <Line
          data={{
            labels: baselines.map((b) => fmtDate(b.effective_date)),
            datasets: [
              {
                label: 'Adopted', data: baselines.map((b) => b.baseline_cal),
                borderColor: '#0a84ff', backgroundColor: 'rgba(10,132,255,0.12)',
                borderWidth: 2, pointRadius: 3, tension: 0, fill: true, spanGaps: false,
              },
              {
                label: 'Implied (undamped)', data: baselines.map((b) => b.implied_baseline),
                borderColor: '#bf5af2', borderDash: [5, 4],
                borderWidth: 2, pointRadius: 3, tension: 0, fill: false, spanGaps: false,
              },
            ],
          }}
          options={{
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: true, labels: { color: 'rgba(255,255,255,0.6)', boxWidth: 10, font: { size: 9 } } } },
            scales: {
              x: { ticks: { color: 'rgba(255,255,255,0.45)', font: { size: 9 } }, grid: { display: false } },
              y: { ticks: { color: 'rgba(255,255,255,0.45)', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
            },
          }}
        />
      </ChartPanel>

      <div className="flex items-center justify-between mb-2">
        <h3 className="card-eyebrow">Consistency</h3>
        <span className="text-[9px] font-bold uppercase tracking-wider opacity-65 border border-white/[0.06] rounded-full px-2 py-[3px]">
          Last ~12 weeks
        </span>
      </div>
      <div className="mb-4 overflow-x-auto pb-1">
        <div className="flex gap-[2px] mb-[3px]">
          {heatmap.map((col, i) => (
            <span key={i} className="w-[10px] shrink-0 text-[9px] opacity-40 whitespace-nowrap overflow-visible">
              {col.monthLabel}
            </span>
          ))}
        </div>
        <div className="flex gap-[2px]">
          {heatmap.map((col, i) => (
            <div key={i} className="flex flex-col gap-[2px]">
              {col.cells.map((cell, j) => (
                <i
                  key={j}
                  className="block w-[10px] h-[10px] rounded-[2px]"
                  style={{ background: HEATMAP_COLORS[cell.level] }}
                  title={cell.label || undefined}
                  role={cell.label ? 'img' : undefined}
                  aria-label={cell.label || undefined}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1 text-[10px] opacity-50 mb-[6px] flex-wrap">
        <span>Less</span>
        {(['none', 'hm-1', 'hm-2', 'hm-3', 'hm-4'] as const).map((level) => (
          <i key={level} className="inline-block w-[10px] h-[10px] rounded-[2px]" style={{ background: HEATMAP_COLORS[level] }} />
        ))}
        <span>More deficit</span>
        <i className="inline-block w-[10px] h-[10px] rounded-[2px] ml-2" style={{ background: HEATMAP_COLORS['hm-surplus'] }} />
        <span>Surplus</span>
      </div>

      <div className="p-4 rounded-xl" style={{ background: 'rgba(10,132,255,0.08)', border: '1px solid rgba(10,132,255,0.18)' }}>
        <div className="text-[10px] font-bold uppercase tracking-widest text-neon-blue mb-1">Insight</div>
        <div className="text-sm opacity-80">{sleepScoreInsight(rows)}</div>
      </div>
    </section>
  );
}
