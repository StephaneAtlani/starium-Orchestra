import { BadRequestException } from '@nestjs/common';
import { ProjectReviewStatus } from '@prisma/client';

/** Normalise les statuts legacy vers le cycle RFC-PROJ-013-2. */
export function normalizeReviewStatus(
  status: ProjectReviewStatus,
  startedAt?: Date | null,
): ProjectReviewStatus {
  switch (status) {
    case ProjectReviewStatus.PLANNED:
      return ProjectReviewStatus.SCHEDULED;
    case ProjectReviewStatus.IN_REVIEW:
      return ProjectReviewStatus.IN_PROGRESS;
    case ProjectReviewStatus.DRAFT:
      return startedAt
        ? ProjectReviewStatus.IN_PROGRESS
        : ProjectReviewStatus.PREPARING;
    default:
      return status;
  }
}

export function isReviewContentEditable(status: ProjectReviewStatus): boolean {
  const normalized = normalizeReviewStatus(status);
  return (
    normalized === ProjectReviewStatus.IN_PROGRESS ||
    status === ProjectReviewStatus.IN_REVIEW ||
    status === ProjectReviewStatus.DRAFT
  );
}

export function isReviewPlanningEditable(status: ProjectReviewStatus): boolean {
  const normalized = normalizeReviewStatus(status);
  return (
    normalized === ProjectReviewStatus.PREPARING ||
    normalized === ProjectReviewStatus.SCHEDULED
  );
}

export function isReviewUpdateAllowed(status: ProjectReviewStatus): boolean {
  return isReviewContentEditable(status) || isReviewPlanningEditable(status);
}

const SCHEDULED_FORBIDDEN_UPDATE_FIELDS = [
  'decisions',
  'actionItems',
  'contentPayload',
  'participants',
  'nextReviewDate',
  'reviewType',
  'executiveSummary',
  'objective',
] as const;

export function assertScheduledUpdatePayloadAllowed(
  dto: Record<string, unknown>,
): void {
  for (const field of SCHEDULED_FORBIDDEN_UPDATE_FIELDS) {
    if (dto[field] !== undefined) {
      throw new BadRequestException(
        `Champ « ${field} » non modifiable sur une revue en préparation ou planifiée`,
      );
    }
  }
}

/** @deprecated Utiliser assertScheduledUpdatePayloadAllowed */
export const assertPlannedUpdatePayloadAllowed = assertScheduledUpdatePayloadAllowed;

export function isReviewAgendaEditable(status: ProjectReviewStatus): boolean {
  const normalized = normalizeReviewStatus(status);
  return (
    normalized === ProjectReviewStatus.PREPARING ||
    normalized === ProjectReviewStatus.SCHEDULED ||
    normalized === ProjectReviewStatus.IN_PROGRESS
  );
}

export function isReviewParticipantsEditable(
  status: ProjectReviewStatus,
): boolean {
  const normalized = normalizeReviewStatus(status);
  return (
    normalized === ProjectReviewStatus.PREPARING ||
    normalized === ProjectReviewStatus.SCHEDULED ||
    normalized === ProjectReviewStatus.IN_PROGRESS ||
    status === ProjectReviewStatus.IN_REVIEW ||
    status === ProjectReviewStatus.DRAFT
  );
}

export function assertReviewAgendaEditable(status: ProjectReviewStatus): void {
  if (!isReviewAgendaEditable(status)) {
    throw new BadRequestException(
      'La revue est en lecture seule : modification de l’ordre du jour impossible',
    );
  }
}

export function assertReviewConductEditable(status: ProjectReviewStatus): void {
  const normalized = normalizeReviewStatus(status);
  if (
    normalized !== ProjectReviewStatus.IN_PROGRESS &&
    status !== ProjectReviewStatus.IN_REVIEW
  ) {
    throw new BadRequestException(
      'Notes, décisions et actions ne sont modifiables qu’en revue en cours',
    );
  }
}

export function assertReviewParticipantsEditable(
  status: ProjectReviewStatus,
): void {
  if (!isReviewParticipantsEditable(status)) {
    throw new BadRequestException(
      'La revue est en lecture seule : modification des participants impossible',
    );
  }
}
