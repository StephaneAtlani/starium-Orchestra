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

describe('ProjectReviewsService (RFC-PROJ-013-2 Phase A)', () => {
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
      update: jest.Mock;
    };
    projectReviewActionItemContributor: { deleteMany: jest.Mock };
    projectReviewEscalation: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      groupBy: jest.Mock;
    };
    projectReviewDescent: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      groupBy: jest.Mock;
      count: jest.Mock;
    };
    projectReviewAgendaItem: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      deleteMany: jest.Mock;
      aggregate: jest.Mock;
    };
    projectTask: { findFirst: jest.Mock; findMany: jest.Mock; create: jest.Mock };
    project: { findFirst: jest.Mock };
    projectRisk: { findMany: jest.Mock; create: jest.Mock };
    riskType: { findFirst: jest.Mock };
    projectMilestone: { findMany: jest.Mock };
    projectBudgetLink: { findMany: jest.Mock };
    client: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };
  let auditLogs: { create: jest.Mock };
  let projects: { getProjectForScope: jest.Mock; assertClientUser: jest.Mock };
  let pilotage: { computedHealth: jest.Mock };
  let invitations: { invite: jest.Mock };
  let emailReport: { sendReport: jest.Mock };

  const clientId = 'c1';
  const projectId = 'p1';
  const reviewId = 'rev1';

  function reviewRow(overrides: Record<string, unknown> = {}) {
    return {
      id: reviewId,
      clientId,
      projectId,
      reviewDate: new Date('2025-06-01'),
      reviewType: ProjectReviewType.COPIL,
      status: ProjectReviewStatus.IN_PROGRESS,
      title: 'Point',
      objective: null,
      executiveSummary: null,
      periodStart: null,
      periodEnd: null,
      durationMinutes: null,
      contentPayload: null,
      meetingMode: null,
      meetingUrl: null,
      location: null,
      startedAt: null,
      startedByUserId: null,
      createdByUserId: null,
      cancelledAt: null,
      cancelledByUserId: null,
      facilitatorUserId: null,
      finalizedAt: null,
      finalizedByUserId: null,
      agendaLockedAt: null,
      agendaLockedByUserId: null,
      conductClosedAt: null,
      seriesId: null,
      nextReviewDate: null,
      snapshotPayload: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      participants: [],
      decisions: [],
      actionItems: [],
      agendaItems: [],
      attachments: [],
      facilitator: null,
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
        notifiedInApp: 1,
        skippedExternal: 0,
        skippedInactive: 0,
        participantIds: ['part1'],
      }),
    };
    emailReport = { sendReport: jest.fn() };
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
        update: jest.fn(),
      },
      projectReviewActionItemContributor: { deleteMany: jest.fn() },
      projectReviewEscalation: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      projectReviewDescent: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        groupBy: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      projectReviewAgendaItem: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({ _max: { orderIndex: 0 } }),
      },
      projectTask: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn() },
      project: { findFirst: jest.fn() },
      projectRisk: { findMany: jest.fn(), create: jest.fn() },
      riskType: { findFirst: jest.fn() },
      projectMilestone: { findMany: jest.fn() },
      projectBudgetLink: { findMany: jest.fn() },
      client: {
        findFirst: jest.fn().mockResolvedValue({ name: 'NeoTech AI' }),
      },
      $transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          projectReview: prisma.projectReview,
          projectReviewParticipant: prisma.projectReviewParticipant,
          projectReviewDecision: prisma.projectReviewDecision,
          projectReviewActionItem: prisma.projectReviewActionItem,
          projectReviewActionItemContributor:
            prisma.projectReviewActionItemContributor,
          projectReviewEscalation: prisma.projectReviewEscalation,
          projectReviewDescent: prisma.projectReviewDescent,
          projectReviewAgendaItem: prisma.projectReviewAgendaItem,
          projectTask: prisma.projectTask,
          project: prisma.project,
          projectRisk: prisma.projectRisk,
          riskType: prisma.riskType,
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
      emailReport as never,
    );
  });

  it('getReportPreview renvoie le payload stocké sans rebuild', async () => {
    prisma.projectReview.findFirst.mockResolvedValue(
      reviewRow({
        status: ProjectReviewStatus.FINALIZED,
        lastSentReportHtml: '<p>CR figé</p>',
        lastSentReportText: 'CR figé',
        lastSentReportSubject: 'Sujet figé',
        lastSentReportTitle: 'Titre figé',
      }),
    );

    const preview = await service.getReportPreview(clientId, projectId, reviewId);

    expect(preview).toEqual({
      subject: 'Sujet figé',
      title: 'Titre figé',
      text: 'CR figé',
      html: '<p>CR figé</p>',
    });
    expect(prisma.project.findFirst).not.toHaveBeenCalled();
  });

  const snapshotUnavailable = 'Snapshot indisponible — point antérieur à la version 2';

  function frozenSnapshot(
    committeeMood: 'GREEN' | 'ORANGE' | 'RED' | null = null,
  ) {
    return {
      schemaVersion: 2,
      review: {
        type: 'COPIL',
        title: 'Point figé',
        objective: null,
        periodStart: null,
        periodEnd: null,
        reviewDate: '2026-07-14T19:00:00.000Z',
        durationMinutes: null,
        facilitatorDisplayName: null,
        committeeMood,
      },
      project: {
        id: projectId,
        name: 'Telephonie',
        status: 'IN_PROGRESS',
        health: 'ORANGE',
        priority: 'HIGH',
      },
      meeting: { meetingMode: null, location: null },
      participants: [],
      agenda: [],
      attachments: [],
      decisions: [],
      actions: [],
      untreatedAgendaItems: [],
      arbitration: {
        arbitrationMetierStatus: null,
        arbitrationComiteStatus: null,
        arbitrationCodirStatus: null,
        arbitrationStatus: null,
      },
      progress: { globalProgress: 40 },
      tasks: { open: 0, inProgress: 0, done: 0, late: 0 },
      risks: {
        open: 0,
        monitored: 0,
        mitigated: 0,
        closed: 0,
        topRisks: [],
      },
      milestones: [],
      budget: { links: [] },
      nextSteps: null,
    };
  }

  it('preview et send refusent sans snapshot v2', async () => {
    prisma.projectReview.findFirst.mockResolvedValue(
      reviewRow({
        status: ProjectReviewStatus.FINALIZED,
        snapshotPayload: null,
      }),
    );

    await expect(
      service.getReportPreview(clientId, projectId, reviewId),
    ).rejects.toMatchObject({ message: snapshotUnavailable });
    await expect(
      service.sendReport(clientId, projectId, reviewId),
    ).rejects.toMatchObject({ message: snapshotUnavailable });
    expect(emailReport.sendReport).not.toHaveBeenCalled();
    expect(prisma.projectReview.update).not.toHaveBeenCalled();
    expect(prisma.client.findFirst).not.toHaveBeenCalled();
  });

  it('preview stocké + snapshot null : HTML stocké, send 400', async () => {
    prisma.projectReview.findFirst.mockResolvedValue(
      reviewRow({
        status: ProjectReviewStatus.FINALIZED,
        snapshotPayload: null,
        lastSentReportHtml: '<p>CR figé</p>',
        lastSentReportText: 'CR figé',
        lastSentReportSubject: 'Sujet figé',
        lastSentReportTitle: 'Titre figé',
      }),
    );

    await expect(
      service.getReportPreview(clientId, projectId, reviewId),
    ).resolves.toEqual({
      subject: 'Sujet figé',
      title: 'Titre figé',
      text: 'CR figé',
      html: '<p>CR figé</p>',
    });
    await expect(
      service.sendReport(clientId, projectId, reviewId),
    ).rejects.toMatchObject({ message: snapshotUnavailable });
    expect(emailReport.sendReport).not.toHaveBeenCalled();
    expect(prisma.projectReview.update).not.toHaveBeenCalled();
  });

  it('preview météo : snapshot null ignore contentPayload.committeeMood', async () => {
    prisma.projectReview.findFirst.mockResolvedValue(
      reviewRow({
        status: ProjectReviewStatus.FINALIZED,
        snapshotPayload: frozenSnapshot(null),
        contentPayload: { committeeMood: 'ORANGE' },
      }),
    );

    const preview = await service.getReportPreview(clientId, projectId, reviewId);

    expect(preview.html).toContain('Non renseignée');
    expect(preview.html).not.toContain('Mitigé');
    expect(preview.text).toContain('Non renseignée');
    expect(preview.text).not.toContain('Mitigé');
    expect(prisma.projectReview.findMany).not.toHaveBeenCalled();
  });

  it('getReportPreview IN_PROGRESS construit un aperçu sans écrire le snapshot', async () => {
    prisma.projectReview.findFirst.mockResolvedValue(
      reviewRow({
        status: ProjectReviewStatus.IN_PROGRESS,
        title: 'Point en cours',
      }),
    );
    prisma.project.findFirst.mockResolvedValue({
      id: projectId,
      clientId,
      name: 'Telephonie',
      status: ProjectStatus.IN_PROGRESS,
      priority: 'HIGH',
      progressPercent: 40,
      arbitrationMetierStatus: null,
      arbitrationComiteStatus: null,
      arbitrationCodirStatus: null,
      arbitrationStatus: null,
    });
    prisma.projectTask.findMany.mockResolvedValue([]);
    prisma.projectRisk.findMany.mockResolvedValue([]);
    prisma.projectMilestone.findMany.mockResolvedValue([]);
    prisma.projectBudgetLink.findMany.mockResolvedValue([]);

    const preview = await service.getReportPreview(clientId, projectId, reviewId);

    expect(preview.html).toContain('Telephonie');
    expect(preview.text).toContain('Telephonie');
    expect(prisma.projectReview.update).not.toHaveBeenCalled();
  });

  it('sendReport refuse un point encore en conduite', async () => {
    prisma.projectReview.findFirst.mockResolvedValue(
      reviewRow({ status: ProjectReviewStatus.IN_PROGRESS }),
    );

    await expect(
      service.sendReport(clientId, projectId, reviewId),
    ).rejects.toMatchObject({
      message: 'Le compte rendu est disponible une fois le point finalisé.',
    });
    expect(emailReport.sendReport).not.toHaveBeenCalled();
  });

  it('getReportPreview refuse PREPARING', async () => {
    prisma.projectReview.findFirst.mockResolvedValue(
      reviewRow({ status: ProjectReviewStatus.PREPARING }),
    );

    await expect(
      service.getReportPreview(clientId, projectId, reviewId),
    ).rejects.toMatchObject({
      message:
        'Le compte rendu brouillon est disponible pendant la conduite du point.',
    });
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

  it('create PREPARING par défaut ; IMMEDIATE → IN_PROGRESS ; SCHEDULED → SCHEDULED', async () => {
    prisma.projectReview.create.mockImplementation(({ data }) =>
      Promise.resolve(reviewRow({ status: data.status, reviewDate: data.reviewDate })),
    );

    await service.create(
      clientId,
      projectId,
      { reviewType: ProjectReviewType.COPIL },
      { actorUserId: 'u1' },
    );
    expect(prisma.projectReview.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ProjectReviewStatus.PREPARING,
          createdByUserId: 'u1',
        }),
      }),
    );

    await service.create(
      clientId,
      projectId,
      {
        reviewType: ProjectReviewType.COPIL,
        creationMode: 'IMMEDIATE',
      },
      {},
    );
    expect(prisma.projectReview.create).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ProjectReviewStatus.IN_PROGRESS,
          startedAt: expect.any(Date),
        }),
      }),
    );

    await service.create(
      clientId,
      projectId,
      {
        reviewDate: '2025-06-01T10:00:00.000Z',
        reviewType: ProjectReviewType.COPIL,
        creationMode: 'SCHEDULED',
      },
      {},
    );
    expect(prisma.projectReview.create).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: ProjectReviewStatus.SCHEDULED }),
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
        data: expect.objectContaining({ status: ProjectReviewStatus.SCHEDULED }),
      }),
    );
  });

  it('create SCHEDULED sans reviewDate → 400', async () => {
    await expect(
      service.create(clientId, projectId, {
        reviewType: ProjectReviewType.COPIL,
        creationMode: 'SCHEDULED',
      }),
    ).rejects.toThrow(/date de revue est obligatoire/i);
  });

  it('create POST_MORTEM + SCHEDULED → 400', async () => {
    projects.getProjectForScope.mockResolvedValueOnce({
      id: projectId,
      status: ProjectStatus.COMPLETED,
    });
    await expect(
      service.create(clientId, projectId, {
        reviewDate: '2025-06-01T10:00:00.000Z',
        reviewType: ProjectReviewType.POST_MORTEM,
        creationMode: 'SCHEDULED',
      }),
    ).rejects.toThrow(/ne peut pas être planifié/i);
    expect(prisma.projectReview.create).not.toHaveBeenCalled();
  });

  it('schedule PREPARING → SCHEDULED + audit', async () => {
    prisma.projectReview.findFirst.mockResolvedValue(
      reviewRow({ status: ProjectReviewStatus.PREPARING, reviewDate: null }),
    );
    prisma.projectReview.update.mockResolvedValue(
      reviewRow({
        status: ProjectReviewStatus.SCHEDULED,
        reviewDate: new Date('2025-06-15T10:00:00.000Z'),
      }),
    );

    await service.schedule(
      clientId,
      projectId,
      reviewId,
      { reviewDate: '2025-06-15T10:00:00.000Z' },
      { actorUserId: 'u1' },
    );

    expect(prisma.projectReview.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ProjectReviewStatus.SCHEDULED,
        }),
      }),
    );
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_UPDATED,
      }),
    );
  });

  it('start SCHEDULED → IN_PROGRESS + audit started', async () => {
    prisma.projectReview.findFirst.mockResolvedValue(
      reviewRow({ status: ProjectReviewStatus.SCHEDULED }),
    );
    prisma.projectReview.update.mockResolvedValue(
      reviewRow({ status: ProjectReviewStatus.IN_PROGRESS, startedAt: new Date() }),
    );

    await service.start(clientId, projectId, reviewId, {
      actorUserId: 'u1',
      meta: {},
    });

    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_STARTED,
        newValue: expect.objectContaining({
          previousStatus: ProjectReviewStatus.SCHEDULED,
          newStatus: ProjectReviewStatus.IN_PROGRESS,
        }),
      }),
    );
    expect(
      JSON.stringify(auditLogs.create.mock.calls),
    ).not.toMatch(/meetingUrl/i);
  });

  it('start 2e appel IN_PROGRESS → erreur stable', async () => {
    prisma.projectReview.findFirst.mockResolvedValue(
      reviewRow({ status: ProjectReviewStatus.IN_PROGRESS }),
    );
    await expect(
      service.start(clientId, projectId, reviewId, {}),
    ).rejects.toThrow('La revue est déjà en cours.');
  });

  it('finalize refuse SCHEDULED', async () => {
    prisma.projectReview.findFirst.mockResolvedValue(
      reviewRow({ status: ProjectReviewStatus.SCHEDULED }),
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

  it('finalize refuse sans conductClosedAt (pilotage)', async () => {
    prisma.projectReview.findFirst.mockResolvedValue(
      reviewRow({
        status: ProjectReviewStatus.IN_PROGRESS,
        conductClosedAt: null,
      }),
    );
    prisma.$transaction.mockImplementation(
      async (fn: (tx: Record<string, unknown>) => Promise<unknown>) =>
        fn({
          projectReview: { findFirst: prisma.projectReview.findFirst },
        }),
    );
    await expect(
      service.finalize(clientId, projectId, reviewId, {}),
    ).rejects.toThrow(/Clôturez d’abord la conduite/i);
  });

  it('finalize POST_MORTEM OK sans conductClosedAt', async () => {
    prisma.projectReview.findFirst.mockResolvedValue(
      reviewRow({
        status: ProjectReviewStatus.IN_PROGRESS,
        reviewType: ProjectReviewType.POST_MORTEM,
        conductClosedAt: null,
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
      Promise.resolve(
        reviewRow({
          ...data,
          reviewType: ProjectReviewType.POST_MORTEM,
          status: ProjectReviewStatus.FINALIZED,
        }),
      ),
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
    await expect(
      service.finalize(clientId, projectId, reviewId, { actorUserId: 'u1' }),
    ).resolves.toBeDefined();
  });

  it('closeConduct pose conductClosedAt et garde IN_PROGRESS', async () => {
    prisma.projectReview.findFirst.mockResolvedValue(
      reviewRow({
        status: ProjectReviewStatus.IN_PROGRESS,
        conductClosedAt: null,
      }),
    );
    prisma.projectReview.update.mockImplementation(({ data }) =>
      Promise.resolve(
        reviewRow({
          status: ProjectReviewStatus.IN_PROGRESS,
          conductClosedAt: data.conductClosedAt,
        }),
      ),
    );

    const detail = await service.closeConduct(clientId, projectId, reviewId, {
      actorUserId: 'u1',
    });

    expect(prisma.projectReview.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          conductClosedAt: expect.any(Date),
        }),
      }),
    );
    expect(detail.status).toBe(ProjectReviewStatus.IN_PROGRESS);
    expect(detail.conductClosedAt).toBeTruthy();
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_CONDUCT_CLOSED,
        resourceId: reviewId,
      }),
    );
  });

  it('closeConduct refuse déjà clôturé', async () => {
    prisma.projectReview.findFirst.mockResolvedValue(
      reviewRow({
        status: ProjectReviewStatus.IN_PROGRESS,
        conductClosedAt: new Date('2026-09-01'),
      }),
    );
    await expect(
      service.closeConduct(clientId, projectId, reviewId, {}),
    ).rejects.toThrow(/déjà clôturée/i);
  });

  it('closeConduct refuse hors IN_PROGRESS', async () => {
    prisma.projectReview.findFirst.mockResolvedValue(
      reviewRow({ status: ProjectReviewStatus.SCHEDULED }),
    );
    await expect(
      service.closeConduct(clientId, projectId, reviewId, {}),
    ).rejects.toThrow(/en cours/i);
  });

  it('closeConduct isole le client (404 autre client)', async () => {
    prisma.projectReview.findFirst.mockResolvedValue(null);
    await expect(
      service.closeConduct(clientId, projectId, reviewId, {}),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('finalize OK depuis IN_PROGRESS avec snapshot sans meetingUrl', async () => {
    prisma.projectReview.findFirst.mockResolvedValue(
      reviewRow({
        status: ProjectReviewStatus.IN_PROGRESS,
        conductClosedAt: new Date('2026-09-10T10:00:00Z'),
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
    expect(snapshot.schemaVersion).toBe(2);
    expect(snapshot.meeting).toEqual(
      expect.objectContaining({ meetingMode: 'REMOTE', location: 'Salle A' }),
    );
    expect(JSON.stringify(snapshot)).not.toMatch(/meetingUrl/i);
    expect(JSON.stringify(snapshot)).not.toMatch(/"url"/);
  });

  it('finalize sans flags ne crée ni tâche ni risque', async () => {
    prisma.projectReview.findFirst.mockResolvedValue(
      reviewRow({
        status: ProjectReviewStatus.IN_PROGRESS,
        conductClosedAt: new Date(),
        actionItems: [
          {
            id: 'a1',
            title: 'Action A',
            description: null,
            status: ProjectTaskStatus.TODO,
            priority: null,
            dueDate: null,
            linkedTaskId: null,
            responsibleUserId: null,
            agendaItemId: null,
            decisionId: null,
            contributors: [],
          },
        ],
        agendaItems: [
          {
            id: 'ag1',
            title: 'Sujet',
            notes: 'Risque : Fuite',
            itemType: 'INFORMATION',
            status: 'DONE',
            orderIndex: 0,
          },
        ],
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
          projectTask: {
            findMany: prisma.projectTask.findMany,
            create: prisma.projectTask.create,
          },
          projectRisk: {
            findMany: prisma.projectRisk.findMany,
            create: prisma.projectRisk.create,
          },
          riskType: { findFirst: prisma.riskType.findFirst },
          projectReviewActionItem: { update: prisma.projectReviewActionItem.update },
          projectMilestone: { findMany: prisma.projectMilestone.findMany },
          projectBudgetLink: { findMany: prisma.projectBudgetLink.findMany },
        }),
    );

    await service.finalize(clientId, projectId, reviewId, { actorUserId: 'u1' }, {});
    expect(prisma.projectTask.create).not.toHaveBeenCalled();
    expect(prisma.projectRisk.create).not.toHaveBeenCalled();
  });

  it('finalize pushActionsToTasks crée tâche et lie l’action', async () => {
    const base = reviewRow({
      status: ProjectReviewStatus.IN_PROGRESS,
      conductClosedAt: new Date(),
      actionItems: [
        {
          id: 'a1',
          title: 'Action A',
          description: null,
          status: ProjectTaskStatus.TODO,
          priority: null,
          dueDate: null,
          linkedTaskId: null,
          responsibleUserId: 'u2',
          agendaItemId: null,
          decisionId: null,
          contributors: [],
        },
        {
          id: 'a2',
          title: 'Déjà liée',
          description: null,
          status: ProjectTaskStatus.TODO,
          priority: null,
          dueDate: null,
          linkedTaskId: 't-existing',
          responsibleUserId: null,
          agendaItemId: null,
          decisionId: null,
          contributors: [],
        },
      ],
    });
    prisma.projectReview.findFirst.mockResolvedValue(base);
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
    prisma.projectTask.create.mockResolvedValue({ id: 't-new' });
    prisma.projectReviewActionItem.update.mockResolvedValue({});
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
          projectTask: {
            findMany: prisma.projectTask.findMany,
            create: prisma.projectTask.create,
          },
          projectRisk: { findMany: prisma.projectRisk.findMany },
          projectReviewActionItem: { update: prisma.projectReviewActionItem.update },
          projectMilestone: { findMany: prisma.projectMilestone.findMany },
          projectBudgetLink: { findMany: prisma.projectBudgetLink.findMany },
        }),
    );

    await service.finalize(
      clientId,
      projectId,
      reviewId,
      { actorUserId: 'u1' },
      { pushActionsToTasks: true },
    );

    expect(prisma.projectTask.create).toHaveBeenCalledTimes(1);
    expect(prisma.projectTask.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Action A',
          ownerUserId: 'u2',
          status: ProjectTaskStatus.TODO,
        }),
      }),
    );
    expect(prisma.projectReviewActionItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'a1' },
        data: { linkedTaskId: 't-new' },
      }),
    );
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_ACTIONS_PUSHED,
        newValue: expect.objectContaining({ created: 1, skippedLinked: 1 }),
      }),
    );
  });

  it('finalize promoteRiskNotes crée risque et skip sans riskType', async () => {
    prisma.projectReview.findFirst.mockResolvedValue(
      reviewRow({
        status: ProjectReviewStatus.IN_PROGRESS,
        conductClosedAt: new Date(),
        agendaItems: [
          {
            id: 'ag1',
            title: 'Sujet',
            notes: 'Risque : Fuite données\nAutre note',
            itemType: 'RISK',
            status: 'DONE',
            orderIndex: 0,
          },
        ],
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
    prisma.riskType.findFirst.mockResolvedValue(null);
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
          projectRisk: {
            findMany: prisma.projectRisk.findMany,
            create: prisma.projectRisk.create,
          },
          riskType: { findFirst: prisma.riskType.findFirst },
          projectMilestone: { findMany: prisma.projectMilestone.findMany },
          projectBudgetLink: { findMany: prisma.projectBudgetLink.findMany },
        }),
    );

    await service.finalize(
      clientId,
      projectId,
      reviewId,
      { actorUserId: 'u1' },
      { promoteRiskNotes: true },
    );
    expect(prisma.projectRisk.create).not.toHaveBeenCalled();
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_RISKS_PROMOTED,
        newValue: expect.objectContaining({
          created: 0,
          skippedNoRiskType: true,
        }),
      }),
    );

    prisma.riskType.findFirst.mockResolvedValue({ id: 'rt1' });
    prisma.projectRisk.findMany.mockResolvedValue([]);
    prisma.projectRisk.create.mockResolvedValue({ id: 'risk1' });
    await service.finalize(
      clientId,
      projectId,
      reviewId,
      { actorUserId: 'u1' },
      { promoteRiskNotes: true },
    );
    expect(prisma.projectRisk.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Fuite données',
          riskTypeId: 'rt1',
          code: 'R-001',
        }),
      }),
    );
  });

  it('finalize POST_MORTEM ignore flags push', async () => {
    prisma.projectReview.findFirst.mockResolvedValue(
      reviewRow({
        status: ProjectReviewStatus.IN_PROGRESS,
        reviewType: ProjectReviewType.POST_MORTEM,
        conductClosedAt: null,
        actionItems: [
          {
            id: 'a1',
            title: 'Action A',
            description: null,
            status: ProjectTaskStatus.TODO,
            priority: null,
            dueDate: null,
            linkedTaskId: null,
            responsibleUserId: null,
            agendaItemId: null,
            decisionId: null,
            contributors: [],
          },
        ],
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
      Promise.resolve(
        reviewRow({
          ...data,
          reviewType: ProjectReviewType.POST_MORTEM,
          status: ProjectReviewStatus.FINALIZED,
        }),
      ),
    );
    prisma.$transaction.mockImplementation(
      async (fn: (tx: Record<string, unknown>) => Promise<unknown>) =>
        fn({
          projectReview: {
            findFirst: prisma.projectReview.findFirst,
            update: prisma.projectReview.update,
          },
          project: { findFirst: prisma.project.findFirst },
          projectTask: {
            findMany: prisma.projectTask.findMany,
            create: prisma.projectTask.create,
          },
          projectRisk: { findMany: prisma.projectRisk.findMany },
          projectMilestone: { findMany: prisma.projectMilestone.findMany },
          projectBudgetLink: { findMany: prisma.projectBudgetLink.findMany },
        }),
    );

    await service.finalize(
      clientId,
      projectId,
      reviewId,
      { actorUserId: 'u1' },
      { pushActionsToTasks: true, promoteRiskNotes: true },
    );
    expect(prisma.projectTask.create).not.toHaveBeenCalled();
  });

  it('meetingUrl javascript: refusé à la création', async () => {
    await expect(
      service.create(clientId, projectId, {
        reviewType: ProjectReviewType.COPIL,
        meetingMode: 'REMOTE',
        meetingUrl: 'javascript:alert(1)',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('meetingUrl sans mode REMOTE/HYBRID → 400', async () => {
    await expect(
      service.create(clientId, projectId, {
        reviewType: ProjectReviewType.COPIL,
        meetingMode: 'ONSITE',
        meetingUrl: 'https://example.com/meet',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('cancel autorisé depuis SCHEDULED et IN_PROGRESS + trace annulation', async () => {
    for (const status of [
      ProjectReviewStatus.SCHEDULED,
      ProjectReviewStatus.IN_PROGRESS,
    ]) {
      prisma.projectReview.findFirst.mockResolvedValue(reviewRow({ status }));
      prisma.projectReview.update.mockResolvedValue(
        reviewRow({
          status: ProjectReviewStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelledByUserId: 'u1',
        }),
      );
      await service.cancel(clientId, projectId, reviewId, { actorUserId: 'u1' });
    }
    expect(prisma.projectReview.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          cancelledAt: expect.any(Date),
          cancelledByUserId: 'u1',
        }),
      }),
    );
  });

  it('reopen depuis CANCELLED avec date → SCHEDULED et efface les marqueurs', async () => {
    prisma.projectReview.findFirst.mockResolvedValue(
      reviewRow({
        status: ProjectReviewStatus.CANCELLED,
        reviewDate: new Date('2025-06-01'),
        cancelledAt: new Date(),
        cancelledByUserId: 'u1',
      }),
    );
    prisma.projectReview.update.mockResolvedValue(
      reviewRow({ status: ProjectReviewStatus.SCHEDULED }),
    );

    await service.reopen(clientId, projectId, reviewId, { actorUserId: 'u2' });

    expect(prisma.projectReview.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ProjectReviewStatus.SCHEDULED,
          cancelledAt: null,
          cancelledByUserId: null,
        }),
      }),
    );
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_REOPENED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW,
      }),
    );
  });

  it('reopen depuis CANCELLED sans date → PREPARING', async () => {
    prisma.projectReview.findFirst.mockResolvedValue(
      reviewRow({ status: ProjectReviewStatus.CANCELLED, reviewDate: null }),
    );
    prisma.projectReview.update.mockResolvedValue(
      reviewRow({ status: ProjectReviewStatus.PREPARING }),
    );

    await service.reopen(clientId, projectId, reviewId, { actorUserId: 'u2' });

    expect(prisma.projectReview.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ProjectReviewStatus.PREPARING,
        }),
      }),
    );
  });

  it('reopen refusé si le point n’est pas annulé', async () => {
    prisma.projectReview.findFirst.mockResolvedValue(
      reviewRow({ status: ProjectReviewStatus.FINALIZED }),
    );
    await expect(
      service.reopen(clientId, projectId, reviewId, { actorUserId: 'u2' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('update spawn next review en SCHEDULED', async () => {
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
          status: ProjectReviewStatus.SCHEDULED,
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
    const scheduledRow = reviewRow({
      status: ProjectReviewStatus.SCHEDULED,
      participants: [{ id: 'p1', userId: 'u1', displayName: null }],
    });
    prisma.projectReview.create.mockResolvedValue(scheduledRow);
    prisma.projectReview.findFirst.mockResolvedValue(scheduledRow);
    invitations.invite.mockRejectedValue(new Error('notification failed'));

    const result = await service.create(
      clientId,
      projectId,
      {
        reviewDate: '2025-06-01T10:00:00.000Z',
        reviewType: ProjectReviewType.COPIL,
        creationMode: 'SCHEDULED',
        participants: [{ userId: 'u1' }],
      },
      { actorUserId: 'admin' },
    );

    expect(result.status).toBe(ProjectReviewStatus.SCHEDULED);
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_INVITE_FAILED,
      }),
    );
  });

  it('auto_create déclenche invite pour SCHEDULED avec participants internes', async () => {
    prisma.projectReview.create.mockResolvedValue(
      reviewRow({
        status: ProjectReviewStatus.SCHEDULED,
        participants: [{ id: 'p1', userId: 'u1', displayName: null }],
      }),
    );
    prisma.projectReview.findFirst.mockResolvedValue(
      reviewRow({
        status: ProjectReviewStatus.SCHEDULED,
        participants: [{ id: 'p1', userId: 'u1', displayName: null }],
      }),
    );

    await service.create(
      clientId,
      projectId,
      {
        reviewDate: '2025-06-01T10:00:00.000Z',
        reviewType: ProjectReviewType.COPIL,
        creationMode: 'SCHEDULED',
        participants: [{ userId: 'u1' }],
      },
      { actorUserId: 'admin' },
    );

    expect(invitations.invite).toHaveBeenCalledWith(
      clientId,
      projectId,
      reviewId,
      expect.any(Object),
      { trigger: 'auto_create', channels: ['in_app'] },
    );
  });

  it('update SCHEDULED refuse les champs compte rendu', async () => {
    prisma.projectReview.findFirst.mockResolvedValue(
      reviewRow({ status: ProjectReviewStatus.SCHEDULED }),
    );

    await expect(
      service.update(clientId, projectId, reviewId, {
        decisions: [{ title: 'Décision' }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('update SCHEDULED avec changement reviewDate déclenche auto_date_change', async () => {
    prisma.projectReview.findFirst
      .mockResolvedValueOnce(
        reviewRow({
          status: ProjectReviewStatus.SCHEDULED,
          reviewDate: new Date('2025-06-01T10:00:00.000Z'),
        }),
      )
      .mockResolvedValueOnce(
        reviewRow({
          status: ProjectReviewStatus.SCHEDULED,
          reviewDate: new Date('2025-06-15T10:00:00.000Z'),
        }),
      );
    prisma.projectReview.update.mockResolvedValue({});
    prisma.projectReview.findFirstOrThrow.mockResolvedValue(
      reviewRow({
        status: ProjectReviewStatus.SCHEDULED,
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
      { trigger: 'auto_date_change', channels: ['in_app'] },
    );
  });

  it('objective mappé dans la réponse (alias executiveSummary)', async () => {
    prisma.projectReview.findFirst.mockResolvedValue(
      reviewRow({
        objective: 'Piloter le trimestre',
        executiveSummary: null,
      }),
    );

    const result = await service.getById(clientId, projectId, reviewId);
    expect(result.objective).toBe('Piloter le trimestre');
    expect(result.executiveSummary).toBe('Piloter le trimestre');
  });

  describe('RFC-PROJ-013-8 F3 escalations', () => {
    it('createEscalation refuse hors COPRO', async () => {
      prisma.projectReview.findFirst.mockResolvedValue(
        reviewRow({ reviewType: ProjectReviewType.COPIL }),
      );
      await expect(
        service.createEscalation(clientId, projectId, reviewId, {
          title: 'Sujet',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('createEscalation injecte dans le prochain COPIL ouvert', async () => {
      const copilId = 'copil1';
      prisma.projectReview.findFirst.mockResolvedValue(
        reviewRow({
          reviewType: ProjectReviewType.COPRO,
          title: 'COPROJ sept',
          reviewDate: new Date('2026-09-10'),
        }),
      );
      prisma.projectReview.findMany.mockResolvedValue([
        {
          id: copilId,
          title: 'COPIL oct',
          reviewDate: new Date('2026-10-01'),
          agendaLockedAt: null,
        },
      ]);
      prisma.projectReviewEscalation.create.mockResolvedValue({
        id: 'esc1',
        clientId,
        projectId,
        sourceReviewId: reviewId,
        sourceAgendaItemId: null,
        title: 'Budget',
        summary: null,
        ownerUserId: null,
        targetReviewId: copilId,
        status: 'PENDING',
      });
      prisma.projectReviewAgendaItem.create.mockResolvedValue({
        id: 'ag1',
      });
      prisma.projectReviewEscalation.update.mockResolvedValue({});
      prisma.projectReviewEscalation.findFirst.mockResolvedValue({
        id: 'esc1',
        clientId,
        projectId,
        sourceReviewId: reviewId,
        sourceAgendaItemId: null,
        title: 'Budget',
        summary: null,
        ownerUserId: null,
        targetReviewId: copilId,
        targetAgendaItemId: 'ag1',
        status: 'INJECTED',
        injectedAt: new Date(),
        createdByUserId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ownerUser: null,
        sourceReview: {
          title: 'COPROJ sept',
          reviewType: ProjectReviewType.COPRO,
          reviewDate: new Date('2026-09-10'),
        },
        targetReview: {
          title: 'COPIL oct',
          reviewType: ProjectReviewType.COPIL,
          reviewDate: new Date('2026-10-01'),
        },
      });

      const result = await service.createEscalation(
        clientId,
        projectId,
        reviewId,
        { title: 'Budget' },
        { actorUserId: 'u1' },
      );

      expect(prisma.projectReviewAgendaItem.create).toHaveBeenCalled();
      expect(result.status).toBe('INJECTED');
      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_ESCALATION_CREATED,
        }),
      );
    });

    it('createEscalation isole le client (404)', async () => {
      projects.getProjectForScope.mockRejectedValue(
        new NotFoundException('Project not found'),
      );
      await expect(
        service.createEscalation(clientId, projectId, reviewId, {
          title: 'X',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('consolidateEscalations refuse hors COPIL', async () => {
      prisma.projectReview.findFirst.mockResolvedValue(
        reviewRow({ reviewType: ProjectReviewType.COPRO }),
      );
      await expect(
        service.consolidateEscalations(clientId, projectId, reviewId),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('RFC-PROJ-013-8 F3.1 descents', () => {
    it('finalize COPIL crée une descente et injecte dans le prochain COPRO', async () => {
      const coproId = 'copro1';
      const decisionId = 'dec1';
      const base = reviewRow({
        status: ProjectReviewStatus.IN_PROGRESS,
        reviewType: ProjectReviewType.COPIL,
        title: 'COPIL sept',
        conductClosedAt: new Date('2026-09-10'),
        decisions: [
          {
            id: decisionId,
            title: 'Go budget',
            description: 'Validé en séance',
            agendaItemId: null,
            decisionType: 'GO',
            status: 'VALIDATED',
            decidedByUserId: 'u2',
            decidedAt: new Date(),
            impact: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });
      prisma.projectReview.findFirst.mockResolvedValue(base);
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
        Promise.resolve(
          reviewRow({
            ...base,
            ...data,
            status: ProjectReviewStatus.FINALIZED,
          }),
        ),
      );
      prisma.$transaction.mockImplementation(
        async (fn: (tx: Record<string, unknown>) => Promise<unknown>) =>
          fn({
            projectReview: {
              findFirst: prisma.projectReview.findFirst,
              update: prisma.projectReview.update,
            },
            project: { findFirst: prisma.project.findFirst },
            projectTask: prisma.projectTask,
            projectRisk: prisma.projectRisk,
            projectMilestone: prisma.projectMilestone,
            projectBudgetLink: prisma.projectBudgetLink,
            projectReviewDescent: prisma.projectReviewDescent,
            projectReviewAgendaItem: prisma.projectReviewAgendaItem,
          }),
      );

      // findNextCoproCandidate
      prisma.projectReview.findMany.mockResolvedValue([
        {
          id: coproId,
          title: 'COPROJ oct',
          reviewDate: new Date('2026-10-01'),
          agendaLockedAt: null,
        },
      ]);
      prisma.projectReviewDescent.findFirst.mockResolvedValue(null);
      prisma.projectReviewDescent.create.mockResolvedValue({
        id: 'des1',
        clientId,
        projectId,
        sourceReviewId: reviewId,
        sourceDecisionId: decisionId,
        title: 'Go budget',
        summary: 'Validé en séance',
        ownerUserId: 'u2',
        targetReviewId: coproId,
        status: 'PENDING',
      });
      prisma.projectReviewAgendaItem.create.mockResolvedValue({ id: 'ag-d1' });
      prisma.projectReviewDescent.update.mockResolvedValue({});

      await service.finalize(clientId, projectId, reviewId, {
        actorUserId: 'u1',
      });

      expect(prisma.projectReviewDescent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sourceDecisionId: decisionId,
            title: 'Go budget',
          }),
        }),
      );
      expect(prisma.projectReviewAgendaItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            itemType: 'DECISION_DESCENT',
            projectReviewId: coproId,
          }),
        }),
      );
      expect(auditLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_DESCENT_CREATED,
          newValue: expect.objectContaining({
            created: 1,
            injected: 1,
          }),
        }),
      );
    });

    it('consolidateDescents refuse hors COPRO', async () => {
      prisma.projectReview.findFirst.mockResolvedValue(
        reviewRow({ reviewType: ProjectReviewType.COPIL }),
      );
      await expect(
        service.consolidateDescents(clientId, projectId, reviewId),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('listDescents isole le client (404)', async () => {
      projects.getProjectForScope.mockRejectedValue(
        new NotFoundException('Project not found'),
      );
      await expect(
        service.listDescents(clientId, projectId, reviewId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
