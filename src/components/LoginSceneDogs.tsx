import { dogSpriteUrl, type Season } from '../lib/season';

/**
 * Tier-4 character layer (see AnimatedLoginScene's stacking doc comment —
 * this tier was reserved and empty since a prior vector-art attempt was cut
 * for reading as "wooden toys" at render size). A single static sleeping
 * pose per season, not the walk-cycle sprite sheet public/login-scene/
 * README.md still describes as unbuilt: "laying in the path" doesn't need a
 * walk animation, and a still pose carries far less risk of looking wrong
 * than an animated one built without matching frame-by-frame art.
 *
 * All four season paintings share one composition (path lower-left, stream
 * lower-right, fence/tree upper-left — only the seasonal dressing changes),
 * so one fixed position works across every season without per-season
 * tuning. Each sprite keeps its own natural aspect ratio (they aren't
 * identical crops) via `height: auto` rather than a fixed box.
 */
export function LoginSceneDogs({ season }: { season: Season }) {
  return (
    <div className="absolute inset-0 z-[4] pointer-events-none" aria-hidden="true">
      <img
        key={season}
        src={dogSpriteUrl(season)}
        alt=""
        className="absolute"
        style={{
          left: '6%',
          bottom: '9%',
          width: '52%',
          maxWidth: '260px',
          height: 'auto',
          filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.35))',
        }}
      />
    </div>
  );
}
