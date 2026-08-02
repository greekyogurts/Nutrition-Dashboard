import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { useVisualViewportHeight } from '../hooks/useVisualViewportHeight';
import { useHeaderHeight } from '../state/HeaderHeightContext';

// Below this, or without a clear horizontal lean over vertical, a pointer
// move is scrolling/dismissing/just noise -- not "the user is trying to
// swipe to another card."
const HORIZONTAL_SWIPE_THRESHOLD = 24;

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Shared tap-to-expand modal shell — the vanilla's single #expandModal,
 * repopulated by whichever card opened it. Every card owns its own "which
 * thing is expanded" state and renders its own content into this shell;
 * there's no registry here, unlike ExplainerContext, because expand targets
 * are local to one card rather than referenced from several.
 *
 * `onClose` unmounts this component from the parent, which happens
 * synchronously — there's no AnimatePresence wrapper at any of those call
 * sites to hold it open for an exit animation. So AnimatePresence lives
 * here instead, gated on local `show` state; the real `onClose` only fires
 * from `onExitComplete`, once the exit animation (or a drag-to-dismiss
 * release) has actually finished, so the unmount itself is invisible.
 */
export function ExpandModal({ title, onClose, children }: Props) {
  const [show, setShow] = useState(true);
  const handleClose = () => setShow(false);
  const dragControls = useDragControls();
  const viewportHeight = useVisualViewportHeight();
  const headerHeight = useHeaderHeight();
  const reduceMotion = useReducedMotion();

  // A list that's taller than the modal needs its scroll gesture protected
  // (the header stays the only drag handle, as before). A chart never
  // overflows this box, so there's no scroll to protect — safe to let a
  // swipe start from anywhere on it, which is what "swipe a chart closed"
  // actually needs. Measured rather than guessed per-caller, since this
  // shell doesn't otherwise know whether `children` is a chart or a list.
  const [bodyScrollable, setBodyScrollable] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const check = () => setBodyScrollable(el.scrollHeight > el.clientHeight + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEscapeKey(handleClose);

  // Relying on the card underneath becoming inactive (once its own swipe
  // container scrolls) to close this isn't enough on its own -- the modal
  // is `position: fixed` and covers the swipe container entirely, so
  // whether a horizontal drag actually bleeds through to it as a native
  // scroll depends on touch-action details that vary by browser and by
  // whether the body underneath is scrollable. Detecting horizontal intent
  // directly, on the modal's own outer wrapper, doesn't depend on any of
  // that: as soon as a drag leans clearly horizontal, close immediately so
  // the swipe-container underneath is revealed (and swipeable again),
  // rather than staying orphaned on top of whichever card the swipe was
  // headed for.
  const swipeCloseState = useRef<{ startX: number; startY: number; pointerId: number; done: boolean } | null>(null);
  const handleOuterPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    swipeCloseState.current = { startX: e.clientX, startY: e.clientY, pointerId: e.pointerId, done: false };
  };
  const handleOuterPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const state = swipeCloseState.current;
    if (!state || state.done || state.pointerId !== e.pointerId) return;
    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;
    if (Math.abs(dx) > HORIZONTAL_SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.5) {
      state.done = true;
      handleClose();
    }
  };
  const handleOuterPointerEnd = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (swipeCloseState.current?.pointerId === e.pointerId) swipeCloseState.current = null;
  };

  // The wrapper (backdrop + panel together) is bounded to start below the
  // fixed header block, not just the panel -- capping only the panel's
  // max-height left the backdrop still covering (and absorbing every tap
  // and swipe over) the header and range selector, since `inset-0` on the
  // backdrop is relative to *this* wrapper. Starting the wrapper itself
  // below the header means neither backdrop nor panel can ever reach it.
  const wrapperTop = headerHeight;
  const wrapperHeight = viewportHeight != null ? viewportHeight - headerHeight : undefined;

  // Portaled to `document.body` rather than rendered in place: every caller
  // opens this from inside a card's own `.glass-card` section, and
  // `.glass-card` carries `backdrop-filter` — which creates a new CSS
  // containing block for `position: fixed` descendants. Without the portal,
  // "fixed" here resolves against that scrolling card instead of the true
  // viewport, so the panel opens mid-page and drifts as the card scrolls
  // instead of staying pinned to the screen. `ProfileModal`/`ExplainerSheet`
  // don't need this because they're mounted as siblings of the cards, not
  // inside one.
  return createPortal(
    <div
      className="fixed inset-x-0 z-[110] flex items-end sm:items-center justify-center"
      style={{ top: wrapperTop, height: wrapperHeight ?? `calc(100dvh - ${wrapperTop}px)` }}
      onPointerDown={handleOuterPointerDown}
      onPointerMove={handleOuterPointerMove}
      onPointerUp={handleOuterPointerEnd}
      onPointerCancel={handleOuterPointerEnd}
    >
      <AnimatePresence onExitComplete={onClose}>
        {show && (
          <>
            <motion.div
              key="backdrop"
              className="absolute inset-0 bg-black/72"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              transition={{ duration: 0.2 }}
              onClick={handleClose}
            />
            <motion.div
              key="panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="expandModalTitle"
              className="relative w-full sm:max-w-[560px] max-h-full flex flex-col p-5 rounded-t-[20px] sm:rounded-[20px]"
              style={{
                background: '#262626', border: '1px solid rgba(255,255,255,0.08)',
                paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))',
              }}
              initial={reduceMotion ? { opacity: 0 } : { y: '100%' }}
              animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
              exit={reduceMotion
                ? { opacity: 0, transition: { duration: 0.15 } }
                : { y: '100%', transition: { type: 'tween', duration: 0.22, ease: [0.4, 0, 1, 1] } }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              drag={reduceMotion ? false : 'y'}
              dragControls={dragControls}
              dragListener={!bodyScrollable}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_e, info) => {
                if (info.offset.y > 90 || info.velocity.y > 600) handleClose();
              }}
            >
              <div
                className="flex items-start justify-between gap-3 mb-4 flex-shrink-0"
                style={{ touchAction: 'none' }}
                onPointerDown={(e) => { if (bodyScrollable) dragControls.start(e); }}
              >
                <h2 id="expandModalTitle" className="text-base font-bold">{title}</h2>
                <button
                  type="button"
                  onClick={handleClose}
                  onPointerDown={(e) => e.stopPropagation()}
                  aria-label="Close"
                  className="-mt-2 -mr-2 w-11 h-11 flex-shrink-0 flex items-center justify-center text-2xl text-white/50 active:text-white"
                  style={{ touchAction: 'auto' }}
                >
                  &times;
                </button>
              </div>
              <div ref={bodyRef} className="overflow-y-auto min-h-0">{children}</div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}

/** The vanilla's .expand-chart-wrap — a fixed-height container for a full-size chart. */
export function ExpandChartWrap({ children }: { children: ReactNode }) {
  return <div className="relative h-[50dvh] min-h-[280px]">{children}</div>;
}

export function ExpandListRow({ label, sub, value }: { label: string; sub?: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-white/[0.06] last:border-none">
      <div>
        <div className="text-sm font-semibold">{label}</div>
        {sub && <div className="text-[11px] opacity-40">{sub}</div>}
      </div>
      <div className="text-sm font-bold">{value}</div>
    </div>
  );
}
