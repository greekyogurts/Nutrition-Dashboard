import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { MotionConfig } from 'motion/react';
import App from './App';
import './styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A failed table is usually RLS or a typo, not a blip. Two quick retries
      // then surface it, rather than hammering for 30 seconds.
      retry: 2,
      retryDelay: (n) => Math.min(1000 * 2 ** n, 5000),
    },
  },
});

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
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Auto-shortens every `motion` animation to a near-instant crossfade
        when the OS-level "reduce motion" preference is on, so this is the
        one place that needs to know about it. */}
    <MotionConfig reducedMotion="user">
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          // Data this old is useless on its own terms, not just as a cache
          // policy — no point restoring or growing localStorage past it.
          maxAge: 1000 * 60 * 60 * 24 * 7,
          dehydrateOptions: {
            // Never freeze an error state into storage; a failed fetch should
            // retry on the next load; it should not appear to "succeed" with
            // last-known-good bad data.
            shouldDehydrateQuery: (query) => query.state.status === 'success',
          },
        }}
      >
        <App />
      </PersistQueryClientProvider>
    </MotionConfig>
  </StrictMode>,
);
