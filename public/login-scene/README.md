# Login scene assets

Art for the sign-in screen's countryside backdrop (`src/components/AnimatedLoginScene.tsx`).

Everything here is referenced through `import.meta.env.BASE_URL` — see
`seasonBackgroundUrl()` in `src/lib/season.ts`. **Never link these with a
root-absolute `/login-scene/...` path**: this app is served from the
`/Nutrition-Dashboard/` repo subpath, so an absolute URL 404s in production
while `index.html` still loads, and the failure looks like missing art rather
than a broken config.

## Shipped

```
backgrounds/
├── spring.webp   1024×1536   ~317 KB
├── summer.webp   1024×1536   ~320 KB
├── autumn.webp   1024×1536   ~294 KB
└── winter.webp   1024×1536   ~319 KB
```

Source PNGs were ~3.3 MB each; these are WebP quality 74 at native
resolution. Only the active season is fetched, so the login screen pays for
one file.

Phone screens are narrower than 2:3, so `object-fit: cover` crops roughly 15%
off **each side**. Keep anything that matters out of the left and right
margins — on the current set, the fence and the far creek bank are what go.

The art puts a village and a bright creek near the vertical centre, exactly
where the card sits. That's handled in code by `VEIL_STRENGTH` in
`src/lib/season.ts`, a per-season peak alpha for the radial pool of shade
behind the card. Winter is near-white edge to edge and carries the strongest
value; autumn is already dim and carries the least. **If you replace a
background, re-check its veil value** — it is tuned per image, not global.

## Season cycling

The scene walks spring → summer → autumn → winter while you sit on it, holding
each for 19s and crossfading over 2.6s (`SEASON_HOLD_MS` / `SEASON_FADE_MS`).
Set `CYCLE_SEASONS = false` in `src/lib/season.ts` to pin it to one season.

**First paint still costs one image.** The next background is fetched during
the hold, not up front, and the swap waits on that fetch resolving — so a
sign-in that finishes inside twenty seconds downloads exactly one painting.
A failed preload holds the current season rather than fading to nothing.

Under `prefers-reduced-motion` the cycle never starts and only the initial
season is ever requested.

## Ambient motion

Particles and the cloud shadow are **CSS, not image files** — see
`src/components/SeasonAmbience.tsx`. Petals, leaves, snow and pollen are
abstract shapes a few pixels across; at that size, drawing detail only
produces noise, and generating them avoids an alpha channel to get wrong and
any bytes on first paint.

What the art being a single flat plate *does* cost: the painted trees and
flowers can't sway, because they aren't separable from the background. Making
those move would require the seasons re-exported as layers (sky / midground /
foreground vegetation), which is a much larger art ask than it sounds. The
cloud shadow exists partly to compensate — a slow dark mass crossing the
scene reads as the light changing, which sells "alive" without needing the
scenery itself to move.

## Not yet produced

### `dogs/` — cut, slot reserved

| File | Contents |
|---|---|
| `large-walk.webp` | shepherd mix, 4-frame walk cycle |
| `small-walk.webp` | smaller fluffy black-and-tan, 4-frame walk cycle |
| `large-idle.webp` | single standing frame, reduced-motion pose |
| `small-idle.webp` | single standing frame, reduced-motion pose |

A pair of walking dogs was built at z-tier 4 and removed: drawn as vectors
they read as wooden toys at the size they render, and shipping bad art is
worse than shipping none. The tier and this contract survive for real sprites.

Walk strips are one horizontal row of **four equal cells**:

```
[frame 1][frame 2][frame 3][frame 4]
```

Requirements, all of which the concept art in the handoff violates and which
matter more than the drawing itself:

- **Real alpha.** Not a drawn checkerboard. The concept sheet has the
  checkerboard baked into its pixels as opaque squares.
- Identical cell dimensions across all four frames.
- Feet on the same baseline in every frame, or the dog bobs as it walks.
- Facing **right** (travel direction is left → right).
- No text, labels, borders, drop shadows, or framing.
- Exported separately per dog — not one combined sheet.

Suggested cell size 64×64 for the large dog and 56×56 for the small one, at
2× (so a 128 px-tall strip cell). Nothing in the CSS hard-codes this: frame
size is driven by `--frame-width` / `--frame-height` custom properties, so
final dimensions can change without touching the animation.

The small dog should read **taller and leggier** than the early concept art,
which drew it too squat. See `references/small-dog-*.jpeg` in the handoff.

### `overlays/` — deliberately skipped

Clouds, petals, leaves and snow are **not** planned as image files; they ship
as CSS (see "Ambient motion" above). Only add files here if a CSS version
proves inadequate.
