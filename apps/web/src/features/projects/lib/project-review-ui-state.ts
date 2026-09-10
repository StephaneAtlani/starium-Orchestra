import type { ProjectReviewStatus } from '../types/project.types';
import { normalizeReviewStatus } from './project-review-status';

/** États UI PDF 01–05 (RFC-PROJ-013-7) — miroir API. */
export type ProjectReviewUiState =
  | 'to_prepare'
  | 'upcoming'
  | 'in_progress'
  | 'to_finalize'
  | 'history';

export type ProjectReviewsTabState = ProjectReviewUiState | 'series';

export type ResolveReviewUiStateInput = {
  status: ProjectReviewStatus;
  agendaLockedAt?: string | null;
  conductClosedAt?: string | null;
};

export function resolveReviewUiState(
  input: ResolveReviewUiStateInput,
): ProjectReviewUiState | null {
  const normalized = normalizeReviewStatus(input.status);
  const locked = input.agendaLockedAt != null;
  const conductClosed = input.conductClosedAt != null;

  if (
    input.status === 'FINALIZED' ||
    input.status === 'CANCELLED' ||
    normalized === 'FINALIZED' ||
    normalized === 'CANCELLED'
  ) {
    return 'history';
  }

  if (normalized === 'IN_PROGRESS') {
    return conductClosed ? 'to_finalize' : 'in_progress';
  }

  if (normalized === 'SCHEDULED') {
    return locked ? 'upcoming' : 'to_prepare';
  }

  if (normalized === 'PREPARING') {
    return 'to_prepare';
  }

  return null;
}

export const PROJECT_REVIEW_UI_STATE_LABEL: Record<ProjectReviewUiState, string> =
  {
    to_prepare: 'À préparer',
    upcoming: 'À venir',
    in_progress: 'En cours',
    to_finalize: 'À finaliser',
    history: 'Historique',
  };

export const PROJECT_REVIEWS_TAB_ORDER: ProjectReviewsTabState[] = [
  'to_prepare',
  'upcoming',
  'in_progress',
  'to_finalize',
  'history',
  'series',
];

export const PROJECT_REVIEWS_TAB_LABEL: Record<ProjectReviewsTabState, string> = {
  ...PROJECT_REVIEW_UI_STATE_LABEL,
  series: 'Séries',
};

export function parsePointsStateParam(
  value: string | null,
): ProjectReviewsTabState {
  if (
    value === 'to_prepare' ||
    value === 'upcoming' ||
    value === 'in_progress' ||
    value === 'to_finalize' ||
    value === 'history' ||
    value === 'series'
  ) {
    return value;
  }
  return 'to_prepare';
}

export function ctaLabelForUiState(uiState: ProjectReviewUiState): string {
  switch (uiState) {
    case 'in_progress':
      return 'Reprendre la conduite';
    case 'to_finalize':
      return 'Finaliser';
    case 'history':
      return 'Consulter';
    default:
      return 'Ouvrir';
  }
}
