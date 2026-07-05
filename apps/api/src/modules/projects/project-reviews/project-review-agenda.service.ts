import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ProjectReviewAgendaItemStatus,
  ProjectReviewStatus,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import type { AuditContext } from '../../budget-management/types/audit-context';
import {
  PROJECT_AUDIT_ACTION,
  PROJECT_AUDIT_RESOURCE_TYPE,
} from '../project-audit.constants';
import { ProjectsService } from '../projects.service';
import {
  assertReviewAgendaEditable,
  assertReviewConductEditable,
} from './project-review-status.helpers';
import { CreateProjectReviewAgendaItemDto } from './dto/create-agenda-item.dto';
import { ReorderProjectReviewAgendaItemsDto } from './dto/reorder-agenda-items.dto';
import { UpdateProjectReviewAgendaItemDto } from './dto/update-agenda-item.dto';

@Injectable()
export class ProjectReviewAgendaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  private async loadReview(
    clientId: string,
    projectId: string,
    reviewId: string,
  ) {
    await this.projects.getProjectForScope(clientId, projectId);
    const review = await this.prisma.projectReview.findFirst({
      where: { id: reviewId, clientId, projectId },
    });
    if (!review) throw new NotFoundException('Review not found');
    return review;
  }

  private async loadAgendaItem(
    clientId: string,
    projectId: string,
    reviewId: string,
    agendaItemId: string,
  ) {
    await this.loadReview(clientId, projectId, reviewId);
    const item = await this.prisma.projectReviewAgendaItem.findFirst({
      where: { id: agendaItemId, clientId, projectReviewId: reviewId },
    });
    if (!item) throw new NotFoundException('Agenda item not found');
    return item;
  }

  private auditMeta(context?: AuditContext) {
    return {
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };
  }

  async create(
    clientId: string,
    projectId: string,
    reviewId: string,
    dto: CreateProjectReviewAgendaItemDto,
    context?: AuditContext,
  ) {
    const review = await this.loadReview(clientId, projectId, reviewId);
    assertReviewAgendaEditable(review.status);

    if (dto.ownerUserId) {
      await this.projects.assertClientUser(clientId, dto.ownerUserId);
    }

    const maxOrder = await this.prisma.projectReviewAgendaItem.aggregate({
      where: { clientId, projectReviewId: reviewId },
      _max: { orderIndex: true },
    });
    const orderIndex = (maxOrder._max.orderIndex ?? -1) + 1;

    const created = await this.prisma.projectReviewAgendaItem.create({
      data: {
        clientId,
        projectReviewId: reviewId,
        title: dto.title.trim(),
        description: dto.description?.trim() ?? null,
        itemType: dto.itemType,
        objective: dto.objective?.trim() ?? null,
        expectedDecision: dto.expectedDecision?.trim() ?? null,
        orderIndex,
        plannedDurationMinutes: dto.plannedDurationMinutes ?? null,
        ownerUserId: dto.ownerUserId ?? null,
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_AGENDA_ITEM_CREATED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW_AGENDA_ITEM,
      resourceId: created.id,
      newValue: { projectId, reviewId, title: created.title, orderIndex },
      ...this.auditMeta(context),
    });

    return created;
  }

  async update(
    clientId: string,
    projectId: string,
    reviewId: string,
    agendaItemId: string,
    dto: UpdateProjectReviewAgendaItemDto,
    context?: AuditContext,
  ) {
    const review = await this.loadReview(clientId, projectId, reviewId);
    assertReviewAgendaEditable(review.status);

    const existing = await this.loadAgendaItem(
      clientId,
      projectId,
      reviewId,
      agendaItemId,
    );

    if (
      dto.notes !== undefined ||
      dto.decisionSummary !== undefined
    ) {
      assertReviewConductEditable(review.status);
    }

    if (dto.ownerUserId) {
      await this.projects.assertClientUser(clientId, dto.ownerUserId);
    }

    const data: Prisma.ProjectReviewAgendaItemUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.description !== undefined) {
      data.description = dto.description?.trim() ?? null;
    }
    if (dto.itemType !== undefined) data.itemType = dto.itemType;
    if (dto.objective !== undefined) {
      data.objective = dto.objective?.trim() ?? null;
    }
    if (dto.expectedDecision !== undefined) {
      data.expectedDecision = dto.expectedDecision?.trim() ?? null;
    }
    if (dto.plannedDurationMinutes !== undefined) {
      data.plannedDurationMinutes = dto.plannedDurationMinutes;
    }
    if (dto.ownerUserId !== undefined) {
      data.ownerUser = dto.ownerUserId
        ? { connect: { id: dto.ownerUserId } }
        : { disconnect: true };
    }
    if (dto.notes !== undefined) data.notes = dto.notes?.trim() ?? null;
    if (dto.decisionSummary !== undefined) {
      data.decisionSummary = dto.decisionSummary?.trim() ?? null;
    }

    const updated = await this.prisma.projectReviewAgendaItem.update({
      where: { id: existing.id },
      data,
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_AGENDA_ITEM_UPDATED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW_AGENDA_ITEM,
      resourceId: updated.id,
      newValue: { projectId, reviewId, status: updated.status },
      ...this.auditMeta(context),
    });

    return updated;
  }

  async reorder(
    clientId: string,
    projectId: string,
    reviewId: string,
    dto: ReorderProjectReviewAgendaItemsDto,
    context?: AuditContext,
  ) {
    const review = await this.loadReview(clientId, projectId, reviewId);
    assertReviewAgendaEditable(review.status);

    const ids = dto.items.map((i) => i.id);
    const existing = await this.prisma.projectReviewAgendaItem.findMany({
      where: { clientId, projectReviewId: reviewId, id: { in: ids } },
    });
    if (existing.length !== ids.length) {
      throw new BadRequestException(
        'Un ou plusieurs points d’ordre du jour sont invalides pour cette revue',
      );
    }

    await this.prisma.$transaction(
      dto.items.map((entry) =>
        this.prisma.projectReviewAgendaItem.update({
          where: { id: entry.id },
          data: { orderIndex: entry.orderIndex },
        }),
      ),
    );

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_AGENDA_ITEM_REORDERED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW_AGENDA_ITEM,
      resourceId: reviewId,
      newValue: {
        projectId,
        reviewId,
        itemCount: dto.items.length,
      },
      ...this.auditMeta(context),
    });

    return { ok: true };
  }

  private async transitionStatus(
    clientId: string,
    projectId: string,
    reviewId: string,
    agendaItemId: string,
    targetStatus: ProjectReviewAgendaItemStatus,
    allowedFrom: ProjectReviewAgendaItemStatus[],
    auditAction: string,
    context?: AuditContext,
  ) {
    const review = await this.loadReview(clientId, projectId, reviewId);
    assertReviewAgendaEditable(review.status);

    const item = await this.loadAgendaItem(
      clientId,
      projectId,
      reviewId,
      agendaItemId,
    );

    if (!allowedFrom.includes(item.status)) {
      throw new BadRequestException(
        `Transition impossible depuis le statut ${item.status}`,
      );
    }

    const updated = await this.prisma.projectReviewAgendaItem.update({
      where: { id: item.id },
      data: { status: targetStatus },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: auditAction,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW_AGENDA_ITEM,
      resourceId: updated.id,
      newValue: { projectId, reviewId, status: updated.status },
      ...this.auditMeta(context),
    });

    return updated;
  }

  start(
    clientId: string,
    projectId: string,
    reviewId: string,
    agendaItemId: string,
    context?: AuditContext,
  ) {
    return this.transitionStatus(
      clientId,
      projectId,
      reviewId,
      agendaItemId,
      ProjectReviewAgendaItemStatus.IN_PROGRESS,
      [
        ProjectReviewAgendaItemStatus.TODO,
        ProjectReviewAgendaItemStatus.SKIPPED,
      ],
      PROJECT_AUDIT_ACTION.PROJECT_REVIEW_AGENDA_ITEM_STARTED,
      context,
    );
  }

  complete(
    clientId: string,
    projectId: string,
    reviewId: string,
    agendaItemId: string,
    context?: AuditContext,
  ) {
    return this.transitionStatus(
      clientId,
      projectId,
      reviewId,
      agendaItemId,
      ProjectReviewAgendaItemStatus.DONE,
      [
        ProjectReviewAgendaItemStatus.IN_PROGRESS,
        ProjectReviewAgendaItemStatus.TODO,
      ],
      PROJECT_AUDIT_ACTION.PROJECT_REVIEW_AGENDA_ITEM_COMPLETED,
      context,
    );
  }

  skip(
    clientId: string,
    projectId: string,
    reviewId: string,
    agendaItemId: string,
    context?: AuditContext,
  ) {
    return this.transitionStatus(
      clientId,
      projectId,
      reviewId,
      agendaItemId,
      ProjectReviewAgendaItemStatus.SKIPPED,
      [
        ProjectReviewAgendaItemStatus.TODO,
        ProjectReviewAgendaItemStatus.IN_PROGRESS,
      ],
      PROJECT_AUDIT_ACTION.PROJECT_REVIEW_AGENDA_ITEM_SKIPPED,
      context,
    );
  }
}
