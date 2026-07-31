import { EXPLAINERS } from '../lib/explainers';

interface Props {
  explainerKey: string;
  onNavigate: (key: string) => void;
  onClose: () => void;
}

export function ExplainerSheet({ explainerKey, onNavigate, onClose }: Props) {
  const e = EXPLAINERS[explainerKey];
  if (!e) return null;

  const related = (e.related ?? []).filter((k) => EXPLAINERS[k]);

  return (
    <div className="fixed inset-x-0 top-0 h-dvh z-[120]">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[6px]" onClick={onClose} />
      <div
        className="absolute left-0 right-0 bottom-0 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-[520px] max-h-[82dvh] overflow-y-auto rounded-t-[20px] sm:rounded-[20px] px-5 pt-2.5 pb-8"
        style={{ background: 'var(--color-glass)', borderTop: '1px solid rgba(255,255,255,0.06)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="explainTitle"
      >
        <div className="w-9 h-[5px] rounded-full bg-white/[0.22] mx-auto mb-4" />
        <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-neon-blue mb-1.5">What this means</div>
        <h2 id="explainTitle" className="text-xl font-bold tracking-tight mb-2.5">{e.term}</h2>
        <div className="text-[15px] leading-normal opacity-90 mb-3.5">{e.short}</div>

        {e.formula && (
          <div
            className="font-mono text-xs leading-relaxed rounded-[10px] px-3.5 py-3 mb-3.5 overflow-x-auto whitespace-pre"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
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
            className="rounded-xl px-3.5 py-3 mt-3.5"
            style={{ background: 'rgba(255,159,10,0.08)', border: '1px solid rgba(255,159,10,0.18)' }}
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
                style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.8)' }}
              >
                {EXPLAINERS[k]!.chip ?? EXPLAINERS[k]!.term}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
