import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  ProjectReviewStatus,
  ProjectReviewType,
} from '@prisma/client';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { NotificationsService } from '../../notifications/notifications.service';
import {
  PROJECT_AUDIT_ACTION,
  PROJECT_AUDIT_RESOURCE_TYPE,
} from '../project-audit.constants';
import { ProjectReviewInvitationsService } from './project-review-invitations.service';

describe('ProjectReviewInvitationsService (RFC-PROJ-013-1 Phase 2)', () => {
  let service: ProjectReviewInvitationsService;
  let prisma: {
    project: { findFirst: jest.Mock };
    projectReview: { findFirst: jest.Mock };
    clientUser: { findMany: jest.Mock };
    projectReviewParticipant: { update: jest.Mock };
  };
  let notifications: { createForUser: jest.Mock };
  let auditLogs: { create: jest.Mock };

  const clientId = 'c1';
  const projectId = 'p1';
  const reviewId = 'rev1';
  const context = { actorUserId: 'u-admin' };

  beforeEach(() => {
    notifications = {
      createForUser: jest.fn().mockResolvedValue({ id: 'n1' }),
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    prisma = {
      project: {
        findFirst: jest.fn().mockResolvedValue({ id: projectId, name: 'Projet Alpha' }),
      },
      projectReview: {
        findFirst: jest.fn().mockResolvedValue({
          id: reviewId,
          clientId,
          projectId,
          status: ProjectReviewStatus.PLANNED,
          reviewType: ProjectReviewType.COPIL,
          reviewDate: new Date('2025-06-01T10:00:00.000Z'),
          title: 'Point COPIL',
          meetingMode: 'REMOTE',
          meetingUrl: 'https://teams.example/join/token',
          location: null,
          participants: [
            {
              id: 'part1',
              userId: 'u1',
              displayName: null,
              invitedAt: null,
              lastInvitedAt: null,
            },
            {
              id: 'part2',
              userId: 'u2',
              displayName: null,
              invitedAt: new Date('2025-05-01T10:00:00.000Z'),
              lastInvitedAt: new Date('2025-05-01T10:00:00.000Z'),
            },
            {
              id: 'part3',
              userId: null,
              displayName: 'Consultant externe',
              invitedAt: null,
              lastInvitedAt: null,
            },
          ],
        }),
      },
      clientUser: {
        findMany: jest.fn().mockResolvedValue([{ userId: 'u1' }, { userId: 'u2' }]),
      },
      projectReviewParticipant: {
        update: jest.fn().mockResolvedValue({}),
      },
    };

    service = new ProjectReviewInvitationsService(
      prisma as never,
      notifications as unknown as NotificationsService,
      auditLogs as unknown as AuditLogsService,
    );
  });

  it('notifie les participants internes actifs en PLANNED', async () => {
    const result = await service.invite(
      clientId,
      projectId,
      reviewId,
      context,
      { trigger: 'manual' },
    );

    expect(result.notified).toBe(2);
    expect(result.skippedExternal).toBe(1);
    expect(result.skippedInactive).toBe(0);
    expect(notifications.createForUser).toHaveBeenCalledTimes(2);

    const payload = notifications.createForUser.mock.calls[0][0];
    expect(payload.title).toContain('Projet Alpha');
    expect(payload.message).not.toContain('https://');
    expect(payload.metadata).not.toHaveProperty('meetingUrl');
    expect(payload.actionUrl).toBe(`/projects/${projectId}?openReview=${reviewId}`);

    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_INVITED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW,
        newValue: expect.objectContaining({
          trigger: 'manual',
          notifiedCount: 2,
          skippedExternal: 1,
        }),
      }),
    );
  });

  it('refuse si statut ≠ PLANNED', async () => {
    prisma.projectReview.findFirst.mockResolvedValue({
      id: reviewId,
      status: ProjectReviewStatus.IN_REVIEW,
      participants: [],
    });

    await expect(
      service.invite(clientId, projectId, reviewId, context, {
        trigger: 'manual',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lève NotFound si review hors scope', async () => {
    prisma.projectReview.findFirst.mockResolvedValue(null);

    await expect(
      service.invite(clientId, projectId, reviewId, context, {
        trigger: 'manual',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuse participantIds hors review', async () => {
    await expect(
      service.invite(clientId, projectId, reviewId, context, {
        trigger: 'manual',
        participantIds: ['unknown'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('déduplique par userId', async () => {
    prisma.projectReview.findFirst.mockResolvedValue({
      id: reviewId,
      clientId,
      projectId,
      status: ProjectReviewStatus.PLANNED,
      reviewType: ProjectReviewType.COPIL,
      reviewDate: new Date('2025-06-01T10:00:00.000Z'),
      title: null,
      meetingMode: null,
      location: null,
      participants: [
        { id: 'p-a', userId: 'u1', displayName: null, invitedAt: null, lastInvitedAt: null },
        { id: 'p-b', userId: 'u1', displayName: null, invitedAt: null, lastInvitedAt: null },
      ],
    });
    prisma.clientUser.findMany.mockResolvedValue([{ userId: 'u1' }]);

    const result = await service.invite(
      clientId,
      projectId,
      reviewId,
      context,
      { trigger: 'manual' },
    );

    expect(result.notified).toBe(1);
    expect(notifications.createForUser).toHaveBeenCalledTimes(1);
  });

  it('conserve invitedAt et met à jour lastInvitedAt au second envoi', async () => {
    await service.invite(clientId, projectId, reviewId, context, {
      trigger: 'manual',
      participantIds: ['part2'],
    });

    expect(prisma.projectReviewParticipant.update).toHaveBeenCalledWith({
      where: { id: 'part2' },
      data: { lastInvitedAt: expect.any(Date) },
    });
  });

  it('compte skippedInactive pour userId non actif', async () => {
    prisma.clientUser.findMany.mockResolvedValue([{ userId: 'u1' }]);

    const result = await service.invite(
      clientId,
      projectId,
      reviewId,
      context,
      { trigger: 'manual' },
    );

    expect(result.skippedInactive).toBe(1);
    expect(result.notified).toBe(1);
  });

  it('n’injecte pas ProjectReviewsService', () => {
    const paramTypes =
      Reflect.getMetadata('design:paramtypes', ProjectReviewInvitationsService) ??
      [];
    expect(
      paramTypes.some((t: { name?: string }) => t?.name === 'ProjectsService'),
    ).toBe(false);
  });
});
