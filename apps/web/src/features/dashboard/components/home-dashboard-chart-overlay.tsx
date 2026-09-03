'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { useFullscreenPortalContainer } from '@/hooks/use-fullscreen-portal-container';

export type HomeChartOverlayState = {
  clientX: number;
  clientY: number;
  title: string;
  lines: { label: string; value: string; color?: string }[];
} | null;

type Props = {
  overlay: HomeChartOverlayState;
};

/**
 * Overlay flottant commun aux graphiques du dashboard home (hover).
 */
export function HomeDashboardChartOverlay({ overlay }: Props) {
  const portalContainer = useFullscreenPortalContainer();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready || !overlay) return null;

  const node = (
    <div
      role="tooltip"
      className={cn(
        'pointer-events-none fixed z-[80] max-w-[16rem] -translate-x-1/2 -translate-y-[calc(100%+10px)]',
        'rounded-lg border border-border/70 bg-card px-2.5 py-2 text-xs shadow-[var(--shadow-3)]',
      )}
      style={{ left: overlay.clientX, top: overlay.clientY }}
    >
      <p className="font-semibold text-foreground">{overlay.title}</p>
      <ul className="mt-1 space-y-0.5">
        {overlay.lines.map((line) => (
          <li
            key={line.label}
            className="flex items-center gap-1.5 text-muted-foreground"
          >
            {line.color ? (
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: line.color }}
                aria-hidden
              />
            ) : null}
            <span>
              {line.label} :{' '}
              <span className="font-medium tabular-nums text-foreground">
                {line.value}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );

  return createPortal(node, portalContainer ?? document.body);
}
