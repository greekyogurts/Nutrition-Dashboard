import { useState, type ReactNode } from 'react';
import { useSeasonCycle } from '../hooks/useSeasonCycle';
import { SEASON_FADE_MS, seasonBackgroundUrl, VEIL_STRENGTH, type Season } from '../lib/season';
import { AmbientAudio } from './AmbientAudio';
import { LoginSceneDogs } from './LoginSceneDogs';
import { SeasonAmbience } from './SeasonAmbience';

/**
 * Layered countryside backdrop for the sign-in screen.
 *
 * Every decorative layer is `aria-hidden` and `pointer-events-none`, so the
 * scene is invisible to screen readers and can never intercept a tap meant
 * for the form. The form remains the primary interactive thing in the tree;
 * `AmbientAudio`'s mute toggle is the one deliberate exception, required by
 * WCAG 1.4.2 for audio that autoplays and loops (see that component).
 *
 * Stacking (from the handoff spec, kept as literal z-values):
 *
 *   10  login content + the mute toggle
 *    8  readability veil
 *    6  ambience — cloud shadow and seasonal particles
 *    4  characters — a static sleeping-dogs sprite (LoginSceneDogs)
 *    1  background plate
 *
 * Tier 4 held a cut vector-art walk cycle before this: drawn as vectors the
 * dogs read as wooden toys at render size, and shipping bad art is worse
 * than shipping none. `LoginSceneDogs` is real sprite art in a still pose,
 * not the walk-cycle asset public/login-scene/README.md still describes as
 * unbuilt — "laying in the path" doesn't need a walk animation.
 *
 * The veil sits *above* the ambience on purpose. Particles crossing the
 * middle of the screen get dimmed along with the artwork behind them, so the
 * card never has to compete with something bright moving over it.
 */
export function AnimatedLoginScene({ children }: { children: ReactNode }) {
  const { season, outgoing } = useSeasonCycle();

  return (
    <div className="relative flex-1 flex items-center justify-center px-5 overflow-hidden isolate">
      <BackgroundPlate season={season} outgoing={outgoing} />
      <LoginSceneDogs season={season} />
      <SeasonAmbience season={season} />
      <ReadabilityVeil season={season} />
      <AmbientAudio />
      <div className="relative z-10 w-full max-w-[380px]">{children}</div>
    </div>
  );
}

/**
 * The seasonal painting, and the crossfade between paintings.
 *
 * Two stacked layers: the outgoing season sits underneath at full opacity
 * while the incoming one fades in over it. Fading one layer *in* rather than
 * fading the old one *out* means there is never a frame where both are
 * partially transparent and the black canvas shows through the middle.
 *
 * `object-cover` on a 2:3 source against a phone nearer 9:19.5 crops roughly
 * 15% off each side, which is why the art keeps its subject away from the
 * edges — the fence and the far bank are what go.
 *
 * The first plate is held at opacity 0 until `onLoad`, so a slow connection
 * shows the app's own black rather than a half-painted image. If the fetch
 * fails outright the handler never runs, the plate stays transparent, and the
 * screen degrades to exactly the black background it had before this feature.
 */
function BackgroundPlate({ season, outgoing }: { season: Season; outgoing: Season | null }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="absolute inset-0 z-[1] pointer-events-none" aria-hidden="true">
      {outgoing && (
        <img
          key={outgoing}
          src={seasonBackgroundUrl(outgoing)}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <img
        key={season}
        src={seasonBackgroundUrl(season)}
        alt=""
        decoding="async"
        fetchPriority="high"
        onLoad={() => setLoaded(true)}
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          opacity: loaded ? 1 : 0,
          // A long ease-in-out: a linear crossfade between two bright
          // paintings washes out through a flat, muddy midpoint.
          transition: `opacity ${SEASON_FADE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        }}
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
 * The vertical linear gradient on top does a different job: it anchors the
 * composition top and bottom so the status bar and home indicator don't sit
 * on bright sky or bright snow.
 *
 * Its strength transitions with the season, on the same clock as the
 * crossfade — winter needs far more shade than autumn, and stepping between
 * those values instantly would flash.
 */
function ReadabilityVeil({ season }: { season: Season }) {
  const peak = VEIL_STRENGTH[season];

  return (
    <div
      className="absolute inset-0 z-[8] pointer-events-none"
      aria-hidden="true"
      style={{
        transition: `background ${SEASON_FADE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
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
