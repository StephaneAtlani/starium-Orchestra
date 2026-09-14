'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { useHasHorizontalOverflow } from '@/hooks/use-has-horizontal-overflow';
import { useTablePan } from '@/hooks/use-table-pan';
import {
  TableHorizontalScrollRail,
  useHorizontalScrollRail,
} from '@/components/ui/table-horizontal-scroll-rail';

type TablePanApi = ReturnType<typeof useTablePan>;

const StariumTablePanContext = React.createContext<TablePanApi | null>(null);

/** Grab/pan du conteneur `StariumTableWrap` parent (évite les clics après glisser). */
export function useStariumTablePan(): TablePanApi {
  const ctx = React.useContext(StariumTablePanContext);
  const fallbackRef = React.useRef<HTMLDivElement>(null);
  if (ctx) return ctx;
  return {
    scrollRef: fallbackRef,
    isPanning: false,
    onPointerDown: () => undefined,
    onMouseDown: () => undefined,
    shouldSuppressClick: () => false,
  };
}

export type StariumTableWrapProps = React.ComponentProps<'div'> & {
  /** Indication accessibilité : glisser pour faire défiler horizontalement. */
  scrollLabel?: string;
};

/**
 * Conteneur scroll horizontal pour tableaux `starium-dt` — grab/pan souris et doigt.
 * Rail custom uniquement si overflow réel (> 24px) ; pas de `title` natif (tooltip intrusif).
 */
export function StariumTableWrap({
  className,
  children,
  scrollLabel,
  title: _title,
  ...props
}: StariumTableWrapProps) {
  const pan = useTablePan();
  const hasOverflow = useHasHorizontalOverflow(pan.scrollRef);
  const rail = useHorizontalScrollRail(pan.scrollRef);

  return (
    <StariumTablePanContext.Provider value={pan}>
      <div
        ref={pan.scrollRef}
        onPointerDown={hasOverflow ? pan.onPointerDown : undefined}
        data-slot="starium-table-wrap"
        data-table-overflow={hasOverflow ? 'true' : 'false'}
        className={cn(
          'starium-table-wrap relative',
          hasOverflow && 'starium-scroll-hover',
          hasOverflow
            ? pan.isPanning
              ? 'cursor-grabbing select-none touch-none'
              : 'cursor-grab'
            : 'cursor-default',
          hasOverflow &&
            'after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-6 after:bg-gradient-to-l after:from-background after:to-transparent md:after:hidden',
          className,
        )}
        aria-label={hasOverflow ? scrollLabel : undefined}
        onMouseEnter={() => {
          if (!hasOverflow && !rail.overflow) return;
          rail.setHover(true);
          rail.sync();
        }}
        onMouseLeave={() => {
          if (!rail.dragging) rail.setHover(false);
        }}
        {...props}
      >
        {children}
        {rail.overflow ? (
          <TableHorizontalScrollRail
            visible={rail.railVisible}
            thumb={rail.thumb}
            dragging={rail.dragging}
            onRailPointerDown={rail.onRailPointerDown}
            onThumbPointerDown={rail.onThumbPointerDown}
          />
        ) : null}
      </div>
    </StariumTablePanContext.Provider>
  );
}
