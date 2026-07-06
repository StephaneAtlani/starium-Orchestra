'use client';

import type { CSSProperties, ReactNode } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { PROJECT_GANTT_TOOLTIP_CONTENT_CLASS } from './project-gantt-entity-tooltip';

const MACRO_TOOLTIP_CONTENT_CLASS = cn(
  PROJECT_GANTT_TOOLTIP_CONTENT_CLASS,
  'z-[100] max-w-none items-start',
);

type MacroGanttBarProps = {
  className?: string;
  style: CSSProperties;
  title?: string;
  tooltipContent?: ReactNode;
  children?: ReactNode;
};

export function MacroGanttBar({
  className,
  style,
  title,
  tooltipContent,
  children,
}: MacroGanttBarProps) {
  if (!tooltipContent) {
    return (
      <div className={className} style={style} title={title}>
        {children}
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger
        className={cn(className, 'cursor-default hover:brightness-110')}
        style={style}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="start"
        sideOffset={8}
        className={MACRO_TOOLTIP_CONTENT_CLASS}
      >
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
}

export function MacroGanttMilestoneDiamond({
  className,
  style,
  tooltipContent,
  label,
}: {
  className?: string;
  style: CSSProperties;
  tooltipContent?: ReactNode;
  label: string;
}) {
  if (!tooltipContent) {
    return (
      <div className={className} style={style} title={label}>
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger
        className={cn(className, 'cursor-default hover:brightness-110')}
        style={style}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label={label}
      >
        <span className="sr-only">{label}</span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="center"
        sideOffset={8}
        className={MACRO_TOOLTIP_CONTENT_CLASS}
      >
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
}
