import { Bar, Line } from 'react-chartjs-2';
import '../lib/chartSetup';
import { sleepDurationLabel } from '../lib/format';
import {
  avgOf, contextRows, fmtDate, isSingleDay, rowsForRange, type RangeSelection, viewLabel,
} from '../lib/ranges';
import type { DailyLog } from '../lib/types';

interface Props {
  log: DailyLog[];
  selection: RangeSelection;
}

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

function VitalTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card p-4 flex flex-col gap-[2px]">
      <div className="text-[10px] uppercase font-bold opacity-40">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}

export function SleepCard({ log, selection }: Props) {
  const rows = rowsForRange(log, selection);
  const avgWord = isSingleDay(selection.range) ? '' : 'Avg ';

  const avgSleep = avgOf(rows, 'sleep_hours');
  const avgHRV = Math.round(avgOf(rows, 'hrv'));
  const avgRHR = Math.round(avgOf(rows, 'rhr'));

  const chartRows = contextRows(log, selection);
  const labels = chartRows.map((r) => fmtDate(r.log_date));

  return (
    <section className="glass-card p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="card-eyebrow">Sleep &amp; Recovery</h2>
        <span className="text-[10px] font-bold uppercase tracking-widest text-neon-blue">
          {viewLabel(log, selection)}
        </span>
      </div>
      <p className="text-[11px] opacity-40 mb-6">Duration, HRV &amp; RHR</p>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <VitalTile label={`${avgWord}Sleep`} value={rows.length ? sleepDurationLabel(avgSleep) : '–'} />
        <VitalTile label={`${avgWord}HRV`} value={rows.length ? `${avgHRV}ms` : '–'} />
        <VitalTile label={`${avgWord}RHR`} value={rows.length ? `${avgRHR}bpm` : '–'} />
      </div>

      <div className="glass-card p-4 mb-4">
        <div className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-2">Sleep Duration</div>
        <div className="h-28">
          <Bar
            data={{
              labels,
              datasets: [{
                data: chartRows.map((r) => r.sleep_hours ?? 0),
                backgroundColor: '#5e5ce6',
                borderRadius: 4,
              }],
            }}
            options={compactBarOptions}
          />
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-2">HRV vs RHR</div>
        <div className="h-28">
          <Line
            data={{
              labels,
              datasets: [
                {
                  label: 'HRV (ms)', data: chartRows.map((r) => r.hrv ?? 0), borderColor: '#30d158',
                  backgroundColor: 'rgba(48,209,88,0.1)', fill: true, pointRadius: 0, borderWidth: 2,
                  tension: 0.3, yAxisID: 'y',
                },
                {
                  label: 'RHR (bpm)', data: chartRows.map((r) => r.rhr ?? 0), borderColor: '#ff9f0a',
                  backgroundColor: 'rgba(255,159,10,0.05)', fill: false, pointRadius: 0, borderWidth: 2,
                  tension: 0.3, yAxisID: 'y1',
                },
              ],
            }}
            options={compactLineOptions}
          />
        </div>
      </div>
    </section>
  );
}
