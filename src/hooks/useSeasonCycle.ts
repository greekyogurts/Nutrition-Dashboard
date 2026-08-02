import { useEffect, useRef, useState } from 'react';
import {
  ACTIVE_SEASON, CYCLE_SEASONS, nextSeason, SEASON_FADE_MS, SEASON_HOLD_MS,
  seasonBackgroundUrl, type Season,
} from '../lib/season';

interface SeasonCycle {
  /** The season being faded *in*, and the one the ambience layer follows. */
  season: Season;
  /** The season being faded *out*, or null when nothing is in flight. */
  outgoing: Season | null;
}

/**
 * Walks the login scene through the seasons, one slow crossfade at a time.
 *
 * Two things matter more than the cycling itself:
 *
 * **First paint still costs exactly one image.** The next background is
 * fetched during the hold, not up front, and the swap only happens once that
 * fetch resolves. So the login screen downloads ~300KB to render, and the
 * other seasons arrive later or never — someone who signs in within twenty
 * seconds pays for one painting, which is the common case.
 *
 * **A failed fetch is not a broken scene.** If the preload rejects, the
 * current season simply holds and the cycle tries again on the next tick,
 * rather than crossfading to an image that isn't there.
 *
 * Under `prefers-reduced-motion` the whole thing is inert: the scene pins to
 * `ACTIVE_SEASON` and no timers are ever scheduled.
 */
export function useSeasonCycle(): SeasonCycle {
  const [season, setSeason] = useState<Season>(ACTIVE_SEASON);
  const [outgoing, setOutgoing] = useState<Season | null>(null);
  // Held in a ref so the effect below doesn't need `season` as a dependency,
  // which would tear down and restart the timer on every transition.
  const seasonRef = useRef(season);
  seasonRef.current = season;

  useEffect(() => {
    if (!CYCLE_SEASONS) return;
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let cancelled = false;
    let holdTimer: ReturnType<typeof setTimeout>;
    let clearTimer: ReturnType<typeof setTimeout>;

    const scheduleNext = () => {
      holdTimer = setTimeout(() => {
        const upcoming = nextSeason(seasonRef.current);

        // Decode before showing it. Swapping to an image that hasn't arrived
        // gives you a blank frame mid-fade, which looks like a bug.
        const img = new Image();
        img.src = seasonBackgroundUrl(upcoming);
        const begin = () => {
          if (cancelled) return;
          setOutgoing(seasonRef.current);
          setSeason(upcoming);
          clearTimer = setTimeout(() => {
            if (!cancelled) setOutgoing(null);
          }, SEASON_FADE_MS);
          scheduleNext();
        };

        img.decode?.().then(begin).catch(() => {
          // Either decode() is unsupported or the fetch failed. If the image
          // is actually there, go ahead; otherwise hold this season and try
          // again on the next tick.
          if (cancelled) return;
          if (img.complete && img.naturalWidth > 0) begin();
          else scheduleNext();
        });
      }, SEASON_HOLD_MS);
    };

    scheduleNext();
    return () => {
      cancelled = true;
      clearTimeout(holdTimer);
      clearTimeout(clearTimer);
    };
  }, []);

  return { season, outgoing };
}
