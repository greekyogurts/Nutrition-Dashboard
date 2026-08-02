import { AnimatePresence, motion, useDragControls } from 'motion/react';
import { useState } from 'react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { useVisualViewportHeight } from '../hooks/useVisualViewportHeight';
import { EXPLAINERS } from '../lib/explainers';
import { useHeaderHeight } from '../state/HeaderHeightContext';

interface Props {
  explainerKey: string;
  onNavigate: (key: string) => void;
  onClose: () => void;
}

export function ExplainerSheet({ explainerKey, onNavigate, onClose }: Props) {
  const [show, setShow] = useState(true);
  const handleClose = () => setShow(false);
  const dragControls = useDragControls();
  const viewportHeight = useVisualViewportHeight();
  const headerHeight = useHeaderHeight();
  useEscapeKey(handleClose);

  const e = EXPLAINERS[explainerKey];
  if (!e) return null;

  const related = (e.related ?? []).filter((k) => EXPLAINERS[k]);

  // Bounding the wrapper itself (not just the panel's max-height) below the
  // fixed header means the backdrop can't cover -- and absorb every tap and
  // swipe over -- the header and range selector either, since `inset-0` on
  // the backdrop is relative to this wrapper.
  const wrapperTop = headerHeight;
  const wrapperHeight = viewportHeight != null ? viewportHeight - headerHeight : undefined;

  return (
    <div
      className="fixed inset-x-0 z-[120]"
      style={{ top: wrapperTop, height: wrapperHeight ?? `calc(100dvh - ${wrapperTop}px)` }}
    >
      <AnimatePresence onExitComplete={onClose}>
        {show && (
          <>
            <motion.div
              key="backdrop"
              className="absolute inset-0 bg-black/55 backdrop-blur-[6px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={handleClose}
            />
            <motion.div
              key="panel"
              className="absolute left-0 right-0 bottom-0 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-[520px] max-h-full overflow-y-auto rounded-t-[20px] sm:rounded-[20px] px-5 pt-2.5 pb-8"
              style={{
                background: 'var(--color-glass-elevated)', borderTop: '1px solid rgba(255,255,255,0.08)',
                paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))',
              }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="explainTitle"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 34 }}
              drag="y"
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_evt, info) => {
                if (info.offset.y > 90 || info.velocity.y > 600) handleClose();
              }}
            >
        <div
          className="flex justify-center py-3 -mt-3 mb-1"
          style={{ touchAction: 'none' }}
          onPointerDown={(evt) => dragControls.start(evt)}
        >
          <div className="w-9 h-[5px] rounded-full bg-white/[0.22]" />
        </div>
        <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-neon-blue mb-1.5">What this means</div>
        <h2 id="explainTitle" className="text-xl font-bold tracking-tight mb-2.5">{e.term}</h2>
        <div className="text-[15px] leading-normal opacity-90 mb-3.5">{e.short}</div>

        {e.formula && (
          <div
            className="font-mono text-xs leading-relaxed rounded-[10px] px-3.5 py-3 mb-3.5 overflow-x-auto whitespace-pre"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {e.formula}
          </div>
        )}

        {e.body.length > 0 && (
          <div>
            {e.body.map((p, i) => (
              // Registry content is static, authored copy — not user input.
              <p key={i} className="text-[13px] leading-[1.62] opacity-70 mb-2.5 last:mb-0" dangerouslySetInnerHTML={{ __html: p }} />
            ))}
          </div>
        )}

        {e.caveat && (
          <div
            className="rounded-xl px-3.5 py-3 mt-3.5 bg-neon-amber/10 border border-neon-amber/20"
          >
            <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-neon-amber mb-1">Worth knowing</div>
            <div className="text-[12.5px] leading-[1.55] opacity-85">{e.caveat}</div>
          </div>
        )}

        {related.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {related.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => onNavigate(k)}
                className="text-xs font-semibold px-3 py-[7px] min-h-[34px] rounded-full"
                style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.8)' }}
              >
                {EXPLAINERS[k]!.chip ?? EXPLAINERS[k]!.term}
              </button>
            ))}
          </div>
        )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
