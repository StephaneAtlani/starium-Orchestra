import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ProjectReviewStatus,
  ProjectReviewType,
  ProjectStatus,
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
import { UpdateProjectReviewDto } from './dto/update-project-review.dto';
import { ProjectReviewActionItemInputDto } from './dto/project-review-action-item.dto';
import {
  assertMeetingFieldsCoherence,
  assertValidMeetingUrl,
} from './project-review-meeting.validation';
import { isReviewContentEditable } from './project-review-status.helpers';
import {
  formatProjectReviewUserDisplayName,
  projectReviewUserSelect,
} from './project-review-user-display';
import {
  buildProjectReviewSnapshotPayload,
  type ProjectReviewSnapshotAgendaItem,
} from './project-reviews-snapshot.builder';

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
  startedBy: { select: projectReviewUserSelect },
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

@Injectable()
export class ProjectReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
    private readonly pilotage: ProjectsPilotageService,
    private readonly auditLogs: AuditLogsService,
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
          status: ProjectReviewStatus.PLANNED,
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

    if (dup.status === ProjectReviewStatus.PLANNED) {
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
    if (reviewStatus !== ProjectReviewStatus.IN_REVIEW || !items?.length) return;
    for (const item of items) {
      if (!item.responsibleUserId?.trim()) {
        throw new BadRequestException(
          'Chaque action créée en revue doit avoir un responsable unique',
        );
      }
    }
  }

  private resolveCreationStatus(
    creationMode: 'PLANNED' | 'IMMEDIATE' | undefined,
  ): ProjectReviewStatus {
    return creationMode === 'PLANNED'
      ? ProjectReviewStatus.PLANNED
      : ProjectReviewStatus.IN_REVIEW;
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
    };
  }

  private mapActionItem(a: ReviewWithChildren['actionItems'][number]) {
    return {
      id: a.id,
      title: a.title,
      status: a.status,
      dueDate: a.dueDate?.toISOString() ?? null,
      linkedTaskId: a.linkedTaskId,
      agendaItemId: a.agendaItemId,
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
    return {
      id: row.id,
      clientId: row.clientId,
      projectId: row.projectId,
      reviewDate: row.reviewDate.toISOString(),
      reviewType: row.reviewType,
      status: row.status,
      title: row.title,
      executiveSummary: row.executiveSummary,
      meetingMode: row.meetingMode,
      meetingUrl: row.meetingUrl,
      location: row.location,
      startedAt: row.startedAt?.toISOString() ?? null,
      startedByUserId: row.startedByUserId,
      facilitatorUserId: row.facilitatorUserId,
      nextReviewDate: row.nextReviewDate?.toISOString() ?? null,
      finalizedAt: row.finalizedAt?.toISOString() ?? null,
      finalizedByUserId: row.finalizedByUserId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      participantsCount: row.participants.length,
      decisionsCount: row.decisions.length,
      actionItemsCount: row.actionItems.length,
      agendaItemsCount: row.agendaItems.length,
    };
  }

  private mapReviewToDetail(row: ReviewWithChildren) {
    const base = {
      id: row.id,
      clientId: row.clientId,
      projectId: row.projectId,
      reviewDate: row.reviewDate.toISOString(),
      reviewType: row.reviewType,
      status: row.status,
      title: row.title,
      executiveSummary: row.executiveSummary,
      contentPayload: row.contentPayload,
      meetingMode: row.meetingMode,
      meetingUrl: row.meetingUrl,
      location: row.location,
      startedAt: row.startedAt?.toISOString() ?? null,
      startedByUserId: row.startedByUserId,
      startedByDisplayName: formatProjectReviewUserDisplayName(row.startedBy),
      facilitatorUserId: row.facilitatorUserId,
      nextReviewDate: row.nextReviewDate?.toISOString() ?? null,
      finalizedAt: row.finalizedAt?.toISOString() ?? null,
      finalizedByUserId: row.finalizedByUserId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      participants: row.participants.map((p) => this.mapParticipant(p)),
      agendaItems: row.agendaItems.map((item) => this.mapAgendaItem(item)),
      decisions: row.decisions.map((d) => ({
        id: d.id,
        title: d.title,
        description: d.description,
        agendaItemId: d.agendaItemId,
        createdAt: d.createdAt.toISOString(),
      })),
      actionItems: row.actionItems.map((a) => this.mapActionItem(a)),
    };
    return {
      ...base,
      snapshotPayload:
        row.status === 'FINALIZED' ? row.snapshotPayload : null,
    };
  }

  async list(clientId: string, projectId: string) {
    await this.projects.getProjectForScope(clientId, projectId);
    const rows = await this.prisma.projectReview.findMany({
      where: { clientId, projectId },
      include: reviewInclude,
      orderBy: [{ reviewDate: 'desc' }, { createdAt: 'desc' }],
    });
    return {
      items: rows.map((r: ReviewWithChildren) => this.mapReviewToListItem(r)),
    };
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

    const creationMode = dto.creationMode ?? 'IMMEDIATE';
    if (
      dto.reviewType === ProjectReviewType.POST_MORTEM &&
      creationMode === 'PLANNED'
    ) {
      throw new BadRequestException(
        "Un retour d'expérience ne peut pas être planifié : créez-le en mode immédiat.",
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

    const reviewStatus = this.resolveCreationStatus(creationMode);
    this.assertActionItemsResponsibleInReview(reviewStatus, dto.actionItems);
    const meeting = this.resolveMeetingFields(dto);

    const reviewDate = new Date(dto.reviewDate);
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
        executiveSummary: dto.executiveSummary?.trim() ?? null,
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
              create: dto.decisions.map((d) => ({
                clientId,
                title: d.title.trim(),
                description: d.description?.trim() ?? null,
              })),
            }
          : undefined,
        actionItems: dto.actionItems?.length
          ? {
              create: dto.actionItems.map((a) => ({
                clientId,
                projectId,
                title: a.title.trim(),
                status: a.status,
                dueDate: a.dueDate ? new Date(a.dueDate) : null,
                linkedTaskId: a.linkedTaskId ?? null,
                responsibleUserId: a.responsibleUserId ?? null,
                agendaItemId: a.agendaItemId ?? null,
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

    return this.mapReviewToDetail(created);
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
        dto.reviewDate !== undefined ? new Date(dto.reviewDate) : existing.reviewDate;
      if (nextAt.getTime() !== effectiveReviewDate.getTime()) {
        const participantsForSpawn = this.resolveParticipantsForSpawn(dto, existing);
        await this.validateParticipantUsers(clientId, participantsForSpawn);
      }
    }

    const data: Prisma.ProjectReviewUncheckedUpdateInput = {};
    if (dto.reviewDate !== undefined) data.reviewDate = new Date(dto.reviewDate);
    if (dto.reviewType !== undefined) data.reviewType = dto.reviewType;
    if (dto.title !== undefined) data.title = dto.title?.trim() ?? null;
    if (dto.executiveSummary !== undefined) {
      data.executiveSummary = dto.executiveSummary?.trim() ?? null;
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
                clientId,
                projectReviewId: reviewId,
                title: d.title.trim(),
                description: d.description?.trim() ?? null,
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
                  status: a.status,
                  dueDate: a.dueDate ? new Date(a.dueDate) : null,
                  linkedTaskId: a.linkedTaskId ?? null,
                  responsibleUserId: a.responsibleUserId ?? null,
                  agendaItemId: a.agendaItemId ?? null,
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
            dto.reviewDate !== undefined ? new Date(dto.reviewDate) : existing.reviewDate;
          if (nextAt.getTime() !== effectiveReviewDate.getTime()) {
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
          status: ProjectReviewStatus.PLANNED,
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
          })),
        actionItems: review.actionItems
          .filter((a) => a.agendaItemId === item.id)
          .map((a) => ({
            id: a.id,
            title: a.title,
            status: a.status,
            dueDate: a.dueDate?.toISOString() ?? null,
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

  async startReview(
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

    if (existing.status === ProjectReviewStatus.IN_REVIEW) {
      throw new BadRequestException('La revue est déjà en cours.');
    }
    if (existing.status !== ProjectReviewStatus.PLANNED) {
      throw new BadRequestException(
        'Seule une revue planifiée peut être démarrée.',
      );
    }

    const startedAt = new Date();
    const updated = await this.prisma.projectReview.update({
      where: { id: reviewId },
      data: {
        status: ProjectReviewStatus.IN_REVIEW,
        startedAt,
        startedByUserId: context?.actorUserId ?? null,
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
      action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_STARTED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW,
      resourceId: updated.id,
      newValue: {
        reviewId: updated.id,
        projectId,
        previousStatus: ProjectReviewStatus.PLANNED,
        newStatus: ProjectReviewStatus.IN_REVIEW,
        startedByUserId: context?.actorUserId ?? null,
        startedAt: startedAt.toISOString(),
      },
      ...meta,
    });

    return this.mapReviewToDetail(updated);
  }

  async finalize(
    clientId: string,
    projectId: string,
    reviewId: string,
    context?: AuditContext,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);

    const finalized = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const review = await tx.projectReview.findFirst({
        where: { id: reviewId, clientId, projectId },
        include: reviewInclude,
      });
      if (!review) throw new NotFoundException('Review not found');
      if (review.status === ProjectReviewStatus.PLANNED) {
        throw new BadRequestException('Démarrez d’abord la revue.');
      }
      if (
        review.status !== ProjectReviewStatus.IN_REVIEW &&
        review.status !== ProjectReviewStatus.DRAFT
      ) {
        throw new BadRequestException('Only editable reviews can be finalized');
      }

      const ctx = await this.loadSnapshotContext(tx, clientId, projectId);
      const conduct = this.buildSnapshotConductData(review);
      const snapshotPayload = buildProjectReviewSnapshotPayload({
        ...ctx,
        pilotage: this.pilotage,
        ...conduct,
      });

      const row = await tx.projectReview.update({
        where: { id: reviewId },
        data: {
          status: ProjectReviewStatus.FINALIZED,
          finalizedAt: new Date(),
          finalizedByUserId: context?.actorUserId ?? null,
          snapshotPayload,
        },
        include: reviewInclude,
      });

      return row;
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

    return this.mapReviewToDetail(finalized);
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
      data: { status: ProjectReviewStatus.CANCELLED },
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
}
