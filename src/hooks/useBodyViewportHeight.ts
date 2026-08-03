import { useEffect, useRef } from 'react';
import { useVisualViewportHeight } from './useVisualViewportHeight';

function isFormField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable;
}

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
 *
 * `visualViewport.height` also shrinks the moment the on-screen keyboard
 * opens — in a plain Safari tab, not just standalone — and iOS already has
 * its own native behavior for scrolling a focused field up above the
 * keyboard. Applying this override on top of that fights the browser's own
 * adjustment: real-device reports described the sign-in card (and, since
 * this hook runs for the whole app, `ProfileModal`'s title/subtitle fields
 * too) getting yanked upward with a dead gap opening beneath it the instant
 * a field was focused. Skipping the override while a form field is focused
 * leaves the keyboard-avoidance entirely to iOS, which already does it
 * correctly on its own; the override resumes on blur, once the shrink is
 * actually the standalone-toolbar case this hook exists for.
 */
export function useBodyViewportHeight(): void {
  const viewportHeight = useVisualViewportHeight();
  const fieldFocused = useRef(false);

  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => { fieldFocused.current = isFormField(e.target); };
    const onFocusOut = () => { fieldFocused.current = false; };
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  useEffect(() => {
    if (fieldFocused.current) return;
    document.body.style.height = viewportHeight != null ? `${viewportHeight}px` : '';
  }, [viewportHeight]);
}
