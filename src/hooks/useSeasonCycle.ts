import { useEffect, useRef, useState } from 'react';
import {
  ACTIVE_SEASON, CYCLE_SEASONS, dogSpriteUrl, nextSeason, SEASON_FADE_MS, SEASON_HOLD_MS,
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
 * **First paint still costs exactly one background and one dog sprite.** The
 * next season's images are fetched during the hold, not up front, and the
 * swap only happens once both resolve. So the login screen pays for one
 * painting and one sprite to render, and the other seasons arrive later or
 * never — someone who signs in within twenty seconds pays for one of each.
 *
 * **A failed fetch is not a broken scene.** If either preload rejects, the
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

        // Decode both the background and the dog sprite before showing
        // either. They used to swap on separate clocks — the background
        // preloaded here while the sprite only started fetching once React
        // re-rendered with the new season — which read as the dogs popping
        // in late and out of step with the crossfade. Waiting on both here
        // means `season` only ever advances once both are ready to paint.
        const bg = new Image();
        bg.src = seasonBackgroundUrl(upcoming);
        const dogs = new Image();
        dogs.src = dogSpriteUrl(upcoming);
        const begin = () => {
          if (cancelled) return;
          setOutgoing(seasonRef.current);
          setSeason(upcoming);
          clearTimer = setTimeout(() => {
            if (!cancelled) setOutgoing(null);
          }, SEASON_FADE_MS);
          scheduleNext();
        };

        const decode = (img: HTMLImageElement) =>
          img.decode ? img.decode() : Promise.reject(new Error('decode unsupported'));

        Promise.all([decode(bg), decode(dogs)]).then(begin).catch(() => {
          // Either decode() is unsupported or a fetch failed. If both images
          // are actually there, go ahead; otherwise hold this season and try
          // again on the next tick.
          if (cancelled) return;
          const ready = (img: HTMLImageElement) => img.complete && img.naturalWidth > 0;
          if (ready(bg) && ready(dogs)) begin();
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
