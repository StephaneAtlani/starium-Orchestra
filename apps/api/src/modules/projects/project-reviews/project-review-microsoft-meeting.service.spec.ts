import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  MicrosoftConnectionStatus,
  ProjectReviewMeetingMode,
} from '@prisma/client';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { MicrosoftGraphService } from '../../microsoft/microsoft-graph.service';
import { MicrosoftGraphHttpError } from '../../microsoft/microsoft-graph.types';
import { PROJECT_AUDIT_ACTION } from '../project-audit.constants';
import {
  MICROSOFT_RECONNECT_MESSAGE,
  ProjectReviewMicrosoftMeetingService,
} from './project-review-microsoft-meeting.service';

describe('ProjectReviewMicrosoftMeetingService', () => {
  let service: ProjectReviewMicrosoftMeetingService;
  let prisma: {
    projectMicrosoftLink: { findFirst: jest.Mock };
    projectReview: { update: jest.Mock };
  };
  let graph: {
    createOnlineMeeting: jest.Mock;
    createCalendarEvent: jest.Mock;
    patchCalendarEvent: jest.Mock;
  };
  let auditLogs: { create: jest.Mock };

  const review = {
    id: 'rev1',
    clientId: 'c1',
    projectId: 'p1',
    reviewDate: new Date('2025-06-01T10:00:00.000Z'),
    title: 'Point',
    meetingMode: ProjectReviewMeetingMode.REMOTE,
    meetingUrl: null,
    location: null,
    microsoftOnlineMeetingId: null,
    microsoftEventId: null,
  };

  beforeEach(() => {
    graph = {
      createOnlineMeeting: jest.fn().mockResolvedValue({
        id: 'om-1',
        joinWebUrl: 'https://teams.microsoft.com/join/secret',
      }),
      createCalendarEvent: jest.fn().mockResolvedValue({ id: 'evt-1' }),
      patchCalendarEvent: jest.fn().mockResolvedValue(undefined),
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    prisma = {
      projectMicrosoftLink: {
        findFirst: jest.fn().mockResolvedValue({
          isEnabled: true,
          microsoftConnectionId: 'conn-1',
          microsoftConnection: {
            id: 'conn-1',
            status: MicrosoftConnectionStatus.ACTIVE,
            connectedByUserId: 'u-ms',
          },
        }),
      },
      projectReview: { update: jest.fn().mockResolvedValue({}) },
    };
    service = new ProjectReviewMicrosoftMeetingService(
      prisma as never,
      graph as unknown as MicrosoftGraphService,
      auditLogs as unknown as AuditLogsService,
    );
  });

  it('refuse overwrite meetingUrl manuel sans forceOverwriteMeetingUrl', async () => {
    await expect(
      service.createOrUpdateTeamsMeeting({
        clientId: 'c1',
        projectId: 'p1',
        reviewId: 'rev1',
        projectName: 'Projet',
        review: {
          ...review,
          meetingUrl: 'https://manual.example/join',
        },
        agendaItems: [],
        meetingOptions: { createTeamsMeeting: true, forceOverwriteMeetingUrl: false },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(graph.createOnlineMeeting).not.toHaveBeenCalled();
  });

  it('crée Teams avec forceOverwriteMeetingUrl et audit sans URL', async () => {
    const result = await service.createOrUpdateTeamsMeeting({
      clientId: 'c1',
      projectId: 'p1',
      reviewId: 'rev1',
      projectName: 'Projet',
      review: {
        ...review,
        meetingUrl: 'https://manual.example/join',
      },
      agendaItems: [],
      meetingOptions: {
        createTeamsMeeting: true,
        forceOverwriteMeetingUrl: true,
      },
      context: { actorUserId: 'u1' },
    });

    expect(result.teamsMeetingCreated).toBe(true);
    expect(prisma.projectReview.update).toHaveBeenCalled();
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_TEAMS_MEETING_OVERWRITE_CONFIRMED,
        newValue: expect.not.objectContaining({ meetingUrl: expect.anything() }),
      }),
    );
    const createdAudit = auditLogs.create.mock.calls.find(
      (c: unknown[]) =>
        (c[0] as { action: string }).action ===
        PROJECT_AUDIT_ACTION.PROJECT_REVIEW_TEAMS_MEETING_CREATED,
    );
    expect(createdAudit?.[0]?.newValue).not.toHaveProperty('joinUrl');
  });

  it('scopes insuffisants → ForbiddenException reconnecter', async () => {
    graph.createOnlineMeeting.mockRejectedValue(
      new MicrosoftGraphHttpError('forbidden', 403, 'ErrorAccessDenied'),
    );

    await expect(
      service.createOrUpdateTeamsMeeting({
        clientId: 'c1',
        projectId: 'p1',
        reviewId: 'rev1',
        projectName: 'Projet',
        review,
        agendaItems: [],
        meetingOptions: { createTeamsMeeting: true },
      }),
    ).rejects.toThrow(MICROSOFT_RECONNECT_MESSAGE);
  });

  it('createCalendarEvent false → skipped via orchestrateur (service skip si flag absent)', async () => {
    const result = await service.createOrUpdateCalendarEvent({
      clientId: 'c1',
      projectId: 'p1',
      reviewId: 'rev1',
      projectName: 'Projet',
      review,
      participants: [],
      agendaItems: [],
      meetingUrl: null,
      meetingOptions: { createCalendarEvent: false },
    });

    expect(result.calendarEventSkipped).toBe(true);
    expect(graph.createCalendarEvent).not.toHaveBeenCalled();
  });
});
