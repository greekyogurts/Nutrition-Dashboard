import { useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import type { MealItemWire, MealWire, PlantLogWire } from '../data/wire';
import { meanTdee } from '../lib/baseline';
import { macroContributorsGrouped, macroContributorsSingleDay, type MacroKey } from '../lib/contributors';
import { computeEnergy } from '../lib/energy';
import { greetingDateLabel, greetingForHour, sleepDurationLabel } from '../lib/format';
import { macroTargetsFor, type MacroTargets } from '../lib/macros';
import type { Profile } from '../lib/profile';
import {
  avgOf, contextRows, fmtDate, getRangeDates, isSingleDay, rowsForRange, viewLabel, type RangeSelection,
} from '../lib/ranges';
import {
  buildHeatmap, HEATMAP_COLORS, HEATMAP_SHAPE, rhythmSummary,
  type HeatmapColumn, type RhythmSummary,
} from '../lib/trends';
import type { DailyLog, TdeeBaseline } from '../lib/types';
import { plantStatsFor, yogurtStatsFor, type PlantStats, type YogurtStats } from '../lib/vitals';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';
import { useCloseOnInactive } from '../hooks/useCloseOnInactive';
import { revealBlock, staggerContainer, staggerItem } from '../lib/motionVariants';
import { ExpandListRow, ExpandModal } from './ExpandModal';
import { ExplainChip, ExplainTerm } from './ExplainChip';
import { SeasonMark } from './SeasonMark';
import { StatIcon, type StatIconName } from './StatIcon';

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

/**
 * The one display-face moment in the app (see DESIGN.md's Typography
 * section) — everything else stays on the system font stack. Time-of-day
 * only, deliberately no name (see format.ts's greetingForHour doc comment):
 * `Profile` has no name field, and inventing one from free-text title/
 * subtitle would be a guess dressed up as personalization.
 *
 * No daily-insight sentence here on purpose. A generated observation about
 * someone's HRV or calorie trend is a health claim in a product that also
 * renders lab results, and it needs a deterministic rules layer with an
 * explicit no-observation fallback before it ships — not a plausible-
 * sounding line invented for this pass. Scoped out; see the redesign
 * implementation plan.
 */
function GreetingHeader() {
  return (
    <div className="flex items-start justify-between mb-5">
      <div>
        <div className="text-lg leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
          {greetingForHour()}
        </div>
        <div className="text-[11px] opacity-40 mt-0.5">{greetingDateLabel()}</div>
      </div>
      <SeasonMark />
    </div>
  );
}

/**
 * Sentence-case header for a section inside the card, with optional
 * right-aligned metadata. See DESIGN.md's amended Eyebrow-Over-Everything
 * Rule for why these aren't the uppercase `.card-eyebrow` treatment.
 */
function SectionLabel({ children, meta }: { children: ReactNode; meta?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="section-label">{children}</h3>
      {meta}
    </div>
  );
}

/**
 * Macro progress tile.
 *
 * Colour follows the Signal Color Rule strictly, which means macros split
 * into two kinds rather than all sharing one fill:
 *
 *   - protein and fibre are *goals* — more is better, so reaching the
 *     target is a genuinely judged state and earns the success green.
 *   - carbs and fat are *budgets*. There is no "good" value to hit, so
 *     colouring them at all would imply a judgement the data doesn't
 *     support. They stay on the neutral, unjudged activity tone whatever
 *     the number is — deliberately never red or amber, because being under
 *     a carb budget is not a failure and shouldn't look like one.
 */
function MacroTile({
  label, grams, target, judged, onClick,
}: {
  label: string; grams: number; target: number | null; judged: boolean; onClick: () => void;
}) {
  const percent = pct(grams, target);
  const onTarget = judged && target !== null && grams >= target;
  const fill = onTarget ? 'var(--color-neon-green)' : 'var(--color-neon-cyan)';

  return (
    <motion.div
      variants={staggerItem}
      className="compact-card p-3.5 text-left tile cursor-pointer"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
    >
      <div className="text-[10px] uppercase font-bold opacity-40 mb-1 tracking-wider">{label}</div>
      <div className="text-xl font-bold tracking-tight">{grams}g</div>
      <div className="h-1 w-full bg-white/10 mt-2 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out-strong"
          style={{ width: `${percent}%`, background: fill }}
        />
      </div>
      {/* The target is the whole point of the bar — showing the bar without
          the number it's measured against made the fill unreadable. */}
      <div className={`text-[10px] mt-1.5 font-medium ${onTarget ? 'text-neon-green' : 'opacity-45'}`}>
        {target ? (onTarget ? `Target met · ${target}g` : `${percent}% of ${target}g`) : 'No target set'}
      </div>
    </motion.div>
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

function VitalTile({ label, icon, explainTerm, value, sub, subClass }: {
  label: string; icon: StatIconName; explainTerm?: string; value: string; sub: string; subClass?: string;
}) {
  return (
    <motion.div variants={staggerItem} className="compact-card p-3.5 flex flex-col gap-[2px]">
      <div className="text-[10px] uppercase font-bold opacity-40 tracking-wider flex items-center gap-1.5">
        <span className="opacity-80"><StatIcon name={icon} /></span>
        {label}
        {explainTerm && <ExplainChip term={explainTerm} />}
      </div>
      <div className="text-lg font-bold tracking-tight">{value}</div>
      <div className={`text-[11px] font-medium ${subClass ?? 'opacity-55'}`}>{sub}</div>
    </motion.div>
  );
}

function YogurtPlantVitals({ yogurt, plants, onExpandYogurt, onExpandPlants }: {
  yogurt: YogurtStats; plants: PlantStats; onExpandYogurt: () => void; onExpandPlants: () => void;
}) {
  return (
    <>
      <motion.div
        variants={staggerItem}
        className="compact-card p-3.5 flex flex-col gap-[2px] tile cursor-pointer"
        onClick={onExpandYogurt}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onExpandYogurt(); } }}
      >
        <div className="text-[10px] uppercase font-bold opacity-40 tracking-wider flex items-center gap-1.5">
          <span className="opacity-80"><StatIcon name="yogurt" /></span>
          Yogurt Protein
        </div>
        <div className="text-lg font-bold tracking-tight">{Math.round(yogurt.totalProtein)}g</div>
        <div className="text-[11px] opacity-55 font-medium">
          {yogurt.tubs > 0 ? `${yogurt.tubs.toFixed(1)} tubs` : 'None logged'}
        </div>
      </motion.div>
      <motion.div variants={staggerItem} className="relative">
        <div
          className="compact-card p-3.5 flex flex-col gap-[2px] tile cursor-pointer"
          onClick={onExpandPlants}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onExpandPlants(); } }}
        >
          <div className="text-[10px] uppercase font-bold opacity-40 tracking-wider flex items-center gap-1.5">
            <span className="opacity-80"><StatIcon name="plant" /></span>
            Plant Diversity
          </div>
          <div className="text-lg font-bold tracking-tight">{plants.distinct}</div>
          <div className="text-[11px] opacity-55 font-medium">
            {plants.totalLogs ? `${plants.totalLogs} serving${plants.totalLogs !== 1 ? 's' : ''} logged` : 'None logged'}
          </div>
        </div>
        <div className="absolute top-0.5 right-0.5">
          <ExplainChip term="plant_diversity" />
        </div>
      </motion.div>
    </>
  );
}

function ConsistencyHeatmap({ heatmap, rhythm }: { heatmap: HeatmapColumn[]; rhythm: RhythmSummary }) {
  return (
    <motion.div variants={revealBlock} initial="hidden" animate="show" className="mb-8">
      <SectionLabel
        meta={(
          <span className="text-[9px] font-bold uppercase tracking-wider opacity-65 border border-white/[0.06] rounded-full px-2 py-[3px]">
            Last ~12 weeks
          </span>
        )}
      >
        Rhythm
        <ExplainChip term="consistency" />
      </SectionLabel>
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
                  className={`garden-cell w-[10px] h-[10px] ${HEATMAP_SHAPE[cell.level] === 'circle' ? 'garden-cell--surplus' : ''}`}
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
      {/* Status is never color-only: a surplus day is a distinct hue AND a
          circle rather than a square, so the encoding survives grayscale
          and red-green colorblindness, not just the ~92% of readers with
          full color vision. */}
      <div className="flex items-center gap-1 text-[10px] opacity-50 flex-wrap">
        <span>Less</span>
        {(['none', 'hm-1', 'hm-2', 'hm-3', 'hm-4'] as const).map((level) => (
          <i key={level} className="garden-cell inline-block w-[10px] h-[10px]" style={{ background: HEATMAP_COLORS[level] }} />
        ))}
        <span>More deficit</span>
        <i
          className="garden-cell garden-cell--surplus inline-block w-[10px] h-[10px] ml-2"
          style={{ background: HEATMAP_COLORS['hm-surplus'] }}
        />
        <span>Surplus</span>
      </div>

      {/* Plain-language read of the same cells above. Counts, never an
          unbroken-streak number — see rhythmSummary's doc comment. */}
      <p className="text-[11px] opacity-55 mt-3 leading-relaxed">
        Logged {rhythm.loggedDays} of the last {rhythm.windowDays} days.
        {rhythm.proteinHits
          ? ` Protein target reached ${rhythm.proteinHits.hit} of the last ${rhythm.proteinHits.of}.`
          : ''}
      </p>
    </motion.div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <motion.div variants={staggerItem} className="glass-card p-4 flex flex-col gap-[2px]">
      <div className="text-[10px] uppercase font-bold opacity-40">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </motion.div>
  );
}

function YogurtExpandBody({ yogurt, viewLabelText }: { yogurt: YogurtStats; viewLabelText: string }) {
  const totalDisplay = yogurt.totalG >= 1000 ? `${(yogurt.totalG / 1000).toFixed(1)} kg` : `${Math.round(yogurt.totalG)}g`;
  return (
    <>
      <div className="text-[11px] opacity-40 mb-4">{viewLabelText} — the tub never lies</div>
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-2 gap-3">
        <StatTile label="Total Consumed" value={totalDisplay} />
        <StatTile label="Daily Average" value={`${Math.round(yogurt.avgG)}g`} />
        <StatTile label="Protein from Yogurt" value={`${Math.round(yogurt.totalProtein)}g`} />
        <StatTile label="Tubs of Yogurt" value={yogurt.tubs.toFixed(1)} />
        <div className="col-span-2">
          <StatTile label="Days Logged" value={`${yogurt.loggedDays} / ${yogurt.totalDays}`} />
        </div>
      </motion.div>
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
        <GreetingHeader />
        <SectionLabel>
          Today&rsquo;s energy
          <ExplainChip term="energy_balance" />
        </SectionLabel>
        <p className="text-sm opacity-60 mb-6">Nothing logged for this range yet.</p>
        <SectionLabel>Also tracked</SectionLabel>
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-2 gap-3">
          <YogurtPlantVitals
            yogurt={yogurt} plants={plantStats}
            onExpandYogurt={() => setExpanded('yogurt')} onExpandPlants={() => setExpanded('plants')}
          />
        </motion.div>
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

  const burn = avgOf(rows, 'burn_cal');

  /* Weight over the selected range, first weighed day to last. Both ends
     come from real weigh-ins — days without one are skipped rather than
     carried forward, so a gap can't manufacture a trend. Reported only when
     there are two distinct readings to compare. */
  const weighed = rows.filter((r) => r.weight_lb !== null);
  const latestWeight = weighed.length ? weighed[weighed.length - 1]!.weight_lb : null;
  const firstWeight = weighed.length ? weighed[0]!.weight_lb : null;
  const rawDelta = latestWeight !== null && firstWeight !== null && weighed.length > 1
    ? latestWeight - firstWeight
    : null;
  const weightTrendDown = rawDelta !== null && rawDelta < 0;
  const weightDelta = rawDelta !== null && Math.abs(rawDelta) >= 0.05
    ? `${rawDelta > 0 ? '+' : '−'}${Math.abs(rawDelta).toFixed(1)} lb · ${weighed.length} weigh-ins`
    : null;

  const inDeficit = variance < 0;
  const heatmap = buildHeatmap(log);
  const rhythm = rhythmSummary(heatmap, log, macros.protein_g);

  return (
    <section className="glass-card p-5 relative overflow-hidden">
      <GreetingHeader />

      <SectionLabel
        meta={(
          <span className="text-[10px] font-bold uppercase tracking-widest text-neon-blue">
            {viewLabel(log, selection)}
          </span>
        )}
      >
        Today&rsquo;s energy
        <ExplainChip term="energy_balance" />
      </SectionLabel>

      {/* The one featured/raised surface on this card — see DESIGN.md's
          amended Fill-Not-Shadow rule and the @theme comment on feat-card.
          Everything below it drops to the compact tile treatment, so this
          hero readout is unambiguously the thing the screen leads with. */}
      <div className="feat-card grain p-4 mb-8">
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
        <div className={`font-semibold mb-3 ${inDeficit ? 'text-neon-green' : 'text-neon-amber'}`}>
          {inDeficit ? '-' : '+'}
          {Math.round(animatedVariance).toLocaleString()}
          <ExplainTerm term="deficit" className="text-xs uppercase opacity-60 ml-1">
            {inDeficit ? (single ? 'Deficit' : 'Avg Deficit') : single ? 'Surplus' : 'Avg Surplus'}
          </ExplainTerm>
        </div>

        {/* Driven by the same animated numbers as the readout above, so the
            fill settles in step with them instead of racing a separate CSS
            transition against an already-smooth JS tween. */}
        <div className="h-2 w-full bg-white/8 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-neon-blue"
            style={{ width: `${animatedTdee ? Math.max(0, Math.min(100, Math.round((animatedCalories / animatedTdee) * 100))) : 0}%` }}
          />
        </div>
      </div>

      <SectionLabel>
        Macros
        <ExplainChip term="macros" />
      </SectionLabel>
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-2 gap-3 mb-8">
        {/* `judged` marks the two macros that are goals rather than budgets —
            see MacroTile's doc comment. */}
        <MacroTile label="Protein" grams={protein} target={macros.protein_g} judged onClick={() => setExpanded('protein')} />
        <MacroTile label="Carbs" grams={carbs} target={macros.carbs_g} judged={false} onClick={() => setExpanded('carbs')} />
        <MacroTile label="Fat" grams={fat} target={macros.fat_g} judged={false} onClick={() => setExpanded('fat')} />
        <MacroTile label="Fiber" grams={fiber} target={macros.fiber_g} judged onClick={() => setExpanded('fiber')} />
      </motion.div>

      {/* Recovery and Movement were one undifferentiated "Vitals" grid. They
          answer different questions — how recovered am I, and what did I do —
          and splitting them lets the day's training decision be read off the
          first of the two without picking it out of a five-tile block. */}
      {/* Three across, matching SleepCard's own vitals grid — a 2-col grid
          leaves a hole on the third tile, and all three values are short. */}
      <SectionLabel>Recovery</SectionLabel>
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-3 gap-3 mb-8">
        <VitalTile label="Sleep" icon="sleep" explainTerm="sleep_score" value={sleepDurationLabel(sleep)} sub={`${score} score`}
          subClass={score >= 75 ? 'text-neon-green' : 'text-neon-amber'} />
        <VitalTile label="HRV" icon="hrv" explainTerm="hrv" value={`${hrv}ms`} sub={hrv >= 50 ? 'Stable' : 'Low'}
          subClass={hrv >= 50 ? 'text-neon-green' : 'text-neon-amber'} />
        <VitalTile label="RHR" icon="rhr" explainTerm="rhr" value={`${rhr}bpm`} sub={rhr <= 54 ? 'Normal' : 'Elevated'}
          subClass={rhr <= 54 ? 'text-neon-green' : 'text-neon-amber'} />
      </motion.div>

      <SectionLabel>Movement</SectionLabel>
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-2 gap-3 mb-8">
        <VitalTile
          label="Burned" icon="burn"
          value={burn ? `${Math.round(burn).toLocaleString()} kcal` : '–'}
          sub={burn ? 'Training burn' : 'None logged'}
        />
        <VitalTile
          label="Weight" icon="weight"
          value={latestWeight ? `${latestWeight.toFixed(1)} lb` : '–'}
          sub={weightDelta ?? 'No change recorded'}
          {...(weightDelta && weightTrendDown ? { subClass: 'text-neon-green' } : {})}
        />
      </motion.div>

      <SectionLabel>Also tracked</SectionLabel>
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-2 gap-3 mb-8">
        <YogurtPlantVitals
          yogurt={yogurt} plants={plantStats}
          onExpandYogurt={() => setExpanded('yogurt')} onExpandPlants={() => setExpanded('plants')}
        />
      </motion.div>

      {heatmap.length > 0 && <ConsistencyHeatmap heatmap={heatmap} rhythm={rhythm} />}

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
