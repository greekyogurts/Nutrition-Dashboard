import { SUPABASE_KEY, SUPABASE_URL } from './client';

/**
 * Auth against GoTrue, hand-rolled for the same reason the PostgREST layer is:
 * @supabase/supabase-js bundles realtime, storage and postgrest alongside auth,
 * and this needs four endpoints. Sign in, sign up, refresh, sign out.
 *
 * The security boundary is not in this file. Every token here is checked
 * server-side against row-level security, so the worst a bug in this code can
 * do is sign someone out unexpectedly -- it cannot widen what a session is
 * allowed to read.
 */

export interface Session {
  access_token: string;
  refresh_token: string;
  /** Epoch seconds. */
  expires_at: number;
  user: { id: string; email: string | null };
}

const STORAGE_KEY = 'nutrition-dashboard-session';

/** Refresh this far ahead of expiry, so a request never races the deadline. */
const REFRESH_SKEW_SECONDS = 60;

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Session>;
    if (!parsed.access_token || !parsed.refresh_token || !parsed.user?.id) return null;
    return {
      access_token: parsed.access_token,
      refresh_token: parsed.refresh_token,
      expires_at: parsed.expires_at ?? 0,
      user: { id: parsed.user.id, email: parsed.user.email ?? null },
    };
  } catch {
    return null; // private mode, or corrupt JSON
  }
}

export function saveSession(session: Session | null): void {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* private mode -- the in-memory session still works for this tab */
  }
}

export function isExpired(session: Session, nowSeconds = Date.now() / 1000): boolean {
  return session.expires_at - REFRESH_SKEW_SECONDS <= nowSeconds;
}

/**
 * The invite check lives in a database trigger on auth.users, which is the only
 * placement that survives someone calling /auth/v1/signup directly with the
 * publishable key. The cost of enforcing it there is that GoTrue reports it as
 * a generic database failure rather than a structured error, so the sentinel
 * strings the trigger raises are matched out of whatever shape the body takes.
 */
const INVITE_ERRORS: Record<string, string> = {
  invite_required: 'An invite code is required to create an account.',
  invite_invalid: "That invite code isn't recognised. Check for typos.",
  invite_revoked: 'That invite code has been revoked.',
  invite_expired: 'That invite code has expired.',
  invite_exhausted: 'That invite code has already been used.',
};

function describeError(status: number, body: string): string {
  for (const [sentinel, message] of Object.entries(INVITE_ERRORS)) {
    if (body.includes(sentinel)) return message;
  }
  try {
    const parsed = JSON.parse(body) as { error_description?: string; msg?: string; message?: string };
    const msg = parsed.error_description ?? parsed.msg ?? parsed.message;
    if (msg) return msg;
  } catch {
    /* not JSON -- fall through */
  }
  if (status === 400 || status === 401) return 'Wrong email or password.';
  return `Sign-in failed (${status}).`;
}

function toSession(raw: unknown): Session | null {
  const r = raw as {
    access_token?: string; refresh_token?: string; expires_at?: number; expires_in?: number;
    user?: { id?: string; email?: string | null };
  };
  // Signup with email confirmation enabled returns a user but no session.
  if (!r.access_token || !r.refresh_token || !r.user?.id) return null;
  return {
    access_token: r.access_token,
    refresh_token: r.refresh_token,
    expires_at: r.expires_at ?? Math.floor(Date.now() / 1000) + (r.expires_in ?? 3600),
    user: { id: r.user.id, email: r.user.email ?? null },
  };
}

async function post(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(describeError(res.status, text));
  return text ? JSON.parse(text) : {};
}

export async function signIn(email: string, password: string): Promise<Session> {
  const session = toSession(await post('token?grant_type=password', { email, password }));
  if (!session) throw new Error('Sign-in did not return a session.');
  saveSession(session);
  return session;
}

/**
 * Returns null when the project has email confirmation enabled -- the account
 * exists but cannot be used until the link is clicked, so there is no session
 * to hand back yet.
 */
export async function signUp(email: string, password: string, inviteCode: string): Promise<Session | null> {
  const session = toSession(
    await post('signup', { email, password, data: { invite_code: inviteCode.trim().toUpperCase() } }),
  );
  if (session) saveSession(session);
  return session;
}

export async function refreshSession(refreshToken: string): Promise<Session> {
  const session = toSession(await post('token?grant_type=refresh_token', { refresh_token: refreshToken }));
  if (!session) throw new Error('Could not refresh the session.');
  saveSession(session);
  return session;
}

export async function signOut(session: Session | null): Promise<void> {
  saveSession(null);
  if (!session) return;
  try {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}` },
    });
  } catch {
    // Revoking server-side is best-effort. The local session is already gone,
    // which is the part that matters on a shared device.
  }
}
