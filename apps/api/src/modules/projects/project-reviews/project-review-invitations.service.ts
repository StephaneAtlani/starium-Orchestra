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
import {
  buildProjectReviewEntityLabel,
  buildProjectReviewInvitationActionUrl,
  buildProjectReviewInvitationMessage,
  buildProjectReviewInvitationMetadata,
  buildProjectReviewInvitationTitle,
} from './project-review-invitation-labels';
import type { InviteProjectReviewResultDto } from './dto/invite-project-review-result.dto';

export type ProjectReviewInviteTrigger =
  | 'manual'
  | 'auto_create'
  | 'auto_date_change';

export type ProjectReviewInviteOptions = {
  participantIds?: string[];
  trigger: ProjectReviewInviteTrigger;
};

@Injectable()
export class ProjectReviewInvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly auditLogs: AuditLogsService,
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
        participants: { orderBy: { createdAt: 'asc' } },
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

    if (review.status !== ProjectReviewStatus.PLANNED) {
      throw new BadRequestException(
        'Seules les revues planifiées peuvent recevoir des invitations',
      );
    }

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

    let skippedExternal = 0;
    let skippedInactive = 0;
    const notifiedParticipantIds: string[] = [];
    const seenUserIds = new Set<string>();

    const activeClientUserIds = new Set(
      (
        await this.prisma.clientUser.findMany({
          where: {
            clientId,
            status: 'ACTIVE',
            userId: {
              in: participants
                .map((p) => p.userId)
                .filter((id): id is string => id != null),
            },
          },
          select: { userId: true },
        })
      ).map((row) => row.userId),
    );

    const title = buildProjectReviewInvitationTitle(project.name);
    const message = buildProjectReviewInvitationMessage({
      reviewType: review.reviewType,
      reviewDate: review.reviewDate,
      meetingMode: review.meetingMode,
      location: review.location,
    });
    const entityLabel = buildProjectReviewEntityLabel({
      title: review.title,
      reviewType: review.reviewType,
    });
    const actionUrl = buildProjectReviewInvitationActionUrl(projectId, reviewId);
    const metadata = buildProjectReviewInvitationMetadata({
      projectId,
      reviewId,
      reviewDate: review.reviewDate,
      meetingMode: review.meetingMode,
      location: review.location,
    });

    const now = new Date();

    for (const participant of participants) {
      if (!participant.userId) {
        skippedExternal += 1;
        continue;
      }

      if (!activeClientUserIds.has(participant.userId)) {
        skippedInactive += 1;
        continue;
      }

      if (seenUserIds.has(participant.userId)) {
        continue;
      }
      seenUserIds.add(participant.userId);

      await this.notifications.createForUser({
        clientId,
        userId: participant.userId,
        actorUserId: context?.actorUserId,
        type: NotificationType.INFO,
        title,
        message,
        entityType: 'project_review',
        entityId: reviewId,
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

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_INVITED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW,
      resourceId: reviewId,
      newValue: {
        reviewId,
        notifiedCount: notifiedParticipantIds.length,
        skippedExternal,
        skippedInactive,
        trigger: options.trigger,
      },
      ...this.auditMeta(context),
    });

    return {
      notified: notifiedParticipantIds.length,
      skippedExternal,
      skippedInactive,
      participantIds: notifiedParticipantIds,
    };
  }
}
