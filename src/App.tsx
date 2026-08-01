import { useEffect, useRef, useState } from 'react';
import { ActivityCard } from './components/ActivityCard';
import { CardDots } from './components/CardDots';
import { LabsCard } from './components/LabsCard';
import { MicrosCard } from './components/MicrosCard';
import { OverviewCard } from './components/OverviewCard';
import { ProfileModal } from './components/ProfileModal';
import { RangeSelector } from './components/RangeSelector';
import { SleepCard } from './components/SleepCard';
import { SupplementsCard } from './components/SupplementsCard';
import { TrendsCard } from './components/TrendsCard';
import { useDashboardData } from './data/queries';
import { useVisualViewportHeight } from './hooks/useVisualViewportHeight';
import { RANGE_LABELS, type RangeKey, type RangeSelection } from './lib/ranges';
import { ExplainerProvider } from './state/ExplainerContext';
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
  { id: 'activity', label: 'Activity' },
  { id: 'sleep', label: 'Sleep & Recovery' },
  { id: 'trends', label: 'Trend Charts' },
  { id: 'supplements', label: 'Supplement Stack' },
  { id: 'labs', label: 'Lab Results' },
] as const;

export default function App() {
  const [selection, setSelection] = useState<RangeSelection>({ range: 'today' });
  const [active, setActive] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const { profile, setProfile } = useProfile();
  const {
    log, baselines, micronutrients, activities, supplements, labResults, mealItems, meals, plants,
    isLoading, isFetching, error, refetch,
  } = useDashboardData();
  const swipeContainerRef = useRef<HTMLDivElement>(null);

  const title = profile?.name ? `${profile.name}'s Health Dashboard` : 'Health Dashboard';

  useEffect(() => {
    document.title = title;
  }, [title]);

  // `body { height: 100dvh }` is the instant, pre-JS fallback, but installed
  // (standalone-display) PWAs on iOS have a real history of `dvh` computing
  // unreliably short there — there's no browser toolbar to dynamically
  // collapse/expand in standalone mode in the first place, so the "dynamic"
  // half of dvh has nothing to track and some iOS versions get it wrong.
  // The swipe-dot row sits right after the swipe area in normal document
  // flow, so an undersized body height shows up as the whole app (dots
  // included) sitting higher than the true bottom of the screen, with dead
  // space below. visualViewport.height is the live, authoritative number —
  // same fix already applied to the header's top inset and every modal's
  // max-height.
  const viewportHeight = useVisualViewportHeight();
  useEffect(() => {
    document.body.style.height = viewportHeight != null ? `${viewportHeight}px` : '';
  }, [viewportHeight]);

  // Swiping between cards doesn't fire onClick on the dots, so the active
  // dot is driven off the container's own scroll position instead.
  useEffect(() => {
    const el = swipeContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      const width = el.clientWidth;
      if (!width) return;
      const index = Math.round(el.scrollLeft / width);
      setActive((prev) => {
        const clamped = Math.max(0, Math.min(CARDS.length - 1, index));
        return prev === clamped ? prev : clamped;
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToCard = (index: number) => {
    const el = swipeContainerRef.current;
    const card = el?.children[index] as HTMLElement | undefined;
    card?.scrollIntoView({ inline: 'center', block: 'nearest' });
  };

  return (
    <ExplainerProvider>
      {/* viewport-fit=cover (needed so the swipe dots sit flush at the
          bottom) means iOS lets content render under the status bar/notch
          by default -- there's no browser chrome reserving that space in
          standalone/home-screen mode the way Safari's own UI does in a
          normal tab. env(safe-area-inset-top) is 0 in a regular tab, so
          this is a no-op there and only matters once installed. */}
      <header className="flex-shrink-0 px-4 pb-2" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
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
            disabled={isFetching}
            className="ml-auto flex items-center gap-1.5 text-[11px] font-bold text-neon-blue px-3 py-2 rounded-full border border-white/10 disabled:opacity-70"
          >
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
              className={isFetching ? 'animate-spin' : ''}
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Refresh
          </button>
        </div>
      </header>

      <div className="flex-shrink-0 px-4 pb-3">
        <RangeSelector ranges={RANGES} selection={selection} onChange={setSelection} />
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

      <div className="swipe-container" ref={swipeContainerRef}>
        {CARDS.map((card, index) => (
          <div className="swipe-card" key={card.id}>
            {card.id === 'overview' && (
              <OverviewCard
                log={log} baselines={baselines} mealItems={mealItems} meals={meals} plants={plants}
                profile={profile} selection={selection} isActive={active === index}
              />
            )}
            {card.id === 'micros' && (
              <MicrosCard
                log={log} micronutrients={micronutrients} profile={profile} selection={selection}
                onOpenProfile={() => setProfileOpen(true)} isActive={active === index}
              />
            )}
            {card.id === 'activity' && (
              <ActivityCard log={log} activities={activities} selection={selection} isActive={active === index} />
            )}
            {card.id === 'sleep' && (
              <SleepCard log={log} selection={selection} isActive={active === index} />
            )}
            {card.id === 'trends' && (
              <TrendsCard log={log} baselines={baselines} selection={selection} isActive={active === index} />
            )}
            {card.id === 'supplements' && (
              <SupplementsCard supplements={supplements} />
            )}
            {card.id === 'labs' && (
              <LabsCard labResults={labResults} />
            )}
          </div>
        ))}
      </div>

      <CardDots cards={CARDS} active={active} onSelect={scrollToCard} />

      {profileOpen && (
        <ProfileModal
          profile={profile}
          log={log}
          baselines={baselines}
          onSave={setProfile}
          onClose={() => setProfileOpen(false)}
        />
      )}
    </ExplainerProvider>
  );
}

export { RANGE_LABELS };
