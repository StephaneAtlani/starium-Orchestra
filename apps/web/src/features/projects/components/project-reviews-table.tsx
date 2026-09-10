'use client';

import { useEffect, useRef } from 'react';
import { StariumTableWrap, useStariumTablePan } from '@/components/ui/starium-table-wrap';
import { cn } from '@/lib/utils';
import { BookOpen, Calendar, ClipboardList } from 'lucide-react';
import {
  PROJECT_REVIEW_STATUS_LABEL,
  PROJECT_REVIEW_TYPE_LABEL,
} from '../constants/project-enum-labels';
import type { ProjectReviewListItem } from '../types/project.types';
import { formatProjectDateTimeFr } from '../lib/projects-list-display';
import {
  ctaLabelForUiState,
  resolveReviewUiState,
  type ProjectReviewUiState,
} from '../lib/project-review-ui-state';
import { displayLabel } from '@/lib/display-label';

const REVIEW_ROW_ICON_TONES = [
  'starium-dt-ti-blue',
  'starium-dt-ti-purple',
  'starium-dt-ti-gold',
  'starium-dt-ti-green',
] as const;

function reviewRowIcon(reviewType: string) {
  if (reviewType === 'POST_MORTEM') return BookOpen;
  return ClipboardList;
}

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

function ReviewTableRow({
  row,
  index,
  uiState,
  flash,
  onOpen,
}: {
  row: ProjectReviewListItem;
  index: number;
  uiState: ProjectReviewUiState;
  flash: boolean;
  onOpen: (id: string) => void;
}) {
  const { shouldSuppressClick } = useStariumTablePan();
  const rowRef = useRef<HTMLTableRowElement>(null);
  const RowIcon = reviewRowIcon(row.reviewType);
  const iconTone = REVIEW_ROW_ICON_TONES[index % REVIEW_ROW_ICON_TONES.length];
  const typeLabel = PROJECT_REVIEW_TYPE_LABEL[row.reviewType] ?? row.reviewType;
  const title = displayLabel(row.title?.trim() || null, typeLabel);
  const actionLabel = ctaLabelForUiState(uiState);

  useEffect(() => {
    if (flash && rowRef.current) {
      rowRef.current.focus();
    }
  }, [flash]);

  return (
    <tr
      ref={rowRef}
      tabIndex={0}
      className={cn(
        'cursor-pointer transition-colors',
        flash && 'bg-[color:var(--brand-gold)]/15',
      )}
      onClick={() => {
        if (shouldSuppressClick()) return;
        onOpen(row.id);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(row.id);
        }
      }}
    >
      <td>
        <div className="starium-dt-date min-w-[10rem]">
          <Calendar strokeWidth={1.75} aria-hidden />
          <time
            dateTime={
              uiState === 'in_progress' || uiState === 'to_finalize'
                ? (row.startedAt ?? row.reviewDate ?? undefined)
                : (row.reviewDate ?? undefined)
            }
          >
            {uiState === 'in_progress' || uiState === 'to_finalize'
              ? row.startedAt
                ? formatProjectDateTimeFr(row.startedAt)
                : row.reviewDate
                  ? formatProjectDateTimeFr(row.reviewDate)
                  : '—'
              : row.reviewDate
                ? formatProjectDateTimeFr(row.reviewDate)
                : '—'}
          </time>
        </div>
      </td>
      <td>
        <span className="starium-ds-badge starium-ds-badge--info">{typeLabel}</span>
      </td>
      {(uiState === 'to_prepare' || uiState === 'upcoming') && (
        <>
          <td className="text-sm text-muted-foreground">
            {row.seriesFrequency ?? (row.nextReviewDate ? 'Planifié' : '—')}
          </td>
          <td className="tabular-nums text-sm">{row.participantsCount}</td>
          <td>
            <span
              className={cn(
                'starium-ds-badge',
                row.agendaLockedAt
                  ? 'starium-ds-badge--success'
                  : 'starium-ds-badge--neutral',
              )}
            >
              {row.agendaLockedAt ? 'ODJ figé' : 'À figer'}
            </span>
          </td>
        </>
      )}
      {uiState === 'in_progress' && (
        <>
          <td className="tabular-nums text-sm">
            {row.agendaDoneCount ?? 0}/{row.agendaItemsCount}
          </td>
          <td className="tabular-nums text-sm">
            {row.attendedCount ?? 0}/{row.participantsCount}
          </td>
        </>
      )}
      {uiState === 'to_finalize' && (
        <td>
          <div className="flex flex-wrap gap-1">
            {(row.openArbitrationsWithoutVerdictCount ?? 0) > 0 ? (
              <span className="starium-ds-badge starium-ds-badge--warn">
                {row.openArbitrationsWithoutVerdictCount} arbitrage
                {(row.openArbitrationsWithoutVerdictCount ?? 0) > 1 ? 's' : ''}
              </span>
            ) : null}
            {(row.openActionsWithoutOwnerOrDueCount ?? 0) > 0 ? (
              <span className="starium-ds-badge starium-ds-badge--warn">
                {row.openActionsWithoutOwnerOrDueCount} action
                {(row.openActionsWithoutOwnerOrDueCount ?? 0) > 1 ? 's' : ''} incomplète
                {(row.openActionsWithoutOwnerOrDueCount ?? 0) > 1 ? 's' : ''}
              </span>
            ) : null}
            {(row.openArbitrationsWithoutVerdictCount ?? 0) === 0 &&
            (row.openActionsWithoutOwnerOrDueCount ?? 0) === 0 ? (
              <span className="text-sm text-muted-foreground">Prêt à finaliser</span>
            ) : null}
          </div>
        </td>
      )}
      {uiState === 'history' && (
        <>
          <td>
            <span className="starium-ds-badge starium-ds-badge--neutral">
              {PROJECT_REVIEW_STATUS_LABEL[row.status] ?? row.status}
            </span>
          </td>
          <td className="tabular-nums text-sm">{row.decisionsCount}</td>
          <td className="tabular-nums text-sm">{row.actionItemsCount}</td>
        </>
      )}
      <td>
        <div className="starium-dt-tname min-w-[12rem] max-w-[24rem]">
          <div className={cn('starium-dt-tname-ico', iconTone)} aria-hidden>
            <RowIcon strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <div className="starium-dt-cell-strong truncate">{title}</div>
          </div>
        </div>
      </td>
      <td className="starium-dt__right">
        <button
          type="button"
          className="starium-btn starium-btn-secondary starium-btn-sm min-h-11 sm:min-h-9"
          onClick={(event) => {
            event.stopPropagation();
            onOpen(row.id);
          }}
        >
          {actionLabel}
        </button>
      </td>
    </tr>
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
    <StariumTableWrap scrollLabel={`${caption} — glisser pour faire défiler`}>
      <table className="starium-dt starium-dt--wide">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">
              {uiState === 'in_progress' || uiState === 'to_finalize'
                ? 'Démarrage'
                : 'Date'}
            </th>
            <th scope="col">Type</th>
            {(uiState === 'to_prepare' || uiState === 'upcoming') && (
              <>
                <th scope="col">Cadence</th>
                <th scope="col">Participants</th>
                <th scope="col">Préparation</th>
              </>
            )}
            {uiState === 'in_progress' && (
              <>
                <th scope="col">Avancement ODJ</th>
                <th scope="col">Présence</th>
              </>
            )}
            {uiState === 'to_finalize' && <th scope="col">Signaux</th>}
            {uiState === 'history' && (
              <>
                <th scope="col">Statut</th>
                <th scope="col">Décisions</th>
                <th scope="col">Actions</th>
              </>
            )}
            <th scope="col">Titre</th>
            <th scope="col" className="starium-dt__right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const state = rowUiState(row) ?? uiState;
            return (
              <ReviewTableRow
                key={row.id}
                row={row}
                index={index}
                uiState={state}
                flash={flashId === row.id}
                onOpen={onOpen}
              />
            );
          })}
        </tbody>
      </table>
    </StariumTableWrap>
  );
}
