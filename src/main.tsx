import { StrictMode, useMemo, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { MotionConfig } from 'motion/react';
import App from './App';
import { SignIn } from './components/SignIn';
import { useBodyViewportHeight } from './hooks/useBodyViewportHeight';
import { getSession, subscribe } from './state/sessionStore';
import './styles.css';

const QUERY_CLIENT_OPTIONS = {
  defaultOptions: {
    queries: {
      // A failed table is usually RLS or a typo, not a blip. Two quick retries
      // then surface it, rather than hammering for 30 seconds.
      retry: 2,
      retryDelay: (n: number) => Math.min(1000 * 2 ** n, 5000),
    },
  },
} as const;

// Persists the whole query cache to localStorage, so opening the app offline
// (or on a cold launch before the network request resolves) shows the last
// successful data instead of a blank loading state. The app shell loading
// offline at all is a separate concern, handled by public/sw.js.
const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'nutrition-dashboard-query-cache',
});

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      // Browsers throttle their own update check to roughly once a day for a
      // script they've already seen, so a returning visitor could otherwise
      // wait up to 24h to pick up a new deploy. `update()` asks explicitly,
      // right away, on every load -- cheap (a single conditional GET of
      // sw.js) and the thing that makes the SHA-stamped cache name in sw.js
      // actually converge on the next reload rather than eventually.
      .then((reg) => reg.update())
      .catch(() => {});
  });
}

/**
 * Gates the dashboard behind a session, and keeps one user's cached data from
 * ever being shown to the next one on a shared browser.
 *
 * `buster` discards the *persisted* (localStorage) copy of the cache whenever
 * the signed-in user changes. That alone doesn't touch the *in-memory* copy —
 * a `QueryClient`'s cache is a plain object field on the client instance, so
 * remounting the provider around the same client reference would still hand
 * the next account the previous one's already-resident rows. Building a new
 * `QueryClient` per identity (not just a new provider) is what actually
 * clears that half too.
 */
function Root() {
  const session = useSyncExternalStore(subscribe, getSession, getSession);
  const identity = session?.user.id ?? 'signed-out';
  const queryClient = useMemo(() => new QueryClient(QUERY_CLIENT_OPTIONS), [identity]);

  // Above the session split on purpose: the login screen needs this as much
  // as the dashboard does, and more so now that it renders full-bleed art.
  useBodyViewportHeight();

  return (
    <PersistQueryClientProvider
      key={identity}
      client={queryClient}
      persistOptions={{
        persister,
        // Data this old is useless on its own terms, not just as a cache
        // policy — no point restoring or growing localStorage past it.
        maxAge: 1000 * 60 * 60 * 24 * 7,
        buster: identity,
        dehydrateOptions: {
          // Never freeze an error state into storage; a failed fetch should
          // retry on the next load; it should not appear to "succeed" with
          // last-known-good bad data.
          shouldDehydrateQuery: (query) => query.state.status === 'success',
        },
      }}
    >
      {session ? <App /> : <SignIn />}
    </PersistQueryClientProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Auto-shortens every `motion` animation to a near-instant crossfade
        when the OS-level "reduce motion" preference is on, so this is the
        one place that needs to know about it. */}
    <MotionConfig reducedMotion="user">
      <Root />
    </MotionConfig>
  </StrictMode>,
);
