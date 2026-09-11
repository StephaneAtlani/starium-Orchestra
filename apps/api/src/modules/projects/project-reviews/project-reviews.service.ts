import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ProjectReviewAgendaItemType,
  ProjectReviewDecisionStatus,
  ProjectReviewDecisionType,
  ProjectReviewDescentStatus,
  ProjectReviewEscalationStatus,
  ProjectReviewStatus,
  ProjectReviewType,
  ProjectStatus,
  ProjectTaskPriority,
  ProjectTaskStatus,
  ProjectRiskTreatmentStrategy,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import type { AuditContext } from '../../budget-management/types/audit-context';
import {
  PROJECT_AUDIT_ACTION,
  PROJECT_AUDIT_RESOURCE_TYPE,
} from '../project-audit.constants';
import { ProjectsPilotageService } from '../projects-pilotage.service';
import { ProjectsService } from '../projects.service';
import { CreateProjectReviewDto } from './dto/create-project-review.dto';
import { FinalizeProjectReviewDto } from './dto/finalize-project-review.dto';
import { UpdateProjectReviewDto } from './dto/update-project-review.dto';
import { ScheduleProjectReviewDto } from './dto/schedule-project-review.dto';
import { CreateProjectReviewEscalationDto } from './dto/create-project-review-escalation.dto';
import { ProjectReviewActionItemInputDto } from './dto/project-review-action-item.dto';
import { ProjectReviewDecisionInputDto } from './dto/project-review-decision.dto';
import {
  actionsEligibleForTaskPush,
  extractRiskNoteTitles,
  isDuplicateRiskTitle,
  nextRiskCodeFromExisting,
  PROMOTED_RISK_DEFAULTS,
  type ActionsPushResult,
  type RisksPromoteResult,
} from './project-review-finalize-side-effects';
import {
  buildEscalationAgendaDescription,
  canInjectIntoTargetAgenda,
  COPIL_ESCALATION_TARGET_STATUSES,
  escalationStatusLabel,
  resolveNextCopilTarget,
  reviewTitleLabel,
} from './project-review-escalations';
import {
  buildDescentAgendaDescription,
  COPRO_DESCENT_TARGET_STATUSES,
  descentStatusLabel,
  resolveNextCoproTarget,
} from './project-review-descents';
import { applyCriticalityFromProbabilityImpact } from '../lib/project-risk-criticality.util';
import {
  assertMeetingFieldsCoherence,
  assertValidMeetingUrl,
  resolveCreationStatus,
} from './project-review-meeting.validation';
import {
  isReviewContentEditable,
  isReviewPlanningEditable,
  isReviewUpdateAllowed,
  assertScheduledUpdatePayloadAllowed,
  normalizeReviewStatus,
} from './project-review-status.helpers';
import {
  PROJECT_REVIEW_SERIES_FREQUENCY_LABEL,
  resolveReviewUiState,
  type ProjectReviewUiState,
} from './project-review-ui-state';
import { ProjectReviewInvitationsService } from './project-review-invitations.service';
import {
  formatProjectReviewUserDisplayName,
  projectReviewUserSelect,
} from './project-review-user-display';
import {
  buildProjectReviewSnapshotPayload,
  type ProjectReviewSnapshotAgendaItem,
  type ProjectReviewSnapshotPayload,
} from './project-reviews-snapshot.builder';
import {
  buildProjectReviewReportContent,
  parseProjectReviewSnapshotPayload,
  requireProjectReviewReportAppBaseUrl,
  resolveProjectReviewReportAppBaseUrl,
} from './project-review-report.builder';
import { ProjectReviewEmailReportService } from './project-review-email-report.service';

const reviewInclude = {
  participants: {
    include: { user: { select: projectReviewUserSelect } },
    orderBy: { createdAt: 'asc' as const },
  },
  decisions: { orderBy: { createdAt: 'asc' as const } },
  actionItems: {
    orderBy: { id: 'asc' as const },
    include: {
      responsibleUser: { select: projectReviewUserSelect },
      contributors: {
        include: { user: { select: projectReviewUserSelect } },
      },
    },
  },
  agendaItems: {
    orderBy: { orderIndex: 'asc' as const },
    include: {
      ownerUser: { select: projectReviewUserSelect },
    },
  },
  attachments: { orderBy: { createdAt: 'asc' as const } },
  facilitator: { select: projectReviewUserSelect },
  startedBy: { select: projectReviewUserSelect },
  series: { select: { id: true, frequency: true, title: true } },
} satisfies Prisma.ProjectReviewInclude;

type ReviewWithChildren = Prisma.ProjectReviewGetPayload<{
  include: typeof reviewInclude;
}>;

const POST_MORTEM_ELIGIBLE_PROJECT_STATUSES: ProjectStatus[] = [
  'COMPLETED',
  'CANCELLED',
  'ARCHIVED',
];

function isPostMortemEligibleProjectStatus(status: ProjectStatus): boolean {
  return POST_MORTEM_ELIGIBLE_PROJECT_STATUSES.includes(status);
}

/** Bornes du trimestre civil courant en Europe/Paris (start inclus, end exclus). */
function civilQuarterBoundsParis(now: Date): {
  quarterStart: Date;
  quarterEnd: Date;
} {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  const qStartMonth = Math.floor((month - 1) / 3) * 3 + 1;
  const quarterStart = parisCivilMidnight(year, qStartMonth, 1);
  const endMonth = qStartMonth + 3;
  const quarterEnd =
    endMonth > 12
      ? parisCivilMidnight(year + 1, endMonth - 12, 1)
      : parisCivilMidnight(year, endMonth, 1);
  return { quarterStart, quarterEnd };
}

function parisCivilMidnight(year: number, month: number, day: number): Date {
  const utcGuess = new Date(
    Date.UTC(year, month - 1, day, 0, 0, 0),
  );
  const parisHour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Paris',
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(utcGuess),
  );
  utcGuess.setUTCHours(utcGuess.getUTCHours() - parisHour);
  return utcGuess;
}

@Injectable()
export class ProjectReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
    private readonly pilotage: ProjectsPilotageService,
    private readonly auditLogs: AuditLogsService,
    private readonly invitations: ProjectReviewInvitationsService,
    private readonly emailReport: ProjectReviewEmailReportService,
  ) {}

  private async validateLinkedTasks(
    clientId: string,
    projectId: string,
    items: Array<{ linkedTaskId?: string | null } | undefined>,
  ): Promise<void> {
    const ids = [
      ...new Set(
        items
          .flatMap((i) => (i?.linkedTaskId ? [i.linkedTaskId] : []))
          .filter(Boolean),
      ),
    ] as string[];
    for (const taskId of ids) {
      const t = await this.prisma.projectTask.findFirst({
        where: { id: taskId, clientId, projectId },
      });
      if (!t) {
        throw new NotFoundException('Linked task not found');
      }
    }
  }

  private async validateFacilitator(
    clientId: string,
    facilitatorUserId: string | null | undefined,
  ): Promise<void> {
    if (facilitatorUserId == null || facilitatorUserId === '') return;
    await this.projects.assertClientUser(clientId, facilitatorUserId);
  }

  /** Participants à recopier sur le brouillon « prochain point » (PATCH complet ou état existant). */
  private resolveParticipantsForSpawn(
    dto: UpdateProjectReviewDto,
    existing: ReviewWithChildren,
  ): Array<{
    userId: string | null;
    displayName: string | null;
    attended: boolean;
    isRequired: boolean;
  }> {
    if (dto.participants !== undefined) {
      return dto.participants.map((p) => ({
        userId: p.userId ?? null,
        displayName: p.displayName?.trim() ?? null,
        attended: p.attended ?? true,
        isRequired: p.isRequired ?? false,
      }));
    }
    return existing.participants.map((p) => ({
      userId: p.userId,
      displayName: p.displayName,
      attended: p.attended,
      isRequired: p.isRequired,
    }));
  }

  /**
   * Si `nextReviewDate` est renseigné : crée un brouillon à cette date (ou resynchronise les participants
   * si un brouillon existe déjà à cette date). Ne modifie pas un point déjà finalisé à cette date.
   */
  private async upsertSpawnedNextReview(
    tx: Prisma.TransactionClient,
    args: {
      clientId: string;
      projectId: string;
      currentReviewId: string;
      nextReviewDate: Date;
      reviewType: ProjectReviewType;
      facilitatorUserId: string | null;
      participants: Array<{
        userId: string | null;
        displayName: string | null;
        attended: boolean;
        isRequired: boolean;
      }>;
    },
  ): Promise<string | null> {
    const { clientId, projectId, currentReviewId, nextReviewDate } = args;
    const rows = args.participants.filter(
      (p) => (p.displayName?.trim() ?? '') !== '' || (p.userId?.trim() ?? '') !== '',
    );

    const dup = await tx.projectReview.findFirst({
      where: {
        clientId,
        projectId,
        id: { not: currentReviewId },
        reviewDate: nextReviewDate,
      },
    });

    if (!dup) {
      const created = await tx.projectReview.create({
        data: {
          clientId,
          projectId,
          reviewDate: nextReviewDate,
          reviewType: args.reviewType,
          status: ProjectReviewStatus.SCHEDULED,
          facilitatorUserId: args.facilitatorUserId,
          participants: rows.length
            ? {
                create: rows.map((p) => ({
                  clientId,
                  userId: p.userId,
                  displayName: p.displayName?.trim() ?? null,
                  attended: p.attended,
                  isRequired: p.isRequired,
                })),
              }
            : undefined,
        },
      });
      return created.id;
    }

    if (
      dup.status === ProjectReviewStatus.SCHEDULED ||
      dup.status === ProjectReviewStatus.PLANNED
    ) {
      await tx.projectReviewParticipant.deleteMany({
        where: { projectReviewId: dup.id, clientId },
      });
      if (rows.length > 0) {
        await tx.projectReviewParticipant.createMany({
          data: rows.map((p) => ({
            clientId,
            projectReviewId: dup.id,
            userId: p.userId,
            displayName: p.displayName?.trim() ?? null,
            attended: p.attended,
            isRequired: p.isRequired,
          })),
        });
      }
      await tx.projectReview.update({
        where: { id: dup.id },
        data: {
          reviewType: args.reviewType,
          facilitatorUserId: args.facilitatorUserId,
        },
      });
    }

    return null;
  }

  private assertReviewTypeForProjectCreate(
    projectStatus: ProjectStatus,
    reviewType: ProjectReviewType,
  ): void {
    const eligible = isPostMortemEligibleProjectStatus(projectStatus);
    if (eligible) {
      if (reviewType !== ProjectReviewType.POST_MORTEM) {
        throw new BadRequestException(
          "Lorsque le projet est terminé, annulé ou archivé, seul un retour d'expérience peut être créé.",
        );
      }
    } else if (reviewType === ProjectReviewType.POST_MORTEM) {
      throw new BadRequestException(
        "Un retour d'expérience ne peut être créé que lorsque le projet est terminé, annulé ou archivé.",
      );
    }
  }

  /**
   * Projet « clos » : retour d'expérience autorisé ; brouillons COPIL/COPRO ouverts avant clôture :
   * mise à jour sans changement de type, ou conversion explicite vers POST_MORTEM.
   */
  private assertReviewTypeForProjectUpdate(
    projectStatus: ProjectStatus,
    existingReviewType: ProjectReviewType,
    dto: UpdateProjectReviewDto,
  ): void {
    const eligible = isPostMortemEligibleProjectStatus(projectStatus);
    const effectiveType =
      dto.reviewType !== undefined ? dto.reviewType : existingReviewType;
    const typeChanging =
      dto.reviewType !== undefined && dto.reviewType !== existingReviewType;

    if (!eligible) {
      if (effectiveType === ProjectReviewType.POST_MORTEM) {
        throw new BadRequestException(
          "Un retour d'expérience ne peut être utilisé que lorsque le projet est terminé, annulé ou archivé.",
        );
      }
      return;
    }

    if (effectiveType === ProjectReviewType.POST_MORTEM) {
      return;
    }

    if (!typeChanging) {
      return;
    }

    if (
      existingReviewType !== ProjectReviewType.POST_MORTEM &&
      dto.reviewType === ProjectReviewType.POST_MORTEM
    ) {
      return;
    }

    throw new BadRequestException(
      "Pour un projet terminé, annulé ou archivé : conservez le type du brouillon existant, ou passez en retour d'expérience.",
    );
  }

  private async validateParticipantUsers(
    clientId: string,
    participants: Array<{ userId?: string | null } | undefined>,
  ): Promise<void> {
    const ids = [
      ...new Set(
        participants
          .flatMap((p) => (p?.userId ? [p.userId] : []))
          .filter(Boolean),
      ),
    ] as string[];
    for (const uid of ids) {
      await this.projects.assertClientUser(clientId, uid);
    }
  }

  private async validateActionItemUsers(
    clientId: string,
    items: ProjectReviewActionItemInputDto[] | undefined,
  ): Promise<void> {
    if (!items?.length) return;
    const userIds = [
      ...new Set(
        items.flatMap((a) =>
          [
            a.responsibleUserId,
            ...(a.contributors?.map((c) => c.userId) ?? []),
          ].filter(Boolean),
        ),
      ),
    ] as string[];
    for (const uid of userIds) {
      await this.projects.assertClientUser(clientId, uid);
    }
  }

  private assertActionItemsResponsibleInReview(
    reviewStatus: ProjectReviewStatus,
    items: ProjectReviewActionItemInputDto[] | undefined,
  ): void {
    if (!items?.length) return;
    if (
      reviewStatus !== ProjectReviewStatus.IN_PROGRESS &&
      reviewStatus !== ProjectReviewStatus.IN_REVIEW
    ) {
      return;
    }
    for (const item of items) {
      if (!item.responsibleUserId?.trim()) {
        throw new BadRequestException(
          'Chaque action créée en revue doit avoir un responsable unique',
        );
      }
    }
  }

  private resolveDecisionStatus(
    reviewStatus: ProjectReviewStatus,
    explicit?: ProjectReviewDecisionStatus,
  ): ProjectReviewDecisionStatus {
    if (explicit !== undefined) return explicit;
    const normalized = normalizeReviewStatus(reviewStatus);
    if (
      normalized === ProjectReviewStatus.IN_PROGRESS ||
      reviewStatus === ProjectReviewStatus.IN_REVIEW
    ) {
      return ProjectReviewDecisionStatus.DRAFT;
    }
    return ProjectReviewDecisionStatus.VALIDATED;
  }

  private buildDecisionCreateData(
    clientId: string,
    reviewStatus: ProjectReviewStatus,
    d: ProjectReviewDecisionInputDto,
  ) {
    return {
      clientId,
      title: d.title.trim(),
      description: d.description?.trim() ?? null,
      agendaItemId: d.agendaItemId ?? null,
      decisionType: d.decisionType ?? ProjectReviewDecisionType.OTHER,
      status: this.resolveDecisionStatus(reviewStatus, d.status),
      decidedByUserId: d.decidedByUserId ?? null,
      decidedAt: d.decidedAt ? new Date(d.decidedAt) : null,
      impact: d.impact?.trim() ?? null,
    };
  }

  private resolveObjectiveText(dto: {
    objective?: string | null;
    executiveSummary?: string | null;
  }): string | null {
    return dto.objective?.trim() ?? dto.executiveSummary?.trim() ?? null;
  }

  private mapObjectiveResponse(row: {
    objective?: string | null;
    executiveSummary?: string | null;
  }) {
    const text = row.objective?.trim() ?? row.executiveSummary?.trim() ?? null;
    return { objective: text, executiveSummary: text };
  }

  private resolveMeetingFields(dto: {
    meetingMode?: CreateProjectReviewDto['meetingMode'];
    meetingUrl?: string | null;
    location?: string | null;
  }) {
    const meetingUrl = dto.meetingUrl?.trim() ?? null;
    const location = dto.location?.trim() ?? null;
    assertValidMeetingUrl(meetingUrl);
    assertMeetingFieldsCoherence(dto.meetingMode, meetingUrl, location);
    return {
      meetingMode: dto.meetingMode ?? null,
      meetingUrl,
      location,
    };
  }

  private mapParticipant(p: ReviewWithChildren['participants'][number]) {
    const userDisplayName = formatProjectReviewUserDisplayName(p.user);
    return {
      id: p.id,
      userId: p.userId,
      displayName: p.displayName ?? userDisplayName,
      roleLabel: p.roleLabel,
      attendanceStatus: p.attendanceStatus,
      invitedAt: p.invitedAt?.toISOString() ?? null,
      lastInvitedAt: p.lastInvitedAt?.toISOString() ?? null,
      externalEmail: p.externalEmail ?? null,
      lastEmailedAt: p.lastEmailedAt?.toISOString() ?? null,
    };
  }

  private reviewDatesEqualSecond(a: Date | null, b: Date | null): boolean {
    if (a == null && b == null) return true;
    if (a == null || b == null) return false;
    return Math.floor(a.getTime() / 1000) === Math.floor(b.getTime() / 1000);
  }

  private auditMeta(context?: AuditContext) {
    return {
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };
  }

  private async tryAutoInvite(
    clientId: string,
    projectId: string,
    reviewId: string,
    context: AuditContext | undefined,
    trigger: 'auto_create' | 'auto_date_change',
  ): Promise<void> {
    try {
      await this.invitations.invite(clientId, projectId, reviewId, context, {
        trigger,
        channels: ['in_app'],
      });
    } catch {
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_INVITE_FAILED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW,
        resourceId: reviewId,
        newValue: { reviewId, trigger },
        ...this.auditMeta(context),
      });
    }
  }

  private mapActionItem(a: ReviewWithChildren['actionItems'][number]) {
    return {
      id: a.id,
      title: a.title,
      description: a.description,
      status: a.status,
      priority: a.priority,
      dueDate: a.dueDate?.toISOString() ?? null,
      linkedTaskId: a.linkedTaskId,
      agendaItemId: a.agendaItemId,
      decisionId: a.decisionId,
      responsibleUserId: a.responsibleUserId,
      responsibleDisplayName: formatProjectReviewUserDisplayName(
        a.responsibleUser,
      ),
      contributors: a.contributors.map((c) => ({
        id: c.id,
        userId: c.userId,
        displayName:
          c.displayName ?? formatProjectReviewUserDisplayName(c.user),
        roleLabel: c.roleLabel,
        contributionStatus: c.contributionStatus,
      })),
    };
  }

  private mapAgendaItem(item: ReviewWithChildren['agendaItems'][number]) {
    return {
      id: item.id,
      title: item.title,
      description: item.description,
      itemType: item.itemType,
      objective: item.objective,
      expectedDecision: item.expectedDecision,
      orderIndex: item.orderIndex,
      plannedDurationMinutes: item.plannedDurationMinutes,
      ownerUserId: item.ownerUserId,
      ownerDisplayName: formatProjectReviewUserDisplayName(item.ownerUser),
      status: item.status,
      notes: item.notes,
      decisionSummary: item.decisionSummary,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  private mapReviewToListItem(row: ReviewWithChildren) {
    const objectiveFields = this.mapObjectiveResponse(row);
    const agendaDoneCount = row.agendaItems.filter(
      (item) => item.status === 'DONE' || item.status === 'SKIPPED',
    ).length;
    const decisionAgendaIds = new Set(
      row.decisions
        .map((d) => d.agendaItemId)
        .filter((id): id is string => Boolean(id)),
    );
    const openArbitrationsWithoutVerdictCount = row.agendaItems.filter(
      (item) =>
        item.itemType === 'ARBITRATION' &&
        !(item.decisionSummary?.trim()) &&
        !decisionAgendaIds.has(item.id),
    ).length;
    const openActionsWithoutOwnerOrDueCount = row.actionItems.filter((a) => {
      const open =
        a.status !== 'DONE' && a.status !== 'CANCELLED';
      if (!open) return false;
      return !a.responsibleUserId || !a.dueDate;
    }).length;
    const attendedCount = row.participants.filter(
      (p) => p.attended || p.attendanceStatus === 'PRESENT',
    ).length;
    const uiState = resolveReviewUiState({
      status: row.status,
      agendaLockedAt: row.agendaLockedAt,
      conductClosedAt: row.conductClosedAt,
      startedAt: row.startedAt,
    });
    const seriesFrequency = row.series
      ? PROJECT_REVIEW_SERIES_FREQUENCY_LABEL[row.series.frequency]
      : null;

    return {
      id: row.id,
      clientId: row.clientId,
      projectId: row.projectId,
      reviewDate: row.reviewDate?.toISOString() ?? null,
      reviewType: row.reviewType,
      status: row.status,
      title: row.title,
      ...objectiveFields,
      periodStart: row.periodStart?.toISOString() ?? null,
      periodEnd: row.periodEnd?.toISOString() ?? null,
      durationMinutes: row.durationMinutes ?? null,
      meetingMode: row.meetingMode,
      meetingUrl: row.meetingUrl,
      microsoftOnlineMeetingId: row.microsoftOnlineMeetingId ?? null,
      microsoftEventId: row.microsoftEventId ?? null,
      location: row.location,
      startedAt: row.startedAt?.toISOString() ?? null,
      startedByUserId: row.startedByUserId,
      facilitatorUserId: row.facilitatorUserId,
      createdByUserId: row.createdByUserId ?? null,
      cancelledAt: row.cancelledAt?.toISOString() ?? null,
      cancelledByUserId: row.cancelledByUserId ?? null,
      nextReviewDate: row.nextReviewDate?.toISOString() ?? null,
      finalizedAt: row.finalizedAt?.toISOString() ?? null,
      finalizedByUserId: row.finalizedByUserId,
      agendaLockedAt: row.agendaLockedAt?.toISOString() ?? null,
      conductClosedAt: row.conductClosedAt?.toISOString() ?? null,
      seriesId: row.seriesId ?? null,
      seriesFrequency,
      uiState,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      participantsCount: row.participants.length,
      attendedCount,
      decisionsCount: row.decisions.length,
      actionItemsCount: row.actionItems.length,
      agendaItemsCount: row.agendaItems.length,
      agendaDoneCount,
      openActionsWithoutOwnerOrDueCount,
      openArbitrationsWithoutVerdictCount,
      incomingEscalationsPendingCount: 0,
      incomingDescentsPendingCount: 0,
    };
  }

  private mapAttachment(
    item: ReviewWithChildren['attachments'][number],
  ) {
    return {
      id: item.id,
      attachmentType: item.attachmentType,
      title: item.title,
      description: item.description,
      url: item.url,
      documentId: item.documentId,
      fileName: item.fileName,
      mimeType: item.mimeType,
      sizeBytes: item.sizeBytes,
      agendaItemId: item.agendaItemId,
      decisionId: item.decisionId,
      actionItemId: item.actionItemId,
      uploadedByUserId: item.uploadedByUserId,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  private mapReviewToDetail(row: ReviewWithChildren) {
    const objectiveFields = this.mapObjectiveResponse(row);
    const base = {
      id: row.id,
      clientId: row.clientId,
      projectId: row.projectId,
      reviewDate: row.reviewDate?.toISOString() ?? null,
      reviewType: row.reviewType,
      status: row.status,
      title: row.title,
      ...objectiveFields,
      periodStart: row.periodStart?.toISOString() ?? null,
      periodEnd: row.periodEnd?.toISOString() ?? null,
      durationMinutes: row.durationMinutes ?? null,
      contentPayload: row.contentPayload,
      meetingMode: row.meetingMode,
      meetingUrl: row.meetingUrl,
      microsoftOnlineMeetingId: row.microsoftOnlineMeetingId ?? null,
      microsoftEventId: row.microsoftEventId ?? null,
      location: row.location,
      startedAt: row.startedAt?.toISOString() ?? null,
      startedByUserId: row.startedByUserId,
      startedByDisplayName: formatProjectReviewUserDisplayName(row.startedBy),
      facilitatorUserId: row.facilitatorUserId,
      createdByUserId: row.createdByUserId ?? null,
      cancelledAt: row.cancelledAt?.toISOString() ?? null,
      cancelledByUserId: row.cancelledByUserId ?? null,
      nextReviewDate: row.nextReviewDate?.toISOString() ?? null,
      finalizedAt: row.finalizedAt?.toISOString() ?? null,
      finalizedByUserId: row.finalizedByUserId,
      agendaLockedAt: row.agendaLockedAt?.toISOString() ?? null,
      agendaLockedByUserId: row.agendaLockedByUserId ?? null,
      conductClosedAt: row.conductClosedAt?.toISOString() ?? null,
      seriesId: row.seriesId ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      participants: row.participants.map((p) => this.mapParticipant(p)),
      agendaItems: row.agendaItems.map((item) => this.mapAgendaItem(item)),
      decisions: row.decisions.map((d) => ({
        id: d.id,
        title: d.title,
        description: d.description,
        agendaItemId: d.agendaItemId,
        decisionType: d.decisionType,
        status: d.status,
        decidedByUserId: d.decidedByUserId,
        decidedAt: d.decidedAt?.toISOString() ?? null,
        impact: d.impact,
        createdAt: d.createdAt.toISOString(),
      })),
      actionItems: row.actionItems.map((a) => this.mapActionItem(a)),
      attachments: (row.attachments ?? []).map((a) => this.mapAttachment(a)),
    };
    return {
      ...base,
      snapshotPayload:
        row.status === 'FINALIZED' || row.status === 'CANCELLED'
          ? row.snapshotPayload
          : null,
    };
  }

  async list(clientId: string, projectId: string) {
    await this.projects.getProjectForScope(clientId, projectId);
    const rows = await this.prisma.projectReview.findMany({
      where: { clientId, projectId },
      include: reviewInclude,
      orderBy: [{ reviewDate: 'desc' }, { createdAt: 'desc' }],
    });
    const pendingByTarget = await this.prisma.projectReviewEscalation.groupBy({
      by: ['targetReviewId'],
      where: {
        clientId,
        projectId,
        status: ProjectReviewEscalationStatus.PENDING,
        targetReviewId: { not: null },
      },
      _count: { _all: true },
    });
    const pendingMap = new Map(
      pendingByTarget
        .filter((row) => row.targetReviewId != null)
        .map((row) => [row.targetReviewId as string, row._count._all]),
    );
    const pendingDescentsByTarget =
      await this.prisma.projectReviewDescent.groupBy({
        by: ['targetReviewId'],
        where: {
          clientId,
          projectId,
          status: ProjectReviewDescentStatus.PENDING,
          targetReviewId: { not: null },
        },
        _count: { _all: true },
      });
    const pendingDescentsMap = new Map(
      pendingDescentsByTarget
        .filter((row) => row.targetReviewId != null)
        .map((row) => [row.targetReviewId as string, row._count._all]),
    );
    return {
      items: rows.map((r: ReviewWithChildren) => {
        const item = this.mapReviewToListItem(r);
        return {
          ...item,
          incomingEscalationsPendingCount: pendingMap.get(r.id) ?? 0,
          incomingDescentsPendingCount: pendingDescentsMap.get(r.id) ?? 0,
        };
      }),
    };
  }

  /**
   * KPI + compteurs par état UI (RFC-PROJ-013-7).
   * Agrégats Prisma — pas de N+1 sur children.
   */
  async summary(clientId: string, projectId: string) {
    await this.projects.getProjectForScope(clientId, projectId);

    const reviews = await this.prisma.projectReview.findMany({
      where: { clientId, projectId },
      select: {
        id: true,
        title: true,
        reviewType: true,
        status: true,
        reviewDate: true,
        startedAt: true,
        agendaLockedAt: true,
        conductClosedAt: true,
      },
    });

    const countsByUiState: Record<ProjectReviewUiState, number> = {
      to_prepare: 0,
      upcoming: 0,
      in_progress: 0,
      to_finalize: 0,
      history: 0,
    };

    type NextCandidate = {
      id: string;
      title: string | null;
      reviewType: ProjectReviewType;
      reviewDate: Date;
      uiState: 'to_prepare' | 'upcoming';
    };
    let nextReview: NextCandidate | null = null;
    const now = new Date();
    const { quarterStart, quarterEnd } = civilQuarterBoundsParis(now);

    let quarterVolume = 0;

    for (const row of reviews) {
      const uiState = resolveReviewUiState({
        status: row.status,
        agendaLockedAt: row.agendaLockedAt,
        conductClosedAt: row.conductClosedAt,
        startedAt: row.startedAt,
      });
      if (uiState) countsByUiState[uiState] += 1;

      if (
        row.reviewDate &&
        row.reviewDate >= quarterStart &&
        row.reviewDate < quarterEnd
      ) {
        quarterVolume += 1;
      }

      if (
        row.reviewDate &&
        row.reviewDate >= now &&
        (uiState === 'to_prepare' || uiState === 'upcoming')
      ) {
        if (!nextReview || row.reviewDate < nextReview.reviewDate) {
          nextReview = {
            id: row.id,
            title: row.title,
            reviewType: row.reviewType,
            reviewDate: row.reviewDate,
            uiState,
          };
        }
      }
    }

    const [openActionsFromReviews, copilDecisionsToApply] = await Promise.all([
      this.prisma.projectReviewActionItem.count({
        where: {
          clientId,
          projectId,
          status: { notIn: ['DONE', 'CANCELLED'] },
        },
      }),
      // RFC-PROJ-013-8 F3.1 — décisions COPIL encore à appliquer (descentes actives).
      this.prisma.projectReviewDescent.count({
        where: {
          clientId,
          projectId,
          status: {
            in: [
              ProjectReviewDescentStatus.PENDING,
              ProjectReviewDescentStatus.INJECTED,
            ],
          },
        },
      }),
    ]);

    return {
      countsByUiState,
      nextReview: nextReview
        ? {
            id: nextReview.id,
            title: nextReview.title,
            reviewType: nextReview.reviewType,
            reviewDate: nextReview.reviewDate.toISOString(),
            uiState: nextReview.uiState,
          }
        : null,
      quarterVolume,
      openActionsFromReviews,
      copilDecisionsToApply,
    };
  }

  async lockAgenda(
    clientId: string,
    projectId: string,
    reviewId: string,
    context?: AuditContext,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    const review = await this.prisma.projectReview.findFirst({
      where: { id: reviewId, clientId, projectId },
      include: { agendaItems: { select: { id: true } } },
    });
    if (!review) throw new NotFoundException('Review not found');

    const normalized = normalizeReviewStatus(review.status, review.startedAt);
    if (
      normalized !== ProjectReviewStatus.PREPARING &&
      normalized !== ProjectReviewStatus.SCHEDULED
    ) {
      throw new BadRequestException(
        'L’ordre du jour ne peut être figé qu’en préparation ou planifié',
      );
    }
    if (review.agendaLockedAt) {
      throw new BadRequestException('L’ordre du jour est déjà figé');
    }
    if (review.agendaItems.length < 1) {
      throw new BadRequestException(
        'Ajoutez au moins un point à l’ordre du jour avant de le figer',
      );
    }

    const updated = await this.prisma.projectReview.update({
      where: { id: reviewId },
      data: {
        agendaLockedAt: new Date(),
        agendaLockedByUserId: context?.actorUserId ?? null,
      },
      include: reviewInclude,
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_AGENDA_LOCKED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW,
      resourceId: reviewId,
      newValue: { projectId, reviewId },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return this.mapReviewToDetail(updated);
  }

  async unlockAgenda(
    clientId: string,
    projectId: string,
    reviewId: string,
    context?: AuditContext,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    const review = await this.prisma.projectReview.findFirst({
      where: { id: reviewId, clientId, projectId },
    });
    if (!review) throw new NotFoundException('Review not found');

    const normalized = normalizeReviewStatus(review.status, review.startedAt);
    if (
      normalized !== ProjectReviewStatus.PREPARING &&
      normalized !== ProjectReviewStatus.SCHEDULED
    ) {
      throw new BadRequestException(
        'L’ordre du jour ne peut être réouvert que hors conduite / finalisation',
      );
    }
    if (!review.agendaLockedAt) {
      throw new BadRequestException('L’ordre du jour n’est pas figé');
    }

    const updated = await this.prisma.projectReview.update({
      where: { id: reviewId },
      data: {
        agendaLockedAt: null,
        agendaLockedByUserId: null,
      },
      include: reviewInclude,
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_AGENDA_UNLOCKED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW,
      resourceId: reviewId,
      newValue: { projectId, reviewId },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return this.mapReviewToDetail(updated);
  }

  async getById(clientId: string, projectId: string, reviewId: string) {
    await this.projects.getProjectForScope(clientId, projectId);
    const row = await this.prisma.projectReview.findFirst({
      where: { id: reviewId, clientId, projectId },
      include: reviewInclude,
    });
    if (!row) throw new NotFoundException('Review not found');
    return this.mapReviewToDetail(row);
  }

  async create(
    clientId: string,
    projectId: string,
    dto: CreateProjectReviewDto,
    context?: AuditContext,
  ) {
    const project = await this.projects.getProjectForScope(clientId, projectId);
    this.assertReviewTypeForProjectCreate(project.status, dto.reviewType);

    const creationMode = dto.creationMode ?? 'PREPARING';
    if (
      dto.reviewType === ProjectReviewType.POST_MORTEM &&
      (creationMode === 'SCHEDULED' || creationMode === 'PLANNED')
    ) {
      throw new BadRequestException(
        "Un retour d'expérience ne peut pas être planifié : créez-le en mode immédiat.",
      );
    }

    if (
      (creationMode === 'SCHEDULED' || creationMode === 'PLANNED') &&
      (dto.reviewDate == null || dto.reviewDate === '')
    ) {
      throw new BadRequestException(
        'La date de revue est obligatoire pour un point planifié.',
      );
    }

    if (
      dto.reviewType === ProjectReviewType.POST_MORTEM &&
      dto.nextReviewDate != null &&
      dto.nextReviewDate !== ''
    ) {
      throw new BadRequestException(
        "Un retour d'expérience ne peut pas planifier de prochain point.",
      );
    }
    await this.validateFacilitator(clientId, dto.facilitatorUserId);
    await this.validateParticipantUsers(clientId, dto.participants ?? []);
    await this.validateLinkedTasks(clientId, projectId, dto.actionItems ?? []);
    await this.validateActionItemUsers(clientId, dto.actionItems);

    const reviewStatus = resolveCreationStatus(creationMode);
    this.assertActionItemsResponsibleInReview(reviewStatus, dto.actionItems);
    const meeting = this.resolveMeetingFields(dto);

    const reviewDate = dto.reviewDate ? new Date(dto.reviewDate) : null;
    const periodStart = dto.periodStart ? new Date(dto.periodStart) : null;
    const periodEnd = dto.periodEnd ? new Date(dto.periodEnd) : null;
    const objectiveText = this.resolveObjectiveText(dto);
    const isImmediate = creationMode === 'IMMEDIATE';
    const startedAt = isImmediate ? new Date() : null;
    const nextReviewDate = dto.nextReviewDate
      ? new Date(dto.nextReviewDate)
      : null;

    const created = await this.prisma.projectReview.create({
      data: {
        clientId,
        projectId,
        reviewDate,
        reviewType: dto.reviewType,
        status: reviewStatus,
        title: dto.title?.trim() ?? null,
        objective: objectiveText,
        executiveSummary: objectiveText,
        periodStart,
        periodEnd,
        durationMinutes: dto.durationMinutes ?? null,
        startedAt,
        startedByUserId: isImmediate ? (context?.actorUserId ?? null) : null,
        createdByUserId: context?.actorUserId ?? null,
        meetingMode: meeting.meetingMode,
        meetingUrl: meeting.meetingUrl,
        location: meeting.location,
        ...(dto.contentPayload !== undefined && dto.contentPayload !== null
          ? {
              contentPayload: dto.contentPayload as Prisma.InputJsonValue,
            }
          : {}),
        facilitatorUserId: dto.facilitatorUserId ?? null,
        nextReviewDate,
        participants: dto.participants?.length
          ? {
              create: dto.participants.map((p) => ({
                clientId,
                userId: p.userId ?? null,
                displayName: p.displayName?.trim() ?? null,
                attended: p.attended ?? true,
                isRequired: p.isRequired ?? false,
              })),
            }
          : undefined,
        decisions: dto.decisions?.length
          ? {
              create: dto.decisions.map((d) =>
                this.buildDecisionCreateData(clientId, reviewStatus, d),
              ),
            }
          : undefined,
        actionItems: dto.actionItems?.length
          ? {
              create: dto.actionItems.map((a) => ({
                clientId,
                projectId,
                title: a.title.trim(),
                description: a.description?.trim() ?? null,
                status: a.status,
                priority: a.priority ?? null,
                dueDate: a.dueDate ? new Date(a.dueDate) : null,
                linkedTaskId: a.linkedTaskId ?? null,
                responsibleUserId: a.responsibleUserId ?? null,
                agendaItemId: a.agendaItemId ?? null,
                decisionId: a.decisionId ?? null,
                contributors: a.contributors?.length
                  ? {
                      create: a.contributors.map((c) => ({
                        clientId,
                        userId: c.userId ?? null,
                        displayName: c.displayName?.trim() ?? null,
                        roleLabel: c.roleLabel?.trim() ?? null,
                        contributionStatus: c.contributionStatus ?? null,
                      })),
                    }
                  : undefined,
              })),
            }
          : undefined,
      },
      include: reviewInclude,
    });

    const meta = {
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };
    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_CREATED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW,
      resourceId: created.id,
      newValue: {
        projectId,
        reviewType: created.reviewType,
        status: created.status,
      },
      ...meta,
    });

    const detail = this.mapReviewToDetail(created);

    const shouldAutoInvite =
      (created.status === ProjectReviewStatus.SCHEDULED ||
        created.status === ProjectReviewStatus.PLANNED) &&
      dto.autoInviteOnCreate !== false &&
      (created.participants ?? []).some((p) => p.userId != null);
    if (shouldAutoInvite) {
      await this.tryAutoInvite(
        clientId,
        projectId,
        created.id,
        context,
        'auto_create',
      );
      return this.getById(clientId, projectId, created.id);
    }

    return detail;
  }

  private async updatePlanningReview(
    clientId: string,
    projectId: string,
    reviewId: string,
    dto: UpdateProjectReviewDto,
    existing: ReviewWithChildren,
    context?: AuditContext,
  ) {
    assertScheduledUpdatePayloadAllowed(dto as Record<string, unknown>);

    if (dto.facilitatorUserId !== undefined) {
      await this.validateFacilitator(clientId, dto.facilitatorUserId);
    }

    const effectiveMeetingMode =
      dto.meetingMode !== undefined ? dto.meetingMode : existing.meetingMode;
    const effectiveMeetingUrl =
      dto.meetingUrl !== undefined ? dto.meetingUrl : existing.meetingUrl;
    const effectiveLocation =
      dto.location !== undefined ? dto.location : existing.location;
    if (
      dto.meetingMode !== undefined ||
      dto.meetingUrl !== undefined ||
      dto.location !== undefined
    ) {
      this.resolveMeetingFields({
        meetingMode: effectiveMeetingMode,
        meetingUrl: effectiveMeetingUrl,
        location: effectiveLocation,
      });
    }

    const previousReviewDate = existing.reviewDate;
    const data: Prisma.ProjectReviewUncheckedUpdateInput = {};
    if (dto.reviewDate !== undefined) {
      data.reviewDate = dto.reviewDate ? new Date(dto.reviewDate) : null;
    }
    if (dto.periodStart !== undefined) {
      data.periodStart = dto.periodStart ? new Date(dto.periodStart) : null;
    }
    if (dto.periodEnd !== undefined) {
      data.periodEnd = dto.periodEnd ? new Date(dto.periodEnd) : null;
    }
    if (dto.durationMinutes !== undefined) {
      data.durationMinutes = dto.durationMinutes ?? null;
    }
    if (dto.title !== undefined) data.title = dto.title?.trim() ?? null;
    if (dto.facilitatorUserId !== undefined) {
      data.facilitatorUserId = dto.facilitatorUserId ?? null;
    }
    if (dto.meetingMode !== undefined) {
      data.meetingMode = dto.meetingMode ?? null;
    }
    if (dto.meetingUrl !== undefined) {
      data.meetingUrl = dto.meetingUrl?.trim() ?? null;
    }
    if (dto.location !== undefined) {
      data.location = dto.location?.trim() ?? null;
    }

    if (Object.keys(data).length > 0) {
      await this.prisma.projectReview.update({
        where: { id: reviewId },
        data,
      });
    }

    const updated = await this.prisma.projectReview.findFirstOrThrow({
      where: { id: reviewId, clientId, projectId },
      include: reviewInclude,
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_UPDATED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW,
      resourceId: updated.id,
      newValue: { projectId, status: updated.status },
      ...this.auditMeta(context),
    });

    const reviewDateChanged =
      dto.reviewDate !== undefined &&
      !this.reviewDatesEqualSecond(previousReviewDate, updated.reviewDate);
    if (reviewDateChanged) {
      await this.tryAutoInvite(
        clientId,
        projectId,
        reviewId,
        context,
        'auto_date_change',
      );
      return this.getById(clientId, projectId, reviewId);
    }

    return this.mapReviewToDetail(updated);
  }

  async update(
    clientId: string,
    projectId: string,
    reviewId: string,
    dto: UpdateProjectReviewDto,
    context?: AuditContext,
  ) {
    const project = await this.projects.getProjectForScope(clientId, projectId);
    const existing = await this.prisma.projectReview.findFirst({
      where: { id: reviewId, clientId, projectId },
      include: reviewInclude,
    });
    if (!existing) throw new NotFoundException('Review not found');
    if (!isReviewUpdateAllowed(existing.status)) {
      throw new BadRequestException('Only editable reviews can be updated');
    }

    if (isReviewPlanningEditable(existing.status)) {
      return this.updatePlanningReview(
        clientId,
        projectId,
        reviewId,
        dto,
        existing,
        context,
      );
    }

    if (!isReviewContentEditable(existing.status)) {
      throw new BadRequestException('Only editable reviews can be updated');
    }

    this.assertReviewTypeForProjectUpdate(project.status, existing.reviewType, dto);

    if (dto.actionItems !== undefined) {
      this.assertActionItemsResponsibleInReview(
        existing.status,
        dto.actionItems,
      );
      await this.validateActionItemUsers(clientId, dto.actionItems);
    }

    const effectiveMeetingMode =
      dto.meetingMode !== undefined ? dto.meetingMode : existing.meetingMode;
    const effectiveMeetingUrl =
      dto.meetingUrl !== undefined ? dto.meetingUrl : existing.meetingUrl;
    const effectiveLocation =
      dto.location !== undefined ? dto.location : existing.location;
    if (
      dto.meetingMode !== undefined ||
      dto.meetingUrl !== undefined ||
      dto.location !== undefined
    ) {
      this.resolveMeetingFields({
        meetingMode: effectiveMeetingMode,
        meetingUrl: effectiveMeetingUrl,
        location: effectiveLocation,
      });
    }

    const effectiveReviewType =
      dto.reviewType !== undefined ? dto.reviewType : existing.reviewType;
    if (
      effectiveReviewType === ProjectReviewType.POST_MORTEM &&
      dto.nextReviewDate !== undefined &&
      dto.nextReviewDate !== null
    ) {
      throw new BadRequestException(
        "Un retour d'expérience ne peut pas planifier de prochain point.",
      );
    }

    if (dto.facilitatorUserId !== undefined) {
      await this.validateFacilitator(clientId, dto.facilitatorUserId);
    }
    if (dto.participants !== undefined) {
      await this.validateParticipantUsers(clientId, dto.participants);
    }
    if (dto.actionItems !== undefined) {
      await this.validateLinkedTasks(clientId, projectId, dto.actionItems);
    }

    if (dto.nextReviewDate !== undefined && dto.nextReviewDate !== null) {
      const nextAt = new Date(dto.nextReviewDate);
      const effectiveReviewDate =
        dto.reviewDate !== undefined
          ? dto.reviewDate
            ? new Date(dto.reviewDate)
            : null
          : existing.reviewDate;
      if (
        effectiveReviewDate == null ||
        nextAt.getTime() !== effectiveReviewDate.getTime()
      ) {
        const participantsForSpawn = this.resolveParticipantsForSpawn(dto, existing);
        await this.validateParticipantUsers(clientId, participantsForSpawn);
      }
    }

    const data: Prisma.ProjectReviewUncheckedUpdateInput = {};
    if (dto.reviewDate !== undefined) {
      data.reviewDate = dto.reviewDate ? new Date(dto.reviewDate) : null;
    }
    if (dto.reviewType !== undefined) data.reviewType = dto.reviewType;
    if (dto.title !== undefined) data.title = dto.title?.trim() ?? null;
    if (dto.objective !== undefined || dto.executiveSummary !== undefined) {
      const objectiveText = this.resolveObjectiveText(dto);
      data.objective = objectiveText;
      data.executiveSummary = objectiveText;
    }
    if (dto.periodStart !== undefined) {
      data.periodStart = dto.periodStart ? new Date(dto.periodStart) : null;
    }
    if (dto.periodEnd !== undefined) {
      data.periodEnd = dto.periodEnd ? new Date(dto.periodEnd) : null;
    }
    if (dto.durationMinutes !== undefined) {
      data.durationMinutes = dto.durationMinutes ?? null;
    }
    if (dto.contentPayload !== undefined) {
      data.contentPayload =
        dto.contentPayload === null
          ? Prisma.JsonNull
          : (dto.contentPayload as Prisma.InputJsonValue);
    }
    if (dto.facilitatorUserId !== undefined) {
      data.facilitatorUserId = dto.facilitatorUserId ?? null;
    }
    if (dto.nextReviewDate !== undefined) {
      data.nextReviewDate = dto.nextReviewDate
        ? new Date(dto.nextReviewDate)
        : null;
    }
    if (dto.meetingMode !== undefined) {
      data.meetingMode = dto.meetingMode ?? null;
    }
    if (dto.meetingUrl !== undefined) {
      data.meetingUrl = dto.meetingUrl?.trim() ?? null;
    }
    if (dto.location !== undefined) {
      data.location = dto.location?.trim() ?? null;
    }

    const { row: updated, spawnedReviewId } = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        if (Object.keys(data).length > 0) {
          await tx.projectReview.update({
            where: { id: reviewId },
            data,
          });
        }

        if (dto.participants !== undefined) {
          await tx.projectReviewParticipant.deleteMany({
            where: { projectReviewId: reviewId, clientId },
          });
          if (dto.participants.length > 0) {
            await tx.projectReviewParticipant.createMany({
              data: dto.participants.map((p) => ({
                clientId,
                projectReviewId: reviewId,
                userId: p.userId ?? null,
                displayName: p.displayName?.trim() ?? null,
                attended: p.attended ?? true,
                isRequired: p.isRequired ?? false,
              })),
            });
          }
        }

        if (dto.decisions !== undefined) {
          await tx.projectReviewDecision.deleteMany({
            where: { projectReviewId: reviewId, clientId },
          });
          if (dto.decisions.length > 0) {
            await tx.projectReviewDecision.createMany({
              data: dto.decisions.map((d) => ({
                ...this.buildDecisionCreateData(clientId, existing.status, d),
                projectReviewId: reviewId,
              })),
            });
          }
        }

        if (dto.actionItems !== undefined) {
          await tx.projectReviewActionItemContributor.deleteMany({
            where: {
              actionItem: { projectReviewId: reviewId, clientId },
            },
          });
          await tx.projectReviewActionItem.deleteMany({
            where: { projectReviewId: reviewId, clientId },
          });
          if (dto.actionItems.length > 0) {
            for (const a of dto.actionItems) {
              await tx.projectReviewActionItem.create({
                data: {
                  clientId,
                  projectReviewId: reviewId,
                  projectId,
                  title: a.title.trim(),
                  description: a.description?.trim() ?? null,
                  status: a.status,
                  priority: a.priority ?? null,
                  dueDate: a.dueDate ? new Date(a.dueDate) : null,
                  linkedTaskId: a.linkedTaskId ?? null,
                  responsibleUserId: a.responsibleUserId ?? null,
                  agendaItemId: a.agendaItemId ?? null,
                  decisionId: a.decisionId ?? null,
                  contributors: a.contributors?.length
                    ? {
                        create: a.contributors.map((c) => ({
                          clientId,
                          userId: c.userId ?? null,
                          displayName: c.displayName?.trim() ?? null,
                          roleLabel: c.roleLabel?.trim() ?? null,
                          contributionStatus: c.contributionStatus ?? null,
                        })),
                      }
                    : undefined,
                },
              });
            }
          }
        }

        let spawnedReviewId: string | null = null;
        const typeAfterPatch =
          dto.reviewType !== undefined ? dto.reviewType : existing.reviewType;
        if (
          dto.nextReviewDate !== undefined &&
          dto.nextReviewDate !== null &&
          typeAfterPatch !== ProjectReviewType.POST_MORTEM
        ) {
          const nextAt = new Date(dto.nextReviewDate);
          const effectiveReviewDate =
            dto.reviewDate !== undefined
              ? dto.reviewDate
                ? new Date(dto.reviewDate)
                : null
              : existing.reviewDate;
          if (
            effectiveReviewDate == null ||
            nextAt.getTime() !== effectiveReviewDate.getTime()
          ) {
            const participantsForSpawn = this.resolveParticipantsForSpawn(dto, existing);
            spawnedReviewId = await this.upsertSpawnedNextReview(tx, {
              clientId,
              projectId,
              currentReviewId: reviewId,
              nextReviewDate: nextAt,
              reviewType: dto.reviewType ?? existing.reviewType,
              facilitatorUserId:
                dto.facilitatorUserId !== undefined
                  ? dto.facilitatorUserId
                  : existing.facilitatorUserId,
              participants: participantsForSpawn,
            });
          }
        }

        const row = await tx.projectReview.findFirstOrThrow({
          where: { id: reviewId, clientId, projectId },
          include: reviewInclude,
        });
        return { row, spawnedReviewId };
      },
    );

    const meta = {
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };
    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_UPDATED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW,
      resourceId: updated.id,
      newValue: { projectId, status: updated.status },
      ...meta,
    });

    if (spawnedReviewId) {
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_CREATED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW,
        resourceId: spawnedReviewId,
        newValue: {
          projectId,
          reviewType: dto.reviewType ?? existing.reviewType,
          status: ProjectReviewStatus.SCHEDULED,
        },
        ...meta,
      });
    }

    return this.mapReviewToDetail(updated);
  }

  private async loadSnapshotContext(
    tx: Prisma.TransactionClient,
    clientId: string,
    projectId: string,
  ) {
    const project = await tx.project.findFirst({
      where: { id: projectId, clientId },
    });
    if (!project) throw new NotFoundException('Project not found');

    const [tasks, risks, milestones, budgetLinks] = await Promise.all([
      tx.projectTask.findMany({ where: { clientId, projectId } }),
      tx.projectRisk.findMany({ where: { clientId, projectId } }),
      tx.projectMilestone.findMany({ where: { clientId, projectId } }),
      tx.projectBudgetLink.findMany({
        where: { clientId, projectId },
        include: {
          budgetLine: { select: { id: true, code: true, name: true } },
        },
      }),
    ]);

    return { project, tasks, risks, milestones, budgetLinks };
  }

  private buildSnapshotConductData(
    review: ReviewWithChildren,
  ): {
    meeting: { meetingMode: ReviewWithChildren['meetingMode']; location: string | null };
    participants: Array<{
      userId: string | null;
      displayName: string | null;
      roleLabel: string | null;
      attendanceStatus: ReviewWithChildren['participants'][number]['attendanceStatus'];
    }>;
    agenda: ProjectReviewSnapshotAgendaItem[];
  } {
    const participants = review.participants.map((p) => ({
      userId: p.userId,
      displayName: p.displayName ?? formatProjectReviewUserDisplayName(p.user),
      roleLabel: p.roleLabel,
      attendanceStatus: p.attendanceStatus,
    }));

    const agenda: ProjectReviewSnapshotAgendaItem[] = review.agendaItems.map(
      (item) => ({
        id: item.id,
        title: item.title,
        orderIndex: item.orderIndex,
        status: item.status,
        notes: item.notes,
        decisionSummary: item.decisionSummary,
        decisions: review.decisions
          .filter((d) => d.agendaItemId === item.id)
          .map((d) => ({
            id: d.id,
            title: d.title,
            description: d.description,
            decisionType: d.decisionType,
            status: d.status,
            impact: d.impact,
          })),
        actionItems: review.actionItems
          .filter((a) => a.agendaItemId === item.id)
          .map((a) => ({
            id: a.id,
            title: a.title,
            status: a.status,
            dueDate: a.dueDate?.toISOString() ?? null,
            priority: a.priority,
            responsibleUserId: a.responsibleUserId,
            responsibleDisplayName: formatProjectReviewUserDisplayName(
              a.responsibleUser,
            ),
            contributors: a.contributors.map((c) => ({
              userId: c.userId,
              displayName:
                c.displayName ?? formatProjectReviewUserDisplayName(c.user),
              roleLabel: c.roleLabel,
            })),
          })),
      }),
    );

    return {
      meeting: {
        meetingMode: review.meetingMode,
        location: review.location,
      },
      participants,
      agenda,
    };
  }

  async schedule(
    clientId: string,
    projectId: string,
    reviewId: string,
    dto: ScheduleProjectReviewDto,
    context?: AuditContext,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);

    const existing = await this.prisma.projectReview.findFirst({
      where: { id: reviewId, clientId, projectId },
    });
    if (!existing) throw new NotFoundException('Review not found');

    const normalized = normalizeReviewStatus(
      existing.status,
      existing.startedAt,
    );
    if (
      normalized !== ProjectReviewStatus.PREPARING &&
      normalized !== ProjectReviewStatus.SCHEDULED
    ) {
      throw new BadRequestException(
        'Seule une revue en préparation ou planifiée peut être (re)planifiée.',
      );
    }

    const reviewDate = new Date(dto.reviewDate);
    const previousReviewDate = existing.reviewDate;
    const updated = await this.prisma.projectReview.update({
      where: { id: reviewId },
      data: {
        status: ProjectReviewStatus.SCHEDULED,
        reviewDate,
      },
      include: reviewInclude,
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_UPDATED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW,
      resourceId: updated.id,
      newValue: {
        projectId,
        previousStatus: existing.status,
        newStatus: ProjectReviewStatus.SCHEDULED,
        reviewDate: reviewDate.toISOString(),
      },
      ...this.auditMeta(context),
    });

    const reviewDateChanged = !this.reviewDatesEqualSecond(
      previousReviewDate,
      updated.reviewDate,
    );
    if (reviewDateChanged) {
      await this.tryAutoInvite(
        clientId,
        projectId,
        reviewId,
        context,
        'auto_date_change',
      );
      return this.getById(clientId, projectId, reviewId);
    }

    return this.mapReviewToDetail(updated);
  }

  async start(
    clientId: string,
    projectId: string,
    reviewId: string,
    context?: AuditContext,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);

    const existing = await this.prisma.projectReview.findFirst({
      where: { id: reviewId, clientId, projectId },
    });
    if (!existing) throw new NotFoundException('Review not found');

    if (
      existing.status === ProjectReviewStatus.IN_PROGRESS ||
      existing.status === ProjectReviewStatus.IN_REVIEW
    ) {
      throw new BadRequestException('La revue est déjà en cours.');
    }

    const normalized = normalizeReviewStatus(
      existing.status,
      existing.startedAt,
    );
    if (
      normalized !== ProjectReviewStatus.SCHEDULED &&
      normalized !== ProjectReviewStatus.PREPARING
    ) {
      throw new BadRequestException(
        'Seule une revue en préparation ou planifiée peut être démarrée.',
      );
    }

    const startedAt = new Date();
    const updated = await this.prisma.projectReview.update({
      where: { id: reviewId },
      data: {
        status: ProjectReviewStatus.IN_PROGRESS,
        startedAt,
        startedByUserId: context?.actorUserId ?? null,
      },
      include: reviewInclude,
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_STARTED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW,
      resourceId: updated.id,
      newValue: {
        reviewId: updated.id,
        projectId,
        previousStatus: existing.status,
        newStatus: ProjectReviewStatus.IN_PROGRESS,
        startedByUserId: context?.actorUserId ?? null,
        startedAt: startedAt.toISOString(),
      },
      ...this.auditMeta(context),
    });

    return this.mapReviewToDetail(updated);
  }

  /** Alias rétrocompat — délègue à {@link start}. */
  async startReview(
    clientId: string,
    projectId: string,
    reviewId: string,
    context?: AuditContext,
  ) {
    return this.start(clientId, projectId, reviewId, context);
  }

  /**
   * RFC-PROJ-013-6 — clôture de conduite → état UI « À finaliser ».
   * Status reste IN_PROGRESS ; seul `conductClosedAt` est posé.
   */
  async closeConduct(
    clientId: string,
    projectId: string,
    reviewId: string,
    context?: AuditContext,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    const review = await this.prisma.projectReview.findFirst({
      where: { id: reviewId, clientId, projectId },
    });
    if (!review) throw new NotFoundException('Review not found');

    const normalized = normalizeReviewStatus(review.status, review.startedAt);
    if (
      normalized !== ProjectReviewStatus.IN_PROGRESS &&
      review.status !== ProjectReviewStatus.IN_REVIEW
    ) {
      throw new BadRequestException(
        'La conduite ne peut être clôturée que sur un point en cours',
      );
    }
    if (review.conductClosedAt) {
      throw new BadRequestException('La conduite est déjà clôturée');
    }

    const updated = await this.prisma.projectReview.update({
      where: { id: reviewId },
      data: { conductClosedAt: new Date() },
      include: reviewInclude,
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_CONDUCT_CLOSED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW,
      resourceId: reviewId,
      newValue: { projectId, reviewId },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return this.mapReviewToDetail(updated);
  }

  async finalize(
    clientId: string,
    projectId: string,
    reviewId: string,
    context?: AuditContext,
    dto?: FinalizeProjectReviewDto,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);

    const pushActions = dto?.pushActionsToTasks === true;
    const promoteRisks = dto?.promoteRiskNotes === true;

    const {
      finalized,
      actionsPush,
      risksPromote,
    } = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      let review = await tx.projectReview.findFirst({
        where: { id: reviewId, clientId, projectId },
        include: reviewInclude,
      });
      if (!review) throw new NotFoundException('Review not found');
      const normalized = normalizeReviewStatus(review.status, review.startedAt);
      if (
        normalized === ProjectReviewStatus.PREPARING ||
        normalized === ProjectReviewStatus.SCHEDULED
      ) {
        throw new BadRequestException('Démarrez d’abord la revue.');
      }
      if (
        normalized !== ProjectReviewStatus.IN_PROGRESS &&
        review.status !== ProjectReviewStatus.IN_REVIEW &&
        review.status !== ProjectReviewStatus.DRAFT
      ) {
        throw new BadRequestException('Only editable reviews can be finalized');
      }

      // RFC-PROJ-013-6 — pilotage : exiger close-conduct ; REX (POST_MORTEM) exempté.
      if (
        review.reviewType !== ProjectReviewType.POST_MORTEM &&
        !review.conductClosedAt
      ) {
        throw new BadRequestException(
          'Clôturez d’abord la conduite (Clôturer & générer le CR).',
        );
      }

      let actionsPushResult: ActionsPushResult | null = null;
      let risksPromoteResult: RisksPromoteResult | null = null;

      // RFC-PROJ-013-8 — side-effects opt-in (ignorés pour REX).
      if (review.reviewType !== ProjectReviewType.POST_MORTEM) {
        if (pushActions) {
          actionsPushResult = await this.pushActionsToTasksInTx(
            tx,
            clientId,
            projectId,
            review.actionItems,
          );
        }
        if (promoteRisks) {
          risksPromoteResult = await this.promoteRiskNotesInTx(
            tx,
            clientId,
            projectId,
            review.agendaItems,
          );
        }
        if (pushActions || promoteRisks) {
          const reloaded = await tx.projectReview.findFirst({
            where: { id: reviewId, clientId, projectId },
            include: reviewInclude,
          });
          if (!reloaded) throw new NotFoundException('Review not found');
          review = reloaded;
        }
      }

      const snapshot = await this.buildEphemeralReportSnapshot(
        clientId,
        projectId,
        review,
        tx,
      );

      const row = await tx.projectReview.update({
        where: { id: reviewId },
        data: {
          status: ProjectReviewStatus.FINALIZED,
          finalizedAt: new Date(),
          finalizedByUserId: context?.actorUserId ?? null,
          snapshotPayload: snapshot,
        },
        include: reviewInclude,
      });

      return {
        finalized: row,
        actionsPush: actionsPushResult,
        risksPromote: risksPromoteResult,
      };
    });

    const meta = {
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };
    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_FINALIZED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW,
      resourceId: finalized.id,
      newValue: { projectId, status: finalized.status },
      ...meta,
    });

    if (actionsPush && actionsPush.created > 0) {
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_ACTIONS_PUSHED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW,
        resourceId: reviewId,
        newValue: {
          projectId,
          reviewId,
          created: actionsPush.created,
          skippedLinked: actionsPush.skippedLinked,
        },
        ...meta,
      });
    }

    if (
      risksPromote &&
      (risksPromote.created > 0 || risksPromote.skippedNoRiskType)
    ) {
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_RISKS_PROMOTED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW,
        resourceId: reviewId,
        newValue: {
          projectId,
          reviewId,
          created: risksPromote.created,
          skippedDuplicate: risksPromote.skippedDuplicate,
          ...(risksPromote.skippedNoRiskType
            ? { skippedNoRiskType: true }
            : {}),
        },
        ...meta,
      });
    }

    // RFC-PROJ-013-8 F3.1 — descentes COPIL → COPRO pour décisions VALIDATED
    if (finalized.reviewType === ProjectReviewType.COPIL) {
      const descentCounts = await this.createDescentsFromFinalizedCopil(
        clientId,
        projectId,
        finalized,
        context,
      );
      if (descentCounts.created > 0) {
        await this.auditLogs.create({
          clientId,
          userId: context?.actorUserId,
          action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_DESCENT_CREATED,
          resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW,
          resourceId: reviewId,
          newValue: {
            projectId,
            reviewId,
            created: descentCounts.created,
            injected: descentCounts.injected,
            skippedExisting: descentCounts.skippedExisting,
          },
          ...meta,
        });
      }
      if (descentCounts.injected > 0) {
        await this.auditLogs.create({
          clientId,
          userId: context?.actorUserId,
          action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_DESCENT_INJECTED,
          resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW,
          resourceId: reviewId,
          newValue: {
            projectId,
            reviewId,
            count: descentCounts.injected,
          },
          ...meta,
        });
      }
    }

    return this.mapReviewToDetail(finalized);
  }

  private async pushActionsToTasksInTx(
    tx: Prisma.TransactionClient,
    clientId: string,
    projectId: string,
    actionItems: Array<{
      id: string;
      title: string;
      description: string | null;
      status: ProjectTaskStatus;
      priority: ProjectTaskPriority | null;
      dueDate: Date | null;
      linkedTaskId: string | null;
      responsibleUserId: string | null;
    }>,
  ): Promise<ActionsPushResult> {
    const eligible = actionsEligibleForTaskPush(actionItems);
    const skippedLinked = actionItems.filter(
      (a) =>
        a.linkedTaskId &&
        a.title?.trim() &&
        a.status !== ProjectTaskStatus.DONE &&
        a.status !== ProjectTaskStatus.CANCELLED,
    ).length;
    let created = 0;
    for (const action of eligible) {
      const task = await tx.projectTask.create({
        data: {
          clientId,
          projectId,
          name: action.title.trim(),
          description: action.description?.trim() || null,
          status: ProjectTaskStatus.TODO,
          priority: action.priority ?? ProjectTaskPriority.MEDIUM,
          plannedEndDate: action.dueDate,
          ownerUserId: action.responsibleUserId,
        },
      });
      await tx.projectReviewActionItem.update({
        where: { id: action.id },
        data: { linkedTaskId: task.id },
      });
      created += 1;
    }
    return { created, skippedLinked };
  }

  private async promoteRiskNotesInTx(
    tx: Prisma.TransactionClient,
    clientId: string,
    projectId: string,
    agendaItems: Array<{ notes: string | null }>,
  ): Promise<RisksPromoteResult> {
    const titles: string[] = [];
    const seen = new Set<string>();
    for (const item of agendaItems) {
      for (const title of extractRiskNoteTitles(item.notes)) {
        const key = title.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        titles.push(title);
      }
    }
    if (titles.length === 0) {
      return { created: 0, skippedDuplicate: 0, skippedNoRiskType: false };
    }

    const riskType = await tx.riskType.findFirst({
      where: { clientId, isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (!riskType) {
      return { created: 0, skippedDuplicate: 0, skippedNoRiskType: true };
    }

    const existingRisks = await tx.projectRisk.findMany({
      where: {
        clientId,
        projectId,
        status: { not: 'CLOSED' },
      },
      select: { title: true, code: true },
    });
    const existingTitles = existingRisks.map((r) => r.title);
    let codes = existingRisks.map((r) => r.code);
    let created = 0;
    let skippedDuplicate = 0;
    const { criticalityScore, criticalityLevel } =
      applyCriticalityFromProbabilityImpact(
        PROMOTED_RISK_DEFAULTS.probability,
        PROMOTED_RISK_DEFAULTS.impact,
      );

    for (const title of titles) {
      if (isDuplicateRiskTitle(existingTitles, title)) {
        skippedDuplicate += 1;
        continue;
      }
      const code = nextRiskCodeFromExisting(codes);
      codes = [...codes, code];
      await tx.projectRisk.create({
        data: {
          clientId,
          projectId,
          riskTypeId: riskType.id,
          code,
          title,
          description: PROMOTED_RISK_DEFAULTS.description,
          fearedEvent: PROMOTED_RISK_DEFAULTS.fearedEvent,
          threatSource: PROMOTED_RISK_DEFAULTS.threatSource,
          businessImpact: PROMOTED_RISK_DEFAULTS.businessImpact,
          probability: PROMOTED_RISK_DEFAULTS.probability,
          impact: PROMOTED_RISK_DEFAULTS.impact,
          criticalityScore,
          criticalityLevel,
          status: PROMOTED_RISK_DEFAULTS.status,
          treatmentStrategy: ProjectRiskTreatmentStrategy.REDUCE,
        },
      });
      existingTitles.push(title);
      created += 1;
    }

    return { created, skippedDuplicate, skippedNoRiskType: false };
  }

  async cancel(
    clientId: string,
    projectId: string,
    reviewId: string,
    context?: AuditContext,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    const existing = await this.prisma.projectReview.findFirst({
      where: { id: reviewId, clientId, projectId },
    });
    if (!existing) throw new NotFoundException('Review not found');
    if (existing.status === ProjectReviewStatus.FINALIZED) {
      throw new BadRequestException('Cannot cancel a finalized review');
    }
    if (existing.status === ProjectReviewStatus.CANCELLED) {
      throw new BadRequestException('Review already cancelled');
    }

    const updated = await this.prisma.projectReview.update({
      where: { id: reviewId },
      data: {
        status: ProjectReviewStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledByUserId: context?.actorUserId ?? null,
      },
      include: reviewInclude,
    });

    const meta = {
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };
    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_CANCELLED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW,
      resourceId: updated.id,
      newValue: { projectId, status: updated.status },
      ...meta,
    });

    return this.mapReviewToDetail(updated);
  }

  /**
   * Réouvre un point annulé : CANCELLED → SCHEDULED (si une date est fixée)
   * ou PREPARING (sinon). Efface les marqueurs d'annulation.
   */
  async reopen(
    clientId: string,
    projectId: string,
    reviewId: string,
    context?: AuditContext,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    const existing = await this.prisma.projectReview.findFirst({
      where: { id: reviewId, clientId, projectId },
    });
    if (!existing) throw new NotFoundException('Review not found');
    if (existing.status !== ProjectReviewStatus.CANCELLED) {
      throw new BadRequestException('Only cancelled reviews can be reopened');
    }

    const nextStatus = existing.reviewDate
      ? ProjectReviewStatus.SCHEDULED
      : ProjectReviewStatus.PREPARING;

    const updated = await this.prisma.projectReview.update({
      where: { id: reviewId },
      data: {
        status: nextStatus,
        cancelledAt: null,
        cancelledByUserId: null,
      },
      include: reviewInclude,
    });

    const meta = {
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };
    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_REOPENED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW,
      resourceId: updated.id,
      oldValue: { projectId, status: existing.status },
      newValue: { projectId, status: updated.status },
      ...meta,
    });

    return this.mapReviewToDetail(updated);
  }

  private assertReviewReportAllowed(status: ProjectReviewStatus): void {
    if (status !== ProjectReviewStatus.FINALIZED) {
      throw new BadRequestException(
        'Le compte rendu est disponible une fois le point finalisé.',
      );
    }
  }

  private isDraftReportPreviewStatus(status: ProjectReviewStatus): boolean {
    return (
      status === ProjectReviewStatus.IN_PROGRESS ||
      status === ProjectReviewStatus.IN_REVIEW ||
      status === ProjectReviewStatus.DRAFT
    );
  }

  /** Snapshot v2 figé uniquement — pas de rebuild live, pas d’overlay météo. */
  private requireFrozenReportSnapshot(review: {
    snapshotPayload: unknown;
  }): ProjectReviewSnapshotPayload {
    const parsed = parseProjectReviewSnapshotPayload(review.snapshotPayload);
    if (!parsed) {
      throw new BadRequestException(
        'Snapshot indisponible — point antérieur à la version 2',
      );
    }
    return parsed;
  }

  /** Snapshot éphémère (aperçu brouillon) — même builder que finalize, jamais écrit en base. */
  private async buildEphemeralReportSnapshot(
    clientId: string,
    projectId: string,
    review: ReviewWithChildren,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<ProjectReviewSnapshotPayload> {
    const ctx = await this.loadSnapshotContext(
      tx as Prisma.TransactionClient,
      clientId,
      projectId,
    );
    const conduct = this.buildSnapshotConductData(review);
    const agendaTitleById = new Map(
      review.agendaItems.map((item) => [item.id, item.title]),
    );
    const snapshotPayload = buildProjectReviewSnapshotPayload({
      ...ctx,
      review,
      facilitatorDisplayName: formatProjectReviewUserDisplayName(
        review.facilitator,
      ),
      attachments: review.attachments ?? [],
      standaloneDecisions: review.decisions,
      standaloneActions: review.actionItems.map((a) => ({
        id: a.id,
        title: a.title,
        dueDate: a.dueDate,
        priority: a.priority,
        responsibleDisplayName: formatProjectReviewUserDisplayName(
          a.responsibleUser,
        ),
        contributors: a.contributors.map((c) => ({
          displayName:
            c.displayName ?? formatProjectReviewUserDisplayName(c.user),
          roleLabel: c.roleLabel,
        })),
      })),
      agendaTitleById,
      pilotage: this.pilotage,
      ...conduct,
    });
    const parsed = parseProjectReviewSnapshotPayload(snapshotPayload);
    if (!parsed) {
      throw new BadRequestException(
        'Impossible de construire l’aperçu du compte rendu.',
      );
    }
    return parsed;
  }

  private async loadReportClientOrganization(clientId: string): Promise<{
    name: string;
    logoUrl: string | null;
  }> {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId },
      select: { name: true },
    });
    if (!client) throw new NotFoundException('Client not found');
    return {
      name: client.name,
      logoUrl: null,
    };
  }

  async getReportPreview(
    clientId: string,
    projectId: string,
    reviewId: string,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    const review = await this.prisma.projectReview.findFirst({
      where: { id: reviewId, clientId, projectId },
      include: reviewInclude,
    });
    if (!review) throw new NotFoundException('Review not found');

    if (review.status === ProjectReviewStatus.FINALIZED) {
      if (review.lastSentReportHtml) {
        return {
          subject: review.lastSentReportSubject ?? '',
          title: review.lastSentReportTitle ?? '',
          text: review.lastSentReportText ?? '',
          html: review.lastSentReportHtml,
        };
      }

      const snapshot = this.requireFrozenReportSnapshot(review);
      const clientOrganization = await this.loadReportClientOrganization(clientId);
      const report = buildProjectReviewReportContent({
        projectName: snapshot.project.name,
        projectId,
        reviewId,
        snapshot,
        appBaseUrl: resolveProjectReviewReportAppBaseUrl(),
        clientOrganization,
      });

      return {
        subject: report.subject,
        title: report.title,
        text: report.text,
        html: report.html,
      };
    }

    if (!this.isDraftReportPreviewStatus(review.status)) {
      throw new BadRequestException(
        'Le compte rendu brouillon est disponible pendant la conduite du point.',
      );
    }

    const snapshot = await this.buildEphemeralReportSnapshot(
      clientId,
      projectId,
      review,
    );
    const clientOrganization = await this.loadReportClientOrganization(clientId);
    const report = buildProjectReviewReportContent({
      projectName: snapshot.project.name,
      projectId,
      reviewId,
      snapshot,
      appBaseUrl: resolveProjectReviewReportAppBaseUrl(),
      clientOrganization,
    });

    return {
      subject: report.subject,
      title: report.title,
      text: report.text,
      html: report.html,
    };
  }

  async sendReport(
    clientId: string,
    projectId: string,
    reviewId: string,
    context?: AuditContext,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    const review = await this.prisma.projectReview.findFirst({
      where: { id: reviewId, clientId, projectId },
      include: reviewInclude,
    });
    if (!review) throw new NotFoundException('Review not found');
    this.assertReviewReportAllowed(review.status);

    const snapshot = this.requireFrozenReportSnapshot(review);
    const clientOrganization = await this.loadReportClientOrganization(clientId);
    let appBaseUrl: string;
    try {
      appBaseUrl = requireProjectReviewReportAppBaseUrl();
    } catch (err) {
      throw new BadRequestException(
        (err as Error)?.message ??
          'APP_PUBLIC_URL manquant pour les liens e-mail du compte rendu.',
      );
    }
    const report = buildProjectReviewReportContent({
      projectName: snapshot.project.name,
      projectId,
      reviewId,
      snapshot,
      appBaseUrl,
      clientOrganization,
    });

    return this.emailReport.sendReport({
      clientId,
      projectId,
      reviewId,
      report: {
        ...report,
        title: report.subject,
      },
      participants: review.participants,
      context,
    });
  }

  // --- RFC-PROJ-013-8 F3 — remontées COPRO → COPIL ---

  private formatReviewDateLabel(date: Date | null | undefined): string | null {
    if (!date) return null;
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  private mapEscalationApi(
    row: {
      id: string;
      clientId: string;
      projectId: string;
      sourceReviewId: string;
      sourceAgendaItemId: string | null;
      title: string;
      summary: string | null;
      ownerUserId: string | null;
      targetReviewId: string | null;
      targetAgendaItemId: string | null;
      status: ProjectReviewEscalationStatus;
      injectedAt: Date | null;
      createdByUserId: string | null;
      createdAt: Date;
      updatedAt: Date;
      ownerUser?: {
        firstName: string | null;
        lastName: string | null;
        email: string;
      } | null;
      sourceReview?: {
        title: string | null;
        reviewType: ProjectReviewType;
        reviewDate: Date | null;
      } | null;
      targetReview?: {
        title: string | null;
        reviewType: ProjectReviewType;
        reviewDate: Date | null;
      } | null;
      sourceAgendaTitle?: string | null;
    },
  ) {
    const ownerDisplayName =
      formatProjectReviewUserDisplayName(row.ownerUser) ?? null;
    const sourceReviewTitle = row.sourceReview
      ? reviewTitleLabel(row.sourceReview.title, row.sourceReview.reviewType)
      : 'COPROJ';
    const targetReviewTitle = row.targetReview
      ? reviewTitleLabel(row.targetReview.title, row.targetReview.reviewType)
      : null;
    return {
      id: row.id,
      clientId: row.clientId,
      projectId: row.projectId,
      sourceReviewId: row.sourceReviewId,
      sourceAgendaItemId: row.sourceAgendaItemId,
      sourceAgendaTitle: row.sourceAgendaTitle ?? null,
      title: row.title,
      summary: row.summary,
      ownerUserId: row.ownerUserId,
      ownerDisplayName,
      targetReviewId: row.targetReviewId,
      targetAgendaItemId: row.targetAgendaItemId,
      targetReviewTitle,
      targetReviewDate: row.targetReview?.reviewDate?.toISOString() ?? null,
      sourceReviewTitle,
      sourceReviewDate: row.sourceReview?.reviewDate?.toISOString() ?? null,
      status: row.status,
      statusLabel: escalationStatusLabel(row.status),
      injectedAt: row.injectedAt?.toISOString() ?? null,
      createdByUserId: row.createdByUserId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async loadEscalationMapped(
    clientId: string,
    escalationId: string,
  ) {
    const row = await this.prisma.projectReviewEscalation.findFirst({
      where: { id: escalationId, clientId },
      include: {
        ownerUser: { select: projectReviewUserSelect },
        sourceReview: {
          select: { title: true, reviewType: true, reviewDate: true },
        },
        targetReview: {
          select: { title: true, reviewType: true, reviewDate: true },
        },
      },
    });
    if (!row) throw new NotFoundException('Remontée introuvable');
    let sourceAgendaTitle: string | null = null;
    if (row.sourceAgendaItemId) {
      const agenda = await this.prisma.projectReviewAgendaItem.findFirst({
        where: { id: row.sourceAgendaItemId, clientId },
        select: { title: true },
      });
      sourceAgendaTitle = agenda?.title ?? null;
    }
    return this.mapEscalationApi({ ...row, sourceAgendaTitle });
  }

  private async findNextCopilCandidate(
    clientId: string,
    projectId: string,
    sourceDate: Date | null,
    excludeReviewId?: string,
  ) {
    const candidates = await this.prisma.projectReview.findMany({
      where: {
        clientId,
        projectId,
        reviewType: ProjectReviewType.COPIL,
        status: { in: COPIL_ESCALATION_TARGET_STATUSES },
        ...(excludeReviewId ? { id: { not: excludeReviewId } } : {}),
      },
      select: {
        id: true,
        title: true,
        reviewDate: true,
        agendaLockedAt: true,
      },
    });
    return resolveNextCopilTarget(candidates, sourceDate);
  }

  private async injectEscalationIntoTarget(
    tx: Prisma.TransactionClient,
    escalation: {
      id: string;
      clientId: string;
      projectId: string;
      title: string;
      summary: string | null;
      ownerUserId: string | null;
      sourceAgendaItemId: string | null;
      sourceReviewId: string;
    },
    target: {
      id: string;
      agendaLockedAt: Date | null;
      title: string | null;
    },
    sourceMeta: {
      sourceReviewTitle: string;
      sourceReviewDateLabel: string | null;
      sourceAgendaTitle: string | null;
    },
  ): Promise<{ injected: boolean; targetAgendaItemId: string | null }> {
    if (!canInjectIntoTargetAgenda(target.agendaLockedAt)) {
      return { injected: false, targetAgendaItemId: null };
    }

    const maxOrder = await tx.projectReviewAgendaItem.aggregate({
      where: { clientId: escalation.clientId, projectReviewId: target.id },
      _max: { orderIndex: true },
    });
    const orderIndex = (maxOrder._max.orderIndex ?? -1) + 1;
    const description = buildEscalationAgendaDescription({
      sourceReviewTitle: sourceMeta.sourceReviewTitle,
      sourceReviewDateLabel: sourceMeta.sourceReviewDateLabel,
      sourceAgendaTitle: sourceMeta.sourceAgendaTitle,
      summary: escalation.summary,
    });

    const agendaItem = await tx.projectReviewAgendaItem.create({
      data: {
        clientId: escalation.clientId,
        projectReviewId: target.id,
        title: escalation.title,
        description,
        itemType: ProjectReviewAgendaItemType.ESCALATION,
        orderIndex,
        ownerUserId: escalation.ownerUserId,
      },
    });

    await tx.projectReviewEscalation.update({
      where: { id: escalation.id },
      data: {
        targetReviewId: target.id,
        targetAgendaItemId: agendaItem.id,
        status: ProjectReviewEscalationStatus.INJECTED,
        injectedAt: new Date(),
      },
    });

    return { injected: true, targetAgendaItemId: agendaItem.id };
  }

  async listEscalations(
    clientId: string,
    projectId: string,
    reviewId: string,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    const review = await this.prisma.projectReview.findFirst({
      where: { id: reviewId, clientId, projectId },
      select: { id: true, reviewType: true },
    });
    if (!review) throw new NotFoundException('Review not found');

    const where =
      review.reviewType === ProjectReviewType.COPIL
        ? { clientId, projectId, targetReviewId: reviewId }
        : { clientId, projectId, sourceReviewId: reviewId };

    const rows = await this.prisma.projectReviewEscalation.findMany({
      where,
      include: {
        ownerUser: { select: projectReviewUserSelect },
        sourceReview: {
          select: { title: true, reviewType: true, reviewDate: true },
        },
        targetReview: {
          select: { title: true, reviewType: true, reviewDate: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const agendaIds = rows
      .map((r) => r.sourceAgendaItemId)
      .filter((id): id is string => Boolean(id));
    const agendaTitles = agendaIds.length
      ? await this.prisma.projectReviewAgendaItem.findMany({
          where: { clientId, id: { in: agendaIds } },
          select: { id: true, title: true },
        })
      : [];
    const agendaTitleMap = new Map(
      agendaTitles.map((a) => [a.id, a.title] as const),
    );

    return {
      items: rows.map((row) =>
        this.mapEscalationApi({
          ...row,
          sourceAgendaTitle: row.sourceAgendaItemId
            ? (agendaTitleMap.get(row.sourceAgendaItemId) ?? null)
            : null,
        }),
      ),
    };
  }

  async createEscalation(
    clientId: string,
    projectId: string,
    reviewId: string,
    dto: CreateProjectReviewEscalationDto,
    context?: AuditContext,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    const sourceReview = await this.prisma.projectReview.findFirst({
      where: { id: reviewId, clientId, projectId },
    });
    if (!sourceReview) throw new NotFoundException('Review not found');
    if (sourceReview.reviewType !== ProjectReviewType.COPRO) {
      throw new BadRequestException(
        'Les remontées ne peuvent être créées que depuis un COPROJ',
      );
    }
    if (sourceReview.status === ProjectReviewStatus.CANCELLED) {
      throw new BadRequestException('Point annulé');
    }

    let sourceAgendaTitle: string | null = null;
    let ownerUserId = dto.ownerUserId?.trim() || null;
    let title = dto.title?.trim() || '';

    if (dto.sourceAgendaItemId) {
      const agenda = await this.prisma.projectReviewAgendaItem.findFirst({
        where: {
          id: dto.sourceAgendaItemId,
          clientId,
          projectReviewId: reviewId,
        },
      });
      if (!agenda) {
        throw new NotFoundException('Point d’ordre du jour introuvable');
      }
      const existing = await this.prisma.projectReviewEscalation.findFirst({
        where: {
          clientId,
          sourceAgendaItemId: agenda.id,
          status: { not: ProjectReviewEscalationStatus.CANCELLED },
        },
      });
      if (existing) {
        throw new BadRequestException(
          'Ce point est déjà qualifié « à remonter »',
        );
      }
      sourceAgendaTitle = agenda.title;
      if (!title) title = agenda.title;
      if (!ownerUserId) ownerUserId = agenda.ownerUserId;
    }

    if (!title) {
      throw new BadRequestException('Le titre de la remontée est obligatoire');
    }

    if (ownerUserId) {
      await this.projects.assertClientUser(clientId, ownerUserId);
    }

    const target = await this.findNextCopilCandidate(
      clientId,
      projectId,
      sourceReview.reviewDate,
      reviewId,
    );

    const sourceReviewTitle = reviewTitleLabel(
      sourceReview.title,
      sourceReview.reviewType,
    );
    const sourceReviewDateLabel = this.formatReviewDateLabel(
      sourceReview.reviewDate,
    );

    const {
      escalationId,
      injected,
    } = await this.prisma.$transaction(async (tx) => {
      const created = await tx.projectReviewEscalation.create({
        data: {
          clientId,
          projectId,
          sourceReviewId: reviewId,
          sourceAgendaItemId: dto.sourceAgendaItemId?.trim() || null,
          title,
          summary: dto.summary?.trim() || null,
          ownerUserId,
          targetReviewId: target?.id ?? null,
          status: ProjectReviewEscalationStatus.PENDING,
          createdByUserId: context?.actorUserId ?? null,
        },
      });

      let didInject = false;
      if (target) {
        const result = await this.injectEscalationIntoTarget(
          tx,
          {
            id: created.id,
            clientId,
            projectId,
            title: created.title,
            summary: created.summary,
            ownerUserId: created.ownerUserId,
            sourceAgendaItemId: created.sourceAgendaItemId,
            sourceReviewId: created.sourceReviewId,
          },
          target,
          {
            sourceReviewTitle,
            sourceReviewDateLabel,
            sourceAgendaTitle,
          },
        );
        didInject = result.injected;
      }

      return { escalationId: created.id, injected: didInject };
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_ESCALATION_CREATED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW_ESCALATION,
      resourceId: escalationId,
      newValue: {
        projectId,
        reviewId,
        targetReviewId: target?.id ?? null,
        injected,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    if (injected) {
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_ESCALATION_INJECTED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW_ESCALATION,
        resourceId: escalationId,
        newValue: {
          projectId,
          reviewId,
          targetReviewId: target?.id ?? null,
          count: 1,
        },
        ipAddress: context?.meta?.ipAddress,
        userAgent: context?.meta?.userAgent,
        requestId: context?.meta?.requestId,
      });
    }

    return this.loadEscalationMapped(clientId, escalationId);
  }

  async cancelEscalation(
    clientId: string,
    projectId: string,
    reviewId: string,
    escalationId: string,
    context?: AuditContext,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    const review = await this.prisma.projectReview.findFirst({
      where: { id: reviewId, clientId, projectId },
      select: { id: true, reviewType: true },
    });
    if (!review) throw new NotFoundException('Review not found');

    const escalation = await this.prisma.projectReviewEscalation.findFirst({
      where: {
        id: escalationId,
        clientId,
        projectId,
        sourceReviewId: reviewId,
      },
    });
    if (!escalation) throw new NotFoundException('Remontée introuvable');
    if (escalation.status === ProjectReviewEscalationStatus.CANCELLED) {
      throw new BadRequestException('Remontée déjà annulée');
    }

    await this.prisma.$transaction(async (tx) => {
      if (
        escalation.status === ProjectReviewEscalationStatus.INJECTED &&
        escalation.targetAgendaItemId &&
        escalation.targetReviewId
      ) {
        const target = await tx.projectReview.findFirst({
          where: {
            id: escalation.targetReviewId,
            clientId,
            projectId,
          },
          select: { agendaLockedAt: true },
        });
        if (target && canInjectIntoTargetAgenda(target.agendaLockedAt)) {
          await tx.projectReviewAgendaItem.deleteMany({
            where: {
              id: escalation.targetAgendaItemId,
              clientId,
              projectReviewId: escalation.targetReviewId,
            },
          });
        }
      }

      await tx.projectReviewEscalation.update({
        where: { id: escalationId },
        data: {
          status: ProjectReviewEscalationStatus.CANCELLED,
          targetAgendaItemId: null,
          injectedAt: null,
        },
      });
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_ESCALATION_CANCELLED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW_ESCALATION,
      resourceId: escalationId,
      newValue: { projectId, reviewId, escalationId },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return this.loadEscalationMapped(clientId, escalationId);
  }

  async consolidateEscalations(
    clientId: string,
    projectId: string,
    reviewId: string,
    context?: AuditContext,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    const targetReview = await this.prisma.projectReview.findFirst({
      where: { id: reviewId, clientId, projectId },
    });
    if (!targetReview) throw new NotFoundException('Review not found');
    if (targetReview.reviewType !== ProjectReviewType.COPIL) {
      throw new BadRequestException(
        'La consolidation des remontées ne s’applique qu’à un COPIL',
      );
    }
    if (!canInjectIntoTargetAgenda(targetReview.agendaLockedAt)) {
      return { injected: 0, skippedLocked: true, items: [] as unknown[] };
    }

    const pending = await this.prisma.projectReviewEscalation.findMany({
      where: {
        clientId,
        projectId,
        status: ProjectReviewEscalationStatus.PENDING,
        OR: [
          { targetReviewId: reviewId },
          { targetReviewId: null },
        ],
      },
      include: {
        sourceReview: {
          select: { title: true, reviewType: true, reviewDate: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Ne prendre les PENDING sans cible que si ce COPIL est le prochain pour leur source.
    const eligible: typeof pending = [];
    for (const esc of pending) {
      if (esc.targetReviewId === reviewId) {
        eligible.push(esc);
        continue;
      }
      const next = await this.findNextCopilCandidate(
        clientId,
        projectId,
        esc.sourceReview.reviewDate,
        esc.sourceReviewId,
      );
      if (next?.id === reviewId) eligible.push(esc);
    }

    let injected = 0;
    await this.prisma.$transaction(async (tx) => {
      for (const esc of eligible) {
        let sourceAgendaTitle: string | null = null;
        if (esc.sourceAgendaItemId) {
          const agenda = await tx.projectReviewAgendaItem.findFirst({
            where: { id: esc.sourceAgendaItemId, clientId },
            select: { title: true },
          });
          sourceAgendaTitle = agenda?.title ?? null;
        }
        const result = await this.injectEscalationIntoTarget(
          tx,
          {
            id: esc.id,
            clientId: esc.clientId,
            projectId: esc.projectId,
            title: esc.title,
            summary: esc.summary,
            ownerUserId: esc.ownerUserId,
            sourceAgendaItemId: esc.sourceAgendaItemId,
            sourceReviewId: esc.sourceReviewId,
          },
          {
            id: targetReview.id,
            agendaLockedAt: targetReview.agendaLockedAt,
            title: targetReview.title,
          },
          {
            sourceReviewTitle: reviewTitleLabel(
              esc.sourceReview.title,
              esc.sourceReview.reviewType,
            ),
            sourceReviewDateLabel: this.formatReviewDateLabel(
              esc.sourceReview.reviewDate,
            ),
            sourceAgendaTitle,
          },
        );
        if (result.injected) injected += 1;
      }
    });

    if (injected > 0) {
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_ESCALATION_INJECTED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW,
        resourceId: reviewId,
        newValue: { projectId, reviewId, count: injected },
        ipAddress: context?.meta?.ipAddress,
        userAgent: context?.meta?.userAgent,
        requestId: context?.meta?.requestId,
      });
    }

    const listed = await this.listEscalations(clientId, projectId, reviewId);
    return {
      injected,
      skippedLocked: false,
      items: listed.items,
    };
  }

  // --- RFC-PROJ-013-8 F3.1 — descentes COPIL → COPRO ---

  private mapDescentApi(
    row: {
      id: string;
      clientId: string;
      projectId: string;
      sourceReviewId: string;
      sourceDecisionId: string;
      title: string;
      summary: string | null;
      ownerUserId: string | null;
      targetReviewId: string | null;
      targetAgendaItemId: string | null;
      status: ProjectReviewDescentStatus;
      injectedAt: Date | null;
      createdByUserId: string | null;
      createdAt: Date;
      updatedAt: Date;
      ownerUser?: {
        firstName: string | null;
        lastName: string | null;
        email: string;
      } | null;
      sourceReview?: {
        title: string | null;
        reviewType: ProjectReviewType;
        reviewDate: Date | null;
      } | null;
      targetReview?: {
        title: string | null;
        reviewType: ProjectReviewType;
        reviewDate: Date | null;
      } | null;
    },
  ) {
    const ownerDisplayName =
      formatProjectReviewUserDisplayName(row.ownerUser) ?? null;
    const sourceReviewTitle = row.sourceReview
      ? reviewTitleLabel(row.sourceReview.title, row.sourceReview.reviewType)
      : 'COPIL';
    const targetReviewTitle = row.targetReview
      ? reviewTitleLabel(row.targetReview.title, row.targetReview.reviewType)
      : null;
    return {
      id: row.id,
      clientId: row.clientId,
      projectId: row.projectId,
      sourceReviewId: row.sourceReviewId,
      sourceDecisionId: row.sourceDecisionId,
      title: row.title,
      summary: row.summary,
      ownerUserId: row.ownerUserId,
      ownerDisplayName,
      targetReviewId: row.targetReviewId,
      targetAgendaItemId: row.targetAgendaItemId,
      targetReviewTitle,
      targetReviewDate: row.targetReview?.reviewDate?.toISOString() ?? null,
      sourceReviewTitle,
      sourceReviewDate: row.sourceReview?.reviewDate?.toISOString() ?? null,
      status: row.status,
      statusLabel: descentStatusLabel(row.status),
      injectedAt: row.injectedAt?.toISOString() ?? null,
      createdByUserId: row.createdByUserId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async loadDescentMapped(clientId: string, descentId: string) {
    const row = await this.prisma.projectReviewDescent.findFirst({
      where: { id: descentId, clientId },
      include: {
        ownerUser: { select: projectReviewUserSelect },
        sourceReview: {
          select: { title: true, reviewType: true, reviewDate: true },
        },
        targetReview: {
          select: { title: true, reviewType: true, reviewDate: true },
        },
      },
    });
    if (!row) throw new NotFoundException('Descente introuvable');
    return this.mapDescentApi(row);
  }

  private async findNextCoproCandidate(
    clientId: string,
    projectId: string,
    sourceDate: Date | null,
    excludeReviewId?: string,
  ) {
    const candidates = await this.prisma.projectReview.findMany({
      where: {
        clientId,
        projectId,
        reviewType: ProjectReviewType.COPRO,
        status: { in: COPRO_DESCENT_TARGET_STATUSES },
        ...(excludeReviewId ? { id: { not: excludeReviewId } } : {}),
      },
      select: {
        id: true,
        title: true,
        reviewDate: true,
        agendaLockedAt: true,
      },
    });
    return resolveNextCoproTarget(candidates, sourceDate);
  }

  private async injectDescentIntoTarget(
    tx: Prisma.TransactionClient,
    descent: {
      id: string;
      clientId: string;
      projectId: string;
      title: string;
      summary: string | null;
      ownerUserId: string | null;
      sourceReviewId: string;
    },
    target: {
      id: string;
      agendaLockedAt: Date | null;
      title: string | null;
    },
    sourceMeta: {
      sourceReviewTitle: string;
      sourceReviewDateLabel: string | null;
    },
  ): Promise<{ injected: boolean; targetAgendaItemId: string | null }> {
    if (!canInjectIntoTargetAgenda(target.agendaLockedAt)) {
      return { injected: false, targetAgendaItemId: null };
    }

    const maxOrder = await tx.projectReviewAgendaItem.aggregate({
      where: { clientId: descent.clientId, projectReviewId: target.id },
      _max: { orderIndex: true },
    });
    const orderIndex = (maxOrder._max.orderIndex ?? -1) + 1;
    const description = buildDescentAgendaDescription({
      sourceReviewTitle: sourceMeta.sourceReviewTitle,
      sourceReviewDateLabel: sourceMeta.sourceReviewDateLabel,
      summary: descent.summary,
    });

    const agendaItem = await tx.projectReviewAgendaItem.create({
      data: {
        clientId: descent.clientId,
        projectReviewId: target.id,
        title: descent.title,
        description,
        itemType: ProjectReviewAgendaItemType.DECISION_DESCENT,
        orderIndex,
        ownerUserId: descent.ownerUserId,
      },
    });

    await tx.projectReviewDescent.update({
      where: { id: descent.id },
      data: {
        targetReviewId: target.id,
        targetAgendaItemId: agendaItem.id,
        status: ProjectReviewDescentStatus.INJECTED,
        injectedAt: new Date(),
      },
    });

    return { injected: true, targetAgendaItemId: agendaItem.id };
  }

  private async createDescentsFromFinalizedCopil(
    clientId: string,
    projectId: string,
    finalized: ReviewWithChildren,
    context?: AuditContext,
  ): Promise<{ created: number; injected: number; skippedExisting: number }> {
    const validated = finalized.decisions.filter(
      (d) => d.status === ProjectReviewDecisionStatus.VALIDATED,
    );
    if (validated.length === 0) {
      return { created: 0, injected: 0, skippedExisting: 0 };
    }

    const sourceReviewTitle = reviewTitleLabel(
      finalized.title,
      finalized.reviewType,
    );
    const sourceReviewDateLabel = this.formatReviewDateLabel(
      finalized.reviewDate,
    );
    const target = await this.findNextCoproCandidate(
      clientId,
      projectId,
      finalized.reviewDate,
      finalized.id,
    );

    let created = 0;
    let injected = 0;
    let skippedExisting = 0;

    for (const decision of validated) {
      const existing = await this.prisma.projectReviewDescent.findFirst({
        where: { clientId, sourceDecisionId: decision.id },
        select: { id: true },
      });
      if (existing) {
        skippedExisting += 1;
        continue;
      }

      const result = await this.prisma.$transaction(async (tx) => {
        const row = await tx.projectReviewDescent.create({
          data: {
            clientId,
            projectId,
            sourceReviewId: finalized.id,
            sourceDecisionId: decision.id,
            title: decision.title,
            summary: decision.description,
            ownerUserId: decision.decidedByUserId,
            targetReviewId: target?.id ?? null,
            status: ProjectReviewDescentStatus.PENDING,
            createdByUserId: context?.actorUserId ?? null,
          },
        });

        let didInject = false;
        if (target) {
          const injectResult = await this.injectDescentIntoTarget(
            tx,
            {
              id: row.id,
              clientId,
              projectId,
              title: row.title,
              summary: row.summary,
              ownerUserId: row.ownerUserId,
              sourceReviewId: row.sourceReviewId,
            },
            target,
            { sourceReviewTitle, sourceReviewDateLabel },
          );
          didInject = injectResult.injected;
        }

        return { didInject };
      });

      created += 1;
      if (result.didInject) injected += 1;
    }

    return { created, injected, skippedExisting };
  }

  async listDescents(
    clientId: string,
    projectId: string,
    reviewId: string,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    const review = await this.prisma.projectReview.findFirst({
      where: { id: reviewId, clientId, projectId },
      select: { id: true, reviewType: true },
    });
    if (!review) throw new NotFoundException('Review not found');

    const where =
      review.reviewType === ProjectReviewType.COPRO
        ? { clientId, projectId, targetReviewId: reviewId }
        : { clientId, projectId, sourceReviewId: reviewId };

    const rows = await this.prisma.projectReviewDescent.findMany({
      where,
      include: {
        ownerUser: { select: projectReviewUserSelect },
        sourceReview: {
          select: { title: true, reviewType: true, reviewDate: true },
        },
        targetReview: {
          select: { title: true, reviewType: true, reviewDate: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      items: rows.map((row) => this.mapDescentApi(row)),
    };
  }

  async cancelDescent(
    clientId: string,
    projectId: string,
    reviewId: string,
    descentId: string,
    context?: AuditContext,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    const review = await this.prisma.projectReview.findFirst({
      where: { id: reviewId, clientId, projectId },
      select: { id: true, reviewType: true },
    });
    if (!review) throw new NotFoundException('Review not found');

    const descent = await this.prisma.projectReviewDescent.findFirst({
      where: {
        id: descentId,
        clientId,
        projectId,
        OR: [{ sourceReviewId: reviewId }, { targetReviewId: reviewId }],
      },
    });
    if (!descent) throw new NotFoundException('Descente introuvable');
    if (descent.status === ProjectReviewDescentStatus.CANCELLED) {
      throw new BadRequestException('Descente déjà annulée');
    }

    await this.prisma.$transaction(async (tx) => {
      if (
        descent.status === ProjectReviewDescentStatus.INJECTED &&
        descent.targetAgendaItemId &&
        descent.targetReviewId
      ) {
        const target = await tx.projectReview.findFirst({
          where: {
            id: descent.targetReviewId,
            clientId,
            projectId,
          },
          select: { agendaLockedAt: true },
        });
        if (target && canInjectIntoTargetAgenda(target.agendaLockedAt)) {
          await tx.projectReviewAgendaItem.deleteMany({
            where: {
              id: descent.targetAgendaItemId,
              clientId,
              projectReviewId: descent.targetReviewId,
            },
          });
        }
      }

      await tx.projectReviewDescent.update({
        where: { id: descentId },
        data: {
          status: ProjectReviewDescentStatus.CANCELLED,
          targetAgendaItemId: null,
          injectedAt: null,
        },
      });
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_DESCENT_CANCELLED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW_DESCENT,
      resourceId: descentId,
      newValue: { projectId, reviewId, descentId },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return this.loadDescentMapped(clientId, descentId);
  }

  async consolidateDescents(
    clientId: string,
    projectId: string,
    reviewId: string,
    context?: AuditContext,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    const targetReview = await this.prisma.projectReview.findFirst({
      where: { id: reviewId, clientId, projectId },
    });
    if (!targetReview) throw new NotFoundException('Review not found');
    if (targetReview.reviewType !== ProjectReviewType.COPRO) {
      throw new BadRequestException(
        'La consolidation des descentes ne s’applique qu’à un COPROJ',
      );
    }
    if (!canInjectIntoTargetAgenda(targetReview.agendaLockedAt)) {
      return { injected: 0, skippedLocked: true, items: [] as unknown[] };
    }

    const pending = await this.prisma.projectReviewDescent.findMany({
      where: {
        clientId,
        projectId,
        status: ProjectReviewDescentStatus.PENDING,
        OR: [{ targetReviewId: reviewId }, { targetReviewId: null }],
      },
      include: {
        sourceReview: {
          select: { title: true, reviewType: true, reviewDate: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const eligible: typeof pending = [];
    for (const descent of pending) {
      if (descent.targetReviewId === reviewId) {
        eligible.push(descent);
        continue;
      }
      const next = await this.findNextCoproCandidate(
        clientId,
        projectId,
        descent.sourceReview.reviewDate,
        descent.sourceReviewId,
      );
      if (next?.id === reviewId) eligible.push(descent);
    }

    let injected = 0;
    await this.prisma.$transaction(async (tx) => {
      for (const descent of eligible) {
        const result = await this.injectDescentIntoTarget(
          tx,
          {
            id: descent.id,
            clientId: descent.clientId,
            projectId: descent.projectId,
            title: descent.title,
            summary: descent.summary,
            ownerUserId: descent.ownerUserId,
            sourceReviewId: descent.sourceReviewId,
          },
          {
            id: targetReview.id,
            agendaLockedAt: targetReview.agendaLockedAt,
            title: targetReview.title,
          },
          {
            sourceReviewTitle: reviewTitleLabel(
              descent.sourceReview.title,
              descent.sourceReview.reviewType,
            ),
            sourceReviewDateLabel: this.formatReviewDateLabel(
              descent.sourceReview.reviewDate,
            ),
          },
        );
        if (result.injected) injected += 1;
      }
    });

    if (injected > 0) {
      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_DESCENT_INJECTED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW,
        resourceId: reviewId,
        newValue: { projectId, reviewId, count: injected },
        ipAddress: context?.meta?.ipAddress,
        userAgent: context?.meta?.userAgent,
        requestId: context?.meta?.requestId,
      });
    }

    const listed = await this.listDescents(clientId, projectId, reviewId);
    return {
      injected,
      skippedLocked: false,
      items: listed.items,
    };
  }
}
