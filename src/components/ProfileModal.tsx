import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'motion/react';
import { useRef, useState, useSyncExternalStore } from 'react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { useScrollLock } from '../hooks/useScrollLock';
import { useVisualViewportHeight } from '../hooks/useVisualViewportHeight';
import { resizeImageToDataUrl } from '../lib/avatar';
import { computeEnergy } from '../lib/energy';
import { DIETS, macroTargetsFor } from '../lib/macros';
import { RESTRICTIONS, watchedNutrients } from '../lib/micros';
import {
  GOALS, profileAge, type GoalKey, type Profile,
} from '../lib/profile';
import type { DailyLog, TdeeBaseline } from '../lib/types';
import { useHeaderHeight } from '../state/HeaderHeightContext';
import { endSession, getSession, subscribe } from '../state/sessionStore';
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
  const [title, setTitle] = useState(profile?.title ?? '');
  const [subtitle, setSubtitle] = useState(profile?.subtitle ?? '');
  const [avatarDataUrl, setAvatarDataUrl] = useState(profile?.avatar_data_url ?? null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
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
    title: title.trim() || null,
    subtitle: subtitle.trim() || null,
    avatar_data_url: avatarDataUrl,
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

  const [show, setShow] = useState(true);
  const handleClose = () => setShow(false);
  const dragControls = useDragControls();
  const viewportHeight = useVisualViewportHeight();
  const headerHeight = useHeaderHeight();
  const reduceMotion = useReducedMotion();
  const session = useSyncExternalStore(subscribe, getSession, getSession);
  useEscapeKey(handleClose);
  useScrollLock();

  // Bounding the wrapper itself (not just the panel's max-height) below the
  // fixed header means the backdrop can't cover -- and absorb every tap and
  // swipe over -- the header and range selector either, since `inset-0` on
  // the backdrop is relative to this wrapper.
  const wrapperTop = headerHeight;
  const wrapperHeight = viewportHeight != null ? viewportHeight - headerHeight : undefined;

  return (
    <div
      className="fixed inset-x-0 z-[100] flex items-end sm:items-center justify-center"
      style={{ top: wrapperTop, height: wrapperHeight ?? `calc(100dvh - ${wrapperTop}px)` }}
    >
      <AnimatePresence onExitComplete={onClose}>
        {show && (
          <>
            <motion.div
              key="backdrop"
              className="absolute inset-0 bg-black/72"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              transition={{ duration: 0.2 }}
              onClick={handleClose}
            />
            <motion.div
              key="panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="profileModalTitle"
              className="relative w-full sm:max-w-[560px] max-h-full flex flex-col p-5 rounded-t-[20px] sm:rounded-[20px]"
              style={{
                background: '#262626', border: '1px solid rgba(255,255,255,0.08)',
                paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))',
              }}
              initial={reduceMotion ? { opacity: 0 } : { y: '100%' }}
              animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
              exit={reduceMotion
                ? { opacity: 0, transition: { duration: 0.15 } }
                : { y: '100%', transition: { type: 'tween', duration: 0.22, ease: [0.4, 0, 1, 1] } }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              drag={reduceMotion ? false : 'y'}
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_e, info) => {
                if (info.offset.y > 90 || info.velocity.y > 600) handleClose();
              }}
            >
        <div
          className="flex items-start justify-between gap-3 mb-4 flex-shrink-0"
          style={{ touchAction: 'none' }}
          onPointerDown={(e) => dragControls.start(e)}
        >
          <h2 id="profileModalTitle" className="text-base font-bold">Profile &amp; Goals</h2>
          <button
            type="button"
            onClick={handleClose}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Close"
            className="-mt-2 -mr-2 w-11 h-11 flex-shrink-0 flex items-center justify-center text-2xl text-white/50 active:text-white"
            style={{ touchAction: 'auto' }}
          >
            &times;
          </button>
        </div>

        <div className="overflow-y-auto min-h-0">
        <div className="p-3.5 rounded-xl mb-[18px] bg-neon-blue/10 border border-neon-blue/20">
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

        {/* Every input/select below stays at text-base (16px) or larger: iOS
            Safari zooms the whole page in on focus for any smaller font
            size, and in this fixed-layout app that zoom doesn't reset on
            its own — it leaves the page looking broken until the user
            manually pinches back out. */}
        <div className="mb-3.5 flex items-center gap-3.5">
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            aria-label={avatarDataUrl ? 'Change profile picture' : 'Add a profile picture'}
            className="relative w-16 h-16 rounded-full flex-shrink-0 overflow-hidden border border-white/10 bg-neon-blue flex items-center justify-center"
          >
            {avatarDataUrl ? (
              <img src={avatarDataUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            )}
            <span className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors" />
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = ''; // allow re-picking the same file next time
              if (!file) return;
              setAvatarError(null);
              try {
                setAvatarDataUrl(await resizeImageToDataUrl(file));
              } catch {
                setAvatarError("Couldn't use that image — try a different photo.");
              }
            }}
          />
          <div className="flex flex-col gap-1 min-w-0">
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="text-[13px] font-semibold text-neon-blue text-left"
            >
              {avatarDataUrl ? 'Change photo' : 'Add photo'}
            </button>
            {avatarDataUrl && (
              <button
                type="button"
                onClick={() => setAvatarDataUrl(null)}
                className="text-[13px] font-semibold text-white/50 text-left active:text-white/70"
              >
                Remove photo
              </button>
            )}
          </div>
        </div>
        {avatarError && <div role="alert" className="text-[12px] text-neon-red mb-3.5">{avatarError}</div>}

        <div className="mb-3.5">
          <label htmlFor="pfTitle" className="text-[11px] font-semibold opacity-60 uppercase tracking-wide mb-1.5 block">
            Dashboard title
          </label>
          <input
            id="pfTitle" type="text" placeholder="Health Dashboard" value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-white/5 border border-white/[0.06] rounded-[10px] px-3 py-2.5 text-white text-base min-h-11"
          />
        </div>

        <div className="mb-3.5">
          <label htmlFor="pfSubtitle" className="text-[11px] font-semibold opacity-60 uppercase tracking-wide mb-1.5 block">
            Subtitle
          </label>
          <input
            id="pfSubtitle" type="text" placeholder="Nutrition, training & recovery" value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            className="w-full bg-white/5 border border-white/[0.06] rounded-[10px] px-3 py-2.5 text-white text-base min-h-11"
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
                  sex === s ? 'bg-neon-blue-deep border-neon-blue-deep text-white' : 'bg-white/[0.04] border-white/[0.06] text-white/60'
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
            className="w-full bg-white/5 border border-white/[0.06] rounded-[10px] px-3 py-2.5 text-white text-base min-h-11"
          />
        </div>

        <div className="mb-3.5">
          <label htmlFor="pfGoal" className="text-[11px] font-semibold opacity-60 uppercase tracking-wide mb-1.5 block">Goal</label>
          <select
            id="pfGoal" value={goal} onChange={(e) => setGoal(e.target.value as GoalKey)}
            className="w-full bg-white/5 border border-white/[0.06] rounded-[10px] px-3 py-2.5 text-white text-base min-h-11"
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
            className="w-full bg-white/5 border border-white/[0.06] rounded-[10px] px-3 py-2.5 text-white text-base min-h-11"
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
                  className="w-full bg-white/5 border border-white/[0.06] rounded-[10px] px-3 py-2.5 text-white text-base min-h-11"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="pfCustomFat" className="text-[11px] font-semibold opacity-60 uppercase tracking-wide mb-1.5 block">
                  Fat (g) <span className="opacity-60 normal-case">— optional</span>
                </label>
                <input
                  id="pfCustomFat" type="number" inputMode="numeric" min={0} placeholder="auto"
                  value={customFat} onChange={(e) => setCustomFat(e.target.value)}
                  className="w-full bg-white/5 border border-white/[0.06] rounded-[10px] px-3 py-2.5 text-white text-base min-h-11"
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
          onClick={() => { onSave(draft); handleClose(); }}
          className="w-full min-h-12 rounded-xl border-none text-white text-[15px] font-bold mt-2 bg-neon-blue-deep"
        >
          Save profile
        </button>
        <div className="text-[11px] opacity-40 mt-3">
          Saved on this device, separately for each account. Your logged data lives in your account.
        </div>

        <div className="mt-6 pt-5 border-t border-white/[0.06]">
          <div className="text-[11px] opacity-40 mb-2.5">
            Signed in as {session?.user.email ?? 'unknown'}
          </div>
          <button
            type="button"
            onClick={() => { void endSession(); }}
            className="w-full min-h-11 rounded-xl text-[14px] font-semibold text-white/70 active:text-white"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            Sign out
          </button>
        </div>
        </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
