import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Auto-shortens every `motion` animation to a near-instant crossfade
        when the OS-level "reduce motion" preference is on, so this is the
        one place that needs to know about it. */}
    <MotionConfig reducedMotion="user">
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </MotionConfig>
  </StrictMode>,
);
