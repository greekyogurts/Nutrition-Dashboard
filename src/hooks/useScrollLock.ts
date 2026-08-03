import { useEffect } from 'react';

/**
 * Pins `body` to `position: fixed` for as long as the caller is mounted.
 *
 * `body`'s CSS `overflow: hidden` (styles.css) does not stop this on its
 * own: iOS Safari's "scroll the focused input above the keyboard" behavior
 * scrolls the document regardless of `overflow`, once `body`'s own height is
 * taller than the keyboard-shrunk visual viewport -- which it now
 * legitimately can be while a field is focused (see the focus guard in
 * `useBodyViewportHeight`). For a full-page view like the sign-in screen
 * that scroll is harmless, since there's nothing behind it to reveal. For a
 * `position: fixed` overlay like `ProfileModal`, sitting on top of the
 * dashboard, that scroll doesn't reliably respect `fixed` positioning during
 * the keyboard's open transition -- real-device reports showed the
 * dashboard behind the modal's own backdrop showing through. Removing
 * `body` from the document's scrollable flow entirely leaves nothing for
 * iOS to scroll, so it's forced to resize the visual viewport instead,
 * which the modal already tracks correctly for its own sizing.
 */
export function useScrollLock(): void {
  useEffect(() => {
    const scrollY = window.scrollY;
    const { style } = document.body;
    const prev = { position: style.position, top: style.top, left: style.left, right: style.right };
    style.position = 'fixed';
    style.top = `-${scrollY}px`;
    style.left = '0';
    style.right = '0';
    return () => {
      style.position = prev.position;
      style.top = prev.top;
      style.left = prev.left;
      style.right = prev.right;
      window.scrollTo(0, scrollY);
    };
  }, []);
}
