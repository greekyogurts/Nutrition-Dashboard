import { useMemo } from 'react';
import type { Season } from '../lib/season';

/**
 * The moving part of the login scene.
 *
 * The backgrounds are single flat paintings, so the trees and flowers in them
 * can't sway — that would need the art delivered as separate layers. What
 * makes a baked-in plate feel alive instead is everything *in front of* it:
 * something falling or drifting, and the light changing across it. This
 * component owns both.
 *
 * Every particle is two nested elements, which is what buys natural motion
 * out of pure CSS:
 *
 *   outer  → falls (or rises) on translateY, linear, over the full duration
 *   inner  → sways on translateX and rotates, on a *different* period
 *
 * Because the two periods don't divide evenly, the combined path never
 * repeats visibly within a particle's lifetime, so a dozen elements read as
 * scattered drift rather than a dozen things on a loop. Compositor-only
 * properties throughout: transform and opacity, nothing that touches layout.
 *
 * Counts are deliberately low. This runs unattended on a login screen that an
 * installed PWA opens cold, and the handoff's own rule — subtle ambient
 * movement, not cinematics — is the right call for a screen someone is trying
 * to type a password on.
 */

interface ParticleConfig {
  /** How many to render. Kept small; see above. */
  count: number;
  /** Seconds for one full traversal, before per-particle variation. */
  baseFall: number;
  /** Seconds for one sway cycle. Intentionally not a factor of `baseFall`. */
  baseSway: number;
  /** Multiplier range applied to size, so a layer reads as having depth. */
  scale: [number, number];
  /** Extra downward offset in vh; lets a layer start mid-screen. */
  rises?: boolean;
}

const CONFIG: Record<Season, ParticleConfig> = {
  // Cherry blossom falling from the tree in the upper left.
  spring: { count: 16, baseFall: 17, baseSway: 4.3, scale: [0.7, 1.5] },
  // Pollen and the first fireflies: these drift *upward*, slowly.
  summer: { count: 14, baseFall: 22, baseSway: 5.1, scale: [0.5, 1.1], rises: true },
  // Heavier, faster, and they tumble far more than petals do.
  autumn: { count: 15, baseFall: 12, baseSway: 3.4, scale: [0.9, 1.8] },
  // Slowest and densest, with the least rotation — snow doesn't spin.
  winter: { count: 26, baseFall: 20, baseSway: 6.2, scale: [0.6, 1.4] },
};

/**
 * Deterministic pseudo-random in [0,1). Seeded rather than `Math.random` so a
 * re-render can never reshuffle the field — the particles are laid out once
 * and must keep the same positions and phases for the life of the page.
 */
function rand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function SeasonAmbience({ season }: { season: Season }) {
  const cfg = CONFIG[season];

  const particles = useMemo(
    () =>
      Array.from({ length: cfg.count }, (_, i) => {
        const r1 = rand(i + 1);
        const r2 = rand(i + 97);
        const r3 = rand(i + 613);
        const r4 = rand(i + 1229);
        const scale = lerp(cfg.scale[0], cfg.scale[1], r2);
        return {
          key: i,
          left: `${(r1 * 108 - 4).toFixed(2)}%`,
          scale: scale.toFixed(2),
          // Vary each particle's own timing so nothing beats in unison.
          fall: (cfg.baseFall * lerp(0.75, 1.35, r3)).toFixed(2),
          sway: (cfg.baseSway * lerp(0.8, 1.3, r4)).toFixed(2),
          // Negative delay starts the field mid-flight: on load the scene is
          // already going, rather than empty for the first several seconds.
          fallDelay: (-cfg.baseFall * lerp(0, 1.4, r2)).toFixed(2),
          swayDelay: (-cfg.baseSway * r1).toFixed(2),
          // Smaller particles read as further away, so they're dimmer.
          opacity: lerp(0.35, 0.9, (scale - cfg.scale[0]) / (cfg.scale[1] - cfg.scale[0])).toFixed(2),
        };
      }),
    [cfg],
  );

  return (
    <div className="ambience" aria-hidden="true">
      {/* Cloud shadow. A single very large, very soft dark ellipse crossing
          the scene on a long period — the one thing that makes a static
          painting read as being under a moving sky. It is not a "camera"
          move: the frame never shifts, only the light on it. */}
      <div className="ambience-cloud-shadow" />

      <div className={`ambience-field ambience-field--${season}`}>
        {particles.map((p) => (
          <span
            key={p.key}
            className="ambience-particle"
            style={{
              left: p.left,
              opacity: Number(p.opacity),
              animationDuration: `${p.fall}s`,
              animationDelay: `${p.fallDelay}s`,
            }}
          >
            <span
              className="ambience-particle-inner"
              style={{
                transform: `scale(${p.scale})`,
                animationDuration: `${p.sway}s`,
                animationDelay: `${p.swayDelay}s`,
              }}
            >
              <ParticleShape season={season} seed={p.key} />
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * The particle itself. Abstract on purpose — at 6–14px against a painted
 * background, a petal is a rounded lozenge and a snowflake is a soft dot.
 * Drawing more detail than that just produces noise.
 */
function ParticleShape({ season, seed }: { season: Season; seed: number }) {
  if (season === 'winter') {
    return <span className="p-snow" />;
  }
  if (season === 'summer') {
    return <span className="p-mote" />;
  }
  if (season === 'autumn') {
    // Two leaf tones so a drift doesn't read as one repeated sprite.
    return <span className={rand(seed + 31) > 0.5 ? 'p-leaf p-leaf--alt' : 'p-leaf'} />;
  }
  return <span className={rand(seed + 53) > 0.65 ? 'p-petal p-petal--alt' : 'p-petal'} />;
}
