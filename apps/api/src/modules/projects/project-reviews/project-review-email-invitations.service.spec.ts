import { ProjectReviewMeetingMode } from '@prisma/client';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { EmailService } from '../../email/email.service';
import { PROJECT_AUDIT_ACTION } from '../project-audit.constants';
import { ProjectReviewEmailInvitationsService } from './project-review-email-invitations.service';

describe('ProjectReviewEmailInvitationsService', () => {
  let service: ProjectReviewEmailInvitationsService;
  let prisma: {
    projectReviewParticipant: { update: jest.Mock };
    user: { findUnique: jest.Mock };
  };
  let emailService: { queueEmail: jest.Mock; isLogOnlyMode: jest.Mock };
  let auditLogs: { create: jest.Mock };

  beforeEach(() => {
    prisma = {
      projectReviewParticipant: { update: jest.fn().mockResolvedValue({}) },
      user: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    emailService = {
      queueEmail: jest.fn().mockResolvedValue(undefined),
      isLogOnlyMode: jest.fn().mockReturnValue(true),
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    service = new ProjectReviewEmailInvitationsService(
      prisma as never,
      emailService as unknown as EmailService,
      auditLogs as unknown as AuditLogsService,
    );
    process.env.APP_PUBLIC_URL = 'http://localhost:3002';
  });

  it('envoie email à un externe avec externalEmail', async () => {
    const result = await service.sendInvitations({
      clientId: 'c1',
      projectId: 'p1',
      reviewId: 'r1',
      projectName: 'Projet',
      review: {
        reviewType: 'COPIL',
        reviewDate: new Date('2025-06-01T10:00:00.000Z'),
        meetingMode: ProjectReviewMeetingMode.REMOTE,
        location: null,
        meetingUrl: 'https://teams.example/join',
      },
      participants: [
        {
          id: 'part1',
          userId: null,
          externalEmail: 'Ext@Example.COM',
          user: null,
        },
      ],
      blockingOnFailure: false,
    });

    expect(result.emailed).toBe(1);
    expect(emailService.queueEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        templateKey: 'project_review_invitation',
        recipient: 'ext@example.com',
        htmlBody: expect.stringContaining('convocation'),
        actionUrl: expect.stringMatching(
          /^https?:\/\/.+\/projects\/p1\?openReview=r1$/,
        ),
      }),
    );
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_EMAILED,
        newValue: expect.objectContaining({
          recipients: expect.arrayContaining([expect.stringMatching(/^e\*\*\*@/)]),
        }),
      }),
    );
  });

  it('skippedNoEmail si externe sans adresse', async () => {
    const result = await service.sendInvitations({
      clientId: 'c1',
      projectId: 'p1',
      reviewId: 'r1',
      projectName: 'Projet',
      review: {
        reviewType: 'COPIL',
        reviewDate: new Date(),
        meetingMode: null,
        location: null,
        meetingUrl: null,
      },
      participants: [{ id: 'p1', userId: null, externalEmail: null, user: null }],
      blockingOnFailure: false,
    });

    expect(result.skippedNoEmail).toBe(1);
    expect(emailService.queueEmail).not.toHaveBeenCalled();
  });

  it('attachIcs + sujet/message UI → HTML branded et calendarIcs', async () => {
    await service.sendInvitations({
      clientId: 'c1',
      projectId: 'p1',
      reviewId: 'r1',
      projectName: 'Data — lakehouse',
      review: {
        reviewType: 'MILESTONE_REVIEW',
        reviewDate: new Date('2026-09-22T10:00:00.000Z'),
        meetingMode: ProjectReviewMeetingMode.REMOTE,
        location: null,
        meetingUrl: 'https://teams.example/join',
        title: 'Revue jalon go-live',
        durationMinutes: 60,
        agendaItems: [
          { title: 'Go / no-go', plannedDurationMinutes: 20, orderIndex: 0 },
          { title: 'Risques', plannedDurationMinutes: 15, orderIndex: 1 },
        ],
      },
      participants: [
        {
          id: 'part1',
          userId: null,
          externalEmail: 'ext@example.com',
          displayName: 'Olivier',
          user: null,
        },
      ],
      blockingOnFailure: false,
      attachIcs: true,
      includeAgenda: true,
      includeRsvp: true,
      emailSubject: 'Revue jalon — Data · 22 sept. 10:00',
      emailMessage:
        "Bonjour,\n\nVous êtes convié à la revue jalon. Merci de confirmer.",
    });

    const call = emailService.queueEmail.mock.calls[0][0];
    expect(call.title).toBe('Revue jalon — Data · 22 sept. 10:00');
    expect(call.htmlBody).toContain('Revue jalon');
    expect(call.htmlBody).toContain('Ordre du jour');
    expect(call.htmlBody).toContain('Go / no-go');
    expect(call.htmlBody).toContain('Je serai présent');
    expect(call.htmlBody).toContain('invitation-');
    expect(call.calendarIcs.content).toContain('METHOD:REQUEST');
    expect(call.calendarIcs.content).toContain('ATTENDEE');
    expect(call.calendarIcs.content).toContain('mailto:ext@example.com');
  });
});
