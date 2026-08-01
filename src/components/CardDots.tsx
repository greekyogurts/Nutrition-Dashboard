import { useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

interface Props {
  cards: ReadonlyArray<{ id: string; label: string }>;
  active: number;
  onSelect: (index: number) => void;
}

// Below this, a pointerdown+up is a tap (jumps straight to that card); above
// it, the gesture is a drag and the dot under the pointer at release wins.
const DRAG_THRESHOLD = 6;

/**
 * Card-navigation dots, draggable the same way as the range selector's
 * segmented control: tap still jumps straight to a card, and a horizontal
 * drag anywhere across the row also works, previewing which dot you'll land
 * on before you let go. No separate motion.div indicator is needed here --
 * `.swipe-dot[aria-selected]`'s existing width/color CSS transition already
 * is "the blue swiping animation," so driving `aria-selected` off a live
 * preview index during the drag reuses it as-is.
 */
export function CardDots({ cards, active, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
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

  const dotWidth = containerWidth / cards.length;
  const indexFromClientX = (clientX: number) => {
    const rect = containerRef.current!.getBoundingClientRect();
    const x = clientX - rect.left;
    return Math.min(cards.length - 1, Math.max(0, Math.floor(x / dotWidth)));
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dotWidth) return;
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
    onSelect(indexFromClientX(e.clientX));
    dragState.current = null;
    setPreviewIndex(null);
  };

  const displayIndex = previewIndex ?? active;

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-label="Cards"
      className="flex-shrink-0 flex justify-center gap-1 py-2 select-none"
      style={{ touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {cards.map((card, i) => (
        <button
          key={card.id}
          type="button"
          role="tab"
          className="swipe-dot pointer-events-none"
          aria-selected={i === displayIndex}
          aria-label={card.label}
        />
      ))}
    </div>
  );
}
