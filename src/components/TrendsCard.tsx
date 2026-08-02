import type { ReactNode } from 'react';
import { useState } from 'react';
import { motion } from 'motion/react';
import { Bar, Line } from 'react-chartjs-2';
import { verticalGradient } from '../lib/chartGradient';
import { fullLegendLabels, fullScales } from '../lib/chartOptions';
import '../lib/chartSetup';
import { staggerContainer, staggerItem } from '../lib/motionVariants';
import {
  contextRows, fmtDate, type RangeSelection, viewLabel,
} from '../lib/ranges';
import {
  baselineCaption, baselineWorkingFor, deficitWeightPoints, scatterPoints, strongestInsight, weightCoverageNote,
} from '../lib/trends';
import type { DailyLog, TdeeBaseline } from '../lib/types';
import { useCloseOnInactive } from '../hooks/useCloseOnInactive';
import { ExpandChartWrap, ExpandModal } from './ExpandModal';
import { ExplainChip } from './ExplainChip';

interface Props {
  log: DailyLog[];
  baselines: TdeeBaseline[];
  selection: RangeSelection;
  isActive: boolean;
}

type ExpandKey = 'weight' | 'calTdee' | 'deficit';

const WINDOW_CAPTIONS: Record<RangeSelection['range'], string> = {
  today: 'Trailing 7 days',
  custom: 'Trailing 7 days ending on this date',
  last7: 'Last 7 days',
  '30day': 'Last 30 days',
  ytd: 'Year to date',
  all: 'All time',
};

const hiddenAxes = { x: { display: false }, y: { display: false } };

const EXPAND_TITLES: Record<ExpandKey, string> = {
  weight: 'Weight',
  calTdee: 'Calories vs TDEE',
  deficit: 'Surplus / (Deficit)',
};

function ChartPanel(
  { label, note, onExpand, tapLabel = 'tap to zoom', children }: {
    label: string; note?: string | undefined; onExpand?: () => void; tapLabel?: string; children: ReactNode;
  },
) {
  return (
    <motion.div
      variants={staggerItem}
      className={`glass-card p-4 mb-4 ${onExpand ? 'tile cursor-pointer' : ''}`}
      onClick={onExpand}
      role={onExpand ? 'button' : undefined}
      tabIndex={onExpand ? 0 : undefined}
      onKeyDown={onExpand ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onExpand(); } } : undefined}
    >
      <div className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-2">
        {label}
        {onExpand && <span className="opacity-40 normal-case"> · {tapLabel}</span>}
      </div>
      <div className="h-32">{children}</div>
      {note && <div className="text-[10px] opacity-40 mt-2">{note}</div>}
    </motion.div>
  );
}

const kcalFmt = (v: number | null) => (v == null ? '—' : `${v.toLocaleString()} kcal`);
const lbFmt = (v: number | null) => (v == null ? '—' : `${v.toFixed(2)} lb`);

function BaselineRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-white/[0.06]">
      <span className="text-[12px] opacity-55">{label}</span>
      <span className="text-[12px] font-semibold text-right">{value}</span>
    </div>
  );
}

function BaselineEntry({ b }: { b: TdeeBaseline }) {
  const working = baselineWorkingFor(b);
  const hasWindow = b.window_start != null && b.window_end != null;

  return (
    <div className="mb-[26px] last:mb-0">
      <div className="text-[10px] font-bold uppercase tracking-widest text-neon-blue mb-2">
        Effective {b.effective_date}
      </div>
      <BaselineRow label="Adopted baseline" value={kcalFmt(b.baseline_cal)} />
      <BaselineRow label="Previous baseline" value={kcalFmt(b.prior_baseline)} />
      <BaselineRow label="Implied (undamped)" value={kcalFmt(b.implied_baseline)} />
      <BaselineRow label="Damping factor" value={b.damping_k == null ? '—' : `k = ${b.damping_k}`} />
      <BaselineRow label="Window" value={hasWindow ? `${b.window_start} → ${b.window_end}` : '—'} />
      <BaselineRow label="Window length" value={b.window_days == null ? '—' : `${b.window_days} days`} />
      <BaselineRow label="Weight, early" value={lbFmt(b.early_avg_lb)} />
      <BaselineRow label="Weight, late" value={lbFmt(b.late_avg_lb)} />
      <BaselineRow
        label="Trend"
        value={b.rate_lb_per_day == null ? '—' : `${b.rate_lb_per_day.toFixed(4)} lb/day (${(b.rate_lb_per_day * 7).toFixed(2)} lb/week)`}
      />
      <BaselineRow label="Mean intake" value={kcalFmt(b.mean_intake)} />
      <BaselineRow label="Mean training burn" value={kcalFmt(b.mean_burn)} />

      {working && (
        <div className="font-mono text-xs leading-relaxed rounded-[10px] px-3.5 py-3 mt-2.5 overflow-x-auto whitespace-pre" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {`mean intake            ${working.meanIntake.toLocaleString()} kcal\n`}
          {`weight trend           ${working.rateLbPerDay.toFixed(4)} lb/day\n`}
          {`energy from tissue     ${Math.round(working.energyFromTissue).toLocaleString()} kcal   (${working.rateLbPerDay.toFixed(4)} x 3500)\n`}
          {'-----------------------------------------\n'}
          {`total daily burn       ${Math.round(working.totalDailyBurn).toLocaleString()} kcal\n`}
          {`less training burn    -${working.meanBurn.toLocaleString()} kcal\n`}
          {'-----------------------------------------\n'}
          {`implied baseline       ${Math.round(working.impliedBaseline).toLocaleString()} kcal\n\n`}
          {`damping k=${working.dampingK ?? '—'}\n`}
          {`adopted  ${working.priorBaseline != null ? working.priorBaseline.toLocaleString() : '—'} + ${working.dampingK ?? '—'} x (${Math.round(working.impliedBaseline).toLocaleString()} - ${working.priorBaseline != null ? working.priorBaseline.toLocaleString() : '—'}) = ${working.adoptedBaseline.toLocaleString()} kcal`}
        </div>
      )}

      {b.note
        ? <div className="text-[11px] opacity-60 mt-3 leading-[1.55]">{b.note}</div>
        : <div className="text-[11px] opacity-40 mt-3">No calibration window — this is the original seeded value.</div>}
    </div>
  );
}

export function TrendsCard({ log, baselines, selection, isActive }: Props) {
  const [expanded, setExpanded] = useState<ExpandKey | null>(null);
  const [baselineOpen, setBaselineOpen] = useState(false);
  useCloseOnInactive(isActive, () => setExpanded(null));
  useCloseOnInactive(isActive, () => setBaselineOpen(false));
  const rows = contextRows(log, selection);
  const labels = rows.map((r) => fmtDate(r.log_date));

  const deficitWeight = deficitWeightPoints(log, rows);
  const insight = strongestInsight([
    { label: 'Sleep × Score', points: scatterPoints(rows, 'sleep_hours', 'score') },
    { label: 'Sleep × HRV', points: scatterPoints(rows, 'sleep_hours', 'hrv') },
    { label: 'HRV × RHR', points: scatterPoints(rows, 'hrv', 'rhr') },
    { label: 'Deficit × Weight', points: deficitWeight },
  ]);
  const baselinesNewestFirst = [...baselines].reverse();

  return (
    <section className="glass-card p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="card-eyebrow">
          Trend Charts
          <ExplainChip term="correlation" />
        </h2>
        <span className="text-[10px] font-bold uppercase tracking-widest text-neon-blue">
          {viewLabel(log, selection)}
        </span>
      </div>
      <p className="text-[11px] opacity-40 mb-6">{WINDOW_CAPTIONS[selection.range]}</p>

      <motion.div variants={staggerContainer} initial="hidden" animate="show">
        <ChartPanel label="Weight" note={weightCoverageNote(rows) || undefined} onExpand={() => setExpanded('weight')}>
          <Line
            data={{
              labels,
              datasets: [{
                data: rows.map((r) => r.weight_lb),
                borderColor: '#41b2b2', backgroundColor: verticalGradient('rgba(65,178,178,0.35)', 'rgba(65,178,178,0.08)'),
                fill: true, tension: 0.35, pointRadius: 0, borderWidth: 2, spanGaps: true,
              }],
            }}
            options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: hiddenAxes }}
          />
        </ChartPanel>

        <ChartPanel label="Calories vs TDEE" onExpand={() => setExpanded('calTdee')}>
          <Line
            data={{
              labels,
              datasets: [
                {
                  data: rows.map((r) => r.calories ?? 0), borderColor: '#41b2b2', backgroundColor: 'transparent',
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

        <ChartPanel label="Surplus / (Deficit)" onExpand={() => setExpanded('deficit')}>
          <Bar
            data={{
              labels,
              datasets: [{
                data: rows.map((r) => Math.round(r.surplus_deficit ?? 0)),
                backgroundColor: rows.map((r) => ((r.surplus_deficit ?? 0) < 0 ? '#33d977' : '#f98f3a')),
                borderRadius: 4,
              }],
            }}
            options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: hiddenAxes }}
          />
        </ChartPanel>

        <ChartPanel
          label="Baseline Calibration" note={baselineCaption(baselines)} tapLabel="tap for the working"
          onExpand={() => setBaselineOpen(true)}
        >
          <Line
            data={{
              labels: baselines.map((b) => fmtDate(b.effective_date)),
              datasets: [
                {
                  label: 'Adopted', data: baselines.map((b) => b.baseline_cal),
                  borderColor: '#00afe7', backgroundColor: verticalGradient('rgba(0,175,231,0.4)', 'rgba(0,175,231,0.12)'),
                  borderWidth: 2, pointRadius: 3, tension: 0, fill: true, spanGaps: false,
                },
                {
                  label: 'Implied (undamped)', data: baselines.map((b) => b.implied_baseline),
                  borderColor: '#b28fef', borderDash: [5, 4],
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
      </motion.div>

      <div className="p-4 rounded-xl bg-neon-blue/10 border border-neon-blue/20">
        <div className="text-[10px] font-bold uppercase tracking-widest text-neon-blue mb-1">Insight</div>
        <div className="text-sm opacity-80">{insight}</div>
      </div>

      {expanded && (
        <ExpandModal title={EXPAND_TITLES[expanded]} onClose={() => setExpanded(null)}>
          <ExpandChartWrap>
            {expanded === 'weight' && (
              <Line
                data={{
                  labels,
                  datasets: [{
                    data: rows.map((r) => r.weight_lb), borderColor: '#41b2b2',
                    backgroundColor: verticalGradient('rgba(65,178,178,0.35)', 'rgba(65,178,178,0.08)'),
                    fill: true, tension: 0.35, pointRadius: 3, borderWidth: 2, spanGaps: true,
                  }],
                }}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: fullScales() }}
              />
            )}
            {expanded === 'calTdee' && (
              <Line
                data={{
                  labels,
                  datasets: [
                    { label: 'Calories', data: rows.map((r) => r.calories ?? 0), borderColor: '#41b2b2', backgroundColor: 'transparent', tension: 0.3, pointRadius: 3, borderWidth: 2 },
                    { label: 'TDEE', data: rows.map((r) => r.tdee ?? 0), borderColor: 'rgba(255,255,255,0.4)', backgroundColor: 'transparent', tension: 0.3, pointRadius: 0, borderWidth: 2, borderDash: [4, 3] },
                  ],
                }}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, labels: fullLegendLabels } }, scales: fullScales() }}
              />
            )}
            {expanded === 'deficit' && (
              <Bar
                data={{
                  labels,
                  datasets: [{
                    data: rows.map((r) => Math.round(r.surplus_deficit ?? 0)),
                    backgroundColor: rows.map((r) => ((r.surplus_deficit ?? 0) < 0 ? '#33d977' : '#f98f3a')),
                    borderRadius: 4,
                  }],
                }}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: fullScales() }}
              />
            )}
          </ExpandChartWrap>
        </ExpandModal>
      )}

      {baselineOpen && (
        <ExpandModal title="Baseline Calibration" onClose={() => setBaselineOpen(false)}>
          {baselinesNewestFirst.length ? (
            <>
              <div className="text-[12px] opacity-70 mb-4">
                Newest first. Each entry shows the window it was measured over and the arithmetic that produced it.
              </div>
              {baselinesNewestFirst.map((b) => <BaselineEntry key={b.effective_date} b={b} />)}
            </>
          ) : (
            <div className="text-sm opacity-70">No baseline has been recorded yet.</div>
          )}
        </ExpandModal>
      )}
    </section>
  );
}
