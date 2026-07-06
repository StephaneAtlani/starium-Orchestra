import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ProjectReviewAttachmentType,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import type { AuditContext } from '../../budget-management/types/audit-context';
import {
  PROJECT_AUDIT_ACTION,
  PROJECT_AUDIT_RESOURCE_TYPE,
} from '../project-audit.constants';
import { ProjectsService } from '../projects.service';
import { assertReviewAgendaEditable } from './project-review-status.helpers';
import { assertValidMeetingUrl } from './project-review-meeting.validation';
import { CreateProjectReviewAttachmentDto } from './dto/create-project-review-attachment.dto';
import { UpdateProjectReviewAttachmentDto } from './dto/update-project-review-attachment.dto';

const URL_ATTACHMENT_TYPES = new Set<ProjectReviewAttachmentType>([
  ProjectReviewAttachmentType.URL,
  ProjectReviewAttachmentType.POWERBI_LINK,
  ProjectReviewAttachmentType.SHAREPOINT_LINK,
  ProjectReviewAttachmentType.OTHER,
]);

const DOCUMENT_ATTACHMENT_TYPES = new Set<ProjectReviewAttachmentType>([
  ProjectReviewAttachmentType.DOCUMENT_REFERENCE,
  ProjectReviewAttachmentType.FILE,
]);

@Injectable()
export class ProjectReviewAttachmentsService {
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

  private async loadAttachment(
    clientId: string,
    projectId: string,
    reviewId: string,
    attachmentId: string,
  ) {
    await this.loadReview(clientId, projectId, reviewId);
    const attachment = await this.prisma.projectReviewAttachment.findFirst({
      where: { id: attachmentId, clientId, projectReviewId: reviewId },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');
    return attachment;
  }

  private auditMeta(context?: AuditContext) {
    return {
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };
  }

  private auditSnapshot(attachment: {
    attachmentType: ProjectReviewAttachmentType;
    title: string;
    documentId: string | null;
    agendaItemId: string | null;
    decisionId: string | null;
    actionItemId: string | null;
  }) {
    return {
      attachmentType: attachment.attachmentType,
      title: attachment.title,
      documentId: attachment.documentId,
      agendaItemId: attachment.agendaItemId,
      decisionId: attachment.decisionId,
      actionItemId: attachment.actionItemId,
    };
  }

  private assertAttachmentTypePayload(
    attachmentType: ProjectReviewAttachmentType,
    url: string | null | undefined,
    documentId: string | null | undefined,
  ): void {
    const trimmedUrl = url?.trim() ?? null;
    const trimmedDocumentId = documentId?.trim() ?? null;

    if (DOCUMENT_ATTACHMENT_TYPES.has(attachmentType)) {
      if (!trimmedDocumentId) {
        throw new BadRequestException(
          'documentId est requis pour une référence document',
        );
      }
      return;
    }

    if (URL_ATTACHMENT_TYPES.has(attachmentType)) {
      if (!trimmedUrl) {
        throw new BadRequestException('url est requise pour ce type de lien');
      }
      assertValidMeetingUrl(trimmedUrl);
    }
  }

  private async validateDocument(
    clientId: string,
    projectId: string,
    documentId: string,
  ): Promise<void> {
    const doc = await this.prisma.projectDocument.findFirst({
      where: {
        id: documentId,
        clientId,
        projectId,
        status: { not: 'DELETED' },
      },
    });
    if (!doc) {
      throw new NotFoundException('Project document not found');
    }
  }

  private async validateAgendaItem(
    clientId: string,
    reviewId: string,
    agendaItemId: string,
  ): Promise<void> {
    const item = await this.prisma.projectReviewAgendaItem.findFirst({
      where: { id: agendaItemId, clientId, projectReviewId: reviewId },
    });
    if (!item) {
      throw new NotFoundException('Agenda item not found');
    }
  }

  private async validateDecision(
    clientId: string,
    reviewId: string,
    decisionId: string,
  ): Promise<void> {
    const decision = await this.prisma.projectReviewDecision.findFirst({
      where: { id: decisionId, clientId, projectReviewId: reviewId },
    });
    if (!decision) {
      throw new NotFoundException('Decision not found');
    }
  }

  private async validateActionItem(
    clientId: string,
    reviewId: string,
    actionItemId: string,
  ): Promise<void> {
    const action = await this.prisma.projectReviewActionItem.findFirst({
      where: { id: actionItemId, clientId, projectReviewId: reviewId },
    });
    if (!action) {
      throw new NotFoundException('Action item not found');
    }
  }

  private async validateLinks(
    clientId: string,
    projectId: string,
    reviewId: string,
    links: {
      documentId?: string | null;
      agendaItemId?: string | null;
      decisionId?: string | null;
      actionItemId?: string | null;
    },
  ): Promise<void> {
    if (links.documentId?.trim()) {
      await this.validateDocument(clientId, projectId, links.documentId.trim());
    }
    if (links.agendaItemId?.trim()) {
      await this.validateAgendaItem(clientId, reviewId, links.agendaItemId.trim());
    }
    if (links.decisionId?.trim()) {
      await this.validateDecision(clientId, reviewId, links.decisionId.trim());
    }
    if (links.actionItemId?.trim()) {
      await this.validateActionItem(clientId, reviewId, links.actionItemId.trim());
    }
  }

  async create(
    clientId: string,
    projectId: string,
    reviewId: string,
    dto: CreateProjectReviewAttachmentDto,
    context?: AuditContext,
  ) {
    const review = await this.loadReview(clientId, projectId, reviewId);
    assertReviewAgendaEditable(review.status);

    this.assertAttachmentTypePayload(
      dto.attachmentType,
      dto.url,
      dto.documentId,
    );
    await this.validateLinks(clientId, projectId, reviewId, dto);

    const created = await this.prisma.projectReviewAttachment.create({
      data: {
        clientId,
        projectReviewId: reviewId,
        attachmentType: dto.attachmentType,
        title: dto.title.trim(),
        description: dto.description?.trim() ?? null,
        url: dto.url?.trim() ?? null,
        documentId: dto.documentId?.trim() ?? null,
        fileName: dto.fileName?.trim() ?? null,
        mimeType: dto.mimeType?.trim() ?? null,
        sizeBytes: dto.sizeBytes ?? null,
        agendaItemId: dto.agendaItemId?.trim() ?? null,
        decisionId: dto.decisionId?.trim() ?? null,
        actionItemId: dto.actionItemId?.trim() ?? null,
        uploadedByUserId: context?.actorUserId ?? null,
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_ATTACHMENT_ADDED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW_ATTACHMENT,
      resourceId: created.id,
      newValue: {
        projectId,
        reviewId,
        ...this.auditSnapshot(created),
      },
      ...this.auditMeta(context),
    });

    return created;
  }

  async update(
    clientId: string,
    projectId: string,
    reviewId: string,
    attachmentId: string,
    dto: UpdateProjectReviewAttachmentDto,
    context?: AuditContext,
  ) {
    const review = await this.loadReview(clientId, projectId, reviewId);
    assertReviewAgendaEditable(review.status);

    const existing = await this.loadAttachment(
      clientId,
      projectId,
      reviewId,
      attachmentId,
    );

    const attachmentType = dto.attachmentType ?? existing.attachmentType;
    const url =
      dto.url !== undefined ? dto.url : existing.url;
    const documentId =
      dto.documentId !== undefined ? dto.documentId : existing.documentId;

    this.assertAttachmentTypePayload(attachmentType, url, documentId);

    const effectiveLinks = {
      documentId,
      agendaItemId:
        dto.agendaItemId !== undefined ? dto.agendaItemId : existing.agendaItemId,
      decisionId:
        dto.decisionId !== undefined ? dto.decisionId : existing.decisionId,
      actionItemId:
        dto.actionItemId !== undefined ? dto.actionItemId : existing.actionItemId,
    };
    await this.validateLinks(clientId, projectId, reviewId, effectiveLinks);

    const data: Prisma.ProjectReviewAttachmentUpdateInput = {};
    if (dto.attachmentType !== undefined) data.attachmentType = dto.attachmentType;
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.description !== undefined) {
      data.description = dto.description?.trim() ?? null;
    }
    if (dto.url !== undefined) data.url = dto.url?.trim() ?? null;
    if (dto.documentId !== undefined) {
      data.document = dto.documentId?.trim()
        ? { connect: { id: dto.documentId.trim() } }
        : { disconnect: true };
    }
    if (dto.fileName !== undefined) data.fileName = dto.fileName?.trim() ?? null;
    if (dto.mimeType !== undefined) data.mimeType = dto.mimeType?.trim() ?? null;
    if (dto.sizeBytes !== undefined) data.sizeBytes = dto.sizeBytes;
    if (dto.agendaItemId !== undefined) {
      data.agendaItem = dto.agendaItemId?.trim()
        ? { connect: { id: dto.agendaItemId.trim() } }
        : { disconnect: true };
    }
    if (dto.decisionId !== undefined) {
      data.decision = dto.decisionId?.trim()
        ? { connect: { id: dto.decisionId.trim() } }
        : { disconnect: true };
    }
    if (dto.actionItemId !== undefined) {
      data.actionItem = dto.actionItemId?.trim()
        ? { connect: { id: dto.actionItemId.trim() } }
        : { disconnect: true };
    }

    const updated = await this.prisma.projectReviewAttachment.update({
      where: { id: existing.id },
      data,
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_ATTACHMENT_UPDATED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW_ATTACHMENT,
      resourceId: updated.id,
      newValue: {
        projectId,
        reviewId,
        ...this.auditSnapshot(updated),
      },
      ...this.auditMeta(context),
    });

    return updated;
  }

  async remove(
    clientId: string,
    projectId: string,
    reviewId: string,
    attachmentId: string,
    context?: AuditContext,
  ) {
    const review = await this.loadReview(clientId, projectId, reviewId);
    assertReviewAgendaEditable(review.status);

    const existing = await this.loadAttachment(
      clientId,
      projectId,
      reviewId,
      attachmentId,
    );

    await this.prisma.projectReviewAttachment.delete({
      where: { id: existing.id },
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: PROJECT_AUDIT_ACTION.PROJECT_REVIEW_ATTACHMENT_REMOVED,
      resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_REVIEW_ATTACHMENT,
      resourceId: existing.id,
      newValue: {
        projectId,
        reviewId,
        ...this.auditSnapshot(existing),
      },
      ...this.auditMeta(context),
    });

    return { ok: true };
  }
}
