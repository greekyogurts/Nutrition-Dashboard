import { useState } from 'react';
import { MicrosCard } from './components/MicrosCard';
import { OverviewCard } from './components/OverviewCard';
import { useDashboardData } from './data/queries';
import { RANGE_LABELS, type RangeKey, type RangeSelection } from './lib/ranges';
import { useProfile } from './state/useProfile';

const RANGES: Array<{ key: RangeKey; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'last7', label: 'Last 7' },
  { key: '30day', label: '30 Day' },
  { key: 'ytd', label: 'YTD' },
  { key: 'all', label: 'All' },
];

/**
 * Card registry. Phase 3 shipped Overview; the rest arrive in phase 4, one at
 * a time, and slot in here rather than being wired individually into the shell.
 */
const CARDS = [
  { id: 'overview', label: 'Overview' },
  { id: 'micros', label: 'Micronutrient Analysis' },
] as const;

export default function App() {
  const [selection, setSelection] = useState<RangeSelection>({ range: 'today' });
  const [active, setActive] = useState(0);
  const { profile } = useProfile();
  const { log, baselines, micronutrients, isLoading, error, refetch } = useDashboardData();

  const title = profile?.name ? `${profile.name}'s Health Dashboard` : 'Health Dashboard';

  return (
    <>
      <header className="flex-shrink-0 px-4 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center flex-shrink-0 bg-neon-blue"
            aria-label="Profile and goals"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight truncate">{title}</h1>
            <p className="text-[11px] opacity-40">Nutrition, training &amp; recovery</p>
          </div>
          <button
            type="button"
            onClick={refetch}
            className="ml-auto text-[11px] font-bold text-neon-blue px-3 py-2 rounded-full border border-white/10"
          >
            Refresh
          </button>
        </div>
      </header>

      <div className="flex-shrink-0 px-4 pb-3">
        <div role="tablist" aria-label="Time range" className="glass-card flex p-1 gap-1">
          {RANGES.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={selection.range === key}
              onClick={() => setSelection({ range: key })}
              className={`flex-1 min-h-[40px] rounded-[10px] text-xs font-semibold transition-colors ${
                selection.range === key ? 'bg-white/10 text-white' : 'text-white/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex-shrink-0 px-4 pb-2 text-[11px] text-neon-blue">Loading…</div>
      )}
      {error && (
        <div className="flex-shrink-0 mx-4 mb-2 p-3 rounded-xl text-[12px]"
          style={{ background: 'rgba(255,69,58,0.1)', border: '1px solid rgba(255,69,58,0.25)' }}>
          Couldn&apos;t load data: {error.message}
        </div>
      )}

      <div className="swipe-container">
        {CARDS.map((card) => (
          <div className="swipe-card" key={card.id}>
            {card.id === 'overview' && (
              <OverviewCard log={log} baselines={baselines} profile={profile} selection={selection} />
            )}
            {card.id === 'micros' && (
              <MicrosCard log={log} micronutrients={micronutrients} profile={profile} selection={selection} />
            )}
          </div>
        ))}
      </div>

      <div className="flex-shrink-0 flex justify-center gap-1 py-2" role="tablist" aria-label="Cards">
        {CARDS.map((card, i) => (
          <button
            key={card.id}
            type="button"
            role="tab"
            className="swipe-dot"
            aria-selected={i === active}
            aria-label={card.label}
            onClick={() => setActive(i)}
          />
        ))}
      </div>
    </>
  );
}

export { RANGE_LABELS };
