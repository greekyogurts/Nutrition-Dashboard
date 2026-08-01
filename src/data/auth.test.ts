import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isExpired, loadSession, saveSession, signIn, signUp, type Session } from './auth';

/**
 * The environment is `node`, so localStorage is stubbed rather than the suite
 * moved to jsdom for one module. fetch is stubbed per-test to assert on what
 * the app does with each shape of GoTrue response.
 */
function stubStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  return store;
}

function stubFetch(status: number, body: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  })));
}

const OK_BODY = {
  access_token: 'a', refresh_token: 'r', expires_in: 3600,
  user: { id: 'u1', email: 'a@b.c' },
};

beforeEach(() => { stubStorage(); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('isExpired', () => {
  const at = (expires_at: number): Session =>
    ({ access_token: 'a', refresh_token: 'r', expires_at, user: { id: 'u', email: null } });

  it('treats a token as expired a minute before it actually is, so a request never races the deadline', () => {
    expect(isExpired(at(1000), 1000 - 61)).toBe(false);
    expect(isExpired(at(1000), 1000 - 59)).toBe(true);
  });

  it('treats an already-lapsed token as expired', () => {
    expect(isExpired(at(1000), 2000)).toBe(true);
  });
});

describe('session storage', () => {
  it('round-trips a session', () => {
    const s: Session = { access_token: 'a', refresh_token: 'r', expires_at: 99, user: { id: 'u', email: 'e' } };
    saveSession(s);
    expect(loadSession()).toEqual(s);
  });

  it('rejects a stored blob missing the fields that make it usable', () => {
    localStorage.setItem('nutrition-dashboard-session', JSON.stringify({ access_token: 'a' }));
    expect(loadSession()).toBeNull();
  });

  it('survives corrupt JSON rather than throwing on load', () => {
    localStorage.setItem('nutrition-dashboard-session', '{not json');
    expect(loadSession()).toBeNull();
  });

  it('clears on null', () => {
    saveSession({ access_token: 'a', refresh_token: 'r', expires_at: 1, user: { id: 'u', email: null } });
    saveSession(null);
    expect(loadSession()).toBeNull();
  });
});

describe('signIn', () => {
  it('persists the session it receives', async () => {
    stubFetch(200, OK_BODY);
    const session = await signIn('a@b.c', 'pw');
    expect(session.user.id).toBe('u1');
    expect(loadSession()?.access_token).toBe('a');
  });

  it('derives an absolute expiry when only a relative one is returned', async () => {
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    stubFetch(200, OK_BODY);
    const session = await signIn('a@b.c', 'pw');
    expect(session.expires_at).toBe(Math.floor(Date.parse('2026-01-01T00:00:00Z') / 1000) + 3600);
    vi.useRealTimers();
  });

  it('reports a bad password in plain language', async () => {
    stubFetch(400, { error_description: 'Invalid login credentials' });
    await expect(signIn('a@b.c', 'nope')).rejects.toThrow('Invalid login credentials');
  });
});

describe('signUp invite errors', () => {
  // The invite check is a trigger on auth.users, so GoTrue surfaces it as an
  // opaque database failure. Each sentinel has to survive that wrapping and
  // come back out as something the person can act on.
  const cases: Array<[string, string]> = [
    ['invite_required', 'An invite code is required to create an account.'],
    ['invite_invalid', "That invite code isn't recognised. Check for typos."],
    ['invite_revoked', 'That invite code has been revoked.'],
    ['invite_expired', 'That invite code has expired.'],
    ['invite_exhausted', 'That invite code has already been used.'],
  ];

  it.each(cases)('maps %s to a readable message', async (sentinel, expected) => {
    stubFetch(500, { message: `Database error saving new user: ${sentinel}` });
    await expect(signUp('a@b.c', 'pw', 'XXXX-YYYY')).rejects.toThrow(expected);
  });

  it('normalises the code so a lowercased or padded entry still matches', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: { body?: string }) => {
      sentBody = init?.body ?? '';
      return { ok: true, status: 200, text: async () => JSON.stringify(OK_BODY) };
    });
    let sentBody = '';
    vi.stubGlobal('fetch', fetchMock);

    await signUp('a@b.c', 'pw', '  zc32-x796  ');

    const body = JSON.parse(sentBody) as { data: { invite_code: string } };
    expect(body.data.invite_code).toBe('ZC32-X796');
  });

  it('returns null rather than a session when the project requires email confirmation', async () => {
    stubFetch(200, { user: { id: 'u1', email: 'a@b.c' } });
    await expect(signUp('a@b.c', 'pw', 'ZC32-X796')).resolves.toBeNull();
  });
});
