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
  buildProjectReviewEntityLabel,
  buildProjectReviewInvitationActionUrl,
  buildProjectReviewInvitationKickLabel,
  buildProjectReviewInvitationMessage,
  buildProjectReviewInvitationTitle,
  buildProjectReviewInvitationWhenLine,
} from './project-review-invitation-labels';
import {
  buildProjectReviewInvitationEmailHtml,
  buildProjectReviewInvitationEmailText,
} from './project-review-invitation-email.builder';
import {
  buildProjectReviewInvitationIcs,
  icsAttachmentFilename,
  resolveInvitationDurationMinutes,
} from './project-review-invitation-ics';
import {
  normalizeExternalEmail,
  pseudonymizeEmail,
} from './project-review-invitation-privacy.helpers';
import { buildAppAbsoluteLink } from './project-review-report-branding.helpers';
import { requireProjectReviewReportAppBaseUrl } from './project-review-report.builder';

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
  displayName?: string | null;
  user?: { email: string; firstName?: string | null; lastName?: string | null } | null;
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
      reviewType: Parameters<
        typeof buildProjectReviewInvitationMessage
      >[0]['reviewType'];
      reviewDate: Date;
      meetingMode: Parameters<
        typeof buildProjectReviewInvitationMessage
      >[0]['meetingMode'];
      location: string | null;
      meetingUrl: string | null;
      title?: string | null;
      durationMinutes?: number | null;
      agendaItems?: {
        title: string;
        plannedDurationMinutes: number | null;
        orderIndex?: number;
      }[];
    };
    participants: ParticipantRow[];
    context?: AuditContext;
    blockingOnFailure: boolean;
    attachIcs?: boolean;
    includeAgenda?: boolean;
    includeDocs?: boolean;
    includeRsvp?: boolean;
    emailSubject?: string | null;
    emailMessage?: string | null;
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

    const meetingTitle = buildProjectReviewEntityLabel({
      title: input.review.title ?? null,
      reviewType: input.review.reviewType,
    });
    const durationMinutes = resolveInvitationDurationMinutes({
      durationMinutes: input.review.durationMinutes,
      agendaItems: input.review.agendaItems,
    });
    const whenLine = buildProjectReviewInvitationWhenLine({
      reviewType: input.review.reviewType,
      reviewDate: input.review.reviewDate,
      meetingMode: input.review.meetingMode,
      location: input.review.location,
      durationMinutes,
    });
    const defaultMessage = buildProjectReviewInvitationMessage({
      reviewType: input.review.reviewType,
      reviewDate: input.review.reviewDate,
      meetingMode: input.review.meetingMode,
      location: input.review.location,
    });
    const introMessage =
      input.emailMessage?.trim() ||
      `Bonjour,\n\nVous êtes convié à la séance « ${meetingTitle} » du projet « ${input.projectName} ».\n\nMerci de confirmer votre présence.`;
    const subject =
      input.emailSubject?.trim() ||
      buildProjectReviewInvitationTitle(input.projectName);

    let appBaseUrl: string;
    try {
      appBaseUrl = requireProjectReviewReportAppBaseUrl();
    } catch (err) {
      throw new BadRequestException(
        (err as Error)?.message ??
          'APP_PUBLIC_URL manquant pour les liens e-mail d’invitation.',
      );
    }
    const actionUrl = buildAppAbsoluteLink(
      buildProjectReviewInvitationActionUrl(input.projectId, input.reviewId),
      appBaseUrl,
    );
    const meetingJoinUrl = input.review.meetingUrl?.trim() || null;
    const now = new Date();
    const pseudonymizedRecipients: string[] = [];

    const agendaForMail =
      input.includeAgenda && input.review.agendaItems?.length
        ? [...input.review.agendaItems]
            .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
            .map((a) => ({
              title: a.title,
              durationMinutes: a.plannedDurationMinutes,
            }))
        : undefined;

    let organizerEmail: string | null = null;
    let organizerName: string | null = null;
    if (input.context?.actorUserId) {
      const actor = await this.prisma.user.findUnique({
        where: { id: input.context.actorUserId },
        select: { email: true, firstName: true, lastName: true },
      });
      organizerEmail = actor?.email?.trim() || null;
      const name = [actor?.firstName, actor?.lastName]
        .map((p) => p?.trim())
        .filter(Boolean)
        .join(' ');
      organizerName = name || null;
    }

    const icsFilename = icsAttachmentFilename(meetingTitle);
    const attachmentLines: Array<{
      filename: string;
      hint?: string | null;
      url?: string | null;
    }> = [];
    const fileAttachments: Array<{
      filename: string;
      content: string;
      contentType: string;
    }> = [];

    if (input.attachIcs) {
      attachmentLines.push({
        filename: icsFilename,
        hint: 'Invitation calendrier (fichier joint)',
      });
    }

    if (input.includeDocs) {
      const docs = await this.prisma.projectReviewAttachment.findMany({
        where: {
          clientId: input.clientId,
          projectReviewId: input.reviewId,
        },
        orderBy: { createdAt: 'asc' },
        select: {
          title: true,
          url: true,
          attachmentType: true,
          document: { select: { name: true } },
        },
      });
      const supportLines: string[] = [
        `Supports de séance — ${meetingTitle} — ${input.projectName}`,
        '',
      ];
      for (const doc of docs) {
        const name =
          doc.title?.trim() ||
          doc.document?.name?.trim() ||
          'Support de séance';
        const url = doc.url?.trim() || null;
        attachmentLines.push({
          filename: name,
          hint: url ? 'Lien support' : 'Support de séance',
          url,
        });
        supportLines.push(url ? `- ${name}\n  ${url}` : `- ${name}`);
      }
      if (docs.length > 0) {
        fileAttachments.push({
          filename: 'supports-seance.txt',
          content: `${supportLines.join('\n')}\n`,
          contentType: 'text/plain; charset=UTF-8',
        });
      }
    }

    const htmlBody = buildProjectReviewInvitationEmailHtml({
      kickLabel: buildProjectReviewInvitationKickLabel(input.review.reviewType),
      meetingTitle: `${meetingTitle} — ${input.projectName}`,
      whenLine,
      message: introMessage,
      agendaItems: agendaForMail,
      attachments: attachmentLines,
      includeRsvp: input.includeRsvp === true,
      actionUrl,
      meetingJoinUrl,
      footerNote: [
        'Envoyé depuis Starium Orchestra.',
        input.attachIcs
          ? 'Une invitation calendrier (.ics) est jointe à ce message.'
          : null,
        input.includeRsvp
          ? 'Les réponses sont enregistrées dans la préparation de la séance.'
          : null,
      ]
        .filter(Boolean)
        .join(' '),
    });
    const textBody = buildProjectReviewInvitationEmailText({
      meetingTitle: `${meetingTitle} — ${input.projectName}`,
      whenLine,
      message: introMessage,
      actionUrl,
      meetingJoinUrl,
      agendaItems: agendaForMail,
    });

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

      const attendeeName =
        participant.displayName?.trim() ||
        [participant.user?.firstName, participant.user?.lastName]
          .map((p) => p?.trim())
          .filter(Boolean)
          .join(' ') ||
        null;

      let calendarIcs: { filename: string; content: string } | null = null;
      if (input.attachIcs) {
        calendarIcs = {
          filename: icsFilename,
          content: buildProjectReviewInvitationIcs({
            reviewId: input.reviewId,
            summary: `${meetingTitle} — ${input.projectName}`,
            description: `${introMessage}\n\n${defaultMessage}`,
            location: input.review.location,
            meetingUrl: meetingJoinUrl,
            startsAt: input.review.reviewDate,
            durationMinutes,
            organizerEmail,
            organizerName,
            attendeeEmail: recipient,
            attendeeName,
          }),
        };
      }

      try {
        await this.emailService.queueEmail({
          clientId: input.clientId,
          projectReviewId: input.reviewId,
          createdByUserId: input.context?.actorUserId,
          recipient,
          templateKey: 'project_review_invitation',
          title: subject,
          message: textBody,
          actionUrl,
          meetingJoinUrl,
          htmlBody,
          calendarIcs,
          fileAttachments:
            fileAttachments.length > 0 ? fileAttachments : null,
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
          attachIcs: Boolean(input.attachIcs),
          includeAgenda: Boolean(input.includeAgenda),
          includeDocs: Boolean(input.includeDocs),
          includeRsvp: Boolean(input.includeRsvp),
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
