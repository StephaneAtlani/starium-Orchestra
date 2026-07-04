import { BadRequestException } from '@nestjs/common';
import { ProjectReviewStatus } from '@prisma/client';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PROJECT_AUDIT_ACTION } from '../project-audit.constants';
import { ProjectsService } from '../projects.service';
import { ProjectReviewAgendaService } from './project-review-agenda.service';

describe('ProjectReviewAgendaService (RFC-PROJ-013-1)', () => {
  let service: ProjectReviewAgendaService;
  let prisma: {
    projectReview: { findFirst: jest.Mock };
    projectReviewAgendaItem: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      aggregate: jest.Mock;
    };
    $transaction: jest.Mock;
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
      projectReviewAgendaItem: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({ _max: { orderIndex: 0 } }),
      },
      $transaction: jest.fn((ops) => Promise.all(ops)),
    };
    service = new ProjectReviewAgendaService(
      prisma as never,
      projects as unknown as ProjectsService,
      auditLogs as unknown as AuditLogsService,
    );
  });

  it('create agenda en PLANNED', async () => {
    prisma.projectReview.findFirst.mockResolvedValue({
      id: reviewId,
      status: ProjectReviewStatus.PLANNED,
    });
    prisma.projectReviewAgendaItem.create.mockResolvedValue({
      id: 'ag1',
      title: 'Point 1',
      orderIndex: 1,
    });

    await service.create(clientId, projectId, reviewId, { title: 'Point 1' }, {});

    expect(prisma.projectReviewAgendaItem.create).toHaveBeenCalled();
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_AGENDA_ITEM_CREATED,
      }),
    );
  });

  it('refuse update notes en PLANNED', async () => {
    prisma.projectReview.findFirst.mockResolvedValue({
      id: reviewId,
      status: ProjectReviewStatus.PLANNED,
    });
    prisma.projectReviewAgendaItem.findFirst.mockResolvedValue({
      id: 'ag1',
      status: 'TODO',
    });

    await expect(
      service.update(
        clientId,
        projectId,
        reviewId,
        'ag1',
        { notes: 'secret' },
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuse mutation agenda si FINALIZED', async () => {
    prisma.projectReview.findFirst.mockResolvedValue({
      id: reviewId,
      status: ProjectReviewStatus.FINALIZED,
    });

    await expect(
      service.create(clientId, projectId, reviewId, { title: 'X' }, {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
