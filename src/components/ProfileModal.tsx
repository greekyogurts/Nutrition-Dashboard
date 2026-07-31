import { useState } from 'react';
import { computeEnergy } from '../lib/energy';
import { DIETS, macroTargetsFor } from '../lib/macros';
import { RESTRICTIONS, watchedNutrients } from '../lib/micros';
import {
  GOALS, profileAge, type GoalKey, type Profile,
} from '../lib/profile';
import type { DailyLog, TdeeBaseline } from '../lib/types';
import { ExplainChip, ExplainTerm } from './ExplainChip';

interface Props {
  profile: Profile | null;
  log: DailyLog[];
  baselines: TdeeBaseline[];
  onSave: (profile: Profile) => void;
  onClose: () => void;
}

function BaselinePreview({ energy }: { energy: NonNullable<ReturnType<typeof computeEnergy>> }) {
  if (energy.source !== 'calibrated' || !energy.baselineRow) {
    return (
      <div className="text-[11px] opacity-70 mt-2">
        <ExplainTerm term="baseline_tdee" className="font-bold">Baseline</ExplainTerm>: not calibrated yet — showing the
        TDEE recorded on your latest logged day. It switches to a measured baseline the first time the weekly
        calibration runs.
      </div>
    );
  }
  const b = energy.baselineRow;
  const drift = b.prior_baseline != null ? b.baseline_cal - b.prior_baseline : null;
  return (
    <div className="text-[11px] opacity-70 mt-2">
      <ExplainTerm term="baseline_tdee" className="font-bold">Baseline</ExplainTerm> <strong>{b.baseline_cal.toLocaleString()}</strong> kcal
      {energy.burn
        ? <> + <strong>{energy.burn.toLocaleString()}</strong> burn today = <strong>{energy.tdee.toLocaleString()}</strong> kcal</>
        : ' (no training logged today)'}
      <span className="block mt-1">
        Calibrated {b.effective_date}
        {drift != null && ` — ${drift >= 0 ? 'up' : 'down'} ${Math.abs(drift)} kcal from ${b.prior_baseline!.toLocaleString()}`}.
      </span>
    </div>
  );
}

export function ProfileModal({ profile, log, baselines, onSave, onClose }: Props) {
  const [name, setName] = useState(profile?.name ?? '');
  const [sex, setSex] = useState<Profile['sex']>(profile?.sex ?? null);
  const initialAge = profileAge(profile);
  const [age, setAge] = useState(initialAge != null ? String(initialAge) : '');
  const [goal, setGoal] = useState<GoalKey>(profile?.goal ?? 'maintain');
  const [diet, setDiet] = useState(profile?.diet ?? 'balanced');
  const [customProtein, setCustomProtein] = useState(
    profile?.custom_protein_g ? String(profile.custom_protein_g) : '',
  );
  const [customFat, setCustomFat] = useState(profile?.custom_fat_g ? String(profile.custom_fat_g) : '');
  const [restrictions, setRestrictions] = useState<string[]>(profile?.restrictions ?? []);

  const draft: Profile = {
    name: name.trim() || null,
    sex,
    birth_year: age ? new Date().getFullYear() - Number(age) : null,
    goal,
    diet,
    custom_protein_g: customProtein ? Number(customProtein) : null,
    custom_fat_g: customFat ? Number(customFat) : null,
    restrictions,
  };

  const energy = computeEnergy({ profile: draft, log, baselines });
  const macros = energy ? macroTargetsFor(draft, energy) : null;
  const watched = watchedNutrients(draft);

  const toggleRestriction = (key: string) => {
    setRestrictions((prev) => (prev.includes(key) ? prev.filter((r) => r !== key) : [...prev, key]));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/72" onClick={onClose} />
      <div
        className="relative w-full sm:max-w-[560px] max-h-[85vh] overflow-y-auto p-5 rounded-t-[20px] sm:rounded-[20px]"
        style={{ background: '#141416', border: '1px solid rgba(255,255,255,0.06)', borderTop: '2px solid var(--color-neon-blue)' }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-1.5 right-2 w-11 h-11 flex items-center justify-center text-2xl text-white/50 active:text-white"
        >
          &times;
        </button>
        <h2 className="text-base font-bold mb-4 mr-8">Profile &amp; Goals</h2>

        <div className="p-3.5 rounded-xl mb-[18px]" style={{ background: 'rgba(10,132,255,0.08)', border: '1px solid rgba(10,132,255,0.18)' }}>
          <div className="text-[10px] font-bold uppercase tracking-widest text-neon-blue mb-2">Your numbers</div>
          {!energy ? (
            <div className="text-sm opacity-70">
              Calorie and macro targets appear once there&apos;s a{' '}
              <ExplainTerm term="baseline_tdee">calibrated baseline</ExplainTerm> or at least one logged day to read a
              TDEE from. Sex, age and restrictions below already drive your nutrient targets.
            </div>
          ) : (
            <>
              <div className="text-sm mb-1">
                <strong>{energy.tdee.toLocaleString()}</strong> kcal <ExplainTerm term="tdee">TDEE</ExplainTerm> ·{' '}
                <strong>{energy.target.toLocaleString()}</strong> kcal daily target
              </div>
              <div className="text-[11px] opacity-60 mb-2">
                {energy.weightLb
                  ? `Weight ${energy.weightLb} lb, from your latest logged weigh-in`
                  : 'No weight logged yet — protein target unavailable'}
              </div>
              <div className="text-sm">
                {macros?.protein_g == null
                  ? 'Macro targets need a logged weight.'
                  : `${macros.protein_g}g${draft.diet === 'custom' ? ' protein (min)' : ' protein'} · ${macros.carbs_g}g carbs · ${macros.fat_g}g fat · ${macros.fiber_g}g fiber`}
              </div>
              <BaselinePreview energy={energy} />
              {watched.length > 0 && (
                <div className="text-[11px] opacity-60 mt-2">Watching {watched.join(', ')} based on your restrictions.</div>
              )}
            </>
          )}
        </div>

        <div className="mb-3.5">
          <label htmlFor="pfName" className="text-[11px] font-semibold opacity-60 uppercase tracking-wide mb-1.5 block">Name</label>
          <input
            id="pfName" type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full bg-white/5 border border-white/[0.06] rounded-[10px] px-3 py-2.5 text-white text-sm min-h-11"
          />
        </div>

        <div className="mb-3.5">
          <span className="text-[11px] font-semibold opacity-60 uppercase tracking-wide mb-1.5 block">
            Biological sex <span className="opacity-60 normal-case">— sets your nutrient targets</span>
          </span>
          <div className="flex gap-2">
            {(['male', 'female'] as const).map((s) => (
              <button
                key={s} type="button" onClick={() => setSex(s)}
                className={`flex-1 min-h-11 rounded-[10px] border text-[13px] font-semibold ${
                  sex === s ? 'bg-neon-blue border-neon-blue text-white' : 'bg-white/[0.04] border-white/[0.06] text-white/60'
                }`}
              >
                {s === 'male' ? 'Male' : 'Female'}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3.5">
          <label htmlFor="pfAge" className="text-[11px] font-semibold opacity-60 uppercase tracking-wide mb-1.5 block">
            Age <span className="opacity-60 normal-case">— nutrient targets shift with age bands</span>
          </label>
          <input
            id="pfAge" type="number" inputMode="numeric" min={13} max={110} value={age}
            onChange={(e) => setAge(e.target.value)}
            className="w-full bg-white/5 border border-white/[0.06] rounded-[10px] px-3 py-2.5 text-white text-sm min-h-11"
          />
        </div>

        <div className="mb-3.5">
          <label htmlFor="pfGoal" className="text-[11px] font-semibold opacity-60 uppercase tracking-wide mb-1.5 block">Goal</label>
          <select
            id="pfGoal" value={goal} onChange={(e) => setGoal(e.target.value as GoalKey)}
            className="w-full bg-white/5 border border-white/[0.06] rounded-[10px] px-3 py-2.5 text-white text-sm min-h-11"
          >
            {Object.entries(GOALS).map(([k, v]) => (
              <option key={k} value={k}>{v.label} — {v.note}</option>
            ))}
          </select>
        </div>

        <div className="mb-3.5">
          <label htmlFor="pfDiet" className="text-[11px] font-semibold opacity-60 uppercase tracking-wide mb-1.5 block">
            Diet style <span className="opacity-60 normal-case">— sets your macro split</span>
            <ExplainChip term="diet_styles" />
          </label>
          <select
            id="pfDiet" value={diet} onChange={(e) => setDiet(e.target.value)}
            className="w-full bg-white/5 border border-white/[0.06] rounded-[10px] px-3 py-2.5 text-white text-sm min-h-11"
          >
            {Object.entries(DIETS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        {diet === 'custom' && (
          <div className="mb-3.5">
            <div className="flex gap-2.5">
              <div className="flex-1">
                <label htmlFor="pfCustomProtein" className="text-[11px] font-semibold opacity-60 uppercase tracking-wide mb-1.5 block">
                  Protein (g) <span className="opacity-60 normal-case">— minimum</span>
                  <ExplainChip term="custom_diet" />
                </label>
                <input
                  id="pfCustomProtein" type="number" inputMode="numeric" min={0} placeholder="e.g. 200"
                  value={customProtein} onChange={(e) => setCustomProtein(e.target.value)}
                  className="w-full bg-white/5 border border-white/[0.06] rounded-[10px] px-3 py-2.5 text-white text-sm min-h-11"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="pfCustomFat" className="text-[11px] font-semibold opacity-60 uppercase tracking-wide mb-1.5 block">
                  Fat (g) <span className="opacity-60 normal-case">— optional</span>
                </label>
                <input
                  id="pfCustomFat" type="number" inputMode="numeric" min={0} placeholder="auto"
                  value={customFat} onChange={(e) => setCustomFat(e.target.value)}
                  className="w-full bg-white/5 border border-white/[0.06] rounded-[10px] px-3 py-2.5 text-white text-sm min-h-11"
                />
              </div>
            </div>
            <div className="text-[11px] opacity-60 mt-1">Carbs fill in whatever&apos;s left of your daily calorie target.</div>
          </div>
        )}

        <div className="mb-3.5">
          <span className="text-[11px] font-semibold opacity-60 uppercase tracking-wide mb-1.5 block">
            Restrictions <span className="opacity-60 normal-case">— these don&apos;t change macros, they flag at-risk nutrients</span>
          </span>
          {Object.entries(RESTRICTIONS).map(([key, r]) => (
            <label key={key} className="flex items-center gap-2.5 py-2.5 min-h-11 cursor-pointer">
              <input
                type="checkbox" checked={restrictions.includes(key)} onChange={() => toggleRestriction(key)}
                className="w-5 h-5 accent-neon-blue shrink-0"
              />
              <span>
                <span className="text-sm font-semibold">{r.label}</span>
                <span className="text-[11px] opacity-50 block">Flags {r.watch.join(', ')} — {r.why}</span>
              </span>
            </label>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onSave(draft)}
          className="w-full min-h-12 rounded-xl border-none text-white text-[15px] font-bold mt-2 bg-neon-blue"
        >
          Save profile
        </button>
        <div className="text-[11px] opacity-40 mt-3">
          Saved on this device only. When accounts land, this moves to your account unchanged.
        </div>
      </div>
    </div>
  );
}
