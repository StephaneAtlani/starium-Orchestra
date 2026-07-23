import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { EmailService } from '../../email/email.service';
import type { AuditContext } from '../../budget-management/types/audit-context';
import {
  PROJECT_AUDIT_ACTION,
  PROJECT_AUDIT_RESOURCE_TYPE,
} from '../project-audit.constants';
import { buildProjectReviewInvitationActionUrl } from './project-review-invitation-labels';
import { buildAppAbsoluteLink } from './project-review-report-branding.helpers';
import { requireProjectReviewReportAppBaseUrl } from './project-review-report.builder';
import {
  normalizeExternalEmail,
  pseudonymizeEmail,
} from './project-review-invitation-privacy.helpers';
import type { ProjectReviewReportContent } from './project-review-report.builder';

export type ProjectReviewEmailReportResult = {
  emailed: number;
  skippedNoEmail: number;
  emailFailed: number;
  emailDisabled: boolean;
  emailedParticipantIds: string[];
};

type ParticipantRow = {
  id: string;
  userId: string | null;
  externalEmail: string | null;
  user?: { email: string } | null;
};

@Injectable()
export class ProjectReviewEmailReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  private auditMeta(context?: AuditContext) {
    return {
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };
  }

  canSendEmail(): boolean {
    return (
      this.emailService.isLogOnlyMode() ||
      Boolean(process.env.SMTP_HOST?.trim())
    );
  }

  async sendReport(input: {
    clientId: string;
    projectId: string;
    reviewId: string;
    report: ProjectReviewReportContent;
    participants: ParticipantRow[];
    context?: AuditContext;
  }): Promise<ProjectReviewEmailReportResult> {
    const result: ProjectReviewEmailReportResult = {
      emailed: 0,
      skippedNoEmail: 0,
      emailFailed: 0,
      emailDisabled: false,
      emailedParticipantIds: [],
    };

    if (!this.canSendEmail()) {
      result.emailDisabled = true;
      result.skippedNoEmail = input.participants.length;
      throw new BadRequestException(
        'Le canal email est indisponible : configuration SMTP absente',
      );
    }

    let appBaseUrl: string;
    try {
      appBaseUrl = requireProjectReviewReportAppBaseUrl();
    } catch (err) {
      throw new BadRequestException(
        (err as Error)?.message ??
          'APP_PUBLIC_URL manquant pour les liens e-mail du compte rendu.',
      );
    }
    const actionUrl = buildAppAbsoluteLink(
      buildProjectReviewInvitationActionUrl(input.projectId, input.reviewId),
      appBaseUrl,
    );
    const now = new Date();
    const pseudonymizedRecipients: string[] = [];

    for (const participant of input.participants) {
      const recipient = participant.userId
        ? participant.user?.email?.trim()
        : participant.externalEmail?.trim()
          ? normalizeExternalEmail(participant.externalEmail)
          : undefined;

      if (!recipient) {
        result.skippedNoEmail += 1;
        continue;
      }

      try {
        await this.emailService.sendProjectReviewReportEmail({
          clientId: input.clientId,
          projectReviewId: input.reviewId,
          createdByUserId: input.context?.actorUserId,
          recipient,
          templateKey: 'project_review_report',
          title: input.report.title,
          message: input.report.text,
          actionUrl,
          htmlBody: input.report.html,
        });

        await this.prisma.projectReviewParticipant.update({
          where: { id: participant.id },
          data: { lastEmailedAt: now },
        });

        result.emailed += 1;
        result.emailedParticipantIds.push(participant.id);
        pseudonymizedRecipients.push(pseudonymizeEmail(recipient));
      } catch (err) {
        result.emailFailed += 1;
        if (err instanceof ServiceUnavailableException) throw err;
      }
    }

    if (result.emailed === 0 && result.emailFailed === 0) {
      throw new BadRequestException(
        'Aucun participant avec adresse e-mail — ajoutez des participants ou des e-mails externes.',
      );
    }

    if (result.emailed > 0) {
      await this.auditLogs.create({
        clientId: input.clientId,
        userId: input.context?.actorUserId,
        action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_REPORT_EMAILED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW,
        resourceId: input.reviewId,
        newValue: {
          reviewId: input.reviewId,
          emailedCount: result.emailed,
          recipients: pseudonymizedRecipients,
        },
        ...this.auditMeta(input.context),
      });
    }

    if (result.emailFailed > 0) {
      await this.auditLogs.create({
        clientId: input.clientId,
        userId: input.context?.actorUserId,
        action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_REPORT_EMAIL_FAILED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW,
        resourceId: input.reviewId,
        newValue: {
          reviewId: input.reviewId,
          emailFailedCount: result.emailFailed,
        },
        ...this.auditMeta(input.context),
      });

      if (result.emailed === 0) {
        throw new BadRequestException(
          "L'envoi du compte rendu a échoué pour tous les destinataires",
        );
      }
    }

    return result;
  }
}
