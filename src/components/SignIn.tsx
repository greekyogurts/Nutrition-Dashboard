import { useState, type FormEvent } from 'react';
import { signIn, signUp } from '../data/auth';
import { setSession } from '../state/sessionStore';

type Mode = 'signin' | 'signup';

/**
 * Sign in, or redeem an invite. The invite code is enforced by a trigger on
 * auth.users rather than here -- this field is the friendly path to it, not the
 * check itself, since anyone can call the signup endpoint directly.
 */
export function SignIn() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === 'signin') {
        setSession(await signIn(email.trim(), password));
      } else {
        const session = await signUp(email.trim(), password, inviteCode);
        if (session) setSession(session);
        else setNotice('Account created. Check your email for a confirmation link, then sign in.');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const swapMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setError(null);
    setNotice(null);
  };

  return (
    <div
      className="flex-1 flex items-center justify-center px-5"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}
    >
      <div className="w-full max-w-[380px]">
        <div className="mb-7">
          <h1 className="text-2xl font-bold tracking-tight">Health Dashboard</h1>
          <p className="text-[13px] opacity-40 mt-1">
            {mode === 'signin' ? 'Sign in to see your data.' : 'Create your account with an invite code.'}
          </p>
        </div>

        {/* Every input below stays at text-base (16px) or larger: iOS Safari
            zooms the whole page in on focus for any smaller font size, and
            in this fixed-layout app that zoom doesn't reset on its own. */}
        <form onSubmit={submit} className="glass-card p-5 flex flex-col gap-3.5">
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoCapitalize="none"
              className="min-h-[44px] rounded-xl px-3.5 text-base bg-white/[0.04] border border-white/10 focus:border-neon-blue"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              className="min-h-[44px] rounded-xl px-3.5 text-base bg-white/[0.04] border border-white/10 focus:border-neon-blue"
            />
          </label>

          {mode === 'signup' && (
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Invite code</span>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                required
                placeholder="XXXX-XXXX"
                autoCapitalize="characters"
                autoComplete="off"
                className="min-h-[44px] rounded-xl px-3.5 text-base font-mono tracking-wider bg-white/[0.04] border border-white/10 focus:border-neon-blue placeholder:opacity-25 placeholder:font-sans placeholder:tracking-normal"
              />
            </label>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-xl px-3.5 py-3 text-[12.5px] leading-snug"
              style={{ background: 'rgba(255,69,58,0.1)', border: '1px solid rgba(255,69,58,0.25)' }}
            >
              {error}
            </div>
          )}
          {notice && (
            <div
              role="status"
              className="rounded-xl px-3.5 py-3 text-[12.5px] leading-snug"
              style={{ background: 'rgba(51,217,119,0.1)', border: '1px solid rgba(51,217,119,0.25)' }}
            >
              {notice}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="min-h-[46px] rounded-xl font-bold text-[15px] bg-neon-blue-deep text-white disabled:opacity-60 mt-0.5"
          >
            {busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button
          type="button"
          onClick={swapMode}
          className="w-full mt-4 min-h-[40px] text-[13px] text-neon-blue font-semibold"
        >
          {mode === 'signin' ? 'Have an invite code? Create an account' : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
