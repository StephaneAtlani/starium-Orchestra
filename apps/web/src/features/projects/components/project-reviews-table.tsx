'use client';

import { useEffect, useRef } from 'react';
import { CheckCircle2, ChevronRight, Pencil } from 'lucide-react';
import { UserInitialsAvatarStack } from '@/components/ui/user-initials-avatar';
import { cn } from '@/lib/utils';
import { displayLabel, firstDisplayLabel } from '@/lib/display-label';
import {
  PROJECT_REVIEW_MEETING_MODE_LABEL,
  PROJECT_REVIEW_STATUS_LABEL,
  projectReviewTypeBadge,
} from '../constants/project-enum-labels';
import type { ProjectReviewListItem } from '../types/project.types';
import {
  ctaLabelForUiState,
  resolveReviewUiState,
  type ProjectReviewUiState,
} from '../lib/project-review-ui-state';

function rowUiState(row: ProjectReviewListItem): ProjectReviewUiState | null {
  return (
    row.uiState ??
    resolveReviewUiState({
      status: row.status,
      agendaLockedAt: row.agendaLockedAt,
      conductClosedAt: row.conductClosedAt,
    })
  );
}

function dateParts(iso: string | null | undefined): { day: string; month: string } {
  if (!iso) return { day: '—', month: '' };
  try {
    const d = new Date(iso);
    return {
      day: d.toLocaleDateString('fr-FR', { day: '2-digit' }),
      month: d
        .toLocaleDateString('fr-FR', { month: 'short' })
        .replace(/\./g, '')
        .toUpperCase(),
    };
  } catch {
    return { day: '—', month: '' };
  }
}

function formatTimeRangeFr(
  iso: string | null | undefined,
  durationMinutes: number | null | undefined,
): string | null {
  if (!iso) return null;
  try {
    const start = new Date(iso);
    if (Number.isNaN(start.getTime())) return null;
    const fmt = (d: Date) =>
      d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (durationMinutes == null || durationMinutes <= 0) return fmt(start);
    const end = new Date(start.getTime() + durationMinutes * 60_000);
    return `${fmt(start)} – ${fmt(end)}`;
  } catch {
    return null;
  }
}

function placeLine(row: ProjectReviewListItem): string | null {
  const mode = row.meetingMode
    ? PROJECT_REVIEW_MEETING_MODE_LABEL[row.meetingMode]
    : null;
  const location = row.location?.trim() || null;
  if (location && mode) return `${location} / ${mode}`;
  return location ?? mode;
}

function cadenceLabel(row: ProjectReviewListItem): string {
  return firstDisplayLabel(
    [row.seriesFrequency?.trim() || null, row.nextReviewDate ? 'Planifié' : null],
    'Ponctuel',
  );
}

function prepFooter(uiState: ProjectReviewUiState, row: ProjectReviewListItem) {
  if (uiState === 'to_prepare') {
    return {
      Icon: Pencil,
      label: 'Préparation ouverte',
      tone: 'muted' as const,
    };
  }
  if (uiState === 'upcoming') {
    return {
      Icon: CheckCircle2,
      label: row.agendaLockedAt
        ? 'Ordre du jour figé'
        : 'Ordre du jour à consolider',
      tone: row.agendaLockedAt ? ('success' as const) : ('warning' as const),
    };
  }
  if (uiState === 'in_progress') {
    return {
      Icon: CheckCircle2,
      label: `ODJ ${row.agendaDoneCount ?? 0}/${row.agendaItemsCount} · présence ${row.attendedCount ?? 0}/${row.participantsCount}`,
      tone: 'info' as const,
    };
  }
  if (uiState === 'to_finalize') {
    const signals: string[] = [];
    if ((row.openArbitrationsWithoutVerdictCount ?? 0) > 0) {
      signals.push(
        `${row.openArbitrationsWithoutVerdictCount} arbitrage${(row.openArbitrationsWithoutVerdictCount ?? 0) > 1 ? 's' : ''}`,
      );
    }
    if ((row.openActionsWithoutOwnerOrDueCount ?? 0) > 0) {
      signals.push(
        `${row.openActionsWithoutOwnerOrDueCount} action${(row.openActionsWithoutOwnerOrDueCount ?? 0) > 1 ? 's' : ''} incomplète${(row.openActionsWithoutOwnerOrDueCount ?? 0) > 1 ? 's' : ''}`,
      );
    }
    return {
      Icon: Pencil,
      label: signals.length > 0 ? signals.join(' · ') : 'Prêt à finaliser',
      tone: signals.length > 0 ? ('warning' as const) : ('success' as const),
    };
  }
  return {
    Icon: CheckCircle2,
    label: displayLabel(
      PROJECT_REVIEW_STATUS_LABEL[row.status],
      'Point clôturé',
    ),
    tone: 'muted' as const,
  };
}

function typeBadgeTone(reviewType: string): string {
  if (reviewType === 'COPIL') {
    return 'bg-[color:var(--state-warning)]/12 text-[color:var(--state-warning)]';
  }
  if (reviewType === 'COPRO') {
    return 'bg-sky-500/12 text-sky-800 dark:text-sky-300';
  }
  if (reviewType === 'CODIR_REVIEW') {
    return 'bg-violet-500/12 text-violet-800 dark:text-violet-300';
  }
  return 'bg-muted text-muted-foreground';
}

function ReviewListCard({
  row,
  uiState,
  flash,
  onOpen,
}: {
  row: ProjectReviewListItem;
  uiState: ProjectReviewUiState;
  flash: boolean;
  onOpen: (id: string) => void;
}) {
  const cardRef = useRef<HTMLElement>(null);
  const typeBadge = projectReviewTypeBadge(row.reviewType);
  const title = firstDisplayLabel(
    [row.title?.trim() || null, `${typeBadge}`],
    'Point projet',
  );
  const iso =
    uiState === 'in_progress' || uiState === 'to_finalize'
      ? (row.startedAt ?? row.reviewDate)
      : row.reviewDate;
  const { day, month } = dateParts(iso);
  const timeRange = formatTimeRangeFr(iso, row.durationMinutes);
  const place = placeLine(row);
  const agendaCount = row.agendaItemsCount;
  const metaParts = [
    timeRange,
    place,
    agendaCount > 0
      ? `${agendaCount} point${agendaCount > 1 ? 's' : ''}`
      : null,
    uiState === 'to_prepare' || uiState === 'upcoming'
      ? row.agendaLockedAt
        ? 'brief de préparation prêt'
        : 'brief à préparer'
      : null,
    uiState === 'history'
      ? `${row.decisionsCount} décision${row.decisionsCount > 1 ? 's' : ''} · ${row.actionItemsCount} action${row.actionItemsCount > 1 ? 's' : ''}`
      : null,
  ].filter(Boolean) as string[];

  const footer = prepFooter(uiState, row);
  const FooterIcon = footer.Icon;
  const actionLabel = ctaLabelForUiState(uiState);
  const preview = (row.participantsPreview ?? []).filter((p) =>
    p.displayName?.trim(),
  );
  const extraParticipants = Math.max(0, row.participantsCount - preview.length);

  useEffect(() => {
    if (flash && cardRef.current) {
      cardRef.current.focus();
    }
  }, [flash]);

  return (
    <article
      ref={cardRef}
      tabIndex={0}
      className={cn(
        'flex min-h-11 cursor-pointer flex-col gap-3 rounded-[var(--radius-lg)] border border-border/70 bg-card p-3 shadow-[var(--shadow-1)] transition-shadow hover:shadow-[var(--ds-card-shadow-hover)] sm:flex-row sm:items-stretch sm:gap-4 sm:p-4',
        flash && 'ring-2 ring-[color:var(--brand-gold)]/50 bg-[color:var(--brand-gold)]/10',
      )}
      onClick={() => onOpen(row.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(row.id);
        }
      }}
      aria-label={`${title} — ${actionLabel}`}
    >
      <div
        className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-[var(--radius-md)] bg-[color:var(--brand-gold)]/15 text-center sm:h-auto sm:min-h-[4.5rem] sm:w-[3.25rem]"
        aria-hidden
      >
        <span className="text-xl font-extrabold leading-none tabular-nums text-foreground">
          {day}
        </span>
        {month ? (
          <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[color:var(--state-warning)]">
            {month}
          </span>
        ) : null}
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-bold text-foreground sm:text-base">
            {title}
          </h3>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold',
              typeBadgeTone(row.reviewType),
            )}
          >
            <span
              className="size-1.5 rounded-full bg-current opacity-80"
              aria-hidden
            />
            {typeBadge}
          </span>
          {(uiState === 'to_prepare' || uiState === 'upcoming') && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              <span
                className="size-1.5 rounded-full bg-muted-foreground/70"
                aria-hidden
              />
              {cadenceLabel(row)}
            </span>
          )}
        </div>

        {metaParts.length > 0 ? (
          <p className="starium-text-muted text-xs leading-snug sm:text-[13px]">
            {metaParts.join(' · ')}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          {preview.length > 0 ? (
            <div className="flex items-center gap-1.5">
              <UserInitialsAvatarStack
                members={preview.map((p) => ({
                  id: p.id,
                  displayName: p.displayName,
                }))}
                max={4}
                size="sm"
                className="!justify-start [&_li+li]:-ml-2"
                listLabel={`${row.participantsCount} participants`}
              />
              {extraParticipants > 0 ? (
                <span className="text-xs font-medium text-muted-foreground">
                  +{extraParticipants}
                </span>
              ) : null}
            </div>
          ) : row.participantsCount > 0 ? (
            <span className="text-xs text-muted-foreground">
              {row.participantsCount} participant
              {row.participantsCount > 1 ? 's' : ''}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              Aucun participant
            </span>
          )}

          <span
            className={cn(
              'inline-flex items-center gap-1.5 text-xs font-medium',
              footer.tone === 'success' &&
                'text-emerald-700 dark:text-emerald-400',
              footer.tone === 'warning' &&
                'text-[color:var(--state-warning)]',
              footer.tone === 'info' && 'text-sky-700 dark:text-sky-400',
              footer.tone === 'muted' && 'text-muted-foreground',
            )}
          >
            <FooterIcon className="size-3.5 shrink-0" aria-hidden strokeWidth={1.75} />
            {footer.label}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center sm:pl-2">
        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-[color:var(--brand-gold-700)] hover:underline sm:min-h-9"
          onClick={(event) => {
            event.stopPropagation();
            onOpen(row.id);
          }}
        >
          {actionLabel}
          <ChevronRight className="size-4" aria-hidden strokeWidth={2.25} />
        </button>
      </div>
    </article>
  );
}

export function ProjectReviewsTable({
  uiState,
  rows,
  flashId,
  onOpen,
}: {
  uiState: ProjectReviewUiState;
  rows: ProjectReviewListItem[];
  flashId: string | null;
  onOpen: (id: string) => void;
}) {
  const caption = {
    to_prepare: 'Points à préparer',
    upcoming: 'Points à venir',
    in_progress: 'Points en cours',
    to_finalize: 'Points à finaliser',
    history: 'Historique des points projet',
  }[uiState];

  return (
    <div
      className="flex flex-col gap-3"
      role="list"
      aria-label={caption}
      data-testid="project-reviews-list"
    >
      {rows.map((row) => {
        const state = rowUiState(row) ?? uiState;
        return (
          <div key={row.id} role="listitem">
            <ReviewListCard
              row={row}
              uiState={state}
              flash={flashId === row.id}
              onOpen={onOpen}
            />
          </div>
        );
      })}
    </div>
  );
}
