import { AnimatePresence, motion, useDragControls } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { useVisualViewportHeight } from '../hooks/useVisualViewportHeight';

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

  return (
    <div className="fixed inset-x-0 top-0 h-dvh z-[110] flex items-end sm:items-center justify-center">
      <AnimatePresence onExitComplete={onClose}>
        {show && (
          <>
            <motion.div
              key="backdrop"
              className="absolute inset-0 bg-black/72"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={handleClose}
            />
            <motion.div
              key="panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="expandModalTitle"
              className="relative w-full sm:max-w-[560px] max-h-[85dvh] flex flex-col p-5 rounded-t-[20px] sm:rounded-[20px]"
              style={{
                background: '#141416', border: '1px solid rgba(255,255,255,0.06)',
                paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))',
                ...(viewportHeight != null ? { maxHeight: viewportHeight * 0.85 } : {}),
              }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              drag="y"
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
    </div>
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
