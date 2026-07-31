import type { ReactNode } from 'react';
import { EXPLAINERS } from '../lib/explainers';
import { useExplainer } from '../state/ExplainerContext';

/** Small "i" bubble that opens the explainer sheet. Sits after a heading. */
export function ExplainChip({ term }: { term: string }) {
  const open = useExplainer();
  const e = EXPLAINERS[term];
  if (!e) return null;

  return (
    <button
      type="button"
      onClick={() => open(term)}
      aria-label={`What is ${e.chip ?? e.term}?`}
      className="inline-flex items-center justify-center w-[15px] h-[15px] p-[13px] -m-[13px] ml-[2px] text-white/45 hover:text-white/90 align-middle"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" className="w-full h-full">
        <circle cx="12" cy="12" r="9.5" />
        <path d="M12 11.2v5" />
        <circle cx="12" cy="7.5" r="1.05" fill="currentColor" stroke="none" />
      </svg>
    </button>
  );
}

/** Inline dashed-underline term that opens the explainer sheet, e.g. "TDEE" in running text. */
export function ExplainTerm({ term, children, className }: { term: string; children: ReactNode; className?: string }) {
  const open = useExplainer();
  if (!EXPLAINERS[term]) return <>{children}</>;

  return (
    <button
      type="button"
      onClick={() => open(term)}
      className={`bg-transparent border-0 p-0 cursor-pointer border-b border-dashed border-white/40 hover:border-white/75 ${className ?? ''}`}
    >
      {children}
    </button>
  );
}
