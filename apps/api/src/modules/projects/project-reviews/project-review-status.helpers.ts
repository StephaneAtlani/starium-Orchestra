import { BadRequestException } from '@nestjs/common';
import { ProjectReviewStatus } from '@prisma/client';

export function isReviewContentEditable(status: ProjectReviewStatus): boolean {
  return (
    status === ProjectReviewStatus.IN_REVIEW ||
    status === ProjectReviewStatus.DRAFT
  );
}

export function isReviewAgendaEditable(status: ProjectReviewStatus): boolean {
  return (
    status === ProjectReviewStatus.PLANNED ||
    status === ProjectReviewStatus.IN_REVIEW
  );
}

export function isReviewParticipantsEditable(
  status: ProjectReviewStatus,
): boolean {
  return (
    status === ProjectReviewStatus.PLANNED ||
    status === ProjectReviewStatus.IN_REVIEW
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
  if (status !== ProjectReviewStatus.IN_REVIEW) {
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
