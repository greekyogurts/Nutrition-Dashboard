import { useEffect, useRef } from 'react';

/**
 * Closes an expand modal/sheet whose open state lives on a swipeable card
 * once that card scrolls out of the active slot. `ExpandModal` is `position:
 * fixed`, so its DOM nesting inside the card doesn't stop it rendering
 * full-screen on top of whichever card a swipe lands on next -- without
 * this, the modal is left open and orphaned from the card that owns its
 * `expanded` state, floating over unrelated content.
 */
export function useCloseOnInactive(isActive: boolean, close: () => void) {
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!isActive) closeRef.current();
  }, [isActive]);
}
