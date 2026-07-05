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
import { ProjectReviewEmailInvitationsService } from './project-review-email-invitations.service';
import { ProjectReviewInvitationsService } from './project-review-invitations.service';
import { ProjectReviewMicrosoftMeetingService } from './project-review-microsoft-meeting.service';

describe('ProjectReviewInvitationsService (RFC-PROJ-013-1 Phase 3)', () => {
  let service: ProjectReviewInvitationsService;
  let prisma: {
    project: { findFirst: jest.Mock };
    projectReview: { findFirst: jest.Mock };
    clientUser: { findMany: jest.Mock };
    projectReviewParticipant: { update: jest.Mock };
  };
  let notifications: { createForUser: jest.Mock };
  let auditLogs: { create: jest.Mock };
  let emailInvitations: { sendInvitations: jest.Mock };
  let microsoftMeeting: {
    createOrUpdateTeamsMeeting: jest.Mock;
    createOrUpdateCalendarEvent: jest.Mock;
    patchCalendarEventOnDateChange: jest.Mock;
    auditTeamsFailure: jest.Mock;
  };

  const clientId = 'c1';
  const projectId = 'p1';
  const reviewId = 'rev1';
  const context = { actorUserId: 'u-admin' };

  const baseReview = {
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
    microsoftOnlineMeetingId: null,
    microsoftEventId: null,
    participants: [
      {
        id: 'part1',
        userId: 'u1',
        displayName: null,
        externalEmail: null,
        invitedAt: null,
        lastInvitedAt: null,
        user: { email: 'u1@example.com' },
      },
      {
        id: 'part2',
        userId: 'u2',
        displayName: null,
        externalEmail: null,
        invitedAt: new Date('2025-05-01T10:00:00.000Z'),
        lastInvitedAt: new Date('2025-05-01T10:00:00.000Z'),
        user: { email: 'u2@example.com' },
      },
      {
        id: 'part3',
        userId: null,
        displayName: 'Consultant externe',
        externalEmail: 'ext@example.com',
        invitedAt: null,
        lastInvitedAt: null,
        user: null,
      },
    ],
    agendaItems: [],
  };

  beforeEach(() => {
    notifications = {
      createForUser: jest.fn().mockResolvedValue({ id: 'n1' }),
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    emailInvitations = {
      sendInvitations: jest.fn().mockResolvedValue({
        emailed: 0,
        skippedNoEmail: 0,
        emailFailed: 0,
        emailDisabled: false,
        emailedParticipantIds: [],
      }),
    };
    microsoftMeeting = {
      createOrUpdateTeamsMeeting: jest.fn().mockResolvedValue({
        teamsMeetingCreated: true,
        teamsMeetingUpdated: false,
        teamsMeetingSkipped: false,
      }),
      createOrUpdateCalendarEvent: jest.fn().mockResolvedValue({
        calendarEventCreated: true,
        calendarEventUpdated: false,
        calendarEventSkipped: false,
      }),
      patchCalendarEventOnDateChange: jest.fn().mockResolvedValue({
        calendarEventCreated: false,
        calendarEventUpdated: true,
        calendarEventSkipped: false,
      }),
      auditTeamsFailure: jest.fn().mockResolvedValue(undefined),
    };
    prisma = {
      project: {
        findFirst: jest.fn().mockResolvedValue({ id: projectId, name: 'Projet Alpha' }),
      },
      projectReview: {
        findFirst: jest.fn().mockResolvedValue(baseReview),
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
      emailInvitations as unknown as ProjectReviewEmailInvitationsService,
      microsoftMeeting as unknown as ProjectReviewMicrosoftMeetingService,
    );
  });

  it('notifie les participants internes actifs en PLANNED (défaut in_app)', async () => {
    const result = await service.invite(
      clientId,
      projectId,
      reviewId,
      context,
      { trigger: 'manual' },
    );

    expect(result.notifiedInApp).toBe(2);
    expect(result.skippedExternal).toBe(1);
    expect(result.skippedInactive).toBe(0);
    expect(notifications.createForUser).toHaveBeenCalledTimes(2);
    expect(emailInvitations.sendInvitations).not.toHaveBeenCalled();
    expect(microsoftMeeting.createOrUpdateTeamsMeeting).not.toHaveBeenCalled();

    const payload = notifications.createForUser.mock.calls[0][0];
    expect(payload.metadata).not.toHaveProperty('meetingUrl');

    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_INVITED,
        newValue: expect.objectContaining({
          notifiedInAppCount: 2,
          channels: ['in_app'],
        }),
      }),
    );
  });

  it('refuse si statut ≠ PLANNED', async () => {
    prisma.projectReview.findFirst.mockResolvedValue({
      ...baseReview,
      status: ProjectReviewStatus.IN_REVIEW,
      participants: [],
      agendaItems: [],
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

  it('createTeamsMeeting true délègue au service Microsoft', async () => {
    prisma.projectReview.findFirst
      .mockResolvedValueOnce(baseReview)
      .mockResolvedValueOnce({
        ...baseReview,
        meetingUrl: 'https://teams.microsoft.com/new',
      });

    const result = await service.invite(
      clientId,
      projectId,
      reviewId,
      context,
      {
        trigger: 'manual',
        channels: [],
        meetingOptions: { createTeamsMeeting: true },
      },
    );

    expect(microsoftMeeting.createOrUpdateTeamsMeeting).toHaveBeenCalled();
    expect(result.teamsMeetingCreated).toBe(true);
  });

  it('createCalendarEvent false → aucun appel calendrier explicite', async () => {
    await service.invite(clientId, projectId, reviewId, context, {
      trigger: 'manual',
      channels: ['in_app'],
      meetingOptions: { createCalendarEvent: false },
    });

    expect(microsoftMeeting.createOrUpdateCalendarEvent).not.toHaveBeenCalled();
  });

  it('canal email délégué au service email', async () => {
    emailInvitations.sendInvitations.mockResolvedValue({
      emailed: 1,
      skippedNoEmail: 0,
      emailFailed: 0,
      emailDisabled: false,
      emailedParticipantIds: ['part3'],
    });

    const result = await service.invite(clientId, projectId, reviewId, context, {
      trigger: 'manual',
      channels: ['email'],
    });

    expect(result.emailed).toBe(1);
    expect(notifications.createForUser).not.toHaveBeenCalled();
    expect(emailInvitations.sendInvitations).toHaveBeenCalled();
  });

  it('auto_date_change avec microsoftEventId → patch calendrier', async () => {
    prisma.projectReview.findFirst.mockResolvedValue({
      ...baseReview,
      microsoftEventId: 'evt-1',
    });

    await service.invite(clientId, projectId, reviewId, context, {
      trigger: 'auto_date_change',
      channels: ['in_app'],
    });

    expect(microsoftMeeting.patchCalendarEventOnDateChange).toHaveBeenCalled();
    expect(microsoftMeeting.createOrUpdateCalendarEvent).not.toHaveBeenCalled();
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
