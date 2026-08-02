import type { Variants } from 'motion/react';

/**
 * Shared entrance choreography for card content. `staggerContainer` fires
 * once per group (a tile grid, a row list) as one authored reveal, not a
 * count-up-style repeating tic — see DESIGN.md's One Focal Moment Rule,
 * which this stays clear of by only ever running on mount.
 */
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.035, delayChildren: 0.02 } },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.23, 1, 0.32, 1] } },
};

/** For a single block (a chart, the heatmap) that should fade/rise as one
    unit rather than staggering its own internals. */
export const revealBlock: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.23, 1, 0.32, 1] } },
};
