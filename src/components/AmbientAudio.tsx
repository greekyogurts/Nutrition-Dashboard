import { useEffect, useRef, useState } from 'react';
import { loginSceneAssetUrl } from '../lib/season';

const SRC = loginSceneAssetUrl('audio/ambient.mp3');

/**
 * Looping background music for the sign-in screen. This is the one
 * deliberate exception to AnimatedLoginScene's "the form is the only
 * interactive thing in the tree" rule: WCAG 1.4.2 (Audio Control) requires
 * a way to stop audio that plays automatically for more than a few
 * seconds, so a mute toggle is a requirement here, not a nice-to-have.
 *
 * Autoplay-with-sound is blocked by every mobile browser without a prior
 * user gesture, so `play()` is attempted on mount and, if rejected, retried
 * once on the page's first pointerdown/keydown/touchstart — sign-in always
 * involves at least one of those before the form can be submitted, so
 * playback reliably starts, just not necessarily on the very first frame.
 * The fallback listener removes itself after firing once either way, so it
 * never fights a user who explicitly muted before interacting.
 */
export function AmbientAudio() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let cancelled = false;
    const tryPlay = () => {
      audio.play().catch(() => {
        if (cancelled) return;
        const resume = () => {
          audio.play().catch(() => {});
        };
        document.addEventListener('pointerdown', resume, { once: true });
        document.addEventListener('keydown', resume, { once: true });
        document.addEventListener('touchstart', resume, { once: true });
        return () => {
          document.removeEventListener('pointerdown', resume);
          document.removeEventListener('keydown', resume);
          document.removeEventListener('touchstart', resume);
        };
      });
    };
    tryPlay();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <audio ref={audioRef} src={SRC} loop preload="auto" muted={muted} />
      <button
        type="button"
        onClick={() => setMuted((m) => !m)}
        aria-label={muted ? 'Unmute background music' : 'Mute background music'}
        aria-pressed={muted}
        className="absolute z-[10] flex items-center justify-center w-9 h-9 rounded-full [text-shadow:none]"
        style={{
          top: 'calc(env(safe-area-inset-top) + 12px)',
          right: '16px',
          background: 'rgba(0,0,0,0.32)',
          backdropFilter: 'blur(6px)',
          color: 'rgba(255,255,255,0.85)',
        }}
      >
        {muted ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        )}
      </button>
    </>
  );
}
