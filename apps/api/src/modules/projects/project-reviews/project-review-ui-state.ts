import { ProjectReviewStatus } from '@prisma/client';
import { normalizeReviewStatus } from './project-review-status.helpers';

/** États UI PDF 01–05 (RFC-PROJ-013-7). */
export type ProjectReviewUiState =
  | 'to_prepare'
  | 'upcoming'
  | 'in_progress'
  | 'to_finalize'
  | 'history';

export type ResolveReviewUiStateInput = {
  status: ProjectReviewStatus;
  agendaLockedAt?: Date | string | null;
  conductClosedAt?: Date | string | null;
  startedAt?: Date | string | null;
};

/**
 * Mapping statut API → état UI liste (table de vérité 013-5 §4 / 013-7).
 * Normalise d’abord les alias legacy.
 */
export function resolveReviewUiState(
  input: ResolveReviewUiStateInput,
): ProjectReviewUiState | null {
  const startedAt =
    input.startedAt == null
      ? null
      : input.startedAt instanceof Date
        ? input.startedAt
        : new Date(input.startedAt);
  const normalized = normalizeReviewStatus(input.status, startedAt);
  const locked = input.agendaLockedAt != null;
  const conductClosed = input.conductClosedAt != null;

  if (
    normalized === ProjectReviewStatus.FINALIZED ||
    input.status === ProjectReviewStatus.CANCELLED ||
    normalized === ProjectReviewStatus.CANCELLED
  ) {
    return 'history';
  }

  if (normalized === ProjectReviewStatus.IN_PROGRESS) {
    return conductClosed ? 'to_finalize' : 'in_progress';
  }

  if (normalized === ProjectReviewStatus.SCHEDULED) {
    return locked ? 'upcoming' : 'to_prepare';
  }

  if (normalized === ProjectReviewStatus.PREPARING) {
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

export const PROJECT_REVIEW_SERIES_FREQUENCY_LABEL: Record<
  'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY',
  string
> = {
  WEEKLY: 'Hebdomadaire',
  BIWEEKLY: 'Bihebdomadaire',
  MONTHLY: 'Mensuelle',
  QUARTERLY: 'Trimestrielle',
};

export const AGENDA_LOCKED_STRUCTURE_ERROR =
  "L'ordre du jour est figé. Réouvrez-le pour modifier la structure.";
