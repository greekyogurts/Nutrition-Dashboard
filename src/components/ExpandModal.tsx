import type { ReactNode } from 'react';

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
 */
export function ExpandModal({ title, onClose, children }: Props) {
  return (
    <div className="fixed inset-x-0 top-0 h-dvh z-[110] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/72" onClick={onClose} />
      <div
        className="relative w-full sm:max-w-[560px] max-h-[85dvh] flex flex-col p-5 rounded-t-[20px] sm:rounded-[20px]"
        style={{ background: '#141416', border: '1px solid rgba(255,255,255,0.06)', borderTop: '2px solid var(--color-neon-blue)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="expandModalTitle"
      >
        <div className="flex items-start justify-between gap-3 mb-4 flex-shrink-0">
          <h2 id="expandModalTitle" className="text-base font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mt-2 -mr-2 w-11 h-11 flex-shrink-0 flex items-center justify-center text-2xl text-white/50 active:text-white"
          >
            &times;
          </button>
        </div>
        <div className="overflow-y-auto min-h-0">{children}</div>
      </div>
    </div>
  );
}

/** The vanilla's .expand-chart-wrap — a fixed-height container for a full-size chart. */
export function ExpandChartWrap({ children }: { children: ReactNode }) {
  return <div className="relative h-[50vh] min-h-[280px]">{children}</div>;
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
