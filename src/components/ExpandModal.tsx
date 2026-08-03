import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { useVisualViewportHeight } from '../hooks/useVisualViewportHeight';
import { useHeaderHeight } from '../state/HeaderHeightContext';
import { useSwipeContainer } from '../state/SwipeContainerContext';

// Below this, or without a clear horizontal lean over vertical, a pointer
// move is scrolling/dismissing/just noise -- not "the user is trying to
// swipe to another card." Loosened from 24px / 1.5x as a precaution: the
// panel below sets `touch-action: pan-x` (see the `dragDirectionLock`
// comment), so on a real touchscreen there's a real, if unconfirmed here,
// possibility of the browser's own native handling ending this pointer's
// event stream (a `pointercancel`) before enough pointermove events arrive
// to cross a stricter threshold on their own. Deciding on less evidence,
// sooner, costs nothing (a false-positive would need one axis to dominate
// the other by 20%, which a vertical drag-to-dismiss attempt won't do) and
// gives a shorter window for that to matter.
const HORIZONTAL_SWIPE_THRESHOLD = 14;
const HORIZONTAL_SWIPE_RATIO = 1.2;

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
  const swipeContainer = useSwipeContainer();

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
  //
  // The check runs on pointerup/pointercancel too, not just pointermove --
  // confirmed by inspecting the live DOM that the panel's own `touch-action:
  // pan-x` (from its `drag="y"`, below) lets a real touchscreen hand a
  // horizontal gesture to native panning mid-stream, which can end this
  // pointer's event stream with a `pointercancel` before enough pointermove
  // events arrive to cross the threshold on their own. Checking again on
  // that cancel, using the last position it reported, catches a swipe that
  // was clearly horizontal right up until the moment native handling took
  // it over.
  const swipeCloseState = useRef<{ startX: number; startY: number; pointerId: number; done: boolean } | null>(null);
  const handleOuterPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    swipeCloseState.current = { startX: e.clientX, startY: e.clientY, pointerId: e.pointerId, done: false };
  };
  const checkHorizontalSwipe = (e: ReactPointerEvent<HTMLDivElement>) => {
    const state = swipeCloseState.current;
    if (!state || state.done || state.pointerId !== e.pointerId) return;
    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;
    if (Math.abs(dx) > HORIZONTAL_SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * HORIZONTAL_SWIPE_RATIO) {
      state.done = true;
      handleClose();
    }
  };
  const handleOuterPointerEnd = (e: ReactPointerEvent<HTMLDivElement>) => {
    checkHorizontalSwipe(e);
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

  // Portaled out of the card, to `.swipe-container` (via ref, see
  // SwipeContainerContext) rather than `document.body`. Every caller opens
  // this from inside a card's own `.glass-card` section, and `.glass-card`
  // carries `backdrop-filter` — which creates a new CSS containing block for
  // `position: fixed` descendants. Without *some* portal, "fixed" here
  // resolves against that scrolling card instead of the true viewport, so
  // the panel opens mid-page and drifts as the card scrolls instead of
  // staying pinned to the screen. `ProfileModal`/`ExplainerSheet` don't need
  // a portal at all because they're mounted as siblings of the cards, not
  // inside one.
  //
  // `.swipe-container` specifically, rather than `document.body`, keeps the
  // modal a genuine DOM descendant of the container it's meant to interact
  // with — the panel below sets `drag="y"`, and Motion marks a `drag="y"`
  // element's `touch-action` to let a horizontal touch fall through to
  // native panning rather than capturing it for the vertical drag (confirmed
  // by inspecting the live DOM: `touch-action: pan-x` shows up inline on the
  // panel). A native pan needs a real scrollable ancestor to have anywhere
  // to go, and `.swipe-container` is the one this app would want it to
  // reach. This is a real, verified fact about what Motion sets, not a
  // reproduced bug — targeted CDP-level touch testing here couldn't get the
  // `document.body` version to actually misbehave either. Keeping the modal
  // nested under `.swipe-container` is simply the more correct DOM
  // relationship regardless, and costs nothing to keep.
  return createPortal(
    <div
      className="fixed inset-x-0 z-[110] flex items-end sm:items-center justify-center"
      style={{ top: wrapperTop, height: wrapperHeight ?? `calc(100dvh - ${wrapperTop}px)` }}
      onPointerDown={handleOuterPointerDown}
      onPointerMove={checkHorizontalSwipe}
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
                background: '#2E2924', border: '1px solid rgba(255,240,220,0.1)',
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
              // A precaution, not a proven fix for a specific bug: `drag="y"`
              // makes Motion set `touch-action: pan-x` on the panel (verified
              // by inspecting the live DOM), meaning it's prepared to compete
              // for any touch that starts here, vertical or not. Real touch
              // input always drifts a few px off-axis before a gesture reads
              // as "clearly" one direction, and `dragDirectionLock` is
              // Motion's own documented mechanism for not committing to the
              // vertical drag until movement actually resolves that way —
              // the standard fix for a `drag="y"` element that lives inside
              // (or, as here, alongside) something horizontally swipeable.
              dragDirectionLock
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
    // The ref is populated synchronously on mount, before any card content
    // is interactive, so it's only ever null here in a test/SSR context
    // without a real `.swipe-container` — document.body as a fallback purely
    // to avoid createPortal throwing on a null container in that case.
    swipeContainer ?? document.body,
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
