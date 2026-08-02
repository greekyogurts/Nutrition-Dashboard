import type { ReactNode } from 'react';
import { useState } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import type { ActivityWire } from '../data/wire';
import {
  activityStatsFor, burnSeries, hrSeries, recentActivities, relativeDay, typeBreakdown, volumeSeries,
} from '../lib/activity';
import { fullScales } from '../lib/chartOptions';
import '../lib/chartSetup';
import { fmtDate, getRangeDates, type RangeSelection, viewLabel } from '../lib/ranges';
import { num } from '../lib/types';
import type { DailyLog } from '../lib/types';
import { useCloseOnInactive } from '../hooks/useCloseOnInactive';
import { ExpandChartWrap, ExpandModal } from './ExpandModal';

interface Props {
  log: DailyLog[];
  activities: ActivityWire[];
  selection: RangeSelection;
  isActive: boolean;
}

type ExpandKey = 'volume' | 'typeBreakdown' | 'burn' | 'activityHR';

const compactBarOptions = (stacked = false) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { display: false, stacked },
    y: { display: false, stacked },
  },
});

const compactDoughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
};

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card p-4 flex flex-col gap-[2px]">
      <div className="text-[10px] uppercase font-bold opacity-40">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

function ChartPanel({ label, onExpand, children }: { label: string; onExpand: () => void; children: ReactNode }) {
  return (
    <div
      className="glass-card p-4 mb-4 cursor-pointer"
      onClick={onExpand}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onExpand(); } }}
    >
      <div className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-2">
        {label}
        <span className="opacity-40 normal-case"> · tap to zoom</span>
      </div>
      <div className="h-32">{children}</div>
    </div>
  );
}

function activityMeta(a: ActivityWire): string {
  const dur = num(a.duration_min);
  const dist = num(a.distance_mi);
  const cal = num(a.calories);
  return `${dur ? `${dur} min` : ''}${dist ? ` · ${dist.toFixed(1)} mi` : ''}${cal ? ` · ${cal} cal` : ''}`;
}

function RecentRow({ activity, latestDate }: { activity: ActivityWire; latestDate: string | null }) {
  const rel = relativeDay(activity.log_date, latestDate);
  const dayLabel = rel.kind === 'today' ? 'Today'
    : rel.kind === 'yesterday' ? 'Yesterday'
      : rel.kind === 'daysAgo' ? `${rel.days} days ago`
        : fmtDate(activity.log_date);
  const hr = num(activity.avg_hr);

  return (
    <div className="flex items-center justify-between py-3.5 border-b border-white/[0.06] last:border-none">
      <div>
        <div className="text-sm font-semibold">{activity.sport_type || activity.name || 'Workout'}</div>
        <div className="text-[11px] opacity-40">
          {dayLabel}
          {' · '}
          {activityMeta(activity)}
        </div>
      </div>
      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-neon-blue/15 text-neon-blue">
        {hr ? `${Math.round(hr)} bpm` : '–'}
      </span>
    </div>
  );
}

const EXPAND_TITLES: Record<ExpandKey, string> = {
  volume: 'Training Volume',
  typeBreakdown: 'Workout Breakdown',
  burn: 'Calories Burned',
  activityHR: 'Avg HR / Workout',
};

export function ActivityCard({ log, activities, selection, isActive }: Props) {
  const [expanded, setExpanded] = useState<ExpandKey | null>(null);
  useCloseOnInactive(isActive, () => setExpanded(null));
  const dateSet = new Set(getRangeDates(log, selection));
  const rows = activities.filter((a) => dateSet.has(a.log_date));

  const { workouts, avgHR, burn } = activityStatsFor(rows);
  const hr = hrSeries(rows);
  const volume = volumeSeries(rows);
  const breakdown = typeBreakdown(rows);
  const burnPoints = burnSeries(rows);
  const recent = recentActivities(activities);
  const latestDate = log.length ? log[log.length - 1]!.log_date : null;

  return (
    <section className="glass-card p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="card-eyebrow">Activity</h2>
        <span className="text-[10px] font-bold uppercase tracking-widest text-neon-blue">
          {viewLabel(log, selection)}
        </span>
      </div>
      <p className="text-[11px] opacity-40 mb-6">Workouts &amp; heart rate</p>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatTile label="Workouts" value={String(workouts)} />
        <StatTile label="Avg HR" value={avgHR ? String(avgHR) : '–'} />
        <StatTile label="Burn" value={burn.toLocaleString()} />
      </div>

      <ChartPanel label="Training Volume" onExpand={() => setExpanded('volume')}>
        <Bar
          data={{
            labels: volume.dates.map(fmtDate),
            datasets: volume.datasets.map((d) => ({
              label: d.label, data: d.data, backgroundColor: d.color, borderRadius: 4,
            })),
          }}
          options={compactBarOptions(true)}
        />
      </ChartPanel>

      <ChartPanel label="Workout Breakdown" onExpand={() => setExpanded('typeBreakdown')}>
        <Doughnut
          data={{
            labels: breakdown.map((s) => s.label),
            datasets: [{
              data: breakdown.map((s) => s.minutes),
              backgroundColor: breakdown.map((s) => s.color),
              borderColor: '#201b17',
              borderWidth: 1,
            }],
          }}
          options={compactDoughnutOptions}
        />
      </ChartPanel>

      <ChartPanel label="Calories Burned" onExpand={() => setExpanded('burn')}>
        <Bar
          data={{
            labels: burnPoints.map((p) => fmtDate(p.date)),
            datasets: [{
              data: burnPoints.map((p) => p.calories),
              backgroundColor: 'rgba(65,178,178,0.7)',
              borderRadius: 4,
            }],
          }}
          options={compactBarOptions()}
        />
      </ChartPanel>

      <ChartPanel label="Avg HR / Workout" onExpand={() => setExpanded('activityHR')}>
        <Bar
          data={{
            labels: hr.map((p) => fmtDate(p.date)),
            datasets: [{
              data: hr.map((p) => p.value),
              backgroundColor: hr.map((p) => p.color),
              borderRadius: 4,
            }],
          }}
          options={compactBarOptions()}
        />
      </ChartPanel>

      <div className="flex items-center justify-between mb-2">
        <h3 className="card-eyebrow">Recent</h3>
        <span className="text-[9px] font-bold uppercase tracking-wider opacity-65 border border-white/[0.06] rounded-full px-2 py-[3px]">
          Always latest
        </span>
      </div>
      {recent.length
        ? recent.map((a) => <RecentRow key={a.id} activity={a} latestDate={latestDate} />)
        : <div className="text-sm opacity-40 py-4">No activities logged yet.</div>}

      {expanded && (
        <ExpandModal title={EXPAND_TITLES[expanded]} onClose={() => setExpanded(null)}>
          <ExpandChartWrap>
            {expanded === 'volume' && (
              <Bar
                data={{
                  labels: volume.dates.map(fmtDate),
                  datasets: volume.datasets.map((d) => ({
                    label: d.label, data: d.data, backgroundColor: d.color, borderRadius: 4,
                  })),
                }}
                options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { display: true, labels: { color: 'rgba(255,255,255,0.7)', boxWidth: 10, font: { size: 11 } } } },
                  scales: {
                    x: { stacked: true, grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 11 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } },
                    y: { stacked: true, grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: 'rgba(255,255,255,0.5)' }, title: { display: true, text: 'Minutes', color: 'rgba(255,255,255,0.5)' } },
                  },
                }}
              />
            )}
            {expanded === 'typeBreakdown' && (
              <Doughnut
                data={{
                  labels: breakdown.map((s) => s.label),
                  datasets: [{
                    data: breakdown.map((s) => s.minutes),
                    backgroundColor: breakdown.map((s) => s.color),
                    borderColor: '#2b2521',
                    borderWidth: 2,
                  }],
                }}
                options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { position: 'right', labels: { color: 'rgba(255,255,255,0.7)', boxWidth: 10, font: { size: 10 } } } },
                }}
              />
            )}
            {expanded === 'burn' && (
              <Bar
                data={{
                  labels: burnPoints.map((p) => fmtDate(p.date)),
                  datasets: [{ data: burnPoints.map((p) => p.calories), backgroundColor: 'rgba(65,178,178,0.7)', borderRadius: 4 }],
                }}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: fullScales() }}
              />
            )}
            {expanded === 'activityHR' && (
              <Bar
                data={{
                  labels: hr.map((p) => fmtDate(p.date)),
                  datasets: [{ data: hr.map((p) => p.value), backgroundColor: hr.map((p) => p.color), borderRadius: 4 }],
                }}
                options={{
                  responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
                  scales: fullScales({ title: { display: true, text: 'bpm', color: 'rgba(255,255,255,0.4)' } }),
                }}
              />
            )}
          </ExpandChartWrap>
        </ExpandModal>
      )}
    </section>
  );
}
