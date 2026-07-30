import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
