import { useEffect, useState } from 'react';

/**
 * CSS `dvh` is supposed to track the actual visible viewport as iOS
 * Safari's toolbar shows/hides, but it can lag a transition behind —
 * particularly right after the tap that opens a modal, which is often the
 * same interaction that triggers the toolbar to animate. `visualViewport`
 * is the lower-level, live-updating source of the same number; reading it
 * directly in JS and driving an explicit max-height from it sidesteps that
 * CSS-level lag instead of hoping `dvh` has caught up by paint time.
 */
export function useVisualViewportHeight(): number | null {
  const [height, setHeight] = useState<number | null>(() =>
    typeof window === 'undefined' ? null : (window.visualViewport?.height ?? window.innerHeight),
  );

  useEffect(() => {
    const vv = window.visualViewport;
    const update = () => setHeight(vv?.height ?? window.innerHeight);
    update();
    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return height;
}
