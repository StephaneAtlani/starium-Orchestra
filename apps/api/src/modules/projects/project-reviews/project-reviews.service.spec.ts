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
import { ProjectReviewInvitationsService } from './project-review-invitations.service';

describe('ProjectReviewsService (RFC-PROJ-013-1)', () => {
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
    projectReviewActionItem: {
      deleteMany: jest.Mock;
      createMany: jest.Mock;
      create: jest.Mock;
    };
    projectReviewActionItemContributor: { deleteMany: jest.Mock };
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
  let invitations: { invite: jest.Mock };

  const clientId = 'c1';
  const projectId = 'p1';
  const reviewId = 'rev1';

  const reviewInclude = expect.any(Object);

  function reviewRow(overrides: Record<string, unknown> = {}) {
    return {
      id: reviewId,
      clientId,
      projectId,
      reviewDate: new Date('2025-06-01'),
      reviewType: ProjectReviewType.COPIL,
      status: ProjectReviewStatus.IN_REVIEW,
      title: 'Point',
      executiveSummary: null,
      contentPayload: null,
      meetingMode: null,
      meetingUrl: null,
      location: null,
      startedAt: null,
      startedByUserId: null,
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
      agendaItems: [],
      startedBy: null,
      ...overrides,
    };
  }

  beforeEach(() => {
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    projects = {
      getProjectForScope: jest.fn().mockResolvedValue({
        id: projectId,
        status: ProjectStatus.IN_PROGRESS,
      }),
      assertClientUser: jest.fn().mockResolvedValue(undefined),
    };
    pilotage = {
      computedHealth: jest.fn().mockReturnValue('GREEN'),
    };
    invitations = {
      invite: jest.fn().mockResolvedValue({
        notified: 1,
        skippedExternal: 0,
        skippedInactive: 0,
        participantIds: ['part1'],
      }),
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
      projectReviewActionItem: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
        create: jest.fn(),
      },
      projectReviewActionItemContributor: { deleteMany: jest.fn() },
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
          projectReviewActionItemContributor:
            prisma.projectReviewActionItemContributor,
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
      invitations as unknown as ProjectReviewInvitationsService,
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
      reviewRow({ status: ProjectReviewStatus.FINALIZED }),
    );
    await expect(
      service.update(clientId, projectId, reviewId, { title: 'x' }, {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('create IMMEDIATE → IN_REVIEW ; PLANNED → PLANNED', async () => {
    prisma.projectReview.create.mockImplementation(({ data }) =>
      Promise.resolve(reviewRow({ status: data.status })),
    );

    await service.create(
      clientId,
      projectId,
      {
        reviewDate: '2025-06-01T10:00:00.000Z',
        reviewType: ProjectReviewType.COPIL,
        creationMode: 'IMMEDIATE',
      },
      {},
    );
    expect(prisma.projectReview.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: ProjectReviewStatus.IN_REVIEW }),
      }),
    );

    await service.create(
      clientId,
      projectId,
      {
        reviewDate: '2025-06-01T10:00:00.000Z',
        reviewType: ProjectReviewType.COPIL,
        creationMode: 'PLANNED',
      },
      {},
    );
    expect(prisma.projectReview.create).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: ProjectReviewStatus.PLANNED }),
      }),
    );
  });

  it('create POST_MORTEM + PLANNED → 400', async () => {
    projects.getProjectForScope.mockResolvedValueOnce({
      id: projectId,
      status: ProjectStatus.COMPLETED,
    });
    await expect(
      service.create(clientId, projectId, {
        reviewDate: '2025-06-01T10:00:00.000Z',
        reviewType: ProjectReviewType.POST_MORTEM,
        creationMode: 'PLANNED',
      }),
    ).rejects.toThrow(/ne peut pas être planifié/i);
    expect(prisma.projectReview.create).not.toHaveBeenCalled();
  });

  it('startReview PLANNED → IN_REVIEW + audit started', async () => {
    prisma.projectReview.findFirst.mockResolvedValue(
      reviewRow({ status: ProjectReviewStatus.PLANNED }),
    );
    prisma.projectReview.update.mockResolvedValue(
      reviewRow({ status: ProjectReviewStatus.IN_REVIEW, startedAt: new Date() }),
    );

    await service.startReview(clientId, projectId, reviewId, {
      actorUserId: 'u1',
      meta: {},
    });

    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_STARTED,
        newValue: expect.objectContaining({
          previousStatus: ProjectReviewStatus.PLANNED,
          newStatus: ProjectReviewStatus.IN_REVIEW,
        }),
      }),
    );
    expect(
      JSON.stringify(auditLogs.create.mock.calls),
    ).not.toMatch(/meetingUrl/i);
  });

  it('startReview 2e appel IN_REVIEW → erreur stable', async () => {
    prisma.projectReview.findFirst.mockResolvedValue(
      reviewRow({ status: ProjectReviewStatus.IN_REVIEW }),
    );
    await expect(
      service.startReview(clientId, projectId, reviewId, {}),
    ).rejects.toThrow('La revue est déjà en cours.');
  });

  it('finalize refuse PLANNED', async () => {
    prisma.projectReview.findFirst.mockResolvedValue(
      reviewRow({ status: ProjectReviewStatus.PLANNED }),
    );
    prisma.$transaction.mockImplementation(
      async (fn: (tx: Record<string, unknown>) => Promise<unknown>) =>
        fn({
          projectReview: { findFirst: prisma.projectReview.findFirst },
        }),
    );
    await expect(
      service.finalize(clientId, projectId, reviewId, {}),
    ).rejects.toThrow(/Démarrez d’abord/i);
  });

  it('finalize OK depuis IN_REVIEW avec snapshot sans meetingUrl', async () => {
    prisma.projectReview.findFirst.mockResolvedValue(
      reviewRow({
        status: ProjectReviewStatus.IN_REVIEW,
        meetingMode: 'REMOTE',
        meetingUrl: 'https://teams.example.com/secret',
        location: 'Salle A',
      }),
    );
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

    prisma.projectReview.update.mockImplementation(({ data }) =>
      Promise.resolve(reviewRow({ ...data, status: ProjectReviewStatus.FINALIZED })),
    );

    prisma.$transaction.mockImplementation(
      async (fn: (tx: Record<string, unknown>) => Promise<unknown>) =>
        fn({
          projectReview: {
            findFirst: prisma.projectReview.findFirst,
            update: prisma.projectReview.update,
          },
          project: { findFirst: prisma.project.findFirst },
          projectTask: { findMany: prisma.projectTask.findMany },
          projectRisk: { findMany: prisma.projectRisk.findMany },
          projectMilestone: { findMany: prisma.projectMilestone.findMany },
          projectBudgetLink: { findMany: prisma.projectBudgetLink.findMany },
        }),
    );

    await service.finalize(clientId, projectId, reviewId, { actorUserId: 'u1' });

    const updateCall = prisma.projectReview.update.mock.calls[0][0];
    const snapshot = updateCall.data.snapshotPayload as Record<string, unknown>;
    expect(snapshot.meeting).toEqual(
      expect.objectContaining({ meetingMode: 'REMOTE', location: 'Salle A' }),
    );
    expect(JSON.stringify(snapshot)).not.toMatch(/meetingUrl/i);
  });

  it('meetingUrl javascript: refusé à la création', async () => {
    await expect(
      service.create(clientId, projectId, {
        reviewDate: '2025-06-01T10:00:00.000Z',
        reviewType: ProjectReviewType.COPIL,
        meetingMode: 'REMOTE',
        meetingUrl: 'javascript:alert(1)',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('meetingUrl sans mode REMOTE/HYBRID → 400', async () => {
    await expect(
      service.create(clientId, projectId, {
        reviewDate: '2025-06-01T10:00:00.000Z',
        reviewType: ProjectReviewType.COPIL,
        meetingMode: 'ONSITE',
        meetingUrl: 'https://example.com/meet',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('cancel autorisé depuis PLANNED et IN_REVIEW', async () => {
    for (const status of [
      ProjectReviewStatus.PLANNED,
      ProjectReviewStatus.IN_REVIEW,
    ]) {
      prisma.projectReview.findFirst.mockResolvedValue(reviewRow({ status }));
      prisma.projectReview.update.mockResolvedValue(
        reviewRow({ status: ProjectReviewStatus.CANCELLED }),
      );
      await service.cancel(clientId, projectId, reviewId, {});
    }
  });

  it('update spawn next review en PLANNED', async () => {
    const existing = reviewRow({
      participants: [
        {
          id: 'pp1',
          clientId,
          projectReviewId: reviewId,
          userId: 'u1',
          displayName: 'Alice',
          attended: true,
          isRequired: false,
          roleLabel: null,
          attendanceStatus: 'EXPECTED',
          user: null,
        },
      ],
    });
    prisma.projectReview.findFirst
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(null);
    prisma.projectReview.update.mockResolvedValue({});
    prisma.projectReview.create.mockResolvedValue({ id: 'rev2' });
    prisma.projectReview.findFirstOrThrow.mockResolvedValue({
      ...existing,
      nextReviewDate: new Date('2025-07-01T10:00:00.000Z'),
    });

    await service.update(clientId, projectId, reviewId, {
      nextReviewDate: '2025-07-01T10:00:00.000Z',
    });

    expect(prisma.projectReview.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ProjectReviewStatus.PLANNED,
        }),
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

  it('auto_create : revue créée même si invitation auto échoue', async () => {
    const plannedRow = reviewRow({
      status: ProjectReviewStatus.PLANNED,
      participants: [{ id: 'p1', userId: 'u1', displayName: null }],
    });
    prisma.projectReview.create.mockResolvedValue(plannedRow);
    prisma.projectReview.findFirst.mockResolvedValue(plannedRow);
    invitations.invite.mockRejectedValue(new Error('notification failed'));

    const result = await service.create(
      clientId,
      projectId,
      {
        reviewDate: '2025-06-01T10:00:00.000Z',
        reviewType: ProjectReviewType.COPIL,
        creationMode: 'PLANNED',
        participants: [{ userId: 'u1' }],
      },
      { actorUserId: 'admin' },
    );

    expect(result.status).toBe(ProjectReviewStatus.PLANNED);
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_INVITE_FAILED,
      }),
    );
  });

  it('auto_create déclenche invite pour PLANNED avec participants internes', async () => {
    prisma.projectReview.create.mockResolvedValue(
      reviewRow({
        status: ProjectReviewStatus.PLANNED,
        participants: [{ id: 'p1', userId: 'u1', displayName: null }],
      }),
    );
    prisma.projectReview.findFirst.mockResolvedValue(
      reviewRow({
        status: ProjectReviewStatus.PLANNED,
        participants: [{ id: 'p1', userId: 'u1', displayName: null }],
      }),
    );

    await service.create(
      clientId,
      projectId,
      {
        reviewDate: '2025-06-01T10:00:00.000Z',
        reviewType: ProjectReviewType.COPIL,
        creationMode: 'PLANNED',
        participants: [{ userId: 'u1' }],
      },
      { actorUserId: 'admin' },
    );

    expect(invitations.invite).toHaveBeenCalledWith(
      clientId,
      projectId,
      reviewId,
      expect.any(Object),
      { trigger: 'auto_create' },
    );
  });

  it('update PLANNED refuse les champs compte rendu', async () => {
    prisma.projectReview.findFirst.mockResolvedValue(
      reviewRow({ status: ProjectReviewStatus.PLANNED }),
    );

    await expect(
      service.update(clientId, projectId, reviewId, {
        decisions: [{ title: 'Décision' }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('update PLANNED avec changement reviewDate déclenche auto_date_change', async () => {
    prisma.projectReview.findFirst
      .mockResolvedValueOnce(
        reviewRow({
          status: ProjectReviewStatus.PLANNED,
          reviewDate: new Date('2025-06-01T10:00:00.000Z'),
        }),
      )
      .mockResolvedValueOnce(
        reviewRow({
          status: ProjectReviewStatus.PLANNED,
          reviewDate: new Date('2025-06-15T10:00:00.000Z'),
        }),
      );
    prisma.projectReview.update.mockResolvedValue({});
    prisma.projectReview.findFirstOrThrow.mockResolvedValue(
      reviewRow({
        status: ProjectReviewStatus.PLANNED,
        reviewDate: new Date('2025-06-15T10:00:00.000Z'),
      }),
    );

    await service.update(
      clientId,
      projectId,
      reviewId,
      { reviewDate: '2025-06-15T10:00:00.000Z' },
      { actorUserId: 'admin' },
    );

    expect(invitations.invite).toHaveBeenCalledWith(
      clientId,
      projectId,
      reviewId,
      expect.any(Object),
      { trigger: 'auto_date_change' },
    );
  });

  it('update PLANNED sans changement reviewDate ne déclenche pas auto_date_change', async () => {
    const sameDate = new Date('2025-06-01T10:00:00.000Z');
    prisma.projectReview.findFirst.mockResolvedValue(
      reviewRow({ status: ProjectReviewStatus.PLANNED, reviewDate: sameDate }),
    );
    prisma.projectReview.update.mockResolvedValue({});
    prisma.projectReview.findFirstOrThrow.mockResolvedValue(
      reviewRow({ status: ProjectReviewStatus.PLANNED, reviewDate: sameDate }),
    );

    await service.update(
      clientId,
      projectId,
      reviewId,
      { reviewDate: sameDate.toISOString(), title: 'Nouveau titre' },
      { actorUserId: 'admin' },
    );

    expect(invitations.invite).not.toHaveBeenCalled();
  });
});
