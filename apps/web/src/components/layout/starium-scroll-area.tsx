'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type PointerEvent as ReactPointerEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

type ScrollLayout = 'fill' | 'flow' | 'auto';

/** Distance (px) au bord droit pour révéler le rail en mode `edge`. */
export const STARIUM_SCROLL_EDGE_REVEAL_PX = 40;

type Props = {
  children: ReactNode;
  className?: string;
  /** Classes sur le viewport scrollable (padding, etc.). */
  viewportClassName?: string;
  /**
   * `hover` (défaut) : rail visible au survol — **norme modales Starium** (`DialogBody`).
   * `edge` : rail visible seulement près du bord droit (workspace page).
   * `always` : rail toujours visible dès qu’il y a overflow.
   * `never` : aucun rail — scroll molette / trackpad uniquement (cas exceptionnels).
   */
  reveal?: 'hover' | 'edge' | 'always' | 'never';
  /**
   * `flow` (défaut via auto) : le contenu définit la hauteur — pour modales auto-size.
   * `fill` : viewport `absolute inset-0` — parent **doit** avoir une hauteur définie (`h-full`, etc.).
   * `auto` : `fill` si `className` contient une hauteur explicite, sinon `flow`.
   */
  layout?: ScrollLayout;
} & Omit<ComponentPropsWithoutRef<'div'>, 'children' | 'className'>;

function resolveScrollLayout(
  layout: ScrollLayout | undefined,
  className?: string,
): 'fill' | 'flow' {
  if (layout === 'fill' || layout === 'flow') return layout;
  if (
    className &&
    /(?:^|[\s])(?:!)?h-(?:full|screen|svh|lvh|dvh|\d|\[)/.test(className)
  ) {
    return 'fill';
  }
  return 'flow';
}

/**
 * Zone scrollable avec **barre custom** (rail HTML) — fiable sous macOS
 * où la scrollbar native overlay est invisible.
 */
export function StariumScrollArea({
  children,
  className,
  viewportClassName,
  reveal = 'hover',
  layout = 'auto',
  ...props
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);
  const [hover, setHover] = useState(false);
  const [nearEdge, setNearEdge] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [thumb, setThumb] = useState({ top: 0, height: 48 });
  const resolved = resolveScrollLayout(layout, className);
  const fill = resolved === 'fill';

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
    if (typeof ResizeObserver === 'undefined') {
      el.addEventListener('scroll', sync, { passive: true });
      return () => el.removeEventListener('scroll', sync);
    }
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

  const updateEdgeProximity = useCallback(
    (clientX: number) => {
      if (reveal !== 'edge') return;
      const root = rootRef.current;
      if (!root) return;
      const rect = root.getBoundingClientRect();
      const distFromRight = rect.right - clientX;
      setNearEdge(distFromRight <= STARIUM_SCROLL_EDGE_REVEAL_PX);
    },
    [reveal],
  );

  const onMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    updateEdgeProximity(e.clientX);
  };

  const revealActive =
    reveal !== 'never' &&
    (reveal === 'always' ||
      dragging ||
      (reveal === 'hover' && hover) ||
      (reveal === 'edge' && nearEdge));

  /** Affordance : rail uniquement au survol / edge / always / drag — jamais en `never`. */
  const railVisible = overflow && revealActive;
  const showRailChrome = overflow && reveal !== 'never';

  return (
    <div
      {...props}
      ref={rootRef}
      data-starium-scroll=""
      data-scroll-layout={resolved}
      data-reveal={reveal}
      data-scroll-hover={revealActive ? true : undefined}
      className={cn('relative min-h-0', className)}
      onMouseEnter={(e) => {
        if (reveal === 'hover') {
          setHover(true);
        } else if (reveal === 'edge') {
          updateEdgeProximity(e.clientX);
        }
        sync();
      }}
      onMouseMove={reveal === 'edge' ? onMouseMove : undefined}
      onMouseLeave={() => {
        if (!dragging) {
          setHover(false);
          setNearEdge(false);
        }
      }}
    >
      <div
        ref={viewportRef}
        data-slot="starium-scroll-viewport"
        className={cn(
          'starium-scroll-area__viewport overflow-x-hidden overflow-y-auto overscroll-contain',
          /* Cache la scrollbar native — on affiche le rail custom. */
          '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
          fill
            ? 'absolute inset-0'
            : 'relative max-h-full w-full',
          viewportClassName,
        )}
      >
        {children}
      </div>

      {showRailChrome ? (
        <div
          role="presentation"
          aria-hidden
          className={cn(
            'starium-scroll-area__rail-track absolute inset-y-1 right-0.5 z-30 w-3 rounded-full transition-opacity duration-[var(--duration-fast)]',
            railVisible
              ? 'pointer-events-auto opacity-100'
              : 'pointer-events-none opacity-0',
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
