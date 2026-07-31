import { useEffect } from 'react';

/**
 * Calls `onEscape` while mounted — shared by every modal/sheet shell.
 *
 * Modals can stack (an explainer opened from inside the profile editor sits
 * on top of it), and Escape should only close the topmost one. `stack`
 * tracks mount order; only the most-recently-mounted handler responds.
 */
const stack: Array<() => void> = [];

export function useEscapeKey(onEscape: () => void) {
  useEffect(() => {
    stack.push(onEscape);
    return () => {
      const i = stack.lastIndexOf(onEscape);
      if (i !== -1) stack.splice(i, 1);
    };
  }, [onEscape]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stack[stack.length - 1] === onEscape) onEscape();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onEscape]);
}
