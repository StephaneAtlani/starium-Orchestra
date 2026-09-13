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
 * @see useTablePan, TableContainer (shadcn)
 */
export function StariumTableWrap({
  className,
  children,
  scrollLabel,
  title,
  ...props
}: StariumTableWrapProps) {
  const pan = useTablePan();
  const hasOverflow = useHasHorizontalOverflow(pan.scrollRef);
  const rail = useHorizontalScrollRail(pan.scrollRef);

  return (
    <StariumTablePanContext.Provider value={pan}>
      <div
        ref={pan.scrollRef}
        onPointerDown={pan.onPointerDown}
        data-slot="starium-table-wrap"
        className={cn(
          'starium-table-wrap starium-scroll-hover relative',
          pan.isPanning ? 'cursor-grabbing select-none touch-none' : 'cursor-grab',
          hasOverflow &&
            'after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-6 after:bg-gradient-to-l after:from-background after:to-transparent md:after:hidden',
          className,
        )}
        title={
          title ??
          (scrollLabel ? 'Clic maintenu et glisser pour parcourir le tableau' : undefined)
        }
        aria-label={scrollLabel}
        onMouseEnter={() => {
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
