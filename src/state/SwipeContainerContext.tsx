import { createContext, useContext, type RefObject } from 'react';

const SwipeContainerContext = createContext<RefObject<HTMLDivElement | null>>({ current: null });

export { SwipeContainerContext };

/**
 * The horizontally-scrolling element that switches between dashboard cards
 * (`.swipe-container` in App.tsx). `ExpandModal` portals into this node
 * specifically, rather than `document.body` — see the comment at that
 * portal call for the touch-gesture reason it has to be this one and not
 * just any node outside the card.
 */
export function useSwipeContainer(): HTMLDivElement | null {
  return useContext(SwipeContainerContext).current;
}
