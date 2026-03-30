'use client';

import type { CSSProperties, ReactNode } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PortfolioGanttSidebarTooltipContent } from './portfolio-gantt-sidebar-tooltip';
import type { PortfolioGanttRow } from '../types/project.types';
import { cn } from '@/lib/utils';

export const PORTFOLIO_GANTT_TOOLTIP_CONTENT_CLASS =
  'max-w-[min(34rem,calc(100vw-2rem))] flex-col items-start gap-0 px-3 py-2.5 text-left';

type PortfolioGanttProjectTooltipProps = {
  row: PortfolioGanttRow;
  /** Côté préféré ; le positionnement peut s’inverser près des bords (collision). */
  side: 'top' | 'right' | 'bottom' | 'left';
  align: 'start' | 'center' | 'end';
  sideOffset?: number;
  alignOffset?: number;
  triggerClassName?: string;
  triggerStyle?: CSSProperties;
  children: ReactNode;
};

/**
 * Infobulle projet (validation, étiquettes, parties prenantes) — même contenu liste + frise.
 */
export function PortfolioGanttProjectTooltip({
  row,
  side,
  align,
  sideOffset = 8,
  alignOffset = 0,
  triggerClassName,
  triggerStyle,
  children,
}: PortfolioGanttProjectTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        className={cn('cursor-pointer', triggerClassName)}
        style={triggerStyle}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        className={cn(PORTFOLIO_GANTT_TOOLTIP_CONTENT_CLASS, 'z-[100]')}
      >
        <PortfolioGanttSidebarTooltipContent row={row} />
      </TooltipContent>
    </Tooltip>
  );
}
