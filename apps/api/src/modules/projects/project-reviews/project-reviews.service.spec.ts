import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  ProjectReviewStatus,
  ProjectReviewType,
  ProjectStatus,
  ProjectTaskStatus,
} from '@prisma/client';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import {
  PROJECT_AUDIT_ACTION,
  PROJECT_AUDIT_RESOURCE_TYPE,
} from '../project-audit.constants';
import { ProjectsPilotageService } from '../projects-pilotage.service';
import { ProjectsService } from '../projects.service';
import { ProjectReviewsService } from './project-reviews.service';

describe('ProjectReviewsService (RFC-PROJ-013)', () => {
  let service: ProjectReviewsService;
  let prisma: {
    projectReview: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findFirstOrThrow: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      deleteMany: jest.Mock;
    };
    projectReviewParticipant: { deleteMany: jest.Mock; createMany: jest.Mock };
    projectReviewDecision: { deleteMany: jest.Mock; createMany: jest.Mock };
    projectReviewActionItem: { deleteMany: jest.Mock; createMany: jest.Mock };
    projectTask: { findFirst: jest.Mock; findMany: jest.Mock };
    project: { findFirst: jest.Mock };
    projectRisk: { findMany: jest.Mock };
    projectMilestone: { findMany: jest.Mock };
    projectBudgetLink: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let auditLogs: { create: jest.Mock };
  let projects: { getProjectForScope: jest.Mock; assertClientUser: jest.Mock };
  let pilotage: { computedHealth: jest.Mock };

  const clientId = 'c1';
  const projectId = 'p1';
  const reviewId = 'rev1';

  const reviewInclude = expect.any(Object);

  function draftReview(overrides: Record<string, unknown> = {}) {
    return {
      id: reviewId,
      clientId,
      projectId,
      reviewDate: new Date('2025-06-01'),
      reviewType: ProjectReviewType.COPIL,
      status: ProjectReviewStatus.DRAFT,
      title: 'Point',
      executiveSummary: null,
      contentPayload: null,
      facilitatorUserId: null,
      finalizedAt: null,
      finalizedByUserId: null,
      nextReviewDate: null,
      snapshotPayload: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      participants: [],
      decisions: [],
      actionItems: [],
      ...overrides,
    };
  }

  beforeEach(() => {
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    projects = {
      getProjectForScope: jest.fn().mockResolvedValue({ id: projectId }),
      assertClientUser: jest.fn().mockResolvedValue(undefined),
    };
    pilotage = {
      computedHealth: jest.fn().mockReturnValue('GREEN'),
    };
    prisma = {
      projectReview: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findFirstOrThrow: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
      projectReviewParticipant: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      projectReviewDecision: { deleteMany: jest.fn(), createMany: jest.fn() },
      projectReviewActionItem: { deleteMany: jest.fn(), createMany: jest.fn() },
      projectTask: { findFirst: jest.fn(), findMany: jest.fn() },
      project: { findFirst: jest.fn() },
      projectRisk: { findMany: jest.fn() },
      projectMilestone: { findMany: jest.fn() },
      projectBudgetLink: { findMany: jest.fn() },
      $transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          projectReview: prisma.projectReview,
          projectReviewParticipant: prisma.projectReviewParticipant,
          projectReviewDecision: prisma.projectReviewDecision,
          projectReviewActionItem: prisma.projectReviewActionItem,
          projectTask: prisma.projectTask,
          project: prisma.project,
          projectRisk: prisma.projectRisk,
          projectMilestone: prisma.projectMilestone,
          projectBudgetLink: prisma.projectBudgetLink,
        }),
      ),
    };
    service = new ProjectReviewsService(
      prisma as never,
      projects as unknown as ProjectsService,
      pilotage as unknown as ProjectsPilotageService,
      auditLogs as unknown as AuditLogsService,
    );
  });

  it('getById lève NotFound si review hors scope', async () => {
    prisma.projectReview.findFirst.mockResolvedValue(null);
    await expect(
      service.getById(clientId, projectId, reviewId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('update refuse si statut FINALIZED', async () => {
    prisma.projectReview.findFirst.mockResolvedValue(
      draftReview({ status: ProjectReviewStatus.FINALIZED }),
    );
    await expect(
      service.update(clientId, projectId, reviewId, { title: 'x' }, {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('finalize appelle update avec snapshot et statut FINALIZED', async () => {
    prisma.projectReview.findFirst
      .mockResolvedValueOnce(draftReview())
      .mockResolvedValueOnce(null);
    prisma.project.findFirst.mockResolvedValue({
      id: projectId,
      clientId,
      name: 'P',
      status: ProjectStatus.IN_PROGRESS,
      priority: 'HIGH',
      progressPercent: 50,
      arbitrationMetierStatus: 'BROUILLON',
      arbitrationComiteStatus: null,
      arbitrationCodirStatus: null,
      arbitrationStatus: null,
    });
    prisma.projectTask.findMany.mockResolvedValue([]);
    prisma.projectRisk.findMany.mockResolvedValue([]);
    prisma.projectMilestone.findMany.mockResolvedValue([]);
    prisma.projectBudgetLink.findMany.mockResolvedValue([]);

    const finalizedRow = draftReview({
      status: ProjectReviewStatus.FINALIZED,
      finalizedAt: new Date(),
      finalizedByUserId: 'u1',
      snapshotPayload: { generatedAt: '2025-01-01T00:00:00.000Z' },
    });
    prisma.projectReview.update.mockResolvedValue(finalizedRow);

    prisma.$transaction.mockImplementation(
      async (fn: (tx: Record<string, unknown>) => Promise<unknown>) => {
        return fn({
          projectReview: {
            findFirst: prisma.projectReview.findFirst,
            update: prisma.projectReview.update,
          },
          project: { findFirst: prisma.project.findFirst },
          projectTask: { findMany: prisma.projectTask.findMany },
          projectRisk: { findMany: prisma.projectRisk.findMany },
          projectMilestone: { findMany: prisma.projectMilestone.findMany },
          projectBudgetLink: { findMany: prisma.projectBudgetLink.findMany },
        });
      },
    );

    await service.finalize(clientId, projectId, reviewId, {
      actorUserId: 'u1',
      meta: {},
    });

    expect(prisma.projectReview.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: reviewId },
        data: expect.objectContaining({
          status: ProjectReviewStatus.FINALIZED,
          finalizedByUserId: 'u1',
        }),
        include: reviewInclude,
      }),
    );
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_FINALIZED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW,
        resourceId: reviewId,
      }),
    );
  });

  it('linkedTaskId absent lève NotFound', async () => {
    prisma.projectTask.findFirst.mockResolvedValue(null);
    await expect(
      service.create(
        clientId,
        projectId,
        {
          reviewDate: '2025-06-01T10:00:00.000Z',
          reviewType: ProjectReviewType.COPRO,
          actionItems: [
            {
              title: 'A',
              status: ProjectTaskStatus.TODO,
              linkedTaskId: 'bad-task',
            },
          ],
        },
        {},
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('cancel refuse si FINALIZED', async () => {
    prisma.projectReview.findFirst.mockResolvedValue(
      draftReview({ status: ProjectReviewStatus.FINALIZED }),
    );
    await expect(
      service.cancel(clientId, projectId, reviewId, {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
