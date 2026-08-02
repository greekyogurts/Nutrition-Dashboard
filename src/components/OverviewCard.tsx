import { useState } from 'react';
import type { MealItemWire, MealWire, PlantLogWire } from '../data/wire';
import { meanTdee } from '../lib/baseline';
import { macroContributorsGrouped, macroContributorsSingleDay, type MacroKey } from '../lib/contributors';
import { computeEnergy } from '../lib/energy';
import { sleepDurationLabel } from '../lib/format';
import { macroTargetsFor, type MacroTargets } from '../lib/macros';
import type { Profile } from '../lib/profile';
import {
  avgOf, contextRows, fmtDate, getRangeDates, isSingleDay, rowsForRange, viewLabel, type RangeSelection,
} from '../lib/ranges';
import { buildHeatmap, HEATMAP_COLORS, type HeatmapColumn } from '../lib/trends';
import type { DailyLog, TdeeBaseline } from '../lib/types';
import { plantStatsFor, yogurtStatsFor, type PlantStats, type YogurtStats } from '../lib/vitals';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';
import { useCloseOnInactive } from '../hooks/useCloseOnInactive';
import { ExpandListRow, ExpandModal } from './ExpandModal';
import { ExplainChip, ExplainTerm } from './ExplainChip';

interface Props {
  log: DailyLog[];
  baselines: TdeeBaseline[];
  mealItems: MealItemWire[];
  meals: MealWire[];
  plants: PlantLogWire[];
  profile: Profile | null;
  selection: RangeSelection;
  isActive: boolean;
}

type ExpandKey = MacroKey | 'fiber' | 'yogurt' | 'plants';

const MACRO_LABELS: Record<MacroKey, string> = { protein: 'Protein', carbs: 'Carbs', fat: 'Fat' };

/** Percentage of a target, clamped to 0–100 and safe against a null target. */
function pct(value: number, target: number | null): number {
  if (!target) return 0;
  return Math.max(0, Math.min(100, Math.round((value / target) * 100)));
}

/** Fill matches the calorie ring above it — grams-toward-target is a neutral
    progress readout here, not a judged state, so it stays on the one
    interactive color rather than borrowing the green/amber/red vocabulary
    reserved for on-target/watch/critical (see DESIGN.md's Signal Color Rule). */
function MacroTile({
  label, grams, target, onClick,
}: {
  label: string; grams: number; target: number | null; onClick: () => void;
}) {
  return (
    <div
      className="glass-card p-4 text-left tile cursor-pointer"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
    >
      <div className="text-[10px] uppercase font-bold opacity-40 mb-1">{label}</div>
      <div className="text-xl font-bold">{grams}g</div>
      <div className="h-1 w-full bg-white/10 mt-2 rounded-full">
        <div
          className="h-full bg-neon-blue rounded-full transition-[width] duration-500 ease-out-strong"
          style={{ width: `${pct(grams, target)}%` }}
        />
      </div>
    </div>
  );
}

function MacroExpandBody({ macroKey, meals, dates, selection, log }: {
  macroKey: MacroKey; meals: MealWire[]; dates: string[]; selection: RangeSelection; log: DailyLog[];
}) {
  const label = viewLabel(log, selection);
  if (isSingleDay(selection.range)) {
    const contributors = macroContributorsSingleDay(meals, dates, macroKey);
    return contributors.length ? (
      <>
        <div className="text-[11px] opacity-40 mb-4">{label}</div>
        {contributors.map((c, i) => (
          <ExpandListRow key={i} label={c.mealType} sub={c.description} value={`${Math.round(c.grams)}g`} />
        ))}
      </>
    ) : <div className="text-sm opacity-40 py-4">No meals logged for this day yet.</div>;
  }
  const top = macroContributorsGrouped(meals, dates, macroKey);
  return top.length ? (
    <>
      <div className="text-[11px] opacity-40 mb-4">{label} · top contributors</div>
      {top.map((t) => (
        <ExpandListRow
          key={t.name} label={t.name} sub={`Logged ${t.count}x · avg ${Math.round(t.avg)}g/meal`}
          value={`${Math.round(t.total)}g total`}
        />
      ))}
    </>
  ) : <div className="text-sm opacity-40 py-4">No meals logged in this range.</div>;
}

function FiberExpandBody({ log, selection }: { log: DailyLog[]; selection: RangeSelection }) {
  const rows = contextRows(log, selection);
  return (
    <>
      <div className="text-[11px] opacity-40 mb-4">
        {viewLabel(log, selection)} · fiber is only tracked as a daily total, not per meal or food item
      </div>
      {rows.length
        ? rows.map((r) => <ExpandListRow key={r.log_date} label={fmtDate(r.log_date)} value={`${Math.round(r.fiber_g ?? 0)}g`} />)
        : <div className="text-sm opacity-40 py-4">No data for this range.</div>}
    </>
  );
}

function VitalTile({ label, explainTerm, value, sub, subClass }: {
  label: string; explainTerm: string; value: string; sub: string; subClass?: string;
}) {
  return (
    <div className="glass-card p-4 flex flex-col gap-[2px]">
      <div className="text-[10px] uppercase font-bold opacity-40">
        {label}
        <ExplainChip term={explainTerm} />
      </div>
      <div className="text-lg font-bold">{value}</div>
      <div className={`text-[11px] font-medium ${subClass ?? 'opacity-70'}`}>{sub}</div>
    </div>
  );
}

function YogurtPlantVitals({ yogurt, plants, onExpandYogurt, onExpandPlants }: {
  yogurt: YogurtStats; plants: PlantStats; onExpandYogurt: () => void; onExpandPlants: () => void;
}) {
  return (
    <>
      <div
        className="glass-card p-4 flex flex-col gap-[2px] tile cursor-pointer"
        onClick={onExpandYogurt}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onExpandYogurt(); } }}
      >
        <div className="text-[10px] uppercase font-bold opacity-40">Yogurt Protein</div>
        <div className="text-lg font-bold">{Math.round(yogurt.totalProtein)}g</div>
        <div className="text-[11px] opacity-70 font-medium">
          {yogurt.tubs > 0 ? `${yogurt.tubs.toFixed(1)} tubs` : 'None logged'}
        </div>
      </div>
      <div className="col-span-2 relative">
        <div
          className="glass-card p-4 flex flex-col gap-[2px] tile cursor-pointer"
          onClick={onExpandPlants}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onExpandPlants(); } }}
        >
          <div className="text-[10px] uppercase font-bold opacity-40">Plant Diversity</div>
          <div className="text-lg font-bold">{plants.distinct}</div>
          <div className="text-[11px] opacity-70 font-medium">
            {plants.totalLogs ? `${plants.totalLogs} serving${plants.totalLogs !== 1 ? 's' : ''} logged` : 'None logged'}
          </div>
        </div>
        <div className="absolute top-0.5 right-0.5">
          <ExplainChip term="plant_diversity" />
        </div>
      </div>
    </>
  );
}

function ConsistencyHeatmap({ heatmap }: { heatmap: HeatmapColumn[] }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <h3 className="card-eyebrow">
          Consistency
          <ExplainChip term="consistency" />
        </h3>
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
      <div className="flex items-center gap-1 text-[10px] opacity-50 flex-wrap">
        <span>Less</span>
        {(['none', 'hm-1', 'hm-2', 'hm-3', 'hm-4'] as const).map((level) => (
          <i key={level} className="inline-block w-[10px] h-[10px] rounded-[2px]" style={{ background: HEATMAP_COLORS[level] }} />
        ))}
        <span>More deficit</span>
        <i className="inline-block w-[10px] h-[10px] rounded-[2px] ml-2" style={{ background: HEATMAP_COLORS['hm-surplus'] }} />
        <span>Surplus</span>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card p-4 flex flex-col gap-[2px]">
      <div className="text-[10px] uppercase font-bold opacity-40">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

function YogurtExpandBody({ yogurt, viewLabelText }: { yogurt: YogurtStats; viewLabelText: string }) {
  const totalDisplay = yogurt.totalG >= 1000 ? `${(yogurt.totalG / 1000).toFixed(1)} kg` : `${Math.round(yogurt.totalG)}g`;
  return (
    <>
      <div className="text-[11px] opacity-40 mb-4">{viewLabelText} — the tub never lies</div>
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Total Consumed" value={totalDisplay} />
        <StatTile label="Daily Average" value={`${Math.round(yogurt.avgG)}g`} />
        <StatTile label="Protein from Yogurt" value={`${Math.round(yogurt.totalProtein)}g`} />
        <StatTile label="Tubs of Yogurt" value={yogurt.tubs.toFixed(1)} />
        <div className="col-span-2">
          <StatTile label="Days Logged" value={`${yogurt.loggedDays} / ${yogurt.totalDays}`} />
        </div>
      </div>
    </>
  );
}

function PlantsExpandBody({ plants, viewLabelText }: { plants: PlantStats; viewLabelText: string }) {
  const sorted = Object.entries(plants.counts).sort(([, a], [, b]) => b - a);
  return sorted.length ? (
    <>
      <div className="text-[11px] opacity-40 mb-4">
        {viewLabelText} · {plants.distinct} distinct plant{plants.distinct !== 1 ? 's' : ''}
      </div>
      {sorted.map(([name, count]) => <ExpandListRow key={name} label={name} value={`${count}x`} />)}
    </>
  ) : <div className="text-sm opacity-40 py-4">No plants logged in this range.</div>;
}

export function OverviewCard({ log, baselines, mealItems, meals, plants, profile, selection, isActive }: Props) {
  const [expanded, setExpanded] = useState<ExpandKey | null>(null);
  useCloseOnInactive(isActive, () => setExpanded(null));
  const rows = rowsForRange(log, selection);

  /* Yogurt and plant diversity read their own tables (meal_items, plants_log)
     over the selected date range, independent of whether daily_log has rows
     for it — the vanilla updates these vitals even on a "No data" range. */
  const dates = getRangeDates(log, selection);
  const yogurt = yogurtStatsFor(mealItems, dates);
  const plantStats = plantStatsFor(plants, dates);

  /* Computed ahead of the no-data early return (avgOf/meanTdee/computeEnergy
     are all safe on an empty range) so the hero readout's animated numbers
     — the one focal motion on this card — can be hooked in unconditionally,
     per the Rules of Hooks, rather than only in the has-data render path. */
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

  const animatedCalories = useAnimatedNumber(calories);
  const animatedTdee = useAnimatedNumber(rangeTdee);
  const animatedVariance = useAnimatedNumber(Math.round(Math.abs(variance)));

  if (!rows.length) {
    return (
      <section className="glass-card p-5">
        <h2 className="card-eyebrow mb-4">Energy Balance</h2>
        <p className="text-sm opacity-60 mb-6">No data for this range.</p>
        <div className="grid grid-cols-2 gap-3">
          <YogurtPlantVitals
            yogurt={yogurt} plants={plantStats}
            onExpandYogurt={() => setExpanded('yogurt')} onExpandPlants={() => setExpanded('plants')}
          />
        </div>
        {expanded === 'yogurt' && (
          <ExpandModal title="Greek Yogurt Tracker" onClose={() => setExpanded(null)}>
            <YogurtExpandBody yogurt={yogurt} viewLabelText={viewLabel(log, selection)} />
          </ExpandModal>
        )}
        {expanded === 'plants' && (
          <ExpandModal title="Plant Diversity" onClose={() => setExpanded(null)}>
            <PlantsExpandBody plants={plantStats} viewLabelText={viewLabel(log, selection)} />
          </ExpandModal>
        )}
      </section>
    );
  }

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
  const heatmap = buildHeatmap(log);

  return (
    <section className="glass-card p-5 relative overflow-hidden">
      <div className="flex items-center justify-between mb-5">
        <h2 className="card-eyebrow">
          Energy Balance
          <ExplainChip term="energy_balance" />
        </h2>
        <span className="text-[10px] font-bold uppercase tracking-widest text-neon-blue">
          {viewLabel(log, selection)}
        </span>
      </div>

      <div className="text-4xl font-extrabold mb-1 tracking-tighter">
        {Math.round(animatedCalories).toLocaleString()}
        <span className="text-base font-medium opacity-40">
          {' / '}
          {Math.round(animatedTdee).toLocaleString()} kcal (<ExplainTerm term="tdee">TDEE</ExplainTerm>)
        </span>
      </div>

      {/* Colour encodes real meaning here: green only when actually in a
          deficit, amber otherwise. Never decorative. The three numbers above
          and here tick toward their new value together — like an instrument
          settling on a reading — rather than snapping on every range change;
          see useAnimatedNumber. */}
      <div className={`font-semibold mb-6 ${inDeficit ? 'text-neon-green' : 'text-neon-amber'}`}>
        {inDeficit ? '-' : '+'}
        {Math.round(animatedVariance).toLocaleString()}
        <ExplainTerm term="deficit" className="text-xs uppercase opacity-60 ml-1">
          {inDeficit ? (single ? 'Deficit' : 'Avg Deficit') : single ? 'Surplus' : 'Avg Surplus'}
        </ExplainTerm>
      </div>

      {/* Driven by the same animated numbers as the readout above, so the
          fill settles in step with them instead of racing a separate CSS
          transition against an already-smooth JS tween. */}
      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden mb-8">
        <div
          className="h-full rounded-full bg-neon-blue"
          style={{ width: `${animatedTdee ? Math.max(0, Math.min(100, Math.round((animatedCalories / animatedTdee) * 100))) : 0}%` }}
        />
      </div>

      <h3 className="card-eyebrow mb-3">
        Macros
        <ExplainChip term="macros" />
      </h3>
      <div className="grid grid-cols-2 gap-3 mb-8">
        <MacroTile label="Protein" grams={protein} target={macros.protein_g} onClick={() => setExpanded('protein')} />
        <MacroTile label="Carbs" grams={carbs} target={macros.carbs_g} onClick={() => setExpanded('carbs')} />
        <MacroTile label="Fat" grams={fat} target={macros.fat_g} onClick={() => setExpanded('fat')} />
        <MacroTile label="Fiber" grams={fiber} target={macros.fiber_g} onClick={() => setExpanded('fiber')} />
      </div>

      {heatmap.length > 0 && <ConsistencyHeatmap heatmap={heatmap} />}

      <h3 className="card-eyebrow mb-3">Vitals</h3>
      <div className="grid grid-cols-2 gap-3">
        <VitalTile label="Sleep" explainTerm="sleep_score" value={sleepDurationLabel(sleep)} sub={`${score} Score`}
          subClass={score >= 75 ? 'text-neon-green' : 'text-neon-amber'} />
        <VitalTile label="HRV" explainTerm="hrv" value={`${hrv}ms`} sub={hrv >= 50 ? 'Stable' : 'Low'}
          subClass={hrv >= 50 ? 'text-neon-green' : 'text-neon-amber'} />
        <VitalTile label="RHR" explainTerm="rhr" value={`${rhr}bpm`} sub={rhr <= 54 ? 'Normal' : 'Elevated'}
          subClass={rhr <= 54 ? 'text-neon-green' : 'text-neon-amber'} />
        <YogurtPlantVitals
          yogurt={yogurt} plants={plantStats}
          onExpandYogurt={() => setExpanded('yogurt')} onExpandPlants={() => setExpanded('plants')}
        />
      </div>

      {(expanded === 'protein' || expanded === 'carbs' || expanded === 'fat') && (
        <ExpandModal title={`${MACRO_LABELS[expanded]} Contributors`} onClose={() => setExpanded(null)}>
          <MacroExpandBody macroKey={expanded} meals={meals} dates={dates} selection={selection} log={log} />
        </ExpandModal>
      )}
      {expanded === 'fiber' && (
        <ExpandModal title="Fiber" onClose={() => setExpanded(null)}>
          <FiberExpandBody log={log} selection={selection} />
        </ExpandModal>
      )}
      {expanded === 'yogurt' && (
        <ExpandModal title="Greek Yogurt Tracker" onClose={() => setExpanded(null)}>
          <YogurtExpandBody yogurt={yogurt} viewLabelText={viewLabel(log, selection)} />
        </ExpandModal>
      )}
      {expanded === 'plants' && (
        <ExpandModal title="Plant Diversity" onClose={() => setExpanded(null)}>
          <PlantsExpandBody plants={plantStats} viewLabelText={viewLabel(log, selection)} />
        </ExpandModal>
      )}
    </section>
  );
}
