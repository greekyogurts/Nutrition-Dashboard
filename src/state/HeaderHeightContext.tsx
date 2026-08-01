import { createContext, useContext } from 'react';

const HeaderHeightContext = createContext(0);

export { HeaderHeightContext };

/**
 * Height (px) of the fixed dashboard title + time-range row, measured live
 * in App.tsx via ResizeObserver. Bottom sheets (ExpandModal, ExplainerSheet,
 * ProfileModal) clamp their own max-height to this so they never grow tall
 * enough to visually cover it -- a flat "85% of viewport" cap left them
 * covering the header and range selector on most real phone sizes, since
 * that fixed region (with safe-area insets) routinely exceeds 15% of the
 * screen.
 */
export function useHeaderHeight(): number {
  return useContext(HeaderHeightContext);
}
