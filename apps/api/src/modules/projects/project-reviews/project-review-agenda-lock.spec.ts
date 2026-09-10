import { BadRequestException } from '@nestjs/common';
import { ProjectReviewStatus } from '@prisma/client';
import { AGENDA_LOCKED_STRUCTURE_ERROR } from './project-review-ui-state';
import { normalizeReviewStatus } from './project-review-status.helpers';

/** Miroir de la garde agenda (test unitaire sans Prisma). */
function assertAgendaStructureUnlocked(review: {
  status: ProjectReviewStatus;
  startedAt?: Date | null;
  agendaLockedAt?: Date | null;
}) {
  const normalized = normalizeReviewStatus(review.status, review.startedAt);
  if (
    review.agendaLockedAt &&
    (normalized === ProjectReviewStatus.PREPARING ||
      normalized === ProjectReviewStatus.SCHEDULED)
  ) {
    throw new BadRequestException(AGENDA_LOCKED_STRUCTURE_ERROR);
  }
}

describe('agenda structure lock guard (RFC-PROJ-013-7)', () => {
  const locked = new Date('2026-09-01T10:00:00Z');

  it('blocks structure mutation when SCHEDULED + locked', () => {
    expect(() =>
      assertAgendaStructureUnlocked({
        status: ProjectReviewStatus.SCHEDULED,
        agendaLockedAt: locked,
      }),
    ).toThrow(AGENDA_LOCKED_STRUCTURE_ERROR);
  });

  it('allows structure mutation when unlocked', () => {
    expect(() =>
      assertAgendaStructureUnlocked({
        status: ProjectReviewStatus.SCHEDULED,
        agendaLockedAt: null,
      }),
    ).not.toThrow();
  });

  it('ignores lock once IN_PROGRESS', () => {
    expect(() =>
      assertAgendaStructureUnlocked({
        status: ProjectReviewStatus.IN_PROGRESS,
        agendaLockedAt: locked,
      }),
    ).not.toThrow();
  });
});
