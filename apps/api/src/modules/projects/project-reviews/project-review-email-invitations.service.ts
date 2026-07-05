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
import {
  buildProjectReviewInvitationActionUrl,
  buildProjectReviewInvitationMessage,
  buildProjectReviewInvitationTitle,
} from './project-review-invitation-labels';
import { normalizeExternalEmail, pseudonymizeEmail } from './project-review-invitation-privacy.helpers';

export type ProjectReviewEmailInviteResult = {
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
export class ProjectReviewEmailInvitationsService {
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

  isEmailChannelAvailable(): boolean {
    return (
      !this.emailService.isLogOnlyMode() || this.emailService.isLogOnlyMode()
    );
  }

  canSendEmail(): boolean {
    return (
      this.emailService.isLogOnlyMode() ||
      Boolean(process.env.SMTP_HOST?.trim())
    );
  }

  async sendInvitations(input: {
    clientId: string;
    projectId: string;
    reviewId: string;
    projectName: string;
    review: {
      reviewType: Parameters<typeof buildProjectReviewInvitationMessage>[0]['reviewType'];
      reviewDate: Date;
      meetingMode: Parameters<typeof buildProjectReviewInvitationMessage>[0]['meetingMode'];
      location: string | null;
      meetingUrl: string | null;
    };
    participants: ParticipantRow[];
    context?: AuditContext;
    blockingOnFailure: boolean;
  }): Promise<ProjectReviewEmailInviteResult> {
    const result: ProjectReviewEmailInviteResult = {
      emailed: 0,
      skippedNoEmail: 0,
      emailFailed: 0,
      emailDisabled: false,
      emailedParticipantIds: [],
    };

    if (!this.canSendEmail()) {
      result.emailDisabled = true;
      result.skippedNoEmail = input.participants.length;
      if (input.blockingOnFailure) {
        throw new BadRequestException(
          'Le canal email est indisponible : configuration SMTP absente',
        );
      }
      return result;
    }

    const title = buildProjectReviewInvitationTitle(input.projectName);
    const message = buildProjectReviewInvitationMessage({
      reviewType: input.review.reviewType,
      reviewDate: input.review.reviewDate,
      meetingMode: input.review.meetingMode,
      location: input.review.location,
    });
    const actionUrl = buildProjectReviewInvitationActionUrl(
      input.projectId,
      input.reviewId,
    );
    const meetingJoinUrl = input.review.meetingUrl?.trim() || null;
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
        await this.emailService.queueEmail({
          clientId: input.clientId,
          projectReviewId: input.reviewId,
          createdByUserId: input.context?.actorUserId,
          recipient,
          templateKey: 'project_review_invitation',
          title,
          message,
          actionUrl,
          meetingJoinUrl,
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
        if (input.blockingOnFailure) {
          if (err instanceof ServiceUnavailableException) throw err;
          throw new BadRequestException(
            "L'envoi d'email a échoué pour au moins un participant",
          );
        }
      }
    }

    if (result.emailed > 0) {
      await this.auditLogs.create({
        clientId: input.clientId,
        userId: input.context?.actorUserId,
        action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_EMAILED,
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

    if (result.emailFailed > 0 && !input.blockingOnFailure) {
      await this.auditLogs.create({
        clientId: input.clientId,
        userId: input.context?.actorUserId,
        action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_EMAIL_FAILED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW,
        resourceId: input.reviewId,
        newValue: {
          reviewId: input.reviewId,
          emailFailedCount: result.emailFailed,
        },
        ...this.auditMeta(input.context),
      });
    }

    return result;
  }
}
