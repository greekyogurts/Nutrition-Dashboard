import { useEffect } from 'react';
import { useVisualViewportHeight } from './useVisualViewportHeight';

/**
 * Pins `body` to the live visual-viewport height.
 *
 * `body { height: 100dvh }` in styles.css is the instant, pre-JS fallback,
 * but installed (standalone-display) PWAs on iOS have a real history of
 * `dvh` computing unreliably short there — there's no browser toolbar to
 * dynamically collapse or expand in standalone mode, so the "dynamic" half
 * of `dvh` has nothing to track and some iOS versions get it wrong. The
 * symptom is the whole app sitting higher than the true bottom of the screen
 * with dead space below it. `visualViewport.height` is the live,
 * authoritative number.
 *
 * This must be called above the signed-in/signed-out split, not inside the
 * dashboard: it used to live in `App`, which only mounts after sign-in, so
 * the login screen — the first thing a new or logged-out visitor sees, and
 * now the screen carrying a full-bleed background — was left on the `dvh`
 * fallback it can't rely on.
 */
export function useBodyViewportHeight(): void {
  const viewportHeight = useVisualViewportHeight();

  useEffect(() => {
    document.body.style.height = viewportHeight != null ? `${viewportHeight}px` : '';
  }, [viewportHeight]);
}
