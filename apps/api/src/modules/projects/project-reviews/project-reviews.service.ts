import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProjectReviewStatus, ProjectReviewType } from '@prisma/client';
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
import { buildProjectReviewSnapshotPayload } from './project-reviews-snapshot.builder';

const reviewInclude = {
  participants: true,
  decisions: { orderBy: { createdAt: 'asc' as const } },
  actionItems: { orderBy: { id: 'asc' as const } },
} satisfies Prisma.ProjectReviewInclude;

type ReviewWithChildren = Prisma.ProjectReviewGetPayload<{
  include: typeof reviewInclude;
}>;

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
          status: ProjectReviewStatus.DRAFT,
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

    if (dup.status === ProjectReviewStatus.DRAFT) {
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
      facilitatorUserId: row.facilitatorUserId,
      nextReviewDate: row.nextReviewDate?.toISOString() ?? null,
      finalizedAt: row.finalizedAt?.toISOString() ?? null,
      finalizedByUserId: row.finalizedByUserId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      participantsCount: row.participants.length,
      decisionsCount: row.decisions.length,
      actionItemsCount: row.actionItems.length,
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
      facilitatorUserId: row.facilitatorUserId,
      nextReviewDate: row.nextReviewDate?.toISOString() ?? null,
      finalizedAt: row.finalizedAt?.toISOString() ?? null,
      finalizedByUserId: row.finalizedByUserId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      participants: row.participants.map((p) => ({
        id: p.id,
        userId: p.userId,
        displayName: p.displayName,
        attended: p.attended,
        isRequired: p.isRequired,
      })),
      decisions: row.decisions.map((d) => ({
        id: d.id,
        title: d.title,
        description: d.description,
        createdAt: d.createdAt.toISOString(),
      })),
      actionItems: row.actionItems.map((a) => ({
        id: a.id,
        title: a.title,
        status: a.status,
        dueDate: a.dueDate?.toISOString() ?? null,
        linkedTaskId: a.linkedTaskId,
      })),
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
    await this.projects.getProjectForScope(clientId, projectId);
    await this.validateFacilitator(clientId, dto.facilitatorUserId);
    await this.validateParticipantUsers(clientId, dto.participants ?? []);
    await this.validateLinkedTasks(clientId, projectId, dto.actionItems ?? []);

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
        status: ProjectReviewStatus.DRAFT,
        title: dto.title?.trim() ?? null,
        executiveSummary: dto.executiveSummary?.trim() ?? null,
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
    await this.projects.getProjectForScope(clientId, projectId);
    const existing = await this.prisma.projectReview.findFirst({
      where: { id: reviewId, clientId, projectId },
      include: reviewInclude,
    });
    if (!existing) throw new NotFoundException('Review not found');
    if (existing.status !== ProjectReviewStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT reviews can be updated');
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
          await tx.projectReviewActionItem.deleteMany({
            where: { projectReviewId: reviewId, clientId },
          });
          if (dto.actionItems.length > 0) {
            await tx.projectReviewActionItem.createMany({
              data: dto.actionItems.map((a) => ({
                clientId,
                projectReviewId: reviewId,
                projectId,
                title: a.title.trim(),
                status: a.status,
                dueDate: a.dueDate ? new Date(a.dueDate) : null,
                linkedTaskId: a.linkedTaskId ?? null,
              })),
            });
          }
        }

        let spawnedReviewId: string | null = null;
        if (dto.nextReviewDate !== undefined && dto.nextReviewDate !== null) {
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
          status: ProjectReviewStatus.DRAFT,
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
      });
      if (!review) throw new NotFoundException('Review not found');
      if (review.status !== ProjectReviewStatus.DRAFT) {
        throw new BadRequestException('Only DRAFT reviews can be finalized');
      }

      const ctx = await this.loadSnapshotContext(tx, clientId, projectId);
      const snapshotPayload = buildProjectReviewSnapshotPayload({
        ...ctx,
        pilotage: this.pilotage,
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
