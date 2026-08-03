import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
import { RANGE_LABELS, type RangeKey, type RangeSelection } from './lib/ranges';
import { ExplainerProvider } from './state/ExplainerContext';
import { HeaderHeightContext } from './state/HeaderHeightContext';
import { SwipeContainerContext } from './state/SwipeContainerContext';
import { useProfile } from './state/useProfile';

const RANGES: Array<{ key: RangeKey; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'last7', label: 'Last 7' },
  { key: '30day', label: '30 Day' },
  { key: 'ytd', label: 'YTD' },
  { key: 'all', label: 'All' },
];

/**
 * Card registry. Order and labels revised for the warm redesign: Recovery
 * moved up from 4th to 2nd (it drives today's training decision more than
 * Movement does), and labels warmed where that adds clarity rather than
 * fog — "Macros" stays "Macros" inside Today, since anyone tracking protein
 * already knows the word.
 */
const CARDS = [
  { id: 'overview', label: 'Today' },
  { id: 'sleep', label: 'Recovery' },
  { id: 'activity', label: 'Movement' },
  { id: 'micros', label: 'Nutrition Details' },
  { id: 'trends', label: 'Your Trends' },
  { id: 'supplements', label: 'Daily Support' },
  { id: 'labs', label: 'Health Check' },
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
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  const title = profile?.title?.trim() || 'Health Dashboard';
  const subtitle = profile?.subtitle?.trim() || 'Nutrition, training & recovery';

  useEffect(() => {
    document.title = title;
  }, [title]);

  // The body-height correction this used to own now lives in
  // `useBodyViewportHeight`, called from `Root` — it has to run above the
  // signed-in/signed-out split so the login screen gets it too, and this
  // component only mounts once you're signed in.

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

  // Bottom sheets need to know how tall this fixed region actually renders
  // (it varies with safe-area insets and whether the loading/error banners
  // are showing) so they can clamp their own height below it -- a flat
  // percentage of the viewport left them tall enough to cover the header
  // and range selector on most real phone sizes.
  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const measure = () => setHeaderHeight(el.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <ExplainerProvider>
      <HeaderHeightContext.Provider value={headerHeight}>
      <div className="flex-shrink-0" ref={headerRef}>
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
              className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center flex-shrink-0 bg-neon-blue overflow-hidden"
              aria-label="Profile and goals"
            >
              {profile?.avatar_data_url ? (
                <img src={profile.avatar_data_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              )}
            </button>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight truncate">{title}</h1>
              <p className="text-[11px] opacity-40 truncate">{subtitle}</p>
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
      </div>

      <div className="swipe-container" ref={swipeContainerRef}>
      <SwipeContainerContext.Provider value={swipeContainerRef}>
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
      </SwipeContainerContext.Provider>
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
      </HeaderHeightContext.Provider>
    </ExplainerProvider>
  );
}

export { RANGE_LABELS };
