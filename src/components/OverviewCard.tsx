import { meanTdee } from '../lib/baseline';
import { computeEnergy } from '../lib/energy';
import { macroTargetsFor, type MacroTargets } from '../lib/macros';
import type { Profile } from '../lib/profile';
import { avgOf, isSingleDay, rowsForRange, viewLabel, type RangeSelection } from '../lib/ranges';
import type { DailyLog, TdeeBaseline } from '../lib/types';

interface Props {
  log: DailyLog[];
  baselines: TdeeBaseline[];
  profile: Profile | null;
  selection: RangeSelection;
}

/** Percentage of a target, clamped to 0–100 and safe against a null target. */
function pct(value: number, target: number | null): number {
  if (!target) return 0;
  return Math.max(0, Math.min(100, Math.round((value / target) * 100)));
}

function MacroTile({
  label, grams, target, barClass, trackClass,
}: { label: string; grams: number; target: number | null; barClass: string; trackClass: string }) {
  return (
    <div className="glass-card p-4 text-left tile">
      <div className="text-[10px] uppercase font-bold opacity-40 mb-1">{label}</div>
      <div className="text-xl font-bold">{grams}g</div>
      <div className={`h-1 w-full ${trackClass} mt-2 rounded-full`}>
        <div
          className={`h-full ${barClass} rounded-full transition-all duration-500`}
          style={{ width: `${pct(grams, target)}%` }}
        />
      </div>
    </div>
  );
}

function VitalTile({ label, value, sub, subClass }: {
  label: string; value: string; sub: string; subClass?: string;
}) {
  return (
    <div className="glass-card p-4 flex flex-col gap-[2px]">
      <div className="text-[10px] uppercase font-bold opacity-40">{label}</div>
      <div className="text-lg font-bold">{value}</div>
      <div className={`text-[11px] font-medium ${subClass ?? 'opacity-70'}`}>{sub}</div>
    </div>
  );
}

function sleepLabel(hours: number): string {
  if (!hours) return '–';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h${String(m).padStart(2, '0')}m`;
}

export function OverviewCard({ log, baselines, profile, selection }: Props) {
  const rows = rowsForRange(log, selection);

  if (!rows.length) {
    return (
      <section className="glass-card p-5">
        <h2 className="card-eyebrow mb-4">Energy Balance</h2>
        <p className="text-sm opacity-60">No data for this range.</p>
      </section>
    );
  }

  const calories = Math.round(avgOf(rows, 'calories'));
  const energy = computeEnergy({ profile, log, baselines });

  /* Per-day TDEE averaged across the range, not a baseline plus an averaged
     burn — that distinction is what keeps a week correct when training volume
     is uneven across it. */
  const rangeTdee = meanTdee(rows, baselines) ?? energy?.tdee ?? 0;

  /* surplus_deficit is a generated Postgres column (calories - tdee), so prefer
     it over recomputing. Fall back to arithmetic only when a row lacks the
     stored tdee it would have been generated from. */
  const allStored = rows.every((r) => r.tdee !== null && r.surplus_deficit !== null);
  const variance = allStored
    ? avgOf(rows, 'surplus_deficit')
    : rangeTdee
      ? calories - rangeTdee
      : 0;

  const macros: MacroTargets = macroTargetsFor(profile, energy);
  const single = isSingleDay(selection.range);

  const protein = Math.round(avgOf(rows, 'protein_g'));
  const carbs = Math.round(avgOf(rows, 'carbs_g'));
  const fat = Math.round(avgOf(rows, 'fat_g'));
  const fiber = Math.round(avgOf(rows, 'fiber_g'));

  const sleep = avgOf(rows, 'sleep_hours');
  const score = Math.round(avgOf(rows, 'score'));
  const hrv = Math.round(avgOf(rows, 'hrv'));
  const rhr = Math.round(avgOf(rows, 'rhr'));

  const inDeficit = variance < 0;

  return (
    <section className="glass-card p-5 relative overflow-hidden">
      <div className="flex items-center justify-between mb-5">
        <h2 className="card-eyebrow">Energy Balance</h2>
        <span className="text-[10px] font-bold uppercase tracking-widest text-neon-blue">
          {viewLabel(log, selection)}
        </span>
      </div>

      <div className="text-4xl font-extrabold mb-1 tracking-tighter">
        {calories.toLocaleString()}
        <span className="text-base font-medium opacity-40">
          {' / '}
          {rangeTdee.toLocaleString()} kcal (TDEE)
        </span>
      </div>

      {/* Colour encodes real meaning here: green only when actually in a
          deficit, amber otherwise. Never decorative. */}
      <div className={`font-semibold mb-6 ${inDeficit ? 'text-neon-green' : 'text-neon-amber'}`}>
        {inDeficit ? '-' : '+'}
        {Math.round(Math.abs(variance)).toLocaleString()}
        <span className="text-xs uppercase opacity-60 ml-1">
          {inDeficit ? (single ? 'Deficit' : 'Avg Deficit') : single ? 'Surplus' : 'Avg Surplus'}
        </span>
      </div>

      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden mb-8">
        <div
          className="h-full rounded-full bg-neon-blue transition-all duration-500"
          style={{ width: `${rangeTdee ? Math.max(0, Math.min(100, Math.round((calories / rangeTdee) * 100))) : 0}%` }}
        />
      </div>

      <h3 className="card-eyebrow mb-3">Macros</h3>
      <div className="grid grid-cols-2 gap-3 mb-8">
        <MacroTile label="Protein" grams={protein} target={macros.protein_g} barClass="bg-green-500" trackClass="bg-green-500/20" />
        <MacroTile label="Carbs" grams={carbs} target={macros.carbs_g} barClass="bg-blue-400" trackClass="bg-blue-400/20" />
        <MacroTile label="Fat" grams={fat} target={macros.fat_g} barClass="bg-orange-400" trackClass="bg-orange-400/20" />
        <MacroTile label="Fiber" grams={fiber} target={macros.fiber_g} barClass="bg-orange-500" trackClass="bg-orange-500/20" />
      </div>

      <h3 className="card-eyebrow mb-3">Vitals</h3>
      <div className="grid grid-cols-2 gap-3">
        <VitalTile label="Sleep" value={sleepLabel(sleep)} sub={`${score} Score`}
          subClass={score >= 75 ? 'text-neon-green' : 'text-neon-amber'} />
        <VitalTile label="HRV" value={`${hrv}ms`} sub={hrv >= 50 ? 'Stable' : 'Low'}
          subClass={hrv >= 50 ? 'text-neon-green' : 'text-neon-amber'} />
        <VitalTile label="RHR" value={`${rhr}bpm`} sub={rhr <= 54 ? 'Normal' : 'Elevated'}
          subClass={rhr <= 54 ? 'text-neon-green' : 'text-neon-amber'} />
      </div>
    </section>
  );
}
