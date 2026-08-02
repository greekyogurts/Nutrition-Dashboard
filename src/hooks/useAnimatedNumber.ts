import { useEffect, useRef, useState } from 'react';
import { animate } from 'motion';

// The confident-arrival curve animate.md recommends for authored entrances.
const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Ticks the displayed number toward `value` like an instrument settling on a
 * reading, instead of snapping — the Overview card's hero readout only; see
 * DESIGN.md's motion thesis. Retargets mid-flight from whatever's currently
 * on screen, not the previous target, so repeated range changes interrupt
 * cleanly. Silent on mount and under prefers-reduced-motion.
 */
export function useAnimatedNumber(value: number, duration = 0.6): number {
  const [display, setDisplay] = useState(value);
  const shown = useRef(value);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || shown.current === value) {
      shown.current = value;
      setDisplay(value);
      return;
    }
    const controls = animate(shown.current, value, {
      duration,
      ease: EASE,
      onUpdate: (v) => {
        shown.current = v;
        setDisplay(v);
      },
    });
    return () => controls.stop();
  }, [value]);

  return display;
}
