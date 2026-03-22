'use client';

import { cn } from '@/lib/utils';

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
}: {
  taskId: string;
  leftPx: number;
  barW: number;
  progress: number;
  canEdit: boolean;
  title: string;
  onPointerDownBar: (mode: BarMode, e: React.PointerEvent) => void;
  /** Port sortie (bord fin) — début du drag de lien FS */
  onLinkOutPointerDown?: (e: React.PointerEvent) => void;
  /** Afficher ports lien (entrée gauche / sortie droite du bloc central) */
  showLinkPorts?: boolean;
}) {
  const linkHandles = Boolean(canEdit && showLinkPorts && onLinkOutPointerDown);

  if (!canEdit) {
    return (
      <div
        className="bg-primary/15 absolute top-2 bottom-2 rounded-sm"
        style={{ left: leftPx, width: barW }}
        title={title}
      >
        <div
          className="bg-primary/75 h-full rounded-sm"
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>
    );
  }

  const handleW = Math.min(HANDLE_MAX_PX, Math.max(3, barW / 3));

  return (
    <div
      className="absolute top-2 bottom-2 flex touch-none rounded-sm"
      style={{ left: leftPx, width: barW }}
      title={`${title} — glisser pour déplacer, poignées pour ajuster les dates${
        linkHandles ? ' ; ports lien au centre gauche/droite' : ''
      }`}
    >
      <div
        role="separator"
        aria-label="Ajuster le début"
        className={cn(
          'bg-primary/35 hover:bg-primary/55 z-[3] shrink-0 cursor-ew-resize rounded-l-sm border-r border-primary/30',
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
          className="bg-primary/10 hover:bg-primary/25 z-[4] shrink-0 cursor-cell border-y border-primary/20"
          style={{ width: LINK_PORT_PX, minWidth: LINK_PORT_PX }}
        />
      )}
      <div
        className="bg-primary/15 min-w-0 flex-1 cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => onPointerDownBar('move', e)}
      >
        <div
          className="bg-primary/75 h-full rounded-sm"
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>
      {linkHandles && (
        <div
          data-gantt-link-out=""
          data-task-id={taskId}
          aria-label="Port sortie lien"
          className="bg-primary/10 hover:bg-primary/25 z-[4] shrink-0 cursor-crosshair border-y border-primary/20"
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
          'bg-primary/35 hover:bg-primary/55 z-[3] shrink-0 cursor-ew-resize rounded-r-sm border-l border-primary/30',
        )}
        style={{ width: handleW, minWidth: handleW }}
        onPointerDown={(e) => {
          e.stopPropagation();
          onPointerDownBar('resize-end', e);
        }}
      />
    </div>
  );
}
