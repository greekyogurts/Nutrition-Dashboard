import { useState, type ReactNode } from 'react';
import { ACTIVE_SEASON, seasonBackgroundUrl, VEIL_STRENGTH, type Season } from '../lib/season';

/**
 * Layered countryside backdrop for the sign-in screen.
 *
 * Everything here is decoration: every layer is `aria-hidden` and
 * `pointer-events-none`, so the scene is invisible to screen readers and can
 * never intercept a tap meant for the form. The form itself is the only
 * interactive thing in the tree and sits at the top of the stack.
 *
 * Stacking (matches the handoff spec, kept as literal z-values so later
 * phases can slot in without renumbering):
 *
 *   10  login content
 *    8  readability veil
 *    6  foreground seasonal particles   (phase 3)
 *    4  dogs                            (phase 2)
 *    3  foreground grass / path edge    (phase 3)
 *    2  creek shimmer / clouds          (phase 3)
 *    1  background plate
 *
 * Phase 1 ships layers 1, 8 and 10 only — the shell and its contract. The
 * empty tiers above are the point: the dogs and ambience drop into fixed
 * slots rather than forcing a re-layout of what's already here.
 */
export function AnimatedLoginScene({ season = ACTIVE_SEASON, children }: {
  season?: Season;
  children: ReactNode;
}) {
  return (
    <div className="relative flex-1 flex items-center justify-center px-5 overflow-hidden isolate">
      <BackgroundPlate season={season} />
      <ReadabilityVeil season={season} />
      <div className="relative z-10 w-full max-w-[380px]">{children}</div>
    </div>
  );
}

/**
 * The seasonal painting. `object-cover` on a source that's 2:3 against a
 * phone screen nearer 9:19.5 crops roughly 15% off each side, which is why
 * the art keeps its subject matter away from the edges — the fence and the
 * far bank are the parts that go.
 *
 * Held at opacity 0 until `onLoad` so a slow connection shows the app's own
 * black rather than a half-painted image, and so the fade is the same on
 * every load instead of depending on cache state. If the fetch fails outright
 * the handler never runs, the plate stays transparent, and the screen
 * degrades to exactly the black background it had before this feature.
 */
function BackgroundPlate({ season }: { season: Season }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="absolute inset-0 z-[1] pointer-events-none" aria-hidden="true">
      <img
        src={seasonBackgroundUrl(season)}
        alt=""
        decoding="async"
        fetchPriority="high"
        onLoad={() => setLoaded(true)}
        className={`w-full h-full object-cover transition-opacity duration-700 ease-out-strong ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}

/**
 * A pool of shade behind the card, not a blanket over the whole picture.
 *
 * The radial gradient is centred on the card and fades out well before the
 * frame edges, so the artwork stays visible in the corners while the middle
 * — where the art is busiest and the text lives — gets dark enough to read
 * against. A flat full-screen scrim would have been simpler and would have
 * thrown away the thing we just paid for.
 *
 * The vertical linear gradient on top is doing a different job: it anchors
 * the composition top and bottom so the status bar and home indicator don't
 * sit on bright sky or bright snow.
 */
function ReadabilityVeil({ season }: { season: Season }) {
  const peak = VEIL_STRENGTH[season];

  return (
    <div
      className="absolute inset-0 z-[8] pointer-events-none"
      aria-hidden="true"
      style={{
        background: `
          radial-gradient(
            118% 62% at 50% 50%,
            rgba(0,0,0,${peak}) 0%,
            rgba(0,0,0,${(peak * 0.82).toFixed(3)}) 34%,
            rgba(0,0,0,${(peak * 0.42).toFixed(3)}) 62%,
            rgba(0,0,0,0) 100%
          ),
          linear-gradient(
            to bottom,
            rgba(0,0,0,0.55) 0%,
            rgba(0,0,0,0) 22%,
            rgba(0,0,0,0) 74%,
            rgba(0,0,0,0.55) 100%
          )
        `,
      }}
    />
  );
}
