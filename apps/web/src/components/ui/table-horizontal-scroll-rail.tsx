'use client';

import {
  useCallback,
  useEffect,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import { cn } from '@/lib/utils';

type Thumb = { offset: number; size: number };

/**
 * Rail HTML horizontal — visible au survol (macOS overlay native souvent invisible).
 */
export function useHorizontalScrollRail(scrollRef: RefObject<HTMLElement | null>) {
  const [overflow, setOverflow] = useState(false);
  const [hover, setHover] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [thumb, setThumb] = useState<Thumb>({ offset: 0, size: 48 });

  const sync = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const overflowPx = scrollWidth - clientWidth;
    const hasOverflow = overflowPx > 8;
    setOverflow(hasOverflow);
    if (!hasOverflow) return;
    const ratio = clientWidth / scrollWidth;
    const size = Math.max(40, Math.round(clientWidth * ratio));
    const maxOffset = Math.max(0, clientWidth - size);
    const offset =
      overflowPx <= 0 ? 0 : Math.round((scrollLeft / overflowPx) * maxOffset);
    setThumb({ offset, size });
  }, [scrollRef]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    sync();
    el.addEventListener('scroll', sync, { passive: true });
    if (typeof ResizeObserver === 'undefined') {
      return () => el.removeEventListener('scroll', sync);
    }
    const ro = new ResizeObserver(() => sync());
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', sync);
    };
  }, [scrollRef, sync]);

  const onThumbPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const el = scrollRef.current;
    if (!el) return;
    const startX = e.clientX;
    const startScroll = el.scrollLeft;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const track = el.clientWidth - thumb.size;
    if (track <= 0 || maxScroll <= 0) return;

    setDragging(true);
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      const delta = ev.clientX - startX;
      el.scrollLeft = startScroll + (delta / track) * maxScroll;
    };
    const onUp = (ev: PointerEvent) => {
      setDragging(false);
      target.releasePointerCapture(ev.pointerId);
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', onUp);
      target.removeEventListener('pointercancel', onUp);
    };
    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', onUp);
    target.addEventListener('pointercancel', onUp);
  };

  const onRailPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).dataset.thumb === 'true') return;
    const el = scrollRef.current;
    if (!el) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const track = el.clientWidth - thumb.size;
    if (track <= 0 || maxScroll <= 0) return;
    const next = Math.min(track, Math.max(0, x - thumb.size / 2));
    el.scrollLeft = (next / track) * maxScroll;
  };

  const railVisible = overflow && (hover || dragging);

  return {
    overflow,
    hover,
    setHover,
    dragging,
    thumb,
    railVisible,
    sync,
    onThumbPointerDown,
    onRailPointerDown,
  };
}

export function TableHorizontalScrollRail(props: {
  visible: boolean;
  thumb: Thumb;
  onRailPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onThumbPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  dragging: boolean;
}) {
  const { visible, thumb, onRailPointerDown, onThumbPointerDown, dragging } = props;
  return (
    <div
      role="presentation"
      aria-hidden
      className={cn(
        'starium-table-h-rail absolute inset-x-1 bottom-0.5 z-20 h-3 rounded-full transition-opacity duration-[var(--duration-fast)]',
        visible
          ? 'pointer-events-auto opacity-100'
          : 'pointer-events-none opacity-0',
      )}
      onPointerDown={onRailPointerDown}
    >
      <div
        data-thumb="true"
        className={cn(
          'starium-table-h-rail__thumb absolute top-0.5 bottom-0.5 cursor-grab active:cursor-grabbing',
          dragging && 'starium-table-h-rail__thumb--active',
        )}
        style={{ left: thumb.offset, width: thumb.size }}
        onPointerDown={onThumbPointerDown}
      />
    </div>
  );
}
