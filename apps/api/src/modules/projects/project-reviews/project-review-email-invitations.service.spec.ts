import { BadRequestException } from '@nestjs/common';
import { ProjectReviewMeetingMode } from '@prisma/client';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { EmailService } from '../../email/email.service';
import { PROJECT_AUDIT_ACTION } from '../project-audit.constants';
import { ProjectReviewEmailInvitationsService } from './project-review-email-invitations.service';

describe('ProjectReviewEmailInvitationsService', () => {
  let service: ProjectReviewEmailInvitationsService;
  let prisma: { projectReviewParticipant: { update: jest.Mock } };
  let emailService: { queueEmail: jest.Mock; isLogOnlyMode: jest.Mock };
  let auditLogs: { create: jest.Mock };

  beforeEach(() => {
    prisma = { projectReviewParticipant: { update: jest.fn().mockResolvedValue({}) } };
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
      }),
    );
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_EMAILED,
        newValue: expect.objectContaining({
          recipients: expect.arrayContaining([expect.stringMatching(/^e\*\*\*@/)]) ,
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
});
