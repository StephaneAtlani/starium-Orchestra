import { BadRequestException } from '@nestjs/common';
import { ProjectReviewStatus } from '@prisma/client';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PROJECT_AUDIT_ACTION } from '../project-audit.constants';
import { ProjectsService } from '../projects.service';
import { ProjectReviewParticipantsService } from './project-review-participants.service';

describe('ProjectReviewParticipantsService (RFC-PROJ-013-1)', () => {
  let service: ProjectReviewParticipantsService;
  let prisma: {
    projectReview: { findFirst: jest.Mock };
    projectReviewParticipant: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let projects: { getProjectForScope: jest.Mock; assertClientUser: jest.Mock };
  let auditLogs: { create: jest.Mock };

  const clientId = 'c1';
  const projectId = 'p1';
  const reviewId = 'rev1';

  beforeEach(() => {
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    projects = {
      getProjectForScope: jest.fn().mockResolvedValue({ id: projectId }),
      assertClientUser: jest.fn().mockResolvedValue(undefined),
    };
    prisma = {
      projectReview: { findFirst: jest.fn() },
      projectReviewParticipant: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new ProjectReviewParticipantsService(
      prisma as never,
      projects as unknown as ProjectsService,
      auditLogs as unknown as AuditLogsService,
    );
  });

  it('create participant en PREPARING avec attendanceStatus', async () => {
    prisma.projectReview.findFirst.mockResolvedValue({
      id: reviewId,
      status: ProjectReviewStatus.PREPARING,
    });
    prisma.projectReviewParticipant.create.mockResolvedValue({
      id: 'part1',
      userId: 'u1',
      displayName: 'Alice',
      roleLabel: null,
      attendanceStatus: 'EXPECTED',
      user: { id: 'u1', firstName: 'Alice', lastName: 'Martin', email: 'a@x.com' },
    });

    const result = await service.create(
      clientId,
      projectId,
      reviewId,
      { userId: 'u1' },
      {},
    );

    expect(result.attendanceStatus).toBe('EXPECTED');
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_PARTICIPANT_ADDED,
      }),
    );
  });

  it('update attendanceStatus en IN_PROGRESS', async () => {
    prisma.projectReview.findFirst.mockResolvedValue({
      id: reviewId,
      status: ProjectReviewStatus.IN_PROGRESS,
    });
    prisma.projectReviewParticipant.findFirst.mockResolvedValue({
      id: 'part1',
      userId: 'u1',
      displayName: 'Alice',
      roleLabel: null,
      attendanceStatus: 'EXPECTED',
      user: null,
    });
    prisma.projectReviewParticipant.update.mockResolvedValue({
      id: 'part1',
      userId: 'u1',
      displayName: 'Alice',
      roleLabel: null,
      attendanceStatus: 'PRESENT',
      user: null,
    });

    const result = await service.update(
      clientId,
      projectId,
      reviewId,
      'part1',
      { attendanceStatus: 'PRESENT' },
      {},
    );

    expect(result.attendanceStatus).toBe('PRESENT');
    expect(prisma.projectReviewParticipant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          attendanceStatus: 'PRESENT',
          attended: true,
        }),
      }),
    );
  });

  it('refuse mutation si FINALIZED', async () => {
    prisma.projectReview.findFirst.mockResolvedValue({
      id: reviewId,
      status: ProjectReviewStatus.FINALIZED,
    });

    await expect(
      service.create(clientId, projectId, reviewId, { displayName: 'Bob' }, {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
