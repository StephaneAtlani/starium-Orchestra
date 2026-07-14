import type {
  ProjectReviewParticipantApi,
  ProjectReviewStatus,
} from '../types/project.types';

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

/** Planifier : PREPARING → SCHEDULED (date requise côté API). */
export function canScheduleReview(status: ProjectReviewStatus): boolean {
  return normalizeReviewStatus(status) === 'PREPARING';
}

/** Tenir la réunion : uniquement une fois planifiée (et idéalement invitée). */
export function canStartReview(status: ProjectReviewStatus): boolean {
  return normalizeReviewStatus(status) === 'SCHEDULED';
}

export function hasReviewInvitationsSent(
  participants: ProjectReviewParticipantApi[] | undefined,
): boolean {
  return (participants ?? []).some((p) => Boolean(p.lastInvitedAt));
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

export function isReviewInConduct(status: ProjectReviewStatus): boolean {
  return normalizeReviewStatus(status) === 'IN_PROGRESS';
}

export function isReviewFinalizedOrCancelled(status: ProjectReviewStatus): boolean {
  return status === 'FINALIZED' || status === 'CANCELLED';
}
