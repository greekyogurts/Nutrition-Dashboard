import { motion } from 'motion/react';
import type { SupplementWire } from '../data/wire';
import { staggerContainer, staggerItem } from '../lib/motionVariants';

interface Props {
  supplements: SupplementWire[];
}

function SupplementRow({ supplement }: { supplement: SupplementWire }) {
  return (
    <motion.div
      variants={staggerItem}
      className="flex items-center justify-between py-3.5 border-b border-white/[0.06] last:border-none"
    >
      <div>
        <div className="text-sm font-semibold">{supplement.name}</div>
        <div className="text-[11px] opacity-40">{supplement.purpose || ''}</div>
      </div>
      <div className="text-right">
        <div className="text-sm font-bold">{supplement.dosage || ''}</div>
      </div>
    </motion.div>
  );
}

export function SupplementsCard({ supplements }: Props) {
  return (
    <section className="glass-card p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="card-eyebrow">Daily Support</h2>
        <span className="text-[9px] font-bold uppercase tracking-wider opacity-65 border border-white/[0.06] rounded-full px-2 py-[3px]">
          Current cycle
        </span>
      </div>
      <p className="text-[11px] opacity-40 mb-6">Not time-ranged — this is what&apos;s active right now</p>
      {supplements.length
        ? (
          <motion.div variants={staggerContainer} initial="hidden" animate="show">
            {supplements.map((s) => <SupplementRow key={s.id} supplement={s} />)}
          </motion.div>
        )
        : <div className="text-sm opacity-40 py-4">No supplements logged yet.</div>}
    </section>
  );
}
