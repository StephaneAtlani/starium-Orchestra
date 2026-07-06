import type { ProjectReviewStatus } from '../types/project.types';

/** Aligné backend `normalizeReviewStatus` (RFC-PROJ-013-2). */
export function normalizeReviewStatus(
  status: ProjectReviewStatus,
): ProjectReviewStatus {
  switch (status) {
    case 'PLANNED':
      return 'SCHEDULED';
    case 'IN_REVIEW':
      return 'IN_PROGRESS';
    case 'DRAFT':
      return 'PREPARING';
    default:
      return status;
  }
}

export function isReviewPlanningEditable(status: ProjectReviewStatus): boolean {
  const normalized = normalizeReviewStatus(status);
  return normalized === 'PREPARING' || normalized === 'SCHEDULED';
}

export function isReviewContentEditable(status: ProjectReviewStatus): boolean {
  return (
    status === 'IN_PROGRESS' ||
    status === 'IN_REVIEW' ||
    status === 'DRAFT'
  );
}

export function canStartReview(status: ProjectReviewStatus): boolean {
  const normalized = normalizeReviewStatus(status);
  return normalized === 'PREPARING' || normalized === 'SCHEDULED';
}

export function isReviewInvitationsVisible(status: ProjectReviewStatus): boolean {
  const normalized = normalizeReviewStatus(status);
  return normalized === 'SCHEDULED' || status === 'PLANNED';
}

export function isReviewAgendaConductEditable(status: ProjectReviewStatus): boolean {
  return isReviewContentEditable(status);
}

export function isReviewAgendaEditable(status: ProjectReviewStatus): boolean {
  const normalized = normalizeReviewStatus(status);
  return (
    normalized === 'PREPARING' ||
    normalized === 'SCHEDULED' ||
    normalized === 'IN_PROGRESS' ||
    status === 'IN_REVIEW' ||
    status === 'PLANNED'
  );
}

export function isReviewParticipantsEditable(status: ProjectReviewStatus): boolean {
  return isReviewAgendaEditable(status);
}

export function isReviewFinalizedOrCancelled(status: ProjectReviewStatus): boolean {
  return status === 'FINALIZED' || status === 'CANCELLED';
}
