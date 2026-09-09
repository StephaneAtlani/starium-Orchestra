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

/** Compte rendu figé : aperçu / envoi e-mail uniquement une fois le point finalisé. */
export function canPreviewOrSendReviewReport(status: ProjectReviewStatus): boolean {
  return status === 'FINALIZED';
}

/** Aperçu brouillon en conduite, ou aperçu figé une fois finalisé. */
export function canPreviewDraftReviewReport(status: ProjectReviewStatus): boolean {
  return isReviewContentEditable(status) || status === 'FINALIZED';
}

/** Phase UX de l’éditeur page (RFC-PROJ-013-3 C8-unify). */
export type ReviewEditorPhase = 'prepare' | 'conduct' | 'retex';

const REVIEW_EDITOR_TABS_BY_PHASE: Record<ReviewEditorPhase, readonly string[]> = {
  prepare: ['agenda'],
  conduct: ['agenda', 'participants', 'decisions', 'actions', 'attachments', 'closure'],
  retex: ['prepare', 'participants', 'attachments'],
};

export function reviewEditorPhase(
  status: ProjectReviewStatus,
  reviewType: string,
): ReviewEditorPhase {
  if (reviewType === 'POST_MORTEM' && isReviewContentEditable(status)) {
    return 'retex';
  }
  const normalized = normalizeReviewStatus(status);
  if (normalized === 'PREPARING' || normalized === 'SCHEDULED') {
    return 'prepare';
  }
  if (isReviewContentEditable(status)) {
    return 'conduct';
  }
  return 'prepare';
}

export function reviewEditorTabsForPhase(phase: ReviewEditorPhase): readonly string[] {
  return REVIEW_EDITOR_TABS_BY_PHASE[phase];
}

export function reviewEditorInitialTab(phase: ReviewEditorPhase): string {
  return REVIEW_EDITOR_TABS_BY_PHASE[phase][0]!;
}
