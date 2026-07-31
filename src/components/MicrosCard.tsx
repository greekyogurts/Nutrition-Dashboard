import { getRangeDates, type RangeSelection, viewLabel } from '../lib/ranges';
import { microBarColor, microStatsFor, microTargetsFor, watchedNutrients } from '../lib/micros';
import { profileAge, type Profile } from '../lib/profile';
import type { DailyLog } from '../lib/types';
import type { MicronutrientWire } from '../data/wire';

interface Props {
  log: DailyLog[];
  micronutrients: MicronutrientWire[];
  profile: Profile | null;
  selection: RangeSelection;
  onOpenProfile: () => void;
}

function fmtAmount(avg: number): string {
  return avg < 10 ? avg.toFixed(1) : Math.round(avg).toLocaleString();
}

export function MicrosCard({ log, micronutrients, profile, selection, onOpenProfile }: Props) {
  const targets = microTargetsFor(profile);
  const dates = getRangeDates(log, selection);
  const { stats, worst, best, hasData } = microStatsFor(micronutrients, dates, targets);

  const who = profile?.sex
    ? `${profile.sex === 'female' ? 'female' : 'male'}${profileAge(profile) ? `, age ${profileAge(profile)}` : ''}`
    : 'default adult male';

  const baseWatch = hasData && worst
    ? `${worst.name} is lowest vs. target at ${worst.pct}%. ${best!.name} is strongest at ${best!.pct}%.`
    : 'No micronutrient data logged yet for this range.';

  const watched = watchedNutrients(profile);
  const watchedLow = watched.filter((name) => {
    const s = stats.find((x) => x.name === name);
    return s && s.pct < 80;
  });
  // Keep this to a readable sentence — a vegan + gluten-free profile flags 7
  // nutrients, and naming all of them twice is unreadable.
  const shortList = watchedLow.slice(0, 3).join(', ')
    + (watchedLow.length > 3 ? ` and ${watchedLow.length - 3} more` : '');
  const riskLine = watchedLow.length
    ? `Your diet raises the risk on ${watched.length} nutrients — currently short on ${shortList}.`
    : watched.length
      ? `All ${watched.length} nutrients your diet flags as higher-risk are on target.`
      : null;

  return (
    <section className="glass-card p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="card-eyebrow">Micronutrient Analysis</h2>
        <span className="text-[10px] font-bold uppercase tracking-widest text-neon-blue">
          {viewLabel(log, selection)}
        </span>
      </div>
      <p className="text-[11px] opacity-40 mb-6">
        {`% of daily target · ${targets.length} nutrients · targets for ${who}`}
      </p>

      <div className="p-4 mb-6 rounded-xl" style={{ background: 'rgba(255,159,10,0.08)', border: '1px solid rgba(255,159,10,0.18)' }}>
        <div className="text-[10px] font-bold uppercase tracking-widest text-neon-amber mb-1">Watch</div>
        <div className="text-sm opacity-80">
          {baseWatch}
          {riskLine && <div className="text-[12px] opacity-70 mt-2">{riskLine}</div>}
          {!profile?.sex && (
            <div className="text-[12px] opacity-70 mt-2">
              These are default adult-male targets.{' '}
              <button type="button" onClick={onOpenProfile} className="text-neon-blue underline">
                Set up your profile
              </button>{' '}
              for targets matched to your sex and age.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div
            key={s.name}
            className={`glass-card p-4 tile${worst?.name === s.name ? ' watch-tile' : ''}`}
            style={{ order: s.pct }}
          >
            <div className="text-[10px] uppercase font-bold opacity-40 mb-1">{s.name}</div>
            <div className="text-lg font-bold mb-1">
              {fmtAmount(s.avg)} <span className="text-xs opacity-50 font-medium">{s.unit}</span>
            </div>
            <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(s.pct, 100)}%`, background: microBarColor(s.pct, s.isRange) }}
              />
            </div>
            <div className="text-[10px] opacity-40 mt-1">{s.pct}% {s.targetLabel}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
