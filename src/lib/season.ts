export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export const SEASONS: readonly Season[] = ['spring', 'summer', 'autumn', 'winter'];

/**
 * Where the scene starts. Deliberately a constant rather than a settings
 * surface: the whole feature is decoration on a screen the user sees for a
 * few seconds, and a preferences UI for it would cost more than it's worth.
 * Swap this value (or call `currentCalendarSeason()`) to change it.
 */
export const ACTIVE_SEASON: Season = 'spring';

/**
 * Whether the scene walks through the seasons while you sit on it.
 *
 * Set to `false` to pin it to `ACTIVE_SEASON` forever. Cycling is on because
 * the four paintings are the best thing about this screen and pinning shows
 * you one of them, but it is genuinely a taste call and this is the one line
 * to flip.
 */
export const CYCLE_SEASONS = true;

/**
 * How long a season holds before the crossfade starts, and how long the fade
 * itself takes.
 *
 * `HOLD` is long enough that a typical sign-in — type an email, type a
 * password, submit — finishes inside a single season, so nothing changes
 * under you mid-task. Anyone who lingers gets one quiet transition rather
 * than a slideshow.
 */
export const SEASON_HOLD_MS = 19_000;
export const SEASON_FADE_MS = 2_600;

/** The next season in the cycle, wrapping. */
export function nextSeason(season: Season): Season {
  return SEASONS[(SEASONS.indexOf(season) + 1) % SEASONS.length]!;
}

/** Northern-hemisphere meteorological seasons. Not wired up by default — kept
    here so switching to date-driven art is a one-line change at the call site. */
export function currentCalendarSeason(date = new Date()): Season {
  const m = date.getMonth();
  if (m <= 1 || m === 11) return 'winter';
  if (m <= 4) return 'spring';
  if (m <= 7) return 'summer';
  return 'autumn';
}

/**
 * Vite serves this app from a repo subpath (`base: '/Nutrition-Dashboard/'`),
 * so a root-absolute `/login-scene/...` URL 404s in production while
 * index.html itself still loads — the failure looks like missing art rather
 * than a config error. Everything under `public/` has to go through BASE_URL.
 */
export function seasonBackgroundUrl(season: Season): string {
  return `${import.meta.env.BASE_URL}login-scene/backgrounds/${season}.webp`;
}

/**
 * How hard to darken the area behind the login card, per season.
 *
 * The generated art puts a village and a bright creek near the vertical
 * centre — exactly where the card sits — so the card needs its own pool of
 * shade to stay readable. Winter is near-white edge to edge and needs
 * noticeably more than the other three; autumn is already dim and needs
 * least. These are the peak alpha of the radial gradient in `ReadabilityVeil`.
 */
export const VEIL_STRENGTH: Record<Season, number> = {
  spring: 0.62,
  summer: 0.64,
  autumn: 0.56,
  winter: 0.74,
};
