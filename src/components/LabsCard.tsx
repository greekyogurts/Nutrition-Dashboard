import type { LabResultWire } from '../data/wire';

interface Props {
  labResults: LabResultWire[];
}

function LabRow({ lab }: { lab: LabResultWire }) {
  const monitor = (lab.status || '').toLowerCase().includes('monitor');
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-white/[0.06] last:border-none">
      <div>
        <div className="text-sm font-semibold">{lab.test}</div>
        {lab.recommendation && <div className="text-[11px] opacity-40">{lab.recommendation}</div>}
      </div>
      <div className="text-right">
        <div className="text-sm font-bold mb-1">{lab.result}</div>
        <span
          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
            monitor ? 'bg-neon-amber/15 text-neon-amber' : 'bg-neon-green/15 text-neon-green'
          }`}
        >
          {lab.status}
        </span>
      </div>
    </div>
  );
}

export function LabsCard({ labResults }: Props) {
  return (
    <section className="glass-card p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="card-eyebrow">Lab Results</h2>
        <span className="text-[9px] font-bold uppercase tracking-wider opacity-65 border border-white/[0.06] rounded-full px-2 py-[3px]">
          Latest panel
        </span>
      </div>
      <p className="text-[11px] opacity-40 mb-6">Not time-ranged — this is your most recent draw</p>
      {labResults.length
        ? labResults.map((l) => <LabRow key={l.id} lab={l} />)
        : <div className="text-sm opacity-40 py-4">No lab results logged yet.</div>}
    </section>
  );
}
