import { motion } from 'motion/react';
import { useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { RangeKey, RangeSelection } from '../lib/ranges';

interface Props {
  ranges: Array<{ key: RangeKey; label: string }>;
  selection: RangeSelection;
  onChange: (selection: RangeSelection) => void;
}

// Below this, a pointerdown+up is a tap (handled identically to a plain
// click); above it, the gesture is treated as a drag and the tab under the
// pointer at release wins, matching whatever the pill was previewing.
const DRAG_THRESHOLD = 6;

/**
 * Segmented range control. A tap still selects a tab directly, same as a
 * plain button; a horizontal drag anywhere on the bar also works, with the
 * pill following the pointer live so the tab it'll land on is visible before
 * release. Tabs themselves are pointer-events:none — every pointer gesture
 * (tap or drag) is handled once, on the container, so the two input modes
 * can't double-fire or disagree. Keyboard activation (Enter/Space on a
 * focused tab) is unaffected: that's a keyboard event, not a pointer one.
 */
export function RangeSelector({ ranges, selection, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeIndex = Math.max(0, ranges.findIndex((r) => r.key === selection.range));
  const [containerWidth, setContainerWidth] = useState(0);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const dragState = useRef<{ startX: number; dragging: boolean; pointerId: number } | null>(null);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setContainerWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const tabWidth = containerWidth / ranges.length;
  const indexFromClientX = (clientX: number) => {
    const rect = containerRef.current!.getBoundingClientRect();
    const x = clientX - rect.left;
    return Math.min(ranges.length - 1, Math.max(0, Math.floor(x / tabWidth)));
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!tabWidth) return;
    dragState.current = { startX: e.clientX, dragging: false, pointerId: e.pointerId };
    setPreviewIndex(indexFromClientX(e.clientX));
  };
  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const state = dragState.current;
    if (!state || state.pointerId !== e.pointerId) return;
    if (!state.dragging && Math.abs(e.clientX - state.startX) > DRAG_THRESHOLD) {
      state.dragging = true;
      containerRef.current?.setPointerCapture(e.pointerId);
    }
    if (state.dragging) setPreviewIndex(indexFromClientX(e.clientX));
  };
  const handlePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const state = dragState.current;
    if (!state || state.pointerId !== e.pointerId) return;
    const index = indexFromClientX(e.clientX);
    onChange({ range: ranges[index]!.key });
    dragState.current = null;
    setPreviewIndex(null);
  };

  const displayIndex = previewIndex ?? activeIndex;

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-label="Time range"
      className="glass-card relative flex p-1 gap-1 select-none"
      style={{ touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {tabWidth > 0 && (
        <motion.div
          className="absolute top-1 bottom-1 rounded-[10px] bg-white/10 pointer-events-none"
          style={{ width: tabWidth - 4 }}
          animate={{ transform: `translateX(${displayIndex * tabWidth + 2}px)` }}
          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
        />
      )}
      {ranges.map(({ key, label }, i) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={selection.range === key}
          onClick={() => onChange({ range: key })}
          className={`relative z-10 flex-1 min-h-[40px] rounded-[10px] text-xs font-semibold pointer-events-none ${
            i === displayIndex ? 'text-white' : 'text-white/50'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
