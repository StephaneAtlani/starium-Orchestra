import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  MicrosoftConnectionStatus,
  ProjectReviewMeetingMode,
  type ProjectReview,
  type ProjectReviewParticipant,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { MicrosoftGraphService } from '../../microsoft/microsoft-graph.service';
import { MicrosoftGraphHttpError } from '../../microsoft/microsoft-graph.types';
import type { AuditContext } from '../../budget-management/types/audit-context';
import {
  PROJECT_AUDIT_ACTION,
  PROJECT_AUDIT_RESOURCE_TYPE,
} from '../project-audit.constants';
import { pseudonymizeEmail } from './project-review-invitation-privacy.helpers';

export const MICROSOFT_RECONNECT_MESSAGE =
  'Reconnecter Microsoft pour activer les réunions Teams et le calendrier';

export type ProjectReviewMeetingOptions = {
  createTeamsMeeting?: boolean;
  createCalendarEvent?: boolean;
  forceOverwriteMeetingUrl?: boolean;
};

export type TeamsMeetingResult = {
  teamsMeetingCreated: boolean;
  teamsMeetingUpdated: boolean;
  teamsMeetingSkipped: boolean;
};

export type CalendarEventResult = {
  calendarEventCreated: boolean;
  calendarEventUpdated: boolean;
  calendarEventSkipped: boolean;
};

type ResolvedMicrosoftContext = {
  connectionId: string;
  connectedByUserId: string;
  projectId: string;
};

@Injectable()
export class ProjectReviewMicrosoftMeetingService {
  private readonly logger = new Logger(ProjectReviewMicrosoftMeetingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly graph: MicrosoftGraphService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  private auditMeta(context?: AuditContext) {
    return {
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };
  }

  private async resolveMicrosoftContext(
    clientId: string,
    projectId: string,
  ): Promise<ResolvedMicrosoftContext> {
    const link = await this.prisma.projectMicrosoftLink.findFirst({
      where: { clientId, projectId, isEnabled: true },
      include: {
        microsoftConnection: true,
      },
    });

    if (!link?.microsoftConnectionId || !link.microsoftConnection) {
      throw new BadRequestException(
        'Lien Microsoft projet inactif ou introuvable',
      );
    }

    const connection = link.microsoftConnection;
    if (connection.status !== MicrosoftConnectionStatus.ACTIVE) {
      throw new BadRequestException(MICROSOFT_RECONNECT_MESSAGE);
    }

    if (!connection.connectedByUserId) {
      throw new BadRequestException(MICROSOFT_RECONNECT_MESSAGE);
    }

    return {
      connectionId: connection.id,
      connectedByUserId: connection.connectedByUserId,
      projectId,
    };
  }

  private wrapGraphError(err: unknown): never {
    if (err instanceof MicrosoftGraphHttpError) {
      if (err.statusCode === 403 || err.statusCode === 401) {
        throw new ForbiddenException(MICROSOFT_RECONNECT_MESSAGE);
      }
    }
    throw err;
  }

  computeMeetingWindow(review: {
    reviewDate: Date;
    agendaItems?: { plannedDurationMinutes: number | null }[];
  }): { startDateTime: string; endDateTime: string } {
    const start = review.reviewDate;
    let durationMinutes = 60;
    if (review.agendaItems?.length) {
      const sum = review.agendaItems.reduce(
        (acc, item) => acc + (item.plannedDurationMinutes ?? 0),
        0,
      );
      if (sum > 0) durationMinutes = sum;
    }
    const end = new Date(start.getTime() + durationMinutes * 60_000);
    return {
      startDateTime: start.toISOString(),
      endDateTime: end.toISOString(),
    };
  }

  private buildMeetingSubject(review: ProjectReview, projectName: string): string {
    return review.title?.trim() || `Point projet — ${projectName}`;
  }

  private resolveAttendeeEmails(
    participants: (ProjectReviewParticipant & {
      user?: { email: string } | null;
    })[],
  ): { emailAddress: { address: string; name?: string }; type: string }[] {
    const seen = new Set<string>();
    const attendees: {
      emailAddress: { address: string; name?: string };
      type: string;
    }[] = [];

    for (const p of participants) {
      const email = p.userId
        ? p.user?.email?.trim().toLowerCase()
        : p.externalEmail?.trim().toLowerCase();
      if (!email || seen.has(email)) continue;
      seen.add(email);
      attendees.push({
        emailAddress: {
          address: email,
          name: p.displayName?.trim() || undefined,
        },
        type: 'required',
      });
    }
    return attendees;
  }

  async createOrUpdateTeamsMeeting(input: {
    clientId: string;
    projectId: string;
    reviewId: string;
    projectName: string;
    review: ProjectReview;
    agendaItems: { plannedDurationMinutes: number | null }[];
    meetingOptions: ProjectReviewMeetingOptions;
    context?: AuditContext;
  }): Promise<TeamsMeetingResult> {
    const skipped: TeamsMeetingResult = {
      teamsMeetingCreated: false,
      teamsMeetingUpdated: false,
      teamsMeetingSkipped: true,
    };

    if (!input.meetingOptions.createTeamsMeeting) return skipped;

    if (
      input.review.meetingMode !== ProjectReviewMeetingMode.REMOTE &&
      input.review.meetingMode !== ProjectReviewMeetingMode.HYBRID
    ) {
      throw new BadRequestException(
        'La création Teams nécessite un mode visio (REMOTE ou HYBRID)',
      );
    }

    const manualUrl = input.review.meetingUrl?.trim();
    if (
      manualUrl &&
      !input.review.microsoftOnlineMeetingId &&
      !input.meetingOptions.forceOverwriteMeetingUrl
    ) {
      throw new BadRequestException(
        'Un lien de réunion existe déjà. Confirmez le remplacement avec forceOverwriteMeetingUrl.',
      );
    }

    const msContext = await this.resolveMicrosoftContext(
      input.clientId,
      input.projectId,
    );

    const { startDateTime, endDateTime } = this.computeMeetingWindow({
      reviewDate: input.review.reviewDate,
      agendaItems: input.agendaItems,
    });
    const subject = this.buildMeetingSubject(input.review, input.projectName);

    let joinWebUrl: string | undefined;
    let onlineMeetingId: string | undefined;
    let updated = false;

    try {
      if (input.review.microsoftOnlineMeetingId) {
        const created = await this.graph.createOnlineMeeting(
          input.clientId,
          msContext.connectionId,
          { startDateTime, endDateTime, subject },
        );
        onlineMeetingId = created.id;
        joinWebUrl = created.joinWebUrl;
        updated = true;
      } else {
        const created = await this.graph.createOnlineMeeting(
          input.clientId,
          msContext.connectionId,
          { startDateTime, endDateTime, subject },
        );
        onlineMeetingId = created.id;
        joinWebUrl = created.joinWebUrl;
      }
    } catch (err) {
      this.wrapGraphError(err);
    }

    if (!joinWebUrl || !onlineMeetingId) {
      throw new BadRequestException(
        'La réunion Teams n\'a pas pu être créée',
      );
    }

    await this.prisma.projectReview.update({
      where: { id: input.reviewId },
      data: {
        meetingUrl: joinWebUrl,
        microsoftOnlineMeetingId: onlineMeetingId,
        microsoftMeetingOrganizerUserId: msContext.connectedByUserId,
      },
    });

    if (input.meetingOptions.forceOverwriteMeetingUrl && manualUrl) {
      await this.auditLogs.create({
        clientId: input.clientId,
        userId: input.context?.actorUserId,
        action:
          PROJECT_AUDIT_ACTION.PROJECT_REVIEW_TEAMS_MEETING_OVERWRITE_CONFIRMED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW,
        resourceId: input.reviewId,
        newValue: { reviewId: input.reviewId },
        ...this.auditMeta(input.context),
      });
    }

    await this.auditLogs.create({
      clientId: input.clientId,
      userId: input.context?.actorUserId,
      action: updated
        ? PROJECT_AUDIT_ACTION.PROJECT_REVIEW_TEAMS_MEETING_UPDATED
        : PROJECT_AUDIT_ACTION.PROJECT_REVIEW_TEAMS_MEETING_CREATED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW,
      resourceId: input.reviewId,
      newValue: {
        reviewId: input.reviewId,
        microsoftOnlineMeetingId: onlineMeetingId,
      },
      ...this.auditMeta(input.context),
    });

    return {
      teamsMeetingCreated: !updated,
      teamsMeetingUpdated: updated,
      teamsMeetingSkipped: false,
    };
  }

  async createOrUpdateCalendarEvent(input: {
    clientId: string;
    projectId: string;
    reviewId: string;
    projectName: string;
    review: ProjectReview;
    participants: (ProjectReviewParticipant & {
      user?: { email: string } | null;
    })[];
    agendaItems: { plannedDurationMinutes: number | null }[];
    meetingUrl: string | null;
    meetingOptions: ProjectReviewMeetingOptions;
    context?: AuditContext;
  }): Promise<CalendarEventResult> {
    const skipped: CalendarEventResult = {
      calendarEventCreated: false,
      calendarEventUpdated: false,
      calendarEventSkipped: true,
    };

    if (!input.meetingOptions.createCalendarEvent) return skipped;

    const msContext = await this.resolveMicrosoftContext(
      input.clientId,
      input.projectId,
    );

    const { startDateTime, endDateTime } = this.computeMeetingWindow({
      reviewDate: input.review.reviewDate,
      agendaItems: input.agendaItems,
    });
    const subject = this.buildMeetingSubject(input.review, input.projectName);
    const attendees = this.resolveAttendeeEmails(input.participants);
    const pseudonymizedAttendees = attendees.map((a) =>
      pseudonymizeEmail(a.emailAddress.address),
    );

    const eventBody: Record<string, unknown> = {
      subject,
      start: { dateTime: startDateTime, timeZone: 'UTC' },
      end: { dateTime: endDateTime, timeZone: 'UTC' },
      attendees,
    };

    if (input.meetingUrl?.trim()) {
      eventBody.isOnlineMeeting = true;
      eventBody.onlineMeetingUrl = input.meetingUrl.trim();
    }

    if (input.review.location?.trim()) {
      eventBody.location = { displayName: input.review.location.trim() };
    }

    let eventId = input.review.microsoftEventId;
    let updated = false;

    try {
      if (eventId) {
        await this.graph.patchCalendarEvent(
          input.clientId,
          msContext.connectionId,
          eventId,
          eventBody,
        );
        updated = true;
      } else {
        const created = await this.graph.createCalendarEvent(
          input.clientId,
          msContext.connectionId,
          eventBody,
        );
        eventId = created.id;
      }
    } catch (err) {
      this.wrapGraphError(err);
    }

    if (!eventId) {
      throw new BadRequestException(
        "L'événement calendrier n'a pas pu être créé",
      );
    }

    if (!input.review.microsoftEventId) {
      await this.prisma.projectReview.update({
        where: { id: input.reviewId },
        data: {
          microsoftEventId: eventId,
          microsoftMeetingOrganizerUserId: msContext.connectedByUserId,
        },
      });
    }

    await this.auditLogs.create({
      clientId: input.clientId,
      userId: input.context?.actorUserId,
      action: updated
        ? PROJECT_AUDIT_ACTION.PROJECT_REVIEW_CALENDAR_EVENT_UPDATED
        : PROJECT_AUDIT_ACTION.PROJECT_REVIEW_CALENDAR_EVENT_CREATED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW,
      resourceId: input.reviewId,
      newValue: {
        reviewId: input.reviewId,
        microsoftEventId: eventId,
        attendeeCount: attendees.length,
        attendees: pseudonymizedAttendees,
      },
      ...this.auditMeta(input.context),
    });

    return {
      calendarEventCreated: !updated,
      calendarEventUpdated: updated,
      calendarEventSkipped: false,
    };
  }

  /** Replanification auto : patch si événement créé par Starium. */
  async patchCalendarEventOnDateChange(input: {
    clientId: string;
    projectId: string;
    reviewId: string;
    projectName: string;
    review: ProjectReview;
    participants: (ProjectReviewParticipant & {
      user?: { email: string } | null;
    })[];
    agendaItems: { plannedDurationMinutes: number | null }[];
    meetingUrl: string | null;
    context?: AuditContext;
  }): Promise<CalendarEventResult> {
    if (!input.review.microsoftEventId) {
      return {
        calendarEventCreated: false,
        calendarEventUpdated: false,
        calendarEventSkipped: true,
      };
    }

    return this.createOrUpdateCalendarEvent({
      ...input,
      meetingOptions: { createCalendarEvent: true },
    });
  }

  async auditTeamsFailure(
    clientId: string,
    reviewId: string,
    context?: AuditContext,
  ): Promise<void> {
    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_TEAMS_FAILED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW,
      resourceId: reviewId,
      newValue: { reviewId },
      ...this.auditMeta(context),
    });
  }
}
