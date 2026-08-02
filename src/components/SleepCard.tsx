import { useState } from 'react';
import { motion } from 'motion/react';
import { Bar, Line, Scatter } from 'react-chartjs-2';
import { verticalGradient } from '../lib/chartGradient';
import '../lib/chartSetup';
import { sleepDurationLabel } from '../lib/format';
import { staggerContainer, staggerItem } from '../lib/motionVariants';
import {
  avgOf, contextRows, fmtDate, isSingleDay, rowsForRange, type RangeSelection, viewLabel,
} from '../lib/ranges';
import { correlationCaption, scatterPoints } from '../lib/trends';
import type { DailyLog } from '../lib/types';
import { useCloseOnInactive } from '../hooks/useCloseOnInactive';
import { ExpandChartWrap, ExpandModal } from './ExpandModal';
import { ExplainChip } from './ExplainChip';

interface Props {
  log: DailyLog[];
  selection: RangeSelection;
  isActive: boolean;
}

type ExpandKey = 'sleep' | 'recovery';

const compactBarOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { x: { display: false }, y: { display: false, suggestedMin: 5, suggestedMax: 10 } },
};

const compactLineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { x: { display: false }, y: { display: false }, y1: { display: false } },
};

const scatterAxisOptions = (xLabel: string, yLabel: string) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { title: { display: true, text: xLabel, color: 'rgba(255,255,255,0.5)' }, grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: 'rgba(255,255,255,0.5)' } },
    y: { title: { display: true, text: yLabel, color: 'rgba(255,255,255,0.5)' }, grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: 'rgba(255,255,255,0.5)' } },
  },
});

function VitalTile({ label, value }: { label: string; value: string }) {
  return (
    <motion.div variants={staggerItem} className="glass-card p-4 flex flex-col gap-[2px]">
      <div className="text-[10px] uppercase font-bold opacity-40">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </motion.div>
  );
}

export function SleepCard({ log, selection, isActive }: Props) {
  const [expanded, setExpanded] = useState<ExpandKey | null>(null);
  useCloseOnInactive(isActive, () => setExpanded(null));
  const rows = rowsForRange(log, selection);
  const avgWord = isSingleDay(selection.range) ? '' : 'Avg ';

  const avgSleep = avgOf(rows, 'sleep_hours');
  const avgHRV = Math.round(avgOf(rows, 'hrv'));
  const avgRHR = Math.round(avgOf(rows, 'rhr'));

  const chartRows = contextRows(log, selection);
  const labels = chartRows.map((r) => fmtDate(r.log_date));

  const sleepHrvPoints = scatterPoints(chartRows, 'sleep_hours', 'hrv');
  const hrvRhrPoints = scatterPoints(chartRows, 'hrv', 'rhr');

  return (
    <section className="glass-card p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="card-eyebrow">
          Sleep &amp; Recovery
          <ExplainChip term="recovery" />
        </h2>
        <span className="text-[10px] font-bold uppercase tracking-widest text-neon-blue">
          {viewLabel(log, selection)}
        </span>
      </div>
      <p className="text-[11px] opacity-40 mb-6">Duration, HRV &amp; RHR</p>

      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-3 gap-3 mb-6">
        <VitalTile label={`${avgWord}Sleep`} value={rows.length ? sleepDurationLabel(avgSleep) : '–'} />
        <VitalTile label={`${avgWord}HRV`} value={rows.length ? `${avgHRV}ms` : '–'} />
        <VitalTile label={`${avgWord}RHR`} value={rows.length ? `${avgRHR}bpm` : '–'} />
      </motion.div>

      <div
        className="glass-card p-4 mb-4 tile cursor-pointer"
        onClick={() => setExpanded('sleep')}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded('sleep'); } }}
      >
        <div className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-2">
          Sleep Duration <span className="opacity-40 normal-case">· tap for correlation</span>
        </div>
        <div className="h-28">
          <Bar
            data={{
              labels,
              datasets: [{
                data: chartRows.map((r) => r.sleep_hours ?? 0),
                backgroundColor: '#4b74d8',
                borderRadius: 4,
              }],
            }}
            options={compactBarOptions}
          />
        </div>
      </div>

      <div
        className="glass-card p-4 tile cursor-pointer"
        onClick={() => setExpanded('recovery')}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded('recovery'); } }}
      >
        <div className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-2">
          HRV vs RHR <span className="opacity-40 normal-case">· tap for correlation</span>
        </div>
        <div className="h-28">
          <Line
            data={{
              labels,
              datasets: [
                {
                  label: 'HRV (ms)', data: chartRows.map((r) => r.hrv ?? 0), borderColor: '#33d977',
                  backgroundColor: verticalGradient('rgba(51,217,119,0.32)', 'rgba(51,217,119,0.1)'),
                  fill: true, pointRadius: 0, borderWidth: 2,
                  tension: 0.3, yAxisID: 'y',
                },
                {
                  label: 'RHR (bpm)', data: chartRows.map((r) => r.rhr ?? 0), borderColor: '#f98f3a',
                  backgroundColor: 'rgba(249,143,58,0.05)', fill: false, pointRadius: 0, borderWidth: 2,
                  tension: 0.3, yAxisID: 'y1',
                },
              ],
            }}
            options={compactLineOptions}
          />
        </div>
      </div>

      {expanded === 'sleep' && (
        <ExpandModal title="Sleep vs Recovery" onClose={() => setExpanded(null)}>
          <div className="text-[12px] opacity-70 mb-3">{correlationCaption(sleepHrvPoints)}</div>
          <ExpandChartWrap>
            <Scatter
              data={{ datasets: [{ data: sleepHrvPoints, backgroundColor: '#33d977', pointRadius: 4 }] }}
              options={scatterAxisOptions('Sleep (hrs)', 'HRV (ms)')}
            />
          </ExpandChartWrap>
        </ExpandModal>
      )}
      {expanded === 'recovery' && (
        <ExpandModal title="HRV vs RHR" onClose={() => setExpanded(null)}>
          <div className="text-[12px] opacity-70 mb-3">{correlationCaption(hrvRhrPoints)}</div>
          <ExpandChartWrap>
            <Scatter
              data={{ datasets: [{ data: hrvRhrPoints, backgroundColor: '#00afe7', pointRadius: 4 }] }}
              options={scatterAxisOptions('HRV (ms)', 'RHR (bpm)')}
            />
          </ExpandChartWrap>
        </ExpandModal>
      )}
    </section>
  );
}
