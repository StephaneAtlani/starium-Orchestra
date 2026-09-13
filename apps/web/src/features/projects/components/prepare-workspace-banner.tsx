'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { projectReviewTypeBadge } from '../constants/project-enum-labels';
import { displayLabel } from '@/lib/display-label';
import { cn } from '@/lib/utils';
import type { ProjectReviewDetail } from '../types/project.types';
import { PrepareWorkspaceSessionDialog } from './prepare-workspace-session-dialog';

type Props = {
  projectId: string;
  detail: ProjectReviewDetail;
  canEdit: boolean;
};

function partsFromIso(iso: string | null): {
  day: string;
  month: string;
  time: string;
} {
  if (!iso) {
    return { day: '—', month: '—', time: '—' };
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { day: '—', month: '—', time: '—' };
  }
  return {
    day: String(d.getDate()).padStart(2, '0'),
    month: d
      .toLocaleDateString('fr-FR', { month: 'short' })
      .replace('.', '')
      .toUpperCase(),
    time: d.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

export function PrepareWorkspaceBanner({
  projectId,
  detail,
  canEdit,
}: Props) {
  const [sessionOpen, setSessionOpen] = useState(false);
  const { day, month, time } = partsFromIso(detail.reviewDate);
  const badge = projectReviewTypeBadge(detail.reviewType);

  const body = (
    <>
      <div className="prepare-workspace__date-tile" aria-hidden={false}>
        <span className="prepare-workspace__date-day">{day}</span>
        <span className="prepare-workspace__date-month">{month}</span>
        <span className="prepare-workspace__date-time">{time}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-extrabold text-foreground">
            {displayLabel(detail.title, 'Point sans titre')}
          </h3>
          <span className="inline-flex rounded-[var(--radius-pill)] bg-[color:var(--brand-ink)] px-2 py-0.5 text-[10px] font-extrabold tracking-wide text-white">
            {badge}
          </span>
        </div>
        <p className="mt-1 text-xs font-semibold text-muted-foreground">
          {canEdit
            ? 'Cliquez pour modifier la session'
            : "Préparation de l'instance"}
        </p>
      </div>
      {canEdit ? (
        <span
          className="prepare-workspace__banner-edit"
          aria-hidden
        >
          <Pencil className="size-3.5" />
        </span>
      ) : null}
    </>
  );

  return (
    <>
      {canEdit ? (
        <button
          type="button"
          className={cn(
            'prepare-workspace__banner',
            'prepare-workspace__banner--interactive',
          )}
          onClick={() => setSessionOpen(true)}
          aria-label="Modifier la date, l’heure et le titre de la session"
        >
          {body}
        </button>
      ) : (
        <div className="prepare-workspace__banner">{body}</div>
      )}
      <PrepareWorkspaceSessionDialog
        open={sessionOpen}
        onOpenChange={setSessionOpen}
        projectId={projectId}
        detail={detail}
        canEdit={canEdit}
      />
    </>
  );
}
