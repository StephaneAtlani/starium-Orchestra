import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationType,
  ProjectReviewStatus,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { NotificationsService } from '../../notifications/notifications.service';
import type { AuditContext } from '../../budget-management/types/audit-context';
import {
  PROJECT_AUDIT_ACTION,
  PROJECT_AUDIT_RESOURCE_TYPE,
} from '../project-audit.constants';
import type { InviteProjectReviewResultDto } from './dto/invite-project-review-result.dto';
import {
  buildProjectReviewEntityLabel,
  buildProjectReviewInvitationActionUrl,
  buildProjectReviewInvitationMessage,
  buildProjectReviewInvitationMetadata,
  buildProjectReviewInvitationTitle,
} from './project-review-invitation-labels';
import { ProjectReviewEmailInvitationsService } from './project-review-email-invitations.service';
import {
  ProjectReviewMicrosoftMeetingService,
  type ProjectReviewMeetingOptions,
} from './project-review-microsoft-meeting.service';

export type ProjectReviewInviteTrigger =
  | 'manual'
  | 'auto_create'
  | 'auto_date_change';

export type ProjectReviewNotificationChannel = 'in_app' | 'email';

export type ProjectReviewInviteOptions = {
  participantIds?: string[];
  trigger: ProjectReviewInviteTrigger;
  channels?: ProjectReviewNotificationChannel[];
  meetingOptions?: ProjectReviewMeetingOptions;
};

function defaultResult(): InviteProjectReviewResultDto {
  return {
    notifiedInApp: 0,
    skippedExternal: 0,
    skippedInactive: 0,
    participantIds: [],
    emailed: 0,
    skippedNoEmail: 0,
    emailFailed: 0,
    teamsMeetingCreated: false,
    teamsMeetingUpdated: false,
    teamsMeetingSkipped: true,
    calendarEventCreated: false,
    calendarEventUpdated: false,
    calendarEventSkipped: true,
  };
}

function resolveChannels(
  options: ProjectReviewInviteOptions,
): ProjectReviewNotificationChannel[] {
  if (options.channels?.length) return options.channels;
  return ['in_app'];
}

function resolveMeetingOptions(
  options: ProjectReviewInviteOptions,
): ProjectReviewMeetingOptions {
  return {
    createTeamsMeeting: options.meetingOptions?.createTeamsMeeting ?? false,
    createCalendarEvent: options.meetingOptions?.createCalendarEvent ?? false,
    forceOverwriteMeetingUrl:
      options.meetingOptions?.forceOverwriteMeetingUrl ?? false,
  };
}

function isAutoTrigger(trigger: ProjectReviewInviteTrigger): boolean {
  return trigger === 'auto_create' || trigger === 'auto_date_change';
}

@Injectable()
export class ProjectReviewInvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly auditLogs: AuditLogsService,
    private readonly emailInvitations: ProjectReviewEmailInvitationsService,
    private readonly microsoftMeeting: ProjectReviewMicrosoftMeetingService,
  ) {}

  private auditMeta(context?: AuditContext) {
    return {
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };
  }

  private async loadScopedReview(
    clientId: string,
    projectId: string,
    reviewId: string,
  ) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, clientId },
      select: { id: true, name: true },
    });
    if (!project) throw new NotFoundException('Project not found');

    const review = await this.prisma.projectReview.findFirst({
      where: { id: reviewId, clientId, projectId },
      include: {
        participants: {
          orderBy: { createdAt: 'asc' },
          include: { user: true },
        },
        agendaItems: { select: { plannedDurationMinutes: true } },
      },
    });
    if (!review) throw new NotFoundException('Review not found');

    return { project, review };
  }

  async invite(
    clientId: string,
    projectId: string,
    reviewId: string,
    context: AuditContext | undefined,
    options: ProjectReviewInviteOptions,
  ): Promise<InviteProjectReviewResultDto> {
    const { project, review } = await this.loadScopedReview(
      clientId,
      projectId,
      reviewId,
    );

    if (
      review.status !== ProjectReviewStatus.SCHEDULED &&
      review.status !== ProjectReviewStatus.PLANNED
    ) {
      throw new BadRequestException(
        'Seules les revues planifiées peuvent recevoir des invitations',
      );
    }
    if (!review.reviewDate) {
      throw new BadRequestException(
        'La date de revue est requise pour envoyer des invitations',
      );
    }

    const scheduledReviewDate = review.reviewDate;

    const channels = resolveChannels(options);
    const meetingOptions = resolveMeetingOptions(options);
    const auto = isAutoTrigger(options.trigger);
    const result = defaultResult();

    let participants = review.participants;
    if (options.participantIds?.length) {
      const allowed = new Set(review.participants.map((p) => p.id));
      for (const participantId of options.participantIds) {
        if (!allowed.has(participantId)) {
          throw new BadRequestException(
            'Participant introuvable pour cette revue',
          );
        }
      }
      const filter = new Set(options.participantIds);
      participants = participants.filter((p) => filter.has(p.id));
    }

    let currentReview = review;
    let meetingUrl = review.meetingUrl;

    // 1. Teams (action explicite)
    if (meetingOptions.createTeamsMeeting) {
      try {
        const teamsResult = await this.microsoftMeeting.createOrUpdateTeamsMeeting(
          {
            clientId,
            projectId,
            reviewId,
            projectName: project.name,
            review: currentReview,
            agendaItems: review.agendaItems,
            meetingOptions,
            context,
          },
        );
        result.teamsMeetingCreated = teamsResult.teamsMeetingCreated;
        result.teamsMeetingUpdated = teamsResult.teamsMeetingUpdated;
        result.teamsMeetingSkipped = teamsResult.teamsMeetingSkipped;

        const refreshed = await this.prisma.projectReview.findFirst({
          where: { id: reviewId, clientId, projectId },
        });
        if (refreshed) {
          currentReview = { ...currentReview, ...refreshed };
          meetingUrl = refreshed.meetingUrl;
        }
      } catch (err) {
        if (!auto) throw err;
        await this.microsoftMeeting.auditTeamsFailure(
          clientId,
          reviewId,
          context,
        );
      }
    }

    // 2. Calendrier (action explicite ou replanification auto)
    if (meetingOptions.createCalendarEvent) {
      try {
        const calResult = await this.microsoftMeeting.createOrUpdateCalendarEvent({
          clientId,
          projectId,
          reviewId,
          projectName: project.name,
          review: currentReview,
          participants,
          agendaItems: review.agendaItems,
          meetingUrl,
          meetingOptions,
          context,
        });
        result.calendarEventCreated = calResult.calendarEventCreated;
        result.calendarEventUpdated = calResult.calendarEventUpdated;
        result.calendarEventSkipped = calResult.calendarEventSkipped;
      } catch (err) {
        if (!auto) throw err;
      }
    } else if (
      options.trigger === 'auto_date_change' &&
      review.microsoftEventId
    ) {
      try {
        const calResult =
          await this.microsoftMeeting.patchCalendarEventOnDateChange({
            clientId,
            projectId,
            reviewId,
            projectName: project.name,
            review: currentReview,
            participants,
            agendaItems: review.agendaItems,
            meetingUrl,
            context,
          });
        result.calendarEventCreated = calResult.calendarEventCreated;
        result.calendarEventUpdated = calResult.calendarEventUpdated;
        result.calendarEventSkipped = calResult.calendarEventSkipped;
      } catch {
        // non bloquant auto
      }
    }

    // 3. in_app
    if (channels.includes('in_app')) {
      const inApp = await this.sendInAppInvitations({
        clientId,
        projectId,
        reviewId,
        projectName: project.name,
        review: {
          reviewType: currentReview.reviewType,
          reviewDate: scheduledReviewDate,
          meetingMode: currentReview.meetingMode,
          location: currentReview.location,
          title: currentReview.title,
        },
        participants,
        context,
      });
      result.notifiedInApp = inApp.notifiedInApp;
      result.skippedExternal = inApp.skippedExternal;
      result.skippedInactive = inApp.skippedInactive;
      result.participantIds = inApp.participantIds;
    }

    // 4. email
    if (channels.includes('email')) {
      const emailOnly =
        channels.length === 1 && channels[0] === 'email' && !auto;
      try {
        const emailResult = await this.emailInvitations.sendInvitations({
          clientId,
          projectId,
          reviewId,
          projectName: project.name,
          review: {
            reviewType: currentReview.reviewType,
            reviewDate: scheduledReviewDate,
            meetingMode: currentReview.meetingMode,
            location: currentReview.location,
            meetingUrl,
          },
          participants,
          context,
          blockingOnFailure: emailOnly,
        });
        result.emailed = emailResult.emailed;
        result.skippedNoEmail = emailResult.skippedNoEmail;
        result.emailFailed = emailResult.emailFailed;
        result.emailDisabled = emailResult.emailDisabled;
      } catch (err) {
        if (!auto) throw err;
      }
    }

    if (channels.includes('in_app')) {
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_INVITED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW,
        resourceId: reviewId,
        newValue: {
          reviewId,
          notifiedInAppCount: result.notifiedInApp,
          skippedExternal: result.skippedExternal,
          skippedInactive: result.skippedInactive,
          trigger: options.trigger,
          channels,
        },
        ...this.auditMeta(context),
      });
    }

    return result;
  }

  private async sendInAppInvitations(input: {
    clientId: string;
    projectId: string;
    reviewId: string;
    projectName: string;
    review: {
      reviewType: Parameters<typeof buildProjectReviewInvitationMessage>[0]['reviewType'];
      reviewDate: Date;
      meetingMode: Parameters<typeof buildProjectReviewInvitationMessage>[0]['meetingMode'];
      location: string | null;
      title: string | null;
    };
    participants: {
      id: string;
      userId: string | null;
      invitedAt: Date | null;
    }[];
    context?: AuditContext;
  }) {
    let skippedExternal = 0;
    let skippedInactive = 0;
    const notifiedParticipantIds: string[] = [];
    const seenUserIds = new Set<string>();

    const activeClientUserIds = new Set(
      (
        await this.prisma.clientUser.findMany({
          where: {
            clientId: input.clientId,
            status: 'ACTIVE',
            userId: {
              in: input.participants
                .map((p) => p.userId)
                .filter((id): id is string => id != null),
            },
          },
          select: { userId: true },
        })
      ).map((row) => row.userId),
    );

    const title = buildProjectReviewInvitationTitle(input.projectName);
    const message = buildProjectReviewInvitationMessage({
      reviewType: input.review.reviewType,
      reviewDate: input.review.reviewDate,
      meetingMode: input.review.meetingMode,
      location: input.review.location,
    });
    const entityLabel = buildProjectReviewEntityLabel({
      title: input.review.title,
      reviewType: input.review.reviewType,
    });
    const actionUrl = buildProjectReviewInvitationActionUrl(
      input.projectId,
      input.reviewId,
    );
    const metadata = buildProjectReviewInvitationMetadata({
      projectId: input.projectId,
      reviewId: input.reviewId,
      reviewDate: input.review.reviewDate,
      meetingMode: input.review.meetingMode,
      location: input.review.location,
    });

    const now = new Date();

    for (const participant of input.participants) {
      if (!participant.userId) {
        skippedExternal += 1;
        continue;
      }

      if (!activeClientUserIds.has(participant.userId)) {
        skippedInactive += 1;
        continue;
      }

      if (seenUserIds.has(participant.userId)) continue;
      seenUserIds.add(participant.userId);

      await this.notifications.createForUser({
        clientId: input.clientId,
        userId: participant.userId,
        actorUserId: input.context?.actorUserId,
        type: NotificationType.INFO,
        title,
        message,
        entityType: 'project_review',
        entityId: input.reviewId,
        entityLabel,
        actionUrl,
        metadata,
      });

      await this.prisma.projectReviewParticipant.update({
        where: { id: participant.id },
        data: {
          lastInvitedAt: now,
          ...(participant.invitedAt == null ? { invitedAt: now } : {}),
        },
      });

      notifiedParticipantIds.push(participant.id);
    }

    return {
      notifiedInApp: notifiedParticipantIds.length,
      skippedExternal,
      skippedInactive,
      participantIds: notifiedParticipantIds,
    };
  }
}
