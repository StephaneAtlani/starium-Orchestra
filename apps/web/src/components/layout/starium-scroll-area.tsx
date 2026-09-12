'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

type Props = {
  children: ReactNode;
  className?: string;
  /** Classes sur le viewport scrollable (padding, etc.). */
  viewportClassName?: string;
  /**
   * `hover` (défaut) : rail visible au survol / pendant le drag.
   * `always` : rail toujours visible dès qu’il y a overflow.
   */
  reveal?: 'hover' | 'always';
} & Omit<ComponentPropsWithoutRef<'div'>, 'children' | 'className'>;

/**
 * Zone scrollable avec **barre custom** (rail HTML) — fiable sous macOS
 * où la scrollbar native overlay est invisible.
 */
export function StariumScrollArea({
  children,
  className,
  viewportClassName,
  reveal = 'hover',
  ...props
}: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);
  const [hover, setHover] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [thumb, setThumb] = useState({ top: 0, height: 48 });

  const sync = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const overflowPx = scrollHeight - clientHeight;
    const hasOverflow = overflowPx > 8;
    setOverflow(hasOverflow);
    if (!hasOverflow) return;
    const ratio = clientHeight / scrollHeight;
    const height = Math.max(40, Math.round(clientHeight * ratio));
    const maxTop = Math.max(0, clientHeight - height);
    const top =
      overflowPx <= 0
        ? 0
        : Math.round((scrollTop / overflowPx) * maxTop);
    setThumb({ top, height });
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    sync();
    const ro = new ResizeObserver(() => sync());
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    el.addEventListener('scroll', sync, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', sync);
    };
  }, [sync, children]);

  const onThumbPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const el = viewportRef.current;
    if (!el) return;
    const startY = e.clientY;
    const startScroll = el.scrollTop;
    const { scrollHeight, clientHeight } = el;
    const maxScroll = scrollHeight - clientHeight;
    const track = clientHeight - thumb.height;
    if (track <= 0 || maxScroll <= 0) return;

    setDragging(true);
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      const delta = ev.clientY - startY;
      el.scrollTop = startScroll + (delta / track) * maxScroll;
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
    const el = viewportRef.current;
    if (!el) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const { scrollHeight, clientHeight } = el;
    const maxScroll = scrollHeight - clientHeight;
    const track = clientHeight - thumb.height;
    if (track <= 0 || maxScroll <= 0) return;
    const nextTop = Math.min(track, Math.max(0, y - thumb.height / 2));
    el.scrollTop = (nextTop / track) * maxScroll;
  };

  const showRail =
    overflow && (reveal === 'always' || hover || dragging);

  return (
    <div
      {...props}
      className={cn('relative min-h-0', className)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        if (!dragging) setHover(false);
      }}
    >
      <div
        ref={viewportRef}
        className={cn(
          'starium-scroll-area__viewport absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain',
          /* Cache la scrollbar native — on affiche le rail custom. */
          '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
          viewportClassName,
        )}
      >
        {children}
      </div>

      {overflow ? (
        <div
          role="presentation"
          aria-hidden
          className={cn(
            'starium-scroll-area__rail-track absolute inset-y-1 right-0.5 z-20 w-3 rounded-full transition-opacity duration-[var(--duration-fast)]',
            showRail
              ? 'pointer-events-auto opacity-100'
              : 'pointer-events-none opacity-0',
            /* Toujours en DOM dès overflow — opacity gère le reveal au survol */
          )}
          onPointerDown={onRailPointerDown}
        >
          <div
            data-thumb="true"
            className={cn(
              'starium-scroll-area__thumb absolute left-0.5 right-0.5 cursor-grab active:cursor-grabbing',
              dragging && 'starium-scroll-area__thumb--active',
            )}
            style={{ top: thumb.top, height: thumb.height }}
            onPointerDown={onThumbPointerDown}
          />
        </div>
      ) : null}
    </div>
  );
}
