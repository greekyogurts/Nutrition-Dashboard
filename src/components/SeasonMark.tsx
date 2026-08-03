import { useMemo } from 'react';
import { currentCalendarSeason, type Season } from '../lib/season';

/**
 * The entire in-app seasonal footprint (see DESIGN.md's amended
 * Scene-Is-Not-Chrome rule). Deliberately NOT a reuse of `SeasonAmbience` /
 * `useSeasonCycle` — those exist for a screen with no data on it that a user
 * looks at for a few seconds. This is a corner label on a screen read every
 * morning, so it's static: no drifting particles, no crossfade, nothing
 * that loops behind the numbers. `.season-enter` (styles.css) plays a single
 * ~500ms settle-in on mount and is skipped outright under reduced motion,
 * not just frozen mid-flight.
 */

const SEASON_LABEL: Record<Season, string> = {
  spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter',
};

function SeasonGlyph({ season }: { season: Season }) {
  const common = { width: 9, height: 9, viewBox: '0 0 12 12', fill: 'none', 'aria-hidden': true } as const;
  if (season === 'winter') {
    return (
      <svg {...common}>
        <path d="M6 1v10M2 3l8 6M10 3l-8 6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      </svg>
    );
  }
  if (season === 'summer') {
    return (
      <svg {...common}>
        <circle cx="6" cy="6" r="2.6" fill="currentColor" />
        <path d="M6 0.5v1.6M6 9.9v1.6M11.5 6H9.9M2.1 6H0.5M9.7 2.3l-1.1 1.1M3.4 8.6l-1.1 1.1M9.7 9.7l-1.1-1.1M3.4 3.4 2.3 2.3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      </svg>
    );
  }
  if (season === 'autumn') {
    return (
      <svg {...common}>
        <path d="M9.5 1.5c0 5-3 8-7.5 9 0-5 3-8 7.5-9Z" fill="currentColor" opacity="0.85" />
        <path d="M9 3 3 10.5" stroke="var(--color-bg-dark)" strokeWidth="1" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M6 11c0-4.5 1.5-7 4-8.5C11 6 9.5 9.5 6 11Zm0 0c0-4.5-1.5-7-4-8.5C1 6 2.5 9.5 6 11Z" fill="currentColor" opacity="0.85" />
    </svg>
  );
}

export function SeasonMark({ animate = true }: { animate?: boolean }) {
  const season = useMemo(() => currentCalendarSeason(), []);
  return (
    <span className={`season-mark${animate ? ' season-enter' : ''}`}>
      <SeasonGlyph season={season} />
      {SEASON_LABEL[season]}
    </span>
  );
}
