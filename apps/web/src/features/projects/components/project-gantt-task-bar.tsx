'use client';

import type { ReactNode } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  GANTT_BAR_TONE_DEFAULT,
  type GanttBarTone,
} from '../lib/gantt-bar-palette';
import { PROJECT_GANTT_TOOLTIP_CONTENT_CLASS } from './project-gantt-entity-tooltip';

const HANDLE_MAX_PX = 8;
const LINK_PORT_PX = 6;

type BarMode = 'move' | 'resize-start' | 'resize-end';

export function ProjectGanttTaskBar({
  taskId,
  leftPx,
  barW,
  progress,
  canEdit,
  title,
  onPointerDownBar,
  onLinkOutPointerDown,
  showLinkPorts,
  tone = GANTT_BAR_TONE_DEFAULT,
  summaryStacked = false,
  statusLabel,
  isLate = false,
  tooltipContent,
}: {
  taskId: string;
  leftPx: number;
  barW: number;
  progress: number;
  canEdit: boolean;
  title: string;
  onPointerDownBar: (mode: BarMode, e: React.PointerEvent) => void;
  onLinkOutPointerDown?: (e: React.PointerEvent) => void;
  showLinkPorts?: boolean;
  tone?: GanttBarTone;
  summaryStacked?: boolean;
  statusLabel?: string;
  isLate?: boolean;
  tooltipContent?: ReactNode;
}) {
  const linkHandles = Boolean(canEdit && showLinkPorts && onLinkOutPointerDown);
  const barInset = summaryStacked ? 'top-3 bottom-1.5' : 'top-2 bottom-2';
  const tip = `${title} — ${progress} %${statusLabel ? ` — ${statusLabel}` : ''}`;
  const nativeTitle = tooltipContent ? undefined : tip;

  const tooltipShell = (trigger: ReactNode) =>
    tooltipContent ? (
      <Tooltip>
        {trigger}
        <TooltipContent
          side="top"
          align="start"
          sideOffset={8}
          className={cn(
            PROJECT_GANTT_TOOLTIP_CONTENT_CLASS,
            'z-[100] max-w-none items-start',
          )}
        >
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    ) : (
      trigger
    );

  if (!canEdit) {
    const trigger = tooltipContent ? (
      <TooltipTrigger
        className={cn(
          tone.track,
          'absolute cursor-default rounded-sm',
          barInset,
          isLate && 'ring-1 ring-destructive/80 ring-offset-1 ring-offset-background',
        )}
        style={{ left: leftPx, width: barW }}
      >
        <div
          className={cn(tone.progress, 'h-full rounded-sm')}
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </TooltipTrigger>
    ) : (
      <div
        className={cn(
          tone.track,
          'absolute rounded-sm',
          barInset,
          isLate && 'ring-1 ring-destructive/80 ring-offset-1 ring-offset-background',
        )}
        style={{ left: leftPx, width: barW }}
        title={nativeTitle}
      >
        <div
          className={cn(tone.progress, 'h-full rounded-sm')}
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>
    );
    return tooltipShell(trigger);
  }

  const handleW = Math.min(HANDLE_MAX_PX, Math.max(3, barW / 3));

  const editableInner = (
    <>
      <div
        role="separator"
        aria-label="Ajuster le début"
        className={cn(
          'z-[3] shrink-0 cursor-ew-resize rounded-l-sm',
          tone.handleLeft,
        )}
        style={{ width: handleW, minWidth: handleW }}
        onPointerDown={(e) => {
          e.stopPropagation();
          onPointerDownBar('resize-start', e);
        }}
      />
      {linkHandles && (
        <div
          data-gantt-link-in=""
          data-task-id={taskId}
          aria-label="Port entrée lien"
          className={cn(
            'z-[4] shrink-0 cursor-cell border-y',
            tone.linkPort,
          )}
          style={{ width: LINK_PORT_PX, minWidth: LINK_PORT_PX }}
        />
      )}
      <div
        className={cn(
          tone.track,
          'relative min-w-0 flex-1 cursor-grab active:cursor-grabbing',
        )}
        onPointerDown={(e) => onPointerDownBar('move', e)}
      >
        <div
          className={cn(tone.progress, 'h-full rounded-sm')}
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>
      {linkHandles && (
        <div
          data-gantt-link-out=""
          data-task-id={taskId}
          aria-label="Port sortie lien"
          className={cn(
            'z-[4] shrink-0 cursor-crosshair border-y',
            tone.linkPort,
          )}
          style={{ width: LINK_PORT_PX, minWidth: LINK_PORT_PX }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onLinkOutPointerDown?.(e);
          }}
        />
      )}
      <div
        role="separator"
        aria-label="Ajuster la fin"
        className={cn(
          'z-[3] shrink-0 cursor-ew-resize rounded-r-sm',
          tone.handleRight,
        )}
        style={{ width: handleW, minWidth: handleW }}
        onPointerDown={(e) => {
          e.stopPropagation();
          onPointerDownBar('resize-end', e);
        }}
      />
    </>
  );

  const trigger = tooltipContent ? (
    <TooltipTrigger
      className={cn(
        'absolute flex touch-none rounded-sm',
        barInset,
        isLate && 'ring-1 ring-destructive/80 ring-offset-1 ring-offset-background',
      )}
      style={{ left: leftPx, width: barW }}
    >
      {editableInner}
    </TooltipTrigger>
  ) : (
    <div
      className={cn(
        'absolute flex touch-none rounded-sm',
        barInset,
        isLate && 'ring-1 ring-destructive/80 ring-offset-1 ring-offset-background',
      )}
      style={{ left: leftPx, width: barW }}
      title={`${tip} — glisser pour déplacer, poignées pour ajuster les dates${
        linkHandles ? ' ; ports lien au centre gauche/droite' : ''
      }`}
    >
      {editableInner}
    </div>
  );

  return tooltipShell(trigger);
}
