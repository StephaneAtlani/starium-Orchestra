'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { ProjectListItem } from '../types/project.types';
import { PROJECT_STATUS_LABEL } from '../constants/project-enum-labels';
import { cn } from '@/lib/utils';
import { HealthBadge, ProjectPortfolioBadges } from './project-badges';

const STATUS_COLUMNS_ORDER = [
  'DRAFT',
  'PLANNED',
  'IN_PROGRESS',
  'ON_HOLD',
  'COMPLETED',
  'CANCELLED',
  'ARCHIVED',
] as const;

const DROPPABLE_STATUSES = new Set<string>([
  'DRAFT',
  'PLANNED',
  'IN_PROGRESS',
  'ON_HOLD',
  'COMPLETED',
  'CANCELLED',
]);

function formatDate(iso: string | null) {
  if (!iso) return 'Sans echeance';
  try {
    return new Date(iso).toLocaleDateString('fr-FR');
  } catch {
    return 'Sans echeance';
  }
}

type ProjectsListKanbanProps = {
  items: ProjectListItem[];
  statusFilter?: string;
  canUpdate: boolean;
  isUpdating?: boolean;
  onStatusDrop: (payload: { projectId: string; fromStatus: string; toStatus: string }) => void;
};

export function ProjectsListKanban({
  items,
  statusFilter,
  canUpdate,
  isUpdating = false,
  onStatusDrop,
}: ProjectsListKanbanProps) {
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const [overStatus, setOverStatus] = useState<string | null>(null);

  const visibleStatuses = useMemo(() => {
    if (statusFilter) return STATUS_COLUMNS_ORDER.filter((status) => status === statusFilter);
    return STATUS_COLUMNS_ORDER;
  }, [statusFilter]);

  const grouped = useMemo(() => {
    const byStatus = new Map<string, ProjectListItem[]>();
    for (const status of visibleStatuses) {
      byStatus.set(status, []);
    }
    for (const item of items) {
      if (!byStatus.has(item.status)) continue;
      byStatus.get(item.status)?.push(item);
    }
    return byStatus;
  }, [items, visibleStatuses]);

  return (
    <div className="flex min-h-0 flex-col gap-4 p-4 pt-3">
      <p className="text-xs text-muted-foreground">
        Cette vue Kanban reflète uniquement la page et les filtres courants.
      </p>

      <div className="flex min-w-0 gap-4 overflow-x-auto pb-1">
        {visibleStatuses.map((status) => {
          const label = PROJECT_STATUS_LABEL[status] ?? 'Statut';
          const projects = grouped.get(status) ?? [];
          const canDropHere = canUpdate && DROPPABLE_STATUSES.has(status);
          const isOver = overStatus === status && canDropHere;

          return (
            <div
              key={status}
              className={cn(
                'w-[20rem] min-w-[20rem] rounded-lg border bg-muted/20 p-3',
                isOver ? 'border-primary/65 ring-1 ring-primary/35' : 'border-border/60',
              )}
              onDragOver={(event) => {
                if (!canDropHere) return;
                event.preventDefault();
                setOverStatus(status);
              }}
              onDragEnter={(event) => {
                if (!canDropHere) return;
                event.preventDefault();
                setOverStatus(status);
              }}
              onDragLeave={() => {
                setOverStatus((previous) => (previous === status ? null : previous));
              }}
              onDrop={(event) => {
                if (!canDropHere) return;
                event.preventDefault();
                setOverStatus(null);

                const projectId = event.dataTransfer.getData('text/plain');
                const sourceStatus = event.dataTransfer.getData('project-status');
                if (!projectId || !sourceStatus) return;
                if (sourceStatus === status) return;
                if (!DROPPABLE_STATUSES.has(status)) return;

                if (status === 'CANCELLED') {
                  const confirmed = window.confirm(
                    'Confirmer le passage de ce projet au statut "Annule" ?',
                  );
                  if (!confirmed) return;
                }

                onStatusDrop({ projectId, fromStatus: sourceStatus, toStatus: status });
                setDraggedProjectId(null);
              }}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{label}</h3>
                <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
                  {projects.length}
                </span>
              </div>

              <div className="space-y-2">
                {projects.map((project) => (
                  <article
                    key={project.id}
                    draggable={canUpdate && DROPPABLE_STATUSES.has(project.status) && !isUpdating}
                    onDragStart={(event) => {
                      if (!canUpdate || !DROPPABLE_STATUSES.has(project.status)) return;
                      setDraggedProjectId(project.id);
                      event.dataTransfer.setData('text/plain', project.id);
                      event.dataTransfer.setData('project-status', project.status);
                      event.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragEnd={() => {
                      setDraggedProjectId(null);
                      setOverStatus(null);
                    }}
                    className={cn(
                      'rounded-md border border-border/60 bg-background p-3 transition-opacity',
                      draggedProjectId === project.id && 'opacity-60',
                    )}
                  >
                    <Link href={`/projects/${project.id}`} className="block">
                      <p className="line-clamp-2 text-sm font-medium text-primary hover:underline">
                        {project.name}
                      </p>
                    </Link>
                    {project.code ? (
                      <p className="mt-1 text-xs font-mono text-muted-foreground">{project.code}</p>
                    ) : null}
                    <div className="mt-2 flex items-center gap-2">
                      <HealthBadge health={project.computedHealth} compact />
                      <span className="text-xs text-muted-foreground">
                        {formatDate(project.targetEndDate)}
                      </span>
                    </div>
                    {project.ownerDisplayName ? (
                      <p className="mt-2 truncate text-xs text-muted-foreground">
                        Chef de projet: {project.ownerDisplayName}
                      </p>
                    ) : null}
                    <div className="mt-2">
                      <ProjectPortfolioBadges signals={project.signals} />
                    </div>
                  </article>
                ))}
                {projects.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border/55 bg-muted/10 p-3 text-center text-xs text-muted-foreground">
                    Aucun projet
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
