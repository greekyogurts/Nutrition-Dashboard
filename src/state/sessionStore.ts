import {
  isExpired, loadSession, refreshSession, saveSession, signOut as apiSignOut, type Session,
} from '../data/auth';

/**
 * The session lives outside React because the fetch layer needs it too, and
 * that layer is plain functions called by React Query rather than components.
 * Components subscribe through `useSyncExternalStore`, so there is still one
 * source of truth rather than a context copy that can drift.
 */

let current: Session | null = loadSession();
const listeners = new Set<() => void>();

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function getSession(): Session | null {
  return current;
}

export function setSession(session: Session | null): void {
  current = session;
  saveSession(session);
  listeners.forEach((l) => l());
}

export async function endSession(): Promise<void> {
  const previous = current;
  setSession(null);
  await apiSignOut(previous);
}

/**
 * A refresh in flight is shared rather than started per caller: the dashboard
 * fires nine queries in parallel, and nine simultaneous refreshes would race,
 * with eight of them redeeming an already-rotated refresh token and failing.
 */
let refreshing: Promise<Session | null> | null = null;

export async function getAccessToken(): Promise<string | null> {
  if (!current) return null;
  if (!isExpired(current)) return current.access_token;

  refreshing ??= refreshSession(current.refresh_token)
    .then((session) => { setSession(session); return session; })
    .catch(() => { setSession(null); return null; })
    .finally(() => { refreshing = null; });

  return (await refreshing)?.access_token ?? null;
}

// Signing out in one tab should sign out the others, and signing in should
// likewise propagate -- otherwise a second tab keeps rendering a session that
// no longer exists.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== 'nutrition-dashboard-session') return;
    current = loadSession();
    listeners.forEach((l) => l());
  });
}
