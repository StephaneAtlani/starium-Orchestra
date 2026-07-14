import { BadRequestException } from '@nestjs/common';
import { EmailService } from '../../email/email.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProjectReviewEmailReportService } from './project-review-email-report.service';
import { PROJECT_AUDIT_ACTION } from '../project-audit.constants';

describe('ProjectReviewEmailReportService', () => {
  let service: ProjectReviewEmailReportService;
  let emailService: {
    sendProjectReviewReportEmail: jest.Mock;
    isLogOnlyMode: jest.Mock;
  };
  let prisma: { projectReviewParticipant: { update: jest.Mock } };
  let auditLogs: { create: jest.Mock };

  beforeEach(() => {
    emailService = {
      sendProjectReviewReportEmail: jest.fn().mockResolvedValue(undefined),
      isLogOnlyMode: jest.fn().mockReturnValue(true),
    };
    prisma = {
      projectReviewParticipant: { update: jest.fn().mockResolvedValue({}) },
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    service = new ProjectReviewEmailReportService(
      prisma as unknown as PrismaService,
      emailService as unknown as EmailService,
      auditLogs as unknown as AuditLogsService,
    );
  });

  it('envoie le compte rendu aux participants avec e-mail', async () => {
    const result = await service.sendReport({
      clientId: 'c1',
      projectId: 'p1',
      reviewId: 'r1',
      report: {
        subject: 'Compte rendu — COPIL',
        title: 'Compte rendu — COPIL',
        text: 'Contenu CR',
        html: '<p>Contenu CR</p>',
      },
      participants: [
        {
          id: 'part1',
          userId: 'u1',
          externalEmail: null,
          user: { email: 'alice@example.com' },
        },
      ],
    });

    expect(result.emailed).toBe(1);
    expect(emailService.sendProjectReviewReportEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        templateKey: 'project_review_report',
        recipient: 'alice@example.com',
        htmlBody: '<p>Contenu CR</p>',
        actionUrl: expect.stringContaining('/projects/p1?openReview=r1'),
      }),
    );
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_REPORT_EMAILED,
      }),
    );
  });

  it('refuse si aucun participant avec e-mail', async () => {
    await expect(
      service.sendReport({
        clientId: 'c1',
        projectId: 'p1',
        reviewId: 'r1',
        report: {
          subject: 'CR',
          title: 'CR',
          text: 'x',
          html: '<p>x</p>',
        },
        participants: [
          { id: 'part1', userId: 'u1', externalEmail: null, user: { email: '' } },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
